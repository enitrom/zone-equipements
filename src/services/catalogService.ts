import { PRODUCTS, CATEGORIES, Product, getProductImageUrl } from '../constants';
import { db } from '../firebase';
import { collection, getDocs, setDoc, doc, deleteDoc, onSnapshot } from 'firebase/firestore';

export interface ProductVariantItem {
  id?: string;
  name: string; // Ex: "12KW" ou "AC monophasé - 12KW"
  price?: number; // Prix spécifique de vente en FCFA (optionnel, sinon prix de base du produit)
  supplierPrice?: number; // Prix fournisseur USD
  weight?: string; // Poids spécifique ex: "45 kg" (utilisé pour le calcul de fret précis)
  inStock?: boolean;
  sku?: string;
}

export interface ExtendedProduct extends Product {
  costPrice?: number; // Prix de revient en XOF
  supplierPrice?: number; // Prix fournisseur dans la devise d'origine
  supplierCurrency?: 'USD' | 'EUR' | 'CNY' | 'XOF';
  supplierId?: string; // Liaison Fournisseur
  supplierName?: string;
  supplierUrl?: string;
  sourcePlatform?: 'Alibaba' | 'AliExpress' | '1688' | 'Made-in-China' | 'Europe' | 'USA' | 'Manuel';
  shippingMethod?: 'air' | 'sea' | 'none';
  shippingCost?: number;
  marginRate?: number; // ex: 0.30 (30%)
  vatRate?: number; // 0.18 (18%)
  applyVat?: boolean; // Choix d'appliquer ou ignorer la TVA
  warehouseDeliveryFeeUSD?: number; // Transport fournisseur vers entrepôt export
  isOnline?: boolean; // Actif / En ligne
  inStock?: boolean; // Disponible immédiatement ou sur commande
  dimensions?: string;
  hsCode?: string;
  stockQty?: number;
  image?: string; // Image principale
  images?: string[]; // Galerie de plusieurs photos réelles du produit
  showDeposit?: boolean; // Activer l'affichage d'acompte réglable
  depositPercentage?: number; // Ex: 30% d'acompte
  options?: (string | ProductVariantItem)[]; // Options / déclinaisons réelles du produit avec prix & poids individuels
  variants?: (string | ProductVariantItem)[]; // Synonyme pour options
  discountPercent?: number; // Remise réelle configurable (%) par produit (ex: 5 pour -5%)
  createdAt?: string;
  updatedAt?: string;
}

// Fonction pour séparer les déclinaisons absurdement concaténées
export function sanitizeVariantOptionString(opt: string): string[] {
  if (!opt || typeof opt !== 'string') return [];
  const trimmed = opt.trim();
  if (!trimmed) return [];

  // Détecte les textes collés sans espaces (ex: "AC Single PhaseAC Three Phase12 kW15 kW20 kW...")
  const hasGluedTokens = 
    /(Single Phase|Three Phase|monophasé|triphasé)[A-Z0-9]/i.test(trimmed) ||
    /(\d+\s*kW[A-Z0-9])/i.test(trimmed) ||
    /([a-z])([A-Z0-9]{2,})/g.test(trimmed) && trimmed.length > 35;

  if (hasGluedTokens) {
    let separated = trimmed
      .replace(/([a-z])([A-Z])/g, '$1 | $2')
      .replace(/(Phase|kW|hp|course|monophasé|triphasé)(\d)/gi, '$1 | $2')
      .replace(/(\d+\s*kW)(\d+)/gi, '$1 | $2')
      .replace(/(Single Phase|Three Phase|monophasé|triphasé)(AC|DC|\d)/gi, '$1 | $2');

    const splitItems = separated
      .split(/[|,\n;]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.length < 60);

    if (splitItems.length > 1) {
      return Array.from(new Set(splitItems));
    }
  }

  return [trimmed];
}

// Set of cosmetic color words in English, French and standard naming to eliminate noise
export const COSMETIC_COLORS = new Set([
  'white', 'blanc', 'blanche', 'yellow', 'jaune', 'blue', 'bleu', 'bleue',
  'green', 'vert', 'verte', 'purple', 'violet', 'violette', 'grey', 'gray',
  'gris', 'grise', 'black', 'noir', 'noire', 'red', 'rouge', 'orange',
  'pink', 'rose', 'silver', 'argent', 'gold', 'or', 'doré', 'doree',
  'brown', 'marron', 'brun', 'brune', 'beige', 'cyan', 'magenta',
  'multicolor', 'multicolore', 'transparent', 'as picture', 'as photo',
  'custom color', 'customized', 'standard color', 'picture color',
  'white 1', 'white 2', 'white 3', 'yellow 1', 'yellow 2', 'yellow 3',
  'blue 1', 'blue 2', 'green 1', 'green 2', 'red 1', 'red 2', 'grey 1', 'grey 2', 'gray 1', 'gray 2'
]);

export function isCosmeticColor(str: string): boolean {
  if (!str) return false;
  const clean = str.toLowerCase().replace(/^(?:color|couleur|colore)\s*[:=]\s*/i, '').trim();
  if (COSMETIC_COLORS.has(clean)) return true;
  const withoutTrailingNumbers = clean.replace(/\s*\d+$/, '').trim();
  if (COSMETIC_COLORS.has(withoutTrailingNumbers)) return true;
  return false;
}

export function cleanAndFilterVariantName(rawName: string): string | null {
  if (!rawName || typeof rawName !== 'string') return null;
  let s = rawName.trim();
  if (!s || s.length > 90) return null;

  // 1. Discard if it is a pure cosmetic color
  if (isCosmeticColor(s)) {
    return null;
  }

  // 2. Strip "Color :" or "Couleur :" prefix if the rest is a technical specification
  s = s.replace(/^(?:color|couleur|colore)\s*[:=]\s*/i, '').trim();

  // 3. Strip prefixes like "Rated Power :", "Puissance :", "Output Type :", "Type de sortie :"
  s = s.replace(/^(?:rated\s*power|nominal\s*power|puissance\s*nominale|puissance)\s*[:=]\s*/i, '').trim();
  s = s.replace(/^(?:output\s*type|type\s*de\s*sortie|phase)\s*[:=]\s*/i, '').trim();

  // 4. Check again after stripping prefixes if what remains is purely a color
  if (isCosmeticColor(s)) {
    return null;
  }

  // 5. Translate and standardize common technical terms
  s = s
    .replace(/\bac\s+single\s+phase\b/gi, 'AC Monophasé')
    .replace(/\bac\s+three\s+phase\b/gi, 'AC Triphasé')
    .replace(/\bsingle\s+phase\b/gi, 'Monophasé')
    .replace(/\bthree\s+phase\b/gi, 'Triphasé')
    .replace(/\b1\s*phase\b/gi, 'Monophasé')
    .replace(/\b3\s*phase\b/gi, 'Triphasé')
    .replace(/\bkw\b/gi, 'kW')
    .replace(/\bkva\b/gi, 'kVA');

  return s.trim();
}

// Normalisateur universel de variantes pour garantir la compatibilité et les prix/poids par variante
export function normalizeVariants(rawVariantsOrOptions: any): ProductVariantItem[] {
  if (!rawVariantsOrOptions) return [];
  const list = Array.isArray(rawVariantsOrOptions) ? rawVariantsOrOptions : [rawVariantsOrOptions];
  const results: ProductVariantItem[] = [];

  list.forEach((item, idx) => {
    if (!item) return;
    if (typeof item === 'string') {
      // Check if string contains serialized price or weight (e.g. "20 kW | Prix: 750000 | Poids: 85 kg")
      const pipeParts = item.split(/\s*\|\s*/);
      const baseRaw = pipeParts[0] || '';
      let optPrice: number | undefined = undefined;
      let optWeight: string | undefined = undefined;

      for (let pIdx = 1; pIdx < pipeParts.length; pIdx++) {
        const p = pipeParts[pIdx];
        const priceMatch = p.match(/^(?:prix|price)\s*[:=]?\s*([0-9.]+)/i);
        if (priceMatch) {
          optPrice = parseFloat(priceMatch[1]);
        }
        const weightMatch = p.match(/^(?:poids|weight)\s*[:=]?\s*(.+)/i);
        if (weightMatch) {
          optWeight = weightMatch[1].trim();
        }
      }

      const splitStrings = sanitizeVariantOptionString(baseRaw);
      splitStrings.forEach((s, subIdx) => {
        const cleaned = cleanAndFilterVariantName(s);
        if (cleaned) {
          results.push({
            id: `var-${idx}-${subIdx}`,
            name: cleaned,
            price: optPrice,
            weight: optWeight
          });
        }
      });
    } else if (typeof item === 'object') {
      const rawName = String(item.name || item.nom || item.label || item.title || '').trim();
      const splitNames = sanitizeVariantOptionString(rawName);
      if (splitNames.length > 1) {
        splitNames.forEach((s, subIdx) => {
          const cleaned = cleanAndFilterVariantName(s);
          if (cleaned) {
            results.push({
              id: item.id || `var-${idx}-${subIdx}`,
              name: cleaned,
              price: item.price !== undefined && item.price !== null ? Number(item.price) : undefined,
              supplierPrice: item.supplierPrice !== undefined && item.supplierPrice !== null ? Number(item.supplierPrice) : undefined,
              weight: item.weight ? String(item.weight) : undefined,
              inStock: item.inStock ?? true,
              sku: item.sku || undefined
            });
          }
        });
      } else {
        const cleaned = cleanAndFilterVariantName(rawName);
        if (cleaned) {
          results.push({
            id: item.id || `var-${idx}`,
            name: cleaned,
            price: item.price !== undefined && item.price !== null ? Number(item.price) : undefined,
            supplierPrice: item.supplierPrice !== undefined && item.supplierPrice !== null ? Number(item.supplierPrice) : undefined,
            weight: item.weight ? String(item.weight) : undefined,
            inStock: item.inStock ?? true,
            sku: item.sku || undefined
          });
        }
      }
    }
  });

  // Dédupliquer par nom d'option
  const seen = new Set<string>();
  return results.filter(v => {
    const key = v.name.toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export interface Supplier {
  id: string;
  name: string;
  platform: 'Alibaba' | 'AliExpress' | '1688' | 'Made-in-China' | 'Europe' | 'USA' | 'Local' | string;
  country: string;
  currency: 'USD' | 'EUR' | 'CNY' | 'XOF';
  paymentTerms: string; // Ex: Prépaiement 100%, 30% acompte, Net 30
  leadTimeAvg: string;
  avgLeadTimeDays?: number;
  shippingMinMaxUSD: string; // Ex: "$5 - $25/kg"
  shippingPriceRange?: string;
  warehouseDeliveryMinUSD?: number; // Fourchette min transport vers entrepôt
  warehouseDeliveryMaxUSD?: number; // Fourchette max transport vers entrepôt
  warehouseDeliveryFeeUSD?: number; // Tarif moyen retenu pour les calculs de prix
  contactEmail?: string;
  contactPhone?: string; // WhatsApp fournisseur
  websiteUrl?: string;
  rating?: number;
  circuit: 'automatisé' | 'manuel';
  isAutomatedCircuit?: boolean;
  currentBalance?: number; // Solde compte courant
  communicationChannel?: 'whatsapp' | 'email' | 'alibaba_chat'; // Canal de communication par défaut
  defaultMessageTemplate?: string; // Message prédéfini avec instructions
  notes?: string;
}

export interface OrderItem {
  productId: number;
  name: string;
  brand: string;
  price: number;
  costPrice?: number;
  supplierPrice?: number;
  supplierCurrency?: 'USD' | 'EUR' | 'CNY' | 'XOF';
  supplierId?: string;
  supplierName?: string;
  quantity: number;
  origin?: string;
  shippingMethod?: 'air' | 'sea' | 'none';
  freightCost?: number;
}

export interface OrderNotificationRecord {
  date: string;
  recipient: 'client' | 'admin' | 'fournisseur';
  channel: 'whatsapp' | 'email';
  title: string;
  message: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerCompany: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerCity: string;
  customerCountry: string;
  items: OrderItem[];
  subtotalHT: number;
  vatAmount: number; // 18% ou 0 si exonéré
  shippingTotal: number;
  totalTTC: number;
  totalCostPrice: number;
  estimatedMargin: number;
  status: 'Reçue' | 'En attente paiement' | 'Payée' | 'Commandée fournisseur' | 'En transit' | 'Dédouanement' | 'Reçue en entrepôt' | 'Livrée' | 'Annulée';
  paymentMethod: 'Wave' | 'Orange Money' | 'Virement bancaire' | 'Virement Proforma' | 'Carte Bancaire' | 'Net 30 Pro' | 'Net 30' | 'Acompte 50%';
  paymentStatus: 'Non payé' | 'Acompte versé' | 'Payé intégralement';
  isQuote: boolean; // Si c'est un devis proforma
  quoteExpiresAt?: string;
  ethicalContractAccepted: boolean; // Contrat de transparence et mandat de sourcing
  sourcePlatform?: string;
  trackingNumber?: string;
  supplierId?: string;
  supplierName?: string;
  supplierPoStatus?: 'Non transmis' | 'PO Envoyé' | 'Lien paiement reçu' | 'Payé fournisseur';
  supplierPaymentLink?: string;
  notifications?: OrderNotificationRecord[];
  notes?: string;
  agentCode?: string; // Code agent assigné sur chaque commande (ex: AGENT-DAKAR-01)
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  author: string;
  action: string;
  details: string;
  category: 'produit' | 'commande' | 'finance' | 'prix' | 'fournisseur';
}

const STORAGE_KEYS = {
  PRODUCTS: 'ze_custom_products_v4',
  ORDERS: 'ze_custom_orders_v4',
  SUPPLIERS: 'ze_custom_suppliers_v4',
  AUDIT: 'ze_custom_audit_v4',
  CATEGORIES: 'ze_custom_categories_v4',
  SETTINGS: 'ze_system_settings_v4'
};

// Devises vers XOF
export const EXCHANGE_RATES: Record<string, number> = {
  XOF: 1,
  USD: 610,
  EUR: 655.957,
  CNY: 85
};

// Tarifs de fret moyens indicatifs vers Dakar (Sénégal)
export const FREIGHT_RATES = {
  AIR_PER_KG_XOF: 7500, // ~12 USD/kg express aérien
  SEA_PER_KG_XOF: 1800, // ~3 USD/kg maritime
  SEA_PER_CBM_XOF: 250000, // ~400 USD/m³ maritime
  SEA_MIN_CHARGE_XOF: 25000, // Tarif minimum forfaitaire maritime (25 000 FCFA)
  TRANSIT_INSURANCE_RATE: 0.05 // 5% assurance et manutention portuaire/aéroportuaire
};

// Fournisseurs initiaux vérifiés
const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-1',
    name: 'Shenzhen MRO Industrial Tech Co.',
    platform: 'Alibaba',
    country: 'Chine',
    currency: 'USD',
    paymentTerms: 'Trade Assurance / 30% acompte',
    leadTimeAvg: '15-20 jours',
    shippingMinMaxUSD: '$6 - $12 / kg',
    circuit: 'automatisé',
    rating: 4.8
  },
  {
    id: 'sup-2',
    name: 'Euro-Outillage & MRO Distribution SAS',
    platform: 'Europe',
    country: 'France',
    currency: 'EUR',
    paymentTerms: 'Net 30 jours',
    leadTimeAvg: '5-7 jours',
    shippingMinMaxUSD: '€8 - €15 / kg',
    circuit: 'manuel',
    rating: 4.9
  },
  {
    id: 'sup-3',
    name: 'Grainger Direct Export LLC',
    platform: 'USA',
    country: 'États-Unis',
    currency: 'USD',
    paymentTerms: 'Carte de crédit / Virement SWIFT',
    leadTimeAvg: '7-12 jours',
    shippingMinMaxUSD: '$12 - $22 / kg',
    circuit: 'manuel',
    rating: 5.0
  }
];

// Helper to remove undefined fields for Firestore setDoc compatibility
function cleanUndefined<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined) as unknown as T;
  }
  const cleaned: any = {};
  for (const key of Object.keys(obj)) {
    const val = (obj as any)[key];
    if (val !== undefined) {
      cleaned[key] = cleanUndefined(val);
    }
  }
  return cleaned;
}

// Helper to guarantee supplier sourcing platforms (Alibaba, AliExpress, etc.) NEVER appear as brands on badges
export function cleanBrand(rawBrand?: string, title?: string): string {
  const forbidden = [
    'ALIBABA', 'ALIEXPRESS', '1688', 'MADE-IN-CHINA', 'MADE IN CHINA', 'TAOBAO', 'AMAZON', 
    'GRAINGER', 'MCMASTER', 'MANUTAN', 'IMPORT DIRECT', 'MANUEL', 'FOURNISSEUR', 'SUPPLIER', 
    'GOLD SUPPLIER', 'VERIFIED', 'GUANGDONG', 'SHENZHEN', 'ZHEJIANG', 'YIWU', 'MANUFACTURER', 'FACTORY'
  ];
  const b = (rawBrand || '').trim();
  const upper = b.toUpperCase();
  if (!b || forbidden.some(f => upper.includes(f))) {
    const knownBrands = [
      'FLUKE', 'BOSCH', 'MAKITA', 'DEWALT', 'SCHNEIDER ELECTRIC', 'SCHNEIDER', 'LEGRAND', 'ABB', 
      '3M', 'FACOM', 'STANLEY', 'HILTI', 'KÄRCHER', 'KARCHER', 'LOCTITE', 'SIEMENS', 'FESTO', 
      'SMC', 'PARKER', 'GRUNDFOS', 'MILWAUKEE', 'SANDVIK', 'KENNAMETAL', 'MITUTOYO', 'NORTON',
      'WÜRTH', 'WURTH', 'FISCHER', 'CARRIER', 'DAIKIN', 'EATON', 'PHILIPS', 'OSRAM', 'MOBIL', 'SHELL', 'CASTROL'
    ];
    const titleUpper = ((title || '') + ' ' + b).toUpperCase();
    for (const kb of knownBrands) {
      if (titleUpper.includes(kb)) return kb;
    }
    return 'Constructeur Certifié';
  }
  return b;
}

// Zéro commande fictive - environnement 100% réel pour les tests utilisateur
const DEFAULT_ORDERS: Order[] = [];

class CatalogService {
  private products: ExtendedProduct[] = [];
  private orders: Order[] = [];
  private suppliers: Supplier[] = [];
  private auditLogs: AuditLog[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.init();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private syncProductsFromFirestore() {
    try {
      onSnapshot(collection(db, 'products'), async (snapshot) => {
        const prods: ExtendedProduct[] = [];
        const legacyMockRefs = [
          'ZE-MKT-481-H', 'ZE-LCT-270-M', 'ZE-FLK-87V-PRO', 'ZE-SCH-NSX100', 
          'ZE-3M-CUB125', 'ZE-GRN-SP916', 'ZE-KRC-HD920', 'ZE-MST-1457E', 
          'ZE-SCH-ATV320', 'ZE-EMR-3051C', 'ZE-FAC-ROLL6', 'ZE-FAC-467B'
        ];

        snapshot.forEach((snapDoc) => {
          const data = snapDoc.data() as ExtendedProduct;
          // Eradicate any legacy default mock products permanently from Firestore
          if (
            legacyMockRefs.includes(data.ref || '') || 
            (Number(snapDoc.id) >= 1 && Number(snapDoc.id) <= 12 && (data.name?.includes('Makita') || data.name?.includes('Loctite') || data.name?.includes('Fluke')))
          ) {
            deleteDoc(doc(db, 'products', snapDoc.id)).catch(() => {});
            return;
          }

          const resolvedImg = getProductImageUrl(data.img || data.image);
          const rawOptions = data.options || (data as any).variants || [];
          const normalizedOptions = normalizeVariants(rawOptions);

          let updatedCategory = data.category;
          let updatedSubcategory = data.subcategory;
          const lowerName = (data.name || '').toLowerCase();
          const isGenset = lowerName.includes('électrogène') || lowerName.includes('générateur') || lowerName.includes('generator') || lowerName.includes('genset');
          if (isGenset && (!updatedCategory || updatedCategory.toLowerCase().includes('outil'))) {
            updatedCategory = "Équipement d'extérieur";
            updatedSubcategory = "Groupes électrogènes et générateurs";
          }

          const prodItem: ExtendedProduct = {
            ...data,
            id: Number(data.id) || data.id,
            brand: cleanBrand(data.brand, data.name),
            category: updatedCategory,
            subcategory: updatedSubcategory,
            options: normalizedOptions,
            variants: normalizedOptions,
            discountPercent: data.discountPercent !== undefined && data.discountPercent !== null ? Number(data.discountPercent) : undefined,
            img: resolvedImg,
            image: resolvedImg
          };

          if (updatedCategory !== data.category || JSON.stringify(normalizedOptions) !== JSON.stringify(rawOptions)) {
            setDoc(doc(db, 'products', snapDoc.id), cleanUndefined(prodItem)).catch(() => {});
          }

          prods.push(prodItem);
        });
        
        const isSeeded = typeof window !== 'undefined' && localStorage.getItem('ze_products_seeded_v3') === 'true';

        if (snapshot.empty && !isSeeded) {
          // Zero default products at root - 100% real environment
          this.products = [];
          if (typeof window !== 'undefined') localStorage.setItem('ze_products_seeded_v3', 'true');
        } else {
          if (typeof window !== 'undefined') localStorage.setItem('ze_products_seeded_v3', 'true');
          // Sort products by id to maintain consistent order across reloads
          this.products = prods.sort((a, b) => Number(a.id) - Number(b.id));
        }
        this.saveProducts();
        this.notifyCatalogChange();
      }, (error) => {
        if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
          console.info("Firestore en mode hors ligne (cache local actif pour le catalogue)");
        } else {
          console.warn("Synchronisation temps réel produits:", error.message || error);
        }
      });
    } catch (e) {
      console.warn("Initialisation écouteur produits:", e);
    }
  }

  private syncSuppliersFromFirestore() {
    try {
      onSnapshot(collection(db, 'suppliers'), async (snapshot) => {
        const sups: Supplier[] = [];
        snapshot.forEach((doc) => {
          sups.push(doc.data() as Supplier);
        });
        
        const isSeeded = typeof window !== 'undefined' && localStorage.getItem('ze_suppliers_seeded_v2') === 'true';

        if (snapshot.empty) {
          if (!isSeeded) {
            // Hydrate default suppliers in Firestore once
            for (const s of DEFAULT_SUPPLIERS) {
              await setDoc(doc(db, 'suppliers', s.id), s);
            }
            this.suppliers = DEFAULT_SUPPLIERS;
            if (typeof window !== 'undefined') {
              localStorage.setItem('ze_suppliers_seeded_v2', 'true');
            }
          } else {
            this.suppliers = [];
          }
        } else {
          this.suppliers = sups.sort((a, b) => a.id.localeCompare(b.id));
          if (typeof window !== 'undefined') {
            localStorage.setItem('ze_suppliers_seeded_v2', 'true');
          }
        }
        this.saveSuppliers();
        this.notifySuppliersChange();
      }, (error) => {
        if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
          console.info("Firestore en mode hors ligne (fournisseurs)");
        } else {
          console.warn("Synchronisation temps réel fournisseurs:", error.message || error);
        }
      });
    } catch (e) {
      console.warn("Initialisation écouteur fournisseurs:", e);
    }
  }

  private syncOrdersFromFirestore() {
    try {
      onSnapshot(collection(db, 'orders'), (snapshot) => {
        const ords: Order[] = [];
        snapshot.forEach((doc) => {
          ords.push(doc.data() as Order);
        });
        
        this.orders = ords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        this.saveOrders();
        this.notifyOrdersChange();
      }, (error) => {
        if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
          console.info("Firestore en mode hors ligne (commandes)");
        } else {
          console.warn("Synchronisation temps réel commandes:", error.message || error);
        }
      });
    } catch (e) {
      console.warn("Initialisation écouteur commandes:", e);
    }
  }

  private init() {
    // 1. Initialiser depuis localStorage avec éradication des produits de démo
    try {
      const savedProds = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (savedProds) {
        const parsed = JSON.parse(savedProds);
        const legacyMockRefs = [
          'ZE-MKT-481-H', 'ZE-LCT-270-M', 'ZE-FLK-87V-PRO', 'ZE-SCH-NSX100', 
          'ZE-3M-CUB125', 'ZE-GRN-SP916', 'ZE-KRC-HD920', 'ZE-MST-1457E', 
          'ZE-SCH-ATV320', 'ZE-EMR-3051C', 'ZE-FAC-ROLL6', 'ZE-FAC-467B'
        ];
        this.products = (Array.isArray(parsed) ? parsed : []).filter((p: any) => 
          !legacyMockRefs.includes(p.ref) && 
          !(Number(p.id) >= 1 && Number(p.id) <= 12 && (p.name?.includes('Makita') || p.name?.includes('Loctite') || p.name?.includes('Fluke')))
        );
      }
    } catch {}

    try {
      const savedOrders = localStorage.getItem(STORAGE_KEYS.ORDERS);
      if (savedOrders) this.orders = JSON.parse(savedOrders);
    } catch {}

    try {
      const savedSuppliers = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
      if (savedSuppliers) this.suppliers = JSON.parse(savedSuppliers);
    } catch {}

    try {
      const savedAudit = localStorage.getItem(STORAGE_KEYS.AUDIT);
      if (savedAudit) this.auditLogs = JSON.parse(savedAudit);
    } catch {}

    // 2. Lancer la synchronisation asynchrone complète depuis Firestore
    this.syncProductsFromFirestore();
    this.syncSuppliersFromFirestore();
    this.syncOrdersFromFirestore();
  }

  private hydrateDefaultProducts() {
    this.products = PRODUCTS.map(p => ({
      ...p,
      isOnline: true,
      inStock: true,
      supplierCurrency: 'USD' as const,
      sourcePlatform: p.origin.includes('Chine') ? 'Alibaba' : p.origin.includes('États-Unis') ? 'USA' : 'Europe',
      supplierPrice: Math.round((p.price * 0.58) / 610),
      costPrice: Math.round(p.price * 0.62),
      marginRate: 0.35,
      vatRate: 0.18,
      shippingMethod: (parseFloat(p.weight || '1') > 20 ? 'sea' : 'air') as 'sea' | 'air',
      createdAt: new Date().toISOString()
    }));
    this.saveProducts();
  }

  private notifyCatalogChange() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ze_catalog_updated'));
    }
    this.listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  }

  private notifyOrdersChange() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ze_orders_updated'));
    }
    this.listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  }

  private notifySuppliersChange() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ze_suppliers_updated'));
    }
    this.listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  }

  public deleteOrder(id: string, author = 'Admin'): boolean {
    this.getOrders();
    const ord = this.orders.find(o => String(o.id) === String(id));
    const initialLen = this.orders.length;
    this.orders = this.orders.filter(o => String(o.id) !== String(id));
    if (this.orders.length < initialLen) {
      this.saveOrders();
      deleteDoc(doc(db, 'orders', String(id))).catch(console.error);
      this.logAction(author, 'Suppression Commande', `Commande ${ord ? ord.orderNumber : id} supprimée`, 'commande');
      this.notifyOrdersChange();
      return true;
    }
    return false;
  }

  private saveProducts() {
    try {
      const data = JSON.stringify(this.products);
      if (data.length > 5000000) {
        console.error("Catalog too large for localStorage, image corruption likely");
      }
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, data);
    } catch (e) {
      console.error("Erreur sauvegarde produits:", e);
    }
  }

  private saveOrders() {
    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(this.orders));
    } catch (e) {
      console.error("Erreur sauvegarde commandes:", e);
    }
  }

  private saveSuppliers() {
    try {
      localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(this.suppliers));
    } catch (e) {
      console.error("Erreur sauvegarde fournisseurs:", e);
    }
  }

  private saveAudit() {
    try {
      localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(this.auditLogs));
    } catch (e) {
      console.error("Erreur sauvegarde audit:", e);
    }
  }

  public logAction(author: string, action: string, details: string, category: AuditLog['category']) {
    const log: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      author,
      action,
      details,
      category
    };
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 200) this.auditLogs.pop();
    this.saveAudit();
  }

  // ================= PRODUITS =================
  public getProducts(onlyActive = false): ExtendedProduct[] {
    if (this.products.length === 0) {
      try {
        const savedProds = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
        if (savedProds) {
          const parsed = JSON.parse(savedProds);
          if (Array.isArray(parsed)) {
            this.products = parsed;
          }
        }
      } catch (e) {
        console.error("Erreur chargement produits:", e);
      }
    }

    // Normaliser les images pour éviter toute corruption (conserve les chemins d'images valides, les clés d'images locales et base64)
    const normalized = this.products.map(p => {
      const finalImg = p.img || p.image || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600';
      return {
        ...p,
        img: finalImg,
        image: finalImg
      };
    });

    if (onlyActive) {
      return normalized.filter(p => p.isOnline !== false);
    }
    return normalized;
  }

  public getProductById(id: number): ExtendedProduct | undefined {
    return this.getProducts().find(p => p.id === id);
  }

  public addProduct(pData: Partial<ExtendedProduct>, author = 'Admin'): ExtendedProduct {
    const currentProducts = this.getProducts();
    const newId = Math.max(...currentProducts.map(p => Number(p.id)), 0) + 1;
    
    // Auto-catégorisation intelligente Grainger/RaptorSupplies pour groupes électrogènes
    let cat = pData.category || 'Outillage électrique';
    let subcat = pData.subcategory || 'Équipements professionnels';
    const lowerName = (pData.name || '').toLowerCase();
    const isGenset = lowerName.includes('électrogène') || lowerName.includes('générateur') || lowerName.includes('generator') || lowerName.includes('genset');
    if (isGenset && (!cat || cat.toLowerCase().includes('outil'))) {
      cat = "Équipement d'extérieur";
      subcat = "Groupes électrogènes et générateurs";
    }

    const normalizedOptions = normalizeVariants(pData.options || (pData as any).variants || []);

    const newProduct: ExtendedProduct = {
      id: newId,
      name: pData.name || 'Nouveau Matériel Industriel',
      brand: cleanBrand(pData.brand, pData.name),
      price: pData.price || 50000,
      category: cat,
      subcategory: subcat,
      img: pData.img || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600',
      images: pData.images && pData.images.length > 0 ? pData.images : (pData.img ? [pData.img] : []),
      showDeposit: pData.showDeposit ?? false,
      depositPercentage: pData.depositPercentage || 30,
      rating: pData.rating || 5.0,
      reviews: pData.reviews || 1,
      sector: pData.sector || 'Industrie Générale',
      model: pData.model || `MOD-${newId}`,
      ref: pData.ref || `ZE-MRO-${newId}`,
      specs: pData.specs && Object.keys(pData.specs).length > 0 
        ? pData.specs 
        : { "Condition": "Neuf d'origine", "Garantie": pData.warranty || "1 an", "Certification": "Norme CE / ISO" },
      description: pData.description || 'Équipement industriel professionnel certifié.',
      extendedDescription: pData.extendedDescription || 'Livré avec conformité d\'origine et traçabilité constructeur assurée.',
      origin: pData.origin || 'Chine',
      packageQty: pData.packageQty || 1,
      moq: pData.moq || 1,
      weight: pData.weight || '1.0 kg',
      warranty: pData.warranty || '1 an garantie constructeur',
      leadTime: pData.leadTime || '7-14 jours express DAP Dakar',
      isOnline: pData.isOnline ?? true,
      inStock: pData.inStock ?? true,
      costPrice: pData.costPrice || Math.round((pData.price || 50000) * 0.65),
      supplierPrice: pData.supplierPrice,
      supplierCurrency: pData.supplierCurrency || 'USD',
      supplierId: pData.supplierId,
      supplierName: pData.supplierName,
      supplierUrl: pData.supplierUrl,
      sourcePlatform: pData.sourcePlatform || 'Manuel',
      shippingMethod: pData.shippingMethod || ((parseFloat(String(pData.weight || '1').replace(/[^0-9.]/g, '')) || 1) > 20 ? 'sea' : 'air'),
      marginRate: pData.marginRate || 0.35,
      vatRate: pData.vatRate || 0.18,
      applyVat: pData.applyVat ?? true,
      warehouseDeliveryFeeUSD: pData.warehouseDeliveryFeeUSD ?? 20,
      options: normalizedOptions,
      variants: normalizedOptions,
      discountPercent: pData.discountPercent !== undefined && pData.discountPercent !== null ? Number(pData.discountPercent) : undefined,
      dimensions: pData.dimensions,
      hsCode: pData.hsCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.products.unshift(newProduct);
    this.saveProducts();
    setDoc(doc(db, 'products', String(newProduct.id)), cleanUndefined(newProduct)).catch(console.error);
    
    this.logAction(author, 'Ajout Produit', `Ajout de "${newProduct.name}" (Réf: ${newProduct.ref})`, 'produit');
    this.notifyCatalogChange();
    return newProduct;
  }

  public updateProduct(id: number, pData: Partial<ExtendedProduct>, author = 'Admin'): ExtendedProduct {
    this.getProducts(); // refresh
    const index = this.products.findIndex(p => Number(p.id) === Number(id));
    if (index === -1) throw new Error("Produit non trouvé");

    const old = this.products[index];
    const rawOpts = pData.options !== undefined ? pData.options : (pData as any).variants !== undefined ? (pData as any).variants : old.options;
    const normalizedOptions = rawOpts ? normalizeVariants(rawOpts) : [];

    let updatedCat = pData.category || old.category;
    let updatedSubcat = pData.subcategory || old.subcategory;
    const nameToCheck = (pData.name || old.name || '').toLowerCase();
    const isGenset = nameToCheck.includes('électrogène') || nameToCheck.includes('générateur') || nameToCheck.includes('generator') || nameToCheck.includes('genset');
    if (isGenset && (!updatedCat || updatedCat.toLowerCase().includes('outil'))) {
      updatedCat = "Équipement d'extérieur";
      updatedSubcat = "Groupes électrogènes et générateurs";
    }

    const updated: ExtendedProduct = {
      ...old,
      ...pData,
      category: updatedCat,
      subcategory: updatedSubcat,
      options: normalizedOptions,
      variants: normalizedOptions,
      discountPercent: pData.discountPercent !== undefined ? (pData.discountPercent === null ? undefined : Number(pData.discountPercent)) : old.discountPercent,
      brand: cleanBrand(pData.brand || old.brand, pData.name || old.name),
      updatedAt: new Date().toISOString()
    };

    this.products[index] = updated;
    this.saveProducts();
    setDoc(doc(db, 'products', String(updated.id)), cleanUndefined(updated)).catch(console.error);

    this.logAction(author, 'Modification Produit', `Mise à jour de "${updated.name}" (Prix: ${updated.price} FCFA, En ligne: ${updated.isOnline})`, 'produit');
    this.notifyCatalogChange();
    return updated;
  }

  public deleteProduct(id: number | string, author = 'Admin'): boolean {
    const idStr = String(id);
    const p = this.products.find(item => String(item.id) === idStr);
    const initialLen = this.products.length;
    this.products = this.products.filter(item => String(item.id) !== idStr);
    this.saveProducts();
    
    // Suppression systématique et irrévocable dans Firestore
    deleteDoc(doc(db, 'products', idStr)).catch((err) => {
      console.error("Erreur suppression Firestore:", err);
    });

    if (p) {
      this.logAction(author, 'Suppression Produit', `Suppression définitive du produit "${p.name}" (ID: ${id})`, 'produit');
    }
    this.notifyCatalogChange();
    return this.products.length < initialLen;
  }

  // ================= CALCUL AUTOMATIQUE DU PRIX DE VENTE =================
  /**
   * Calcul sans fret inclus par défaut (prix de base équipement) + options de fret intelligentes :
   * Le client choisit son fret sur la fiche produit ou au panier.
   * Fret Maritime : calcul transparent par KG et par Volume CBM (m³), avec possibilité d'ignorer l'un ou l'autre.
   * Seuil de poids max aérien : 20 kg (au-delà bascule automatique sur maritime).
   */
  public calculatePricing(params: {
    supplierPrice: number;
    supplierCurrency: 'USD' | 'EUR' | 'CNY' | 'XOF';
    weightKg: number;
    volumeCbm?: number;
    seaRatePerKgXOF?: number;
    seaRatePerCbmXOF?: number;
    ignoreSeaWeight?: boolean; // Décocher / ignorer le calcul maritime au poids
    ignoreSeaVolume?: boolean; // Décocher / ignorer le calcul maritime au volume CBM
    preferredFreight?: 'none' | 'auto' | 'air' | 'sea';
    marginRate?: number; // Défaut: 0.35 (35%)
    warehouseDeliveryUSD?: number; // Frais fournisseur -> entrepôt export
    applyVat?: boolean; // Défaut: true
  }) {
    const rate = EXCHANGE_RATES[params.supplierCurrency] || 1;
    const supplierPriceXOF = params.supplierPrice * rate;
    const warehouseDeliveryXOF = (params.warehouseDeliveryUSD || 0) * EXCHANGE_RATES['USD'];

    // 1. Prix de base équipement HT (hors fret international)
    const margin = params.marginRate ?? 0.35;
    const priceEquipmentHT = Math.round((supplierPriceXOF + warehouseDeliveryXOF) / (1 - margin));
    const vatRate = (params.applyVat ?? true) ? 0.18 : 0;
    const vatAmount = Math.round(priceEquipmentHT * vatRate);
    const priceEquipmentTTC = priceEquipmentHT + vatAmount;

    // 2. Calcul du Fret Aérien
    const validWeight = Math.max(params.weightKg || 1, 0.1);
    const isAirEligible = validWeight <= 20;
    const airFreightCostXOF = Math.max(validWeight, 1) * FREIGHT_RATES.AIR_PER_KG_XOF;

    // 3. Calcul Transparent du Fret Maritime (Poids kg vs Volume CBM)
    const seaRateKg = params.seaRatePerKgXOF ?? FREIGHT_RATES.SEA_PER_KG_XOF;
    const seaRateCbm = params.seaRatePerCbmXOF ?? FREIGHT_RATES.SEA_PER_CBM_XOF;
    const computedVolumeCbm = params.volumeCbm && params.volumeCbm > 0 
      ? params.volumeCbm 
      : Number((validWeight / 250).toFixed(3)); // Ratio standard 1 CBM ≈ 250 kg

    const seaCostByWeightXOF = params.ignoreSeaWeight ? 0 : Math.round(validWeight * seaRateKg);
    const seaCostByVolumeXOF = params.ignoreSeaVolume ? 0 : Math.round(computedVolumeCbm * seaRateCbm);

    let seaFreightCostXOF = FREIGHT_RATES.SEA_MIN_CHARGE_XOF;
    let seaCalculationBasis = 'Poids & Volume (Max)';

    if (params.ignoreSeaWeight && !params.ignoreSeaVolume) {
      seaFreightCostXOF = Math.max(seaCostByVolumeXOF, FREIGHT_RATES.SEA_MIN_CHARGE_XOF);
      seaCalculationBasis = 'Volume seul (CBM)';
    } else if (!params.ignoreSeaWeight && params.ignoreSeaVolume) {
      seaFreightCostXOF = Math.max(seaCostByWeightXOF, FREIGHT_RATES.SEA_MIN_CHARGE_XOF);
      seaCalculationBasis = 'Poids seul (kg)';
    } else if (params.ignoreSeaWeight && params.ignoreSeaVolume) {
      seaFreightCostXOF = FREIGHT_RATES.SEA_MIN_CHARGE_XOF;
      seaCalculationBasis = 'Minimum forfaitaire';
    } else {
      seaFreightCostXOF = Math.max(seaCostByWeightXOF, seaCostByVolumeXOF, FREIGHT_RATES.SEA_MIN_CHARGE_XOF);
      seaCalculationBasis = seaCostByVolumeXOF > seaCostByWeightXOF ? 'Volume retenu (CBM)' : 'Poids retenu (kg)';
    }

    let shippingMethod: 'none' | 'air' | 'sea' = 'none';
    let freightCostXOF = 0;

    if (params.preferredFreight === 'sea') {
      shippingMethod = 'sea';
      freightCostXOF = seaFreightCostXOF;
    } else if (params.preferredFreight === 'air') {
      shippingMethod = isAirEligible ? 'air' : 'sea';
      freightCostXOF = isAirEligible ? airFreightCostXOF : seaFreightCostXOF;
    } else if (params.preferredFreight === 'none') {
      shippingMethod = 'none';
      freightCostXOF = 0;
    } else {
      // Recommandation intelligente selon le poids
      shippingMethod = isAirEligible ? 'air' : 'sea';
      freightCostXOF = isAirEligible ? airFreightCostXOF : seaFreightCostXOF;
    }

    const totalCostPrice = Math.round(supplierPriceXOF + warehouseDeliveryXOF);
    const priceTTC = priceEquipmentTTC; // Affichage de base = prix équipement hors fret

    return {
      supplierPriceXOF,
      priceEquipmentHT,
      priceEquipmentTTC,
      priceHT: priceEquipmentHT,
      priceTTC: priceEquipmentTTC,
      freightCostXOF,
      shippingMethod,
      isAirEligible,
      maxAirWeightKg: 20,
      airFreightCostXOF,
      seaFreightCostXOF,
      seaCostByWeightXOF,
      seaCostByVolumeXOF,
      seaCalculationBasis,
      seaRatePerKgXOF: seaRateKg,
      seaRatePerCbmXOF: seaRateCbm,
      computedVolumeCbm,
      isSeaWeightIgnored: Boolean(params.ignoreSeaWeight),
      isSeaVolumeIgnored: Boolean(params.ignoreSeaVolume),
      totalCostPrice,
      marginRate: margin,
      vatRate,
      vatAmount
    };
  }

  // ================= PARSEUR INTELLIGENT DE LIENS =================
  public parseProductLink(url: string) {
    const cleanUrl = url.trim().toLowerCase();
    let detectedPlatform: 'Alibaba' | 'AliExpress' | '1688' | 'Made-in-China' | 'Europe' | 'USA' | 'Manuel' = 'Manuel';
    let detectedSupplier = 'Fournisseur Sourcing';
    let detectedCountry = 'International';
    let defaultCurrency: 'USD' | 'EUR' | 'CNY' | 'XOF' = 'USD';
    let estimatedWeight = 2.5;

    if (cleanUrl.includes('aliexpress.')) {
      detectedPlatform = 'AliExpress';
      detectedSupplier = 'AliExpress Verified Manufacturer';
      detectedCountry = 'Chine';
      defaultCurrency = 'USD';
      estimatedWeight = 1.2;
    } else if (cleanUrl.includes('alibaba.')) {
      detectedPlatform = 'Alibaba';
      detectedSupplier = 'Alibaba Gold Supplier Industrial';
      detectedCountry = 'Chine';
      defaultCurrency = 'USD';
      estimatedWeight = 5.0;
    } else if (cleanUrl.includes('1688.com')) {
      detectedPlatform = '1688';
      detectedSupplier = 'Usine Directe 1688 Guangdong';
      detectedCountry = 'Chine';
      defaultCurrency = 'CNY';
      estimatedWeight = 3.0;
    } else if (cleanUrl.includes('made-in-china.')) {
      detectedPlatform = 'Made-in-China';
      detectedSupplier = 'MIC Audited Supplier';
      detectedCountry = 'Chine';
      defaultCurrency = 'USD';
      estimatedWeight = 10.0;
    } else if (cleanUrl.includes('.fr') || cleanUrl.includes('.de') || cleanUrl.includes('.eu') || cleanUrl.includes('manutan') || cleanUrl.includes('rs-online')) {
      detectedPlatform = 'Europe';
      detectedSupplier = 'Distributeur Industriel Européen';
      detectedCountry = 'France / Allemagne';
      defaultCurrency = 'EUR';
      estimatedWeight = 2.0;
    } else if (cleanUrl.includes('amazon.com') || cleanUrl.includes('grainger') || cleanUrl.includes('mcmaster')) {
      detectedPlatform = 'USA';
      detectedSupplier = 'MRO USA Certified Partner';
      detectedCountry = 'États-Unis';
      defaultCurrency = 'USD';
      estimatedWeight = 3.5;
    }

    // Extraction d'un nom de produit intelligible et cohérent depuis l'URL
    let guessedTitle = '';
    try {
      const urlObj = new URL(url);
      const pathname = decodeURIComponent(urlObj.pathname);
      const pathParts = pathname.split('/').filter(Boolean);
      
      // Essayer de trouver un slug significatif dans les segments du chemin
      let titleCandidates = pathParts.filter(p => !p.match(/^(item|product-detail|dp|gp|product|itm|p)$/i));
      let bestSlug = titleCandidates[titleCandidates.length - 1] || '';
      if (bestSlug.length < 4 && titleCandidates.length > 1) {
        bestSlug = titleCandidates[titleCandidates.length - 2];
      }

      const cleanSlug = bestSlug
        .replace(/\.(html|htm|php|asp|jsp)$/i, '')
        .replace(/[0-9]{8,}/g, '') // retirer les longs IDs numériques
        .replace(/[-_+]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (cleanSlug.length > 3) {
        // Mettre en majuscule chaque mot
        guessedTitle = cleanSlug
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
      }
    } catch {
      // Fallback
    }

    if (!guessedTitle) {
      guessedTitle = `Matériel ${detectedPlatform !== 'Manuel' ? detectedPlatform : 'Industriel'} Sourcing`;
    }

    // Prix suggéré cohérent
    const samplePrice = detectedPlatform === '1688' ? 280 : detectedPlatform === 'Europe' ? 110 : 75;
    const pricing = this.calculatePricing({
      supplierPrice: samplePrice,
      supplierCurrency: defaultCurrency,
      weightKg: estimatedWeight,
      marginRate: 0.35,
      applyVat: true
    });

    return {
      url,
      detectedPlatform,
      detectedSupplier,
      detectedCountry,
      defaultCurrency,
      estimatedWeight,
      guessedTitle,
      pricing
    };
  }

  // ================= COMMANDES & FACTURES =================
  public getOrders(): Order[] {
    if (this.orders.length === 0) {
      try {
        const savedOrders = localStorage.getItem(STORAGE_KEYS.ORDERS);
        if (savedOrders) {
          const parsed = JSON.parse(savedOrders);
          if (Array.isArray(parsed)) {
            this.orders = parsed;
          }
        }
      } catch {
        // ignore
      }
    }
    return this.orders;
  }

  public getOrderById(id: string): Order | undefined {
    return this.getOrders().find(o => o.id === id);
  }

  public createOrder(oData: Partial<Order>): Order {
    this.getOrders();
    const nextSeq = this.orders.length + 1;
    const prefix = oData.isQuote ? 'DEV-SN-2026' : 'CMD-SN-2026';
    const orderNumber = `${prefix}-${String(nextSeq).padStart(4, '0')}`;
    const id = `ord-${Date.now()}`;

    const subtotalHT = oData.subtotalHT || Math.round((oData.totalTTC || 0) / 1.18);
    const vatAmount = oData.vatAmount || ((oData.totalTTC || 0) - subtotalHT);
    const totalCostPrice = Math.round(subtotalHT * 0.65);
    const estimatedMargin = subtotalHT - totalCostPrice;

    const agentCode = oData.agentCode || (oData.items?.some(i => i.shippingMethod === 'sea') ? 'DKR628+SEA' : 'DKR628+AIR');

    const newOrder: Order = {
      id,
      orderNumber,
      customerName: oData.customerName || 'Client Sénégal',
      customerCompany: oData.customerCompany || '',
      customerEmail: oData.customerEmail || 'contact@client.sn',
      customerPhone: oData.customerPhone || '+221 77 000 00 00',
      customerAddress: oData.customerAddress || 'Dakar',
      customerCity: oData.customerCity || 'Dakar',
      customerCountry: oData.customerCountry || 'Sénégal',
      items: oData.items || [],
      subtotalHT,
      vatAmount,
      shippingTotal: oData.shippingTotal || 0,
      totalTTC: oData.totalTTC || 0,
      totalCostPrice,
      estimatedMargin,
      status: oData.isQuote ? 'Reçue' : 'En attente paiement',
      paymentMethod: oData.paymentMethod || 'Wave',
      paymentStatus: 'Non payé',
      isQuote: !!oData.isQuote,
      ethicalContractAccepted: true,
      sourcePlatform: 'Chine / International',
      agentCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.orders.unshift(newOrder);
    this.saveOrders();
    setDoc(doc(db, 'orders', String(newOrder.id)), newOrder).catch(console.error);
    this.logAction(
      oData.customerName || 'Client',
      oData.isQuote ? 'Nouveau Devis' : 'Nouvelle Commande',
      `${oData.isQuote ? 'Demande de devis' : 'Passage de commande'} ${orderNumber} pour un montant de ${newOrder.totalTTC.toLocaleString('fr-FR')} FCFA (TVA 18% comprise)`,
      'commande'
    );
    this.notifyOrdersChange();
    return newOrder;
  }

  public updateOrderStatus(id: string, status: Order['status'], author = 'Admin'): Order {
    this.getOrders();
    const index = this.orders.findIndex(o => o.id === id);
    if (index === -1) throw new Error("Commande non trouvée");

    const oldStatus = this.orders[index].status;
    this.orders[index].status = status;
    this.orders[index].updatedAt = new Date().toISOString();
    this.saveOrders();
    setDoc(doc(db, 'orders', String(id)), this.orders[index]).catch(console.error);

    this.logAction(author, 'Mise à jour Commande', `Commande ${this.orders[index].orderNumber} passée de "${oldStatus}" à "${status}"`, 'commande');
    this.notifyOrdersChange();
    return this.orders[index];
  }

  public updateOrderPaymentStatus(id: string, paymentStatus: Order['paymentStatus'], author = 'Admin'): Order {
    this.getOrders();
    const index = this.orders.findIndex(o => o.id === id);
    if (index === -1) throw new Error("Commande non trouvée");

    this.orders[index].paymentStatus = paymentStatus;
    this.orders[index].updatedAt = new Date().toISOString();
    this.saveOrders();
    setDoc(doc(db, 'orders', String(id)), this.orders[index]).catch(console.error);

    this.logAction(author, 'Paiement Commande', `Paiement commande ${this.orders[index].orderNumber} mis à jour : "${paymentStatus}"`, 'finance');
    this.notifyOrdersChange();
    return this.orders[index];
  }

  // ================= STATISTIQUES FINANCIÈRES =================
  public getFinancialStats() {
    const completedOrActiveOrders = this.orders.filter(o => o.status !== 'Annulée');

    // Chiffre d'Affaires Brut (TTC)
    const grossRevenue = completedOrActiveOrders.reduce((sum, o) => sum + o.totalTTC, 0);

    // Chiffre d'Affaires Net (HT)
    const netRevenue = completedOrActiveOrders.reduce((sum, o) => sum + o.subtotalHT, 0);

    // Chiffre d'Affaires Encaissé
    const collectedRevenue = completedOrActiveOrders
      .filter(o => o.paymentStatus === 'Payé intégralement')
      .reduce((sum, o) => sum + o.totalTTC, 0);

    // Chiffre d'Affaires En attente (impayés ou devis)
    const pendingRevenue = completedOrActiveOrders
      .filter(o => o.paymentStatus !== 'Payé intégralement')
      .reduce((sum, o) => sum + o.totalTTC, 0);

    // Coût d'Achat Marchandises (COGS)
    const totalCostOfGoods = completedOrActiveOrders.reduce((sum, o) => sum + o.totalCostPrice, 0);

    // Marge Brute Globale
    const grossProfit = netRevenue - totalCostOfGoods;
    const grossMarginPercent = netRevenue > 0 ? ((grossProfit / netRevenue) * 100).toFixed(1) : '0';

    // TVA collectée (18%)
    const vatCollected = completedOrActiveOrders.reduce((sum, o) => sum + o.vatAmount, 0);

    // Panier Moyen
    const averageOrderValue = completedOrActiveOrders.length > 0 
      ? Math.round(netRevenue / completedOrActiveOrders.length) 
      : 0;

    // Nombre de commandes
    const ordersCount = completedOrActiveOrders.length;
    const quotesCount = this.orders.filter(o => o.isQuote).length;

    // Répartition par plateforme
    const platformBreakdown: Record<string, number> = {};
    completedOrActiveOrders.forEach(o => {
      const p = o.sourcePlatform || 'Autre';
      platformBreakdown[p] = (platformBreakdown[p] || 0) + o.totalTTC;
    });

    return {
      grossRevenue,
      netRevenue,
      collectedRevenue,
      pendingRevenue,
      totalCostOfGoods,
      grossProfit,
      grossMarginPercent,
      vatCollected,
      averageOrderValue,
      ordersCount,
      quotesCount,
      platformBreakdown
    };
  }

  // ================= FOURNISSEURS =================
  public getSuppliers(): Supplier[] {
    if (this.suppliers.length === 0) {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            this.suppliers = parsed;
          }
        }
      } catch {}
    }
    return this.suppliers;
  }

  public getSupplierById(id: string): Supplier | undefined {
    return this.getSuppliers().find(s => s.id === id);
  }

  public ensureSupplier(sData: {
    name: string;
    platform?: string;
    country?: string;
    currency?: 'USD' | 'EUR' | 'CNY' | 'XOF';
    storeUrl?: string;
    notes?: string;
  }): Supplier {
    this.getSuppliers();
    const cleanName = (sData.name || '').trim();
    if (!cleanName) {
      return this.suppliers[0] || DEFAULT_SUPPLIERS[0];
    }
    
    // Check if supplier already exists (case-insensitive name or URL match)
    const existing = this.suppliers.find(s => 
      s.name.toLowerCase().trim() === cleanName.toLowerCase() ||
      (sData.storeUrl && s.websiteUrl && s.websiteUrl === sData.storeUrl)
    );
    if (existing) {
      return existing;
    }

    // Create new supplier
    const newSup = this.addSupplier({
      name: cleanName,
      platform: sData.platform || 'Alibaba',
      country: sData.country || 'Chine',
      currency: sData.currency || 'USD',
      websiteUrl: sData.storeUrl || '',
      paymentTerms: 'Trade Assurance / 30% acompte',
      leadTimeAvg: '15-20 jours',
      shippingMinMaxUSD: '$6 - $12 / kg',
      circuit: 'automatisé',
      rating: 4.9,
      notes: sData.notes || "Fournisseur extrait et ajouté automatiquement lors de l'importation de produit."
    }, 'Système (Auto-Import)');

    return newSup;
  }

  public addSupplier(sData: Partial<Supplier>, author = 'Admin'): Supplier {
    this.getSuppliers();
    const newSupplier: Supplier = {
      id: `sup-${Date.now()}`,
      name: sData.name || 'Nouveau Fournisseur',
      platform: sData.platform || 'Alibaba',
      country: sData.country || 'Chine',
      currency: sData.currency || 'USD',
      paymentTerms: sData.paymentTerms || '30% acompte / 70% avant expédition',
      leadTimeAvg: sData.leadTimeAvg || '15 jours',
      shippingMinMaxUSD: sData.shippingMinMaxUSD || '$10 - $25/kg',
      warehouseDeliveryMinUSD: sData.warehouseDeliveryMinUSD ?? 15,
      warehouseDeliveryMaxUSD: sData.warehouseDeliveryMaxUSD ?? 35,
      warehouseDeliveryFeeUSD: sData.warehouseDeliveryFeeUSD ?? 25,
      contactEmail: sData.contactEmail || '',
      contactPhone: sData.contactPhone || '',
      websiteUrl: sData.websiteUrl || '',
      circuit: sData.circuit || 'manuel',
      rating: sData.rating || 4.8,
      notes: sData.notes || ''
    };
    this.suppliers.push(newSupplier);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ze_suppliers_seeded_v2', 'true');
    }
    this.saveSuppliers();
    setDoc(doc(db, 'suppliers', String(newSupplier.id)), newSupplier).catch(console.error);
    this.logAction(author, 'Ajout Fournisseur', `Nouveau fournisseur enregistré: ${newSupplier.name} (${newSupplier.country})`, 'fournisseur');
    this.notifySuppliersChange();
    return newSupplier;
  }

  public updateSupplier(id: string, sData: Partial<Supplier>, author = 'Admin'): Supplier {
    this.getSuppliers();
    const idx = this.suppliers.findIndex(s => s.id === id);
    if (idx === -1) throw new Error("Fournisseur non trouvé");

    const updated: Supplier = {
      ...this.suppliers[idx],
      ...sData
    };
    this.suppliers[idx] = updated;
    if (typeof window !== 'undefined') {
      localStorage.setItem('ze_suppliers_seeded_v2', 'true');
    }
    this.saveSuppliers();
    setDoc(doc(db, 'suppliers', String(id)), updated).catch(console.error);
    this.logAction(author, 'Modification Fournisseur', `Mise à jour fiche fournisseur: ${updated.name}`, 'fournisseur');
    this.notifySuppliersChange();
    return updated;
  }

  public deleteSupplier(id: string, author = 'Admin'): boolean {
    this.getSuppliers();
    const sup = this.suppliers.find(s => String(s.id) === String(id));
    const initialLen = this.suppliers.length;
    this.suppliers = this.suppliers.filter(s => String(s.id) !== String(id));
    if (this.suppliers.length !== initialLen) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('ze_suppliers_seeded_v2', 'true');
      }
      this.saveSuppliers();
      deleteDoc(doc(db, 'suppliers', String(id))).catch(console.error);
      this.logAction(author, 'Suppression Fournisseur', `Fournisseur supprimé: ${sup ? sup.name : id}`, 'fournisseur');
      this.notifySuppliersChange();
      return true;
    }
    return false;
  }

  // ================= NOTIFICATIONS & GESTION COMMANDES FOURNISSEUR =================
  public generateGroupedPO(supplierId: string, orderIds: string[], warehouseAddress = "Entrepôt Transit Export Dakar - Réf: ZE-EXP") {
    const supplier = this.getSupplierById(supplierId);
    const orders = this.getOrders().filter(o => orderIds.includes(o.id));
    
    // Agrégation des articles commandés
    const aggregatedItems: { name: string; brand: string; quantity: number; unitPrice: number; currency: string; orderRefs: string[] }[] = [];
    
    orders.forEach(ord => {
      ord.items.forEach(item => {
        const existing = aggregatedItems.find(i => i.name === item.name);
        if (existing) {
          existing.quantity += item.quantity;
          if (!existing.orderRefs.includes(ord.orderNumber)) {
            existing.orderRefs.push(ord.orderNumber);
          }
        } else {
          aggregatedItems.push({
            name: item.name,
            brand: item.brand,
            quantity: item.quantity,
            unitPrice: item.supplierPrice || Math.round(item.price * 0.55 / 610),
            currency: supplier?.currency || 'USD',
            orderRefs: [ord.orderNumber]
          });
        }
      });
    });

    const poRef = `PO-ZE-${Date.now().toString().slice(-6)}`;
    const dateStr = new Date().toLocaleDateString('fr-FR');
    const totalUnits = aggregatedItems.reduce((acc, i) => acc + i.quantity, 0);

    const itemsSummary = aggregatedItems.map((item, idx) => 
      `${idx + 1}. [${item.brand}] ${item.name} x${item.quantity} pcs (Réf client: ${item.orderRefs.join(', ')})`
    ).join('\n');

    // Message standard formaté pour WhatsApp / Email
    const messageText = `COMMANDE ACHAT FOURNISSEUR / PURCHASE ORDER
Réf: ${poRef} - Date: ${dateStr}
Fournisseur: ${supplier?.name || 'Partenaire Industriel'}
Destinataire Expédition: ${warehouseAddress}

Liste des équipements commandés (${totalUnits} unités au total) :
${itemsSummary}

Conditions souhaitées :
- Contrôle qualité constructeur & emballage renforcé export
- Facture proforma / Lien de règlement Trade Assurance
- Confirmation des délais de fabrication et d'expédition

Zone Équipements Sénégal
Email: zoneequipements@gmail.com
WhatsApp: +221 76 653 83 84
Km 4, Boulevard du Centenaire, Dakar`;

    const cleanPhone = (supplier?.contactPhone || '').replace(/[^0-9]/g, '');
    const whatsappUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
      : `https://wa.me/221766538384?text=${encodeURIComponent(messageText)}`;

    const emailSubject = `[PURCHASE ORDER] ${poRef} - Zone Équipements Sénégal`;
    const emailUrl = `mailto:${supplier?.contactEmail || 'zoneequipements@gmail.com'}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(messageText)}`;

    return {
      poRef,
      dateStr,
      supplier,
      orders,
      aggregatedItems,
      totalUnits,
      messageText,
      whatsappUrl,
      emailUrl
    };
  }

  // Génération de notification client selon l'état de la commande
  public generateClientStatusNotification(order: Order, newStatus: Order['status']) {
    const statusMessages: Record<Order['status'], { title: string; body: string }> = {
      'Reçue': {
        title: 'Confirmation de réception de votre demande',
        body: `Bonjour ${order.customerName},\n\nNous avons bien reçu votre demande / commande N° ${order.orderNumber} sur Zone Équipements Sénégal. Notre équipe technique prépare votre dossier.\n\nMontant total : ${order.totalTTC.toLocaleString('fr-FR')} FCFA.\nContact: zoneequipements@gmail.com / +221 76 653 83 84.`
      },
      'En attente paiement': {
        title: 'En attente de confirmation de paiement',
        body: `Bonjour ${order.customerName},\n\nVotre commande N° ${order.orderNumber} est validée. Merci d'effectuer le règlement (${order.paymentMethod}) de ${order.totalTTC.toLocaleString('fr-FR')} FCFA pour lancer le sourcing et la réservation de vos équipements.\n\nAssistance: +221 76 653 83 84.`
      },
      'Payée': {
        title: 'Paiement confirmé - Lancement de l\'approvisionnement',
        body: `Bonjour ${order.customerName},\n\nNous confirmons la bonne réception du paiement pour votre commande N° ${order.orderNumber}. Votre matériel est désormais transmis au fabricant d'origine pour préparation immédiate.`
      },
      'Commandée fournisseur': {
        title: 'Commande transmise à l\'usine partenaire',
        body: `Bonjour ${order.customerName},\n\nExcellente nouvelle ! Les pièces de votre commande N° ${order.orderNumber} ont été commandées directement auprès de l'usine d'origine. Les tests de conformité sont en cours.`
      },
      'En transit': {
        title: 'Vos équipements sont en cours de transit international',
        body: `Bonjour ${order.customerName},\n\nVotre commande N° ${order.orderNumber} a quitté les entrepôts export et se trouve actuellement en transit sécurisé vers le Sénégal.`
      },
      'Dédouanement': {
        title: 'Arrivée au Sénégal - Procédure douanière',
        body: `Bonjour ${order.customerName},\n\nVotre commande N° ${order.orderNumber} est arrivée sur le territoire sénégalais. Nos agents gèrent les formalités de dédouanement et le contrôle d'intégrité.`
      },
      'Reçue en entrepôt': {
        title: 'Matériel disponible dans notre entrepôt de Dakar',
        body: `Bonjour ${order.customerName},\n\nVotre commande N° ${order.orderNumber} est arrivée dans nos entrepôts de Dakar. Vous pouvez venir la retirer ou confirmer la livraison sur votre site de production.`
      },
      'Livrée': {
        title: 'Commande livrée avec succès',
        body: `Bonjour ${order.customerName},\n\nVotre commande N° ${order.orderNumber} a été réceptionnée avec succès. Nous vous remercions pour votre confiance en Zone Équipements Sénégal.`
      },
      'Annulée': {
        title: 'Notification d\'annulation de commande',
        body: `Bonjour ${order.customerName},\n\nVotre commande N° ${order.orderNumber} a été annulée. Pour toute question, veuillez nous contacter à zoneequipements@gmail.com ou au +221 76 653 83 84.`
      }
    };

    const notif = statusMessages[newStatus] || {
      title: `Mise à jour commande ${order.orderNumber}`,
      body: `Bonjour ${order.customerName},\n\nVotre commande N° ${order.orderNumber} est maintenant au statut : "${newStatus}".`
    };

    const cleanPhone = (order.customerPhone || '').replace(/[^0-9]/g, '');
    const whatsappUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(notif.body)}`
      : `https://wa.me/221766538384?text=${encodeURIComponent(notif.body)}`;

    const emailSubject = `[Zone Équipements] ${notif.title} - Commande ${order.orderNumber}`;
    const emailUrl = `mailto:${order.customerEmail || 'zoneequipements@gmail.com'}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(notif.body)}`;

    return {
      title: notif.title,
      body: notif.body,
      whatsappUrl,
      emailUrl
    };
  }

  public recordOrderNotification(orderId: string, record: Omit<OrderNotificationRecord, 'date'>) {
    const order = this.getOrderById(orderId);
    if (!order) return;
    if (!order.notifications) order.notifications = [];
    order.notifications.unshift({
      ...record,
      date: new Date().toISOString()
    });
    this.saveOrders();
    setDoc(doc(db, 'orders', String(orderId)), order).catch(console.error);
    this.notifyOrdersChange();
  }

  public updateOrderSupplierPo(orderId: string, poStatus: Order['supplierPoStatus'], paymentLink?: string) {
    const order = this.getOrderById(orderId);
    if (!order) return;
    order.supplierPoStatus = poStatus;
    if (paymentLink) order.supplierPaymentLink = paymentLink;
    order.updatedAt = new Date().toISOString();
    this.saveOrders();
    setDoc(doc(db, 'orders', String(orderId)), order).catch(console.error);
    this.notifyOrdersChange();
  }

  // ================= AUDIT =================
  public getAuditLogs(): AuditLog[] {
    return this.auditLogs;
  }
}

export const catalogService = new CatalogService();

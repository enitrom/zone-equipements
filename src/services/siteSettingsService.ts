import { CATEGORIES as DEFAULT_CATEGORIES } from '../constants';
import { db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export interface SectorItem {
  id: string;
  name: string;
  img: string; // url or keyword
  desc: string;
}

export interface CategoryItem {
  name: string;
  brands: string;
  icon: string;
  description: string;
  subcategories: { name: string; icon: string }[];
}

export interface BrandItem {
  name: string;
  sub: string;
  iconName: string;
}

export interface PromoCode {
  id: string;
  code: string; // ex: BIENVENUE10, DAKAR2026
  discountType: 'percent' | 'fixed'; // 'percent' pour % ou 'fixed' pour montant en FCFA
  discountValue: number; // ex: 10 pour 10%, ou 20000 pour 20 000 FCFA
  minOrderAmount?: number; // Montant minimum de commande en FCFA
  maxUses?: number; // Nombre d'utilisations maximum autorisées (0 = illimité)
  usedCount: number; // Compteur réel d'utilisations
  startDate?: string; // Date de début de validité (YYYY-MM-DD)
  expiryDate?: string; // Date de fin de validité (YYYY-MM-DD)
  isActive: boolean; // Actif / Suspendu
  description?: string; // Description interne / pour le client
  createdAt?: string;
}

export interface SiteSettings {
  companyName: string;
  phone: string;
  phoneDisplay: string;
  email: string;
  address: string;
  heroTitle: string;
  heroSubtitle: string;
  heroBgImage: string;
  bannerNotice?: string;
  applyVatByDefault: boolean;
  defaultVatRate: number; // 0.18 (18%)
  defaultMarginRate: number; // 0.35 (35%)
  airFreightPerKgXOF: number;
  seaFreightPerKgXOF: number;
  seaFreightPerCbmXOF: number;
  transitInsuranceRate: number;
  seaFreightDurationDays?: string; // e.g. "30 - 45 jours"
  airFreightDurationDays?: string; // e.g. "5 - 10 jours"
  localDeliveryDurationDays?: string; // e.g. "24 - 48h"
  usdExchangeRate: number;
  eurExchangeRate: number;
  cnyExchangeRate: number;
  // Remise globale pour tous les produits (réglages généraux du site)
  enableGlobalDiscount?: boolean;
  globalDiscountPercent?: number; // Ex: 5 pour 5%
  globalDiscountLabel?: string; // Ex: "Remise B2B Partenaires"
}

const DEFAULT_SECTORS: SectorItem[] = [
  { id: 'sec-1', name: "Mines & Carrières", img: "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=600&auto=format&fit=crop&q=80", desc: "Équipements lourds, pompes submersibles d'exhaure, filtration et sécurité." },
  { id: 'sec-2', name: "Agriculture & Élevage", img: "https://images.unsplash.com/photo-1586771107445-d3ca888129ff?w=600&auto=format&fit=crop&q=80", desc: "Moteurs thermiques et de transmission, hydraulique et mécanisation agricole." },
  { id: 'sec-3', name: "BTP & Génie Civil", img: "https://images.unsplash.com/photo-1541888946425-d0fbb180c5f5?w=600&auto=format&fit=crop&q=80", desc: "Systèmes d'ancrage structurel Hilti, électroportatif de chantier et levage." },
  { id: 'sec-4', name: "Énergie & Électricité", img: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600&auto=format&fit=crop&q=80", desc: "Câbles industriels armés, instrumentation de mesure Fluke, armoires de distribution." },
  { id: 'sec-5', name: "Chimie & Pétrochimie", img: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80", desc: "Robinetterie industrielle ATEX, raccords inox, étanchéités de process Loctite." },
  { id: 'sec-6', name: "Agroalimentaire", img: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&auto=format&fit=crop&q=80", desc: "Tuyaux sanitaires certifiés, moteurs inoxydables, instrumentation hygiénique." },
  { id: 'sec-7', name: "Maritime & Ports", img: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&auto=format&fit=crop&q=80", desc: "Systèmes d’élingage lourds, câbles d’acier marine, anodes sacrificielles MRO." },
  { id: 'sec-8', name: "Manufacture & Assemblage", img: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80", desc: "Automatisation Siemens, capteurs d'origine, courroies de convoyeur SKF." }
];

const DEFAULT_BRANDS: BrandItem[] = [
  { name: "MAKITA", sub: "Outillage Pro", iconName: "Zap" },
  { name: "BOSCH", sub: "Électroportatif", iconName: "Zap" },
  { name: "SIEMENS", sub: "Automatisme & Énergie", iconName: "Cpu" },
  { name: "3M", sub: "Fournitures & Sécurité", iconName: "Shield" },
  { name: "FLUKE", sub: "Instrumentation", iconName: "Gauge" },
  { name: "SKF", sub: "Roulements & Transmission", iconName: "Settings" },
  { name: "SCHNEIDER", sub: "Distribution Électrique", iconName: "Cpu" },
  { name: "ABB", sub: "Moteurs & Robotique", iconName: "Cpu" },
  { name: "HILTI", sub: "Ancre & Forage", iconName: "Hammer" },
  { name: "CATERPILLAR", sub: "Pièces Moteur", iconName: "Wrench" },
  { name: "LOCTITE", sub: "Fixation & Adhésifs", iconName: "StickyNote" },
  { name: "FACOM", sub: "Outillage de Précision", iconName: "Wrench" },
  { name: "LEGRAND", sub: "Appareillage Industriel", iconName: "Box" },
  { name: "SMC", sub: "Automatisation Pneumatique", iconName: "Wind" },
  { name: "GRUNDFOS", sub: "Pompes Hydrauliques", iconName: "Waves" },
  { name: "DEWALT", sub: "Outillage Pro", iconName: "Zap" },
  { name: "MILWAUKEE", sub: "Électroportatif Fort", iconName: "Zap" },
  { name: "KÄRCHER", sub: "Nettoyage Pro", iconName: "Sparkles" },
  { name: "SANDVIK", sub: "Outils de Coupe", iconName: "Wrench" },
  { name: "PARKER", sub: "Hydraulique HP", iconName: "Droplets" },
  { name: "EATON", sub: "Gestion Énergie", iconName: "Cpu" },
  { name: "WILO", sub: "Pompes de Transfert", iconName: "Waves" },
  { name: "FESTO", sub: "Pneumatique", iconName: "Wind" },
  { name: "TIMKEN", sub: "Billes & Transmission", iconName: "Settings" },
  { name: "BOSCH REXROTH", sub: "Hydraulique Connectée", iconName: "Activity" },
  { name: "STANLEY", sub: "Outils Manuels", iconName: "Wrench" },
  { name: "RIDGID", sub: "Outillage de Plomberie", iconName: "Wrench" },
  { name: "METABO", sub: "Matériel d'Atelier", iconName: "Zap" }
];

const DEFAULT_SETTINGS: SiteSettings = {
  companyName: "Zone Équipements Sénégal",
  phone: "00221766538384",
  phoneDisplay: "+221 76 653 83 84",
  email: "zoneequipements@gmail.com",
  address: "Km 4, Boulevard du Centenaire, Dakar, Sénégal",
  heroTitle: "L'Excellence Industrielle Mondiale, Livrée en Afrique",
  heroSubtitle: "Zone Équipements Sénégal est votre plateforme unique pour le sourcing, la comparaison et l'achat de matériel MRO et industriel de haute performance.",
  heroBgImage: "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=1920&auto=format&fit=crop&q=80",
  bannerNotice: "",
  applyVatByDefault: true,
  defaultVatRate: 0.18,
  defaultMarginRate: 0.35,
  airFreightPerKgXOF: 7500,
  seaFreightPerKgXOF: 1800,
  seaFreightPerCbmXOF: 250000,
  transitInsuranceRate: 0.05,
  seaFreightDurationDays: "30 - 45 jours",
  airFreightDurationDays: "5 - 10 jours",
  localDeliveryDurationDays: "24 - 48h",
  usdExchangeRate: 610,
  eurExchangeRate: 655.957,
  cnyExchangeRate: 85,
  enableGlobalDiscount: false,
  globalDiscountPercent: 5,
  globalDiscountLabel: "Remise Commerciale B2B"
};

const DEFAULT_PROMO_CODES: PromoCode[] = [
  {
    id: 'promo-1',
    code: 'BIENVENUE10',
    discountType: 'percent',
    discountValue: 10,
    minOrderAmount: 0,
    maxUses: 100,
    usedCount: 0,
    startDate: '2025-01-01',
    expiryDate: '2027-12-31',
    isActive: true,
    description: '10% de bienvenue pour tout premier achat industriel',
    createdAt: new Date().toISOString()
  },
  {
    id: 'promo-2',
    code: 'DAKAR2026',
    discountType: 'fixed',
    discountValue: 20000,
    minOrderAmount: 200000,
    maxUses: 50,
    usedCount: 0,
    startDate: '2025-01-01',
    expiryDate: '2027-12-31',
    isActive: true,
    description: '20 000 FCFA de remise dès 200 000 FCFA de commande',
    createdAt: new Date().toISOString()
  }
];

const SETTINGS_STORAGE_KEYS = {
  SETTINGS: 'ze_settings_config_v2',
  SECTORS: 'ze_settings_sectors_v2',
  CATEGORIES: 'ze_settings_categories_v2',
  BRANDS: 'ze_settings_brands_v2',
  PROMO_CODES: 'ze_settings_promos_v2',
};

class SiteSettingsService {
  private settings: SiteSettings = DEFAULT_SETTINGS;
  private sectors: SectorItem[] = DEFAULT_SECTORS;
  private categories: CategoryItem[] = DEFAULT_CATEGORIES as CategoryItem[];
  private brands: BrandItem[] = DEFAULT_BRANDS;
  private promoCodes: PromoCode[] = DEFAULT_PROMO_CODES;
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

  private init() {
    // 1. Initialiser depuis localStorage immédiatement
    if (typeof window !== 'undefined') {
      try {
        const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEYS.SETTINGS);
        if (savedSettings) this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
      } catch {}

      try {
        const savedSectors = localStorage.getItem(SETTINGS_STORAGE_KEYS.SECTORS);
        if (savedSectors) {
          const parsed = JSON.parse(savedSectors);
          if (Array.isArray(parsed)) this.sectors = parsed;
        }
      } catch {}

      try {
        const savedCats = localStorage.getItem(SETTINGS_STORAGE_KEYS.CATEGORIES);
        if (savedCats) {
          const parsed = JSON.parse(savedCats);
          if (Array.isArray(parsed)) this.categories = parsed;
        }
      } catch {}

      try {
        const savedBrands = localStorage.getItem(SETTINGS_STORAGE_KEYS.BRANDS);
        if (savedBrands) {
          const parsed = JSON.parse(savedBrands);
          if (Array.isArray(parsed)) this.brands = parsed;
        }
      } catch {}

      try {
        const savedPromos = localStorage.getItem(SETTINGS_STORAGE_KEYS.PROMO_CODES);
        if (savedPromos) {
          const parsed = JSON.parse(savedPromos);
          if (Array.isArray(parsed)) this.promoCodes = parsed;
        }
      } catch {}
    }

    try {
      // 1. Écouteur temps réel pour la configuration globale
      onSnapshot(doc(db, 'settings', 'config'), (snap) => {
        if (snap.exists()) {
          this.settings = { ...DEFAULT_SETTINGS, ...snap.data().settings };
          this.saveLocalSettings();
        } else {
          setDoc(doc(db, 'settings', 'config'), { settings: DEFAULT_SETTINGS }).catch(console.error);
        }
        this.notify('settings');
      }, (error) => {
        if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
          console.info("Firestore en mode hors ligne (configuration)");
        } else {
          console.warn("Synchronisation configuration settings:", error.message || error);
        }
      });

      // 2. Écouteur temps réel pour les secteurs
      onSnapshot(doc(db, 'settings', 'sectors'), (snap) => {
        if (snap.exists()) {
          this.sectors = snap.data().sectors || [];
          this.saveLocalSectors();
        } else {
          setDoc(doc(db, 'settings', 'sectors'), { sectors: DEFAULT_SECTORS }).catch(console.error);
        }
        this.notify('sectors');
      }, (error) => {
        if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
          console.info("Firestore en mode hors ligne (secteurs)");
        } else {
          console.warn("Synchronisation secteurs settings:", error.message || error);
        }
      });

      // 3. Écouteur temps réel pour les catégories
      onSnapshot(doc(db, 'settings', 'categories'), (snap) => {
        if (snap.exists()) {
          this.categories = snap.data().categories || [];
          this.saveLocalCategories();
        } else {
          setDoc(doc(db, 'settings', 'categories'), { categories: DEFAULT_CATEGORIES }).catch(console.error);
        }
        this.notify('categories');
      }, (error) => {
        if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
          console.info("Firestore en mode hors ligne (catégories)");
        } else {
          console.warn("Synchronisation catégories settings:", error.message || error);
        }
      });

      // 4. Écouteur temps réel pour les marques
      onSnapshot(doc(db, 'settings', 'brands'), (snap) => {
        if (snap.exists()) {
          this.brands = snap.data().brands || [];
          this.saveLocalBrands();
        } else {
          setDoc(doc(db, 'settings', 'brands'), { brands: DEFAULT_BRANDS }).catch(console.error);
        }
        this.notify('brands');
      }, (error) => {
        if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
          console.info("Firestore en mode hors ligne (marques)");
        } else {
          console.warn("Synchronisation marques settings:", error.message || error);
        }
      });

      // 5. Écouteur temps réel pour les codes promo
      onSnapshot(doc(db, 'settings', 'promos'), (snap) => {
        if (snap.exists()) {
          this.promoCodes = snap.data().promoCodes || [];
          this.saveLocalPromos();
        } else {
          setDoc(doc(db, 'settings', 'promos'), { promoCodes: DEFAULT_PROMO_CODES }).catch(console.error);
        }
        this.notify('promos');
      }, (error) => {
        if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
          console.info("Firestore en mode hors ligne (codes promo)");
        } else {
          console.warn("Synchronisation codes promo settings:", error.message || error);
        }
      });

    } catch (e) {
      console.warn("Initialisation des écouteurs de paramètres:", e);
    }
  }

  private saveLocalSettings() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
      } catch {}
    }
  }

  private saveLocalSectors() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEYS.SECTORS, JSON.stringify(this.sectors));
      } catch {}
    }
  }

  private saveLocalCategories() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEYS.CATEGORIES, JSON.stringify(this.categories));
      } catch {}
    }
  }

  private saveLocalBrands() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEYS.BRANDS, JSON.stringify(this.brands));
      } catch {}
    }
  }

  private saveLocalPromos() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEYS.PROMO_CODES, JSON.stringify(this.promoCodes));
      } catch {}
    }
  }

  private async savePromos() {
    this.saveLocalPromos();
    this.notify('promos');
    try {
      await setDoc(doc(db, 'settings', 'promos'), { promoCodes: this.promoCodes });
    } catch (e) {
      console.error("Erreur de sauvegarde des codes promo:", e);
    }
  }

  private async saveSettings() {
    this.saveLocalSettings();
    this.notify('settings');
    try {
      await setDoc(doc(db, 'settings', 'config'), { settings: this.settings });
    } catch (e) {
      console.error("Erreur de sauvegarde de la configuration:", e);
    }
  }

  private async saveSectors() {
    this.saveLocalSectors();
    this.notify('sectors');
    try {
      await setDoc(doc(db, 'settings', 'sectors'), { sectors: this.sectors });
    } catch (e) {
      console.error("Erreur de sauvegarde des secteurs d'activité:", e);
    }
  }

  private async saveCategories() {
    this.saveLocalCategories();
    this.notify('categories');
    try {
      await setDoc(doc(db, 'settings', 'categories'), { categories: this.categories });
    } catch (e) {
      console.error("Erreur de sauvegarde des catégories:", e);
    }
  }

  private async saveBrands() {
    this.saveLocalBrands();
    this.notify('brands');
    try {
      await setDoc(doc(db, 'settings', 'brands'), { brands: this.brands });
    } catch (e) {
      console.error("Erreur de sauvegarde des marques:", e);
    }
  }

  private notify(type: string) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`ze_settings_updated`, { detail: { type } }));
    }
    this.listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  }

  // --- Settings ---
  public getSettings(): SiteSettings {
    return { ...this.settings };
  }

  public updateSettings(updates: Partial<SiteSettings>): SiteSettings {
    this.settings = { ...this.settings, ...updates };
    this.saveSettings();
    return this.getSettings();
  }

  // --- Sectors ---
  public getSectors(): SectorItem[] {
    return [...this.sectors];
  }

  public addSector(sector: Omit<SectorItem, 'id'>): SectorItem {
    const newSector: SectorItem = {
      ...sector,
      id: `sec-${Date.now()}`
    };
    this.sectors.push(newSector);
    this.saveSectors();
    return newSector;
  }

  public updateSector(id: string, updates: Partial<SectorItem>): SectorItem | null {
    const idx = this.sectors.findIndex(s => s.id === id);
    if (idx === -1) return null;
    this.sectors[idx] = { ...this.sectors[idx], ...updates };
    this.saveSectors();
    return this.sectors[idx];
  }

  public deleteSector(id: string): boolean {
    const prevLen = this.sectors.length;
    this.sectors = this.sectors.filter(s => s.id !== id);
    if (this.sectors.length !== prevLen) {
      this.saveSectors();
      return true;
    }
    return false;
  }

  // --- Categories ---
  public getCategories(): CategoryItem[] {
    return [...this.categories];
  }

  public addCategory(cat: CategoryItem): CategoryItem {
    this.categories.push(cat);
    this.saveCategories();
    return cat;
  }

  public updateCategory(originalName: string, updates: Partial<CategoryItem>): CategoryItem | null {
    const idx = this.categories.findIndex(c => c.name === originalName);
    if (idx === -1) return null;
    this.categories[idx] = { ...this.categories[idx], ...updates };
    this.saveCategories();
    return this.categories[idx];
  }

  public deleteCategory(name: string): boolean {
    const prev = this.categories.length;
    this.categories = this.categories.filter(c => c.name !== name);
    if (this.categories.length !== prev) {
      this.saveCategories();
      return true;
    }
    return false;
  }

  public addSubcategory(categoryName: string, subcategory: { name: string; icon: string }): boolean {
    const cat = this.categories.find(c => c.name === categoryName);
    if (!cat) return false;
    if (!cat.subcategories) cat.subcategories = [];
    cat.subcategories.push(subcategory);
    this.saveCategories();
    return true;
  }

  public deleteSubcategory(categoryName: string, subcategoryName: string): boolean {
    const cat = this.categories.find(c => c.name === categoryName);
    if (!cat || !cat.subcategories) return false;
    cat.subcategories = cat.subcategories.filter(s => s.name !== subcategoryName);
    this.saveCategories();
    return true;
  }

  // --- Brands ---
  public getBrands(): BrandItem[] {
    return [...this.brands];
  }

  public addBrand(brand: BrandItem): BrandItem {
    this.brands.push(brand);
    this.saveBrands();
    return brand;
  }

  public updateBrand(name: string, updates: Partial<BrandItem>): BrandItem | null {
    const idx = this.brands.findIndex(b => b.name.toLowerCase() === name.toLowerCase());
    if (idx === -1) return null;
    this.brands[idx] = { ...this.brands[idx], ...updates };
    this.saveBrands();
    return this.brands[idx];
  }

  public deleteBrand(name: string): boolean {
    this.brands = this.brands.filter(b => b.name.toLowerCase() !== name.toLowerCase());
    this.saveBrands();
    return true;
  }

  // --- Codes Promo & Réductions Panier ---
  public getPromoCodes(): PromoCode[] {
    return [...this.promoCodes];
  }

  public savePromoCode(promo: Partial<PromoCode> & { code: string; discountType: 'percent' | 'fixed'; discountValue: number }): PromoCode {
    const cleanCode = promo.code.trim().toUpperCase();
    const existingIdx = this.promoCodes.findIndex(p => p.id === promo.id || p.code.toUpperCase() === cleanCode);

    const completePromo: PromoCode = {
      id: promo.id || `promo-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      code: cleanCode,
      discountType: promo.discountType,
      discountValue: Number(promo.discountValue) || 0,
      minOrderAmount: promo.minOrderAmount ? Number(promo.minOrderAmount) : undefined,
      maxUses: promo.maxUses !== undefined ? Number(promo.maxUses) : undefined,
      usedCount: Number(promo.usedCount) || 0,
      startDate: promo.startDate || new Date().toISOString().split('T')[0],
      expiryDate: promo.expiryDate || '2027-12-31',
      isActive: promo.isActive ?? true,
      description: promo.description || '',
      createdAt: promo.createdAt || new Date().toISOString()
    };

    if (existingIdx !== -1) {
      this.promoCodes[existingIdx] = completePromo;
    } else {
      this.promoCodes.unshift(completePromo);
    }

    this.savePromos();
    return completePromo;
  }

  public deletePromoCode(id: string): boolean {
    const prev = this.promoCodes.length;
    this.promoCodes = this.promoCodes.filter(p => p.id !== id);
    if (this.promoCodes.length !== prev) {
      this.savePromos();
      return true;
    }
    return false;
  }

  public validatePromoCode(rawCode: string, equipmentTotal: number): {
    valid: boolean;
    promo?: PromoCode;
    message: string;
    discountAmount: number;
  } {
    if (!rawCode || !rawCode.trim()) {
      return { valid: false, message: "Veuillez saisir un code promo.", discountAmount: 0 };
    }

    const cleanCode = rawCode.trim().toUpperCase();
    const promo = this.promoCodes.find(p => p.code.toUpperCase() === cleanCode);

    if (!promo) {
      return { valid: false, message: `Le code promo "${cleanCode}" n'existe pas ou est invalide.`, discountAmount: 0 };
    }

    if (!promo.isActive) {
      return { valid: false, message: `Le code promo "${cleanCode}" est actuellement désactivé.`, discountAmount: 0 };
    }

    // Check validity dates
    const todayStr = new Date().toISOString().split('T')[0];
    if (promo.startDate && todayStr < promo.startDate) {
      return { valid: false, message: `Ce code promo ne sera actif qu'à partir du ${promo.startDate}.`, discountAmount: 0 };
    }

    if (promo.expiryDate && todayStr > promo.expiryDate) {
      return { valid: false, message: `Ce code promo a expiré le ${promo.expiryDate}.`, discountAmount: 0 };
    }

    // Check usage limits
    if (promo.maxUses && promo.maxUses > 0 && promo.usedCount >= promo.maxUses) {
      return { valid: false, message: `Ce code promo a atteint sa limite maximale d'utilisations (${promo.maxUses}).`, discountAmount: 0 };
    }

    // Check minimum order amount
    if (promo.minOrderAmount && promo.minOrderAmount > 0 && equipmentTotal < promo.minOrderAmount) {
      return {
        valid: false,
        message: `Montant minimum d'équipement de ${promo.minOrderAmount.toLocaleString('fr-FR')} FCFA requis pour utiliser ce code (actuel: ${equipmentTotal.toLocaleString('fr-FR')} FCFA).`,
        discountAmount: 0
      };
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (promo.discountType === 'percent') {
      discountAmount = Math.round((equipmentTotal * promo.discountValue) / 100);
    } else {
      discountAmount = Math.min(equipmentTotal, promo.discountValue);
    }

    return {
      valid: true,
      promo,
      message: `Code promo "${cleanCode}" appliqué avec succès (-${discountAmount.toLocaleString('fr-FR')} FCFA) !`,
      discountAmount
    };
  }

  public async incrementPromoCodeUsage(rawCode: string): Promise<void> {
    const cleanCode = rawCode.trim().toUpperCase();
    const promo = this.promoCodes.find(p => p.code.toUpperCase() === cleanCode);
    if (promo) {
      promo.usedCount = (promo.usedCount || 0) + 1;
      this.savePromos();
    }
  }
}

export const siteSettingsService = new SiteSettingsService();

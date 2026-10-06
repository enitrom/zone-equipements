import { CATEGORIES } from '../constants';
import { db, auth } from '../firebase';
import { doc, onSnapshot, setDoc, collection, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { DEFAULT_SUPPORTED_DELIVERY_COUNTRIES } from '../utils/countries';

export interface SubcategoryItem {
  name: string;
  icon: string;
}

export interface CategoryItem {
  name: string;
  brands: string;
  icon: string;
  description: string;
  subcategories: SubcategoryItem[];
}

export interface SectorItem {
  id: string;
  name: string;
  desc: string;
  img: string;
}

export interface BrandItem {
  name: string;
  sub: string;
  iconName: string;
  featured?: boolean; // Afficher sur la page d'accueil
  logo?: string;
}

export interface TestimonialItem {
  id: string;
  name: string;
  role: string;
  company?: string;
  sector?: string;
  text: string;
  rating: number;
}

export interface ArticleItem {
  id: string;
  slug: string;
  title: string;
  category: string;
  date: string;
  readTime: string;
  img: string;
  description: string;
  content: string;
  author?: string;
  relatedCategory?: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  company?: string;
  subscribedAt: string;
  source?: string;
  tags?: string[];
}

export interface FaqItem {
  id: string;
  q: string;
  a: string;
  category?: string;
}

export interface ExchangeRates {
  USD: number;
  EUR: number;
  CNY: number;
  GBP: number;
  XOF: number;
}

export interface PromoCode {
  id?: string;
  code: string;
  discountPercent: number;
  discountFixed?: number;
  discountType?: 'percent' | 'fixed';
  discountValue?: number;
  minOrderAmount?: number;
  active: boolean;
  description?: string;
  expiresAt?: string;
  usageCount: number;
  maxUsage?: number; // 0 or undefined = illimité (global)
  maxUsagePerAccount?: number; // 0 or undefined = illimité par compte
  usageByAccount?: Record<string, number>; // Suivi du nombre d'utilisations par compte (uid / email / téléphone)
}

export interface PaydunyaSettings {
  enabled: boolean;
  mode: 'live' | 'test';
  masterKey: string;
  testPublicKey: string;
  testPrivateKey: string;
  testToken: string;
  livePublicKey: string;
  livePrivateKey: string;
  liveToken: string;
  ipnEnabled: boolean;
  palEnabled: boolean;
  perEnabled: boolean;
  invoiceEmailEnabled: boolean;
  authorizedMethods: {
    card: boolean;
    senegal: string[];
    benin: string[];
    burkinaFaso: string[];
    coteDivoire: string[];
    mali: string[];
    togo: string[];
    cameroun: string[];
  };
}

export interface AdminPermissions {
  pos: boolean;       // Magasin Physique & Caisse POS
  catalog: boolean;   // Catalogue & Matériels
  orders: boolean;    // Commandes, Devis & Facturation
  suppliers: boolean; // Fournisseurs & Transit
  finance: boolean;   // Finance & Marges & Pilotage
  security: boolean;  // Paramètres & Sécurité & Utilisateurs
}

export const DEFAULT_ADMIN_PERMISSIONS: AdminPermissions = {
  pos: true,
  catalog: true,
  orders: true,
  suppliers: true,
  finance: true,
  security: true
};

export interface SiteSettings {
  heroTitle: string;
  heroSubtitle: string;
  heroBgImage: string;
  vatRate: number; // En pourcentage ex: 18
  vatEnabled?: boolean; // Si false ou vatRate <= 0, désactive automatiquement la TVA sur l'import de produit
  defaultVatRate?: number; // En décimal ex: 0.18 (synchronisé automatiquement avec vatRate)
  applyVatByDefault?: boolean;
  taxRegime?: 'REEL' | 'CGU' | 'FRANCHISE'; // Régime fiscal principal (Régime Réel TVA 18%, CGU 5% forfaitaire, Franchise Art. 283)
  cguActivityType?: 'COMMERCE' | 'SERVICES'; // Commerce (seuil 50M FCFA) ou Services (seuil 100M FCFA)
  dgidNormalizedInvoicing?: boolean; // Factures normalisées DGID avec code validation / QR code
  withholdingTaxRateBRS?: number; // Retenue BRS sur prestations (ex: 0.05 = 5%)
  withholdingTaxRateRent?: number; // Retenue à la source sur loyers (ex: 0.05 = 5%)
  withholdingTaxRateForeign?: number; // Retenue sur prestataires étrangers (ex: 0.20 = 20% Art. 201 CGI)
  tafRateStandard?: number; // Taux standard TAF (ex: 0.17 = 17%)
  tafRateReduced?: number; // Taux réduit TAF export (ex: 0.07 = 7%)
  defaultMarginPercentage: number;
  systemFreightEnabled?: boolean; // Si false, désactive les paramètres de fret système (et toujours ignorés lorsqu'un entrepôt est assigné)
  supportedDeliveryCountries?: string[]; // Pays pris en charge par défaut pour la livraison client
  defaultClientCountry?: string; // Pays par défaut du client (ex: Sénégal)
  airFreightPerKg: number;
  airFreightPerKgXOF?: number;
  airFreightMin: number;
  airFreightDuration: string;
  airFreightDurationDays?: string;
  seaFreightPerKg: number;
  seaFreightPerKgXOF?: number;
  seaFreightMin: number;
  seaFreightDuration: string;
  seaFreightDurationDays?: string;
  seaFreightPerCbmUSD?: number;
  expressFreightPerKg: number;
  expressFreightMin: number;
  expressFreightDuration: string;
  localDeliveryDurationDays?: string;
  exchangeRates: ExchangeRates;
  companyName: string;
  companyLogo?: string;
  companySubtitle?: string;
  companyBadge?: string;
  companyAddress: string;
  address?: string;
  companyPhone: string;
  phoneNumber?: string;
  companyEmail: string;
  contactEmail?: string;
  whatsappNumber: string;
  rccm: string;
  ninea: string;
  adminEmails: string[];
  deletedAdminEmails?: string[];
  adminPermissionsMap?: Record<string, AdminPermissions>;
  enableGlobalDiscount?: boolean;
  globalDiscountPercent?: number;
  globalDiscountLabel?: string;
  promoCodes: PromoCode[];
  deletedPromoCodes?: string[];
  paydunya: PaydunyaSettings;

  // Customization of Sections & Titles (Editable default sections & Elementor-style ordering)
  homeSectionsOrder?: string[];
  logisticsBadge?: string;
  logisticsTitle?: string;
  logisticsSubtitle?: string;
  logisticsRegions?: Array<{ name: string; countries: string }>;
  logisticsPartners?: string[];
  brandsTitle?: string;
  brandsSubtitle?: string;
  sectorsTitle?: string;
  sectorsSubtitle?: string;
  categoriesTitle?: string;
  categoriesSubtitle?: string;
  testimonialsTitle?: string;
  testimonialsSubtitle?: string;
  articlesTitle?: string;
  articlesSubtitle?: string;
  faqTitle?: string;
  faqSubtitle?: string;

  // Customization of Footer (Pied de page personnalisable & modifiable item par item)
  footerBioText?: string;
  footerBadges?: string[];
  footerLinksTitle?: string;
  footerLinks?: Array<{ id?: string; label: string; url: string }>;
  footerPaymentsTitle?: string;
  footerPaymentsDesc?: string;
  footerPaymentBadges?: string[];
  footerContactTitle?: string;
  footerContactDesc?: string;
  footerContactEmail?: string;
  footerContactPhone?: string;
  footerContactAddress?: string;
  footerCopyrightText?: string;
  footerBottomLinks?: Array<{ id?: string; label: string; url: string }>;
}

const STORAGE_KEYS = {
  SETTINGS: 'ze_site_settings_v1',
  SECTORS: 'ze_site_sectors_v1',
  CATEGORIES: 'ze_site_categories_v1',
  BRANDS: 'ze_site_brands_v1',
  TESTIMONIALS: 'ze_site_testimonials_v1',
  ARTICLES: 'ze_site_articles_v1',
  FAQS: 'ze_site_faqs_v1',
  SUBSCRIBERS: 'ze_newsletter_subscribers_v1',
  DELETED_STRUCTURE: 'ze_deleted_structure_v1',
  PROMO_PURGED_FLAG: 'ze_old_promos_purged_v2',
  CLIENT_ACCOUNT_ID: 'ze_client_account_id_v1'
};

interface DeletedStructureRegistry {
  categories: string[];
  sectors: string[];
  brands: string[];
  testimonials?: string[];
  articles?: string[];
  faqs?: string[];
}

function sanitizeForFirestore<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function cleanCompanyName(name?: string): string {
  if (!name || !name.trim()) return 'ZONE ÉQUIPEMENTS';
  const cleaned = name
    .replace(/\bS\.?A\.?R\.?L\.?\b/gi, '')
    .replace(/^ZONE\s+[ÉE]QUIPEMENTS\s+S[ÉE]N[ÉE]GAL$/i, 'ZONE ÉQUIPEMENTS')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return cleaned || 'ZONE ÉQUIPEMENTS';
}

function normalizePromoCode(p: Partial<PromoCode> & { code: string }): PromoCode {
  const code = (p.code || '').trim().toUpperCase();
  const isFixed = p.discountType === 'fixed' || (p.discountFixed !== undefined && p.discountFixed > 0 && !(p.discountPercent && p.discountPercent > 0));
  const discountFixed = isFixed ? Number(p.discountFixed ?? p.discountValue ?? 0) : Number(p.discountFixed ?? 0);
  const discountPercent = !isFixed ? Number(p.discountPercent ?? p.discountValue ?? 0) : 0;
  const discountType: 'percent' | 'fixed' = isFixed ? 'fixed' : 'percent';
  const discountValue = isFixed ? discountFixed : discountPercent;

  return {
    id: p.id || code,
    code,
    discountPercent,
    discountFixed,
    discountType,
    discountValue,
    minOrderAmount: Number(p.minOrderAmount || 0),
    active: p.active ?? true,
    description: p.description || (isFixed ? `Remise de ${discountFixed.toLocaleString('fr-FR')} FCFA` : `Remise de ${discountPercent}%`),
    expiresAt: p.expiresAt || undefined,
    usageCount: Number(p.usageCount || 0),
    maxUsage: Number(p.maxUsage || 0),
    maxUsagePerAccount: Number(p.maxUsagePerAccount || 0),
    usageByAccount: p.usageByAccount && typeof p.usageByAccount === 'object' ? p.usageByAccount : {}
  };
}

const DEFAULT_SETTINGS: SiteSettings = {
  heroTitle: "Fournitures Industrielles & MRO en Afrique de l'Ouest",
  heroSubtitle: "Sourcing direct auprès des plus grands fabricants mondiaux. Fret maritime & aérien international avec barèmes logistiques partenaires.",
  heroBgImage: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1920&auto=format&fit=crop&q=80",
  vatRate: 18,
  vatEnabled: true,
  defaultVatRate: 0.18,
  applyVatByDefault: true,
  taxRegime: 'REEL',
  cguActivityType: 'COMMERCE',
  dgidNormalizedInvoicing: true,
  withholdingTaxRateBRS: 0.05,
  withholdingTaxRateRent: 0.05,
  withholdingTaxRateForeign: 0.20,
  tafRateStandard: 0.17,
  tafRateReduced: 0.07,
  defaultMarginPercentage: 35,
  systemFreightEnabled: true,
  supportedDeliveryCountries: [...DEFAULT_SUPPORTED_DELIVERY_COUNTRIES],
  defaultClientCountry: 'Sénégal',
  airFreightPerKg: 7000,
  airFreightPerKgXOF: 7000,
  airFreightMin: 7000,
  airFreightDuration: '8 à 15 jours',
  airFreightDurationDays: '8 à 15 jours',
  seaFreightPerKg: 1800,
  seaFreightPerKgXOF: 1800,
  seaFreightMin: 8000,
  seaFreightDuration: '20 à 40 jours',
  seaFreightDurationDays: '20 à 40 jours',
  seaFreightPerCbmUSD: 220,
  expressFreightPerKg: 15000,
  expressFreightMin: 22500,
  expressFreightDuration: '3 à 6 jours',
  localDeliveryDurationDays: '24 - 48h',
  exchangeRates: {
    USD: 610,
    EUR: 655.957,
    CNY: 85,
    GBP: 770,
    XOF: 1
  },
  companyName: 'ZONE ÉQUIPEMENTS',
  companyLogo: '',
  companySubtitle: "SÉNÉGAL • AFRIQUE DE L'OUEST",
  companyBadge: 'MRO',
  companyAddress: 'Km 4, Boulevard du Centenaire de la Commune de Dakar, Sénégal',
  address: 'Km 4, Boulevard du Centenaire de la Commune de Dakar, Sénégal',
  companyPhone: '+221 76 653 83 84',
  phoneNumber: '+221 76 653 83 84',
  companyEmail: 'zoneequipements@gmail.com',
  contactEmail: 'zoneequipements@gmail.com',
  whatsappNumber: '221766538384',
  rccm: 'SN-DKR-2024-B-14892',
  ninea: '009482716 2G3',
  adminEmails: [
    'enitrom@gmail.com'
  ],
  deletedAdminEmails: [],
  enableGlobalDiscount: false,
  globalDiscountPercent: 0,
  globalDiscountLabel: 'Remise Catalogue',
  promoCodes: [],
  deletedPromoCodes: [],

  // Dynamic Editable Section Titles & Presentation Content
  homeSectionsOrder: ['hero', 'features', 'delivery', 'sectors', 'categories', 'brands', 'testimonials', 'articles', 'faq'],
  logisticsBadge: "Logistique & Fret Aérien / Maritime",
  logisticsTitle: "Hub Logistique Dakar & Couverture Panafricaine",
  logisticsSubtitle: "Acheminement direct depuis nos usines partenaires en Europe, Asie et Amérique vers le Sénégal et toute l'Afrique. Tarifs de fret indexés sur les barèmes transporteurs réels.",
  logisticsRegions: [
    { name: "Afrique de l'Ouest", countries: "Sénégal, Côte d'Ivoire, Mali, Guinée, Mauritanie, Burkina Faso, Togo, Bénin, Niger, Ghana, Nigeria" },
    { name: "Afrique Centrale", countries: "Cameroun, Gabon, Congo, RDC, Tchad, Guinée Équatoriale, RCA" },
    { name: "Afrique de l'Est", countries: "Kenya, Tanzanie, Ouganda, Rwanda, Éthiopie, Djibouti" },
    { name: "Afrique Australe", countries: "Afrique du Sud, Angola, Mozambique, Zambie, Namibie" },
    { name: "Maghreb & Nord", countries: "Maroc, Algérie, Tunisie, Mauritanie, Égypte" }
  ],
  logisticsPartners: ['DHL Express', 'Aramex', 'FedEx', 'Maersk', 'Bolloré', 'Air France Cargo', 'Emirates SkyCargo'],
  brandsTitle: "Grandes Marques Industrielles Certifiées",
  brandsSubtitle: "Sourcing direct d'origine constructeur et traçabilité intégrale pour chaque référence.",
  sectorsTitle: "Secteurs d'Activité & Chantiers Clés",
  sectorsSubtitle: "Des solutions matérielles calibrées pour les exigences des industries majeures en Afrique de l'Ouest.",
  categoriesTitle: "Catégories d'Équipements & Matériels",
  categoriesSubtitle: "Pour tous vos besoins industriels et maintenance. Sourcing de précision d'origine constructeur.",
  testimonialsTitle: "Témoignages & Retours d'Expérience Clients",
  testimonialsSubtitle: "La satisfaction de nos partenaires industriels, miniers et BTP à travers l'Afrique de l'Ouest.",
  articlesTitle: "Guides Techniques & Actualités Industrielles",
  articlesSubtitle: "Conseils d'ingénieurs, normes de maintenance et analyses de marché pour optimiser vos achats industriels.",
  faqTitle: "Questions Fréquentes & Support Client",
  faqSubtitle: "Tout ce que vous devez savoir sur nos modalités de commande, devis, livraisons et garanties.",

  // Footer defaults
  footerBioText: "Fournisseur d'équipements industriels et de matériel technique au Sénégal et en Afrique de l'Ouest. Sourcing constructeurs directs et logistique sécurisée.",
  footerBadges: ["MRO Certified", "Africa Delivery", "Sourcing Direct"],
  footerLinksTitle: "Navigation & Sourcing",
  footerLinks: [
    { id: 'fl-1', label: "Tout le catalogue", url: "/shop" },
    { id: 'fl-2', label: "Nos Services & Sourcing", url: "/services" },
    { id: 'fl-3', label: "Guides & Actualités", url: "/blog" },
    { id: 'fl-4', label: "Demander une cotation", url: "/contact" },
    { id: 'fl-5', label: "Sourcing sur-mesure", url: "/services" }
  ],
  footerPaymentsTitle: "Paiements Sécurisés & Facturation B2B",
  footerPaymentsDesc: "Réglez vos commandes en toute sécurité via PayDunya (Mobile Money & Cartes bancaires) ou par virement B2B :",
  footerPaymentBadges: ["PayDunya (Wave • OM • Cartes)", "Virement Bancaire B2B"],
  footerContactTitle: "Assistance & Contact B2B",
  footerContactDesc: "Nos ingénieurs industriels vous accompagnent dans le choix de vos références et l'établissement de vos cotations techniques.",
  footerContactEmail: "contact@zone-equipements.sn",
  footerContactPhone: "+221 76 653 83 84 (00221766538384)",
  footerContactAddress: "Dakar, Sénégal - Hub Panafricain",
  footerCopyrightText: "ZONE ÉQUIPEMENTS. Tous droits réservés.",
  footerBottomLinks: [
    { id: 'fbl-1', label: "Conditions Générales", url: "/services" },
    { id: 'fbl-2', label: "Politique de Confidentialité", url: "/contact" }
  ],

  paydunya: {
    enabled: true,
    mode: 'live',
    masterKey: 'ealL1IWV-8gd7-JaP4-PUiw-yCKMqvb5LIre',
    testPublicKey: 'test_public_fny5yq40X4PRoFy1bZWixYZVwyd',
    testPrivateKey: 'test_private_CVuZLx3U2Bp9gy3paIsOqqYr0N8',
    testToken: 'CLbHlYMPffHYrcVKQk1k',
    livePublicKey: 'live_public_M0Gf36EuzZfliznRR094TPHePws',
    livePrivateKey: 'live_private_jIYw9cnrYhQZpOoxENlit0Hi8Dn',
    liveToken: 'n6nDlDGfmbnZhtKPM5X6',
    ipnEnabled: true,
    palEnabled: false,
    perEnabled: true,
    invoiceEmailEnabled: true,
    authorizedMethods: {
      card: true,
      senegal: ['ORANGE MONEY SENEGAL', 'EXPRESSO SN', 'FREE MONEY SENEGAL', 'WAVE SENEGAL', 'DJAMO SN'],
      benin: ['MOOV BENIN', 'MTN BENIN', 'CELTIIS CASH'],
      burkinaFaso: ['ORANGE MONEY BURKINA', 'MOOV BURKINA FASO'],
      coteDivoire: ['ORANGE MONEY CI', 'MTN CI', 'MOOV CI', 'Wave CI', 'DJAMO CI'],
      mali: ['ORANGE MONEY MALI'],
      togo: ['T MONEY TOGO', 'MOOV TOGO'],
      cameroun: ['MTN CAMEROUN']
    }
  }
};

function normalizeSiteSettings(raw: Partial<SiteSettings>, extraDeletedPromos: string[] = [], extraDeletedAdmins: string[] = []): SiteSettings {
  const vatRate = raw.vatRate !== undefined
    ? Number(raw.vatRate)
    : (raw.defaultVatRate !== undefined ? Math.round(Number(raw.defaultVatRate) * 100) : DEFAULT_SETTINGS.vatRate);
  const vatEnabled = raw.vatEnabled !== undefined ? Boolean(raw.vatEnabled) && vatRate > 0 : vatRate > 0;
  const defaultVatRate = vatEnabled ? vatRate / 100 : 0;
  const applyVatByDefault = vatEnabled && (raw.applyVatByDefault ?? true);

  const airFreightPerKg = Number(raw.airFreightPerKg ?? raw.airFreightPerKgXOF ?? DEFAULT_SETTINGS.airFreightPerKg);
  const airFreightMin = Number(raw.airFreightMin ?? DEFAULT_SETTINGS.airFreightMin);
  const airFreightDuration = (raw.airFreightDuration || raw.airFreightDurationDays || DEFAULT_SETTINGS.airFreightDuration).trim();

  const seaFreightPerKg = Number(raw.seaFreightPerKg ?? raw.seaFreightPerKgXOF ?? DEFAULT_SETTINGS.seaFreightPerKg);
  const seaFreightMin = Number(raw.seaFreightMin ?? DEFAULT_SETTINGS.seaFreightMin);
  const seaFreightDuration = (raw.seaFreightDuration || raw.seaFreightDurationDays || DEFAULT_SETTINGS.seaFreightDuration).trim();
  const seaFreightPerCbmUSD = Number(raw.seaFreightPerCbmUSD ?? DEFAULT_SETTINGS.seaFreightPerCbmUSD ?? 220);

  const expressFreightPerKg = Number(raw.expressFreightPerKg ?? DEFAULT_SETTINGS.expressFreightPerKg);
  const expressFreightMin = Number(raw.expressFreightMin ?? DEFAULT_SETTINGS.expressFreightMin);
  const expressFreightDuration = (raw.expressFreightDuration || DEFAULT_SETTINGS.expressFreightDuration).trim();
  const localDeliveryDurationDays = (raw.localDeliveryDurationDays || DEFAULT_SETTINGS.localDeliveryDurationDays || '24 - 48h').trim();

  const companyName = cleanCompanyName(raw.companyName);
  const companyLogo = raw.companyLogo !== undefined ? String(raw.companyLogo).trim() : (DEFAULT_SETTINGS.companyLogo || '');
  const companySubtitle = raw.companySubtitle !== undefined ? String(raw.companySubtitle).trim() : (DEFAULT_SETTINGS.companySubtitle || "SÉNÉGAL • AFRIQUE DE L'OUEST");
  const companyBadge = raw.companyBadge !== undefined ? String(raw.companyBadge).trim() : (DEFAULT_SETTINGS.companyBadge || 'MRO');
  const companyAddress = raw.companyAddress || raw.address || DEFAULT_SETTINGS.companyAddress;
  const companyPhone = raw.companyPhone || raw.phoneNumber || DEFAULT_SETTINGS.companyPhone;
  const companyEmail = raw.companyEmail || raw.contactEmail || DEFAULT_SETTINGS.companyEmail;

  const homeSectionsOrder = Array.isArray(raw.homeSectionsOrder) && raw.homeSectionsOrder.length > 0
    ? raw.homeSectionsOrder
    : DEFAULT_SETTINGS.homeSectionsOrder;

  const logisticsRegions = Array.isArray(raw.logisticsRegions) && raw.logisticsRegions.length > 0
    ? raw.logisticsRegions
    : DEFAULT_SETTINGS.logisticsRegions;

  const logisticsPartners = Array.isArray(raw.logisticsPartners) && raw.logisticsPartners.length > 0
    ? raw.logisticsPartners
    : DEFAULT_SETTINGS.logisticsPartners;

  const deletedPromos = Array.from(
    new Set([
      ...(raw.deletedPromoCodes || []),
      ...extraDeletedPromos,
      'BIENVENUE5',
      'MRO2026'
    ].map(c => String(c).trim().toUpperCase()).filter(Boolean))
  );

  const rawPromos = Array.isArray(raw.promoCodes) ? raw.promoCodes : [];
  const validPromos = rawPromos
    .filter(p => p && p.code && !deletedPromos.includes(p.code.trim().toUpperCase()))
    .map(p => normalizePromoCode(p));

  const deletedAdminEmails = Array.from(
    new Set([
      ...(raw.deletedAdminEmails || []),
      ...extraDeletedAdmins
    ].map(e => String(e).trim().toLowerCase()).filter(e => Boolean(e) && e !== 'enitrom@gmail.com'))
  );

  const rawAdminList = Array.isArray(raw.adminEmails) ? raw.adminEmails : ['enitrom@gmail.com'];
  const normalizedAdminEmails = Array.from(
    new Set([
      'enitrom@gmail.com',
      ...rawAdminList
        .map(e => String(e).trim().toLowerCase())
        .filter(e => Boolean(e) && e.includes('@') && !deletedAdminEmails.includes(e))
    ])
  );

  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    adminEmails: normalizedAdminEmails,
    deletedAdminEmails,
    vatRate,
    vatEnabled,
    defaultVatRate,
    applyVatByDefault,
    airFreightPerKg,
    airFreightPerKgXOF: airFreightPerKg,
    airFreightMin,
    airFreightDuration,
    airFreightDurationDays: airFreightDuration,
    seaFreightPerKg,
    seaFreightPerKgXOF: seaFreightPerKg,
    seaFreightMin,
    seaFreightDuration,
    seaFreightDurationDays: seaFreightDuration,
    seaFreightPerCbmUSD,
    expressFreightPerKg,
    expressFreightMin,
    expressFreightDuration,
    localDeliveryDurationDays,
    companyName,
    companyLogo,
    companySubtitle,
    companyBadge,
    companyAddress,
    address: companyAddress,
    companyPhone,
    phoneNumber: companyPhone,
    companyEmail,
    contactEmail: companyEmail,
    exchangeRates: {
      ...DEFAULT_SETTINGS.exchangeRates,
      ...(raw.exchangeRates || {})
    },
    promoCodes: validPromos,
    deletedPromoCodes: deletedPromos,
    paydunya: {
      ...DEFAULT_SETTINGS.paydunya,
      ...(raw.paydunya || {}),
      authorizedMethods: {
        ...DEFAULT_SETTINGS.paydunya.authorizedMethods,
        ...(raw.paydunya?.authorizedMethods || {})
      }
    }
  };
}

const DEFAULT_SECTORS: SectorItem[] = [
  { id: 'sec-1', name: 'Mines & Extraction', desc: 'Équipements de concassage, pompes d\'exhaure, EPI miniers et pièces d\'usure lourdes.', img: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=800&auto=format&fit=crop&q=80' },
  { id: 'sec-2', name: 'BTP & Infrastructures', desc: 'Outillage électroportatif, groupes électrogènes, signalisation et matériel de chantier.', img: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=800&auto=format&fit=crop&q=80' },
  { id: 'sec-3', name: 'Agro-Industrie', desc: 'Roulements inox, moteurs électriques, convoyeurs et pompes de transfert alimentaire.', img: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80' },
  { id: 'sec-4', name: 'Énergie & Hydrocarbures', desc: 'Instrumentation ATEX, vannes haute pression, câblage industriel et transformateurs.', img: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&auto=format&fit=crop&q=80' }
];

const DEFAULT_BRANDS: BrandItem[] = [
  { name: 'SKF', sub: 'Roulements & paliers', iconName: 'Disc', featured: true },
  { name: 'SCHNEIDER', sub: 'Gestion d\'énergie', iconName: 'Zap', featured: true },
  { name: 'FLUKE', sub: 'Mesure de précision', iconName: 'Gauge', featured: true },
  { name: 'MAKITA', sub: 'Électroportatif Pro', iconName: 'Wrench', featured: true },
  { name: 'PARKER', sub: 'Hydraulique & Filtration', iconName: 'Droplets', featured: true },
  { name: '3M', sub: 'Sécurité EPI & Abrasifs', iconName: 'HardHat', featured: true },
  { name: 'SIEMENS', sub: 'Automates & Moteurs', iconName: 'Cpu', featured: true },
  { name: 'BOSCH', sub: 'Outillage & Industrie', iconName: 'Hammer', featured: true },
  { name: 'LOCTITE', sub: 'Adhésifs & Étanchéité', iconName: 'FlaskConical', featured: true },
  { name: 'LEGRAND', sub: 'Infrastructures élec.', iconName: 'Plug', featured: true },
  { name: 'FACOM', sub: 'Outillage à main', iconName: 'Wrench', featured: true },
  { name: 'ABB', sub: 'Électrotechnique lourde', iconName: 'Activity', featured: true }
];

const DEFAULT_TESTIMONIALS: TestimonialItem[] = [
  {
    id: 'testi-1',
    name: 'Ibrahima D.',
    role: "Directeur de Maintenance - Mine d'Or de Sadiola (Mali)",
    text: "Le sourcing de nos pompes d'exhaure s'est fait de manière extrêmement réactive. La livraison sur site a été gérée de bout en bout malgré la complexité des douanes. Un partenaire MRO précieux !",
    rating: 5
  },
  {
    id: 'testi-2',
    name: 'Mamadou S.',
    role: 'Responsable Achats - Cimenterie de Dakar (Sénégal)',
    text: "Avoir accès aux roulements SKF d'origine certifiée en moins de 5 jours nous a évité un arrêt de production majeur. L'accompagnement technique de leurs ingénieurs est remarquable.",
    rating: 5
  },
  {
    id: 'testi-3',
    name: 'Sylvie K.',
    role: "Directrice Technique - Complexe Agroalimentaire (Côte d'Ivoire)",
    text: "La flexibilité de paiement par Mobile Money africain et l'émission rapide de nos factures proforma facilitent énormément nos budgets de fournitures récurrents.",
    rating: 5
  }
];

const DEFAULT_ARTICLES: ArticleItem[] = [
  {
    id: 'art-1',
    slug: 'optimiser-moteurs-electriques-climat-tropical',
    title: 'Comment optimiser la durée de vie de vos moteurs électriques en climat tropical ?',
    date: 'Mis à jour le 23 Mars 2026',
    readTime: '6 min de lecture',
    category: 'Maintenance technique',
    relatedCategory: 'Moteurs & Pompes',
    description: "Découvrez les stratégies de lubrification clés, les indices de protection IP55/IP65 et l'environnement de refroidissement adéquat pour préserver vos rotors en Afrique de l'Ouest.",
    img: 'https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=800&auto=format&fit=crop&q=80',
    content: `Les moteurs électriques triphasés exploités au Sénégal, au Mali, en Guinée et en Côte d'Ivoire subissent des contraintes climatiques sévères : températures ambiantes dépassant régulièrement 40°C, poussières latéritiques abrasives (harmattan), forte humidité côtière saline à Dakar ou Abidjan, et fluctuations de tension sur les réseaux industriels.

1. Choisir la bonne classe d'isolation thermique (Classe F ou H obligatoire)
En climat tropical, un moteur standard dimensionné pour 40°C voit sa réserve thermique réduite. Exigez systématiquement un bobinage de Classe F (échauffement admissible 105K, température max 155°C) ou Classe H (180°C) avec un facteur de déclassement thermique de 5 à 8% si le local technique n'est pas climatisé.

2. Étanchéité renforcée contre la poussière et l'humidité (IP55 minimum, IP65 recommandé)
• En cimenterie, carrière ou mine : la poussière fine pénètre dans les flasques de paliers et détruit les pistes de roulements en quelques semaines. Utilisez des moteurs dotés de joints à labyrinthe (type Taconite) et d'un indice IP65.
• En zone côtière (Dakar, San-Pédro, Conakry) : demandez une peinture époxy anti-corrosion marine C4/C5-M et des résistances de réchauffage anti-condensation (Space Heaters 230V) à activer dès que le moteur est à l'arrêt.

3. Programme de relubrification adapté aux hautes températures
Au-delà de 70°C sur le palier, la durée de vie de la graisse diminue de moitié tous les 15°C supplémentaires.
• Utilisez une graisse synthétique haute température à base de complexe de lithium ou polyurée (type SKF LGHP 2).
• Nettoyez systématiquement le graisseur avant injection pour ne jamais introduire de silice dans la cage du roulement.
• Ne surgraissez pas : l'excès de graisse provoque un barattage thermique qui fait chauffer le roulement.

4. Protection électrique en amont : relais à manque de phase et variateurs
Plus de 60% des claquages de stators en Afrique de l'Ouest proviennent d'un déséquilibre de tension (> 2%) ou de micro-coupures. Installez systématiquement un disjoncteur moteur magnéto-thermique couplé à un contrôleur permanent de phases et de sous/surtension.`
  },
  {
    id: 'art-2',
    slug: 'guide-roulements-rigides-vs-rotules-skf',
    title: 'Guide Technique : Roulements rigides à billes VS roulements à rotule sur rouleaux',
    date: 'Mis à jour le 15 Avril 2026',
    readTime: '7 min de lecture',
    category: 'Comparatif Matériel',
    relatedCategory: 'Transmission & Roulements',
    description: 'Quels types de roulements choisir selon les charges radiales, axiales et les défauts d’alignement de vos convoyeurs miniers et broyeurs ?',
    img: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    content: `Le choix du roulement mécanique conditionne directement la disponibilité de vos lignes de production, tambours de convoyeurs, ventilateurs industriels et concasseurs. Une erreur de sélection entre un roulement rigide à billes (série 6200/6300) et un roulement à rotule sur rouleaux (série 22200/22300) entraîne un écaillage prématuré et des arrêts non planifiés coûteux.

1. Le Roulement Rigide à Billes (Séries 6000, 6200, 6300)
• Applications idéales : Moteurs électriques de petite et moyenne puissance, pompes centrifuges propres, ventilateurs équilibrés, arbres courts parfaitement alignés.
• Avantages : Vitesse de rotation très élevée, faible couple de frottement, coût économique, disponible en version étanche à vie (2RS1 / 2Z).
• Limites critiques : Tolère très mal le défaut d'alignement (< 0,1°) et résiste faiblement aux chocs lourds.
• Conseil MRO : Pour les moteurs électriques tournant à 1500 ou 3000 tr/min en environnement chaud, privilégiez impérativement le jeu interne augmenté C3 (ex: 6312-2Z/C3).

2. Le Roulement à Rotule sur Rouleaux (Séries 22200, 22300, 23200 CC/W33)
• Applications idéales : Tambours de convoyeurs à bande miniers, concasseurs à mâchoires, broyeurs à boulets, cribles vibrants, paliers à semelle SNL.
• Avantages majeurs : Auto-aligneur ! Il compense automatiquement les flexions d'arbres et défauts d'alignement du châssis jusqu'à 1,5° à 2°. Sa capacité de charge radiale et axiale combinée est 3 à 4 fois supérieure à celle d'un roulement à billes de même alésage.
• Rainure de lubrification W33 : Permet d'injecter la graisse fraîche directement au cœur des deux rangées de rouleaux pour chasser les impuretés.

3. Comment éviter les contrefaçons lors de vos achats en Afrique ?
Les roulements contrefaits représentent un risque industriel majeur. Chez ZONE ÉQUIPEMENTS, chaque lot est sourcé auprès de distributeurs officiels certifiés avec traçabilité du numéro de lot et contrôle qualité rigoureux avant expédition.`
  },
  {
    id: 'art-3',
    slug: 'epi-miniers-certifications-securite-antichute',
    title: 'EPI Miniers & BTP : Guide des nouvelles certifications de sécurité et antichute',
    date: 'Mis à jour le 02 Mai 2026',
    readTime: '5 min de lecture',
    category: 'Sécurité & EPI',
    relatedCategory: 'Sécurité & EPI',
    description: 'Sélection de harnais EN 361, détecteurs multigaz, casques ventilés et chaussures S3 pour garantir zéro accident sur vos chantiers et sites miniers.',
    img: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=800&auto=format&fit=crop&q=80',
    content: `La conformité HSE (Hygiène, Sécurité, Environnement) sur les sites miniers d'Afrique de l'Ouest et les grands chantiers BTP exige des Équipements de Protection Individuelle répondant aux normes internationales EN / ISO et ANSI. Voici le référentiel concret pour équiper vos équipes.

1. Travaux en hauteur : La chaîne d'arrêt de chute (Normes EN 361, EN 355, EN 360)
• Harnais antichute complet (EN 361) : Privilégiez un harnais 2 points (dorsal + sternal) avec sangles déperlantes haute visibilité et boucles automatiques à témoin de verrouillage. Pour le maintien au travail sur pylône, ajoutez une ceinture intégrée conforme EN 358.
• Longe avec absorbeur d'énergie (EN 355) ou Antichute à rappel automatique (EN 360) : Lorsque le tirant d'air disponible sous l'opérateur est inférieur à 6 mètres, l'enrouleur à blocage automatique (type câble acier galvanisé ou sangle Dyneema) est obligatoire pour stopper la chute en moins de 1,5 mètre.

2. Protection des pieds en milieu humide et abrasif (Norme EN ISO 20345 : S3 SRC HRO)
• Marquage S3 : Embout de protection 200 Joules (composite léger non-conducteur ou acier), semelle anti-perforation, cuir hydrofuge.
• Marquage HRO & CI : Semelle extérieure en nitrile résistant à la chaleur par contact jusqu'à 300°C (indispensable pour les soudeurs, fonderies et enrobés routiers).

3. Protection respiratoire et détection gaz en espace confiné
Pour toute intervention dans une cuve, galerie ou station de pompage :
• Masques demi-masques à cartouches ABEK1P3 contre les vapeurs acides, solvants et poussières fines de silice.
• Détecteur 4 gaz portatif (LEL, O2, CO, H2S) certifié ATEX Zone 0 avec alarme vibrante, sonore (95 dB) et visuelle.`
  }
];

const DEFAULT_FAQS: FaqItem[] = [
  {
    id: 'faq-1',
    q: 'Quels sont vos délais de livraison entre le Stock Local Dakar et les Articles à Sourcer ?',
    a: 'Nos matériels identifiés en « Stock Local Dakar » sont disponibles immédiatement pour un retrait ou une livraison sous 24 à 48h. Pour les équipements sur commande internationale (« Articles à sourcer »), nous proposons le Fret Aérien Express (8 à 15 jours) pour vos urgences MRO et le Fret Maritime Économique (20 à 40 jours) pour les charges lourdes et commandes volumineuses.',
    category: 'Logistique & Fret'
  },
  {
    id: 'faq-2',
    q: 'Quels moyens de paiement acceptez-vous (PayDunya & Virement B2B) ?',
    a: 'Vous pouvez régler vos commandes en toute sécurité via notre passerelle intégrée PayDunya (qui réunit Wave, Orange Money, Free Money et Cartes Bancaires Visa/Mastercard) ou générer un Devis Proforma officiel (avec RCCM et NINEA) pour un règlement par virement bancaire B2B.',
    category: 'Paiement & Facturation'
  },
  {
    id: 'faq-3',
    q: 'Comment assurez-vous le suivi et la réception de mes équipements commandés ?',
    a: 'Chaque commande fait l’objet d’un suivi rigoureux depuis votre espace client. Pour les articles en stock local, la préparation est immédiate à Dakar. Pour les articles sourcés à l’international, la réception et le contrôle qualité sont assurés dans nos entrepôts partenaires avant l’acheminement vers Dakar, tout en préservant la confidentialité de vos coordonnées.',
    category: 'Suivi & Traçabilité'
  },
  {
    id: 'faq-4',
    q: 'Comment obtenir un devis pour une pièce spécifique qui n’est pas encore dans le catalogue ?',
    a: 'Rendez-vous sur la page Nos Services ou Contact et indiquez la référence constructeur (plaque signalétique, photo ou lien fournisseur). Notre bureau d’études interroge directement les fabricants certifiés et vous transmet une cotation complète sous 24h.',
    category: 'Sourcing sur-mesure'
  }
];

class SiteSettingsService {
  private listeners: (() => void)[] = [];
  private isSyncingFromRemote = false;
  private isSyncingStructureFromRemote = false;

  constructor() {
    this.purgeOldDefaultsOnce();
    this.initFirebaseSync();
  }

  private purgeOldDefaultsOnce() {
    if (typeof window === 'undefined') return;
    try {
      const alreadyPurged = localStorage.getItem(STORAGE_KEYS.PROMO_PURGED_FLAG);
      if (!alreadyPurged) {
        const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        if (raw) {
          const parsed = JSON.parse(raw) as SiteSettings;
          const deleted = new Set<string>((parsed.deletedPromoCodes || []).map(c => c.toUpperCase()));
          // Purger les anciens codes fictifs par défaut BIENVENUE5 et MRO2026
          deleted.add('BIENVENUE5');
          deleted.add('MRO2026');
          const filteredPromos = (parsed.promoCodes || []).filter(
            p => !deleted.has((p.code || '').trim().toUpperCase())
          );
          const cleaned: SiteSettings = {
            ...parsed,
            companyName: cleanCompanyName(parsed.companyName),
            promoCodes: filteredPromos,
            deletedPromoCodes: Array.from(deleted)
          };
          localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(cleaned));
        }
        localStorage.setItem(STORAGE_KEYS.PROMO_PURGED_FLAG, 'true');
      }
    } catch (e) {
      console.warn('Error purging old promo defaults:', e);
    }
  }

  private getDeletedStructure(): DeletedStructureRegistry {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DELETED_STRUCTURE);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          categories: Array.isArray(parsed.categories) ? parsed.categories : [],
          sectors: Array.isArray(parsed.sectors) ? parsed.sectors : [],
          brands: Array.isArray(parsed.brands) ? parsed.brands : [],
          testimonials: Array.isArray(parsed.testimonials) ? parsed.testimonials : [],
          articles: Array.isArray(parsed.articles) ? parsed.articles : [],
          faqs: Array.isArray(parsed.faqs) ? parsed.faqs : []
        };
      }
    } catch {
      // ignore
    }
    return { categories: [], sectors: [], brands: [], testimonials: [], articles: [], faqs: [] };
  }

  private saveDeletedStructure(reg: DeletedStructureRegistry) {
    try {
      localStorage.setItem(STORAGE_KEYS.DELETED_STRUCTURE, JSON.stringify(reg));
    } catch {
      // ignore
    }
  }

  private initFirebaseSync() {
    if (typeof window === 'undefined') return;
    try {
      // 1. Synchronisation temps réel des paramètres généraux, TVA, fret, devises et codes promo
      const settingsDocRef = doc(db, 'settings', 'site_settings');
      onSnapshot(
        settingsDocRef,
        (snap) => {
          if (snap.exists()) {
            const remoteSettings = snap.data() as SiteSettings;
            const localCurrent = this.getSettings();

            // Remote deletedAdminEmails and adminEmails are authoritative when updated
            const mergedDeletedAdmins = Array.from(new Set([
              ...(remoteSettings.deletedAdminEmails || []),
              ...((localCurrent.deletedAdminEmails || []).filter(e => !(remoteSettings.adminEmails || []).map(a => a.toLowerCase().trim()).includes(e)))
            ]));
            const merged = normalizeSiteSettings(remoteSettings, localCurrent.deletedPromoCodes || [], mergedDeletedAdmins);
            Object.assign(DEFAULT_SETTINGS, merged);

            this.isSyncingFromRemote = true;
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
            this.syncPaydunyaToBackend(merged.paydunya);
            this.notify();
            this.isSyncingFromRemote = false;
          } else {
            // First time initialization: populate Firestore with default settings
            const current = this.getSettings();
            setDoc(settingsDocRef, sanitizeForFirestore({ ...current, updatedAt: new Date().toISOString() }), { merge: true }).catch(() => {});
          }
        },
        (error) => {
          console.warn('Firestore settings sync error:', error);
        }
      );

      // 2. Synchronisation temps réel de la structure du catalogue (Catégories, Secteurs, Marques)
      const structureDocRef = doc(db, 'settings', 'catalog_structure');
      onSnapshot(
        structureDocRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as {
              categories?: CategoryItem[];
              sectors?: SectorItem[];
              brands?: BrandItem[];
              testimonials?: TestimonialItem[];
              articles?: ArticleItem[];
              faqs?: FaqItem[];
              deletedStructure?: DeletedStructureRegistry;
            };
            const localDel = this.getDeletedStructure();
            const remoteDel = data.deletedStructure || { categories: [], sectors: [], brands: [], testimonials: [], articles: [], faqs: [] };
            const mergedDel: DeletedStructureRegistry = {
              categories: Array.from(new Set([...localDel.categories, ...(remoteDel.categories || [])])),
              sectors: Array.from(new Set([...localDel.sectors, ...(remoteDel.sectors || [])])),
              brands: Array.from(new Set([...localDel.brands, ...(remoteDel.brands || [])])),
              testimonials: Array.from(new Set([...(localDel.testimonials || []), ...(remoteDel.testimonials || [])])),
              articles: Array.from(new Set([...(localDel.articles || []), ...(remoteDel.articles || [])])),
              faqs: Array.from(new Set([...(localDel.faqs || []), ...(remoteDel.faqs || [])]))
            };
            this.saveDeletedStructure(mergedDel);

            this.isSyncingStructureFromRemote = true;
            if (Array.isArray(data.categories) && data.categories.length > 0) {
              const filteredCats = data.categories.filter(
                c => c && c.name && !mergedDel.categories.includes(c.name.toLowerCase())
              );
              localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(filteredCats));
            }
            if (Array.isArray(data.sectors) && data.sectors.length > 0) {
              const filteredSecs = data.sectors.filter(
                s => s && s.id && !mergedDel.sectors.includes(s.id)
              );
              localStorage.setItem(STORAGE_KEYS.SECTORS, JSON.stringify(filteredSecs));
            }
            if (Array.isArray(data.brands) && data.brands.length > 0) {
              const filteredBrands = data.brands.filter(
                b => b && b.name && !mergedDel.brands.includes(b.name.toLowerCase())
              );
              localStorage.setItem(STORAGE_KEYS.BRANDS, JSON.stringify(filteredBrands));
            }
            if (Array.isArray(data.testimonials) && data.testimonials.length > 0) {
              const filteredTesti = data.testimonials.filter(
                t => t && t.id && !(mergedDel.testimonials || []).includes(t.id)
              );
              localStorage.setItem(STORAGE_KEYS.TESTIMONIALS, JSON.stringify(filteredTesti));
            }
            if (Array.isArray(data.articles) && data.articles.length > 0) {
              const filteredArts = data.articles.filter(
                a => a && a.id && !(mergedDel.articles || []).includes(a.id)
              );
              localStorage.setItem(STORAGE_KEYS.ARTICLES, JSON.stringify(filteredArts));
            }
            if (Array.isArray(data.faqs) && data.faqs.length > 0) {
              const filteredFaqs = data.faqs.filter(
                f => f && f.id && !(mergedDel.faqs || []).includes(f.id)
              );
              localStorage.setItem(STORAGE_KEYS.FAQS, JSON.stringify(filteredFaqs));
            }
            this.notify();
            this.isSyncingStructureFromRemote = false;
          } else {
            this.pushStructureToFirestore();
          }
        },
        (err) => {
          console.warn('Firestore structure sync error:', err);
        }
      );
    } catch (e) {
      console.warn('Failed to init Firestore settings sync:', e);
    }
  }

  private pushStructureToFirestore() {
    if (this.isSyncingStructureFromRemote) return;
    try {
      const structureDocRef = doc(db, 'settings', 'catalog_structure');
      const payload = sanitizeForFirestore({
        categories: this.getCategories(),
        sectors: this.getSectors(),
        brands: this.getBrands(),
        testimonials: this.getTestimonials(),
        articles: this.getArticles(),
        faqs: this.getFaqs(),
        deletedStructure: this.getDeletedStructure(),
        updatedAt: new Date().toISOString()
      });
      setDoc(structureDocRef, payload, { merge: true }).catch(e => {
        console.warn('Failed to write catalog structure to Firestore:', e);
      });
    } catch (e) {
      console.warn('Error pushing catalog structure:', e);
    }
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private syncPaydunyaToBackend(paydunya?: PaydunyaSettings) {
    if (typeof window === 'undefined' || !paydunya) return;
    fetch('/api/paydunya/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paydunya)
    }).catch(() => {});
  }

  private notify() {
    this.listeners.forEach(l => l());
    window.dispatchEvent(new Event('ze_settings_updated'));
  }

  // --- SITE SETTINGS ---
  getSettings(): SiteSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (raw) {
        const parsed = JSON.parse(raw);
        return normalizeSiteSettings(parsed);
      }
    } catch (e) {
      console.error('Error loading site settings:', e);
    }
    return normalizeSiteSettings(DEFAULT_SETTINGS);
  }

  updateSettings(partial: Partial<SiteSettings>): SiteSettings {
    const current = this.getSettings();
    const mergedRaw: Partial<SiteSettings> = {
      ...current,
      ...partial,
      exchangeRates: {
        ...current.exchangeRates,
        ...(partial.exchangeRates || {})
      },
      promoCodes: partial.promoCodes !== undefined ? partial.promoCodes : current.promoCodes,
      deletedPromoCodes: partial.deletedPromoCodes !== undefined ? partial.deletedPromoCodes : (current.deletedPromoCodes || []),
      deletedAdminEmails: partial.deletedAdminEmails !== undefined ? partial.deletedAdminEmails : (current.deletedAdminEmails || [])
    };
    const updated = normalizeSiteSettings(mergedRaw);
    updated.updatedAt = new Date().toISOString();
    Object.assign(DEFAULT_SETTINGS, updated);

    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    this.syncPaydunyaToBackend(updated.paydunya);
    this.notify();

    if (!this.isSyncingFromRemote) {
      try {
        const settingsDocRef = doc(db, 'settings', 'site_settings');
        setDoc(settingsDocRef, sanitizeForFirestore(updated), { merge: true }).catch(err => {
          console.warn('Failed to write settings to Firestore:', err);
        });
      } catch (e) {
        console.warn('Firestore setDoc error:', e);
      }
    }

    return updated;
  }

  async removeAdminEmailAndDemote(emailToRemove: string): Promise<SiteSettings> {
    const cleanTarget = String(emailToRemove || '').toLowerCase().trim();
    if (!cleanTarget || cleanTarget === 'enitrom@gmail.com') {
      return this.getSettings();
    }

    const current = this.getSettings();
    const deletedSet = new Set<string>((current.deletedAdminEmails || []).map(e => e.toLowerCase().trim()));
    deletedSet.add(cleanTarget);

    const updatedAdmins = (current.adminEmails || [])
      .map(e => e.toLowerCase().trim())
      .filter(e => e && e !== cleanTarget);

    const updated = this.updateSettings({
      adminEmails: updatedAdmins.includes('enitrom@gmail.com') ? updatedAdmins : ['enitrom@gmail.com', ...updatedAdmins],
      deletedAdminEmails: Array.from(deletedSet)
    });

    // Immediately demote any matching user profile in Firestore 'users' collection
    try {
      const usersRef = collection(db, 'users');
      const snap = await getDocs(usersRef);
      const demotePromises: Promise<any>[] = [];
      snap.forEach((userDoc) => {
        const data = userDoc.data();
        const docEmail = String(data?.email || '').toLowerCase().trim();
        if (docEmail === cleanTarget && data?.role === 'admin') {
          demotePromises.push(
            updateDoc(doc(db, 'users', userDoc.id), {
              role: 'client',
              demotedAt: new Date().toISOString()
            })
          );
        }
      });
      await Promise.all(demotePromises);
    } catch (err) {
      console.warn('Error demoting user role in Firestore:', err);
    }

    return updated;
  }

  async addAdminEmailAndPromote(emailToAdd: string): Promise<SiteSettings> {
    const cleanTarget = String(emailToAdd || '').toLowerCase().trim();
    if (!cleanTarget || !cleanTarget.includes('@')) {
      return this.getSettings();
    }

    const current = this.getSettings();
    const deletedSet = new Set<string>((current.deletedAdminEmails || []).map(e => e.toLowerCase().trim()));
    deletedSet.delete(cleanTarget);

    const updatedAdmins = Array.from(new Set([
      'enitrom@gmail.com',
      ...(current.adminEmails || []).map(e => e.toLowerCase().trim()),
      cleanTarget
    ]));

    const updated = this.updateSettings({
      adminEmails: updatedAdmins,
      deletedAdminEmails: Array.from(deletedSet)
    });

    // Promote matching user in Firestore if they already have an account
    try {
      const usersRef = collection(db, 'users');
      const snap = await getDocs(usersRef);
      const promotePromises: Promise<any>[] = [];
      snap.forEach((userDoc) => {
        const data = userDoc.data();
        const docEmail = String(data?.email || '').toLowerCase().trim();
        if (docEmail === cleanTarget && data?.role !== 'admin') {
          promotePromises.push(
            updateDoc(doc(db, 'users', userDoc.id), {
              role: 'admin',
              promotedAt: new Date().toISOString()
            })
          );
        }
      });
      await Promise.all(promotePromises);
    } catch (err) {
      console.warn('Error promoting user role in Firestore:', err);
    }

    return updated;
  }

  getAdminPermissions(email?: string): AdminPermissions {
    const cleanEmail = String(email || auth?.currentUser?.email || '').toLowerCase().trim();
    if (!cleanEmail) return DEFAULT_ADMIN_PERMISSIONS;
    // Primary owner always has full access
    if (cleanEmail === 'enitrom@gmail.com') {
      return { pos: true, catalog: true, orders: true, suppliers: true, finance: true, security: true };
    }
    const settings = this.getSettings();
    const map = settings.adminPermissionsMap || {};
    if (map[cleanEmail]) {
      return { ...DEFAULT_ADMIN_PERMISSIONS, ...map[cleanEmail] };
    }
    return DEFAULT_ADMIN_PERMISSIONS;
  }

  async updateAdminPermissions(email: string, permissions: Partial<AdminPermissions>): Promise<SiteSettings> {
    const cleanEmail = String(email || '').toLowerCase().trim();
    if (!cleanEmail) return this.getSettings();
    const current = this.getSettings();
    const map = { ...(current.adminPermissionsMap || {}) };
    map[cleanEmail] = {
      ...(map[cleanEmail] || DEFAULT_ADMIN_PERMISSIONS),
      ...permissions
    };
    return this.updateSettings({ adminPermissionsMap: map });
  }

  // Helper pour identifier de manière unique le compte client courant
  getCurrentAccountKey(explicitAccountKey?: string): string {
    if (explicitAccountKey && explicitAccountKey.trim()) {
      return explicitAccountKey.trim().toLowerCase();
    }
    const currentUser = auth?.currentUser;
    if (currentUser?.email) {
      return currentUser.email.trim().toLowerCase();
    }
    if (currentUser?.uid) {
      return currentUser.uid;
    }
    if (typeof window !== 'undefined') {
      let guestId = localStorage.getItem(STORAGE_KEYS.CLIENT_ACCOUNT_ID);
      if (!guestId) {
        guestId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        localStorage.setItem(STORAGE_KEYS.CLIENT_ACCOUNT_ID, guestId);
      }
      return guestId;
    }
    return 'guest_default';
  }

  // --- PROMO CODES ---
  validatePromoCode(code: string, orderAmount: number, accountKey?: string): { valid: boolean; promo?: PromoCode; discountAmount: number; message: string } {
    const settings = this.getSettings();
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      return { valid: false, discountAmount: 0, message: 'Veuillez saisir un code promo.' };
    }

    const promo = (settings.promoCodes || []).find(p => p.code.trim().toUpperCase() === normalized);
    if (!promo) {
      return { valid: false, discountAmount: 0, message: 'Code promo invalide ou inexistant.' };
    }
    if (!promo.active) {
      return { valid: false, discountAmount: 0, message: 'Ce code promo est actuellement désactivé.' };
    }
    if (promo.expiresAt) {
      const exp = new Date(promo.expiresAt);
      // Fin de la journée d'expiration
      exp.setHours(23, 59, 59, 999);
      if (!isNaN(exp.getTime()) && exp.getTime() < Date.now()) {
        return { valid: false, discountAmount: 0, message: 'Ce code promo a expiré.' };
      }
    }
    if (promo.maxUsage && promo.maxUsage > 0 && (promo.usageCount || 0) >= promo.maxUsage) {
      return {
        valid: false,
        discountAmount: 0,
        message: `Ce code promo a atteint sa limite maximale d'utilisations globales (${promo.maxUsage}).`
      };
    }

    // Vérification du nombre d'utilisations par compte
    if (promo.maxUsagePerAccount && promo.maxUsagePerAccount > 0) {
      const resolvedKey = this.getCurrentAccountKey(accountKey);
      const usageMap = promo.usageByAccount || {};
      const currentUserEmail = auth?.currentUser?.email?.trim().toLowerCase();
      const currentUserUid = auth?.currentUser?.uid;

      const usedCount = Math.max(
        usageMap[resolvedKey] || 0,
        currentUserEmail ? (usageMap[currentUserEmail] || 0) : 0,
        currentUserUid ? (usageMap[currentUserUid] || 0) : 0
      );

      if (usedCount >= promo.maxUsagePerAccount) {
        return {
          valid: false,
          discountAmount: 0,
          message: `Vous avez déjà utilisé ce code promo le nombre maximum de fois autorisé par compte (${promo.maxUsagePerAccount} utilisation${promo.maxUsagePerAccount > 1 ? 's' : ''} max / compte).`
        };
      }
    }

    if (promo.minOrderAmount && promo.minOrderAmount > 0 && orderAmount < promo.minOrderAmount) {
      return {
        valid: false,
        discountAmount: 0,
        message: `Montant minimum requis pour ce code : ${promo.minOrderAmount.toLocaleString('fr-FR')} FCFA.`
      };
    }

    let discountAmount = 0;
    if (promo.discountPercent > 0) {
      discountAmount = Math.round((orderAmount * promo.discountPercent) / 100);
    } else if (promo.discountFixed && promo.discountFixed > 0) {
      discountAmount = promo.discountFixed;
    }

    discountAmount = Math.min(discountAmount, orderAmount);

    return {
      valid: true,
      promo,
      discountAmount,
      message: `Code "${promo.code}" appliqué (-${promo.discountPercent > 0 ? `${promo.discountPercent}%` : `${discountAmount.toLocaleString('fr-FR')} FCFA`})`
    };
  }

  addPromoCode(promo: Omit<PromoCode, 'usageCount'>): SiteSettings {
    const settings = this.getSettings();
    const normalized = promo.code.trim().toUpperCase();
    const filtered = (settings.promoCodes || []).filter(p => p.code.trim().toUpperCase() !== normalized);
    const updatedDeleted = (settings.deletedPromoCodes || []).filter(c => c.trim().toUpperCase() !== normalized);

    const newPromo: PromoCode = {
      ...promo,
      code: normalized,
      usageCount: 0,
      maxUsage: promo.maxUsage && promo.maxUsage > 0 ? promo.maxUsage : 0,
      maxUsagePerAccount: promo.maxUsagePerAccount && promo.maxUsagePerAccount > 0 ? promo.maxUsagePerAccount : 0,
      usageByAccount: promo.usageByAccount || {}
    };

    return this.updateSettings({
      promoCodes: [...filtered, newPromo],
      deletedPromoCodes: updatedDeleted
    });
  }

  updatePromoCode(code: string, updates: Partial<PromoCode>): SiteSettings {
    const settings = this.getSettings();
    const normalized = code.trim().toUpperCase();
    const updatedPromos = (settings.promoCodes || []).map(p => {
      if (p.code.trim().toUpperCase() === normalized) {
        return {
          ...p,
          ...updates,
          code: updates.code ? updates.code.trim().toUpperCase() : p.code
        };
      }
      return p;
    });
    return this.updateSettings({ promoCodes: updatedPromos });
  }

  togglePromoCode(code: string): SiteSettings {
    const settings = this.getSettings();
    const normalized = code.trim().toUpperCase();
    const updatedPromos = (settings.promoCodes || []).map(p =>
      p.code.trim().toUpperCase() === normalized ? { ...p, active: !p.active } : p
    );
    return this.updateSettings({ promoCodes: updatedPromos });
  }

  deletePromoCode(code: string): SiteSettings {
    const settings = this.getSettings();
    const normalized = code.trim().toUpperCase();
    const updatedPromos = (settings.promoCodes || []).filter(
      p => p.code.trim().toUpperCase() !== normalized
    );
    const updatedDeleted = Array.from(
      new Set([...(settings.deletedPromoCodes || []), normalized])
    );
    return this.updateSettings({
      promoCodes: updatedPromos,
      deletedPromoCodes: updatedDeleted
    });
  }

  incrementPromoCodeUsage(code: string, accountKey?: string): void {
    const settings = this.getSettings();
    const normalized = code.trim().toUpperCase();
    const resolvedKey = this.getCurrentAccountKey(accountKey);
    const currentUserEmail = auth?.currentUser?.email?.trim().toLowerCase();
    const currentUserUid = auth?.currentUser?.uid;

    const updatedPromos = (settings.promoCodes || []).map(p => {
      if (p.code.trim().toUpperCase() !== normalized) return p;
      const nextUsageByAccount: Record<string, number> = { ...(p.usageByAccount || {}) };
      const keysToIncrement = Array.from(
        new Set([resolvedKey, currentUserEmail, currentUserUid].filter(Boolean) as string[])
      );
      keysToIncrement.forEach(k => {
        nextUsageByAccount[k] = (nextUsageByAccount[k] || 0) + 1;
      });

      return {
        ...p,
        usageCount: (p.usageCount || 0) + 1,
        usageByAccount: nextUsageByAccount
      };
    });
    this.updateSettings({ promoCodes: updatedPromos });
  }

  // --- SECTORS ---
  getSectors(): SectorItem[] {
    const del = this.getDeletedStructure();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SECTORS);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter((s: SectorItem) => s && s.id && !del.sectors.includes(s.id));
        }
      }
    } catch (e) {
      console.error('Error loading sectors:', e);
    }
    const initial = DEFAULT_SECTORS.filter(s => !del.sectors.includes(s.id));
    localStorage.setItem(STORAGE_KEYS.SECTORS, JSON.stringify(initial));
    return initial;
  }

  saveSectors(sectors: SectorItem[]) {
    localStorage.setItem(STORAGE_KEYS.SECTORS, JSON.stringify(sectors));
    this.notify();
    this.pushStructureToFirestore();
  }

  addSector(sector: Omit<SectorItem, 'id'>): SectorItem[] {
    const current = this.getSectors();
    const newItem: SectorItem = {
      ...sector,
      id: `sec-${Date.now()}`
    };
    const updated = [...current, newItem];
    this.saveSectors(updated);
    return updated;
  }

  updateSector(id: string, partial: Partial<SectorItem>): SectorItem[] {
    const current = this.getSectors();
    const updated = current.map(s => (s.id === id ? { ...s, ...partial } : s));
    this.saveSectors(updated);
    return updated;
  }

  deleteSector(id: string): SectorItem[] {
    const del = this.getDeletedStructure();
    if (!del.sectors.includes(id)) {
      del.sectors.push(id);
      this.saveDeletedStructure(del);
    }
    const current = this.getSectors();
    const updated = current.filter(s => s.id !== id);
    this.saveSectors(updated);
    return updated;
  }

  // --- CATEGORIES & SUBCATEGORIES ---
  getCategories(): CategoryItem[] {
    const del = this.getDeletedStructure();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter((c: CategoryItem) => c && c.name && !del.categories.includes(c.name.toLowerCase()));
        }
      }
    } catch (e) {
      console.error('Error loading categories:', e);
    }
    const initial = [...(CATEGORIES as CategoryItem[])].filter(
      c => !del.categories.includes(c.name.toLowerCase())
    );
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(initial));
    return initial;
  }

  saveCategories(categories: CategoryItem[]) {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    this.notify();
    this.pushStructureToFirestore();
  }

  addCategory(cat: CategoryItem): CategoryItem[] {
    const del = this.getDeletedStructure();
    del.categories = del.categories.filter(n => n !== cat.name.trim().toLowerCase());
    this.saveDeletedStructure(del);

    const current = this.getCategories();
    if (current.some(c => c.name.toLowerCase() === cat.name.trim().toLowerCase())) {
      return current;
    }
    const updated = [...current, { ...cat, name: cat.name.trim() }];
    this.saveCategories(updated);
    return updated;
  }

  updateCategory(originalNameOrIndex: string | number, updatedCat: CategoryItem): CategoryItem[] {
    const current = this.getCategories();
    let updated: CategoryItem[];
    if (typeof originalNameOrIndex === 'number') {
      updated = current.map((c, idx) => (idx === originalNameOrIndex ? updatedCat : c));
    } else {
      updated = current.map(c => (c.name === originalNameOrIndex ? updatedCat : c));
    }
    this.saveCategories(updated);
    return updated;
  }

  deleteCategory(nameOrIndex: string | number): CategoryItem[] {
    const del = this.getDeletedStructure();
    const current = this.getCategories();
    let nameToDelete = '';
    let updated: CategoryItem[];

    if (typeof nameOrIndex === 'number') {
      if (current[nameOrIndex]) {
        nameToDelete = current[nameOrIndex].name;
      }
      updated = current.filter((_, idx) => idx !== nameOrIndex);
    } else {
      nameToDelete = nameOrIndex;
      updated = current.filter(c => c.name !== nameOrIndex);
    }

    if (nameToDelete) {
      const lower = nameToDelete.trim().toLowerCase();
      if (!del.categories.includes(lower)) {
        del.categories.push(lower);
        this.saveDeletedStructure(del);
      }
    }

    this.saveCategories(updated);
    return updated;
  }

  addSubcategory(categoryName: string, sub: SubcategoryItem): CategoryItem[] {
    const current = this.getCategories();
    const updated = current.map(c => {
      if (c.name === categoryName) {
        return {
          ...c,
          subcategories: [...(c.subcategories || []), sub]
        };
      }
      return c;
    });
    this.saveCategories(updated);
    return updated;
  }

  deleteSubcategory(categoryName: string, subName: string): CategoryItem[] {
    const current = this.getCategories();
    const updated = current.map(c => {
      if (c.name === categoryName) {
        return {
          ...c,
          subcategories: (c.subcategories || []).filter(s => s.name !== subName)
        };
      }
      return c;
    });
    this.saveCategories(updated);
    return updated;
  }

  // --- BRANDS ---
  getBrands(): BrandItem[] {
    const del = this.getDeletedStructure();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.BRANDS);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter((b: BrandItem) => b && b.name && !del.brands.includes(b.name.toLowerCase()));
        }
      }
    } catch (e) {
      console.error('Error loading brands:', e);
    }
    const initial = [...DEFAULT_BRANDS].filter(
      b => !del.brands.includes(b.name.toLowerCase())
    );
    localStorage.setItem(STORAGE_KEYS.BRANDS, JSON.stringify(initial));
    return initial;
  }

  saveBrands(brands: BrandItem[]) {
    localStorage.setItem(STORAGE_KEYS.BRANDS, JSON.stringify(brands));
    this.notify();
    this.pushStructureToFirestore();
  }

  addBrand(brand: BrandItem): BrandItem[] {
    const del = this.getDeletedStructure();
    del.brands = del.brands.filter(n => n !== brand.name.trim().toLowerCase());
    this.saveDeletedStructure(del);

    const current = this.getBrands();
    if (current.some(b => b.name.toLowerCase() === brand.name.trim().toLowerCase())) {
      return current;
    }
    const updated = [...current, { ...brand, name: brand.name.trim() }];
    this.saveBrands(updated);
    return updated;
  }

  updateBrand(originalName: string, updatedBrand: Partial<BrandItem>): BrandItem[] {
    const current = this.getBrands();
    const updated = current.map(b => (b.name === originalName ? { ...b, ...updatedBrand } : b));
    this.saveBrands(updated);
    return updated;
  }

  deleteBrand(name: string): BrandItem[] {
    const del = this.getDeletedStructure();
    const lower = name.trim().toLowerCase();
    if (!del.brands.includes(lower)) {
      del.brands.push(lower);
      this.saveDeletedStructure(del);
    }
    const current = this.getBrands();
    const updated = current.filter(b => b.name !== name);
    this.saveBrands(updated);
    return updated;
  }

  toggleBrandFeatured(name: string): BrandItem[] {
    const current = this.getBrands();
    const updated = current.map(b => (b.name === name ? { ...b, featured: b.featured === false ? true : false } : b));
    this.saveBrands(updated);
    return updated;
  }

  setBrandFeatured(name: string, featured: boolean): BrandItem[] {
    const current = this.getBrands();
    const updated = current.map(b => (b.name === name ? { ...b, featured } : b));
    this.saveBrands(updated);
    return updated;
  }

  // --- TESTIMONIALS ---
  getTestimonials(): TestimonialItem[] {
    const del = this.getDeletedStructure();
    const delIds = del.testimonials || [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TESTIMONIALS);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((t: TestimonialItem) => t && t.id && !delIds.includes(t.id));
        }
      }
    } catch (e) {
      console.error('Error loading testimonials:', e);
    }
    const initial = DEFAULT_TESTIMONIALS.filter(t => !delIds.includes(t.id));
    localStorage.setItem(STORAGE_KEYS.TESTIMONIALS, JSON.stringify(initial));
    return initial;
  }

  saveTestimonials(items: TestimonialItem[]) {
    localStorage.setItem(STORAGE_KEYS.TESTIMONIALS, JSON.stringify(items));
    this.notify();
    this.pushStructureToFirestore();
  }

  addTestimonial(item: Omit<TestimonialItem, 'id'>): TestimonialItem[] {
    const current = this.getTestimonials();
    const newItem: TestimonialItem = {
      ...item,
      id: `testi-${Date.now()}`,
      rating: item.rating || 5
    };
    const updated = [...current, newItem];
    this.saveTestimonials(updated);
    return updated;
  }

  updateTestimonial(id: string, partial: Partial<TestimonialItem>): TestimonialItem[] {
    const current = this.getTestimonials();
    const updated = current.map(t => (t.id === id ? { ...t, ...partial } : t));
    this.saveTestimonials(updated);
    return updated;
  }

  deleteTestimonial(id: string): TestimonialItem[] {
    const del = this.getDeletedStructure();
    if (!del.testimonials) del.testimonials = [];
    if (!del.testimonials.includes(id)) {
      del.testimonials.push(id);
      this.saveDeletedStructure(del);
    }
    const current = this.getTestimonials();
    const updated = current.filter(t => t.id !== id);
    this.saveTestimonials(updated);
    return updated;
  }

  // --- ARTICLES (DERNIERS ARTICLES & GUIDES CONCRETS) ---
  getArticles(): ArticleItem[] {
    const del = this.getDeletedStructure();
    const delIds = del.articles || [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ARTICLES);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((a: ArticleItem) => a && a.id && !delIds.includes(a.id));
        }
      }
    } catch (e) {
      console.error('Error loading articles:', e);
    }
    const initial = DEFAULT_ARTICLES.filter(a => !delIds.includes(a.id));
    localStorage.setItem(STORAGE_KEYS.ARTICLES, JSON.stringify(initial));
    return initial;
  }

  saveArticles(items: ArticleItem[]) {
    localStorage.setItem(STORAGE_KEYS.ARTICLES, JSON.stringify(items));
    this.notify();
    this.pushStructureToFirestore();
  }

  addArticle(item: Omit<ArticleItem, 'id' | 'slug'> & { slug?: string }): ArticleItem[] {
    const current = this.getArticles();
    const id = `art-${Date.now()}`;
    const slug = (item.slug || item.title)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || id;
    const newItem: ArticleItem = {
      ...item,
      id,
      slug,
      date: item.date || `Mis à jour le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`,
      readTime: item.readTime || '5 min de lecture'
    };
    const updated = [newItem, ...current];
    this.saveArticles(updated);
    return updated;
  }

  updateArticle(id: string, partial: Partial<ArticleItem>): ArticleItem[] {
    const current = this.getArticles();
    const updated = current.map(a => (a.id === id ? { ...a, ...partial } : a));
    this.saveArticles(updated);
    return updated;
  }

  deleteArticle(id: string): ArticleItem[] {
    const del = this.getDeletedStructure();
    if (!del.articles) del.articles = [];
    if (!del.articles.includes(id)) {
      del.articles.push(id);
      this.saveDeletedStructure(del);
    }
    const current = this.getArticles();
    const updated = current.filter(a => a.id !== id);
    this.saveArticles(updated);
    return updated;
  }

  // --- FAQS (QUESTIONS FRÉQUENTES) ---
  getFaqs(): FaqItem[] {
    const del = this.getDeletedStructure();
    const delIds = del.faqs || [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.FAQS);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitized = parsed
            .filter((f: FaqItem) => f && f.id && !delIds.includes(f.id))
            .map((f: FaqItem) => {
              // Remplacer les anciennes réponses contenant des généralisations ou codes internes DKR628
              if (f.a && (f.a.includes('DKR628') || f.a.includes('Code de Fret'))) {
                const replacement = DEFAULT_FAQS.find(df => df.id === f.id);
                if (replacement) return replacement;
              }
              return f;
            });
          return sanitized;
        }
      }
    } catch (e) {
      console.error('Error loading faqs:', e);
    }
    const initial = DEFAULT_FAQS.filter(f => !delIds.includes(f.id));
    localStorage.setItem(STORAGE_KEYS.FAQS, JSON.stringify(initial));
    return initial;
  }

  saveFaqs(items: FaqItem[]) {
    localStorage.setItem(STORAGE_KEYS.FAQS, JSON.stringify(items));
    this.notify();
    this.pushStructureToFirestore();
  }

  addFaq(item: Omit<FaqItem, 'id'>): FaqItem[] {
    const current = this.getFaqs();
    const newItem: FaqItem = {
      ...item,
      id: `faq-${Date.now()}`
    };
    const updated = [...current, newItem];
    this.saveFaqs(updated);
    return updated;
  }

  updateFaq(id: string, partial: Partial<FaqItem>): FaqItem[] {
    const current = this.getFaqs();
    const updated = current.map(f => (f.id === id ? { ...f, ...partial } : f));
    this.saveFaqs(updated);
    return updated;
  }

  deleteFaq(id: string): FaqItem[] {
    const del = this.getDeletedStructure();
    if (!del.faqs) del.faqs = [];
    if (!del.faqs.includes(id)) {
      del.faqs.push(id);
      this.saveDeletedStructure(del);
    }
    const current = this.getFaqs();
    const updated = current.filter(f => f.id !== id);
    this.saveFaqs(updated);
    return updated;
  }

  // --- COLLECTE DES EMAILS CLIENTS / NEWSLETTER / PROMOS CIBLÉES ---
  getNewsletterSubscribers(): NewsletterSubscriber[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SUBSCRIBERS);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error loading subscribers:', e);
    }
    return [];
  }

  saveNewsletterSubscribers(subscribers: NewsletterSubscriber[]) {
    localStorage.setItem(STORAGE_KEYS.SUBSCRIBERS, JSON.stringify(subscribers));
    this.notify();
    try {
      window.dispatchEvent(new CustomEvent('ze_subscribers_updated'));
    } catch {}
    this.pushStructureToFirestore();
  }

  addNewsletterSubscriber(email: string, name?: string, phone?: string, company?: string, source: string = 'web'): { success: boolean; message: string; subscriber?: NewsletterSubscriber } {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: 'Adresse email invalide.' };
    }
    const list = this.getNewsletterSubscribers();
    const existing = list.find(s => s.email.toLowerCase() === cleanEmail);
    if (existing) {
      // Mettre à jour les infos si renseignées
      const updated = list.map(s => s.email.toLowerCase() === cleanEmail ? {
        ...s,
        name: name?.trim() || s.name,
        phone: phone?.trim() || s.phone,
        company: company?.trim() || s.company,
        source: s.source || source
      } : s);
      this.saveNewsletterSubscribers(updated);
      return { success: true, message: 'Vos coordonnées ont été mises à jour pour nos offres exclusives.', subscriber: existing };
    }
    const newSub: NewsletterSubscriber = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      email: cleanEmail,
      name: name?.trim() || undefined,
      phone: phone?.trim() || undefined,
      company: company?.trim() || undefined,
      subscribedAt: new Date().toISOString(),
      source,
      tags: ['newsletter', 'prospect']
    };
    this.saveNewsletterSubscribers([newSub, ...list]);
    return { success: true, message: 'Inscription réussie ! Vous recevrez nos promotions ciblées et arrivages exclusifs.', subscriber: newSub };
  }

  deleteNewsletterSubscriber(idOrEmail: string): NewsletterSubscriber[] {
    const list = this.getNewsletterSubscribers();
    const updated = list.filter(s => s.id !== idOrEmail && s.email.toLowerCase() !== idOrEmail.toLowerCase());
    this.saveNewsletterSubscribers(updated);
    return updated;
  }
}

export const siteSettingsService = new SiteSettingsService();

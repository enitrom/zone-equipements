import { useState, useEffect, useMemo } from 'react';
import { ArrowRight, ShieldCheck, Truck, Clock, Package, ChevronRight, ChevronLeft, Pencil, Check, X, Plus, Image as ImageIcon, Sparkles, Sliders, ArrowUp, ArrowDown, MoveVertical, RotateCcw, Search } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Link } from 'react-router-dom';
import { DeliveryLogistics } from '../App';
import { siteSettingsService, SectorItem, CategoryItem, BrandItem, TestimonialItem, ArticleItem, FaqItem, SiteSettings } from '../services/siteSettingsService';
import { handleImageError, resolveImageUrl, DEFAULT_SECTOR_IMAGE, DEFAULT_HERO_IMAGE, DEFAULT_PRODUCT_IMAGE } from '../constants';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ImageUploadInput } from '../components/ImageUploadInput';
import { ConfirmModal } from '../components/admin/ConfirmModal';
import { IconPicker } from '../components/IconPicker';
import { ADMIN_EMAILS } from '../AuthContext';
import { useLanguage } from '../LanguageContext';

export const DEFAULT_HOME_SECTIONS_ORDER = [
  'hero',
  'features',
  'delivery',
  'sectors',
  'categories',
  'brands',
  'testimonials',
  'articles',
  'faq'
];

export const SECTION_METADATA: Record<string, { label: string; icon: string }> = {
  hero: { label: "Bannière d'Accueil (Hero)", icon: "Sliders" },
  features: { label: "Engagements & 3 Cartes Garanties", icon: "ShieldCheck" },
  delivery: { label: "Présentation Logistique & Fret Panafricain", icon: "Truck" },
  sectors: { label: "Secteurs d'Activité & Chantiers Clés", icon: "Sparkles" },
  categories: { label: "31 Catégories d'Équipements & Matériels", icon: "Package" },
  brands: { label: "Grandes Marques de Confiance", icon: "Award" },
  testimonials: { label: "Témoignages & Retours Clients", icon: "Star" },
  articles: { label: "Guides Techniques & Derniers Articles", icon: "BookOpen" },
  faq: { label: "Foire Aux Questions (FAQ)", icon: "HelpCircle" }
};

export default function Home() {
  const { t, translateCategory, translateText, language } = useLanguage();
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(siteSettingsService.getSettings());
  const [sectors, setSectors] = useState<SectorItem[]>(siteSettingsService.getSectors());
  const [categories, setCategories] = useState<CategoryItem[]>(siteSettingsService.getCategories());
  const [brands, setBrands] = useState<BrandItem[]>(siteSettingsService.getBrands());
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>(siteSettingsService.getTestimonials());
  const [articles, setArticles] = useState<ArticleItem[]>(siteSettingsService.getArticles());
  const [faqs, setFaqs] = useState<FaqItem[]>(siteSettingsService.getFaqs());

  // Admin Quick Edit & Reordering on Home
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingSector, setEditingSector] = useState<SectorItem | null>(null);
  const [isNewSector, setIsNewSector] = useState(false);
  const [sectorForm, setSectorForm] = useState({ name: '', desc: '', img: '' });
  const [editingHero, setEditingHero] = useState(false);
  const [heroForm, setHeroForm] = useState({ title: '', subtitle: '', bgImage: '' });
  const [editingSectionMeta, setEditingSectionMeta] = useState<{ sectionId: string; titleKey: keyof SiteSettings; subtitleKey: keyof SiteSettings; title: string; subtitle: string } | null>(null);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [showIconPickerForSector, setShowIconPickerForSector] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Brands Selection Modal for Homepage
  const [isBrandSelectModalOpen, setIsBrandSelectModalOpen] = useState(false);
  const [brandSearchTerm, setBrandSearchTerm] = useState('');
  const [newBrandForm, setNewBrandForm] = useState({ name: '', sub: '', iconName: 'ShieldCheck' });
  const [showNewBrandForm, setShowNewBrandForm] = useState(false);

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const sectorImageSuggestions = [
    { label: 'Industrie & Usines', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80' },
    { label: 'Mines & Carrières', url: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=800&auto=format&fit=crop&q=80' },
    { label: 'BTP & Chantier', url: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=800&auto=format&fit=crop&q=80' },
    { label: 'Énergie & Réseaux', url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80' },
    { label: 'Agroalimentaire', url: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&auto=format&fit=crop&q=80' },
    { label: 'Pétrole & Offshore', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80' },
    { label: 'Logistique & Fret', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80' },
    { label: 'Automates & Élec', url: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800&auto=format&fit=crop&q=80' }
  ];

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);

    const handleSettingsUpdate = () => {
      setSiteSettings(siteSettingsService.getSettings());
      setSectors(siteSettingsService.getSectors());
      setCategories(siteSettingsService.getCategories());
      setBrands(siteSettingsService.getBrands());
      setTestimonials(siteSettingsService.getTestimonials());
      setArticles(siteSettingsService.getArticles());
      setFaqs(siteSettingsService.getFaqs());
    };

    window.addEventListener('ze_settings_updated', handleSettingsUpdate);
    window.addEventListener('ze_catalog_updated', handleSettingsUpdate);

    const checkAdmin = () => {
      const user = auth.currentUser;
      const userEmail = user?.email?.toLowerCase().trim();
      const byAuth = userEmail ? ADMIN_EMAILS.some(e => e.toLowerCase() === userEmail) : false;
      setIsAdmin(byAuth);
    };
    checkAdmin();
    const unsub = onAuthStateChanged(auth, checkAdmin);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('ze_settings_updated', handleSettingsUpdate);
      window.removeEventListener('ze_catalog_updated', handleSettingsUpdate);
      unsub();
    };
  }, []);

  // Compute active sections order
  const activeSectionsOrder = useMemo(() => {
    const saved = siteSettings.homeSectionsOrder;
    if (Array.isArray(saved) && saved.length > 0) {
      // Ensure all valid sections exist
      const known = new Set(saved);
      const missing = DEFAULT_HOME_SECTIONS_ORDER.filter(s => !known.has(s));
      return [...saved.filter(s => DEFAULT_HOME_SECTIONS_ORDER.includes(s)), ...missing];
    }
    return DEFAULT_HOME_SECTIONS_ORDER;
  }, [siteSettings.homeSectionsOrder]);

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    const currentList = [...activeSectionsOrder];
    const index = currentList.indexOf(sectionId);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentList.length) return;

    const temp = currentList[index];
    currentList[index] = currentList[targetIndex];
    currentList[targetIndex] = temp;

    siteSettingsService.updateSettings({
      homeSectionsOrder: currentList
    });
    setSaveSuccessMsg(`Section "${SECTION_METADATA[sectionId]?.label || sectionId}" déplacée.`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const getVisibleItems = () => {
    if (windowWidth >= 1024) return 3;
    if (windowWidth >= 768) return 2;
    return 1;
  };

  const visibleItems = Math.min(getVisibleItems(), Math.max(testimonials.length, 1));

  const nextTestimonial = () => {
    if (testimonials.length === 0) return;
    setTestimonialIndex((prev) => (prev + 1) % testimonials.length);
  };
  const prevTestimonial = () => {
    if (testimonials.length === 0) return;
    setTestimonialIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  // Section Control Header for Admin (Elementor-Style Up/Down & Edit)
  const renderSectionAdminControl = (sectionId: string, titleKey?: keyof SiteSettings, subtitleKey?: keyof SiteSettings) => {
    if (!isAdmin) return null;
    const index = activeSectionsOrder.indexOf(sectionId);
    const isFirst = index === 0;
    const isLast = index === activeSectionsOrder.length - 1;

    return (
      <div className="bg-slate-900/90 text-white px-3 py-1.5 rounded-lg border border-slate-700 shadow-md inline-flex items-center gap-2 text-[11px] mb-3 backdrop-blur-sm z-20 font-sans">
        <span className="font-bold text-amber-400 flex items-center gap-1">
          <MoveVertical className="w-3.5 h-3.5" />
          {SECTION_METADATA[sectionId]?.label || sectionId}
        </span>
        <div className="flex items-center gap-1 border-l border-slate-700 pl-2">
          <button
            type="button"
            disabled={isFirst}
            onClick={() => moveSection(sectionId, 'up')}
            className={`p-1 rounded hover:bg-slate-800 transition-colors ${isFirst ? 'opacity-30 cursor-not-allowed' : 'text-white hover:text-[#FF6600]'}`}
            title="Monter cette section (Elementor Style)"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={isLast}
            onClick={() => moveSection(sectionId, 'down')}
            className={`p-1 rounded hover:bg-slate-800 transition-colors ${isLast ? 'opacity-30 cursor-not-allowed' : 'text-white hover:text-[#FF6600]'}`}
            title="Descendre cette section (Elementor Style)"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          {titleKey && subtitleKey && (
            <button
              type="button"
              onClick={() => {
                setEditingSectionMeta({
                  sectionId,
                  titleKey,
                  subtitleKey,
                  title: String((siteSettings as any)[titleKey] || ''),
                  subtitle: String((siteSettings as any)[subtitleKey] || '')
                });
              }}
              className="ml-1 px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold flex items-center gap-1 transition-colors"
              title="Modifier le titre et sous-titre de cette section"
            >
              <Pencil className="w-3 h-3" /> Titre & Textes
            </button>
          )}
        </div>
      </div>
    );
  };

  /* ================= SECTION RENDERERS ================= */

  // 1. HERO SECTION
  const renderHeroSection = () => (
    <section key="hero" className="relative bg-[#003366] text-white py-20 lg:py-28 overflow-hidden">
      <div 
        className="absolute inset-0 opacity-20 bg-cover bg-center mix-blend-overlay"
        style={{ backgroundImage: `url('${resolveImageUrl(siteSettings.heroBgImage, DEFAULT_HERO_IMAGE)}')` }}
      ></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <div className="max-w-3xl mx-auto">
          {isAdmin && (
            <div className="mb-4 inline-flex items-center gap-2 bg-slate-900/80 text-amber-300 border border-amber-500/40 px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md shadow-lg flex-wrap justify-center">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Bannière Principale</span>
              <button
                type="button"
                onClick={() => {
                  setHeroForm({
                    title: siteSettings.heroTitle,
                    subtitle: siteSettings.heroSubtitle,
                    bgImage: siteSettings.heroBgImage || ''
                  });
                  setEditingHero(true);
                }}
                className="ml-1 bg-amber-500 hover:bg-amber-400 text-slate-950 px-2.5 py-1 rounded-md font-bold text-[11px] flex items-center gap-1 transition-all"
              >
                <Pencil className="w-3 h-3" />
                Modifier le Titre & Image
              </button>
              <button
                type="button"
                onClick={() => moveSection('hero', 'down')}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white"
                title="Descendre le Hero"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <h1 className="text-3xl md:text-5xl font-bold font-roboto leading-tight mb-5">
            {language === 'fr' ? siteSettings.heroTitle : t('hero_title')}
          </h1>
          <p className="text-base sm:text-lg text-gray-300 mb-8 font-sans leading-relaxed">
            {language === 'fr' ? siteSettings.heroSubtitle : t('hero_subtitle')}
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/shop" className="bg-[#FF6600] hover:bg-[#e65c00] text-white px-7 py-3.5 rounded-lg font-bold text-base transition-all flex items-center gap-2 shadow-lg shadow-orange-900/20">
              {t('explore_catalog')} <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/services" className="bg-white/10 hover:bg-white/20 text-white border border-white/30 px-7 py-3.5 rounded-lg font-bold text-base transition-all backdrop-blur-sm">
              {t('request_proforma')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );

  // 2. FEATURES / 3 CARDS
  const renderFeaturesSection = () => (
    <section key="features" className="py-4 bg-white border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {isAdmin && (
          <div className="text-center mb-2">
            {renderSectionAdminControl('features')}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-3.5 p-3.5 rounded-xl hover:bg-gray-50 transition-colors">
            <div className="bg-blue-50 p-2.5 rounded-lg text-[#003366] shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-gray-900">{t('feature_certified_quality')}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{t('feature_certified_quality_sub')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3.5 p-3.5 rounded-xl hover:bg-gray-50 transition-colors">
            <div className="bg-orange-50 p-2.5 rounded-lg text-[#FF6600] shrink-0">
              <Truck className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-gray-900">{t('feature_integrated_logistics')}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{t('feature_integrated_logistics_sub')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3.5 p-3.5 rounded-xl hover:bg-gray-50 transition-colors">
            <div className="bg-green-50 p-2.5 rounded-lg text-green-600 shrink-0">
              <Clock className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-gray-900">{t('feature_expert_support')}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{t('feature_expert_support_sub')}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  // 3. DELIVERY LOGISTICS
  const renderDeliverySection = () => (
    <div key="delivery" className="relative">
      {isAdmin && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
          {renderSectionAdminControl('delivery', 'logisticsTitle', 'logisticsSubtitle')}
        </div>
      )}
      <DeliveryLogistics />
    </div>
  );

  // 4. SECTORS
  const renderSectorsSection = () => (
    <section key="sectors" className="pt-8 pb-8 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          {renderSectionAdminControl('sectors', 'sectorsTitle', 'sectorsSubtitle')}
          {isAdmin && (
            <div className="mb-4 inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-900 px-4 py-2 rounded-full text-xs font-bold shadow-sm flex-wrap justify-center">
              <Sparkles className="w-4 h-4 text-[#FF6600]" />
              <span>Cliquez sur le crayon ✏️ d'un secteur pour changer son image ou son titre</span>
              <button
                type="button"
                onClick={() => {
                  setIsNewSector(true);
                  setSectorForm({
                    name: '',
                    desc: '',
                    img: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80'
                  });
                  setEditingSector({ id: `sec-${Date.now()}`, name: '', desc: '', img: '' });
                }}
                className="ml-2 bg-[#003366] hover:bg-[#002244] text-white px-3 py-1 rounded-lg text-[11px] flex items-center gap-1 font-bold shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Nouveau Secteur
              </button>
            </div>
          )}
          <h2 className="text-xl sm:text-2xl font-bold font-roboto text-[#003366] mb-2">
            {siteSettings.sectorsTitle || t('home_sectors_title')}
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 max-w-2xl mx-auto">
            {siteSettings.sectorsSubtitle || t('home_sectors_sub')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {sectors.map((sector, i) => {
            const sectorImg = resolveImageUrl(sector.img, DEFAULT_SECTOR_IMAGE);
            return (
              <div 
                key={sector.id || i}
                className="bg-white rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 group border border-gray-200 flex flex-col relative"
              >
                <div className="h-40 overflow-hidden relative bg-slate-900">
                  <img 
                    src={sectorImg} 
                    alt={sector.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                    onError={(e) => handleImageError(e, DEFAULT_SECTOR_IMAGE)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#003366]/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3.5">
                    <p className="text-white text-[10px] font-medium leading-tight">{translateText(sector.desc)}</p>
                  </div>

                  {isAdmin && (
                    <button
                      type="button"
                      title="Modifier l'image et les informations de ce secteur"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsNewSector(false);
                        setSectorForm({
                          name: sector.name,
                          desc: sector.desc || '',
                          img: sector.img || ''
                        });
                        setEditingSector(sector);
                      }}
                      className="absolute top-2 right-2 z-20 w-7 h-7 rounded-full bg-white/95 hover:bg-white text-slate-900 shadow-md border border-slate-200 flex items-center justify-center transition-all hover:scale-110"
                    >
                      <Pencil className="w-3.5 h-3.5 text-[#003366]" />
                    </button>
                  )}
                </div>
                <Link 
                  to={`/shop?sector=${encodeURIComponent(sector.name)}`}
                  className="p-3.5 text-center flex-grow flex flex-col justify-center"
                >
                  <h3 className="text-xs sm:text-sm font-bold text-[#003366] mb-1 group-hover:text-[#FF6600] transition-colors">{translateCategory(sector.name)}</h3>
                  <div className="flex items-center justify-center gap-1 text-[#FF6600] text-[9px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">
                    {t('home_view_product')} <ArrowRight className="w-2.5 h-2.5" />
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );

  // 5. 31 CATEGORIES
  const renderCategoriesSection = () => (
    <section key="categories" className="py-12 bg-white border-t border-gray-100 overflow-hidden w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">
        <div className="ze-section-title mb-8 max-w-3xl mx-auto">
          {renderSectionAdminControl('categories', 'categoriesTitle', 'categoriesSubtitle')}
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold font-roboto text-[#003366]">
            {siteSettings.categoriesTitle || t('categories')}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-2">
            {categories.length} {siteSettings.categoriesSubtitle || t('categories_sub')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 text-left w-full">
          {categories.map((cat, i) => {
            const IconComponent = (Icons as any)[cat.icon] || Icons.Package;
            return (
              <div 
                key={cat.name || i} 
                className="bg-slate-50 hover:bg-white border border-slate-200/80 hover:border-[#FF6600] rounded-xl p-4 sm:p-5 transition-all duration-200 hover:shadow-md flex items-start gap-3.5 group min-w-0"
              >
                <div className="w-10 h-10 rounded-xl bg-[#003366] group-hover:bg-[#FF6600] text-white flex items-center justify-center shrink-0 border border-white/20 transition-colors shadow-xs">
                  <IconComponent className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate block">📦 {cat.brands}</span>
                  <h4 className="font-bold text-sm text-[#003366] group-hover:text-[#FF6600] transition-colors truncate">{translateCategory(cat.name)}</h4>
                  <p className="text-xs text-gray-600 leading-relaxed font-normal line-clamp-2">{translateText(cat.description)}</p>
                  <Link to={`/shop?category=${encodeURIComponent(cat.name)}`} className="text-[11px] text-[#FF6600] font-bold flex items-center gap-1 group-hover:translate-x-1 duration-200 transition-all font-sans mt-1">
                    {translateText('Explorer')} &rarr;
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );

  // 6. HIGH TRUST BRANDS
  const renderBrandsSection = () => {
    const featuredBrands = brands.filter(b => b.featured !== false);
    const displayedBrands = featuredBrands.length > 0 ? featuredBrands : brands.slice(0, 12);

    return (
      <section key="brands" className="py-12 bg-gray-50 border-t border-b border-gray-100 overflow-hidden w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center w-full">
          <div className="ze-section-title mb-8 max-w-3xl mx-auto">
            {renderSectionAdminControl('brands', 'brandsTitle', 'brandsSubtitle')}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-2">
              <h2 className="text-xl sm:text-2xl font-bold font-roboto text-[#003366]">
                {siteSettings.brandsTitle || t('home_brands_title')}
              </h2>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsBrandSelectModalOpen(true)}
                  className="bg-[#003366] hover:bg-[#FF6600] text-white text-[11px] font-bold px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Pencil className="w-3 h-3" /> Sélectionner les marques ({featuredBrands.length}/{brands.length})
                </button>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-500">
              {siteSettings.brandsSubtitle || t('home_brands_sub')}
            </p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 text-center w-full">
            {displayedBrands.map((brand, i) => {
              const IconComponent = (Icons as any)[brand.iconName] || Icons.ShieldCheck;
              return (
                <Link
                  key={brand.name || i}
                  to={`/shop?brand=${encodeURIComponent(brand.name)}`}
                  className="hover:border-[#003366] transition-all group p-3.5 bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center min-h-[85px] shadow-xs hover:shadow-md"
                >
                  <IconComponent className="w-5 h-5 text-gray-400 group-hover:text-[#FF6600] transition-colors mb-1.5" />
                  <span className="font-bold text-gray-900 text-xs tracking-wider group-hover:text-[#003366] truncate w-full">{brand.name}</span>
                  <span className="text-[9px] text-gray-400 font-medium truncate w-full">{brand.sub}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    );
  };

  // 7. TESTIMONIALS
  const renderTestimonialsSection = () => (
    <section key="testimonials" className="ze-testimonials alignwide pt-8 pb-8 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="ze-section-title text-center mb-6">
          {renderSectionAdminControl('testimonials', 'testimonialsTitle', 'testimonialsSubtitle')}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold font-roboto text-[#003366]">
              {siteSettings.testimonialsTitle || t('home_testimonials_title')}
            </h2>
            {isAdmin && (
              <Link
                to="/admin?tab=catalog-structure&sub=testimonials"
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#003366] text-white px-2.5 py-1 rounded-lg hover:bg-[#FF6600] transition-colors"
              >
                <Pencil className="w-3 h-3" /> Gérer
              </Link>
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {siteSettings.testimonialsSubtitle || t('home_testimonials_sub')}
          </p>
        </div>

        {testimonials.length > 0 && (
          <div className="relative px-0 md:px-12">
            <button 
              onClick={prevTestimonial}
              className="absolute -left-2 md:-left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full border border-gray-200 bg-white text-[#003366] hover:bg-[#FF6600] hover:text-white hover:border-[#FF6600] flex items-center justify-center transition-all duration-200 shadow-sm z-10 cursor-pointer"
              aria-label="Témoignage précédent"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            </button>

            <div className="ze-testimonials-grid">
              {Array.from({ length: visibleItems }).map((_, i) => {
                const currentIdx = (testimonialIndex + i) % testimonials.length;
                const item = testimonials[currentIdx];
                if (!item) return null;
                const starsCount = Math.max(1, Math.min(5, item.rating || 5));
                return (
                  <div key={item.id || currentIdx} className="ze-testimonial-card">
                    <div className="ze-t-header">
                      <div className="ze-t-user">
                        <strong>{item.name}</strong>
                        <span>{item.role}</span>
                      </div>
                    </div>
                    <p className="ze-t-feedback">"{item.text}"</p>
                    <div className="ze-t-rating">
                      {Array.from({ length: starsCount }).map((__, sIdx) => (
                        <span key={sIdx}>⭐</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <button 
              onClick={nextTestimonial}
              className="absolute -right-2 md:-right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full border border-gray-200 bg-white text-[#003366] hover:bg-[#FF6600] hover:text-white hover:border-[#FF6600] flex items-center justify-center transition-all duration-200 shadow-sm z-10 cursor-pointer"
              aria-label="Témoignage suivant"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        )}

        <div className="flex justify-center gap-1.5 mt-6">
          {Array.from({ length: testimonials.length }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setTestimonialIndex(idx)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                testimonialIndex === idx ? 'w-5 bg-[#FF6600]' : 'bg-gray-200 hover:bg-gray-300'
              }`}
              aria-label={`Aller au témoignage ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );

  // 8. ARTICLES
  const renderArticlesSection = () => (
    <section key="articles" className="ze-articles alignwide pt-8 pb-8 bg-gray-50 border-t border-gray-100">
      <div className="ze-section-title text-center mb-8">
        {renderSectionAdminControl('articles', 'articlesTitle', 'articlesSubtitle')}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <h2 className="text-xl sm:text-2xl font-bold font-roboto text-[#003366]">
            {siteSettings.articlesTitle || t('home_articles_title')}
          </h2>
          {isAdmin && (
            <Link
              to="/admin?tab=catalog-structure&sub=articles"
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#003366] text-white px-2.5 py-1 rounded-lg hover:bg-[#FF6600] transition-colors"
            >
              <Pencil className="w-3 h-3" /> Gérer
            </Link>
          )}
        </div>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          {siteSettings.articlesSubtitle || t('home_articles_sub')}
        </p>
      </div>
      
      <div className="ze-articles-grid animate-in fade-in slide-in-from-bottom-5 duration-500">
        {articles.slice(0, 6).map((post, i) => (
          <article key={post.id || i} className="ze-article-card group flex flex-col">
            <Link to={`/blog/${post.slug || post.id}`} className="block overflow-hidden bg-slate-900 aspect-video relative">
              <img 
                src={post.img} 
                alt={post.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
                onError={(e) => handleImageError(e, DEFAULT_PRODUCT_IMAGE)}
              />
              {post.readTime && (
                <span className="absolute bottom-2.5 right-2.5 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                  ⏱ {post.readTime}
                </span>
              )}
            </Link>
            <div className="ze-article-body flex-1 flex flex-col justify-between p-4">
              <div>
                <span className="ze-article-tag text-[10px] uppercase font-bold text-[#FF6600]">{post.category}</span>
                <h3 className="text-sm font-bold text-gray-900 mt-1 leading-snug">
                  <Link to={`/blog/${post.slug || post.id}`} className="hover:text-[#FF6600] transition-colors">
                    {post.title}
                  </Link>
                </h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{post.description}</p>
              </div>
              <div className="pt-2.5 mt-2.5 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[10px] text-gray-400 font-mono">{post.date}</span>
                <Link
                  to={`/blog/${post.slug || post.id}`}
                  className="text-xs font-bold text-[#FF6600] hover:text-[#003366] flex items-center gap-1 transition-colors"
                >
                  {t('home_read_article')} <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="text-center mt-6">
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white hover:bg-[#003366] text-[#003366] hover:text-white font-bold text-xs border border-gray-200 shadow-2xs transition-all"
        >
          {t('home_view_all_articles')} ({articles.length}) <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </section>
  );

  // 9. FAQ
  const renderFaqSection = () => (
    <section key="faq" className="ze-faq alignwide pt-8 pb-12 bg-white">
      <div className="ze-section-title text-center mb-8">
        {renderSectionAdminControl('faq', 'faqTitle', 'faqSubtitle')}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <h2 className="text-xl sm:text-2xl font-bold font-roboto text-[#003366]">
            {siteSettings.faqTitle || t('home_faq_title')}
          </h2>
          {isAdmin && (
            <Link
              to="/admin?tab=catalog-structure&sub=faqs"
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#003366] text-white px-2.5 py-1 rounded-lg hover:bg-[#FF6600] transition-colors"
            >
              <Pencil className="w-3 h-3" /> Gérer
            </Link>
          )}
        </div>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          {siteSettings.faqSubtitle || t('home_faq_sub')}
        </p>
      </div>
      
      <div className="ze-faq-grid animate-in fade-in slide-in-from-bottom-5 duration-500 delay-150">
        {faqs.map((faq, i) => (
          <div key={faq.id || i} className="ze-faq-item p-4 rounded-xl border border-gray-100 bg-gray-50/50">
            <h4 className="flex items-start gap-2 font-bold text-xs sm:text-sm text-gray-900">
              <span className="text-[#FF6600] font-bold">Q.</span>
              <span>{faq.q}</span>
            </h4>
            <p className="text-xs text-gray-600 mt-1.5 pl-4">{faq.a}</p>
          </div>
        ))}
      </div>
    </section>
  );

  // Section Dispatcher Map
  const sectionRenderers: Record<string, () => React.ReactNode> = {
    hero: renderHeroSection,
    features: renderFeaturesSection,
    delivery: renderDeliverySection,
    sectors: renderSectorsSection,
    categories: renderCategoriesSection,
    brands: renderBrandsSection,
    testimonials: renderTestimonialsSection,
    articles: renderArticlesSection,
    faq: renderFaqSection
  };

  return (
    <div className="flex flex-col pt-0">
      
      {/* Elementor-Style Floating Reorder Bar for Admin */}
      {isAdmin && (
        <div className="bg-slate-950 text-white px-4 py-2 border-b border-amber-500/40 sticky top-20 z-30 flex items-center justify-between gap-3 text-xs shadow-md">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="font-bold text-amber-300">Éditeur de Page d'Accueil (Elementor-Style)</span>
            <span className="hidden sm:inline text-slate-400">• Déplacez et personnalisez chaque section</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowReorderModal(true)}
              className="px-2.5 py-1 bg-[#003366] hover:bg-[#002244] text-white rounded-md font-bold flex items-center gap-1.5 transition-colors"
            >
              <MoveVertical className="w-3.5 h-3.5 text-[#FF6600]" />
              <span>Ordre des Sections</span>
            </button>
            <button
              type="button"
              onClick={() => {
                siteSettingsService.updateSettings({
                  homeSectionsOrder: DEFAULT_HOME_SECTIONS_ORDER
                });
                setSaveSuccessMsg("Ordre des sections réinitialisé par défaut.");
                setTimeout(() => setSaveSuccessMsg(null), 3000);
              }}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-[11px] flex items-center gap-1 transition-colors"
              title="Réinitialiser l'ordre des sections"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {saveSuccessMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-emerald-400 px-4 py-2 rounded-full text-xs font-bold border border-emerald-500/50 shadow-2xl flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Dynamic Ordered Sections Rendering */}
      {activeSectionsOrder.map(secId => {
        const renderer = sectionRenderers[secId];
        return renderer ? renderer() : null;
      })}

      {/* ================= MODAL 1: ELEMENTOR SECTION REORDER MODAL ================= */}
      {showReorderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowReorderModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-800">
              <div className="p-2 rounded-xl bg-orange-500/20 text-[#FF6600]">
                <MoveVertical className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Ordre Vertical des Sections</h3>
                <p className="text-xs text-slate-400">Réorganisez l'affichage de la page d'accueil</p>
              </div>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
              {activeSectionsOrder.map((secId, idx) => {
                const meta = SECTION_METADATA[secId];
                const isFirst = idx === 0;
                const isLast = idx === activeSectionsOrder.length - 1;

                return (
                  <div key={secId} className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                    <div className="flex items-center gap-2 font-semibold">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <span>{meta?.label || secId}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => moveSection(secId, 'up')}
                        className={`p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 ${isFirst ? 'opacity-30 cursor-not-allowed' : 'text-white hover:text-[#FF6600]'}`}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => moveSection(secId, 'down')}
                        className={`p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 ${isLast ? 'opacity-30 cursor-not-allowed' : 'text-white hover:text-[#FF6600]'}`}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  siteSettingsService.updateSettings({ homeSectionsOrder: DEFAULT_HOME_SECTIONS_ORDER });
                  setShowReorderModal(false);
                }}
                className="text-xs text-slate-400 hover:text-white"
              >
                Réinitialiser
              </button>
              <button
                type="button"
                onClick={() => setShowReorderModal(false)}
                className="px-4 py-2 bg-[#FF6600] text-white rounded-xl text-xs font-bold shadow-md"
              >
                Terminer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: EDIT SECTION TITLE & SUBTITLE ================= */}
      {editingSectionMeta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setEditingSectionMeta(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-800">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                <Pencil className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Modifier : {SECTION_METADATA[editingSectionMeta.sectionId]?.label || editingSectionMeta.sectionId}
                </h3>
                <p className="text-xs text-slate-400">Personnalisez le titre principal et le texte d'introduction</p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                siteSettingsService.updateSettings({
                  [editingSectionMeta.titleKey]: editingSectionMeta.title.trim(),
                  [editingSectionMeta.subtitleKey]: editingSectionMeta.subtitle.trim()
                });
                setEditingSectionMeta(null);
                setSaveSuccessMsg("Titres de la section mis à jour avec succès.");
                setTimeout(() => setSaveSuccessMsg(null), 3000);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Titre de la Section</label>
                <input
                  type="text"
                  required
                  value={editingSectionMeta.title}
                  onChange={(e) => setEditingSectionMeta({ ...editingSectionMeta, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-[#FF6600] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Sous-titre / Texte explicatif</label>
                <textarea
                  rows={3}
                  value={editingSectionMeta.subtitle}
                  onChange={(e) => setEditingSectionMeta({ ...editingSectionMeta, subtitle: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-[#FF6600] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingSectionMeta(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#FF6600] hover:bg-[#e65c00] text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: QUICK SECTOR EDIT MODAL (ADMIN) ================= */}
      {editingSector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
              type="button"
              onClick={() => setEditingSector(null)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-800">
              <div className="p-2 rounded-xl bg-orange-500/20 text-[#FF6600]">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  {isNewSector ? 'Ajouter un Nouveau Secteur' : `Modifier le Secteur : ${editingSector.name || ''}`}
                </h3>
                <p className="text-xs text-slate-400">Modifiez instantanément l'image et l'icône de ce secteur</p>
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!sectorForm.name.trim()) {
                alert("Le nom du secteur est obligatoire.");
                return;
              }
              if (isNewSector) {
                siteSettingsService.addSector({
                  name: sectorForm.name.trim(),
                  desc: sectorForm.desc.trim(),
                  img: sectorForm.img.trim() || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80'
                });
                setSaveSuccessMsg(`Nouveau secteur "${sectorForm.name}" ajouté avec succès.`);
              } else if (editingSector) {
                siteSettingsService.updateSector(editingSector.id, {
                  name: sectorForm.name.trim(),
                  desc: sectorForm.desc.trim(),
                  img: sectorForm.img.trim()
                });
                setSaveSuccessMsg(`Secteur "${sectorForm.name}" mis à jour.`);
              }
              setEditingSector(null);
              setTimeout(() => setSaveSuccessMsg(null), 4000);
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nom du Secteur</label>
                <input
                  type="text"
                  required
                  value={sectorForm.name}
                  onChange={(e) => setSectorForm({ ...sectorForm, name: e.target.value })}
                  placeholder="Ex: Mines & Carrières, Énergie..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-[#FF6600] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Description courte (au survol)</label>
                <input
                  type="text"
                  value={sectorForm.desc}
                  onChange={(e) => setSectorForm({ ...sectorForm, desc: e.target.value })}
                  placeholder="Ex: Équipements de pompage, concassage et extraction lourde"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-[#FF6600] outline-none"
                />
              </div>

              <ImageUploadInput
                label="Image du Secteur"
                value={sectorForm.img}
                onChange={(imgUrl) => setSectorForm({ ...sectorForm, img: imgUrl })}
                placeholder="https://images.unsplash.com/... ou téléversez un fichier"
                helperText="Téléversez votre propre image ou collez un lien web."
              />

              {/* Suggestions d'images rapides en 1 clic */}
              <div>
                <span className="block text-[11px] font-bold text-slate-400 mb-1.5">Sélectionner une photo industrielle prête à l'emploi :</span>
                <div className="flex flex-wrap gap-1.5">
                  {sectorImageSuggestions.map((sug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSectorForm({ ...sectorForm, img: sug.url })}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-[#FF6600] hover:text-white text-slate-300 text-[10px] font-semibold transition-all border border-slate-700"
                    >
                      {sug.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                {!isNewSector && editingSector ? (
                  <button
                    type="button"
                    onClick={() => {
                      const secToDelete = editingSector;
                      setEditingSector(null);
                      setConfirmModal({
                        isOpen: true,
                        title: 'Supprimer ce secteur',
                        message: `Supprimer définitivement le secteur "${secToDelete.name}" ?`,
                        onConfirm: () => {
                          siteSettingsService.deleteSector(secToDelete.id);
                          setSaveSuccessMsg(`Secteur "${secToDelete.name}" supprimé.`);
                          setTimeout(() => setSaveSuccessMsg(null), 4000);
                        }
                      });
                    }}
                    className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Supprimer
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingSector(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#FF6600] hover:bg-[#e65c00] text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-950/40"
                  >
                    Enregistrer l'Image
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: QUICK HERO EDIT MODAL (ADMIN) ================= */}
      {editingHero && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
              type="button"
              onClick={() => setEditingHero(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-800">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Modifier la Bannière d'Accueil (Hero)</h3>
                <p className="text-xs text-slate-400">Titre principal, accroche et arrière-plan</p>
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              siteSettingsService.updateSettings({
                heroTitle: heroForm.title.trim(),
                heroSubtitle: heroForm.subtitle.trim(),
                heroBgImage: heroForm.bgImage.trim()
              });
              setEditingHero(false);
              setSaveSuccessMsg("Bannière d'accueil mise à jour avec succès.");
              setTimeout(() => setSaveSuccessMsg(null), 4000);
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Titre Principal</label>
                <textarea
                  rows={2}
                  required
                  value={heroForm.title}
                  onChange={(e) => setHeroForm({ ...heroForm, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-[#FF6600] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Sous-titre / Accroche</label>
                <textarea
                  rows={3}
                  required
                  value={heroForm.subtitle}
                  onChange={(e) => setHeroForm({ ...heroForm, subtitle: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-[#FF6600] outline-none"
                />
              </div>

              <ImageUploadInput
                label="Arrière-Plan du Hero Banner"
                value={heroForm.bgImage}
                onChange={(imgUrl) => setHeroForm({ ...heroForm, bgImage: imgUrl })}
                placeholder="https://images.unsplash.com/... ou téléversez votre bannière"
                helperText="Vous pouvez téléverser votre propre photo ou renseigner un lien d'image."
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingHero(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#FF6600] hover:bg-[#e65c00] text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-950/40"
                >
                  Appliquer les Changements
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 5: BRANDS SELECTION FOR HOMEPAGE (ADMIN) ================= */}
      {isBrandSelectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in text-gray-800">
          <div className="bg-white rounded-2xl w-full max-w-xl p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
              <div>
                <h3 className="font-bold text-lg text-[#003366] flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-[#FF6600]" /> Sélection des Marques pour l'Accueil
                </h3>
                <p className="text-xs text-gray-500">Cochez les marques que vous souhaitez afficher sur la grille de présentation</p>
              </div>
              <button
                type="button"
                onClick={() => setIsBrandSelectModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions & Search */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 mb-4">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher une marque (ex: SKF, Schneider, Fluke...)"
                  value={brandSearchTerm}
                  onChange={(e) => setBrandSearchTerm(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3.5 py-2 text-xs focus:outline-none focus:border-[#FF6600]"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const updated = brands.map(b => ({ ...b, featured: true }));
                    setBrands(updated);
                    siteSettingsService.saveBrands(updated);
                  }}
                  className="text-[11px] font-bold text-[#003366] hover:text-[#FF6600] px-2 py-1 bg-gray-100 rounded-lg whitespace-nowrap"
                >
                  Tout cocher
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updated = brands.map(b => ({ ...b, featured: false }));
                    setBrands(updated);
                    siteSettingsService.saveBrands(updated);
                  }}
                  className="text-[11px] font-bold text-gray-600 hover:text-red-600 px-2 py-1 bg-gray-100 rounded-lg whitespace-nowrap"
                >
                  Tout décocher
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewBrandForm(!showNewBrandForm)}
                  className="text-[11px] font-bold text-white bg-[#003366] hover:bg-[#FF6600] px-2.5 py-1 rounded-lg flex items-center gap-1 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" /> Nouvelle
                </button>
              </div>
            </div>

            {/* Inline New Brand Creation Form */}
            {showNewBrandForm && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newBrandForm.name.trim()) return;
                  const newB: BrandItem = {
                    name: newBrandForm.name.trim().toUpperCase(),
                    sub: newBrandForm.sub.trim() || 'Équipements & Pièces',
                    iconName: newBrandForm.iconName || 'ShieldCheck',
                    featured: true
                  };
                  const updated = siteSettingsService.addBrand(newB);
                  setBrands(updated);
                  setNewBrandForm({ name: '', sub: '', iconName: 'ShieldCheck' });
                  setShowNewBrandForm(false);
                }}
                className="bg-blue-50/70 border border-blue-200 p-3 rounded-xl mb-4 space-y-2.5"
              >
                <div className="font-bold text-xs text-[#003366]">Ajouter une marque personnalisée :</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Nom (ex: CATERPILLAR)"
                    value={newBrandForm.name}
                    onChange={(e) => setNewBrandForm(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs uppercase"
                  />
                  <input
                    type="text"
                    placeholder="Spécialité (ex: Moteurs & Engins)"
                    value={newBrandForm.sub}
                    onChange={(e) => setNewBrandForm(prev => ({ ...prev, sub: e.target.value }))}
                    className="bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewBrandForm(false)}
                    className="px-2.5 py-1 text-xs font-semibold text-gray-600"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-[#003366] text-white text-xs font-bold rounded-lg hover:bg-[#FF6600]"
                  >
                    Ajouter & Afficher
                  </button>
                </div>
              </form>
            )}

            {/* Checklist of Brands */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {brands
                .filter(b => !brandSearchTerm || b.name.toLowerCase().includes(brandSearchTerm.toLowerCase()) || b.sub.toLowerCase().includes(brandSearchTerm.toLowerCase()))
                .map((brand) => {
                  const isChecked = brand.featured !== false;
                  const IconComp = (Icons as any)[brand.iconName] || Icons.ShieldCheck;
                  return (
                    <label
                      key={brand.name}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${isChecked ? 'bg-orange-50/50 border-[#FF6600]/40' : 'bg-gray-50/60 border-gray-200 opacity-75 hover:opacity-100'}`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const updated = siteSettingsService.toggleBrandFeatured(brand.name);
                            setBrands(updated);
                          }}
                          className="w-4 h-4 text-[#FF6600] rounded focus:ring-[#FF6600] border-gray-300 cursor-pointer"
                        />
                        <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500">
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-gray-900">{brand.name}</div>
                          <div className="text-[10px] text-gray-500">{brand.sub}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isChecked ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                          {isChecked ? 'Affichée sur l\'accueil' : 'Masquée'}
                        </span>
                        <button
                          type="button"
                          title={`Supprimer ${brand.name}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (window.confirm(`Supprimer définitivement la marque "${brand.name}" ?`)) {
                              const updated = siteSettingsService.deleteBrand(brand.name);
                              setBrands(updated);
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </label>
                  );
                })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-4">
              <span className="text-xs text-gray-500">
                {brands.filter(b => b.featured !== false).length} marque(s) sélectionnée(s) sur {brands.length}
              </span>
              <button
                type="button"
                onClick={() => setIsBrandSelectModalOpen(false)}
                className="px-4 py-2 bg-[#003366] hover:bg-[#FF6600] text-white text-xs font-bold rounded-xl shadow-md transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

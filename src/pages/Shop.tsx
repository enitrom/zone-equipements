import { useState, useEffect, FormEvent } from 'react';
import { 
  Search, Filter, ShoppingCart, ArrowUpDown, Star, Plus, CheckCircle2, 
  Package, ChevronRight, ChevronDown, Truck, Clock, ShieldCheck, 
  LayoutGrid, List, ArrowRight, ExternalLink, RefreshCw, Eye, Check, Info, FileText, X, Heart
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { useCart } from '../CartContext';
import { useAuth } from '../AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Product, getProductImageUrl, handleImageError, DEFAULT_HERO_IMAGE } from '../constants';
import { catalogService, ExtendedProduct, cleanBrand, getEffectiveProductBasePrice, isProductSourcing, parseWeightToKg, getCleanProvenanceDisplay } from '../services/catalogService';
import { siteSettingsService, CategoryItem } from '../services/siteSettingsService';
import { useLanguage } from '../LanguageContext';
import { analyticsTracker } from '../services/analyticsTracker';

export default function Shop() {
  const { t, translateCategory, translateProduct, translateText } = useLanguage();
  const [allCatalogProducts, setAllCatalogProducts] = useState<ExtendedProduct[]>(() => {
    return catalogService.getProducts().filter(p => p.isOnline !== false);
  });
  const [categories, setCategories] = useState<CategoryItem[]>(() => siteSettingsService.getCategories());
  const [siteSettings, setSiteSettings] = useState(() => siteSettingsService.getSettings());

  const refreshCatalog = () => {
    setAllCatalogProducts(catalogService.getProducts().filter(p => p.isOnline !== false));
    setCategories(siteSettingsService.getCategories());
    setSiteSettings(siteSettingsService.getSettings());
  };

  useEffect(() => {
    refreshCatalog();
    const unsubCatalog = catalogService.subscribe(refreshCatalog);
    const unsubSettings = siteSettingsService.subscribe(refreshCatalog);
    window.addEventListener('ze_catalog_updated', refreshCatalog);
    window.addEventListener('storage', refreshCatalog);
    window.addEventListener('focus', refreshCatalog);
    return () => {
      unsubCatalog();
      unsubSettings();
      window.removeEventListener('ze_catalog_updated', refreshCatalog);
      window.removeEventListener('storage', refreshCatalog);
      window.removeEventListener('focus', refreshCatalog);
    };
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [selectedSubcategory, setSelectedSubcategory] = useState('Tous');
  
  // Custom rich filters (B2B / Industrial parameters)
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedProvenances, setSelectedProvenances] = useState<string[]>([]);
  const [priceTier, setPriceTier] = useState<string>('Tous'); // 'Tous', 'under50k', '50to150k', 'over150k'
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'stock' | 'sourcing'>('all');
  const [sortBy, setSortBy] = useState<string>('relevance');

  // Interactive quote request states
  const [quoteProduct, setQuoteProduct] = useState<ExtendedProduct | Product | null>(null);
  const [quoteQuantity, setQuoteQuantity] = useState<number>(1);
  const [clientCompany, setClientCompany] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [clientCountry, setClientCountry] = useState<string>('Sénégal');
  const [quoteSuccess, setQuoteSuccess] = useState<boolean>(false);
  const [generatedPdfNum, setGeneratedPdfNum] = useState<string>('');

  const [compareList, setCompareList] = useState<number[]>([]);
  const [quickViewId, setQuickViewId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState<boolean>(false);

  // Interactive sidebar collapsible drawers for visual optimization
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    category: true,
    subcategory: true,
    provenance: true,
    brand: true,
    budget: true,
    sector: true,
    logistics: true
  });

  const toggleSidebarSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const { addItem } = useCart();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const handleLikeClick = (e: React.MouseEvent, productId: number | string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      alert("Veuillez vous connecter à votre compte client pour ajouter ce matériel à vos favoris.");
      navigate('/login');
      return;
    }
    catalogService.toggleLikedProduct(productId, user.uid);
    setLikedIds(catalogService.getLikedProductIds());
  };

  const [likedIds, setLikedIds] = useState<number[]>(() => catalogService.getLikedProductIds());

  useEffect(() => {
    const syncLiked = () => setLikedIds(catalogService.getLikedProductIds());
    window.addEventListener('ze_liked_products_updated', syncLiked);
    return () => window.removeEventListener('ze_liked_products_updated', syncLiked);
  }, []);

  useEffect(() => {
    const effCountry = catalogService.getEffectiveClientCountry(profile);
    if (effCountry) {
      setClientCountry(effCountry);
    }
  }, [profile]);

  // Populate dynamic filters based on full PRODUCTS catalog and global MRO categories
  const availableBrands = (() => {
    const brandsSet = new Set<string>();
    const seenUpper = new Set<string>();
    
    allCatalogProducts.forEach(p => {
      if (p.brand) {
        const trimmed = p.brand.trim();
        if (trimmed && !seenUpper.has(trimmed.toUpperCase())) {
          seenUpper.add(trimmed.toUpperCase());
          brandsSet.add(trimmed);
        }
      }
    });
    
    categories.forEach(cat => {
      if (cat.brands) {
        cat.brands.split(',').forEach((b: string) => {
          const trimmed = b.trim();
          if (trimmed && !seenUpper.has(trimmed.toUpperCase())) {
            seenUpper.add(trimmed.toUpperCase());
            brandsSet.add(trimmed);
          }
        });
      }
    });
    
    return Array.from(brandsSet).sort((a, b) => a.localeCompare(b));
  })();
  const availableSectors: string[] = Array.from(new Set(allCatalogProducts.map(p => p.sector)));

  // Sync parameters from URL search
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sector = params.get('sector');
    const category = params.get('category');
    const subcategory = params.get('subcategory');
    const search = params.get('search');

    if (sector) {
      setSelectedSectors([sector]);
    }
    if (category) {
      setSelectedCategory(category);
      setSelectedSubcategory('Tous');
    }
    if (subcategory) {
      setSelectedSubcategory(subcategory);
    }
    setSearchTerm(search || '');
  }, [window.location.search]);

  // Synchronize state changes to URL to support instant dynamic filtering site-wide
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const currentSearch = params.get('search') || '';
    if (searchTerm !== currentSearch) {
      if (searchTerm) {
        params.set('search', searchTerm);
      } else {
        params.delete('search');
      }
      navigate(`/shop?${params.toString()}`, { replace: true });
    }
  }, [searchTerm, navigate]);

  // Master product filtering algorithm
  const filteredProducts = allCatalogProducts.filter(p => {
    // 1. Category filter
    if (selectedCategory !== 'Tous' && p.category !== selectedCategory) return false;
    
    // 2. Subcategory filter
    if (selectedSubcategory !== 'Tous' && p.subcategory && p.subcategory !== selectedSubcategory) return false;

    // 3. Search query
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      const inName = (p.name || '').toLowerCase().includes(query);
      const inBrand = (p.brand || '').toLowerCase().includes(query);
      const inRef = (p.ref || '').toLowerCase().includes(query);
      const inModel = (p.model || '').toLowerCase().includes(query);
      const inSector = (p.sector || '').toLowerCase().includes(query);
      const inCat = (p.category || '').toLowerCase().includes(query);
      if (!inName && !inBrand && !inRef && !inModel && !inSector && !inCat) return false;
    }

    // 4. Brands multi-filter
    if (selectedBrands.length > 0 && !selectedBrands.includes(p.brand)) return false;

    // 5. Sectors multi-filter
    if (selectedSectors.length > 0 && !selectedSectors.includes(p.sector)) return false;

    // 5b. Provenance filter (Europe, Amérique, Asie)
    if (selectedProvenances.length > 0) {
      const rawOrigin = `${p.origin || ''} ${p.sourcePlatform || ''} ${p.supplierName || ''} ${p.supplierUrl || ''} ${p.brand || ''}`.toLowerCase();
      const isEurope = /\b(europe|france|allemagne|germany|italie|italy|espagne|spain|uk|royaume-uni|suisse|switzerland|pays-bas|belgique|suède|sweden|manutan|rs-online|schneider|siemens|legrand|bosch|facom|ks\s*tools|skf|abb)\b/i.test(rawOrigin);
      const isAmerique = /\b(amérique|amerique|usa|états-unis|etats-unis|united\s+states|canada|grainger|mcmaster|dayton|fluke|dewalt|milwaukee|caterpillar|cummins|ridgid|stanley|3m|ingersoll)\b/i.test(rawOrigin);
      const isAsie = /\b(asie|asia|chine|china|japon|japan|corée|korea|taïwan|taiwan|inde|india|alibaba|aliexpress|1688|made-in-china|makita|hikoki|honda|yamaha|chint|delixi|ingco|total)\b/i.test(rawOrigin) || (!isEurope && !isAmerique);

      const matchesSelectedProvenance =
        (selectedProvenances.includes('Europe') && isEurope) ||
        (selectedProvenances.includes('Amérique') && isAmerique) ||
        (selectedProvenances.includes('Asie') && isAsie);

      if (!matchesSelectedProvenance) return false;
    }

    // 6. Price range tiers
    const effectivePrice = getEffectiveProductBasePrice(p as any);
    if (priceTier === 'under50k' && effectivePrice >= 50000) return false;
    if (priceTier === '50to150k' && (effectivePrice < 50000 || effectivePrice > 150000)) return false;
    if (priceTier === 'over150k' && effectivePrice <= 150000) return false;

    // 7. Stock / Sourcing availability
    const isSourcing = isProductSourcing(p as any);
    if (onlyInStock && isSourcing) {
      return false;
    }
    if (availabilityFilter === 'stock' && isSourcing) {
      return false;
    }
    if (availabilityFilter === 'sourcing' && !isSourcing) {
      return false;
    }

    return true;
  });

  // Track search query in Real Traffic Analytics
  useEffect(() => {
    if (!searchTerm || searchTerm.trim().length < 2) return;
    const timer = setTimeout(() => {
      analyticsTracker.trackSearch(searchTerm.trim(), filteredProducts.length > 0);
    }, 1000);
    return () => clearTimeout(timer);
  }, [searchTerm, filteredProducts.length]);

  // Sorting logic
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'priceAsc') return getEffectiveProductBasePrice(a as any) - getEffectiveProductBasePrice(b as any);
    if (sortBy === 'priceDesc') return getEffectiveProductBasePrice(b as any) - getEffectiveProductBasePrice(a as any);
    if (sortBy === 'rating') return b.rating - a.rating;
    return 0; // relevance / standard catalog order
  });

  const handleCategoryClick = (catName: string) => {
    setSelectedCategory(catName);
    setSelectedSubcategory('Tous');
  };

  const handleSubcategoryClick = (subName: string) => {
    setSelectedSubcategory(subName);
  };

  const handleAddToCart = (product: ExtendedProduct | Product) => {
    const ext = product as any;
    const rawOptions = ext.options || ext.variants || [];
    
    // If the product has options or variants, user MUST choose one on the product page
    if (rawOptions && rawOptions.length > 0) {
      navigate(`/product/${product.id}`);
      return;
    }

    const isSourcing = isProductSourcing(ext);
    const weightKg = parseWeightToKg(product.weight, 1.0);
    const seaRate = siteSettings.seaFreightPerKgXOF || siteSettings.seaFreightPerKg || 1800;
    const airRate = siteSettings.airFreightPerKgXOF || siteSettings.airFreightPerKg || 7500;
    const computedSeaFreight = ext.customSeaFreightCost !== undefined && ext.customSeaFreightCost !== null && ext.customSeaFreightCost >= 0
      ? Math.round(Number(ext.customSeaFreightCost))
      : Math.max(siteSettings.seaFreightMin || 8000, Math.round(weightKg * seaRate));
    const computedAirFreight = ext.customAirFreightCost !== undefined && ext.customAirFreightCost !== null && ext.customAirFreightCost >= 0
      ? Math.round(Number(ext.customAirFreightCost))
      : Math.max(siteSettings.airFreightMin || 7000, Math.round(weightKg * airRate));
    const chosenMethod: 'none' | 'neutral' | 'sea' | 'air' = !isSourcing
      ? 'none'
      : (ext.defaultShippingMethod === 'sea' || ext.defaultShippingMethod === 'air' ? ext.defaultShippingMethod : 'neutral');
    const initialFreight = !isSourcing
      ? 0
      : chosenMethod === 'air'
        ? computedAirFreight
        : chosenMethod === 'sea'
          ? computedSeaFreight
          : 0;
    const effectivePrice = getEffectiveProductBasePrice(ext);

    addItem({
      productId: product.id,
      name: product.name,
      price: effectivePrice,
      costPrice: ext.costPrice,
      supplierPrice: ext.supplierPrice,
      supplierCurrency: ext.supplierCurrency,
      supplierId: ext.supplierId,
      supplierName: ext.supplierName,
      brand: product.brand,
      origin: product.origin,
      quantity: 1,
      img: product.img,
      weightKg: weightKg,
      inStock: !isSourcing,
      availabilityMode: isSourcing ? 'sourcing' : 'stock',
      sourcePlatform: ext.sourcePlatform,
      supplierUrl: ext.supplierUrl,
      shippingMethod: chosenMethod,
      freightCost: initialFreight,
      seaFreightCostXOF: isSourcing ? computedSeaFreight : 0,
      airFreightCostXOF: isSourcing ? computedAirFreight : 0,
      customSeaFreightCost: ext.customSeaFreightCost,
      customAirFreightCost: ext.customAirFreightCost,
      showDeposit: ext.showDeposit,
      depositPercentage: ext.depositPercentage || 30,
      agentCode: !isSourcing
        ? 'STOCK-LOCAL-DKR'
        : chosenMethod === 'air'
          ? 'DKR628+AIR'
          : chosenMethod === 'sea'
            ? 'DKR628+SEA'
            : 'SOURCING-A-DEFINIR'
    });
    navigate('/cart');
  };

  const toggleBrandFilter = (brandName: string) => {
    if (selectedBrands.includes(brandName)) {
      setSelectedBrands(selectedBrands.filter(b => b !== brandName));
    } else {
      setSelectedBrands([...selectedBrands, brandName]);
    }
  };

  const toggleSectorFilter = (sectorName: string) => {
    if (selectedSectors.includes(sectorName)) {
      setSelectedSectors(selectedSectors.filter(s => s !== sectorName));
    } else {
      setSelectedSectors([...selectedSectors, sectorName]);
    }
  };

  const toggleProvenanceFilter = (prov: string) => {
    if (selectedProvenances.includes(prov)) {
      setSelectedProvenances(selectedProvenances.filter(p => p !== prov));
    } else {
      setSelectedProvenances([...selectedProvenances, prov]);
    }
  };

  const toggleCompare = (id: number) => {
    if (compareList.includes(id)) {
      setCompareList(compareList.filter(item => item !== id));
    } else {
      if (compareList.length < 3) {
        setCompareList([...compareList, id]);
      } else {
        alert("Vous ne pouvez comparer que 3 produits maximum.");
      }
    }
  };

  // Triggers professional quotation flow modal
  const openQuoteModal = (product: ExtendedProduct | Product) => {
    setQuoteProduct(product);
    setQuoteQuantity(product.moq || 1);
    setClientCompany('');
    setClientPhone('');
    setQuoteSuccess(false);
  };

  const submitQuoteRequest = (e: FormEvent) => {
    e.preventDefault();
    const uniqueRef = "DEVIS-" + Math.floor(100000 + Math.random() * 900000);
    setGeneratedPdfNum(uniqueRef);
    setQuoteSuccess(true);
  };

  // Quick reset all parameters
  const resetAllFilters = () => {
    setSearchTerm('');
    setSelectedCategory('Tous');
    setSelectedSubcategory('Tous');
    setSelectedBrands([]);
    setSelectedSectors([]);
    setSelectedProvenances([]);
    setPriceTier('Tous');
    setOnlyInStock(false);
    setAvailabilityFilter('all');
  };

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      
      {/* 1. Header Banner */}
      <div className="bg-[#003366] text-white py-12 relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-15 bg-cover bg-center mix-blend-overlay"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1920&auto=format&fit=crop&q=80')` }}
        ></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center lg:text-left">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
            <div>
              <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight font-roboto text-white uppercase">
                {translateText('Tout le Catalogue & Équipements')}
              </h1>
              <p className="mt-2 text-sm text-gray-300 max-w-2xl font-mono">
                {translateText("Sourcing direct certifié & Expédition Afrique de l'Ouest. Tarifs négociés nets HT fabricants.")}
              </p>
            </div>
            <div className="flex bg-white/10 backdrop-blur-md px-6 py-4 rounded-xl border border-white/20 text-xs font-mono text-[#FF6600] font-bold text-center">
              <div>
                <span className="block text-white text-lg font-black">{allCatalogProducts.length}</span>
                {translateText('Équipements Référencés')}
              </div>
              <div className="w-px bg-white/20 mx-6"></div>
              <div>
                <span className="block text-white text-lg font-black">{translateText('MULTI-ORIGINE')}</span>
                {translateText('Délais selon fournisseur')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Workspace Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-6 lg:gap-8">
          
          {/* ================= LEFT COLUMN: NESTED INDUSTRIAL FILTER PANEL ================= */}
          <aside className="w-full md:w-64 lg:w-80 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-5 md:sticky md:top-24 md:max-h-[90vh] md:overflow-y-auto custom-scrollbar">
              
              {/* Header Controls (Clickable accordion trigger on mobile, collapsed by default) */}
              <div className={`flex items-center justify-between ${isMobileFiltersOpen ? 'border-b border-gray-100 pb-4 mb-5' : 'md:border-b md:border-gray-100 md:pb-4 md:mb-5'}`}>
                <button
                  type="button"
                  onClick={() => setIsMobileFiltersOpen(prev => !prev)}
                  className="flex items-center justify-between w-full md:w-auto gap-2 text-xs font-black text-[#003366] uppercase tracking-widest text-left"
                >
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-[#FF6600]" />
                    <span>{translateText('Filtres Industriels')}</span>
                    {(selectedCategory !== 'Tous' || selectedSubcategory !== 'Tous' || selectedBrands.length > 0 || selectedSectors.length > 0 || selectedProvenances.length > 0 || priceTier !== 'Tous' || availabilityFilter !== 'all' || searchTerm !== '') && (
                      <span className="bg-[#FF6600] text-white text-[9px] px-1.5 py-0.5 rounded-full font-mono">
                        ●
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 md:hidden text-[10px] font-bold text-slate-500 normal-case tracking-normal">
                    <span>{isMobileFiltersOpen ? 'Masquer' : 'Afficher'}</span>
                    <ChevronDown className={`w-4 h-4 text-[#003366] transition-transform duration-200 ${isMobileFiltersOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                {(selectedCategory !== 'Tous' || selectedSubcategory !== 'Tous' || selectedBrands.length > 0 || selectedSectors.length > 0 || selectedProvenances.length > 0 || priceTier !== 'Tous' || !onlyInStock || searchTerm !== '') && (
                  <button 
                    onClick={resetAllFilters}
                    className="hidden md:flex text-[10px] text-[#FF6600] font-extrabold hover:underline uppercase tracking-wider items-center gap-1"
                  >
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" style={{ animationDuration: '4s' }} /> {translateText('Réinitialiser')}
                  </button>
                )}
              </div>

              {/* Collapsible Filter Body: Collapsed by default on mobile, always visible on tablet & desktop */}
              <div className={`${isMobileFiltersOpen ? 'block' : 'hidden'} md:block`}>
                {(selectedCategory !== 'Tous' || selectedSubcategory !== 'Tous' || selectedBrands.length > 0 || selectedSectors.length > 0 || selectedProvenances.length > 0 || priceTier !== 'Tous' || availabilityFilter !== 'all' || searchTerm !== '') && (
                  <div className="flex justify-end mb-4 md:hidden">
                    <button 
                      onClick={resetAllFilters}
                      className="text-[10px] text-[#FF6600] font-extrabold hover:underline uppercase tracking-wider flex items-center gap-1"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> {translateText('Réinitialiser')}
                    </button>
                  </div>
                )}

                {/* A. Search Field inside filter panel */}
                <div className="mb-6">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">{translateText('Rechercher une Référence')}</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Ex: Fluke, DHP481Z..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 pl-3 pr-10 text-xs focus:ring-2 focus:ring-[#003366] focus:outline-none focus:bg-white text-gray-900 font-bold"
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
                  </div>
                </div>

                {/* B. Segmented Categories with interactive indicators */}
                <div className="mb-6">
                  <button
                    onClick={() => toggleSidebarSection('category')}
                    className="w-full flex items-center justify-between font-black text-gray-900 text-[11px] uppercase tracking-wider mb-3 pb-2 border-b border-gray-50 text-left"
                  >
                    <span>{translateText('Catégorie Générale')}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-[#FF6600] font-mono">■</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${openSections.category ? '' : '-rotate-90'}`} />
                    </div>
                  </button>
                  {openSections.category && (
                    <div className="space-y-1 animate-in fade-in duration-200">
                      <button 
                        onClick={() => {setSelectedCategory('Tous'); setSelectedSubcategory('Tous');}}
                        className={`w-full text-left px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 text-xs font-bold ${
                          selectedCategory === 'Tous' 
                            ? 'bg-[#003366] text-white shadow-sm' 
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>{translateText('Tous les matériels')}</span>
                      </button>
                      
                      {categories.map((cat: any, i) => {
                        const IconComponent = (Icons as any)[cat.icon] || Icons.Package;
                        const isSelected = selectedCategory === cat.name;
                        
                        return (
                          <button 
                            key={i}
                            onClick={() => handleCategoryClick(cat.name)}
                            className={`w-full text-left px-3 py-1.5 rounded-lg transition-all flex items-center justify-between text-xs ${
                              isSelected 
                                ? 'bg-gray-100 text-[#003366] font-bold border-l-2 border-[#FF6600]' 
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <IconComponent className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-[#003366]' : 'text-gray-400'}`} />
                              <span className="truncate">{translateCategory(cat.name)}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* C. Subcategory selection contextual to active category */}
                {selectedCategory !== 'Tous' && (
                  <div className="mb-6 bg-blue-50/50 p-3 rounded-lg border border-blue-50">
                    <button
                      onClick={() => toggleSidebarSection('subcategory')}
                      className="w-full flex items-center justify-between font-black text-[#003366] text-[10px] uppercase tracking-wider mb-2 text-left"
                    >
                      <span>{translateText('Sous-Catégorie')}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${openSections.subcategory ? '' : '-rotate-90'}`} />
                    </button>
                    {openSections.subcategory && (
                      <div className="space-y-1 animate-in fade-in duration-200">
                        <button 
                          onClick={() => setSelectedSubcategory('Tous')}
                          className={`w-full text-left px-2 py-1 rounded text-xs ${
                            selectedSubcategory === 'Tous' 
                              ? 'text-[#FF6600] font-black' 
                              : 'text-gray-600 hover:text-[#003366]'
                          }`}
                        >
                          • {translateCategory(selectedCategory)}
                        </button>
                        {categories.find(c => c.name === selectedCategory)?.subcategories?.map((sub: any, idx: number) => {
                          return (
                            <button
                              key={idx}
                              onClick={() => handleSubcategoryClick(sub.name)}
                              className={`w-full text-left px-2 py-1 rounded text-xs flex justify-between items-center ${
                                selectedSubcategory === sub.name 
                                  ? 'text-[#003366] font-black bg-white shadow-xs' 
                                  : 'text-gray-500 hover:text-gray-900'
                              }`}
                            >
                              <span className="truncate">• {translateCategory(sub.name)}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* C2. Par Provenance : Europe, Amérique, Asie */}
                <div className="mb-6">
                  <button
                    onClick={() => toggleSidebarSection('provenance')}
                    className="w-full flex items-center justify-between font-black text-gray-900 text-[11px] uppercase tracking-wider mb-3 pb-2 border-b border-gray-50 text-left"
                  >
                    <span>{translateText('Par Provenance')}</span>
                    <div className="flex items-center gap-1.5">
                      {selectedProvenances.length > 0 && (
                        <span className="text-[10px] text-[#FF6600] font-mono font-bold">
                          ({selectedProvenances.length})
                        </span>
                      )}
                      <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${openSections.provenance ? '' : '-rotate-90'}`} />
                    </div>
                  </button>
                  {openSections.provenance && (
                    <div className="space-y-2 animate-in fade-in duration-200">
                      {[
                        { key: 'Europe', label: translateText('Europe'), sub: 'UE, France, Allemagne, Italie' },
                        { key: 'Amérique', label: translateText('Amérique'), sub: 'USA (Grainger), Canada' },
                        { key: 'Asie', label: translateText('Asie'), sub: 'Chine, Japon, Corée' }
                      ].map((prov) => {
                        const isChecked = selectedProvenances.includes(prov.key);
                        return (
                          <label
                            key={prov.key}
                            className={`flex items-start gap-3 text-xs p-2 rounded-lg border transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-blue-50/70 border-[#003366]/30 text-[#003366]'
                                : 'border-gray-100 text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleProvenanceFilter(prov.key)}
                              className="mt-0.5 rounded border-gray-300 text-[#003366] focus:ring-[#003366] h-3.5 w-3.5 cursor-pointer"
                            />
                            <div className="flex flex-col leading-tight">
                              <span className={`font-bold ${isChecked ? 'text-[#003366] font-extrabold' : 'text-gray-800'}`}>
                                {prov.label}
                              </span>
                              <span className="text-[10px] text-gray-400 mt-0.5">{prov.sub}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* D. Multi-Brand filtration without deceptive counts */}
                <div className="mb-6">
                  <button
                    onClick={() => toggleSidebarSection('brand')}
                    className="w-full flex items-center justify-between font-black text-gray-900 text-[11px] uppercase tracking-wider mb-3 pb-2 border-b border-gray-50 text-left"
                  >
                    <span>{translateText('Marque Constructeur')}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${openSections.brand ? '' : '-rotate-90'}`} />
                  </button>
                  {openSections.brand && (
                    <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1 animate-in fade-in duration-200">
                      {availableBrands.map((brandName) => {
                        const isChecked = selectedBrands.includes(brandName);
                        
                        return (
                          <label key={brandName} className="flex items-center gap-3 text-xs text-gray-600 cursor-pointer group">
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={() => toggleBrandFilter(brandName)}
                              className="rounded border-gray-300 text-[#003366] focus:ring-[#003366] h-3.5 w-3.5 cursor-pointer"
                            />
                            <span className={`group-hover:text-gray-950 flex-grow leading-tight ${isChecked ? 'text-gray-950 font-extrabold' : ''}`}>{brandName}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* E. Price Tier filters */}
                <div className="mb-6">
                  <button
                    onClick={() => toggleSidebarSection('budget')}
                    className="w-full flex items-center justify-between font-black text-gray-900 text-[11px] uppercase tracking-wider mb-3 pb-2 border-b border-gray-50 text-left"
                  >
                    <span>{translateText('Budget HT (FCFA)')}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${openSections.budget ? '' : '-rotate-90'}`} />
                  </button>
                  {openSections.budget && (
                    <div className="space-y-2 animate-in fade-in duration-200">
                      {[
                        { value: 'Tous', label: translateText('Tous les prix') },
                        { value: 'under50k', label: translateText('Moins de 50 000 FCFA') },
                        { value: '50to150k', label: translateText('50 000 à 150 000 FCFA') },
                        { value: 'over150k', label: translateText('Plus de 150 000 FCFA') }
                      ].map((tier) => (
                        <label key={tier.value} className="flex items-center gap-3 text-xs text-gray-600 cursor-pointer">
                          <input 
                            type="radio" 
                            name="priceTier"
                            checked={priceTier === tier.value}
                            onChange={() => setPriceTier(tier.value)}
                            className="text-[#003366] focus:ring-[#003366] h-3.5 w-3.5 cursor-pointer"
                          />
                          <span className={priceTier === tier.value ? 'text-gray-900 font-bold' : ''}>{tier.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* F. Secteurs d'activité (African Industrial Sectors) */}
                <div className="mb-6">
                  <button
                    onClick={() => toggleSidebarSection('sector')}
                    className="w-full flex items-center justify-between font-black text-gray-900 text-[11px] uppercase tracking-wider mb-3 pb-2 border-b border-gray-50 text-left"
                  >
                    <span>{translateText("Secteur Cible d'Usage")}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${openSections.sector ? '' : '-rotate-90'}`} />
                  </button>
                  {openSections.sector && (
                    <div className="space-y-2 animate-in fade-in duration-200">
                      {availableSectors.map((sectorName) => {
                        const isChecked = selectedSectors.includes(sectorName);
                        return (
                          <label key={sectorName} className="flex items-center gap-3 text-xs text-gray-600 cursor-pointer group">
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={() => toggleSectorFilter(sectorName)}
                              className="rounded border-gray-300 text-[#003366] focus:ring-[#003366] h-3.5 w-3.5 cursor-pointer"
                            />
                            <span className={`group-hover:text-gray-950 flex-grow leading-tight ${isChecked ? 'text-gray-950 font-bold' : ''}`}>{translateCategory(sectorName)}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* G. Logistics Toggle */}
                <div className="pt-4 border-t border-gray-100">
                  <button
                    onClick={() => toggleSidebarSection('logistics')}
                    className="w-full flex items-center justify-between font-black text-gray-900 text-[11px] uppercase tracking-wider mb-3 text-left"
                  >
                    <span>{translateText('Filtres de Disponibilité')}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${openSections.logistics ? '' : '-rotate-90'}`} />
                  </button>
                  {openSections.logistics && (
                    <div className="space-y-2 animate-in fade-in duration-200">
                      {[
                        { value: 'all', label: translateText('Tous les articles (Stock & Sourcing)'), desc: translateText('Catalogue complet') },
                        { value: 'stock', label: `✓ ${translateText('Disponible immédiatement')}`, desc: `${translateText('Stock Local')} (${translateText('Délais selon fournisseur')})` },
                        { value: 'sourcing', label: `✈ ${translateText('Articles à sourcer')}`, desc: `${translateText('Sur commande')} (${siteSettings.airFreightDurationDays || '5-10j'} / ${siteSettings.seaFreightDurationDays || '30-45j'})` },
                      ].map((opt) => (
                        <label key={opt.value} className="flex items-start gap-2.5 text-xs text-gray-600 cursor-pointer group p-1.5 rounded-lg hover:bg-gray-50">
                          <input
                            type="radio"
                            name="availabilityFilter"
                            checked={availabilityFilter === opt.value}
                            onChange={() => {
                              setAvailabilityFilter(opt.value as any);
                              setOnlyInStock(opt.value === 'stock');
                            }}
                            className="mt-0.5 text-[#003366] focus:ring-[#003366] h-3.5 w-3.5 cursor-pointer"
                          />
                          <div className="flex flex-col">
                            <span className={`font-extrabold ${availabilityFilter === opt.value ? 'text-[#003366]' : 'text-gray-800'}`}>
                              {opt.label}
                            </span>
                            <span className="text-[10px] text-gray-400">{opt.desc}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </aside>

          {/* ================= RIGHT COLUMN: PRODUCT BROWSER ================= */}
          <main className="flex-grow min-w-0">
            
            {/* Breadcrumb row */}
            <div className="mb-4 flex items-center flex-wrap gap-2 text-[10px] text-gray-400 uppercase tracking-widest font-extrabold">
              <Link to="/" className="hover:text-[#003366]">{siteSettings.companyName || 'ZONE ÉQUIPEMENTS'}</Link>
              <ChevronRight className="w-3 h-3" />
              <button onClick={() => {setSelectedCategory('Tous'); setSelectedSubcategory('Tous');}} className="hover:text-[#003366]">{translateText('Catalogue')}</button>
              {selectedCategory !== 'Tous' && (
                <>
                  <ChevronRight className="w-3 h-3" />
                  <button onClick={() => setSelectedSubcategory('Tous')} className="text-[#003366] hover:underline">
                    {translateCategory(selectedCategory)}
                  </button>
                </>
              )}
              {selectedSubcategory !== 'Tous' && (
                <>
                  <ChevronRight className="w-3 h-3" />
                  <span className="text-[#FF6600] font-mono">{translateCategory(selectedSubcategory)}</span>
                </>
              )}
            </div>

            {/* Results Header: Sorting, counts and layouts */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
              <div>
                <h2 className="text-sm font-black text-[#003366] uppercase tracking-wide flex items-center gap-2">
                  {selectedCategory === 'Tous' ? translateText('Tout le catalogue') : translateCategory(selectedCategory)}
                  <span className="bg-gray-100 text-gray-500 font-mono text-[10px] normal-case tracking-normal px-2.5 py-0.5 rounded-full font-bold">
                    {sortedProducts.length} {translateText('matériels trouvés')}
                  </span>
                </h2>
              </div>
              
              <div className="flex items-center gap-3">
                {/* View Mode */}
                <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-[#003366] shadow-xs' : 'text-gray-400 hover:text-gray-600'}`}
                    title="Grille compacte"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-[#003366] shadow-xs' : 'text-gray-400 hover:text-gray-600'}`}
                    title="Liste dense professionnelle"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                {/* Sorter */}
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-[#003366] text-gray-700"
                >
                  <option value="relevance">{translateText('Trier par : Pertinence')}</option>
                  <option value="priceAsc">{translateText('Prix : Croissant')}</option>
                  <option value="priceDesc">{translateText('Prix : Décroissant')}</option>
                  <option value="rating">{translateText('Mieux notés')}</option>
                </select>
              </div>
            </div>

            {/* ================= PRODUCTS CARDS LAYOUT ================= */}
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5' : 'flex flex-col gap-3.5'}>
              {sortedProducts.map((rawProduct) => {
                const product = translateProduct(rawProduct);
                const isComparing = compareList.includes(product.id);
                const isLiked = likedIds.includes(Number(product.id));
                const isQuickView = quickViewId === product.id;
                const displayBasePrice = getEffectiveProductBasePrice(rawProduct as any);
                
                // B2B West African VAT simulator: only active if vatEnabled is true AND vatRate > 0 AND applyVat !== false
                const isVatActive = (siteSettings.vatEnabled !== false) && ((siteSettings.vatRate || 0) > 0) && ((rawProduct as any).applyVat !== false);
                const activeVatRate = isVatActive ? ((rawProduct as any).vatRate ?? siteSettings.defaultVatRate ?? 0.18) : 0;
                const vatAmt = Math.round(displayBasePrice * activeVatRate);
                const priceTtc = displayBasePrice + vatAmt;
                const isSourcing = isProductSourcing(rawProduct as any);

                /* ================= A. GRID VIEW MODE (CLEAN STREAMLINED PREVIEW) ================= */
                if (viewMode === 'grid') {
                  return (
                    <div key={product.id} className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden group hover:shadow-md transition-all duration-300 flex flex-col h-full">
                      <div className="flex-1 flex flex-col">
                        {/* Top Banner Row: Brand and Provenance badges */}
                        <div className="bg-gray-50 border-b border-gray-100 px-3 py-2 flex items-center justify-between text-[10px] font-mono">
                          <div className="flex flex-col gap-1 items-start min-w-0">
                            <span className="font-bold text-[#003366] bg-blue-50 px-2 py-0.5 rounded truncate max-w-[150px]">
                              {cleanBrand(product.brand, product.name)}
                            </span>
                            {(() => {
                              const cleanProv = getCleanProvenanceDisplay(product.origin, (product as any).supplierCountry, (product as any).sourcePlatform);
                              if (!cleanProv) return null;
                              return (
                                <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] tracking-wide">
                                  📍 {cleanProv}
                                </span>
                              );
                            })()}
                          </div>
                          <span className="text-gray-400 shrink-0">Ref: {product.ref}</span>
                        </div>

                        {/* Image Frame */}
                        <Link to={`/product/${product.id}`} className="relative aspect-video bg-gray-50/50 flex items-center justify-center border-b border-gray-50 overflow-hidden p-4 block">
                          <img 
                            src={getProductImageUrl(product.img)} 
                            alt={product.name} 
                            className="max-h-36 object-contain group-hover:scale-105 transition-transform duration-500 rounded"
                            referrerPolicy="no-referrer"
                            onError={handleImageError}
                          />
                          <div className="absolute top-2 right-2 flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => handleLikeClick(e, product.id)}
                              className={`p-1.5 rounded-full shadow-sm transition-all border ${
                                isLiked
                                  ? 'bg-rose-50 text-rose-500 border-rose-200'
                                  : 'bg-white/90 text-gray-400 border-gray-200 hover:text-rose-500'
                              }`}
                              title={isLiked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                              aria-label="Favoris"
                            >
                              <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                            </button>
                            <button 
                              type="button"
                              onClick={(e) => { e.preventDefault(); toggleCompare(product.id); }}
                              className={`p-1.5 rounded-full shadow-sm transition-all border ${
                                isComparing 
                                  ? 'bg-[#FF6600] text-white border-[#FF6600]' 
                                  : 'bg-white/90 text-gray-500 border-gray-200 hover:text-[#003366]'
                              }`}
                              title="Comparer"
                            >
                              <Plus className={`w-3.5 h-3.5 ${isComparing ? 'rotate-45' : ''} transition-transform`} />
                            </button>
                          </div>
                        </Link>

                        {/* Essential Info Only (Refined Typography) */}
                        <div className="p-3.5">
                          <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest truncate">{product.category}</div>
                          <h3 className="font-bold text-gray-900 text-xs sm:text-sm mt-1 leading-snug group-hover:text-[#003366] transition-colors line-clamp-2">
                            <Link to={`/product/${product.id}`}>{product.name}</Link>
                          </h3>
                          <p className="text-[11px] text-gray-500 font-normal line-clamp-1 mt-1">
                            {product.description}
                          </p>

                          {/* Logistics & Freight availability Tag */}
                          <div className="mt-2.5">
                            {!isSourcing ? (
                              <div className="flex items-center gap-1.5 text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg font-medium truncate">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                <span className="truncate">
                                  {translateText('Disponible immédiatement')} • {translateText('Stock Local Dakar')}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-[10px] text-amber-900 bg-amber-50/80 border border-amber-200/80 px-2.5 py-1 rounded-lg font-medium truncate">
                                <Truck className="w-3.5 h-3.5 text-[#FF6600] flex-shrink-0" />
                                <span className="truncate">
                                  {translateText('À sourcer')} • {siteSettings.airFreightDurationDays || '5-10j'} (Air) / {siteSettings.seaFreightDurationDays || '30-45j'} (Mer)
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Pricing and Action buttons footer - perfectly aligned */}
                      <div className="mt-auto border-t border-gray-100 bg-gray-50/70 p-3 sm:p-3.5 flex items-center justify-between gap-2 min-h-[64px]">
                        {/* Left: Price respecting VAT settings */}
                        <div className="flex flex-col justify-center min-w-0 flex-1 pr-1">
                          <div className="flex items-baseline gap-1 flex-wrap">
                            <span className="text-sm sm:text-base font-bold text-[#003366] font-mono leading-none truncate">
                              {displayBasePrice > 0 ? displayBasePrice.toLocaleString('fr-FR') : 'Sur devis'}
                            </span>
                            {displayBasePrice > 0 && (
                              <span className="text-[9px] sm:text-[10px] font-semibold text-gray-500 shrink-0">
                                {isVatActive ? 'FCFA HT' : 'FCFA'}
                              </span>
                            )}
                          </div>
                          {isVatActive && displayBasePrice > 0 ? (
                            <span className="text-[9px] sm:text-[10px] font-mono text-gray-400 mt-0.5 leading-tight truncate">
                              {priceTtc.toLocaleString('fr-FR')} TTC
                            </span>
                          ) : (
                            <span className="text-[9px] sm:text-[10px] text-gray-400 font-medium mt-0.5 leading-tight truncate">
                              Prix unitaire
                            </span>
                          )}
                        </div>

                        {/* Right: Compact action button tailored so it never crowds the price */}
                        <div className="flex items-center justify-end shrink-0">
                          {displayBasePrice > 0 ? (
                            <button 
                              type="button"
                              onClick={() => handleAddToCart(rawProduct)}
                              className="bg-[#003366] hover:bg-[#002244] text-white py-1.5 px-2.5 sm:px-3 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 shadow-xs active:scale-95 cursor-pointer whitespace-nowrap"
                              title={t('add_to_cart_btn')}
                            >
                              <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                              <span className="hidden xs:inline sm:inline">{t('add_to_cart_btn')}</span>
                              <span className="xs:hidden sm:hidden">Ajouter</span>
                            </button>
                          ) : (
                            <button 
                              type="button"
                              onClick={() => openQuoteModal(rawProduct)}
                              className="bg-[#FF6600] hover:bg-[#e65c00] text-white py-1.5 px-2.5 sm:px-3 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 shadow-xs cursor-pointer whitespace-nowrap"
                              title={t('quote_pro_btn')}
                            >
                              <FileText className="w-3.5 h-3.5 shrink-0" />
                              <span className="hidden xs:inline sm:inline">{t('quote_pro_btn')}</span>
                              <span className="xs:hidden sm:hidden">Devis</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                /* ================= B. LIST VIEW MODE ================= */
                return (
                  <div key={product.id} className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden group hover:border-gray-300 transition-all duration-300">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:flex-nowrap p-3.5 sm:p-4 gap-3.5 lg:gap-5">
                      
                      {/* Image block with Brand & Origin badges */}
                      <Link to={`/product/${product.id}`} className="w-full sm:w-36 lg:w-40 h-32 sm:h-32 flex-shrink-0 relative bg-gray-50 rounded-lg overflow-hidden border border-gray-100 flex items-center justify-center p-2">
                        <img 
                          src={getProductImageUrl(product.img)} 
                          alt={product.name} 
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500 rounded"
                          referrerPolicy="no-referrer"
                          onError={handleImageError}
                        />
                        <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 items-start">
                          <div className="bg-white/95 border border-gray-200 backdrop-blur-md px-2 py-0.5 rounded text-[8px] font-bold text-[#003366] uppercase tracking-wider shadow-xs">
                            {cleanBrand(product.brand, product.name)}
                          </div>
                          {(() => {
                            const cleanProv = getCleanProvenanceDisplay(product.origin, (product as any).supplierCountry, (product as any).sourcePlatform);
                            if (!cleanProv) return null;
                            return (
                              <div className="bg-emerald-50/95 border border-emerald-200 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-bold text-emerald-800 shadow-xs">
                                📍 {cleanProv}
                              </div>
                            );
                          })()}
                        </div>
                        <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleLikeClick(e, product.id)}
                            className={`p-1 rounded-full shadow-xs transition-all border ${
                              isLiked
                                ? 'bg-rose-50 text-rose-500 border-rose-200'
                                : 'bg-white/80 text-gray-400 border-white hover:text-rose-500'
                            }`}
                            title={isLiked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                            aria-label="Favoris"
                          >
                            <Heart className={`w-3 h-3 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => { e.preventDefault(); toggleCompare(product.id); }}
                            className={`p-1 rounded-full shadow-xs transition-all border ${
                              isComparing 
                                ? 'bg-[#FF6600] text-white border-[#FF6600]' 
                                : 'bg-white/80 text-gray-400 border-white hover:text-[#003366]'
                            }`}
                            title="Comparer"
                          >
                            <Plus className={`w-3 h-3 ${isComparing ? 'rotate-45' : ''} transition-transform`} />
                          </button>
                        </div>
                      </Link>

                      {/* Essential Info block */}
                      <div className="flex-grow flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider truncate">
                              {product.category} {product.subcategory ? `› ${product.subcategory}` : ''}
                            </span>
                            <span className="font-mono text-[10px] text-gray-400 bg-slate-50 px-2 py-0.5 rounded">
                              Ref: {product.ref}
                            </span>
                          </div>

                          <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-snug group-hover:text-[#003366] transition-colors">
                            <Link to={`/product/${product.id}`}>{product.name}</Link>
                          </h3>

                          {/* Short essential summary */}
                          <p className="text-xs text-gray-500 font-normal line-clamp-1 sm:line-clamp-2 mt-1 font-sans">
                            {product.description}
                          </p>
                        </div>

                        {/* Utilities & Freight availability row */}
                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                          {/* Desktop ONLY: Voir les détails & spécifications button */}
                          <button 
                            type="button"
                            onClick={() => setQuickViewId(isQuickView ? null : product.id)}
                            className="hidden lg:inline-flex text-[#003366] hover:text-[#FF6600] text-[11px] font-bold uppercase tracking-wide items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            {isQuickView ? (
                              <span>{translateText('▲ FERMER LES DÉTAILS & SPÉCIFICATIONS')}</span>
                            ) : (
                              <span>{translateText('VOIR LES DÉTAILS & SPÉCIFICATIONS ›')}</span>
                            )}
                          </button>
                          
                          <div className="hidden lg:block h-3 w-px bg-gray-200"></div>
                          
                          {!isSourcing ? (
                            <span className="text-[10px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></span>
                              {translateText('Disponible immédiatement')} • {translateText('Stock Local Dakar')}
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 bg-[#FF6600] rounded-full"></span>
                              {translateText('À sourcer')} • {siteSettings.airFreightDurationDays || '5-10j'} (Air) / {siteSettings.seaFreightDurationDays || '30-45j'} (Mer)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Streamlined Pricing & Action column - vertically stacked and aligned right on desktop */}
                      <div className="w-full lg:w-56 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-gray-100 pt-3 lg:pt-0 lg:pl-5 flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-2.5 self-center">
                        <div className="space-y-0.5 min-w-0 text-left lg:text-right">
                          <span className="hidden lg:block text-[9px] font-semibold text-gray-400 uppercase tracking-widest">
                            {translateText('PRIX COMPTOIR PROFESSIONNEL')}
                          </span>
                          <div className="flex items-baseline lg:justify-end gap-1">
                            <span className="text-base sm:text-lg font-mono font-bold text-[#003366]">
                              {displayBasePrice > 0 ? displayBasePrice.toLocaleString('fr-FR') : 'Sur devis'}
                            </span>
                            {displayBasePrice > 0 && (
                              <span className="text-[10px] font-semibold text-gray-500">
                                {isVatActive ? 'FCFA HT' : 'FCFA'}
                              </span>
                            )}
                          </div>
                          {isVatActive && displayBasePrice > 0 && (
                            <span className="block text-[10px] text-gray-400 font-mono">
                              {priceTtc.toLocaleString('fr-FR')} FCFA TTC
                            </span>
                          )}
                        </div>

                        {/* Action Buttons: stacked vertically under price on desktop */}
                        <div className="flex items-center justify-end shrink-0">
                          {displayBasePrice > 0 ? (
                            <button 
                              type="button"
                              onClick={() => handleAddToCart(rawProduct)}
                              className="bg-[#003366] hover:bg-[#002244] text-white py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer active:scale-95"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                              <span>{t('add_to_cart_btn')}</span>
                            </button>
                          ) : (
                            <button 
                              type="button"
                              onClick={() => openQuoteModal(rawProduct)}
                              className="bg-[#FF6600] hover:bg-[#e65c00] text-white py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>{t('quote_pro_btn')}</span>
                            </button>
                          )}
                        </div>
                      </div>

                    </div>

                    {/* ================= EXPANDABLE DETAILS & SPEC PANEL (DESKTOP ONLY) ================= */}
                    {isQuickView && (
                      <div className="hidden lg:block bg-slate-50/90 border-t border-gray-200 p-6 animate-in slide-in-from-top-4 duration-300">
                        <div className="max-w-4xl space-y-5">
                          <div>
                            <h4 className="font-extrabold text-[#003366] text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Info className="w-4 h-4 text-[#003366]" /> {translateText('Détails & Description du produit')}
                            </h4>
                            <p className="text-xs text-gray-700 leading-relaxed font-sans">
                              {product.description}
                            </p>
                            {product.extendedDescription && (
                              <p className="text-xs text-gray-600 leading-relaxed font-sans mt-2 pt-2 border-t border-gray-200/60">
                                {product.extendedDescription}
                              </p>
                            )}
                          </div>
                          
                          {/* Real technical attributes table */}
                          {product.specs && Object.keys(product.specs).length > 0 && (
                            <div>
                              <h5 className="font-extrabold text-gray-800 text-[11px] uppercase tracking-wider mb-2">
                                {translateText('Spécifications techniques')}
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5 border border-gray-200 rounded-lg p-3 bg-white">
                                {Object.entries(product.specs).map(([key, val]) => (
                                  <div key={key} className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-b-0 text-xs">
                                    <span className="text-gray-500 font-medium">{key}</span>
                                    <span className="text-gray-950 font-bold font-mono text-right">{val}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Zero product state */}
            {sortedProducts.length === 0 && (
              <div className="text-center py-24 bg-white rounded-xl border border-dashed border-gray-200 mt-6 shadow-xs">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                  <Search className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">Aucun produit ne correspond à vos filtres</h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto mb-6 leading-relaxed">
                  Notre catalogue s'agrandit tous les jours. Essayez d'élargir vos paramètres de tri ou de réinitialiser vos exclusions.
                </p>
                <button 
                  onClick={resetAllFilters}
                  className="bg-[#003366] hover:bg-[#002244] text-white px-6 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 mx-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Réinitialiser tous les filtres
                </button>
              </div>
            )}
          </main>
        </div>

        {/* ================= COMPARE SELECTION PANEL ================= */}
        {compareList.length > 0 && (
          <div className="mt-16 bg-white p-6 rounded-2xl shadow-md border border-gray-200 animate-in slide-in-from-bottom-5 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg font-black font-roboto text-[#003366] uppercase tracking-wide">Comparative technique instantané</h2>
                <p className="text-xs text-gray-400 mt-0.5">Comparez les côtes mécaniques et puissances de vos sélections de matériels.</p>
              </div>
              <button 
                onClick={() => setCompareList([])} 
                className="bg-red-50 text-red-600 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-red-100 transition-colors"
              >
                Vider le tableau
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="p-4 border-b-2 border-gray-100 bg-gray-50 font-bold text-[#003366] w-1/4 rounded-tl-xl text-left">Caractéristique</th>
                    {compareList.map(id => {
                      const p = allCatalogProducts.find(item => item.id === id) || catalogService.getProductById(id);
                      if (!p) return null;
                      return (
                        <th key={id} className="p-4 border-b-2 border-gray-100 text-center w-1/4 min-w-[200px]">
                          <div className="font-extrabold text-[#003366] uppercase tracking-wide my-1 text-[10px]">{p.brand}</div>
                          <div className="font-extrabold text-gray-900 line-clamp-2 h-8 leading-tight mb-2 hover:text-[#003366]">
                            <Link to={`/product/${p.id}`}>{p.name}</Link>
                          </div>
                          <span className="text-[10px] text-gray-400 font-mono bg-gray-50 px-2 py-0.5 rounded">ID: {p.model}</span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-4 border-b border-gray-50 font-extrabold text-gray-600 bg-gray-50/20">Prix de vente</td>
                    {compareList.map(id => {
                      const p = allCatalogProducts.find(item => item.id === id) || catalogService.getProductById(id);
                      if (!p) return null;
                      return (
                        <td key={id} className="p-4 border-b border-gray-50 text-center text-[#FF6600] font-black text-sm font-mono">
                          {getEffectiveProductBasePrice(p as any).toLocaleString('fr-FR')} <span className="text-[9px] font-normal text-gray-400">FCFA HT</span>
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="p-4 border-b border-gray-50 font-extrabold text-gray-600 bg-gray-50/20">Origine constructeur</td>
                    {compareList.map(id => {
                      const p = allCatalogProducts.find(item => item.id === id) || catalogService.getProductById(id);
                      return (
                        <td key={id} className="p-4 border-b border-gray-50 text-center font-bold text-[#003366]">
                          {getCleanProvenanceDisplay(p?.origin, (p as any)?.supplierCountry, (p as any)?.sourcePlatform) || 'Origine Certifiée'}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="p-4 border-b border-gray-50 font-extrabold text-gray-600 bg-gray-50/20">Moq & Package</td>
                    {compareList.map(id => {
                      const p = allCatalogProducts.find(item => item.id === id) || catalogService.getProductById(id);
                      if (!p) return null;
                      return (
                        <td key={id} className="p-4 border-b border-gray-50 text-center text-gray-600 font-mono">
                          Pack Qty: {p.packageQty || 1} / MOQ: {p.moq || 1} min
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="p-4 border-b border-gray-50 font-extrabold text-gray-600 bg-gray-50/20">Masse / Poids</td>
                    {compareList.map(id => {
                      const p = allCatalogProducts.find(item => item.id === id) || catalogService.getProductById(id);
                      return (
                        <td key={id} className="p-4 border-b border-gray-50 text-center text-gray-800 font-mono font-bold">
                          {p?.weight || 'Standard'}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="p-4 border-b border-gray-50 font-extrabold text-gray-600 bg-gray-50/20">Garantie MRO</td>
                    {compareList.map(id => {
                      const p = allCatalogProducts.find(item => item.id === id) || catalogService.getProductById(id);
                      return (
                        <td key={id} className="p-4 border-b border-gray-50 text-center font-semibold text-gray-600">
                          {p?.warranty || 'Garantie constructeur'}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="p-4 border-b border-gray-100 font-extrabold text-gray-600 bg-gray-50/20">Actions rapides</td>
                    {compareList.map(id => {
                      const p = allCatalogProducts.find(item => item.id === id) || catalogService.getProductById(id);
                      if (!p) return null;
                      return (
                        <td key={id} className="p-4 border-b border-gray-100 text-center">
                          <button 
                            onClick={() => handleAddToCart(p)}
                            className="bg-[#003366] hover:bg-[#002244] text-white py-1 px-3 rounded text-[10px] font-black transition-all mx-auto shadow-xs active:scale-95"
                          >
                            ACHAT
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ================= B2B MODAL: PROFORMA / QUOTATION BUILDER ================= */}
      {quoteProduct && (
        <div className="fixed inset-0 bg-[#002244]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-200 overflow-hidden relative animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-[#003366] text-white p-5 pr-14 flex items-center gap-3">
              <FileText className="w-5 h-5 text-[#FF6600] shrink-0" />
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-white">Créateur de Devis Institutionnel / Proforma</h3>
                <p className="text-[10px] text-gray-300 font-mono mt-0.5">{siteSettings.companyName || 'ZONE ÉQUIPEMENTS'} - Sourcing professionnel d'origine fabricant</p>
              </div>
              <button 
                onClick={() => setQuoteProduct(null)} 
                className="absolute right-4 top-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {!quoteSuccess ? (
                <form onSubmit={submitQuoteRequest} className="space-y-4">
                  
                  {/* Selected product reference card */}
                  <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg flex gap-3.5">
                    <img 
                      src={getProductImageUrl(quoteProduct.img)} 
                      alt="" 
                      className="w-14 h-14 object-contain bg-white rounded border border-gray-100" 
                      onError={handleImageError}
                    />
                    <div className="text-xs flex-grow min-w-0">
                      <span className="text-[9px] font-black text-[#FF6600] uppercase tracking-widest block">{quoteProduct.brand}</span>
                      <h4 className="font-bold text-gray-900 truncate leading-tight mt-0.5">{quoteProduct.name}</h4>
                      <p className="text-[10px] text-gray-500 font-mono mt-1">Ref: {quoteProduct.ref} | Model: {quoteProduct.model}</p>
                      
                      <div className="text-[11px] font-mono font-bold text-[#003366] mt-1">
                        Prix Unitaire: {getEffectiveProductBasePrice(quoteProduct as any).toLocaleString('fr-FR')} FCFA Net HT
                      </div>
                    </div>
                  </div>

                  {/* Form fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5">Nom de l'Entreprise *</label>
                      <input 
                        type="text" 
                        required
                        value={clientCompany}
                        onChange={(e) => setClientCompany(e.target.value)}
                        placeholder="Ex: Cimenterie de Dakar, Mine de Sadiola..."
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-xs focus:ring-2 focus:ring-[#003366] focus:outline-none focus:bg-white font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5">Téléphone d'Urgence Acheteur *</label>
                      <input 
                        type="tel" 
                        required
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        placeholder="Ex: +221 77 123 45 67"
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-xs focus:ring-2 focus:ring-[#003366] focus:outline-none focus:bg-white font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5">Quantité Souhaitée ( MOQ: {quoteProduct.moq} min ) *</label>
                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
                        <button 
                          type="button"
                          onClick={() => setQuoteQuantity(Math.max(quoteProduct.moq, quoteQuantity - 1))}
                          className="px-4 py-1.5 hover:bg-gray-50 text-gray-400 font-bold"
                        >-</button>
                        <input 
                          type="number" 
                          required
                          min={quoteProduct.moq}
                          value={quoteQuantity}
                          onChange={(e) => setQuoteQuantity(Math.max(quoteProduct.moq, parseInt(e.target.value) || quoteProduct.moq))}
                          className="w-full text-center border-0 text-xs font-black text-[#003366] py-1.5 focus:ring-0 focus:outline-none" 
                        />
                        <button 
                          type="button"
                          onClick={() => setQuoteQuantity(quoteQuantity + 1)}
                          className="px-4 py-1.5 hover:bg-gray-50 text-gray-400 font-bold"
                        >+</button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5">Pays Africain Destination *</label>
                      <select 
                        value={clientCountry}
                        onChange={(e) => setClientCountry(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-xs focus:ring-2 focus:ring-[#003366] focus:outline-none focus:bg-white font-bold"
                      >
                        <option value="Sénégal">Sénégal (Dakar)</option>
                        <option value="Côte d'Ivoire">Côte d'Ivoire (Abidjan)</option>
                        <option value="Mali">Mali (Sadiola/Bamako)</option>
                        <option value="Cameroun">Cameroun (Douala)</option>
                        <option value="Gabon">Gabon (Libreville)</option>
                        <option value="RDC">RDC (Kinshasa)</option>
                        <option value="Guinée">Guinée (Conakry)</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-orange-50 p-3.5 rounded-lg border border-orange-100 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-[#FF6600] shrink-0 mt-0.5" />
                    <p className="text-[10px] text-gray-600 leading-normal">
                      Notre équipe de techniciens et de douaniers agréés étudie les volumes de transport pour éditer la facturation proforma requise sous 24h. Générez instantanément un aperçu de fiche technique d'origine pour vos dossiers d'achat.
                    </p>
                  </div>

                  {/* Pricing recap */}
                  <div className="border-t border-gray-100 pt-4 flex justify-between items-center bg-gray-50 -mx-6 -mb-6 p-6">
                    <div>
                      <span className="block text-[9px] font-bold text-gray-400">ESTIMATION MRO PROFORMA NET HT</span>
                      <span className="text-lg font-mono font-black text-[#003366]">
                        {(getEffectiveProductBasePrice(quoteProduct as any) * quoteQuantity).toLocaleString('fr-FR')} <span className="text-xs font-bold">FCFA</span>
                      </span>
                    </div>

                    <button 
                      type="submit"
                      className="bg-[#FF6600] hover:bg-[#e65c00] text-white px-6 py-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                    >
                      <FileText className="w-4 h-4" /> GÉNÉRER LE PROFORMA
                    </button>
                  </div>

                </form>
              ) : (
                <div className="text-center py-6">
                  <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-100 animate-bounce">
                    <Check className="w-7 h-7 text-green-600" />
                  </div>
                  <h4 className="text-base font-black text-gray-900">Demande de Proforma validée !</h4>
                  <p className="text-xs text-gray-500 mt-1.5 max-w-md mx-auto">
                    Votre référence de dossier proforma est <strong className="text-[#003366] font-mono text-sm">{generatedPdfNum}</strong>. Nos ingénieurs commerciaux de Dakar ont reçu votre demande technique pour l'entreprise <strong className="text-gray-800">{clientCompany}</strong> ({clientPhone}).
                  </p>

                  {/* Simulated PDF Proforma Download Card */}
                  <div className="bg-slate-50 border border-gray-200 rounded-xl p-5 my-6 text-left relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-[#003366] text-white px-3 py-1 rounded-bl text-[8px] font-mono uppercase tracking-widest font-bold">
                      PROFORMA INVOICE
                    </div>
                    
                    <div className="text-[10px] font-mono space-y-1.5 text-gray-600">
                      <div className="border-b border-gray-200 pb-1.5 mb-2 font-bold text-[#003366] flex justify-between">
                        <span>{siteSettings.companyName || 'ZONE ÉQUIPEMENTS'}</span>
                        <span>DATE: {new Date().toISOString().split('T')[0]}</span>
                      </div>
                      <div><strong>RÉFÉRENCE DOSSIER:</strong> {generatedPdfNum}</div>
                      <div><strong>DESTINATAIRE:</strong> {clientCompany} (Pays: {clientCountry})</div>
                      <div><strong>ARTICLE RÉFÉRENCÉ:</strong> {quoteProduct.brand} - {quoteProduct.name} ({quoteProduct.model})</div>
                      <div><strong>QUANTITÉ DEMANDÉE:</strong> {quoteQuantity} unités (conditionnement en boîtes de {quoteProduct.packageQty})</div>
                      
                      <div className="border-t border-dashed border-gray-300 pt-2 mt-2 flex justify-between font-bold text-gray-900 text-xs">
                        <span>ESTIMATION TOTAL NET EX-WORKS HT:</span>
                        <span className="text-[#FF6600] font-mono">{(getEffectiveProductBasePrice(quoteProduct as any) * quoteQuantity).toLocaleString('fr-FR')} FCFA</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-400 italic">
                    Un e-mail de confirmation technique contenant le certificat d'authenticité {quoteProduct.origin} a également été archivé.
                  </p>

                  <div className="mt-6 flex justify-center gap-3">
                    <button 
                      onClick={() => setQuoteProduct(null)}
                      className="bg-[#003366] text-white px-5 py-2 rounded-lg text-xs font-bold hover:bg-[#002244]"
                    >
                      Retour au catalogue
                    </button>
                    <a 
                      href={`data:text/plain;charset=utf-8,${encodeURIComponent(`=== ${siteSettings.companyName || 'ZONE ÉQUIPEMENTS'} ===\n\nPROFORMA DOSSIER: ${generatedPdfNum}\nCLIENT: ${clientCompany}\nPAYS: ${clientCountry}\n\nPRODUIT: ${quoteProduct.brand} - ${quoteProduct.name}\nQUANTITÉ: ${quoteQuantity}\nTOTAL HT ESTIMÉ: ${(quoteProduct.price * quoteQuantity).toLocaleString('fr-FR')} FCFA`)}`}
                      download={`Proforma_${generatedPdfNum}.txt`}
                      className="bg-white text-gray-700 border border-gray-300 px-5 py-2 rounded-lg text-xs font-bold hover:bg-gray-50 flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5 text-red-600" /> Télécharger (.TXT)
                    </a>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

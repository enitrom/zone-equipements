import { useState, useEffect, FormEvent } from 'react';
import { 
  Search, Filter, ShoppingCart, ArrowUpDown, Star, Plus, CheckCircle2, 
  Package, ChevronRight, ChevronDown, Truck, Clock, ShieldCheck, 
  LayoutGrid, List, ArrowRight, ExternalLink, RefreshCw, Eye, Check, Info, FileText, X
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { useCart } from '../CartContext';
import { useAuth } from '../AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Product, getProductImageUrl, handleImageError, DEFAULT_HERO_IMAGE } from '../constants';
import { catalogService, cleanBrand } from '../services/catalogService';
import { siteSettingsService, CategoryItem } from '../services/siteSettingsService';
import { useLanguage } from '../LanguageContext';

export default function Shop() {
  const { t } = useLanguage();
  const [allCatalogProducts, setAllCatalogProducts] = useState<Product[]>(() => {
    return catalogService.getProducts().filter(p => p.isOnline !== false);
  });
  const [categories, setCategories] = useState<CategoryItem[]>(() => siteSettingsService.getCategories());

  const refreshCatalog = () => {
    setAllCatalogProducts(catalogService.getProducts().filter(p => p.isOnline !== false));
    setCategories(siteSettingsService.getCategories());
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
  const [priceTier, setPriceTier] = useState<string>('Tous'); // 'Tous', 'under50k', '50to150k', 'over150k'
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('relevance');

  // Interactive quote request states
  const [quoteProduct, setQuoteProduct] = useState<Product | null>(null);
  const [quoteQuantity, setQuoteQuantity] = useState<number>(1);
  const [clientCompany, setClientCompany] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [clientCountry, setClientCountry] = useState<string>('Sénégal');
  const [quoteSuccess, setQuoteSuccess] = useState<boolean>(false);
  const [generatedPdfNum, setGeneratedPdfNum] = useState<string>('');

  const [compareList, setCompareList] = useState<number[]>([]);
  const [quickViewId, setQuickViewId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Interactive sidebar collapsible drawers for visual optimization
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    category: true,
    subcategory: true,
    brand: true,
    budget: true,
    sector: true,
    logistics: true
  });

  const toggleSidebarSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const { addItem } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

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

    // 6. Price range tiers
    if (priceTier === 'under50k' && p.price >= 50000) return false;
    if (priceTier === '50to150k' && (p.price < 50000 || p.price > 150000)) return false;
    if (priceTier === 'over150k' && p.price <= 150000) return false;

    // 7. Stock availability
    if (onlyInStock && p.inStock === false) {
      return false;
    }

    return true;
  });

  // Sorting logic
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'priceAsc') return a.price - b.price;
    if (sortBy === 'priceDesc') return b.price - a.price;
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

  const handleAddToCart = (product: Product) => {
    const ext = product as any;
    const rawOptions = ext.options || ext.variants || [];
    
    // If the product has options or variants, user MUST choose one on the product page
    if (rawOptions && rawOptions.length > 0) {
      navigate(`/product/${product.id}`);
      return;
    }

    const weightKg = parseFloat(String(product.weight || '1').replace(/[^0-9.]/g, '')) || 1.0;
    const initialSeaFreight = Math.max(8000, Math.round(weightKg * 1800));

    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      img: product.img,
      weightKg: weightKg,
      shippingMethod: 'sea',
      freightCost: initialSeaFreight,
      showDeposit: ext.showDeposit,
      depositPercentage: ext.depositPercentage || 30,
      agentCode: 'DKR628+SEA'
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
  const openQuoteModal = (product: Product) => {
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
    setPriceTier('Tous');
    setOnlyInStock(false);
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
                Catalogue MRO & Matériel Industriel
              </h1>
              <p className="mt-2 text-sm text-gray-300 max-w-2xl font-mono">
                Sourcing direct certifié & Expédition Afrique de l'Ouest. Tarifs négociés nets HT fabricants.
              </p>
            </div>
            <div className="flex bg-white/10 backdrop-blur-md px-6 py-4 rounded-xl border border-white/20 text-xs font-mono text-[#FF6600] font-bold text-center">
              <div>
                <span className="block text-white text-lg font-black">{allCatalogProducts.length}</span>
                Équipements Référencés
              </div>
              <div className="w-px bg-white/20 mx-6"></div>
              <div>
                <span className="block text-white text-lg font-black">24H</span>
                Départ Entrepôt
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Workspace Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* ================= LEFT COLUMN: NESTED INDUSTRIAL FILTER PANEL ================= */}
          <aside className="w-full lg:w-80 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sticky top-24 max-h-[90vh] overflow-y-auto custom-scrollbar">
              
              {/* Header Controls */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-5">
                <div className="flex items-center gap-2 text-xs font-black text-[#003366] uppercase tracking-widest">
                  <Filter className="w-4 h-4 text-[#FF6600]" />
                  <span>Filtres Industriels</span>
                </div>
                {(selectedCategory !== 'Tous' || selectedSubcategory !== 'Tous' || selectedBrands.length > 0 || selectedSectors.length > 0 || priceTier !== 'Tous' || !onlyInStock || searchTerm !== '') && (
                  <button 
                    onClick={resetAllFilters}
                    className="text-[10px] text-[#FF6600] font-extrabold hover:underline uppercase tracking-wider flex items-center gap-1"
                  >
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" style={{ animationDuration: '4s' }} /> Réinitialiser
                  </button>
                )}
              </div>

              {/* A. Search Field inside filter panel */}
              <div className="mb-6">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Rechercher une Référence</label>
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
                  <span>Catégorie Générale</span>
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
                      <span>Tous les matériels</span>
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
                            <span className="truncate">{cat.name}</span>
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
                    <span>Sous-Catégorie</span>
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
                        • Tout {selectedCategory}
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
                            <span className="truncate">• {sub.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* D. Multi-Brand filtration without deceptive counts */}
              <div className="mb-6">
                <button
                  onClick={() => toggleSidebarSection('brand')}
                  className="w-full flex items-center justify-between font-black text-gray-900 text-[11px] uppercase tracking-wider mb-3 pb-2 border-b border-gray-50 text-left"
                >
                  <span>Marque Constructeur</span>
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
                  <span>Budget HT (FCFA)</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${openSections.budget ? '' : '-rotate-90'}`} />
                </button>
                {openSections.budget && (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    {[
                      { value: 'Tous', label: 'Tous les prix' },
                      { value: 'under50k', label: 'Moins de 50 000 FCFA' },
                      { value: '50to150k', label: '50 000 à 150 000 FCFA' },
                      { value: 'over150k', label: 'Plus de 150 000 FCFA' }
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
                  <span>Secteur Cible d'Usage</span>
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
                          <span className={`group-hover:text-gray-950 flex-grow leading-tight ${isChecked ? 'text-gray-950 font-bold' : ''}`}>{sectorName}</span>
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
                  <span>Filtres de Disponibilité</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${openSections.logistics ? '' : '-rotate-90'}`} />
                </button>
                {openSections.logistics && (
                  <div className="animate-in fade-in duration-200">
                    <label className="flex items-center gap-3 text-xs text-gray-600 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={onlyInStock}
                        onChange={(e) => setOnlyInStock(e.target.checked)}
                        className="rounded border-gray-300 text-[#FF6600] focus:ring-[#FF6600] h-3.5 w-3.5 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="group-hover:text-gray-900 font-extrabold text-[#003366]">✓ Stock Localement Transit</span>
                        <span className="text-[10px] text-gray-400">Expédié de suite sous 24 heures</span>
                      </div>
                    </label>
                  </div>
                )}
              </div>

            </div>
          </aside>

          {/* ================= RIGHT COLUMN: PRODUCT BROWSER ================= */}
          <main className="flex-grow">
            
            {/* Breadcrumb row */}
            <div className="mb-6 flex items-center flex-wrap gap-2 text-[10px] text-gray-400 uppercase tracking-widest font-extrabold">
              <Link to="/" className="hover:text-[#003366]">Zone Équipements Sénégal</Link>
              <ChevronRight className="w-3 h-3" />
              <button onClick={() => {setSelectedCategory('Tous'); setSelectedSubcategory('Tous');}} className="hover:text-[#003366]">Boutique MRO</button>
              {selectedCategory !== 'Tous' && (
                <>
                  <ChevronRight className="w-3 h-3" />
                  <button onClick={() => setSelectedSubcategory('Tous')} className="text-[#003366] hover:underline">
                    {selectedCategory}
                  </button>
                </>
              )}
              {selectedSubcategory !== 'Tous' && (
                <>
                  <ChevronRight className="w-3 h-3" />
                  <span className="text-[#FF6600] font-mono">{selectedSubcategory}</span>
                </>
              )}
            </div>

            {/* Results Header: Sorting, counts and layouts */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
              <div>
                <h2 className="text-sm font-black text-[#003366] uppercase tracking-wide flex items-center gap-2">
                  {selectedCategory === 'Tous' ? 'Tout le catalogue MRO' : selectedCategory}
                  <span className="bg-gray-100 text-gray-500 font-mono text-[10px] normal-case tracking-normal px-2.5 py-0.5 rounded-full font-bold">
                    {sortedProducts.length} matériels trouvés
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
                  <option value="relevance">Trier par : Pertinence</option>
                  <option value="priceAsc">Prix : Croissant</option>
                  <option value="priceDesc">Prix : Décroissant</option>
                  <option value="rating">Mieux notés</option>
                </select>
              </div>
            </div>

            {/* ================= PRODUCTS CARDS LAYOUT ================= */}
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' : 'flex flex-col gap-4'}>
              {sortedProducts.map((product) => {
                const isComparing = compareList.includes(product.id);
                const isQuickView = quickViewId === product.id;
                
                // B2B West African VAT simulator
                const vatAmt = Math.round(product.price * 0.18);
                const priceTtc = product.price + vatAmt;

                /* ================= A. GRID VIEW MODE (GRAINGER STYLE) ================= */
                if (viewMode === 'grid') {
                  return (
                    <div key={product.id} className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden group hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                      <div>
                        {/* Top Banner Row */}
                        <div className="bg-gray-50 border-b border-gray-100 p-2.5 flex items-center justify-between text-[10px] font-mono">
                          <span className="font-extrabold text-[#003366] bg-blue-50 px-2 py-0.5 rounded">
                            {cleanBrand(product.brand, product.name)}
                          </span>
                          <span className="text-gray-400">Ref: {product.ref}</span>
                        </div>

                        {/* Image Frame */}
                        <div className="relative aspect-video bg-gray-50/50 flex items-center justify-center border-b border-gray-50 overflow-hidden p-4">
                          <img 
                            src={getProductImageUrl(product.img)} 
                            alt={product.name} 
                            className="max-h-40 object-contain group-hover:scale-105 transition-transform duration-500 rounded"
                            referrerPolicy="no-referrer"
                            onError={handleImageError}
                          />
                          <button 
                            onClick={() => toggleCompare(product.id)}
                            className={`absolute top-2 right-2 p-1.5 rounded-full shadow-sm transition-all border ${
                              isComparing 
                                ? 'bg-[#FF6600] text-white border-[#FF6600]' 
                                : 'bg-white/90 text-gray-500 border-gray-200 hover:text-[#003366]'
                            }`}
                            title="Comparer"
                          >
                            <Plus className={`w-3.5 h-3.5 ${isComparing ? 'rotate-45' : ''} transition-transform`} />
                          </button>
                        </div>

                        {/* Text Specs Context */}
                        <div className="p-4 flex-grow">
                          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{product.category}</div>
                          <h3 className="font-black text-gray-900 text-xs mt-1 leading-snug group-hover:text-[#003366] transition-colors line-clamp-2 h-8">
                            <Link to={`/product/${product.id}`}>{product.name}</Link>
                          </h3>
                          <div className="text-[10px] text-gray-400 font-mono mt-1">N° Modèle: {product.model}</div>

                          <div className="flex items-center gap-1.5 my-2">
                            <span className="text-[#FF6600] text-xs font-black">★ {product.rating}</span>
                            <span className="text-gray-400 text-[10px]">({product.reviews} avis client)</span>
                          </div>

                          {/* Quick specs preview */}
                          <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 my-2 space-y-1">
                            {Object.entries(product.specs || {}).slice(0, 3).map(([key, value]) => (
                              <div key={key} className="flex justify-between text-[10px]">
                                <span className="text-gray-500 font-bold truncate pr-2">{key}</span>
                                <span className="text-gray-900 font-mono font-bold shrink-0">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Pricing and Action footer */}
                      <div className="border-t border-gray-100 bg-gray-50/50 p-4">
                        <div className="flex justify-between items-end mb-3">
                          <div>
                            <span className="block text-[8px] font-bold text-gray-400 uppercase">Tarif Net d'Importateur</span>
                            <span className="text-base font-black text-[#003366]">
                              {product.price.toLocaleString('fr-FR')} <span className="text-[10px] font-bold">FCFA HT</span>
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="block text-[8px] font-bold text-gray-400 uppercase">TTC (TVA 18% Incluse)</span>
                            <span className="text-xs font-mono font-bold text-gray-600 block leading-tight">
                              {priceTtc.toLocaleString('fr-FR')} FCFA
                            </span>
                          </div>
                        </div>

                        {/* Professional Logistics Tag */}
                        <div className="flex items-center gap-2 text-[10px] text-[#2e7d32] font-extrabold mb-3">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#2e7d32] flex-shrink-0" />
                          <span>✓ {(product.leadTime || '7-14 jours').split(',')[0]}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button 
                            onClick={() => handleAddToCart(product)}
                            className="bg-[#003366] hover:bg-[#002244] text-white py-2 px-3 rounded-lg text-[10px] font-black transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" /> {t('add_to_cart_btn')}
                          </button>
                          
                          <button 
                            onClick={() => openQuoteModal(product)}
                            className="bg-white hover:bg-orange-50 text-[#FF6600] border border-[#FF6600] py-2 px-3 rounded-lg text-[10px] font-black transition-all flex items-center justify-center gap-1 shadow-xs"
                          >
                            <FileText className="w-3.5 h-3.5" /> {t('quote_pro_btn')}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                /* ================= B. LIST VIEW MODE (RAPTORSUPPLIES DENSE TABLE LAYOUT) ================= */
                return (
                  <div key={product.id} className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden group hover:border-gray-300 transition-all duration-300">
                    <div className="flex flex-col lg:flex-row lg:flex-nowrap p-4 gap-5">
                      
                      {/* Image block */}
                      <div className="w-full lg:w-48 h-40 flex-shrink-0 relative bg-gray-50 rounded-lg overflow-hidden border border-gray-100 flex items-center justify-center p-2">
                        <img 
                          src={getProductImageUrl(product.img)} 
                          alt={product.name} 
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500 rounded"
                          referrerPolicy="no-referrer"
                          onError={handleImageError}
                        />
                        <div className="absolute top-1.5 left-1.5 bg-white/95 border border-gray-200 backdrop-blur-md px-2 py-0.5 rounded text-[8px] font-black text-[#003366] uppercase tracking-wider shadow-xs">
                          {cleanBrand(product.brand, product.name)}
                        </div>
                        <button 
                          onClick={() => toggleCompare(product.id)}
                          className={`absolute top-1.5 right-1.5 p-1 rounded-full shadow-xs transition-all border ${
                            isComparing 
                              ? 'bg-[#FF6600] text-white border-[#FF6600]' 
                              : 'bg-white/80 text-gray-400 border-white hover:text-[#003366]'
                          }`}
                        >
                          <Plus className={`w-3 h-3 ${isComparing ? 'rotate-45' : ''} transition-transform`} />
                        </button>
                      </div>

                      {/* Info and specs block */}
                      <div className="flex-grow flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2 mb-2">
                            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">{product.category} › {product.subcategory}</span>
                            <div className="flex items-center gap-1 font-mono text-[10px] text-gray-500">
                              <span className="bg-gray-100 px-2 py-0.5 rounded text-[#003366] font-bold">Modèle: {product.model}</span>
                              <span className="bg-slate-50 px-2 py-0.5 rounded">Ref ID: {product.ref}</span>
                            </div>
                          </div>

                          <h3 className="font-extrabold text-gray-900 text-sm xl:text-base leading-tight group-hover:text-[#003366] transition-colors">
                            <Link to={`/product/${product.id}`}>{product.name}</Link>
                          </h3>

                          {/* Technical attributes horizontal line */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 mt-3 py-3 border-y border-gray-50">
                            {Object.entries(product.specs || {}).slice(0, 4).map(([key, val]) => (
                              <div key={key} className="flex flex-col min-w-0">
                                <span className="text-[8px] text-gray-400 uppercase font-black truncate">{key}</span>
                                <span className="text-[11px] font-bold text-gray-950 truncate font-mono">{val}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Extra descriptors */}
                        <div className="text-[12px] text-gray-500 line-clamp-1 mt-2 font-sans italic">
                          "{product.description}"
                        </div>

                        {/* Utilities row */}
                        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                          <button 
                            onClick={() => setQuickViewId(isQuickView ? null : product.id)}
                            className="text-[#003366] hover:text-[#FF6600] text-xs font-black uppercase tracking-wide flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            {isQuickView ? (
                              <>
                                <span>▲ FERMER LES DÉTAILS &amp; SPÉCIFICATIONS</span>
                              </>
                            ) : (
                              <>
                                <span>VOIR LES DÉTAILS &amp; SPÉCIFICATIONS ›</span>
                              </>
                            )}
                          </button>
                          
                          <div className="h-3 w-px bg-gray-200"></div>
                          
                          <span className="text-[10px] font-mono text-gray-400 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
                            Origine certifiée: <strong className="text-gray-700">{product.origin}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Pricing column & cart block */}
                      <div className="w-full lg:w-60 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-gray-100 pt-4 lg:pt-0 lg:pl-5 flex flex-col justify-between bg-gray-50/40 p-3 lg:bg-transparent rounded-lg">
                        <div className="space-y-1 mb-3">
                          <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">PRIX COMPTOIR PROFESSIONNEL</span>
                          
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-mono font-black text-[#003366]">
                              {product.price.toLocaleString('fr-FR')}
                            </span>
                            <span className="text-[10px] font-black text-gray-500">FCFA NET HT</span>
                          </div>
                          
                          <span className="block text-[10px] text-gray-400 font-mono">
                            {priceTtc.toLocaleString('fr-FR')} FCFA TTC
                          </span>
                        </div>

                        {/* Package constraint info */}
                        <div className="text-[10px] text-gray-600 space-y-1 mb-4">
                          <div className="flex justify-between border-b border-gray-100 pb-1">
                            <span>Quantité par boîte:</span>
                            <span className="font-bold text-[#003366]">{product.packageQty} unité{product.packageQty > 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Commande min.:</span>
                            <span className="font-bold text-gray-700">{product.moq} pack{product.moq > 1 ? 's' : ''}</span>
                          </div>
                        </div>

                        {/* Primary B2B Action Buttons */}
                        <div className="space-y-2">
                          <button 
                            onClick={() => handleAddToCart(product)}
                            className="w-full bg-[#003366] hover:bg-[#002244] text-white py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 shadow-sm"
                          >
                            <ShoppingCart className="w-4 h-4" /> {t('add_to_cart_btn')}
                          </button>
                          
                          <button 
                            onClick={() => openQuoteModal(product)}
                            className="w-full bg-white hover:bg-orange-50 text-[#FF6600] border border-[#FF6600] py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-xs"
                          >
                            <FileText className="w-4 h-4" /> {t('quote_pro_btn')}
                          </button>
                        </div>
                      </div>

                    </div>

                    {/* ================= EXPANDABLE DETAILS & SPEC PANEL ================= */}
                    {isQuickView && (
                      <div className="bg-slate-50/90 border-t border-gray-200 p-6 animate-in slide-in-from-top-4 duration-300">
                        <div className="max-w-4xl space-y-5">
                          <div>
                            <h4 className="font-extrabold text-[#003366] text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Info className="w-4 h-4 text-[#003366]" /> Détails &amp; Description du produit
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
                                Spécifications techniques
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
                          {p.price.toLocaleString('fr-FR')} <span className="text-[9px] font-normal text-gray-400">FCFA HT</span>
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
                          {p?.origin || 'International'}
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
                <p className="text-[10px] text-gray-300 font-mono mt-0.5">Zone Équipements Sénégal - Sourcing professionnel d'origine fabricant</p>
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
                        Prix Unitaire: {quoteProduct.price.toLocaleString('fr-FR')} FCFA Net HT
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
                        {(quoteProduct.price * quoteQuantity).toLocaleString('fr-FR')} <span className="text-xs font-bold">FCFA</span>
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
                        <span>ZONE ÉQUIPEMENTS SÉNÉGAL MRO</span>
                        <span>DATE: 2026-05-23</span>
                      </div>
                      <div><strong>RÉFÉRENCE DOSSIER:</strong> {generatedPdfNum}</div>
                      <div><strong>DESTINATAIRE:</strong> {clientCompany} (Pays: {clientCountry})</div>
                      <div><strong>ARTICLE RÉFÉRENCÉ:</strong> {quoteProduct.brand} - {quoteProduct.name} ({quoteProduct.model})</div>
                      <div><strong>QUANTITÉ DEMANDÉE:</strong> {quoteQuantity} unités (conditionnement en boîtes de {quoteProduct.packageQty})</div>
                      
                      <div className="border-t border-dashed border-gray-300 pt-2 mt-2 flex justify-between font-bold text-gray-900 text-xs">
                        <span>ESTIMATION TOTAL NET EX-WORKS HT:</span>
                        <span className="text-[#FF6600] font-mono">{(quoteProduct.price * quoteQuantity).toLocaleString('fr-FR')} FCFA</span>
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
                      href={`data:text/plain;charset=utf-8,${encodeURIComponent(`=== ZONE ÉQUIPEMENTS SÉNÉGAL ===\n\nPROFORMA DOSSIER: ${generatedPdfNum}\nCLIENT: ${clientCompany}\nPAYS: ${clientCountry}\n\nPRODUIT: ${quoteProduct.brand} - ${quoteProduct.name}\nQUANTITÉ: ${quoteQuantity}\nTOTAL HT ESTIMÉ: ${(quoteProduct.price * quoteQuantity).toLocaleString('fr-FR')} FCFA`)}`}
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

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import {
  Menu, X, Globe, ShoppingCart, MessageCircle, Phone, User,
  MapPin, Shield, ChevronUp, ChevronDown, ChevronRight, Search,
  Package, FileText, BookOpen, Mail, LogIn, ExternalLink, Plus, Pencil, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Contexts
import { AuthProvider, useAuth } from './AuthContext';
import { CartProvider, useCart } from './CartContext';
import { LanguageProvider, useLanguage } from './LanguageContext';

// Pages
import Home from './pages/Home';
import Shop from './pages/Shop';
import Services from './pages/Services';
import Blog from './pages/Blog';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Account from './pages/Account';
import Cart from './pages/Cart';
import ProductDetails from './pages/ProductDetails';
import Admin from './pages/Admin';
import SupplierPortal from './pages/SupplierPortal';
import FaqPage from './pages/FaqPage';
import { NewsletterBanner } from './components/NewsletterBanner';

// Services
import { siteSettingsService, CategoryItem } from './services/siteSettingsService';
import { analyticsTracker } from './services/analyticsTracker';

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    // Automatically track page view for Admin Traffic Analytics
    analyticsTracker.trackPageView(pathname + search);
  }, [pathname, search]);
  return null;
}

// Quick Scroll to Top Floating Button
function ScrollToTopFloatingButton() {
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowButton(window.scrollY > 280);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (!showButton) return null;

  return (
    <button
      type="button"
      onClick={handleScrollToTop}
      className="fixed bottom-24 right-6 z-40 p-3.5 bg-[#003366] hover:bg-[#FF6600] text-white rounded-full shadow-2xl border border-white/20 transition-all duration-300 hover:scale-110 cursor-pointer flex items-center justify-center animate-fadeIn"
      title="Remonter rapidement en haut de page"
      aria-label="Remonter en haut de page"
    >
      <ChevronUp className="w-5 h-5 stroke-[2.5]" />
    </button>
  );
}

function Header() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [catOpen, setCatOpen] = useState(false);
  const [mobileCatExpanded, setMobileCatExpanded] = useState(false);
  const catCloseTimeoutRef = React.useRef<number | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, isAdmin } = useAuth();
  const { items } = useCart();
  const { language, setLanguage, t, translateCategory } = useLanguage();
  const [categories, setCategories] = useState<CategoryItem[]>(() => siteSettingsService.getCategories());
  const [siteSettings, setSiteSettings] = useState(() => siteSettingsService.getSettings());

  useEffect(() => {
    const unsub = siteSettingsService.subscribe(() => {
      setCategories(siteSettingsService.getCategories());
      setSiteSettings(siteSettingsService.getSettings());
    });
    return () => unsub();
  }, []);

  // Close drawer on route change
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  const handleCatMouseEnter = () => {
    if (catCloseTimeoutRef.current) {
      window.clearTimeout(catCloseTimeoutRef.current);
      catCloseTimeoutRef.current = null;
    }
    setCatOpen(true);
  };

  const handleCatMouseLeave = () => {
    if (catCloseTimeoutRef.current) {
      window.clearTimeout(catCloseTimeoutRef.current);
    }
    catCloseTimeoutRef.current = window.setTimeout(() => {
      setCatOpen(false);
    }, 250);
  };

  // Sync header input state with URL search parameter dynamically
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const search = params.get('search');
    if (search !== null) {
      setSearchQuery(search);
    } else {
      setSearchQuery('');
    }
  }, [location.search]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.ze-cat-dropdown-wrapper')) {
        setCatOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      analyticsTracker.trackSearch(searchQuery.trim(), true);
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsDrawerOpen(false);
    }
  };

  const handleSearchInputChange = (val: string) => {
    setSearchQuery(val);
    const onShopPage = window.location.pathname === '/shop';
    if (val.trim()) {
      navigate(`/shop?search=${encodeURIComponent(val.trim())}`, { replace: onShopPage });
    } else if (onShopPage) {
      navigate('/shop', { replace: true });
    }
  };

  const displayCompanyName = siteSettings.companyName || 'ZONE ÉQUIPEMENTS';
  const displayCompanySubtitle = siteSettings.companySubtitle !== undefined ? siteSettings.companySubtitle : "SÉNÉGAL • AFRIQUE DE L'OUEST";
  const displayCompanyBadge = siteSettings.companyBadge !== undefined ? siteSettings.companyBadge : 'MRO';
  const displayCompanyLogo = siteSettings.companyLogo || '';

  return (
    <>
      <header className="bg-[#003366] text-white sticky top-0 z-40 shadow-md w-full max-w-full font-sans">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6 w-full">
          <div className="flex items-center justify-between h-20 w-full gap-2 sm:gap-3 lg:gap-4 xl:gap-6">
            {/* Logo & Nom d'entreprise dynamique */}
            <div className="shrink-0 flex items-center">
              <Link to="/" className="flex items-center gap-2 lg:gap-2.5 group">
                {displayCompanyLogo ? (
                  <img
                    src={displayCompanyLogo}
                    alt={displayCompanyName}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain bg-white p-1 shadow-md border border-white/20 group-hover:scale-105 transition-transform duration-300 shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#FF6600] to-amber-600 flex items-center justify-center text-white shadow-md shadow-orange-950/20 border border-orange-400/30 group-hover:scale-105 transition-transform duration-300 shrink-0">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                  </div>
                )}
                <div className="flex flex-col leading-none min-w-0">
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className="text-white font-black tracking-tight text-sm sm:text-base lg:text-lg xl:text-xl font-roboto truncate max-w-[160px] sm:max-w-[220px] lg:max-w-none">{displayCompanyName}</span>
                    {displayCompanyBadge && (
                      <span className="bg-[#FF6600] text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest hidden sm:inline-block shrink-0">{displayCompanyBadge}</span>
                    )}
                  </div>
                  {displayCompanySubtitle && (
                    <span className="text-[#FF6600] text-[8px] sm:text-[9px] lg:text-[10px] font-extrabold tracking-[0.14em] uppercase mt-1 whitespace-nowrap hidden lg:block truncate">{displayCompanySubtitle}</span>
                  )}
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center justify-end lg:justify-center gap-2 lg:gap-3 xl:gap-4 flex-1 min-w-0 ml-2">
              <div className="flex items-center justify-center gap-2 lg:gap-2.5 xl:gap-3 shrink-0">
                <div
                  className="ze-cat-dropdown-wrapper shrink-0"
                  onMouseEnter={handleCatMouseEnter}
                  onMouseLeave={handleCatMouseLeave}
                >
                  <button 
                    id="zeCatBtn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCatOpen(!catOpen);
                    }}
                    className="ze-cat-dropdown-btn whitespace-nowrap text-[11px] lg:text-xs py-1.5 px-3"
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" style={{ marginRight: '5px', verticalAlign: 'middle', display: 'inline-block' }}>
                      <line x1="3" y1="12" x2="21" y2="12"></line>
                      <line x1="3" y1="6" x2="21" y2="6"></line>
                      <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                    {t('nav_catalog')}
                  </button>
                  {/* Mega Menu Dropdown */}
                  <div 
                    id="zeMegaMenu" 
                    className={`ze-cat-mega-menu ${catOpen ? 'show-block' : ''}`}
                    onMouseEnter={handleCatMouseEnter}
                    onMouseLeave={handleCatMouseLeave}
                  >
                    <div className="ze-mega-grid">
                      {(() => {
                        const perCol = Math.ceil(categories.length / 4) || 1;
                        const col1 = categories.slice(0, perCol);
                        const col2 = categories.slice(perCol, perCol * 2);
                        const col3 = categories.slice(perCol * 2, perCol * 3);
                        const col4 = categories.slice(perCol * 3);
                        const columns = [col1, col2, col3, col4];
                        return columns.map((col, colIndex) => (
                          <div key={colIndex} className="ze-mega-col styling-no-header">
                            <ul>
                              {col.map((cat, idx) => {
                                const IconComponent = (Icons as any)[cat.icon] || Icons.HelpCircle;
                                return (
                                  <li key={idx}>
                                    <Link 
                                      to={`/shop?category=${encodeURIComponent(cat.name)}`}
                                      onClick={() => setCatOpen(false)}
                                      className="flex items-center gap-2.5 py-1 px-1.5 rounded-lg hover:bg-orange-50/80 transition-all group"
                                    >
                                      <div className="w-6 h-6 rounded-md bg-orange-50 border border-orange-100/60 text-[#FF6600] flex items-center justify-center shrink-0 group-hover:bg-[#FF6600] group-hover:text-white group-hover:border-[#FF6600] transition-colors">
                                        <IconComponent className="w-3.5 h-3.5" />
                                      </div>
                                      <span className="group-hover:text-[#FF6600] font-medium text-xs text-slate-700 transition-colors">{translateCategory(cat.name)}</span>
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
                <Link to="/services" className="hover:text-[#FF6600] transition-colors font-bold text-[10px] lg:text-[11px] uppercase tracking-wider whitespace-nowrap hidden xl:inline-block">
                  {t('nav_services_short')}
                </Link>
                <Link to="/blog" className="hover:text-[#FF6600] transition-colors font-bold text-[10px] lg:text-[11px] uppercase tracking-wider whitespace-nowrap hidden xl:inline-block">
                  {t('nav_blog_guides')}
                </Link>
                <Link to="/contact" className="hover:text-[#FF6600] transition-colors font-bold text-[10px] lg:text-[11px] uppercase tracking-wider whitespace-nowrap hidden xl:inline-block">
                  {t('nav_contact')}
                </Link>
              </div>

              {/* Search Bar */}
              <div className="w-28 sm:w-36 lg:w-44 xl:w-56 shrink min-w-[90px]">
                <form onSubmit={handleSearch} className="relative">
                  <input 
                    type="text" 
                    placeholder={t('search_placeholder')} 
                    className="w-full bg-white/15 border border-white/25 rounded-full py-1.5 px-3 pl-8 text-xs focus:bg-white focus:text-gray-900 focus:outline-none transition-all placeholder:text-white/70"
                    value={searchQuery}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                  />
                  <button type="submit" className="absolute left-2.5 top-1/2 -translate-y-1/2">
                    <Icons.Search className="w-3.5 h-3.5 text-white/70" />
                  </button>
                </form>
              </div>
              
              <div className="flex items-center justify-end gap-1.5 sm:gap-2 lg:gap-2.5 border-l border-white/20 pl-2 lg:pl-3 shrink-0">
                <Link to="/cart" className="relative hover:text-[#FF6600] transition-colors p-1" title={t('nav_cart')}>
                  <ShoppingCart className="w-4 sm:w-5 h-4 sm:h-5" />
                  {items.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#FF6600] text-white text-[8px] sm:text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                      {items.reduce((acc, item) => acc + item.quantity, 0)}
                    </span>
                  )}
                </Link>
                
                <Link to={user ? "/account" : "/login"} className="flex items-center gap-1 hover:text-[#FF6600] transition-colors whitespace-nowrap p-1">
                  <User className="w-4 sm:w-5 h-4 sm:h-5 shrink-0" />
                  <span className="text-[10px] lg:text-[11px] font-extrabold uppercase tracking-wider hidden lg:inline max-w-[85px] truncate">
                    {user ? (profile?.displayName || t('nav_account')) : t('nav_login')}
                  </span>
                </Link>

                {isAdmin && (
                  <Link 
                    to="/admin" 
                    className="hidden md:flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg bg-orange-600/20 text-[#FF6600] border border-orange-500/40 hover:bg-[#FF6600] hover:text-white transition-all text-[9px] sm:text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                    title="Accéder au Back-Office Administrateur"
                  >
                    <Shield className="w-3 h-3 shrink-0" />
                    <span className="hidden lg:inline">{t('nav_admin')}</span>
                  </Link>
                )}

                {/* Multilingual Selector - Always visible on desktop & tablet */}
                <div className="flex items-center gap-1 shrink-0 bg-white/10 border border-white/15 rounded-lg px-1.5 py-0.5">
                  <Globe className="w-3 h-3 text-[#FF6600] shrink-0" />
                  <select 
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="bg-transparent text-[10px] font-bold focus:outline-none cursor-pointer text-white"
                    title="Langue / Language"
                  >
                    <option value="fr" className="text-gray-900">FR</option>
                    <option value="en" className="text-gray-900">EN</option>
                    <option value="es" className="text-gray-900">ES</option>
                    <option value="zh" className="text-gray-900">ZH</option>
                  </select>
                </div>
              </div>
            </nav>

            {/* Mobile Header Actions */}
            <div className="md:hidden flex items-center gap-2">
              {/* Mobile Multilingual Selector - Never disappears */}
              <div className="flex items-center gap-1 shrink-0 bg-white/10 border border-white/15 rounded-lg px-2 py-1">
                <Globe className="w-3.5 h-3.5 text-[#FF6600] shrink-0" />
                <select 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="bg-transparent text-[11px] font-bold focus:outline-none cursor-pointer text-white"
                  title="Langue / Language"
                >
                  <option value="fr" className="text-gray-900">FR</option>
                  <option value="en" className="text-gray-900">EN</option>
                  <option value="es" className="text-gray-900">ES</option>
                  <option value="zh" className="text-gray-900">ZH</option>
                </select>
              </div>

              <Link to="/cart" className="relative p-2 text-white hover:text-[#FF6600]">
                <ShoppingCart className="w-5 h-5" />
                {items.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-[#FF6600] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {items.length}
                  </span>
                )}
              </Link>
              
              {/* Hamburger Button for Slide-Out Drawer */}
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="p-2 text-white hover:text-[#FF6600] focus:outline-none rounded-xl bg-white/10 border border-white/15 cursor-pointer"
                aria-label="Ouvrir le menu de navigation mobile"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Mobile Search Bar - Under Company Name in Header */}
          <div className="md:hidden pb-3 pt-0 px-0.5">
            <form onSubmit={handleSearch} className="relative">
              <input 
                type="text" 
                placeholder={t('search_placeholder')} 
                className="w-full bg-white/15 border border-white/25 rounded-xl py-2 px-4 pl-9 text-xs text-white placeholder:text-white/70 focus:bg-white focus:text-gray-900 focus:outline-none transition-all shadow-inner"
                value={searchQuery}
                onChange={(e) => handleSearchInputChange(e.target.value)}
              />
              <Search className="w-3.5 h-3.5 text-white/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => handleSearchInputChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>
          </div>
        </div>
      </header>

      {/* ================= COMPLETE MOBILE NAVIGATION DRAWER (WHITE BACKGROUND & BLACK TEXT) ================= */}
      <div
        className={`fixed inset-0 z-50 md:hidden font-sans transition-opacity duration-150 ${
          isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!isDrawerOpen}
      >
        {/* Lightweight Backdrop Overlay */}
        <div
          onClick={() => setIsDrawerOpen(false)}
          className="fixed inset-0 bg-slate-950/60 cursor-pointer"
        />

        {/* Slide-out Sidebar Drawer with Smooth Vertical Scrolling */}
        <div
          className={`fixed top-0 bottom-0 left-0 w-4/5 max-w-sm bg-white text-gray-900 h-full max-h-[100dvh] shadow-2xl flex flex-col z-50 overflow-hidden border-r border-gray-200 will-change-transform transition-transform duration-150 ease-out ${
            isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Drawer Header */}
          <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between shrink-0">
            <Link to="/" onClick={() => setIsDrawerOpen(false)} className="flex items-center gap-2.5">
              {displayCompanyLogo ? (
                <img
                  src={displayCompanyLogo}
                  alt={displayCompanyName}
                  className="w-9 h-9 rounded-xl object-contain bg-gray-50 border border-gray-200 p-1"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-[#003366] border border-gray-200 flex items-center justify-center font-bold text-white text-sm">
                  ZE
                </div>
              )}
              <div>
                <span className="font-bold text-sm tracking-tight text-[#003366] block font-roboto leading-none">
                  {displayCompanyName}
                </span>
                <span className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold block mt-1">
                  {displayCompanyBadge || 'Équipements & Pièces Pro'} • Dakar, Sénégal
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="p-2 text-gray-500 hover:text-gray-900 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-colors cursor-pointer"
              aria-label="Fermer le menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Nav Links - Smooth Vertical Scroll (touch-pan-y & overscroll-contain) */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-3.5 space-y-2 text-xs touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
            {/* Catalog & Categories Accordion */}
            <div className="rounded-xl overflow-hidden bg-gray-50 border border-gray-200">
              <div className="flex items-center justify-between p-3 hover:bg-gray-100 transition-colors">
                <Link
                  to="/shop"
                  onClick={() => setIsDrawerOpen(false)}
                  className="font-semibold text-gray-800 flex items-center gap-2.5 flex-1"
                >
                  <Package className="w-4 h-4 text-gray-600 shrink-0" />
                  <span>{t('nav_catalog')}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileCatExpanded(!mobileCatExpanded)}
                  className="p-1 text-gray-500 hover:text-gray-900 cursor-pointer"
                  aria-label="Afficher les catégories"
                >
                  {mobileCatExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </div>

              {mobileCatExpanded && (
                <div className="bg-white p-2 space-y-1 border-t border-gray-200">
                  {categories.map((cat, idx) => {
                    const IconComp = (Icons as any)[cat.icon] || Icons.HelpCircle;
                    return (
                      <Link
                        key={idx}
                        to={`/shop?category=${encodeURIComponent(cat.name)}`}
                        onClick={() => setIsDrawerOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-700 hover:text-[#003366] hover:bg-gray-50 text-[11px] font-medium transition-colors"
                      >
                        <IconComp className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{translateCategory(cat.name)}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <Link
              to="/services"
              onClick={() => setIsDrawerOpen(false)}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-800 font-semibold transition-colors"
            >
              <FileText className="w-4 h-4 text-gray-600 shrink-0" />
              <span>{t('nav_services')}</span>
            </Link>

            <Link
              to="/blog"
              onClick={() => setIsDrawerOpen(false)}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-800 font-semibold transition-colors"
            >
              <BookOpen className="w-4 h-4 text-gray-600 shrink-0" />
              <span>{t('nav_blog_guides')}</span>
            </Link>

            <Link
              to="/faq"
              onClick={() => setIsDrawerOpen(false)}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-800 font-semibold transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-gray-600 shrink-0" />
              <span>Questions Fréquentes & Support</span>
            </Link>

            <Link
              to="/contact"
              onClick={() => setIsDrawerOpen(false)}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-800 font-semibold transition-colors"
            >
              <Mail className="w-4 h-4 text-gray-600 shrink-0" />
              <span>{t('nav_contact')}</span>
            </Link>

            <Link
              to="/cart"
              onClick={() => setIsDrawerOpen(false)}
              className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-800 font-semibold transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <ShoppingCart className="w-4 h-4 text-gray-600 shrink-0" />
                <span>{t('nav_cart')}</span>
              </div>
              {items.length > 0 && (
                <span className="bg-[#FF6600] text-white font-bold text-[10px] px-2 py-0.5 rounded-md">
                  {items.length}
                </span>
              )}
            </Link>

            <Link
              to={user ? "/account" : "/login"}
              onClick={() => setIsDrawerOpen(false)}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-800 font-semibold transition-colors"
            >
              <User className="w-4 h-4 text-gray-600 shrink-0" />
              <span>{user ? (profile?.displayName || t('nav_account')) : t('nav_login')}</span>
            </Link>

            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setIsDrawerOpen(false)}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-900 font-semibold transition-colors"
              >
                <Shield className="w-4 h-4 text-orange-600 shrink-0" />
                <span>{t('nav_admin')}</span>
              </Link>
            )}
          </div>

          {/* Drawer Footer: Language & Contact Shortcuts */}
          <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                <Globe className="w-4 h-4 text-gray-500" />
                <span>Langue :</span>
              </div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="bg-white border border-gray-300 text-xs font-semibold px-3 py-1.5 rounded-lg text-gray-800 focus:outline-none cursor-pointer shadow-2xs"
              >
                <option value="fr">Français (FR)</option>
                <option value="en">English (EN)</option>
                <option value="es">Español (ES)</option>
                <option value="zh">中文 (ZH)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href="https://wa.me/221766538384"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 p-2.5 bg-white hover:bg-gray-100 text-emerald-800 rounded-xl text-[11px] font-semibold border border-gray-200 transition-colors shadow-2xs"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp</span>
              </a>

              <a
                href="tel:+221766538384"
                className="flex items-center justify-center gap-1.5 p-2.5 bg-white hover:bg-gray-100 text-[#003366] rounded-xl text-[11px] font-semibold border border-gray-200 transition-colors shadow-2xs"
              >
                <Phone className="w-3.5 h-3.5 text-[#003366]" />
                <span>Appeler</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function DeliveryLogistics() {
  const { t } = useLanguage();
  const { isAdmin } = useAuth();
  const [siteSettings, setSiteSettings] = useState(() => siteSettingsService.getSettings());
  const [editingRegionIndex, setEditingRegionIndex] = useState<number | null>(null);
  const [isNewRegionModalOpen, setIsNewRegionModalOpen] = useState(false);
  const [regionForm, setRegionForm] = useState({ name: '', countries: '' });
  const [isAddingPartner, setIsAddingPartner] = useState(false);
  const [newPartnerName, setNewPartnerName] = useState('');

  useEffect(() => {
    const unsub = siteSettingsService.subscribe(() => {
      setSiteSettings(siteSettingsService.getSettings());
    });
    return () => unsub();
  }, []);

  const regions = (siteSettings.logisticsRegions && siteSettings.logisticsRegions.length > 0)
    ? siteSettings.logisticsRegions
    : [
        { name: "Afrique de l'Ouest", countries: "Sénégal, Côte d'Ivoire, Mali, Guinée, Mauritanie, Burkina Faso, Togo, Bénin, Niger, Ghana, Nigeria" },
        { name: "Afrique Centrale", countries: "Cameroun, Gabon, Congo, RDC, Tchad, Guinée Équatoriale, RCA" },
        { name: "Afrique de l'Est", countries: "Kenya, Tanzanie, Ouganda, Rwanda, Éthiopie, Djibouti" },
        { name: "Afrique Australe", countries: "Afrique du Sud, Angola, Mozambique, Zambie, Namibie" },
        { name: "Maghreb & Nord", countries: "Maroc, Algérie, Tunisie, Mauritanie, Égypte" }
      ];

  const partners = (siteSettings.logisticsPartners && siteSettings.logisticsPartners.length > 0)
    ? siteSettings.logisticsPartners
    : ['DHL Express', 'Aramex', 'FedEx', 'Maersk', 'Bolloré', 'Air France Cargo', 'Emirates SkyCargo'];

  const handleDeleteRegion = (indexToDelete: number) => {
    if (window.confirm(`Confirmer la suppression de la région "${regions[indexToDelete]?.name}" ?`)) {
      const updated = regions.filter((_, i) => i !== indexToDelete);
      siteSettingsService.updateSettings({ logisticsRegions: updated });
    }
  };

  const handleSaveRegion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regionForm.name.trim() || !regionForm.countries.trim()) return;

    let updated: Array<{ name: string; countries: string }>;
    if (editingRegionIndex !== null) {
      updated = regions.map((r, i) => i === editingRegionIndex ? { name: regionForm.name.trim(), countries: regionForm.countries.trim() } : r);
    } else {
      updated = [...regions, { name: regionForm.name.trim(), countries: regionForm.countries.trim() }];
    }
    siteSettingsService.updateSettings({ logisticsRegions: updated });
    setEditingRegionIndex(null);
    setIsNewRegionModalOpen(false);
    setRegionForm({ name: '', countries: '' });
  };

  const handleDeletePartner = (partnerName: string) => {
    if (window.confirm(`Supprimer le partenaire stratégique "${partnerName}" ?`)) {
      const updated = partners.filter(p => p !== partnerName);
      siteSettingsService.updateSettings({ logisticsPartners: updated });
    }
  };

  const handleAddPartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartnerName.trim()) return;
    if (partners.includes(newPartnerName.trim())) return;
    const updated = [...partners, newPartnerName.trim()];
    siteSettingsService.updateSettings({ logisticsPartners: updated });
    setNewPartnerName('');
    setIsAddingPartner(false);
  };

  return (
    <section className="pt-16 pb-16 bg-gray-900 text-white overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FF6600] rounded-full blur-[120px]"></div>
      </div>
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-[#FF6600]/20 text-[#FF6600] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-3 shadow-xs">
            <MapPin className="w-3.5 h-3.5" /> {siteSettings.logisticsBadge || t('logistics_badge')}
          </div>
          <h2 className="text-2xl md:text-3xl font-bold font-roboto mb-3">{siteSettings.logisticsTitle || t('logistics_title')}</h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-xs sm:text-sm md:text-base leading-relaxed">
            {siteSettings.logisticsSubtitle || t('logistics_subtitle')}
          </p>

          {isAdmin && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setRegionForm({ name: '', countries: '' });
                  setEditingRegionIndex(null);
                  setIsNewRegionModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 bg-[#FF6600] hover:bg-[#e65c00] text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter une région de livraison
              </button>
            </div>
          )}
        </div>

        {/* African Regions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
          {regions.map((region, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 p-5 rounded-2xl hover:bg-white/10 transition-all group relative">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-base font-bold text-[#FF6600] flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#FF6600] rounded-full"></div>
                  {region.name}
                </h3>
                {isAdmin && (
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      title="Modifier cette région"
                      onClick={() => {
                        setRegionForm({ name: region.name, countries: region.countries });
                        setEditingRegionIndex(i);
                        setIsNewRegionModalOpen(true);
                      }}
                      className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Supprimer cette région"
                      onClick={() => handleDeleteRegion(i)}
                      className="p-1 rounded-md bg-red-500/20 hover:bg-red-500/40 text-red-300 hover:text-red-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
                {region.countries}
              </p>
            </div>
          ))}

          {/* Full coverage badge */}
          <div className="bg-gradient-to-br from-[#FF6600] to-[#e65c00] p-5 rounded-2xl flex flex-col justify-center items-center text-center shadow-lg shadow-orange-900/20">
            <Globe className="w-8 h-8 mb-2 text-white animate-pulse" />
            <h3 className="text-base font-bold mb-1">{t('logistics_full_coverage')}</h3>
            <p className="text-white/90 text-xs">{t('logistics_full_coverage_desc')}</p>
          </div>
        </div>

        {/* Partners section */}
        <div className="bg-black/40 backdrop-blur-md p-5 sm:p-7 rounded-3xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col gap-1 text-center md:text-left">
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <h4 className="text-base font-bold">{t('logistics_partners_title')}</h4>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsAddingPartner(true)}
                  className="bg-[#003366] hover:bg-[#002244] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-md border border-white/20 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Ajouter
                </button>
              )}
            </div>
            <p className="text-gray-400 text-xs">{t('logistics_partners_desc')}</p>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6">
            {partners.map(partner => (
              <div key={partner} className="group relative inline-flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl hover:border-[#FF6600] transition-colors">
                <span className="text-sm sm:text-base font-black italic tracking-tighter text-white/90 group-hover:text-white">
                  {partner}
                </span>
                {isAdmin && (
                  <button
                    type="button"
                    title={`Supprimer ${partner}`}
                    onClick={() => handleDeletePartner(partner)}
                    className="text-gray-400 hover:text-red-400 p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Region Edit Modal */}
      {isNewRegionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-white">
                {editingRegionIndex !== null ? 'Modifier la région de livraison' : 'Nouvelle région de livraison'}
              </h3>
              <button
                type="button"
                onClick={() => setIsNewRegionModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRegion} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">Nom de la Région</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Afrique de l'Ouest"
                  value={regionForm.name}
                  onChange={(e) => setRegionForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#FF6600]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">Pays desservis (séparés par des virgules)</label>
                <textarea
                  required
                  rows={3}
                  placeholder="ex: Sénégal, Côte d'Ivoire, Mali, Guinée, Mauritanie, Burkina Faso..."
                  value={regionForm.countries}
                  onChange={(e) => setRegionForm(prev => ({ ...prev, countries: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#FF6600]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewRegionModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-gray-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#FF6600] hover:bg-[#e65c00] text-white shadow-md"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Partner Add Modal */}
      {isAddingPartner && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in fade-in">
            <h3 className="font-bold text-base text-white mb-3">Ajouter un partenaire stratégique</h3>
            <form onSubmit={handleAddPartner} className="space-y-4">
              <input
                type="text"
                required
                placeholder="ex: Bolloré Transport, Maersk, etc."
                value={newPartnerName}
                onChange={(e) => setNewPartnerName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#FF6600]"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingPartner(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-gray-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#FF6600] text-white shadow-md"
                >
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function AppLayout() {
  const location = useLocation();
  const isSupplierPortal = location.pathname.startsWith('/supplier-po/');
  const [siteSettings, setSiteSettings] = useState(() => siteSettingsService.getSettings());
  const { isAdmin } = useAuth();
  const { t } = useLanguage();

  // Footer Management Modal State for Admin
  const [isFooterModalOpen, setIsFooterModalOpen] = useState(false);
  const [footerForm, setFooterForm] = useState(() => ({
    footerBioText: siteSettings.footerBioText || '',
    footerBadges: siteSettings.footerBadges || ['MRO Certified', 'Africa Delivery'],
    footerLinksTitle: siteSettings.footerLinksTitle || 'Navigation & Sourcing',
    footerLinks: siteSettings.footerLinks || [],
    footerPaymentsTitle: siteSettings.footerPaymentsTitle || 'Paiements Sécurisés & Facturation B2B',
    footerPaymentsDesc: siteSettings.footerPaymentsDesc || '',
    footerPaymentBadges: siteSettings.footerPaymentBadges || ['PayDunya (Wave • OM • Cartes)', 'Virement Bancaire B2B'],
    footerContactTitle: siteSettings.footerContactTitle || 'Assistance & Contact B2B',
    footerContactDesc: siteSettings.footerContactDesc || '',
    footerContactEmail: siteSettings.footerContactEmail || 'contact@zone-equipements.sn',
    footerContactPhone: siteSettings.footerContactPhone || '+221 76 653 83 84 (00221766538384)',
    footerContactAddress: siteSettings.footerContactAddress || 'Dakar, Sénégal - Hub Panafricain',
    footerCopyrightText: siteSettings.footerCopyrightText || 'ZONE ÉQUIPEMENTS. Tous droits réservés.',
    footerBottomLinks: siteSettings.footerBottomLinks || []
  }));

  const [newBadgeInput, setNewBadgeInput] = useState('');
  const [newPaymentBadgeInput, setNewPaymentBadgeInput] = useState('');
  const [newLinkInput, setNewLinkInput] = useState({ label: '', url: '' });
  const [newBottomLinkInput, setNewBottomLinkInput] = useState({ label: '', url: '' });

  useEffect(() => {
    const unsub = siteSettingsService.subscribe(() => {
      const s = siteSettingsService.getSettings();
      setSiteSettings(s);
      setFooterForm({
        footerBioText: s.footerBioText || '',
        footerBadges: s.footerBadges || ['MRO Certified', 'Africa Delivery'],
        footerLinksTitle: s.footerLinksTitle || 'Navigation & Sourcing',
        footerLinks: s.footerLinks || [],
        footerPaymentsTitle: s.footerPaymentsTitle || 'Paiements Sécurisés & Facturation B2B',
        footerPaymentsDesc: s.footerPaymentsDesc || '',
        footerPaymentBadges: s.footerPaymentBadges || ['PayDunya (Wave • OM • Cartes)', 'Virement Bancaire B2B'],
        footerContactTitle: s.footerContactTitle || 'Assistance & Contact B2B',
        footerContactDesc: s.footerContactDesc || '',
        footerContactEmail: s.footerContactEmail || 'contact@zone-equipements.sn',
        footerContactPhone: s.footerContactPhone || '+221 76 653 83 84 (00221766538384)',
        footerContactAddress: s.footerContactAddress || 'Dakar, Sénégal - Hub Panafricain',
        footerCopyrightText: s.footerCopyrightText || 'ZONE ÉQUIPEMENTS. Tous droits réservés.',
        footerBottomLinks: s.footerBottomLinks || []
      });
    });
    return () => unsub();
  }, []);

  const handleSaveFooter = (e: React.FormEvent) => {
    e.preventDefault();
    siteSettingsService.updateSettings({
      footerBioText: footerForm.footerBioText,
      footerBadges: footerForm.footerBadges,
      footerLinksTitle: footerForm.footerLinksTitle,
      footerLinks: footerForm.footerLinks,
      footerPaymentsTitle: footerForm.footerPaymentsTitle,
      footerPaymentsDesc: footerForm.footerPaymentsDesc,
      footerPaymentBadges: footerForm.footerPaymentBadges,
      footerContactTitle: footerForm.footerContactTitle,
      footerContactDesc: footerForm.footerContactDesc,
      footerContactEmail: footerForm.footerContactEmail,
      footerContactPhone: footerForm.footerContactPhone,
      footerContactAddress: footerForm.footerContactAddress,
      footerCopyrightText: footerForm.footerCopyrightText,
      footerBottomLinks: footerForm.footerBottomLinks
    });
    setIsFooterModalOpen(false);
  };

  const handleDeleteFooterLink = (index: number) => {
    const currentLinks = footerForm.footerLinks || [];
    const updated = currentLinks.filter((_, i) => i !== index);
    siteSettingsService.updateSettings({ footerLinks: updated });
  };

  const handleDeleteFooterBadge = (index: number) => {
    const currentBadges = footerForm.footerBadges || [];
    const updated = currentBadges.filter((_, i) => i !== index);
    siteSettingsService.updateSettings({ footerBadges: updated });
  };

  const handleDeletePaymentBadge = (index: number) => {
    const current = footerForm.footerPaymentBadges || [];
    const updated = current.filter((_, i) => i !== index);
    siteSettingsService.updateSettings({ footerPaymentBadges: updated });
  };

  const handleDeleteBottomLink = (index: number) => {
    const current = footerForm.footerBottomLinks || [];
    const updated = current.filter((_, i) => i !== index);
    siteSettingsService.updateSettings({ footerBottomLinks: updated });
  };

  if (isSupplierPortal) {
    return (
      <Routes>
        <Route path="/supplier-po/:token" element={<SupplierPortal />} />
      </Routes>
    );
  }

  const companyName = siteSettings.companyName || 'ZONE ÉQUIPEMENTS';
  const nameParts = companyName.trim().split(/\s+/);
  const firstPart = nameParts[0] || 'ZONE';
  const restParts = nameParts.slice(1).join(' ');

  const footerBio = siteSettings.footerBioText || t('footer_desc');
  const footerBadges = siteSettings.footerBadges && siteSettings.footerBadges.length > 0 ? siteSettings.footerBadges : ['MRO Certified', 'Africa Delivery'];
  const footerLinksTitle = siteSettings.footerLinksTitle || t('footer_links');
  const footerLinks = siteSettings.footerLinks && siteSettings.footerLinks.length > 0 ? siteSettings.footerLinks : [
    { id: '1', label: t('nav_catalog'), url: '/shop' },
    { id: '2', label: t('nav_services'), url: '/services' },
    { id: '3', label: t('nav_blog_guides'), url: '/blog' },
    { id: '4', label: 'Questions Fréquentes & Support Client', url: '/faq' },
    { id: '5', label: t('nav_contact'), url: '/contact' }
  ];
  const footerPaymentsTitle = siteSettings.footerPaymentsTitle || t('footer_payments_title');
  const footerPaymentsDesc = siteSettings.footerPaymentsDesc || t('footer_payments_desc');
  const footerPaymentBadges = siteSettings.footerPaymentBadges && siteSettings.footerPaymentBadges.length > 0 ? siteSettings.footerPaymentBadges : ['PayDunya (Wave • OM • Cartes)', 'Virement Bancaire B2B'];
  const footerContactTitle = siteSettings.footerContactTitle || t('footer_contact');
  const footerContactDesc = siteSettings.footerContactDesc || t('footer_contact_desc');
  const footerEmail = siteSettings.footerContactEmail || siteSettings.companyEmail || 'contact@zone-equipements.sn';
  const footerPhone = siteSettings.footerContactPhone || siteSettings.companyPhone || '+221 76 653 83 84 (00221766538384)';
  const footerCopyright = siteSettings.footerCopyrightText || `${companyName}. ${t('footer_rights')}`;
  const footerBottomLinks = siteSettings.footerBottomLinks && siteSettings.footerBottomLinks.length > 0 ? siteSettings.footerBottomLinks : [
    { id: '1', label: t('footer_terms'), url: '/services' },
    { id: '2', label: 'Questions Fréquentes (FAQ)', url: '/faq' },
    { id: '3', label: t('footer_privacy'), url: '/contact' }
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-800 bg-gray-50 w-full max-w-full overflow-x-clip relative">
      <Header />

      {/* Main Content */}
      <main className="flex-grow w-full max-w-full overflow-x-clip">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/boutique" element={<Shop />} />
          <Route path="/catalogue" element={<Shop />} />
          <Route path="/produits" element={<Shop />} />
          <Route path="/products" element={<Shop />} />
          <Route path="/store" element={<Shop />} />
          <Route path="/services" element={<Services />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<Blog />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/questions-frequentes" element={<FaqPage />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/account" element={<Account />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/supplier-po/:token" element={<SupplierPortal />} />
          <Route path="*" element={<Shop />} />
        </Routes>
      </main>

      <NewsletterBanner />

      {/* Footer */}
      <footer id="colophon" className="site-footer ze-custom-footer w-full max-w-full overflow-x-clip relative">
        {isAdmin && (
          <div className="bg-slate-900 border-b border-slate-800 py-2.5 px-4 text-center">
            <button
              type="button"
              onClick={() => setIsFooterModalOpen(true)}
              className="inline-flex items-center gap-2 bg-[#FF6600] hover:bg-[#e65c00] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-sm transition-all"
            >
              <Pencil className="w-3.5 h-3.5" /> Gérer & Modifier tous les éléments du pied de page
            </button>
          </div>
        )}

        <div className="ze-footer-container alignwide">
          
          {/* Col 1: Brand & Presentation */}
          <div className="ze-footer-col ze-footer-brand">
            <div className="flex items-center gap-3 mb-2">
              {siteSettings.companyLogo && (
                <img src={siteSettings.companyLogo} alt={companyName} className="w-10 h-10 rounded-lg object-contain bg-white p-1" />
              )}
              <span className="ze-footer-logo">
                {firstPart} {restParts && <span className="ze-logo-orange">{restParts}</span>}
              </span>
            </div>
            <p>{footerBio}</p>
            <div className="ze-footer-badge-grid flex flex-wrap gap-2 mt-2">
              {footerBadges.map((badge, idx) => (
                <span key={idx} className="ze-f-badge inline-flex items-center gap-1 group/badge">
                  {badge}
                  {isAdmin && (
                    <button
                      type="button"
                      title="Supprimer ce badge"
                      onClick={() => handleDeleteFooterBadge(idx)}
                      className="text-white/60 hover:text-red-300 ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="ze-footer-col">
            <h4 className="ze-footer-title">{footerLinksTitle}</h4>
            <ul className="ze-footer-links">
              {footerLinks.map((link, idx) => (
                <li key={idx} className="flex items-center justify-between group/link">
                  <Link to={link.url}>{link.label}</Link>
                  {isAdmin && (
                    <button
                      type="button"
                      title="Supprimer ce lien"
                      onClick={() => handleDeleteFooterLink(idx)}
                      className="text-gray-400 hover:text-red-400 opacity-0 group-hover/link:opacity-100 transition-opacity ml-2"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Safe Payment options */}
          <div className="ze-footer-col">
            <h4 className="ze-footer-title">{footerPaymentsTitle}</h4>
            <p className="ze-footer-sm-text">{footerPaymentsDesc}</p>
            <div className="ze-payment-logos flex flex-wrap gap-2 mt-2">
              {footerPaymentBadges.map((method, idx) => (
                <span key={idx} className="ze-p-badge inline-flex items-center gap-1 group/pbadge">
                  {method}
                  {isAdmin && (
                    <button
                      type="button"
                      title="Supprimer cette mention de paiement"
                      onClick={() => handleDeletePaymentBadge(idx)}
                      className="text-gray-400 hover:text-red-500 ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* Col 4: Expert Help / Location */}
          <div className="ze-footer-col">
            <h4 className="ze-footer-title">{footerContactTitle}</h4>
            <p className="ze-footer-sm-text">{footerContactDesc}</p>
            <div className="ze-footer-contact-info flex flex-col gap-2 mt-2">
              {footerEmail && (
                <a href={`mailto:${footerEmail}`} className="ze-footer-link">
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" className="inline-block align-middle mr-2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                  {footerEmail}
                </a>
              )}
              {footerPhone && (
                <a href={`https://wa.me/${footerPhone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="ze-footer-link">
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" className="inline-block align-middle mr-2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                  {footerPhone}
                </a>
              )}
            </div>
          </div>

        </div>

        {/* System bottom copyright */}
        <div className="ze-footer-bottom">
          <div className="ze-footer-bottom-container alignwide">
            <p className="ze-copy">&copy; {new Date().getFullYear()} {footerCopyright}</p>
            <div className="ze-bottom-links">
              {footerBottomLinks.map((link, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 group/botlink">
                  <Link to={link.url}>{link.label}</Link>
                  {isAdmin && (
                    <button
                      type="button"
                      title="Supprimer ce lien"
                      onClick={() => handleDeleteBottomLink(idx)}
                      className="text-gray-400 hover:text-red-400"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Admin Footer Customization Modal */}
      {isFooterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-in fade-in text-gray-800">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-5">
              <h3 className="font-bold text-lg text-[#003366] flex items-center gap-2">
                <Pencil className="w-5 h-5 text-[#FF6600]" /> Gestion du Pied de Page (Footer)
              </h3>
              <button
                type="button"
                onClick={() => setIsFooterModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFooter} className="space-y-6">
              {/* 1. Bio & Badges */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#003366] mb-3">1. Présentation & Badges</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Texte de présentation / bio</label>
                    <textarea
                      rows={2}
                      value={footerForm.footerBioText}
                      onChange={(e) => setFooterForm(prev => ({ ...prev, footerBioText: e.target.value }))}
                      className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#FF6600]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Badges de certification</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {footerForm.footerBadges.map((b, idx) => (
                        <span key={idx} className="bg-white border border-gray-300 px-2.5 py-1 rounded-md text-xs flex items-center gap-1 font-semibold">
                          {b}
                          <button
                            type="button"
                            onClick={() => setFooterForm(prev => ({ ...prev, footerBadges: prev.footerBadges.filter((_, i) => i !== idx) }))}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nouveau badge (ex: Certifié ISO 9001)"
                        value={newBadgeInput}
                        onChange={(e) => setNewBadgeInput(e.target.value)}
                        className="flex-1 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newBadgeInput.trim()) {
                            setFooterForm(prev => ({ ...prev, footerBadges: [...prev.footerBadges, newBadgeInput.trim()] }));
                            setNewBadgeInput('');
                          }
                        }}
                        className="bg-[#003366] text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                      >
                        + Ajouter
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Navigation Links */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#003366] mb-3">2. Liens de Navigation</h4>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Titre de la colonne</label>
                  <input
                    type="text"
                    value={footerForm.footerLinksTitle}
                    onChange={(e) => setFooterForm(prev => ({ ...prev, footerLinksTitle: e.target.value }))}
                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs mb-3 font-bold"
                  />
                </div>
                <div className="space-y-2 mb-3">
                  {footerForm.footerLinks.map((link, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 text-xs">
                      <input
                        type="text"
                        value={link.label}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFooterForm(prev => ({
                            ...prev,
                            footerLinks: prev.footerLinks.map((l, i) => i === idx ? { ...l, label: val } : l)
                          }));
                        }}
                        className="flex-1 border-b border-gray-300 pb-0.5 font-medium"
                      />
                      <input
                        type="text"
                        value={link.url}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFooterForm(prev => ({
                            ...prev,
                            footerLinks: prev.footerLinks.map((l, i) => i === idx ? { ...l, url: val } : l)
                          }));
                        }}
                        className="w-32 text-gray-500 border-b border-gray-300 pb-0.5"
                      />
                      <button
                        type="button"
                        onClick={() => setFooterForm(prev => ({ ...prev, footerLinks: prev.footerLinks.filter((_, i) => i !== idx) }))}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Libellé du lien"
                    value={newLinkInput.label}
                    onChange={(e) => setNewLinkInput(prev => ({ ...prev, label: e.target.value }))}
                    className="flex-1 bg-white border border-gray-300 rounded-lg p-2 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="URL (ex: /shop)"
                    value={newLinkInput.url}
                    onChange={(e) => setNewLinkInput(prev => ({ ...prev, url: e.target.value }))}
                    className="w-36 bg-white border border-gray-300 rounded-lg p-2 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newLinkInput.label.trim() && newLinkInput.url.trim()) {
                        setFooterForm(prev => ({
                          ...prev,
                          footerLinks: [...prev.footerLinks, { id: `fl-${Date.now()}`, label: newLinkInput.label.trim(), url: newLinkInput.url.trim() }]
                        }));
                        setNewLinkInput({ label: '', url: '' });
                      }
                    }}
                    className="bg-[#003366] text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                  >
                    + Ajouter
                  </button>
                </div>
              </div>

              {/* 3. Payments & Facturation */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#003366] mb-3">3. Paiements & Badges de Règlement</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Titre de la colonne</label>
                    <input
                      type="text"
                      value={footerForm.footerPaymentsTitle}
                      onChange={(e) => setFooterForm(prev => ({ ...prev, footerPaymentsTitle: e.target.value }))}
                      className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={footerForm.footerPaymentsDesc}
                      onChange={(e) => setFooterForm(prev => ({ ...prev, footerPaymentsDesc: e.target.value }))}
                      className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Badges de méthodes de paiement</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {footerForm.footerPaymentBadges.map((p, idx) => (
                        <span key={idx} className="bg-white border border-gray-300 px-2.5 py-1 rounded-md text-xs flex items-center gap-1 font-semibold">
                          {p}
                          <button
                            type="button"
                            onClick={() => setFooterForm(prev => ({ ...prev, footerPaymentBadges: prev.footerPaymentBadges.filter((_, i) => i !== idx) }))}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nouveau badge (ex: Chèque / Traite B2B)"
                        value={newPaymentBadgeInput}
                        onChange={(e) => setNewPaymentBadgeInput(e.target.value)}
                        className="flex-1 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newPaymentBadgeInput.trim()) {
                            setFooterForm(prev => ({ ...prev, footerPaymentBadges: [...prev.footerPaymentBadges, newPaymentBadgeInput.trim()] }));
                            setNewPaymentBadgeInput('');
                          }
                        }}
                        className="bg-[#003366] text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                      >
                        + Ajouter
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Contact & Support */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#003366] mb-3">4. Contact & Coordonnées</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Email de contact</label>
                    <input
                      type="email"
                      value={footerForm.footerContactEmail}
                      onChange={(e) => setFooterForm(prev => ({ ...prev, footerContactEmail: e.target.value }))}
                      className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Téléphone / WhatsApp</label>
                    <input
                      type="text"
                      value={footerForm.footerContactPhone}
                      onChange={(e) => setFooterForm(prev => ({ ...prev, footerContactPhone: e.target.value }))}
                      className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* 5. Copyright & Liens légaux du bas */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#003366] mb-3">5. Copyright & Liens Légaux</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Ligne de copyright</label>
                    <input
                      type="text"
                      value={footerForm.footerCopyrightText}
                      onChange={(e) => setFooterForm(prev => ({ ...prev, footerCopyrightText: e.target.value }))}
                      className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Liens du bas (Conditions, Confidentialité, etc.)</label>
                    <div className="space-y-2 mb-2">
                      {footerForm.footerBottomLinks.map((link, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 text-xs">
                          <input
                            type="text"
                            value={link.label}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFooterForm(prev => ({
                                ...prev,
                                footerBottomLinks: prev.footerBottomLinks.map((l, i) => i === idx ? { ...l, label: val } : l)
                              }));
                            }}
                            className="flex-1 font-medium"
                          />
                          <input
                            type="text"
                            value={link.url}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFooterForm(prev => ({
                                ...prev,
                                footerBottomLinks: prev.footerBottomLinks.map((l, i) => i === idx ? { ...l, url: val } : l)
                              }));
                            }}
                            className="w-32 text-gray-500"
                          />
                          <button
                            type="button"
                            onClick={() => setFooterForm(prev => ({ ...prev, footerBottomLinks: prev.footerBottomLinks.filter((_, i) => i !== idx) }))}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Libellé (ex: Mentions Légales)"
                        value={newBottomLinkInput.label}
                        onChange={(e) => setNewBottomLinkInput(prev => ({ ...prev, label: e.target.value }))}
                        className="flex-1 bg-white border border-gray-300 rounded-lg p-2 text-xs"
                      />
                      <input
                        type="text"
                        placeholder="URL (ex: /contact)"
                        value={newBottomLinkInput.url}
                        onChange={(e) => setNewBottomLinkInput(prev => ({ ...prev, url: e.target.value }))}
                        className="w-36 bg-white border border-gray-300 rounded-lg p-2 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newBottomLinkInput.label.trim() && newBottomLinkInput.url.trim()) {
                            setFooterForm(prev => ({
                              ...prev,
                              footerBottomLinks: [...prev.footerBottomLinks, { id: `fbl-${Date.now()}`, label: newBottomLinkInput.label.trim(), url: newBottomLinkInput.url.trim() }]
                            }));
                            setNewBottomLinkInput({ label: '', url: '' });
                          }
                        }}
                        className="bg-[#003366] text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                      >
                        + Ajouter
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsFooterModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#FF6600] hover:bg-[#e65c00] text-white shadow-md"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Scroll to Top Arrow */}
      <ScrollToTopFloatingButton />

      {/* Floating WhatsApp Quick Action Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <a 
          href="https://wa.me/221766538384" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="bg-[#25D366] text-white p-3.5 rounded-full shadow-2xl hover:bg-[#128C7E] transition-all duration-300 hover:scale-110 flex items-center justify-center border border-white/20"
          title="Discuter directement sur WhatsApp"
        >
          <MessageCircle className="w-6 h-6" />
        </a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <CartProvider>
          <Router>
            <ScrollToTop />
            <AppLayout />
          </Router>
        </CartProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

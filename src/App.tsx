import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Menu, X, Globe, ShoppingCart, MessageCircle, Phone, User, MapPin, Shield } from 'lucide-react';
import { motion } from 'motion/react';

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

// Constants
import { AFRICA_COUNTRIES } from './constants';
import { siteSettingsService, CategoryItem } from './services/siteSettingsService';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [catOpen, setCatOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, isAdmin } = useAuth();
  const { items } = useCart();
  const { language, setLanguage, t } = useLanguage();
  const [categories, setCategories] = useState<CategoryItem[]>(() => siteSettingsService.getCategories());

  useEffect(() => {
    const unsub = siteSettingsService.subscribe(() => {
      setCategories(siteSettingsService.getCategories());
    });
    return () => unsub();
  }, []);

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
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSearchInputChange = (val: string) => {
    setSearchQuery(val);
    const onShopPage = window.location.pathname === '/shop';
    if (val.trim()) {
      navigate(`/shop?search=${encodeURIComponent(val.trim())}`, { replace: onShopPage });
    } else if (onShopPage) {
      // Clear the search param from URL if they clear the input
      navigate('/shop', { replace: true });
    }
  };

  return (
    <header className="bg-[#003366] text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20" style={{ paddingTop: '0px', paddingLeft: '0px', paddingRight: '0px', height: '80px', width: '100%', maxWidth: '1231.67px', fontSize: '16px', textAlign: 'left' }}>
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF6600] to-amber-600 flex items-center justify-center text-white shadow-md shadow-orange-950/20 border border-orange-400/30 group-hover:scale-105 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className="flex flex-col leading-none">
                <div className="flex items-center gap-1.5">
                  <span className="text-white font-black tracking-tight text-lg md:text-xl font-roboto">ZONE ÉQUIPEMENTS</span>
                  <span className="bg-[#FF6600] text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest hidden sm:inline-block">MRO</span>
                </div>
                <span className="text-[#FF6600] text-[10px] md:text-[11px] font-extrabold tracking-[0.22em] uppercase mt-1">SÉNÉGAL • AFRIQUE DE L'OUEST</span>
              </div>
            </Link>
          </div>

          <nav className="hidden md:flex flex-1 justify-between items-center px-8">
            <div className="flex items-center gap-6">
              <div className="ze-cat-dropdown-wrapper">
                <button 
                  id="zeCatBtn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCatOpen(!catOpen);
                  }}
                  className="ze-cat-dropdown-btn"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" style={{ marginRight: '8px', verticalAlign: 'middle', display: 'inline-block' }}>
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                  </svg>
                  Catalogue
                </button>
                {/* Mega Menu Dropdown identical to header.php */}
                <div 
                  id="zeMegaMenu" 
                  className={`ze-cat-mega-menu ${catOpen ? 'show-block' : ''}`}
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
                                    className="flex items-center gap-2"
                                  >
                                    <IconComponent className="w-3.5 h-3.5 text-[#FF6600] flex-shrink-0" />
                                    <span>{cat.name}</span>
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
              <Link to="/services" className="hover:text-[#FF6600] transition-colors font-bold text-xs uppercase tracking-wider">Services</Link>
              <Link to="/contact" className="hover:text-[#FF6600] transition-colors font-bold text-xs uppercase tracking-wider">Contact</Link>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-xl mx-6">
              <form onSubmit={handleSearch} className="relative">
                <input 
                  type="text" 
                  placeholder="Rechercher un produit, une marque..." 
                  className="w-full bg-white/10 border border-white/20 rounded-full py-2 px-4 pl-10 text-xs focus:bg-white focus:text-gray-900 focus:outline-none transition-all placeholder:text-white/60"
                  style={{ width: '100%' }}
                  value={searchQuery}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                />
                <button type="submit" className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Icons.Search className="w-3.5 h-3.5 text-white/50" />
                </button>
              </form>
            </div>
            
            <div className="flex items-center gap-4 border-l border-white/20 pl-6">
              <Link to="/cart" className="relative hover:text-[#FF6600] transition-colors">
                <ShoppingCart className="w-6 h-6" />
                {items.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#FF6600] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {items.reduce((acc, item) => acc + item.quantity, 0)}
                  </span>
                )}
              </Link>
              
              <Link to={user ? "/account" : "/login"} className="flex items-center gap-2 hover:text-[#FF6600] transition-colors">
                <User className="w-6 h-6" />
                <span className="text-xs font-extrabold uppercase tracking-wider hidden lg:inline">
                  {user ? (profile?.displayName || 'Mon Compte') : 'Connexion'}
                </span>
              </Link>

              {isAdmin && (
                <Link 
                  to="/admin" 
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600/20 text-[#FF6600] border border-orange-500/40 hover:bg-[#FF6600] hover:text-white transition-all text-xs font-bold uppercase tracking-wider"
                  title="Accéder au Back-Office Administrateur"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </Link>
              )}

              <div className="flex items-center gap-1">
                <Globe className="w-4 h-4 text-[#FF6600]" />
                <select 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer text-white"
                >
                  <option value="fr" className="text-gray-900">FR - Français</option>
                  <option value="en" className="text-gray-900">EN - English</option>
                  <option value="es" className="text-gray-900">ES - Español</option>
                  <option value="zh" className="text-gray-900">ZH - 中文</option>
                </select>
              </div>

              <Link to="/contact" className="bg-[#FF6600] hover:bg-orange-600 text-white uppercase text-[11px] font-black py-2.5 px-4 rounded-md transition-all whitespace-nowrap text-right" style={{ textAlign: 'right' }}>
                {t('nav_quote')}
              </Link>
            </div>
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-4">
            <Link to="/cart" className="relative">
              <ShoppingCart className="w-6 h-6" />
              {items.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#FF6600] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {items.length}
                </span>
              )}
            </Link>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white hover:text-[#FF6600] focus:outline-none"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-[#002244] border-t border-white/10">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link to="/shop" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium hover:bg-[#FF6600] hover:text-white">Catalogue</Link>
            <Link to="/services" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium hover:bg-[#FF6600] hover:text-white">Services</Link>
            <Link to="/contact" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium hover:bg-[#FF6600] hover:text-white">Contact</Link>
            <Link to={user ? "/account" : "/login"} onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium hover:bg-[#FF6600] hover:text-white">
              {user ? 'Mon Compte' : 'Connexion'}
            </Link>
            {isAdmin && (
              <Link 
                to="/admin" 
                onClick={() => setIsMenuOpen(false)} 
                className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-bold bg-orange-600/20 text-[#FF6600] border border-orange-500/30"
              >
                <Shield className="w-5 h-5" />
                <span>Back-Office Admin</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export function DeliveryLogistics() {
  const regions = [
    { name: 'Afrique de l\'Ouest', countries: 'Sénégal, Côte d\'Ivoire, Mali, Guinée, Burkina Faso, etc.' },
    { name: 'Afrique Centrale', countries: 'Cameroun, Gabon, Congo, RD Congo, Tchad, etc.' },
    { name: 'Afrique de l\'Est', countries: 'Kenya, Tanzanie, Ouganda, Éthiopie, Rwanda, etc.' },
    { name: 'Afrique Australe', countries: 'Afrique du Sud, Angola, Zambie, Zimbabwe, etc.' },
    { name: 'Maghreb', countries: 'Maroc, Algérie, Tunisie, Mauritanie.' }
  ];

  return (
    <section className="pt-24 pb-24 pl-0 bg-gray-900 text-white overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FF6600] rounded-full blur-[120px]"></div>
      </div>
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-[#FF6600]/20 text-[#FF6600] px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-4">
            <MapPin className="w-4 h-4" /> Logistique Panafricaine
          </div>
          <h2 className="text-3xl md:text-4xl font-bold font-roboto mb-6">Livraison Partout en Afrique</h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
            Zone Équipements Sénégal s'appuie sur un réseau logistique robuste pour livrer vos équipements industriels dans les zones les plus reculées du continent.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {regions.map((region, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-all group">
              <h3 className="text-xl font-bold text-[#FF6600] mb-4 flex items-center gap-3">
                <div className="w-2 h-2 bg-[#FF6600] rounded-full"></div>
                {region.name}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {region.countries}
              </p>
            </div>
          ))}
          <div className="bg-gradient-to-br from-[#FF6600] to-[#e65c00] p-8 rounded-2xl flex flex-col justify-center items-center text-center shadow-lg shadow-orange-900/20">
            <Globe className="w-12 h-12 mb-4 text-white animate-pulse" />
            <h3 className="text-xl font-bold mb-2">Couverture Totale</h3>
            <p className="text-white/80 text-sm">54 pays desservis avec suivi en temps réel.</p>
          </div>
        </div>

        <div className="bg-black/40 backdrop-blur-md p-8 rounded-3xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col gap-2">
            <h4 className="text-xl font-bold">Partenaires Stratégiques</h4>
            <p className="text-gray-400 text-sm">Nous collaborons avec les leaders mondiaux du transport.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-8 md:gap-12 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            {['DHL Express', 'Aramex', 'FedEx', 'Maersk', 'Bolloré'].map(partner => (
              <div key={partner} className="text-xl font-black italic tracking-tighter text-white">
                {partner}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <CartProvider>
        <Router>
          <ScrollToTop />
          <div className="min-h-screen flex flex-col font-sans text-gray-800 bg-gray-50">
            <Header />

            {/* Main Content */}
            <main className="flex-grow">
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
                <Route path="/contact" element={<Contact />} />
                <Route path="/login" element={<Login />} />
                <Route path="/account" element={<Account />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/product/:id" element={<ProductDetails />} />
                <Route path="/admin" element={<Admin />} />
                {/* Fallback route redirigeant vers la boutique pour éviter toute erreur 404 intempestive */}
                <Route path="*" element={<Shop />} />
              </Routes>
            </main>

            {/* Footer */}
            <footer id="colophon" className="site-footer ze-custom-footer">
              <div className="ze-footer-container alignwide">
                
                {/* Col 1: Brand & Presentation */}
                <div className="ze-footer-col ze-footer-brand">
                  <span className="ze-footer-logo">ZONE <span className="ze-logo-orange">EQUIPEMENTS</span> SÉNÉGAL</span>
                  <p>La référence au Sénégal et en Afrique de l'Ouest pour le sourcing d'équipements industriels, matériels MRO, pièces et outillages professionnels avec transparence totale.</p>
                  <div className="ze-footer-badge-grid">
                    <span className="ze-f-badge">MRO Certified</span>
                    <span className="ze-f-badge">Africa Delivery</span>
                  </div>
                </div>

                {/* Col 2: Navigation Links */}
                <div className="ze-footer-col">
                  <h4 className="ze-footer-title">Navigation</h4>
                  <ul className="ze-footer-links">
                    <li><Link to="/shop">Notre catalogue</Link></li>
                    <li><Link to="/services">Nos services MRO</Link></li>
                    <li><Link to="/contact">Demander un devis</Link></li>
                    <li><Link to="/contact">Sourcing sur-mesure</Link></li>
                  </ul>
                </div>

                {/* Col 3: Safe Payment options */}
                <div className="ze-footer-col">
                  <h4 className="ze-footer-title">Paiements Sécurisés</h4>
                  <p className="ze-footer-sm-text">Sécurisez vos transactions avec nos options de paiement flexibles adaptées aux écosystèmes africains :</p>
                  <div className="ze-payment-logos">
                    <span className="ze-p-badge" title="Orange Money">Orange Money</span>
                    <span className="ze-p-badge" title="Wave">Wave</span>
                    <span className="ze-p-badge" title="MTN Mobile Money">MTN Money</span>
                    <span className="ze-p-badge" title="Virement bancaire / Proforma">Virement</span>
                  </div>
                </div>

                {/* Col 4: Expert Help / Location */}
                <div className="ze-footer-col">
                  <h4 className="ze-footer-title">Assistance Technique</h4>
                  <p className="ze-footer-sm-text">Nos experts industriels vous accompagnent dans le choix de vos références et l'établissement de vos cotations techniques.</p>
                  <div className="ze-footer-contact-info flex flex-col gap-2">
                    <a href="mailto:zoneequipements@gmail.com" className="ze-footer-link">
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" className="inline-block align-middle mr-2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                      zoneequipements@gmail.com
                    </a>
                    <a href="https://wa.me/221766538384" target="_blank" rel="noopener noreferrer" className="ze-footer-link">
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" className="inline-block align-middle mr-2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                      +221 76 653 83 84 (00221766538384)
                    </a>
                  </div>
                </div>

              </div>

              {/* System bottom copyright/credits */}
              <div className="ze-footer-bottom">
                <div className="ze-footer-bottom-container alignwide">
                  <p className="ze-copy">&copy; {new Date().getFullYear()} Zone Équipements Sénégal. Tous droits réservés. Plateforme de fournitures industrielles & MRO.</p>
                  <div className="ze-bottom-links">
                    <Link to="/mentions-legales">Conditions Générales</Link>
                    <Link to="/politique-de-confidentialite">Confidentialité</Link>
                  </div>
                </div>
              </div>
            </footer>

            {/* Floating Chat Widget Mockup */}
            <div className="fixed bottom-6 right-6 z-50">
              <a href="https://wa.me/221766538384" target="_blank" rel="noopener noreferrer" className="bg-[#25D366] text-white p-4 rounded-full shadow-lg hover:bg-[#128C7E] transition-transform hover:scale-105 flex items-center justify-center">
                <MessageCircle className="w-6 h-6" />
              </a>
            </div>
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
    </LanguageProvider>
  );
}

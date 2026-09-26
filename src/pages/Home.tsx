import { useState, useEffect } from 'react';
import { ArrowRight, Star, ShieldCheck, Truck, Clock, Package, ChevronRight, Mountain, Sprout, HardHat, Zap, ChevronLeft, Pencil, Check, X, Plus, Image as ImageIcon, Sparkles, Sliders } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Link } from 'react-router-dom';
import { DeliveryLogistics } from '../App';
import { siteSettingsService, SectorItem, CategoryItem, BrandItem, SiteSettings } from '../services/siteSettingsService';
import { handleImageError, resolveImageUrl, DEFAULT_SECTOR_IMAGE, DEFAULT_HERO_IMAGE, DEFAULT_PRODUCT_IMAGE } from '../constants';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ImageUploadInput } from '../components/ImageUploadInput';
import { ConfirmModal } from '../components/admin/ConfirmModal';
import { ADMIN_EMAILS } from '../AuthContext';
import { useLanguage } from '../LanguageContext';

export default function Home() {
  const { t } = useLanguage();
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(siteSettingsService.getSettings());
  const [sectors, setSectors] = useState<SectorItem[]>(siteSettingsService.getSectors());
  const [categories, setCategories] = useState<CategoryItem[]>(siteSettingsService.getCategories());
  const [brands, setBrands] = useState<BrandItem[]>(siteSettingsService.getBrands());

  // Admin Quick Edit on Home
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingSector, setEditingSector] = useState<SectorItem | null>(null);
  const [isNewSector, setIsNewSector] = useState(false);
  const [sectorForm, setSectorForm] = useState({ name: '', desc: '', img: '' });
  const [editingHero, setEditingHero] = useState(false);
  const [heroForm, setHeroForm] = useState({ title: '', subtitle: '', bgImage: '' });
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

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
    };

    window.addEventListener('ze_settings_updated', handleSettingsUpdate);

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
      unsub();
    };
  }, []);

  const getVisibleItems = () => {
    if (windowWidth >= 1024) return 3;
    if (windowWidth >= 768) return 2;
    return 1;
  };

  const visibleItems = getVisibleItems();
  const testimonials = [
    { name: 'Ibrahima D.', role: 'Directeur de Maintenance - Mine d\'Or de Sadiola (Mali)', text: 'Le sourcing de nos pompes d\'exhaure s\'est fait de manière extrêmement réactive. La livraison sur site a été gérée de bout en bout malgré la complexité des douanes. Un partenaire MRO précieux !' },
    { name: 'Mamadou S.', role: 'Responsable Achats - Cimenterie de Dakar (Sénégal)', text: 'Avoir accès aux roulements SKF d\'origine certifiée en moins de 5 jours nous a évité un arrêt de production majeur. L\'accompagnement technique de leurs ingénieurs est remarquable.' },
    { name: 'Sylvie K.', role: 'Directrice Technique - Complexe Agroalimentaire (Côte d\'Ivoire)', text: 'La flexibilité de paiement par Mobile Money africain et l\'émission rapide de nos factures proforma facilitent énormément nos budgets de fournitures récurrents.' }
  ];

  const nextTestimonial = () => setTestimonialIndex((prev) => (prev + 1) % testimonials.length);
  const prevTestimonial = () => setTestimonialIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);

  return (
    <div className="flex flex-col pt-0">
      {/* Hero Section */}
      <section className="relative bg-[#003366] text-white py-24 lg:py-32 overflow-hidden">
        <div 
          className="absolute inset-0 opacity-20 bg-cover bg-center mix-blend-overlay"
          style={{ backgroundImage: `url('${resolveImageUrl(siteSettings.heroBgImage, DEFAULT_HERO_IMAGE)}')` }}
        ></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="max-w-3xl mx-auto">
            {isAdmin && (
              <div className="mb-4 inline-flex items-center gap-2 bg-slate-900/80 text-amber-300 border border-amber-500/40 px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md shadow-lg">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Mode Administrateur Actif</span>
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
                  Modifier le Hero (Titre & Arrière-plan)
                </button>
              </div>
            )}
            <h1 className="text-3xl md:text-5xl font-bold font-roboto leading-tight mb-6">
              {siteSettings.heroTitle}
            </h1>
            <p className="text-lg text-gray-300 mb-8 font-sans leading-relaxed">
              {siteSettings.heroSubtitle}
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/shop" className="bg-[#FF6600] hover:bg-[#e65c00] text-white px-8 py-4 rounded-md font-bold text-lg transition-all flex items-center gap-2 shadow-lg shadow-orange-900/20">
                {t('explore_catalog')} <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/services" className="bg-white/10 hover:bg-white/20 text-white border border-white/30 px-8 py-4 rounded-md font-bold text-lg transition-all backdrop-blur-sm">
                {t('request_proforma')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-0 bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
              <div className="bg-blue-50 p-3 rounded-lg text-[#003366]">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{t('feature_certified_quality')}</h3>
                <p className="text-sm text-gray-500">{t('feature_certified_quality_sub')}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
              <div className="bg-orange-50 p-3 rounded-lg text-[#FF6600]">
                <Truck className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{t('feature_integrated_logistics')}</h3>
                <p className="text-sm text-gray-500">{t('feature_integrated_logistics_sub')}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
              <div className="bg-green-50 p-3 rounded-lg text-green-600">
                <Clock className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{t('feature_expert_support')}</h3>
                <p className="text-sm text-gray-500">{t('feature_expert_support_sub')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <DeliveryLogistics />

      {/* Sectors */}
      <section className="pt-[10px] pb-[10px] bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            {isAdmin && (
              <div className="mb-4 inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-900 px-4 py-2 rounded-full text-xs font-bold shadow-sm flex-wrap justify-center">
                <Sparkles className="w-4 h-4 text-[#FF6600]" />
                <span>Gestion Rapide de l'Accueil : Cliquez sur le crayon ✏️ d'un secteur pour changer son image ou son titre</span>
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
                <Link
                  to="/admin?tab=catalog"
                  className="bg-[#FF6600] hover:bg-[#e65c00] text-white px-3 py-1 rounded-lg text-[11px] flex items-center gap-1 font-bold shadow-sm transition-all"
                >
                  <Sliders className="w-3.5 h-3.5" /> Administration Complète
                </Link>
              </div>
            )}
            <h2 className="text-2xl font-bold font-roboto text-[#003366] mb-4">Secteurs d'Activité</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Nous fournissons des équipements spécialisés répondant aux normes les plus strictes de chaque industrie.</p>
          </div>

          {saveSuccessMsg && (
            <div className="max-w-md mx-auto mb-6 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 justify-center shadow-sm animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {sectors.map((sector, i) => {
              const sectorImg = resolveImageUrl(sector.img, DEFAULT_SECTOR_IMAGE);
              return (
                <div 
                  key={sector.id || i}
                  className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group border border-gray-100 flex flex-col relative"
                >
                  <div className="h-44 overflow-hidden relative bg-slate-900">
                    <img 
                      src={sectorImg} 
                      alt={sector.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                      onError={(e) => handleImageError(e, DEFAULT_SECTOR_IMAGE)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#003366]/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                      <p className="text-white text-[10px] font-medium leading-tight">{sector.desc}</p>
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
                        className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-white/95 hover:bg-white text-slate-900 shadow-lg border border-slate-200 flex items-center justify-center transition-all hover:scale-110"
                      >
                        <Pencil className="w-4 h-4 text-[#003366]" />
                      </button>
                    )}
                  </div>
                  <Link 
                    to={`/shop?sector=${encodeURIComponent(sector.name)}`}
                    className="p-4 text-center flex-grow flex flex-col justify-center"
                  >
                    <h3 className="text-sm font-bold text-[#003366] mb-1 group-hover:text-[#FF6600] transition-colors">{sector.name}</h3>
                    <div className="flex items-center justify-center gap-1 text-[#FF6600] text-[9px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">
                      Explorer <ArrowRight className="w-2.5 h-2.5" />
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pages Categories Section dynamically rendered from siteSettingsService */}
      <section className="ze-categories alignwide text-center">
        <div className="max-w-7xl mx-auto pl-[32px] pr-[32px] pt-[0px] pb-[0px] ml-[0px]">
          <div className="ze-section-title">
            <h2>Nos Catégories</h2>
            <p>Plus de {categories.length} catégories d'équipements pour tous vos besoins MRO. Sourcing de précision d'origine constructeur.</p>
          </div>

          <div className="ze-categories-mega-grid mt-[45px] text-left border-0">
            {categories.map((cat, i) => {
              const IconComponent = (Icons as any)[cat.icon] || Icons.Package;
              return (
                <div key={cat.name || i} className={`ze-cat-box cursor-pointer group ${i === categories.length - 1 ? 'text-left' : ''}`}>
                  <div className="ze-cb-icon">
                    <IconComponent className="w-4 h-4 text-white" />
                  </div>
                  <div className="ze-cb-details">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">📦 {cat.brands}</span>
                    <h4 className="font-extrabold text-[15px] text-[#003366] transition-colors group-hover:text-[#FF6600]">{cat.name}</h4>
                    <p className="text-[13px] text-[#556677] leading-relaxed font-normal">{cat.description}</p>
                    <Link to={`/shop?category=${encodeURIComponent(cat.name)}`} className="text-[11.5px] text-[#FF6600] font-extrabold flex items-center gap-1 group-hover:translate-x-1 duration-200 transition-all font-sans">
                      Explorer &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* High Trust Brands */}
      <section className="pt-[10px] pb-[10px] bg-gray-50 border-t border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-[20px]" style={{ paddingTop: '20px' }}>
          <div className="ze-section-title">
            <h2>Marques de Confiance</h2>
            <p>Accédez aux constructeurs leaders mondiaux garantissant des performances MRO optimales pour vos lignes de production.</p>
          </div>
          
          <div className="ze-brands-grid text-center">
            {brands.map((brand, i) => {
              const IconComponent = (Icons as any)[brand.iconName] || Icons.ShieldCheck;
              return (
                <Link
                  key={brand.name || i}
                  to={`/shop?brand=${encodeURIComponent(brand.name)}`}
                  className="ze-brand-card hover:border-[#003366] transition-all group p-3 bg-white rounded-lg border border-gray-200 flex flex-col items-center justify-center min-h-[75px]"
                >
                  <IconComponent className="w-5 h-5 text-gray-400 group-hover:text-[#FF6600] transition-colors mb-1" />
                  <span className="font-black text-gray-900 text-xs tracking-wider group-hover:text-[#003366]">{brand.name}</span>
                  <span className="text-[9px] text-gray-400 font-medium">{brand.sub}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials (Témoignages Clients) with interactive sliding arrows */}
      <section className="ze-testimonials alignwide pt-[20px] pb-[20px]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="ze-section-title text-center">
            <h2>Témoignages Clients</h2>
            <p>Découvrez pourquoi de nombreuses entreprises industrielles africaines font confiance à Zone Équipements Sénégal chaque jour.</p>
          </div>

          <div className="relative px-0 md:px-12">
            {/* Left Circular Navigation Arrow button */}
            <button 
              onClick={prevTestimonial}
              className="absolute -left-2 md:-left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full border border-gray-200 bg-white text-[#003366] hover:bg-[#FF6600] hover:text-white hover:border-[#FF6600] flex items-center justify-center transition-all duration-200 shadow-md z-10"
              aria-label="Témoignage précédent"
            >
              <Icons.ChevronLeft className="w-5 h-5 stroke-[2.5]" />
            </button>

            {/* Responsive Active Testimonials Viewport Grid matching d'origine base model */}
            <div className="ze-testimonials-grid">
              {Array.from({ length: visibleItems }).map((_, i) => {
                const currentIdx = (testimonialIndex + i) % testimonials.length;
                const t = testimonials[currentIdx];
                return (
                  <div key={currentIdx} className="ze-testimonial-card">
                    <div className="ze-t-header">
                      <div className="ze-t-user">
                        <strong>{t.name}</strong>
                        <span>{t.role}</span>
                      </div>
                    </div>
                    <p className="ze-t-feedback">"{t.text}"</p>
                    <div className="ze-t-rating">
                      <span>⭐</span><span>⭐</span><span>⭐</span><span>⭐</span><span>⭐</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Circular Navigation Arrow button */}
            <button 
              onClick={nextTestimonial}
              className="absolute -right-2 md:-right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full border border-gray-200 bg-white text-[#003366] hover:bg-[#FF6600] hover:text-white hover:border-[#FF6600] flex items-center justify-center transition-all duration-200 shadow-md z-10"
              aria-label="Témoignage suivant"
            >
              <Icons.ChevronRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* Pagination dots for better visual control */}
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: testimonials.length }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setTestimonialIndex(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  testimonialIndex === idx 
                    ? 'w-7 bg-[#FF6600]' 
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
                aria-label={`Aller au témoignage ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 8. LATEST ARTICLES (DERNIERS ARTICLES) */}
      <section className="ze-articles alignwide">
        <div className="ze-section-title text-center mb-12">
          <h2>Derniers Articles</h2>
          <p>Restez informé des meilleures pratiques et innovations industrielles pour optimiser vos installations en Afrique.</p>
        </div>
        
        <div className="ze-articles-grid animate-in fade-in slide-in-from-bottom-5 duration-500">
          {[
            {
              title: "Comment optimiser la vie de vos moteurs électriques en climat tropical ?",
              date: "Mis à jour le 23 Mars 2026",
              category: "Maintenance technique",
              description: "Découvrez les stratégies de lubrification clés et l'environnement de refroidissement adéquat pour préserver vos rotors.",
              img: "https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=600&auto=format&fit=crop&q=80"
            },
            {
              title: "Guide : Roulements rigides standards VS roulements rotulés SKF",
              date: "Mis à jour le 15 Avril 2026",
              category: "Comparatif Matériel",
              description: "Quels types de roulements choisir selon les charges radiales et axiales de vos tapis roulants miniers ?",
              img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80"
            },
            {
              title: "EPI Miniers : Guide des nouvelles certifications de sécurité antichute",
              date: "Mis à jour le 02 Mai 2026",
              category: "Sécurité & EPI",
              description: "Sélection de harnais, casques et chaussures normés pour garantir zéro accident lors des extractions lourdes.",
              img: "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=600&auto=format&fit=crop&q=80"
            }
          ].map((post, i) => (
            <article key={i} className="ze-article-card">
              <Link to="/blog" className="block overflow-hidden bg-slate-900 aspect-video">
                <img 
                  src={post.img} 
                  alt={post.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                  onError={(e) => handleImageError(e, DEFAULT_PRODUCT_IMAGE)}
                />
              </Link>
              <div className="ze-article-body">
                <span className="ze-article-tag">{post.category}</span>
                <h3>
                  <Link to="/blog">{post.title}</Link>
                </h3>
                <p>{post.description}</p>
                <span className="ze-article-date">{post.date}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 9. INDUSTRIAL FAQ */}
      <section className="ze-faq alignwide">
        <div className="ze-section-title text-center mb-12">
          <h2>Questions Fréquentes</h2>
          <p>Tout savoir sur le sourcing et la logistique pour l'Afrique.</p>
        </div>
        
        <div className="ze-faq-grid animate-in fade-in slide-in-from-bottom-5 duration-500 delay-150">
          {[
            { q: "Quels sont vos délais de livraison en Afrique ?", a: "Nos délais varient de 3 à 7 jours ouvrés en express (aérien) et de 15 à 30 jours pour le fret maritime selon le pays et la complexité douanière de la cargaison." },
            { q: "Acceptiez-vous les règlements par Mobile Money ?", a: "Tout à fait. Nous acceptons Wave, Orange Money, Free Money, et MTN Money pour faciliter vos transactions instantanées nationales et internationales MRO." },
            { q: "Comment obtenir un devis proforma pour notre entreprise ?", a: "C'est très simple : remplissez le formulaire sur notre page Contact ou cliquez sur le bouton de sourcing sur mesure. Nos techniciens vous répondront en moins de 24h avec une offre détaillée." }
          ].map((faq, i) => (
            <div key={i} className="ze-faq-item">
              <h4 className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px', color: '#FF6600' }}><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                {faq.q}
              </h4>
              <p>{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* QUICK SECTOR EDIT MODAL (ADMIN) */}
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
                <p className="text-xs text-slate-400">Modifiez instantanément l'image affichée sur la page d'accueil</p>
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
                      if (window.confirm(`Supprimer définitivement le secteur "${editingSector.name}" ?`)) {
                        siteSettingsService.deleteSector(editingSector.id);
                        setEditingSector(null);
                        setSaveSuccessMsg(`Secteur "${editingSector.name}" supprimé.`);
                        setTimeout(() => setSaveSuccessMsg(null), 4000);
                      }
                    }}
                    className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60 rounded-xl text-xs font-bold transition-colors"
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

      {/* QUICK HERO EDIT MODAL (ADMIN) */}
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

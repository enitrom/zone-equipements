import React, { useState, useEffect } from 'react';
import { Calendar, User, ArrowRight, ArrowLeft, Clock, BookOpen, CheckCircle2, Truck, Plane, Ship, ShieldCheck, Search, Pencil, Sparkles, Phone } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { siteSettingsService, ArticleItem, SiteSettings } from '../services/siteSettingsService';
import { handleImageError, DEFAULT_PRODUCT_IMAGE } from '../constants';
import { useAuth } from '../AuthContext';

export default function Blog() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [articles, setArticles] = useState<ArticleItem[]>(() => siteSettingsService.getArticles());
  const [settings, setSettings] = useState<SiteSettings>(() => siteSettingsService.getSettings());
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    return siteSettingsService.subscribe(() => {
      setArticles(siteSettingsService.getArticles());
      setSettings(siteSettingsService.getSettings());
    });
  }, []);

  const categories = ['Tous', ...Array.from(new Set(articles.map(a => a.category).filter(Boolean)))];

  const activeArticle = slug
    ? articles.find(a => a.slug === slug || a.id === slug)
    : null;

  const filteredArticles = articles.filter(a => {
    const matchCat = selectedCategory === 'Tous' || a.category === selectedCategory;
    const q = searchTerm.trim().toLowerCase();
    const matchSearch = !q ||
      a.title.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q) ||
      (a.content || '').toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  // Render formatted markdown-like paragraphs & headings cleanly
  const renderArticleContent = (rawContent: string) => {
    const blocks = (rawContent || '').split(/\n\n+/);
    return blocks.map((block, idx) => {
      const trimmed = block.trim();
      if (!trimmed) return null;

      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-xl font-extrabold text-[#003366] mt-8 mb-3 flex items-center gap-2 border-l-4 border-[#FF6600] pl-3">
            {trimmed.replace(/^###\s+/, '')}
          </h3>
        );
      }

      if (trimmed.startsWith('## ')) {
        return (
          <h2 key={idx} className="text-2xl font-black text-[#003366] mt-10 mb-4">
            {trimmed.replace(/^##\s+/, '')}
          </h2>
        );
      }

      const lines = trimmed.split('\n');
      const isBulletList = lines.every(l => l.trim().startsWith('- ') || l.trim().startsWith('• '));
      if (isBulletList) {
        return (
          <ul key={idx} className="space-y-2.5 my-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
            {lines.map((line, lIdx) => {
              const cleanLine = line.trim().replace(/^[-•]\s+/, '');
              const boldSplit = cleanLine.split(/\*\*(.*?)\*\*/g);
              return (
                <li key={lIdx} className="flex items-start gap-2.5 text-gray-700 text-sm md:text-base leading-relaxed">
                  <CheckCircle2 className="w-5 h-5 text-[#FF6600] flex-shrink-0 mt-0.5" />
                  <span>
                    {boldSplit.map((part, pIdx) =>
                      pIdx % 2 === 1 ? <strong key={pIdx} className="text-gray-900 font-bold">{part}</strong> : part
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        );
      }

      const boldParts = trimmed.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={idx} className="text-gray-700 text-base leading-relaxed mb-4">
          {boldParts.map((part, pIdx) =>
            pIdx % 2 === 1 ? <strong key={pIdx} className="text-gray-900 font-bold">{part}</strong> : part
          )}
        </p>
      );
    });
  };

  if (activeArticle) {
    const related = articles.filter(a => a.id !== activeArticle.id).slice(0, 3);
    return (
      <div className="bg-gray-50 min-h-screen py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb & Back */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
              <Link to="/" className="hover:text-[#003366]">Accueil</Link>
              <span>/</span>
              <Link to="/blog" className="hover:text-[#003366]">Derniers Articles & Guides</Link>
              <span>/</span>
              <span className="text-[#FF6600] truncate max-w-xs">{activeArticle.title}</span>
            </div>
            <div className="flex items-center gap-3">
              {isAdmin && (
                <Link
                  to="/admin?tab=catalog-structure&sub=articles"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#003366] text-white text-xs font-bold hover:bg-[#FF6600] transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> Éditer cet article
                </Link>
              )}
              <button
                onClick={() => navigate('/blog')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 text-xs font-bold hover:border-[#003366] hover:text-[#003366] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Tous les articles
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Concrete Article Content */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="aspect-video bg-slate-900 relative overflow-hidden">
                <img
                  src={activeArticle.img}
                  alt={activeArticle.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => handleImageError(e, DEFAULT_PRODUCT_IMAGE)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/20 to-transparent flex flex-col justify-end p-6 md:p-8">
                  <span className="inline-block w-fit bg-[#FF6600] text-white text-xs font-black uppercase tracking-wider px-3 py-1 rounded-md mb-3">
                    {activeArticle.category}
                  </span>
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white leading-tight">
                    {activeArticle.title}
                  </h1>
                </div>
              </div>

              <div className="p-6 md:p-8">
                {/* Meta bar */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 pb-6 mb-6 border-b border-gray-100">
                  <span className="flex items-center gap-1.5 font-semibold text-gray-700">
                    <User className="w-4 h-4 text-[#FF6600]" />
                    {activeArticle.author || "Ingénierie & Sourcing ZONE ÉQUIPEMENTS"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#003366]" />
                    {activeArticle.date}
                  </span>
                  {activeArticle.readTime && (
                    <span className="flex items-center gap-1.5 bg-blue-50 text-[#003366] px-2.5 py-1 rounded-full font-bold">
                      <Clock className="w-3.5 h-3.5" />
                      {activeArticle.readTime}
                    </span>
                  )}
                </div>

                {/* Executive summary box */}
                <div className="bg-amber-50/70 border-l-4 border-[#FF6600] p-4 rounded-r-xl mb-6">
                  <p className="text-sm font-bold text-[#003366] uppercase tracking-wider mb-1">
                    Synthèse Technique & Opérationnelle
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed font-medium">
                    {activeArticle.description}
                  </p>
                </div>

                {/* Full Article Body */}
                <div className="prose max-w-none">
                  {renderArticleContent(activeArticle.content || activeArticle.description)}
                </div>

                {/* Bottom CTA Box */}
                <div className="mt-10 bg-gradient-to-r from-[#003366] to-[#002244] text-white rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-widest text-[#FF6600]">
                      Besoin d'accompagnement technique ?
                    </span>
                    <h4 className="text-xl font-black mt-1 mb-2">
                      Sourcez vos équipements certifiés avec livraison DDP
                    </h4>
                    <p className="text-xs md:text-sm text-blue-100 leading-relaxed">
                      Nos ingénieurs valident vos références constructeurs, calculent le fret optimal (AIR ou SEA) et assurent l'identification de vos colis jusqu'à Dakar.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
                    <Link
                      to="/shop"
                      className="bg-[#FF6600] hover:bg-orange-600 text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-xl text-center transition-colors shadow-lg"
                    >
                      Voir le Catalogue
                    </Link>
                    <Link
                      to="/contact"
                      className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-xl text-center transition-colors"
                    >
                      Demander un Devis
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Concrete Useful Sidebar */}
            <div className="space-y-6">
              {/* Barème Fret Rapide AIR vs SEA */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-base font-black text-[#003366] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-[#FF6600]" />
                  Repères Logistiques (AIR / SEA)
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-100">
                    <div className="flex items-center justify-between font-black text-sky-900 mb-1">
                      <span className="flex items-center gap-1.5">
                        <Plane className="w-4 h-4 text-sky-600" /> CODE FRET : AIR
                      </span>
                      <span className="bg-sky-600 text-white px-2 py-0.5 rounded text-[10px]">
                        {settings.airFreightDuration || '8 à 15 jours'}
                      </span>
                    </div>
                    <p className="text-sky-800 leading-relaxed">
                      Idéal pour pièces critiques ≤ 20 kg (roulements, automates, capteurs, EPI). Tarif indicatif : <strong>{(settings.airFreightPerKg || 7000).toLocaleString('fr-FR')} FCFA / kg</strong>.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-100">
                    <div className="flex items-center justify-between font-black text-teal-900 mb-1">
                      <span className="flex items-center gap-1.5">
                        <Ship className="w-4 h-4 text-teal-600" /> CODE FRET : SEA
                      </span>
                      <span className="bg-teal-600 text-white px-2 py-0.5 rounded text-[10px]">
                        {settings.seaFreightDuration || '20 à 40 jours'}
                      </span>
                    </div>
                    <p className="text-teal-800 leading-relaxed">
                      Recommandé pour machines lourdes, groupes électrogènes, pompes et moteurs &gt; 20 kg. Tarif indicatif : <strong>{(settings.seaFreightPerKg || 1800).toLocaleString('fr-FR')} FCFA / kg</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Traçabilité Colis & Entrepôt */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-base font-black text-[#003366] uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  Traçabilité & Marquage Colis
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed mb-3">
                  Pour garantir la bonne réception et l'orientation directe vers Dakar, chaque expédition fournisseur est identifiée par les coordonnées de l'entrepôt et le code d'acheminement (AIR / SEA).
                </p>
                <div className="bg-slate-900 text-white p-3.5 rounded-xl font-mono text-xs">
                  <div className="text-slate-400 text-[10px] uppercase mb-1">Exemple d'étiquette colis fournisseur :</div>
                  <div className="text-amber-400 font-bold">CMD-2026-0012 | AIR</div>
                </div>
              </div>

              {/* Assistance Directe */}
              <div className="bg-orange-50 rounded-2xl border border-orange-200 p-6">
                <h4 className="font-black text-[#003366] text-sm uppercase mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#FF6600]" />
                  Bureau d'Études & Sourcing
                </h4>
                <p className="text-xs text-gray-700 leading-relaxed mb-4">
                  Vous avez une liste d'équipements ou une référence introuvable ? Envoyez votre demande à nos ingénieurs.
                </p>
                <Link
                  to="/services"
                  className="w-full block text-center bg-[#FF6600] hover:bg-orange-600 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-colors"
                >
                  Ouvrir le Calculateur & Sourcing
                </Link>
              </div>
            </div>
          </div>

          {/* Related Articles */}
          {related.length > 0 && (
            <div className="mt-14">
              <h3 className="text-xl font-black text-[#003366] mb-6">Autres Guides & Articles Recommandés</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {related.map((post) => (
                  <Link
                    key={post.id}
                    to={`/blog/${post.slug || post.id}`}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col"
                  >
                    <div className="aspect-video bg-slate-900 overflow-hidden">
                      <img
                        src={post.img}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                        onError={(e) => handleImageError(e, DEFAULT_PRODUCT_IMAGE)}
                      />
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#FF6600] bg-orange-50 px-2.5 py-1 rounded">
                          {post.category}
                        </span>
                        <h4 className="font-bold text-[#003366] group-hover:text-[#FF6600] transition-colors mt-2 mb-2 line-clamp-2">
                          {post.title}
                        </h4>
                        <p className="text-xs text-gray-600 line-clamp-2">{post.description}</p>
                      </div>
                      <span className="text-xs font-extrabold text-[#FF6600] mt-3 inline-flex items-center gap-1">
                        Lire le guide <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-orange-100 text-[#FF6600] px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider mb-3">
            <BookOpen className="w-4 h-4" /> Centre de Ressources Industrielles MRO
          </div>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <h1 className="text-3xl md:text-4xl font-black font-roboto text-[#003366]">
              Derniers Articles & Guides Techniques Concrets
            </h1>
            {isAdmin && (
              <Link
                to="/admin?tab=catalog-structure&sub=articles"
                className="inline-flex items-center gap-1.5 bg-[#003366] hover:bg-[#FF6600] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Ajouter / Éditer des articles
              </Link>
            )}
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto mt-3">
            Dossiers pratiques, comparatifs d'équipements, procédures de maintenance tropicalisée et guides logistiques (Fret AIR & SEA) pour vos opérations en Afrique de l'Ouest.
          </p>
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#003366] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un guide technique..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-[#FF6600]"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredArticles.map((article) => (
            <article key={article.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-all group">
              <Link to={`/blog/${article.slug || article.id}`} className="h-52 overflow-hidden relative block bg-slate-900">
                <img
                  src={article.img}
                  alt={article.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                  onError={(e) => handleImageError(e, DEFAULT_PRODUCT_IMAGE)}
                />
                <div className="absolute top-4 left-4 bg-[#FF6600] text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                  {article.category}
                </div>
                {article.readTime && (
                  <div className="absolute bottom-3 right-3 bg-slate-900/80 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                    ⏱ {article.readTime}
                  </div>
                )}
              </Link>
              <div className="p-6 flex-grow flex flex-col">
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#003366]" />
                    {article.date}
                  </div>
                  <div className="flex items-center gap-1 truncate">
                    <User className="w-3.5 h-3.5 text-[#FF6600]" />
                    <span className="truncate">{article.author || 'Expert MRO'}</span>
                  </div>
                </div>
                <h2 className="text-lg font-extrabold font-roboto text-[#003366] mb-3 line-clamp-2 group-hover:text-[#FF6600] transition-colors">
                  <Link to={`/blog/${article.slug || article.id}`}>
                    {article.title}
                  </Link>
                </h2>
                <p className="text-gray-600 text-sm mb-6 flex-grow line-clamp-3 leading-relaxed">
                  {article.description}
                </p>
                <Link
                  to={`/blog/${article.slug || article.id}`}
                  className="text-[#FF6600] font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 hover:gap-2.5 transition-all mt-auto pt-4 border-t border-gray-100"
                >
                  Consulter le guide complet <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Layers, Check, X, Image as ImageIcon, Sparkles, FolderTree, Tag, Globe, ArrowRight, MessageSquareQuote, BookOpen, HelpCircle, Star } from 'lucide-react';
import * as Icons from 'lucide-react';
import { siteSettingsService, SectorItem, CategoryItem, BrandItem, TestimonialItem, ArticleItem, FaqItem } from '../../services/siteSettingsService';
import { handleImageError, resolveImageUrl, DEFAULT_SECTOR_IMAGE, DEFAULT_PRODUCT_IMAGE } from '../../constants';
import { ImageUploadInput } from '../ImageUploadInput';
import { ConfirmModal } from './ConfirmModal';

interface Props {
  onNotify?: (msg: string) => void;
}

export const CatalogStructureManager: React.FC<Props> = ({ onNotify }) => {
  const [subTab, setSubTab] = useState<'categories' | 'sectors' | 'brands' | 'testimonials' | 'articles' | 'faqs'>(() => {
    if (typeof window !== 'undefined') {
      const sub = new URLSearchParams(window.location.search).get('sub');
      if (sub === 'testimonials' || sub === 'articles' || sub === 'faqs' || sub === 'categories' || sub === 'brands') {
        return sub;
      }
    }
    return 'sectors';
  });
  
  const [sectors, setSectors] = useState<SectorItem[]>(siteSettingsService.getSectors());
  const [categories, setCategories] = useState<CategoryItem[]>(siteSettingsService.getCategories());
  const [brands, setBrands] = useState<BrandItem[]>(siteSettingsService.getBrands());
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>(siteSettingsService.getTestimonials());
  const [articles, setArticles] = useState<ArticleItem[]>(siteSettingsService.getArticles());
  const [faqs, setFaqs] = useState<FaqItem[]>(siteSettingsService.getFaqs());

  // Confirm Modal state
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

  // Editing state for Sector
  const [editingSector, setEditingSector] = useState<SectorItem | null>(null);
  const [showSectorModal, setShowSectorModal] = useState(false);
  const [sectorForm, setSectorForm] = useState<Partial<SectorItem>>({
    name: '',
    desc: '',
    img: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80'
  });

  // Editing state for Category
  const [editingCat, setEditingCat] = useState<CategoryItem | null>(null);
  const [showCatModal, setShowCatModal] = useState(false);
  const [catForm, setCatForm] = useState<{
    name: string;
    icon: string;
    description: string;
    brands: string;
    subcategoriesStr: string;
  }>({
    name: '',
    icon: 'Package',
    description: '',
    brands: '',
    subcategoriesStr: ''
  });

  // Editing state for Brand
  const [editingBrand, setEditingBrand] = useState<BrandItem | null>(null);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [brandForm, setBrandForm] = useState<Partial<BrandItem>>({
    name: '',
    sub: '',
    iconName: 'Shield'
  });

  // Editing state for Testimonial
  const [editingTestimonial, setEditingTestimonial] = useState<TestimonialItem | null>(null);
  const [showTestimonialModal, setShowTestimonialModal] = useState(false);
  const [testimonialForm, setTestimonialForm] = useState<{
    name: string;
    role: string;
    text: string;
    rating: number;
  }>({
    name: '',
    role: '',
    text: '',
    rating: 5
  });

  // Editing state for Article
  const [editingArticle, setEditingArticle] = useState<ArticleItem | null>(null);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [articleForm, setArticleForm] = useState<{
    title: string;
    category: string;
    date: string;
    readTime: string;
    author: string;
    img: string;
    description: string;
    content: string;
  }>({
    title: '',
    category: 'Maintenance technique',
    date: '',
    readTime: '6 min de lecture',
    author: 'Ingénierie & Sourcing ZONE ÉQUIPEMENTS',
    img: 'https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=800&auto=format&fit=crop&q=80',
    description: '',
    content: ''
  });

  // Editing state for FAQ
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [faqForm, setFaqForm] = useState<{ q: string; a: string }>({ q: '', a: '' });

  const reloadAll = () => {
    setSectors(siteSettingsService.getSectors());
    setCategories(siteSettingsService.getCategories());
    setBrands(siteSettingsService.getBrands());
    setTestimonials(siteSettingsService.getTestimonials());
    setArticles(siteSettingsService.getArticles());
    setFaqs(siteSettingsService.getFaqs());
  };

  useEffect(() => {
    const handler = () => reloadAll();
    window.addEventListener('ze_settings_updated', handler);
    return () => window.removeEventListener('ze_settings_updated', handler);
  }, []);

  // ================= SECTEURS =================
  const handleOpenNewSector = () => {
    setEditingSector(null);
    setSectorForm({
      name: '',
      desc: '',
      img: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80'
    });
    setShowSectorModal(true);
  };

  const handleOpenEditSector = (sec: SectorItem) => {
    setEditingSector(sec);
    setSectorForm({ ...sec });
    setShowSectorModal(true);
  };

  const handleSaveSector = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectorForm.name?.trim()) {
      alert("Le nom du secteur est requis");
      return;
    }

    if (editingSector) {
      siteSettingsService.updateSector(editingSector.id, sectorForm);
      if (onNotify) onNotify(`Secteur "${sectorForm.name}" mis à jour avec succès.`);
    } else {
      siteSettingsService.addSector({
        name: sectorForm.name,
        desc: sectorForm.desc || '',
        img: sectorForm.img || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80'
      });
      if (onNotify) onNotify(`Nouveau secteur "${sectorForm.name}" ajouté avec succès.`);
    }

    setShowSectorModal(false);
    reloadAll();
  };

  const handleDeleteSector = (sec: SectorItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Supprimer ce secteur',
      message: `Confirmez-vous la suppression définitive du secteur industriel "${sec.name}" ?`,
      onConfirm: () => {
        siteSettingsService.deleteSector(sec.id);
        if (onNotify) onNotify(`Secteur "${sec.name}" supprimé.`);
        reloadAll();
      },
    });
  };

  // ================= CATÉGORIES =================
  const handleOpenNewCategory = () => {
    setEditingCat(null);
    setCatForm({
      name: '',
      icon: 'Package',
      description: '',
      brands: 'MRO & Pièces',
      subcategoriesStr: 'Général, Pièces détachées, Accessoires'
    });
    setShowCatModal(true);
  };

  const handleOpenEditCategory = (cat: CategoryItem) => {
    setEditingCat(cat);
    setCatForm({
      name: cat.name,
      icon: cat.icon || 'Package',
      description: cat.description || '',
      brands: cat.brands || '',
      subcategoriesStr: (cat.subcategories || []).map(s => typeof s === 'string' ? s : s.name).join(', ')
    });
    setShowCatModal(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name.trim()) {
      alert("Le nom de la catégorie est requis");
      return;
    }

    const subcategories = catForm.subcategoriesStr
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(name => ({ name, icon: 'Package' }));

    if (editingCat) {
      siteSettingsService.updateCategory(editingCat.name, {
        name: catForm.name,
        icon: catForm.icon,
        description: catForm.description,
        brands: catForm.brands,
        subcategories
      });
      if (onNotify) onNotify(`Catégorie "${catForm.name}" mise à jour.`);
    } else {
      siteSettingsService.addCategory({
        name: catForm.name,
        icon: catForm.icon,
        description: catForm.description,
        brands: catForm.brands,
        subcategories
      });
      if (onNotify) onNotify(`Nouvelle catégorie "${catForm.name}" créée.`);
    }

    setShowCatModal(false);
    reloadAll();
  };

  const handleDeleteCategory = (cat: CategoryItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Supprimer cette catégorie',
      message: `Confirmez-vous la suppression définitive de la catégorie "${cat.name}" ?`,
      onConfirm: () => {
        siteSettingsService.deleteCategory(cat.name);
        if (onNotify) onNotify(`Catégorie "${cat.name}" supprimée.`);
        reloadAll();
      },
    });
  };

  // ================= MARQUES =================
  const handleOpenNewBrand = () => {
    setEditingBrand(null);
    setBrandForm({
      name: '',
      sub: 'Matériel Industriel Certifié',
      iconName: 'Shield'
    });
    setShowBrandModal(true);
  };

  const handleOpenEditBrand = (brand: BrandItem) => {
    setEditingBrand(brand);
    setBrandForm({ ...brand });
    setShowBrandModal(true);
  };

  const handleSaveBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandForm.name?.trim()) {
      alert("Le nom de la marque est requis");
      return;
    }

    if (editingBrand) {
      siteSettingsService.updateBrand(editingBrand.name, brandForm);
      if (onNotify) onNotify(`Marque "${brandForm.name}" modifiée.`);
    } else {
      siteSettingsService.addBrand({
        name: brandForm.name.toUpperCase(),
        sub: brandForm.sub || 'Matériel Industriel',
        iconName: brandForm.iconName || 'Shield'
      });
      if (onNotify) onNotify(`Nouvelle marque "${brandForm.name}" enregistrée.`);
    }

    setShowBrandModal(false);
    reloadAll();
  };

  const handleDeleteBrand = (brand: BrandItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Supprimer cette marque',
      message: `Confirmez-vous la suppression définitive de la marque "${brand.name}" ?`,
      onConfirm: () => {
        siteSettingsService.deleteBrand(brand.name);
        if (onNotify) onNotify(`Marque "${brand.name}" retirée.`);
        reloadAll();
      },
    });
  };

  // ================= TÉMOIGNAGES CLIENTS =================
  const handleOpenNewTestimonial = () => {
    setEditingTestimonial(null);
    setTestimonialForm({ name: '', role: '', text: '', rating: 5 });
    setShowTestimonialModal(true);
  };

  const handleOpenEditTestimonial = (item: TestimonialItem) => {
    setEditingTestimonial(item);
    setTestimonialForm({
      name: item.name,
      role: item.role,
      text: item.text,
      rating: item.rating || 5
    });
    setShowTestimonialModal(true);
  };

  const handleSaveTestimonial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testimonialForm.name.trim() || !testimonialForm.text.trim()) return;
    if (editingTestimonial) {
      siteSettingsService.updateTestimonial(editingTestimonial.id, {
        name: testimonialForm.name.trim(),
        role: testimonialForm.role.trim(),
        text: testimonialForm.text.trim(),
        rating: Number(testimonialForm.rating) || 5
      });
      if (onNotify) onNotify(`Témoignage de "${testimonialForm.name}" mis à jour.`);
    } else {
      siteSettingsService.addTestimonial({
        name: testimonialForm.name.trim(),
        role: testimonialForm.role.trim(),
        text: testimonialForm.text.trim(),
        rating: Number(testimonialForm.rating) || 5
      });
      if (onNotify) onNotify(`Nouveau témoignage client ajouté.`);
    }
    setShowTestimonialModal(false);
    reloadAll();
  };

  const handleDeleteTestimonial = (item: TestimonialItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Supprimer ce témoignage client',
      message: `Confirmez-vous la suppression du témoignage de "${item.name}" ?`,
      onConfirm: () => {
        siteSettingsService.deleteTestimonial(item.id);
        if (onNotify) onNotify(`Témoignage supprimé.`);
        reloadAll();
      }
    });
  };

  // ================= DERNIERS ARTICLES & GUIDES =================
  const handleOpenNewArticle = () => {
    setEditingArticle(null);
    setArticleForm({
      title: '',
      category: 'Maintenance technique',
      date: `Mis à jour le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`,
      readTime: '6 min de lecture',
      author: 'Ingénierie & Sourcing ZONE ÉQUIPEMENTS',
      img: 'https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=800&auto=format&fit=crop&q=80',
      description: '',
      content: '### 1. Contexte Opérationnel\nDécrivez ici les enjeux techniques ou logistiques.\n\n### 2. Recommandations Clés\n- **Point 1** : Détail pratique.\n- **Point 2** : Détail pratique.'
    });
    setShowArticleModal(true);
  };

  const handleOpenEditArticle = (item: ArticleItem) => {
    setEditingArticle(item);
    setArticleForm({
      title: item.title,
      category: item.category,
      date: item.date,
      readTime: item.readTime || '6 min de lecture',
      author: item.author || 'Ingénierie & Sourcing ZONE ÉQUIPEMENTS',
      img: item.img,
      description: item.description,
      content: item.content || item.description
    });
    setShowArticleModal(true);
  };

  const handleSaveArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleForm.title.trim()) return;
    if (editingArticle) {
      siteSettingsService.updateArticle(editingArticle.id, {
        title: articleForm.title.trim(),
        category: articleForm.category.trim() || 'Maintenance technique',
        date: articleForm.date.trim() || editingArticle.date,
        readTime: articleForm.readTime.trim() || '5 min de lecture',
        author: articleForm.author.trim(),
        img: articleForm.img.trim() || DEFAULT_PRODUCT_IMAGE,
        description: articleForm.description.trim(),
        content: articleForm.content.trim()
      });
      if (onNotify) onNotify(`Article "${articleForm.title}" mis à jour.`);
    } else {
      siteSettingsService.addArticle({
        title: articleForm.title.trim(),
        category: articleForm.category.trim() || 'Maintenance technique',
        date: articleForm.date.trim(),
        readTime: articleForm.readTime.trim() || '5 min de lecture',
        author: articleForm.author.trim(),
        img: articleForm.img.trim() || DEFAULT_PRODUCT_IMAGE,
        description: articleForm.description.trim(),
        content: articleForm.content.trim()
      });
      if (onNotify) onNotify(`Nouvel article "${articleForm.title}" publié.`);
    }
    setShowArticleModal(false);
    reloadAll();
  };

  const handleDeleteArticle = (item: ArticleItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Supprimer cet article',
      message: `Confirmez-vous la suppression de l'article "${item.title}" ?`,
      onConfirm: () => {
        siteSettingsService.deleteArticle(item.id);
        if (onNotify) onNotify(`Article supprimé.`);
        reloadAll();
      }
    });
  };

  // ================= QUESTIONS FRÉQUENTES (FAQ) =================
  const handleOpenNewFaq = () => {
    setEditingFaq(null);
    setFaqForm({ q: '', a: '' });
    setShowFaqModal(true);
  };

  const handleOpenEditFaq = (item: FaqItem) => {
    setEditingFaq(item);
    setFaqForm({ q: item.q, a: item.a });
    setShowFaqModal(true);
  };

  const handleSaveFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqForm.q.trim() || !faqForm.a.trim()) return;
    if (editingFaq) {
      siteSettingsService.updateFaq(editingFaq.id, {
        q: faqForm.q.trim(),
        a: faqForm.a.trim()
      });
      if (onNotify) onNotify(`Question FAQ mise à jour.`);
    } else {
      siteSettingsService.addFaq({
        q: faqForm.q.trim(),
        a: faqForm.a.trim()
      });
      if (onNotify) onNotify(`Nouvelle question FAQ ajoutée.`);
    }
    setShowFaqModal(false);
    reloadAll();
  };

  const handleDeleteFaq = (item: FaqItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Supprimer cette question FAQ',
      message: `Confirmez-vous la suppression de la question "${item.q}" ?`,
      onConfirm: () => {
        siteSettingsService.deleteFaq(item.id);
        if (onNotify) onNotify(`Question FAQ supprimée.`);
        reloadAll();
      }
    });
  };

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      {/* Sub tabs navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:flex xl:flex-wrap gap-2 w-full xl:w-auto">
          <button
            onClick={() => setSubTab('sectors')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              subTab === 'sectors'
                ? 'bg-[#FF6600] text-white shadow-md shadow-orange-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800/60'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Secteurs d'Activité ({sectors.length})</span>
          </button>
          
          <button
            onClick={() => setSubTab('categories')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              subTab === 'categories'
                ? 'bg-[#FF6600] text-white shadow-md shadow-orange-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800/60'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Catégories & Sous-Catégories ({categories.length})</span>
          </button>

          <button
            onClick={() => setSubTab('brands')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              subTab === 'brands'
                ? 'bg-[#FF6600] text-white shadow-md shadow-orange-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800/60'
            }`}
          >
            <Tag className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Marques ({brands.length})</span>
          </button>

          <button
            onClick={() => setSubTab('testimonials')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              subTab === 'testimonials'
                ? 'bg-[#FF6600] text-white shadow-md shadow-orange-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800/60'
            }`}
          >
            <MessageSquareQuote className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Témoignages Clients ({testimonials.length})</span>
          </button>

          <button
            onClick={() => setSubTab('articles')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              subTab === 'articles'
                ? 'bg-[#FF6600] text-white shadow-md shadow-orange-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Derniers Articles ({articles.length})</span>
          </button>

          <button
            onClick={() => setSubTab('faqs')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              subTab === 'faqs'
                ? 'bg-[#FF6600] text-white shadow-md shadow-orange-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800/60'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Questions Fréquentes ({faqs.length})</span>
          </button>
        </div>

        {subTab === 'sectors' && (
          <button
            onClick={handleOpenNewSector}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouveau Secteur
          </button>
        )}

        {subTab === 'categories' && (
          <button
            onClick={handleOpenNewCategory}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouvelle Catégorie
          </button>
        )}

        {subTab === 'brands' && (
          <button
            onClick={handleOpenNewBrand}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouvelle Marque
          </button>
        )}

        {subTab === 'testimonials' && (
          <button
            onClick={handleOpenNewTestimonial}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouveau Témoignage
          </button>
        )}

        {subTab === 'articles' && (
          <button
            onClick={handleOpenNewArticle}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouvel Article / Guide
          </button>
        )}

        {subTab === 'faqs' && (
          <button
            onClick={handleOpenNewFaq}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouvelle Question FAQ
          </button>
        )}
      </div>

      {/* 1. SECTEURS TAB */}
      {subTab === 'sectors' && (
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#FF6600]" />
                Gestion des Secteurs & Images de la Page d'Accueil
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Modifiez facilement les photos, descriptions et noms des secteurs affichés sur la page d'accueil.
              </p>
            </div>
            <span className="text-xs px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-mono">
              {sectors.length} secteurs actifs
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sectors.map((sec) => {
              const secImg = resolveImageUrl(sec.img, DEFAULT_SECTOR_IMAGE);
              return (
                <div 
                  key={sec.id}
                  className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col justify-between group hover:border-slate-700 transition-all shadow-sm"
                >
                  <div>
                    <div className="h-36 relative overflow-hidden bg-slate-950">
                      <img 
                        src={secImg} 
                        alt={sec.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                        onError={(e) => handleImageError(e, DEFAULT_SECTOR_IMAGE)}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-2.5">
                        <span className="text-[10px] font-mono text-slate-300 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800">
                          {sec.id}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h4 className="font-bold text-white text-sm mb-1">{sec.name}</h4>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{sec.desc}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenEditSector(sec)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1 transition-all"
                      title="Modifier image et texte"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDeleteSector(sec)}
                      className="p-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 rounded-lg text-xs font-medium transition-all"
                      title="Supprimer ce secteur"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. CATÉGORIES TAB */}
      {subTab === 'categories' && (
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-[#FF6600]" />
                Catalogue : Catégories et Sous-Catégories
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Gérez l'arborescence complète des catégories d'équipements et leurs sous-segments.
              </p>
            </div>
            <span className="text-xs px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-mono">
              {categories.length} catégories
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => {
              const IconComp = (Icons as any)[cat.icon] || Icons.Package;
              return (
                <div 
                  key={cat.name}
                  className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col justify-between hover:border-slate-700 transition-all min-w-0 max-w-full overflow-hidden"
                >
                  <div className="min-w-0">
                    <div className="flex items-start gap-3 mb-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-[#003366] text-white flex items-center justify-center shrink-0">
                        <IconComp className="w-4 h-4 text-orange-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-white text-sm leading-tight break-words">{cat.name}</h4>
                        <span className="text-[10px] text-slate-400 font-medium block break-words">{cat.brands}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 mb-3 line-clamp-2 leading-relaxed break-words">{cat.description}</p>

                    {cat.subcategories && cat.subcategories.length > 0 && (
                      <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/60 mb-3 max-w-full overflow-hidden">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                          Sous-catégories ({cat.subcategories.length}) :
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-w-full">
                          {cat.subcategories.map((sc, i) => (
                            <span key={i} className="text-[10px] bg-slate-800 text-slate-200 border border-slate-700/60 px-2 py-0.5 rounded-md break-words max-w-full">
                              {typeof sc === 'string' ? sc : sc.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => handleOpenEditCategory(cat)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1 transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="p-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 rounded-lg text-xs font-medium transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. MARQUES TAB */}
      {subTab === 'brands' && (
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#FF6600]" />
                Marques Industrielles Référencées
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Gérez les marques et fabricants partenaires mis en avant sur la boutique.
              </p>
            </div>
            <span className="text-xs px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-mono">
              {brands.length} marques
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {brands.map((brand) => {
              const IconComp = (Icons as any)[brand.iconName] || Icons.Shield;
              return (
                <div 
                  key={brand.name}
                  className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-col justify-between items-center text-center hover:border-slate-700 group transition-all"
                >
                  <div className="flex flex-col items-center pt-2">
                    <IconComp className="w-5 h-5 text-orange-400 mb-1.5" />
                    <span className="font-black text-white text-xs tracking-wider">{brand.name}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{brand.sub}</span>
                  </div>

                  <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-800/80 w-full justify-center">
                    <button
                      onClick={() => handleOpenEditBrand(brand)}
                      className="p-1 text-slate-400 hover:text-blue-400 rounded transition-colors"
                      title="Modifier"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteBrand(brand)}
                      className="p-1 text-slate-400 hover:text-red-400 rounded transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. TÉMOIGNAGES CLIENTS TAB */}
      {subTab === 'testimonials' && (
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageSquareQuote className="w-5 h-5 text-[#FF6600]" />
                Témoignages Clients (Page d'Accueil)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Ajoutez, modifiez ou supprimez les avis clients affichés dans le carrousel de la page d'accueil.
              </p>
            </div>
            <span className="text-xs px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-mono">
              {testimonials.length} témoignages actifs
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testimonials.map((t) => (
              <div key={t.id} className="bg-slate-900 rounded-xl border border-slate-800 p-5 flex flex-col justify-between hover:border-slate-700 transition-all">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h4 className="font-bold text-white text-sm">{t.name}</h4>
                      <span className="text-xs text-orange-400 font-semibold">{t.role}</span>
                    </div>
                    <div className="flex items-center gap-0.5 text-amber-400 text-xs">
                      {Array.from({ length: t.rating || 5 }).map((_, idx) => (
                        <span key={idx}>⭐</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 italic leading-relaxed mt-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                    "{t.text}"
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-800/80">
                  <button
                    onClick={() => handleOpenEditTestimonial(t)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-blue-400" /> Modifier
                  </button>
                  <button
                    onClick={() => handleDeleteTestimonial(t)}
                    className="px-2.5 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 rounded-lg text-xs font-bold transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. DERNIERS ARTICLES & GUIDES TAB */}
      {subTab === 'articles' && (
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#FF6600]" />
                Derniers Articles & Guides Pratiques (Accueil & Blog)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Gérez les articles affichés dans "Derniers Articles" et leurs pages complètes de lecture (`/blog/:slug`).
              </p>
            </div>
            <span className="text-xs px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-mono">
              {articles.length} articles publiés
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.map((art) => (
              <div key={art.id} className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-all">
                <div>
                  <div className="h-40 bg-slate-950 relative overflow-hidden">
                    <img
                      src={art.img}
                      alt={art.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => handleImageError(e, DEFAULT_PRODUCT_IMAGE)}
                    />
                    <span className="absolute top-2.5 left-2.5 bg-[#FF6600] text-white text-[10px] font-black uppercase px-2.5 py-1 rounded">
                      {art.category}
                    </span>
                    {art.readTime && (
                      <span className="absolute bottom-2 right-2 bg-slate-950/80 text-slate-200 text-[10px] font-bold px-2 py-0.5 rounded">
                        ⏱ {art.readTime}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="text-[10px] text-slate-400 mb-1">{art.date}</div>
                    <h4 className="font-bold text-white text-sm mb-2 line-clamp-2">{art.title}</h4>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{art.description}</p>
                  </div>
                </div>
                <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <a
                    href={`/blog/${art.slug || art.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-orange-400 hover:underline flex items-center gap-1"
                  >
                    Voir la page <ArrowRight className="w-3 h-3" />
                  </a>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditArticle(art)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1 transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-blue-400" /> Modifier
                    </button>
                    <button
                      onClick={() => handleDeleteArticle(art)}
                      className="p-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 rounded-lg text-xs font-medium transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. QUESTIONS FRÉQUENTES (FAQ) TAB */}
      {subTab === 'faqs' && (
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#FF6600]" />
                Questions Fréquentes (FAQ Industrielle)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Ajoutez, modifiez ou supprimez les questions/réponses affichées en bas de la page d'accueil.
              </p>
            </div>
            <span className="text-xs px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-mono">
              {faqs.length} questions actives
            </span>
          </div>

          <div className="space-y-3">
            {faqs.map((faq) => (
              <div key={faq.id} className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition-all">
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-[#FF6600] shrink-0" />
                    {faq.q}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed pl-6">{faq.a}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => handleOpenEditFaq(faq)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-blue-400" /> Modifier
                  </button>
                  <button
                    onClick={() => handleDeleteFaq(faq)}
                    className="px-2.5 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 rounded-lg text-xs font-bold transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL SECTEUR (IMAGE MODIFIABLE) */}
      {showSectorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              onClick={() => setShowSectorModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">
              {editingSector ? `Modifier le Secteur "${editingSector.name}"` : 'Nouveau Secteur d\'Activité'}
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Définissez le nom, la description et l'URL de l'image réelle affichée sur la page d'accueil.
            </p>

            <form onSubmit={handleSaveSector} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Nom du Secteur *
                </label>
                <input
                  type="text"
                  value={sectorForm.name || ''}
                  onChange={(e) => setSectorForm({ ...sectorForm, name: e.target.value })}
                  placeholder="Ex: Mines & Carrières, Énergie..."
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6600]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Description succincte
                </label>
                <textarea
                  rows={2}
                  value={sectorForm.desc || ''}
                  onChange={(e) => setSectorForm({ ...sectorForm, desc: e.target.value })}
                  placeholder="Description des équipements de ce secteur..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6600]"
                />
              </div>

              <ImageUploadInput
                label="Image du Secteur (Photo Haute Qualité) *"
                value={sectorForm.img || ''}
                onChange={(newUrl) => setSectorForm({ ...sectorForm, img: newUrl })}
                placeholder="https://images.unsplash.com/... ou importez un fichier"
                helperText="Collez un lien direct d'image (Unsplash, CDN) ou téléversez votre propre fichier d'image depuis votre appareil."
              />

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowSectorModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#FF6600] hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-lg"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CATÉGORIE */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCatModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">
              {editingCat ? `Modifier la Catégorie "${editingCat.name}"` : 'Nouvelle Catégorie'}
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Configurez le titre, l'icône, les marques de référence et les sous-catégories.
            </p>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Nom de la Catégorie *
                </label>
                <input
                  type="text"
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  placeholder="Ex: Électroportatif, Pompes Industrielles..."
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6600]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Nom Icône Lucide
                  </label>
                  <input
                    type="text"
                    value={catForm.icon}
                    onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })}
                    placeholder="Ex: Package, Zap, Wrench, Shield"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6600]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Marques phares
                  </label>
                  <input
                    type="text"
                    value={catForm.brands}
                    onChange={(e) => setCatForm({ ...catForm, brands: e.target.value })}
                    placeholder="Ex: Makita, Bosch, SKF"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6600]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={catForm.description}
                  onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                  placeholder="Description technique du matériel dans cette catégorie..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6600]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Sous-Catégories (Séparées par des virgules)
                </label>
                <textarea
                  rows={3}
                  value={catForm.subcategoriesStr}
                  onChange={(e) => setCatForm({ ...catForm, subcategoriesStr: e.target.value })}
                  placeholder="Perceuses, Meuleuses, Visseuses à choc, Scies circulaires..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6600]"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Séparez chaque sous-catégorie par une virgule.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#FF6600] hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-lg"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MARQUE */}
      {showBrandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setShowBrandModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">
              {editingBrand ? `Modifier la Marque "${editingBrand.name}"` : 'Nouvelle Marque Industrielle'}
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Ajoutez un constructeur ou fabricant certifié.
            </p>

            <form onSubmit={handleSaveBrand} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Nom de la Marque *
                </label>
                <input
                  type="text"
                  value={brandForm.name || ''}
                  onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                  placeholder="Ex: MAKITA, SKF, SCHNEIDER..."
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6600]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Sous-titre / Spécialité
                </label>
                <input
                  type="text"
                  value={brandForm.sub || ''}
                  onChange={(e) => setBrandForm({ ...brandForm, sub: e.target.value })}
                  placeholder="Ex: Outillage Pro, Roulements & Transmission..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6600]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Icône Lucide
                </label>
                <input
                  type="text"
                  value={brandForm.iconName || ''}
                  onChange={(e) => setBrandForm({ ...brandForm, iconName: e.target.value })}
                  placeholder="Zap, Shield, Cpu, Settings, Wrench..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6600]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowBrandModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#FF6600] hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-lg"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TÉMOIGNAGE CLIENT */}
      {showTestimonialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              onClick={() => setShowTestimonialModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-1">
              {editingTestimonial ? 'Modifier le Témoignage Client' : 'Ajouter un Témoignage Client'}
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Cet avis sera affiché dans la section Témoignages Clients de la page d'accueil.
            </p>
            <form onSubmit={handleSaveTestimonial} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Nom du Client / Responsable *
                  </label>
                  <input
                    type="text"
                    required
                    value={testimonialForm.name}
                    onChange={(e) => setTestimonialForm({ ...testimonialForm, name: e.target.value })}
                    placeholder="Ex: Ibrahima D."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6600]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Note (Étoiles)
                  </label>
                  <select
                    value={testimonialForm.rating}
                    onChange={(e) => setTestimonialForm({ ...testimonialForm, rating: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6600]"
                  >
                    <option value={5}>5 ⭐ (Excellent)</option>
                    <option value={4}>4 ⭐ (Très bien)</option>
                    <option value={3}>3 ⭐ (Bien)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Fonction & Entreprise / Pays *
                </label>
                <input
                  type="text"
                  required
                  value={testimonialForm.role}
                  onChange={(e) => setTestimonialForm({ ...testimonialForm, role: e.target.value })}
                  placeholder="Ex: Directeur de Maintenance - Cimenterie de Dakar (Sénégal)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6600]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Commentaire / Témoignage *
                </label>
                <textarea
                  rows={4}
                  required
                  value={testimonialForm.text}
                  onChange={(e) => setTestimonialForm({ ...testimonialForm, text: e.target.value })}
                  placeholder="Saisissez le retour d'expérience du client..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6600]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTestimonialModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#FF6600] hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-lg"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ARTICLE / GUIDE CONCRET */}
      {showArticleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowArticleModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-1">
              {editingArticle ? `Modifier l'Article "${editingArticle.title}"` : 'Nouvel Article & Guide Technique'}
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Rédigez le résumé affiché sur l'accueil et le contenu complet de la page dédiée (`/blog/...`). Utilisez `### Titre` pour créer des sous-sections et `- Texte` pour des listes à puces.
            </p>
            <form onSubmit={handleSaveArticle} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Titre de l'Article *
                </label>
                <input
                  type="text"
                  required
                  value={articleForm.title}
                  onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                  placeholder="Ex: Comment optimiser la vie de vos moteurs électriques en climat tropical ?"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6600]"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Catégorie
                  </label>
                  <input
                    type="text"
                    value={articleForm.category}
                    onChange={(e) => setArticleForm({ ...articleForm, category: e.target.value })}
                    placeholder="Ex: Maintenance technique"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#FF6600]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Temps de lecture
                  </label>
                  <input
                    type="text"
                    value={articleForm.readTime}
                    onChange={(e) => setArticleForm({ ...articleForm, readTime: e.target.value })}
                    placeholder="Ex: 6 min de lecture"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#FF6600]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Date affichée
                  </label>
                  <input
                    type="text"
                    value={articleForm.date}
                    onChange={(e) => setArticleForm({ ...articleForm, date: e.target.value })}
                    placeholder="Ex: Mis à jour le 10 Mai 2026"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#FF6600]"
                  />
                </div>
              </div>

              <ImageUploadInput
                label="Image de couverture de l'article"
                value={articleForm.img}
                onChange={(val) => setArticleForm({ ...articleForm, img: val })}
                placeholder="https://images.unsplash.com/... ou téléversez une image"
              />

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Résumé d'accroche (affiché sur les cartes d'aperçu) *
                </label>
                <textarea
                  rows={2}
                  required
                  value={articleForm.description}
                  onChange={(e) => setArticleForm({ ...articleForm, description: e.target.value })}
                  placeholder="Résumé court de 1 à 2 phrases..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#FF6600]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Contenu complet de la page de l'article (Dossier Technique Concret) *
                </label>
                <textarea
                  rows={10}
                  required
                  value={articleForm.content}
                  onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
                  placeholder="Utilisez ### Titre pour les sous-titres et - Point pour les listes..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono leading-relaxed focus:outline-none focus:border-[#FF6600]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowArticleModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#FF6600] hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-lg"
                >
                  Enregistrer l'Article
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL QUESTION FRÉQUENTE (FAQ) */}
      {showFaqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              onClick={() => setShowFaqModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-1">
              {editingFaq ? 'Modifier la Question Fréquente' : 'Nouvelle Question Fréquente (FAQ)'}
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Renseignez la question et sa réponse précise pour vos clients B2B.
            </p>
            <form onSubmit={handleSaveFaq} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Question *
                </label>
                <input
                  type="text"
                  required
                  value={faqForm.q}
                  onChange={(e) => setFaqForm({ ...faqForm, q: e.target.value })}
                  placeholder="Ex: Quels sont vos délais de livraison en Afrique ?"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6600]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Réponse détaillée *
                </label>
                <textarea
                  rows={4}
                  required
                  value={faqForm.a}
                  onChange={(e) => setFaqForm({ ...faqForm, a: e.target.value })}
                  placeholder="Expliquez clairement la procédure, les délais ou les moyens de paiement..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6600]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowFaqModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#FF6600] hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-lg"
                >
                  Enregistrer
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
};

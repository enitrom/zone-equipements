import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Layers, Check, X, Image as ImageIcon, Sparkles, FolderTree, Tag, Globe, ArrowRight } from 'lucide-react';
import * as Icons from 'lucide-react';
import { siteSettingsService, SectorItem, CategoryItem, BrandItem } from '../../services/siteSettingsService';
import { handleImageError, resolveImageUrl, DEFAULT_SECTOR_IMAGE } from '../../constants';
import { ImageUploadInput } from '../ImageUploadInput';
import { ConfirmModal } from './ConfirmModal';

interface Props {
  onNotify?: (msg: string) => void;
}

export const CatalogStructureManager: React.FC<Props> = ({ onNotify }) => {
  const [subTab, setSubTab] = useState<'categories' | 'sectors' | 'brands'>('sectors');
  
  const [sectors, setSectors] = useState<SectorItem[]>(siteSettingsService.getSectors());
  const [categories, setCategories] = useState<CategoryItem[]>(siteSettingsService.getCategories());
  const [brands, setBrands] = useState<BrandItem[]>(siteSettingsService.getBrands());

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

  const reloadAll = () => {
    setSectors(siteSettingsService.getSectors());
    setCategories(siteSettingsService.getCategories());
    setBrands(siteSettingsService.getBrands());
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

  return (
    <div className="space-y-6">
      {/* Sub tabs navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-950 p-2 rounded-xl border border-slate-800">
        <div className="flex gap-2">
          <button
            onClick={() => setSubTab('sectors')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              subTab === 'sectors'
                ? 'bg-[#FF6600] text-white shadow-md shadow-orange-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Secteurs d'Activité ({sectors.length})
          </button>
          
          <button
            onClick={() => setSubTab('categories')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              subTab === 'categories'
                ? 'bg-[#FF6600] text-white shadow-md shadow-orange-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            Catégories & Sous-Catégories ({categories.length})
          </button>

          <button
            onClick={() => setSubTab('brands')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              subTab === 'brands'
                ? 'bg-[#FF6600] text-white shadow-md shadow-orange-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Marques Constructeurs ({brands.length})
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
                  className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col justify-between hover:border-slate-700 transition-all"
                >
                  <div>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-[#003366] text-white flex items-center justify-center shrink-0">
                        <IconComp className="w-4 h-4 text-orange-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm leading-tight">{cat.name}</h4>
                        <span className="text-[10px] text-slate-400 font-medium">{cat.brands}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 mb-3 line-clamp-2 leading-relaxed">{cat.description}</p>

                    {cat.subcategories && cat.subcategories.length > 0 && (
                      <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800/60 mb-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                          Sous-catégories ({cat.subcategories.length}) :
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {cat.subcategories.map((sc, i) => (
                            <span key={i} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
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

import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  BarChart3, Package, ShoppingCart, Users, Shield, Plus, Link as LinkIcon, 
  Search, Filter, Trash2, Edit, Check, AlertTriangle, ArrowUpRight, 
  Printer, RefreshCw, X, DollarSign, 
  TrendingUp, Truck, Layers, FileText, CheckCircle2, Eye, Globe, Settings,
  Image as ImageIcon, MessageSquare, Send, Mail, Phone, ExternalLink, HelpCircle,
  ShieldCheck, LogIn, AlertCircle, LogOut, FileSpreadsheet
} from 'lucide-react';
import { 
  catalogService, ExtendedProduct, ProductVariantItem, Order, Supplier, AuditLog, EXCHANGE_RATES, cleanBrand 
} from '../services/catalogService';
import { getProductImageUrl, handleImageError, DEFAULT_PRODUCT_IMAGE } from '../constants';
import { siteSettingsService, CategoryItem } from '../services/siteSettingsService';
import { useAuth } from '../AuthContext';
import { auth } from '../firebase';
import { CatalogStructureManager } from '../components/admin/CatalogStructureManager';
import { SupplierManagerModal } from '../components/admin/SupplierManagerModal';
import { PurchaseOrderModal } from '../components/admin/PurchaseOrderModal';
import { DailySupplierDispatchModal } from '../components/admin/DailySupplierDispatchModal';
import { ClientNotificationModal } from '../components/admin/ClientNotificationModal';
import { SiteSettingsManager } from '../components/admin/SiteSettingsManager';
import { ImageUploadInput } from '../components/ImageUploadInput';
import { ConfirmModal } from '../components/admin/ConfirmModal';

export default function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<'finance' | 'catalog' | 'orders' | 'suppliers' | 'audit' | 'security'>('finance');
  const [catalogSubTab, setCatalogSubTab] = useState<'products' | 'structure'>('products');
  
  // Data states
  const [products, setProducts] = useState<ExtendedProduct[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState(catalogService.getFinancialStats());
  const [categories, setCategories] = useState<CategoryItem[]>(() => siteSettingsService.getCategories());

  // Search & Filters for Catalog
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'online' | 'draft'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportLinkModal, setShowImportLinkModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ExtendedProduct | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  
  // Supplier management modal
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Purchase Order modal
  const [showPoModal, setShowPoModal] = useState(false);
  const [selectedPoSupplier, setSelectedPoSupplier] = useState<Supplier | null>(null);

  // Daily Supplier Dispatch modal
  const [showDailyDispatchModal, setShowDailyDispatchModal] = useState(false);

  // Client notification modal
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationOrder, setNotificationOrder] = useState<Order | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<Order['status'] | undefined>();

  // Toast message
  const [toastMsg, setToastMsg] = useState('');

  // Link import tool state
  const [importUrl, setImportUrl] = useState('');
  const [useJsRender, setUseJsRender] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [parsedLinkData, setParsedLinkData] = useState<any>(null);
  const [importForm, setImportForm] = useState<{
    name: string;
    brand: string;
    category: string;
    supplierPrice: number;
    supplierCurrency: 'USD' | 'EUR' | 'CNY' | 'XOF';
    weight: number;
    dimensions: string;
    marginRate: number;
    applyVat: boolean;
    ignoreSeaWeight: boolean;
    ignoreSeaVolume: boolean;
    image: string;
    additionalImages: string[];
    specs: Record<string, string>;
    options?: (string | ProductVariantItem)[];
    supplierId: string;
    supplierName: string;
    supplierCountry: string;
    supplierPlatform: string;
    showDeposit?: boolean;
    depositPercentage?: number;
    discountPercent?: number;
  }>({
    name: '',
    brand: '',
    category: 'Outillage électrique',
    supplierPrice: 100,
    supplierCurrency: 'USD',
    weight: 2.5,
    dimensions: '30 x 20 x 15 cm',
    marginRate: 0.35,
    applyVat: true,
    ignoreSeaWeight: false,
    ignoreSeaVolume: false,
    image: '',
    additionalImages: [],
    specs: {},
    supplierId: '',
    supplierName: '',
    supplierCountry: 'Chine',
    supplierPlatform: 'Alibaba',
    showDeposit: false,
    depositPercentage: 30,
    discountPercent: undefined
  });

  // Manual Add / Edit Form State
  const [formProduct, setFormProduct] = useState<Partial<ExtendedProduct> & {
    ignoreSeaWeight?: boolean;
    ignoreSeaVolume?: boolean;
  }>({
    name: '',
    brand: '',
    category: 'Outillage électrique',
    subcategory: '',
    supplierPrice: 100,
    supplierCurrency: 'USD',
    weight: '2.5 kg',
    dimensions: '30 x 20 x 15 cm',
    origin: 'Chine',
    marginRate: 0.35,
    shippingMethod: 'air',
    isOnline: true,
    inStock: true,
    description: '',
    supplierName: '',
    sourcePlatform: 'Manuel',
    supplierId: '',
    warehouseDeliveryFeeUSD: 20,
    applyVat: true,
    ignoreSeaWeight: false,
    ignoreSeaVolume: false,
    specs: {},
    showDeposit: false,
    depositPercentage: 30,
    discountPercent: undefined,
    image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&auto=format&fit=crop&q=80'
  });

  // Specs editor helper state
  const [newSpecKey, setNewSpecKey] = useState('');
  const [newSpecVal, setNewSpecVal] = useState('');

  // Options / Variants editor helper state
  const [newOptionInput, setNewOptionInput] = useState('');
  const [newOptionPrice, setNewOptionPrice] = useState('');
  const [newOptionWeight, setNewOptionWeight] = useState('');
  const [newImportOptionInput, setNewImportOptionInput] = useState('');
  const [newImportOptionPrice, setNewImportOptionPrice] = useState('');
  const [newImportOptionWeight, setNewImportOptionWeight] = useState('');

  // Multiple images for manual form
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [newGalleryImageUrl, setNewGalleryImageUrl] = useState('');

  // Load data
  const refreshData = () => {
    setProducts(catalogService.getProducts());
    setOrders(catalogService.getOrders());
    setSuppliers(catalogService.getSuppliers());
    setAuditLogs(catalogService.getAuditLogs());
    setStats(catalogService.getFinancialStats());
    setCategories(siteSettingsService.getCategories());
  };

  useEffect(() => {
    refreshData();
    const unsubCatalog = catalogService.subscribe(refreshData);
    const unsubSettings = siteSettingsService.subscribe(refreshData);
    window.addEventListener('ze_catalog_updated', refreshData);
    window.addEventListener('ze_orders_updated', refreshData);
    window.addEventListener('ze_suppliers_updated', refreshData);
    window.addEventListener('ze_settings_updated', refreshData);
    window.addEventListener('storage', refreshData);
    return () => {
      unsubCatalog();
      unsubSettings();
      window.removeEventListener('ze_catalog_updated', refreshData);
      window.removeEventListener('ze_orders_updated', refreshData);
      window.removeEventListener('ze_suppliers_updated', refreshData);
      window.removeEventListener('ze_settings_updated', refreshData);
      window.removeEventListener('storage', refreshData);
    };
  }, []);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.ref.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedCategory === 'Tous' || p.category === selectedCategory;
      const matchStatus = selectedStatus === 'all' 
        ? true 
        : selectedStatus === 'online' 
          ? p.isOnline !== false 
          : p.isOnline === false;
      return matchSearch && matchCat && matchStatus;
    });
  }, [products, searchTerm, selectedCategory, selectedStatus]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Dynamic pricing calculation helper for manual form
  const currentCalculatedPricing = useMemo(() => {
    const rawWeight = parseFloat(formProduct.weight?.replace(/[^0-9.]/g, '') || '2');
    return catalogService.calculatePricing({
      supplierPrice: Number(formProduct.supplierPrice) || 0,
      supplierCurrency: formProduct.supplierCurrency || 'USD',
      weightKg: rawWeight || 2,
      ignoreSeaWeight: formProduct.ignoreSeaWeight,
      ignoreSeaVolume: formProduct.ignoreSeaVolume,
      marginRate: Number(formProduct.marginRate) || 0.35,
      preferredFreight: formProduct.shippingMethod || 'auto',
      warehouseDeliveryUSD: Number(formProduct.warehouseDeliveryFeeUSD) || 0,
      applyVat: formProduct.applyVat !== false
    });
  }, [formProduct.supplierPrice, formProduct.supplierCurrency, formProduct.weight, formProduct.marginRate, formProduct.shippingMethod, formProduct.warehouseDeliveryFeeUSD, formProduct.applyVat, formProduct.ignoreSeaWeight, formProduct.ignoreSeaVolume]);

  // Dynamic pricing calculation helper for import form
  const importCalculatedPricing = useMemo(() => {
    return catalogService.calculatePricing({
      supplierPrice: Number(importForm.supplierPrice) || 0,
      supplierCurrency: importForm.supplierCurrency,
      weightKg: Number(importForm.weight) || 1,
      ignoreSeaWeight: importForm.ignoreSeaWeight,
      ignoreSeaVolume: importForm.ignoreSeaVolume,
      marginRate: Number(importForm.marginRate) || 0.35,
      preferredFreight: 'auto',
      applyVat: importForm.applyVat
    });
  }, [importForm.supplierPrice, importForm.supplierCurrency, importForm.weight, importForm.marginRate, importForm.applyVat, importForm.ignoreSeaWeight, importForm.ignoreSeaVolume]);

  // Open Edit modal
  const handleOpenEdit = (prod: ExtendedProduct) => {
    setEditingProduct(prod);
    setFormProduct({
      ...prod,
      applyVat: prod.applyVat !== false,
      warehouseDeliveryFeeUSD: prod.warehouseDeliveryFeeUSD || 20,
      specs: prod.specs || {},
      options: prod.options || (prod as any).variants || [],
      ignoreSeaWeight: false,
      ignoreSeaVolume: false
    });
    const imgs = prod.images && prod.images.length > 0 ? [...prod.images] : [prod.image || prod.img || ''];
    setGalleryImages(imgs.filter(Boolean));
    setNewOptionInput('');
    setShowAddModal(true);
  };

  // Open New Product modal
  const handleOpenNewProduct = () => {
    setEditingProduct(null);
    setFormProduct({
      name: '',
      brand: '',
      category: 'Outillage électrique',
      subcategory: '',
      supplierPrice: 80,
      supplierCurrency: 'USD',
      weight: '2.0 kg',
      dimensions: '30 x 20 x 15 cm',
      origin: 'Chine',
      marginRate: 0.35,
      shippingMethod: 'air',
      isOnline: true,
      inStock: true,
      description: '',
      supplierName: '',
      sourcePlatform: 'Manuel',
      supplierId: suppliers[0]?.id || '',
      warehouseDeliveryFeeUSD: 20,
      applyVat: true,
      ignoreSeaWeight: false,
      ignoreSeaVolume: false,
      options: [],
      specs: {
        "État": "Neuf certifié constructeur",
        "Garantie": "1 an",
        "Conformité": "Norme CE / ISO"
      },
      img: '',
      image: ''
    });
    setGalleryImages([]);
    setNewGalleryImageUrl('');
    setNewOptionInput('');
    setShowAddModal(true);
  };

  // Save manual add / edit
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProduct.name?.trim()) {
      alert("Veuillez saisir un nom pour le produit.");
      return;
    }

    const calculated = currentCalculatedPricing;
    const finalImages = galleryImages.filter(Boolean);
    const mainImg = finalImages[0] || formProduct.image || formProduct.img || DEFAULT_PRODUCT_IMAGE;

    const payload: Partial<ExtendedProduct> = {
      ...formProduct,
      img: mainImg,
      image: mainImg,
      images: finalImages.length > 0 ? finalImages : [mainImg],
      price: calculated.priceTTC,
      costPrice: calculated.totalCostPrice,
      shippingMethod: calculated.shippingMethod,
      specs: formProduct.specs && Object.keys(formProduct.specs).length > 0
        ? formProduct.specs
        : { "Condition": "Neuf d'origine", "Garantie": "1 an", "Certification": "Norme CE / ISO" }
    };

    if (editingProduct) {
      catalogService.updateProduct(editingProduct.id, payload);
      triggerToast(`Produit "${formProduct.name}" mis à jour avec succès.`);
    } else {
      catalogService.addProduct(payload);
      triggerToast(`Nouveau produit "${formProduct.name}" ajouté au catalogue.`);
    }

    setShowAddModal(false);
    setEditingProduct(null);
    refreshData();
  };

  const handleAddGalleryImage = () => {
    if (!newGalleryImageUrl.trim()) return;
    setGalleryImages([...galleryImages, newGalleryImageUrl.trim()]);
    setNewGalleryImageUrl('');
  };

  const handleSetPrimaryImage = (index: number) => {
    if (index === 0 || index >= galleryImages.length) return;
    const chosen = galleryImages[index];
    const rest = galleryImages.filter((_, i) => i !== index);
    const reordered = [chosen, ...rest];
    setGalleryImages(reordered);
    setFormProduct(prev => ({ ...prev, image: chosen, img: chosen }));
  };

  const handleRemoveGalleryImage = (index: number) => {
    const updated = galleryImages.filter((_, i) => i !== index);
    setGalleryImages(updated);
    if (updated.length > 0) {
      setFormProduct(prev => ({ ...prev, image: updated[0], img: updated[0] }));
    }
  };

  // Delete product
  const handleDeleteProduct = (id: number, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Supprimer ce produit',
      message: `Êtes-vous sûr de vouloir supprimer définitivement le produit "${name}" ? Cette action le retirera du catalogue.`,
      onConfirm: () => {
        catalogService.deleteProduct(id);
        refreshData();
        triggerToast(`Produit "${name}" supprimé.`);
      },
    });
  };

  // Toggle online status
  const handleToggleOnline = (prod: ExtendedProduct) => {
    catalogService.updateProduct(prod.id, { isOnline: !prod.isOnline });
    refreshData();
    triggerToast(prod.isOnline ? `Produit masqué du catalogue.` : `Produit publié en ligne.`);
  };

  // Parse link with backend API & Gemini search grounding
  const handleParseLink = async () => {
    if (!importUrl.trim()) return;
    setIsScraping(true);
    try {
      const res = await fetch('/api/scrape-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl, jsRender: useJsRender })
      });
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        const allExtractedImgs = Array.isArray(d.images) && d.images.length > 0 
          ? d.images 
          : [d.imageUrl || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600'];

        // Automatically ensure supplier exists and add to dedicated list
        let autoSupplierId = '';
        if (d.supplier && d.supplier.name) {
          const sup = catalogService.ensureSupplier({
            name: d.supplier.name,
            platform: d.supplier.platform || d.platform,
            country: d.supplier.country || d.country,
            currency: d.supplier.currency || d.currency,
            storeUrl: d.supplier.storeUrl || importUrl.trim()
          });
          autoSupplierId = sup.id;
        }

        // Automatically ensure category exists in site categories
        if (d.category) {
          const catExists = categories.some(c => c.name.toLowerCase() === d.category.toLowerCase());
          if (!catExists) {
            siteSettingsService.addCategory({
              name: d.category,
              brands: d.brand || 'Constructeur Certifié',
              icon: 'Package',
              description: `Matériel et équipements industriels - ${d.category}`,
              subcategories: []
            });
            setCategories(siteSettingsService.getCategories());
          }
        }

        setParsedLinkData({
          url: importUrl.trim(),
          detectedPlatform: d.platform,
          detectedSupplier: d.supplier?.name || `${d.brand} (${d.platform})`,
          detectedCountry: d.country,
          guessedTitle: d.name,
          defaultCurrency: d.currency,
          estimatedWeight: d.weight,
          brand: d.brand,
          dimensions: d.dimensions || '30 x 20 x 15 cm',
          specs: d.specs || {}
        });

        setImportForm({
          name: d.name,
          brand: d.brand || 'Constructeur Certifié',
          category: d.category || 'Outillage électrique',
          supplierPrice: d.supplierPrice,
          supplierCurrency: d.currency,
          weight: d.weight,
          dimensions: d.dimensions || '30 x 20 x 15 cm',
          marginRate: 0.35,
          applyVat: true,
          ignoreSeaWeight: false,
          ignoreSeaVolume: false,
          image: allExtractedImgs[0],
          additionalImages: allExtractedImgs.slice(1),
          specs: d.specs || {},
          options: d.options || d.variants || [],
          supplierId: autoSupplierId || suppliers[0]?.id || '',
          supplierName: d.supplier?.name || '',
          supplierCountry: d.supplier?.country || d.country || 'Chine',
          supplierPlatform: d.platform || 'Alibaba',
          showDeposit: false,
          depositPercentage: 30
        });
        triggerToast(`Analyse IA réussie (${d.platform}) : galerie HD, specs, marque et fournisseur extraits.`);
      } else {
        throw new Error(json.error || "Erreur d'analyse");
      }
    } catch {
      // Fallback to local parser
      const parsed = catalogService.parseProductLink(importUrl);
      setParsedLinkData(parsed);
      const priceVal = parsed.detectedPlatform === '1688' ? 450 : parsed.detectedPlatform === 'Europe' ? 120 : 85;
      const defaultImg = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600';
      
      const fallbackSupplier = catalogService.ensureSupplier({
        name: parsed.detectedSupplier,
        platform: parsed.detectedPlatform,
        country: parsed.detectedCountry,
        currency: parsed.defaultCurrency,
        storeUrl: importUrl.trim()
      });

      setImportForm({
        name: parsed.guessedTitle,
        brand: 'Constructeur Certifié',
        category: 'Outillage électrique',
        supplierPrice: priceVal,
        supplierCurrency: parsed.defaultCurrency,
        weight: parsed.estimatedWeight,
        dimensions: '30 x 20 x 15 cm',
        marginRate: 0.35,
        applyVat: true,
        ignoreSeaWeight: false,
        ignoreSeaVolume: false,
        image: defaultImg,
        additionalImages: [],
        specs: {
          "État": "Neuf d'origine constructeur",
          "Garantie": "1 an",
          "Conformité": "Norme CE / ISO"
        },
        supplierId: fallbackSupplier.id,
        supplierName: fallbackSupplier.name,
        supplierCountry: fallbackSupplier.country,
        supplierPlatform: fallbackSupplier.platform,
        showDeposit: false,
        depositPercentage: 30
      });
      triggerToast("Lien analysé avec succès.");
    } finally {
      setIsScraping(false);
    }
  };

  // Convert parsed link into product with full custom values
  const handleConfirmImport = () => {
    if (!parsedLinkData) return;
    const calculated = importCalculatedPricing;
    const allImgs = [importForm.image, ...importForm.additionalImages].filter(Boolean);
    const resolvedCleanBrand = cleanBrand(importForm.brand || parsedLinkData.brand || parsedLinkData.detectedSupplier, importForm.name);

    // Ensure category exists in siteSettingsService
    const chosenCat = (importForm.category || 'Outillage électrique').trim();
    if (chosenCat && !categories.some(c => c.name.toLowerCase() === chosenCat.toLowerCase())) {
      siteSettingsService.addCategory({
        name: chosenCat,
        brands: resolvedCleanBrand,
        icon: 'Package',
        description: `Matériel et équipements professionnels - ${chosenCat}`,
        subcategories: []
      });
      setCategories(siteSettingsService.getCategories());
    }

    // Ensure supplier is stored in dedicated supplier collection
    let finalSupplierId = importForm.supplierId;
    let finalSupplierName = importForm.supplierName;
    if (importForm.supplierName || parsedLinkData.detectedSupplier) {
      const sup = catalogService.ensureSupplier({
        name: importForm.supplierName || parsedLinkData.detectedSupplier,
        platform: importForm.supplierPlatform || parsedLinkData.detectedPlatform,
        country: importForm.supplierCountry || parsedLinkData.detectedCountry,
        currency: importForm.supplierCurrency,
        storeUrl: parsedLinkData.url
      });
      finalSupplierId = sup.id;
      finalSupplierName = sup.name;
    }

    catalogService.addProduct({
      name: importForm.name,
      brand: resolvedCleanBrand,
      category: chosenCat,
      origin: importForm.supplierCountry || parsedLinkData.detectedCountry || 'Chine',
      sourcePlatform: (importForm.supplierPlatform as any) || parsedLinkData.detectedPlatform,
      supplierName: finalSupplierName,
      supplierUrl: parsedLinkData.url,
      supplierId: finalSupplierId,
      supplierPrice: importForm.supplierPrice,
      supplierCurrency: importForm.supplierCurrency,
      weight: `${importForm.weight} kg`,
      dimensions: importForm.dimensions || '30 x 20 x 15 cm',
      marginRate: importForm.marginRate,
      applyVat: importForm.applyVat,
      showDeposit: importForm.showDeposit || false,
      depositPercentage: importForm.depositPercentage || 30,
      discountPercent: importForm.discountPercent || undefined,
      costPrice: calculated.totalCostPrice,
      price: calculated.priceTTC,
      shippingMethod: calculated.shippingMethod,
      specs: importForm.specs && Object.keys(importForm.specs).length > 0 
        ? importForm.specs 
        : { "Condition": "Neuf certifié constructeur", "Garantie": "1 an", "Certification": "Norme CE / ISO" },
      options: importForm.options || [],
      variants: importForm.options || [],
      img: allImgs[0] || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600',
      image: allImgs[0] || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600',
      images: allImgs,
      isOnline: true,
      inStock: true
    });

    setParsedLinkData(null);
    setImportUrl('');
    setShowImportLinkModal(false);
    refreshData();
    triggerToast(`Produit importé avec succès (${resolvedCleanBrand}). Fournisseur et catégorie synchronisés.`);
  };

  // Update order status with optional client notification
  const handleUpdateOrderStatus = (orderId: string, status: Order['status']) => {
    catalogService.updateOrderStatus(orderId, status);
    refreshData();
    const updated = catalogService.getOrderById(orderId) || null;
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder(updated);
    }
    // Proposer l'envoi de notification client
    setNotificationOrder(updated);
    setNotificationStatus(status);
    setShowNotificationModal(true);
  };

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  // 1. ÉTAT DE CHARGEMENT DE LA SESSION
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-14 h-14 rounded-2xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center mb-4 animate-pulse shadow-xl shadow-orange-500/10">
          <Shield className="w-7 h-7 text-[#FF6600]" />
        </div>
        <h2 className="text-base font-bold text-white mb-1">Vérification des droits d'administration...</h2>
        <p className="text-xs text-slate-400">Zone Équipements Sénégal</p>
      </div>
    );
  }

  // 2. UTILISATEUR NON CONNECTÉ
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-8 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FF6600]/10 text-[#FF6600] flex items-center justify-center mx-auto mb-4 border border-orange-500/20 shadow-lg">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white mb-2">Espace d'Administration</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            L'accès à cette plateforme de gestion industrielle est strictement réservé aux administrateurs autorisés. Veuillez vous connecter avec votre compte professionnel.
          </p>

          <div className="space-y-3">
            <Link
              to="/login"
              className="w-full py-3.5 bg-[#FF6600] hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              Se connecter
            </Link>

            <Link
              to="/"
              className="block text-xs text-slate-400 hover:text-white pt-2 transition-colors"
            >
              Retourner au site
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. UTILISATEUR CONNECTÉ MAIS NON ADMINISTRATEUR
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-8 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-4 border border-rose-500/20 shadow-lg">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white mb-2">Accès Restreint</h2>
          <p className="text-xs text-slate-300 mb-6 leading-relaxed">
            Votre compte ne dispose pas des autorisations requises pour accéder à ce tableau de bord.
          </p>

          <div className="space-y-3">
            <button
              onClick={async () => {
                await auth.signOut();
                navigate('/login');
              }}
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-red-400" />
              Se déconnecter
            </button>

            <Link
              to="/"
              className="block text-xs text-slate-400 hover:text-white pt-2 transition-colors"
            >
              Retourner à l'accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-24 font-sans">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Admin Header */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40 px-4 sm:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF6600] flex items-center justify-center font-black text-white text-lg shadow-lg shadow-orange-600/30">
            ZE
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-white">Zone Équipements Sénégal</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase tracking-wider">
                Back-Office B2B
              </span>
            </div>
            <p className="text-xs text-slate-400">Plateforme de Gestion Industrielle, Financière & Approvisionnements</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={refreshData} 
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Rafraîchir les données"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
          <a 
            href="/shop" 
            target="_blank" 
            rel="noreferrer" 
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Eye className="w-3.5 h-3.5 text-blue-400" />
            Voir la Boutique Client
          </a>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{user?.email}</span>
            <span className="md:hidden">Admin</span>
          </div>
          <button
            onClick={async () => {
              await auth.signOut();
              navigate('/');
            }}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Se déconnecter"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-6">
        <div className="flex overflow-x-auto no-scrollbar gap-2 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800/80 shadow-lg">
          <button
            onClick={() => setActiveTab('finance')}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'finance'
                ? 'bg-[#FF6600] text-white shadow-lg shadow-orange-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Finance & Chiffre d'Affaires
          </button>

          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'catalog'
                ? 'bg-[#FF6600] text-white shadow-lg shadow-orange-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Package className="w-4 h-4" />
            Gestion Catalogue ({products.length})
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'orders'
                ? 'bg-[#FF6600] text-white shadow-lg shadow-orange-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            Commandes & Devis ({orders.length})
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'suppliers'
                ? 'bg-[#FF6600] text-white shadow-lg shadow-orange-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            Fournisseurs & Sourcing ({suppliers.length})
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-[#FF6600] text-white shadow-lg shadow-orange-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Shield className="w-4 h-4" />
            Journal d'Audit & Éthique
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'security'
                ? 'bg-[#FF6600] text-white shadow-lg shadow-orange-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            Paramètres, TVA & Comptes Admin
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 mt-6">
        
        {/* ================= TAB 1: FINANCE & STATS ================= */}
        {activeTab === 'finance' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Top 4 KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Chiffre d'Affaires Brut</span>
                    <h3 className="text-xl font-black text-white mt-1">
                      {stats.grossRevenue.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-400">FCFA</span>
                    </h3>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Net HT : {stats.netRevenue.toLocaleString('fr-FR')} F</span>
                  <span className="text-emerald-400 font-bold">TVA 18% incluse</span>
                </div>
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Chiffre d'Affaires Encaissé</span>
                    <h3 className="text-xl font-black text-emerald-400 mt-1">
                      {stats.collectedRevenue.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-400">FCFA</span>
                    </h3>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Règlements reçus</span>
                  <span className="text-slate-300 font-semibold">{stats.grossRevenue > 0 ? `${Math.round((stats.collectedRevenue / stats.grossRevenue) * 100)}%` : '0%'}</span>
                </div>
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Coûts Fournisseurs & Fret</span>
                    <h3 className="text-xl font-black text-slate-200 mt-1">
                      {stats.totalCostOfGoods.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-400">FCFA</span>
                    </h3>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <Truck className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Achat + Fret DAP Dakar</span>
                  <span className="text-slate-300 font-semibold">Traçabilité assurée</span>
                </div>
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Marge Brute Réalisée</span>
                    <h3 className="text-xl font-black text-orange-400 mt-1">
                      {stats.grossProfit.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-400">FCFA</span>
                    </h3>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Taux Moyen de Marge</span>
                  <span className="text-orange-400 font-bold">{Math.round(parseFloat(String(stats.grossMarginPercent)) || 0)}%</span>
                </div>
              </div>
            </div>

            {/* Platform & Logistics Breakdown */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400" />
                Répartition des Ventes par Canal de Sourcing & Provenance
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(stats.platformBreakdown).map(([platform, amount]) => {
                  const amt = Number(amount) || 0;
                  return (
                    <div key={platform} className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                      <span className="text-xs text-slate-400 block font-semibold">{platform}</span>
                      <span className="text-base font-black text-white block mt-1">{amt.toLocaleString('fr-FR')} FCFA</span>
                      <span className="text-[11px] text-orange-400 mt-1 block">
                        {stats.grossRevenue > 0 ? `${Math.round((amt / stats.grossRevenue) * 100)}% du total` : '0%'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: GESTION DU CATALOGUE ================= */}
        {activeTab === 'catalog' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Sub-Navigation: Fiches Produits VS Structure Catégories/Secteurs/Marques */}
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <button
                onClick={() => setCatalogSubTab('products')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  catalogSubTab === 'products'
                    ? 'bg-slate-800 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Fiches Produits ({products.length})
              </button>

              <button
                onClick={() => setCatalogSubTab('structure')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  catalogSubTab === 'structure'
                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Catégories, Secteurs (avec Photos) & Marques
              </button>
            </div>

            {catalogSubTab === 'structure' ? (
              <CatalogStructureManager onNotify={(msg) => triggerToast(msg)} />
            ) : (
              <>
                {/* Action Bar */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl">
                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        placeholder="Rechercher réf, nom, marque..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <select
                      value={selectedCategory}
                      onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="Tous">Toutes les Catégories</option>
                      {categories.map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>

                    <select
                      value={selectedStatus}
                      onChange={(e) => { setSelectedStatus(e.target.value as any); setCurrentPage(1); }}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="all">Tous les Statuts</option>
                      <option value="online">En ligne uniquement</option>
                      <option value="draft">Brouillons uniquement</option>
                    </select>
                  </div>

                  {/* Buttons: Import by link & Manual add */}
                  <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <button
                      onClick={() => setShowImportLinkModal(true)}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition-all shadow-md"
                    >
                      <LinkIcon className="w-3.5 h-3.5 text-orange-400" />
                      Importer par Lien
                    </button>
                    <button
                      onClick={handleOpenNewProduct}
                      className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-orange-600/30 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter Produit Manuel
                    </button>
                  </div>
                </div>

                {/* Products Table */}
                <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                        <tr>
                          <th className="py-3.5 px-4">Produit</th>
                          <th className="py-3.5 px-4">Réf / Marque</th>
                          <th className="py-3.5 px-4">Catégorie</th>
                          <th className="py-3.5 px-4">Prix Fournisseur</th>
                          <th className="py-3.5 px-4">Prix de Vente (TTC)</th>
                          <th className="py-3.5 px-4">Marge estimée</th>
                          <th className="py-3.5 px-4 text-center">En Ligne</th>
                          <th className="py-3.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {paginatedProducts.map(prod => {
                          const effectiveCost = prod.costPrice ?? Math.round((prod.price / 1.18) * 0.65);
                          const marginAmt = (prod.price / 1.18) - effectiveCost;
                          const marginPct = prod.price > 0 ? Math.round((marginAmt / (prod.price / 1.18)) * 100) : 0;

                          return (
                            <tr key={prod.id} className="hover:bg-slate-900/40 transition-colors">
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  <img 
                                    src={getProductImageUrl(prod.image || prod.img || (prod.images && prod.images[0]) || '')} 
                                    alt={prod.name} 
                                    className="w-10 h-10 object-cover rounded-lg bg-slate-800 border border-slate-700"
                                    referrerPolicy="no-referrer"
                                    onError={handleImageError}
                                  />
                                  <div>
                                    <span className="font-bold text-white line-clamp-1">{prod.name}</span>
                                    <span className="text-[10px] text-slate-400 block">{prod.origin} • {prod.shippingMethod === 'air' ? 'Aérien' : 'Maritime'}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 font-mono">
                                <span className="font-bold text-white block">{prod.ref}</span>
                                <span className="text-[11px] text-slate-400">{prod.brand}</span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                                  {prod.category}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-mono">
                                <span className="font-bold text-slate-200">
                                  {prod.supplierPrice ? `${prod.supplierPrice.toLocaleString()} ${prod.supplierCurrency || 'USD'}` : 'N/A'}
                                </span>
                                <span className="block text-[10px] text-slate-500">Coût: {effectiveCost.toLocaleString()} F</span>
                              </td>
                              <td className="py-3.5 px-4 font-mono">
                                <span className="font-bold text-orange-400 text-sm">
                                  {prod.price.toLocaleString('fr-FR')} FCFA
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-mono">
                                <span className="text-emerald-400 font-bold">+{marginPct}%</span>
                                <span className="block text-[10px] text-slate-500">~{Math.round(marginAmt).toLocaleString()} F</span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <button
                                  onClick={() => handleToggleOnline(prod)}
                                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                                    prod.isOnline !== false 
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                                  }`}
                                >
                                  {prod.isOnline !== false ? 'En Ligne' : 'Brouillon'}
                                </button>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleOpenEdit(prod)}
                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
                                    title="Modifier ce produit"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProduct(prod.id, prod.name)}
                                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors border border-rose-500/20"
                                    title="Supprimer ce produit"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span>
                      Affichage de {filteredProducts.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} à {Math.min(currentPage * itemsPerPage, filteredProducts.length)} sur {filteredProducts.length} produits
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold"
                      >
                        Précédent
                      </button>
                      <span className="px-3 py-1 font-bold text-white text-xs">
                        Page {currentPage} / {totalPages}
                      </span>
                      <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold"
                      >
                        Suivant
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ================= TAB 3: COMMANDES & DEVIS ================= */}
        {activeTab === 'orders' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Gestion des Commandes & Devis Clients</h3>
                <p className="text-xs text-slate-400 mt-0.5">Suivi des statuts réels, notification WhatsApp/Email automatique et factures proforma</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setShowDailyDispatchModal(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-orange-600/30 transition-transform active:scale-95 border border-orange-500/40"
                  title="Expédier le manifeste quotidien des commandes groupées aux fournisseurs par WhatsApp / Chat Alibaba / Email"
                >
                  <Send className="w-4 h-4" />
                  <span>Transmettre Commandes Quotidiennes aux Fournisseurs</span>
                </button>
                <span className="text-xs font-bold px-3 py-1 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full">
                  {orders.length} dossiers
                </span>
              </div>
            </div>

            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">N° Dossier</th>
                      <th className="py-3.5 px-4">Client / Entreprise</th>
                      <th className="py-3.5 px-4">Montant TTC</th>
                      <th className="py-3.5 px-4">Règlement</th>
                      <th className="py-3.5 px-4">Statut Approvisionnement</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {orders.map(ord => (
                      <tr key={ord.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-white">
                          {ord.orderNumber}
                          {ord.isQuote && (
                            <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[9px] font-sans uppercase">
                              Devis
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-white block">{ord.customerCompany || ord.customerName}</span>
                          <span className="text-[10px] text-slate-400 block">{ord.customerCity}, {ord.customerCountry} • {ord.customerPhone}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-black text-white text-sm">
                            {ord.totalTTC.toLocaleString('fr-FR')} FCFA
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            Dont TVA 18% : {ord.vatAmount.toLocaleString('fr-FR')} FCFA
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-200 block">{ord.paymentMethod}</span>
                          <span className={`text-[10px] font-bold ${
                            ord.paymentStatus === 'Payé intégralement' ? 'text-emerald-400' : 'text-amber-400'
                          }`}>
                            {ord.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <select
                            value={ord.status}
                            onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value as any)}
                            className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1 font-semibold focus:outline-none focus:border-orange-500"
                          >
                            <option value="Reçue">Reçue</option>
                            <option value="En attente paiement">En attente paiement</option>
                            <option value="Payée">Payée</option>
                            <option value="Commandée fournisseur">Commandée fournisseur</option>
                            <option value="En transit">En transit</option>
                            <option value="Dédouanement">Dédouanement</option>
                            <option value="Reçue en entrepôt">Reçue en entrepôt</option>
                            <option value="Livrée">Livrée</option>
                            <option value="Annulée">Annulée</option>
                          </select>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                          {new Date(ord.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setNotificationOrder(ord);
                                setNotificationStatus(ord.status);
                                setShowNotificationModal(true);
                              }}
                              className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-emerald-500/30"
                              title="Envoyer notification WhatsApp ou Email au client"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              Notifier
                            </button>

                            <button
                              onClick={() => {
                                setSelectedOrder(ord);
                                setShowInvoiceModal(true);
                              }}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
                            >
                              <FileText className="w-3.5 h-3.5 text-orange-400" />
                              Facture
                            </button>

                            <button
                              onClick={() => {
                                setConfirmModal({
                                  isOpen: true,
                                  title: 'Supprimer ce dossier',
                                  message: `Êtes-vous sûr de vouloir supprimer définitivement la commande/devis "${ord.orderNumber}" ?`,
                                  onConfirm: () => {
                                    catalogService.deleteOrder(ord.id);
                                    refreshData();
                                    triggerToast(`Dossier ${ord.orderNumber} supprimé.`);
                                  },
                                });
                              }}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs border border-rose-500/20"
                              title="Supprimer cette commande ou ce devis"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: FOURNISSEURS & SOURCING ================= */}
        {activeTab === 'suppliers' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Répertoire Fournisseurs & Canaux de Sourcing</h3>
                <p className="text-xs text-slate-400 mt-0.5">Fournisseurs vérifiés en Chine, Europe et Amérique pour l'approvisionnement industriel MRO</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setShowDailyDispatchModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-orange-600/30 transition-transform active:scale-95 border border-orange-500/40"
                  title="Expédier le manifeste quotidien des commandes groupées aux fournisseurs par WhatsApp / Chat Alibaba / Email"
                >
                  <Send className="w-4 h-4" />
                  <span>Commandes du Jour Fournisseurs</span>
                </button>
                <button
                  onClick={() => {
                    setEditingSupplier(null);
                    setShowSupplierModal(true);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition-all"
                >
                  <Plus className="w-4 h-4 text-orange-400" />
                  Nouveau Fournisseur
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {suppliers.map(sup => (
                <div key={sup.id} className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">{sup.platform}</span>
                        <h4 className="text-lg font-bold text-white">{sup.name}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingSupplier(sup);
                            setShowSupplierModal(true);
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                          title="Modifier les coordonnées fournisseur"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: 'Supprimer ce fournisseur',
                              message: `Êtes-vous sûr de vouloir supprimer définitivement le fournisseur "${sup.name}" ?`,
                              onConfirm: () => {
                                catalogService.deleteSupplier(sup.id);
                                refreshData();
                                triggerToast('Fournisseur supprimé.');
                              },
                            });
                          }}
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs border border-rose-500/20"
                          title="Supprimer ce fournisseur"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-slate-300 mt-4">
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Pays & Port :</span>
                        <span className="font-semibold text-white">{sup.country}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Devise de transaction :</span>
                        <span className="font-bold text-orange-400">{sup.currency}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Conditions de règlement :</span>
                        <span className="font-semibold text-white">{sup.paymentTerms}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Délai moyen constaté :</span>
                        <span className="font-semibold text-white">{sup.leadTimeAvg}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Contact WhatsApp :</span>
                        <span className="font-mono text-emerald-400">{sup.contactPhone || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Frais entrepôt export :</span>
                        <span className="font-mono text-white">{sup.warehouseDeliveryFeeUSD || 20} $</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center">
                    <span className="text-xs text-slate-400">Score fiabilité : ★ {sup.rating || 4.8}/5</span>
                    <button
                      onClick={() => {
                        setSelectedPoSupplier(sup);
                        setShowPoModal(true);
                      }}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      Générer Bon de Commande (PO)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 5: JOURNAL D'AUDIT ================= */}
        {activeTab === 'audit' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-orange-400 mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Conformité Commerciale & Éthique de Sourcing
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
                Zone Équipements Sénégal opère selon un principe d'éthique et de transparence totale. Tout produit non détenu en stock physique immédiat fait l'objet d'un contrat de mandat de sourcing et de commande explicite.
              </p>
            </div>

            {/* Audit Log Table */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex justify-between items-center">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Journal d'Audit des Actions (Traçabilité Intégrale)
                </h4>
                <span className="text-[11px] text-slate-400">{auditLogs.length} événements enregistrés</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Horodatage</th>
                      <th className="py-3 px-4">Auteur</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Catégorie</th>
                      <th className="py-3 px-4">Détails de l'opération</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                          {new Date(log.timestamp).toLocaleString('fr-FR')}
                        </td>
                        <td className="py-2.5 px-4 text-orange-400 font-semibold">{log.author}</td>
                        <td className="py-2.5 px-4 text-white font-bold">{log.action}</td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-sans uppercase">
                            {log.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-300 font-sans">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 6: PARAMÈTRES, TVA & CLÉ PRIVÉE ================= */}
        {activeTab === 'security' && (
          <div className="animate-fadeIn">
            <SiteSettingsManager onNotify={(msg) => triggerToast(msg)} />
          </div>
        )}
      </main>

      {/* ================= MODAL: AJOUT MANUEL / ÉDITION PRODUIT (AVEC PLUSIEURS IMAGES) ================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl p-6 sm:p-8">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {editingProduct ? 'Éditer la Fiche Produit' : 'Ajout Manuel de Matériel'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Calculateur automatique de prix de vente, fret et gestion multi-images</p>
              </div>
              <button 
                onClick={() => { setShowAddModal(false); setEditingProduct(null); }}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="mt-5 space-y-6">
              {/* Informations Générales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Désignation du Produit / Matériel *
                  </label>
                  <input
                    type="text"
                    required
                    value={formProduct.name}
                    onChange={(e) => setFormProduct({ ...formProduct, name: e.target.value })}
                    placeholder="Ex: Pompe centrifuge haute pression 7.5kW"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Marque Constructeur
                  </label>
                  <input
                    type="text"
                    value={formProduct.brand}
                    onChange={(e) => setFormProduct({ ...formProduct, brand: e.target.value })}
                    placeholder="Ex: Siemens, Fluke, Makita..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Catégorie Principale
                  </label>
                  <select
                    value={formProduct.category}
                    onChange={(e) => setFormProduct({ ...formProduct, category: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                  >
                    {categories.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SÉLECTION DU FOURNISSEUR ATTACHÉ */}
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-orange-400 uppercase tracking-wider">
                  Fournisseur Partenaire Rattaché
                </label>
                <select
                  value={formProduct.supplierId || ''}
                  onChange={(e) => {
                    const found = suppliers.find(s => s.id === e.target.value);
                    setFormProduct({
                      ...formProduct,
                      supplierId: e.target.value,
                      supplierName: found ? found.name : formProduct.supplierName,
                      supplierCurrency: (found?.currency as any) || formProduct.supplierCurrency,
                      origin: found ? found.country : formProduct.origin,
                      warehouseDeliveryFeeUSD: found ? found.warehouseDeliveryFeeUSD : formProduct.warehouseDeliveryFeeUSD
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="">Sélectionner un fournisseur...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.country} - {s.platform}) - Devise : {s.currency}
                    </option>
                  ))}
                </select>
              </div>

              {/* GESTION MULTI-IMAGES DU PRODUIT */}
              <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Photos & Visuels du Produit
                  </label>
                  <span className="text-[11px] font-mono text-orange-400 bg-orange-950/40 border border-orange-800/40 px-2 py-0.5 rounded-full">
                    {galleryImages.length} image{galleryImages.length > 1 ? 's' : ''} enregistrée{galleryImages.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Liste des images actuelles */}
                {galleryImages.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                    {galleryImages.map((img, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-700 bg-slate-900 group">
                        <img 
                          src={getProductImageUrl(img)} 
                          alt="" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer" 
                          onError={handleImageError}
                        />
                        {idx === 0 ? (
                          <span className="absolute top-1 left-1 bg-orange-600 text-[9px] font-black text-white px-2 py-0.5 rounded-md shadow-md">
                            ★ Principale
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryImage(idx)}
                            className="absolute top-1 left-1 bg-slate-900/90 hover:bg-orange-600 text-slate-300 hover:text-white text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-700 transition-colors"
                            title="Définir comme photo principale"
                          >
                            Mettre en principale
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveGalleryImage(idx)}
                          className="absolute top-1 right-1 p-1 bg-black/80 hover:bg-rose-600 text-white rounded-lg transition-colors cursor-pointer"
                          title="Supprimer cette image"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Champ pour ajouter une nouvelle image URL ou fichier */}
                <ImageUploadInput
                  label={galleryImages.length === 0 ? "Importer la photo principale" : "Ajouter une autre photo à la galerie"}
                  value={newGalleryImageUrl}
                  onChange={(imgUrl) => {
                    if (imgUrl) {
                      setGalleryImages(prev => [...prev, imgUrl]);
                      setNewGalleryImageUrl('');
                      if (galleryImages.length === 0) {
                        setFormProduct(prev => ({ ...prev, image: imgUrl, img: imgUrl }));
                      }
                    }
                  }}
                  placeholder="Collez une URL d'image ou cliquez sur Importer Fichier..."
                  helperText="Vous pouvez importer vos propres fichiers ou coller un lien externe. La première image sert de visuel principal sur le catalogue."
                />
              </div>

              {/* SPÉCIFICATIONS & CARACTÉRISTIQUES TECHNIQUES DU PRODUIT */}
              <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Caractéristiques Techniques Détaillées (Specs)
                    </label>
                    <p className="text-[10px] text-slate-400">Présentées dans l'onglet Spécifications de la fiche produit</p>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                    {Object.keys(formProduct.specs || {}).length} spécification{Object.keys(formProduct.specs || {}).length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Tableau des caractéristiques actuelles */}
                <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                  {Object.entries(formProduct.specs || {}).length > 0 ? (
                    <div className="divide-y divide-slate-800/60 text-xs">
                      {Object.entries(formProduct.specs || {}).map(([k, v], idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 hover:bg-slate-900/60">
                          <span className="font-bold text-slate-300 w-1/3 truncate">{k}</span>
                          <span className="text-slate-400 font-mono flex-1 px-2 truncate">{v}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const nextSpecs = { ...formProduct.specs };
                              delete nextSpecs[k];
                              setFormProduct({ ...formProduct, specs: nextSpecs });
                            }}
                            className="p-1 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors cursor-pointer"
                            title="Supprimer cette caractéristique"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 text-center text-xs text-slate-500 italic">
                      Aucune caractéristique spécifique ajoutée.
                    </div>
                  )}
                </div>

                {/* Formulaire rapide pour ajouter une caractéristique */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Nom (ex: Puissance, Tension...)"
                    value={newSpecKey}
                    onChange={(e) => setNewSpecKey(e.target.value)}
                    className="sm:col-span-2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                  <input
                    type="text"
                    placeholder="Valeur (ex: 7.5 kW, 380V...)"
                    value={newSpecVal}
                    onChange={(e) => setNewSpecVal(e.target.value)}
                    className="sm:col-span-2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newSpecKey.trim() && newSpecVal.trim()) {
                        setFormProduct({
                          ...formProduct,
                          specs: {
                            ...(formProduct.specs || {}),
                            [newSpecKey.trim()]: newSpecVal.trim()
                          }
                        });
                        setNewSpecKey('');
                        setNewSpecVal('');
                      }
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-xs py-1.5 px-3 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter
                  </button>
                </div>
              </div>

              {/* Options & Déclinaisons Réelles du Produit (Variantes d'Achat : Puissance, Modèle, Couleur, Rendement...) */}
              <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Options & Déclinaisons Disponibles (Choix Client)
                    </label>
                    <p className="text-[10px] text-slate-400">
                      Boutons de sélection interactifs sur la fiche produit (ex: 12KW, 15kw, AC monophasé, 7.5 CV...)
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-orange-400 bg-orange-950/40 border border-orange-800/40 px-2 py-0.5 rounded-full font-bold">
                    {(formProduct.options || []).length} option{(formProduct.options || []).length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Liste des options et déclinaisons avec édition directe du nom, prix et poids */}
                <div className="space-y-2 min-h-10 p-3 bg-slate-950 rounded-xl border border-slate-800">
                  {(formProduct.options || []).length > 0 ? (
                    (formProduct.options || []).map((opt, idx) => {
                      let optName = '';
                      let optPrice: number | undefined = undefined;
                      let optWeight: string | undefined = undefined;

                      if (typeof opt === 'string') {
                        const parts = opt.split(/\s*\|\s*/);
                        optName = parts[0];
                        for (let pIdx = 1; pIdx < parts.length; pIdx++) {
                          const p = parts[pIdx];
                          const mP = p.match(/^(?:prix|price)\s*[:=]?\s*([0-9.]+)/i);
                          if (mP) optPrice = parseFloat(mP[1]);
                          const mW = p.match(/^(?:poids|weight)\s*[:=]?\s*(.+)/i);
                          if (mW) optWeight = mW[1].trim();
                        }
                      } else if (typeof opt === 'object' && opt) {
                        optName = (opt as any).name || '';
                        optPrice = (opt as any).price;
                        optWeight = (opt as any).weight;
                      }

                      return (
                        <div
                          key={idx}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2.5 bg-slate-900/90 border border-slate-800 rounded-lg hover:border-slate-700 transition-all"
                        >
                          <div className="sm:col-span-5">
                            <label className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5 sm:hidden">
                              Nom déclinaison :
                            </label>
                            <input
                              type="text"
                              value={optName}
                              onChange={(e) => {
                                const updated = [...(formProduct.options || [])];
                                updated[idx] = {
                                  name: e.target.value,
                                  price: optPrice,
                                  weight: optWeight
                                };
                                setFormProduct({ ...formProduct, options: updated, variants: updated });
                              }}
                              placeholder="Nom de l'option (ex: 20 kW)"
                              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5 sm:hidden">
                              Prix FCFA spécifique :
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                value={optPrice !== undefined && optPrice !== null ? optPrice : ''}
                                onChange={(e) => {
                                  const val = e.target.value.trim() ? parseFloat(e.target.value) : undefined;
                                  const updated = [...(formProduct.options || [])];
                                  updated[idx] = {
                                    name: optName,
                                    price: val,
                                    weight: optWeight
                                  };
                                  setFormProduct({ ...formProduct, options: updated, variants: updated });
                                }}
                                placeholder="Prix FCFA"
                                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-orange-500"
                              />
                            </div>
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5 sm:hidden">
                              Poids spécifique :
                            </label>
                            <input
                              type="text"
                              value={optWeight || ''}
                              onChange={(e) => {
                                const val = e.target.value.trim() ? e.target.value.trim() : undefined;
                                const updated = [...(formProduct.options || [])];
                                updated[idx] = {
                                  name: optName,
                                  price: optPrice,
                                  weight: val
                                };
                                setFormProduct({ ...formProduct, options: updated, variants: updated });
                              }}
                              placeholder="Poids (ex: 85 kg)"
                              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-blue-300 font-mono focus:outline-none focus:border-orange-500"
                            />
                          </div>

                          <div className="sm:col-span-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = (formProduct.options || []).filter((_, i) => i !== idx);
                                setFormProduct({ ...formProduct, options: updated, variants: updated });
                              }}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-md text-xs border border-rose-500/20 transition-colors cursor-pointer"
                              title="Supprimer cette déclinaison"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-xs text-slate-500 italic block py-1">
                      Aucune déclinaison configurée (le produit sera commandé en version standard unique).
                    </span>
                  )}
                </div>

                {/* Ajout d'option avec Nom, Prix spécifique et Poids optionnel */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Ajouter une déclinaison avec son propre prix et poids (ex: pour puissance/modèle distinct) :
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-5">
                      <input
                        type="text"
                        placeholder="Nom de l'option (ex: 20 kW / AC Triphasé)"
                        value={newOptionInput}
                        onChange={(e) => setNewOptionInput(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <input
                        type="number"
                        placeholder="Prix FCFA (ou base)"
                        value={newOptionPrice}
                        onChange={(e) => setNewOptionPrice(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="Poids (ex: 85 kg)"
                        value={newOptionWeight}
                        onChange={(e) => setNewOptionWeight(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (newOptionInput.trim()) {
                            const newVar: any = {
                              name: newOptionInput.trim(),
                              price: newOptionPrice.trim() ? parseFloat(newOptionPrice) : undefined,
                              weight: newOptionWeight.trim() ? newOptionWeight.trim() : undefined
                            };
                            const current = formProduct.options || [];
                            const next = [...current, newVar];
                            setFormProduct({ ...formProduct, options: next, variants: next });
                            setNewOptionInput('');
                            setNewOptionPrice('');
                            setNewOptionWeight('');
                          }
                        }}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-xs py-1.5 px-3 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Ajouter
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Saisie Coûts & Paramètres Fournisseur */}
              <div className="p-5 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-orange-400">
                  Paramètres Fournisseur & Logistique (Moteur de Calcul)
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Prix d'Achat Fournisseur
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formProduct.supplierPrice}
                      onChange={(e) => setFormProduct({ ...formProduct, supplierPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Devise d'Achat
                    </label>
                    <select
                      value={formProduct.supplierCurrency}
                      onChange={(e) => setFormProduct({ ...formProduct, supplierCurrency: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                    >
                      <option value="USD">USD ($) - 610 FCFA</option>
                      <option value="EUR">EUR (€) - 655.957 FCFA</option>
                      <option value="CNY">CNY (¥) - 85 FCFA</option>
                      <option value="XOF">XOF (FCFA)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Poids Brut Estimé
                    </label>
                    <input
                      type="text"
                      value={formProduct.weight}
                      onChange={(e) => setFormProduct({ ...formProduct, weight: e.target.value })}
                      placeholder="Ex: 5 kg"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Mode de Fret Préconisé
                    </label>
                    <select
                      value={formProduct.shippingMethod}
                      onChange={(e) => setFormProduct({ ...formProduct, shippingMethod: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="air">Aérien Express (~7 500 F/kg)</option>
                      <option value="sea">Maritime Économique</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Taux de Marge Commerciale (%)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.10"
                      max="0.80"
                      value={formProduct.marginRate}
                      onChange={(e) => setFormProduct({ ...formProduct, marginRate: parseFloat(e.target.value) || 0.35 })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Frais Entrepôt Export ($ USD)
                    </label>
                    <input
                      type="number"
                      step="5"
                      value={formProduct.warehouseDeliveryFeeUSD || 20}
                      onChange={(e) => setFormProduct({ ...formProduct, warehouseDeliveryFeeUSD: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                {/* OPTION DE RÉDUCTION SUR CE PRODUIT */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-white block">Option de Réduction sur ce Produit (%)</span>
                    <span className="text-[10px] text-slate-400">Pourcentage de remise direct déduit du prix catalogue (ex: 10 pour -10%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="80"
                      step="1"
                      placeholder="0% (Aucune)"
                      value={formProduct.discountPercent ?? ''}
                      onChange={(e) => setFormProduct({ ...formProduct, discountPercent: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
                    />
                    <span className="text-xs font-bold text-orange-400 font-mono">%</span>
                  </div>
                </div>

                {/* TOGGLE TVA 18% SUR LE PRODUIT */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">Application de la TVA (18%)</span>
                    <span className="text-[10px] text-slate-400">Désactivez ou ignorez pour produits exonérés ou régimes spéciaux</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormProduct({ ...formProduct, applyVat: !formProduct.applyVat })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      formProduct.applyVat !== false
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {formProduct.applyVat !== false ? 'TVA 18% Activée' : 'TVA Exonérée (0%)'}
                  </button>
                </div>

                {/* TOGGLE & REGLAGE ACOMPTE PRODUIT CHER */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">Acompte réglable pour produit cher</span>
                      <span className="text-[10px] text-slate-400">Activer l'exigence d'un acompte partiel à la commande (ex: 30%)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormProduct({ ...formProduct, showDeposit: !formProduct.showDeposit })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        formProduct.showDeposit
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {formProduct.showDeposit ? 'Acompte Activé' : 'Acompte Désactivé'}
                    </button>
                  </div>
                  {formProduct.showDeposit && (
                    <div className="flex items-center gap-3 pt-2 border-t border-slate-900">
                      <label className="text-[11px] text-slate-300 font-medium">Pourcentage d'acompte :</label>
                      <input
                        type="number"
                        min="10"
                        max="90"
                        value={formProduct.depositPercentage || 30}
                        onChange={(e) => setFormProduct({ ...formProduct, depositPercentage: parseInt(e.target.value) || 30 })}
                        className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-xs text-white font-mono"
                      />
                      <span className="text-xs font-mono text-amber-400 font-bold">
                        ({Math.round(((currentCalculatedPricing.priceTTC || 0) * (formProduct.depositPercentage || 30)) / 100).toLocaleString('fr-FR')} FCFA exigibles)
                      </span>
                    </div>
                  )}
                </div>

                {/* Résultat Calcul en temps réel */}
                <div className="mt-3 p-4 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Coût Achat XOF</span>
                    <span className="text-xs font-mono font-bold text-slate-200">
                      {currentCalculatedPricing.supplierPriceXOF.toLocaleString('fr-FR')} F
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Fret + Transit</span>
                    <span className="text-xs font-mono font-bold text-slate-200">
                      {Math.round(currentCalculatedPricing.freightCostXOF).toLocaleString('fr-FR')} F
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Prix Vente HT</span>
                    <span className="text-xs font-mono font-bold text-purple-400">
                      {currentCalculatedPricing.priceHT.toLocaleString('fr-FR')} F
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-orange-400 block uppercase font-bold">
                      Prix Client {formProduct.applyVat !== false ? 'TTC (18%)' : 'Net (TVA 0%)'}
                    </span>
                    <span className="text-sm font-mono font-black text-orange-400">
                      {currentCalculatedPricing.priceTTC.toLocaleString('fr-FR')} F
                    </span>
                  </div>
                </div>
              </div>

              {/* Switches Statut & Mise en ligne */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900 rounded-2xl border border-slate-800">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formProduct.isOnline !== false}
                    onChange={(e) => setFormProduct({ ...formProduct, isOnline: e.target.checked })}
                    className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">Mettre en ligne immédiatement</span>
                    <span className="text-[10px] text-slate-400">Si décoché, restera en mode Brouillon</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formProduct.inStock !== false}
                    onChange={(e) => setFormProduct({ ...formProduct, inStock: e.target.checked })}
                    className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">Stock Disponible Immédiatement</span>
                    <span className="text-[10px] text-slate-400">Si décoché, affiché « Sur Commande Fournisseur »</span>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingProduct(null); }}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black shadow-lg shadow-orange-600/30"
                >
                  {editingProduct ? 'Enregistrer les Modifications' : 'Ajouter au Catalogue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: IMPORTATION PAR LIEN MULTI-SITES (AVEC MODIFICATION DES INFORMATIONS RÉELLES) ================= */}
      {showImportLinkModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">Importer par Lien Multi-Plateformes</h3>
                <p className="text-xs text-slate-400 mt-0.5">Compatible AliExpress, Alibaba, 1688, Made-in-China, Europe & USA</p>
              </div>
              <button 
                onClick={() => { setShowImportLinkModal(false); setParsedLinkData(null); }}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Collez le lien URL du produit fournisseur :
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    placeholder="https://www.alibaba.com/product-detail/... ou aliexpress.com/item/..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                  <button
                    onClick={handleParseLink}
                    disabled={isScraping}
                    className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-orange-600/30 cursor-pointer"
                  >
                    <Search className={`w-4 h-4 ${isScraping ? 'animate-spin' : ''}`} />
                    <span>{isScraping ? 'Analyse en cours...' : 'Analyser'}</span>
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2 px-1">
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-400">
                    <input
                      type="checkbox"
                      checked={useJsRender}
                      onChange={(e) => setUseJsRender(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-orange-600 focus:ring-0"
                    />
                    <span>Mode navigateur lourd ZenRows <strong className="text-amber-400">(5 crédits)</strong></span>
                  </label>
                  <span className="text-[10px] text-slate-500">Mode éco par défaut : 1 crédit</span>
                </div>
              </div>

              {/* Formulaire d'Ajustement des Données Réelles après Analyse */}
              {parsedLinkData && (
                <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 space-y-5 animate-fadeIn">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase tracking-wider">
                      Plateforme Détectée : {parsedLinkData.detectedPlatform} ({parsedLinkData.detectedCountry})
                    </span>
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Extraction Complète & Traduite
                    </span>
                  </div>

                  {/* 1. Titre & Marque Constructeur & Catégorie */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Titre / Désignation en Français (Traduit & Vendeur) :
                      </label>
                      <input
                        type="text"
                        value={importForm.name}
                        onChange={(e) => setImportForm({ ...importForm, name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Marque Constructeur Réelle :
                      </label>
                      <input
                        type="text"
                        value={importForm.brand}
                        onChange={(e) => setImportForm({ ...importForm, brand: e.target.value })}
                        placeholder="Ex: Fluke, Bosch, Schneider ou Générique OEM"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                      <span className="text-[9px] text-slate-500 mt-0.5 block">Pas de nom de place de marché</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Catégorie Assignée :
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={importForm.category}
                          onChange={(e) => setImportForm({ ...importForm, category: e.target.value })}
                          list="categories-list"
                          placeholder="Sélectionnez ou créez..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                        />
                        <datalist id="categories-list">
                          {categories.map(c => (
                            <option key={c.name} value={c.name} />
                          ))}
                        </datalist>
                      </div>
                      <span className="text-[9px] text-slate-500 mt-0.5 block">Création automatique si nouvelle</span>
                    </div>
                  </div>

                  {/* 2. Fournisseur Extrait & Assignation Automatique */}
                  <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/90 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> Fournisseur & Fabricant Extrait
                      </span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                        Ajouté automatiquement à la liste
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">Nom de l'entreprise :</label>
                        <input
                          type="text"
                          value={importForm.supplierName}
                          onChange={(e) => setImportForm({ ...importForm, supplierName: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">Pays & Localisation :</label>
                        <input
                          type="text"
                          value={importForm.supplierCountry}
                          onChange={(e) => setImportForm({ ...importForm, supplierCountry: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. Galerie Multi-Images HD Importée */}
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Galerie Complète des Images du Produit
                      </label>
                      <span className="text-[10px] font-mono text-orange-400 bg-orange-950/40 border border-orange-800/40 px-2 py-0.5 rounded-full font-bold">
                        {[importForm.image, ...importForm.additionalImages].filter(Boolean).length} photo(s) extraite(s)
                      </span>
                    </div>

                    {/* Aperçu des miniatures */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {[importForm.image, ...importForm.additionalImages].filter(Boolean).map((imgUrl, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-700 bg-slate-900 group">
                          <img 
                            src={getProductImageUrl(imgUrl)} 
                            alt="" 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer" 
                            onError={handleImageError}
                          />
                          {idx === 0 ? (
                            <span className="absolute top-1 left-1 bg-orange-600 text-[8px] font-black text-white px-1.5 py-0.5 rounded">
                              ★ Principale
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const all = [importForm.image, ...importForm.additionalImages].filter(Boolean);
                                const chosen = all[idx];
                                const rest = all.filter((_, i) => i !== idx);
                                setImportForm({
                                  ...importForm,
                                  image: chosen,
                                  additionalImages: rest
                                });
                              }}
                              className="absolute top-1 left-1 bg-slate-900/90 hover:bg-orange-600 text-[8px] font-bold text-slate-300 hover:text-white px-1 py-0.5 rounded"
                              title="Définir comme photo principale"
                            >
                              Principale
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const all = [importForm.image, ...importForm.additionalImages].filter(Boolean);
                              const remaining = all.filter((_, i) => i !== idx);
                              setImportForm({
                                ...importForm,
                                image: remaining[0] || '',
                                additionalImages: remaining.slice(1)
                              });
                            }}
                            className="absolute top-1 right-1 p-0.5 bg-black/80 hover:bg-rose-600 text-white rounded cursor-pointer"
                            title="Supprimer cette photo"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <ImageUploadInput
                      label="Ajouter une image supplémentaire"
                      value=""
                      onChange={(newUrl) => {
                        if (newUrl) {
                          if (!importForm.image) {
                            setImportForm({ ...importForm, image: newUrl });
                          } else {
                            setImportForm({ ...importForm, additionalImages: [...importForm.additionalImages, newUrl] });
                          }
                        }
                      }}
                      placeholder="Collez une URL d'image..."
                    />
                  </div>

                  {/* 4. Caractéristiques Techniques Complètes (Traduites en Français) */}
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                          Caractéristiques Techniques Détaillées (Specs Traduites)
                        </label>
                        <p className="text-[10px] text-slate-400">Présentation structurée dans la fiche produit</p>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full font-bold">
                        {Object.keys(importForm.specs || {}).length} caractéristiques
                      </span>
                    </div>

                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/70 rounded-lg border border-slate-800 text-xs">
                      {Object.entries(importForm.specs || {}).map(([k, v], idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 hover:bg-slate-900/40">
                          <span className="font-bold text-slate-300 w-2/5 truncate">{k}</span>
                          <span className="text-slate-400 font-mono flex-1 px-2 truncate">{v}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const s = { ...importForm.specs };
                              delete s[k];
                              setImportForm({ ...importForm, specs: s });
                            }}
                            className="p-1 hover:bg-rose-500/20 text-rose-400 rounded transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Ajout rapide de caractéristique */}
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Caractéristique (ex: Débit)"
                        value={newSpecKey}
                        onChange={(e) => setNewSpecKey(e.target.value)}
                        className="sm:col-span-2 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                      />
                      <input
                        type="text"
                        placeholder="Valeur (ex: 50 m³/h)"
                        value={newSpecVal}
                        onChange={(e) => setNewSpecVal(e.target.value)}
                        className="sm:col-span-2 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newSpecKey.trim() && newSpecVal.trim()) {
                            setImportForm({
                              ...importForm,
                              specs: {
                                ...(importForm.specs || {}),
                                [newSpecKey.trim()]: newSpecVal.trim()
                              }
                            });
                            setNewSpecKey('');
                            setNewSpecVal('');
                          }
                        }}
                        className="bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-xs py-1 px-3 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Ajouter
                      </button>
                    </div>
                  </div>

                  {/* 4.1 Options & Déclinaisons Réelles Extraites (SKU / Variantes d'Achat Réelles) */}
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                          Options & Déclinaisons Disponibles (SKU / Variantes Réelles)
                        </label>
                        <p className="text-[10px] text-slate-400">
                          Options d'achat réelles extraites du produit (ex: puissances, rendements, dimensions). Le client pourra choisir parmi ces options.
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-orange-400 bg-orange-950/40 border border-orange-800/40 px-2 py-0.5 rounded-full font-bold">
                        {(importForm.options || []).length} option{(importForm.options || []).length > 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Liste des options extraites avec édition directe */}
                    <div className="space-y-2 min-h-10 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                      {(importForm.options || []).length > 0 ? (
                        (importForm.options || []).map((opt, idx) => {
                          const optObj = typeof opt === 'string' 
                            ? { name: opt, price: undefined, weight: undefined } 
                            : (opt as any);
                          const optName = optObj.name || '';
                          const optPrice = optObj.price;
                          const optWeight = optObj.weight;

                          return (
                            <div
                              key={idx}
                              className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2.5 bg-slate-950/80 border border-slate-800 rounded-lg hover:border-slate-700 transition-all"
                            >
                              <div className="sm:col-span-5">
                                <label className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5 sm:hidden">
                                  Nom déclinaison :
                                </label>
                                <input
                                  type="text"
                                  value={optName}
                                  onChange={(e) => {
                                    const updated = [...(importForm.options || [])];
                                    updated[idx] = {
                                      name: e.target.value,
                                      price: optPrice,
                                      weight: optWeight
                                    };
                                    setImportForm({ ...importForm, options: updated });
                                  }}
                                  placeholder="Nom de l'option (ex: 20 kW)"
                                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                                />
                              </div>

                              <div className="sm:col-span-3">
                                <label className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5 sm:hidden">
                                  Prix FCFA spécifique :
                                </label>
                                <input
                                  type="number"
                                  value={optPrice !== undefined && optPrice !== null ? optPrice : ''}
                                  onChange={(e) => {
                                    const val = e.target.value.trim() ? parseFloat(e.target.value) : undefined;
                                    const updated = [...(importForm.options || [])];
                                    updated[idx] = {
                                      name: optName,
                                      price: val,
                                      weight: optWeight
                                    };
                                    setImportForm({ ...importForm, options: updated });
                                  }}
                                  placeholder="Prix FCFA"
                                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-orange-500"
                                />
                              </div>

                              <div className="sm:col-span-3">
                                <label className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5 sm:hidden">
                                  Poids spécifique :
                                </label>
                                <input
                                  type="text"
                                  value={optWeight || ''}
                                  onChange={(e) => {
                                    const val = e.target.value.trim() ? e.target.value.trim() : undefined;
                                    const updated = [...(importForm.options || [])];
                                    updated[idx] = {
                                      name: optName,
                                      price: optPrice,
                                      weight: val
                                    };
                                    setImportForm({ ...importForm, options: updated });
                                  }}
                                  placeholder="Poids (ex: 85 kg)"
                                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-blue-300 font-mono focus:outline-none focus:border-orange-500"
                                />
                              </div>

                              <div className="sm:col-span-1 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = (importForm.options || []).filter((_, i) => i !== idx);
                                    setImportForm({ ...importForm, options: updated });
                                  }}
                                  className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-md text-xs border border-rose-500/20 transition-colors cursor-pointer"
                                  title="Retirer cette option"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <span className="text-xs text-slate-500 italic block py-1">
                          Aucune option spécifique détectée pour ce produit (il sera vendu en modèle standard unique).
                        </span>
                      )}
                    </div>

                    {/* Ajout rapide d'option avec Nom, Prix spécifique et Poids optionnel */}
                    <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800 space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Ajouter une déclinaison avec son propre prix et poids (ex: pour puissance/modèle distinct) :
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <div className="sm:col-span-5">
                          <input
                            type="text"
                            placeholder="Nom de l'option (ex: 20 kW / AC Triphasé)"
                            value={newImportOptionInput}
                            onChange={(e) => setNewImportOptionInput(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <input
                            type="number"
                            placeholder="Prix FCFA (ou base)"
                            value={newImportOptionPrice}
                            onChange={(e) => setNewImportOptionPrice(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            placeholder="Poids (ex: 85 kg)"
                            value={newImportOptionWeight}
                            onChange={(e) => setNewImportOptionWeight(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (newImportOptionInput.trim()) {
                                const optName = newImportOptionInput.trim();
                                const optPrice = newImportOptionPrice.trim() ? parseFloat(newImportOptionPrice) : undefined;
                                const optWeight = newImportOptionWeight.trim() ? newImportOptionWeight.trim() : undefined;
                                
                                const newOptItem: any = {
                                  name: optName,
                                  price: optPrice,
                                  weight: optWeight
                                };

                                const current = importForm.options || [];
                                setImportForm({ ...importForm, options: [...current, newOptItem] });
                                setNewImportOptionInput('');
                                setNewImportOptionPrice('');
                                setNewImportOptionWeight('');
                              }
                            }}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-xs py-1.5 px-3 flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> Ajouter
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 5. Saisie Prix réel, Devise, Poids et Dimensions */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Prix Fournisseur *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={importForm.supplierPrice}
                        onChange={(e) => setImportForm({ ...importForm, supplierPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Devise d'Achat
                      </label>
                      <select
                        value={importForm.supplierCurrency}
                        onChange={(e) => setImportForm({ ...importForm, supplierCurrency: e.target.value as any })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="CNY">CNY (¥)</option>
                        <option value="XOF">XOF (FCFA)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Poids Brut (kg) *
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={importForm.weight}
                        onChange={(e) => setImportForm({ ...importForm, weight: parseFloat(e.target.value) || 1 })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Dimensions L x l x H
                      </label>
                      <input
                        type="text"
                        value={importForm.dimensions}
                        onChange={(e) => setImportForm({ ...importForm, dimensions: e.target.value })}
                        placeholder="30 x 20 x 15 cm"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* 6. MOTEUR TRANSPARENT DE CALCUL DU FRET MARITIME (POIDS ET VOLUME) */}
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5" /> Barème & Calcul du Fret Maritime (Transparent)
                      </label>
                      <span className="text-[10px] text-slate-400">
                        Tarif Poids: <strong>1 800 F/kg</strong> • Tarif Volume: <strong>250 000 F/m³</strong>
                      </span>
                    </div>

                    {/* Toggles pour cocher/décocher ou ignorer l'un ou l'autre */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <label className="flex items-center gap-2 p-2.5 bg-slate-900 rounded-lg border border-slate-800 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={!importForm.ignoreSeaWeight}
                          onChange={(e) => setImportForm({ ...importForm, ignoreSeaWeight: !e.target.checked })}
                          className="w-4 h-4 accent-orange-500 rounded"
                        />
                        <div>
                          <span className="text-white font-bold block">Calcul Maritime au Poids (1 800 F/kg)</span>
                          <span className="text-[10px] text-slate-400">
                            Coût estimé : {((importCalculatedPricing.seaCostByWeightXOF || 0)).toLocaleString('fr-FR')} FCFA
                          </span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2 p-2.5 bg-slate-900 rounded-lg border border-slate-800 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={!importForm.ignoreSeaVolume}
                          onChange={(e) => setImportForm({ ...importForm, ignoreSeaVolume: !e.target.checked })}
                          className="w-4 h-4 accent-orange-500 rounded"
                        />
                        <div>
                          <span className="text-white font-bold block">Calcul Maritime au Volume (250 000 F/m³)</span>
                          <span className="text-[10px] text-slate-400">
                            Coût estimé : {((importCalculatedPricing.seaCostByVolumeXOF || 0)).toLocaleString('fr-FR')} FCFA (~{(importCalculatedPricing.computedVolumeCbm || 0)} m³)
                          </span>
                        </div>
                      </label>
                    </div>

                    <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-300">
                        Base de calcul maritime appliquée : <strong className="text-amber-400">{importCalculatedPricing.seaCalculationBasis}</strong>
                      </span>
                      <span className="font-mono font-black text-white text-sm">
                        {importCalculatedPricing.seaFreightCostXOF.toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                  </div>

                  {/* Toggle TVA & Acompte */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <div>
                        <span className="text-xs text-slate-300 font-semibold block">TVA Légale (18%)</span>
                        <span className="text-[10px] text-slate-500">Activer ou ignorer la TVA</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setImportForm({ ...importForm, applyVat: !importForm.applyVat })}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          importForm.applyVat ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {importForm.applyVat ? 'TVA 18% Active' : 'TVA 0%'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <div>
                        <span className="text-xs text-slate-300 font-semibold block">Option Acompte</span>
                        <span className="text-[10px] text-slate-500">Pour produits de valeur</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setImportForm({ ...importForm, showDeposit: !importForm.showDeposit })}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          importForm.showDeposit ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {importForm.showDeposit ? 'Acompte 30%' : 'Désactivé'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 sm:col-span-2">
                      <div>
                        <span className="text-xs text-slate-300 font-semibold block">Option de Réduction sur ce Produit (%)</span>
                        <span className="text-[10px] text-slate-500">Appliquer une remise en % sur ce matériel importé</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="80"
                          step="1"
                          placeholder="0% (Aucune)"
                          value={importForm.discountPercent ?? ''}
                          onChange={(e) => setImportForm({ ...importForm, discountPercent: e.target.value ? parseInt(e.target.value) : undefined })}
                          className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                        />
                        <span className="text-xs font-bold text-orange-400 font-mono">%</span>
                      </div>
                    </div>
                  </div>

                  {/* Résultat Calcul en temps réel */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Coût Achat</span>
                      <span className="text-xs font-bold text-white font-mono">
                        {importCalculatedPricing.supplierPriceXOF.toLocaleString('fr-FR')} F
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Fret Maritime</span>
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        {Math.round(importCalculatedPricing.seaFreightCostXOF).toLocaleString('fr-FR')} F
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Fret Aérien (≤20kg)</span>
                      <span className="text-xs font-bold text-blue-400 font-mono">
                        {Math.round(importCalculatedPricing.airFreightCostXOF).toLocaleString('fr-FR')} F
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-orange-400 block font-bold uppercase">Prix Vente TTC</span>
                      <span className="text-sm font-black text-orange-400 font-mono">
                        {importCalculatedPricing.priceTTC.toLocaleString('fr-FR')} F
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={handleConfirmImport}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer active:scale-98"
                    >
                      <Check className="w-4 h-4" />
                      Valider et Insérer au Catalogue
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: FACTURE PROFORMA / BON DE COMMANDE ================= */}
      {showInvoiceModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-8 sm:p-10 font-sans">
            <div className="flex justify-between items-start pb-6 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-[#003366]">ZONE</span>
                  <span className="text-2xl font-black text-[#FF6600]">EQUIPEMENTS</span>
                </div>
                <p className="text-xs text-slate-500 font-semibold mt-1">Zone Équipements Sénégal SARL</p>
                <p className="text-[11px] text-slate-400">Km 4, Boulevard du Centenaire, Dakar • NINEA: 008921822 • zoneequipements@gmail.com • +221 76 653 83 84</p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-slate-100 rounded-md text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  {selectedOrder.isQuote ? 'Devis Proforma' : 'Facture Officielle'}
                </span>
                <p className="text-sm font-mono font-bold text-slate-900 mt-2">{selectedOrder.orderNumber}</p>
                <p className="text-xs text-slate-500">Date: {new Date(selectedOrder.createdAt).toLocaleDateString('fr-FR')}</p>
              </div>
            </div>

            {/* Client Infos */}
            <div className="grid grid-cols-2 gap-8 my-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
              <div>
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">Destinataire / Client :</span>
                <p className="font-bold text-slate-900 text-sm">{selectedOrder.customerCompany || selectedOrder.customerName}</p>
                <p className="text-slate-600">{selectedOrder.customerAddress}</p>
                <p className="text-slate-600">{selectedOrder.customerCity}, {selectedOrder.customerCountry}</p>
                <p className="text-slate-600">Tél : {selectedOrder.customerPhone}</p>
              </div>
              <div>
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">Conditions Commerciales :</span>
                <p className="text-slate-700"><strong>Mode de règlement :</strong> {selectedOrder.paymentMethod}</p>
                <p className="text-slate-700"><strong>Statut paiement :</strong> {selectedOrder.paymentStatus}</p>
                <p className="text-slate-700"><strong>Livraison :</strong> DAP Entrepôt / Chantier Dakar</p>
              </div>
            </div>

            {/* Items Table */}
            <div className="my-6">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-slate-500 uppercase text-[10px]">
                    <th className="py-2.5">Désignation Matériel</th>
                    <th className="py-2.5 text-center">Quantité</th>
                    <th className="py-2.5 text-right">Prix Unitaire HT</th>
                    <th className="py-2.5 text-right">Montant HT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {selectedOrder.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-3 font-sans font-medium text-slate-900">
                        {it.name}
                        <span className="block text-[10px] text-slate-400">{it.brand}</span>
                      </td>
                      <td className="py-3 text-center font-bold text-slate-800">{it.quantity}</td>
                      <td className="py-3 text-right text-slate-600">{Math.round(it.price / 1.18).toLocaleString('fr-FR')} F</td>
                      <td className="py-3 text-right font-bold text-slate-900">{Math.round((it.price / 1.18) * it.quantity).toLocaleString('fr-FR')} F</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end my-6">
              <div className="w-72 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Sous-total HT :</span>
                  <span className="font-mono font-bold">{selectedOrder.subtotalHT.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>TVA Légale (18%) :</span>
                  <span className="font-mono font-bold">{selectedOrder.vatAmount.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between text-slate-900 pt-2 border-t-2 border-slate-900 text-sm font-black">
                  <span>Total Net à Payer :</span>
                  <span className="font-mono text-orange-600">{selectedOrder.totalTTC.toLocaleString('fr-FR')} FCFA</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimer le Document
              </button>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: GESTION / CRÉATION FOURNISSEUR ================= */}
      <SupplierManagerModal
        isOpen={showSupplierModal}
        onClose={() => {
          setShowSupplierModal(false);
          setEditingSupplier(null);
        }}
        supplierToEdit={editingSupplier}
        onSupplierSaved={() => {
          refreshData();
          triggerToast('Fiche fournisseur enregistrée avec succès.');
        }}
        onDelete={(_id, name) => {
          refreshData();
          triggerToast(`Fournisseur "${name}" supprimé.`);
        }}
      />

      {/* ================= MODAL: BON DE COMMANDE FOURNISSEUR GROUPÉ (PO) ================= */}
      <PurchaseOrderModal
        isOpen={showPoModal}
        onClose={() => {
          setShowPoModal(false);
          setSelectedPoSupplier(null);
        }}
        supplier={selectedPoSupplier}
        orders={orders}
        onOrderUpdated={() => {
          refreshData();
          triggerToast('Dossier mis à jour.');
        }}
      />

      {/* ================= MODAL: TRANSMISSION DES COMMANDES QUOTIDIENNES ================= */}
      <DailySupplierDispatchModal
        isOpen={showDailyDispatchModal}
        onClose={() => setShowDailyDispatchModal(false)}
        orders={orders}
        suppliers={suppliers}
        onOrdersUpdated={() => {
          refreshData();
        }}
        onNotify={(msg) => triggerToast(msg)}
      />

      {/* ================= MODAL: NOTIFICATION CLIENT (WHATSAPP & EMAIL) ================= */}
      <ClientNotificationModal
        isOpen={showNotificationModal}
        onClose={() => {
          setShowNotificationModal(false);
          setNotificationOrder(null);
        }}
        order={notificationOrder}
        newStatus={notificationStatus}
      />

      {/* ================= MODAL: CONFIRMATION SUPPRESSION SÉCURISÉE ================= */}
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

import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  BarChart3, Package, ShoppingCart, Users, Shield, Plus, Link as LinkIcon, 
  Search, Filter, Trash2, Edit, Check, AlertTriangle, ArrowUpRight, 
  Printer, RefreshCw, X, DollarSign, 
  TrendingUp, Truck, Layers, FileText, CheckCircle2, Eye, Globe, Settings,
  Image as ImageIcon, MessageSquare, Send, Mail, Phone, ExternalLink, HelpCircle,
  ShieldCheck, LogIn, AlertCircle, LogOut, FileSpreadsheet, Warehouse, Star, MapPin,
  Activity
} from 'lucide-react';
import { 
  catalogService, ExtendedProduct, ProductVariantItem, Order, Supplier, AgentWarehouse, AuditLog, EXCHANGE_RATES, cleanBrand,
  computeSingleVariantPricing, getCheapestVariant, getEffectiveProductBasePrice, normalizeVariants,
  formatSpecsToCharacteristicsText, parseVariantCharacteristicsToSpecs, parseCharacteristicsTextToSpecs, translateSpecsRecordToFrench,
  smartTranslateProductTitleToFrench, smartTranslateProductDescriptionToFrench, isProductSourcing,
  getClientWarehouseCode, getItemFreightCode, formatSupplierParcelLabel,
  formatWarehouseConsigneeLine, formatWarehouseFullAddress
} from '../services/catalogService';
import { getProductImageUrl, handleImageError, DEFAULT_PRODUCT_IMAGE } from '../constants';
import { siteSettingsService, CategoryItem } from '../services/siteSettingsService';
import { useAuth } from '../AuthContext';
import { auth } from '../firebase';
import { CatalogStructureManager } from '../components/admin/CatalogStructureManager';
import { SupplierManagerModal } from '../components/admin/SupplierManagerModal';
import { AgentWarehouseManagerModal } from '../components/admin/AgentWarehouseManagerModal';
import { PurchaseOrderModal } from '../components/admin/PurchaseOrderModal';
import { DailySupplierDispatchModal } from '../components/admin/DailySupplierDispatchModal';
import { ClientNotificationModal } from '../components/admin/ClientNotificationModal';
import { SiteSettingsManager } from '../components/admin/SiteSettingsManager';
import { ImageUploadInput } from '../components/ImageUploadInput';
import { ConfirmModal } from '../components/admin/ConfirmModal';
import { printHtmlDocument } from '../utils/printDocument';
import AnalyticsTrafficManager from '../components/admin/AnalyticsTrafficManager';
import AdminNotificationsBell from '../components/admin/AdminNotificationsBell';
import { EmailMarketingManager } from '../components/admin/EmailMarketingManager';
import { DirectInvoiceModal } from '../components/admin/DirectInvoiceModal';

export default function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<'finance' | 'catalog' | 'orders' | 'suppliers' | 'warehouses' | 'audit' | 'analytics' | 'campaigns' | 'security'>('finance');
  const [catalogSubTab, setCatalogSubTab] = useState<'products' | 'structure'>('products');
  const [showDirectInvoiceModal, setShowDirectInvoiceModal] = useState(false);
  
  // Data states
  const [products, setProducts] = useState<ExtendedProduct[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [agentWarehouses, setAgentWarehouses] = useState<AgentWarehouse[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState(catalogService.getFinancialStats());
  const [categories, setCategories] = useState<CategoryItem[]>(() => siteSettingsService.getCategories());
  const [siteSettings, setSiteSettings] = useState(() => siteSettingsService.getSettings());

  // Search & Filters for Catalog
  const [searchTerm, setSearchTerm] = useState('');
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
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
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);

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
    description?: string;
    inStock?: boolean;
    availabilityMode?: 'stock' | 'sourcing';
    showDeposit?: boolean;
    depositPercentage?: number;
    discountPercent?: number;
  }>({
    name: '',
    brand: '',
    category: 'Outillage électrique',
    supplierPrice: 0,
    supplierCurrency: 'USD',
    weight: 0,
    dimensions: '',
    marginRate: 0.35,
    applyVat: true,
    ignoreSeaWeight: false,
    ignoreSeaVolume: false,
    image: '',
    additionalImages: [],
    specs: {},
    supplierId: '',
    supplierName: '',
    supplierCountry: '',
    supplierPlatform: 'Alibaba',
    description: '',
    inStock: false,
    availabilityMode: 'sourcing',
    showDeposit: false,
    depositPercentage: 30,
    discountPercent: undefined
  });

  // Expandable Category Manager inside Add/Edit & Import Modals
  const [showCategoryDrawer, setShowCategoryDrawer] = useState(false);
  const [editingCatIdx, setEditingCatIdx] = useState<number | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [editingCatBrands, setEditingCatBrands] = useState('');
  const [newQuickCatName, setNewQuickCatName] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

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
  const [newOptionImage, setNewOptionImage] = useState('');
  const [newOptionCharacteristics, setNewOptionCharacteristics] = useState('');
  const [newOptionSpecs, setNewOptionSpecs] = useState<Record<string, string>>({});
  const [showNewOptionSpecs, setShowNewOptionSpecs] = useState(false);
  const [openVariantSpecsIdx, setOpenVariantSpecsIdx] = useState<number | null>(null);
  const [newVariantSpecKey, setNewVariantSpecKey] = useState('');
  const [newVariantSpecVal, setNewVariantSpecVal] = useState('');

  const [newImportOptionInput, setNewImportOptionInput] = useState('');
  const [newImportOptionPrice, setNewImportOptionPrice] = useState('');
  const [newImportOptionWeight, setNewImportOptionWeight] = useState('');
  const [newImportOptionImage, setNewImportOptionImage] = useState('');
  const [newImportOptionCharacteristics, setNewImportOptionCharacteristics] = useState('');
  const [newImportOptionSpecs, setNewImportOptionSpecs] = useState<Record<string, string>>({});
  const [showNewImportOptionSpecs, setShowNewImportOptionSpecs] = useState(false);
  const [openImportVariantSpecsIdx, setOpenImportVariantSpecsIdx] = useState<number | null>(null);
  const [newImportVariantSpecKey, setNewImportVariantSpecKey] = useState('');
  const [newImportVariantSpecVal, setNewImportVariantSpecVal] = useState('');

  // Multiple images for manual form
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [newGalleryImageUrl, setNewGalleryImageUrl] = useState('');

  // Load data
  const refreshData = () => {
    setProducts(catalogService.getProducts());
    setOrders(catalogService.getOrders());
    setSuppliers(catalogService.getSuppliers());
    setAgentWarehouses(catalogService.getAgentWarehouses());
    setAuditLogs(catalogService.getAuditLogs());
    setStats(catalogService.getFinancialStats());
    setCategories(siteSettingsService.getCategories());
    setSiteSettings(siteSettingsService.getSettings());
  };

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'catalog-structure') {
      setActiveTab('catalog');
      setCatalogSubTab('structure');
    } else if (tabParam === 'orders' || tabParam === 'suppliers' || tabParam === 'security' || tabParam === 'catalog' || tabParam === 'finance') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    refreshData();
    const unsubCatalog = catalogService.subscribe(refreshData);
    const unsubSettings = siteSettingsService.subscribe(refreshData);
    window.addEventListener('ze_catalog_updated', refreshData);
    window.addEventListener('ze_orders_updated', refreshData);
    window.addEventListener('ze_suppliers_updated', refreshData);
    window.addEventListener('agent_warehouses_updated', refreshData);
    window.addEventListener('ze_settings_updated', refreshData);
    window.addEventListener('storage', refreshData);
    return () => {
      unsubCatalog();
      unsubSettings();
      window.removeEventListener('ze_catalog_updated', refreshData);
      window.removeEventListener('ze_orders_updated', refreshData);
      window.removeEventListener('ze_suppliers_updated', refreshData);
      window.removeEventListener('agent_warehouses_updated', refreshData);
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
    const baseSupplierPrice = Number(formProduct.supplierPrice) || 0;
    const pricingCtx = {
      supplierCurrency: formProduct.supplierCurrency || 'USD',
      marginRate: Number(formProduct.marginRate) || 0.35,
      warehouseDeliveryFeeUSD: Number(formProduct.warehouseDeliveryFeeUSD) || 0,
      applyVat: formProduct.applyVat !== false
    };
    const cheapestVar = getCheapestVariant(formProduct.options || [], pricingCtx);
    const effectiveSupplierPrice = baseSupplierPrice > 0
      ? baseSupplierPrice
      : (cheapestVar?.supplierPrice && cheapestVar.supplierPrice > 0 ? cheapestVar.supplierPrice : 0);
    const effectiveWeight = (baseSupplierPrice <= 0 && cheapestVar?.weight)
      ? (parseFloat(String(cheapestVar.weight).replace(/[^0-9.]/g, '')) || rawWeight || 2)
      : (rawWeight || 2);

    const calc = catalogService.calculatePricing({
      supplierPrice: effectiveSupplierPrice,
      supplierCurrency: formProduct.supplierCurrency || 'USD',
      weightKg: effectiveWeight,
      ignoreSeaWeight: formProduct.ignoreSeaWeight,
      ignoreSeaVolume: formProduct.ignoreSeaVolume,
      marginRate: Number(formProduct.marginRate) || 0.35,
      preferredFreight: formProduct.shippingMethod || 'auto',
      warehouseDeliveryUSD: Number(formProduct.warehouseDeliveryFeeUSD) || 0,
      applyVat: formProduct.applyVat !== false
    });

    if (effectiveSupplierPrice <= 0 && cheapestVar && cheapestVar.price && cheapestVar.price > 0) {
      const activeVatRate = siteSettings.defaultVatRate ?? 0.18;
      const vatDivisor = formProduct.applyVat !== false ? (1 + activeVatRate) : 1;
      const ht = Math.round(cheapestVar.price / vatDivisor);
      return {
        ...calc,
        priceHT: ht,
        priceTTC: cheapestVar.price,
        totalCostPrice: cheapestVar.costPrice || Math.round(ht * (1 - (Number(formProduct.marginRate) || 0.35)))
      };
    }
    return calc;
  }, [formProduct.supplierPrice, formProduct.supplierCurrency, formProduct.weight, formProduct.marginRate, formProduct.shippingMethod, formProduct.warehouseDeliveryFeeUSD, formProduct.applyVat, formProduct.ignoreSeaWeight, formProduct.ignoreSeaVolume, formProduct.options, siteSettings]);

  // Dynamic pricing calculation helper for import form
  const importCalculatedPricing = useMemo(() => {
    const baseSupplierPrice = Number(importForm.supplierPrice) || 0;
    const pricingCtx = {
      supplierCurrency: importForm.supplierCurrency,
      marginRate: Number(importForm.marginRate) || 0.35,
      warehouseDeliveryFeeUSD: 20,
      applyVat: importForm.applyVat
    };
    const cheapestVar = getCheapestVariant(importForm.options || [], pricingCtx);
    const effectiveSupplierPrice = baseSupplierPrice > 0
      ? baseSupplierPrice
      : (cheapestVar?.supplierPrice && cheapestVar.supplierPrice > 0 ? cheapestVar.supplierPrice : 0);

    const calc = catalogService.calculatePricing({
      supplierPrice: effectiveSupplierPrice,
      supplierCurrency: importForm.supplierCurrency,
      weightKg: Number(importForm.weight) || 1,
      ignoreSeaWeight: importForm.ignoreSeaWeight,
      ignoreSeaVolume: importForm.ignoreSeaVolume,
      marginRate: Number(importForm.marginRate) || 0.35,
      preferredFreight: 'auto',
      applyVat: importForm.applyVat
    });

    if (effectiveSupplierPrice <= 0 && cheapestVar && cheapestVar.price && cheapestVar.price > 0) {
      const activeVatRate = siteSettings.defaultVatRate ?? 0.18;
      const vatDivisor = importForm.applyVat !== false ? (1 + activeVatRate) : 1;
      const ht = Math.round(cheapestVar.price / vatDivisor);
      return {
        ...calc,
        priceHT: ht,
        priceTTC: cheapestVar.price,
        totalCostPrice: cheapestVar.costPrice || Math.round(ht * (1 - (Number(importForm.marginRate) || 0.35)))
      };
    }
    return calc;
  }, [importForm.supplierPrice, importForm.supplierCurrency, importForm.weight, importForm.marginRate, importForm.applyVat, importForm.ignoreSeaWeight, importForm.ignoreSeaVolume, importForm.options, siteSettings]);

  // Open Edit modal
  const handleOpenEdit = (prod: ExtendedProduct) => {
    const sourcing = isProductSourcing(prod);
    setEditingProduct(prod);
    setFormProduct({
      ...prod,
      inStock: !sourcing,
      availabilityMode: sourcing ? 'sourcing' : 'stock',
      description: prod.description || smartTranslateProductDescriptionToFrench(prod.description, prod.name, prod.specs),
      applyVat: prod.applyVat !== false,
      warehouseDeliveryFeeUSD: prod.warehouseDeliveryFeeUSD || 20,
      specs: translateSpecsRecordToFrench(prod.specs || {}),
      options: prod.options || (prod as any).variants || [],
      ignoreSeaWeight: false,
      ignoreSeaVolume: false
    });
    const imgs = prod.images && prod.images.length > 0 ? [...prod.images] : [prod.image || prod.img || ''];
    setGalleryImages(imgs.filter(Boolean));
    setNewOptionInput('');
    setNewOptionPrice('');
    setNewOptionWeight('');
    setNewOptionImage('');
    setNewOptionCharacteristics('');
    setNewOptionSpecs({});
    setShowNewOptionSpecs(false);
    setOpenVariantSpecsIdx(null);
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
      dimensions: '',
      origin: 'Chine',
      marginRate: 0.35,
      shippingMethod: 'air',
      isOnline: true,
      inStock: true,
      availabilityMode: 'stock',
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
    setNewOptionPrice('');
    setNewOptionWeight('');
    setNewOptionImage('');
    setNewOptionCharacteristics('');
    setNewOptionSpecs({});
    setShowNewOptionSpecs(false);
    setOpenVariantSpecsIdx(null);
    setShowAddModal(true);
  };

  // Save manual add / edit
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProduct.name?.trim()) {
      alert("Veuillez saisir un nom pour le produit.");
      return;
    }

    const pricingCtx = {
      supplierCurrency: formProduct.supplierCurrency || 'USD',
      marginRate: Number(formProduct.marginRate) || 0.35,
      warehouseDeliveryFeeUSD: Number(formProduct.warehouseDeliveryFeeUSD) || 0,
      applyVat: formProduct.applyVat !== false
    };
    const normalizedOpts = normalizeVariants(formProduct.options || [], pricingCtx);
    const calculated = currentCalculatedPricing;
    const finalImages = galleryImages.filter(Boolean);
    const mainImg = finalImages[0] || formProduct.image || formProduct.img || DEFAULT_PRODUCT_IMAGE;
    const translatedSpecs = translateSpecsRecordToFrench(formProduct.specs || {});
    const isSourcingMode = formProduct.availabilityMode
      ? formProduct.availabilityMode === 'sourcing'
      : formProduct.inStock === false;

    const chosenCat = (formProduct.category || 'Outillage électrique').trim();
    if (chosenCat && !categories.some(c => c.name.toLowerCase() === chosenCat.toLowerCase())) {
      siteSettingsService.addCategory({
        name: chosenCat,
        brands: formProduct.brand || '',
        icon: 'Package',
        description: `Matériel et équipements professionnels - ${chosenCat}`,
        subcategories: []
      });
      setCategories(siteSettingsService.getCategories());
    }

    const payload: Partial<ExtendedProduct> = {
      ...formProduct,
      name: formProduct.name.trim(),
      category: chosenCat,
      inStock: !isSourcingMode,
      availabilityMode: isSourcingMode ? 'sourcing' : 'stock',
      description: formProduct.description?.trim()
        ? formProduct.description.trim()
        : smartTranslateProductDescriptionToFrench('', formProduct.name, translatedSpecs),
      options: normalizedOpts,
      variants: normalizedOpts,
      img: mainImg,
      image: mainImg,
      images: finalImages.length > 0 ? finalImages : [mainImg],
      price: calculated.priceTTC,
      costPrice: calculated.totalCostPrice,
      shippingMethod: isSourcingMode ? calculated.shippingMethod : 'none',
      specs: Object.keys(translatedSpecs).length > 0
        ? translatedSpecs
        : { "État": "Neuf d'origine", "Garantie": "1 an", "Certification": "Norme CE / ISO" }
    };

    if (editingProduct) {
      catalogService.updateProduct(editingProduct.id, payload);
      triggerToast(`Produit "${formProduct.name}" mis à jour avec succès.`);
    } else {
      catalogService.addProduct(payload);
      setCurrentPage(1);
      setSelectedCategory('Tous');
      setSelectedStatus('all');
      setSearchTerm('');
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

  // Toggle availability mode (Stock Local Dakar vs Article à sourcer)
  const handleToggleAvailability = (prod: ExtendedProduct) => {
    const currentlySourcing = isProductSourcing(prod);
    const nextIsSourcing = !currentlySourcing;
    catalogService.updateProduct(prod.id, {
      inStock: !nextIsSourcing,
      availabilityMode: nextIsSourcing ? 'sourcing' : 'stock',
      shippingMethod: nextIsSourcing ? (prod.shippingMethod === 'none' ? 'air' : (prod.shippingMethod || 'air')) : 'none'
    });
    refreshData();
    triggerToast(
      nextIsSourcing
        ? `"${prod.name}" configuré en Article à Sourcer (Sur commande).`
        : `"${prod.name}" configuré en Disponible Immédiatement (Stock Local Dakar).`
    );
  };

  // Smart Translation & Intelligent Reformulation (Title, Description & Specs)
  const handleSmartTranslate = async (mode: 'manual' | 'import') => {
    setIsTranslating(true);
    try {
      const currentName = mode === 'manual' ? (formProduct.name || '') : (importForm.name || '');
      const currentBrand = mode === 'manual' ? (formProduct.brand || '') : (importForm.brand || '');
      const currentDesc = mode === 'manual' ? (formProduct.description || '') : (importForm.description || '');
      const currentSpecs = mode === 'manual' ? (formProduct.specs || {}) : (importForm.specs || {});

      // Local smart reformulation first
      let bestName = smartTranslateProductTitleToFrench(currentName, currentBrand);
      let bestSpecs = translateSpecsRecordToFrench(currentSpecs);
      let bestDesc = smartTranslateProductDescriptionToFrench(currentDesc, bestName, bestSpecs);

      // Optional AI refinement via backend /api/translate-product if configured
      try {
        const res = await fetch('/api/translate-product', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: currentName,
            brand: currentBrand,
            description: currentDesc,
            specs: currentSpecs
          })
        });
        const json = await res.json();
        if (json.success && json.data && json.source === 'gemini') {
          if (json.data.name) bestName = smartTranslateProductTitleToFrench(json.data.name, currentBrand);
          if (json.data.specs && Object.keys(json.data.specs).length > 0) {
            bestSpecs = translateSpecsRecordToFrench(json.data.specs);
          }
          if (json.data.description) {
            bestDesc = smartTranslateProductDescriptionToFrench(json.data.description, bestName, bestSpecs);
          }
        }
      } catch {
        // Fallback to local smart engine already computed
      }

      if (mode === 'manual') {
        setFormProduct(prev => ({
          ...prev,
          name: bestName || prev.name,
          description: bestDesc,
          specs: bestSpecs
        }));
      } else {
        setImportForm(prev => ({
          ...prev,
          name: bestName || prev.name,
          description: bestDesc,
          specs: bestSpecs
        }));
      }
      triggerToast("Traduction et reformulation intelligente appliquées (Titre, Description & Caractéristiques).");
    } finally {
      setIsTranslating(false);
    }
  };

  // Parse link with backend API & Gemini (Zero fictional data: unavailable fields left empty for manual entry)
  const handleParseLink = async () => {
    if (!importUrl.trim()) return;
    setIsScraping(true);
    setOpenImportVariantSpecsIdx(null);
    setShowNewImportOptionSpecs(false);
    setNewImportOptionSpecs({});
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
          ? d.images.filter(Boolean)
          : (d.imageUrl ? [d.imageUrl] : []);

        // Automatically ensure supplier exists only if a real supplier name was extracted
        let autoSupplierId = '';
        if (d.supplier && d.supplier.name && d.supplier.name.trim()) {
          const sup = catalogService.ensureSupplier({
            name: d.supplier.name.trim(),
            platform: d.supplier.platform || d.platform,
            country: d.supplier.country || d.country,
            currency: d.supplier.currency || d.currency,
            storeUrl: d.supplier.storeUrl || importUrl.trim()
          });
          autoSupplierId = sup.id;
        }

        // Automatically ensure category exists in site categories if extracted
        if (d.category && d.category.trim()) {
          const catExists = categories.some(c => c.name.toLowerCase() === d.category.trim().toLowerCase());
          if (!catExists) {
            siteSettingsService.addCategory({
              name: d.category.trim(),
              brands: d.brand || '',
              icon: 'Package',
              description: `Matériel et équipements industriels - ${d.category.trim()}`,
              subcategories: []
            });
            setCategories(siteSettingsService.getCategories());
          }
        }

        const translatedDefaultSpecs = translateSpecsRecordToFrench(d.specs || {});
        const smartFrenchTitle = smartTranslateProductTitleToFrench(d.name || '', d.brand || '');
        const smartFrenchDesc = smartTranslateProductDescriptionToFrench(d.description || '', smartFrenchTitle, translatedDefaultSpecs);

        setParsedLinkData({
          url: importUrl.trim(),
          detectedPlatform: d.platform || 'Alibaba',
          detectedSupplier: d.supplier?.name || '',
          detectedCountry: d.country || '',
          guessedTitle: smartFrenchTitle,
          defaultCurrency: d.currency || 'USD',
          estimatedWeight: d.weight ?? 0,
          brand: d.brand || '',
          dimensions: d.dimensions || '',
          specs: translatedDefaultSpecs
        });

        const rawExtractedOptions = Array.isArray(d.options)
          ? d.options.filter(Boolean)
          : (Array.isArray(d.variants) ? d.variants.filter(Boolean) : []);

        setImportForm({
          name: smartFrenchTitle,
          brand: d.brand || '',
          category: d.category || categories[0]?.name || 'Outillage électrique',
          supplierPrice: typeof d.supplierPrice === 'number' && !isNaN(d.supplierPrice) ? d.supplierPrice : 0,
          supplierCurrency: d.currency || 'USD',
          weight: typeof d.weight === 'number' && !isNaN(d.weight) ? d.weight : 0,
          dimensions: d.dimensions || '',
          marginRate: 0.35,
          applyVat: true,
          ignoreSeaWeight: false,
          ignoreSeaVolume: false,
          image: allExtractedImgs[0] || '',
          additionalImages: allExtractedImgs.slice(1),
          specs: translatedDefaultSpecs,
          options: rawExtractedOptions,
          supplierId: autoSupplierId || '',
          supplierName: d.supplier?.name || '',
          supplierCountry: d.supplier?.country || d.country || '',
          supplierPlatform: d.platform || 'Alibaba',
          description: smartFrenchDesc,
          inStock: false,
          availabilityMode: 'sourcing',
          showDeposit: false,
          depositPercentage: 30
        });
        triggerToast(`Analyse terminée (${d.platform}) : Titre, description et caractéristiques traduits et reformulés en français.`);
      } else {
        throw new Error(json.error || "Erreur d'analyse");
      }
    } catch {
      // Fallback to local URL parser without any fictional data
      const parsed = catalogService.parseProductLink(importUrl);
      const fallbackTitle = smartTranslateProductTitleToFrench(parsed.guessedTitle || '');
      const fallbackDesc = smartTranslateProductDescriptionToFrench('', fallbackTitle, {});
      setParsedLinkData(parsed);

      setImportForm({
        name: fallbackTitle,
        brand: '',
        category: categories[0]?.name || 'Outillage électrique',
        supplierPrice: 0,
        supplierCurrency: parsed.defaultCurrency,
        weight: 0,
        dimensions: '',
        marginRate: 0.35,
        applyVat: true,
        ignoreSeaWeight: false,
        ignoreSeaVolume: false,
        image: '',
        additionalImages: [],
        specs: {},
        options: [],
        supplierId: '',
        supplierName: '',
        supplierCountry: '',
        supplierPlatform: parsed.detectedPlatform,
        description: fallbackDesc,
        inStock: false,
        availabilityMode: 'sourcing',
        showDeposit: false,
        depositPercentage: 30
      });
      triggerToast("Lien préparé : veuillez compléter manuellement les données non disponibles.");
    } finally {
      setIsScraping(false);
    }
  };

  // Convert parsed link into product with full custom values
  const handleConfirmImport = () => {
    if (!parsedLinkData) return;
    if (!importForm.name?.trim()) {
      alert("Veuillez renseigner le titre / nom du produit.");
      return;
    }
    const calculated = importCalculatedPricing;
    const allImgs = [importForm.image, ...importForm.additionalImages].filter(Boolean);
    const resolvedCleanBrand = importForm.brand?.trim()
      ? cleanBrand(importForm.brand, importForm.name)
      : (parsedLinkData.brand ? cleanBrand(parsedLinkData.brand, importForm.name) : 'Constructeur Certifié');

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

    // Ensure supplier is stored in dedicated supplier collection only if specified
    let finalSupplierId = importForm.supplierId;
    let finalSupplierName = importForm.supplierName?.trim() || '';
    if (finalSupplierName) {
      const sup = catalogService.ensureSupplier({
        name: finalSupplierName,
        platform: importForm.supplierPlatform || parsedLinkData.detectedPlatform,
        country: importForm.supplierCountry || parsedLinkData.detectedCountry || 'Chine',
        currency: importForm.supplierCurrency,
        storeUrl: parsedLinkData.url
      });
      finalSupplierId = sup.id;
      finalSupplierName = sup.name;
    }

    const normalizedImportOpts = normalizeVariants(importForm.options || [], {
      supplierCurrency: importForm.supplierCurrency,
      marginRate: importForm.marginRate,
      warehouseDeliveryFeeUSD: 20,
      applyVat: importForm.applyVat
    });

    const translatedFinalSpecs = translateSpecsRecordToFrench(importForm.specs || {});
    const isSourcingImport = importForm.availabilityMode !== 'stock';
    const finalFrenchTitle = smartTranslateProductTitleToFrench(importForm.name.trim(), resolvedCleanBrand);
    const finalFrenchDesc = importForm.description?.trim()
      ? importForm.description.trim()
      : smartTranslateProductDescriptionToFrench('', finalFrenchTitle, translatedFinalSpecs);

    catalogService.addProduct({
      name: finalFrenchTitle,
      brand: resolvedCleanBrand,
      category: chosenCat,
      origin: importForm.supplierCountry || parsedLinkData.detectedCountry || 'Chine',
      sourcePlatform: (importForm.supplierPlatform as any) || parsedLinkData.detectedPlatform,
      supplierName: finalSupplierName,
      supplierUrl: parsedLinkData.url,
      supplierId: finalSupplierId,
      supplierPrice: importForm.supplierPrice,
      supplierCurrency: importForm.supplierCurrency,
      weight: importForm.weight ? `${importForm.weight} kg` : '1 kg',
      dimensions: importForm.dimensions || '',
      marginRate: importForm.marginRate,
      applyVat: importForm.applyVat,
      showDeposit: importForm.showDeposit || false,
      depositPercentage: importForm.depositPercentage || 30,
      discountPercent: importForm.discountPercent || undefined,
      costPrice: calculated.totalCostPrice,
      price: calculated.priceTTC,
      shippingMethod: isSourcingImport ? calculated.shippingMethod : 'none',
      description: finalFrenchDesc,
      specs: translatedFinalSpecs,
      options: normalizedImportOpts,
      variants: normalizedImportOpts,
      img: allImgs[0] || DEFAULT_PRODUCT_IMAGE,
      image: allImgs[0] || DEFAULT_PRODUCT_IMAGE,
      images: allImgs,
      isOnline: true,
      inStock: !isSourcingImport,
      availabilityMode: isSourcingImport ? 'sourcing' : 'stock'
    });

    setParsedLinkData(null);
    setImportUrl('');
    setShowImportLinkModal(false);
    setCurrentPage(1);
    setSelectedCategory('Tous');
    setSelectedStatus('all');
    setSearchTerm('');
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
          <AdminNotificationsBell 
            onNavigateTab={(tab, targetId) => {
              setActiveTab(tab as any);
              if (targetId) setOrderSearchTerm(targetId);
            }} 
          />
          <button 
            onClick={refreshData} 
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Rafraîchir les données"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
          <button
            type="button"
            onClick={() => setShowDirectInvoiceModal(true)}
            className="px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            title="Facturation sur place / Vente comptoir"
          >
            <FileText className="w-4 h-4" />
            <span>+ Facture Comptoir</span>
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
            onClick={() => setActiveTab('warehouses')}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'warehouses'
                ? 'bg-[#FF6600] text-white shadow-lg shadow-orange-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Warehouse className="w-4 h-4" />
            Entrepôts d'Agents ({agentWarehouses.length})
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
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-[#FF6600] text-white shadow-lg shadow-orange-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            Trafic & Analytique
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

          <button
            onClick={() => setActiveTab('campaigns')}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'campaigns'
                ? 'bg-[#FF6600] text-white shadow-lg shadow-orange-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Mail className="w-4 h-4" />
            Emails & Campagnes Promos
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 mt-6">
        
        {activeTab === 'campaigns' && (
          <EmailMarketingManager />
        )}

        {/* ================= TAB: ANALYTICS & TRAFFIC ================= */}
        {activeTab === 'analytics' && (
          <AnalyticsTrafficManager />
        )}
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
                Répartition des Ventes Finalisées par Canal de Sourcing & Provenance
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
                {Object.keys(stats.platformBreakdown).length === 0 && (
                  <div className="col-span-full text-xs text-slate-500 py-4 text-center">
                    Aucune commande finalisée comptabilisée dans le chiffre d'affaires pour le moment.
                  </div>
                )}
              </div>
            </div>

            {/* Unfinalized / Pending Orders Cleanup & Financial Ledger */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Journal Financier & Contrôle des Commandes Non Finalisées
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Les commandes non finalisées (impayées, en attente ou annulées) sont automatiquement exclues du chiffre d'affaires et de la marge.
                  </p>
                </div>
                {orders.some(o => !catalogService.isOrderFinalizedForFinance(o)) && (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: 'Purger toutes les commandes non finalisées',
                        message: 'Voulez-vous supprimer définitivement toutes les commandes et devis non finalisés / impayés afin de nettoyer la comptabilité ?',
                        onConfirm: () => {
                          const removed = catalogService.purgeUnfinalizedOrders();
                          refreshData();
                          triggerToast(`${removed} commande(s) non finalisée(s) retirée(s) avec succès.`);
                        }
                      });
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-600/20 shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Supprimer les commandes non finalisées ({orders.filter(o => !catalogService.isOrderFinalizedForFinance(o)).length})
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                      <th className="py-2.5 px-3">Référence</th>
                      <th className="py-2.5 px-3">Client</th>
                      <th className="py-2.5 px-3">Statut / Paiement</th>
                      <th className="py-2.5 px-3">Comptabilisé dans CA</th>
                      <th className="py-2.5 px-3 text-right">Montant TTC</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {orders.slice(0, 15).map((ord) => {
                      const isFinalized = catalogService.isOrderFinalizedForFinance(ord);
                      return (
                        <tr key={ord.id} className="hover:bg-slate-900/50">
                          <td className="py-2.5 px-3 font-mono font-bold text-white">{ord.orderNumber}</td>
                          <td className="py-2.5 px-3 text-slate-300">{ord.customerName}</td>
                          <td className="py-2.5 px-3">
                            <span className="text-[11px] text-slate-300">{ord.status} • {ord.paymentStatus}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            {isFinalized ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                Inclus au CA
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                Exclu (Non finalisée)
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-200">
                            {(ord.totalTTC || 0).toLocaleString('fr-FR')} F
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmModal({
                                  isOpen: true,
                                  title: 'Retirer et supprimer cette commande',
                                  message: `Confirmez-vous la suppression définitive de "${ord.orderNumber}" de la comptabilité et des commandes ?`,
                                  onConfirm: () => {
                                    catalogService.deleteOrder(ord.id);
                                    refreshData();
                                    triggerToast(`Commande ${ord.orderNumber} retirée de la finance et supprimée.`);
                                  }
                                });
                              }}
                              className="px-2.5 py-1 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              Supprimer
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-500">
                          Aucune commande enregistrée.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
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
                          const effectivePrice = getEffectiveProductBasePrice(prod);
                          const cheapestVar = getCheapestVariant(prod.options || prod.variants || [], {
                            supplierCurrency: prod.supplierCurrency,
                            marginRate: prod.marginRate,
                            warehouseDeliveryFeeUSD: prod.warehouseDeliveryFeeUSD,
                            applyVat: prod.applyVat
                          });
                          const effectiveSupplierPrice = (prod.supplierPrice && prod.supplierPrice > 0)
                            ? prod.supplierPrice
                            : (cheapestVar?.supplierPrice || 0);
                          const effectiveCost = (prod.costPrice && prod.costPrice > 0)
                            ? prod.costPrice
                            : (cheapestVar?.costPrice ?? Math.round((effectivePrice / 1.18) * 0.65));
                          const marginAmt = (effectivePrice / 1.18) - effectiveCost;
                          const marginPct = effectivePrice > 0 ? Math.round((marginAmt / (effectivePrice / 1.18)) * 100) : 0;

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
                                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                      <span className="text-[10px] text-slate-400">
                                        {prod.origin} • {isProductSourcing(prod) ? (prod.shippingMethod === 'air' ? '✈️ Aérien' : '🚢 Maritime') : '📦 Dépôt Dakar'}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleAvailability(prod)}
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase transition-colors cursor-pointer ${
                                          isProductSourcing(prod)
                                            ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 hover:bg-orange-500/30'
                                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                        }`}
                                        title="Cliquez pour basculer entre Disponible immédiatement (Stock Dakar) et Article à sourcer"
                                      >
                                        {isProductSourcing(prod) ? '🟠 Article à sourcer' : '🟢 Dispo immédiate'}
                                      </button>
                                    </div>
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
                                  {effectiveSupplierPrice > 0 ? `${effectiveSupplierPrice.toLocaleString()} ${prod.supplierCurrency || 'USD'}` : 'N/A'}
                                </span>
                                <span className="block text-[10px] text-slate-500">Coût: {effectiveCost.toLocaleString()} F</span>
                              </td>
                              <td className="py-3.5 px-4 font-mono">
                                <span className="font-bold text-orange-400 text-sm">
                                  {effectivePrice.toLocaleString('fr-FR')} FCFA
                                </span>
                                {(!prod.supplierPrice || prod.supplierPrice <= 0) && cheapestVar && (
                                  <span className="block text-[9px] text-emerald-400 font-bold">
                                    Dès variant min ({cheapestVar.name})
                                  </span>
                                )}
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
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shadow-xl">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Gestion des Commandes, Devis & Suivi Logistique</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Suivi unifié des commandes sur <strong className="text-emerald-400">Stock Local Dakar</strong> et des commandes en <strong className="text-amber-400">Sourcing International</strong> (réceptionnées selon le mode de l'entrepôt assigné : avec Code Agent ou en méthode Standard Nom/Prénom/Adresse).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <input
                    type="text"
                    value={orderSearchTerm}
                    onChange={(e) => setOrderSearchTerm(e.target.value)}
                    placeholder="Chercher N° CMD, Client, Téléphone..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
                <button
                  onClick={() => setShowDailyDispatchModal(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-orange-600/30 transition-transform active:scale-95 border border-orange-500/40"
                  title="Expédier les commandes groupées par fournisseur selon leur entrepôt d'agent assigné"
                >
                  <Send className="w-4 h-4" />
                  <span>Commandes du Jour Fournisseurs</span>
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
                      <th className="py-3.5 px-4">N° Dossier & Mode Logistique</th>
                      <th className="py-3.5 px-4">Client & Coordonnées</th>
                      <th className="py-3.5 px-4">Montant TTC</th>
                      <th className="py-3.5 px-4">Règlement Client</th>
                      <th className="py-3.5 px-4">Sourcing, Paiement & Suivi</th>
                      <th className="py-3.5 px-4">Statut Commande</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {orders
                      .filter(ord => {
                        const q = orderSearchTerm.trim().toLowerCase();
                        if (!q) return true;
                        const clientCode = getClientWarehouseCode(ord).toLowerCase();
                        return (
                          ord.orderNumber.toLowerCase().includes(q) ||
                          clientCode.includes(q) ||
                          (ord.customerName || '').toLowerCase().includes(q) ||
                          (ord.customerCompany || '').toLowerCase().includes(q) ||
                          (ord.customerPhone || '').toLowerCase().includes(q) ||
                          (ord.trackingNumber || '').toLowerCase().includes(q)
                        );
                      })
                      .map(ord => {
                      const matchedSup = suppliers.find(s => s.id === ord.supplierId || (ord.supplierName && s.name.toLowerCase() === ord.supplierName.toLowerCase()));
                      const effectiveWh = catalogService.getEffectiveWarehouseForSupplier(matchedSup || ord.supplierId);
                      const hasSea = ord.items?.some(it => it.shippingMethod === 'sea') || (ord.agentCode || '').toUpperCase().includes('SEA');
                      const hasAir = ord.items?.some(it => it.shippingMethod === 'air') || (ord.agentCode || '').toUpperCase().includes('AIR');
                      const isLocalStock = !hasSea && !hasAir;
                      const mainFreightCode: 'AIR' | 'SEA' = hasSea && !hasAir ? 'SEA' : 'AIR';
                      const parcelLabel = isLocalStock
                        ? 'Stock Local Dakar'
                        : formatSupplierParcelLabel(effectiveWh?.agentCode, mainFreightCode, ord.orderNumber, effectiveWh);
                      return (
                      <tr key={ord.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-white">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{ord.orderNumber}</span>
                            {isLocalStock ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                📦 STOCK DAKAR
                              </span>
                            ) : (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${
                                mainFreightCode === 'SEA'
                                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                                  : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                              }`}>
                                {mainFreightCode === 'SEA' ? '🚢 SEA' : '✈️ AIR'}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-sans font-normal mt-0.5">
                            {new Date(ord.createdAt).toLocaleDateString('fr-FR')}
                          </div>
                          {!isLocalStock && (
                            <div
                              onClick={() => {
                                navigator.clipboard.writeText(parcelLabel);
                                triggerToast(`Étiquette colis copiée : ${parcelLabel}`);
                              }}
                              className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[9px] text-amber-300 cursor-pointer hover:border-amber-500"
                              title="Cliquez pour copier l'étiquette colis correspondant à l'entrepôt assigné"
                            >
                              🏷️ {parcelLabel}
                            </div>
                          )}
                          {ord.isQuote && (
                            <span className="inline-block ml-1 mt-1 px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[9px] font-sans uppercase">
                              Devis
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-white block">{ord.customerCompany || ord.customerName}</span>
                          {ord.customerCompany && ord.customerName && ord.customerCompany !== ord.customerName && (
                            <span className="text-[11px] text-slate-300 block">{ord.customerName}</span>
                          )}
                          <span className="text-[10px] text-slate-400 block">{ord.customerCity}, {ord.customerCountry} • {ord.customerPhone}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-black text-white text-sm">
                            {ord.totalTTC.toLocaleString('fr-FR')} FCFA
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            Dont TVA : {ord.vatAmount.toLocaleString('fr-FR')} FCFA
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-200 block text-[11px] mb-1">{ord.paymentMethod}</span>
                          <select
                            value={ord.paymentStatus}
                            onChange={(e) => {
                              catalogService.updateOrderPaymentStatus(ord.id, e.target.value as Order['paymentStatus']);
                              refreshData();
                              triggerToast(`Règlement ${ord.orderNumber} : ${e.target.value}`);
                            }}
                            className={`bg-slate-900 border text-[11px] rounded-lg px-2 py-1 font-bold focus:outline-none ${
                              ord.paymentStatus === 'Payé intégralement'
                                ? 'border-emerald-500/40 text-emerald-400'
                                : ord.paymentStatus === 'Acompte versé'
                                ? 'border-blue-500/40 text-blue-400'
                                : 'border-amber-500/40 text-amber-400'
                            }`}
                          >
                            <option value="Non payé">Non payé</option>
                            <option value="Acompte versé">Acompte versé</option>
                            <option value="Payé intégralement">Payé intégralement</option>
                          </select>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-1.5 min-w-[200px]">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-bold text-slate-200 truncate max-w-[130px]" title={ord.supplierName || matchedSup?.name || 'Fournisseur'}>
                                {ord.supplierName || matchedSup?.name || 'Fournisseur Catalogue'}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                ord.supplierPoStatus === 'PO Envoyé' || ord.supplierPoStatus === 'Lien paiement reçu' || ord.supplierPoStatus === 'Payé fournisseur'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}>
                                {ord.supplierPoStatus || 'Non transmis'}
                              </span>
                            </div>

                            {ord.supplierPaymentLink ? (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <a
                                  href={ord.supplierPaymentLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold flex items-center gap-1 transition-colors"
                                  title={ord.supplierPaymentLink}
                                >
                                  <DollarSign className="w-3 h-3" />
                                  Payer Fournisseur
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                                {ord.supplierPaymentAmount && (
                                  <span className="text-[10px] font-mono text-amber-300 font-bold">
                                    {ord.supplierPaymentAmount}
                                  </span>
                                )}
                                {ord.supplierPortalToken && (
                                  <a
                                    href={`/supplier-po/${ord.supplierPortalToken}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded text-[9px] font-mono font-bold"
                                    title="Reçu automatiquement via lien unique fournisseur"
                                  >
                                    ✓ {ord.supplierPortalToken}
                                  </a>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  onClick={() => {
                                    if (matchedSup) {
                                      setSelectedPoSupplier(matchedSup);
                                      setShowPoModal(true);
                                    } else {
                                      setShowDailyDispatchModal(true);
                                    }
                                  }}
                                  className="text-[10px] text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1 cursor-pointer"
                                >
                                  <Send className="w-2.5 h-2.5" />
                                  Générer PO / Lien unique
                                </button>
                                {ord.supplierPortalToken && (
                                  <a
                                    href={`/supplier-po/${ord.supplierPortalToken}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-1.5 py-0.5 bg-orange-500/15 text-orange-300 border border-orange-500/30 rounded text-[9px] font-mono font-bold flex items-center gap-1"
                                    title="Ouvrir la page web à usage unique envoyée au fournisseur"
                                  >
                                    {ord.supplierPortalToken} <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                              </div>
                            )}

                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                defaultValue={ord.trackingNumber || ''}
                                placeholder="N° Suivi / Colis..."
                                onBlur={(e) => {
                                  const val = e.target.value.trim();
                                  if (val !== (ord.trackingNumber || '')) {
                                    catalogService.updateOrderLogistics(ord.id, { trackingNumber: val });
                                    refreshData();
                                    if (val) triggerToast(`N° de suivi enregistré pour ${ord.orderNumber}`);
                                  }
                                }}
                                className="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-0.5 text-[10px] text-emerald-300 font-mono placeholder-slate-500 focus:outline-none focus:border-orange-500"
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <select
                            value={ord.status}
                            onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value as any)}
                            className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1 font-semibold focus:outline-none focus:border-orange-500"
                          >
                            <option value="Reçue">1. Reçue</option>
                            <option value="En attente paiement">2. En attente paiement</option>
                            <option value="Payée">3. Payée</option>
                            <option value="Commandée fournisseur">4. Commandée fournisseur</option>
                            <option value="En transit">5. En transit</option>
                            <option value="Dédouanement">6. Dédouanement</option>
                            <option value="Reçue en entrepôt">7. Reçue en entrepôt</option>
                            <option value="Livrée">8. Livrée</option>
                            <option value="Annulée">Annulée</option>
                          </select>
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
                    );
                    })}
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
                  onClick={() => {
                    const rowsHtml = suppliers.map(sup => {
                      const leadTimeDisplay = sup.avgLeadTimeDays ? `${sup.avgLeadTimeDays} jours` : (sup.leadTimeAvg || '14 jours');
                      const channelLabel = sup.communicationChannel === 'email'
                        ? 'Email Pro'
                        : sup.communicationChannel === 'direct_chat'
                          ? 'Chat Alibaba / Messagerie'
                          : 'WhatsApp Direct';
                      return `
                      <tr>
                        <td><strong>${sup.name}</strong><br/><span style="font-size:10px;color:#64748b;">${sup.platform} • Canal: ${channelLabel}</span></td>
                        <td>${sup.country}</td>
                        <td><strong>${sup.currency}</strong></td>
                        <td>${sup.paymentTerms || 'Trade Assurance / Proforma'}</td>
                        <td>${leadTimeDisplay}</td>
                        <td class="mono">${sup.contactPhone ? `WA: ${sup.contactPhone}` : 'WA: Non renseigné'}<br/>${sup.contactEmail ? `Email: ${sup.contactEmail}` : ''}</td>
                      </tr>
                    `;
                    }).join('');
                    const bodyHtml = `
                      <div class="header">
                        <div>
                          <div class="brand"><span class="brand-blue">ZONE</span> <span class="brand-orange">ÉQUIPEMENTS</span></div>
                          <p style="font-size:11px;color:#475569;margin-top:4px;">Répertoire Officiel des Fournisseurs & Canaux de Sourcing MRO</p>
                        </div>
                        <div style="text-align:right;">
                          <span class="badge">MANIFESTE FOURNISSEURS</span>
                          <p style="font-size:11px;color:#64748b;margin-top:6px;">Édité le ${new Date().toLocaleDateString('fr-FR')}</p>
                        </div>
                      </div>
                      <table>
                        <thead>
                          <tr>
                            <th>Fournisseur & Plateforme</th>
                            <th>Pays & Port</th>
                            <th>Devise</th>
                            <th>Conditions Règlement</th>
                            <th>Délai Moyen</th>
                            <th>Contacts</th>
                          </tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                      </table>
                    `;
                    printHtmlDocument(
                      `Manifeste Fournisseurs — Zone Équipements`,
                      `Manifeste-Fournisseurs-${new Date().toISOString().slice(0, 10)}.html`,
                      bodyHtml,
                      (msg) => triggerToast(msg)
                    );
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition-all"
                  title="Imprimer le manifeste complet du répertoire fournisseurs"
                >
                  <Printer className="w-4 h-4 text-blue-400" />
                  <span>Imprimer Manifeste</span>
                </button>
                <button
                  onClick={() => {
                    setEditingSupplier(null);
                    setShowSupplierModal(true);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition-all cursor-pointer"
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
                        <span className="text-slate-400">Conditions Règlement :</span>
                        <span className="font-semibold text-white text-right">{sup.paymentTerms || '30% acompte, 70% avant expédition'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Délai Moyen :</span>
                        <span className="font-semibold text-white">
                          {sup.avgLeadTimeDays ? `${sup.avgLeadTimeDays} jours` : (sup.leadTimeAvg || '14 jours')}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Contacts (WhatsApp / Email) :</span>
                        <span className="font-mono text-right">
                          <span className="text-emerald-400 block">{sup.contactPhone || 'WhatsApp non défini'}</span>
                          {sup.contactEmail && <span className="text-blue-400 text-[11px] block">{sup.contactEmail}</span>}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Canal d'envoi du lien défini :</span>
                        <span className="font-bold text-orange-300">
                          {sup.communicationChannel === 'email'
                            ? '✉️ Email Commercial'
                            : sup.communicationChannel === 'direct_chat'
                              ? '💬 Chat Alibaba / Messagerie'
                              : '📱 WhatsApp Direct'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Frais entrepôt export :</span>
                        <span className="font-mono text-white">
                          {sup.warehouseDeliveryFeeUSD ?? 25} $ (Min {sup.warehouseDeliveryMinUSD ?? 15}$ / Max {sup.warehouseDeliveryMaxUSD ?? 45}$)
                        </span>
                      </div>
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-slate-400 flex items-center gap-1 font-bold text-[11px]">
                            <Warehouse className="w-3.5 h-3.5 text-orange-400" />
                            Entrepôt d'Agent assigné :
                          </span>
                        </div>
                        <select
                          value={sup.agentWarehouseId || ''}
                          onChange={(e) => {
                            const newWhId = e.target.value || undefined;
                            catalogService.updateSupplier(sup.id, { agentWarehouseId: newWhId });
                            refreshData();
                            triggerToast(`Entrepôt d'agent mis à jour pour ${sup.name}.`);
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-[#FF6600]"
                        >
                          <option value="">
                            ★ Par Défaut ({(() => {
                              const defWh = agentWarehouses.find(w => w.isDefault) || agentWarehouses[0];
                              if (!defWh) return 'Standard';
                              return `${defWh.name} — ${defWh.identificationMode === 'standard_address' || !defWh.agentCode ? [defWh.firstName, defWh.lastName].filter(Boolean).join(' ') : defWh.agentCode}`;
                            })()})
                          </option>
                          {agentWarehouses.map(wh => (
                            <option key={wh.id} value={wh.id}>
                              {wh.name} ({wh.identificationMode === 'standard_address' || !wh.agentCode
                                ? `Standard: ${[wh.firstName, wh.lastName].filter(Boolean).join(' ')}`
                                : `Code: ${wh.agentCode}`})
                            </option>
                          ))}
                        </select>
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

        {/* ================= TAB 4B: ENTREPÔTS D'AGENTS DÉDIÉS ================= */}
        {activeTab === 'warehouses' && (
          <div className="space-y-6 animate-fadeIn">
            <AgentWarehouseManagerModal
              isOpen={true}
              inline={true}
              onClose={() => {}}
              onUpdated={() => {
                refreshData();
                triggerToast("Configuration des entrepôts d'agents enregistrée.");
              }}
            />
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
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Désignation du Produit / Matériel *
                    </label>
                    <button
                      type="button"
                      disabled={isTranslating}
                      onClick={() => handleSmartTranslate('manual')}
                      className="text-[11px] font-extrabold text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-600/50 px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Traduit en français et reformule intelligemment le titre, la description et toutes les caractéristiques"
                    >
                      <RefreshCw className={`w-3 h-3 ${isTranslating ? 'animate-spin' : ''}`} />
                      <span>{isTranslating ? 'Reformulation en cours...' : '✨ Traduire, Corriger & Reformuler (FR)'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={formProduct.name}
                    onChange={(e) => setFormProduct({ ...formProduct, name: e.target.value })}
                    placeholder="Ex: Pompe centrifuge haute pression 7.5kW"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Description Technique Traduite & Reformulée */}
                <div className="sm:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Description Technique (Traduite & Reformulée en Français)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const reformulated = smartTranslateProductDescriptionToFrench(
                          formProduct.description || '',
                          formProduct.name || '',
                          formProduct.specs || {}
                        );
                        setFormProduct({ ...formProduct, description: reformulated });
                        triggerToast("Description reformulée intelligemment en français.");
                      }}
                      className="text-[10px] font-bold text-orange-300 hover:text-orange-200 underline cursor-pointer"
                    >
                      Reformuler / Générer la synthèse technique FR
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={formProduct.description || ''}
                    onChange={(e) => setFormProduct({ ...formProduct, description: e.target.value })}
                    placeholder="Description technique claire et professionnelle en français (sera générée/reformulée automatiquement si laissée vide)..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Catégorie Principale
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowCategoryDrawer(prev => !prev)}
                      className="text-[10px] font-extrabold text-orange-400 hover:text-orange-300 bg-orange-950/40 border border-orange-700/40 px-2 py-0.5 rounded-md cursor-pointer"
                    >
                      {showCategoryDrawer ? '▲ Masquer les catégories' : '▼ Dérouler / Modifier les catégories'}
                    </button>
                  </div>
                  <select
                    value={formProduct.category}
                    onChange={(e) => setFormProduct({ ...formProduct, category: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                  >
                    {Array.from(new Set([...categories.map(c => c.name), ...products.map(p => p.category).filter(Boolean)])).map(catName => (
                      <option key={catName} value={catName}>{catName}</option>
                    ))}
                  </select>
                </div>

                {/* Panneau déroulant de modification directe des catégories disponibles */}
                {showCategoryDrawer && (
                  <div className="sm:col-span-2 p-4 bg-slate-900/95 border border-orange-500/40 rounded-2xl space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-orange-400 uppercase tracking-wider">
                        Liste Déroulante des Catégories Disponibles (Sélection, Renommage & Ajout)
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {categories.length} catégorie(s)
                      </span>
                    </div>

                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-800 border border-slate-800 rounded-xl bg-slate-950 p-1.5 space-y-1">
                      {categories.map((cat, cIdx) => (
                        <div key={cIdx} className="flex flex-wrap items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-slate-900">
                          {editingCatIdx === cIdx ? (
                            <div className="flex-1 flex flex-wrap items-center gap-2">
                              <input
                                type="text"
                                value={editingCatName}
                                onChange={(e) => setEditingCatName(e.target.value)}
                                placeholder="Nom de la catégorie"
                                className="flex-1 min-w-[160px] bg-slate-900 border border-orange-500 rounded-lg px-2.5 py-1 text-xs text-white font-bold"
                              />
                              <input
                                type="text"
                                value={editingCatBrands}
                                onChange={(e) => setEditingCatBrands(e.target.value)}
                                placeholder="Marques associées (optionnel)"
                                className="flex-1 min-w-[140px] bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const trimmed = editingCatName.trim();
                                  if (trimmed) {
                                    const oldName = cat.name;
                                    siteSettingsService.updateCategory(cIdx, {
                                      ...cat,
                                      name: trimmed,
                                      brands: editingCatBrands.trim()
                                    });
                                    if (oldName !== trimmed) {
                                      products.filter(p => p.category === oldName).forEach(p => {
                                        catalogService.updateProduct(p.id, { category: trimmed });
                                      });
                                    }
                                    setCategories(siteSettingsService.getCategories());
                                    setFormProduct(prev => ({ ...prev, category: trimmed }));
                                    setEditingCatIdx(null);
                                    refreshData();
                                    triggerToast(`Catégorie renommée en "${trimmed}".`);
                                  }
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                              >
                                Enregistrer
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCatIdx(null)}
                                className="px-2 py-1 bg-slate-800 text-slate-400 rounded-lg text-[11px] cursor-pointer"
                              >
                                Annuler
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setFormProduct({ ...formProduct, category: cat.name })}
                                className={`text-left text-xs font-bold px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                                  formProduct.category === cat.name
                                    ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                                    : 'text-slate-200 hover:text-orange-400'
                                }`}
                              >
                                {formProduct.category === cat.name ? '✓ ' : ''}{cat.name}
                                {cat.brands && <span className="text-[10px] text-slate-500 font-normal ml-2">({cat.brands})</span>}
                              </button>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCatIdx(cIdx);
                                    setEditingCatName(cat.name);
                                    setEditingCatBrands(cat.brands || '');
                                  }}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit className="w-3 h-3" /> Modifier
                                </button>
                                {categories.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      siteSettingsService.deleteCategory(cIdx);
                                      const nextCats = siteSettingsService.getCategories();
                                      setCategories(nextCats);
                                      if (formProduct.category === cat.name && nextCats[0]) {
                                        setFormProduct({ ...formProduct, category: nextCats[0].name });
                                      }
                                      triggerToast(`Catégorie "${cat.name}" supprimée.`);
                                    }}
                                    className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded cursor-pointer"
                                    title="Supprimer cette catégorie"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Ajouter rapidement une nouvelle catégorie */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newQuickCatName}
                        onChange={(e) => setNewQuickCatName(e.target.value)}
                        placeholder="Créer une nouvelle catégorie (ex: Groupes Électrogènes & Énergie)..."
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const trimmed = newQuickCatName.trim();
                          if (trimmed) {
                            siteSettingsService.addCategory({
                              name: trimmed,
                              brands: formProduct.brand || '',
                              icon: 'Package',
                              description: `Matériel et équipements professionnels - ${trimmed}`,
                              subcategories: []
                            });
                            setCategories(siteSettingsService.getCategories());
                            setFormProduct({ ...formProduct, category: trimmed });
                            setNewQuickCatName('');
                            triggerToast(`Catégorie "${trimmed}" créée et sélectionnée.`);
                          }
                        }}
                        className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Créer & Choisir
                      </button>
                    </div>
                  </div>
                )}
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

              {/* SPÉCIFICATIONS & CARACTÉRISTIQUES TECHNIQUES PAR DÉFAUT DU PRODUIT */}
              <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Caractéristiques Techniques par défaut (Traduites en FR & Modifiables)
                    </label>
                    <p className="text-[10px] text-slate-400">
                      Cliquez directement sur chaque intitulé ou valeur pour le modifier librement
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {Object.keys(formProduct.specs || {}).length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const translated = translateSpecsRecordToFrench(formProduct.specs || {});
                          setFormProduct({ ...formProduct, specs: translated });
                        }}
                        className="text-[10px] font-bold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                        title="Traduire automatiquement tous les intitulés et valeurs en français"
                      >
                        Traduire en FR
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const count = Object.keys(formProduct.specs || {}).length + 1;
                        setFormProduct({
                          ...formProduct,
                          specs: {
                            ...(formProduct.specs || {}),
                            [`Caractéristique ${count}`]: ''
                          }
                        });
                      }}
                      className="text-[10px] font-bold text-blue-300 bg-blue-950/60 hover:bg-blue-900/60 border border-blue-700/50 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Ligne vide
                    </button>
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                      {Object.keys(formProduct.specs || {}).length} spécification{Object.keys(formProduct.specs || {}).length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Tableau des caractéristiques actuelles modifiables directement */}
                <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                  {Object.entries(formProduct.specs || {}).length > 0 ? (
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/60 text-xs p-1.5 space-y-1">
                      {Object.entries(formProduct.specs || {}).map(([k, v], idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 items-center p-1.5 rounded-lg hover:bg-slate-900/60 transition-colors">
                          <div className="col-span-5">
                            <input
                              type="text"
                              value={k}
                              placeholder="Caractéristique (ex: Puissance)"
                              onChange={(e) => {
                                const entries = Object.entries(formProduct.specs || {});
                                entries[idx] = [e.target.value, String(v)];
                                setFormProduct({
                                  ...formProduct,
                                  specs: Object.fromEntries(entries)
                                });
                              }}
                              className="w-full bg-slate-900 border border-slate-700/80 focus:border-orange-500 rounded-md px-2.5 py-1 text-xs font-bold text-slate-200 focus:outline-none"
                            />
                          </div>
                          <div className="col-span-6">
                            <input
                              type="text"
                              value={String(v)}
                              placeholder="Valeur (ex: 7.5 kW / 380V)"
                              onChange={(e) => {
                                const entries = Object.entries(formProduct.specs || {});
                                entries[idx] = [k, e.target.value];
                                setFormProduct({
                                  ...formProduct,
                                  specs: Object.fromEntries(entries)
                                });
                              }}
                              className="w-full bg-slate-900 border border-slate-700/80 focus:border-orange-500 rounded-md px-2.5 py-1 text-xs text-slate-300 font-mono focus:outline-none"
                            />
                          </div>
                          <div className="col-span-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                const entries = Object.entries(formProduct.specs || {}).filter((_, i) => i !== idx);
                                setFormProduct({ ...formProduct, specs: Object.fromEntries(entries) });
                              }}
                              className="p-1 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors cursor-pointer"
                              title="Supprimer cette caractéristique"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 text-center text-xs text-slate-500 italic">
                      Aucune caractéristique renseignée. Ajoutez vos spécifications manuellement ci-dessous.
                    </div>
                  )}
                </div>

                {/* Formulaire rapide pour ajouter une caractéristique */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Nom (ex: Puissance, Tension...)"
                    value={newSpecKey}
                    onChange={(e) => setNewSpecKey(e.target.value)}
                    className="sm:col-span-2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                  <input
                    type="text"
                    placeholder="Valeur (ex: 7.5 kW, 380V...)"
                    value={newSpecVal}
                    onChange={(e) => setNewSpecVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newSpecKey.trim() && newSpecVal.trim()) {
                        e.preventDefault();
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
                    className="sm:col-span-2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
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

              {/* Options & Déclinaisons Réelles du Produit (Design épuré et compact) */}
              <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Options & Déclinaisons Disponibles (Variantes)
                    </label>
                    <p className="text-[10px] text-slate-400">
                      Prix d'achat fournisseur (marge auto), image dédiée compacte et caractéristiques propres sur demande.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(formProduct.options || []).length > 0 && (
                      <button
                        type="button"
                        onClick={() => setFormProduct({ ...formProduct, supplierPrice: 0 })}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                          Number(formProduct.supplierPrice) === 0
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-800 hover:bg-slate-700 text-orange-300 border-slate-700'
                        }`}
                        title="Remettre le prix principal à 0 pour que le site affiche automatiquement le prix du variant le moins cher"
                      >
                        {Number(formProduct.supplierPrice) === 0
                          ? '✓ Prix principal à 0 (Variant min actif)'
                          : '↺ Prix principal à 0'}
                      </button>
                    )}
                    <span className="text-[11px] font-mono text-orange-400 bg-orange-950/40 border border-orange-800/40 px-2 py-0.5 rounded-full font-bold">
                      {(formProduct.options || []).length} variant{(formProduct.options || []).length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Liste compacte des variantes */}
                <div className="space-y-2 min-h-10 p-2.5 bg-slate-950 rounded-xl border border-slate-800 max-h-[420px] overflow-y-auto">
                  {(formProduct.options || []).length > 0 ? (
                    (formProduct.options || []).map((opt, idx) => {
                      let optName = '';
                      let optPrice: number | undefined = undefined;
                      let optSupplierPrice: number | undefined = undefined;
                      let optCostPrice: number | undefined = undefined;
                      let optWeight: string | undefined = undefined;
                      let optImage: string | undefined = undefined;
                      let optCharacteristics: string | undefined = undefined;
                      let optSpecs: Record<string, string> = {};

                      if (typeof opt === 'string') {
                        const parts = opt.split(/\s*\|\s*/);
                        optName = parts[0];
                        for (let pIdx = 1; pIdx < parts.length; pIdx++) {
                          const p = parts[pIdx];
                          const mSP = p.match(/^(?:achat|supplierprice|cost)\s*[:=]?\s*([0-9.]+)/i);
                          if (mSP) optSupplierPrice = parseFloat(mSP[1]);
                          const mP = p.match(/^(?:prix|price)\s*[:=]?\s*([0-9.]+)/i);
                          if (mP) optPrice = parseFloat(mP[1]);
                          const mW = p.match(/^(?:poids|weight)\s*[:=]?\s*(.+)/i);
                          if (mW) optWeight = mW[1].trim();
                        }
                      } else if (typeof opt === 'object' && opt) {
                        optName = (opt as any).name || '';
                        optPrice = (opt as any).price;
                        optSupplierPrice = (opt as any).supplierPrice;
                        optCostPrice = (opt as any).costPrice;
                        optWeight = (opt as any).weight;
                        optImage = (opt as any).image;
                        optCharacteristics = (opt as any).characteristics ?? formatSpecsToCharacteristicsText((opt as any).specs);
                        optSpecs = (opt as any).specs && Object.keys((opt as any).specs).length > 0
                          ? { ...(opt as any).specs }
                          : parseCharacteristicsTextToSpecs(optCharacteristics);
                      }

                      const pricingCtx = {
                        supplierCurrency: formProduct.supplierCurrency || 'USD',
                        marginRate: Number(formProduct.marginRate) || 0.35,
                        warehouseDeliveryFeeUSD: Number(formProduct.warehouseDeliveryFeeUSD) || 0,
                        applyVat: formProduct.applyVat !== false
                      };
                      const liveCalc = optSupplierPrice !== undefined && optSupplierPrice > 0
                        ? computeSingleVariantPricing(optSupplierPrice, pricingCtx)
                        : { price: optPrice, costPrice: optCostPrice };

                      const isSpecsOpen = openVariantSpecsIdx === idx;
                      const specCount = Object.keys(optSpecs).length;

                      const updateVariantAtIndex = (changes: Partial<ProductVariantItem>) => {
                        const updated = [...(formProduct.options || [])];
                        const nextSupplierPrice = 'supplierPrice' in changes ? changes.supplierPrice : optSupplierPrice;
                        const nextCalc = nextSupplierPrice !== undefined && nextSupplierPrice > 0
                          ? computeSingleVariantPricing(nextSupplierPrice, pricingCtx)
                          : { price: 'price' in changes ? changes.price : optPrice, costPrice: optCostPrice };

                        const nextSpecs = 'specs' in changes
                          ? changes.specs
                          : ('characteristics' in changes
                            ? parseCharacteristicsTextToSpecs(changes.characteristics)
                            : (Object.keys(optSpecs).length > 0 ? optSpecs : undefined));

                        const nextChars = 'characteristics' in changes
                          ? changes.characteristics
                          : ('specs' in changes
                            ? (changes.specs && Object.keys(changes.specs).length > 0 ? formatSpecsToCharacteristicsText(changes.specs) : undefined)
                            : optCharacteristics);

                        updated[idx] = {
                          name: 'name' in changes ? (changes.name || '') : optName,
                          supplierPrice: nextSupplierPrice,
                          price: nextCalc.price,
                          costPrice: nextCalc.costPrice,
                          weight: 'weight' in changes ? changes.weight : optWeight,
                          image: 'image' in changes ? changes.image : optImage,
                          characteristics: nextChars,
                          specs: nextSpecs && Object.keys(nextSpecs).length > 0 ? nextSpecs : undefined
                        };
                        setFormProduct({ ...formProduct, options: updated, variants: updated });
                      };

                      return (
                        <div
                          key={idx}
                          className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl hover:border-slate-700 transition-all space-y-2"
                        >
                          {/* Ligne principale ultra-compacte : Nom, Prix d'achat, Vente auto, Poids, Supprimer */}
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                            <div className="sm:col-span-4">
                              <input
                                type="text"
                                value={optName}
                                onChange={(e) => updateVariantAtIndex({ name: e.target.value })}
                                placeholder="Nom du variant (ex: 20 kW)"
                                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1 text-xs font-semibold text-white focus:outline-none focus:border-orange-500"
                              />
                            </div>

                            <div className="sm:col-span-3">
                              <div className="relative flex items-center">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={optSupplierPrice !== undefined && optSupplierPrice !== null ? optSupplierPrice : ''}
                                  onChange={(e) => {
                                    const val = e.target.value.trim() ? parseFloat(e.target.value) : undefined;
                                    updateVariantAtIndex({ supplierPrice: val });
                                  }}
                                  placeholder={`Achat (${formProduct.supplierCurrency || 'USD'})`}
                                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-xs text-amber-300 font-mono focus:outline-none focus:border-orange-500"
                                />
                              </div>
                            </div>

                            <div className="sm:col-span-2">
                              <div
                                className="px-2 py-1 rounded-md bg-emerald-950/40 border border-emerald-800/40 text-[11px] font-mono text-emerald-400 truncate text-center"
                                title={liveCalc.costPrice ? `Coût: ${liveCalc.costPrice.toLocaleString('fr-FR')} F` : 'Prix de vente calculé automatiquement'}
                              >
                                {liveCalc.price !== undefined && liveCalc.price > 0
                                  ? `${liveCalc.price.toLocaleString('fr-FR')} F`
                                  : 'Auto'}
                              </div>
                            </div>

                            <div className="sm:col-span-2">
                              <input
                                type="text"
                                value={optWeight || ''}
                                onChange={(e) => {
                                  const val = e.target.value.trim() ? e.target.value.trim() : undefined;
                                  updateVariantAtIndex({ weight: val });
                                }}
                                placeholder="Poids (kg)"
                                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-xs text-blue-300 font-mono focus:outline-none focus:border-orange-500"
                              />
                            </div>

                            <div className="sm:col-span-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (formProduct.options || []).filter((_, i) => i !== idx);
                                  setFormProduct({ ...formProduct, options: updated, variants: updated });
                                }}
                                className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-md text-xs border border-rose-500/20 transition-colors cursor-pointer"
                                title="Supprimer cette déclinaison"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Barre secondaire réduite : Upload Image compact + Bouton "Caractéristiques propres à ce variant (optionnel)" */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-800/70">
                            <div className="flex-1 min-w-[200px]">
                              <ImageUploadInput
                                compact
                                value={optImage || ''}
                                onChange={(url) => updateVariantAtIndex({ image: url.trim() ? url.trim() : undefined })}
                                placeholder="Image du variant (URL ou Upload)..."
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenVariantSpecsIdx(isSpecsOpen ? null : idx);
                                setNewVariantSpecKey('');
                                setNewVariantSpecVal('');
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                                isSpecsOpen || specCount > 0
                                  ? 'bg-orange-500/15 text-orange-300 border-orange-500/40 hover:bg-orange-500/25'
                                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-300'
                              }`}
                            >
                              <span>Caractéristiques propres à ce variant (optionnel)</span>
                              {specCount > 0 && (
                                <span className="bg-orange-500/30 text-orange-200 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                                  {specCount}
                                </span>
                              )}
                              <span className="text-[10px] opacity-75">{isSpecsOpen ? '▲' : '▼'}</span>
                            </button>
                          </div>

                          {/* Panneau déroulant structuré comme les caractéristiques par défaut */}
                          {isSpecsOpen && (
                            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5 mt-1">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-[10px] font-bold text-orange-300 uppercase tracking-wider">
                                  Caractéristiques dédiées : {optName || `Variant #${idx + 1}`}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {Object.keys(formProduct.specs || {}).length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => updateVariantAtIndex({ specs: { ...(formProduct.specs || {}) } })}
                                      className="text-[10px] font-bold text-blue-300 bg-blue-950/60 hover:bg-blue-900/60 border border-blue-800/50 px-2 py-0.5 rounded cursor-pointer"
                                    >
                                      Copier celles par défaut
                                    </button>
                                  )}
                                  {specCount > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => updateVariantAtIndex({ specs: {}, characteristics: undefined })}
                                      className="text-[10px] font-bold text-rose-300 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/50 px-2 py-0.5 rounded cursor-pointer"
                                    >
                                      Vider
                                    </button>
                                  )}
                                </div>
                              </div>

                              {specCount > 0 ? (
                                <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/60 border border-slate-800 rounded-lg p-1 space-y-1">
                                  {Object.entries(optSpecs).map(([sKey, sVal], sIdx) => (
                                    <div key={sIdx} className="grid grid-cols-12 gap-1.5 items-center p-1 rounded hover:bg-slate-900/60">
                                      <input
                                        type="text"
                                        value={sKey}
                                        placeholder="Caractéristique"
                                        onChange={(e) => {
                                          const entries = Object.entries(optSpecs);
                                          entries[sIdx] = [e.target.value, String(sVal)];
                                          updateVariantAtIndex({ specs: Object.fromEntries(entries) });
                                        }}
                                        className="col-span-5 bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-[11px] font-bold text-slate-200 focus:outline-none focus:border-orange-500"
                                      />
                                      <input
                                        type="text"
                                        value={String(sVal)}
                                        placeholder="Valeur"
                                        onChange={(e) => {
                                          const entries = Object.entries(optSpecs);
                                          entries[sIdx] = [sKey, e.target.value];
                                          updateVariantAtIndex({ specs: Object.fromEntries(entries) });
                                        }}
                                        className="col-span-6 bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-[11px] text-slate-300 font-mono focus:outline-none focus:border-orange-500"
                                      />
                                      <div className="col-span-1 flex justify-end">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const entries = Object.entries(optSpecs).filter((_, i) => i !== sIdx);
                                            updateVariantAtIndex({ specs: Object.fromEntries(entries) });
                                          }}
                                          className="p-1 text-rose-400 hover:bg-rose-500/20 rounded cursor-pointer"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] text-slate-500 italic text-center py-1.5">
                                  Aucune caractéristique dédiée : celles par défaut du produit resteront affichées.
                                </p>
                              )}

                              {/* Ligne d'ajout rapide d'une caractéristique pour ce variant */}
                              <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5 pt-1">
                                <input
                                  type="text"
                                  placeholder="Nom (ex: Puissance)"
                                  value={newVariantSpecKey}
                                  onChange={(e) => setNewVariantSpecKey(e.target.value)}
                                  className="sm:col-span-2 bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-orange-500"
                                />
                                <input
                                  type="text"
                                  placeholder="Valeur (ex: 20 kW)"
                                  value={newVariantSpecVal}
                                  onChange={(e) => setNewVariantSpecVal(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newVariantSpecKey.trim() && newVariantSpecVal.trim()) {
                                      e.preventDefault();
                                      updateVariantAtIndex({
                                        specs: {
                                          ...optSpecs,
                                          [newVariantSpecKey.trim()]: newVariantSpecVal.trim()
                                        }
                                      });
                                      setNewVariantSpecKey('');
                                      setNewVariantSpecVal('');
                                    }
                                  }}
                                  className="sm:col-span-2 bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-orange-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (newVariantSpecKey.trim() && newVariantSpecVal.trim()) {
                                      updateVariantAtIndex({
                                        specs: {
                                          ...optSpecs,
                                          [newVariantSpecKey.trim()]: newVariantSpecVal.trim()
                                        }
                                      });
                                      setNewVariantSpecKey('');
                                      setNewVariantSpecVal('');
                                    }
                                  }}
                                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-md text-[11px] py-1 px-2.5 flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" /> Ajouter
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-xs text-slate-500 italic block py-1 text-center">
                      Aucune déclinaison configurée (le produit sera commandé en version standard unique).
                    </span>
                  )}
                </div>

                {/* Ajout compact d'une nouvelle variante */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
                  <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider block">
                    Ajouter une nouvelle variante :
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-5">
                      <input
                        type="text"
                        placeholder="Nom du variant (ex: 20 kW / AC Triphasé)"
                        value={newOptionInput}
                        onChange={(e) => setNewOptionInput(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={`Prix d'achat (${formProduct.supplierCurrency || 'USD'})`}
                        value={newOptionPrice}
                        onChange={(e) => setNewOptionPrice(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-mono"
                      />
                      {newOptionPrice.trim() && parseFloat(newOptionPrice) > 0 && (() => {
                        const preview = computeSingleVariantPricing(parseFloat(newOptionPrice), {
                          supplierCurrency: formProduct.supplierCurrency || 'USD',
                          marginRate: Number(formProduct.marginRate) || 0.35,
                          warehouseDeliveryFeeUSD: Number(formProduct.warehouseDeliveryFeeUSD) || 0,
                          applyVat: formProduct.applyVat !== false
                        });
                        return preview.price ? (
                          <span className="block text-[9px] font-mono text-emerald-400 mt-0.5">
                            → Vente auto : {preview.price.toLocaleString('fr-FR')} FCFA
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="Poids (ex: 85 kg)"
                        value={newOptionWeight}
                        onChange={(e) => setNewOptionWeight(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (newOptionInput.trim()) {
                            const rawSupplierPrice = newOptionPrice.trim() ? parseFloat(newOptionPrice) : undefined;
                            const pricingCtx = {
                              supplierCurrency: formProduct.supplierCurrency || 'USD',
                              marginRate: Number(formProduct.marginRate) || 0.35,
                              warehouseDeliveryFeeUSD: Number(formProduct.warehouseDeliveryFeeUSD) || 0,
                              applyVat: formProduct.applyVat !== false
                            };
                            const computed = computeSingleVariantPricing(rawSupplierPrice, pricingCtx);
                            const hasCustomSpecs = Object.keys(newOptionSpecs).length > 0;
                            const formattedChars = hasCustomSpecs
                              ? formatSpecsToCharacteristicsText(newOptionSpecs)
                              : (newOptionCharacteristics.trim() || undefined);
                            const newVar: ProductVariantItem = {
                              name: newOptionInput.trim(),
                              supplierPrice: rawSupplierPrice,
                              price: computed.price,
                              costPrice: computed.costPrice,
                              weight: newOptionWeight.trim() ? newOptionWeight.trim() : undefined,
                              image: newOptionImage.trim() ? newOptionImage.trim() : undefined,
                              characteristics: formattedChars,
                              specs: hasCustomSpecs ? { ...newOptionSpecs } : undefined
                            };
                            const current = formProduct.options || [];
                            const next = [...current, newVar];
                            const shouldResetMainPrice = !editingProduct && next.length >= 2 && Number(formProduct.supplierPrice) === 80;
                            setFormProduct({
                              ...formProduct,
                              supplierPrice: shouldResetMainPrice ? 0 : formProduct.supplierPrice,
                              options: next,
                              variants: next
                            });
                            setNewOptionInput('');
                            setNewOptionPrice('');
                            setNewOptionWeight('');
                            setNewOptionImage('');
                            setNewOptionCharacteristics('');
                            setNewOptionSpecs({});
                            setShowNewOptionSpecs(false);
                          }
                        }}
                        className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-xs py-1.5 px-3 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Ajouter
                      </button>
                    </div>
                  </div>

                  {/* Barre compacte pour le nouveau variant : Upload image réduit + Bouton Caractéristiques propres */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex-1 min-w-[200px]">
                      <ImageUploadInput
                        compact
                        value={newOptionImage}
                        onChange={setNewOptionImage}
                        placeholder="Image du nouveau variant (URL ou Upload)..."
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNewOptionSpecs(prev => !prev)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                        showNewOptionSpecs || Object.keys(newOptionSpecs).length > 0
                          ? 'bg-orange-500/15 text-orange-300 border-orange-500/40'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span>Caractéristiques propres à ce variant (optionnel)</span>
                      {Object.keys(newOptionSpecs).length > 0 && (
                        <span className="bg-orange-500/30 text-orange-200 px-1.5 rounded-full text-[10px] font-mono">
                          {Object.keys(newOptionSpecs).length}
                        </span>
                      )}
                      <span className="text-[10px]">{showNewOptionSpecs ? '▲' : '▼'}</span>
                    </button>
                  </div>

                  {showNewOptionSpecs && (
                    <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-orange-300 uppercase">
                          Spécifications du nouveau variant
                        </span>
                        {Object.keys(formProduct.specs || {}).length > 0 && (
                          <button
                            type="button"
                            onClick={() => setNewOptionSpecs({ ...(formProduct.specs || {}) })}
                            className="text-[10px] font-bold text-blue-300 bg-blue-950/60 hover:bg-blue-900/60 border border-blue-800/50 px-2 py-0.5 rounded cursor-pointer"
                          >
                            Copier celles par défaut
                          </button>
                        )}
                      </div>

                      {Object.keys(newOptionSpecs).length > 0 && (
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {Object.entries(newOptionSpecs).map(([sKey, sVal], sIdx) => (
                            <div key={sIdx} className="grid grid-cols-12 gap-1.5 items-center">
                              <input
                                type="text"
                                value={sKey}
                                onChange={(e) => {
                                  const entries = Object.entries(newOptionSpecs);
                                  entries[sIdx] = [e.target.value, String(sVal)];
                                  setNewOptionSpecs(Object.fromEntries(entries));
                                }}
                                className="col-span-5 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] font-bold text-slate-200"
                              />
                              <input
                                type="text"
                                value={String(sVal)}
                                onChange={(e) => {
                                  const entries = Object.entries(newOptionSpecs);
                                  entries[sIdx] = [sKey, e.target.value];
                                  setNewOptionSpecs(Object.fromEntries(entries));
                                }}
                                className="col-span-6 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-300 font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const entries = Object.entries(newOptionSpecs).filter((_, i) => i !== sIdx);
                                  setNewOptionSpecs(Object.fromEntries(entries));
                                }}
                                className="col-span-1 text-rose-400 hover:bg-rose-500/20 p-1 rounded flex justify-center cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5">
                        <input
                          type="text"
                          placeholder="Nom (ex: Puissance)"
                          value={newVariantSpecKey}
                          onChange={(e) => setNewVariantSpecKey(e.target.value)}
                          className="sm:col-span-2 bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-[11px] text-white"
                        />
                        <input
                          type="text"
                          placeholder="Valeur (ex: 20 kW)"
                          value={newVariantSpecVal}
                          onChange={(e) => setNewVariantSpecVal(e.target.value)}
                          className="sm:col-span-2 bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-[11px] text-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newVariantSpecKey.trim() && newVariantSpecVal.trim()) {
                              setNewOptionSpecs(prev => ({
                                ...prev,
                                [newVariantSpecKey.trim()]: newVariantSpecVal.trim()
                              }));
                              setNewVariantSpecKey('');
                              setNewVariantSpecVal('');
                            }
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-white font-bold rounded text-[11px] py-1 px-2.5 cursor-pointer"
                        >
                          + Ajouter
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Saisie Coûts & Paramètres Fournisseur */}
              <div className="p-5 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-orange-400">
                    Paramètres Fournisseur & Logistique (Moteur de Calcul)
                  </h4>
                  {(formProduct.options || []).length > 0 && Number(formProduct.supplierPrice) === 0 && (
                    <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                      Prix principal à 0 : Le site affichera le variant le moins cher ({currentCalculatedPricing.priceTTC.toLocaleString('fr-FR')} FCFA)
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold text-slate-400">
                        Prix d'Achat Fournisseur
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormProduct({ ...formProduct, supplierPrice: 0 })}
                        className="text-[10px] text-orange-400 hover:text-orange-300 font-bold underline cursor-pointer"
                        title="Remettre à zéro pour utiliser le prix du variant le moins cher"
                      >
                        Remettre à 0
                      </button>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formProduct.supplierPrice ?? 0}
                      onChange={(e) => setFormProduct({ ...formProduct, supplierPrice: e.target.value === '' ? 0 : (parseFloat(e.target.value) || 0) })}
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
                      <option value="USD">USD ($) - {siteSettings.exchangeRates.USD} FCFA</option>
                      <option value="EUR">EUR (€) - {siteSettings.exchangeRates.EUR} FCFA</option>
                      <option value="CNY">CNY (¥) - {siteSettings.exchangeRates.CNY} FCFA</option>
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
                      <option value="air">Aérien Express ({siteSettings.airFreightDurationDays || '5 - 10 jours'} • {(siteSettings.airFreightPerKgXOF || 7500).toLocaleString('fr-FR')} F/kg)</option>
                      <option value="sea">Maritime Économique ({siteSettings.seaFreightDurationDays || '30 - 45 jours'} • {(siteSettings.seaFreightPerKgXOF || 1800).toLocaleString('fr-FR')} F/kg)</option>
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

                {/* TOGGLE TVA SUR LE PRODUIT */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">Application de la TVA ({Math.round((siteSettings.defaultVatRate ?? 0.18) * 100)}%)</span>
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
                    {formProduct.applyVat !== false ? `TVA ${Math.round((siteSettings.defaultVatRate ?? 0.18) * 100)}% Activée` : 'TVA Exonérée (0%)'}
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
                      Prix Client {formProduct.applyVat !== false ? `TTC (${Math.round((siteSettings.defaultVatRate ?? 0.18) * 100)}%)` : 'Net (TVA 0%)'}
                    </span>
                    <span className="text-sm font-mono font-black text-orange-400">
                      {currentCalculatedPricing.priceTTC.toLocaleString('fr-FR')} F
                    </span>
                  </div>
                </div>
              </div>

              {/* Switches Statut & Mode de Disponibilité (Stock Local vs Article à Sourcer) */}
              <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                    Mode de Disponibilité du Produit (Appliqué sur tout le site & au panier)
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formProduct.isOnline !== false}
                      onChange={(e) => setFormProduct({ ...formProduct, isOnline: e.target.checked })}
                      className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                    />
                    <span className="text-xs font-bold text-emerald-400">Publié en ligne</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormProduct({ ...formProduct, inStock: true, availabilityMode: 'stock' })}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      formProduct.availabilityMode === 'stock' || (formProduct.availabilityMode !== 'sourcing' && formProduct.inStock !== false)
                        ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold text-emerald-400">🟢 Disponible Immédiatement</span>
                      {(formProduct.availabilityMode === 'stock' || (formProduct.availabilityMode !== 'sourcing' && formProduct.inStock !== false)) && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300">
                      En Stock Local à Dakar • Livraison 24h-48h • Aucun fret international ajouté au panier.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormProduct({ ...formProduct, inStock: false, availabilityMode: 'sourcing' })}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      formProduct.availabilityMode === 'sourcing' || formProduct.inStock === false
                        ? 'bg-orange-950/60 border-orange-500 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold text-orange-400">🟠 Article à Sourcer (Sur Commande)</span>
                      {(formProduct.availabilityMode === 'sourcing' || formProduct.inStock === false) && (
                        <CheckCircle2 className="w-4 h-4 text-orange-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Importation sur commande • Active le choix Fret Aérien / Maritime sur la fiche et au panier.
                    </p>
                  </button>
                </div>
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

                  {/* Barèmes & Délais Dynamiques appliqués à l'import */}
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/90 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex flex-wrap items-center gap-3 text-slate-300">
                      <span className="font-bold text-orange-400 flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5" /> Barèmes Actifs :
                      </span>
                      <span>
                        Maritime : <strong className="text-white font-mono">{(siteSettings.seaFreightPerKgXOF || 1800).toLocaleString('fr-FR')} F/kg</strong> ({siteSettings.seaFreightDurationDays || '30 - 45 jours'})
                      </span>
                      <span className="text-slate-700">|</span>
                      <span>
                        Aérien : <strong className="text-white font-mono">{(siteSettings.airFreightPerKgXOF || 7500).toLocaleString('fr-FR')} F/kg</strong> ({siteSettings.airFreightDurationDays || '5 - 10 jours'})
                      </span>
                      <span className="text-slate-700">|</span>
                      <span>
                        TVA : <strong className="text-white font-mono">{Math.round((siteSettings.defaultVatRate ?? 0.18) * 100)}%</strong>
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      1$={siteSettings.exchangeRates.USD}F • 1€={siteSettings.exchangeRates.EUR}F • 1¥={siteSettings.exchangeRates.CNY}F
                    </span>
                  </div>

                  {/* 1. Titre, Description, Marque Constructeur, Catégorie & Disponibilité */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <label className="block text-[11px] font-bold text-slate-300">
                          Titre / Désignation en Français (Traduit & Reformulé) :
                        </label>
                        <button
                          type="button"
                          disabled={isTranslating}
                          onClick={() => handleSmartTranslate('import')}
                          className="text-[10px] font-extrabold text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-600/50 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className={`w-3 h-3 ${isTranslating ? 'animate-spin' : ''}`} />
                          <span>{isTranslating ? 'Reformulation...' : '✨ Traduire, Corriger & Reformuler en FR'}</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        value={importForm.name}
                        onChange={(e) => setImportForm({ ...importForm, name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-300">
                          Description Technique (Traduite & Reformulée en FR) :
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const reformulated = smartTranslateProductDescriptionToFrench(
                              importForm.description || '',
                              importForm.name || '',
                              importForm.specs || {}
                            );
                            setImportForm({ ...importForm, description: reformulated });
                            triggerToast("Description reformulée intelligemment en français.");
                          }}
                          className="text-[10px] font-bold text-orange-400 hover:text-orange-300 underline cursor-pointer"
                        >
                          Reformuler intelligemment la description
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={importForm.description || ''}
                        onChange={(e) => setImportForm({ ...importForm, description: e.target.value })}
                        placeholder="Description technique traduite et reformulée en français..."
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
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-300">
                          Catégorie Assignée :
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowCategoryDrawer(prev => !prev)}
                          className="text-[10px] font-extrabold text-orange-400 hover:text-orange-300 cursor-pointer"
                        >
                          {showCategoryDrawer ? '▲ Masquer' : '▼ Dérouler / Modifier'}
                        </button>
                      </div>
                      <select
                        value={importForm.category}
                        onChange={(e) => setImportForm({ ...importForm, category: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        {Array.from(new Set([...categories.map(c => c.name), ...products.map(p => p.category).filter(Boolean), importForm.category].filter(Boolean))).map(catName => (
                          <option key={catName} value={catName}>{catName}</option>
                        ))}
                      </select>
                      <span className="text-[9px] text-slate-500 mt-0.5 block">Cliquez sur « Dérouler / Modifier » pour éditer ou créer</span>
                    </div>

                    {showCategoryDrawer && (
                      <div className="sm:col-span-2 p-3.5 bg-slate-950 border border-orange-500/40 rounded-xl space-y-2.5">
                        <div className="text-[11px] font-bold text-orange-400 uppercase">
                          Gérer / Modifier les Catégories Disponibles
                        </div>
                        <div className="max-h-40 overflow-y-auto divide-y divide-slate-800/80 space-y-1">
                          {categories.map((cat, cIdx) => (
                            <div key={cIdx} className="flex items-center justify-between gap-2 py-1">
                              {editingCatIdx === cIdx ? (
                                <div className="flex-1 flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={editingCatName}
                                    onChange={(e) => setEditingCatName(e.target.value)}
                                    className="flex-1 bg-slate-900 border border-orange-500 rounded px-2 py-1 text-xs text-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const trimmed = editingCatName.trim();
                                      if (trimmed) {
                                        siteSettingsService.updateCategory(cIdx, { ...cat, name: trimmed });
                                        setCategories(siteSettingsService.getCategories());
                                        setImportForm(prev => ({ ...prev, category: trimmed }));
                                        setEditingCatIdx(null);
                                        refreshData();
                                      }
                                    }}
                                    className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold cursor-pointer"
                                  >
                                    OK
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setImportForm({ ...importForm, category: cat.name })}
                                    className={`text-xs font-bold text-left cursor-pointer ${
                                      importForm.category === cat.name ? 'text-orange-400' : 'text-slate-300 hover:text-white'
                                    }`}
                                  >
                                    {importForm.category === cat.name ? '✓ ' : ''}{cat.name}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingCatIdx(cIdx);
                                      setEditingCatName(cat.name);
                                      setEditingCatBrands(cat.brands || '');
                                    }}
                                    className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded text-[10px] cursor-pointer"
                                  >
                                    Modifier
                                  </button>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 pt-1">
                          <input
                            type="text"
                            value={newQuickCatName}
                            onChange={(e) => setNewQuickCatName(e.target.value)}
                            placeholder="Nouvelle catégorie..."
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const trimmed = newQuickCatName.trim();
                              if (trimmed) {
                                siteSettingsService.addCategory({
                                  name: trimmed,
                                  brands: importForm.brand || '',
                                  icon: 'Package',
                                  description: `Matériel et équipements professionnels - ${trimmed}`,
                                  subcategories: []
                                });
                                setCategories(siteSettingsService.getCategories());
                                setImportForm({ ...importForm, category: trimmed });
                                setNewQuickCatName('');
                              }
                            }}
                            className="px-3 py-1 bg-orange-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                          >
                            + Créer
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Choix explicite du mode de disponibilité pour le produit importé */}
                    <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setImportForm({ ...importForm, inStock: false, availabilityMode: 'sourcing' })}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          importForm.availabilityMode !== 'stock'
                            ? 'bg-orange-950/60 border-orange-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <span className="text-xs font-extrabold text-orange-400 block">🟠 Article à Sourcer (Recommandé)</span>
                        <span className="text-[10px] text-slate-300">Sur commande internationale • Fret Aérien ou Maritime</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportForm({ ...importForm, inStock: true, availabilityMode: 'stock' })}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          importForm.availabilityMode === 'stock'
                            ? 'bg-emerald-950/60 border-emerald-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <span className="text-xs font-extrabold text-emerald-400 block">🟢 Disponible Immédiatement</span>
                        <span className="text-[10px] text-slate-300">Déjà en stock local à Dakar • Livraison 24h-48h</span>
                      </button>
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

                  {/* 4. Caractéristiques Techniques par défaut (Intégralement traduites en FR & facilement modifiables) */}
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                          Caractéristiques Techniques par défaut (Traduites en FR & Modifiables)
                        </label>
                        <p className="text-[10px] text-slate-400">
                          Modifiez directement n'importe quel intitulé ou valeur ci-dessous, ou ajoutez les données manquantes
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {Object.keys(importForm.specs || {}).length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const translated = translateSpecsRecordToFrench(importForm.specs || {});
                              setImportForm({ ...importForm, specs: translated });
                            }}
                            className="text-[10px] font-bold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            Traduire en FR
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const count = Object.keys(importForm.specs || {}).length + 1;
                            setImportForm({
                              ...importForm,
                              specs: {
                                ...(importForm.specs || {}),
                                [`Caractéristique ${count}`]: ''
                              }
                            });
                          }}
                          className="text-[10px] font-bold text-blue-300 bg-blue-950/60 hover:bg-blue-900/60 border border-blue-700/50 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Ligne vide
                        </button>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full font-bold">
                          {Object.keys(importForm.specs || {}).length} caractéristiques
                        </span>
                      </div>
                    </div>

                    {Object.entries(importForm.specs || {}).length > 0 ? (
                      <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/70 rounded-lg border border-slate-800 text-xs p-1.5 space-y-1">
                        {Object.entries(importForm.specs || {}).map(([k, v], idx) => (
                          <div key={idx} className="grid grid-cols-12 gap-2 items-center p-1 rounded hover:bg-slate-900/40">
                            <div className="col-span-5">
                              <input
                                type="text"
                                value={k}
                                placeholder="Caractéristique"
                                onChange={(e) => {
                                  const entries = Object.entries(importForm.specs || {});
                                  entries[idx] = [e.target.value, String(v)];
                                  setImportForm({ ...importForm, specs: Object.fromEntries(entries) });
                                }}
                                className="w-full bg-slate-900 border border-slate-700/80 focus:border-orange-500 rounded px-2.5 py-1 text-xs font-bold text-slate-200 focus:outline-none"
                              />
                            </div>
                            <div className="col-span-6">
                              <input
                                type="text"
                                value={String(v)}
                                placeholder="Valeur"
                                onChange={(e) => {
                                  const entries = Object.entries(importForm.specs || {});
                                  entries[idx] = [k, e.target.value];
                                  setImportForm({ ...importForm, specs: Object.fromEntries(entries) });
                                }}
                                className="w-full bg-slate-900 border border-slate-700/80 focus:border-orange-500 rounded px-2.5 py-1 text-xs text-slate-300 font-mono focus:outline-none"
                              />
                            </div>
                            <div className="col-span-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  const entries = Object.entries(importForm.specs || {}).filter((_, i) => i !== idx);
                                  setImportForm({ ...importForm, specs: Object.fromEntries(entries) });
                                }}
                                className="p-1 hover:bg-rose-500/20 text-rose-400 rounded transition-colors cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-500 italic border border-dashed border-slate-800 rounded-lg">
                        Aucune caractéristique disponible sur la page source. Renseignez manuellement les caractéristiques souhaitées ci-dessous.
                      </div>
                    )}

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
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newSpecKey.trim() && newSpecVal.trim()) {
                            e.preventDefault();
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

                  {/* 4.1 Options & Déclinaisons Réelles Extraites (Design épuré et compact) */}
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                          Options & Déclinaisons Disponibles (Variantes)
                        </label>
                        <p className="text-[10px] text-slate-400">
                          Prix d'achat par variant (marge auto), image réduite et bouton de caractéristiques propres.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {(importForm.options || []).length > 0 && (
                          <button
                            type="button"
                            onClick={() => setImportForm({ ...importForm, supplierPrice: 0 })}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                              Number(importForm.supplierPrice) === 0
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-slate-800 hover:bg-slate-700 text-orange-300 border-slate-700'
                            }`}
                          >
                            {Number(importForm.supplierPrice) === 0
                              ? '✓ Prix principal à 0 (Variant min actif)'
                              : '↺ Remettre prix principal à 0'}
                          </button>
                        )}
                        <span className="text-[10px] font-mono text-orange-400 bg-orange-950/40 border border-orange-800/40 px-2 py-0.5 rounded-full font-bold">
                          {(importForm.options || []).length} option{(importForm.options || []).length > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {/* Liste compacte des options extraites */}
                    <div className="space-y-2 min-h-10 p-2.5 bg-slate-900/60 rounded-xl border border-slate-800 max-h-96 overflow-y-auto">
                      {(importForm.options || []).length > 0 ? (
                        (importForm.options || []).map((opt, idx) => {
                          if (!opt) return null;
                          const optObj = typeof opt === 'string'
                            ? { name: opt, price: undefined, supplierPrice: undefined, costPrice: undefined, weight: undefined, image: undefined, characteristics: undefined, specs: {} }
                            : (opt as any);
                          const optName = String(optObj.name || optObj.nom || '');
                          const optPrice = optObj.price;
                          const optSupplierPrice = optObj.supplierPrice;
                          const optCostPrice = optObj.costPrice;
                          const optWeight = optObj.weight;
                          const optImage = optObj.image;
                          const optCharacteristics = optObj.characteristics ?? formatSpecsToCharacteristicsText(optObj.specs);
                          const optSpecs: Record<string, string> = (optObj.specs && typeof optObj.specs === 'object' && Object.keys(optObj.specs).length > 0)
                            ? { ...optObj.specs }
                            : (parseCharacteristicsTextToSpecs(optCharacteristics) || {});

                          const pricingCtx = {
                            supplierCurrency: importForm.supplierCurrency || 'USD',
                            marginRate: Number(importForm.marginRate) || 0.35,
                            warehouseDeliveryFeeUSD: 20,
                            applyVat: importForm.applyVat !== false
                          };
                          const liveCalc = optSupplierPrice !== undefined && optSupplierPrice > 0
                            ? computeSingleVariantPricing(optSupplierPrice, pricingCtx)
                            : { price: optPrice, costPrice: optCostPrice };

                          const isSpecsOpen = openImportVariantSpecsIdx === idx;
                          const specCount = Object.keys(optSpecs).length;

                          const updateImportVariantAtIndex = (changes: Partial<ProductVariantItem>) => {
                            const updated = [...(importForm.options || [])];
                            const nextSupplierPrice = 'supplierPrice' in changes ? changes.supplierPrice : optSupplierPrice;
                            const nextCalc = nextSupplierPrice !== undefined && nextSupplierPrice > 0
                              ? computeSingleVariantPricing(nextSupplierPrice, pricingCtx)
                              : { price: 'price' in changes ? changes.price : optPrice, costPrice: optCostPrice };

                            const nextSpecs = 'specs' in changes
                              ? changes.specs
                              : ('characteristics' in changes
                                ? parseCharacteristicsTextToSpecs(changes.characteristics)
                                : (Object.keys(optSpecs).length > 0 ? optSpecs : undefined));

                            const nextChars = 'characteristics' in changes
                              ? changes.characteristics
                              : ('specs' in changes
                                ? (changes.specs && Object.keys(changes.specs).length > 0 ? formatSpecsToCharacteristicsText(changes.specs) : undefined)
                                : optCharacteristics);

                            updated[idx] = {
                              name: 'name' in changes ? (changes.name || '') : optName,
                              supplierPrice: nextSupplierPrice,
                              price: nextCalc.price,
                              costPrice: nextCalc.costPrice,
                              weight: 'weight' in changes ? changes.weight : optWeight,
                              image: 'image' in changes ? changes.image : optImage,
                              characteristics: nextChars,
                              specs: nextSpecs && Object.keys(nextSpecs).length > 0 ? nextSpecs : undefined
                            };
                            setImportForm({ ...importForm, options: updated });
                          };

                          return (
                            <div
                              key={idx}
                              className="p-2.5 bg-slate-950/90 border border-slate-800 rounded-xl hover:border-slate-700 transition-all space-y-2"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                                <div className="sm:col-span-4">
                                  <input
                                    type="text"
                                    value={optName}
                                    onChange={(e) => updateImportVariantAtIndex({ name: e.target.value })}
                                    placeholder="Nom du variant (ex: 20 kW)"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1 text-xs font-semibold text-white focus:outline-none focus:border-orange-500"
                                  />
                                </div>

                                <div className="sm:col-span-3">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={optSupplierPrice !== undefined && optSupplierPrice !== null ? optSupplierPrice : ''}
                                    onChange={(e) => {
                                      const val = e.target.value.trim() ? parseFloat(e.target.value) : undefined;
                                      updateImportVariantAtIndex({ supplierPrice: val });
                                    }}
                                    placeholder={`Achat (${importForm.supplierCurrency})`}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs text-amber-300 font-mono focus:outline-none focus:border-orange-500"
                                  />
                                </div>

                                <div className="sm:col-span-2">
                                  <div className="px-2 py-1 rounded-md bg-emerald-950/40 border border-emerald-800/40 text-[11px] font-mono text-emerald-400 truncate text-center">
                                    {liveCalc.price !== undefined && liveCalc.price > 0
                                      ? `${liveCalc.price.toLocaleString('fr-FR')} F`
                                      : 'Auto'}
                                  </div>
                                </div>

                                <div className="sm:col-span-2">
                                  <input
                                    type="text"
                                    value={optWeight || ''}
                                    onChange={(e) => {
                                      const val = e.target.value.trim() ? e.target.value.trim() : undefined;
                                      updateImportVariantAtIndex({ weight: val });
                                    }}
                                    placeholder="Poids (kg)"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs text-blue-300 font-mono focus:outline-none focus:border-orange-500"
                                  />
                                </div>

                                <div className="sm:col-span-1 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = (importForm.options || []).filter((_, i) => i !== idx);
                                      setImportForm({ ...importForm, options: updated });
                                    }}
                                    className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-md text-xs border border-rose-500/20 transition-colors cursor-pointer"
                                    title="Retirer cette option"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Barre compacte : Upload image réduit + Bouton Caractéristiques propres */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-800/70">
                                <div className="flex-1 min-w-[200px]">
                                  <ImageUploadInput
                                    compact
                                    value={optImage || ''}
                                    onChange={(url) => updateImportVariantAtIndex({ image: url.trim() ? url.trim() : undefined })}
                                    placeholder="Image du variant (URL ou Upload)..."
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenImportVariantSpecsIdx(isSpecsOpen ? null : idx);
                                    setNewImportVariantSpecKey('');
                                    setNewImportVariantSpecVal('');
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                                    isSpecsOpen || specCount > 0
                                      ? 'bg-orange-500/15 text-orange-300 border-orange-500/40 hover:bg-orange-500/25'
                                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-300'
                                  }`}
                                >
                                  <span>Caractéristiques propres à ce variant (optionnel)</span>
                                  {specCount > 0 && (
                                    <span className="bg-orange-500/30 text-orange-200 px-1.5 rounded-full text-[10px] font-mono">
                                      {specCount}
                                    </span>
                                  )}
                                  <span className="text-[10px] opacity-75">{isSpecsOpen ? '▲' : '▼'}</span>
                                </button>
                              </div>

                              {isSpecsOpen && (
                                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2.5 mt-1">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-[10px] font-bold text-orange-300 uppercase tracking-wider">
                                      Caractéristiques dédiées : {optName || `Variant #${idx + 1}`}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      {Object.keys(importForm.specs || {}).length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => updateImportVariantAtIndex({ specs: { ...(importForm.specs || {}) } })}
                                          className="text-[10px] font-bold text-blue-300 bg-blue-950/60 hover:bg-blue-900/60 border border-blue-800/50 px-2 py-0.5 rounded cursor-pointer"
                                        >
                                          Copier celles par défaut
                                        </button>
                                      )}
                                      {specCount > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => updateImportVariantAtIndex({ specs: {}, characteristics: undefined })}
                                          className="text-[10px] font-bold text-rose-300 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/50 px-2 py-0.5 rounded cursor-pointer"
                                        >
                                          Vider
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {specCount > 0 ? (
                                    <div className="max-h-44 overflow-y-auto divide-y divide-slate-800/60 border border-slate-800 rounded-lg p-1 space-y-1">
                                      {Object.entries(optSpecs).map(([sKey, sVal], sIdx) => (
                                        <div key={sIdx} className="grid grid-cols-12 gap-1.5 items-center p-1 rounded hover:bg-slate-950/60">
                                          <input
                                            type="text"
                                            value={sKey}
                                            onChange={(e) => {
                                              const entries = Object.entries(optSpecs);
                                              entries[sIdx] = [e.target.value, String(sVal)];
                                              updateImportVariantAtIndex({ specs: Object.fromEntries(entries) });
                                            }}
                                            className="col-span-5 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] font-bold text-slate-200"
                                          />
                                          <input
                                            type="text"
                                            value={String(sVal)}
                                            onChange={(e) => {
                                              const entries = Object.entries(optSpecs);
                                              entries[sIdx] = [sKey, e.target.value];
                                              updateImportVariantAtIndex({ specs: Object.fromEntries(entries) });
                                            }}
                                            className="col-span-6 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-300 font-mono"
                                          />
                                          <div className="col-span-1 flex justify-end">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const entries = Object.entries(optSpecs).filter((_, i) => i !== sIdx);
                                                updateImportVariantAtIndex({ specs: Object.fromEntries(entries) });
                                              }}
                                              className="p-1 text-rose-400 hover:bg-rose-500/20 rounded cursor-pointer"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-[11px] text-slate-500 italic text-center py-1">
                                      Aucune caractéristique propre : celles par défaut resteront utilisées.
                                    </p>
                                  )}

                                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5 pt-1">
                                    <input
                                      type="text"
                                      placeholder="Nom (ex: Puissance)"
                                      value={newImportVariantSpecKey}
                                      onChange={(e) => setNewImportVariantSpecKey(e.target.value)}
                                      className="sm:col-span-2 bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-[11px] text-white"
                                    />
                                    <input
                                      type="text"
                                      placeholder="Valeur (ex: 20 kW)"
                                      value={newImportVariantSpecVal}
                                      onChange={(e) => setNewImportVariantSpecVal(e.target.value)}
                                      className="sm:col-span-2 bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-[11px] text-white"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (newImportVariantSpecKey.trim() && newImportVariantSpecVal.trim()) {
                                          updateImportVariantAtIndex({
                                            specs: {
                                              ...optSpecs,
                                              [newImportVariantSpecKey.trim()]: newImportVariantSpecVal.trim()
                                            }
                                          });
                                          setNewImportVariantSpecKey('');
                                          setNewImportVariantSpecVal('');
                                        }
                                      }}
                                      className="bg-slate-800 hover:bg-slate-700 text-white font-bold rounded text-[11px] py-1 px-2.5 cursor-pointer"
                                    >
                                      + Ajouter
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <span className="text-xs text-slate-500 italic block py-1 text-center">
                          Aucune option spécifique détectée pour ce produit.
                        </span>
                      )}
                    </div>

                    {/* Ajout rapide compact d'une déclinaison */}
                    <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800 space-y-2">
                      <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider block">
                        Ajouter une déclinaison :
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
                            step="0.01"
                            min="0"
                            placeholder={`Prix d'achat (${importForm.supplierCurrency})`}
                            value={newImportOptionPrice}
                            onChange={(e) => setNewImportOptionPrice(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-mono"
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
                                const rawSupplierPrice = newImportOptionPrice.trim() ? parseFloat(newImportOptionPrice) : undefined;
                                const optWeight = newImportOptionWeight.trim() ? newImportOptionWeight.trim() : undefined;
                                const computed = computeSingleVariantPricing(rawSupplierPrice, {
                                  supplierCurrency: importForm.supplierCurrency || 'USD',
                                  marginRate: Number(importForm.marginRate) || 0.35,
                                  warehouseDeliveryFeeUSD: 20,
                                  applyVat: importForm.applyVat !== false
                                });
                                const hasCustomSpecs = Object.keys(newImportOptionSpecs).length > 0;
                                const formattedChars = hasCustomSpecs
                                  ? formatSpecsToCharacteristicsText(newImportOptionSpecs)
                                  : (newImportOptionCharacteristics.trim() || undefined);

                                const newOptItem: ProductVariantItem = {
                                  name: optName,
                                  supplierPrice: rawSupplierPrice,
                                  price: computed.price,
                                  costPrice: computed.costPrice,
                                  weight: optWeight,
                                  image: newImportOptionImage.trim() ? newImportOptionImage.trim() : undefined,
                                  characteristics: formattedChars,
                                  specs: hasCustomSpecs ? { ...newImportOptionSpecs } : undefined
                                };

                                const current = importForm.options || [];
                                const next = [...current, newOptItem];
                                setImportForm({ ...importForm, options: next });
                                setNewImportOptionInput('');
                                setNewImportOptionPrice('');
                                setNewImportOptionWeight('');
                                setNewImportOptionImage('');
                                setNewImportOptionCharacteristics('');
                                setNewImportOptionSpecs({});
                                setShowNewImportOptionSpecs(false);
                              }
                            }}
                            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-xs py-1.5 px-3 flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> Ajouter
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex-1 min-w-[200px]">
                          <ImageUploadInput
                            compact
                            value={newImportOptionImage}
                            onChange={setNewImportOptionImage}
                            placeholder="Image du nouveau variant (URL ou Upload)..."
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowNewImportOptionSpecs(prev => !prev)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                            showNewImportOptionSpecs || Object.keys(newImportOptionSpecs).length > 0
                              ? 'bg-orange-500/15 text-orange-300 border-orange-500/40'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <span>Caractéristiques propres à ce variant (optionnel)</span>
                          {Object.keys(newImportOptionSpecs).length > 0 && (
                            <span className="bg-orange-500/30 text-orange-200 px-1.5 rounded-full text-[10px] font-mono">
                              {Object.keys(newImportOptionSpecs).length}
                            </span>
                          )}
                          <span className="text-[10px]">{showNewImportOptionSpecs ? '▲' : '▼'}</span>
                        </button>
                      </div>

                      {showNewImportOptionSpecs && (
                        <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-orange-300 uppercase">
                              Spécifications du nouveau variant
                            </span>
                            {Object.keys(importForm.specs || {}).length > 0 && (
                              <button
                                type="button"
                                onClick={() => setNewImportOptionSpecs({ ...(importForm.specs || {}) })}
                                className="text-[10px] font-bold text-blue-300 bg-blue-950/60 hover:bg-blue-900/60 border border-blue-800/50 px-2 py-0.5 rounded cursor-pointer"
                              >
                                Copier celles par défaut
                              </button>
                            )}
                          </div>
                          {Object.keys(newImportOptionSpecs).length > 0 && (
                            <div className="max-h-36 overflow-y-auto space-y-1">
                              {Object.entries(newImportOptionSpecs).map(([sKey, sVal], sIdx) => (
                                <div key={sIdx} className="grid grid-cols-12 gap-1.5 items-center">
                                  <input
                                    type="text"
                                    value={sKey}
                                    onChange={(e) => {
                                      const entries = Object.entries(newImportOptionSpecs);
                                      entries[sIdx] = [e.target.value, String(sVal)];
                                      setNewImportOptionSpecs(Object.fromEntries(entries));
                                    }}
                                    className="col-span-5 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] font-bold text-slate-200"
                                  />
                                  <input
                                    type="text"
                                    value={String(sVal)}
                                    onChange={(e) => {
                                      const entries = Object.entries(newImportOptionSpecs);
                                      entries[sIdx] = [sKey, e.target.value];
                                      setNewImportOptionSpecs(Object.fromEntries(entries));
                                    }}
                                    className="col-span-6 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-300 font-mono"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const entries = Object.entries(newImportOptionSpecs).filter((_, i) => i !== sIdx);
                                      setNewImportOptionSpecs(Object.fromEntries(entries));
                                    }}
                                    className="col-span-1 text-rose-400 hover:bg-rose-500/20 p-1 rounded flex justify-center cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5">
                            <input
                              type="text"
                              placeholder="Nom (ex: Puissance)"
                              value={newImportVariantSpecKey}
                              onChange={(e) => setNewImportVariantSpecKey(e.target.value)}
                              className="sm:col-span-2 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-[11px] text-white"
                            />
                            <input
                              type="text"
                              placeholder="Valeur (ex: 20 kW)"
                              value={newImportVariantSpecVal}
                              onChange={(e) => setNewImportVariantSpecVal(e.target.value)}
                              className="sm:col-span-2 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-[11px] text-white"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (newImportVariantSpecKey.trim() && newImportVariantSpecVal.trim()) {
                                  setNewImportOptionSpecs(prev => ({
                                    ...prev,
                                    [newImportVariantSpecKey.trim()]: newImportVariantSpecVal.trim()
                                  }));
                                  setNewImportVariantSpecKey('');
                                  setNewImportVariantSpecVal('');
                                }
                              }}
                              className="bg-slate-800 hover:bg-slate-700 text-white font-bold rounded text-[11px] py-1 px-2.5 cursor-pointer"
                            >
                              + Ajouter
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 5. Saisie Prix réel, Devise, Poids et Dimensions */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-slate-400">
                          Prix Fournisseur *
                        </label>
                        <button
                          type="button"
                          onClick={() => setImportForm({ ...importForm, supplierPrice: 0 })}
                          className="text-[10px] text-orange-400 hover:text-orange-300 font-bold underline cursor-pointer"
                        >
                          Mettre à 0
                        </button>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={importForm.supplierPrice ?? 0}
                        onChange={(e) => setImportForm({ ...importForm, supplierPrice: e.target.value === '' ? 0 : (parseFloat(e.target.value) || 0) })}
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
                        <option value="USD">USD ($) — {siteSettings.exchangeRates.USD} F</option>
                        <option value="EUR">EUR (€) — {siteSettings.exchangeRates.EUR} F</option>
                        <option value="CNY">CNY (¥) — {siteSettings.exchangeRates.CNY} F</option>
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
                        <Truck className="w-3.5 h-3.5" /> Barème & Calcul du Fret Maritime ({siteSettings.seaFreightDurationDays || '30 - 45 jours'})
                      </label>
                      <span className="text-[10px] text-slate-400">
                        Tarif Poids: <strong>{(siteSettings.seaFreightPerKgXOF || 1800).toLocaleString('fr-FR')} F/kg</strong> • Tarif Volume: <strong>{Math.round((siteSettings.seaFreightPerCbmUSD || 220) * (siteSettings.exchangeRates.USD || 610)).toLocaleString('fr-FR')} F/m³ ({siteSettings.seaFreightPerCbmUSD || 220} $/m³)</strong>
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
                          <span className="text-white font-bold block">Calcul Maritime au Poids ({(siteSettings.seaFreightPerKgXOF || 1800).toLocaleString('fr-FR')} F/kg)</span>
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
                          <span className="text-white font-bold block">Calcul Maritime au Volume ({siteSettings.seaFreightPerCbmUSD || 220} $/m³)</span>
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
                        <span className="text-xs text-slate-300 font-semibold block">TVA Légale ({Math.round((siteSettings.defaultVatRate ?? 0.18) * 100)}%)</span>
                        <span className="text-[10px] text-slate-500">Activer ou ignorer la TVA</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setImportForm({ ...importForm, applyVat: !importForm.applyVat })}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          importForm.applyVat ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {importForm.applyVat ? `TVA ${Math.round((siteSettings.defaultVatRate ?? 0.18) * 100)}% Active` : 'TVA 0%'}
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
                      <span className="text-[10px] text-slate-400 block uppercase">Fret Maritime ({siteSettings.seaFreightDurationDays || '30 - 45 jours'})</span>
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        {Math.round(importCalculatedPricing.seaFreightCostXOF).toLocaleString('fr-FR')} F
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Fret Aérien ({siteSettings.airFreightDurationDays || '5 - 10 jours'})</span>
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
                  <span className="text-2xl font-black text-[#FF6600]">ÉQUIPEMENTS</span>
                </div>
                <p className="text-xs text-slate-500 font-semibold mt-1">{siteSettings.companyName || 'ZONE ÉQUIPEMENTS'}</p>
                <p className="text-[11px] text-slate-400">{siteSettings.address || 'Km 4, Boulevard du Centenaire, Dakar'} • NINEA: {siteSettings.ninea || '008921822'} • {siteSettings.contactEmail || 'zoneequipements@gmail.com'} • {siteSettings.phoneNumber || '+221 76 653 83 84'}</p>
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
                  <span>TVA ({Math.round((siteSettings.defaultVatRate ?? 0.18) * 100)}%) :</span>
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
                onClick={() => {
                  const itemsRows = selectedOrder.items.map(it => `
                    <tr>
                      <td><strong>${it.name}</strong><br/><span style="font-size:10px;color:#64748b;">${it.brand || ''}</span></td>
                      <td style="text-align:center;font-weight:700;">${it.quantity}</td>
                      <td style="text-align:right;" class="mono">${Math.round(it.price / 1.18).toLocaleString('fr-FR')} F</td>
                      <td style="text-align:right;font-weight:700;" class="mono">${Math.round((it.price / 1.18) * it.quantity).toLocaleString('fr-FR')} F</td>
                    </tr>
                  `).join('');
                  const bodyHtml = `
                    <div class="header">
                      <div>
                        <div class="brand"><span class="brand-blue">ZONE</span> <span class="brand-orange">ÉQUIPEMENTS</span></div>
                        <p style="font-size:12px;font-weight:700;color:#334155;margin:4px 0 2px;">${siteSettings.companyName || 'ZONE ÉQUIPEMENTS'}</p>
                        <p style="font-size:10px;color:#64748b;margin:0;">${siteSettings.address || 'Km 4, Boulevard du Centenaire, Dakar'} • NINEA: ${siteSettings.ninea || '008921822'} • ${siteSettings.contactEmail || 'zoneequipements@gmail.com'} • ${siteSettings.phoneNumber || '+221 76 653 83 84'}</p>
                      </div>
                      <div style="text-align:right;">
                        <span class="badge">${selectedOrder.isQuote ? 'DEVIS PROFORMA' : 'FACTURE OFFICIELLE'}</span>
                        <p class="mono" style="font-size:14px;font-weight:800;margin:8px 0 2px;">${selectedOrder.orderNumber}</p>
                        <p style="font-size:11px;color:#64748b;margin:0;">Date : ${new Date(selectedOrder.createdAt).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </div>
                    <div class="grid-2">
                      <div class="box">
                        <div class="box-title">Destinataire / Client</div>
                        <p style="font-size:13px;font-weight:800;margin:0 0 4px;">${selectedOrder.customerCompany || selectedOrder.customerName}</p>
                        <p style="font-size:11px;color:#475569;margin:2px 0;">${selectedOrder.customerAddress}</p>
                        <p style="font-size:11px;color:#475569;margin:2px 0;">${selectedOrder.customerCity}, ${selectedOrder.customerCountry}</p>
                        <p style="font-size:11px;color:#475569;margin:2px 0;">Tél : ${selectedOrder.customerPhone}</p>
                      </div>
                      <div class="box">
                        <div class="box-title">Conditions Commerciales</div>
                        <p style="font-size:11px;color:#334155;margin:3px 0;"><strong>Mode de règlement :</strong> ${selectedOrder.paymentMethod}</p>
                        <p style="font-size:11px;color:#334155;margin:3px 0;"><strong>Statut paiement :</strong> ${selectedOrder.paymentStatus}</p>
                        <p style="font-size:11px;color:#334155;margin:3px 0;"><strong>Livraison :</strong> DAP Entrepôt / Chantier Dakar</p>
                      </div>
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th>Désignation Matériel</th>
                          <th style="text-align:center;">Quantité</th>
                          <th style="text-align:right;">Prix Unitaire HT</th>
                          <th style="text-align:right;">Montant HT</th>
                        </tr>
                      </thead>
                      <tbody>${itemsRows}</tbody>
                    </table>
                    <div style="display:flex;justify-content:flex-end;margin-top:18px;">
                      <div style="width:280px;font-size:12px;">
                        <div style="display:flex;justify-content:space-between;padding:4px 0;color:#475569;">
                          <span>Sous-total HT :</span>
                          <strong class="mono">${selectedOrder.subtotalHT.toLocaleString('fr-FR')} FCFA</strong>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:4px 0;color:#475569;">
                          <span>TVA (${Math.round((siteSettings.defaultVatRate ?? 0.18) * 100)}%) :</span>
                          <strong class="mono">${selectedOrder.vatAmount.toLocaleString('fr-FR')} FCFA</strong>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:8px 0;margin-top:6px;border-top:2px solid #0f172a;font-size:14px;font-weight:900;">
                          <span>Total Net à Payer :</span>
                          <span class="mono" style="color:#ea580c;">${selectedOrder.totalTTC.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                      </div>
                    </div>
                  `;
                  printHtmlDocument(
                    `${selectedOrder.isQuote ? 'Devis' : 'Facture'} ${selectedOrder.orderNumber}`,
                    `${selectedOrder.orderNumber}.html`,
                    bodyHtml,
                    (msg) => triggerToast(msg)
                  );
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
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
        onOpenWarehouseManager={() => {
          setShowSupplierModal(false);
          setShowWarehouseModal(true);
        }}
      />

      {/* ================= MODAL: GESTION DES ENTREPÔTS D'AGENTS ================= */}
      <AgentWarehouseManagerModal
        isOpen={showWarehouseModal}
        onClose={() => setShowWarehouseModal(false)}
        onUpdated={() => {
          refreshData();
          triggerToast('Entrepôts d\'agents mis à jour.');
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

      {/* ================= MODAL: FACTURATION DIRECTE / COMPTOIR ================= */}
      <DirectInvoiceModal
        isOpen={showDirectInvoiceModal}
        onClose={() => setShowDirectInvoiceModal(false)}
        onSuccess={(order) => {
          refreshData();
          triggerToast(`Facture / Devis comptoir ${order.orderNumber || order.id} créé et synchronisé avec succès !`);
        }}
      />
    </div>
  );
}

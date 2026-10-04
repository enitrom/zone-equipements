import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo, FormEvent } from 'react';
import { 
  ChevronRight, ShoppingCart, Truck, ShieldCheck, 
  ArrowLeft, FileText, Share2, Heart, CheckCircle2,
  Building, Phone, Globe, X, Info, AlertCircle, Tag,
  ZoomIn, ZoomOut, ExternalLink, Download, ChevronLeft, ChevronDown,
  MessageCircle, Copy, Mail
} from 'lucide-react';
import { useCart } from '../CartContext';
import { useAuth } from '../AuthContext';
import { getProductImageUrl, handleImageError } from '../constants';
import {
  catalogService, ExtendedProduct, cleanBrand, normalizeVariants, ProductVariantItem,
  getEffectiveProductBasePrice, parseVariantCharacteristicsToSpecs, isProductSourcing,
  parseWeightToKg, filterOutSmallOrIconImages, getCleanProvenanceDisplay
} from '../services/catalogService';
import { siteSettingsService } from '../services/siteSettingsService';
import { useLanguage } from '../LanguageContext';
import { analyticsTracker } from '../services/analyticsTracker';
import { WORLD_COUNTRIES, isDeliveryCountrySupported } from '../utils/countries';

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const parsedId = parseInt(id || '');
  const [allProducts, setAllProducts] = useState<ExtendedProduct[]>(() => catalogService.getProducts());
  const [siteSettings, setSiteSettings] = useState(() => siteSettingsService.getSettings());

  useEffect(() => {
    const unsub = catalogService.subscribe(() => {
      setAllProducts(catalogService.getProducts());
    });
    const unsubSettings = siteSettingsService.subscribe(() => {
      setSiteSettings(siteSettingsService.getSettings());
    });
    return () => {
      unsub();
      unsubSettings();
    };
  }, []);

  const rawProduct = allProducts.find(p => String(p.id) === String(id) || p.id === parsedId);
  const { t, translateCategory, translateProduct, translateSpecs, translateText } = useLanguage();
  const product = useMemo(() => rawProduct ? translateProduct(rawProduct) : undefined, [rawProduct, translateProduct]);
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { user, profile } = useAuth();
  const clientDefaultCountry = useMemo(
    () => catalogService.getEffectiveClientCountry(profile),
    [profile, siteSettings.defaultClientCountry]
  );

  // Normalize real options / variants with support for distinct price, supplierPrice, image, characteristics & weight per variant
  const productVariants: ProductVariantItem[] = useMemo(() => {
    if (!rawProduct) return [];
    return normalizeVariants((rawProduct as any)?.options || (rawProduct as any)?.variants || [], {
      supplierCurrency: rawProduct.supplierCurrency,
      marginRate: rawProduct.marginRate,
      warehouseDeliveryFeeUSD: rawProduct.warehouseDeliveryFeeUSD,
      applyVat: rawProduct.applyVat
    }).map(v => ({
      ...v,
      name: translateText(v.name),
      characteristics: v.characteristics ? translateText(v.characteristics) : v.characteristics,
      specs: v.specs ? translateSpecs(v.specs) : v.specs
    }));
  }, [rawProduct, translateText, translateSpecs]);

  // Mandatory selection state: user must explicitly choose an option if variants exist
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number | null>(null);
  const [variantSelectionError, setVariantSelectionError] = useState<string | null>(null);

  // Reset or initialize variant state when product changes
  useEffect(() => {
    setSelectedVariantIndex(null);
    setVariantSelectionError(null);
    if (product) {
      analyticsTracker.trackProductView(String(product.id), product.name, product.category);
    }
  }, [product?.id]);

  const selectedVariant: ProductVariantItem | null = selectedVariantIndex !== null && productVariants[selectedVariantIndex]
    ? productVariants[selectedVariantIndex]
    : null;

  // Active base weight: uses the selected variant's weight if defined, otherwise base product weight (supports kg, g, lb, oz, t)
  const baseWeightKg = parseWeightToKg(product?.weight) || 1.0;
  const activeWeightKg = selectedVariant?.weight
    ? (parseWeightToKg(selectedVariant.weight) || baseWeightKg)
    : baseWeightKg;

  // Active equipment price: uses selected variant price if defined, otherwise effective product base price (which takes cheapest variant if default price is 0)
  const baseEquipmentPrice = (selectedVariant && selectedVariant.price !== undefined && selectedVariant.price > 0)
    ? selectedVariant.price
    : getEffectiveProductBasePrice(product);

  // Real discounts (NO fake discounts: strictly from product setting or global site setting)
  const productDiscountPct = product?.discountPercent && product.discountPercent > 0 ? product.discountPercent : 0;
  const globalDiscountPct = (siteSettings.enableGlobalDiscount && siteSettings.globalDiscountPercent && siteSettings.globalDiscountPercent > 0)
    ? siteSettings.globalDiscountPercent
    : 0;

  const effectiveDiscountPct = productDiscountPct > 0 ? productDiscountPct : globalDiscountPct;
  const hasActiveDiscount = effectiveDiscountPct > 0;
  const activeDiscountLabel = productDiscountPct > 0 
    ? `-${productDiscountPct}% Réduction` 
    : `-${globalDiscountPct}% ${siteSettings.globalDiscountLabel || 'Remise Catalogue'}`;

  const currentUnitPrice = hasActiveDiscount
    ? Math.round(baseEquipmentPrice * (1 - (effectiveDiscountPct / 100)))
    : baseEquipmentPrice;

  const originalUnitPrice = hasActiveDiscount ? baseEquipmentPrice : null;

  // Dynamic Freight calculations resolved automatically from the product's & supplier's closest transit warehouse
  const warehouseFreight = useMemo(
    () => catalogService.getProductWarehouseAndFreight(product, activeWeightKg),
    [product, activeWeightKg]
  );

  const airFreightCost = warehouseFreight.airFreightCost;
  const seaFreightCost = warehouseFreight.seaFreightCost;

  const [quantity, setQuantity] = useState(1);
  // Client simply chooses between available Air or Sea freight from the assigned warehouse
  const [selectedFreight, setSelectedFreight] = useState<'air' | 'sea'>(() => {
    return warehouseFreight.defaultClientMethod;
  });

  useEffect(() => {
    setSelectedFreight(warehouseFreight.defaultClientMethod);
  }, [product?.id, warehouseFreight.defaultClientMethod]);

  const [activeTab, setActiveTab] = useState<'specs' | 'shipping'>('specs');
  const [openCurtains, setOpenCurtains] = useState<Record<string, boolean>>({});
  const toggleCurtain = (key: string) => setOpenCurtains(prev => ({ ...prev, [key]: !prev[key] }));
  const [copiedLink, setCopiedLink] = useState(false);
  const [favorite, setFavorite] = useState<boolean>(() => catalogService.isProductLiked(parsedId || id || ''));
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    const syncFav = () => {
      setFavorite(catalogService.isProductLiked(product?.id || parsedId || id || ''));
    };
    syncFav();
    window.addEventListener('ze_liked_products_updated', syncFav);
    return () => window.removeEventListener('ze_liked_products_updated', syncFav);
  }, [product?.id, parsedId, id]);

  // Image Zoom & Lightbox states
  const [isHoverZooming, setIsHoverZooming] = useState(false);
  const [hoverZoomPos, setHoverZoomPos] = useState({ x: 50, y: 50 });
  const [showZoomLightbox, setShowZoomLightbox] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);

  // Added to cart feedback state
  const [addedToCartSuccess, setAddedToCartSuccess] = useState(false);

  // Quote form state
  const [quoteCompany, setQuoteCompany] = useState('');
  const [quotePhone, setQuotePhone] = useState('');
  const [quoteEmail, setQuoteEmail] = useState('');
  const [quoteCountry, setQuoteCountry] = useState(() => clientDefaultCountry || 'Sénégal');
  const [quoteMessage, setQuoteMessage] = useState('');
  const [quotePaymentMethod, setQuotePaymentMethod] = useState('virement');
  const [quoteSuccess, setQuoteSuccess] = useState(false);
  const [quoteRef, setQuoteRef] = useState('');

  useEffect(() => {
    if (clientDefaultCountry) {
      setQuoteCountry(clientDefaultCountry);
    }
  }, [clientDefaultCountry]);

  if (!product || product.isOnline === false || (product as any).isUnavailable === true) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-black text-gray-800 mb-4 uppercase">Matériel non disponible</h1>
          <p className="text-gray-500 max-w-sm mb-6">Cet équipement n'est plus disponible actuellement ou a été désactivé du catalogue.</p>
          <Link to="/shop" className="inline-flex bg-[#003366] text-white px-6 py-2.5 rounded-lg text-xs font-bold hover:bg-[#002244] items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Retour à la boutique
          </Link>
        </div>
      </div>
    );
  }

  const isSourcingProduct = isProductSourcing(product);

  // Selected freight unit cost: 0 FCFA for immediate stock or when 'neutral' (not pre-selected)
  const freightCost = isSourcingProduct
    ? (selectedFreight === 'air' ? airFreightCost : selectedFreight === 'sea' ? seaFreightCost : 0)
    : 0;

  const isVatActive = (siteSettings.vatEnabled !== false) && (
    product?.applyVat !== undefined
      ? Boolean(product.applyVat)
      : Boolean(siteSettings.applyVatByDefault)
  );
  const vatRate = isVatActive ? (product?.vatRate ?? siteSettings.defaultVatRate ?? 0.18) : 0;

  const unitTotalHT = currentUnitPrice + freightCost;
  const unitVat = Math.round(unitTotalHT * vatRate);
  const unitTotalTTC = unitTotalHT + unitVat;

  const totalHT = unitTotalHT * quantity;
  const totalVat = unitVat * quantity;
  const totalTTC = unitTotalTTC * quantity;

  const depositPct = product.depositPercentage || 30;
  const depositTotal = Math.round((totalTTC * depositPct) / 100);
  const balanceTotal = totalTTC - depositTotal;

  // PDF Catalog & Technical Datasheet URLs (direct binary downloads via /api/download-pdf)
  const allPdfDocuments = useMemo(() => {
    const list: Array<{ title: string; url: string }> = [];
    const cleanRef = product?.ref || product?.model || cleanBrand(product?.brand || '', product?.name || '');
    const cleanTitle = (product?.name || 'Fiche-Technique').replace(/\s+/g, '-').replace(/__cookie_check[^\.]*/i, 'Fiche-Technique');
    const cleanSku = encodeURIComponent(product?.ref || product?.model || `SKU-${product?.id}`);
    const cleanBr = encodeURIComponent(cleanBrand(product?.brand || '', product?.name || ''));

    if (Array.isArray(product?.pdfUrls) && product.pdfUrls.length > 0) {
      product.pdfUrls.forEach((doc, idx) => {
        if (!doc?.url || doc.url.includes('__cookie_check.html')) return;
        const safeDocTitle = doc.title || `${translateText('Catalogue & Documentation Technique')} ${idx > 0 ? `#${idx + 1}` : ''}`;
        const downloadUrl = `/api/download-pdf?url=${encodeURIComponent(doc.url)}&filename=${encodeURIComponent(`${cleanTitle}-${idx + 1}`)}&sku=${cleanSku}&brand=${cleanBr}`;
        list.push({
          title: safeDocTitle,
          url: downloadUrl
        });
      });
    } else if (product?.catalogPdfUrl && !product.catalogPdfUrl.includes('__cookie_check.html')) {
      const downloadUrl = `/api/download-pdf?url=${encodeURIComponent(product.catalogPdfUrl)}&filename=${encodeURIComponent(cleanTitle)}&sku=${cleanSku}&brand=${cleanBr}`;
      list.push({
        title: `${translateText('Catalogue PDF & Fiche Technique Constructeur')}${cleanRef ? ` (${cleanRef})` : ''}`,
        url: downloadUrl
      });
    } else {
      list.push({
        title: `${translateText('Catalogue PDF & Fiche Technique Constructeur')}${cleanRef ? ` (${cleanRef})` : ''}`,
        url: `/api/catalog-pdf/${cleanSku}?download=1&title=${encodeURIComponent(product?.name || '')}&brand=${cleanBr}`
      });
    }
    return list;
  }, [product, translateText]);

  const effectiveCatalogPdfUrl = allPdfDocuments.length > 0 ? allPdfDocuments[0].url : '';

  const handleAddToCart = () => {
    // 1. Mandatory variant selection check: user MUST select an option if available
    if (productVariants.length > 0 && selectedVariantIndex === null) {
      setOpenCurtains(prev => ({ ...prev, variants: true }));
      setVariantSelectionError("Veuillez obligatoirement sélectionner une option ou déclinaison ci-dessus avant d'ajouter au panier.");
      setTimeout(() => {
        const optEl = document.getElementById('product-options-section');
        if (optEl) optEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 80);
      return;
    }

    setVariantSelectionError(null);

    // Internal Agent Code strictly for logistics / orders from the assigned warehouse
    const effectiveShippingMethod: 'none' | 'air' | 'sea' = isSourcingProduct ? selectedFreight : 'none';
    const whCode = warehouseFreight.warehouse?.agentCode || 'DKR628';
    const internalAgentCode = isSourcingProduct
      ? (selectedFreight === 'sea' ? `${whCode}+SEA` : `${whCode}+AIR`)
      : 'STOCK-LOCAL-DKR';

    const itemName = selectedVariant 
      ? `${product.name} (${selectedVariant.name})` 
      : product.name;

    const itemImg = (selectedVariant?.image && selectedVariant.image.trim() !== '')
      ? selectedVariant.image.trim()
      : product.img;

    const itemCostPrice = (selectedVariant?.costPrice !== undefined && selectedVariant.costPrice > 0)
      ? selectedVariant.costPrice
      : product.costPrice;

    const itemSupplierPrice = (selectedVariant?.supplierPrice !== undefined && selectedVariant.supplierPrice > 0)
      ? selectedVariant.supplierPrice
      : product.supplierPrice;

    addItem({
      productId: product.id,
      name: itemName,
      variantName: selectedVariant?.name,
      price: currentUnitPrice,
      costPrice: itemCostPrice,
      supplierPrice: itemSupplierPrice,
      supplierCurrency: product.supplierCurrency,
      supplierId: product.supplierId,
      supplierName: product.supplierName,
      brand: product.brand,
      origin: product.origin,
      quantity: quantity,
      img: itemImg,
      weightKg: activeWeightKg,
      inStock: !isSourcingProduct,
      availabilityMode: isSourcingProduct ? 'sourcing' : 'stock',
      sourcePlatform: product.sourcePlatform,
      supplierUrl: product.supplierUrl,
      shippingMethod: effectiveShippingMethod,
      freightCost: freightCost,
      seaFreightCostXOF: seaFreightCost,
      airFreightCostXOF: airFreightCost,
      showDeposit: product.showDeposit,
      depositPercentage: depositPct,
      agentCode: internalAgentCode
    });

    // Stay on current page and provide clear interactive feedback
    setAddedToCartSuccess(true);
    setTimeout(() => {
      setAddedToCartSuccess(false);
    }, 6000);
  };

  const [showShareModal, setShowShareModal] = useState(false);
  const [showShippingInfo, setShowShippingInfo] = useState(false);

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name || 'Équipement Professionnel',
          text: `${product?.name} - ${siteSettings.companyName || 'ZONE ÉQUIPEMENTS'}`,
          url: window.location.href
        });
        return;
      } catch (e) {
        // Fallback to modal if cancelled or unsupported
      }
    }
    setShowShareModal(true);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleLikeToggle = () => {
    if (!user) {
      alert("Veuillez vous connecter à votre compte client pour ajouter ce matériel à vos favoris.");
      navigate('/login');
      return;
    }
    const nextLiked = catalogService.toggleLikedProduct(product?.id || parsedId || id || '', user.uid);
    setFavorite(nextLiked);
  };

  const handleQuoteSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!quoteEmail.trim() && !quotePhone.trim()) {
      return;
    }
    const createdQuote = catalogService.createOrder({
      customerName: quoteCompany || 'Client Pro',
      customerCompany: quoteCompany || undefined,
      customerEmail: quoteEmail || 'contact@client.sn',
      customerPhone: quotePhone || '+221',
      customerAddress: quoteCountry,
      customerCity: 'Dakar',
      customerCountry: quoteCountry,
      items: [{
        productId: product.id,
        name: selectedVariant ? `${product.name} (${selectedVariant.name})` : product.name,
        price: currentUnitPrice,
        costPrice: product.costPrice || Math.round(currentUnitPrice * 0.65),
        quantity: quantity,
        brand: product.brand,
        origin: product.origin,
        shippingMethod: (isSourcingProduct && (selectedFreight === 'sea' || selectedFreight === 'air')) ? selectedFreight : 'none',
        freightCost: freightCost
      }],
      subtotalHT: totalHT,
      vatAmount: totalVat,
      shippingTotal: freightCost * quantity,
      totalTTC: totalTTC,
      paymentMethod: 'Virement Proforma',
      isQuote: true,
      ethicalContractAccepted: true,
      notes: quoteMessage || undefined
    });
    setQuoteRef(createdQuote.orderNumber);
    setQuoteSuccess(true);
  };

  // Technical specifications for Tab 1: if selected variant has its own dedicated characteristics filled, use them; otherwise keep default product specs
  const variantCustomSpecs = useMemo(() => {
    if (!selectedVariant) return null;
    return parseVariantCharacteristicsToSpecs(selectedVariant.characteristics, selectedVariant.specs);
  }, [selectedVariant]);

  const activeSpecs = (variantCustomSpecs && Object.keys(variantCustomSpecs).length > 0)
    ? translateSpecs(variantCustomSpecs)
    : (product.specs || {});

  const specEntries = Object.entries(activeSpecs);
  const half = Math.ceil(specEntries.length / 2);
  const leftSpecs = specEntries.slice(0, half);
  const rightSpecs = specEntries.slice(half);

  const supplierLeadTime = product.leadTime || translateText('Délais selon fournisseur');

  // Real logistics info synchronized with top freight card and live siteSettings
  const shippingLeft = [
    {
      label: translateText('Disponibilité & Mode logistique'),
      value: isSourcingProduct
        ? (selectedFreight === 'air'
            ? `${translateText('Sur commande')} • ${translateText('Fret Aérien Express')} (${siteSettings.airFreightDurationDays || '5 - 10 jours'})`
            : selectedFreight === 'sea'
              ? `${translateText('Sur commande')} • ${translateText('Fret Maritime Économique')} (${siteSettings.seaFreightDurationDays || '30 - 45 jours'})`
              : `${translateText('Sur commande')} • ${translateText('Fret au choix (Maritime ou Aérien — Neutre par défaut)')}`)
        : `${translateText('Disponible immédiatement')} • ${translateText('Stock Local')} (${supplierLeadTime})`
    },
    {
      label: translateText('Tarif Fret Maritime (Dakar)'),
      value: isSourcingProduct
        ? `+${seaFreightCost.toLocaleString('fr-FR')} FCFA (${siteSettings.seaFreightDurationDays || '30 - 45 jours'})`
        : translateText('Inclus (Stock Local Dakar)')
    },
    {
      label: translateText('Tarif Fret Aérien Express (Dakar)'),
      value: isSourcingProduct
        ? `+${airFreightCost.toLocaleString('fr-FR')} FCFA (${siteSettings.airFreightDurationDays || '5 - 10 jours'})`
        : translateText('Inclus (Stock Local Dakar)')
    },
    { label: translateText('Conditionnement transport'), value: `${product.packageQty || 1} ${translateText('colis renforcé industriel')}` }
  ];

  const shippingRight = [
    { 
      label: translateText("Pays de provenance"), 
      value: getCleanProvenanceDisplay(product.origin, (product as any).supplierCountry, (product as any).sourcePlatform) || translateText('Conforme constructeur') 
    },
    { label: translateText('Poids brut vérifié'), value: `${activeWeightKg} kg` },
    { label: translateText('Dimensions colis'), value: translateText(product.dimensions || 'Standard export') },
    {
      label: translateText('Option de fret sélectionnée'),
      value: isSourcingProduct
        ? (selectedFreight === 'sea'
            ? `${translateText('Fret Maritime')} (+${seaFreightCost.toLocaleString('fr-FR')} FCFA)`
            : selectedFreight === 'air'
              ? `${translateText('Fret Aérien')} (+${airFreightCost.toLocaleString('fr-FR')} FCFA)`
              : translateText('Neutre (Aucun fret pré-sélectionné — 0 FCFA)'))
        : translateText('Livraison locale Dakar (0 FCFA)')
    }
  ];

  // Real model display from product specs or model
  const displayModel = product.specs?.['Type de motorisation'] || product.specs?.['Type de moteur'] || product.specs?.['Modèle'] || product.specs?.['Model'] || product.model || product.ref;

  // Related products from same category
  const relatedProducts = allProducts
    .filter(p => p.id !== product.id && p.category === rawProduct?.category && p.isOnline !== false)
    .slice(0, 3)
    .map(p => translateProduct(p));

  return (
    <div className="bg-gray-50/60 min-h-screen pb-20 font-sans text-gray-800">
      
      {/* 1. Clean Breadcrumb Bar */}
      <div className="bg-white border-b border-gray-200 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center flex-wrap gap-2 text-[11px] text-gray-400 font-medium">
          <Link to="/" className="hover:text-[#003366]">{t('home')}</Link>
          <ChevronRight className="w-3 h-3 text-gray-300" />
          <Link to="/shop" className="hover:text-[#003366]">{t('catalog')}</Link>
          <ChevronRight className="w-3 h-3 text-gray-300" />
          <Link to={`/shop?category=${encodeURIComponent(rawProduct?.category || product.category)}`} className="hover:text-[#003366]">{product.category}</Link>
          <ChevronRight className="w-3 h-3 text-gray-300" />
          <span className="text-gray-600 font-semibold truncate max-w-xs sm:max-w-md">{product.name}</span>
        </div>
      </div>

      {/* 2. Main Product Section (RaptorSupplies Style) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* LEFT COLUMN: Product Image Frame with Interactive Hover Zoom & Fullscreen Lightbox (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {(() => {
                const rawBaseImages = (product.images && product.images.length > 0) ? product.images : [product.img];
                const filteredBaseImages = filterOutSmallOrIconImages(rawBaseImages.filter(Boolean));
                const baseImages = filteredBaseImages.length > 0 ? filteredBaseImages : [product.img];
                const variantImg = selectedVariant?.image && selectedVariant.image.trim() !== '' ? selectedVariant.image.trim() : null;
                const allImages = variantImg
                  ? [variantImg, ...baseImages.filter(img => img !== variantImg)]
                  : baseImages;
                const safeIndex = activeImageIndex < allImages.length ? activeImageIndex : 0;
                const activeImg = allImages[safeIndex] || product.img;
                return (
                  <>
                    <div
                      onMouseEnter={() => setIsHoverZooming(true)}
                      onMouseLeave={() => setIsHoverZooming(false)}
                      onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                        const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
                        setHoverZoomPos({ x, y });
                      }}
                      onClick={() => {
                        setZoomScale(1.75);
                        setShowZoomLightbox(true);
                      }}
                      className="aspect-square bg-white rounded-xl border border-gray-200 flex items-center justify-center p-8 relative overflow-hidden group shadow-xs cursor-zoom-in"
                      title={translateText('Survolez pour zoomer ou cliquez pour ouvrir en plein écran HD')}
                    >
                      {/* Status Badge on top of image */}
                      <div className="absolute top-3 left-3 z-10 pointer-events-none">
                        {isSourcingProduct ? (
                          <span className="bg-[#FF6600] text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                            {translateText('À sourcer • Sur commande')}
                          </span>
                        ) : (
                          <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                            {translateText('Disponible immédiatement • Stock Dakar')}
                          </span>
                        )}
                      </div>

                      <img 
                        src={getProductImageUrl(activeImg)} 
                        alt={product.name} 
                        style={
                          isHoverZooming
                            ? {
                                transformOrigin: `${hoverZoomPos.x}% ${hoverZoomPos.y}%`,
                                transform: 'scale(2.15)'
                              }
                            : undefined
                        }
                        className="max-h-96 max-w-full object-contain transition-transform duration-200 ease-out select-none" 
                        referrerPolicy="no-referrer" 
                        onError={handleImageError}
                      />

                      {/* Photo counter badge & Zoom hint */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
                        {allImages.length > 1 ? (
                          <span className="bg-black/70 text-white text-[10px] font-mono px-2 py-0.5 rounded-md backdrop-blur-xs font-bold">
                            {safeIndex + 1} / {allImages.length}
                          </span>
                        ) : <span />}
                        <span className="bg-white/95 border border-gray-200 text-[#003366] text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1">
                          <ZoomIn className="w-3.5 h-3.5 text-[#FF6600]" />
                          <span>{translateText('Loupe HD / Plein écran')}</span>
                        </span>
                      </div>

                      {/* Top action icons */}
                      <div className="absolute top-3 right-3 flex gap-2 z-10" onClick={(e) => e.stopPropagation()}>
                        <button 
                          type="button"
                          onClick={() => {
                            setZoomScale(1.75);
                            setShowZoomLightbox(true);
                          }}
                          className="p-2 rounded-full bg-white/90 shadow-sm border border-gray-200 hover:text-[#003366] transition-all text-gray-500 cursor-pointer"
                          title="Zoom Plein Écran HD"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                        <button 
                          type="button"
                          onClick={handleNativeShare}
                          className="p-2 rounded-full bg-white/90 shadow-sm border border-gray-200 hover:text-[#003366] transition-all text-gray-400 cursor-pointer"
                          title="Partager le lien (WhatsApp, Email...)"
                        >
                          {copiedLink ? <span className="text-[10px] font-bold text-green-600 font-mono">Copié !</span> : <Share2 className="w-4 h-4" />}
                        </button>
                        <button 
                          type="button"
                          onClick={handleLikeToggle}
                          className={`p-2 rounded-full bg-white/90 shadow-sm border transition-all cursor-pointer ${
                            favorite ? 'border-red-300 text-red-500 bg-red-50/90' : 'border-gray-200 text-gray-400 hover:text-red-600'
                          }`}
                          title={favorite ? "Retirer de mes favoris" : "Ajouter à mes favoris"}
                          aria-label="Favoris"
                        >
                          <Heart className={`w-4 h-4 ${favorite ? 'text-red-500 fill-red-500' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Thumbnails row if multiple images */}
                    {allImages.length > 1 && (
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {allImages.map((imgSrc, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveImageIndex(idx)}
                            className={`w-16 h-16 rounded-xl border-2 p-1 bg-white overflow-hidden shrink-0 transition-all cursor-pointer ${
                              safeIndex === idx ? 'border-[#FF6600] ring-2 ring-orange-500/20 shadow-sm' : 'border-gray-200 hover:border-gray-400 opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img 
                              src={getProductImageUrl(imgSrc)} 
                              alt="" 
                              className="w-full h-full object-contain" 
                              referrerPolicy="no-referrer" 
                              onError={handleImageError}
                            />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Fullscreen HD Zoom Lightbox Modal */}
                    {showZoomLightbox && (
                      <div
                        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4"
                        onClick={() => setShowZoomLightbox(false)}
                      >
                        <div
                          className="w-full max-w-5xl flex items-center justify-between text-white mb-3 px-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="truncate pr-4">
                            <span className="text-xs font-bold text-orange-400 uppercase block">{product.brand} — {product.ref}</span>
                            <h4 className="text-sm font-bold truncate">{product.name}</h4>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setZoomScale(s => Math.max(1, +(s - 0.5).toFixed(2)))}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <ZoomOut className="w-4 h-4" /> -
                            </button>
                            <span className="text-xs font-mono font-bold px-2 py-1 bg-slate-900 rounded border border-slate-700">
                              {Math.round(zoomScale * 100)}%
                            </span>
                            <button
                              type="button"
                              onClick={() => setZoomScale(s => Math.min(3.5, +(s + 0.5).toFixed(2)))}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <ZoomIn className="w-4 h-4" /> +
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowZoomLightbox(false)}
                              className="p-2 bg-rose-600 hover:bg-rose-500 rounded-lg text-white cursor-pointer ml-2"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div
                          className="relative w-full max-w-5xl h-[74vh] bg-white rounded-2xl overflow-auto flex items-center justify-center p-6 shadow-2xl"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {allImages.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setActiveImageIndex((safeIndex - 1 + allImages.length) % allImages.length)}
                              className="fixed left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-[#003366] text-white shadow-xl hover:bg-[#FF6600] transition-colors z-20 cursor-pointer"
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </button>
                          )}
                          <img
                            src={getProductImageUrl(activeImg)}
                            alt={product.name}
                            style={{ transform: `scale(${zoomScale})` }}
                            className="max-h-full max-w-full object-contain transition-transform duration-200 cursor-zoom-in"
                            onClick={() => setZoomScale(s => (s >= 2.5 ? 1 : +(s + 0.75).toFixed(2)))}
                            referrerPolicy="no-referrer"
                            onError={handleImageError}
                          />
                          {allImages.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setActiveImageIndex((safeIndex + 1) % allImages.length)}
                              className="fixed right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-[#003366] text-white shadow-xl hover:bg-[#FF6600] transition-colors z-20 cursor-pointer"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Catalogue PDF & Fiche Technique Constructeur (Rideau horizontal plié par défaut) */}
              {allPdfDocuments.length > 0 && (
                <div className="bg-blue-50/70 rounded-xl border border-blue-200/80 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleCurtain('pdf')}
                    className="w-full p-3 flex items-center justify-between text-left hover:bg-blue-100/50 transition-colors cursor-pointer"
                  >
                    <span className="text-[11px] font-extrabold text-[#003366] uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[#FF6600]" />
                      {translateText('Catalogue PDF & Fiche Technique')}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-blue-800 bg-white px-2 py-0.5 rounded border border-blue-200">
                        PDF Officiel
                      </span>
                      <ChevronDown className={`w-4 h-4 text-[#003366] transition-transform duration-200 ${openCurtains.pdf ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {openCurtains.pdf && (
                    <div className="px-3 pb-3 pt-1 border-t border-blue-200/60 flex flex-col gap-1.5">
                      {allPdfDocuments.map((docItem, idx) => (
                        <a
                          key={idx}
                          href={docItem.url}
                          download={`Catalogue-Technique-${product.ref || product.id}.pdf`}
                          className="w-full py-2 px-3 bg-white hover:bg-[#003366] text-[#003366] hover:text-white border border-blue-200 rounded-lg text-xs font-bold flex items-center justify-between gap-2 transition-all shadow-2xs"
                        >
                          <span className="flex items-center gap-2 truncate">
                            <Download className="w-3.5 h-3.5 text-[#FF6600] shrink-0" />
                            <span className="truncate">{docItem.title}</span>
                          </span>
                          <span className="text-[10px] font-mono uppercase shrink-0 opacity-80">Télécharger</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Discreet 1-line Sourcing guarantee notice */}
              <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-200/80 text-[11px] text-gray-600 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#003366] shrink-0" />
                <span className="truncate">
                  <strong className="text-[#003366] font-bold">{t('manufacturer_origin_guarantee')}</strong> • {product.warranty}
                </span>
              </div>
            </div>

            {/* RIGHT COLUMN: Product Details & Purchase Actions (7 cols) */}
            <div className="lg:col-span-7 flex flex-col justify-between">
              <div>
                
                {/* Brand Identifier & Provenance Badge directly below */}
                <div className="flex flex-col gap-1.5 items-start mb-2.5">
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    {translateText('Marque')} : <span className="text-[#003366] font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{cleanBrand(product.brand, product.name)}</span>
                  </div>
                  {(() => {
                    const cleanProv = getCleanProvenanceDisplay(product.origin, (product as any).supplierCountry, (product as any).sourcePlatform);
                    if (!cleanProv) return null;
                    return (
                      <div className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded text-[10px]">
                        📍 {translateText('Provenance')} : <span className="font-bold">{cleanProv}</span>
                      </div>
                    );
                  })()}
                </div>

                {/* Main Product Title */}
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug mb-2.5">
                  {product.name}
                </h1>

                {/* Meta Row: Item | Model | Cross Ref */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 pb-3 mb-4 border-b border-gray-100 font-mono">
                  <span>{translateText('Référence SKU')}: <strong className="text-gray-900 font-semibold">{product.ref}</strong></span>
                  <span className="text-gray-300">|</span>
                  <span>{translateText('Modèle')}: <strong className="text-gray-900 font-semibold">{displayModel}</strong></span>
                </div>

                {/* Pricing Block */}
                <div className="mb-5">
                  {/* Real discount badge & crossed-out original price (NO fake discount) */}
                  {hasActiveDiscount && originalUnitPrice && (
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs text-gray-400 line-through font-mono">
                        {originalUnitPrice.toLocaleString('fr-FR')} FCFA
                      </span>
                      <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded border border-red-200 flex items-center gap-1">
                        <Tag className="w-3 h-3 text-red-600" />
                        {activeDiscountLabel}
                      </span>
                    </div>
                  )}

                  {/* Active equipment price (updates automatically with selected variant price) */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-bold text-[#003366] font-mono tracking-tight">
                      {currentUnitPrice.toLocaleString('fr-FR')} FCFA
                    </span>
                    <span className="text-xs text-gray-500 font-medium">
                      / {isVatActive ? t('unit_price_ex_tax') : translateText('Prix unitaire net')}
                    </span>
                  </div>

                  {selectedVariant && (
                    <div className="mt-1">
                      <span className="text-[#003366] font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[10px] font-mono">
                        {selectedVariant.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Product Variants / Options Picker (Rideau horizontal plié par défaut) */}
                {productVariants.length > 0 && (
                  <div 
                    id="product-options-section" 
                    className={`mb-5 rounded-xl border transition-all overflow-hidden ${
                      variantSelectionError 
                        ? 'bg-red-50/70 border-red-300 ring-2 ring-red-400/40' 
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleCurtain('variants')}
                      className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-100/80 transition-colors cursor-pointer"
                    >
                      <span className="text-xs font-bold text-[#003366] uppercase tracking-wider flex items-center gap-2">
                        <span>{translateText('Options & Déclinaisons Disponibles (Variantes)')}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-100 text-[#003366]">
                          {productVariants.length}
                        </span>
                      </span>
                      <div className="flex items-center gap-2">
                        {selectedVariant ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            ✓ {selectedVariant.name}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                            {translateText('* Sélection obligatoire')}
                          </span>
                        )}
                        <ChevronDown className={`w-4 h-4 text-[#003366] transition-transform duration-200 ${openCurtains.variants || variantSelectionError ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {(openCurtains.variants || Boolean(variantSelectionError)) && (
                      <div className="px-3.5 pb-3.5 pt-2 border-t border-slate-200/80">
                        {/* Validation error message if user clicked add to cart without choosing */}
                        {variantSelectionError && (
                          <div className="mb-3 p-2.5 bg-red-100 border border-red-300 rounded-lg text-xs font-bold text-red-800 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                            <span>{variantSelectionError}</span>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          {productVariants.map((opt, idx) => {
                            const isSelected = selectedVariantIndex === idx;

                            return (
                              <button
                                key={opt.id || idx}
                                type="button"
                                onClick={() => {
                                  setSelectedVariantIndex(idx);
                                  setVariantSelectionError(null);
                                  if (opt.image && opt.image.trim() !== '') {
                                    setActiveImageIndex(0);
                                  } else if (selectedVariant?.image && selectedVariant.image.trim() !== '') {
                                    setActiveImageIndex(0);
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-left ${
                                  isSelected
                                    ? 'bg-[#003366] text-white shadow-sm ring-2 ring-blue-900/30'
                                    : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                                }`}
                              >
                                <span>{opt.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Compact Freight Mode Selection & Price Breakdown */}
                <div className="mb-6 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  {isSourcingProduct ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <label className="text-[11px] font-bold text-[#003366] uppercase tracking-wider block">
                          {t('freight_selection_title')} ({translateText('Optionnel')})
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-gray-600 font-bold bg-white px-2 py-0.5 rounded border border-gray-200">
                            {translateText('Poids calculé')} : {activeWeightKg} kg
                          </span>
                        </div>
                      </div>

                      <div className={`grid grid-cols-1 ${warehouseFreight.offersSeaFreight && warehouseFreight.offersAirFreight ? 'sm:grid-cols-2' : ''} gap-2.5`}>
                        {/* Option 1: Fret Maritime Économique (proposé selon les services de l'entrepôt assigné) */}
                        {warehouseFreight.offersSeaFreight && (
                          <button
                            type="button"
                            onClick={() => setSelectedFreight('sea')}
                            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                              selectedFreight === 'sea'
                                ? 'bg-[#003366] text-white border-[#003366] shadow-xs'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="font-bold text-xs flex items-center justify-between">
                              <span>🚢 {translateText('Fret Maritime Économique')}</span>
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${selectedFreight === 'sea' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                +{seaFreightCost.toLocaleString('fr-FR')} F
                              </span>
                            </div>
                            <span className={`text-[10px] block mt-0.5 ${selectedFreight === 'sea' ? 'text-blue-100' : 'text-gray-400'}`}>
                              {warehouseFreight.seaDuration}
                            </span>
                          </button>
                        )}

                        {/* Option 2: Fret Aérien Express (proposé selon les services de l'entrepôt assigné) */}
                        {warehouseFreight.offersAirFreight && (
                          <button
                            type="button"
                            onClick={() => setSelectedFreight('air')}
                            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                              selectedFreight === 'air'
                                ? 'bg-[#003366] text-white border-[#003366] shadow-xs'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="font-bold text-xs flex items-center justify-between">
                              <span>✈️ {translateText('Fret Aérien Express')}</span>
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${selectedFreight === 'air' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                +{airFreightCost.toLocaleString('fr-FR')} F
                              </span>
                            </div>
                            <span className={`text-[10px] block mt-0.5 ${selectedFreight === 'air' ? 'text-blue-100' : 'text-gray-400'}`}>
                              {warehouseFreight.airDuration}
                            </span>
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-xs font-bold text-[#003366]">
                          {translateText('Livraison Locale Immédiate (Dakar & Régions)')} • {supplierLeadTime}
                        </span>
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                        {translateText('Prêt à livrer')}
                      </span>
                    </div>
                  )}

                  {/* Discrete Reassuring Delivery Indicator directly under freight choice */}
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    {isDeliveryCountrySupported(clientDefaultCountry, warehouseFreight.supportedDeliveryCountries) ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1.5 text-xs">
                        ✓ {translateText('Livraison disponible vers votre pays')} ({clientDefaultCountry})
                      </span>
                    ) : (
                      <span className="text-amber-800 font-bold text-xs">
                        ⚠️ {translateText('Votre pays par défaut')} ({clientDefaultCountry}) {translateText('n\'est pas desservi par cet entrepôt')}
                      </span>
                    )}
                    
                    {/* Collapsible details toggle to keep the page super clean */}
                    <button
                      type="button"
                      onClick={() => setShowShippingInfo(prev => !prev)}
                      className="text-[10px] font-semibold text-[#003366] hover:text-[#FF6600] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Info className="w-3 h-3 text-[#FF6600]" />
                      <span>{showShippingInfo ? translateText('Masquer les détails logistiques') : translateText('Détails des pays & formalités')}</span>
                      <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showShippingInfo ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {/* Folded Shipping & Customs Information (Collapsed by default) */}
                  {showShippingInfo && (
                    <div className="mt-2.5 p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 animate-in fade-in duration-200 text-[10px] text-gray-600">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-[#003366] shrink-0" />
                        <span className="font-bold text-[#003366]">{translateText('Pays livrés')} :</span>
                        <span className="font-semibold text-gray-800">
                          {warehouseFreight.supportedDeliveryCountries.join(', ')}
                        </span>
                      </div>
                      <div className="pt-1.5 border-t border-slate-200/60 text-gray-500 leading-relaxed">
                        <span className="text-[#FF6600] font-bold mr-1">ℹ</span>
                        {translateText('Les tarifs de fret dépendent des barèmes réels de nos compagnies logistiques partenaires maritimes et aériennes. Le dédouanement maritime est généralement géré par les services logistiques de l\'ensemble de nos agents transitaires. Pour le fret aérien, les expéditions peuvent parfois faire l\'objet d\'un blocage ou contrôle temporaire en douane pour régularisation des formalités de dédouanement.')}
                      </div>
                    </div>
                  )}

                  {/* Dynamic Pricing Breakdown (Organized, spacious & mobile-friendly) */}
                  <div className="mt-4 pt-3 border-t border-slate-200/90">
                    <div className={`grid grid-cols-1 ${isVatActive ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-2.5 sm:gap-2 text-xs`}>
                      <div className="flex sm:flex-col justify-between sm:justify-center items-center sm:items-start bg-white sm:bg-transparent p-2.5 sm:p-0 rounded-lg border sm:border-0 border-slate-100">
                        <span className="text-[11px] sm:text-[10px] text-gray-500 font-semibold">
                          {isVatActive ? t('price_equipment_ht') : translateText('Prix équipement')}
                        </span>
                        <span className="font-mono font-bold text-gray-900 text-xs sm:text-xs">{currentUnitPrice.toLocaleString('fr-FR')} FCFA</span>
                      </div>
                      <div className="flex sm:flex-col justify-between sm:justify-center items-center sm:items-start bg-white sm:bg-transparent p-2.5 sm:p-0 rounded-lg border sm:border-0 border-slate-100">
                        <span className="text-[11px] sm:text-[10px] text-gray-500 font-semibold">
                          {isSourcingProduct ? t('freight_selected_cost') : 'Option Fret'}
                        </span>
                        <span className={`font-mono font-bold text-xs ${isSourcingProduct ? 'text-orange-600' : 'text-gray-500'}`}>
                          {isSourcingProduct
                            ? `+${freightCost.toLocaleString('fr-FR')} FCFA`
                            : 'Inclus (0 FCFA)'}
                        </span>
                      </div>
                      {isVatActive && (
                        <div className="flex sm:flex-col justify-between sm:justify-center items-center sm:items-start bg-white sm:bg-transparent p-2.5 sm:p-0 rounded-lg border sm:border-0 border-slate-100">
                          <span className="text-[11px] sm:text-[10px] text-gray-500 font-semibold">
                            TVA ({Math.round((product?.vatRate ?? siteSettings.defaultVatRate ?? 0.18) * 100)}%)
                          </span>
                          <span className="font-mono font-bold text-gray-700 text-xs">
                            {vatRate > 0 ? `+${unitVat.toLocaleString('fr-FR')} FCFA` : '0 FCFA'}
                          </span>
                        </div>
                      )}
                      <div className="flex sm:flex-col justify-between sm:justify-center items-center sm:items-end bg-gradient-to-br from-blue-50 to-indigo-50/50 p-2.5 rounded-xl border border-blue-200/80 shadow-2xs">
                        <span className="text-[10px] sm:text-[9px] text-[#003366] font-extrabold uppercase tracking-wider">
                          {isVatActive ? t('total_ttc_calc') : translateText('Total estimé :')}
                        </span>
                        <span className="text-sm font-black font-mono text-[#003366]">{unitTotalTTC.toLocaleString('fr-FR')} FCFA</span>
                      </div>
                    </div>
                  </div>

                  {/* Discreet Optional Deposit / Acompte Notice */}
                  {product.showDeposit && (
                    <div className="mt-2.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-950 flex items-center justify-between gap-2">
                      <span>
                        <strong>{t('deposit_notice')} {depositPct}% :</strong> {depositTotal.toLocaleString('fr-FR')} FCFA
                      </span>
                      <span className="text-amber-800 font-mono">
                        {t('deposit_balance')} : {balanceTotal.toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                  )}
                </div>

                {/* Added to Cart Interactive Feedback Banner (stays on page) */}
                {addedToCartSuccess && (
                  <div className="mb-4 p-4 bg-emerald-50 border border-emerald-300 rounded-xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-emerald-950">
                          {quantity}x {selectedVariant ? `"${product.name} (${selectedVariant.name})"` : `"${product.name}"`} {translateText('ajouté au panier !')}
                        </h4>
                        <p className="text-[11px] text-emerald-800">
                          {translateText('Votre sélection a été ajoutée avec succès. Vous pouvez continuer vos achats ou finaliser votre commande.')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => setAddedToCartSuccess(false)}
                        className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        {translateText('Continuer mes achats')}
                      </button>
                      <Link
                        to="/cart"
                        className="px-3.5 py-1.5 bg-[#003366] hover:bg-[#002244] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>{translateText('Voir mon panier')}</span>
                      </Link>
                    </div>
                  </div>
                )}

                {/* Acquisition Actions: Quantity + Catalog-sized Cart + Catalog-sized Quote Buttons */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  {/* Stepper */}
                  <div className="inline-flex items-center border border-gray-300 rounded-lg h-9 bg-white flex-shrink-0">
                    <button 
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 text-gray-500 hover:text-gray-900 hover:bg-gray-50 h-full rounded-l-lg font-bold text-sm transition-colors cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-10 text-center font-bold text-gray-900 font-mono text-xs">
                      {quantity}
                    </span>
                    <button 
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-3 text-gray-500 hover:text-gray-900 hover:bg-gray-50 h-full rounded-r-lg font-bold text-sm transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  {/* Action Button: Cart if price exists, Quote if no price */}
                  {currentUnitPrice > 0 ? (
                    <button 
                      onClick={handleAddToCart}
                      className="bg-[#003366] hover:bg-[#002244] text-white h-10 px-5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <ShoppingCart className="w-4 h-4" /> {t('add_to_cart_btn')}
                    </button>
                  ) : (
                    <button 
                      onClick={() => setShowQuoteModal(true)}
                      className="bg-[#FF6600] hover:bg-[#e65c00] text-white h-10 px-5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <FileText className="w-4 h-4" /> {t('quote_pro_btn')}
                    </button>
                  )}

                  {/* Like / Favorite Product Button (Icon only) */}
                  <button
                    type="button"
                    onClick={handleLikeToggle}
                    className={`h-10 w-10 rounded-xl font-semibold text-xs transition-all flex items-center justify-center cursor-pointer shadow-xs border ${
                      favorite
                        ? 'bg-rose-50 text-rose-600 border-rose-300'
                        : 'bg-white hover:bg-rose-50/60 text-gray-600 hover:text-rose-600 border-gray-300'
                    }`}
                    title={favorite ? 'Retirer de mes favoris' : 'Ajouter à mes favoris'}
                    aria-label="Favoris"
                  >
                    <Heart className={`w-4 h-4 ${favorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                  </button>

                  {/* Share Product Button */}
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="h-10 px-3 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs border bg-white hover:bg-blue-50 text-[#003366] border-gray-300"
                    title="Partager cette fiche produit (WhatsApp, Email...)"
                  >
                    <Share2 className="w-3.5 h-3.5 text-[#FF6600]" />
                    <span>{translateText('Partager')}</span>
                  </button>

                  {/* Multiple Catalogue(s) PDF Constructeur (Téléchargement direct en binaire sans conversion HTML) */}
                  {allPdfDocuments.map((doc, dIdx) => (
                    <a
                      key={dIdx}
                      href={doc.url}
                      download
                      className="bg-slate-100 hover:bg-[#003366] text-[#003366] hover:text-white border border-slate-300 h-10 px-3.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs"
                      title={doc.title}
                    >
                      <Download className="w-3.5 h-3.5 text-[#FF6600]" />
                      <span>{allPdfDocuments.length > 1 ? `PDF #${dIdx + 1}` : translateText('Catalogue PDF')}</span>
                    </a>
                  ))}
                </div>

              </div>
            </div>

          </div>
        </div>

        {/* 3. Dual Tab Section: Specifications | Shipping Information */}
        <div className="mt-8 bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          
          {/* Tabs Navigation Bar */}
          <div className="border-b border-gray-200 bg-[#fafafa] px-6 py-4 flex items-center gap-4 text-sm font-bold">
            <button 
              onClick={() => setActiveTab('specs')}
              className={`pb-1 transition-all cursor-pointer ${
                activeTab === 'specs' 
                  ? 'text-[#003366] border-b-2 border-[#003366] font-black' 
                  : 'text-gray-400 hover:text-gray-600 font-medium'
              }`}
            >
              {translateText('Spécifications')}
            </button>
            <span className="text-gray-300 font-light">|</span>
            <button 
              onClick={() => setActiveTab('shipping')}
              className={`pb-1 transition-all cursor-pointer ${
                activeTab === 'shipping' 
                  ? 'text-[#003366] border-b-2 border-[#003366] font-black' 
                  : 'text-gray-400 hover:text-gray-600 font-medium'
              }`}
            >
              {translateText("Données d'expédition")}
            </button>
          </div>

          {/* TAB 1: Specifications (2-column zebra-striped table) */}
          {activeTab === 'specs' && (
            <div className="p-6">
              {selectedVariant && variantCustomSpecs && (
                <div className="mb-3 px-3.5 py-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs text-[#003366]">
                  <span className="font-bold">
                    {translateText('Déclinaison / Modèle Sélectionné')} : « {selectedVariant.name} »
                  </span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 border border-gray-200 rounded-lg overflow-hidden">
                
                {/* Left Specs Column */}
                <div className="divide-y divide-gray-100 md:border-r border-gray-200">
                  {selectedVariant && (
                    <>
                      <div className="flex justify-between items-center px-4 py-2.5 bg-blue-50/80 text-xs font-semibold text-[#003366]">
                        <span className="font-bold">{translateText('Déclinaison / Modèle Sélectionné')}</span>
                        <span className="font-mono text-right font-bold text-[#003366]">{selectedVariant.name}</span>
                      </div>
                      <div className="flex justify-between items-center px-4 py-2.5 bg-blue-50/40 text-xs">
                        <span className="text-gray-900 font-bold">{translateText('Prix Spécifique de la Déclinaison')}</span>
                        <span className="font-mono text-right font-bold text-[#00875a]">
                          {currentUnitPrice.toLocaleString('fr-FR')} FCFA HT
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-center px-4 py-2.5 bg-[#f8fafc] text-xs">
                    <span className="text-gray-900 font-bold">{translateText('Item / Désignation')}</span>
                    <span className="text-gray-600 font-mono text-right">{product.name}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2.5 bg-white text-xs">
                    <span className="text-gray-900 font-bold">{translateText('Catégorie')}</span>
                    <span className="text-gray-600 font-mono text-right">{product.category}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2.5 bg-[#f8fafc] text-xs">
                    <span className="text-gray-900 font-bold">{translateText('Modèle Constructeur')}</span>
                    <span className="text-gray-600 font-mono text-right">{product.model}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2.5 bg-white text-xs">
                    <span className="text-gray-900 font-bold">{translateText('Référence SKU')}</span>
                    <span className="text-gray-600 font-mono text-right">{product.ref}</span>
                  </div>
                  {leftSpecs.map(([key, val], idx) => (
                    <div 
                      key={key} 
                      className={`flex justify-between items-center px-4 py-2.5 text-xs ${
                        idx % 2 === 0 ? 'bg-[#f8fafc]' : 'bg-white'
                      }`}
                    >
                      <span className="text-gray-900 font-bold">{key}</span>
                      <span className="text-gray-600 font-mono text-right">{val}</span>
                    </div>
                  ))}
                </div>

                {/* Right Specs Column */}
                <div className="divide-y divide-gray-100">
                  {selectedVariant && (
                    <div className="flex justify-between items-center px-4 py-2.5 bg-blue-50/80 text-xs">
                      <span className="text-gray-900 font-bold">{translateText('Poids Spécifique Déclinaison')}</span>
                      <span className="text-blue-900 font-mono text-right font-bold">
                        {selectedVariant.weight || activeWeightKg + ' kg'}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center px-4 py-2.5 bg-[#f8fafc] text-xs">
                    <span className="text-gray-900 font-bold">{translateText("Constructeur d'Origine")}</span>
                    <span className="text-gray-600 font-mono text-right font-bold">{product.brand}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2.5 bg-white text-xs">
                    <span className="text-gray-900 font-bold">{translateText('Conditionnement')}</span>
                    <span className="text-gray-600 font-mono text-right">{product.packageQty} {translateText(product.packageQty > 1 ? 'unités' : 'unité')}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2.5 bg-[#f8fafc] text-xs">
                    <span className="text-gray-900 font-bold">{translateText('Commande Minimum (MOQ)')}</span>
                    <span className="text-gray-600 font-mono text-right">{product.moq} {translateText(product.moq > 1 ? 'packs' : 'pack')}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2.5 bg-white text-xs">
                    <span className="text-gray-900 font-bold">{translateText("Garantie MRO d'Usine")}</span>
                    <span className="text-gray-600 font-mono text-right">{product.warranty}</span>
                  </div>
                  {rightSpecs.map(([key, val], idx) => (
                    <div 
                      key={key} 
                      className={`flex justify-between items-center px-4 py-2.5 text-xs ${
                        idx % 2 === 0 ? 'bg-[#f8fafc]' : 'bg-white'
                      }`}
                    >
                      <span className="text-gray-900 font-bold">{key}</span>
                      <span className="text-gray-600 font-mono text-right">{val}</span>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: Shipping Information (2-column zebra-striped table) */}
          {activeTab === 'shipping' && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 border border-gray-200 rounded-lg overflow-hidden">
                
                {/* Left Shipping Column */}
                <div className="divide-y divide-gray-100 md:border-r border-gray-200">
                  {shippingLeft.map((item, idx) => (
                    <div 
                      key={item.label} 
                      className={`flex justify-between items-center px-4 py-2.5 text-xs ${
                        idx % 2 === 0 ? 'bg-[#f8fafc]' : 'bg-white'
                      }`}
                    >
                      <span className="text-gray-900 font-bold">{item.label}</span>
                      <span className="text-gray-600 font-mono text-right">{item.value}</span>
                    </div>
                  ))}
                </div>

                {/* Right Shipping Column */}
                <div className="divide-y divide-gray-100">
                  {shippingRight.map((item, idx) => (
                    <div 
                      key={item.label} 
                      className={`flex justify-between items-center px-4 py-2.5 text-xs ${
                        idx % 2 === 0 ? 'bg-[#f8fafc]' : 'bg-white'
                      }`}
                    >
                      <span className="text-gray-900 font-bold">{item.label}</span>
                      <span className="text-gray-600 font-mono text-right">{item.value}</span>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          )}

        </div>

        {/* 4. Real Admin Description & Product Details (Concise & Discreet) */}
        <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-xs p-5 md:p-6">
          <h3 className="text-xs font-black text-[#003366] uppercase tracking-wider mb-2.5 border-b border-gray-100 pb-2">
            {translateText('Détails & Description du produit')}
          </h3>
          <div className="text-gray-700 text-xs leading-relaxed space-y-2 max-w-4xl">
            <p className="font-medium text-gray-900">
              {product.description}
            </p>
            {product.extendedDescription && (
              <p className="text-gray-600">
                {product.extendedDescription}
              </p>
            )}
          </div>
        </div>

        {/* 5. Cross-selling / Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-10">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#003366] mb-4">
              {translateText('Articles similaires dans la catégorie')} {product.category}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {relatedProducts.map(rel => (
                <div key={rel.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex flex-col justify-between group hover:border-gray-300 transition-all">
                  <div>
                    <div className="aspect-video bg-gray-50 flex items-center justify-center p-3 rounded-lg overflow-hidden relative mb-3">
                      <img 
                        src={getProductImageUrl(rel.img)} 
                        alt="" 
                        className="max-h-24 max-w-full object-contain group-hover:scale-105 transition-transform" 
                        referrerPolicy="no-referrer"
                        onError={handleImageError}
                      />
                      <span className="absolute top-2 left-2 bg-white/90 border border-gray-200 px-2 py-0.5 rounded text-[8px] font-bold text-[#003366] uppercase">
                        {rel.brand}
                      </span>
                    </div>
                    
                    <h4 className="font-bold text-xs text-gray-900 hover:text-[#003366] line-clamp-2 leading-snug">
                      <Link to={`/product/${rel.id}`}>{rel.name}</Link>
                    </h4>
                    <p className="text-[10px] text-gray-400 font-mono mt-1">{translateText('Modèle')}: {rel.model}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <span className="block text-[8px] text-gray-400 font-bold uppercase">Net HT</span>
                      <span className="font-mono font-black text-gray-900 text-xs">
                        {getEffectiveProductBasePrice(rel).toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                    <Link 
                      to={`/product/${rel.id}`}
                      className="bg-gray-100 hover:bg-[#003366] text-gray-700 hover:text-white p-1.5 rounded transition-all"
                      title={translateText('Voir le produit')}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Quote / Information Request Modal */}
      {showQuoteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => { setShowQuoteModal(false); setQuoteSuccess(false); }}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {!quoteSuccess ? (
              <div>
                <div className="mb-4 pb-3 border-b border-gray-100">
                  <h3 className="text-base font-black text-[#003366] uppercase">
                    Demande de Renseignements &amp; Devis Proforma
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Établissement immédiat d'une offre technique ou facture proforma d'importation certifiée.
                  </p>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-4 text-xs font-mono">
                  <div className="font-bold text-gray-900">
                    {selectedVariant ? `${product.name} (${selectedVariant.name})` : product.name}
                  </div>
                  <div className="text-gray-500 mt-0.5">Réf: {product.ref} | Marque: {product.brand}</div>
                  <div className="text-[#00875a] font-bold mt-1">
                    Prix unitaire : {currentUnitPrice.toLocaleString('fr-FR')} FCFA HT
                  </div>
                </div>

                <form onSubmit={handleQuoteSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                      Société / Entreprise demanderesse
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                      <input 
                        type="text" 
                        value={quoteCompany}
                        onChange={(e) => setQuoteCompany(e.target.value)}
                        placeholder="Ex: Société Industrielle ou Nom..."
                        className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-xs font-medium focus:ring-2 focus:ring-[#003366] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                        Email professionnel *
                      </label>
                      <input 
                        type="email" 
                        required
                        value={quoteEmail}
                        onChange={(e) => setQuoteEmail(e.target.value)}
                        placeholder="contact@entreprise.com"
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-[#003366] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                        Téléphone / WhatsApp *
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                        <input 
                          type="tel" 
                          required
                          value={quotePhone}
                          onChange={(e) => setQuotePhone(e.target.value)}
                          placeholder="+221 ... / +225 ..."
                          className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-xs font-medium focus:ring-2 focus:ring-[#003366] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                        Pays de livraison *
                      </label>
                      <div className="relative">
                        <Globe className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                        <select 
                          value={quoteCountry} 
                          onChange={(e) => setQuoteCountry(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-xs font-medium focus:ring-2 focus:ring-[#003366] focus:outline-none"
                        >
                          <optgroup label="Pays pris en charge par cet entrepôt">
                            {warehouseFreight.supportedDeliveryCountries.map(c => (
                              <option key={`sup-${c}`} value={c}>{c} (Livraison prise en charge)</option>
                            ))}
                          </optgroup>
                          <optgroup label="Tous les pays">
                            {WORLD_COUNTRIES.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                        Quantité souhaitée
                      </label>
                      <input 
                        type="number" 
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono font-bold focus:ring-2 focus:ring-[#003366] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                      Modalités de règlement souhaitées
                    </label>
                    <select 
                      value={quotePaymentMethod}
                      onChange={(e) => setQuotePaymentMethod(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-[#003366] focus:outline-none"
                    >
                      <option value="virement">Virement bancaire d'avance</option>
                      <option value="acompte">Acompte à la commande + Solde à la livraison</option>
                      <option value="lc">Lettre de Crédit documentaire (L/C)</option>
                      <option value="mobile_pro">Paiement Wave / Orange Money Pro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                      Précisions ou questions spécifiques (optionnel)
                    </label>
                    <textarea
                      rows={2}
                      value={quoteMessage}
                      onChange={(e) => setQuoteMessage(e.target.value)}
                      placeholder="Précisez ici vos contraintes techniques, délais ou demandes particulières..."
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-[#003366] focus:outline-none"
                    />
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <span className="block text-[9px] text-gray-400 font-bold uppercase">
                        {isVatActive ? 'Montant estimé HT' : 'Montant estimé'}
                      </span>
                      <span className="text-sm font-mono font-black text-gray-900">
                        {(currentUnitPrice * quantity).toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                    <button 
                      type="submit"
                      className="bg-[#00875a] hover:bg-[#00704a] text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                    >
                      Envoyer la demande
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="text-center py-4">
                <CheckCircle2 className="w-12 h-12 text-[#00875a] mx-auto mb-3" />
                <h4 className="text-base font-black text-gray-900 uppercase">
                  Demande de Devis Transmise !
                </h4>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  Votre référence de cotation est <strong className="text-[#003366] font-mono">{quoteRef}</strong>. Nos ingénieurs technico-commerciaux vous contacteront avec le devis complet.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <button 
                    onClick={() => { setShowQuoteModal(false); setQuoteSuccess(false); }}
                    className="bg-[#003366] text-white px-5 py-2 rounded-lg text-xs font-bold hover:bg-[#002244]"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Rich Multi-Option Share Modal (WhatsApp, Email, Copy Link, WebShare) */}
      {showShareModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setShowShareModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#003366] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-[#FF6600]" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider">{translateText('Partager ce matériel')}</h3>
              </div>
              <button 
                onClick={() => setShowShareModal(false)} 
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <img
                  src={getProductImageUrl(product.image)}
                  alt=""
                  className="w-12 h-12 object-contain bg-white rounded-lg border border-slate-200 p-1 shrink-0"
                  onError={handleImageError}
                />
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-black text-[#FF6600] uppercase tracking-wider block">{cleanBrand(product.brand, product.name)}</span>
                  <h4 className="text-xs font-bold text-gray-900 truncate leading-snug">{product.name}</h4>
                  <span className="text-[11px] font-mono font-black text-[#003366]">{currentUnitPrice.toLocaleString('fr-FR')} FCFA HT</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* WhatsApp Share */}
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Découvrez cet équipement : ${product.name}\n${window.location.href}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold transition-all shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div>WhatsApp</div>
                    <span className="text-[10px] text-emerald-600 font-normal">Message direct</span>
                  </div>
                </a>

                {/* Email Share */}
                <a
                  href={`mailto:?subject=${encodeURIComponent(`Fiche Équipement : ${product.name} - ${siteSettings.companyName || 'Zone Équipements'}`)}&body=${encodeURIComponent(`Bonjour,\n\nVoici la fiche technique de l'équipement :\n\n${product.name}\nMarque : ${product.brand}\nPrix : ${currentUnitPrice.toLocaleString('fr-FR')} FCFA HT\n\nLien d'accès direct :\n${window.location.href}\n\nCordialement.`)}`}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#003366] text-xs font-bold transition-all shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#003366] text-white flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div>Email</div>
                    <span className="text-[10px] text-blue-600 font-normal">Envoyer la fiche</span>
                  </div>
                </a>
              </div>

              {/* Copy Link Row */}
              <div className="pt-2 border-t border-gray-100">
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Lien de la fiche produit</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={window.location.href}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-xs font-mono text-gray-600 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`py-2 px-3.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                      copiedLink
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#FF6600] hover:bg-orange-600 text-white'
                    }`}
                  >
                    {copiedLink ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copié !' : 'Copier'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo, FormEvent } from 'react';
import { 
  ChevronRight, ShoppingCart, Truck, ShieldCheck, 
  ArrowLeft, FileText, Share2, Heart, CheckCircle2,
  Building, Phone, Globe, X, Info, AlertCircle, Tag
} from 'lucide-react';
import { useCart } from '../CartContext';
import { useAuth } from '../AuthContext';
import { getProductImageUrl, handleImageError } from '../constants';
import { catalogService, ExtendedProduct, cleanBrand, normalizeVariants, ProductVariantItem, getEffectiveProductBasePrice, parseVariantCharacteristicsToSpecs, isProductSourcing } from '../services/catalogService';
import { siteSettingsService } from '../services/siteSettingsService';
import { useLanguage } from '../LanguageContext';
import { analyticsTracker } from '../services/analyticsTracker';

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
  const { user } = useAuth();

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

  // Active base weight: uses the selected variant's weight if defined, otherwise base product weight
  const baseWeightKg = parseFloat(String(product?.weight || '1').replace(/[^0-9.]/g, '')) || 1.0;
  const activeWeightKg = selectedVariant?.weight
    ? (parseFloat(String(selectedVariant.weight).replace(/[^0-9.]/g, '')) || baseWeightKg)
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

  // Dynamic Freight calculations using the active variant weight and live site settings (rate/kg + minimum charge)
  const airFreightCost = Math.max(siteSettings.airFreightMin || 7000, Math.round(activeWeightKg * (siteSettings.airFreightPerKg || 7000)));
  const seaFreightCost = Math.max(siteSettings.seaFreightMin || 8000, Math.round(activeWeightKg * (siteSettings.seaFreightPerKg || 1800)));

  const [quantity, setQuantity] = useState(1);
  // Default to Maritime freight everywhere as requested
  const [selectedFreight, setSelectedFreight] = useState<'air' | 'sea'>('sea');
  const [activeTab, setActiveTab] = useState<'specs' | 'shipping'>('specs');
  const [copiedLink, setCopiedLink] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Added to cart feedback state
  const [addedToCartSuccess, setAddedToCartSuccess] = useState(false);

  // Quote form state
  const [quoteCompany, setQuoteCompany] = useState('');
  const [quotePhone, setQuotePhone] = useState('');
  const [quoteEmail, setQuoteEmail] = useState('');
  const [quoteCountry, setQuoteCountry] = useState('Sénégal');
  const [quoteMessage, setQuoteMessage] = useState('');
  const [quotePaymentMethod, setQuotePaymentMethod] = useState('virement');
  const [quoteSuccess, setQuoteSuccess] = useState(false);
  const [quoteRef, setQuoteRef] = useState('');

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

  // Selected freight unit cost: 0 FCFA for immediate stock in Dakar, or selected international freight for sourcing products
  const freightCost = isSourcingProduct
    ? (selectedFreight === 'air' ? airFreightCost : seaFreightCost)
    : 0;

  const isVatActive = product?.applyVat !== undefined
    ? Boolean(product.applyVat)
    : Boolean(siteSettings.applyVatByDefault);
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

  const handleAddToCart = () => {
    // 1. Mandatory variant selection check: user MUST select an option if available
    if (productVariants.length > 0 && selectedVariantIndex === null) {
      setVariantSelectionError("Veuillez obligatoirement sélectionner une option ou déclinaison ci-dessus avant d'ajouter au panier.");
      const optEl = document.getElementById('product-options-section');
      if (optEl) optEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setVariantSelectionError(null);

    // Internal Agent Code strictly for logistics / orders: DKR628+AIR, DKR628+SEA, or STOCK-LOCAL-DKR
    const effectiveShippingMethod: 'none' | 'air' | 'sea' = isSourcingProduct ? selectedFreight : 'none';
    const internalAgentCode = isSourcingProduct
      ? (selectedFreight === 'sea' ? 'DKR628+SEA' : 'DKR628+AIR')
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

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
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
        shippingMethod: isSourcingProduct ? selectedFreight : 'none',
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

  // Real logistics info (no fake data)
  const shippingLeft = [
    {
      label: translateText('Disponibilité & Mode logistique'),
      value: isSourcingProduct
        ? (selectedFreight === 'air'
            ? `${translateText('Sur commande')} • ${translateText('Fret Aérien Express')} (${siteSettings.airFreightDurationDays || '5 - 10j'})`
            : `${translateText('Sur commande')} • ${translateText('Fret Maritime Économique')} (${siteSettings.seaFreightDurationDays || '30 - 45j'})`)
        : `${translateText('Disponible immédiatement')} • ${translateText('Stock Local')} (${supplierLeadTime})`
    },
    {
      label: translateText('Délai indicatif Dakar'),
      value: isSourcingProduct
        ? (selectedFreight === 'air' ? (siteSettings.airFreightDurationDays || '5 - 10j') : (siteSettings.seaFreightDurationDays || '30 - 45j'))
        : supplierLeadTime
    },
    { label: translateText('Conditionnement transport'), value: `${product.packageQty || 1} ${translateText('colis renforcé industriel')}` }
  ];

  const shippingRight = [
    { label: translateText("Pays de provenance"), value: product.origin || 'International' },
    { label: translateText('Poids brut vérifié'), value: product.weight || `${activeWeightKg} kg` },
    { label: translateText('Dimensions colis'), value: translateText(product.dimensions || 'Standard export') }
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
            
            {/* LEFT COLUMN: Product Image Frame (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {(() => {
                const baseImages = (product.images && product.images.length > 0) ? product.images : [product.img];
                const variantImg = selectedVariant?.image && selectedVariant.image.trim() !== '' ? selectedVariant.image.trim() : null;
                const allImages = variantImg
                  ? [variantImg, ...baseImages.filter(img => img !== variantImg)]
                  : baseImages;
                const safeIndex = activeImageIndex < allImages.length ? activeImageIndex : 0;
                const activeImg = allImages[safeIndex] || product.img;
                return (
                  <>
                    <div className="aspect-square bg-white rounded-xl border border-gray-200 flex items-center justify-center p-8 relative overflow-hidden group shadow-xs">
                      {/* Status Badge on top of image */}
                      <div className="absolute top-3 left-3 z-10">
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
                        className="max-h-96 max-w-full object-contain group-hover:scale-105 transition-transform duration-500" 
                        referrerPolicy="no-referrer" 
                        onError={handleImageError}
                      />

                      {/* Photo counter badge */}
                      {allImages.length > 1 && (
                        <span className="absolute bottom-3 left-3 bg-black/70 text-white text-[10px] font-mono px-2 py-0.5 rounded-md backdrop-blur-xs font-bold">
                          {safeIndex + 1} / {allImages.length}
                        </span>
                      )}

                      {/* Top action icons */}
                      <div className="absolute top-3 right-3 flex gap-2 z-10">
                        <button 
                          onClick={handleShare}
                          className="p-2 rounded-full bg-white/90 shadow-sm border border-gray-200 hover:text-[#003366] transition-all text-gray-400"
                          title="Partager le lien"
                        >
                          {copiedLink ? <span className="text-[10px] font-bold text-green-600 font-mono">Copié !</span> : <Share2 className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={() => setFavorite(!favorite)}
                          className="p-2 rounded-full bg-white/90 shadow-sm border border-gray-200 hover:text-red-600 transition-all text-gray-400"
                          title="Ajouter aux favoris"
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
                            onClick={() => setActiveImageIndex(idx)}
                            className={`w-16 h-16 rounded-xl border-2 p-1 bg-white overflow-hidden shrink-0 transition-all ${
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
                  </>
                );
              })()}

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
                
                {/* Brand Identifier (Clean, strictly no platform names) */}
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  {translateText('Marque')} : <span className="text-[#003366] font-bold">{cleanBrand(product.brand, product.name)}</span>
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
                  <span className="text-gray-300">|</span>
                  <span>{translateText('Origine')}: <strong className="text-gray-900 font-semibold">{product.origin || 'International'}</strong></span>
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
                      / {t('unit_price_ex_tax')}
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

                {/* Product Variants / Options Picker (Mandatory Selection before Add to Cart) */}
                {productVariants.length > 0 && (
                  <div 
                    id="product-options-section" 
                    className={`mb-5 p-3.5 rounded-xl border transition-all ${
                      variantSelectionError 
                        ? 'bg-red-50/70 border-red-300 ring-2 ring-red-400/40' 
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-[#003366] uppercase tracking-wider flex items-center gap-1.5">
                        <span>{translateText('Options & Déclinaisons Disponibles :')}</span>
                      </label>
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                        {translateText('* Sélection obligatoire')}
                      </span>
                    </div>

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

                {/* Compact Freight Mode Selection & Price Breakdown */}
                <div className="mb-6 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  {isSourcingProduct ? (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[11px] font-bold text-[#003366] uppercase tracking-wider block">
                          {t('freight_selection_title')}
                        </label>
                        <span className="text-[10px] font-mono text-gray-600 font-bold bg-white px-2 py-0.5 rounded border border-gray-200">
                          {translateText('Poids calculé')} : {activeWeightKg} kg
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {/* Option 1: Fret Maritime Économique */}
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
                            <span>{translateText('Fret Maritime Économique')}</span>
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${selectedFreight === 'sea' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                              +{seaFreightCost.toLocaleString('fr-FR')} F
                            </span>
                          </div>
                          <span className={`text-[10px] block mt-0.5 ${selectedFreight === 'sea' ? 'text-blue-100' : 'text-gray-400'}`}>
                            {siteSettings.seaFreightDurationDays || '30 - 45j'} • {(siteSettings.seaFreightPerKgXOF || 1800).toLocaleString('fr-FR')} F/kg
                          </span>
                        </button>

                        {/* Option 2: Fret Aérien Express */}
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
                            <span>{translateText('Fret Aérien Express')}</span>
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${selectedFreight === 'air' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                              +{airFreightCost.toLocaleString('fr-FR')} F
                            </span>
                          </div>
                          <span className={`text-[10px] block mt-0.5 ${selectedFreight === 'air' ? 'text-blue-100' : 'text-gray-400'}`}>
                            {siteSettings.airFreightDurationDays || '5 - 10j'} • {(siteSettings.airFreightPerKgXOF || 7500).toLocaleString('fr-FR')} F/kg
                          </span>
                        </button>
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

                  {/* Dynamic Pricing Breakdown (Organized, spacious & mobile-friendly) */}
                  <div className="mt-4 pt-3 border-t border-slate-200/90">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 sm:gap-2 text-xs">
                      <div className="flex sm:flex-col justify-between sm:justify-center items-center sm:items-start bg-white sm:bg-transparent p-2.5 sm:p-0 rounded-lg border sm:border-0 border-slate-100">
                        <span className="text-[11px] sm:text-[10px] text-gray-500 font-semibold">{t('price_equipment_ht')}</span>
                        <span className="font-mono font-bold text-gray-900 text-xs sm:text-xs">{currentUnitPrice.toLocaleString('fr-FR')} FCFA</span>
                      </div>
                      <div className="flex sm:flex-col justify-between sm:justify-center items-center sm:items-start bg-white sm:bg-transparent p-2.5 sm:p-0 rounded-lg border sm:border-0 border-slate-100">
                        <span className="text-[11px] sm:text-[10px] text-gray-500 font-semibold">
                          {isSourcingProduct ? t('freight_selected_cost') : 'Option Fret'}
                        </span>
                        <span className={`font-mono font-bold text-xs ${isSourcingProduct ? 'text-orange-600' : 'text-emerald-600'}`}>
                          {isSourcingProduct ? `+${freightCost.toLocaleString('fr-FR')} FCFA` : 'Inclus (0 FCFA)'}
                        </span>
                      </div>
                      <div className="flex sm:flex-col justify-between sm:justify-center items-center sm:items-start bg-white sm:bg-transparent p-2.5 sm:p-0 rounded-lg border sm:border-0 border-slate-100">
                        <span className="text-[11px] sm:text-[10px] text-gray-500 font-semibold">
                          TVA ({Math.round((product?.vatRate ?? siteSettings.defaultVatRate ?? 0.18) * 100)}%)
                        </span>
                        <span className="font-mono font-bold text-gray-700 text-xs">
                          {isVatActive && vatRate > 0 ? `+${unitVat.toLocaleString('fr-FR')} FCFA` : '0 FCFA'}
                        </span>
                      </div>
                      <div className="flex sm:flex-col justify-between sm:justify-center items-center sm:items-end bg-gradient-to-br from-blue-50 to-indigo-50/50 p-2.5 rounded-xl border border-blue-200/80 shadow-2xs">
                        <span className="text-[10px] sm:text-[9px] text-[#003366] font-extrabold uppercase tracking-wider">{t('total_ttc_calc')}</span>
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

                  {/* Standard Catalog-Style Add to Cart Button */}
                  <button 
                    onClick={handleAddToCart}
                    className="bg-[#003366] hover:bg-[#002244] text-white h-9 px-4 rounded-lg font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" /> {t('add_to_cart_btn')}
                  </button>

                  {/* Standard Catalog-Style Request Quote Button */}
                  <button 
                    onClick={() => setShowQuoteModal(true)}
                    className="bg-white hover:bg-orange-50 text-[#FF6600] border border-[#FF6600] h-9 px-4 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5" /> {t('quote_pro_btn')}
                  </button>
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
                          <option value="Sénégal">Sénégal (Dakar)</option>
                          <option value="Côte d'Ivoire">Côte d'Ivoire (Abidjan)</option>
                          <option value="Mali">Mali (Bamako)</option>
                          <option value="Guinée">Guinée (Conakry)</option>
                          <option value="Burkina Faso">Burkina Faso (Ouagadougou)</option>
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
                      <span className="block text-[9px] text-gray-400 font-bold uppercase">Montant estimé HT</span>
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

    </div>
  );
}


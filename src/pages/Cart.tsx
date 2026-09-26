import React, { useState, useEffect, useMemo } from 'react';
import { useCart } from '../CartContext';
import { useAuth } from '../AuthContext';
import { 
  Trash2, Plus, Minus, ShoppingBag, ArrowRight, ShieldCheck, CheckCircle2, 
  FileText, Truck, AlertTriangle, Lock, Tag, X, Check, AlertCircle 
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { catalogService, ExtendedProduct } from '../services/catalogService';
import { siteSettingsService, PromoCode } from '../services/siteSettingsService';
import { getProductImageUrl, handleImageError } from '../constants';
import { useLanguage } from '../LanguageContext';

export default function Cart() {
  const { items, updateQuantity, updateItemFreight, removeItem, clearCart, equipmentTotal, freightTotal, total } = useCart();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Reactive Products & Settings from Admin
  const [allProducts, setAllProducts] = useState<ExtendedProduct[]>(() => catalogService.getProducts());
  const [siteSettings, setSiteSettings] = useState(() => siteSettingsService.getSettings());

  // Promo code state
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);

  useEffect(() => {
    const unsubProd = catalogService.subscribe(() => setAllProducts(catalogService.getProducts()));
    const unsubSettings = siteSettingsService.subscribe(() => setSiteSettings(siteSettingsService.getSettings()));
    return () => {
      unsubProd();
      unsubSettings();
    };
  }, []);

  // Commercial contract acceptance state
  const [contractAccepted, setContractAccepted] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderCreatedSuccess, setOrderCreatedSuccess] = useState<string | null>(null);

  // Customer Checkout Details
  const [customerName, setCustomerName] = useState(user?.displayName || '');
  const [customerCompany, setCustomerCompany] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerCity, setCustomerCity] = useState('Dakar');
  const [paymentMethod, setPaymentMethod] = useState<'Wave' | 'Orange Money' | 'Virement Proforma'>('Wave');
  const [orderType, setOrderType] = useState<'order' | 'quote'>('order');
  const [paymentChoice, setPaymentChoice] = useState<'full' | 'deposit'>('full');

  // Dynamic availability verification for cart items
  const isItemAvailable = (item: any) => {
    const prod = allProducts.find(p => String(p.id) === String(item.productId));
    if (!prod) return false;
    if (prod.isOnline === false) return false;
    if ((prod as any).isUnavailable === true) return false;
    return true;
  };

  const unavailableItems = items.filter(it => !isItemAvailable(it));
  const hasUnavailableItems = unavailableItems.length > 0;

  // Total weight
  const totalWeightKg = items.reduce((acc, it) => acc + ((it.weightKg || 1.0) * it.quantity), 0);
  const hasHeavyAirItems = items.some(it => it.shippingMethod === 'air' && (it.weightKg || 1.0) > 20);
  const totalWeightExceedsAir = totalWeightKg > 20;

  // Has any deposit option
  const hasDepositProduct = items.some(it => it.showDeposit);
  const depositPct = Math.max(...items.filter(it => it.showDeposit).map(it => it.depositPercentage || 30), 30);

  // Helper for dynamic unit freight cost calculation using live siteSettings
  const getItemUnitFreight = (item: any, method?: 'sea' | 'air') => {
    const weightKg = item.weightKg || 1.0;
    const currentMethod = method || item.shippingMethod || 'sea';
    if (currentMethod === 'air') {
      return Math.max(12000, Math.round(weightKg * (siteSettings.airFreightPerKgXOF || 7500)));
    } else {
      return Math.max(8000, Math.round(weightKg * (siteSettings.seaFreightPerKgXOF || 1800)));
    }
  };

  const dynamicFreightTotal = items.reduce((acc, item) => {
    return acc + (getItemUnitFreight(item) * item.quantity);
  }, 0);

  // Senegal Tax & Freight calculations
  const subtotalHT = equipmentTotal + dynamicFreightTotal;

  // Promo discount calculation based on subtotalHT
  const promoDiscountAmount = useMemo(() => {
    if (!appliedPromo) return 0;
    if (appliedPromo.discountType === 'percent') {
      return Math.round((subtotalHT * appliedPromo.discountValue) / 100);
    } else {
      return Math.min(subtotalHT, appliedPromo.discountValue);
    }
  }, [appliedPromo, subtotalHT]);

  const discountedSubtotalHT = Math.max(0, subtotalHT - promoDiscountAmount);

  // Itemized VAT respecting product setting & global site setting
  const vatAmount = items.reduce((sum, item) => {
    const prod = allProducts.find(p => String(p.id) === String(item.productId));
    const isVatActive = prod?.applyVat !== undefined 
      ? Boolean(prod.applyVat) 
      : Boolean(siteSettings.applyVatByDefault);
    const rate = isVatActive ? (prod?.vatRate ?? siteSettings.defaultVatRate ?? 0.18) : 0;
    const itemFreight = getItemUnitFreight(item);
    const itemHT = (item.price + itemFreight) * item.quantity;
    return sum + Math.round(itemHT * rate);
  }, 0);

  // Grand total TTC adjusted with promo discount
  const grandTotalTTC = Math.max(0, discountedSubtotalHT + vatAmount);

  const depositAmountTTC = Math.round((grandTotalTTC * depositPct) / 100);
  const balanceAmountTTC = grandTotalTTC - depositAmountTTC;
  const payableNow = (hasDepositProduct && paymentChoice === 'deposit') ? depositAmountTTC : grandTotalTTC;

  const handleApplyPromoCode = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError(null);
    setPromoSuccess(null);

    if (!promoCodeInput.trim()) {
      setPromoError("Veuillez saisir un code promo.");
      return;
    }

    const validation = siteSettingsService.validatePromoCode(promoCodeInput.trim(), subtotalHT);
    if (!validation.valid || !validation.promo) {
      setPromoError(validation.message || "Code promo invalide.");
      setAppliedPromo(null);
      return;
    }

    setAppliedPromo(validation.promo);
    setPromoSuccess(`Code "${validation.promo.code}" appliqué avec succès !`);
  };

  const handleRemovePromoCode = () => {
    setAppliedPromo(null);
    setPromoCodeInput('');
    setPromoError(null);
    setPromoSuccess(null);
  };

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasUnavailableItems) {
      alert("Votre panier contient des articles actuellement indisponibles ou retirés du catalogue. Veuillez les supprimer du panier avant de pouvoir valider votre commande.");
      return;
    }
    if (!contractAccepted) {
      alert("Veuillez cocher et accepter le contrat de mandat de sourcing et de transparence commerciale pour continuer.");
      return;
    }
    if (!customerPhone.trim()) {
      alert("Veuillez renseigner un numéro de téléphone joignable (Wave / Orange Money).");
      return;
    }

    setIsSubmitting(true);

    const hasSea = items.some(it => it.shippingMethod === 'sea');
    const internalAgentCode = hasSea ? 'DKR628+SEA' : 'DKR628+AIR';

    // Increment promo usage if a code was applied
    if (appliedPromo) {
      siteSettingsService.incrementPromoCodeUsage(appliedPromo.id);
    }

    const newOrder = catalogService.createOrder({
      customerName: customerName || 'Client Zone Équipements Sénégal',
      customerCompany: customerCompany || undefined,
      customerEmail: user?.email || 'contact@client.sn',
      customerPhone: customerPhone,
      customerAddress: customerAddress || 'Dakar Plateau / Zone Industrielle',
      customerCity: customerCity,
      customerCountry: 'Sénégal',
      items: items.map(it => ({
        productId: it.productId,
        name: it.name,
        price: it.price,
        costPrice: Math.round(it.price * 0.65),
        quantity: it.quantity,
        brand: 'Constructeur Certifié',
        origin: 'International',
        shippingMethod: it.shippingMethod || 'none',
        freightCost: it.freightCost || 0
      })),
      subtotalHT: discountedSubtotalHT,
      vatAmount: vatAmount,
      shippingTotal: dynamicFreightTotal,
      totalTTC: grandTotalTTC,
      paymentMethod: paymentMethod,
      agentCode: internalAgentCode,
      isQuote: orderType === 'quote',
      ethicalContractAccepted: true,
      notes: [
        appliedPromo ? `Code Promo appliqué: ${appliedPromo.code} (-${promoDiscountAmount.toLocaleString('fr-FR')} FCFA).` : '',
        (hasDepositProduct && paymentChoice === 'deposit') 
          ? `Acompte versé à la commande : ${depositAmountTTC.toLocaleString('fr-FR')} FCFA (${depositPct}%). Solde exigible à la livraison à Dakar : ${balanceAmountTTC.toLocaleString('fr-FR')} FCFA.`
          : ''
      ].filter(Boolean).join(' ') || undefined
    });

    setIsSubmitting(false);
    setOrderCreatedSuccess(newOrder.orderNumber);
    clearCart();
  };

  if (orderCreatedSuccess) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center font-sans">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
          Dossier Enregistré avec Succès
        </span>
        <h1 className="text-3xl font-black text-[#003366] mt-4 mb-2">
          {orderType === 'quote' ? 'Votre Devis Proforma est Prêt' : 'Merci pour votre Commande !'}
        </h1>
        <p className="text-gray-600 text-sm max-w-lg mx-auto mb-6">
          Votre dossier porte la référence officielle <strong className="font-mono text-orange-600 font-bold">{orderCreatedSuccess}</strong>. Nos équipes logistiques ont transmis le mandat d'approvisionnement pour expédition.
        </p>
        
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 max-w-md mx-auto text-left text-xs text-gray-700 space-y-2 mb-8">
          <p><strong>Bénéficiaire :</strong> Zone Équipements Sénégal SARL</p>
          <p><strong>Mode sélectionné :</strong> {paymentMethod}</p>
          <p><strong>Total TTC :</strong> {grandTotalTTC.toLocaleString('fr-FR')} FCFA</p>
          {hasDepositProduct && paymentChoice === 'deposit' && (
            <p className="text-amber-800 font-bold">
              Acompte à payer : {depositAmountTTC.toLocaleString('fr-FR')} FCFA (Solde à réception : {balanceAmountTTC.toLocaleString('fr-FR')} FCFA)
            </p>
          )}
          <p><strong>Conformité :</strong> Contrat de mandat éthique validé et archivé.</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link to="/account" className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md">
            Voir mes commandes
          </Link>
          <Link to="/shop" className="px-6 py-3 bg-[#FF6600] hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-md">
            Retourner au Catalogue
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center font-sans">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
          <ShoppingBag className="w-12 h-12" />
        </div>
        <h1 className="text-3xl font-black text-[#003366] mb-4">Votre panier est vide</h1>
        <p className="text-gray-500 mb-8 text-sm">Découvrez nos équipements industriels et matériels MRO pour vos chantiers et usines.</p>
        <Link to="/shop" className="inline-flex items-center gap-2 bg-[#FF6600] text-white px-8 py-3.5 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-600/20 text-sm">
          Consulter le Catalogue <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-[#003366] tracking-tight">{t('cart_title')}</h1>
          <p className="text-xs text-gray-500 mt-1">Zone Équipements Sénégal • Facturation officielle & mandats conformes</p>
        </div>
        <Link to="/shop" className="text-xs font-bold text-[#FF6600] hover:underline flex items-center gap-1">
          &larr; {t('btn_continue_shopping')}
        </Link>
      </div>

      {/* Alert banner for locked / unavailable products */}
      {hasUnavailableItems && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-xs text-red-950 shadow-xs animate-fadeIn">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-grow">
            <strong className="block font-bold text-red-900 mb-0.5">
              Attention : {unavailableItems.length} article{unavailableItems.length > 1 ? 's ne sont' : ' n\'est'} plus disponible{unavailableItems.length > 1 ? 's' : ''} dans notre catalogue
            </strong>
            <p className="text-[11px] text-red-800 leading-relaxed">
              Ce{unavailableItems.length > 1 ? 's matériels ont' : ' matériel a'} été désactivé{unavailableItems.length > 1 ? 's' : ''} ou retiré{unavailableItems.length > 1 ? 's' : ''} de la vente. {unavailableItems.length > 1 ? 'Ils sont verrouillés' : 'Il est verrouillé'} dans votre panier. Veuillez utiliser le bouton de suppression pour {unavailableItems.length > 1 ? 'les' : 'le'} retirer afin de pouvoir finaliser votre commande.
            </p>
          </div>
        </div>
      )}

      {/* Intelligent freight weight notification */}
      {totalWeightExceedsAir && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs text-blue-950">
          <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold mb-0.5">{t('freight_intelligent_alert_title')}</strong>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              {t('freight_intelligent_alert_desc')}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Items List (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">
              {t('cart_title')} ({items.length}) • Poids cumulé estimé : {totalWeightKg.toFixed(1)} kg
            </h2>

            <div className="divide-y divide-gray-100">
              {items.map((item) => {
                const available = isItemAvailable(item);
                const itemWeight = item.weightKg || 1.0;
                const seaUnitCost = getItemUnitFreight(item, 'sea');
                const airUnitCost = getItemUnitFreight(item, 'air');
                const currentUnitCost = getItemUnitFreight(item);
                const currentTotalFreight = currentUnitCost * item.quantity;

                return (
                  <div key={item.id} className={`py-5 first:pt-0 last:pb-0 space-y-3 rounded-2xl transition-all ${!available ? 'bg-red-50/60 p-4 border border-red-200/90 shadow-2xs' : ''}`}>
                    {!available && (
                      <div className="flex items-center justify-between bg-red-100/90 text-red-900 px-3 py-1.5 rounded-lg border border-red-200 text-[11px] font-bold">
                        <span className="flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span>PRODUIT INDISPONIBLE • Ligne verrouillée</span>
                        </span>
                        <span className="text-[10px] text-red-700 font-normal hidden sm:inline">Veuillez supprimer cette ligne</span>
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                        <img 
                          src={getProductImageUrl(item.img)} 
                          alt={item.name} 
                          className={`w-full h-full object-contain p-1 ${!available ? 'grayscale opacity-60' : ''}`}
                          referrerPolicy="no-referrer" 
                          onError={handleImageError}
                        />
                      </div>
                      
                      <div className="flex-grow min-w-0">
                        <h3 className={`font-bold text-sm truncate ${!available ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{item.name}</h3>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className={`${!available ? 'text-gray-400' : 'text-[#FF6600]'} font-black text-sm font-mono`}>
                            {item.price.toLocaleString('fr-FR')} FCFA
                          </span>
                          <span className="text-[10px] text-gray-400">/ unité ({t('price_equipment_ht')})</span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono block">Poids unit. : {itemWeight} kg</span>
                      </div>

                      {/* Quantity Stepper (Disabled if item unavailable) */}
                      <div className={`flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200 shrink-0 ${!available ? 'opacity-30 pointer-events-none' : ''}`}>
                        <button 
                          onClick={() => item.id && updateQuantity(item.id, item.quantity - 1)}
                          disabled={!available}
                          className="p-1 hover:bg-white rounded text-gray-600 transition-colors disabled:cursor-not-allowed"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-bold text-xs w-6 text-center text-gray-900 font-mono">{item.quantity}</span>
                        <button 
                          onClick={() => item.id && updateQuantity(item.id, item.quantity + 1)}
                          disabled={!available}
                          className="p-1 hover:bg-white rounded text-gray-600 transition-colors disabled:cursor-not-allowed"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Delete Button (ALWAYS ENABLED even when item is unavailable) */}
                      <button 
                        onClick={() => item.id && removeItem(item.id)}
                        className={`p-2 rounded-xl border transition-all shrink-0 flex items-center gap-1.5 text-xs font-bold shadow-2xs cursor-pointer ${
                          !available 
                            ? 'bg-red-600 hover:bg-red-700 text-white border-red-700 shadow-md ring-2 ring-red-500/20' 
                            : 'text-gray-400 hover:text-red-500 hover:bg-red-50 border-transparent'
                        }`}
                        title="Supprimer du panier"
                      >
                        <Trash2 className="w-4 h-4" />
                        {!available && <span className="text-[11px] font-bold">Supprimer</span>}
                      </button>
                    </div>

                    {/* Per-item Freight Choice Options (Disabled if item unavailable) */}
                    <div className={`bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs ${!available ? 'opacity-30 pointer-events-none' : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-[#003366]" /> Mode de transport & fret :
                        </span>
                        <span className="text-[10px] font-mono text-gray-600 font-bold">
                          +{currentTotalFreight.toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={!available}
                          onClick={() => item.id && updateItemFreight(item.id, 'sea', seaUnitCost)}
                          className={`p-2 rounded-lg border text-left text-[11px] transition-all cursor-pointer ${
                            item.shippingMethod === 'sea'
                              ? 'bg-[#003366] text-white border-[#003366] font-bold'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <span className="block font-bold">Maritime Éco ({siteSettings.seaFreightDurationDays || '30 - 45 jours'})</span>
                          <span className={`text-[9px] block ${item.shippingMethod === 'sea' ? 'text-emerald-300' : 'text-gray-400'}`}>
                            +{(seaUnitCost * item.quantity).toLocaleString('fr-FR')} F
                          </span>
                        </button>

                        <button
                          type="button"
                          disabled={!available}
                          onClick={() => item.id && updateItemFreight(item.id, 'air', airUnitCost)}
                          className={`p-2 rounded-lg border text-left text-[11px] transition-all cursor-pointer ${
                            item.shippingMethod === 'air'
                              ? 'bg-[#003366] text-white border-[#003366] font-bold'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <span className="block font-bold">Aérien Express ({siteSettings.airFreightDurationDays || '5 - 10 jours'})</span>
                          <span className={`text-[9px] block ${item.shippingMethod === 'air' ? 'text-orange-300' : 'text-gray-400'}`}>
                            +{(airUnitCost * item.quantity).toLocaleString('fr-FR')} F
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Formulaire Coordonnées Client Sénégal (strictly B2B/Client side, never shared with supplier) */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800">
              Coordonnées de Facturation & Livraison (Sénégal)
            </h3>
            <p className="text-[11px] text-gray-500">
              Vos coordonnées restent strictement confidentielles au Sénégal. Elles ne sont jamais transmises aux usines ni aux fournisseurs.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Nom du Contact *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ex: Ibrahima Diallo"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Entreprise / Société (Optionnel)</label>
                <input
                  type="text"
                  value={customerCompany}
                  onChange={(e) => setCustomerCompany(e.target.value)}
                  placeholder="Ex: Sahel Industries SARL"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Téléphone Joignable (Wave / OM) *</label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Ex: +221 77 123 45 67"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Ville de Livraison au Sénégal</label>
                <select
                  value={customerCity}
                  onChange={(e) => setCustomerCity(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-orange-500"
                >
                  <option value="Dakar">Dakar (Plateau, Zone Ind, Yoff, Rufisque)</option>
                  <option value="Thiès">Thiès</option>
                  <option value="Saint-Louis">Saint-Louis</option>
                  <option value="Mbour">Mbour / Saly</option>
                  <option value="Kaolack">Kaolack</option>
                  <option value="Autre Région">Autre Région du Sénégal</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-gray-700 mb-1">Adresse ou Emplacement Chantier</label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Ex: Km 12 Route de Rufisque, Entrepôt B3"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Summary & Mandatory Ethical Contract (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 sticky top-24">
            <h2 className="text-base font-bold text-[#003366] mb-4">Total & Validation Juridique</h2>
            
            {/* Cost Breakdown */}
            <div className="space-y-3 pb-5 border-b border-gray-100 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>{t('subtotal_equipment_ht')} :</span>
                <span className="font-mono font-semibold">{equipmentTotal.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>{t('shipping_transit_dap')} :</span>
                <span className="font-mono font-semibold text-orange-600">
                  {dynamicFreightTotal === 0 ? '+0 FCFA (Ex-works)' : `+${dynamicFreightTotal.toLocaleString('fr-FR')} FCFA`}
                </span>
              </div>

              {/* Promo Code Discount line if applied */}
              {appliedPromo && promoDiscountAmount > 0 && (
                <div className="flex justify-between items-center text-emerald-600 font-bold bg-emerald-50 px-2 py-1.5 rounded-lg border border-emerald-200">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" />
                    Code promo ({appliedPromo.code}) :
                  </span>
                  <span className="font-mono">
                    -{promoDiscountAmount.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              )}

              <div className="flex justify-between text-gray-600">
                <span>{t('vat_senegal')} :</span>
                <span className="font-mono font-semibold text-gray-600">
                  {vatAmount > 0 ? `+${vatAmount.toLocaleString('fr-FR')} FCFA` : '0 FCFA (Exonéré de TVA)'}
                </span>
              </div>
              <div className="pt-3 border-t border-gray-200 flex justify-between items-baseline">
                <span className="font-extrabold text-[#003366] text-sm">{t('total_ttc')} :</span>
                <span className="text-2xl font-black text-[#FF6600] font-mono">
                  {grandTotalTTC.toLocaleString('fr-FR')} <span className="text-xs">FCFA</span>
                </span>
              </div>
            </div>

            {/* Promo Code Box */}
            <div className="my-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-[#003366] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-orange-500" />
                <span>Code Promo ou Réduction Panier</span>
              </label>

              {appliedPromo ? (
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg text-xs">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-mono font-bold text-emerald-900">{appliedPromo.code}</span>
                      <span className="text-[10px] text-emerald-700 block">
                        {appliedPromo.discountType === 'percent' ? `-${appliedPromo.discountValue}%` : `-${appliedPromo.discountValue.toLocaleString('fr-FR')} F`} appliqué
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemovePromoCode}
                    className="text-gray-400 hover:text-red-500 p-1 cursor-pointer transition-colors"
                    title="Retirer le code"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyPromoCode} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCodeInput}
                      onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                      placeholder="Ex: DAKAR2026"
                      className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs uppercase font-mono font-bold text-gray-800 focus:outline-none focus:border-orange-500"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-[#003366] hover:bg-[#002244] text-white rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer"
                    >
                      Appliquer
                    </button>
                  </div>

                  {promoError && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                      <span>{promoError}</span>
                    </div>
                  )}

                  {promoSuccess && (
                    <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-700 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                      <span>{promoSuccess}</span>
                    </div>
                  )}
                </form>
              )}
            </div>

            {/* Deposit Option if Expensive Product Present */}
            {hasDepositProduct && (
              <div className="my-4 p-3.5 bg-amber-50/80 rounded-xl border border-amber-200 text-xs">
                <span className="font-bold text-amber-900 block mb-2">Modalité de paiement de la commande :</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentChoice('full')}
                    className={`p-2 rounded-lg border text-left text-xs transition-all ${
                      paymentChoice === 'full'
                        ? 'bg-[#003366] text-white border-[#003366] font-bold'
                        : 'bg-white text-gray-700 border-gray-200'
                    }`}
                  >
                    <span className="block font-bold">100% Intégral</span>
                    <span className="text-[10px] block font-mono">{grandTotalTTC.toLocaleString('fr-FR')} F</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentChoice('deposit')}
                    className={`p-2 rounded-lg border text-left text-xs transition-all ${
                      paymentChoice === 'deposit'
                        ? 'bg-[#003366] text-white border-[#003366] font-bold'
                        : 'bg-white text-gray-700 border-gray-200'
                    }`}
                  >
                    <span className="block font-bold">Acompte {depositPct}%</span>
                    <span className="text-[10px] block font-mono text-orange-300 font-bold">{depositAmountTTC.toLocaleString('fr-FR')} F</span>
                  </button>
                </div>
                {paymentChoice === 'deposit' && (
                  <p className="text-[10px] text-amber-800 mt-2 italic">
                    Acompte de {depositAmountTTC.toLocaleString('fr-FR')} FCFA à payer maintenant. Le solde ({balanceAmountTTC.toLocaleString('fr-FR')} FCFA) sera dû à la livraison à Dakar.
                  </p>
                )}
              </div>
            )}

            {/* Choix Mode de Règlement */}
            <div className="my-5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Option de Règlement Sénégal
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(['Wave', 'Orange Money', 'Virement Proforma'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      paymentMethod === m 
                        ? 'border-[#FF6600] bg-orange-50 text-[#FF6600]' 
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* MANDATORY CONTRACT (Dynamic: Sourcing Mandate vs Local Direct Sale) */}
            <div className="p-4 bg-orange-50/80 border border-orange-200 rounded-2xl my-5 text-xs text-gray-800 space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-black text-orange-950 text-xs uppercase tracking-wider">
                    Contrat Éthique & Engagements Légal Sénégal
                  </h4>
                  <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                    Conformément à nos engagements de transparence et de déontologie commerciale, 
                    <strong> Zone Équipements Sénégal </strong> garantit la conformité technique, la traçabilité intégrale et le suivi douanier de vos matériels jusqu'à livraison sur site à Dakar ou en région.
                  </p>
                </div>
              </div>

              <label className="flex items-start gap-3 pt-2 border-t border-orange-200/60 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={contractAccepted}
                  onChange={(e) => setContractAccepted(e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-[#FF6600] rounded cursor-pointer shrink-0"
                />
                <span className="text-[11px] text-gray-900 font-semibold leading-snug">
                  J'ai lu et j'accepte expressément le contrat de mandat et les conditions de vente de Zone Équipements Sénégal. *
                </span>
              </label>

              <button 
                type="button"
                onClick={() => setShowContractModal(true)}
                className="text-[10px] text-orange-700 font-bold underline block text-right"
              >
                Lire l'intégralité du contrat éthique &rarr;
              </button>
            </div>

            {/* Boutons d'Action */}
            <div className="space-y-2.5">
              <button 
                type="button"
                onClick={(e) => { setOrderType('order'); handleCheckout(e); }}
                disabled={!contractAccepted || isSubmitting || hasUnavailableItems}
                className="w-full bg-[#FF6600] hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-600/30 text-xs uppercase tracking-wider cursor-pointer"
              >
                {hasUnavailableItems ? (
                  <>
                    <Lock className="w-4 h-4 text-white shrink-0" />
                    <span>Commande Bloquée (Articles Indisponibles)</span>
                  </>
                ) : isSubmitting ? (
                  'Traitement en cours...'
                ) : (
                  <>
                    {t('btn_validate_order')} ({payableNow.toLocaleString('fr-FR')} F)
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button 
                type="button"
                onClick={(e) => { setOrderType('quote'); handleCheckout(e); }}
                disabled={!contractAccepted || isSubmitting || hasUnavailableItems}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-orange-400" />
                {hasUnavailableItems ? 'Devis Proforma Indisponible' : t('btn_issue_proforma')}
              </button>
            </div>
            
            <p className="text-[10px] text-center text-gray-400 mt-4">
              Paiement sécurisé Wave, Orange Money et Virement bancaire. Conforme normes fiscales du Sénégal.
            </p>
          </div>
        </div>
      </div>

      {/* MODAL DU CONTRAT ÉTHIQUE COMPLET */}
      {showContractModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl p-6 sm:p-8 text-xs text-gray-800">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-orange-600" />
                <h3 className="text-sm font-black uppercase text-[#003366]">
                  Contrat de Mandat de Sourcing & Transparence Commerciale
                </h3>
              </div>
              <button onClick={() => setShowContractModal(false)} className="text-gray-400 hover:text-gray-900 font-bold text-base cursor-pointer">
                ✕
              </button>
            </div>

            <div className="space-y-4 my-6 text-gray-600 leading-relaxed">
              <p>
                <strong>Article 1 : Nature de la Convention</strong><br />
                La société Zone Équipements Sénégal SARL opère pour le compte de ses clients selon un mandat de représentation commerciale et de sourcing industriel international.
              </p>
              <p>
                <strong>Article 2 : Possession des Marchandises</strong><br />
                Le client reconnaît expressément avoir été averti que le matériel sélectionné n'est pas physiquement stocké dans les locaux de Dakar au moment de la commande. Zone Équipements Sénégal s'engage à commander le produit directement auprès du fabricant certifié dès validation du paiement ou bon de commande pro.
              </p>
              <p>
                <strong>Article 3 : Origine & Délais</strong><br />
                L'origine des équipements (Chine, Europe, Amérique) est rigoureusement spécifiée. Les délais moyens de transit DAP sont de 10 à 25 jours en aérien express et 35 à 55 jours en fret maritime.
              </p>
              <p>
                <strong>Article 4 : Tarification & TVA</strong><br />
                Les prix affichés comprennent le coût d'achat, le fret international, l'assurance de transit et la TVA sénégalaise en vigueur (18%). Aucun frais occulte ne sera réclamé.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => { setContractAccepted(true); setShowContractModal(false); }}
                className="px-6 py-2.5 bg-[#FF6600] text-white rounded-xl font-bold text-xs shadow-md cursor-pointer"
              >
                J'accepte ces conditions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  ShieldCheck, Lock, CheckCircle2, Copy, Check, Printer,
  Package, Truck, DollarSign, ExternalLink, AlertTriangle,
  Globe, Send, Clock, Building2, FileText, ChevronDown, ChevronUp,
  ZoomIn, X, MapPin, Phone, User, Warehouse
} from 'lucide-react';
import {
  catalogService,
  SupplierPortalToken,
  formatSupplierParcelLabel,
  formatWarehouseConsigneeLine,
  formatWarehouseFullAddress
} from '../services/catalogService';
import { extractSupplierPaymentLink, printHtmlDocument } from '../utils/printDocument';

export default function SupplierPortal() {
  const { token } = useParams<{ token: string }>();
  const [lang, setLang] = useState<'fr' | 'en'>('en');
  const [loading, setLoading] = useState(true);
  const [tokenData, setTokenData] = useState<SupplierPortalToken | null>(null);
  const [copiedMark, setCopiedMark] = useState(false);
  const [copiedItemIdx, setCopiedItemIdx] = useState<number | null>(null);
  const [expandedDescRows, setExpandedDescRows] = useState<Record<number, boolean>>({});
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Simple Form state (without Confirmed Amount or Supplier Notes)
  const [paymentInput, setPaymentInput] = useState('');
  const [estimatedLeadTime, setEstimatedLeadTime] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [responderName, setResponderName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [justSubmitted, setJustSubmitted] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadToken() {
      setLoading(true);
      if (!token) {
        setLoading(false);
        return;
      }
      const data = await catalogService.fetchSupplierTokenByCode(token);
      if (mounted) {
        setTokenData(data);
        if (data) {
          setResponderName(data.supplierName || '');
          const countryLower = (data.supplierCountry || '').toLowerCase();
          if (
            countryLower.includes('france') ||
            countryLower.includes('sénégal') ||
            countryLower.includes('senegal') ||
            countryLower.includes('belgique')
          ) {
            setLang('fr');
          } else {
            setLang('en');
          }
        }
        setLoading(false);
      }
    }
    loadToken();
    return () => {
      mounted = false;
    };
  }, [token]);

  const detectedPayment = useMemo(() => extractSupplierPaymentLink(paymentInput), [paymentInput]);
  const hasValidPaymentUrl = Boolean(
    detectedPayment.url && /^https?:\/\/[^\s"'<>]+\.[^\s"'<>]+/i.test(detectedPayment.url)
  );

  // Resolve Agent Warehouse (from token snapshot or supplier/default fallback)
  const effectiveWarehouse = useMemo(() => {
    if (!tokenData) return undefined;
    if (tokenData.agentWarehouse && tokenData.agentWarehouse.address) {
      return tokenData.agentWarehouse;
    }
    return catalogService.resolveSupplierAgentWarehouse(tokenData.supplierId, tokenData.supplierName);
  }, [tokenData]);

  const isStandardWarehouse = useMemo(() => {
    if (!effectiveWarehouse) return false;
    return effectiveWarehouse.identificationMode === 'standard_address' || !effectiveWarehouse.agentCode;
  }, [effectiveWarehouse]);

  const t = {
    fr: {
      badge: 'PORTAIL FOURNISSEUR SÉCURISÉ • LIEN À USAGE UNIQUE',
      title: 'Bon de Commande Officiel & Réponse Fournisseur',
      subtitle: 'Ce lien sécurisé est réservé à cette commande. Une fois votre lien de paiement transmis, cette page sera automatiquement verrouillée.',
      notFoundTitle: 'Lien de commande introuvable ou expiré',
      notFoundDesc: 'Veuillez vérifier l’adresse web transmise par ZONE ÉQUIPEMENTS ou demander un nouveau lien à usage unique.',
      lockedBannerTitle: 'Réponse Enregistrée — Lien à Usage Unique Verrouillé',
      lockedBannerDesc: 'Votre lien de paiement et vos informations ont été transmis avec succès au système central de ZONE ÉQUIPEMENTS. Ce lien ne peut plus être modifié.',
      revokedTitle: 'Ce lien à usage unique a été révoqué',
      revokedDesc: 'Un nouveau bon de commande a été émis ou ce lien a été annulé par l’acheteur.',
      buyer: 'Acheteur / Donneur d’ordre',
      supplier: 'Fournisseur Destinataire',
      warehouseTitleCode: 'ENTREPÔT D’AGENT & CODE DE MARQUAGE COLIS',
      warehouseTitleStandard: 'ENTREPÔT DE RÉCEPTION & COORDONNÉES DE LIVRAISON (STANDARD)',
      warehouseDescCode: 'À inscrire sur chaque carton et expédier à l’adresse de notre agent ci-dessous :',
      warehouseDescStandard: 'Expédiez la marchandise avec les coordonnées standard (Nom, Prénom, Adresse) ci-dessous :',
      copyMark: 'Copier Coordonnées & Marquage',
      copied: 'Copié !',
      itemsTitle: 'Articles Commandés',
      colItem: 'Désignation & Marque',
      colMode: 'Mode Fret',
      colParcelLabel: 'Étiquette Colis',
      colQty: 'Qté',
      colUnit: 'Prix Unitaire',
      colTotal: 'Total',
      totalOrder: 'MONTANT TOTAL DE LA COMMANDE',
      printPo: 'Imprimer / PDF Bon de Commande',
      formTitle: 'Confirmation Rapide & Lien de Paiement',
      formSubtitle: 'Collez votre lien de règlement (Alibaba Trade Assurance, PayPal, Stripe, Proforma URL) pour déclencher le paiement immédiat.',
      paymentLinkLabel: 'Lien de Paiement Obligatoire (ou Message contenant le lien) *',
      paymentLinkPlaceholder: 'Collez ici le lien https://... ou votre message contenant le lien de paiement',
      detectedBadge: 'Lien de paiement détecté :',
      missingLinkBadge: 'En attente d’un lien de paiement valide (https://...)',
      invalidLinkError: 'Veuillez coller un lien de paiement valide (https://...) pour confirmer la commande.',
      leadTimeLabel: 'Délai d’expédition confirmé',
      leadTimePlaceholder: 'Ex: En stock (Expédition sous 48h) / 5 jours',
      trackingLabel: 'Numéro de Suivi / Tracking (Optionnel si déjà prêt)',
      trackingPlaceholder: 'Ex: SF1428992819920 / DHL / Waybill...',
      submitBtn: 'Confirmer la Commande & Envoyer le Lien',
      submittingBtn: 'Transmission sécurisée en cours...',
      securityFoot: 'Dès confirmation, les données sont transmises en temps réel à ZONE ÉQUIPEMENTS et ce lien unique est verrouillé.',
      submittedPaymentLink: 'Lien de paiement transmis :',
      submittedLeadTime: 'Délai annoncé :',
      submittedTracking: 'N° de suivi :',
      submittedDate: 'Horodatage de validation :',
      showDesc: 'Voir description',
      hideDesc: 'Réduire',
      variantOnlyBadge: 'Variante sélectionnée',
      copyLabelBtn: 'Copier Étiquette',
      zoomImageTitle: 'Cliquer pour agrandir l’image'
    },
    en: {
      badge: 'SECURE SUPPLIER PORTAL • SINGLE-USE LINK',
      title: 'Official Purchase Order & Supplier Response',
      subtitle: 'This secure web address is valid for a single response. Once you submit your payment link, this page will be permanently locked.',
      notFoundTitle: 'Purchase Order Link Not Found or Expired',
      notFoundDesc: 'Please check the URL sent by ZONE ÉQUIPEMENTS or request a new single-use link from our procurement team.',
      lockedBannerTitle: 'Response Recorded — Single-Use Link Locked',
      lockedBannerDesc: 'Your payment link and order confirmation have been automatically synced with ZONE ÉQUIPEMENTS procurement system. This link is now closed.',
      revokedTitle: 'This Single-Use Link Has Been Revoked',
      revokedDesc: 'A newer purchase order link was generated or this request was cancelled by the buyer.',
      buyer: 'Buyer / Consignee',
      supplier: 'Supplier / Manufacturer',
      warehouseTitleCode: 'FORWARDING AGENT WAREHOUSE & MANDATORY SHIPPING MARK',
      warehouseTitleStandard: 'DELIVERY WAREHOUSE & STANDARD RECIPIENT ADDRESS',
      warehouseDescCode: 'Print the shipping mark on all cartons and deliver to our forwarding agent warehouse below:',
      warehouseDescStandard: 'Deliver the goods using the standard recipient details (First Name, Last Name, Address, Phone) below:',
      copyMark: 'Copy Address & Mark',
      copied: 'Copied!',
      itemsTitle: 'Ordered Items & Specifications',
      colItem: 'Item Description & Brand',
      colMode: 'Freight Mode',
      colParcelLabel: 'Carton Label',
      colQty: 'Qty',
      colUnit: 'Unit Price',
      colTotal: 'Total',
      totalOrder: 'TOTAL PURCHASE ORDER AMOUNT',
      printPo: 'Print / Save PO (A4 / PDF)',
      formTitle: 'Quick Order Confirmation & Payment Link',
      formSubtitle: 'Paste your payment link (Alibaba Trade Assurance, PayPal, Stripe, Wise, or Proforma URL) to trigger immediate payment.',
      paymentLinkLabel: 'Mandatory Payment Link (or Message containing the URL) *',
      paymentLinkPlaceholder: 'Paste https://tradeassurance.alibaba.com/... or your payment message containing the URL here',
      detectedBadge: 'Payment URL detected:',
      missingLinkBadge: 'Waiting for a valid payment link (https://...)',
      invalidLinkError: 'Please include a valid payment link (https://...) to confirm the order.',
      leadTimeLabel: 'Confirmed Dispatch / Lead Time',
      leadTimePlaceholder: 'e.g. In stock (Ship within 48h) / 5 business days',
      trackingLabel: 'Tracking Number / Waybill (Optional if ready)',
      trackingPlaceholder: 'e.g. SF Express / DHL / Waybill number...',
      submitBtn: 'Confirm Order & Submit Payment Link',
      submittingBtn: 'Transmitting to Zone Équipements...',
      securityFoot: 'Upon confirmation, our procurement dashboard is notified immediately and this single-use form is locked.',
      submittedPaymentLink: 'Submitted Payment Link:',
      submittedLeadTime: 'Confirmed Lead Time:',
      submittedTracking: 'Tracking Number:',
      submittedDate: 'Submission Timestamp:',
      showDesc: 'Show details',
      hideDesc: 'Hide details',
      variantOnlyBadge: 'Selected Variant',
      copyLabelBtn: 'Copy Label',
      zoomImageTitle: 'Click to enlarge product image'
    }
  }[lang];

  // Clean parcel label helper that NEVER outputs [object Object] or undefined
  const getCleanItemParcelLabel = (item: any): string => {
    const fCode = item.freightCode || (item.shippingMethod === 'sea' ? 'SEA' : 'AIR');
    const validOrderRefs = Array.isArray(item.orderRefs)
      ? item.orderRefs.filter((r: any) => typeof r === 'string' && r.trim() && !r.includes('undefined') && !r.includes('[object'))
      : [];
    const validTokenOrders = Array.isArray(tokenData?.orderNumbers)
      ? tokenData!.orderNumbers.filter((r: any) => typeof r === 'string' && r.trim() && !r.includes('undefined') && !r.includes('[object'))
      : [];
    const rawOrderRef =
      (typeof item.orderNumber === 'string' && !item.orderNumber.includes('undefined') && !item.orderNumber.includes('[object')
        ? item.orderNumber
        : '') ||
      validOrderRefs[0] ||
      validTokenOrders[0] ||
      tokenData?.poRef ||
      tokenData?.poReference ||
      'PO-ZE';

    // Check if existing item.parcelLabel is already clean and free of [object Object] / undefined
    if (
      typeof item.parcelLabel === 'string' &&
      item.parcelLabel.trim() !== '' &&
      !item.parcelLabel.includes('[object') &&
      !item.parcelLabel.includes('undefined') &&
      !item.parcelLabel.includes('null')
    ) {
      return item.parcelLabel;
    }

    return formatSupplierParcelLabel(
      effectiveWarehouse?.agentCode || tokenData?.agentCode || 'DKR628',
      fCode,
      rawOrderRef,
      effectiveWarehouse
    );
  };

  // Resolve item display info: clean title, variant (if chosen), description (only variant if chosen), and thumbnail image
  const resolveItemDisplay = (item: any) => {
    const prod = item.productId ? catalogService.getProductById(Number(item.productId)) : undefined;

    // Extract bracketed variant name if embedded in item.name (e.g. "Produit X [Variante Y]")
    const bracketMatch = typeof item.name === 'string' ? item.name.match(/^(.*?)\s*\[([^\]]+)\]\s*$/) : null;
    const baseTitle = bracketMatch ? bracketMatch[1].trim() : (item.name || prod?.name || 'Article');
    const chosenVariantName = (item.variantName || (bracketMatch ? bracketMatch[2] : '') || '').trim();

    const matchedVariant = prod?.variants?.find(
      (v: any) =>
        typeof v === 'object' &&
        v !== null &&
        ((item.variantId && v.id === item.variantId) ||
          (chosenVariantName && v.name && v.name.toLowerCase() === chosenVariantName.toLowerCase()))
    ) as any;

    const thumbnailUrl = item.image || matchedVariant?.image || prod?.image || '';

    // CRITICAL REQUIREMENT: If a variant is chosen, ONLY that variant must be described on the note!
    let noteDescription = '';
    if (chosenVariantName) {
      const varDesc = (item.variantDescription || matchedVariant?.description || '').trim();
      noteDescription = varDesc && varDesc.toLowerCase() !== chosenVariantName.toLowerCase()
        ? `${chosenVariantName} — ${varDesc}`
        : chosenVariantName;
    } else {
      noteDescription = (item.description || prod?.description || '').trim();
    }

    return {
      baseTitle,
      chosenVariantName,
      noteDescription,
      thumbnailUrl,
      brand: item.brand || prod?.brand || 'Certifié'
    };
  };

  const toggleDescRow = (idx: number) => {
    setExpandedDescRows(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleCopyMark = () => {
    if (!tokenData) return;
    let text = '';
    if (effectiveWarehouse) {
      const consignee = formatWarehouseConsigneeLine(effectiveWarehouse);
      const addr = formatWarehouseFullAddress(effectiveWarehouse);
      text = [
        isStandardWarehouse
          ? `DESTINATAIRE : ${consignee}`
          : `[CODE AGENT: ${effectiveWarehouse.agentCode || tokenData.agentCode}] — ${consignee}`,
        effectiveWarehouse.phone ? `TÉL : ${effectiveWarehouse.phone}` : '',
        `ADRESSE : ${addr}`,
        `PO REF : ${tokenData.poRef}`,
        effectiveWarehouse.notes ? `NOTE : ${effectiveWarehouse.notes}` : ''
      ]
        .filter(Boolean)
        .join('\n');
    } else {
      const cleanAgent =
        typeof tokenData.agentCode === 'string' && !tokenData.agentCode.includes('[object')
          ? tokenData.agentCode
          : 'DKR628';
      text = `[CODE AGENT: ${cleanAgent}] - ZONE EQUIPEMENTS DAKAR MRO (PO: ${tokenData.poRef})`;
    }
    navigator.clipboard.writeText(text);
    setCopiedMark(true);
    setTimeout(() => setCopiedMark(false), 3000);
  };

  const handlePrintPo = () => {
    if (!tokenData) return;
    const rowsHtml = tokenData.items
      .map((it, idx) => {
        const fCode = it.freightCode || (it.shippingMethod === 'sea' ? 'SEA' : 'AIR');
        const label = getCleanItemParcelLabel(it);
        const info = resolveItemDisplay(it);
        return `
      <tr>
        <td>${idx + 1}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            ${info.thumbnailUrl ? `<img src="${info.thumbnailUrl}" alt="" style="width:36px;height:36px;object-fit:cover;border-radius:6px;border:1px solid #cbd5e1;" />` : ''}
            <div>
              <strong>${info.baseTitle}</strong> (${info.brand})
              ${info.chosenVariantName ? `<br/><span style="font-size:11px;font-weight:700;color:#ea580c;">Variante : ${info. noteDescription}</span>` : info.noteDescription ? `<br/><span style="font-size:10px;color:#475569;">${info.noteDescription}</span>` : ''}
              <br/><span style="font-family:monospace;font-size:10px;font-weight:800;color:#0f172a;">📌 ÉTIQUETTE: ${label}</span>
            </div>
          </div>
        </td>
        <td class="text-center font-mono font-bold" style="color:${fCode === 'SEA' ? '#0284c7' : '#ea580c'};">
          ${fCode}
        </td>
        <td class="text-center font-mono font-bold">x${it.quantity}</td>
        <td class="text-right font-mono">${it.supplierPrice.toLocaleString('fr-FR')} ${it.currency}</td>
        <td class="text-right font-mono font-bold">${it.total.toLocaleString('fr-FR')} ${it.currency}</td>
      </tr>`;
      })
      .join('');

    const whBlockHtml = effectiveWarehouse
      ? `
        <div style="margin-top:6px;padding-top:6px;border-top:1px dashed #cbd5e1;">
          <div><strong>Entrepôt de Livraison / Consignee :</strong> ${formatWarehouseConsigneeLine(effectiveWarehouse)}</div>
          <div><strong>Adresse :</strong> ${formatWarehouseFullAddress(effectiveWarehouse)} ${effectiveWarehouse.phone ? `• <strong>Tél :</strong> ${effectiveWarehouse.phone}` : ''}</div>
          ${effectiveWarehouse.notes ? `<div style="font-size:11px;color:#475569;"><strong>Instructions :</strong> ${effectiveWarehouse.notes}</div>` : ''}
        </div>
      `
      : `<div style="margin-top:4px;font-weight:800;color:#ea580c;">MANDATORY SHIPPING MARK: ${tokenData.agentCode} (PO: ${tokenData.poRef})</div>`;

    const bodyHtml = `
      <div class="header">
        <div>
          <div class="brand"><span class="brand-blue">ZONE</span> <span class="brand-orange">ÉQUIPEMENTS</span></div>
          <div style="margin-top:4px;font-weight:700;">OFFICIAL PURCHASE ORDER / BON DE COMMANDE FOURNISSEUR</div>
          <div style="color:#475569;font-size:11px;">Dakar, Sénégal • Email: zoneequipements@gmail.com • WhatsApp: +221 76 653 83 84</div>
        </div>
        <div class="text-right">
          <span class="badge">${tokenData.poRef}</span>
          <div style="margin-top:6px;font-weight:700;">Date: ${new Date(tokenData.createdAt).toLocaleDateString('fr-FR')}</div>
          <div class="font-mono" style="font-size:11px;color:#ea580c;font-weight:800;">
            ${effectiveWarehouse ? formatWarehouseConsigneeLine(effectiveWarehouse) : tokenData.agentCode}
          </div>
        </div>
      </div>
      <div class="card">
        <div><strong>Supplier:</strong> ${tokenData.supplierName} (${tokenData.supplierPlatform || 'International'})</div>
        ${whBlockHtml}
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Désignation, Variante & Étiquette Colis</th>
            <th class="text-center">Fret</th>
            <th class="text-center">Qté</th>
            <th class="text-right">Prix Unitaire</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <div style="display:flex;justify-content:flex-end;margin-top:14px;">
        <div style="width:280px;border:2px solid #0f172a;border-radius:8px;padding:12px;background:#f8fafc;">
          <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:900;">
            <span>TOTAL PO:</span>
            <span class="font-mono" style="color:#ea580c;">${tokenData.totalAmount.toLocaleString('fr-FR')} ${tokenData.currency}</span>
          </div>
        </div>
      </div>
    `;

    printHtmlDocument(`Purchase Order ${tokenData.poRef}`, tokenData.poRef, bodyHtml);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenData || !token) return;
    setErrorMsg('');

    if (!hasValidPaymentUrl || !detectedPayment.url) {
      setErrorMsg(t.invalidLinkError);
      return;
    }

    const finalLink = detectedPayment.url;

    setSubmitting(true);
    try {
      const res = await catalogService.submitSupplierPortalResponse(token, {
        paymentLink: finalLink,
        platformLabel: detectedPayment.platformLabel,
        estimatedLeadTime,
        trackingNumber,
        responderName
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Error');
        if (res.tokenData) setTokenData(res.tokenData);
      } else if (res.tokenData) {
        setTokenData(res.tokenData);
        setJustSubmitted(true);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Submission error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center mx-auto animate-pulse">
            <ShieldCheck className="w-6 h-6 text-[#FF6600]" />
          </div>
          <p className="text-sm font-bold text-slate-300 font-mono">Loading Secure Purchase Order...</p>
        </div>
      </div>
    );
  }

  if (!tokenData) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-black text-white">{t.notFoundTitle}</h1>
          <p className="text-xs text-slate-400 leading-relaxed">{t.notFoundDesc}</p>
          <div className="pt-2 text-[11px] font-mono text-slate-500">
            ZONE ÉQUIPEMENTS • DAKAR, SÉNÉGAL • +221 76 653 83 84
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Brand & Language Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF6600] to-amber-600 flex items-center justify-center text-white font-black shadow-md">
              ZE
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black tracking-tight text-base sm:text-lg text-white">ZONE ÉQUIPEMENTS</span>
                <span className="bg-[#FF6600] text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded">MRO B2B</span>
              </div>
              <span className="text-[11px] text-slate-400 block">
                Dakar, Sénégal • International Procurement & Sourcing
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintPo}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-orange-400" />
              <span>{t.printPo}</span>
            </button>

            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
              <Globe className="w-3.5 h-3.5 text-orange-400 ml-2 mr-1" />
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                  lang === 'en' ? 'bg-[#FF6600] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang('fr')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                  lang === 'fr' ? 'bg-[#FF6600] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                FR
              </button>
            </div>
          </div>
        </div>

        {/* Security Status Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-[#FF6600] text-[11px] font-extrabold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              {t.badge}
            </span>
            <span className="text-xs font-mono font-bold text-slate-400">
              ID: {tokenData.token} • PO: <strong className="text-white">{tokenData.poRef}</strong>
            </span>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">{t.title}</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">{t.subtitle}</p>
          </div>

          {/* Buyer & Supplier Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80 text-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-orange-400" />
                {t.buyer}
              </span>
              <p className="font-bold text-white text-sm">ZONE ÉQUIPEMENTS SÉNÉGAL</p>
              <p className="text-slate-400">Km 4, Boulevard du Centenaire, Dakar, Sénégal</p>
              <p className="text-slate-400 font-mono">WhatsApp: +221 76 653 83 84 • zoneequipements@gmail.com</p>
            </div>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80 text-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-blue-400" />
                {t.supplier}
              </span>
              <p className="font-bold text-white text-sm">{tokenData.supplierName}</p>
              <p className="text-slate-400">
                Platform: <strong>{tokenData.supplierPlatform || 'Alibaba'}</strong> • Country: <strong>{tokenData.supplierCountry || 'International'}</strong>
              </p>
              <p className="text-slate-400">
                Date: <span className="font-mono">{new Date(tokenData.createdAt).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US')}</span>
              </p>
            </div>
          </div>

          {/* Agent Warehouse & Shipping Mark / Standard Coordinates Box */}
          <div className="p-4 bg-orange-950/30 border-2 border-[#FF6600]/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="text-xs font-black uppercase tracking-wider text-[#FF6600] flex items-center gap-1.5">
                <Warehouse className="w-4 h-4" />
                {isStandardWarehouse ? t.warehouseTitleStandard : t.warehouseTitleCode}
              </div>
              <p className="text-xs text-slate-300">
                {isStandardWarehouse ? t.warehouseDescStandard : t.warehouseDescCode}
              </p>

              {effectiveWarehouse ? (
                <div className="mt-2 p-3 bg-slate-950 border border-orange-500/40 rounded-xl space-y-1 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-white text-sm flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#FF6600]" />
                      {formatWarehouseConsigneeLine(effectiveWarehouse)}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 font-mono text-[11px] font-bold">
                      PO: {tokenData.poRef}
                    </span>
                  </div>
                  <div className="text-slate-300 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                    <span>{formatWarehouseFullAddress(effectiveWarehouse)}</span>
                  </div>
                  {effectiveWarehouse.phone && (
                    <div className="text-slate-300 flex items-center gap-1.5 font-mono">
                      <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{effectiveWarehouse.phone}</span>
                    </div>
                  )}
                  {effectiveWarehouse.notes && (
                    <div className="text-[11px] text-amber-300/90 italic pt-1 border-t border-slate-800">
                      {effectiveWarehouse.notes}
                    </div>
                  )}
                </div>
              ) : (
                <div className="inline-block mt-1 px-3 py-1.5 bg-slate-950 border border-orange-500/40 rounded-xl font-mono text-sm font-black text-white">
                  [CODE AGENT: {typeof tokenData.agentCode === 'string' && !tokenData.agentCode.includes('[object') ? tokenData.agentCode : 'DKR628'}] - DAKAR MRO (PO: {tokenData.poRef})
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleCopyMark}
              className="px-4 py-2.5 bg-[#FF6600] hover:bg-orange-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 self-start sm:self-center shadow-lg cursor-pointer"
            >
              {copiedMark ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedMark ? t.copied : t.copyMark}</span>
            </button>
          </div>
        </div>

        {/* Ordered Items Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-400" />
              {t.itemsTitle} ({tokenData.items.length})
            </h2>
            <span className="text-xs font-mono text-slate-400">
              Currency: <strong className="text-orange-400">{tokenData.currency}</strong>
            </span>
          </div>

          <div className="overflow-x-auto bg-slate-950 rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-4">{t.colItem}</th>
                  <th className="py-3 px-3 text-center">{t.colMode}</th>
                  <th className="py-3 px-4">{t.colParcelLabel}</th>
                  <th className="py-3 px-3 text-center">{t.colQty}</th>
                  <th className="py-3 px-3 text-right">{t.colUnit}</th>
                  <th className="py-3 px-4 text-right">{t.colTotal}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {tokenData.items.map((item, idx) => {
                  const fCode = item.freightCode || (item.shippingMethod === 'sea' ? 'SEA' : 'AIR');
                  const itemLabel = getCleanItemParcelLabel(item);
                  const info = resolveItemDisplay(item);
                  const isExpanded = Boolean(expandedDescRows[idx]);
                  const hasLongDesc = info.noteDescription.length > 70;

                  return (
                    <tr key={idx} className="hover:bg-slate-900/40 align-top">
                      <td className="py-3.5 px-3 text-slate-500">{idx + 1}</td>

                      {/* Simplified Désignation & Marque + Product Thumbnail + Variant Only or Collapsible Description */}
                      <td className="py-3.5 px-4 font-sans min-w-[240px] max-w-md">
                        <div className="flex items-start gap-3">
                          {/* Product Miniature Thumbnail */}
                          {info.thumbnailUrl ? (
                            <button
                              type="button"
                              onClick={() => setPreviewImage({ url: info.thumbnailUrl, title: info.baseTitle })}
                              title={t.zoomImageTitle}
                              className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-700 hover:border-[#FF6600] shrink-0 group cursor-pointer bg-slate-900"
                            >
                              <img
                                src={info.thumbnailUrl}
                                alt={info.baseTitle}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                              />
                              <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <ZoomIn className="w-4 h-4 text-white" />
                              </span>
                            </button>
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 text-slate-600">
                              <Package className="w-5 h-5" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1 space-y-1">
                            <span className="font-bold text-white block text-xs sm:text-sm leading-snug">
                              {info.baseTitle}
                            </span>
                            <span className="text-[11px] text-slate-400 block">{info.brand}</span>

                            {/* If a variant is chosen, ONLY describe the chosen variant */}
                            {info.chosenVariantName ? (
                              <div className="pt-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/20 border border-orange-500/40 text-orange-300 text-[11px] font-bold">
                                  {t.variantOnlyBadge} : {info.chosenVariantName}
                                </span>
                                {info.noteDescription && info.noteDescription !== info.chosenVariantName && (
                                  <div className="mt-1 text-[11px] text-slate-300 leading-relaxed">
                                    {hasLongDesc && !isExpanded
                                      ? `${info.noteDescription.slice(0, 70)}...`
                                      : info.noteDescription}
                                    {hasLongDesc && (
                                      <button
                                        type="button"
                                        onClick={() => toggleDescRow(idx)}
                                        className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-bold text-[#FF6600] hover:underline cursor-pointer"
                                      >
                                        {isExpanded ? (
                                          <>{t.hideDesc} <ChevronUp className="w-3 h-3" /></>
                                        ) : (
                                          <>{t.showDesc} <ChevronDown className="w-3 h-3" /></>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              /* If no variant is chosen, collapsible product description */
                              info.noteDescription && (
                                <div className="pt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => toggleDescRow(idx)}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-[#FF6600] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <span>{isExpanded ? t.hideDesc : t.showDesc}</span>
                                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  </button>
                                  {isExpanded && (
                                    <p className="mt-1.5 text-[11px] text-slate-300 bg-slate-900/90 border border-slate-800 rounded-lg p-2 leading-relaxed">
                                      {info.noteDescription}
                                    </p>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Freight Mode Badge */}
                      <td className="py-3.5 px-3 text-center font-sans">
                        <span
                          className={`inline-flex flex-col items-center px-2.5 py-1 rounded-lg text-[10px] font-black border ${
                            fCode === 'SEA'
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                              : 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                          }`}
                        >
                          <span>{fCode === 'SEA' ? '🚢 SEA' : '✈️ AIR'}</span>
                          {!isStandardWarehouse && (
                            <span className="font-mono text-[9px] opacity-90">
                              {(effectiveWarehouse?.agentCode || 'DKR628')}+{fCode}
                            </span>
                          )}
                        </span>
                      </td>

                      {/* Clean Parcel Label + Copy Button */}
                      <td className="py-3.5 px-4 font-sans">
                        <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <code className="text-[11px] text-amber-300 font-mono font-bold break-all">
                            {itemLabel}
                          </code>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(itemLabel);
                              setCopiedItemIdx(idx);
                              setTimeout(() => setCopiedItemIdx(null), 2000);
                            }}
                            className="px-2.5 py-1.5 bg-[#FF6600] hover:bg-orange-500 text-white rounded-lg text-[10px] font-bold inline-flex items-center justify-center gap-1 shrink-0 cursor-pointer shadow-sm transition-colors"
                          >
                            {copiedItemIdx === idx ? (
                              <>
                                <Check className="w-3 h-3" /> {t.copied}
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" /> {t.copyLabelBtn}
                              </>
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center font-black text-orange-400 text-sm">x{item.quantity}</td>
                      <td className="py-3.5 px-3 text-right text-slate-300 whitespace-nowrap">
                        {item.supplierPrice.toLocaleString('fr-FR')} {item.currency}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-white whitespace-nowrap">
                        {item.total.toLocaleString('fr-FR')} {item.currency}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3.5 flex items-center gap-6">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">{t.totalOrder} :</span>
              <span className="text-lg sm:text-xl font-black font-mono text-[#FF6600]">
                {tokenData.totalAmount.toLocaleString('fr-FR')} {tokenData.currency}
              </span>
            </div>
          </div>
        </div>

        {/* SIMPLIFIED ONE-TIME RESPONSE SECTION */}
        {tokenData.status === 'active' ? (
          <form
            onSubmit={handleSubmit}
            className="bg-slate-900 border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5"
          >
            <div className="border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-extrabold uppercase tracking-wider mb-1">
                <DollarSign className="w-4 h-4" />
                <span>DIRECT SUPPLIER CONFIRMATION</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">{t.formTitle}</h2>
              <p className="text-xs text-slate-400 mt-1">{t.formSubtitle}</p>
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-rose-950/60 border border-rose-700/60 rounded-xl text-xs text-rose-300 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Payment Link Field */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <label className="text-xs font-bold text-white">{t.paymentLinkLabel}</label>
                  {hasValidPaymentUrl ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
                      ✓ {t.detectedBadge} {detectedPayment.platformLabel}
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                      ⚠ {t.missingLinkBadge}
                    </span>
                  )}
                </div>
                <textarea
                  rows={3}
                  required
                  value={paymentInput}
                  onChange={e => {
                    setPaymentInput(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder={t.paymentLinkPlaceholder}
                  className={`w-full bg-slate-950 border rounded-xl p-3.5 text-xs sm:text-sm text-white font-mono focus:outline-none ${
                    hasValidPaymentUrl
                      ? 'border-emerald-500/60 focus:border-emerald-400'
                      : 'border-slate-700 focus:border-[#FF6600]'
                  }`}
                />
                {hasValidPaymentUrl && (
                  <p className="text-[11px] text-emerald-400 font-mono mt-1.5 break-all">
                    URL : {detectedPayment.url}
                  </p>
                )}
              </div>

              {/* Simple 2-column row: Lead time & optional tracking */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">{t.leadTimeLabel}</label>
                  <input
                    type="text"
                    value={estimatedLeadTime}
                    onChange={e => setEstimatedLeadTime(e.target.value)}
                    placeholder={t.leadTimePlaceholder}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-[#FF6600] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">{t.trackingLabel}</label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={e => setTrackingNumber(e.target.value)}
                    placeholder={t.trackingPlaceholder}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-mono focus:border-[#FF6600] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-[11px] text-slate-400 flex items-center gap-2 max-w-lg">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{t.securityFoot}</span>
              </p>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-xl shadow-emerald-900/40 cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? t.submittingBtn : t.submitBtn}</span>
              </button>
            </div>
          </form>
        ) : tokenData.status === 'used' ? (
          <div className="bg-emerald-950/30 border-2 border-emerald-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                {justSubmitted ? <CheckCircle2 className="w-7 h-7" /> : <Lock className="w-6 h-6" />}
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider mb-1">
                  <Lock className="w-3 h-3" /> SINGLE-USE TOKEN LOCKED
                </span>
                <h2 className="text-lg sm:text-xl font-black text-white">{t.lockedBannerTitle}</h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">{t.lockedBannerDesc}</p>
              </div>
            </div>

            {tokenData.response && (
              <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-800">
                  <span className="text-slate-400">{t.submittedPaymentLink}</span>
                  <a
                    href={tokenData.response.paymentLink}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono font-bold text-orange-400 hover:underline flex items-center gap-1 break-all"
                  >
                    <span>{tokenData.response.paymentLink}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                </div>

                {tokenData.response.estimatedLeadTime && (
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">{t.submittedLeadTime}</span>
                    <span className="font-bold text-white">{tokenData.response.estimatedLeadTime}</span>
                  </div>
                )}

                {tokenData.response.trackingNumber && (
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">{t.submittedTracking}</span>
                    <span className="font-mono font-bold text-blue-400">{tokenData.response.trackingNumber}</span>
                  </div>
                )}

                <div className="flex justify-between pt-1 text-[11px] text-slate-500">
                  <span>{t.submittedDate}</span>
                  <span className="font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(tokenData.response.submittedAt).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US')}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-rose-950/30 border border-rose-500/40 rounded-3xl p-6 text-center space-y-2">
            <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
            <h2 className="text-base font-bold text-white">{t.revokedTitle}</h2>
            <p className="text-xs text-slate-400">{t.revokedDesc}</p>
          </div>
        )}
      </div>

      {/* Product Image Lightbox Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white truncate pr-4">{previewImage.title}</h3>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-slate-950 flex items-center justify-center">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[70vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Printer, Copy, Check, Send, Mail, Building2, Package,
  CheckCircle2, DollarSign, ExternalLink, Plus, Link as LinkIcon, ShieldCheck, Lock, ShoppingCart, Tag
} from 'lucide-react';
import {
  Supplier,
  Order,
  SupplierPortalToken,
  AgentWarehouse,
  catalogService,
  getClientWarehouseCode,
  getItemFreightCode,
  formatSupplierParcelLabel,
  formatWarehouseConsigneeLine,
  formatWarehouseFullAddress
} from '../../services/catalogService';
import { printHtmlDocument, extractSupplierPaymentLink } from '../../utils/printDocument';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  orders: Order[];
  onOrderUpdated?: () => void;
}

export const PurchaseOrderModal: React.FC<Props> = ({
  isOpen,
  onClose,
  supplier,
  orders,
  onOrderUpdated
}) => {
  const [copied, setCopied] = useState(false);
  const [paymentLinkInput, setPaymentLinkInput] = useState('');
  const [selectedOrderIdForLink, setSelectedOrderIdForLink] = useState<string>('ALL');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editableMessage, setEditableMessage] = useState('');
  const [manualItems, setManualItems] = useState<Array<{
    name: string;
    brand: string;
    quantity: number;
    supplierPrice: number;
    currency: string;
  }>>([]);
  const [selectedCatalogProductId, setSelectedCatalogProductId] = useState<string>('');
  const [manualQty, setManualQty] = useState<number>(1);
  const [generatedToken, setGeneratedToken] = useState<SupplierPortalToken | null>(null);
  const [copiedPortalUrl, setCopiedPortalUrl] = useState(false);
  const [copiedLabelKey, setCopiedLabelKey] = useState<string | null>(null);

  const allProducts = useMemo(() => catalogService.getProducts(), [isOpen]);
  const supplierTokens = useMemo(
    () => (supplier ? catalogService.getSupplierTokens(supplier.id) : []),
    [supplier, orders, isOpen, generatedToken]
  );

  // Produits rattachés à ce fournisseur dans le catalogue
  const supplierCatalogProducts = useMemo(() => {
    if (!supplier) return [];
    return allProducts.filter(
      p =>
        p.supplierId === supplier.id ||
        (p.supplierName && p.supplierName.toLowerCase().trim() === supplier.name.toLowerCase().trim())
    );
  }, [allProducts, supplier]);

  // Filtrer les commandes actives contenant des articles de ce fournisseur (ou rattachées à ce fournisseur)
  const supplierOrders = useMemo(() => {
    if (!supplier) return [];
    const supNameLower = supplier.name.toLowerCase().trim();
    return orders.filter(o => {
      if (o.status === 'Annulée') return false;
      if (o.supplierId === supplier.id) return true;
      if (o.supplierName && o.supplierName.toLowerCase().trim() === supNameLower) return true;
      const hasMatchingItem = (o.items || []).some(it => {
        if (it.supplierId === supplier.id) return true;
        if (it.supplierName && it.supplierName.toLowerCase().trim() === supNameLower) return true;
        const prod = allProducts.find(p => Number(p.id) === Number(it.productId));
        return (
          prod?.supplierId === supplier.id ||
          Boolean(prod?.supplierName && prod.supplierName.toLowerCase().trim() === supNameLower)
        );
      });
      return hasMatchingItem || !o.supplierId;
    });
  }, [orders, supplier, allProducts]);

  const poNumber = useMemo(() => {
    if (!supplier) return 'PO-ZE';
    const prefix = supplier.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'SUPP';
    return `PO-${prefix}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
  }, [supplier]);

  const hasSeaItems = useMemo(() => {
    return supplierOrders.some(
      o => o.items?.some(it => it.shippingMethod === 'sea') || (o.agentCode && o.agentCode.includes('SEA'))
    );
  }, [supplierOrders]);

  const effectiveWarehouse = useMemo<AgentWarehouse | undefined>(() => {
    if (!supplier) return catalogService.getDefaultAgentWarehouse();
    return catalogService.resolveSupplierAgentWarehouse(supplier.id, supplier.name);
  }, [supplier, isOpen]);

  const isStandardWarehouse = Boolean(
    effectiveWarehouse && (effectiveWarehouse.identificationMode === 'standard_address' || !effectiveWarehouse.agentCode)
  );

  const agentCode = useMemo(() => {
    if (effectiveWarehouse) {
      if (isStandardWarehouse) {
        return [effectiveWarehouse.firstName, effectiveWarehouse.lastName].filter(Boolean).join(' ').trim() || effectiveWarehouse.name;
      }
      return `${effectiveWarehouse.agentCode || 'DKR628'}+${hasSeaItems ? 'SEA' : 'AIR'}`;
    }
    return hasSeaItems ? 'DKR628+SEA' : 'DKR628+AIR';
  }, [effectiveWarehouse, isStandardWarehouse, hasSeaItems]);

  // Consolider les articles à commander avec Code Fret (AIR/SEA), miniature, variante, et étiquette propre
  const consolidatedItems = useMemo(() => {
    if (!supplier) return [];
    const list: Array<{
      productId?: number;
      name: string;
      brand: string;
      ref?: string;
      productUrl?: string;
      image?: string;
      description?: string;
      variantId?: string;
      variantName?: string;
      variantDescription?: string;
      quantity: number;
      supplierPrice: number;
      currency: string;
      total: number;
      shippingMethod: 'air' | 'sea' | 'none';
      freightCode: 'AIR' | 'SEA';
      orderRefs: string[];
      clientWarehouseIds: string[];
      parcelLabels: string[];
    }> = [];

    const supNameLower = supplier.name.toLowerCase().trim();

    supplierOrders.forEach(order => {
      const clientWhId = getClientWarehouseCode(order);
      (order.items || []).forEach(item => {
        const prod = allProducts.find(p => Number(p.id) === Number(item.productId));
        const belongsToSupplier =
          order.supplierId === supplier.id ||
          item.supplierId === supplier.id ||
          (item.supplierName && item.supplierName.toLowerCase().trim() === supNameLower) ||
          prod?.supplierId === supplier.id ||
          (prod?.supplierName && prod.supplierName.toLowerCase().trim() === supNameLower) ||
          !order.supplierId;

        if (!belongsToSupplier) return;

        const sPrice =
          item.supplierPrice !== undefined && item.supplierPrice > 0
            ? item.supplierPrice
            : prod?.supplierPrice && prod.supplierPrice > 0
            ? prod.supplierPrice
            : Math.round((item.price * 0.55) / 610);
        const curr = item.supplierCurrency || prod?.supplierCurrency || supplier.currency || 'USD';
        const fCode = getItemFreightCode(item.shippingMethod, order.agentCode);
        const shipMethod: 'air' | 'sea' = fCode === 'SEA' ? 'sea' : 'air';
        const parcelLabel = formatSupplierParcelLabel(
          effectiveWarehouse?.agentCode || agentCode,
          fCode,
          order.orderNumber,
          effectiveWarehouse
        );
        const pUrl = item.supplierProductUrl || prod?.supplierProductUrl || supplier.websiteUrl || '';

        const bracketMatch = typeof item.name === 'string' ? item.name.match(/\[([^\]]+)\]\s*$/) : null;
        const vName = item.variantName || (bracketMatch ? bracketMatch[1] : undefined);
        const matchedVariant = prod?.variants?.find(
          (v: any) =>
            typeof v === 'object' &&
            v !== null &&
            ((item.variantId && v.id === item.variantId) || (vName && v.name && v.name.toLowerCase() === vName.toLowerCase()))
        ) as any;

        const existing = list.find(ci => ci.name === item.name && ci.freightCode === fCode);
        if (existing) {
          existing.quantity += item.quantity;
          existing.total += sPrice * item.quantity;
          if (!existing.orderRefs.includes(order.orderNumber)) {
            existing.orderRefs.push(order.orderNumber);
          }
          if (!existing.clientWarehouseIds.includes(clientWhId)) {
            existing.clientWarehouseIds.push(clientWhId);
          }
          if (!existing.parcelLabels.includes(parcelLabel)) {
            existing.parcelLabels.push(parcelLabel);
          }
          if (!existing.productUrl && pUrl) {
            existing.productUrl = pUrl;
          }
        } else {
          list.push({
            productId: item.productId || prod?.id,
            name: item.name,
            brand: item.brand || prod?.brand || 'Constructeur Certifié',
            productUrl: pUrl,
            image: item.image || matchedVariant?.image || prod?.image,
            description: item.description || prod?.description,
            variantId: item.variantId || matchedVariant?.id,
            variantName: vName,
            variantDescription: item.variantDescription || matchedVariant?.description || vName,
            quantity: item.quantity,
            supplierPrice: sPrice,
            currency: curr,
            total: sPrice * item.quantity,
            shippingMethod: shipMethod,
            freightCode: fCode,
            orderRefs: [order.orderNumber],
            clientWarehouseIds: [clientWhId],
            parcelLabels: [parcelLabel]
          });
        }
      });
    });

    manualItems.forEach(m => {
      const fCode: 'AIR' | 'SEA' = hasSeaItems ? 'SEA' : 'AIR';
      const stockLabel = formatSupplierParcelLabel(
        effectiveWarehouse?.agentCode || agentCode,
        fCode,
        'APPRO-STOCK',
        effectiveWarehouse
      );
      const existing = list.find(ci => ci.name === m.name && ci.freightCode === fCode);
      if (existing) {
        existing.quantity += m.quantity;
        existing.total += m.supplierPrice * m.quantity;
        if (!existing.orderRefs.includes('APPRO-STOCK')) {
          existing.orderRefs.push('APPRO-STOCK');
        }
        if (!existing.clientWarehouseIds.includes('CLI-STOCK')) {
          existing.clientWarehouseIds.push('CLI-STOCK');
        }
        if (!existing.parcelLabels.includes(stockLabel)) {
          existing.parcelLabels.push(stockLabel);
        }
      } else {
        list.push({
          name: m.name,
          brand: m.brand,
          quantity: m.quantity,
          supplierPrice: m.supplierPrice,
          currency: m.currency,
          total: m.supplierPrice * m.quantity,
          shippingMethod: fCode === 'SEA' ? 'sea' : 'air',
          freightCode: fCode,
          orderRefs: ['APPRO-STOCK'],
          clientWarehouseIds: ['CLI-STOCK'],
          parcelLabels: [stockLabel]
        });
      }
    });

    return list;
  }, [supplier, supplierOrders, allProducts, manualItems, hasSeaItems, effectiveWarehouse, agentCode]);

  const totalSupplierCost = useMemo(
    () => consolidatedItems.reduce((sum, item) => sum + item.total, 0),
    [consolidatedItems]
  );

  const defaultRawText = useMemo(() => {
    if (!supplier) return '';
    const whConsignee = effectiveWarehouse ? formatWarehouseConsigneeLine(effectiveWarehouse) : `ZONE ÉQUIPEMENTS (${agentCode})`;
    const whAddr = effectiveWarehouse ? formatWarehouseFullAddress(effectiveWarehouse) : `Transit Hub Export (${supplier.country}) -> Port/Aéroport de DAKAR`;
    const whPhone = effectiveWarehouse?.phone ? `\nTéléphone Réception : ${effectiveWarehouse.phone}` : '';

    return `*COMMANDE D'ACHAT GROUPÉE / CONSOLIDATED PURCHASE ORDER*
Référence Bon : ${poNumber}
Fournisseur : ${supplier.name} (${supplier.platform})
Date : ${new Date().toLocaleDateString('fr-FR')}

*ADRESSE D'ENTREPÔT DE LIVRAISON & MARQUAGE COLIS :*
Entrepôt : ${effectiveWarehouse?.name || 'Entrepôt Agent'}
Destinataire : ${whConsignee}${whPhone}
Adresse : ${whAddr}
${isStandardWarehouse ? `Mode : Livraison Standard (Nom, Prénom & Adresse)` : `Marquage Colis Requis : [CODE AGENT: ${agentCode}]`}

*DÉTAIL DES ARTICLES COMMANDÉS :*
${
  consolidatedItems.length > 0
    ? consolidatedItems
        .map(
          (it, idx) =>
            `${idx + 1}. [FRET: ${it.freightCode}] [Qté: x${it.quantity}] ${it.name} (${it.brand}) - P.U: ${it.supplierPrice} ${it.currency}${it.variantName ? `\n   🔹 Variante choisie : ${it.variantDescription || it.variantName}` : ''}\n   👉 ÉTIQUETTE COLIS : ${it.parcelLabels.join(' / ')}`
        )
        .join('\n')
    : 'Aucun article sélectionné'
}

*MONTANT TOTAL :* ${totalSupplierCost.toLocaleString('fr-FR')} ${supplier.currency}
Conditions convenues : ${supplier.paymentTerms || 'Paiement sécurisé proforma / Trade Assurance'}

ZONE ÉQUIPEMENTS
Email : zoneequipements@gmail.com
WhatsApp : +221 76 653 83 84
Km 4, Boulevard du Centenaire, Dakar, Sénégal`;
  }, [supplier, poNumber, agentCode, consolidatedItems, totalSupplierCost, effectiveWarehouse, isStandardWarehouse]);

  useEffect(() => {
    setEditableMessage(defaultRawText);
  }, [defaultRawText]);

  useEffect(() => {
    if (!isOpen) {
      setManualItems([]);
      setPaymentLinkInput('');
      setSelectedOrderIdForLink('ALL');
      setGeneratedToken(null);
    }
  }, [isOpen]);

  const handleGenerateOneTimePortalLink = (autoDispatchViaDefinedChannel = false) => {
    if (!supplier) return;
    const tokenObj = catalogService.createSupplierPortalToken({
      poRef: poNumber,
      supplier,
      agentCode,
      agentWarehouse: effectiveWarehouse,
      orderIds: supplierOrders.map(o => o.id),
      orderNumbers: supplierOrders.map(o => o.orderNumber),
      items: consolidatedItems.map(it => ({
        productId: it.productId,
        name: it.name,
        brand: it.brand,
        image: it.image,
        description: it.description,
        variantId: it.variantId,
        variantName: it.variantName,
        variantDescription: it.variantDescription,
        quantity: it.quantity,
        supplierPrice: it.supplierPrice,
        currency: it.currency,
        total: it.total,
        shippingMethod: it.shippingMethod,
        freightCode: it.freightCode,
        orderRefs: it.orderRefs,
        clientWarehouseIds: it.clientWarehouseIds,
        parcelLabel: it.parcelLabels.join(' / '),
        supplierProductUrl: it.productUrl
      })),
      totalAmount: totalSupplierCost
    });
    setGeneratedToken(tokenObj);
    const portalUrl = `${window.location.origin}/supplier-po/${tokenObj.token}`;
    const portalBlock = `\n\n*LIEN SÉCURISÉ À USAGE UNIQUE (ONE-TIME SUPPLIER RESPONSE LINK) :*\nMerci de cliquer sur ce lien unique pour confirmer la commande et déposer votre lien de paiement (se verrouille après votre réponse) :\n${portalUrl}`;
    const updatedMessage = editableMessage.includes('/supplier-po/')
      ? editableMessage
      : `${editableMessage}${portalBlock}`;
    setEditableMessage(updatedMessage);
    navigator.clipboard.writeText(updatedMessage);
    setCopiedPortalUrl(true);
    setTimeout(() => setCopiedPortalUrl(false), 3500);
    if (onOrderUpdated) onOrderUpdated();

    if (autoDispatchViaDefinedChannel) {
      const ch = supplier.communicationChannel || 'whatsapp';
      supplierOrders.forEach(o => {
        if (!o.supplierPoStatus || o.supplierPoStatus === 'Non transmis') {
          catalogService.updateOrderSupplierPo(o.id, 'PO Envoyé');
        }
      });
      if (ch === 'email') {
        const subject = encodeURIComponent(`Bon de Commande Officiel ${poNumber} - ZONE ÉQUIPEMENTS`);
        window.location.href = `mailto:${supplier.contactEmail || ''}?subject=${subject}&body=${encodeURIComponent(updatedMessage)}`;
      } else if (ch === 'whatsapp') {
        const cleanPhone = (supplier.contactPhone || '').replace(/[^0-9]/g, '');
        const waLink = cleanPhone
          ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(updatedMessage)}`
          : `https://wa.me/?text=${encodeURIComponent(updatedMessage)}`;
        window.open(waLink, '_blank', 'noopener,noreferrer');
      } else {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    }
  };

  // Détection en temps réel d'un lien dans le champ collé
  const detectedPaymentLink = useMemo(
    () => extractSupplierPaymentLink(paymentLinkInput),
    [paymentLinkInput]
  );

  if (!isOpen || !supplier) return null;

  const markOrdersPoSent = () => {
    supplierOrders.forEach(o => {
      if (!o.supplierPoStatus || o.supplierPoStatus === 'Non transmis') {
        catalogService.updateOrderSupplierPo(o.id, 'PO Envoyé');
      }
    });
    if (onOrderUpdated) onOrderUpdated();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editableMessage);
    setCopied(true);
    markOrdersPoSent();
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePrint = () => {
    const rowsHtml =
      consolidatedItems.length > 0
        ? consolidatedItems
            .map(
              (it, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>
            <strong>${it.name}</strong> (${it.brand})<br/>
            <span style="color:#0f172a;font-family:monospace;font-size:10px;font-weight:700;">📌 ÉTIQUETTE COLIS : ${it.parcelLabels.join(' / ')}</span>
          </td>
          <td class="text-center font-mono font-bold" style="color:${it.freightCode === 'SEA' ? '#0284c7' : '#ea580c'};">
            ${it.freightCode}${!isStandardWarehouse ? `<br/><span style="font-size:9px;">${effectiveWarehouse?.agentCode || 'DKR628'}+${it.freightCode}</span>` : ''}
          </td>
          <td class="text-center font-mono font-bold">x${it.quantity}</td>
          <td class="text-right font-mono">${it.supplierPrice.toLocaleString('fr-FR')} ${it.currency}</td>
          <td class="text-right font-mono font-bold">${it.total.toLocaleString('fr-FR')} ${it.currency}</td>
        </tr>`
            )
            .join('')
        : `<tr><td colspan="6" class="text-center">Aucun article rattaché</td></tr>`;

    const bodyHtml = `
      <div class="header">
        <div>
          <div class="brand"><span class="brand-blue">ZONE</span> <span class="brand-orange">ÉQUIPEMENTS</span></div>
          <div style="margin-top:4px;font-weight:700;">BON DE COMMANDE FOURNISSEUR (PURCHASE ORDER)</div>
          <div style="color:#475569;font-size:11px;">Km 4, Boulevard du Centenaire, Dakar, Sénégal • NINEA: 008921822</div>
        </div>
        <div class="text-right">
          <span class="badge">${poNumber}</span>
          <div style="margin-top:6px;font-weight:700;">Date : ${new Date().toLocaleDateString('fr-FR')}</div>
          <div class="font-mono" style="font-size:11px;color:#ea580c;font-weight:800;">Code Agent : ${agentCode}</div>
        </div>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;">
          <div>
            <div style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:700;">Fournisseur Destinataire</div>
            <div style="font-size:14px;font-weight:800;">${supplier.name} (${supplier.platform})</div>
            <div>Pays : ${supplier.country} • Tél/WhatsApp : ${supplier.contactPhone || 'N/A'} • Email : ${supplier.contactEmail || 'N/A'}</div>
          </div>
          <div class="text-right">
            <div style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:700;">Instructions d'Expédition & Entrepôt</div>
            <div style="font-weight:800;color:#0f172a;">${isStandardWarehouse ? `Destinataire Standard : ${agentCode}` : `Marquage Colis : [CODE AGENT: ${agentCode}]`}</div>
            <div>Conditions : ${supplier.paymentTerms || 'Trade Assurance / Proforma'} • Délai : ${supplier.leadTimeAvg || '7-14 jours'}</div>
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Désignation & Étiquette Colis</th>
            <th class="text-center">Code Fret</th>
            <th class="text-center">Qté</th>
            <th class="text-right">P.U Achat</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div style="display:flex;justify-content:flex-end;margin-top:12px;">
        <div style="width:280px;border:2px solid #0f172a;border-radius:8px;padding:12px;background:#f8fafc;">
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;">
            <span>Frais livraison entrepôt :</span>
            <span class="font-mono font-bold">${supplier.warehouseDeliveryFeeUSD || 25} USD</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:900;border-top:1px solid #cbd5e1;padding-top:6px;">
            <span>TOTAL COMMANDE :</span>
            <span class="font-mono" style="color:#ea580c;">${totalSupplierCost.toLocaleString('fr-FR')} ${supplier.currency}</span>
          </div>
        </div>
      </div>
    `;

    printHtmlDocument(`Bon de Commande ${poNumber} - ${supplier.name}`, poNumber, bodyHtml);
  };

  const handleAddCatalogProductToPo = () => {
    if (!selectedCatalogProductId) return;
    const prod = allProducts.find(p => String(p.id) === selectedCatalogProductId);
    if (!prod) return;
    const sPrice =
      prod.supplierPrice && prod.supplierPrice > 0
        ? prod.supplierPrice
        : Math.round((prod.price * 0.55) / 610);
    setManualItems(prev => [
      ...prev,
      {
        name: prod.name,
        brand: prod.brand || 'Constructeur Certifié',
        quantity: Math.max(1, manualQty),
        supplierPrice: sPrice,
        currency: prod.supplierCurrency || supplier.currency || 'USD'
      }
    ]);
    setSelectedCatalogProductId('');
    setManualQty(1);
  };

  const cleanPhone = (supplier.contactPhone || '').replace(/[^0-9]/g, '');
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(editableMessage)}`
    : `https://wa.me/221766538384?text=${encodeURIComponent(editableMessage)}`;

  const emailUrl = supplier.contactEmail
    ? `mailto:${supplier.contactEmail}?subject=${encodeURIComponent(`[PURCHASE ORDER] ${poNumber} - Agent ${agentCode}`)}&body=${encodeURIComponent(editableMessage)}`
    : `mailto:zoneequipements@gmail.com?subject=${encodeURIComponent(`[PURCHASE ORDER] ${poNumber}`)}&body=${encodeURIComponent(editableMessage)}`;

  const handleSavePaymentLink = (e: React.FormEvent) => {
    e.preventDefault();
    const finalUrl = detectedPaymentLink.url || paymentLinkInput.trim();
    if (!finalUrl) return;

    if (selectedOrderIdForLink === 'ALL') {
      supplierOrders.forEach(o => {
        catalogService.updateOrderSupplierPo(o.id, 'Lien paiement reçu', finalUrl);
      });
    } else {
      catalogService.updateOrderSupplierPo(selectedOrderIdForLink, 'Lien paiement reçu', finalUrl);
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    setPaymentLinkInput('');
    if (onOrderUpdated) onOrderUpdated();
  };

  const ordersWithLinks = supplierOrders.filter(o => Boolean(o.supplierPaymentLink));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl p-6 shadow-2xl relative max-h-[94vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800 pr-8">
          <div>
            <span className="text-xs font-mono font-bold text-[#FF6600] uppercase tracking-wider block mb-1">
              {poNumber}
            </span>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-orange-500" />
              Bon de Commande Fournisseur Groupé (PO)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Fournisseur ciblé : <strong className="text-slate-200">{supplier.name}</strong> ({supplier.country} - {supplier.platform})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copié !' : 'Copier'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 bg-[#FF6600] hover:bg-orange-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer / PDF A4</span>
            </button>
          </div>
        </div>

        {/* Summary Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Entrepôt de Réception</span>
            <span className="text-xs font-bold text-slate-200">
              {effectiveWarehouse ? `${effectiveWarehouse.name} (${effectiveWarehouse.city || effectiveWarehouse.country})` : (supplier.country === 'Chine' ? 'Transit Hub Yiwu / Guangzhou' : 'Transit Hub International -> Dakar')}
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Délai Moyen Estimé</span>
            <span className="text-xs font-bold text-emerald-400">
              {supplier.leadTimeAvg || '7 à 14 jours'}
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Approvisionnement</span>
            <span className="text-sm font-bold font-mono text-orange-400">
              {totalSupplierCost.toLocaleString('fr-FR')} {supplier.currency}
            </span>
          </div>
        </div>

        {/* Ajout d'un produit du catalogue au Bon de Commande si besoin */}
        {allProducts.length > 0 && (
          <div className="my-3 p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-300">
              Ajouter un article du catalogue à ce PO :
            </span>
            <select
              value={selectedCatalogProductId}
              onChange={e => setSelectedCatalogProductId(e.target.value)}
              className="flex-1 min-w-[200px] bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
            >
              <option value="">
                Sélectionner un produit ({supplierCatalogProducts.length > 0 ? `${supplierCatalogProducts.length} de ce fournisseur` : 'Catalogue complet'})...
              </option>
              {(supplierCatalogProducts.length > 0 ? supplierCatalogProducts : allProducts).map(p => (
                <option key={p.id} value={String(p.id)}>
                  {p.name} — {p.supplierPrice || Math.round((p.price * 0.55) / 610)} {p.supplierCurrency || 'USD'}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              value={manualQty}
              onChange={e => setManualQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white font-mono text-center"
              title="Quantité"
            />
            <button
              type="button"
              onClick={handleAddCatalogProductToPo}
              disabled={!selectedCatalogProductId}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-orange-400 rounded-lg text-xs font-bold flex items-center gap-1 border border-slate-700 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Ajouter au PO
            </button>
          </div>
        )}

        {/* Consolidated Items Table */}
        <div className="my-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-blue-400" />
              Articles Commandés Groupés ({consolidatedItems.length})
            </h4>
            <span className="text-[11px] text-slate-400">
              Dossiers clients rattachés : {supplierOrders.length}
            </span>
          </div>

          <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Désignation & Marque</th>
                  <th className="py-2.5 px-3 text-center">Moyen de Fret</th>
                  <th className="py-2.5 px-3">Étiquette Colis</th>
                  <th className="py-2.5 px-3 text-center">Quantité</th>
                  <th className="py-2.5 px-3 text-right">P.U</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {consolidatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500 font-sans">
                      Aucune commande client active pour ce fournisseur. Vous pouvez ajouter un article ci-dessus pour générer un bon d'approvisionnement.
                    </td>
                  </tr>
                ) : (
                  consolidatedItems.map((item, i) => {
                    const labelStr = item.parcelLabels.join(' / ');
                    const copyId = `po-lbl-${i}`;
                    return (
                      <tr key={i} className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-3 font-sans text-white font-medium">
                          <div>{item.name}</div>
                          <span className="text-[10px] text-slate-400">{item.brand}</span>
                          {item.productUrl && (
                            <div className="mt-1">
                              <a
                                href={item.productUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-orange-500/15 hover:bg-orange-500/30 text-orange-300 text-[10px] font-bold"
                              >
                                <ShoppingCart className="w-2.5 h-2.5" /> Ouvrir Fiche / Panier ({supplier.platform})
                              </a>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-sans">
                          <span className={`inline-flex flex-col items-center px-2.5 py-1 rounded-lg text-[10px] font-black border ${
                            item.freightCode === 'SEA'
                              ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                              : 'bg-orange-500/15 text-orange-300 border-orange-500/30'
                          }`}>
                            <span>{item.freightCode === 'SEA' ? '🚢 SEA' : '✈️ AIR'}</span>
                            {!isStandardWarehouse && (
                              <span className="font-mono text-[9px] opacity-90">{effectiveWarehouse?.agentCode || 'DKR628'}+{item.freightCode}</span>
                            )}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          <div className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                            <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono">
                              <span className="text-white font-bold">{item.orderRefs.join(', ')}</span>
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                                {item.clientWarehouseIds.join(', ')}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-1.5">
                              <code className="text-[10px] text-amber-300 font-mono truncate max-w-[200px]" title={labelStr}>
                                {labelStr}
                              </code>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(labelStr);
                                  setCopiedLabelKey(copyId);
                                  setTimeout(() => setCopiedLabelKey(null), 2000);
                                }}
                                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                                title="Copier l'étiquette colis ou la note vendeur AliExpress"
                              >
                                {copiedLabelKey === copyId ? (
                                  <><Check className="w-2.5 h-2.5 text-emerald-400" /> Copié</>
                                ) : (
                                  <><Tag className="w-2.5 h-2.5 text-orange-400" /> Copier Étiquette</>
                                )}
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-orange-400">x{item.quantity}</td>
                        <td className="py-2.5 px-3 text-right text-slate-300">{item.supplierPrice.toLocaleString('fr-FR')} {item.currency}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-white">{item.total.toLocaleString('fr-FR')} {item.currency}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Directe: Envoi WhatsApp, Email ou Copie Direct Chat au Fournisseur */}
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider block">
              Transmission au Fournisseur & Consignes d'Expédition
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-500/20 text-[#FF6600] font-bold">
              {isStandardWarehouse ? `Destinataire : ${agentCode}` : `Code Agent Actif : ${agentCode}`}
            </span>
          </div>

          {/* Générateur d'adresse web sécurisée à usage unique */}
          <div className="p-3.5 bg-slate-900/90 border border-orange-500/30 rounded-xl space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-orange-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Adresse Web Sécurisée à Usage Unique (Portail de Réponse Fournisseur)
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Canal défini sur la fiche fournisseur :{' '}
                  <strong className="text-white">
                    {supplier.communicationChannel === 'email'
                      ? `✉️ Email (${supplier.contactEmail || 'non renseigné'})`
                      : supplier.communicationChannel === 'direct_chat'
                        ? '💬 Chat Alibaba / Messagerie Directe'
                        : `📱 WhatsApp Direct (${supplier.contactPhone || 'non renseigné'})`}
                  </strong>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleGenerateOneTimePortalLink(false)}
                  disabled={consolidatedItems.length === 0}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
                  <span>Générer Lien Unique</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerateOneTimePortalLink(true)}
                  disabled={consolidatedItems.length === 0}
                  className="px-3.5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-40 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    Générer & Envoyer via{' '}
                    {supplier.communicationChannel === 'email'
                      ? 'Email'
                      : supplier.communicationChannel === 'direct_chat'
                        ? 'Chat Alibaba'
                        : 'WhatsApp'}
                  </span>
                </button>
              </div>
            </div>

            {generatedToken && (
              <div className="p-2.5 bg-slate-950 border border-emerald-500/40 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                    {copiedPortalUrl ? '✓ Lien copié & inséré au message' : 'Actif (1 seule utilisation)'}
                  </span>
                  <span className="font-mono text-white truncate">
                    {`${window.location.origin}/supplier-po/${generatedToken.token}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/supplier-po/${generatedToken.token}`;
                      navigator.clipboard.writeText(url);
                      setCopiedPortalUrl(true);
                      setTimeout(() => setCopiedPortalUrl(false), 2500);
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-bold cursor-pointer"
                  >
                    Copier URL
                  </button>
                  <a
                    href={`/supplier-po/${generatedToken.token}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 bg-orange-600/20 hover:bg-orange-600 text-orange-300 hover:text-white border border-orange-500/30 rounded text-[11px] font-bold flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> Tester / Voir Page
                  </a>
                </div>
              </div>
            )}

            {supplierTokens.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Historique des Liens Uniques de ce Fournisseur ({supplierTokens.length}) :
                </span>
                {supplierTokens.slice(0, 3).map(tk => (
                  <div
                    key={tk.token}
                    className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-950 rounded-lg border border-slate-800 text-[11px]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-200">{tk.token}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                        tk.status === 'used'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : tk.status === 'active'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {tk.status === 'used' ? (
                          <><Lock className="w-2.5 h-2.5" /> Répondu & Verrouillé</>
                        ) : tk.status === 'active' ? (
                          'En attente réponse fournisseur'
                        ) : (
                          'Révoqué'
                        )}
                      </span>
                      {tk.response?.confirmedAmount && (
                        <span className="font-mono text-emerald-400 font-bold">
                          Confirmé: {tk.response.confirmedAmount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`/supplier-po/${tk.token}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold flex items-center gap-1"
                      >
                        <ExternalLink className="w-2.5 h-2.5" /> Page
                      </a>
                      {tk.response?.paymentLink && (
                        <a
                          href={tk.response.paymentLink}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-0.5 bg-orange-600 hover:bg-orange-500 text-white rounded text-[10px] font-bold flex items-center gap-1"
                        >
                          Payer Fournisseur
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400">
            Message automatique pré-rempli avec les instructions d'expédition et les coordonnées de l'entrepôt (modifiable avant transmission) :
          </p>

          <textarea
            rows={5}
            value={editableMessage}
            onChange={(e) => setEditableMessage(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-[#FF6600]"
          />

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              onClick={markOrdersPoSent}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20"
            >
              <Send className="w-4 h-4" />
              Envoyer par WhatsApp ({supplier.contactPhone || 'Commercial'})
            </a>

            <a
              href={emailUrl}
              onClick={markOrdersPoSent}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20"
            >
              <Mail className="w-4 h-4" />
              Envoyer par Email ({supplier.contactEmail || 'Email'})
            </a>

            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 cursor-pointer"
            >
              <Copy className="w-4 h-4 text-orange-400" />
              {copied ? 'Message Copié !' : 'Copier pour Chat Alibaba/1688'}
            </button>
          </div>
        </div>

        {/* Section: Détection & Affichage des Liens de Paiement Reçus du Fournisseur */}
        <div className="mt-4 p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-orange-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Détection & Suivi du Lien de Paiement Fournisseur
              </h4>
            </div>
            {detectedPaymentLink.url && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ✓ Lien détecté : {detectedPaymentLink.platformLabel}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Collez directement le lien ou tout le message de réponse reçu de <strong>{supplier.name}</strong> (WhatsApp, Alibaba Trade Assurance, Email) : le système détecte et extrait automatiquement le lien de règlement.
          </p>

          <form onSubmit={handleSavePaymentLink} className="flex flex-col sm:flex-row gap-2">
            <select
              value={selectedOrderIdForLink}
              onChange={(e) => setSelectedOrderIdForLink(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="ALL">Appliquer à tous les dossiers ({supplierOrders.length})</option>
              {supplierOrders.map(o => (
                <option key={o.id} value={o.id}>
                  {o.orderNumber} - {o.customerCompany || o.customerName} ({o.totalTTC.toLocaleString('fr-FR')} F)
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Collez le message fournisseur ou le lien https://tradeassurance.alibaba.com/..."
              value={paymentLinkInput}
              onChange={(e) => setPaymentLinkInput(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-orange-500 outline-none"
            />

            <button
              type="submit"
              disabled={!detectedPaymentLink.url && !paymentLinkInput.trim()}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold shrink-0 shadow-md cursor-pointer"
            >
              Enregistrer Lien
            </button>
          </form>

          {saveSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Lien de règlement fournisseur détecté et enregistré sur le dossier.</span>
            </div>
          )}

          {/* Affichage des liens de paiement déjà enregistrés */}
          {ordersWithLinks.length > 0 && (
            <div className="pt-2 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Liens de Paiement Fournisseur Actifs ({ordersWithLinks.length}) :
              </span>
              {ordersWithLinks.map(ord => {
                const info = extractSupplierPaymentLink(ord.supplierPaymentLink || '');
                return (
                  <div
                    key={ord.id}
                    className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <LinkIcon className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      <span className="font-mono font-bold text-white">{ord.orderNumber}</span>
                      <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 text-[10px] font-bold">
                        {info.platformLabel}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ord.supplierPoStatus === 'Payé fournisseur'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {ord.supplierPoStatus || 'Lien paiement reçu'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={ord.supplierPaymentLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> Payer / Ouvrir Lien
                      </a>
                      {ord.supplierPoStatus !== 'Payé fournisseur' && (
                        <button
                          type="button"
                          onClick={() => {
                            catalogService.updateOrderSupplierPo(ord.id, 'Payé fournisseur');
                            if (onOrderUpdated) onOrderUpdated();
                          }}
                          className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          ✓ Marquer Payé
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 mt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

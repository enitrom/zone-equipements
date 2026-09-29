import React, { useState, useMemo } from 'react';
import {
  X, Send, Mail, Copy, Check, Printer, Building2, Package,
  CheckCircle2, ExternalLink, Calendar, Truck, DollarSign, Link as LinkIcon, ShieldCheck, Lock, ShoppingCart, Tag
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
  orders: Order[];
  suppliers: Supplier[];
  onOrdersUpdated: () => void;
  onNotify?: (msg: string) => void;
}

export const DailySupplierDispatchModal: React.FC<Props> = ({
  isOpen,
  onClose,
  orders,
  suppliers,
  onOrdersUpdated,
  onNotify
}) => {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<'pending' | 'active_all'>('active_all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedLabelKey, setCopiedLabelKey] = useState<string | null>(null);
  const [bulkStatusUpdated, setBulkStatusUpdated] = useState(false);
  const [paymentInputs, setPaymentInputs] = useState<Record<string, string>>({});
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [generatedTokensBySup, setGeneratedTokensBySup] = useState<Record<string, SupplierPortalToken>>({});

  const allProducts = useMemo(() => catalogService.getProducts(), [isOpen]);
  const allSupplierTokens = useMemo(() => catalogService.getSupplierTokens(), [orders, isOpen, generatedTokensBySup]);

  // Commandes actives selon le filtre d'étape choisi
  const targetOrders = useMemo(() => {
    return orders.filter(o => {
      if (o.status === 'Annulée' || o.status === 'Livrée') return false;
      if (stageFilter === 'pending') {
        return (
          o.status !== 'Reçue en entrepôt' &&
          o.status !== 'En transit' &&
          o.status !== 'Dédouanement' &&
          o.supplierPoStatus !== 'Payé fournisseur'
        );
      }
      return true;
    });
  }, [orders, stageFilter]);

  // Regrouper les articles strictement PAR FOURNISSEUR (avec Code Fret AIR/SEA, Entrepôt Agent et Étiquettes Colis propres)
  const supplierManifests = useMemo(() => {
    const map = new Map<string, {
      supplier: Supplier;
      agentWarehouse?: AgentWarehouse;
      orders: Order[];
      items: Array<{
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
        adminClientOwners: Array<{
          orderNumber: string;
          clientWarehouseId: string;
          customerName: string;
          customerPhone: string;
          freightCode: 'AIR' | 'SEA';
          parcelLabel: string;
        }>;
      }>;
      totalCost: number;
      currency: string;
      hasSea: boolean;
      hasAir: boolean;
      agentCode: string;
    }>();

    const defaultSupplier: Supplier = {
      id: 'unassigned',
      name: 'Fournisseur Partenaire Chine / International',
      country: 'Chine',
      platform: 'Alibaba',
      currency: 'USD',
      leadTimeAvg: '7-12 jours',
      paymentTerms: 'Trade Assurance / Proforma',
      contactPhone: '+221766538384',
      contactEmail: 'zoneequipements@gmail.com',
      warehouseDeliveryFeeUSD: 25,
      communicationChannel: 'whatsapp',
      shippingMinMaxUSD: '20-50 $',
      circuit: 'manuel'
    };

    targetOrders.forEach(order => {
      const clientWarehouseId = getClientWarehouseCode(order);

      (order.items || []).forEach(item => {
        const prod = allProducts.find(p => Number(p.id) === Number(item.productId));
        const candidateSupId = item.supplierId || prod?.supplierId || order.supplierId;
        const candidateSupName = (item.supplierName || prod?.supplierName || order.supplierName || '').toLowerCase().trim();

        const foundSup =
          suppliers.find(s => s.id === candidateSupId) ||
          (candidateSupName ? suppliers.find(s => s.name.toLowerCase().trim() === candidateSupName) : undefined) ||
          defaultSupplier;

        const supKey = foundSup.id;

        if (!map.has(supKey)) {
          const resolvedWh = catalogService.resolveSupplierAgentWarehouse(foundSup.id, foundSup.name);
          map.set(supKey, {
            supplier: foundSup,
            agentWarehouse: resolvedWh,
            orders: [],
            items: [],
            totalCost: 0,
            currency: foundSup.currency || 'USD',
            hasSea: false,
            hasAir: false,
            agentCode: resolvedWh?.agentCode ? `${resolvedWh.agentCode}+AIR` : 'DKR628+AIR'
          });
        }

        const group = map.get(supKey)!;
        if (!group.orders.some(o => o.id === order.id)) {
          group.orders.push(order);
        }

        const sPrice =
          item.supplierPrice !== undefined && item.supplierPrice > 0
            ? item.supplierPrice
            : prod?.supplierPrice && prod.supplierPrice > 0
            ? prod.supplierPrice
            : Math.round((item.price * 0.55) / 610);
        const curr = item.supplierCurrency || prod?.supplierCurrency || group.supplier.currency || 'USD';
        const freightCode = getItemFreightCode(item.shippingMethod, order.agentCode);
        const shipMode: 'air' | 'sea' = freightCode === 'SEA' ? 'sea' : 'air';
        if (freightCode === 'SEA') group.hasSea = true;
        else group.hasAir = true;

        const parcelLabel = formatSupplierParcelLabel(
          group.agentWarehouse?.agentCode || 'DKR628',
          freightCode,
          order.orderNumber,
          group.agentWarehouse
        );
        const prodUrl = prod?.supplierUrl || prod?.supplierLink || foundSup.websiteUrl || '';

        const bracketMatch = typeof item.name === 'string' ? item.name.match(/\[([^\]]+)\]\s*$/) : null;
        const vName = item.variantName || (bracketMatch ? bracketMatch[1] : undefined);
        const matchedVariant = prod?.variants?.find(
          (v: any) =>
            typeof v === 'object' &&
            v !== null &&
            ((item.variantId && v.id === item.variantId) || (vName && v.name && v.name.toLowerCase() === vName.toLowerCase()))
        ) as any;

        // On regroupe par (nom d'article + mode de fret AIR/SEA) pour que le fournisseur voie clairement le code AIR ou SEA de chaque ligne
        const existing = group.items.find(it => it.name === item.name && it.freightCode === freightCode);
        if (existing) {
          existing.quantity += item.quantity;
          existing.total += sPrice * item.quantity;
          if (!existing.orderRefs.includes(order.orderNumber)) {
            existing.orderRefs.push(order.orderNumber);
          }
          if (!existing.clientWarehouseIds.includes(clientWarehouseId)) {
            existing.clientWarehouseIds.push(clientWarehouseId);
          }
          if (!existing.parcelLabels.includes(parcelLabel)) {
            existing.parcelLabels.push(parcelLabel);
          }
          if (!existing.adminClientOwners.some(o => o.orderNumber === order.orderNumber)) {
            existing.adminClientOwners.push({
              orderNumber: order.orderNumber,
              clientWarehouseId,
              customerName: order.customerCompany || order.customerName,
              customerPhone: order.customerPhone,
              freightCode,
              parcelLabel
            });
          }
        } else {
          group.items.push({
            productId: item.productId || prod?.id,
            name: item.name,
            brand: item.brand || prod?.brand || 'Constructeur Certifié',
            ref: prod?.ref,
            productUrl: prodUrl,
            image: item.image || matchedVariant?.image || prod?.image,
            description: item.description || prod?.description,
            variantId: item.variantId || matchedVariant?.id,
            variantName: vName,
            variantDescription: item.variantDescription || matchedVariant?.description || vName,
            quantity: item.quantity,
            supplierPrice: sPrice,
            currency: curr,
            total: sPrice * item.quantity,
            shippingMethod: shipMode,
            freightCode,
            orderRefs: [order.orderNumber],
            clientWarehouseIds: [clientWarehouseId],
            parcelLabels: [parcelLabel],
            adminClientOwners: [{
              orderNumber: order.orderNumber,
              clientWarehouseId,
              customerName: order.customerCompany || order.customerName,
              customerPhone: order.customerPhone,
              freightCode,
              parcelLabel
            }]
          });
        }
      });
    });

    map.forEach(group => {
      group.totalCost = group.items.reduce((sum, it) => sum + it.total, 0);
      const wh = group.agentWarehouse;
      if (wh && (wh.identificationMode === 'standard_address' || !wh.agentCode)) {
        group.agentCode = [wh.firstName, wh.lastName].filter(Boolean).join(' ').trim() || wh.name;
      } else {
        const baseCode = wh?.agentCode || 'DKR628';
        group.agentCode = group.hasSea && !group.hasAir
          ? `${baseCode}+SEA`
          : group.hasSea && group.hasAir
          ? `${baseCode}+AIR/SEA`
          : `${baseCode}+AIR`;
      }
    });

    return Array.from(map.values());
  }, [targetOrders, suppliers, allProducts]);

  const filteredManifests = useMemo(() => {
    if (selectedSupplierId === 'all') return supplierManifests;
    return supplierManifests.filter(m => m.supplier.id === selectedSupplierId);
  }, [supplierManifests, selectedSupplierId]);

  if (!isOpen) return null;

  const todayStr = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Message destiné au fournisseur avec les coordonnées de son Entrepôt d'Agent (ou par défaut)
  const generateSupplierMessage = (manifest: typeof supplierManifests[0], customTokenCode?: string) => {
    const poRef = `PO-DAILY-${manifest.supplier.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'SUP'}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
    const existingActiveToken =
      customTokenCode ||
      generatedTokensBySup[manifest.supplier.id]?.token ||
      allSupplierTokens.find(tk => tk.supplierId === manifest.supplier.id && tk.status === 'active')?.token;
    const portalSection = existingActiveToken
      ? `\n*LIEN WEB SÉCURISÉ À USAGE UNIQUE (ONE-TIME SUPPLIER PORTAL) :*\nConsultez le détail des articles et soumettez votre lien de paiement sur cette page :\n${window.location.origin}/supplier-po/${existingActiveToken}\n`
      : '';

    const wh = manifest.agentWarehouse;
    const whConsignee = wh ? formatWarehouseConsigneeLine(wh) : `ZONE ÉQUIPEMENTS (${manifest.agentCode})`;
    const whAddr = wh ? formatWarehouseFullAddress(wh) : 'Entrepôt Transit Export';

    return `*COMMANDE QUOTIDIENNE FOURNISSEUR / DAILY PURCHASE ORDER*
Référence Bon : ${poRef}
Date : ${new Date().toLocaleDateString('fr-FR')}
Acheteur : ZONE ÉQUIPEMENTS (Entrepôt Dakar)
Fournisseur : ${manifest.supplier.name} (${manifest.supplier.platform || 'Alibaba'})

*ENTREPÔT DE LIVRAISON & COORDONNÉES :*
Entrepôt : ${wh?.name || 'Entrepôt Agent'}
Destinataire : ${whConsignee}
${wh?.phone ? `Téléphone : ${wh.phone}\n` : ''}Adresse : ${whAddr}

*LISTE DES ARTICLES & ÉTIQUETTES COLIS :*
${manifest.items.map((it, idx) => `${idx + 1}. [Qté: ${it.quantity}] ${it.name} (${it.brand})${it.variantName ? `\n   • Variante choisie : *${it.variantDescription || it.variantName}*` : ''}
   • CODE FRET : *${it.freightCode}* (${it.freightCode === 'SEA' ? 'Maritime / Bateau' : 'Aérien / Avion'})
   • ÉTIQUETTE À COLLER SUR COLIS : *[ ${it.parcelLabels.join(' || ')} ]*
   • Prix Unitaire : ${it.supplierPrice.toLocaleString('fr-FR')} ${it.currency} (Sous-total: ${it.total.toLocaleString('fr-FR')} ${it.currency})`).join('\n\n')}

*MONTANT TOTAL FOURNISSEUR :* ${manifest.totalCost.toLocaleString('fr-FR')} ${manifest.currency}
Conditions : ${manifest.supplier.paymentTerms || 'Trade Assurance / Facture Proforma'}
${portalSection}
Contact Réception Entrepôt :
Email : zoneequipements@gmail.com
WhatsApp : +221 76 653 83 84`;
  };

  // Génère la note vendeur courte à coller dans le panier AliExpress / Marketplace lors du checkout
  const generateCartSellerNote = (item: typeof supplierManifests[0]['items'][0]) => {
    return `SHIPPING MARK (Please print & paste on package): [ ${item.parcelLabels.join(' / ')} ] — FREIGHT CODE: ${item.freightCode}. Do NOT include any invoice inside the parcel. Thank you!`;
  };

  const handleCopySellerNote = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLabelKey(key);
    setTimeout(() => setCopiedLabelKey(null), 2500);
    if (onNotify) {
      onNotify(`Étiquette colis & Code Fret copiés : prêt à coller sur AliExpress / Chat vendeur !`);
    }
  };

  const handleCreateOneTimeLinkForManifest = (manifest: typeof supplierManifests[0], autoDispatchViaChannel = false) => {
    const poRef = `PO-DAILY-${manifest.supplier.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'SUP'}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
    const tokenObj = catalogService.createSupplierPortalToken({
      poRef,
      supplier: manifest.supplier,
      agentCode: manifest.agentCode,
      agentWarehouse: manifest.agentWarehouse,
      orderIds: manifest.orders.map(o => o.id),
      orderNumbers: manifest.orders.map(o => o.orderNumber),
      items: manifest.items.map(it => ({
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
      totalAmount: manifest.totalCost
    });
    setGeneratedTokensBySup(prev => ({ ...prev, [manifest.supplier.id]: tokenObj }));
    const fullMsg = generateSupplierMessage(manifest, tokenObj.token);
    navigator.clipboard.writeText(fullMsg);
    onOrdersUpdated();

    if (autoDispatchViaChannel) {
      const ch = manifest.supplier.communicationChannel || 'whatsapp';
      markPoSent(manifest);
      if (ch === 'email') {
        const subject = encodeURIComponent(`Bon de Commande ${poRef} [Fret AIR/SEA] - ZONE ÉQUIPEMENTS`);
        const mailLink = `mailto:${manifest.supplier.contactEmail || ''}?subject=${subject}&body=${encodeURIComponent(fullMsg)}`;
        window.location.href = mailLink;
      } else if (ch === 'whatsapp') {
        const cleanPhone = (manifest.supplier.contactPhone || '').replace(/[^0-9]/g, '');
        const waLink = cleanPhone
          ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(fullMsg)}`
          : `https://wa.me/?text=${encodeURIComponent(fullMsg)}`;
        window.open(waLink, '_blank', 'noopener,noreferrer');
      } else {
        setCopiedKey(manifest.supplier.id);
        setTimeout(() => setCopiedKey(null), 3500);
      }
    }

    if (onNotify) {
      onNotify(`Lien unique ${tokenObj.token} généré et transmis pour ${manifest.supplier.name}.`);
    }
  };

  const markPoSent = (manifest: typeof supplierManifests[0]) => {
    manifest.orders.forEach(o => {
      if (!o.supplierPoStatus || o.supplierPoStatus === 'Non transmis') {
        catalogService.updateOrderSupplierPo(o.id, 'PO Envoyé');
      }
    });
    onOrdersUpdated();
  };

  const handleCopyManifest = (manifest: typeof supplierManifests[0]) => {
    const text = generateSupplierMessage(manifest);
    navigator.clipboard.writeText(text);
    setCopiedKey(manifest.supplier.id);
    markPoSent(manifest);
    setTimeout(() => setCopiedKey(null), 3000);
    if (onNotify) onNotify(`Commande groupée copiée pour ${manifest.supplier.name}`);
  };

  const handleMarkAsOrdered = (orderIds: string[]) => {
    orderIds.forEach(id => {
      catalogService.updateOrderStatus(id, 'Commandée fournisseur');
      catalogService.updateOrderSupplierPo(id, 'Payé fournisseur');
    });
    setBulkStatusUpdated(true);
    setTimeout(() => setBulkStatusUpdated(false), 3500);
    onOrdersUpdated();
    if (onNotify) onNotify(`${orderIds.length} commande(s) passée(s) au statut "Commandée fournisseur" (Payé fournisseur).`);
  };

  const handleSaveDetectedPaymentLink = (manifest: typeof supplierManifests[0]) => {
    const raw = paymentInputs[manifest.supplier.id] || '';
    const extracted = extractSupplierPaymentLink(raw);
    const finalUrl = extracted.url || raw.trim();
    if (!finalUrl) return;

    manifest.orders.forEach(o => {
      catalogService.updateOrderSupplierPo(o.id, 'Lien paiement reçu', finalUrl);
    });
    setPaymentInputs(prev => ({ ...prev, [manifest.supplier.id]: '' }));
    onOrdersUpdated();
    if (onNotify) {
      onNotify(`Lien de paiement (${extracted.platformLabel}) enregistré pour ${manifest.supplier.name}.`);
    }
  };

  const handleSaveTrackingForManifest = (manifest: typeof supplierManifests[0]) => {
    const tracking = (trackingInputs[manifest.supplier.id] || '').trim();
    if (!tracking) return;
    manifest.orders.forEach(o => {
      catalogService.updateOrderLogistics(o.id, {
        trackingNumber: tracking,
        agentCode: manifest.agentCode
      });
      if (o.status === 'Commandée fournisseur' || o.status === 'Payée' || o.status === 'Reçue') {
        catalogService.updateOrderStatus(o.id, 'En transit');
      }
    });
    setTrackingInputs(prev => ({ ...prev, [manifest.supplier.id]: '' }));
    onOrdersUpdated();
    if (onNotify) {
      onNotify(`N° de suivi "${tracking}" enregistré et commande(s) passée(s) en "En transit".`);
    }
  };

  const handlePrintManifest = () => {
    const dateCode = new Date().toISOString().slice(0, 10);
    const sectionsHtml =
      filteredManifests.length > 0
        ? filteredManifests
            .map(
              m => `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #cbd5e1;padding-bottom:8px;margin-bottom:8px;">
            <div>
              <strong style="font-size:14px;">${m.supplier.name}</strong> (${m.supplier.platform || 'Alibaba'} — ${m.supplier.country})
              <div style="font-size:11px;color:#475569;">Tél/WhatsApp : ${m.supplier.contactPhone || 'N/A'} • Email : ${m.supplier.contactEmail || 'N/A'} • Délai : ${m.supplier.leadTimeAvg || '7-12j'}</div>
            </div>
            <div class="text-right">
              <span class="badge">Code Fret : ${m.agentCode}</span>
              <div class="font-mono font-bold" style="font-size:13px;margin-top:4px;">Total : ${m.totalCost.toLocaleString('fr-FR')} ${m.currency}</div>
            </div>
          </div>
          <div style="background:#fff7ed;border:1px solid #fed7aa;padding:8px 12px;border-radius:6px;margin-bottom:10px;font-size:11px;color:#9a3412;">
            <strong>INSTRUCTION D'EXPÉDITION FOURNISSEUR :</strong> Merci d'apposer sur chaque carton l'étiquette colis indiquée pour chaque article et d'expédier à l'entrepôt de réception rattaché.
          </div>
          <table>
            <thead>
              <tr>
                <th>Désignation Article</th>
                <th>Marque</th>
                <th class="text-center">Code Fret</th>
                <th>Étiquette Colis à apposer</th>
                <th class="text-center">Qté</th>
                <th class="text-right">P.U Achat</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${m.items
                .map(
                  it => `
                <tr>
                  <td><strong>${it.name}</strong></td>
                  <td>${it.brand}</td>
                  <td class="text-center"><strong style="padding:2px 6px;border-radius:4px;background:${it.freightCode === 'SEA' ? '#ccfbf1' : '#e0f2fe'};color:${it.freightCode === 'SEA' ? '#0f766e' : '#0369a1'};">${it.freightCode}</strong></td>
                  <td class="font-mono" style="font-size:11px;font-weight:700;color:#b45309;">${it.parcelLabels.join('<br/>')}</td>
                  <td class="text-center font-mono font-bold">x${it.quantity}</td>
                  <td class="text-right font-mono">${it.supplierPrice.toLocaleString('fr-FR')} ${it.currency}</td>
                  <td class="text-right font-mono font-bold">${it.total.toLocaleString('fr-FR')} ${it.currency}</td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>
        </div>`
            )
            .join('')
        : `<div class="card text-center">Aucune commande fournisseur active à imprimer pour ce filtre.</div>`;

    const bodyHtml = `
      <div class="header">
        <div>
          <div class="brand"><span class="brand-blue">ZONE</span> <span class="brand-orange">ÉQUIPEMENTS</span></div>
          <div style="margin-top:4px;font-weight:700;">COMMANDES DU JOUR REGROUPÉES PAR FOURNISSEUR (SANS DONNÉES CLIENT)</div>
          <div style="color:#475569;font-size:11px;">Date d'édition : ${todayStr}</div>
        </div>
        <div class="text-right">
          <span class="badge">${filteredManifests.length} Fournisseur(s)</span>
          <div style="margin-top:6px;font-weight:700;">${targetOrders.length} Dossier(s) Client</div>
        </div>
      </div>
      ${sectionsHtml}
    `;

    printHtmlDocument(
      `Commandes Quotidiennes Fournisseurs - ${dateCode}`,
      `Commandes-Fournisseurs-${dateCode}`,
      bodyHtml,
      onNotify
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800 pr-10">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-[#FF6600] border border-orange-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                {todayStr}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase">
                🔒 Marquage Colis & Entrepôt Rattaché
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {targetOrders.length} commande(s) répartie(s) sur {supplierManifests.length} fournisseur(s)
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <Send className="w-6 h-6 text-orange-500" />
              Commandes du Jour Regroupées par Fournisseur
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Les commandes d'approvisionnement sont regroupées par fournisseur avec leur <strong className="text-sky-400">Mode de Fret (AIR ou SEA)</strong>, les coordonnées de l'<strong className="text-emerald-400">Entrepôt de Réception</strong> (Code Agent ou Coordonnées Standard) et l'<strong className="text-amber-400">Étiquette Colis</strong> correspondante.
            </p>
          </div>

          <button
            type="button"
            onClick={handlePrintManifest}
            className="px-4 py-2.5 bg-[#FF6600] hover:bg-orange-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all self-start sm:self-auto shadow-lg shadow-orange-950/40 cursor-pointer shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer par Fournisseur (A4 / PDF)</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 my-4 bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-bold text-slate-300">Sélectionner un fournisseur :</span>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-orange-500"
              >
                <option value="all">Tous les fournisseurs ({supplierManifests.length})</option>
                {supplierManifests.map(m => (
                  <option key={m.supplier.id} value={m.supplier.id}>
                    {m.supplier.name} ({m.items.length} ligne(s) - {m.totalCost.toLocaleString('fr-FR')} {m.currency})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setStageFilter('active_all')}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  stageFilter === 'active_all' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tous les dossiers en cours
              </button>
              <button
                type="button"
                onClick={() => setStageFilter('pending')}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  stageFilter === 'pending' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                À commander / Attente paiement
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Fournisseurs à traiter :</span>
            <span className="text-sm font-bold font-mono text-orange-400">
              {filteredManifests.length} fournisseur{filteredManifests.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {bulkStatusUpdated && (
          <div className="mb-4 p-3 bg-emerald-950/60 border border-emerald-800/60 rounded-xl flex items-center gap-2 text-xs text-emerald-300 font-semibold animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Statuts des commandes mis à jour avec succès : "Commandée fournisseur".
          </div>
        )}

        {/* Liste des commandes regroupées fournisseur par fournisseur */}
        <div className="space-y-6 my-4">
          {filteredManifests.length === 0 ? (
            <div className="p-10 text-center bg-slate-950 rounded-2xl border border-slate-800">
              <Package className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-300">Aucune commande client à afficher dans ce filtre.</p>
              <p className="text-xs text-slate-500 mt-1">
                Dès qu'un client passe commande ou demande un devis sur le site, ses articles sont automatiquement regroupés ici par fournisseur.
              </p>
            </div>
          ) : (
            filteredManifests.map((manifest, mIndex) => {
              const cleanPhone = (manifest.supplier.contactPhone || '').replace(/[^0-9]/g, '');
              const msgText = generateSupplierMessage(manifest);
              const waUrl = cleanPhone
                ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msgText)}`
                : `https://wa.me/221766538384?text=${encodeURIComponent(msgText)}`;
              const mailUrl = `mailto:${manifest.supplier.contactEmail || 'zoneequipements@gmail.com'}?subject=${encodeURIComponent(`[COMMANDE FOURNISSEUR] ${manifest.agentCode} - ZONE ÉQUIPEMENTS`)}&body=${encodeURIComponent(msgText)}`;
              const orderIds = manifest.orders.map(o => o.id);
              const rawInput = paymentInputs[manifest.supplier.id] || '';
              const detectedLink = extractSupplierPaymentLink(rawInput);
              const ordersWithPaymentLinks = manifest.orders.filter(o => Boolean(o.supplierPaymentLink));
              const isCartPlatform = ['aliexpress', 'amazon', 'ebay', '1688', 'temu'].some(p =>
                (manifest.supplier.platform || '').toLowerCase().includes(p)
              );

              return (
                <div key={manifest.supplier.id} className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                  {/* Supplier Header */}
                  <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-black">
                        {mIndex + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-white">{manifest.supplier.name}</h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                            {manifest.supplier.platform || 'Alibaba'}
                          </span>
                          {isCartPlatform && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded border border-purple-500/40 flex items-center gap-1">
                              <ShoppingCart className="w-3 h-3" /> Mode Panier (AliExpress / Marketplace) Prêt
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {manifest.supplier.country} • Délai moyen : {manifest.supplier.leadTimeAvg || '7-12j'} • {manifest.orders.length} commande(s) client regroupée(s)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-mono font-bold">
                        {manifest.agentWarehouse && (manifest.agentWarehouse.identificationMode === 'standard_address' || !manifest.agentWarehouse.agentCode)
                          ? `Destinataire : ${manifest.agentCode}`
                          : `Code Agent : ${manifest.agentCode}`}
                      </span>
                      <span className="text-sm font-black font-mono text-white">
                        {manifest.totalCost.toLocaleString('fr-FR')} {manifest.currency}
                      </span>
                    </div>
                  </div>

                  {/* Items Table with Freight Code AIR/SEA & Anonymous Parcel Label */}
                  <div className="p-4 space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="text-slate-400 uppercase text-[10px] border-b border-slate-800">
                          <tr>
                            <th className="py-2 pr-3">Article & Panier Direct</th>
                            <th className="py-2 px-2 text-center">Moyen & Code Fret</th>
                            <th className="py-2 px-3">Étiquette Colis à apposer par le Fournisseur</th>
                            <th className="py-2 px-2 text-center">Qté</th>
                            <th className="py-2 pl-2 text-right">P.U Achat</th>
                            <th className="py-2 pl-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono">
                          {manifest.items.map((item, idx) => {
                            const labelKey = `${manifest.supplier.id}-${idx}`;
                            const sellerNote = generateCartSellerNote(item);
                            return (
                              <tr key={idx} className="hover:bg-slate-900/30">
                                <td className="py-3 pr-3 font-sans font-medium text-white">
                                  <div className="font-bold text-slate-100">{item.name}</div>
                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <span className="text-[10px] text-slate-400">Marque: {item.brand}</span>
                                    {item.productUrl && (
                                      <a
                                        href={item.productUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 text-[10px] font-bold transition-colors"
                                        title="Ouvrir la fiche produit chez le fournisseur (ex: AliExpress) pour l'ajouter au panier"
                                      >
                                        <ShoppingCart className="w-3 h-3" />
                                        Ouvrir fiche / Ajouter au panier (x{item.quantity})
                                        <ExternalLink className="w-2.5 h-2.5" />
                                      </a>
                                    )}
                                  </div>
                                </td>

                                <td className="py-3 px-2 text-center font-sans">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black tracking-wider ${
                                    item.freightCode === 'SEA'
                                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                                      : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                  }`}>
                                    {item.freightCode === 'SEA' ? '🚢 CODE : SEA' : '✈️ CODE : AIR'}
                                  </span>
                                  <span className="block text-[10px] text-slate-400 mt-0.5">
                                    {item.freightCode === 'SEA' ? 'Fret Maritime' : 'Fret Aérien'}
                                  </span>
                                </td>

                                <td className="py-3 px-3 font-sans">
                                  <div className="space-y-1.5">
                                    {item.parcelLabels.map((lbl, lIdx) => (
                                      <div key={lIdx} className="flex flex-wrap items-center gap-1.5">
                                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono font-black text-[11px]">
                                          🏷️ {lbl}
                                        </span>
                                      </div>
                                    ))}
                                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                      <button
                                        type="button"
                                        onClick={() => handleCopySellerNote(labelKey, sellerNote)}
                                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                        title="Copier le texte de marquage colis à coller dans la note vendeur AliExpress ou WhatsApp"
                                      >
                                        {copiedLabelKey === labelKey ? (
                                          <>
                                            <Check className="w-3 h-3 text-emerald-400" />
                                            <span className="text-emerald-400">Marquage copié !</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3 h-3 text-orange-400" />
                                            <span>Copier Note Colis (Panier AliExpress / Vendeur)</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                    {/* Correspondance interne Admin uniquement (Non envoyée au fournisseur) */}
                                    <div className="text-[10px] text-slate-400 bg-slate-900/90 px-2 py-1 rounded border border-slate-800">
                                      <span className="text-emerald-400 font-bold">🔒 Repère Entrepôt (Admin seul) : </span>
                                      {item.adminClientOwners.map(o => `${o.clientWarehouseId} = ${o.customerName}`).join(' • ')}
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3 px-2 text-center font-bold text-orange-400 text-sm">x{item.quantity}</td>
                                <td className="py-3 pl-2 text-right text-slate-300">{item.supplierPrice.toLocaleString('fr-FR')} {item.currency}</td>
                                <td className="py-3 pl-2 text-right font-bold text-white">{item.total.toLocaleString('fr-FR')} {item.currency}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* ÉTAPE 1 : Envoi de la Commande Groupée à CE Fournisseur */}
                    <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCreateOneTimeLinkForManifest(manifest, true)}
                            className="px-3.5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-orange-600/20 cursor-pointer"
                            title="Générer une page web sécurisée à usage unique pour ce fournisseur et l'envoyer"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>
                              Générer Lien Unique & Envoyer à ce Fournisseur ({manifest.supplier.communicationChannel === 'email' ? 'Email' : manifest.supplier.communicationChannel === 'alibaba_chat' ? 'Chat Alibaba' : 'WhatsApp'})
                            </span>
                          </button>

                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => markPoSent(manifest)}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-transform active:scale-95"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>WhatsApp Direct ({manifest.supplier.contactPhone || 'Fournisseur'})</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => handleCopyManifest(manifest)}
                            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors cursor-pointer"
                          >
                            {copiedKey === manifest.supplier.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-orange-400" />
                            )}
                            <span>{copiedKey === manifest.supplier.id ? 'Copié !' : 'Copier Bon (Chat Alibaba / AliExpress)'}</span>
                          </button>

                          <a
                            href={mailUrl}
                            onClick={() => markPoSent(manifest)}
                            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 transition-transform active:scale-95"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>Envoyer par Email</span>
                          </a>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleMarkAsOrdered(orderIds)}
                          className="px-3.5 py-2 bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Valider comme Commandé & Payé ({orderIds.length})</span>
                        </button>
                      </div>

                      {/* Affichage du lien unique actif ou répondu pour ce fournisseur */}
                      {(() => {
                        const supToken =
                          generatedTokensBySup[manifest.supplier.id] ||
                          allSupplierTokens.find(tk => tk.supplierId === manifest.supplier.id);
                        if (!supToken) return null;
                        const fullPortalUrl = `${window.location.origin}/supplier-po/${supToken.token}`;
                        return (
                          <div className="p-2.5 bg-slate-900/90 border border-orange-500/30 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <ShieldCheck className="w-4 h-4 text-orange-400 shrink-0" />
                              <span className="font-mono font-bold text-white">{supToken.token}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                                supToken.status === 'used'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}>
                                {supToken.status === 'used' ? (
                                  <><Lock className="w-2.5 h-2.5" /> Réponse Reçue & Lien Verrouillé</>
                                ) : (
                                  'Lien Unique Actif (Inclus dans WhatsApp/Email)'
                                )}
                              </span>
                              <span className="font-mono text-slate-400 truncate hidden md:inline">{fullPortalUrl}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(fullPortalUrl);
                                  if (onNotify) onNotify(`URL Portail Unique copiée : ${fullPortalUrl}`);
                                }}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-bold cursor-pointer"
                              >
                                Copier URL
                              </button>
                              <a
                                href={`/supplier-po/${supToken.token}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 bg-orange-600/20 hover:bg-orange-600 text-orange-300 hover:text-white border border-orange-500/30 rounded text-[11px] font-bold flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" /> Ouvrir Portail Fournisseur
                              </a>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* ÉTAPE 2 & 3 : Détection / Affichage du Lien de Paiement Fournisseur + Suivi Expédition */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-2">
                      {/* Détection et Affichage des liens de paiement */}
                      <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5" />
                            2. Lien de Paiement Fournisseur (ou Panier AliExpress)
                          </span>
                          {detectedLink.url && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                              ✓ Détecté : {detectedLink.platformLabel}
                            </span>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Collez le lien Trade Assurance, PayPal ou lien commande AliExpress..."
                            value={rawInput}
                            onChange={e => setPaymentInputs(prev => ({ ...prev, [manifest.supplier.id]: e.target.value }))}
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-orange-500 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveDetectedPaymentLink(manifest)}
                            disabled={!detectedLink.url && !rawInput.trim()}
                            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer"
                          >
                            Enregistrer Lien
                          </button>
                        </div>

                        {ordersWithPaymentLinks.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            {ordersWithPaymentLinks.map(ord => {
                              const info = extractSupplierPaymentLink(ord.supplierPaymentLink || '');
                              return (
                                <div
                                  key={ord.id}
                                  className="flex items-center justify-between gap-2 p-2 bg-slate-950 rounded-lg border border-slate-800 text-[11px]"
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <LinkIcon className="w-3 h-3 text-orange-400 shrink-0" />
                                    <span className="font-mono font-bold text-white">{ord.orderNumber}</span>
                                    <span className="text-blue-400 font-semibold truncate">{info.platformLabel}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                      ord.supplierPoStatus === 'Payé fournisseur'
                                        ? 'bg-emerald-500/20 text-emerald-400'
                                        : 'bg-amber-500/20 text-amber-300'
                                    }`}>
                                      {ord.supplierPoStatus || 'Lien reçu'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <a
                                      href={ord.supplierPaymentLink}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-2 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded font-bold flex items-center gap-1"
                                    >
                                      <ExternalLink className="w-3 h-3" /> Payer
                                    </a>
                                    {ord.supplierPoStatus !== 'Payé fournisseur' && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          catalogService.updateOrderSupplierPo(ord.id, 'Payé fournisseur');
                                          onOrdersUpdated();
                                          if (onNotify) onNotify(`Commande ${ord.orderNumber} marquée payée au fournisseur.`);
                                        }}
                                        className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded font-bold cursor-pointer"
                                      >
                                        ✓ Payé
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Suivi Expédition & N° Tracking vers Entrepôt */}
                      <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5" />
                            3. N° de Suivi / Tracking vers votre Entrepôt
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            Code : {manifest.agentCode}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Saisir N° Tracking / Colis communiqué par le fournisseur..."
                            value={trackingInputs[manifest.supplier.id] || ''}
                            onChange={e => setTrackingInputs(prev => ({ ...prev, [manifest.supplier.id]: e.target.value }))}
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-blue-500 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveTrackingForManifest(manifest)}
                            disabled={!(trackingInputs[manifest.supplier.id] || '').trim()}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer"
                          >
                            Mettre en Transit
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {manifest.orders.map(ord => {
                            const cId = getClientWarehouseCode(ord);
                            const fCode = getItemFreightCode(ord.items?.[0]?.shippingMethod, ord.agentCode);
                            return (
                              <span
                                key={ord.id}
                                className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-300 font-mono"
                              >
                                {ord.orderNumber} (<strong className="text-amber-300">{cId}</strong> • <strong className="text-sky-300">{fCode}</strong>): <strong className="text-orange-400">{ord.status}</strong>
                                {ord.trackingNumber ? ` • Track: ${ord.trackingNumber}` : ''}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { 
  X, Send, Mail, Copy, Check, Printer, Building2, Package, 
  CheckCircle2, ExternalLink, Calendar, Truck, ArrowRight, MessageSquare, AlertCircle
} from 'lucide-react';
import { Supplier, Order, catalogService } from '../../services/catalogService';

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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [bulkStatusUpdated, setBulkStatusUpdated] = useState(false);

  // Group active orders that need supplier purchasing (Reçue, Payée, En attente paiement, etc.)
  const pendingOrders = useMemo(() => {
    return orders.filter(o => 
      o.status !== 'Annulée' && 
      o.status !== 'Livrée' && 
      o.status !== 'Reçue en entrepôt' && 
      o.status !== 'Commandée fournisseur'
    );
  }, [orders]);

  // Group items by supplier
  const supplierManifests = useMemo(() => {
    const map = new Map<string, {
      supplier: Supplier;
      orders: Order[];
      items: Array<{
        name: string;
        brand: string;
        ref?: string;
        quantity: number;
        supplierPrice: number;
        currency: string;
        total: number;
        shippingMethod: 'air' | 'sea' | 'none';
        orderRefs: string[];
      }>;
      totalCost: number;
      currency: string;
      hasSea: boolean;
      agentCode: string;
    }>();

    // Default generic supplier if unassigned
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

    pendingOrders.forEach(order => {
      const supId = order.supplierId || 'unassigned';
      const foundSup = suppliers.find(s => s.id === supId) || defaultSupplier;

      if (!map.has(supId)) {
        map.set(supId, {
          supplier: foundSup,
          orders: [],
          items: [],
          totalCost: 0,
          currency: foundSup.currency || 'USD',
          hasSea: false,
          agentCode: 'DKR628+AIR'
        });
      }

      const group = map.get(supId)!;
      if (!group.orders.some(o => o.id === order.id)) {
        group.orders.push(order);
      }

      order.items.forEach(item => {
        const sPrice = item.supplierPrice || Math.round(item.price * 0.55 / 610);
        const curr = item.supplierCurrency || group.supplier.currency || 'USD';
        const shipMode = item.shippingMethod || (order.agentCode === 'DKR628+SEA' ? 'sea' : 'air');
        if (shipMode === 'sea') group.hasSea = true;

        const existing = group.items.find(it => it.name === item.name);
        if (existing) {
          existing.quantity += item.quantity;
          existing.total += sPrice * item.quantity;
          if (!existing.orderRefs.includes(order.orderNumber)) {
            existing.orderRefs.push(order.orderNumber);
          }
        } else {
          group.items.push({
            name: item.name,
            brand: item.brand || 'Constructeur Original',
            quantity: item.quantity,
            supplierPrice: sPrice,
            currency: curr,
            total: sPrice * item.quantity,
            shippingMethod: shipMode,
            orderRefs: [order.orderNumber]
          });
        }
      });
    });

    // Compute totals and agent code
    map.forEach(group => {
      group.totalCost = group.items.reduce((sum, it) => sum + it.total, 0);
      group.agentCode = group.hasSea ? 'DKR628+SEA' : 'DKR628+AIR';
    });

    return Array.from(map.values());
  }, [pendingOrders, suppliers]);

  // Filtered list based on dropdown
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

  const generateSupplierMessage = (manifest: typeof supplierManifests[0]) => {
    const poRef = `PO-DAILY-${manifest.supplier.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;

    return `*COMMANDE QUOTIDIENNE D'ACHAT / DAILY PURCHASE ORDER*
Référence Bon : ${poRef}
Date : ${new Date().toLocaleDateString('fr-FR')}
Acheteur : ZONE EQUIPEMENTS SÉNÉGAL (Dakar)
Fournisseur : ${manifest.supplier.name} (${manifest.supplier.platform || 'Alibaba'})

*DIRECTIVE LOGISTIQUE & ÉTIQUETAGE OBLIGATOIRE :*
Code Agent Consignee : *${manifest.agentCode}*
Destination finale : Port/Aéroport de DAKAR, Sénégal
Marquage obligatoire sur chaque colis : [CODE AGENT: ${manifest.agentCode}] - DAKAR MRO

*LISTE DES ARTICLES À EXPÉDIER AUJOURD'HUI :*
${manifest.items.map((it, idx) => `${idx + 1}. [Qté: ${it.quantity}] ${it.name} (${it.brand}) | P.U : ${it.supplierPrice.toLocaleString()} ${it.currency} | Mode : ${it.shippingMethod === 'sea' ? 'Maritime' : 'Aérien'}`).join('\n')}

*MONTANT TOTAL :* ${manifest.totalCost.toLocaleString()} ${manifest.currency}
Conditions : ${manifest.supplier.paymentTerms || 'Trade Assurance / Facture Proforma'}

*ACTION ATTENDUE :*
Merci de confirmer la disponibilité des stocks et de nous transmettre le lien de paiement Trade Assurance ou la facture proforma sous 24h.

Contact Logistique Dakar :
Email : zoneequipements@gmail.com
WhatsApp : +221 76 653 83 84`;
  };

  const handleCopyManifest = (manifest: typeof supplierManifests[0]) => {
    const text = generateSupplierMessage(manifest);
    navigator.clipboard.writeText(text);
    setCopiedKey(manifest.supplier.id);
    setTimeout(() => setCopiedKey(null), 3000);
    if (onNotify) onNotify(`Manifeste copié pour ${manifest.supplier.name}`);
  };

  const handleMarkAsOrdered = (orderIds: string[]) => {
    orderIds.forEach(id => {
      catalogService.updateOrderStatus(id, 'Commandée fournisseur');
    });
    setBulkStatusUpdated(true);
    setTimeout(() => setBulkStatusUpdated(false), 3500);
    onOrdersUpdated();
    if (onNotify) onNotify(`${orderIds.length} commande(s) passée(s) au statut "Commandée fournisseur".`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn print:p-0 print:bg-white print:fixed print:inset-0 print:z-[99999]">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-manifest, .printable-manifest * {
            visibility: visible;
          }
          .printable-manifest {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 20px !important;
            box-shadow: none !important;
            border: none !important;
            max-height: none !important;
            overflow: visible !important;
          }
          .no-print {
            display: none !important;
          }
          .print-black {
            color: black !important;
          }
          .print-border {
            border-color: #ccc !important;
            background: white !important;
          }
        }
      `}</style>
      <div className="printable-manifest bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="no-print absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800 print-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-[#FF6600] border border-orange-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                {todayStr}
              </span>
              <span className="text-xs text-slate-400 print-black font-medium">
                {pendingOrders.length} commande(s) à transmettre
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white print-black flex items-center gap-2.5">
              <Send className="w-6 h-6 text-orange-500 no-print" />
              Manifeste Quotidien de Sourcing & Commandes Fournisseurs
            </h2>
            <p className="text-xs text-slate-400 print-black mt-1">
              Générez et expédiez le manifeste quotidien structuré par WhatsApp, Chat TradeManager ou Email avec le code agent obligatoire.
            </p>
          </div>

          <button
            onClick={() => window.print()}
            className="no-print px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition-all self-start sm:self-auto shadow-md"
          >
            <Printer className="w-4 h-4 text-orange-400" />
            <span>Imprimer Manifeste</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 my-4 bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-300">Filtrer par Fournisseur :</span>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-orange-500"
            >
              <option value="all">Tous les fournisseurs ({supplierManifests.length})</option>
              {supplierManifests.map(m => (
                <option key={m.supplier.id} value={m.supplier.id}>
                  {m.supplier.name} ({m.items.length} articles - {m.totalCost.toLocaleString()} {m.currency})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Total approvisionnement du jour :</span>
            <span className="text-sm font-bold font-mono text-orange-400">
              {supplierManifests.reduce((acc, m) => acc + m.totalCost, 0).toLocaleString()} Devise mix
            </span>
          </div>
        </div>

        {bulkStatusUpdated && (
          <div className="mb-4 p-3 bg-emerald-950/60 border border-emerald-800/60 rounded-xl flex items-center gap-2 text-xs text-emerald-300 font-semibold animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Statuts des commandes mis à jour avec succès : "Commandée fournisseur".
          </div>
        )}

        {/* Manifests list by supplier */}
        <div className="space-y-6 my-4">
          {filteredManifests.length === 0 ? (
            <div className="p-10 text-center bg-slate-950 rounded-2xl border border-slate-800">
              <Package className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-300">Aucune commande client en attente de transmission fournisseur.</p>
              <p className="text-xs text-slate-500 mt-1">Toutes les commandes reçues sont déjà traitées ou au statut "Commandée fournisseur".</p>
            </div>
          ) : (
            filteredManifests.map((manifest) => {
              const cleanPhone = (manifest.supplier.contactPhone || '').replace(/[^0-9]/g, '');
              const msgText = generateSupplierMessage(manifest);
              const waUrl = cleanPhone 
                ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msgText)}`
                : `https://wa.me/221766538384?text=${encodeURIComponent(msgText)}`;
              const mailUrl = `mailto:${manifest.supplier.contactEmail || 'commercial@fournisseur.com'}?subject=${encodeURIComponent(`[COMMANDE DU JOUR] Manifeste ${manifest.agentCode} - Zone Equipements`)}&body=${encodeURIComponent(msgText)}`;
              const orderIds = manifest.orders.map(o => o.id);

              return (
                <div key={manifest.supplier.id} className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                  {/* Supplier Header */}
                  <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-black">
                        {manifest.supplier.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white">{manifest.supplier.name}</h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                            {manifest.supplier.platform || 'Alibaba'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {manifest.supplier.country} • Délai moyen : {manifest.supplier.leadTimeAvg || '7-12j'} • {manifest.orders.length} commande(s) client rattachée(s)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-mono font-bold">
                        Code : {manifest.agentCode}
                      </span>
                      <span className="text-sm font-black font-mono text-white">
                        {manifest.totalCost.toLocaleString()} {manifest.currency}
                      </span>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="p-4">
                    <table className="w-full text-left text-xs mb-4">
                      <thead className="text-slate-400 uppercase text-[10px] border-b border-slate-800">
                        <tr>
                          <th className="py-2">Désignation</th>
                          <th className="py-2">Marque</th>
                          <th className="py-2 text-center">Fret</th>
                          <th className="py-2 text-center">Quantité</th>
                          <th className="py-2 text-right">P.U Achat</th>
                          <th className="py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {manifest.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/30">
                            <td className="py-2.5 font-sans font-medium text-white">
                              {item.name}
                              <span className="block text-[10px] text-slate-500">Refs: {item.orderRefs.join(', ')}</span>
                            </td>
                            <td className="py-2.5 font-sans text-slate-300">{item.brand}</td>
                            <td className="py-2.5 text-center font-sans">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.shippingMethod === 'sea' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'
                              }`}>
                                {item.shippingMethod === 'sea' ? 'Maritime' : 'Aérien'}
                              </span>
                            </td>
                            <td className="py-2.5 text-center font-bold text-orange-400">x{item.quantity}</td>
                            <td className="py-2.5 text-right text-slate-300">{item.supplierPrice.toLocaleString()} {item.currency}</td>
                            <td className="py-2.5 text-right font-bold text-white">{item.total.toLocaleString()} {item.currency}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Quick Direct Communication Buttons */}
                    <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* WhatsApp Direct */}
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-transform active:scale-95"
                          title="Envoyer instantanément par WhatsApp avec mise en page complète"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>WhatsApp Direct ({manifest.supplier.contactPhone || 'Commercial'})</span>
                        </a>

                        {/* TradeManager / Alibaba Chat Direct Link or Copy */}
                        <button
                          onClick={() => handleCopyManifest(manifest)}
                          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors"
                          title="Copier le texte formaté pour TradeManager Alibaba ou WeChat"
                        >
                          {copiedKey === manifest.supplier.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-orange-400" />
                          )}
                          <span>{copiedKey === manifest.supplier.id ? 'Copié !' : 'Copier pour Chat Alibaba'}</span>
                        </button>

                        {/* Email Direct */}
                        <a
                          href={mailUrl}
                          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 transition-transform active:scale-95"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Envoyer par Email</span>
                        </a>
                      </div>

                      {/* 1-Click Update status */}
                      <button
                        onClick={() => handleMarkAsOrdered(orderIds)}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-orange-600 hover:text-white text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-700 hover:border-orange-500"
                        title="Met à jour les dossiers clients au statut 'Commandée fournisseur'"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Valider comme Commandé ({orderIds.length})</span>
                      </button>
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
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

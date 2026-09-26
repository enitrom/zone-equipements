import React, { useState, useEffect } from 'react';
import { X, Printer, Copy, Check, Send, Mail, Building2, Package, CheckCircle2, DollarSign } from 'lucide-react';
import { Supplier, Order, catalogService } from '../../services/catalogService';

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
  const [selectedOrderIdForLink, setSelectedOrderIdForLink] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen || !supplier) return null;

  // Filter orders containing items for this supplier or all active orders if unassigned
  const supplierOrders = orders.filter(o => 
    o.status !== 'Annulée' && (o.supplierId === supplier.id || !o.supplierId)
  );

  const poNumber = `PO-${supplier.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;

  const hasSeaItems = supplierOrders.some(o => o.items?.some(it => it.shippingMethod === 'sea') || o.agentCode === 'DKR628+SEA');
  const agentCode = hasSeaItems ? 'DKR628+SEA' : 'DKR628+AIR';

  // Consolidate items across active customer orders
  const consolidatedItems: Array<{
    name: string;
    brand: string;
    ref?: string;
    quantity: number;
    supplierPrice: number;
    currency: string;
    total: number;
    orderRefs: string[];
  }> = [];

  supplierOrders.forEach(order => {
    order.items.forEach(item => {
      const existing = consolidatedItems.find(ci => ci.name === item.name);
      const sPrice = item.supplierPrice || Math.round(item.price * 0.55 / 610);
      const curr = item.supplierCurrency || supplier.currency || 'USD';
      
      if (existing) {
        existing.quantity += item.quantity;
        existing.total += sPrice * item.quantity;
        if (!existing.orderRefs.includes(order.orderNumber)) {
          existing.orderRefs.push(order.orderNumber);
        }
      } else {
        consolidatedItems.push({
          name: item.name,
          brand: item.brand || 'Constructeur Original',
          quantity: item.quantity,
          supplierPrice: sPrice,
          currency: curr,
          total: sPrice * item.quantity,
          orderRefs: [order.orderNumber]
        });
      }
    });
  });

  const totalSupplierCost = consolidatedItems.reduce((sum, item) => sum + item.total, 0);

  // Generate clear text version for WhatsApp / Email with MANDATORY AGENT CODE and NO CUSTOMER DETAILS
  const defaultRawText = `*COMMANDE D'ACHAT GROUPÉE / CONSOLIDATED PURCHASE ORDER*
Référence Bon : ${poNumber}
Fournisseur : ${supplier.name} (${supplier.platform})
Date : ${new Date().toLocaleDateString('fr-FR')}

*DIRECTIVE LOGISTIQUE & CODE AGENT OBLIGATOIRE :*
Code Agent Consignee : ${agentCode}
Destinataire : ZONE EQUIPEMENTS SÉNÉGAL
Entrepôt d'arrivée : Transit Hub Export (${supplier.country}) -> Port/Aéroport de DAKAR
Marquage Colis Requis (Sur tous les cartons) : [CODE AGENT: ${agentCode}] - DAKAR MRO

*DÉTAIL DES ARTICLES COMMANDÉS :*
${consolidatedItems.length > 0 ? consolidatedItems.map((it, idx) => `${idx + 1}. [Qté: ${it.quantity}] ${it.name} (${it.brand}) - Prix unitaire : ${it.supplierPrice} ${it.currency}`).join('\n') : 'Aucun article à commander'}

*MONTANT TOTAL :* ${totalSupplierCost.toLocaleString()} ${supplier.currency}
Conditions convenues : ${supplier.paymentTerms || 'Paiement sécurisé proforma / Trade Assurance'}
Frais livraison entrepôt export : ${supplier.warehouseDeliveryFeeUSD || 25} $

*INSTRUCTIONS DE CONFORMITÉ :*
- Les cartons doivent obligatoirement être étiquetés avec le Code Agent : ${agentCode}
- Merci de nous transmettre le lien sécurisé Trade Assurance ou la facture proforma pour paiement immédiat.

Zone Équipements Sénégal
Email : zoneequipements@gmail.com
WhatsApp : +221 76 653 83 84
Km 4, Boulevard du Centenaire, Dakar, Sénégal`;

  const [editableMessage, setEditableMessage] = useState(defaultRawText);
  const [selectedChannel, setSelectedChannel] = useState<'whatsapp' | 'email' | 'alibaba_chat'>(supplier.communicationChannel || 'whatsapp');

  useEffect(() => {
    setEditableMessage(defaultRawText);
    setSelectedChannel(supplier.communicationChannel || 'whatsapp');
  }, [supplier, poNumber]);

  const handleCopy = () => {
    navigator.clipboard.writeText(editableMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePrint = () => {
    window.print();
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
    if (!selectedOrderIdForLink || !paymentLinkInput.trim()) return;

    catalogService.updateOrderSupplierPo(selectedOrderIdForLink, 'Lien paiement reçu', paymentLinkInput.trim());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    setPaymentLinkInput('');
    if (onOrderUpdated) onOrderUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:p-0 print:bg-white print:fixed print:inset-0 print:z-[99999]">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-po, .printable-po * {
            visibility: visible;
          }
          .printable-po {
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
          .print-bg-gray {
            background-color: #f8fafc !important;
          }
        }
      `}</style>
      <div className="printable-po bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl p-6 shadow-2xl relative max-h-[94vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="no-print absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800 print-border">
          <div>
            <span className="text-xs font-mono font-bold text-[#FF6600] uppercase tracking-wider block mb-1">
              {poNumber}
            </span>
            <h3 className="text-xl font-bold text-white print-black flex items-center gap-2">
              <Building2 className="w-5 h-5 text-orange-500 no-print" />
              Bon de Commande Fournisseur Groupé (PO)
            </h3>
            <p className="text-xs text-slate-400 print-black mt-0.5">
              Fournisseur ciblé : <strong className="text-slate-200 print-black">{supplier.name}</strong> ({supplier.country} - {supplier.platform})
            </p>
          </div>

          <div className="no-print flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copié !' : 'Copier'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer</span>
            </button>
          </div>
        </div>

        {/* Summary Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Destination Entrepôt</span>
            <span className="text-xs font-bold text-slate-200">
              {supplier.country === 'Chine' ? 'Transit Hub Yiwu / Guangzhou' : 'Transit Hub France / Europe'}
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Délai Moyen Estimé</span>
            <span className="text-xs font-bold text-emerald-400">
              {supplier.leadTimeAvg || '7 à 12 jours'}
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Approvisionnement</span>
            <span className="text-sm font-bold font-mono text-orange-400">
              {totalSupplierCost.toLocaleString()} {supplier.currency}
            </span>
          </div>
        </div>

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

          <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Désignation</th>
                  <th className="py-2.5 px-3">Marque</th>
                  <th className="py-2.5 px-3 text-center">Quantité</th>
                  <th className="py-2.5 px-3 text-right">P.U Fournisseur</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {consolidatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500 font-sans">
                      Aucune commande client active en attente d'approvisionnement pour ce fournisseur.
                    </td>
                  </tr>
                ) : (
                  consolidatedItems.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-900/40">
                      <td className="py-2.5 px-3 font-sans text-white font-medium">
                        {item.name}
                        <span className="block text-[10px] text-slate-500">Refs: {item.orderRefs.join(', ')}</span>
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-300">{item.brand}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-orange-400">x{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right text-slate-300">{item.supplierPrice.toLocaleString()} {item.currency}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-white">{item.total.toLocaleString()} {item.currency}</td>
                    </tr>
                  ))
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
              Code Agent Actif : {agentCode}
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Message automatique pré-rempli avec les instructions logistiques et le code agent obligatoire (modifiable avant transmission) :
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
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20"
            >
              <Send className="w-4 h-4" />
              Envoyer par WhatsApp ({supplier.contactPhone || 'Commercial'})
            </a>

            <a
              href={emailUrl}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20"
            >
              <Mail className="w-4 h-4" />
              Envoyer par Email ({supplier.contactEmail || 'Email'})
            </a>

            <button
              onClick={handleCopy}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700"
            >
              <Copy className="w-4 h-4 text-orange-400" />
              {copied ? 'Message Copié !' : 'Copier pour Chat Alibaba/1688'}
            </button>
          </div>
        </div>

        {/* Section: Saisie du lien de paiement reçu du fournisseur */}
        <div className="mt-4 p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-orange-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Enregistrer le Lien de Règlement Fournisseur Reçu
            </h4>
          </div>
          <p className="text-xs text-slate-400">
            Dès que {supplier.name} vous transmet le lien sécurisé (Trade Assurance Alibaba, Stripe ou proforma bancaire), enregistrez-le ici pour la traçabilité comptable :
          </p>

          <form onSubmit={handleSavePaymentLink} className="flex flex-col sm:flex-row gap-2">
            <select
              value={selectedOrderIdForLink}
              onChange={(e) => setSelectedOrderIdForLink(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="">Sélectionner le dossier commande...</option>
              {supplierOrders.map(o => (
                <option key={o.id} value={o.id}>
                  {o.orderNumber} - {o.customerCompany || o.customerName} ({o.totalTTC.toLocaleString()} F)
                </option>
              ))}
            </select>

            <input
              type="url"
              placeholder="https://tradeassurance.alibaba.com/order/... ou lien proforma"
              value={paymentLinkInput}
              onChange={(e) => setPaymentLinkInput(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />

            <button
              type="submit"
              disabled={!selectedOrderIdForLink || !paymentLinkInput.trim()}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold shrink-0 shadow-md"
            >
              Enregistrer
            </button>
          </form>

          {saveSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Lien de règlement fournisseur enregistré avec succès.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 mt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { 
  FileText, Plus, Trash2, CheckCircle2, X, Printer, DollarSign, 
  Building2, User, Phone, MapPin, Search, AlertCircle, ShoppingBag, 
  Layers, CreditCard, ShieldCheck, ArrowRight
} from 'lucide-react';
import { 
  catalogService, ExtendedProduct, Order, OrderItem 
} from '../../services/catalogService';
import { siteSettingsService } from '../../services/siteSettingsService';
import { printHtmlDocument } from '../../utils/printDocument';

interface DirectInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (order: Order) => void;
}

interface CustomInvoiceLine {
  id: string;
  productId?: string | number;
  name: string;
  brand: string;
  sku: string;
  unitPriceHT: number;
  quantity: number;
  vatRate: number; // 0.18 or 0
  weightKg: number;
  isCustom: boolean;
}

export const DirectInvoiceModal: React.FC<DirectInvoiceModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [products] = useState<ExtendedProduct[]>(() => catalogService.getProducts());
  const [settings] = useState(() => siteSettingsService.getSettings());

  // Invoice Mode: Invoice (Facture Comptoir / Vente directe) vs Devis Proforma
  const [docType, setDocType] = useState<'invoice' | 'quote'>('invoice');
  const [paymentStatus, setPaymentStatus] = useState<'Payé' | 'Non payé' | 'Acompte'>('Payé');
  const [paymentMethod, setPaymentMethod] = useState<'Espèces (Comptant)' | 'Wave' | 'Orange Money' | 'Virement Bancaire B2B' | 'Chèque'>('Espèces (Comptant)');
  const [decrementStock, setDecrementStock] = useState<boolean>(true);

  // Customer Info
  const [customerName, setCustomerName] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('Dakar, Sénégal');
  const [customerNinea, setCustomerNinea] = useState('');
  const [notes, setNotes] = useState('');

  // Invoice items
  const [lines, setLines] = useState<CustomInvoiceLine[]>([]);

  // Search product dropdown helper
  const [searchProductQuery, setSearchProductQuery] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);

  // Add custom manual item state
  const [customName, setCustomName] = useState('');
  const [customBrand, setCustomBrand] = useState('Générique');
  const [customPrice, setCustomPrice] = useState('');
  const [customQty, setCustomQty] = useState('1');
  const [customApplyVat, setCustomApplyVat] = useState(true);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtered products for picker
  const filteredProducts = useMemo(() => {
    if (!searchProductQuery.trim()) return products.slice(0, 10);
    const q = searchProductQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.brand.toLowerCase().includes(q) || 
      p.ref.toLowerCase().includes(q)
    ).slice(0, 15);
  }, [products, searchProductQuery]);

  const handleAddProductLine = (prod: ExtendedProduct) => {
    const isVatActive = prod.applyVat !== undefined 
      ? Boolean(prod.applyVat) 
      : Boolean(settings.applyVatByDefault);
    const rate = isVatActive ? (prod.vatRate ?? settings.defaultVatRate ?? 0.18) : 0;
    const priceHT = prod.price || 0;

    const newLine: CustomInvoiceLine = {
      id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      productId: prod.id,
      name: prod.name,
      brand: prod.brand || 'Standard',
      sku: prod.ref || `REF-${prod.id}`,
      unitPriceHT: priceHT,
      quantity: 1,
      vatRate: rate,
      weightKg: typeof prod.weight === 'number' ? prod.weight : parseFloat(String(prod.weight || '1').replace(/[^0-9.]/g, '')) || 1,
      isCustom: false
    };

    setLines(prev => [...prev, newLine]);
    setSearchProductQuery('');
    setShowProductPicker(false);
  };

  const handleAddCustomLine = () => {
    const price = parseFloat(customPrice.replace(/[^0-9.]/g, ''));
    const qty = parseInt(customQty) || 1;
    if (!customName.trim() || isNaN(price) || price <= 0) {
      setErrorMsg("Veuillez renseigner une désignation et un prix unitaire HT valide.");
      return;
    }

    const newLine: CustomInvoiceLine = {
      id: `line-custom-${Date.now()}`,
      name: customName.trim(),
      brand: customBrand.trim() || 'Standard',
      sku: `DIRECT-${Date.now().toString().slice(-4)}`,
      unitPriceHT: price,
      quantity: qty,
      vatRate: customApplyVat ? (settings.defaultVatRate ?? 0.18) : 0,
      weightKg: 1,
      isCustom: true
    };

    setLines(prev => [...prev, newLine]);
    setCustomName('');
    setCustomPrice('');
    setCustomQty('1');
    setErrorMsg(null);
  };

  const handleUpdateLineQty = (id: string, delta: number) => {
    setLines(prev => prev.map(l => {
      if (l.id === id) {
        const next = Math.max(1, l.quantity + delta);
        return { ...l, quantity: next };
      }
      return l;
    }));
  };

  const handleUpdateLinePrice = (id: string, newPriceHT: number) => {
    setLines(prev => prev.map(l => {
      if (l.id === id) {
        return { ...l, unitPriceHT: Math.max(0, newPriceHT) };
      }
      return l;
    }));
  };

  const handleRemoveLine = (id: string) => {
    setLines(prev => prev.filter(l => l.id !== id));
  };

  // Calculations
  const subtotalHT = useMemo(() => {
    return lines.reduce((acc, l) => acc + (l.unitPriceHT * l.quantity), 0);
  }, [lines]);

  const totalVat = useMemo(() => {
    return lines.reduce((acc, l) => acc + Math.round(l.unitPriceHT * l.quantity * l.vatRate), 0);
  }, [lines]);

  const grandTotalTTC = subtotalHT + totalVat;

  const handleCreateAndFinalize = async () => {
    setErrorMsg(null);
    if (lines.length === 0) {
      setErrorMsg("Veuillez ajouter au moins un équipement ou une prestation à la facture.");
      return;
    }
    if (!customerName.trim() && !customerCompany.trim()) {
      setErrorMsg("Veuillez renseigner le nom du client ou de la société.");
      return;
    }

    setIsSubmitting(true);

    try {
      const now = new Date();
      const prefix = docType === 'invoice' ? 'FAC-DIR' : 'DEV-DIR';
      const orderNumber = `${prefix}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(1000 + Math.random() * 9000))}`;

      // Convert lines to OrderItem format
      const orderItems: OrderItem[] = lines.map(l => ({
        id: l.id,
        productId: l.productId ? Number(l.productId) || 1 : Math.floor(Math.random() * 100000),
        name: l.name,
        price: l.unitPriceHT,
        originalSupplierPrice: Math.round(l.unitPriceHT * 0.65),
        originalSupplierCurrency: 'XOF',
        quantity: l.quantity,
        brand: l.brand,
        image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=300&auto=format&fit=crop&q=80',
        shippingMethod: 'air',
        freightCost: 0,
        supplierName: 'Stock Local Direct / Agence',
        supplierCountry: 'Sénégal',
        supplierPlatform: 'Vente Directe Comptoir',
        status: docType === 'invoice' && paymentStatus === 'Payé' ? 'Livré' : 'En attente'
      }));

      // Create official order
      const newOrder = catalogService.createOrder({
        customerName: customerName.trim() || customerCompany.trim(),
        customerCompany: customerCompany.trim() || undefined,
        customerEmail: customerEmail.trim() || `${(customerPhone || 'contact').replace(/[^a-zA-Z0-9]/g, '')}@zoneequipements.sn`,
        customerPhone: customerPhone.trim() || '+221 33 000 00 00',
        customerAddress: customerAddress.trim() || 'Dakar, Sénégal',
        items: orderItems,
        subtotalHT: subtotalHT,
        totalTTC: grandTotalTTC,
        status: docType === 'quote' ? 'En attente' : paymentStatus === 'Payé' ? 'Payé' : 'Non payé',
        paymentStatus: docType === 'quote' ? 'Non payé' : paymentStatus,
        paymentMethod: docType === 'quote' ? 'Devis Proforma' : paymentMethod,
        trackingNumber: `DIR-${Date.now().toString().slice(-6)}`,
        orderNumber: orderNumber
      });

      // Also collect email to newsletter/client list if email exists
      if (customerEmail.trim()) {
        siteSettingsService.addNewsletterSubscriber(
          customerEmail.trim(),
          customerName.trim() || customerCompany.trim(),
          customerPhone.trim(),
          customerCompany.trim(),
          'facturation_directe'
        );
      }

      onSuccess(newOrder);
      onClose();
    } catch (err: any) {
      console.error("Erreur création facture directe:", err);
      setErrorMsg("Erreur lors de l'enregistrement de la facture.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-[#FF6600] flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>Facturation Directe & Vente Comptoir</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  POS & Devis
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Émettez des factures officielles ou devis sans commande web préalable. Synchronisation financière et d'inventaire immédiate.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Document Type & Payment Status Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Type de Document
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setDocType('invoice'); setPaymentStatus('Payé'); }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    docType === 'invoice'
                      ? 'bg-[#FF6600] text-white shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Facture Directe
                </button>
                <button
                  type="button"
                  onClick={() => { setDocType('quote'); setPaymentStatus('Non payé'); }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    docType === 'quote'
                      ? 'bg-[#003366] text-white shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Devis Proforma
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Statut Règlement
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
              >
                <option value="Payé">Payé (Encaissé sur place)</option>
                <option value="Non payé">Non payé (À terme / En attente)</option>
                <option value="Acompte">Acompte versé</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Moyen de Paiement
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
              >
                <option value="Espèces (Comptant)">Espèces (Comptant agence)</option>
                <option value="Wave">Wave Sénégal</option>
                <option value="Orange Money">Orange Money</option>
                <option value="Virement Bancaire B2B">Virement Bancaire B2B</option>
                <option value="Chèque">Chèque d'Entreprise</option>
              </select>
            </div>
          </div>

          {/* Client Information */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-orange-400 flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>Coordonnées de l'Acheteur / Société</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Nom / Interlocuteur *</label>
                <input
                  type="text"
                  placeholder="Ex: Ibrahima Diallo"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Société / Entreprise</label>
                <input
                  type="text"
                  placeholder="Ex: Sahel Industries SARL"
                  value={customerCompany}
                  onChange={(e) => setCustomerCompany(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Téléphone (Wave / Contact)</label>
                <input
                  type="text"
                  placeholder="Ex: +221 77 000 00 00"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Email Client (Reçu / Devis)</label>
                <input
                  type="email"
                  placeholder="client@entreprise.sn"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">NINEA / RCCM (Optionnel)</label>
                <input
                  type="text"
                  placeholder="Ex: 009876543 2G3"
                  value={customerNinea}
                  onChange={(e) => setCustomerNinea(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Adresse Chantier / Livraison</label>
                <input
                  type="text"
                  placeholder="Ex: Zone Industrielle Km 12 Dakar"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Product Selector & Custom Line Adder */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-orange-400 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                <span>Lignes d'Équipements & Prestations</span>
              </h3>
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher dans le catalogue..."
                  value={searchProductQuery}
                  onFocus={() => setShowProductPicker(true)}
                  onChange={(e) => { setSearchProductQuery(e.target.value); setShowProductPicker(true); }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />

                {/* Dropdown catalog picker */}
                {showProductPicker && filteredProducts.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-56 overflow-y-auto z-20">
                    {filteredProducts.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleAddProductLine(p)}
                        className="w-full text-left p-2.5 hover:bg-slate-800 border-b border-slate-800/80 flex items-center justify-between text-xs transition-colors cursor-pointer"
                      >
                        <div className="truncate pr-2">
                          <strong className="block text-white truncate">{p.name}</strong>
                          <span className="text-[10px] text-slate-400">{p.brand} • SKU: {p.ref}</span>
                        </div>
                        <span className="font-mono font-bold text-orange-400 shrink-0">
                          {p.price.toLocaleString('fr-FR')} F
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Manual Custom Item Add */}
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
              <div className="sm:col-span-4">
                <input
                  type="text"
                  placeholder="Désignation sur-mesure / prestation..."
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  placeholder="Marque"
                  value={customBrand}
                  onChange={(e) => setCustomBrand(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div className="sm:col-span-3">
                <input
                  type="number"
                  placeholder="Prix unitaire HT (FCFA)"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div className="sm:col-span-1">
                <input
                  type="number"
                  min="1"
                  placeholder="Qté"
                  value={customQty}
                  onChange={(e) => setCustomQty(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white text-center font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddCustomLine}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter</span>
                </button>
              </div>
            </div>

            {/* Added Lines Table */}
            {lines.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs border-2 border-dashed border-slate-800 rounded-xl">
                Aucun article ajouté. Utilisez la recherche catalogue ou le champ manuel ci-dessus pour ajouter des équipements.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                      <th className="py-2 px-2">Article / Réf</th>
                      <th className="py-2 px-2 text-right">Prix Unit. HT</th>
                      <th className="py-2 px-2 text-center">Quantité</th>
                      <th className="py-2 px-2 text-center">TVA (18%)</th>
                      <th className="py-2 px-2 text-right">Total HT</th>
                      <th className="py-2 px-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {lines.map((line) => {
                      const lineTotalHT = line.unitPriceHT * line.quantity;
                      return (
                        <tr key={line.id} className="hover:bg-slate-900/50">
                          <td className="py-2.5 px-2">
                            <strong className="block text-white">{line.name}</strong>
                            <span className="text-[10px] text-slate-400">{line.brand} • {line.sku}</span>
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <input
                              type="number"
                              value={line.unitPriceHT}
                              onChange={(e) => handleUpdateLinePrice(line.id, parseFloat(e.target.value) || 0)}
                              className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right font-mono text-xs text-white"
                            />
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <div className="inline-flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() => handleUpdateLineQty(line.id, -1)}
                                className="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-white"
                              >
                                -
                              </button>
                              <span className="w-6 text-center font-mono font-bold text-white">{line.quantity}</span>
                              <button
                                type="button"
                                onClick={() => handleUpdateLineQty(line.id, 1)}
                                className="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-white"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${line.vatRate > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                              {line.vatRate > 0 ? '+18%' : 'Exonéré'}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-white">
                            {lineTotalHT.toLocaleString('fr-FR')} F
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(line.id)}
                              className="text-slate-500 hover:text-red-400 p-1 transition-colors cursor-pointer"
                              title="Retirer la ligne"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Financial Summary */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-xs text-slate-400 space-y-1">
              <p>🏢 <strong>Émetteur :</strong> {settings.companyName || 'ZONE ÉQUIPEMENTS'}</p>
              <p>📍 <strong>Lieu de vente :</strong> Agence Siège Dakar (Comptoir & Facturation Directe)</p>
            </div>

            <div className="w-full sm:w-72 bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Sous-total Net HT :</span>
                <span className="font-mono font-bold text-white">{subtotalHT.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>TVA (18%) :</span>
                <span className="font-mono font-bold text-slate-300">{totalVat.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="pt-2 border-t border-slate-700 flex justify-between items-baseline">
                <span className="font-black text-white text-sm">TOTAL TTC :</span>
                <span className="font-mono font-black text-xl text-[#FF6600]">
                  {grandTotalTTC.toLocaleString('fr-FR')} <span className="text-xs">FCFA</span>
                </span>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400">
            {docType === 'invoice' ? '✅ La facture sera enregistrée dans le journal financier et les rapports comptables.' : '📄 Le devis proforma sera prêt à imprimer et archiver.'}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Annuler
            </button>

            <button
              type="button"
              disabled={isSubmitting || lines.length === 0}
              onClick={handleCreateAndFinalize}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-[#FF6600] hover:bg-orange-600 disabled:opacity-50 text-white font-black text-xs transition-all shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
            >
              {isSubmitting ? 'Émission en cours...' : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{docType === 'invoice' ? 'Émettre & Enregistrer Facture' : 'Générer Devis Proforma'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

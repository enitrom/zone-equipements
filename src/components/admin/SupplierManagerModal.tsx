import React, { useState, useEffect } from 'react';
import { X, Truck, DollarSign, Globe, Phone, Mail, Shield, Check, Building2, Package } from 'lucide-react';
import { Supplier, catalogService } from '../../services/catalogService';
import { ConfirmModal } from './ConfirmModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  supplierToEdit: Supplier | null;
  onSave?: (supplier: Partial<Supplier>) => void;
  onSupplierSaved?: () => void;
  onDelete?: (id: string, name: string) => void;
}

export const SupplierManagerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  supplierToEdit,
  onSave,
  onSupplierSaved,
  onDelete
}) => {
  const [form, setForm] = useState<Partial<Supplier>>({
    name: '',
    platform: 'Alibaba',
    country: 'Chine',
    currency: 'USD',
    shippingPriceRange: '$6 - $8 / kg',
    paymentTerms: '30% acompte, 70% avant expédition',
    avgLeadTimeDays: 14,
    rating: 4.8,
    isAutomatedCircuit: true,
    contactPhone: '',
    contactEmail: '',
    warehouseDeliveryFeeUSD: 25,
    warehouseDeliveryMinUSD: 15,
    warehouseDeliveryMaxUSD: 45,
    notes: ''
  });

  useEffect(() => {
    if (supplierToEdit) {
      setForm({ ...supplierToEdit });
    } else {
      setForm({
        name: '',
        platform: 'Alibaba',
        country: 'Chine',
        currency: 'USD',
        shippingPriceRange: '$6 - $8 / kg',
        paymentTerms: '30% acompte, 70% avant expédition',
        avgLeadTimeDays: 14,
        rating: 4.8,
        isAutomatedCircuit: true,
        contactPhone: '',
        contactEmail: '',
        warehouseDeliveryFeeUSD: 25,
        warehouseDeliveryMinUSD: 15,
        warehouseDeliveryMaxUSD: 45,
        notes: ''
      });
    }
  }, [supplierToEdit, isOpen]);

  const [showConfirm, setShowConfirm] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) {
      alert("Le nom du fournisseur est obligatoire.");
      return;
    }
    const cleanSupplier: Partial<Supplier> = {
      ...form,
      name: form.name.trim(),
      circuit: form.isAutomatedCircuit ? 'automatisé' : 'manuel',
      shippingMinMaxUSD: form.shippingMinMaxUSD || form.shippingPriceRange || '$6 - $8 / kg',
      leadTimeAvg: form.leadTimeAvg || `${form.avgLeadTimeDays || 14} jours`
    };

    if (supplierToEdit) {
      catalogService.updateSupplier(supplierToEdit.id, cleanSupplier);
    } else {
      catalogService.addSupplier(cleanSupplier);
    }

    if (onSave) onSave(cleanSupplier);
    if (onSupplierSaved) onSupplierSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-orange-600/20 text-[#FF6600] flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              {supplierToEdit ? `Modifier le Fournisseur : ${supplierToEdit.name}` : 'Nouveau Fournisseur Partenaire'}
            </h3>
            <p className="text-xs text-slate-400">
              Paramétrez les coordonnées, la devise, les délais et les frais de livraison vers l'entrepôt de transit.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-5">
          {/* Ligne 1: Nom & Plateforme */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Nom de l'entreprise / Usine *
              </label>
              <input
                type="text"
                required
                value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Shenzhen Mining Tech Co., Ltd."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6600]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Plateforme Sourcing
              </label>
              <select
                value={form.platform || 'Alibaba'}
                onChange={(e) => setForm({ ...form, platform: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6600]"
              >
                <option value="Alibaba">Alibaba (Trade Assurance)</option>
                <option value="1688">1688 (Chine Direct)</option>
                <option value="AliExpress">AliExpress B2B</option>
                <option value="Made-in-China">Made-in-China</option>
                <option value="Europe">Fournisseur Europe / UE</option>
                <option value="USA">Fournisseur USA</option>
                <option value="Local">Fournisseur Local / Régional (Sénégal/Afrique)</option>
              </select>
            </div>
          </div>

          {/* Ligne 2: Pays & Devise */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Pays d'Origine
              </label>
              <input
                type="text"
                value={form.country || ''}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                placeholder="Ex: Chine, Allemagne, USA, Turquie..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6600]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Devise de Facturation Fournisseur
              </label>
              <select
                value={form.currency || 'USD'}
                onChange={(e) => setForm({ ...form, currency: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6600]"
              >
                <option value="USD">USD ($ - Dollar US)</option>
                <option value="EUR">EUR (€ - Euro)</option>
                <option value="CNY">CNY (¥ - Yuan Chinois)</option>
                <option value="XOF">XOF (FCFA - Franc CFA)</option>
              </select>
            </div>
          </div>

          {/* Ligne 3: Contacts Fournisseur (WhatsApp & Email) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Téléphone WhatsApp Fournisseur
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={form.contactPhone || ''}
                  onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                  placeholder="Ex: +86 138 0000 0000 ou 221..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6600]"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Sert à l'envoi direct du Bon de Commande par WhatsApp.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Email Commercial Fournisseur
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={form.contactEmail || ''}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  placeholder="sales@supplier.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6600]"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Sert à l'envoi du Bon de Commande officiel par Email.</p>
            </div>
          </div>

          {/* Ligne 4: Fourchettes Frais de livraison vers Entrepôt de Transit */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-4 h-4" />
              Fourchette des Frais de Transport vers Entrepôt de Transit
            </h4>
            <p className="text-xs text-slate-400">
              Définissez manuellement la fourchette de frais de livraison nationale (de l'usine du fournisseur à votre entrepôt de groupage à Guangzhou/Shenzhen/Paris).
            </p>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Min estimé ($ USD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.warehouseDeliveryMinUSD ?? 15}
                  onChange={(e) => setForm({ ...form, warehouseDeliveryMinUSD: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF6600]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Max estimé ($ USD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.warehouseDeliveryMaxUSD ?? 45}
                  onChange={(e) => setForm({ ...form, warehouseDeliveryMaxUSD: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF6600]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Frais Moyen Retenu ($ USD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.warehouseDeliveryFeeUSD ?? 25}
                  onChange={(e) => setForm({ ...form, warehouseDeliveryFeeUSD: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-bold text-orange-400 focus:outline-none focus:border-[#FF6600]"
                />
              </div>
            </div>
          </div>

          {/* Ligne 5: Conditions de Paiement & Délais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Conditions de Paiement Fournisseur
              </label>
              <input
                type="text"
                value={form.paymentTerms || ''}
                onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                placeholder="Ex: 30% acompte, 70% avant départ"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6600]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Délai Moyen de Fabrication / Préparation (Jours)
              </label>
              <input
                type="number"
                min="1"
                value={form.avgLeadTimeDays || 14}
                onChange={(e) => setForm({ ...form, avgLeadTimeDays: parseInt(e.target.value) || 14 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6600]"
              />
            </div>
          </div>

          {/* Canal de communication par défaut */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Canal de Communication Préféré
              </label>
              <select
                value={form.communicationChannel || 'whatsapp'}
                onChange={(e) => setForm({ ...form, communicationChannel: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6600]"
              >
                <option value="whatsapp">📱 WhatsApp Direct (Recommandé)</option>
                <option value="email">✉️ Courrier Électronique (Email pro)</option>
                <option value="direct_chat">💬 Messagerie Directe / Alibaba Trade</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Code Agent Logistique Assigné
              </label>
              <input
                type="text"
                readOnly
                value="DKR628+AIR (Aérien) / DKR628+SEA (Maritime)"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-orange-400 font-mono"
              />
              <span className="text-[10px] text-slate-500">Code automatique intégré sur chaque bon de commande envoyé</span>
            </div>
          </div>

          {/* Modèle de message prédéfini */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Modèle de Message Prédéfini (Instructions Fournisseur)
            </label>
            <textarea
              rows={3}
              value={form.defaultMessageTemplate || "Bonjour, voici notre commande groupée Zone Équipements Sénégal. Veuillez appliquer le marquage de carton avec notre Code Agent obligatoire. Merci de nous transmettre le lien sécurisé pour règlement."}
              onChange={(e) => setForm({ ...form, defaultMessageTemplate: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#FF6600]"
            />
          </div>

          {/* Circuit automatisé checkbox */}
          <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
            <input
              type="checkbox"
              id="isAutomatedCircuit"
              checked={form.isAutomatedCircuit ?? true}
              onChange={(e) => setForm({ ...form, isAutomatedCircuit: e.target.checked })}
              className="w-4 h-4 rounded text-[#FF6600] focus:ring-[#FF6600] border-slate-700 bg-slate-900"
            />
            <label htmlFor="isAutomatedCircuit" className="text-xs text-slate-300 cursor-pointer">
              <span className="font-bold text-white block">Circuit d'approvisionnement automatisé</span>
              Génération automatique des bons de commande et consolidation des colis vers l'entrepôt
            </label>
          </div>

          {/* Boutons d'action */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            {supplierToEdit ? (
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                className="px-3.5 py-2 bg-red-950/50 hover:bg-red-900 text-red-300 border border-red-800/50 rounded-xl text-xs font-bold transition-all"
              >
                Supprimer ce fournisseur
              </button>
            ) : <div />}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#FF6600] hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-lg"
              >
                {supplierToEdit ? 'Enregistrer les Modifications' : 'Créer le Fournisseur'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {supplierToEdit && (
        <ConfirmModal
          isOpen={showConfirm}
          title="Supprimer ce fournisseur"
          message={`Confirmez-vous la suppression définitive du fournisseur "${supplierToEdit.name}" ?`}
          onConfirm={() => {
            catalogService.deleteSupplier(supplierToEdit.id);
            if (onDelete) onDelete(supplierToEdit.id, supplierToEdit.name);
            if (onSupplierSaved) onSupplierSaved();
            onClose();
          }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
};

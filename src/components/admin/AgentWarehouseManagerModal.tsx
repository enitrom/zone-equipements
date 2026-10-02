import React, { useState, useEffect } from 'react';
import {
  X, Plus, Edit3, Trash2, Save, Warehouse, Star, CheckCircle2,
  MapPin, Phone, User, Hash, FileText, Copy, Check, Building2, Plane, Ship, Globe
} from 'lucide-react';
import {
  catalogService,
  AgentWarehouse,
  Supplier,
  formatSupplierParcelLabel,
  formatWarehouseConsigneeLine,
  formatWarehouseFullAddress
} from '../../services/catalogService';
import {
  WORLD_COUNTRIES,
  DEFAULT_SUPPORTED_DELIVERY_COUNTRIES,
  resolveCanonicalCountryName,
  getSupportedDeliveryCountriesForWarehouse
} from '../../utils/countries';
import { siteSettingsService } from '../../services/siteSettingsService';

interface AgentWarehouseManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  inline?: boolean;
}

export const AgentWarehouseManagerModal: React.FC<AgentWarehouseManagerModalProps> = ({
  isOpen,
  onClose,
  onUpdated,
  inline = false
}) => {
  const [warehouses, setWarehouses] = useState<AgentWarehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Streamlined Form states (no redundant fields)
  const [name, setName] = useState('');
  const [identificationMode, setIdentificationMode] = useState<'agent_code' | 'standard_address'>('agent_code');
  const [agentCode, setAgentCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('Chine');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  // Per-warehouse supported delivery countries
  const [supportedDeliveryCountries, setSupportedDeliveryCountries] = useState<string[]>(() => {
    const siteList = siteSettingsService.getSettings().supportedDeliveryCountries;
    return Array.isArray(siteList) && siteList.length > 0 ? siteList : DEFAULT_SUPPORTED_DELIVERY_COUNTRIES;
  });
  const [newDeliveryCountry, setNewDeliveryCountry] = useState('Sénégal');

  // Per-warehouse freight services & tariffs
  const [offersAirFreight, setOffersAirFreight] = useState(true);
  const [offersSeaFreight, setOffersSeaFreight] = useState(true);
  const [airFreightPerKgXOF, setAirFreightPerKgXOF] = useState<number>(7000);
  const [airFreightDurationDays, setAirFreightDurationDays] = useState('7 à 12 jours');
  const [seaFreightPerKgXOF, setSeaFreightPerKgXOF] = useState<number>(1800);
  const [seaFreightPerCbmXOF, setSeaFreightPerCbmXOF] = useState<number>(240000);
  const [seaFreightDurationDays, setSeaFreightDurationDays] = useState('35 à 50 jours');

  useEffect(() => {
    if (isOpen || inline) {
      loadData();
    }
    const handleUpdate = () => {
      if (isOpen || inline) loadData();
    };
    window.addEventListener('agent_warehouses_updated', handleUpdate);
    window.addEventListener('suppliers_updated', handleUpdate);
    return () => {
      window.removeEventListener('agent_warehouses_updated', handleUpdate);
      window.removeEventListener('suppliers_updated', handleUpdate);
    };
  }, [isOpen, inline]);

  const loadData = () => {
    setWarehouses(catalogService.getAgentWarehouses());
    setSuppliers(catalogService.getSuppliers());
  };

  if (!isOpen && !inline) return null;

  const resetForm = () => {
    setName('');
    setIdentificationMode('agent_code');
    setAgentCode('');
    setFirstName('');
    setLastName('');
    setPhone('');
    setCountry('Chine');
    setAddress('');
    setNotes('');
    setIsDefault(warehouses.length === 0);
    const siteList = siteSettingsService.getSettings().supportedDeliveryCountries;
    setSupportedDeliveryCountries(Array.isArray(siteList) && siteList.length > 0 ? siteList : DEFAULT_SUPPORTED_DELIVERY_COUNTRIES);
    setNewDeliveryCountry('Sénégal');
    setOffersAirFreight(true);
    setOffersSeaFreight(true);
    setAirFreightPerKgXOF(7000);
    setAirFreightDurationDays('7 à 12 jours');
    setSeaFreightPerKgXOF(1800);
    setSeaFreightPerCbmXOF(240000);
    setSeaFreightDurationDays('35 à 50 jours');
    setEditingId(null);
    setIsAdding(false);
  };

  const handleStartAdd = (presetMode: 'agent_code' | 'standard_address' = 'agent_code') => {
    resetForm();
    setIdentificationMode(presetMode);
    setIsAdding(true);
  };

  const handleStartEdit = (wh: AgentWarehouse) => {
    setName(wh.name || '');
    setIdentificationMode(wh.identificationMode || (wh.agentCode ? 'agent_code' : 'standard_address'));
    setAgentCode(wh.agentCode || '');
    setFirstName(wh.firstName || '');
    setLastName(wh.lastName || '');
    setPhone(wh.phone || '');
    setCountry(resolveCanonicalCountryName(wh.country) || wh.country || '');
    setAddress(wh.address || formatWarehouseFullAddress(wh));
    setNotes(wh.notes || '');
    setIsDefault(Boolean(wh.isDefault));
    setSupportedDeliveryCountries(
      getSupportedDeliveryCountriesForWarehouse(wh, siteSettingsService.getSettings().supportedDeliveryCountries)
    );
    setNewDeliveryCountry('Sénégal');
    setOffersAirFreight(wh.offersAirFreight !== false);
    setOffersSeaFreight(wh.offersSeaFreight !== false);
    setAirFreightPerKgXOF(wh.airFreightPerKgXOF || 7000);
    setAirFreightDurationDays(wh.airFreightDurationDays || '7 à 12 jours');
    setSeaFreightPerKgXOF(wh.seaFreightPerKgXOF || 1800);
    setSeaFreightPerCbmXOF(wh.seaFreightPerCbmXOF || 240000);
    setSeaFreightDurationDays(wh.seaFreightDurationDays || '35 à 50 jours');
    setEditingId(wh.id);
    setIsAdding(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) return;

    const liveGeo = catalogService.inferWarehouseGeoProfile({
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      country: country.trim()
    });
    const effectiveCountry = liveGeo.aiConfident
      ? liveGeo.country
      : (resolveCanonicalCountryName(country) || country.trim() || liveGeo.country || undefined);

    const payload: Omit<AgentWarehouse, 'id'> = {
      name: name.trim(),
      identificationMode,
      agentCode: identificationMode === 'agent_code' ? (agentCode.trim() || undefined) : undefined,
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      companyName: undefined,
      phone: phone.trim(),
      email: undefined,
      address: address.trim(),
      city: liveGeo.city || undefined,
      postalCode: undefined,
      country: effectiveCountry,
      supportedDeliveryCountries: supportedDeliveryCountries.length > 0
        ? supportedDeliveryCountries
        : DEFAULT_SUPPORTED_DELIVERY_COUNTRIES,
      notes: notes.trim() || undefined,
      isDefault,
      offersAirFreight,
      offersSeaFreight: !offersAirFreight && !offersSeaFreight ? true : offersSeaFreight,
      airFreightPerKgXOF: Number(airFreightPerKgXOF) || 7000,
      airFreightDurationDays: airFreightDurationDays.trim() || '7 à 12 jours',
      seaFreightPerKgXOF: Number(seaFreightPerKgXOF) || 1800,
      seaFreightPerCbmXOF: Number(seaFreightPerCbmXOF) || 240000,
      seaFreightDurationDays: seaFreightDurationDays.trim() || '35 à 50 jours'
    };

    if (isAdding) {
      catalogService.addAgentWarehouse(payload);
    } else if (editingId) {
      catalogService.updateAgentWarehouse(editingId, payload);
    }

    loadData();
    resetForm();
    if (onUpdated) onUpdated();
  };

  const handleSetDefault = (id: string) => {
    catalogService.setDefaultAgentWarehouse(id);
    loadData();
    if (onUpdated) onUpdated();
  };

  const handleDelete = (id: string) => {
    catalogService.deleteAgentWarehouse(id);
    setDeleteConfirmId(null);
    loadData();
    if (onUpdated) onUpdated();
  };

  const handleCopyAddressBlock = (wh: AgentWarehouse) => {
    const consignee = formatWarehouseConsigneeLine(wh);
    const fullAddr = formatWarehouseFullAddress(wh);
    const labelSample = formatSupplierParcelLabel(wh.agentCode, 'sea', 'CMD-EXEMPLE', wh);
    const text = [
      `ENTREPÔT : ${wh.name}`,
      `DESTINATAIRE : ${consignee}`,
      wh.phone ? `TÉL : ${wh.phone}` : '',
      `ADRESSE : ${fullAddr}`,
      `ÉTIQUETTE COLIS : ${labelSample}`,
      wh.notes ? `INSTRUCTIONS : ${wh.notes}` : ''
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(text);
    setCopiedId(wh.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const previewWarehouse: AgentWarehouse = {
    id: editingId || 'preview',
    name: name || 'Entrepôt Agent',
    identificationMode,
    agentCode: identificationMode === 'agent_code' ? (agentCode || 'DKR628') : undefined,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    phone: phone || '+33 6 00 00 00 00',
    address: address || 'Adresse complète de réception...',
    notes: notes || undefined,
    isDefault
  };

  const content = (
    <div className={inline ? "space-y-6" : "p-6 overflow-y-auto flex-1 space-y-6"}>
      {/* Action bar */}
      {!isAdding && !editingId && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#003366] text-white flex items-center justify-center shrink-0">
              <Warehouse className="w-6 h-6 text-[#FF6600]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Entrepôts d'Agents & Adresses de Réception ({warehouses.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configurez vos adresses de transit avec Code Agent ou en méthode Standard (Prénom, Nom, Adresse). L'entrepôt par défaut s'applique automatiquement aux fournisseurs sans entrepôt dédié.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleStartAdd('agent_code')}
              className="inline-flex items-center gap-2 bg-[#FF6600] hover:bg-[#e65c00] text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              + Nouvel Entrepôt
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Form */}
      {(isAdding || editingId) && (
        <form onSubmit={handleSave} className="bg-white text-black p-6 rounded-2xl border-2 border-[#003366]/20 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-[#FF6600]" />
              {isAdding ? 'Nouvel Entrepôt de Réception' : 'Modifier l\'Entrepôt'}
            </h3>
            <label className="inline-flex items-center gap-2 cursor-pointer select-none bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={e => setIsDefault(e.target.checked)}
                className="rounded text-[#FF6600] focus:ring-[#FF6600]"
              />
              <Star className={`w-4 h-4 ${isDefault ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
              <span className="text-xs font-bold text-amber-900">Définir comme Entrepôt par Défaut</span>
            </label>
          </div>

          {/* Identification Mode Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIdentificationMode('agent_code')}
              className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-start gap-3 cursor-pointer ${
                identificationMode === 'agent_code'
                  ? 'border-[#003366] bg-blue-50/70 shadow-2xs'
                  : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                identificationMode === 'agent_code' ? 'bg-[#003366] text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                <Hash className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Mode 1 : Avec Code Agent
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Pour les transitaires utilisant un code d'identification client sur l'étiquette (ex: DKR628).
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIdentificationMode('standard_address')}
              className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-start gap-3 cursor-pointer ${
                identificationMode === 'standard_address'
                  ? 'border-[#FF6600] bg-orange-50/70 shadow-2xs'
                  : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                identificationMode === 'standard_address' ? 'bg-[#FF6600] text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                <User className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Mode 2 : Standard (Nom, Prénom, Adresse)
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Sans code agent : expédition nominative standard avec Prénom, Nom, Téléphone et Adresse complète.
                </p>
              </div>
            </button>
          </div>

          {/* Streamlined Fields without redundancy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={identificationMode === 'agent_code' ? 'sm:col-span-1' : 'sm:col-span-1'}>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Libellé de l'entrepôt *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={identificationMode === 'agent_code' ? 'Ex: Cargo Guangzhou' : 'Ex: Entrepôt Paris'}
                className="w-full px-3 py-2 text-sm text-black placeholder:text-slate-400 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003366] focus:outline-none bg-white"
              />
            </div>

            {identificationMode === 'agent_code' && (
              <div>
                <label className="block text-xs font-bold text-[#003366] mb-1">
                  Code Agent *
                </label>
                <input
                  type="text"
                  required
                  value={agentCode}
                  onChange={e => setAgentCode(e.target.value)}
                  placeholder="Ex: DKR628"
                  className="w-full px-3 py-2 text-sm text-black placeholder:text-slate-400 font-mono font-bold border-2 border-[#003366]/40 rounded-xl focus:ring-2 focus:ring-[#003366] focus:outline-none bg-white"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Prénom {identificationMode === 'standard_address' ? '*' : '(Optionnel)'}
              </label>
              <input
                type="text"
                required={identificationMode === 'standard_address' && !lastName.trim()}
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Ex: Moussa"
                className="w-full px-3 py-2 text-sm text-black placeholder:text-slate-400 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003366] focus:outline-none bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nom {identificationMode === 'standard_address' ? '*' : '(Optionnel)'}
              </label>
              <input
                type="text"
                required={identificationMode === 'standard_address' && !firstName.trim()}
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Ex: Diop"
                className="w-full px-3 py-2 text-sm text-black placeholder:text-slate-400 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003366] focus:outline-none bg-white"
              />
            </div>

            <div className={identificationMode === 'agent_code' ? 'sm:col-span-2 lg:col-span-1' : 'sm:col-span-1'}>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Téléphone de réception *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Ex: +86 138 0000 0000"
                className="w-full px-3 py-2 text-sm text-black placeholder:text-slate-400 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003366] focus:outline-none bg-white"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs font-bold text-[#003366] mb-1 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-[#FF6600]" />
                Pays (Secours si l'IA est confuse)
              </label>
              <select
                value={resolveCanonicalCountryName(country) || country || ''}
                onChange={e => setCountry(e.target.value)}
                className="w-full px-3 py-2 text-sm font-bold border-2 border-[#003366]/30 rounded-xl focus:ring-2 focus:ring-[#003366] focus:outline-none bg-white text-black"
              >
                <option value="">🤖 Auto (Détection IA prioritaire)</option>
                {WORLD_COUNTRIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {(() => {
                const liveWhGeo = catalogService.inferWarehouseGeoProfile({
                  name,
                  address,
                  phone,
                  country
                });
                return liveWhGeo.aiConfident ? (
                  <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                    🤖 IA : <strong>{liveWhGeo.country} ({liveWhGeo.city})</strong> trouvé via l'adresse/tél.
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
                    ⚠️ IA sans indice clair : le pays sélectionné ({country || 'à choisir'}) sert de secours.
                  </span>
                );
              })()}
            </div>

            <div className={identificationMode === 'agent_code' ? 'sm:col-span-2 lg:col-span-2' : 'sm:col-span-2 lg:col-span-3'}>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Adresse complète (Rue, Code postal, Ville) *
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Ex: Room 102, Baiyun Logistics Park, Guangzhou (ou 14 Rue de l'Industrie, 75011 Paris)"
                className="w-full px-3 py-2 text-sm text-black placeholder:text-slate-400 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003366] focus:outline-none bg-white"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Note ou instruction courte pour le fournisseur (Optionnel)
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ex: Mentionner l'étiquette sur le carton extérieur avant expédition"
                className="w-full px-3 py-2 text-sm text-black placeholder:text-slate-400 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003366] focus:outline-none bg-white"
              />
            </div>
          </div>

          {/* Supported Delivery Countries for this Warehouse */}
          <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  Pays Livrés par cet Entrepôt ({supportedDeliveryCountries.length} pays pris en charge)
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Définissez les pays de destination finale dans lesquels cet entrepôt assure la livraison aux clients. Le pays par défaut du client est vérifié automatiquement lors de l'achat.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const siteList = siteSettingsService.getSettings().supportedDeliveryCountries;
                  setSupportedDeliveryCountries(Array.isArray(siteList) && siteList.length > 0 ? siteList : DEFAULT_SUPPORTED_DELIVERY_COUNTRIES);
                }}
                className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-white border border-emerald-300 px-2.5 py-1 rounded-lg cursor-pointer"
              >
                ↺ Réinitialiser aux pays par défaut
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {supportedDeliveryCountries.map(destCountry => (
                <span
                  key={destCountry}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-900 text-xs font-bold shadow-2xs"
                >
                  <span>🌍 {destCountry}</span>
                  <button
                    type="button"
                    onClick={() => setSupportedDeliveryCountries(prev => prev.filter(c => c !== destCountry))}
                    className="text-slate-400 hover:text-red-600 cursor-pointer"
                    title={`Retirer ${destCountry}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
              {supportedDeliveryCountries.length === 0 && (
                <span className="text-xs text-amber-700 italic">
                  Aucun pays sélectionné — veuillez ajouter au moins un pays de livraison pris en charge.
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <select
                value={newDeliveryCountry}
                onChange={e => setNewDeliveryCountry(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold border border-emerald-300 rounded-xl bg-white text-black focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {WORLD_COUNTRIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  if (newDeliveryCountry && !supportedDeliveryCountries.includes(newDeliveryCountry)) {
                    setSupportedDeliveryCountries(prev => [...prev, newDeliveryCountry]);
                  }
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter ce pays à livrer
              </button>
            </div>
          </div>

          {/* Per-Warehouse Services & Tariffs */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-[#003366]">
                  Services de Fret & Tarifs Propres à cet Entrepôt
                </h4>
                <p className="text-[11px] text-slate-500">
                  Lors de l'ajout d'un produit rattaché à cet entrepôt, ces tarifs et modes de transport s'appliquent automatiquement sans re-paramétrage.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Air Freight Service Box */}
              <div className={`rounded-xl border-2 p-3.5 transition-all ${
                offersAirFreight ? 'border-orange-300 bg-orange-50/40' : 'border-slate-200 bg-white opacity-60'
              }`}>
                <label className="flex items-center justify-between cursor-pointer mb-2.5">
                  <span className="inline-flex items-center gap-2 text-xs font-extrabold text-slate-900">
                    <Plane className="w-4 h-4 text-[#FF6600]" />
                    Propose le Fret Aérien Express
                  </span>
                  <input
                    type="checkbox"
                    checked={offersAirFreight}
                    onChange={e => setOffersAirFreight(e.target.checked)}
                    className="rounded text-[#FF6600] focus:ring-[#FF6600]"
                  />
                </label>
                {offersAirFreight && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Tarif Aérien (FCFA / kg)</label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={airFreightPerKgXOF}
                        onChange={e => setAirFreightPerKgXOF(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs text-black placeholder:text-slate-400 font-bold border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Délai Aérien estimé</label>
                      <input
                        type="text"
                        value={airFreightDurationDays}
                        onChange={e => setAirFreightDurationDays(e.target.value)}
                        placeholder="7 à 12 jours"
                        className="w-full px-2.5 py-1.5 text-xs text-black placeholder:text-slate-400 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Sea Freight Service Box */}
              <div className={`rounded-xl border-2 p-3.5 transition-all ${
                offersSeaFreight ? 'border-blue-300 bg-blue-50/40' : 'border-slate-200 bg-white opacity-60'
              }`}>
                <label className="flex items-center justify-between cursor-pointer mb-2.5">
                  <span className="inline-flex items-center gap-2 text-xs font-extrabold text-slate-900">
                    <Ship className="w-4 h-4 text-blue-600" />
                    Propose le Fret Maritime Conteneur
                  </span>
                  <input
                    type="checkbox"
                    checked={offersSeaFreight}
                    onChange={e => setOffersSeaFreight(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-600"
                  />
                </label>
                {offersSeaFreight && (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Tarif / kg (FCFA)</label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={seaFreightPerKgXOF}
                        onChange={e => setSeaFreightPerKgXOF(Number(e.target.value))}
                        className="w-full px-2 py-1.5 text-xs text-black placeholder:text-slate-400 font-bold border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Tarif / m³ (FCFA)</label>
                      <input
                        type="number"
                        min="0"
                        step="5000"
                        value={seaFreightPerCbmXOF}
                        onChange={e => setSeaFreightPerCbmXOF(Number(e.target.value))}
                        className="w-full px-2 py-1.5 text-xs text-black placeholder:text-slate-400 font-bold border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Délai Maritime</label>
                      <input
                        type="text"
                        value={seaFreightDurationDays}
                        onChange={e => setSeaFreightDurationDays(e.target.value)}
                        placeholder="35 à 50 jours"
                        className="w-full px-2 py-1.5 text-xs text-black placeholder:text-slate-400 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Aperçu sur la Fiche Fournisseur
              </div>
              <div className="text-xs font-bold text-slate-900">
                Destinataire : <span className="text-[#003366]">{formatWarehouseConsigneeLine(previewWarehouse)}</span>
              </div>
              <div className="text-xs text-slate-600">
                Adresse : {formatWarehouseFullAddress(previewWarehouse)} • Tél : {previewWarehouse.phone}
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl shrink-0">
              <div className="text-[10px] font-bold text-amber-800 uppercase">Aperçu Étiquette Colis</div>
              <div className="text-xs font-mono font-black text-slate-900 mt-0.5">
                {formatSupplierParcelLabel(previewWarehouse.agentCode, 'sea', 'CMD-2026-01', previewWarehouse)}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 font-bold text-xs hover:bg-slate-100 cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4" /> Enregistrer l'entrepôt
            </button>
          </div>
        </form>
      )}

      {/* Warehouses List */}
      {warehouses.length === 0 && !isAdding && !editingId && (
        <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center space-y-3">
          <Warehouse className="w-10 h-10 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-slate-800">
              Aucun entrepôt d'agent configuré (Zéro entrepôt fictif)
            </h3>
            <p className="text-xs text-slate-500 max-w-lg mx-auto">
              Tous les entrepôts sont 100% réels et persistants. Cliquez sur « + Nouvel Entrepôt » ci-dessus pour créer votre premier entrepôt de transit avec son pays et ses tarifs propres.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {warehouses.map(wh => {
          const linkedSuppliers = suppliers.filter(s => s.agentWarehouseId === wh.id);
          const isStandard = wh.identificationMode === 'standard_address' || !wh.agentCode;
          const sampleLabel = formatSupplierParcelLabel(wh.agentCode, 'sea', 'CMD-101', wh);
          const whSupportedCountries = getSupportedDeliveryCountriesForWarehouse(
            wh,
            siteSettingsService.getSettings().supportedDeliveryCountries
          );

          return (
            <div
              key={wh.id}
              className={`rounded-2xl border-2 p-5 transition-all flex flex-col justify-between gap-4 ${
                wh.isDefault
                  ? 'border-[#003366] bg-blue-50/20 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-extrabold text-slate-900 text-base">{wh.name}</h4>
                      {wh.country && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                          <Globe className="w-3 h-3 text-emerald-600" /> {wh.country}
                        </span>
                      )}
                      {wh.isDefault && (
                        <span className="inline-flex items-center gap-1 bg-[#003366] text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Par Défaut
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        isStandard
                          ? 'bg-orange-50 text-orange-800 border-orange-200'
                          : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                      }`}>
                        {isStandard ? (
                          <><User className="w-3 h-3" /> Standard (Nom / Prénom / Adresse)</>
                        ) : (
                          <><Hash className="w-3 h-3" /> Code Agent : {wh.agentCode}</>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyAddressBlock(wh)}
                      className="p-2 text-slate-500 hover:text-[#003366] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Copier les coordonnées complètes"
                    >
                      {copiedId === wh.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(wh)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Modifier cet entrepôt"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {warehouses.length >= 1 && (
                      deleteConfirmId === wh.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDelete(wh.id)}
                            className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded-lg cursor-pointer"
                          >
                            Confirmer
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg cursor-pointer"
                          >
                            Non
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(wh.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Coordinates Details */}
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-1.5 text-xs">
                  <div className="flex items-start gap-2">
                    <User className="w-3.5 h-3.5 text-[#003366] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-700">Destinataire : </span>
                      <span className="font-semibold text-slate-900">{formatWarehouseConsigneeLine(wh)}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#FF6600] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-700">Adresse : </span>
                      <span className="text-slate-800">{formatWarehouseFullAddress(wh)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-bold text-slate-700">Téléphone : </span>
                    <span className="font-mono font-bold text-slate-900">{wh.phone || 'Non renseigné'}</span>
                  </div>
                  <div className="flex items-start gap-2 pt-1 border-t border-slate-200/60">
                    <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-700">Pays livrés ({whSupportedCountries.length}) : </span>
                      <span className="text-slate-800">{whSupportedCountries.join(', ')}</span>
                    </div>
                  </div>
                  {wh.notes && (
                    <div className="flex items-start gap-2 pt-1 border-t border-slate-200/60 text-slate-600">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="italic">{wh.notes}</span>
                    </div>
                  )}
                </div>

                {/* Label format preview */}
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    Étiquette générée :
                  </span>
                  <span className="font-mono text-xs font-black text-slate-900 truncate">
                    {sampleLabel}
                  </span>
                </div>

                {/* Services & Tariffs Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className={`rounded-xl px-3 py-2 border text-[11px] flex items-center justify-between ${
                    wh.offersAirFreight !== false
                      ? 'bg-orange-50/70 border-orange-200 text-orange-950'
                      : 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                  }`}>
                    <span className="font-bold inline-flex items-center gap-1.5">
                      <Plane className="w-3.5 h-3.5 text-[#FF6600]" />
                      Fret Aérien
                    </span>
                    {wh.offersAirFreight !== false ? (
                      <span className="font-extrabold text-[#FF6600]">
                        {(wh.airFreightPerKgXOF || 7000).toLocaleString('fr-FR')} F/kg • {wh.airFreightDurationDays || '7-12j'}
                      </span>
                    ) : (
                      <span>Non proposé</span>
                    )}
                  </div>

                  <div className={`rounded-xl px-3 py-2 border text-[11px] flex items-center justify-between ${
                    wh.offersSeaFreight !== false
                      ? 'bg-blue-50/70 border-blue-200 text-blue-950'
                      : 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                  }`}>
                    <span className="font-bold inline-flex items-center gap-1.5">
                      <Ship className="w-3.5 h-3.5 text-blue-600" />
                      Fret Maritime
                    </span>
                    {wh.offersSeaFreight !== false ? (
                      <span className="font-extrabold text-blue-700">
                        {(wh.seaFreightPerKgXOF || 1800).toLocaleString('fr-FR')} F/kg • {wh.seaFreightDurationDays || '35-50j'}
                      </span>
                    ) : (
                      <span>Non proposé</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer: Default toggle & linked suppliers */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                <div className="text-[11px] text-slate-500">
                  {linkedSuppliers.length > 0 ? (
                    <span className="font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {linkedSuppliers.length} fournisseur(s) assigné(s) : {linkedSuppliers.map(s => s.name).join(', ')}
                    </span>
                  ) : wh.isDefault ? (
                    <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Utilisé par défaut pour tous les fournisseurs
                    </span>
                  ) : (
                    <span>Aucun fournisseur assigné spécifiquement</span>
                  )}
                </div>

                {!wh.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(wh.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#003366] hover:text-[#FF6600] bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                  >
                    <Star className="w-3.5 h-3.5" /> Définir par défaut
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#003366] text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#FF6600] flex items-center justify-center shadow-lg">
              <Warehouse className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
                Entrepôts d'Agents & Adresses de Réception
              </h2>
              <p className="text-xs text-blue-200">
                Gérez vos entrepôts avec Code Agent ou en méthode Standard (Nom, Prénom, Adresse).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-blue-200 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {content}

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center">
          <p className="text-xs text-slate-500">
            Astuce : vous pouvez associer un entrepôt spécifique à chaque fournisseur dans l'onglet « Fournisseurs ».
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

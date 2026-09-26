import React, { useState, useEffect } from 'react';
import { 
  Settings, Shield, CheckCircle2,
  DollarSign, RefreshCw, FileText, Phone, Mail, MapPin, Globe, ShieldCheck, UserCheck,
  Tag, Percent, Plus, Trash2, Calendar, AlertCircle, Clock
} from 'lucide-react';
import { siteSettingsService, SiteSettings, PromoCode } from '../../services/siteSettingsService';
import { useAuth, ADMIN_EMAILS } from '../../AuthContext';
import { ImageUploadInput } from '../ImageUploadInput';

interface Props {
  onNotify?: (msg: string) => void;
}

export const SiteSettingsManager: React.FC<Props> = ({ onNotify }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SiteSettings>(() => siteSettingsService.getSettings());
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>(() => siteSettingsService.getPromoCodes());
  const [saveMsg, setSaveMsg] = useState('');

  // Promo code creation form
  const [newPromoCode, setNewPromoCode] = useState<Partial<PromoCode>>({
    code: '',
    discountType: 'percent',
    discountValue: 10,
    minOrderAmount: 0,
    maxUses: 0,
    isActive: true,
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    expiryDate: ''
  });
  const [promoMsg, setPromoMsg] = useState('');

  useEffect(() => {
    const unsub = siteSettingsService.subscribe(() => {
      setSettings(siteSettingsService.getSettings());
      setPromoCodes(siteSettingsService.getPromoCodes());
    });
    return () => unsub();
  }, []);

  // Local string representation for numeric inputs to avoid jumping/resetting during typing
  const [formInputs, setFormInputs] = useState(() => {
    const s = siteSettingsService.getSettings();
    return {
      usdExchangeRate: String(s.usdExchangeRate ?? 610),
      eurExchangeRate: String(s.eurExchangeRate ?? 655.957),
      cnyExchangeRate: String(s.cnyExchangeRate ?? 85),
      airFreightPerKgXOF: String(s.airFreightPerKgXOF ?? 7500),
      seaFreightPerKgXOF: String(s.seaFreightPerKgXOF ?? 1800),
      seaFreightPerCbmXOF: String(s.seaFreightPerCbmXOF ?? 250000),
      transitInsuranceRate: String(Math.round((s.transitInsuranceRate ?? 0.05) * 100)),
      defaultMarginRate: String(Math.round((s.defaultMarginRate ?? 0.35) * 100)),
      globalDiscountPercent: String(s.globalDiscountPercent ?? 5)
    };
  });

  const handleInputChange = (field: keyof typeof formInputs, value: string) => {
    setFormInputs(prev => ({ ...prev, [field]: value }));
    const num = parseFloat(value);
    if (!isNaN(num)) {
      if (field === 'transitInsuranceRate') {
        setSettings(prev => ({ ...prev, transitInsuranceRate: num / 100 }));
      } else if (field === 'defaultMarginRate') {
        setSettings(prev => ({ ...prev, defaultMarginRate: num / 100 }));
      } else if (field === 'globalDiscountPercent') {
        setSettings(prev => ({ ...prev, globalDiscountPercent: num }));
      } else {
        setSettings(prev => ({ ...prev, [field]: num }));
      }
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSettings: SiteSettings = {
      ...settings,
      usdExchangeRate: parseFloat(formInputs.usdExchangeRate) || 610,
      eurExchangeRate: parseFloat(formInputs.eurExchangeRate) || 655.957,
      cnyExchangeRate: parseFloat(formInputs.cnyExchangeRate) || 85,
      airFreightPerKgXOF: parseFloat(formInputs.airFreightPerKgXOF) || 7500,
      seaFreightPerKgXOF: parseFloat(formInputs.seaFreightPerKgXOF) || 1800,
      seaFreightPerCbmXOF: parseFloat(formInputs.seaFreightPerCbmXOF) || 250000,
      transitInsuranceRate: (parseFloat(formInputs.transitInsuranceRate) || 5) / 100,
      defaultMarginRate: (parseFloat(formInputs.defaultMarginRate) || 35) / 100,
      globalDiscountPercent: parseFloat(formInputs.globalDiscountPercent) || 5
    };
    siteSettingsService.updateSettings(cleanSettings);
    setSettings(cleanSettings);
    setSaveMsg('Paramètres généraux et barèmes enregistrés avec succès.');
    setTimeout(() => setSaveMsg(''), 3500);
    if (onNotify) onNotify('Paramètres du site mis à jour.');
  };

  const handleCreatePromoCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoCode.code?.trim()) {
      alert("Veuillez saisir un code promo (ex: DAKAR2026, BIENVENUE10).");
      return;
    }

    const created = siteSettingsService.savePromoCode({
      code: newPromoCode.code.trim().toUpperCase(),
      discountType: newPromoCode.discountType || 'percent',
      discountValue: Number(newPromoCode.discountValue) || 10,
      minOrderAmount: Number(newPromoCode.minOrderAmount) || 0,
      maxUses: Number(newPromoCode.maxUses) || 0,
      usedCount: 0,
      startDate: newPromoCode.startDate || new Date().toISOString().split('T')[0],
      expiryDate: newPromoCode.expiryDate || undefined,
      isActive: newPromoCode.isActive !== false,
      description: newPromoCode.description || undefined
    });

    setPromoCodes(siteSettingsService.getPromoCodes());
    setNewPromoCode({
      code: '',
      discountType: 'percent',
      discountValue: 10,
      minOrderAmount: 0,
      maxUses: 0,
      isActive: true,
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      expiryDate: ''
    });
    setPromoMsg(`Code promo "${created.code}" créé avec succès.`);
    setTimeout(() => setPromoMsg(''), 3500);
    if (onNotify) onNotify(`Code promo ${created.code} ajouté.`);
  };

  const handleTogglePromoStatus = (promo: PromoCode) => {
    siteSettingsService.savePromoCode({
      ...promo,
      isActive: !promo.isActive
    });
    setPromoCodes(siteSettingsService.getPromoCodes());
  };

  const handleDeletePromo = (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer définitivement ce code promo ?")) {
      siteSettingsService.deletePromoCode(id);
      setPromoCodes(siteSettingsService.getPromoCodes());
      if (onNotify) onNotify('Code promo supprimé.');
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. GESTION DES COMPTES ADMINISTRATEURS & DROITS D'ACCÈS */}
      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-[#FF6600] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Droits d'Administration & Comptes Autorisés
            </h3>
            <p className="text-xs text-slate-400">
              L'authentification par clé a été retirée. L'accès au back-office est garanti pour vos deux comptes administrateurs.
            </p>
          </div>
        </div>

        {/* Info sur la suppression de la clé */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 leading-relaxed mb-6 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Authentification par clé désactivée définitivement</span>
          </div>
          <p className="text-slate-400">
            Plus aucun mot de passe temporaire, passkey ou paramètre d'URL n'est requis. Dès que vous vous connectez avec l'un des deux comptes ci-dessous, vos droits d'administration sont appliqués automatiquement et sans risque de redirection inattendue.
          </p>
        </div>

        {/* Liste des comptes administrateurs */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
            Comptes Administrateurs Vérifiés (Accès Total)
          </label>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ADMIN_EMAILS.map((email) => {
              const isCurrent = user?.email?.toLowerCase() === email.toLowerCase();
              return (
                <div 
                  key={email}
                  className={`p-4 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                    isCurrent 
                      ? 'bg-emerald-950/30 border-emerald-500/50 shadow-sm shadow-emerald-900/20' 
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isCurrent ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate font-mono">{email}</p>
                      <p className="text-[10px] text-slate-400">Administrateur Principal</p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 flex items-center gap-1 ${
                    isCurrent 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
                    {isCurrent ? 'Connecté' : 'Autorisé'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. PARAMÉTRAGE TVA & FRAIS FINANCIERS */}
      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-orange-600/20 text-orange-400 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              Paramètres Financiers, TVA & Taux de Change
            </h3>
            <p className="text-xs text-slate-400">
              Activez, désactivez ou ignorez la TVA (18%), et réglez les taux de conversion et les barèmes de transport.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="mt-5 space-y-5">
          {/* TVA CONFIGURATION */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="font-bold text-sm text-white block">
                Application de la TVA (18%) sur les Devis et Ventes
              </span>
              <span className="text-xs text-slate-400">
                Vous pouvez désactiver ou ignorer la TVA pour les clients export, entreprises exonérées ou régimes sous douane.
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSettings({ ...settings, applyVatByDefault: !settings.applyVatByDefault })}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  settings.applyVatByDefault
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                }`}
              >
                {settings.applyVatByDefault ? 'TVA 18% Activée par Défaut' : 'TVA Désactivée / Ignorée (0%)'}
              </button>
            </div>
          </div>

          {/* TAUX DE CHANGE */}
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Taux de Change des Devises d'Approvisionnement (vers FCFA / XOF)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  1 USD ($) en FCFA
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formInputs.usdExchangeRate}
                  onChange={(e) => handleInputChange('usdExchangeRate', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                  placeholder="610"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  1 EUR (€) en FCFA
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formInputs.eurExchangeRate}
                  onChange={(e) => handleInputChange('eurExchangeRate', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                  placeholder="655.957"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  1 CNY (¥ Yuan) en FCFA
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formInputs.cnyExchangeRate}
                  onChange={(e) => handleInputChange('cnyExchangeRate', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                  placeholder="85"
                />
              </div>
            </div>
          </div>

          {/* FRAIS DE FRET & ASSURANCE */}
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Barèmes Moyens de Fret International vers Dakar (Maritime & Aérien)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Fret Maritime (FCFA / kg)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formInputs.seaFreightPerKgXOF}
                  onChange={(e) => handleInputChange('seaFreightPerKgXOF', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                  placeholder="1800"
                />
                <span className="text-[10px] text-slate-500 block mt-1">Tarif au poids par kg</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Fret Maritime (FCFA / CBM m³)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formInputs.seaFreightPerCbmXOF}
                  onChange={(e) => handleInputChange('seaFreightPerCbmXOF', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                  placeholder="250000"
                />
                <span className="text-[10px] text-slate-500 block mt-1">Tarif au volume par m³</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Fret Aérien Express (FCFA / kg)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formInputs.airFreightPerKgXOF}
                  onChange={(e) => handleInputChange('airFreightPerKgXOF', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                  placeholder="7500"
                />
                <span className="text-[10px] text-slate-500 block mt-1">Avion rapide (7-12 jours)</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Assurance Transit (%)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formInputs.transitInsuranceRate}
                  onChange={(e) => handleInputChange('transitInsuranceRate', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                  placeholder="5"
                />
                <span className="text-[10px] text-slate-500 block mt-1">% valeur marchandise</span>
              </div>
            </div>

            {/* DURÉES DES MODES DE FRET PAR DÉFAUT */}
            <div className="pt-3 border-t border-slate-800/80">
              <h5 className="text-[11px] font-bold text-orange-400 uppercase tracking-wider mb-2">
                Durées de Transit & Délais de Livraison (Modifiables par défaut)
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Délai Fret Maritime
                  </label>
                  <input
                    type="text"
                    value={settings.seaFreightDurationDays || '30 - 45 jours'}
                    onChange={(e) => setSettings({ ...settings, seaFreightDurationDays: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                    placeholder="30 - 45 jours"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">Affiché sur les fiches produits & panier</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Délai Fret Aérien Express
                  </label>
                  <input
                    type="text"
                    value={settings.airFreightDurationDays || '5 - 10 jours'}
                    onChange={(e) => setSettings({ ...settings, airFreightDurationDays: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                    placeholder="5 - 10 jours"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">Transit avion rapide</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Délai Stock Local Dakar
                  </label>
                  <input
                    type="text"
                    value={settings.localDeliveryDurationDays || '24 - 48h'}
                    onChange={(e) => setSettings({ ...settings, localDeliveryDurationDays: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                    placeholder="24 - 48h"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">Expédition immédiate Dakar</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. REMISES GÉNÉRALES DU SITE */}
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Percent className="w-4 h-4 text-orange-400" />
                  Remise Globale Applicable à Tous les Produits
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Applique une réduction générale calculée en temps réel sur tous les équipements du catalogue.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, enableGlobalDiscount: !settings.enableGlobalDiscount })}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  settings.enableGlobalDiscount
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                }`}
              >
                {settings.enableGlobalDiscount ? 'Remise Globale Activée' : 'Désactivée'}
              </button>
            </div>

            {settings.enableGlobalDiscount && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Pourcentage de Réduction Globale (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="80"
                    step="1"
                    value={formInputs.globalDiscountPercent}
                    onChange={(e) => handleInputChange('globalDiscountPercent', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none font-mono"
                    placeholder="5"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Libellé / Badge Commercial Affiché
                  </label>
                  <input
                    type="text"
                    value={settings.globalDiscountLabel || 'Remise Commerciale Partenaires'}
                    onChange={(e) => setSettings({ ...settings, globalDiscountLabel: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                    placeholder="Remise Commerciale Partenaires"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 4. COORDONNÉES RÉELLES DU SITE & CONTACTS */}
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Coordonnées Officielles Affichées sur le Site & WhatsApp
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Numéro WhatsApp & Téléphone Officiel
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value, phoneDisplay: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Email Professionnel Officiel
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 5. TEXTES DE LA PAGE D'ACCUEIL */}
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Textes Phares de la Page d'Accueil
            </h4>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Titre Principal (Hero Banner)
              </label>
              <input
                type="text"
                value={settings.heroTitle}
                onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Sous-titre (Hero Banner)
              </label>
              <textarea
                rows={2}
                value={settings.heroSubtitle}
                onChange={(e) => setSettings({ ...settings, heroSubtitle: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>
            <ImageUploadInput
              label="Image d'Arrière-Plan du Hero Banner"
              value={settings.heroBgImage || ''}
              onChange={(newUrl) => setSettings({ ...settings, heroBgImage: newUrl })}
              placeholder="https://images.unsplash.com/... ou téléversez votre photo"
              helperText="Personnalisez la grande bannière d'accueil avec une photo de votre entreprise, de vos entrepôts ou de vos équipements."
            />
          </div>

          {saveMsg && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{saveMsg}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#FF6600] hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer"
            >
              Enregistrer tous les Paramètres du Site
            </button>
          </div>
        </form>
      </div>

      {/* 3. GESTION DES CODES PROMO PANIER (AVEC COMPTEUR ET DATE DE VALIDITÉ) */}
      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600/20 text-[#FF6600] flex items-center justify-center">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Codes Promo & Réductions Panier
              </h3>
              <p className="text-xs text-slate-400">
                Créez des codes promo avec compteur d'utilisation, montant minimum et date de validité.
              </p>
            </div>
          </div>
        </div>

        {/* Formulaire Création Code Promo */}
        <form onSubmit={handleCreatePromoCode} className="p-5 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
          <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Nouveau Code Promo
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Code Promo * (Ex: DAKAR2026)
              </label>
              <input
                type="text"
                required
                value={newPromoCode.code || ''}
                onChange={(e) => setNewPromoCode({ ...newPromoCode, code: e.target.value.toUpperCase() })}
                placeholder="DAKAR2026"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono font-bold uppercase focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Type de Réduction
              </label>
              <select
                value={newPromoCode.discountType || 'percent'}
                onChange={(e) => setNewPromoCode({ ...newPromoCode, discountType: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none font-mono"
              >
                <option value="percent">Pourcentage (%)</option>
                <option value="fixed">Montant Fixe (FCFA)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Valeur de la Réduction *
              </label>
              <input
                type="number"
                required
                min="1"
                value={newPromoCode.discountValue ?? 10}
                onChange={(e) => setNewPromoCode({ ...newPromoCode, discountValue: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
                placeholder="10"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Utilisations Max (0 = illimité)
              </label>
              <input
                type="number"
                min="0"
                value={newPromoCode.maxUses ?? 0}
                onChange={(e) => setNewPromoCode({ ...newPromoCode, maxUses: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Commande Min. (FCFA)
              </label>
              <input
                type="number"
                min="0"
                step="5000"
                value={newPromoCode.minOrderAmount ?? 0}
                onChange={(e) => setNewPromoCode({ ...newPromoCode, minOrderAmount: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Date Début Validité
              </label>
              <input
                type="date"
                value={newPromoCode.startDate || ''}
                onChange={(e) => setNewPromoCode({ ...newPromoCode, startDate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Date Fin / Expiration (Optionnel)
              </label>
              <input
                type="date"
                value={newPromoCode.expiryDate || ''}
                onChange={(e) => setNewPromoCode({ ...newPromoCode, expiryDate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-[#FF6600] hover:bg-orange-500 text-white py-2 px-4 rounded-lg font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Créer le Code Promo
              </button>
            </div>
          </div>

          {promoMsg && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{promoMsg}</span>
            </div>
          )}
        </form>

        {/* Tableau des codes promo existants */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                <th className="py-3 px-3">Code</th>
                <th className="py-3 px-3">Réduction</th>
                <th className="py-3 px-3">Utilisations (Réel / Max)</th>
                <th className="py-3 px-3">Validité</th>
                <th className="py-3 px-3">Min. Commande</th>
                <th className="py-3 px-3">Statut</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-300">
              {promoCodes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Aucun code promo créé pour le moment.
                  </td>
                </tr>
              ) : (
                promoCodes.map((p) => {
                  const isExpired = p.expiryDate ? new Date(p.expiryDate) < new Date(new Date().toISOString().split('T')[0]) : false;
                  const isLimitReached = p.maxUses && p.maxUses > 0 ? p.usedCount >= p.maxUses : false;

                  return (
                    <tr key={p.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-orange-400">
                        {p.code}
                      </td>
                      <td className="py-3 px-3 font-bold text-white">
                        {p.discountType === 'percent' ? `-${p.discountValue}%` : `-${p.discountValue.toLocaleString('fr-FR')} FCFA`}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono text-slate-200 font-bold">{p.usedCount}</span>
                        <span className="text-slate-500 text-[10px]"> / {p.maxUses && p.maxUses > 0 ? `${p.maxUses} max` : 'Illimité'}</span>
                        {isLimitReached && (
                          <span className="ml-2 text-[10px] text-amber-400 font-bold bg-amber-950/60 px-1.5 py-0.5 rounded">Plein</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-[11px] text-slate-400">
                        {p.expiryDate ? (
                          <span className={isExpired ? 'text-red-400 font-bold' : 'text-slate-300'}>
                            Jusqu'au {p.expiryDate} {isExpired ? '(Expiré)' : ''}
                          </span>
                        ) : (
                          <span className="text-emerald-400">Illimitée</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px]">
                        {p.minOrderAmount && p.minOrderAmount > 0 ? `${p.minOrderAmount.toLocaleString('fr-FR')} F` : '0 F'}
                      </td>
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => handleTogglePromoStatus(p)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                            p.isActive && !isExpired && !isLimitReached
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {p.isActive && !isExpired && !isLimitReached ? 'Actif' : 'Désactivé'}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeletePromo(p.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

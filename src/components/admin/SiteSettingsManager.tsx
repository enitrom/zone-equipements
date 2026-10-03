import React, { useState, useEffect } from 'react';
import {
  Save, Shield, DollarSign, Truck, Building2, Plus, Trash2,
  Mail, Phone, FileText, Globe, Percent, Tag, CheckCircle2, XCircle, Edit, Users,
  CreditCard, Key, Copy, Check, Eye, EyeOff
} from 'lucide-react';
import { siteSettingsService, SiteSettings, PromoCode, PaydunyaSettings } from '../../services/siteSettingsService';
import { ImageUploadInput } from '../ImageUploadInput';
import { WORLD_COUNTRIES, DEFAULT_SUPPORTED_DELIVERY_COUNTRIES } from '../../utils/countries';

interface SiteSettingsManagerProps {
  onNotify: (msg: string) => void;
}

export const SiteSettingsManager: React.FC<SiteSettingsManagerProps> = ({ onNotify }) => {
  const [settings, setSettings] = useState<SiteSettings>(siteSettingsService.getSettings());
  const [newAdminEmail, setNewAdminEmail] = useState('');

  // Promo code creation / edition state
  const [editingPromoCode, setEditingPromoCode] = useState<string | null>(null);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoPercent, setNewPromoPercent] = useState<number>(10);
  const [newPromoMinOrder, setNewPromoMinOrder] = useState<number>(0);
  const [newPromoDesc, setNewPromoDesc] = useState('');
  const [newPromoExpires, setNewPromoExpires] = useState('');
  const [newPromoMaxUsage, setNewPromoMaxUsage] = useState<number>(0);
  const [newPromoMaxPerAccount, setNewPromoMaxPerAccount] = useState<number>(1);
  const [showPaydunyaSecrets, setShowPaydunyaSecrets] = useState(false);
  const [copiedIpn, setCopiedIpn] = useState(false);

  // Free Gmail SMTP configuration state for OTP confirmation codes
  const [smtpUser, setSmtpUser] = useState('enitrom@gmail.com');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);

  const ipnEndpointUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/paydunya/ipn`
    : 'https://zoneequipements.sn/api/paydunya/ipn';

  const updatePaydunya = (partial: Partial<PaydunyaSettings>) => {
    const nextPaydunya: PaydunyaSettings = {
      ...settings.paydunya,
      ...partial
    };
    updateAndPersist({ paydunya: nextPaydunya });
  };

  useEffect(() => {
    const handleUpdate = () => {
      setSettings(siteSettingsService.getSettings());
    };
    const unsub = siteSettingsService.subscribe(handleUpdate);
    window.addEventListener('ze_settings_updated', handleUpdate);

    fetch('/api/auth/smtp-config')
      .then(r => r.json())
      .then(data => {
        if (data?.user) setSmtpUser(data.user);
        setSmtpConfigured(Boolean(data?.configured));
      })
      .catch(() => {});

    return () => {
      unsub();
      window.removeEventListener('ze_settings_updated', handleUpdate);
    };
  }, []);

  // Persistance immédiate à chaque modification pour qu'aucun ancien paramètre ne revienne
  const updateAndPersist = (partial: Partial<SiteSettings>) => {
    const updated = siteSettingsService.updateSettings(partial);
    setSettings(updated);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = siteSettingsService.updateSettings(settings);
    setSettings(updated);
    onNotify('Paramètres globaux, TVA, barèmes de fret et devises sauvegardés avec succès.');
  };

  const handleAddAdmin = async () => {
    const email = newAdminEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      onNotify('Veuillez saisir une adresse email valide.');
      return;
    }
    if (settings.adminEmails.map(e => e.toLowerCase().trim()).includes(email)) {
      onNotify('Cet email est déjà administrateur.');
      return;
    }
    const updated = await siteSettingsService.addAdminEmailAndPromote(email);
    setSettings(updated);
    setNewAdminEmail('');
    onNotify(`Administrateur ${email} ajouté et promu avec succès.`);
  };

  const handleRemoveAdmin = async (email: string) => {
    const cleanTarget = email.trim().toLowerCase();
    if (cleanTarget === 'enitrom@gmail.com') {
      onNotify('Le compte propriétaire principal (enitrom@gmail.com) ne peut pas être supprimé.');
      return;
    }
    if (settings.adminEmails.length <= 1) {
      onNotify('Impossible de supprimer le dernier administrateur.');
      return;
    }
    const updated = await siteSettingsService.removeAdminEmailAndDemote(cleanTarget);
    setSettings(updated);
    onNotify(`Administrateur ${cleanTarget} supprimé et droits révoqués immédiatement.`);
  };

  const handleSaveSmtpConfig = async () => {
    try {
      setIsSavingSmtp(true);
      const res = await fetch('/api/auth/smtp-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: smtpUser.trim(),
          pass: smtpPass.replace(/\s+/g, '').trim()
        })
      });
      const data = await res.json();
      setSmtpConfigured(Boolean(data?.configured));
      setSmtpPass('');
      onNotify(data?.configured
        ? 'Configuration Gmail gratuite activée ! Les codes de confirmation seront envoyés par email.'
        : 'Paramètres SMTP mis à jour (Mode code direct actif si aucun mot de passe d\'application n\'est fourni).'
      );
    } catch {
      onNotify('Erreur lors de la sauvegarde SMTP.');
    } finally {
      setIsSavingSmtp(false);
    }
  };

  const handleTestSmtpEmail = async () => {
    try {
      setIsTestingSmtp(true);
      const res = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: smtpUser.trim() || 'enitrom@gmail.com', purpose: 'test_admin' })
      });
      const data = await res.json();
      if (data?.success && !data?.simulated) {
        onNotify(`Email de test envoyé avec succès à ${smtpUser} !`);
      } else if (data?.fallbackCode) {
        onNotify(`Mode secours actif (Code généré : ${data.fallbackCode}). Ajoutez un mot de passe d'application Gmail gratuit pour l'envoi par mail.`);
      }
    } catch {
      onNotify('Erreur lors du test d\'envoi.');
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const resetPromoForm = () => {
    setEditingPromoCode(null);
    setNewPromoCode('');
    setNewPromoPercent(10);
    setNewPromoMinOrder(0);
    setNewPromoDesc('');
    setNewPromoExpires('');
    setNewPromoMaxUsage(0);
    setNewPromoMaxPerAccount(1);
  };

  const handleSavePromoCode = () => {
    const code = newPromoCode.trim().toUpperCase();
    if (!code) {
      onNotify('Veuillez saisir un code promo (ex: PROMO10).');
      return;
    }
    if (newPromoPercent <= 0 || newPromoPercent > 90) {
      onNotify('Le pourcentage de remise doit être compris entre 1% et 90%.');
      return;
    }

    if (editingPromoCode) {
      // Si le code a changé de nom, supprimer l'ancien
      if (editingPromoCode.toUpperCase() !== code) {
        siteSettingsService.deletePromoCode(editingPromoCode);
      }
      const existing = (settings.promoCodes || []).find(
        p => p.code.trim().toUpperCase() === editingPromoCode.toUpperCase()
      );
      if (existing && editingPromoCode.toUpperCase() === code) {
        const updated = siteSettingsService.updatePromoCode(code, {
          code,
          discountPercent: newPromoPercent,
          minOrderAmount: newPromoMinOrder > 0 ? newPromoMinOrder : 0,
          description: newPromoDesc.trim() || `Remise de ${newPromoPercent}%`,
          expiresAt: newPromoExpires || undefined,
          maxUsage: newPromoMaxUsage > 0 ? newPromoMaxUsage : 0,
          maxUsagePerAccount: newPromoMaxPerAccount > 0 ? newPromoMaxPerAccount : 0
        });
        setSettings(updated);
      } else {
        const updated = siteSettingsService.addPromoCode({
          code,
          discountPercent: newPromoPercent,
          minOrderAmount: newPromoMinOrder > 0 ? newPromoMinOrder : 0,
          active: existing ? existing.active : true,
          description: newPromoDesc.trim() || `Remise de ${newPromoPercent}%`,
          expiresAt: newPromoExpires || undefined,
          maxUsage: newPromoMaxUsage > 0 ? newPromoMaxUsage : 0,
          maxUsagePerAccount: newPromoMaxPerAccount > 0 ? newPromoMaxPerAccount : 0,
          usageByAccount: existing?.usageByAccount || {}
        });
        setSettings(updated);
      }
      onNotify(`Code promo "${code}" mis à jour avec succès.`);
      resetPromoForm();
      return;
    }

    const updated = siteSettingsService.addPromoCode({
      code,
      discountPercent: newPromoPercent,
      minOrderAmount: newPromoMinOrder > 0 ? newPromoMinOrder : 0,
      active: true,
      description: newPromoDesc.trim() || `Remise de ${newPromoPercent}%`,
      expiresAt: newPromoExpires || undefined,
      maxUsage: newPromoMaxUsage > 0 ? newPromoMaxUsage : 0,
      maxUsagePerAccount: newPromoMaxPerAccount > 0 ? newPromoMaxPerAccount : 0,
      usageByAccount: {}
    });
    setSettings(updated);
    resetPromoForm();
    onNotify(`Code promo "${code}" (-${newPromoPercent}%) créé et activé.`);
  };

  const handleEditPromo = (promo: PromoCode) => {
    setEditingPromoCode(promo.code);
    setNewPromoCode(promo.code);
    setNewPromoPercent(promo.discountPercent || 10);
    setNewPromoMinOrder(promo.minOrderAmount || 0);
    setNewPromoDesc(promo.description || '');
    setNewPromoExpires(promo.expiresAt || '');
    setNewPromoMaxUsage(promo.maxUsage || 0);
    setNewPromoMaxPerAccount(promo.maxUsagePerAccount || 0);
  };

  const handleDeletePromo = (code: string) => {
    const updated = siteSettingsService.deletePromoCode(code);
    setSettings(updated);
    if (editingPromoCode && editingPromoCode.toUpperCase() === code.trim().toUpperCase()) {
      resetPromoForm();
    }
    onNotify(`Code promo "${code}" supprimé définitivement.`);
  };

  const handleTogglePromo = (code: string) => {
    const updated = siteSettingsService.togglePromoCode(code);
    setSettings(updated);
    onNotify(`Statut du code promo "${code}" mis à jour.`);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Header bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-[#FF6600]" />
            Paramètres Globaux, Fiscalité (TVA), Fret & Devises
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Toutes vos modifications sont enregistrées de façon persistante et synchronisées en temps réel sur tout le site (Catalogue, Fiches Produits, Import, Panier et Contrats).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="bg-[#FF6600] hover:bg-[#e65c00] text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-orange-950/50 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Sauvegarder la Configuration
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Fiscalité & Marges par défaut */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <Percent className="w-5 h-5 text-[#FF6600]" />
              <h3 className="font-bold text-white text-base">Fiscalité (TVA) & Marge Commerciale</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                const currentlyActive = settings.vatEnabled !== false && (settings.vatRate ?? 18) > 0;
                if (currentlyActive) {
                  updateAndPersist({ vatEnabled: false, vatRate: 0, defaultVatRate: 0 });
                  onNotify('TVA globale désactivée (0%). Les produits importés auront automatiquement la TVA désactivée.');
                } else {
                  updateAndPersist({ vatEnabled: true, vatRate: 18, defaultVatRate: 0.18 });
                  onNotify('TVA globale activée (18%).');
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                settings.vatEnabled !== false && (settings.vatRate ?? 18) > 0
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-600/20 text-rose-300 border border-rose-500/40'
              }`}
            >
              {settings.vatEnabled !== false && (settings.vatRate ?? 18) > 0
                ? `✓ TVA Active (${settings.vatRate}%)`
                : '✕ TVA Désactivée (0%)'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">
                Taux de TVA Applicable (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={settings.vatRate}
                onChange={e => {
                  const val = Math.max(0, Number(e.target.value));
                  updateAndPersist({
                    vatRate: val,
                    vatEnabled: val > 0,
                    defaultVatRate: val / 100
                  });
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#FF6600] outline-none font-mono"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                {settings.vatEnabled !== false && settings.vatRate > 0
                  ? 'Appliquée par défaut lors des imports'
                  : 'TVA désactivée automatiquement sur les imports'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">
                Marge Commerciale par Défaut (%)
              </label>
              <input
                type="number"
                step="1"
                value={settings.defaultMarginPercentage}
                onChange={e => updateAndPersist({ defaultMarginPercentage: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#FF6600] outline-none font-mono"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Appliquée lors des imports automatiques</span>
            </div>
          </div>
        </div>

        {/* 2. Taux de Change Devises -> FCFA */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-base">Taux de Change des Devises (vers FCFA / XOF)</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">1 USD ($) =</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={settings.exchangeRates.USD}
                  onChange={e => updateAndPersist({
                    exchangeRates: { ...settings.exchangeRates, USD: Number(e.target.value) }
                  })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-[#FF6600] outline-none"
                />
                <span className="absolute right-2.5 top-2.5 text-[10px] text-slate-500 font-bold">CFA</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">1 EUR (€) =</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  value={settings.exchangeRates.EUR}
                  onChange={e => updateAndPersist({
                    exchangeRates: { ...settings.exchangeRates, EUR: Number(e.target.value) }
                  })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-[#FF6600] outline-none"
                />
                <span className="absolute right-2.5 top-2.5 text-[10px] text-slate-500 font-bold">CFA</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">1 CNY (¥) =</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={settings.exchangeRates.CNY}
                  onChange={e => updateAndPersist({
                    exchangeRates: { ...settings.exchangeRates, CNY: Number(e.target.value) }
                  })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-[#FF6600] outline-none"
                />
                <span className="absolute right-2.5 top-2.5 text-[10px] text-slate-500 font-bold">CFA</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">1 GBP (£) =</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={settings.exchangeRates.GBP}
                  onChange={e => updateAndPersist({
                    exchangeRates: { ...settings.exchangeRates, GBP: Number(e.target.value) }
                  })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-[#FF6600] outline-none"
                />
                <span className="absolute right-2.5 top-2.5 text-[10px] text-slate-500 font-bold">CFA</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Barèmes Logistiques & Fret International + Pays Livrés */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <Truck className="w-5 h-5 text-blue-400" />
              <div>
                <h3 className="font-bold text-white text-base">Barèmes de Fret Système (Secours) & Pays de Livraison Pris en Charge</h3>
                <p className="text-[11px] text-slate-400">
                  Règle d'autonomie : Tant qu'un entrepôt est assigné à un fournisseur ou à un produit, ce sont exclusivement les tarifs et services de cet entrepôt qui s'appliquent (ces barèmes système sont automatiquement ignorés).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const nextState = settings.systemFreightEnabled === false;
                updateAndPersist({ systemFreightEnabled: nextState });
                onNotify(
                  nextState
                    ? 'Paramètres de fret système activés (utilisés uniquement en secours si aucun entrepôt n’est assigné).'
                    : 'Paramètres de fret système désactivés. Seuls les tarifs des entrepôts assignés aux fournisseurs/produits seront appliqués.'
                );
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                settings.systemFreightEnabled !== false
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-600/20 text-rose-300 border border-rose-500/40'
              }`}
            >
              {settings.systemFreightEnabled !== false
                ? '✓ Fret Système Actif (Ignoré si Entrepôt assigné)'
                : '✕ Fret Système Désactivé'}
            </button>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity ${settings.systemFreightEnabled === false ? 'opacity-45 pointer-events-none' : ''}`}>
            {/* Fret Maritime */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-blue-400 block">
                🚢 Fret Maritime Système (Secours si aucun entrepôt)
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Tarif / Kg (FCFA)</label>
                  <input
                    type="number"
                    value={settings.seaFreightPerKg}
                    onChange={e => updateAndPersist({ seaFreightPerKg: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Tarif / m³ ($ USD)</label>
                  <input
                    type="number"
                    value={settings.seaFreightPerCbmUSD ?? 220}
                    onChange={e => updateAndPersist({ seaFreightPerCbmUSD: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Forfait Min. (F)</label>
                  <input
                    type="number"
                    value={settings.seaFreightMin}
                    onChange={e => updateAndPersist({ seaFreightMin: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-sm text-white font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Durée / Délai affiché</label>
                <input
                  type="text"
                  value={settings.seaFreightDuration || '20 à 40 jours'}
                  onChange={e => updateAndPersist({ seaFreightDuration: e.target.value })}
                  placeholder="Ex: 20 à 40 jours"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            {/* Fret Aérien Standard */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400 block">
                ✈️ Fret Aérien Système (Secours si aucun entrepôt)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Tarif / Kg (FCFA)</label>
                  <input
                    type="number"
                    value={settings.airFreightPerKg}
                    onChange={e => updateAndPersist({ airFreightPerKg: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Forfait Min. (FCFA)</label>
                  <input
                    type="number"
                    value={settings.airFreightMin}
                    onChange={e => updateAndPersist({ airFreightMin: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Durée / Délai affiché</label>
                <input
                  type="text"
                  value={settings.airFreightDuration || '8 à 15 jours'}
                  onChange={e => updateAndPersist({ airFreightDuration: e.target.value })}
                  placeholder="Ex: 8 à 15 jours"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* Pays pris en charge par la livraison par défaut & Règle Pays Client */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Globe className="w-4 h-4" />
                  Pays Pris en Charge par la Livraison & Règle du Pays Client
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Le <strong>pays client par défaut</strong> est automatiquement celui enregistré sur son compte client (s'il n'en définit pas un nouveau lors de la commande). Vous pouvez définir ci-dessous les pays livrables par défaut.
                </p>
              </div>
              <div className="flex items-center gap-2 bg-slate-900 border border-emerald-500/30 rounded-lg px-3 py-1.5">
                <span className="text-[11px] font-bold text-emerald-300">
                  👤 Pays client par défaut : Pays du compte client (modifiable à la commande)
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {(settings.supportedDeliveryCountries && settings.supportedDeliveryCountries.length > 0
                ? settings.supportedDeliveryCountries
                : DEFAULT_SUPPORTED_DELIVERY_COUNTRIES
              ).map(countryName => (
                <span
                  key={countryName}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                >
                  <span>✓ {countryName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const current = settings.supportedDeliveryCountries && settings.supportedDeliveryCountries.length > 0
                        ? settings.supportedDeliveryCountries
                        : DEFAULT_SUPPORTED_DELIVERY_COUNTRIES;
                      if (current.length <= 1) {
                        onNotify('Au moins un pays de livraison doit rester actif.');
                        return;
                      }
                      updateAndPersist({
                        supportedDeliveryCountries: current.filter(c => c !== countryName)
                      });
                    }}
                    className="hover:text-rose-400 cursor-pointer"
                    title={`Retirer ${countryName}`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}

              <select
                value=""
                onChange={e => {
                  const val = e.target.value;
                  if (!val) return;
                  const current = settings.supportedDeliveryCountries && settings.supportedDeliveryCountries.length > 0
                    ? settings.supportedDeliveryCountries
                    : DEFAULT_SUPPORTED_DELIVERY_COUNTRIES;
                  if (!current.includes(val)) {
                    updateAndPersist({
                      supportedDeliveryCountries: [...current, val]
                    });
                    onNotify(`${val} ajouté aux pays pris en charge pour la livraison.`);
                  }
                }}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-xs text-orange-300 font-bold focus:border-[#FF6600] outline-none cursor-pointer"
              >
                <option value="">+ Ajouter un pays livré...</option>
                {WORLD_COUNTRIES.filter(
                  c => !(settings.supportedDeliveryCountries || DEFAULT_SUPPORTED_DELIVERY_COUNTRIES).includes(c)
                ).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 4. Logo, Nom d'Entreprise & Coordonnées (En-tête, Pied de page & Factures) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-2.5 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-5 h-5 text-purple-400" />
              <div>
                <h3 className="font-bold text-white text-base">Logo, Nom d'Entreprise & Coordonnées</h3>
                <p className="text-[11px] text-slate-400">Personnalisez le logo, le nom affiché à côté et vos mentions légales</p>
              </div>
            </div>
          </div>

          {/* Aperçu en direct du Logo + Nom comme dans l'en-tête du site */}
          <div className="bg-[#003366] border border-blue-800/60 rounded-xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {settings.companyLogo ? (
                <img
                  src={settings.companyLogo}
                  alt={settings.companyName}
                  className="w-11 h-11 rounded-xl object-contain bg-white p-1 shadow-md border border-white/20"
                />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF6600] to-amber-600 flex items-center justify-center text-white shadow-md border border-orange-400/30">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
              )}
              <div className="flex flex-col leading-none">
                <div className="flex items-center gap-1.5">
                  <span className="text-white font-black tracking-tight text-base md:text-lg">
                    {settings.companyName || 'ZONE ÉQUIPEMENTS'}
                  </span>
                  {(settings.companyBadge ?? 'MRO') && (
                    <span className="bg-[#FF6600] text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest">
                      {settings.companyBadge ?? 'MRO'}
                    </span>
                  )}
                </div>
                <span className="text-[#FF6600] text-[10px] font-extrabold tracking-[0.2em] uppercase mt-1">
                  {settings.companySubtitle !== undefined ? settings.companySubtitle : "SÉNÉGAL • AFRIQUE DE L'OUEST"}
                </span>
              </div>
            </div>
            {settings.companyLogo && (
              <button
                type="button"
                onClick={() => updateAndPersist({ companyLogo: '' })}
                className="text-[11px] bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/30 px-2.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer"
              >
                Remettre logo par défaut
              </button>
            )}
          </div>

          <div className="space-y-3">
            <ImageUploadInput
              label="Charger un Logo d'entreprise (remplace l'icône actuelle)"
              value={settings.companyLogo || ''}
              onChange={val => updateAndPersist({ companyLogo: val })}
              placeholder="Cliquez sur Parcourir ou collez l'URL de votre logo (PNG, SVG, JPG, WebP)"
              helperText="Votre logo s'affiche immédiatement dans la barre de navigation en haut et dans le pied de page."
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-400 mb-1">Nom de l'Entreprise (affiché à côté du logo)</label>
                <input
                  type="text"
                  value={settings.companyName}
                  onChange={e => updateAndPersist({ companyName: e.target.value })}
                  placeholder="ZONE ÉQUIPEMENTS"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Badge (ex: MRO, B2B)</label>
                <input
                  type="text"
                  value={settings.companyBadge !== undefined ? settings.companyBadge : 'MRO'}
                  onChange={e => updateAndPersist({ companyBadge: e.target.value })}
                  placeholder="MRO"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Sous-titre sous le nom d'entreprise</label>
              <input
                type="text"
                value={settings.companySubtitle !== undefined ? settings.companySubtitle : "SÉNÉGAL • AFRIQUE DE L'OUEST"}
                onChange={e => updateAndPersist({ companySubtitle: e.target.value })}
                placeholder="SÉNÉGAL • AFRIQUE DE L'OUEST"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Adresse du Siège & Entrepôt</label>
              <input
                type="text"
                value={settings.companyAddress}
                onChange={e => updateAndPersist({ companyAddress: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Téléphone Officiel
                </label>
                <input
                  type="text"
                  value={settings.companyPhone}
                  onChange={e => updateAndPersist({ companyPhone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Email Commercial
                </label>
                <input
                  type="email"
                  value={settings.companyEmail}
                  onChange={e => updateAndPersist({ companyEmail: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Numéro RCCM
                </label>
                <input
                  type="text"
                  value={settings.rccm}
                  onChange={e => updateAndPersist({ rccm: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Numéro NINEA
                </label>
                <input
                  type="text"
                  value={settings.ninea}
                  onChange={e => updateAndPersist({ ninea: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 5. Gestion des Comptes Administrateurs & Bannière d'Accueil */}
        <div className="space-y-6">
          {/* Comptes Admin */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
              <Shield className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-white text-base">Comptes Administrateurs Autorisés</h3>
            </div>

            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Ajouter un email admin (ex: directeur@gmail.com)"
                value={newAdminEmail}
                onChange={e => setNewAdminEmail(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-[#FF6600] outline-none"
              />
              <button
                type="button"
                onClick={handleAddAdmin}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </div>

            <div className="space-y-3">
              {settings.adminEmails.map(email => {
                const isPrimaryOwner = email.toLowerCase().trim() === 'enitrom@gmail.com';
                const perms = isPrimaryOwner 
                  ? { pos: true, catalog: true, orders: true, suppliers: true, finance: true, security: true }
                  : (settings.adminPermissionsMap?.[email.toLowerCase().trim()] || { pos: true, catalog: true, orders: true, suppliers: true, finance: true, security: true });

                const handleTogglePerm = async (key: keyof typeof perms) => {
                  if (isPrimaryOwner) return;
                  const updatedPerms = { ...perms, [key]: !perms[key] };
                  await siteSettingsService.updateAdminPermissions(email, updatedPerms);
                  onNotify(`Droits de ${email} mis à jour.`);
                };

                const handleSetAllPerms = async (val: boolean) => {
                  if (isPrimaryOwner) return;
                  const updatedPerms = { pos: val, catalog: val, orders: val, suppliers: val, finance: val, security: val };
                  await siteSettingsService.updateAdminPermissions(email, updatedPerms);
                  onNotify(`Tous les droits de ${email} ont été ${val ? 'activés' : 'désactivés'}.`);
                };

                return (
                  <div
                    key={email}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5 transition-all"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${isPrimaryOwner ? 'bg-orange-400' : 'bg-emerald-400'}`}></span>
                        <span className="text-xs font-mono font-bold text-slate-200">{email}</span>
                        {isPrimaryOwner ? (
                          <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 text-[10px] font-bold border border-orange-500/30">
                            Super Administrateur (Tous les accès)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30">
                            Administrateur Délégué
                          </span>
                        )}
                      </div>
                      {!isPrimaryOwner && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSetAllPerms(true)}
                            className="text-[10px] text-emerald-400 hover:underline font-bold"
                          >
                            Tout cocher
                          </button>
                          <span className="text-slate-600">•</span>
                          <button
                            type="button"
                            onClick={() => handleSetAllPerms(false)}
                            className="text-[10px] text-slate-400 hover:underline font-bold"
                          >
                            Tout décocher
                          </button>
                          <span className="text-slate-600">•</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAdmin(email)}
                            className="text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Supprimer cet administrateur et révoquer ses accès immédiatement"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Supprimer</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Checkboxes des Rôles & Accès par fonctionnalité */}
                    <div className="pt-2 border-t border-slate-900 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      {[
                        { key: 'pos', label: '🏪 Magasin POS' },
                        { key: 'catalog', label: '📦 Catalogue & Prix' },
                        { key: 'orders', label: '📑 Commandes & Devis' },
                        { key: 'suppliers', label: '🚢 Fournisseurs & PO' },
                        { key: 'finance', label: '📊 Finance & Marges' },
                        { key: 'security', label: '⚙️ Sécurité & Paramètres' },
                      ].map((item) => {
                        const isChecked = isPrimaryOwner || Boolean((perms as any)[item.key]);
                        return (
                          <label
                            key={item.key}
                            className={`flex items-center gap-2 p-1.5 rounded-lg border text-[11px] transition-all ${
                              isChecked
                                ? 'bg-slate-900 border-orange-500/40 text-slate-100 font-bold'
                                : 'bg-slate-950 border-slate-800 text-slate-500 opacity-60'
                            } ${isPrimaryOwner ? 'cursor-default' : 'cursor-pointer hover:border-orange-500/70'}`}
                          >
                            <input
                              type="checkbox"
                              disabled={isPrimaryOwner}
                              checked={isChecked}
                              onChange={() => handleTogglePerm(item.key as any)}
                              className="rounded border-slate-700 text-[#FF6600] focus:ring-[#FF6600] h-3.5 w-3.5 bg-slate-950"
                            />
                            <span className="truncate">{item.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Configuration des Codes de Confirmation par Email (100% Gratuit) */}
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-orange-400" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">
                    Codes de Confirmation Email (100% Gratuit — 0 FCFA)
                  </h4>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  smtpConfigured
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  {smtpConfigured ? '✓ Envoi Gmail Actif' : '⚡ Mode Code Direct Actif'}
                </span>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-300 leading-relaxed space-y-1.5">
                <p className="text-emerald-300 font-bold">
                  ❓ Faut-il un service payant pour envoyer les codes par email ? NON (0 FCFA).
                </p>
                <p>
                  Vous n'avez besoin d'aucun abonnement payant. Il suffit d'utiliser votre adresse Gmail habituelle avec un <strong>Mot de passe d'application Google gratuit</strong> (16 lettres générées dans <em>Compte Google &gt; Sécurité &gt; Validation en 2 étapes &gt; Mots de passe des applications</em>). Tant qu'il n'est pas renseigné, le code s'affiche directement à l'écran pour ne jamais bloquer vos clients.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Adresse Gmail d'envoi</label>
                  <input
                    type="email"
                    value={smtpUser}
                    onChange={e => setSmtpUser(e.target.value)}
                    placeholder="enitrom@gmail.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mot de passe d'application Google (16 car.)</label>
                  <input
                    type="password"
                    value={smtpPass}
                    onChange={e => setSmtpPass(e.target.value)}
                    placeholder={smtpConfigured ? '•••••••••••••••• (Déjà configuré)' : 'xxxx xxxx xxxx xxxx'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isSavingSmtp}
                  onClick={handleSaveSmtpConfig}
                  className="px-3 py-1.5 bg-[#FF6600] hover:bg-orange-600 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                >
                  {isSavingSmtp ? 'Enregistrement...' : 'Activer l\'envoi Gmail Gratuit'}
                </button>
                <button
                  type="button"
                  disabled={isTestingSmtp}
                  onClick={handleTestSmtpEmail}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                >
                  {isTestingSmtp ? 'Test en cours...' : 'Tester la réception d\'un code'}
                </button>
              </div>
            </div>
          </div>

          {/* Personnalisation Hero Accueil */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
              <Globe className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-base">Bannière Principale (Page d'Accueil)</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Titre Principal (Hero)</label>
                <input
                  type="text"
                  value={settings.heroTitle}
                  onChange={e => updateAndPersist({ heroTitle: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Sous-titre d'accroche</label>
                <textarea
                  rows={2}
                  value={settings.heroSubtitle}
                  onChange={e => updateAndPersist({ heroSubtitle: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>
              <ImageUploadInput
                label="Image d'arrière-plan de la bannière (Hero)"
                value={settings.heroBgImage || ''}
                onChange={val => updateAndPersist({ heroBgImage: val })}
                placeholder="https://images.unsplash.com/... ou téléversez une photo"
                helperText="Importez une image depuis votre appareil ou renseignez une URL."
              />
            </div>
          </div>
        </div>

        {/* 6. Codes Promo & Réductions Panier (Revue intégrale + Max par Compte + Suppression directe) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <Tag className="w-5 h-5 text-[#FF6600]" />
              <div>
                <h3 className="font-bold text-white text-base">Codes Promo & Réductions Panier</h3>
                <p className="text-xs text-slate-400">
                  Créez, modifiez ou supprimez vos codes promo avec gestion distincte du quota global et du quota d'utilisation par compte client.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-orange-400 bg-orange-950/40 border border-orange-800/40 px-3 py-1 rounded-full font-bold">
              {(settings.promoCodes || []).length} code{(settings.promoCodes || []).length > 1 ? 's' : ''} configuré{(settings.promoCodes || []).length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Formulaire de Création / Édition d'un Code Promo */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-orange-400">
                {editingPromoCode ? `✏️ Modifier le code promo : ${editingPromoCode}` : '➕ Créer un nouveau code promo'}
              </span>
              {editingPromoCode && (
                <button
                  type="button"
                  onClick={resetPromoForm}
                  className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Annuler la modification
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Code Promo *</label>
                <input
                  type="text"
                  placeholder="Ex: DAKAR10"
                  value={newPromoCode}
                  onChange={e => setNewPromoCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono uppercase focus:border-[#FF6600] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Remise (%) *</label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={newPromoPercent}
                  onChange={e => setNewPromoPercent(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-[#FF6600] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Min. Panier (FCFA)</label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={newPromoMinOrder}
                  onChange={e => setNewPromoMinOrder(Number(e.target.value))}
                  placeholder="0 = Aucun min"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-[#FF6600] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1" title="Nombre total d'utilisations autorisées tous clients confondus (0 = illimité)">
                  Utilisations Max (0 = illimité)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={newPromoMaxUsage}
                  onChange={e => setNewPromoMaxUsage(Math.max(0, Number(e.target.value)))}
                  placeholder="0 = Illimité"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-[#FF6600] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-emerald-400 mb-1 flex items-center gap-1" title="Nombre maximum d'utilisations autorisées pour un même compte client (0 = illimité)">
                  <Users className="w-3 h-3" /> Max / Compte (0 = illimité)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={newPromoMaxPerAccount}
                  onChange={e => setNewPromoMaxPerAccount(Math.max(0, Number(e.target.value)))}
                  placeholder="Ex: 1 par compte"
                  className="w-full bg-slate-900 border border-emerald-700/60 rounded-lg px-3 py-2 text-xs text-emerald-300 font-mono focus:border-emerald-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Expiration (Optionnel)</label>
                <input
                  type="date"
                  value={newPromoExpires}
                  onChange={e => setNewPromoExpires(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-[#FF6600] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center pt-1">
              <div className="sm:col-span-3">
                <input
                  type="text"
                  placeholder="Description commerciale (ex: Remise fidélité 10% sur commande MRO)"
                  value={newPromoDesc}
                  onChange={e => setNewPromoDesc(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-[#FF6600] outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleSavePromoCode}
                className="w-full bg-[#FF6600] hover:bg-[#e65c00] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" />
                {editingPromoCode ? 'Mettre à jour le Code' : 'Ajouter le Code Promo'}
              </button>
            </div>
          </div>

          {/* Liste des Codes Promo Actuels */}
          <div className="space-y-2.5">
            {(settings.promoCodes || []).length === 0 ? (
              <div className="p-6 bg-slate-950/60 border border-dashed border-slate-800 rounded-xl text-center">
                <p className="text-xs text-slate-500 italic">
                  Aucun code promo configuré. Utilisez le formulaire ci-dessus pour créer un code de réduction.
                </p>
              </div>
            ) : (
              (settings.promoCodes || []).map(promo => {
                const accountCount = Object.keys(promo.usageByAccount || {}).length;
                return (
                  <div
                    key={promo.code}
                    className="flex flex-wrap items-center justify-between gap-4 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-4 py-3 transition-all"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="px-3 py-1 rounded-lg bg-[#FF6600]/15 border border-[#FF6600]/40 text-[#FF6600] font-mono font-black text-sm">
                        {promo.code}
                      </span>
                      <span className="text-sm font-bold text-emerald-400 font-mono">
                        -{promo.discountPercent}%
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        promo.active
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {promo.active ? 'Actif' : 'Inactif'}
                      </span>
                      <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>{promo.description}</span>
                        {promo.minOrderAmount ? (
                          <span className="text-slate-300 font-mono">
                            • Min: {promo.minOrderAmount.toLocaleString('fr-FR')} FCFA
                          </span>
                        ) : null}
                        {promo.expiresAt ? (
                          <span className="text-amber-400 font-mono">
                            • Exp: {new Date(promo.expiresAt).toLocaleDateString('fr-FR')}
                          </span>
                        ) : null}
                        <span className="text-slate-300 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          Total : {promo.usageCount || 0} / {promo.maxUsage && promo.maxUsage > 0 ? promo.maxUsage : '∞'}
                        </span>
                        <span className="text-emerald-300 font-mono bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/50">
                          Par compte : {promo.maxUsagePerAccount && promo.maxUsagePerAccount > 0 ? `${promo.maxUsagePerAccount} max` : 'Illimité'}
                          {accountCount > 0 ? ` (${accountCount} compte${accountCount > 1 ? 's' : ''})` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditPromo(promo)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-200 hover:bg-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                        title="Modifier ce code promo"
                      >
                        <Edit className="w-3.5 h-3.5 text-blue-400" />
                        Modifier
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTogglePromo(promo.code)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                          promo.active
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30'
                        }`}
                      >
                        {promo.active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        {promo.active ? 'Désactiver' : 'Activer'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeletePromo(promo.code)}
                        className="px-2.5 py-1.5 text-rose-400 bg-rose-500/10 hover:bg-rose-600 hover:text-white border border-rose-500/20 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Supprimer définitivement ce code promo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Supprimer
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 7. Processeur de Paiement PayDunya (API Live & Test, IPN, Méthodes multi-pays) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-5 h-5 text-[#FF6600]" />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-base">Processeur de Paiement PayDunya (Payin / Payout & IPN)</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    settings.paydunya?.enabled
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {settings.paydunya?.enabled ? 'Statut : Activée' : 'Désactivée'}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    settings.paydunya?.mode === 'live'
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                  }`}>
                    Mode : {settings.paydunya?.mode === 'live' ? 'PRODUCTION (LIVE)' : 'TEST (SANDBOX)'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Gérez ou modifiez vos clés API PayDunya (Production & Test), le mode d'encaissement et l'adresse de notification instantanée (IPN).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPaydunyaSecrets(prev => !prev)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              >
                {showPaydunyaSecrets ? <EyeOff className="w-3.5 h-3.5 text-orange-400" /> : <Eye className="w-3.5 h-3.5 text-orange-400" />}
                <span>{showPaydunyaSecrets ? 'Masquer les clés' : 'Afficher les clés'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  updatePaydunya({ enabled: !settings.paydunya?.enabled });
                  onNotify(`PayDunya ${!settings.paydunya?.enabled ? 'activé' : 'désactivé'}.`);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  settings.paydunya?.enabled
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                }`}
              >
                {settings.paydunya?.enabled ? 'Désactiver PayDunya' : 'Activer PayDunya'}
              </button>
            </div>
          </div>

          {/* Sélecteur de Mode (Production Réel vs Test Sandbox) & Clé Principale */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Environnement Actif PayDunya
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    updatePaydunya({ mode: 'live' });
                    onNotify('PayDunya basculé en mode PRODUCTION (Réel).');
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-black border transition-all cursor-pointer ${
                    settings.paydunya?.mode === 'live'
                      ? 'bg-[#FF6600] text-white border-[#FF6600] shadow-md'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  🟢 PRODUCTION (Réel)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updatePaydunya({ mode: 'test' });
                    onNotify('PayDunya basculé en mode TEST (Sandbox).');
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-black border transition-all cursor-pointer ${
                    settings.paydunya?.mode === 'test'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  🧪 TEST (Sandbox)
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Services actifs : <strong className="text-slate-300">Payin / Payout • PER Activé • Envoi Facture Activé</strong>
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 lg:col-span-2">
              <label className="block text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />
                Clé Principale (Master Key PayDunya)
              </label>
              <input
                type={showPaydunyaSecrets ? 'text' : 'password'}
                value={settings.paydunya?.masterKey || ''}
                onChange={e => updatePaydunya({ masterKey: e.target.value })}
                placeholder="Ex: ealL1IWV-8gd7-JaP4-PUiw-yCKMqvb5LIre"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-white font-mono focus:border-[#FF6600] outline-none"
              />
              <p className="text-[11px] text-slate-500">
                Utilisée pour authentifier l'application et vérifier la signature cryptographique SHA-512 des notifications IPN.
              </p>
            </div>
          </div>

          {/* Clés API de Production & Clés API de Test */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Clés de Production (LIVE) */}
            <div className="bg-slate-950 border border-orange-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-orange-400">
                  Clés API de Production (Mode Réel)
                </span>
                {settings.paydunya?.mode === 'live' && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    Actuellement utilisé
                  </span>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Clé Publique (Live Public Key)</label>
                <input
                  type={showPaydunyaSecrets ? 'text' : 'password'}
                  value={settings.paydunya?.livePublicKey || ''}
                  onChange={e => updatePaydunya({ livePublicKey: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-[#FF6600] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Clé Privée (Live Private Key)</label>
                <input
                  type={showPaydunyaSecrets ? 'text' : 'password'}
                  value={settings.paydunya?.livePrivateKey || ''}
                  onChange={e => updatePaydunya({ livePrivateKey: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-[#FF6600] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Token (Live Token)</label>
                <input
                  type={showPaydunyaSecrets ? 'text' : 'password'}
                  value={settings.paydunya?.liveToken || ''}
                  onChange={e => updatePaydunya({ liveToken: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-[#FF6600] outline-none"
                />
              </div>
            </div>

            {/* Clés de Test (SANDBOX) */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-blue-400">
                  Clés API de Test (Mode Sandbox)
                </span>
                {settings.paydunya?.mode === 'test' && (
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold">
                    Actuellement utilisé
                  </span>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Clé Publique (Test Public Key)</label>
                <input
                  type={showPaydunyaSecrets ? 'text' : 'password'}
                  value={settings.paydunya?.testPublicKey || ''}
                  onChange={e => updatePaydunya({ testPublicKey: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-[#FF6600] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Clé Privée (Test Private Key)</label>
                <input
                  type={showPaydunyaSecrets ? 'text' : 'password'}
                  value={settings.paydunya?.testPrivateKey || ''}
                  onChange={e => updatePaydunya({ testPrivateKey: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-[#FF6600] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Token (Test Token)</label>
                <input
                  type={showPaydunyaSecrets ? 'text' : 'password'}
                  value={settings.paydunya?.testToken || ''}
                  onChange={e => updatePaydunya({ testToken: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-[#FF6600] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Endpoint IPN (Instant Payment Notification) & Méthodes Autorisées */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-slate-950 border border-emerald-500/30 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  Instant Payment Notification (Endpoint IPN)
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                  Recommandé & Prêt
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Copiez cette URL et collez-la dans votre tableau de bord PayDunya (champ <strong>Endpoint IPN</strong>) pour que votre site soit notifié automatiquement dès qu'un client confirme son paiement :
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={ipnEndpointUrl}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-emerald-300 font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(ipnEndpointUrl);
                    setCopiedIpn(true);
                    setTimeout(() => setCopiedIpn(false), 3000);
                    onNotify('URL Endpoint IPN copiée dans le presse-papiers.');
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {copiedIpn ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedIpn ? 'Copié !' : 'Copier URL IPN'}</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-white block">
                Canaux & Pays Autorisés sur le Compte PayDunya
              </span>
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-orange-300 font-bold">
                  💳 Carte Bancaire (CARD)
                </span>
                <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200">
                  🇸🇳 Sénégal : Wave, Orange Money, Free Money, Expresso, Djamo
                </span>
                <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200">
                  🇨🇮 Côte d'Ivoire : OM CI, MTN CI, Moov CI, Wave CI, Djamo CI
                </span>
                <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200">
                  🇧🇯 Bénin : MTN, Moov, Celtiis • 🇧🇫 Burkina : OM, Moov
                </span>
                <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200">
                  🇲🇱 Mali : OM Mali • 🇹🇬 Togo : T-Money, Moov • 🇨🇲 Cameroun : MTN
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};

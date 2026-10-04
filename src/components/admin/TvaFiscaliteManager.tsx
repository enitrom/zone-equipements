import React, { useState, useMemo } from 'react';
import { 
  Receipt, 
  Download, 
  FileSpreadsheet, 
  Building2, 
  Globe, 
  Calendar, 
  Filter, 
  Info,
  Scale,
  FileText,
  Percent,
  Layers
} from 'lucide-react';
import { catalogService, Order } from '../../services/catalogService';
import { siteSettingsService } from '../../services/siteSettingsService';

interface TvaFiscaliteManagerProps {
  orders: Order[];
  onNotify: (msg: string) => void;
}

export const TvaFiscaliteManager: React.FC<TvaFiscaliteManagerProps> = ({ orders, onNotify }) => {
  const [periodFilter, setPeriodFilter] = useState<'all' | 'month' | 'quarter' | 'year'>('month');
  const [regimeFilter, setRegimeFilter] = useState<'all' | 'taxable' | 'export_exempt' | 'franchise'>('all');
  const siteSettings = siteSettingsService.getSettings();
  const isVatGloballyActive = siteSettings.vatEnabled !== false;

  // Filtrer uniquement les commandes finalisées / validées pour la comptabilité
  const finalizedOrders = useMemo(() => {
    return orders.filter(o => catalogService.isOrderFinalizedForFinance(o));
  }, [orders]);

  // Filtrage par période temporelle et régime
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return finalizedOrders.filter(order => {
      const orderDate = new Date(order.createdAt);
      
      if (periodFilter === 'month') {
        if (orderDate.getMonth() !== currentMonth || orderDate.getFullYear() !== currentYear) {
          return false;
        }
      } else if (periodFilter === 'quarter') {
        const currentQuarter = Math.floor(currentMonth / 3);
        const orderQuarter = Math.floor(orderDate.getMonth() / 3);
        if (orderQuarter !== currentQuarter || orderDate.getFullYear() !== currentYear) {
          return false;
        }
      } else if (periodFilter === 'year') {
        if (orderDate.getFullYear() !== currentYear) {
          return false;
        }
      }

      // Filtrage par régime fiscal
      const country = order.customerCountry || 'Sénégal';
      const isExport = country.toLowerCase() !== 'sénégal' && country.toLowerCase() !== 'senegal';
      const isVatCharged = Boolean(order.vatAmount && order.vatAmount > 0);

      if (regimeFilter === 'taxable' && (!isVatCharged || isExport)) return false;
      if (regimeFilter === 'export_exempt' && !isExport) return false;
      if (regimeFilter === 'franchise' && isVatCharged) return false;

      return true;
    });
  }, [finalizedOrders, periodFilter, regimeFilter]);

  // Calculs fiscaux agrégés en temps réel
  const fiscalStats = useMemo(() => {
    let baseTaxableHT = 0;
    let tvaCollectee18 = 0;
    let baseExportExoneree = 0;
    let baseFranchise0 = 0;
    let totalTTC = 0;
    let b2bRevenue = 0;
    let b2cRevenue = 0;
    let b2bTva = 0;
    let b2cTva = 0;

    filteredOrders.forEach(o => {
      const totalOrderTTC = o.totalTTC || 0;
      const country = o.customerCountry || 'Sénégal';
      const isExport = country.toLowerCase() !== 'sénégal' && country.toLowerCase() !== 'senegal';
      const isB2B = Boolean(o.customerCompany || o.ninea);
      
      if (isExport) {
        baseExportExoneree += totalOrderTTC;
        totalTTC += totalOrderTTC;
      } else if (o.vatAmount && o.vatAmount > 0) {
        const orderHT = o.subtotalHT || Math.round(totalOrderTTC / 1.18);
        const orderTVA = o.vatAmount || (totalOrderTTC - orderHT);
        baseTaxableHT += orderHT;
        tvaCollectee18 += orderTVA;
        totalTTC += totalOrderTTC;

        if (isB2B) {
          b2bRevenue += orderHT;
          b2bTva += orderTVA;
        } else {
          b2cRevenue += orderHT;
          b2cTva += orderTVA;
        }
      } else {
        baseFranchise0 += totalOrderTTC;
        totalTTC += totalOrderTTC;
        if (isB2B) b2bRevenue += totalOrderTTC;
        else b2cRevenue += totalOrderTTC;
      }
    });

    // Estimation forfaitaire de TVA déductible sur approvisionnements & fret (comptes 4452 / 4454)
    const estimatedDeductibleVat = Math.round(baseTaxableHT * 0.10);
    const netVatPayable = Math.max(0, tvaCollectee18 - estimatedDeductibleVat);

    return {
      baseTaxableHT,
      tvaCollectee18,
      baseExportExoneree,
      baseFranchise0,
      totalTTC,
      b2bRevenue,
      b2cRevenue,
      b2bTva,
      b2cTva,
      estimatedDeductibleVat,
      netVatPayable,
      ordersCount: filteredOrders.length
    };
  }, [filteredOrders]);

  // Export CSV Déclaration Mensuelle DGID Sénégal
  const handleExportDGIDReport = () => {
    const headers = [
      'N° Ordre',
      'Date Facture',
      'Référence Facture / Commande',
      'Client',
      'NINEA / RCCM',
      'Type Client',
      'Pays Destination',
      'Régime Fiscal',
      'Base Imposable HT (CGI 701/706)',
      'Taux TVA',
      'Montant TVA Collectée (CGI 4431)',
      'Total TTC Facturé (CGI 4111)',
      'Mention Légale Exonération'
    ];

    const rows = filteredOrders.map((o, idx) => {
      const country = o.customerCountry || 'Sénégal';
      const isExport = country.toLowerCase() !== 'sénégal' && country.toLowerCase() !== 'senegal';
      const isB2B = Boolean(o.customerCompany || o.ninea);
      const isVatCharged = Boolean(o.vatAmount && o.vatAmount > 0);
      const ht = isExport ? o.totalTTC : (o.subtotalHT || Math.round(o.totalTTC / 1.18));
      const tva = isExport ? 0 : (o.vatAmount || (o.totalTTC - ht));
      const legalMention = isExport 
        ? 'Exonération TVA 0% Exportation (Art. 358 bis du CGI)'
        : (!isVatCharged ? 'Exonération TVA 0% Franchise en base (Art. 283 du CGI)' : 'TVA 18% de plein droit (Régime Réel)');

      return [
        idx + 1,
        new Date(o.createdAt).toLocaleDateString('fr-FR'),
        `"${o.orderNumber || o.id}"`,
        `"${o.customerName || 'Client'}"`,
        `"${o.ninea || 'N/A'}"`,
        isB2B ? 'B2B (Entreprise)' : 'B2C (Particulier)',
        `"${country}"`,
        isExport ? 'Exportation 0%' : (isVatCharged ? 'Vente Locale 18%' : 'Franchise 0%'),
        ht,
        isExport ? '0%' : (isVatCharged ? '18%' : '0%'),
        tva,
        o.totalTTC,
        `"${legalMention}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Declaration_TVA_DGID_Senegal_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onNotify('Bordereau de déclaration TVA DGID Sénégal téléchargé avec succès.');
  };

  // Export Journal des Écritures Comptables SYSCOHADA
  const handleExportSyscohadaLedger = () => {
    const headers = [
      'Date Écriture',
      'N° Pièce / Facture',
      'Compte Débit',
      'Libellé Compte Débit',
      'Compte Crédit',
      'Libellé Compte Crédit',
      'Montant Débit (FCFA)',
      'Montant Crédit (FCFA)',
      'Libellé Opération'
    ];

    const entries: string[] = [];

    filteredOrders.forEach(o => {
      const country = o.customerCountry || 'Sénégal';
      const isExport = country.toLowerCase() !== 'sénégal' && country.toLowerCase() !== 'senegal';
      const dateStr = new Date(o.createdAt).toLocaleDateString('fr-FR');
      const ht = isExport ? o.totalTTC : (o.subtotalHT || Math.round(o.totalTTC / 1.18));
      const tva = isExport ? 0 : (o.vatAmount || (o.totalTTC - ht));
      const clientName = o.customerName || 'Client';

      // 1. Débit Compte 4111 (Créance Client) pour le Total TTC
      entries.push([
        dateStr,
        `"${o.orderNumber || o.id}"`,
        '4111',
        '"Clients Locaux et Régionaux"',
        '',
        '',
        o.totalTTC,
        '',
        `"Facturation Vente ${o.orderNumber || o.id} - ${clientName}"`
      ].join(';'));

      // 2. Crédit Compte 701 / 706 (Ventes Marchandises / Services HT)
      entries.push([
        dateStr,
        `"${o.orderNumber || o.id}"`,
        '',
        '',
        isExport ? '7012' : '7011',
        isExport ? '"Ventes Marchandises Exportation 0%"' : '"Ventes Marchandises Régime Réel HT"',
        '',
        ht,
        `"CA Marchandises HT - ${o.orderNumber || o.id}"`
      ].join(';'));

      // 3. Crédit Compte 4431 (TVA Collectée 18%) si applicable
      if (tva > 0) {
        entries.push([
          dateStr,
          `"${o.orderNumber || o.id}"`,
          '',
          '',
          '4431',
          '"État - TVA Facturée sur Ventes 18%"',
          '',
          tva,
          `"TVA 18% DGID Sénégal sur facture ${o.orderNumber || o.id}"`
        ].join(';'));
      }
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...entries].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Grand_Livre_SYSCOHADA_Comptes_701_4431_4111_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onNotify('Grand livre des écritures SYSCOHADA (Comptes 701, 706, 4431, 4111) exporté.');
  };

  // Export Déclarations Droits de Douane & DGD Sénégal (Système GAINDE)
  const handleExportCustomsReport = () => {
    const headers = [
      'N° Dossier',
      'Date Commande',
      'Client',
      'NINEA Client',
      'Pays Destination',
      'Statut Douane',
      'N° Déclaration GAINDE',
      'N° DPI / Titre Import',
      'N° Connaissement / LTA',
      'Bureau de Douane',
      'Valeur Caf Marchandises HT',
      'Fret International HT',
      'Total Base Dédouanement',
      'Droits & Taxes Estimés (DD+RS+PCS)'
    ];

    const rows = filteredOrders.map(o => {
      const country = o.customerCountry || 'Sénégal';
      const isExport = country.toLowerCase() !== 'sénégal' && country.toLowerCase() !== 'senegal';
      const goodsHT = (o.items || []).reduce((s, it) => s + ((it.unitPriceHT ?? it.price) * it.quantity), 0);
      const freightHT = o.freightTotalHT ?? o.shippingTotal ?? 0;
      const baseCustoms = goodsHT + freightHT;
      const estimatedDuties = isExport ? 0 : Math.round(baseCustoms * 0.22); // ~20% DD + 1% RS + 1% PCS

      return [
        `"${o.orderNumber || o.id}"`,
        new Date(o.createdAt).toLocaleDateString('fr-FR'),
        `"${o.customerCompany || o.customerName || 'Client'}"`,
        `"${o.ninea || 'N/A'}"`,
        `"${country}"`,
        `"${o.customsStatus || (isExport ? 'Exportation Exonérée' : 'Dédouané Standard')}"`,
        `"${o.customsDeclarationNumber || 'En cours GAINDE'}"`,
        `"${o.customsDpiNumber || 'DPI Automatique'}"`,
        `"${o.customsBlNumber || (o.trackingNumber || 'DAP Dakar')}"`,
        `"${o.customsOffice || 'Port Autonome de Dakar (PAD)'}"`,
        goodsHT,
        freightHT,
        baseCustoms,
        estimatedDuties
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Registre_Douanes_GAINDE_Senegal_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onNotify('Registre des déclarations de Douane (GAINDE) exporté.');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* En-tête avec Statut Fiscal et Actions d'Export */}
      <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-orange-400" />
              <span>Suivi TVA & Fiscalité DGID / SYSCOHADA</span>
            </h2>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
              isVatGloballyActive 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}>
              {isVatGloballyActive ? '🟢 Régime Réel : TVA 18% Active' : '🟡 Régime Franchise / Exonéré 0%'}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Journal de collecte de la TVA, registre d'exportations exonérées (Art. 358 bis CGI) et imputation comptable SYSCOHADA.
          </p>
        </div>

        {/* Boutons d'export rapide */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportDGIDReport}
            className="px-3 py-2 bg-[#003366] hover:bg-[#002244] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
            title="Télécharger le fichier de déclaration mensuelle pour la DGID Sénégal"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Déclaration DGID (.CSV)</span>
          </button>

          <button
            type="button"
            onClick={handleExportCustomsReport}
            className="px-3 py-2 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
            title="Exporter le registre des déclarations douanières GAINDE / DGD Sénégal"
          >
            <Scale className="w-4 h-4 text-emerald-400" />
            <span>Douane & GAINDE</span>
          </button>

          <button
            type="button"
            onClick={handleExportSyscohadaLedger}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 shadow-md cursor-pointer"
            title="Exporter les écritures pour le logiciel comptable (SYSCOHADA révisé)"
          >
            <Download className="w-4 h-4 text-orange-400" />
            <span>Grand Livre SYSCOHADA</span>
          </button>
        </div>
      </div>

      {/* Règle de Conformité Légale & Mention 0% CGI */}
      <div className="p-4 bg-slate-950/80 rounded-2xl border border-blue-500/30 text-xs text-slate-300 space-y-2">
        <div className="flex items-center gap-2 text-blue-400 font-bold uppercase text-[11px] tracking-wider">
          <Info className="w-4 h-4 text-blue-400 shrink-0" />
          <span>Principe Légal d'Affichage des Mentions DGID & SYSCOHADA</span>
        </div>
        <p className="leading-relaxed text-slate-400">
          La mention fiscale légale <strong className="text-white">« 0% Export avec mention Art. 358 bis du CGI, 0% CGU avec mention Art. 283 du CGI, mentions légales (NINEA, RCCM) et imputation comptable SYSCOHADA (comptes 701, 706, 4431, 4111) »</strong> intervient et est affichée <strong className="text-orange-400">exclusivement lorsque la TVA n'est pas facturée</strong> (ventes à l'export hors Sénégal ou régime en franchise). Dès lors que l'entreprise facture la TVA (taux standard de 18%), les lignes HT, TVA 18% et TTC s'appliquent de plein droit sans mention d'exonération.
        </p>
      </div>

      {/* Filtres de Période et de Régime */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-300">Période :</span>
          <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => setPeriodFilter('month')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodFilter === 'month' ? 'bg-[#FF6600] text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Ce Mois
            </button>
            <button
              type="button"
              onClick={() => setPeriodFilter('quarter')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodFilter === 'quarter' ? 'bg-[#FF6600] text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Trimestre
            </button>
            <button
              type="button"
              onClick={() => setPeriodFilter('year')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodFilter === 'year' ? 'bg-[#FF6600] text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Année
            </button>
            <button
              type="button"
              onClick={() => setPeriodFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodFilter === 'all' ? 'bg-[#FF6600] text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tout
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-300">Régime :</span>
          <select
            value={regimeFilter}
            onChange={(e) => setRegimeFilter(e.target.value as any)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
          >
            <option value="all">Tous les régimes ({finalizedOrders.length})</option>
            <option value="taxable">Ventes Locales Soumises TVA 18%</option>
            <option value="export_exempt">Exportations Exonérées 0% (Art. 358 bis)</option>
            <option value="franchise">Franchise / Sans TVA 0%</option>
          </select>
        </div>
      </div>

      {/* 4 Cartes Fiscales Clés */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. TVA Collectée (18%) */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TVA Collectée (CGI 4431)</span>
              <h3 className="text-xl font-black text-emerald-400 mt-1">
                {fiscalStats.tvaCollectee18.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-400">FCFA</span>
              </h3>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Assiette HT : {fiscalStats.baseTaxableHT.toLocaleString('fr-FR')} F</span>
            <span className="text-emerald-400 font-bold">Taux 18%</span>
          </div>
        </div>

        {/* 2. CA Export Exonéré (0% Art. 358 bis) */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Export Exonéré (Art. 358 bis)</span>
              <h3 className="text-xl font-black text-blue-400 mt-1">
                {fiscalStats.baseExportExoneree.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-400">FCFA</span>
              </h3>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Ventes Sous-Région / International</span>
            <span className="text-blue-400 font-bold">0% CGI</span>
          </div>
        </div>

        {/* 3. TVA Déductible Estimée (CGI 4452/4454) */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TVA Déductible Estimée</span>
              <h3 className="text-xl font-black text-purple-400 mt-1">
                {fiscalStats.estimatedDeductibleVat.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-400">FCFA</span>
              </h3>
            </div>
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Achats & Fret déductibles</span>
            <span className="text-purple-400 font-bold">Compte 4452</span>
          </div>
        </div>

        {/* 4. TVA Nette Due à la DGID */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TVA Nette à Reverser</span>
              <h3 className="text-xl font-black text-orange-400 mt-1">
                {fiscalStats.netVatPayable.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-400">FCFA</span>
              </h3>
            </div>
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Solde Déclaration DGID</span>
            <span className="text-orange-400 font-bold">Net à Payer</span>
          </div>
        </div>
      </div>

      {/* Répartition B2B / B2C & Imputations Comptables SYSCOHADA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ventilation B2B vs B2C */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-orange-400" />
            Ventilation de la Collecte : Entreprises (B2B) vs Particuliers (B2C)
          </h3>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold block">Ventes B2B (avec NINEA)</span>
              <span className="text-base font-black text-white mt-1 block">{fiscalStats.b2bRevenue.toLocaleString('fr-FR')} FCFA HT</span>
              <span className="text-[11px] text-emerald-400 mt-0.5 block">TVA collectée : {fiscalStats.b2bTva.toLocaleString('fr-FR')} F</span>
            </div>
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold block">Ventes B2C (Particuliers)</span>
              <span className="text-base font-black text-white mt-1 block">{fiscalStats.b2cRevenue.toLocaleString('fr-FR')} FCFA HT</span>
              <span className="text-[11px] text-emerald-400 mt-0.5 block">TVA collectée : {fiscalStats.b2cTva.toLocaleString('fr-FR')} F</span>
            </div>
          </div>
        </div>

        {/* Plan Comptable & Comptes SYSCOHADA Révisé */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            Plan d'Imputation SYSCOHADA Appliqué
          </h3>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="font-mono text-orange-400 font-bold">Compte 7011 / 706</span>
              <span className="text-slate-300">Ventes de marchandises / prestations HT (Sénégal)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="font-mono text-blue-400 font-bold">Compte 7012</span>
              <span className="text-slate-300">Ventes exonérées à l'exportation (Art. 358 bis CGI)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="font-mono text-emerald-400 font-bold">Compte 4431</span>
              <span className="text-slate-300">État, TVA facturée sur ventes (Taux 18%)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="font-mono text-purple-400 font-bold">Compte 4111</span>
              <span className="text-slate-300">Clients ordinaires (Total TTC facturé)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Registre Détaillé des Opérations et Facturations */}
      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-400" />
              Registre Chronologique de TVA & Facturation ({filteredOrders.length} opération{filteredOrders.length > 1 ? 's' : ''})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Toutes les lignes de facturation avec ventilation HT, TVA 18% et mentions légales appliquées.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Réf Facture</th>
                <th className="py-2.5 px-3">Client & NINEA</th>
                <th className="py-2.5 px-3">Pays / Régime</th>
                <th className="py-2.5 px-3 text-right">Base HT (701)</th>
                <th className="py-2.5 px-3 text-right">TVA 18% (4431)</th>
                <th className="py-2.5 px-3 text-right">Total TTC (4111)</th>
                <th className="py-2.5 px-3">Mention Fiscale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredOrders.map(order => {
                const country = order.customerCountry || 'Sénégal';
                const isExport = country.toLowerCase() !== 'sénégal' && country.toLowerCase() !== 'senegal';
                const isVatCharged = Boolean(order.vatAmount && order.vatAmount > 0);
                const ht = isExport ? order.totalTTC : (order.subtotalHT || Math.round(order.totalTTC / 1.18));
                const tva = isExport ? 0 : (order.vatAmount || (order.totalTTC - ht));
                const clientName = order.customerName || 'Client';
                const ninea = order.ninea || 'N/A';

                return (
                  <tr key={order.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-400">
                      {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-white">
                      {order.orderNumber || order.id}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-200">{clientName}</div>
                      {ninea !== 'N/A' && (
                        <div className="text-[10px] text-orange-400 font-mono">NINEA: {ninea}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        isExport 
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                          : (isVatCharged 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30')
                      }`}>
                        {isExport ? `✈️ Export (${country})` : (isVatCharged ? '🇸🇳 Sénégal 18%' : '🇸🇳 Franchise 0%')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-300">
                      {ht.toLocaleString('fr-FR')} F
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                      {tva > 0 ? `${tva.toLocaleString('fr-FR')} F` : '0 F'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-white">
                      {order.totalTTC.toLocaleString('fr-FR')} F
                    </td>
                    <td className="py-2.5 px-3">
                      {isExport ? (
                        <span className="text-[10px] text-blue-300 font-medium">
                          0% Export (Art. 358 bis CGI)
                        </span>
                      ) : (isVatCharged ? (
                        <span className="text-[10px] text-emerald-400 font-medium">
                          TVA facturée 18%
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-300 font-medium">
                          0% Franchise (Art. 283 CGI)
                        </span>
                      ))}
                    </td>
                  </tr>
                );
              })}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Aucune opération de vente validée trouvée pour les critères et la période sélectionnés.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

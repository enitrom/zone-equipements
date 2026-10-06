import React, { useState, useMemo, useEffect } from 'react';
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
  Layers,
  AlertTriangle,
  CheckCircle2,
  Clock,
  QrCode,
  ShieldCheck,
  RefreshCw,
  Plus,
  Coins,
  ArrowRightLeft,
  Ship,
  Search,
  ExternalLink,
  Eye,
  FileCheck,
  Trash2
} from 'lucide-react';
import { db } from '../../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { catalogService, Order } from '../../services/catalogService';
import { siteSettingsService } from '../../services/siteSettingsService';
import {
  CGU_THRESHOLDS,
  DPI_COMPLIANCE,
  TAF_RATES,
  WITHHOLDING_RATES,
  generateDgidNormalizedInvoiceData,
  calculateVatBalanceAndCarryover,
  calculateCguComplianceStatus,
  generateCreditNoteAccounting,
  calculateTafBreakdown,
  calculateWithholdingTaxesBreakdown,
  CreditNoteData,
  DpiRecord
} from '../../utils/senegalTaxCompliance';

interface WithholdingItem {
  id: string;
  type: 'BRS' | 'RENT' | 'FOREIGN_SUPPLIER';
  baseAmountHT: number;
  beneficiaryName: string;
  ninea?: string;
  date: string;
  label: string;
}

interface TvaFiscaliteManagerProps {
  orders: Order[];
  onNotify: (msg: string) => void;
}

export const TvaFiscaliteManager: React.FC<TvaFiscaliteManagerProps> = ({ orders, onNotify }) => {
  // Navigation par sous-onglets
  const [activeSubTab, setActiveSubTab] = useState<'registry' | 'customs_dpi' | 'cgu_regime' | 'withholding_taf' | 'credit_notes' | 'deadlines'>('registry');

  // Filtres
  const [periodFilter, setPeriodFilter] = useState<'all' | 'month' | 'quarter' | 'year'>('month');
  const [fiscalYear, setFiscalYear] = useState<number>(new Date().getFullYear());
  const [regimeFilter, setRegimeFilter] = useState<'all' | 'taxable_18' | 'export_exempt_0' | 'cgu_franchise_0'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Inspecteurs
  const [selectedNormalizedInvoice, setSelectedNormalizedInvoice] = useState<{
    order: Order;
    dgidNumber: string;
    qrUrl: string;
    hash: string;
  } | null>(null);

  // État des Avoirs / Notes de crédit
  const [creditNotes, setCreditNotes] = useState<CreditNoteData[]>(() => {
    try {
      const saved = localStorage.getItem('ze_credit_notes_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [showNewCreditNoteModal, setShowNewCreditNoteModal] = useState(false);
  const [newCreditNote, setNewCreditNote] = useState({
    originalOrderNumber: '',
    customerName: '',
    ninea: '',
    reason: 'Retour partiel de matériel non conforme',
    amountHT: 150000,
    applyVat: true
  });

  // Retenues à la source déclarées
  const [withholdings, setWithholdings] = useState<WithholdingItem[]>(() => {
    try {
      const saved = localStorage.getItem('ze_withholdings_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [showNewWithholdingModal, setShowNewWithholdingModal] = useState(false);
  const [newWithholding, setNewWithholding] = useState({
    type: 'BRS' as 'BRS' | 'RENT' | 'FOREIGN_SUPPLIER',
    baseAmountHT: 100000,
    beneficiaryName: '',
    ninea: '',
    date: new Date().toISOString().slice(0, 10),
    label: ''
  });

  // Synchronisation temps réel Firestore pour la fiscalité
  useEffect(() => {
    try {
      const taxDocRef = doc(db, 'settings', 'tax_data');
      const unsub = onSnapshot(taxDocRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data?.withholdings)) {
            setWithholdings(data.withholdings);
            localStorage.setItem('ze_withholdings_v1', JSON.stringify(data.withholdings));
          }
          if (Array.isArray(data?.creditNotes)) {
            setCreditNotes(data.creditNotes);
            localStorage.setItem('ze_credit_notes_v1', JSON.stringify(data.creditNotes));
          }
        }
      }, (err) => {
        console.warn('Erreur synchro tax_data Firestore:', err);
      });
      return () => unsub();
    } catch (e) {
      console.warn('Initialisation Firestore tax_data:', e);
    }
  }, []);

  const siteSettings = siteSettingsService.getSettings();
  const isVatGloballyActive = siteSettings.vatEnabled !== false;
  const currentRegime = siteSettings.taxRegime || (isVatGloballyActive ? 'REEL' : 'CGU');

  // Sauvegardes persistantes (Local + Firestore)
  const saveCreditNotes = (data: CreditNoteData[]) => {
    setCreditNotes(data);
    try {
      localStorage.setItem('ze_credit_notes_v1', JSON.stringify(data));
      const taxDocRef = doc(db, 'settings', 'tax_data');
      setDoc(taxDocRef, { creditNotes: data, withholdings }, { merge: true }).catch(() => {});
    } catch {}
  };

  const saveWithholdings = (data: WithholdingItem[]) => {
    setWithholdings(data);
    try {
      localStorage.setItem('ze_withholdings_v1', JSON.stringify(data));
      const taxDocRef = doc(db, 'settings', 'tax_data');
      setDoc(taxDocRef, { withholdings: data, creditNotes }, { merge: true }).catch(() => {});
    } catch {}
  };

  const handleAddWithholding = () => {
    if (!newWithholding.beneficiaryName.trim()) {
      onNotify('Veuillez saisir le nom du bénéficiaire.');
      return;
    }
    if (newWithholding.baseAmountHT <= 0) {
      onNotify('Le montant de la base HT doit être supérieur à 0.');
      return;
    }

    const item: WithholdingItem = {
      id: `wth_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: newWithholding.type,
      baseAmountHT: Number(newWithholding.baseAmountHT),
      beneficiaryName: newWithholding.beneficiaryName.trim(),
      ninea: newWithholding.ninea.trim() || undefined,
      date: newWithholding.date || new Date().toISOString().slice(0, 10),
      label: newWithholding.label.trim() || (newWithholding.type === 'BRS' ? 'Prestation de service BRS' : newWithholding.type === 'RENT' ? 'Bail et loyer professionnel' : 'Fournisseur étranger')
    };

    const updated = [item, ...withholdings];
    saveWithholdings(updated);
    setShowNewWithholdingModal(false);
    setNewWithholding({
      type: 'BRS',
      baseAmountHT: 100000,
      beneficiaryName: '',
      ninea: '',
      date: new Date().toISOString().slice(0, 10),
      label: ''
    });
    onNotify('Retenue à la source enregistrée avec succès.');
  };

  const handleDeleteWithholding = (id: string) => {
    const updated = withholdings.filter(w => w.id !== id);
    saveWithholdings(updated);
    onNotify('Retenue à la source supprimée.');
  };

  // Filtrer uniquement les commandes finalisées / validées pour la comptabilité
  const finalizedOrders = useMemo(() => {
    return orders.filter(o => catalogService.isOrderFinalizedForFinance(o));
  }, [orders]);

  // Commandes filtrées par exercice fiscal, période, régime et recherche
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();

    return finalizedOrders.filter(order => {
      const orderDate = new Date(order.createdAt);
      
      // Filtre Exercice Fiscal
      if (orderDate.getFullYear() !== fiscalYear) {
        return false;
      }

      // Filtre Période
      if (periodFilter === 'month') {
        if (orderDate.getMonth() !== currentMonth) return false;
      } else if (periodFilter === 'quarter') {
        const currentQuarter = Math.floor(currentMonth / 3);
        const orderQuarter = Math.floor(orderDate.getMonth() / 3);
        if (orderQuarter !== currentQuarter) return false;
      }

      // Filtrage par régime fiscal et taux
      const country = order.customerCountry || 'Sénégal';
      const isExport = country.toLowerCase() !== 'sénégal' && country.toLowerCase() !== 'senegal';
      const isVatCharged = Boolean(order.vatAmount && order.vatAmount > 0);

      if (regimeFilter === 'taxable_18' && (!isVatCharged || isExport)) return false;
      if (regimeFilter === 'export_exempt_0' && !isExport) return false;
      if (regimeFilter === 'cgu_franchise_0' && (isVatCharged || isExport)) return false;

      // Recherche textuelle
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNumber = (order.orderNumber || order.id || '').toLowerCase().includes(q);
        const matchClient = (order.customerName || '').toLowerCase().includes(q);
        const matchCompany = (order.customerCompany || '').toLowerCase().includes(q);
        const matchNinea = (order.ninea || '').toLowerCase().includes(q);
        if (!matchNumber && !matchClient && !matchCompany && !matchNinea) return false;
      }

      return true;
    });
  }, [finalizedOrders, fiscalYear, periodFilter, regimeFilter, searchQuery]);

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
    let goodsHT = 0;
    let servicesHT = 0;

    filteredOrders.forEach(o => {
      const orderTTC = o.totalTTC || 0;
      const country = o.customerCountry || 'Sénégal';
      const isExport = country.toLowerCase() !== 'sénégal' && country.toLowerCase() !== 'senegal';
      const isB2B = Boolean(o.customerCompany || o.ninea);
      
      const srvTotal = (o.services || []).reduce((acc, s) => acc + (s.totalHT || 0), 0);
      servicesHT += srvTotal;

      if (isExport) {
        baseExportExoneree += orderTTC;
        totalTTC += orderTTC;
        goodsHT += Math.max(0, orderTTC - srvTotal);
      } else if (o.vatAmount && o.vatAmount > 0) {
        const orderHT = o.subtotalHT || Math.round(orderTTC / 1.18);
        const orderTVA = o.vatAmount || (orderTTC - orderHT);
        baseTaxableHT += orderHT;
        tvaCollectee18 += orderTVA;
        totalTTC += orderTTC;
        goodsHT += Math.max(0, orderHT - srvTotal);

        if (isB2B) {
          b2bRevenue += orderHT;
          b2bTva += orderTVA;
        } else {
          b2cRevenue += orderHT;
          b2cTva += orderTVA;
        }
      } else {
        baseFranchise0 += orderTTC;
        totalTTC += orderTTC;
        goodsHT += Math.max(0, orderTTC - srvTotal);
        if (isB2B) b2bRevenue += orderTTC;
        else b2cRevenue += orderTTC;
      }
    });

    // Impact des Avoirs (notes de crédit émises)
    const totalCreditNotesHT = creditNotes.reduce((sum, c) => sum + c.amountHT, 0);
    const totalCreditNotesVat = creditNotes.reduce((sum, c) => sum + c.vatAmount, 0);

    // Estimation détaillée de la TVA déductible (4452 Marchandises, 4453 Fret, 4454 Services)
    const tvaDeductibleMarchandises4452 = Math.round(baseTaxableHT * 0.08); // 8% estimé sur approvisionnements
    const tvaDeductibleFret4453 = Math.round(baseTaxableHT * 0.02);        // 2% sur transport
    const tvaDeductibleServices4454 = Math.round(baseTaxableHT * 0.01);    // 1% sur prestataires
    const totalTvaDeductible = tvaDeductibleMarchandises4452 + tvaDeductibleFret4453 + tvaDeductibleServices4454;

    // TVA collectée nette après déduction des avoirs
    const adjustedTvaCollectee = Math.max(0, tvaCollectee18 - totalCreditNotesVat);

    // Balance TVA Due (4441) vs Crédit de TVA à reporter (4449)
    const vatBalance = calculateVatBalanceAndCarryover(adjustedTvaCollectee, totalTvaDeductible);

    // Chiffre d'Affaires annuel cumulé pour la jauge CGU
    const annualTurnoverCumulative = finalizedOrders
      .filter(o => new Date(o.createdAt).getFullYear() === fiscalYear)
      .reduce((sum, o) => sum + (o.subtotalHT || o.totalTTC || 0), 0);

    const cguStatus = calculateCguComplianceStatus(
      annualTurnoverCumulative,
      siteSettings.cguActivityType || 'COMMERCE'
    );

    return {
      baseTaxableHT,
      tvaCollectee18,
      adjustedTvaCollectee,
      baseExportExoneree,
      baseFranchise0,
      totalTTC,
      goodsHT,
      servicesHT,
      b2bRevenue,
      b2cRevenue,
      b2bTva,
      b2cTva,
      totalCreditNotesHT,
      totalCreditNotesVat,
      tvaDeductibleMarchandises4452,
      tvaDeductibleFret4453,
      tvaDeductibleServices4454,
      totalTvaDeductible,
      vatBalance,
      annualTurnoverCumulative,
      cguStatus,
      ordersCount: filteredOrders.length
    };
  }, [filteredOrders, creditNotes, finalizedOrders, fiscalYear, siteSettings]);

  // Liste des dossiers DPI (Déclarations Préalables d'Importation)
  const dpiRecords = useMemo<DpiRecord[]>(() => {
    return finalizedOrders
      .filter(o => {
        const goodsVal = (o.items || []).reduce((s, it) => s + ((it.unitPriceHT ?? it.price) * it.quantity), 0);
        const freightVal = o.freightTotalHT ?? o.shippingTotal ?? 0;
        const totalCif = goodsVal + freightVal;
        return totalCif >= DPI_COMPLIANCE.MIN_IMPORT_VALUE_FCFA;
      })
      .map((o) => {
        const goodsVal = (o.items || []).reduce((s, it) => s + ((it.unitPriceHT ?? it.price) * it.quantity), 0);
        const freightVal = o.freightTotalHT ?? o.shippingTotal ?? 0;
        const totalCif = goodsVal + freightVal;

        const orderDate = new Date(o.createdAt);
        const estimatedShipping = new Date(orderDate.getTime() + 18 * 24 * 60 * 60 * 1000);
        const now = new Date();
        const diffDays = Math.ceil((estimatedShipping.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        let status: DpiRecord['status'] = 'DEPOSEE_ORBUS';
        if (o.customsStatus === 'DPI Déposée') status = 'DEPOSEE_ORBUS';
        else if (o.customsStatus === 'Bon à Enlever (BAE)' || o.customsStatus === 'Dédouané') status = 'BAE_OBTENU';
        else if (diffDays < 15) status = 'A_DEPOSER';

        return {
          id: o.id,
          orderNumber: o.orderNumber || o.id,
          orderId: o.id,
          clientName: o.customerCompany || o.customerName || 'Client Industriel',
          ninea: o.ninea,
          supplierCountry: o.sourcePlatform || 'Chine / International',
          goodsValueHT: goodsVal,
          freightValueHT: freightVal,
          totalCifValue: totalCif,
          dpiNumber: o.customsDpiNumber || `DPI-ORBUS-${o.orderNumber.replace(/[^0-9]/g, '').slice(-6) || '2026-01'}`,
          orbusDeclarationNumber: o.customsDeclarationNumber || `ORBUS-SN-${o.orderNumber.slice(-5)}`,
          cotecnaCertificateNumber: `PVoC-COTECNA-${o.orderNumber.slice(-4)}`,
          shippingDateEstimated: estimatedShipping.toISOString().slice(0, 10),
          dpiSubmissionDate: o.createdAt.slice(0, 10),
          status,
          isMandatory: true,
          daysRemainingBeforeShipping: diffDays,
          isUrgent: diffDays <= 15 && status === 'A_DEPOSER'
        };
      });
  }, [finalizedOrders]);

  // Calculs TAF (Taxe sur les Activités Financières)
  const tafStats = useMemo(() => {
    const gatewayFees = finalizedOrders.map(o => {
      const isWaveOrOM = (o.paymentMethod || '').toLowerCase().includes('wave') || (o.paymentMethod || '').toLowerCase().includes('orange');
      const rate = isWaveOrOM ? 0.01 : 0.025;
      const amount = Math.round((o.totalTTC || 0) * rate);
      const isExport = (o.customerCountry || 'Sénégal').toLowerCase() !== 'sénégal' && (o.customerCountry || 'Sénégal').toLowerCase() !== 'senegal';
      return {
        amount,
        label: `Commission ${o.paymentMethod || 'Passerelle'} sur commande ${o.orderNumber}`,
        isExportFinancing: isExport
      };
    });

    return calculateTafBreakdown(gatewayFees);
  }, [finalizedOrders]);

  // Calculs Retenues à la source
  const withholdingStats = useMemo(() => {
    return calculateWithholdingTaxesBreakdown(withholdings);
  }, [withholdings]);

  // Tableau de bord des Échéances fiscales à venir
  const upcomingDeadlines = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 1. Déclaration mensuelle TVA DGID (15 du mois)
    const vatDeadline = new Date(currentYear, currentMonth, 15);
    if (now.getDate() > 15) {
      vatDeadline.setMonth(currentMonth + 1);
    }
    const vatDaysLeft = Math.ceil((vatDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // 2. Acomptes provisionnels Régime Réel Simplifié (15 jan, 15 avr, 15 juil, 15 oct)
    const quarterDates = [
      new Date(currentYear, 0, 15),
      new Date(currentYear, 3, 15),
      new Date(currentYear, 6, 15),
      new Date(currentYear, 9, 15),
      new Date(currentYear + 1, 0, 15)
    ];
    const nextQuarterDeadline = quarterDates.find(d => d.getTime() > now.getTime()) || quarterDates[0];
    const quarterDaysLeft = Math.ceil((nextQuarterDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // 3. Déclaration mensuelle des Retenues à la source BRS/Loyers (15 du mois suivant)
    const withholdingDeadline = new Date(currentYear, currentMonth, 15);
    if (now.getDate() > 15) {
      withholdingDeadline.setMonth(currentMonth + 1);
    }
    const withholdingDaysLeft = Math.ceil((withholdingDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // 4. DPI prioritaires à moins de 15 jours
    const urgentDpis = dpiRecords.filter(d => d.isUrgent);

    return [
      {
        title: 'Déclaration Mensuelle TVA (DGID Sénégal)',
        date: vatDeadline.toLocaleDateString('fr-FR'),
        daysLeft: vatDaysLeft,
        account: 'Compte 4441 / 4449',
        targetAmount: fiscalStats.vatBalance.isCredit ? `Crédit ${fiscalStats.vatBalance.vatCreditCarryover.toLocaleString('fr-FR')} F` : `${fiscalStats.vatBalance.netVatPayable.toLocaleString('fr-FR')} F`,
        status: vatDaysLeft <= 3 ? 'urgent' : vatDaysLeft <= 7 ? 'warning' : 'ok',
        badge: 'Mensuel - 15 du mois'
      },
      {
        title: 'Acompte Provisionnel IS / Régime Réel',
        date: nextQuarterDeadline.toLocaleDateString('fr-FR'),
        daysLeft: quarterDaysLeft,
        account: 'Compte 4441 / Trésor Public',
        targetAmount: '1/3 de l\'impôt N-1',
        status: quarterDaysLeft <= 7 ? 'warning' : 'ok',
        badge: 'Trimestriel (15 Jan/Avr/Juil/Oct)'
      },
      {
        title: 'Bordereau des Retenues à la Source (BRS & Loyers)',
        date: withholdingDeadline.toLocaleDateString('fr-FR'),
        daysLeft: withholdingDaysLeft,
        account: 'Compte 4472 / BRS',
        targetAmount: `${withholdingStats.totalWithheldTax.toLocaleString('fr-FR')} F`,
        status: withholdingDaysLeft <= 3 ? 'urgent' : 'ok',
        badge: 'Mensuel - 15 du mois'
      },
      {
        title: `Dépôt DPI GAINDE / ORBUS (${urgentDpis.length} dossier${urgentDpis.length > 1 ? 's' : ''} prioritaire${urgentDpis.length > 1 ? 's' : ''})`,
        date: '≥ 15 jours avant embarquement',
        daysLeft: urgentDpis.length > 0 ? 3 : 15,
        account: 'Guichet Unique ORBUS',
        targetAmount: 'DPI ≥ 500 000 FCFA',
        status: urgentDpis.length > 0 ? 'urgent' : 'ok',
        badge: 'Règle stricte Douane'
      }
    ];
  }, [fiscalStats, withholdingStats, dpiRecords]);

  // Export CSV Déclaration Mensuelle DGID Sénégal
  const handleExportDGIDReport = () => {
    const headers = [
      'N° Ordre',
      'Date Facture',
      'Réf Facture / Commande',
      'Facture Normalisée DGID',
      'Code Validation / QR Hash',
      'Client',
      'NINEA / RCCM',
      'Type Client',
      'Pays Destination',
      'Régime Fiscal',
      'Base Imposable HT (CGI 701/706)',
      'Taux TVA Appliqué',
      'Montant TVA Collectée (CGI 4431)',
      'Total TTC Facturé (CGI 4111)',
      'Équivalent Multi-Devises (EUR)',
      'Équivalent Multi-Devises (USD)',
      'Taux de Conversion Appliqué',
      'Mention Légale Exonération'
    ];

    const rows = filteredOrders.map((o, idx) => {
      const country = o.customerCountry || 'Sénégal';
      const isExport = country.toLowerCase() !== 'sénégal' && country.toLowerCase() !== 'senegal';
      const isB2B = Boolean(o.customerCompany || o.ninea);
      const isVatCharged = Boolean(o.vatAmount && o.vatAmount > 0);
      const ht = isExport ? o.totalTTC : (o.subtotalHT || Math.round(o.totalTTC / 1.18));
      const tva = isExport ? 0 : (o.vatAmount || (o.totalTTC - ht));
      
      const eurEquiv = (o.totalTTC / 655.957).toFixed(2);
      const usdEquiv = (o.totalTTC / 610).toFixed(2);
      const exchangeInfo = isExport ? '1 EUR = 655.957 F | 1 USD = 610 F' : 'Devise Nationale (XOF/FCFA)';

      const dgid = generateDgidNormalizedInvoiceData({
        invoiceNumber: o.orderNumber || o.id,
        date: o.createdAt,
        totalTTC: o.totalTTC,
        ninea: siteSettings.ninea || '008921822'
      });

      const legalMention = isExport 
        ? 'Exonération TVA 0% Exportation (Art. 358 bis du CGI)'
        : (!isVatCharged ? 'Exonération TVA 0% Franchise / CGU (Art. 283 du CGI)' : 'TVA 18% de plein droit (Régime Réel)');

      return [
        idx + 1,
        new Date(o.createdAt).toLocaleDateString('fr-FR'),
        `"${o.orderNumber || o.id}"`,
        `"${dgid.dgidNormalizedNumber}"`,
        `"${dgid.dgidSecurityHash}"`,
        `"${o.customerName || 'Client'}"`,
        `"${o.ninea || 'N/A'}"`,
        isB2B ? 'B2B (Entreprise)' : 'B2C (Particulier)',
        `"${country}"`,
        isExport ? 'Exportation 0%' : (isVatCharged ? 'Vente Locale 18%' : 'Franchise 0%'),
        ht,
        isExport ? '0%' : (isVatCharged ? '18%' : '0%'),
        tva,
        o.totalTTC,
        isExport ? `"${eurEquiv} EUR"` : 'N/A',
        isExport ? `"${usdEquiv} USD"` : 'N/A',
        `"${exchangeInfo}"`,
        `"${legalMention}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Declaration_TVA_DGID_Senegal_${fiscalYear}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onNotify('Bordereau de déclaration TVA DGID Sénégal téléchargé avec succès.');
  };

  // Export Déclarations Droits de Douane & DPI GAINDE
  const handleExportCustomsReport = () => {
    const headers = [
      'N° Dossier Commande',
      'N° DPI ORBUS',
      'N° Déclaration GAINDE',
      'Client',
      'NINEA Client',
      'Pays Provenance',
      'Valeur CAF Marchandises (FCFA)',
      'Fret International (FCFA)',
      'Total Base Dédouanement CIF (FCFA)',
      'Droits & Taxes Estimés (DD+RS+PCS 22%)',
      'Statut GAINDE',
      'Date Embarquement Estimée'
    ];

    const rows = dpiRecords.map(d => {
      const estimatedDuties = Math.round(d.totalCifValue * 0.22);
      return [
        `"${d.orderNumber}"`,
        `"${d.dpiNumber}"`,
        `"${d.orbusDeclarationNumber || 'En cours ORBUS'}"`,
        `"${d.clientName}"`,
        `"${d.ninea || 'N/A'}"`,
        `"${d.supplierCountry}"`,
        d.goodsValueHT,
        d.freightValueHT,
        d.totalCifValue,
        estimatedDuties,
        `"${d.status}"`,
        d.shippingDateEstimated
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Registre_Douanes_DPI_GAINDE_Senegal_${fiscalYear}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onNotify('Registre des DPI et déclarations Douane GAINDE exporté.');
  };

  // Export Bordereau Retenues à la Source (BRS / Loyers / Étrangers)
  const handleExportWithholdingReport = () => {
    const headers = [
      'Date',
      'Type Retenue',
      'Bénéficiaire',
      'NINEA',
      'Libellé Opération',
      'Base Imposable HT',
      'Taux Retenue',
      'Montant Précompté à Reverser'
    ];

    const rows = withholdings.map(w => {
      const rate = w.type === 'BRS' ? 0.05 : w.type === 'RENT' ? 0.05 : 0.20;
      const tax = Math.round(w.baseAmountHT * rate);
      return [
        w.date,
        w.type === 'BRS' ? 'BRS (Services 5%)' : w.type === 'RENT' ? 'Retenue Loyer (5%)' : 'Prestataire Étranger (20%)',
        `"${w.beneficiaryName}"`,
        `"${w.ninea || 'N/A'}"`,
        `"${w.label}"`,
        w.baseAmountHT,
        `${(rate * 100).toFixed(0)}%`,
        tax
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bordereau_Retenues_Source_DGID_${fiscalYear}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onNotify('Bordereau mensuel des retenues à la source (BRS / Loyers) exporté.');
  };

  // Export Grand Livre SYSCOHADA Révisé
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
        '"Clients Locaux et Régionaux (TTC)"',
        '',
        '',
        o.totalTTC,
        '',
        `"Facturation Vente ${o.orderNumber || o.id} - ${clientName}"`
      ].join(';'));

      // 2. Crédit Compte 7011 / 7012 / 706 (Ventes Marchandises / Services HT)
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

    // Intégration des écritures d'Avoirs (Débit 709 & 4431, Crédit 4111)
    creditNotes.forEach(cn => {
      entries.push([
        cn.date,
        `"AVOIR-${cn.creditNoteNumber}"`,
        '709',
        '"Rabais, remises et ristournes accordés (Avoirs HT)"',
        '',
        '',
        cn.amountHT,
        '',
        `"Avoir sur facture ${cn.originalOrderNumber} - ${cn.customerName}"`
      ].join(';'));

      if (cn.vatAmount > 0) {
        entries.push([
          cn.date,
          `"AVOIR-${cn.creditNoteNumber}"`,
          '4431',
          '"État - Régularisation TVA collectée"',
          '',
          '',
          cn.vatAmount,
          '',
          `"Annulation TVA 18% Avoir ${cn.creditNoteNumber}"`
        ].join(';'));
      }

      entries.push([
        cn.date,
        `"AVOIR-${cn.creditNoteNumber}"`,
        '',
        '',
        '4111',
        '"Clients - Diminution créance"',
        '',
        cn.amountTTC,
        `"Crédit Client Avoir ${cn.creditNoteNumber}"`
      ].join(';'));
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...entries].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Grand_Livre_SYSCOHADA_Comptes_701_706_4431_4441_4449_${fiscalYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onNotify('Grand livre SYSCOHADA (Comptes 701, 706, 709, 4431, 4441, 4449, 4111) exporté.');
  };

  // Création d'une nouvelle note d'avoir
  const handleCreateCreditNote = () => {
    if (!newCreditNote.originalOrderNumber.trim() || newCreditNote.amountHT <= 0) {
      onNotify('Veuillez renseigner le N° de facture d\'origine et un montant valide.');
      return;
    }

    const vat = newCreditNote.applyVat ? Math.round(newCreditNote.amountHT * 0.18) : 0;
    const ttc = newCreditNote.amountHT + vat;
    const cnNumber = `AV-${fiscalYear}-${Date.now().toString().slice(-4)}`;
    const dateStr = new Date().toISOString().slice(0, 10);

    const cnData: CreditNoteData = {
      id: `cn-${Date.now()}`,
      creditNoteNumber: cnNumber,
      originalOrderNumber: newCreditNote.originalOrderNumber.trim(),
      date: dateStr,
      customerName: newCreditNote.customerName.trim() || 'Client',
      ninea: newCreditNote.ninea.trim() || undefined,
      reason: newCreditNote.reason,
      amountHT: newCreditNote.amountHT,
      vatAmount: vat,
      amountTTC: ttc,
      syscohadaEntries: generateCreditNoteAccounting({
        creditNoteNumber: cnNumber,
        date: dateStr,
        clientName: newCreditNote.customerName.trim() || 'Client',
        amountHT: newCreditNote.amountHT,
        vatAmount: vat,
        amountTTC: ttc
      })
    };

    saveCreditNotes([cnData, ...creditNotes]);
    setShowNewCreditNoteModal(false);
    onNotify(`Avoir ${cnNumber} créé et imputé au débit du compte 4431 (Régularisation TVA).`);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* En-tête avec Statut Fiscal, Exercice Fiscal et Actions d'Export */}
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
              {isVatGloballyActive ? '🟢 Régime Réel : TVA 18% Active' : '🟡 Régime CGU / Franchise 0%'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Exercice Fiscal {fiscalYear}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Conformité Code Général des Impôts (CGI) du Sénégal • Facturation normalisée DGID • GAINDE 2000 & ORBUS • Plan SYSCOHADA Révisé.
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
            title="Télécharger le registre des déclarations douanières DPI / GAINDE"
          >
            <Ship className="w-4 h-4 text-emerald-400" />
            <span>Douane & GAINDE (.CSV)</span>
          </button>

          <button
            type="button"
            onClick={handleExportWithholdingReport}
            className="px-3 py-2 bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-700/60 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
            title="Télécharger le bordereau des retenues à la source (BRS / Loyers / Prestataires étrangers)"
          >
            <Percent className="w-4 h-4 text-purple-400" />
            <span>Retenues BRS (.CSV)</span>
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

      {/* Barre de navigation des Sous-Onglets Fiscaux */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-800">
        <button
          type="button"
          onClick={() => setActiveSubTab('registry')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'registry'
              ? 'bg-[#FF6600] text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Registre & Déclaration TVA</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('customs_dpi')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'customs_dpi'
              ? 'bg-[#FF6600] text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Ship className="w-4 h-4" />
          <span>Douane, DPI & GAINDE</span>
          {dpiRecords.filter(d => d.isUrgent).length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[9px] font-black">
              {dpiRecords.filter(d => d.isUrgent).length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('cgu_regime')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'cgu_regime'
              ? 'bg-[#FF6600] text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Régime CGU vs Réel (Seuils CA)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('withholding_taf')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'withholding_taf'
              ? 'bg-[#FF6600] text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Percent className="w-4 h-4" />
          <span>Retenues à la Source & TAF</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('credit_notes')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'credit_notes'
              ? 'bg-[#FF6600] text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Avoirs & Notes de Crédit ({creditNotes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('deadlines')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'deadlines'
              ? 'bg-[#FF6600] text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Alertes & Échéances Fiscale</span>
        </button>
      </div>

      {/* 4 Cartes Clés Fiscale avec Gestion du Crédit de TVA (Compte 4449) vs TVA à reverser (Compte 4441) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. TVA Collectée (18%) */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TVA Collectée (CGI 4431)</span>
              <h3 className="text-xl font-black text-emerald-400 mt-1">
                {fiscalStats.adjustedTvaCollectee.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-400">FCFA</span>
              </h3>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Base HT (701) : {fiscalStats.baseTaxableHT.toLocaleString('fr-FR')} F</span>
            <span className="text-emerald-400 font-bold">Taux 18%</span>
          </div>
        </div>

        {/* 2. CA Export Exonéré (0% Art. 358 bis) */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Export Exonéré (Compte 7012)</span>
              <h3 className="text-xl font-black text-blue-400 mt-1">
                {fiscalStats.baseExportExoneree.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-400">FCFA</span>
              </h3>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Ventes Sous-Région / Inter.</span>
            <span className="text-blue-400 font-bold">0% (Art. 358 bis)</span>
          </div>
        </div>

        {/* 3. TVA Déductible Totale (Comptes 4452, 4453, 4454) */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TVA Déductible (4452/4453/4454)</span>
              <h3 className="text-xl font-black text-purple-400 mt-1">
                {fiscalStats.totalTvaDeductible.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-400">FCFA</span>
              </h3>
            </div>
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Achats (4452) + Fret (4453)</span>
            <span className="text-purple-400 font-bold">Récupérable</span>
          </div>
        </div>

        {/* 4. Solde Net DGID : TVA Nette Due (4441) OU Crédit de TVA à Reporter (4449) */}
        <div className={`p-5 rounded-2xl border shadow-xl relative overflow-hidden ${
          fiscalStats.vatBalance.isCredit
            ? 'bg-blue-950/40 border-blue-500/40 text-blue-300'
            : 'bg-slate-950 border-slate-800 text-orange-400'
        }`}>
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {fiscalStats.vatBalance.isCredit ? 'Crédit de TVA à Reporter (4449)' : 'TVA Nette à Reverser (4441)'}
              </span>
              <h3 className={`text-xl font-black mt-1 ${fiscalStats.vatBalance.isCredit ? 'text-blue-400' : 'text-orange-400'}`}>
                {(fiscalStats.vatBalance.isCredit ? fiscalStats.vatBalance.vatCreditCarryover : fiscalStats.vatBalance.netVatPayable).toLocaleString('fr-FR')}{' '}
                <span className="text-xs font-normal text-slate-400">FCFA</span>
              </h3>
            </div>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              fiscalStats.vatBalance.isCredit ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'
            }`}>
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">
              {fiscalStats.vatBalance.isCredit ? 'Report sur déclaration suivante' : 'Solde Déclaration DGID'}
            </span>
            <span className="font-bold">
              {fiscalStats.vatBalance.isCredit ? 'Crédit 4449' : 'Net à Payer 4441'}
            </span>
          </div>
        </div>
      </div>

      {/* ================= SOUS-ONGLET 1: REGISTRE CHRONOLOGIQUE TVA ================= */}
      {activeSubTab === 'registry' && (
        <div className="space-y-4">
          {/* Barre de filtres de Période, Exercice Fiscal et Régime */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
            <div className="flex flex-wrap items-center gap-3">
              {/* Sélecteur Exercice Fiscal */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-400">Exercice :</span>
                <select
                  value={fiscalYear}
                  onChange={(e) => setFiscalYear(parseInt(e.target.value, 10))}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-orange-500"
                >
                  <option value={2026}>2026 (En cours)</option>
                  <option value={2025}>2025</option>
                  <option value={2024}>2024</option>
                </select>
              </div>

              {/* Filtre Période */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
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
                    Année Complète
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

              {/* Filtre Régime */}
              <div className="flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={regimeFilter}
                  onChange={(e) => setRegimeFilter(e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="all">Tous les taux & régimes ({finalizedOrders.length})</option>
                  <option value="taxable_18">Ventes Soumises TVA 18% (Régime Réel)</option>
                  <option value="export_exempt_0">Exportations Exonérées 0% (Art. 358 bis)</option>
                  <option value="cgu_franchise_0">Franchise / CGU 0% (Art. 283)</option>
                </select>
              </div>
            </div>

            {/* Recherche textuelle */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher facture, NINEA, client..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Registre Chronologique */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-400" />
                  Registre Chronologique des Facturations & TVA ({filteredOrders.length} opération{filteredOrders.length > 1 ? 's' : ''})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ventilation comptable SYSCOHADA (701, 706, 4431, 4111) et certification normalisée DGID.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Réf Facture</th>
                    <th className="py-2.5 px-3">Facture Normalisée DGID</th>
                    <th className="py-2.5 px-3">Client & NINEA</th>
                    <th className="py-2.5 px-3">Taux Appliqué</th>
                    <th className="py-2.5 px-3 text-right">Base HT (701/706)</th>
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

                    const dgid = generateDgidNormalizedInvoiceData({
                      invoiceNumber: order.orderNumber || order.id,
                      date: order.createdAt,
                      totalTTC: order.totalTTC,
                      ninea: siteSettings.ninea || '008921822'
                    });

                    return (
                      <tr key={order.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-400">
                          {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-white">
                          {order.orderNumber || order.id}
                        </td>
                        <td className="py-2.5 px-3">
                          <button
                            type="button"
                            onClick={() => setSelectedNormalizedInvoice({
                              order,
                              dgidNumber: dgid.dgidNormalizedNumber,
                              qrUrl: dgid.dgidQrCodeUrl,
                              hash: dgid.dgidSecurityHash
                            })}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-400 font-mono text-[10px] font-bold cursor-pointer transition-all"
                            title="Voir le certificat et QR code normalisé DGID"
                          >
                            <QrCode className="w-3 h-3 text-emerald-400" />
                            <span>{dgid.dgidNormalizedNumber}</span>
                          </button>
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
                            {isExport ? '0% Exonéré' : (isVatCharged ? '18% Taux Réel' : '0% Franchise')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-300">
                          {ht.toLocaleString('fr-FR')} F
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                          {tva > 0 ? `${tva.toLocaleString('fr-FR')} F` : '0 F'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          <div className="font-black text-white">{order.totalTTC.toLocaleString('fr-FR')} F</div>
                          {isExport && (
                            <div className="text-[9px] text-blue-400 font-normal">
                              ~${(order.totalTTC / 610).toFixed(0)} / ~€{(order.totalTTC / 655.957).toFixed(0)}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {isExport ? (
                            <span className="text-[10px] text-blue-300 font-medium">
                              0% Export (Art. 358 bis CGI)
                            </span>
                          ) : (isVatCharged ? (
                            <span className="text-[10px] text-emerald-400 font-medium">
                              TVA 18% facturée
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
                      <td colSpan={9} className="py-8 text-center text-slate-500">
                        Aucune opération de vente validée trouvée pour les critères et la période sélectionnés.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= SOUS-ONGLET 2: DOUANE, DPI & GAINDE 2000 ================= */}
      {activeSubTab === 'customs_dpi' && (
        <div className="space-y-4">
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <Ship className="w-4 h-4 text-emerald-400" />
                  Déclarations Préalables d'Importation (DPI ≥ 500 000 FCFA) & Système GAINDE
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Obligation légale sénégalaise : Dépôt via ORBUS au moins 15 jours avant l'embarquement à l'usine partenaire.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Dossiers DPI Actifs</span>
                <span className="text-xl font-black text-white mt-1 block">{dpiRecords.length}</span>
                <span className="text-[10px] text-slate-400">Total CIF ≥ 500 000 FCFA</span>
              </div>

              <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Valeur CIF Totale en Douane</span>
                <span className="text-xl font-black text-emerald-400 mt-1">
                  {dpiRecords.reduce((s, d) => s + d.totalCifValue, 0).toLocaleString('fr-FR')} FCFA
                </span>
                <span className="text-[10px] text-slate-400">Base taxation GAINDE</span>
              </div>

              <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">DPI Urgentes (≤ 15 jours)</span>
                <span className="text-xl font-black text-red-400 mt-1">
                  {dpiRecords.filter(d => d.isUrgent).length}
                </span>
                <span className="text-[10px] text-red-300">À régulariser avant embarquement</span>
              </div>
            </div>

            {/* Tableau des DPI */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Réf Commande</th>
                    <th className="py-2.5 px-3">N° DPI ORBUS</th>
                    <th className="py-2.5 px-3">Client & NINEA</th>
                    <th className="py-2.5 px-3 text-right">Valeur Marchandises</th>
                    <th className="py-2.5 px-3 text-right">Fret International</th>
                    <th className="py-2.5 px-3 text-right">Total Base CIF</th>
                    <th className="py-2.5 px-3">Statut GAINDE / ORBUS</th>
                    <th className="py-2.5 px-3">Échéance Embarquement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {dpiRecords.map(dpi => (
                    <tr key={dpi.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-white">
                        {dpi.orderNumber}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-emerald-400 font-bold">
                        {dpi.dpiNumber}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-200">{dpi.clientName}</div>
                        {dpi.ninea && <div className="text-[10px] text-slate-400">NINEA: {dpi.ninea}</div>}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {dpi.goodsValueHT.toLocaleString('fr-FR')} F
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                        {dpi.freightValueHT.toLocaleString('fr-FR')} F
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-white">
                        {dpi.totalCifValue.toLocaleString('fr-FR')} F
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {dpi.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <Clock className={`w-3.5 h-3.5 ${dpi.isUrgent ? 'text-red-400' : 'text-slate-400'}`} />
                          <span className={`text-[11px] font-medium ${dpi.isUrgent ? 'text-red-400 font-bold' : 'text-slate-300'}`}>
                            {dpi.daysRemainingBeforeShipping > 0 ? `Dans ${dpi.daysRemainingBeforeShipping} j` : 'Immédiat'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {dpiRecords.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        Aucun dossier d'importation ≥ 500 000 FCFA soumis à DPI actuellement.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= SOUS-ONGLET 3: RÉGIME CGU vs RÉEL ================= */}
      {activeSubTab === 'cgu_regime' && (
        <div className="space-y-4">
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-5">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                Suivi du Régime CGU (Contribution Globale Unique) & Seuil de Bascule au Réel
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Article 283 du Code Général des Impôts : Plafond annuel de 50 000 000 FCFA (Commerce) et 100 000 000 FCFA (Services).
              </p>
            </div>

            {/* Jauge de progression du seuil */}
            <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-white">Chiffre d'Affaires Annuel Cumulé ({fiscalYear})</span>
                  <span className="text-xs text-slate-400 block mt-0.5">Activité : Commerce de matériel & équipements</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-amber-400">
                    {fiscalStats.cguStatus.annualTurnoverFCFA.toLocaleString('fr-FR')} FCFA
                  </span>
                  <span className="text-xs text-slate-400 block">
                    / {fiscalStats.cguStatus.threshold.toLocaleString('fr-FR')} FCFA ({fiscalStats.cguStatus.percentage}%)
                  </span>
                </div>
              </div>

              {/* Barre de jauge */}
              <div className="w-full h-3.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    fiscalStats.cguStatus.isExceeded
                      ? 'bg-red-500'
                      : fiscalStats.cguStatus.percentage > 80
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, fiscalStats.cguStatus.percentage)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>0 FCFA</span>
                <span className="font-bold text-amber-400">Seuil Légal : 50M FCFA</span>
                <span>100M FCFA</span>
              </div>
            </div>

            {/* Règles CGU */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Règles & Avantages du Régime CGU
                </h4>
                <ul className="space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                  <li>• <strong>Impôt forfaitaire unique :</strong> 5% du CA annuel libératoire.</li>
                  <li>• Remplace l'IS, l'IR, la TVA et la contribution des patentes.</li>
                  <li>• <strong>Sous CGU :</strong> Aucune TVA n'est collectée auprès des clients, aucune TVA déductible.</li>
                  <li>• Mention obligatoire sur les factures : <em>« TVA non applicable — régime CGU (Art. 283 CGI) »</em>.</li>
                </ul>
              </div>

              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  Bascule Automatique au Régime Réel
                </h4>
                <ul className="space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                  <li>• Dès franchissement du seuil de 50 000 000 FCFA, l'entreprise bascule obligatoirement au Régime Réel.</li>
                  <li>• Facturation de la TVA 18% de plein droit sur toutes les opérations suivantes.</li>
                  <li>• Émission de factures normalisées avec code unique DGID et télétransmission.</li>
                  <li>• Déduction de la TVA sur achats (4452), fret (4453) et services (4454).</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= SOUS-ONGLET 4: RETENUES À LA SOURCE & TAF ================= */}
      {activeSubTab === 'withholding_taf' && (
        <div className="space-y-4">
          {/* Section 1: TAF */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Percent className="w-4 h-4 text-blue-400" />
                Taxe sur les Activités Financières (TAF 17% Standard / 7% Export)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Applicable aux commissions de transfert, frais de passerelles de paiement (Wave, PayDunya, Orange Money) et solutions internationales (Payoneer, Wise).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Base Frais Standard (17%)</span>
                <span className="text-lg font-black text-white mt-1 block">{tafStats.baseStandard.toLocaleString('fr-FR')} FCFA</span>
                <span className="text-[10px] text-blue-400">TAF calculée : {tafStats.tafStandard.toLocaleString('fr-FR')} F</span>
              </div>

              <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Base Financement Export (7%)</span>
                <span className="text-lg font-black text-white mt-1 block">{tafStats.baseExport.toLocaleString('fr-FR')} FCFA</span>
                <span className="text-[10px] text-emerald-400">TAF réduite : {tafStats.tafExport.toLocaleString('fr-FR')} F</span>
              </div>

              <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total TAF Due à Déclarer</span>
                <span className="text-lg font-black text-orange-400 mt-1">{tafStats.totalTafDue.toLocaleString('fr-FR')} FCFA</span>
                <span className="text-[10px] text-slate-400">Déclaration mensuelle DGID</span>
              </div>
            </div>
          </div>

          {/* Section 2: Retenues à la Source */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  Retenues à la Source (BRS 5%, Loyers 5%, Prestataires Étrangers 20%)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Suivi des retenues fiscales prélevées sur les prestataires et fournisseurs tiers pour reversement au Trésor.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowNewWithholdingModal(true)}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Enregistrer une Retenue</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Type de Retenue</th>
                    <th className="py-2.5 px-3">Bénéficiaire & NINEA</th>
                    <th className="py-2.5 px-3">Libellé Prestation</th>
                    <th className="py-2.5 px-3 text-right">Base HT</th>
                    <th className="py-2.5 px-3 text-right">Taux</th>
                    <th className="py-2.5 px-3 text-right">Montant Retenu</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {withholdings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                        Aucune retenue à la source enregistrée pour le moment. Cliquez sur « Enregistrer une Retenue » pour en ajouter une.
                      </td>
                    </tr>
                  ) : (
                    withholdings.map(w => {
                      const rate = w.type === 'BRS' ? 0.05 : w.type === 'RENT' ? 0.05 : 0.20;
                      const tax = Math.round(w.baseAmountHT * rate);

                      return (
                        <tr key={w.id} className="hover:bg-slate-900/50 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-slate-400">{w.date}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              w.type === 'BRS' ? 'bg-purple-500/20 text-purple-300' : w.type === 'RENT' ? 'bg-blue-500/20 text-blue-300' : 'bg-red-500/20 text-red-300'
                            }`}>
                              {w.type === 'BRS' ? 'BRS (Services 5%)' : w.type === 'RENT' ? 'Retenue Loyer (5%)' : 'Prestataire Étranger (20%)'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-200">{w.beneficiaryName}</div>
                            {w.ninea && <div className="text-[10px] text-slate-400">NINEA: {w.ninea}</div>}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">{w.label}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-300">
                            {w.baseAmountHT.toLocaleString('fr-FR')} F
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-400">
                            {(rate * 100).toFixed(0)}%
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-400">
                            {tax.toLocaleString('fr-FR')} F
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteWithholding(w.id)}
                              title="Supprimer cette retenue"
                              className="p-1 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {/* ================= SOUS-ONGLET 5: AVOIRS & NOTES DE CRÉDIT ================= */}
      {activeSubTab === 'credit_notes' && (
        <div className="space-y-4">
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-orange-400" />
                  Avoirs & Notes de Crédit (SYSCOHADA : Débit Compte 4431 & 709)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Gestion des retours de marchandises, remises et régularisations de TVA collectée.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowNewCreditNoteModal(true)}
                className="px-3.5 py-2 bg-[#FF6600] hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Créer une Note d'Avoir</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">N° Avoir</th>
                    <th className="py-2.5 px-3">Facture Rattachée</th>
                    <th className="py-2.5 px-3">Client</th>
                    <th className="py-2.5 px-3">Motif de l'Avoir</th>
                    <th className="py-2.5 px-3 text-right">Montant HT (709)</th>
                    <th className="py-2.5 px-3 text-right">TVA Régularisée (4431)</th>
                    <th className="py-2.5 px-3 text-right">Total TTC (4111)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {creditNotes.map(cn => (
                    <tr key={cn.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-400">{cn.date}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-orange-400">{cn.creditNoteNumber}</td>
                      <td className="py-2.5 px-3 font-mono text-white">{cn.originalOrderNumber}</td>
                      <td className="py-2.5 px-3 text-slate-200 font-semibold">{cn.customerName}</td>
                      <td className="py-2.5 px-3 text-slate-300">{cn.reason}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-300">
                        -{cn.amountHT.toLocaleString('fr-FR')} F
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                        -{cn.vatAmount.toLocaleString('fr-FR')} F
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-white">
                        -{cn.amountTTC.toLocaleString('fr-FR')} F
                      </td>
                    </tr>
                  ))}

                  {creditNotes.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        Aucune note d'avoir enregistrée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= SOUS-ONGLET 6: ALERTES & ÉCHÉANCES FISCALES ================= */}
      {activeSubTab === 'deadlines' && (
        <div className="space-y-4">
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-400" />
                Tableau de Bord des Échéances & Déclarations DGID Sénégal
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Surveillance automatique des dates limites de dépôts légaux et de règlements au Trésor.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingDeadlines.map((dl, idx) => (
                <div key={idx} className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {dl.badge}
                      </span>
                      <span className="text-xs font-bold text-white">{dl.title}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Date limite : <strong className="text-white">{dl.date}</strong> • Imputation : <span className="font-mono text-orange-400">{dl.account}</span>
                    </div>
                    <div className="text-sm font-black text-emerald-400">
                      Montant cible : {dl.targetAmount}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-black inline-flex items-center gap-1 ${
                      dl.status === 'urgent'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                        : dl.status === 'warning'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      <Clock className="w-3 h-3" />
                      <span>{dl.daysLeft} jours restants</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Certificat & Facture Normalisée DGID */}
      {selectedNormalizedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-emerald-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                <FileCheck className="w-5 h-5" />
                <span>Facture Normalisée Certifiée DGID</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNormalizedInvoice(null)}
                className="w-7 h-7 rounded-lg bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-center space-y-3">
              <div className="inline-block p-3 bg-white rounded-2xl shadow-lg">
                <img
                  src={selectedNormalizedInvoice.qrUrl}
                  alt="QR Code DGID"
                  className="w-36 h-36 mx-auto object-contain"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Numéro Unique de Série DGID</span>
                <span className="text-base font-black font-mono text-emerald-400 block mt-0.5">
                  {selectedNormalizedInvoice.dgidNumber}
                </span>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-left text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Réf. Commande :</span>
                  <span className="text-white font-bold">{selectedNormalizedInvoice.order.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Client :</span>
                  <span className="text-white font-bold">{selectedNormalizedInvoice.order.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">NINEA Émetteur :</span>
                  <span className="text-white font-mono">{siteSettings.ninea || '008921822'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total TTC :</span>
                  <span className="text-emerald-400 font-bold">{selectedNormalizedInvoice.order.totalTTC.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800 text-[10px]">
                  <span className="text-slate-500">Clé Hash Sécurité :</span>
                  <span className="font-mono text-slate-400">{selectedNormalizedInvoice.hash}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onNotify(`Télétransmission validée vers la plateforme DGID Sénégal.`);
                setSelectedNormalizedInvoice(null);
              }}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              Confirmer la Télétransmission DGID
            </button>
          </div>
        </div>
      )}

      {/* Modal Création Note d'Avoir */}
      {showNewCreditNoteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-orange-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-orange-400" />
                <span>Nouvelle Note d'Avoir / Crédit</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewCreditNoteModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 text-[11px] font-bold mb-1">Réf Facture d'Origine *</label>
                <input
                  type="text"
                  value={newCreditNote.originalOrderNumber}
                  onChange={(e) => setNewCreditNote(prev => ({ ...prev, originalOrderNumber: e.target.value }))}
                  placeholder="Ex: ZE-2026-0042"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] font-bold mb-1">Nom du Client</label>
                <input
                  type="text"
                  value={newCreditNote.customerName}
                  onChange={(e) => setNewCreditNote(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="Ex: Entreprise BTP Sénégal"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 text-[11px] font-bold mb-1">Montant HT (FCFA) *</label>
                  <input
                    type="number"
                    value={newCreditNote.amountHT}
                    onChange={(e) => setNewCreditNote(prev => ({ ...prev, amountHT: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] font-bold mb-1">TVA 18% (4431)</label>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="cn-vat"
                      checked={newCreditNote.applyVat}
                      onChange={(e) => setNewCreditNote(prev => ({ ...prev, applyVat: e.target.checked }))}
                      className="rounded text-orange-500"
                    />
                    <label htmlFor="cn-vat" className="text-slate-300 text-xs">Régulariser 18%</label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] font-bold mb-1">Motif de l'Avoir</label>
                <input
                  type="text"
                  value={newCreditNote.reason}
                  onChange={(e) => setNewCreditNote(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Ex: Retour marchandise, remise accordée..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowNewCreditNoteModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleCreateCreditNote}
                className="px-4 py-2 bg-[#FF6600] hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                Enregistrer & Imputer au Débit 4431
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Création Retenue à la Source */}
      {showNewWithholdingModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-purple-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>Enregistrer une Retenue à la Source</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewWithholdingModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 text-[11px] font-bold mb-1">Type de Retenue *</label>
                <select
                  value={newWithholding.type}
                  onChange={(e) => setNewWithholding(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"
                >
                  <option value="BRS">BRS - Prestations de services locales (5%)</option>
                  <option value="RENT">Retenue sur loyer professionnel (5%)</option>
                  <option value="FOREIGN_SUPPLIER">Prestataire étranger non-résident (20%)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] font-bold mb-1">Nom du Bénéficiaire / Fournisseur *</label>
                <input
                  type="text"
                  value={newWithholding.beneficiaryName}
                  onChange={(e) => setNewWithholding(prev => ({ ...prev, beneficiaryName: e.target.value }))}
                  placeholder="Ex: Prestataire Maintenance Dakar"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 text-[11px] font-bold mb-1">NINEA Bénéficiaire</label>
                  <input
                    type="text"
                    value={newWithholding.ninea}
                    onChange={(e) => setNewWithholding(prev => ({ ...prev, ninea: e.target.value }))}
                    placeholder="Ex: 007849102"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] font-bold mb-1">Date Déclaration</label>
                  <input
                    type="date"
                    value={newWithholding.date}
                    onChange={(e) => setNewWithholding(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] font-bold mb-1">Base HT de la Prestation (FCFA) *</label>
                <input
                  type="number"
                  value={newWithholding.baseAmountHT}
                  onChange={(e) => setNewWithholding(prev => ({ ...prev, baseAmountHT: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-purple-500"
                />
                <span className="text-[10px] text-purple-400 mt-1 block">
                  Montant prélevé à reverser : {Math.round(newWithholding.baseAmountHT * (newWithholding.type === 'BRS' ? 0.05 : newWithholding.type === 'RENT' ? 0.05 : 0.20)).toLocaleString('fr-FR')} FCFA
                </span>
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] font-bold mb-1">Libellé ou Référence de l'Opération</label>
                <input
                  type="text"
                  value={newWithholding.label}
                  onChange={(e) => setNewWithholding(prev => ({ ...prev, label: e.target.value }))}
                  placeholder="Ex: Raccordement électrique groupe industriel"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowNewWithholdingModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleAddWithholding}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                Enregistrer & Déclarer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

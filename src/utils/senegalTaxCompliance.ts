/**
 * SÉNÉGAL (DGID) & SYSCOHADA - MODULE DE CONFORMITÉ FISCALE ET COMPTABLE
 * 
 * Règles appliquées conformément au Code Général des Impôts (CGI) du Sénégal :
 * 1. Taux normal de TVA : 18% (Article 355 et suivants du CGI).
 * 2. Vente Locale au Sénégal (SN) & Régime Réel -> TVA 18% de plein droit (calcul HT / TVA 18% / TTC).
 * 3. Livraison Hors Sénégal (Exportations sous-région UEMOA / International) :
 *    -> Taux 0% et mention légale obligatoire : "Exonéré de TVA — Art. 358 bis du CGI (Exportation Directe)".
 * 4. Entreprises titulaires d'une attestation d'exonération DGID (Projets miniers/pétroliers, Code des Investissements) :
 *    -> Taux 0% et mention légale obligatoire : "Exonéré de TVA — Attestation DGID N° [NUM] (Art. 358 du CGI)".
 * 5. Entreprises au Régime de la Contribution Globale Unique (CGU / Franchise en base) :
 *    -> Seuil : CA < 50 000 000 FCFA (commerce) ou < 100 000 000 FCFA (services).
 *    -> Impôt forfaitaire : 5% du CA. Remplace IS, IR, TVA et patente.
 *    -> Mention obligatoire : "TVA non applicable — régime CGU (Article 283 du CGI)".
 * 6. Facture normalisée DGID : Génération agréée avec numéro de série unique, QR code et transmission électronique.
 * 7. Déclaration Préalable d'Importation (DPI) : Obligatoire dès 500 000 FCFA, dépôt ≥ 15 jours avant embarquement via ORBUS/GAINDE 2000.
 * 8. Taxe sur les Activités Financières (TAF) : 17% standard / 7% export sur commissions et frais bancaires.
 * 9. Retenues à la source : BRS 5%, Loyers 5%, Prestataires étrangers 20% (Art. 201 CGI).
 * 
 * Plan Comptable Général SYSCOHADA Révisé :
 * - Compte 701  : Ventes de marchandises (compte global)
 * - Compte 7011 : Ventes de marchandises taxables à 18% (Local Sénégal)
 * - Compte 7012 : Ventes de marchandises exonérées / Exportations 0% (Art. 358 bis CGI)
 * - Compte 706  : Prestations de services, transport & transit international HT
 * - Compte 709  : Rabais, remises et ristournes accordés / Avoirs sur ventes
 * - Compte 4431 : État, TVA facturée sur ventes (TVA Collectée 18%)
 * - Compte 4441 : État, TVA due (solde net à payer à la DGID si collectée > déductible)
 * - Compte 4449 : État, crédit de TVA à reporter (si déductible > collectée)
 * - Compte 4452 : État, TVA déductible sur achats de marchandises
 * - Compte 4453 : État, TVA récupérable sur transport (fret)
 * - Compte 4454 : État, TVA récupérable sur services extérieurs
 * - Compte 4111 : Clients - Créances et règlements TTC
 * - Compte 4011 : Fournisseurs d'exploitation
 */

export type TaxRegime = 'REEL' | 'CGU' | 'EXPORT' | 'EXONERE_DGID';
export type CustomerType = 'b2b' | 'b2c';

// Seuils légaux CGU (Contribution Globale Unique) Sénégal
export const CGU_THRESHOLDS = {
  COMMERCE_MAX_CA: 50_000_000,   // 50 Millions FCFA pour le commerce de marchandises
  SERVICES_MAX_CA: 100_000_000,  // 100 Millions FCFA pour les prestations de services
  TAX_RATE: 0.05                 // 5% impôt forfaitaire unique libératoire
};

// Seuil Déclaration Préalable d'Importation (DPI)
export const DPI_COMPLIANCE = {
  MIN_IMPORT_VALUE_FCFA: 500_000, // Obligatoire dès 500 000 FCFA
  MIN_DAYS_BEFORE_SHIPPING: 15    // Dépôt au moins 15 jours avant embarquement via ORBUS / GAINDE
};

// Taxe sur les Activités Financières (TAF)
export const TAF_RATES = {
  STANDARD: 0.17, // 17% sur intérêts, commissions et frais bancaires
  REDUCED_EXPORT: 0.07 // 7% pour les opérations finançant les exportations
};

// Retenues à la source obligatoires DGID
export const WITHHOLDING_RATES = {
  BRS_SERVICES: 0.05,       // 5% Retenue BRS sur prestataires locaux
  RENT: 0.05,               // 5% Retenue sur loyers professionnels
  FOREIGN_SUPPLIERS: 0.20   // 20% Retenue sur prestataires et logiciels étrangers (Art. 201 CGI)
};

export interface SyscohadaAccountEntry {
  accountCode: string;
  accountLabel: string;
  debit: number;
  credit: number;
}

export interface TaxLineItem {
  id?: string;
  name: string;
  sku?: string;
  quantity: number;
  unitPriceHT: number;
  costPriceHT?: number;
  isServiceOrFreight?: boolean;
  applyVat?: boolean;
  vatRate?: number;
}

export interface CreditNoteData {
  id: string;
  creditNoteNumber: string;
  originalOrderNumber: string;
  date: string;
  customerName: string;
  ninea?: string;
  reason: string;
  amountHT: number;
  vatAmount: number;
  amountTTC: number;
  syscohadaEntries?: SyscohadaAccountEntry[];
}

export interface DpiRecord {
  id: string;
  orderNumber: string;
  orderId?: string;
  clientName: string;
  ninea?: string;
  supplierCountry: string;
  goodsValueHT: number;
  freightValueHT: number;
  totalCifValue: number;
  dpiNumber: string;
  orbusDeclarationNumber?: string;
  cotecnaCertificateNumber?: string;
  shippingDateEstimated: string;
  dpiSubmissionDate: string;
  status: 'A_DEPOSER' | 'DEPOSEE_ORBUS' | 'VALIDEE_GAINDE' | 'INSPECTION_COTECNA' | 'BAE_OBTENU';
  isMandatory: boolean; // True si totalCifValue >= 500 000 FCFA
  daysRemainingBeforeShipping: number;
  isUrgent: boolean;
}

export interface SenegalVatCalculationInput {
  taxRegime?: TaxRegime;
  customerType?: CustomerType;
  deliveryCountry: string; // ex: 'Sénégal', 'SN', 'Mali', 'France', etc.
  taxExemptionNumber?: string; // N° Attestation d'exonération fiscale DGID si B2B exonéré
  items: TaxLineItem[];
  freightCostHT?: number;
  discountHT?: number;
  defaultVatRate?: number; // 0.18
  vatEnabled?: boolean; // Permet de désactiver globalement la TVA (ex: franchise / CGU)
}

export interface SenegalVatCalculationResult {
  taxRegime: TaxRegime;
  customerType: CustomerType;
  deliveryCountry: string;
  isSenegalDelivery: boolean;
  isExport: boolean;
  isTaxExempt: boolean;
  taxExemptionNumber?: string;
  applicableVatRate: number; // 0.18 ou 0
  subtotalGoodsHT: number;
  freightHT: number;
  discountHT: number;
  totalHT: number;
  totalVatAmount: number;
  totalTTC: number;
  legalMention?: string;
  dgidNormalizedCode?: string;
  dgidQrCodeUrl?: string;
  syscohadaEntries: SyscohadaAccountEntry[];
  lineDetails: Array<{
    name: string;
    quantity: number;
    unitPriceHT: number;
    lineTotalHT: number;
    vatRate: number;
    vatAmount: number;
    lineTotalTTC: number;
    syscohadaAccount: string;
  }>;
}

export interface SyscohadaInvoiceLegalData {
  invoiceNumber: string;
  invoiceDate: string;
  ninea: string;
  rccm: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  clientType: CustomerType;
  clientName: string;
  clientCompany?: string;
  clientNinea?: string;
  clientRccm?: string;
  clientAddress?: string;
  clientCountry: string;
  dgidNormalizedNumber: string;
  dgidQrCodeUrl: string;
  dgidSecurityHash: string;
  taxCalculation: SenegalVatCalculationResult;
}

/**
 * Détermine si le pays de destination est le Sénégal
 */
export function isDestinationSenegal(countryNameOrCode?: string): boolean {
  if (!countryNameOrCode) return true; // Défaut Sénégal
  const clean = countryNameOrCode.trim().toLowerCase();
  return (
    clean === 'sn' ||
    clean === 'sen' ||
    clean.includes('sénégal') ||
    clean.includes('senegal') ||
    clean === 'dakar'
  );
}

/**
 * Calculateur dynamique de TVA sénégalaise conforme DGID & SYSCOHADA
 */
export function calculateSenegalVat(input: SenegalVatCalculationInput): SenegalVatCalculationResult {
  const isSenegal = isDestinationSenegal(input.deliveryCountry);
  const isExport = !isSenegal;
  const customerType: CustomerType = input.customerType || 'b2c';
  const hasValidExemption = Boolean(input.taxExemptionNumber && input.taxExemptionNumber.trim().length >= 3);

  // Détermination du régime fiscal
  let regime: TaxRegime = 'REEL';
  if (input.vatEnabled === false || input.taxRegime === 'CGU') {
    regime = 'CGU';
  } else if (isExport) {
    regime = 'EXPORT';
  } else if (hasValidExemption) {
    regime = 'EXONERE_DGID';
  }

  // 1. Détermination du taux effectif et de la mention légale obligatoire DGID
  let applicableVatRate = 0.18;
  let legalMention: string | undefined = undefined;

  if (regime === 'CGU') {
    applicableVatRate = 0;
    legalMention = 'TVA non applicable — Article 283 du CGI (Franchise en base)';
  } else if (regime === 'EXPORT') {
    applicableVatRate = 0;
    legalMention = 'Exonéré de TVA — Art. 358 bis du CGI (Exportation Directe)';
  } else if (regime === 'EXONERE_DGID') {
    applicableVatRate = 0;
    legalMention = `Exonéré de TVA — Attestation DGID N° ${input.taxExemptionNumber?.trim()} (Art. 358 du CGI)`;
  } else {
    applicableVatRate = input.defaultVatRate !== undefined ? input.defaultVatRate : 0.18;
    legalMention = undefined; // Pas de mention d'exonération requise lorsque la TVA est normalement facturée à 18%
  }

  // 2. Calcul des lignes et du sous-total Marchandises HT
  let subtotalGoodsHT = 0;
  const lineDetails: SenegalVatCalculationResult['lineDetails'] = [];

  for (const item of input.items) {
    const qty = Math.max(1, item.quantity || 1);
    const lineHT = Math.round((item.unitPriceHT || 0) * qty);
    subtotalGoodsHT += lineHT;

    const itemVatRate = item.applyVat === false ? 0 : applicableVatRate;
    const itemVat = Math.round(lineHT * itemVatRate);
    const itemTTC = lineHT + itemVat;

    lineDetails.push({
      name: item.name,
      quantity: qty,
      unitPriceHT: item.unitPriceHT || 0,
      lineTotalHT: lineHT,
      vatRate: itemVatRate,
      vatAmount: itemVat,
      lineTotalTTC: itemTTC,
      syscohadaAccount: item.isServiceOrFreight ? '706' : (isExport ? '7012' : '7011')
    });
  }

  const freightHT = Math.max(0, Math.round(input.freightCostHT || 0));
  const discountHT = Math.max(0, Math.round(input.discountHT || 0));
  const totalHT = Math.max(0, subtotalGoodsHT + freightHT - discountHT);

  // Le fret international pour livraison locale au Sénégal est assujetti à la TVA 18%
  const freightVat = Math.round(freightHT * applicableVatRate);
  const goodsVat = lineDetails.reduce((sum, l) => sum + l.vatAmount, 0);
  const discountVat = Math.round(discountHT * applicableVatRate);
  const totalVatAmount = Math.max(0, goodsVat + freightVat - discountVat);
  const totalTTC = totalHT + totalVatAmount;

  // 3. Génération automatique du journal des écritures comptables SYSCOHADA Révisé
  const syscohadaEntries: SyscohadaAccountEntry[] = [
    {
      accountCode: '4111',
      accountLabel: 'Clients - Ventes & Créances clients TTC',
      debit: totalTTC,
      credit: 0
    },
    {
      accountCode: isExport ? '7012' : '7011',
      accountLabel: isExport 
        ? 'Ventes de marchandises à l\'exportation (0% CGI 358 bis)' 
        : 'Ventes de marchandises industrielles HT (Sénégal 18%)',
      debit: 0,
      credit: Math.max(0, subtotalGoodsHT - discountHT)
    }
  ];

  if (freightHT > 0) {
    syscohadaEntries.push({
      accountCode: '706',
      accountLabel: 'Prestations de transport & fret international HT',
      debit: 0,
      credit: freightHT
    });
  }

  if (totalVatAmount > 0) {
    syscohadaEntries.push({
      accountCode: '4431',
      accountLabel: 'État, TVA facturée sur ventes (18% DGID)',
      debit: 0,
      credit: totalVatAmount
    });
  }

  return {
    taxRegime: regime,
    customerType,
    deliveryCountry: input.deliveryCountry || 'Sénégal',
    isSenegalDelivery: isSenegal,
    isExport,
    isTaxExempt: applicableVatRate === 0,
    taxExemptionNumber: input.taxExemptionNumber,
    applicableVatRate,
    subtotalGoodsHT,
    freightHT,
    discountHT,
    totalHT,
    totalVatAmount,
    totalTTC,
    legalMention,
    syscohadaEntries,
    lineDetails
  };
}

/**
 * Alias de compatibilité pour calcul rapide
 */
export function calculateSenegalTaxes(input: SenegalVatCalculationInput): SenegalVatCalculationResult {
  return calculateSenegalVat(input);
}

/**
 * Génère le modèle de données JSON complet pour facture certifiée DGID/SYSCOHADA
 */
export function buildSyscohadaInvoicePayload(params: {
  invoiceNumber: string;
  orderDate?: string;
  client: {
    name: string;
    company?: string;
    clientType?: CustomerType;
    ninea?: string;
    rccm?: string;
    taxExemptionNumber?: string;
    address?: string;
    country?: string;
    phone?: string;
    email?: string;
  };
  seller: {
    name?: string;
    ninea?: string;
    rccm?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  taxRegime?: TaxRegime;
  vatEnabled?: boolean;
  items: TaxLineItem[];
  freightCostHT?: number;
  discountHT?: number;
}): SyscohadaInvoiceLegalData {
  const isB2B = Boolean(params.client.company || params.client.ninea || params.client.clientType === 'b2b');
  const resolvedClientType: CustomerType = isB2B ? 'b2b' : 'b2c';

  const taxCalc = calculateSenegalVat({
    taxRegime: params.taxRegime || 'REEL',
    customerType: resolvedClientType,
    deliveryCountry: params.client.country || 'Sénégal',
    taxExemptionNumber: params.client.taxExemptionNumber,
    vatEnabled: params.vatEnabled,
    items: params.items,
    freightCostHT: params.freightCostHT,
    discountHT: params.discountHT
  });

  const dgidData = generateDgidNormalizedInvoiceData({
    invoiceNumber: params.invoiceNumber,
    date: params.orderDate || new Date().toISOString(),
    totalTTC: taxCalc.totalTTC,
    ninea: params.seller.ninea || '008921822'
  });

  return {
    invoiceNumber: params.invoiceNumber,
    invoiceDate: params.orderDate || new Date().toISOString().split('T')[0],
    ninea: params.seller.ninea || '008921822',
    rccm: params.seller.rccm || 'SN-DKR-2024-B-14892',
    companyName: params.seller.name || 'ZONE ÉQUIPEMENTS SÉNÉGAL',
    companyAddress: params.seller.address || 'Km 4, Boulevard du Centenaire, Dakar, Sénégal',
    companyPhone: params.seller.phone || '+221 76 653 83 84',
    companyEmail: params.seller.email || 'contact@zone-equipements.sn',
    clientType: resolvedClientType,
    clientName: params.client.name,
    clientCompany: params.client.company,
    clientNinea: params.client.ninea,
    clientRccm: params.client.rccm,
    clientAddress: params.client.address,
    clientCountry: params.client.country || 'Sénégal',
    dgidNormalizedNumber: dgidData.dgidNormalizedNumber,
    dgidQrCodeUrl: dgidData.dgidQrCodeUrl,
    dgidSecurityHash: dgidData.dgidSecurityHash,
    taxCalculation: {
      ...taxCalc,
      dgidNormalizedCode: dgidData.dgidNormalizedNumber,
      dgidQrCodeUrl: dgidData.dgidQrCodeUrl
    }
  };
}

/**
 * Génère le numéro de facture normalisée DGID et le QR code de télétransmission
 */
export function generateDgidNormalizedInvoiceData(params: {
  invoiceNumber: string;
  date: string;
  totalTTC: number;
  ninea: string;
}): {
  dgidNormalizedNumber: string;
  dgidQrCodeUrl: string;
  dgidSecurityHash: string;
} {
  const year = new Date(params.date).getFullYear() || new Date().getFullYear();
  const cleanInv = params.invoiceNumber.replace(/[^0-9A-Z]/gi, '').slice(-5).padStart(5, '0');
  const dgidNormalizedNumber = `SN-DGID-${year}-${cleanInv}`;
  
  // Hash de sécurité déterministe
  const rawKey = `${params.ninea}|${params.invoiceNumber}|${params.totalTTC}|${params.date}`;
  let hash = 0;
  for (let i = 0; i < rawKey.length; i++) {
    hash = (hash * 31 + rawKey.charCodeAt(i)) % 1000000;
  }
  const dgidSecurityHash = `CERT-DGID-${Math.abs(hash).toString(16).toUpperCase().padStart(6, '0')}`;
  
  // URL payload officielle pour vérification QR code DGID
  const qrPayload = encodeURIComponent(
    `DGID-SN|NINEA:${params.ninea}|NUM:${dgidNormalizedNumber}|TTC:${params.totalTTC}XOF|DATE:${params.date.slice(0, 10)}|HASH:${dgidSecurityHash}`
  );
  const dgidQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrPayload}`;

  return {
    dgidNormalizedNumber,
    dgidQrCodeUrl,
    dgidSecurityHash
  };
}

/**
 * Calcul et gestion du Crédit de TVA à reporter (Compte 4449) vs TVA Due (Compte 4441)
 */
export function calculateVatBalanceAndCarryover(tvaCollectee18: number, tvaDeductible: number) {
  const diff = tvaCollectee18 - tvaDeductible;
  if (diff >= 0) {
    return {
      netVatPayable: diff,
      vatCreditCarryover: 0,
      syscohadaAccount: '4441' as const,
      accountLabel: 'État, TVA due (Solde à reverser à la DGID)',
      isCredit: false
    };
  } else {
    return {
      netVatPayable: 0,
      vatCreditCarryover: Math.abs(diff),
      syscohadaAccount: '4449' as const,
      accountLabel: 'État, Crédit de TVA à reporter sur les mois suivants',
      isCredit: true
    };
  }
}

/**
 * Calculateur de statut et de seuil CGU (Contribution Globale Unique)
 */
export function calculateCguComplianceStatus(
  annualTurnoverFCFA: number,
  activityType: 'COMMERCE' | 'SERVICES' = 'COMMERCE'
) {
  const threshold = activityType === 'COMMERCE' ? CGU_THRESHOLDS.COMMERCE_MAX_CA : CGU_THRESHOLDS.SERVICES_MAX_CA;
  const percentage = Math.min(100, Math.round((annualTurnoverFCFA / threshold) * 100));
  const isExceeded = annualTurnoverFCFA >= threshold;
  const flatTaxDue = Math.round(annualTurnoverFCFA * CGU_THRESHOLDS.TAX_RATE);

  return {
    annualTurnoverFCFA,
    activityType,
    threshold,
    percentage,
    isExceeded,
    mustSwitchToReel: isExceeded,
    flatTaxDue,
    legalMention: isExceeded 
      ? 'Seuil CGU franchi : Bascule obligatoire au Régime Réel (TVA 18%)' 
      : 'Régime CGU — TVA non applicable (Art. 283 du CGI) — Forfait 5%'
  };
}

/**
 * Imputation comptable SYSCOHADA pour les Avoirs / Notes de crédit
 */
export function generateCreditNoteAccounting(creditNote: {
  creditNoteNumber: string;
  date: string;
  clientName: string;
  amountHT: number;
  vatAmount: number;
  amountTTC: number;
  isExport?: boolean;
}): SyscohadaAccountEntry[] {
  const entries: SyscohadaAccountEntry[] = [
    {
      accountCode: '709',
      accountLabel: 'Rabais, remises et ristournes accordés (Avoirs HT)',
      debit: creditNote.amountHT,
      credit: 0
    }
  ];

  if (creditNote.vatAmount > 0) {
    entries.push({
      accountCode: '4431',
      accountLabel: 'État, TVA facturée sur ventes (Annulation / Régularisation)',
      debit: creditNote.vatAmount,
      credit: 0
    });
  }

  entries.push({
    accountCode: '4111',
    accountLabel: 'Clients - Régularisation et diminution créance TTC',
    debit: 0,
    credit: creditNote.amountTTC
  });

  return entries;
}

/**
 * Calculateur de la Taxe sur les Activités Financières (TAF 17% / 7%)
 */
export function calculateTafBreakdown(financialItems: Array<{
  amount: number;
  label: string;
  isExportFinancing?: boolean;
}>) {
  let baseStandard = 0;
  let baseExport = 0;
  let tafStandard = 0;
  let tafExport = 0;

  financialItems.forEach(it => {
    if (it.isExportFinancing) {
      baseExport += it.amount;
      tafExport += Math.round(it.amount * TAF_RATES.REDUCED_EXPORT);
    } else {
      baseStandard += it.amount;
      tafStandard += Math.round(it.amount * TAF_RATES.STANDARD);
    }
  });

  return {
    baseStandard,
    baseExport,
    tafStandard,
    tafExport,
    totalTafDue: tafStandard + tafExport
  };
}

/**
 * Calculateur des Retenues à la Source obligatoires DGID
 */
export function calculateWithholdingTaxesBreakdown(records: Array<{
  type: 'BRS' | 'RENT' | 'FOREIGN_SUPPLIER';
  baseAmountHT: number;
  beneficiaryName: string;
  ninea?: string;
  date: string;
}>) {
  let brsTotalBase = 0;
  let brsTotalTax = 0;
  let rentTotalBase = 0;
  let rentTotalTax = 0;
  let foreignTotalBase = 0;
  let foreignTotalTax = 0;

  records.forEach(r => {
    if (r.type === 'BRS') {
      brsTotalBase += r.baseAmountHT;
      brsTotalTax += Math.round(r.baseAmountHT * WITHHOLDING_RATES.BRS_SERVICES);
    } else if (r.type === 'RENT') {
      rentTotalBase += r.baseAmountHT;
      rentTotalTax += Math.round(r.baseAmountHT * WITHHOLDING_RATES.RENT);
    } else if (r.type === 'FOREIGN_SUPPLIER') {
      foreignTotalBase += r.baseAmountHT;
      foreignTotalTax += Math.round(r.baseAmountHT * WITHHOLDING_RATES.FOREIGN_SUPPLIERS);
    }
  });

  return {
    brsTotalBase,
    brsTotalTax,
    rentTotalBase,
    rentTotalTax,
    foreignTotalBase,
    foreignTotalTax,
    totalWithheldTax: brsTotalTax + rentTotalTax + foreignTotalTax
  };
}

/**
 * -------------------------------------------------------------
 * 1. GESTION DES LOYERS & BAUX (CGI SÉNÉGAL ART. 283 & ART. 150)
 * -------------------------------------------------------------
 */

export interface LeaseModificationHistory {
  id: string;
  effectiveDate: string;
  oldMonthlyRentHT: number;
  newMonthlyRentHT: number;
  recalculationMode: 'integral' | 'a_partir_du_mois_actuel';
  reason: string;
  deltaTotal?: number;
  modifiedAt: string;
  author: string;
}

export interface LeaseContract {
  id: string;
  premisesName: string; // Désignation du local (ex: Entrepôt Km 4 Centenaire, Showroom VDN)
  address: string;
  landlordName: string;
  landlordNinea?: string;
  landlordRccm?: string;
  landlordPhone?: string;
  landlordEmail?: string;
  startDate: string;
  endDate: string;
  monthlyRentHT: number;
  frequency: 'mensuel' | 'trimestriel' | 'annuel';
  status: 'actif' | 'suspendu' | 'resilie';
  depositAmount?: number;
  notes?: string;
  history: LeaseModificationHistory[];
}

export function calculateLeaseRentAndWithholding(contract: LeaseContract) {
  const rentHT = contract.monthlyRentHT;
  const withholdingRate = WITHHOLDING_RATES.RENT; // 5% CGI
  const withholdingAmount = Math.round(rentHT * withholdingRate);
  const netPayableLandlord = rentHT - withholdingAmount;

  // Imputation SYSCOHADA :
  // Débit 622 (Locations immobilières)
  // Crédit 447 (État, impôts retenus à la source - Loyers 5%)
  // Crédit 401 (Fournisseurs / Propriétaire - Net à payer)
  const syscohadaEntries: SyscohadaAccountEntry[] = [
    {
      accountCode: '622',
      accountLabel: 'Locations et charges locatives immobilières HT',
      debit: rentHT,
      credit: 0
    },
    {
      accountCode: '4472',
      accountLabel: 'État, retenue à la source sur loyers (5% CGI)',
      debit: 0,
      credit: withholdingAmount
    },
    {
      accountCode: '4011',
      accountLabel: `Fournisseurs - Propriétaire (${contract.landlordName})`,
      debit: 0,
      credit: netPayableLandlord
    }
  ];

  return {
    rentHT,
    withholdingRate,
    withholdingAmount,
    netPayableLandlord,
    syscohadaEntries
  };
}

/**
 * Calcul du recalcul automatique lors d'un changement de loyer
 */
export function recalculateLeaseModification(params: {
  contract: LeaseContract;
  newMonthlyRentHT: number;
  recalculationMode: 'integral' | 'a_partir_du_mois_actuel';
  effectiveDate: string;
  reason: string;
  author?: string;
}): {
  updatedContract: LeaseContract;
  deltaTotal: number;
  monthsAffected: number;
  regulatoryEntries: SyscohadaAccountEntry[];
} {
  const { contract, newMonthlyRentHT, recalculationMode, effectiveDate, reason, author = 'Admin' } = params;
  const oldRent = contract.monthlyRentHT;
  const diffPerMonth = newMonthlyRentHT - oldRent;
  let monthsAffected = 1;
  let deltaTotal = 0;

  if (recalculationMode === 'integral') {
    // Calcul depuis le début du bail
    const start = new Date(contract.startDate);
    const eff = new Date(effectiveDate);
    const monthsDiff = Math.max(1, (eff.getFullYear() - start.getFullYear()) * 12 + (eff.getMonth() - start.getMonth()) + 1);
    monthsAffected = monthsDiff;
    deltaTotal = diffPerMonth * monthsDiff;
  } else {
    // À partir du mois actuel
    monthsAffected = 1;
    deltaTotal = diffPerMonth;
  }

  const deltaRetenue = Math.round(deltaTotal * WITHHOLDING_RATES.RENT);
  const deltaNet = deltaTotal - deltaRetenue;

  const regulatoryEntries: SyscohadaAccountEntry[] = [];
  if (deltaTotal !== 0) {
    if (deltaTotal > 0) {
      regulatoryEntries.push(
        { accountCode: '622', accountLabel: 'Régularisation charges locatives HT', debit: deltaTotal, credit: 0 },
        { accountCode: '4472', accountLabel: 'Régularisation retenue loyer (5%)', debit: 0, credit: deltaRetenue },
        { accountCode: '4011', accountLabel: 'Régularisation net propriétaire', debit: 0, credit: deltaNet }
      );
    } else {
      regulatoryEntries.push(
        { accountCode: '4011', accountLabel: 'Trop-perçu net propriétaire', debit: Math.abs(deltaNet), credit: 0 },
        { accountCode: '4472', accountLabel: 'Ajustement retenue loyer', debit: Math.abs(deltaRetenue), credit: 0 },
        { accountCode: '622', accountLabel: 'Diminution charges locatives', debit: 0, credit: Math.abs(deltaTotal) }
      );
    }
  }

  const historyItem: LeaseModificationHistory = {
    id: `mod-${Date.now()}`,
    effectiveDate,
    oldMonthlyRentHT: oldRent,
    newMonthlyRentHT: newMonthlyRentHT,
    recalculationMode,
    reason,
    deltaTotal,
    modifiedAt: new Date().toISOString(),
    author
  };

  const updatedContract: LeaseContract = {
    ...contract,
    monthlyRentHT: newMonthlyRentHT,
    history: [historyItem, ...(contract.history || [])]
  };

  return {
    updatedContract,
    deltaTotal,
    monthsAffected,
    regulatoryEntries
  };
}

/**
 * -----------------------------------------------------------------------------------
 * 2. IDENTIFICATION AUTOMATIQUE LOCAL / ÉTRANGER DES PRESTATIONS & CONVENTIONS FISCALES
 * -----------------------------------------------------------------------------------
 */

export const TAX_TREATIES: Record<string, { country: string; withholdingRate: number; treatyRef: string }> = {
  'france': { country: 'France', withholdingRate: 0.15, treatyRef: 'Convention fiscale franco-sénégalaise (Art. 12)' },
  'mali': { country: 'Mali (UEMOA)', withholdingRate: 0.0, treatyRef: 'Règlement N° 08/2008/CM/UEMOA non-double imposition' },
  'cote d\'ivoire': { country: 'Côte d\'Ivoire (UEMOA)', withholdingRate: 0.0, treatyRef: 'Règlement UEMOA' },
  'burkina faso': { country: 'Burkina Faso (UEMOA)', withholdingRate: 0.0, treatyRef: 'Règlement UEMOA' },
  'togo': { country: 'Togo (UEMOA)', withholdingRate: 0.0, treatyRef: 'Règlement UEMOA' },
  'benin': { country: 'Bénin (UEMOA)', withholdingRate: 0.0, treatyRef: 'Règlement UEMOA' },
  'niger': { country: 'Niger (UEMOA)', withholdingRate: 0.0, treatyRef: 'Règlement UEMOA' },
  'canada': { country: 'Canada', withholdingRate: 0.15, treatyRef: 'Convention fiscale bilatérale Sénégal-Canada' },
  'default_foreign': { country: 'Pays Tiers', withholdingRate: 0.20, treatyRef: 'Article 201 du CGI (Taux légal standard 20%)' }
};

export interface ServiceClassificationResult {
  isLocal: boolean;
  deliveryCountry: string;
  classificationLabel: string;
  vatRate: number; // 0.18 si local, 0 si étranger
  vatAmount: number;
  withholdingRate: number; // 0.05 BRS si local, 0.20 ou convention si étranger
  withholdingAmount: number;
  withholdingLabel: string;
  treatyApplied?: string;
  netPayableProvider: number;
  syscohadaEntries: SyscohadaAccountEntry[];
}

export function detectServiceTaxAndWithholding(params: {
  serviceName: string;
  amountHT: number;
  deliveryCountry: string; // Pays d'exécution / livraison de la prestation
  providerCountry?: string; // Pays de domiciliation du prestataire
  providerName?: string;
  isB2BProvider?: boolean;
}): ServiceClassificationResult {
  const isLocal = isDestinationSenegal(params.deliveryCountry);
  const amountHT = Math.max(0, params.amountHT);
  const provCountryClean = (params.providerCountry || (isLocal ? 'Sénégal' : params.deliveryCountry)).trim().toLowerCase();

  let vatRate = 0;
  let vatAmount = 0;
  let withholdingRate = 0;
  let withholdingLabel = '';
  let treatyApplied: string | undefined = undefined;

  if (isLocal) {
    // Prestation locale au Sénégal : TVA 18% de plein droit
    vatRate = 0.18;
    vatAmount = Math.round(amountHT * vatRate);
    
    // Retenue BRS 5% applicable aux prestataires de services locaux
    withholdingRate = WITHHOLDING_RATES.BRS_SERVICES; // 5%
    withholdingLabel = 'Retenue BRS locale (5% CGI)';
  } else {
    // Prestation étrangère (hors Sénégal) : TVA 0% (Exportation de services)
    vatRate = 0;
    vatAmount = 0;

    // Détection de convention fiscale bilatérale
    let matchedTreaty = TAX_TREATIES['default_foreign'];
    for (const [key, val] of Object.entries(TAX_TREATIES)) {
      if (provCountryClean.includes(key) || (params.deliveryCountry.toLowerCase().includes(key))) {
        matchedTreaty = val;
        break;
      }
    }

    withholdingRate = matchedTreaty.withholdingRate;
    treatyApplied = matchedTreaty.treatyRef;
    withholdingLabel = matchedTreaty.withholdingRate === 0
      ? `Exonération retenue (${matchedTreaty.treatyRef})`
      : `Retenue étrangère ${(matchedTreaty.withholdingRate * 100).toFixed(0)}% (${matchedTreaty.treatyRef})`;
  }

  const withholdingAmount = Math.round(amountHT * withholdingRate);
  const totalTTC = amountHT + vatAmount;
  const netPayableProvider = totalTTC - withholdingAmount;

  // Imputation comptable SYSCOHADA :
  const syscohadaEntries: SyscohadaAccountEntry[] = [
    {
      accountCode: '628',
      accountLabel: `Prestations de services et assistance technique HT (${params.serviceName})`,
      debit: amountHT,
      credit: 0
    }
  ];

  if (vatAmount > 0) {
    syscohadaEntries.push({
      accountCode: '4431',
      accountLabel: 'État, TVA facturée sur prestations locales (18%)',
      debit: 0,
      credit: vatAmount
    });
  }

  if (withholdingAmount > 0) {
    syscohadaEntries.push({
      accountCode: '447',
      accountLabel: `État, impôts retenus à la source (${withholdingLabel})`,
      debit: 0,
      credit: withholdingAmount
    });
  }

  syscohadaEntries.push({
    accountCode: '4011',
    accountLabel: `Fournisseurs - Prestataire net à payer (${params.providerName || 'Prestataire'})`,
    debit: 0,
    credit: netPayableProvider
  });

  return {
    isLocal,
    deliveryCountry: params.deliveryCountry,
    classificationLabel: isLocal ? 'Prestation Locale (Sénégal)' : 'Prestation Étrangère / Internationale',
    vatRate,
    vatAmount,
    withholdingRate,
    withholdingAmount,
    withholdingLabel,
    treatyApplied,
    netPayableProvider,
    syscohadaEntries
  };
}

/**
 * -----------------------------------------------------------------------------------
 * 3. GESTION DES SALAIRES, BULLETINS & BRS (SYSCOHADA COMPTE 66, 421, 447, 431)
 * -----------------------------------------------------------------------------------
 */

export interface PayrollEmployee {
  id: string;
  matricule: string;
  fullName: string;
  position: string;
  baseSalary: number;
  transportAllowance: number;
  otherBonuses: number;
  hireDate: string;
  contractType: 'CDI' | 'CDD' | 'STAGE';
  ipresNumber?: string;
  cssNumber?: string;
}

export interface PayrollPayslip {
  id: string;
  employeeId: string;
  employeeName: string;
  periodMonthYear: string; // ex: "10/2026"
  baseSalary: number;
  grossSalary: number;
  ipresEmployee: number; // 5.6% ouvrière
  ipresEmployer: number; // 8.4% patronale
  cssEmployer: number;   // 7% alloc + accidents
  brsTax: number;        // Impôt sur le revenu salarial retenu (BRS)
  totalDeductions: number;
  netPayable: number;
  syscohadaEntries: SyscohadaAccountEntry[];
}

export function computePayslip(employee: PayrollEmployee, period: string): PayrollPayslip {
  const grossSalary = employee.baseSalary + employee.transportAllowance + employee.otherBonuses;
  
  // Cotisations sociales réglementaires Sénégal (IPRES & CSS)
  const ipresEmployee = Math.round(employee.baseSalary * 0.056); // 5.6% ouvrière
  const ipresEmployer = Math.round(employee.baseSalary * 0.084); // 8.4% patronale
  const cssEmployer = Math.round(employee.baseSalary * 0.07);    // 7% CSS

  // Barème indicatif BRS / Impôt sur le revenu des salariés
  let brsTax = 0;
  if (grossSalary > 150000) {
    brsTax = Math.round((grossSalary - 150000) * 0.12);
  }

  const totalDeductions = ipresEmployee + brsTax;
  const netPayable = grossSalary - totalDeductions;

  // Imputation SYSCOHADA :
  // Débit 66 (Charges de personnel) = Salaire brut + charges patronales
  // Crédit 421 (Personnel, rémunérations dues) = Net à payer
  // Crédit 447 (État, BRS retenu) = Impôt BRS
  // Crédit 431 (Sécurité sociale - IPRES & CSS) = Cotisations sociales
  const syscohadaEntries: SyscohadaAccountEntry[] = [
    {
      accountCode: '661',
      accountLabel: 'Rémunérations directes du personnel (Brut)',
      debit: grossSalary,
      credit: 0
    },
    {
      accountCode: '664',
      accountLabel: 'Charges sociales patronales (IPRES & CSS)',
      debit: ipresEmployer + cssEmployer,
      credit: 0
    },
    {
      accountCode: '421',
      accountLabel: `Personnel - Rémunérations nettes dues (${employee.fullName})`,
      debit: 0,
      credit: netPayable
    },
    {
      accountCode: '4471',
      accountLabel: 'État - BRS retenu sur salaires',
      debit: 0,
      credit: brsTax
    },
    {
      accountCode: '431',
      accountLabel: 'Organismes sociaux - IPRES & CSS à reverser',
      debit: 0,
      credit: ipresEmployee + ipresEmployer + cssEmployer
    }
  ];

  return {
    id: `pay-${employee.id}-${period.replace(/\//g, '-')}`,
    employeeId: employee.id,
    employeeName: employee.fullName,
    periodMonthYear: period,
    baseSalary: employee.baseSalary,
    grossSalary,
    ipresEmployee,
    ipresEmployer,
    cssEmployer,
    brsTax,
    totalDeductions,
    netPayable,
    syscohadaEntries
  };
}

/**
 * -----------------------------------------------------------------------------------
 * 4. GESTION DES IMMOBILISATIONS & AMORTISSEMENTS (SYSCOHADA COMPTES 681 & 28)
 * -----------------------------------------------------------------------------------
 */

export interface FixedAssetRecord {
  id: string;
  assetCode: string;
  name: string;
  category: 'materiel_agricole_industriel' | 'vehicules' | 'batiment' | 'informatique' | 'mobilier';
  acquisitionDate: string;
  acquisitionCost: number;
  durationYears: number;
  amortizationMethod: 'lineaire' | 'degressif';
  accumulatedAmortization: number;
  netBookValue: number; // Valeur Nette Comptable (VNC)
  annualDepreciation: number;
  syscohadaAccountAsset: string; // Ex: '241' Matériel, '245' Matériel de transport
  syscohadaAccountAmort: string; // Ex: '2841' Amortissements matériel
}

export function computeAssetAmortization(params: {
  acquisitionCost: number;
  durationYears: number;
  method: 'lineaire' | 'degressif';
  acquisitionDate: string;
}): { annualDepreciation: number; accumulatedAmortization: number; netBookValue: number } {
  const { acquisitionCost, durationYears, method, acquisitionDate } = params;
  const rate = 1 / Math.max(1, durationYears);
  const annualDepreciation = Math.round(acquisitionCost * rate);

  const startYear = new Date(acquisitionDate).getFullYear();
  const currentYear = new Date().getFullYear();
  const yearsPassed = Math.max(0, currentYear - startYear);

  const accumulatedAmortization = Math.min(acquisitionCost, Math.round(annualDepreciation * yearsPassed));
  const netBookValue = Math.max(0, acquisitionCost - accumulatedAmortization);

  return {
    annualDepreciation,
    accumulatedAmortization,
    netBookValue
  };
}

/**
 * -----------------------------------------------------------------------------------
 * 5. GESTION DE TRÉSORERIE & RAPPROCHEMENT (SYSCOHADA COMPTES 52, 57, 411, 401)
 * -----------------------------------------------------------------------------------
 */

export interface TreasuryAccount {
  id: string;
  name: string;
  accountType: 'banque' | 'caisse' | 'wave' | 'orange_money' | 'paydunya';
  accountNumber: string;
  balance: number;
  syscohadaAccount: string; // 521 Banque, 571 Caisse, 522 Mobile Money
  overdraftLimit?: number; // Plafond découvert autorisé
}

export interface TreasuryMovement {
  id: string;
  accountId: string;
  date: string;
  type: 'encaissement' | 'decaissement';
  category: 'vente_client' | 'paiement_fournisseur' | 'loyer' | 'brs_impot' | 'frais_bancaires' | 'divers';
  amount: number;
  referenceDoc: string;
  label: string;
  reconciled: boolean;
}

/**
 * -----------------------------------------------------------------------------------
 * 6. NOTES DE FRAIS & AVANCES (SYSCOHADA 625, 628, 421)
 * -----------------------------------------------------------------------------------
 */

export interface ExpenseReportItem {
  id: string;
  employeeName: string;
  date: string;
  category: 'deplacement_mission' | 'carburant' | 'hebergement' | 'reception_client' | 'fournitures';
  amountHT: number;
  vatAmount: number;
  totalTTC: number;
  receiptAttached: boolean;
  status: 'en_attente' | 'valide' | 'rembourse';
  syscohadaEntries: SyscohadaAccountEntry[];
}

export function createExpenseReportEntries(item: Omit<ExpenseReportItem, 'syscohadaEntries' | 'totalTTC'>): ExpenseReportItem {
  const totalTTC = item.amountHT + item.vatAmount;
  const syscohadaAccount = item.category === 'deplacement_mission' ? '625' : '628';

  const syscohadaEntries: SyscohadaAccountEntry[] = [
    {
      accountCode: syscohadaAccount,
      accountLabel: `Frais et déplacements professionnels (${item.category})`,
      debit: item.amountHT,
      credit: 0
    }
  ];

  if (item.vatAmount > 0) {
    syscohadaEntries.push({
      accountCode: '4454',
      accountLabel: 'État, TVA déductible sur services et déplacements',
      debit: item.vatAmount,
      credit: 0
    });
  }

  syscohadaEntries.push({
    accountCode: '421',
    accountLabel: `Personnel, avances et frais à rembourser (${item.employeeName})`,
    debit: 0,
    credit: totalTTC
  });

  return {
    ...item,
    totalTTC,
    syscohadaEntries
  };
}

/**
 * -----------------------------------------------------------------------------------
 * 7. JOURNAL DES OPÉRATIONS DIVERSES (OD - SYSCOHADA 82 / 77 / 65)
 * -----------------------------------------------------------------------------------
 */

export interface JournalODEntry {
  id: string;
  date: string;
  pieceRef: string;
  description: string;
  entries: SyscohadaAccountEntry[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
}

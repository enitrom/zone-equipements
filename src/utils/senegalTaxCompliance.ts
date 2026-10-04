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
 *    -> Taux 0% et mention légale obligatoire : "TVA non applicable — Article 283 du CGI".
 * 
 * Plan Comptable Général SYSCOHADA Révisé :
 * - Compte 7011 : Ventes de marchandises taxables à 18% (Local Sénégal)
 * - Compte 7012 : Ventes de marchandises exonérées / Exportations 0%
 * - Compte 706 : Prestations de transport, transit & fret international HT
 * - Compte 4431 : État, TVA facturée sur ventes (TVA Collectée 18%)
 * - Compte 4452 / 4454 : État, TVA déductible sur achats & fret
 * - Compte 4111 : Clients - Créances et règlements TTC
 */

export type TaxRegime = 'REEL' | 'CGU' | 'EXPORT' | 'EXONERE_DGID';
export type CustomerType = 'b2b' | 'b2c';

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
  vatEnabled?: boolean; // Permet de désactiver globalement la TVA (ex: franchise)
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
    taxCalculation: taxCalc
  };
}

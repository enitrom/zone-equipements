/**
 * SÉNÉGAL (DGID) & SYSCOHADA - MODULE DE CONFORMITÉ FISCALE ET COMPTABLE
 * 
 * Règles appliquées conformément au Code Général des Impôts (CGI) du Sénégal :
 * 1. Taux normal de TVA : 18% (Article 355 et suivants du CGI).
 * 2. Régime Réel & livraison au Sénégal (SN) -> TVA 18% obligatoire (calcul HT / TVA / TTC).
 * 3. Livraison Hors Sénégal (Exportations sous-région UEMOA / International) :
 *    -> Taux 0% et mention légale obligatoire : "Exonéré de TVA — Art. 358 bis du CGI (Exportation)".
 * 4. Entreprises au Régime de la Contribution Globale Unique (CGU / Franchise en base) :
 *    -> Taux 0% et mention légale obligatoire : "TVA non applicable — Article 283 du CGI".
 * 
 * Plan Comptable Général SYSCOHADA Révisé :
 * - Compte 701 : Ventes de marchandises (Produits MRO & Équipements)
 * - Compte 706 : Services vendus / Prestations de transport & transit international
 * - Compte 4431 : État, TVA facturée sur ventes (TVA Collectée)
 * - Compte 4111 : Clients - Ventes au comptant / Factures clients
 * - Compte 601 / 602 : Achats de marchandises & matières
 */

export type TaxRegime = 'REEL' | 'CGU';

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
  deliveryCountry: string; // ex: 'Sénégal', 'SN', 'Mali', 'France', etc.
  items: TaxLineItem[];
  freightCostHT?: number;
  discountHT?: number;
  defaultVatRate?: number; // 0.18
}

export interface SenegalVatCalculationResult {
  taxRegime: TaxRegime;
  deliveryCountry: string;
  isSenegalDelivery: boolean;
  isExport: boolean;
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
  clientName: string;
  clientNinea?: string;
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
  const regime: TaxRegime = input.taxRegime === 'CGU' ? 'CGU' : 'REEL';
  const isSenegal = isDestinationSenegal(input.deliveryCountry);
  const isExport = !isSenegal;

  // 1. Détermination du taux et des mentions légales obligatoires selon le CGI sénégalais
  let applicableVatRate = 0.18;
  let legalMention: string | undefined = undefined;

  if (regime === 'CGU') {
    applicableVatRate = 0;
    legalMention = 'TVA non applicable — Article 283 du CGI (Régime CGU)';
  } else if (isExport) {
    applicableVatRate = 0;
    legalMention = 'Exonéré de TVA — Art. 358 bis du CGI (Exportation)';
  } else {
    applicableVatRate = input.defaultVatRate !== undefined ? input.defaultVatRate : 0.18;
  }

  // 2. Calcul du sous-total Marchandises HT
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
      syscohadaAccount: item.isServiceOrFreight ? '706' : '701'
    });
  }

  const freightHT = Math.max(0, Math.round(input.freightCostHT || 0));
  const discountHT = Math.max(0, Math.round(input.discountHT || 0));
  const totalHT = Math.max(0, subtotalGoodsHT + freightHT - discountHT);

  // Le fret international pour livraison au Sénégal est soumis à la TVA si régime réel
  const freightVat = Math.round(freightHT * applicableVatRate);
  const goodsVat = lineDetails.reduce((sum, l) => sum + l.vatAmount, 0);
  const discountVat = Math.round(discountHT * applicableVatRate);
  const totalVatAmount = Math.max(0, goodsVat + freightVat - discountVat);
  const totalTTC = totalHT + totalVatAmount;

  // 3. Génération des écritures comptables SYSCOHADA Révisé
  const syscohadaEntries: SyscohadaAccountEntry[] = [
    {
      accountCode: '4111',
      accountLabel: 'Clients - Créances clients / Ventes TTC',
      debit: totalTTC,
      credit: 0
    },
    {
      accountCode: '701',
      accountLabel: 'Ventes de marchandises (Équipements industriels HT)',
      debit: 0,
      credit: Math.max(0, subtotalGoodsHT - discountHT)
    }
  ];

  if (freightHT > 0) {
    syscohadaEntries.push({
      accountCode: '706',
      accountLabel: 'Prestations de services / Fret & Transit international HT',
      debit: 0,
      credit: freightHT
    });
  }

  if (totalVatAmount > 0) {
    syscohadaEntries.push({
      accountCode: '4431',
      accountLabel: 'État, TVA facturée sur ventes (18%)',
      debit: 0,
      credit: totalVatAmount
    });
  }

  return {
    taxRegime: regime,
    deliveryCountry: input.deliveryCountry || 'Sénégal',
    isSenegalDelivery: isSenegal,
    isExport,
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
 * Génère le modèle de données JSON complet pour facture certifiée DGID/SYSCOHADA
 */
export function buildSyscohadaInvoicePayload(params: {
  invoiceNumber: string;
  orderDate?: string;
  client: {
    name: string;
    company?: string;
    ninea?: string;
    rccm?: string;
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
  items: TaxLineItem[];
  freightCostHT?: number;
  discountHT?: number;
}): SyscohadaInvoiceLegalData {
  const taxCalc = calculateSenegalVat({
    taxRegime: params.taxRegime || 'REEL',
    deliveryCountry: params.client.country || 'Sénégal',
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
    clientName: params.client.company ? `${params.client.company} (${params.client.name})` : params.client.name,
    clientNinea: params.client.ninea,
    clientAddress: params.client.address,
    clientCountry: params.client.country || 'Sénégal',
    taxCalculation: taxCalc
  };
}

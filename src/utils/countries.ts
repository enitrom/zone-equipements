// Liste complète de tous les pays du monde (en français) + normalisation insensible à la casse, aux accents et aux fautes d'orthographe

export const DEFAULT_SUPPORTED_DELIVERY_COUNTRIES: string[] = [
  'Sénégal',
  'Côte d\'Ivoire',
  'Mali',
  'Mauritanie',
  'Guinée',
  'Gambie',
  'Guinée-Bissau',
  'Burkina Faso',
  'Bénin',
  'Togo',
  'Niger',
  'Cameroun',
  'Gabon',
  'Congo',
  'RD Congo',
  'Maroc'
];

export const WORLD_COUNTRIES: string[] = [
  'Sénégal',
  'Chine',
  'États-Unis',
  'France',
  'Allemagne',
  'Italie',
  'Espagne',
  'Royaume-Uni',
  'Turquie',
  'Émirats Arabes Unis',
  'Belgique',
  'Pays-Bas',
  'Suisse',
  'Canada',
  'Japon',
  'Corée du Sud',
  'Inde',
  'Taïwan',
  'Côte d\'Ivoire',
  'Mali',
  'Mauritanie',
  'Guinée',
  'Gambie',
  'Guinée-Bissau',
  'Burkina Faso',
  'Bénin',
  'Togo',
  'Niger',
  'Cameroun',
  'Gabon',
  'Congo',
  'RD Congo',
  'Maroc',
  'Algérie',
  'Tunisie',
  'Nigeria',
  'Ghana',
  'Afrique du Sud',
  'Égypte',
  'Kenya',
  'Éthiopie',
  'Tanzanie',
  'Ouganda',
  'Rwanda',
  'Madagascar',
  'Maurice',
  'Angola',
  'Mozambique',
  'Zambie',
  'Zimbabwe',
  'Botswana',
  'Namibie',
  'Tchad',
  'République Centrafricaine',
  'Guinée Équatoriale',
  'Djibouti',
  'Comores',
  'Cap-Vert',
  'Sierra Leone',
  'Liberia',
  'Soudan',
  'Libye',
  'Afghanistan',
  'Albanie',
  'Andorre',
  'Arabie Saoudite',
  'Argentine',
  'Arménie',
  'Australie',
  'Autriche',
  'Azerbaïdjan',
  'Bahamas',
  'Bahreïn',
  'Bangladesh',
  'Barbade',
  'Biélorussie',
  'Belize',
  'Bhoutan',
  'Bolivie',
  'Bosnie-Herzégovine',
  'Brésil',
  'Brunei',
  'Bulgarie',
  'Cambodge',
  'Chili',
  'Chypre',
  'Colombie',
  'Corée du Nord',
  'Costa Rica',
  'Croatie',
  'Cuba',
  'Danemark',
  'Dominique',
  'Équateur',
  'Érythrée',
  'Estonie',
  'Eswatini',
  'Fidji',
  'Finlande',
  'Géorgie',
  'Grèce',
  'Grenade',
  'Guatemala',
  'Guyana',
  'Haïti',
  'Honduras',
  'Hong Kong',
  'Hongrie',
  'Indonésie',
  'Irak',
  'Iran',
  'Irlande',
  'Islande',
  'Israël',
  'Jamaïque',
  'Jordanie',
  'Kazakhstan',
  'Kirghizistan',
  'Koweït',
  'Laos',
  'Lesotho',
  'Lettonie',
  'Liban',
  'Liechtenstein',
  'Lituanie',
  'Luxembourg',
  'Macédoine du Nord',
  'Malaisie',
  'Malawi',
  'Maldives',
  'Malte',
  'Mexique',
  'Moldavie',
  'Monaco',
  'Mongolie',
  'Monténégro',
  'Myanmar',
  'Népal',
  'Nicaragua',
  'Norvège',
  'Nouvelle-Zélande',
  'Oman',
  'Ouzbékistan',
  'Pakistan',
  'Panama',
  'Papouasie-Nouvelle-Guinée',
  'Paraguay',
  'Pérou',
  'Philippines',
  'Pologne',
  'Portugal',
  'Qatar',
  'République Dominicaine',
  'République Tchèque',
  'Roumanie',
  'Russie',
  'Saint-Marin',
  'Salvador',
  'Serbie',
  'Singapour',
  'Slovaquie',
  'Slovénie',
  'Somalie',
  'Sri Lanka',
  'Suède',
  'Suriname',
  'Syrie',
  'Tadjikistan',
  'Thaïlande',
  'Trinité-et-Tobago',
  'Turkménistan',
  'Ukraine',
  'Uruguay',
  'Venezuela',
  'Viêt Nam',
  'Yémen'
];

// Synonymes, traductions anglaises et variantes orthographiques courantes vers le nom canonique français
const COUNTRY_SYNONYMS: Record<string, string> = {
  // États-Unis
  'usa': 'États-Unis',
  'us': 'États-Unis',
  'u s a': 'États-Unis',
  'united states': 'États-Unis',
  'united states of america': 'États-Unis',
  'etats unis': 'États-Unis',
  'etat unis': 'États-Unis',
  'etats-unis': 'États-Unis',
  'etat-unis': 'États-Unis',
  'etatsunis': 'États-Unis',
  'amerique': 'États-Unis',
  'america': 'États-Unis',
  // Chine
  'china': 'Chine',
  'cn': 'Chine',
  'prc': 'Chine',
  'rpc': 'Chine',
  'peoples republic of china': 'Chine',
  'chin': 'Chine',
  'chines': 'Chine',
  'chinee': 'Chine',
  // France
  'france': 'France',
  'fr': 'France',
  'franse': 'France',
  'fance': 'France',
  // Allemagne
  'germany': 'Allemagne',
  'deutschland': 'Allemagne',
  'de': 'Allemagne',
  'alemagne': 'Allemagne',
  'allemangne': 'Allemagne',
  'allemagne': 'Allemagne',
  // Italie
  'italy': 'Italie',
  'italia': 'Italie',
  'it': 'Italie',
  'itali': 'Italie',
  'italie': 'Italie',
  // Espagne
  'spain': 'Espagne',
  'espana': 'Espagne',
  'es': 'Espagne',
  'espagne': 'Espagne',
  'espane': 'Espagne',
  // Royaume-Uni
  'uk': 'Royaume-Uni',
  'gb': 'Royaume-Uni',
  'great britain': 'Royaume-Uni',
  'united kingdom': 'Royaume-Uni',
  'england': 'Royaume-Uni',
  'angleterre': 'Royaume-Uni',
  'royaume uni': 'Royaume-Uni',
  'royaume-uni': 'Royaume-Uni',
  'royaumeuni': 'Royaume-Uni',
  // Turquie
  'turkey': 'Turquie',
  'turkiye': 'Turquie',
  'tr': 'Turquie',
  'turqui': 'Turquie',
  'turquie': 'Turquie',
  // Émirats Arabes Unis
  'uae': 'Émirats Arabes Unis',
  'united arab emirates': 'Émirats Arabes Unis',
  'emirats arabes unis': 'Émirats Arabes Unis',
  'emirat arabe uni': 'Émirats Arabes Unis',
  'emirats': 'Émirats Arabes Unis',
  'dubai': 'Émirats Arabes Unis',
  'abu dhabi': 'Émirats Arabes Unis',
  // Sénégal
  'senegal': 'Sénégal',
  'sn': 'Sénégal',
  'senegale': 'Sénégal',
  'sengal': 'Sénégal',
  'senegl': 'Sénégal',
  // Côte d'Ivoire
  'cote divoire': 'Côte d\'Ivoire',
  'cote d ivoire': 'Côte d\'Ivoire',
  'ivory coast': 'Côte d\'Ivoire',
  'ci': 'Côte d\'Ivoire',
  'cotedivoire': 'Côte d\'Ivoire',
  // Autres pays fréquents
  'belgium': 'Belgique',
  'belgique': 'Belgique',
  'netherlands': 'Pays-Bas',
  'holland': 'Pays-Bas',
  'pays bas': 'Pays-Bas',
  'pays-bas': 'Pays-Bas',
  'switzerland': 'Suisse',
  'suisse': 'Suisse',
  'morocco': 'Maroc',
  'maroc': 'Maroc',
  'japan': 'Japon',
  'japon': 'Japon',
  'south korea': 'Corée du Sud',
  'korea': 'Corée du Sud',
  'coree du sud': 'Corée du Sud',
  'coree': 'Corée du Sud',
  'india': 'Inde',
  'inde': 'Inde',
  'taiwan': 'Taïwan',
  'canada': 'Canada',
  'brazil': 'Brésil',
  'bresil': 'Brésil',
  'guinee': 'Guinée',
  'guinea': 'Guinée',
  'gambia': 'Gambie',
  'gambie': 'Gambie',
  'mauritania': 'Mauritanie',
  'mauritanie': 'Mauritanie',
  'cameroon': 'Cameroun',
  'cameroun': 'Cameroun',
  'mali': 'Mali',
  'burkina': 'Burkina Faso',
  'burkina faso': 'Burkina Faso',
  'benin': 'Bénin',
  'togo': 'Togo',
  'niger': 'Niger',
  'gabon': 'Gabon',
  'rdc': 'RD Congo',
  'dr congo': 'RD Congo',
  'republique democratique du congo': 'RD Congo'
};

/**
 * Nettoie une chaîne de pays (minuscules, sans accents, sans ponctuation superflue)
 */
export function normalizeRawCountryToken(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’`\-_.,()/\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calcule la distance de Levenshtein entre deux chaînes pour tolérer les fautes de frappe
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // suppression
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Résout n'importe quelle saisie de pays (en anglais, français, majuscules, minuscules ou avec faute d'orthographe)
 * vers le nom de pays canonique de WORLD_COUNTRIES.
 */
export function resolveCanonicalCountryName(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  const clean = normalizeRawCountryToken(raw);
  if (!clean) return '';

  // 1. Correspondance directe dans les synonymes
  if (COUNTRY_SYNONYMS[clean]) {
    return COUNTRY_SYNONYMS[clean];
  }

  // 2. Correspondance exacte (insensible à la casse et aux accents) dans WORLD_COUNTRIES
  for (const country of WORLD_COUNTRIES) {
    if (normalizeRawCountryToken(country) === clean) {
      return country;
    }
  }

  // 3. Si la chaîne contient le nom d'un pays (ex: "Guangzhou, Chine" ou "Miami (USA)")
  for (const [synKey, canonical] of Object.entries(COUNTRY_SYNONYMS)) {
    if (synKey.length >= 4 && new RegExp(`\\b${synKey}\\b`, 'i').test(clean)) {
      return canonical;
    }
  }
  for (const country of WORLD_COUNTRIES) {
    const normCountry = normalizeRawCountryToken(country);
    if (normCountry.length >= 4 && clean.includes(normCountry)) {
      return country;
    }
  }

  // 4. Tolérance aux fautes d'orthographe (distance de Levenshtein <= 2)
  let bestMatch = '';
  let bestDist = 99;

  for (const country of WORLD_COUNTRIES) {
    const normCountry = normalizeRawCountryToken(country);
    const maxAllowedDist = normCountry.length >= 7 ? 2 : normCountry.length >= 4 ? 1 : 0;
    if (maxAllowedDist > 0) {
      const dist = levenshteinDistance(clean, normCountry);
      if (dist <= maxAllowedDist && dist < bestDist) {
        bestDist = dist;
        bestMatch = country;
      }
    }
  }

  if (bestMatch) return bestMatch;

  for (const [synKey, canonical] of Object.entries(COUNTRY_SYNONYMS)) {
    const maxAllowedDist = synKey.length >= 7 ? 2 : synKey.length >= 5 ? 1 : 0;
    if (maxAllowedDist > 0) {
      const dist = levenshteinDistance(clean, synKey);
      if (dist <= maxAllowedDist && dist < bestDist) {
        bestDist = dist;
        bestMatch = canonical;
      }
    }
  }

  return bestMatch || raw.trim();
}

/**
 * Vérifie si deux champs Pays correspondent en ignorant les majuscules/minuscules,
 * les accents, la langue (FR/EN) et les fautes d'orthographe.
 */
export function areCountriesMatching(countryA?: string | null, countryB?: string | null): boolean {
  if (!countryA || !countryB) return false;
  const canonA = resolveCanonicalCountryName(countryA);
  const canonB = resolveCanonicalCountryName(countryB);
  if (!canonA || !canonB) return false;

  const normA = normalizeRawCountryToken(canonA);
  const normB = normalizeRawCountryToken(canonB);
  if (normA === normB) return true;

  if (normA.length >= 4 && normB.length >= 4) {
    const maxDist = Math.min(normA.length, normB.length) >= 7 ? 2 : 1;
    if (levenshteinDistance(normA, normB) <= maxDist) {
      return true;
    }
  }
  return false;
}

/**
 * Retourne la liste effective des pays livrés pour un entrepôt donné (ou la liste globale par défaut)
 */
export function getSupportedDeliveryCountriesForWarehouse(
  warehouseOrList?: string[] | { supportedDeliveryCountries?: string[] | null } | null,
  globalSupportedCountries?: string[] | null
): string[] {
  const warehouseSupportedCountries = Array.isArray(warehouseOrList)
    ? warehouseOrList
    : warehouseOrList && typeof warehouseOrList === 'object'
      ? warehouseOrList.supportedDeliveryCountries
      : null;

  if (Array.isArray(warehouseSupportedCountries) && warehouseSupportedCountries.length > 0) {
    return warehouseSupportedCountries;
  }
  if (Array.isArray(globalSupportedCountries) && globalSupportedCountries.length > 0) {
    return globalSupportedCountries;
  }
  return DEFAULT_SUPPORTED_DELIVERY_COUNTRIES;
}

/**
 * Vérifie si un pays de destination client est pris en charge par la livraison
 * d'un entrepôt donné (ou par la liste des pays livrés par défaut du site).
 */
export function isDeliveryCountrySupported(
  clientCountry?: string | null,
  warehouseSupportedCountries?: string[] | null,
  globalSupportedCountries?: string[] | null
): boolean {
  const target = clientCountry?.trim() || 'Sénégal';
  const effectiveList = getSupportedDeliveryCountriesForWarehouse(
    warehouseSupportedCountries,
    globalSupportedCountries
  );

  return effectiveList.some(supported => areCountriesMatching(supported, target));
}

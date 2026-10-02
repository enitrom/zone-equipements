import { PRODUCTS, CATEGORIES, Product, getProductImageUrl } from '../constants';
import { db, auth } from '../firebase';
import { collection, getDocs, getDoc, setDoc, updateDoc, doc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { siteSettingsService } from './siteSettingsService';
import {
  areCountriesMatching,
  resolveCanonicalCountryName,
  DEFAULT_SUPPORTED_DELIVERY_COUNTRIES,
  isDeliveryCountrySupported
} from '../utils/countries';

export type { Product };

export interface PdfDocumentItem {
  title: string;
  url: string;
}

/**
 * Convertit n'importe quelle saisie de poids (ex: "18 lb", "450 g", "8,2 kg", "0.5 t", "16 oz", 12)
 * en kilogrammes (kg) numériques pour des calculs de fret toujours exacts.
 */
export function parseWeightToKg(
  rawWeight: string | number | undefined | null,
  fallbackKg: number = 0,
  specs?: Record<string, any>
): number {
  let candidate: string | number | undefined | null = rawWeight;
  if ((candidate === undefined || candidate === null || String(candidate).trim() === '') && specs && typeof specs === 'object') {
    for (const [k, v] of Object.entries(specs)) {
      if (/poids|weight|masse/i.test(k) && v !== undefined && v !== null && String(v).trim() !== '') {
        candidate = String(v);
        break;
      }
    }
  }
  if (candidate === undefined || candidate === null) return fallbackKg;
  if (typeof candidate === 'number') {
    return !isNaN(candidate) && candidate >= 0 ? Number(candidate.toFixed(3)) : fallbackKg;
  }
  const str = String(candidate).trim().toLowerCase().replace(',', '.');
  if (!str) return fallbackKg;

  // Chercher une valeur numérique suivie optionnellement d'une unité
  const match = str.match(/([0-9]+(?:\.[0-9]+)?)\s*(kg|kgs|kilogram(?:me)?s?|g|gr|gram(?:me)?s?|lb|lbs|pound(?:s)?|livre(?:s)?|oz|ounce(?:s)?|once(?:s)?|t|ton(?:ne)?s?)?\b/i);
  if (!match) return fallbackKg;

  const val = parseFloat(match[1]);
  if (isNaN(val) || val < 0) return fallbackKg;
  const unit = (match[2] || 'kg').toLowerCase();

  if (unit === 'g' || unit === 'gr' || unit.startsWith('gram')) {
    return Number((val / 1000).toFixed(3));
  }
  if (unit === 'lb' || unit === 'lbs' || unit.startsWith('pound') || unit.startsWith('livre')) {
    return Number((val * 0.45359237).toFixed(3));
  }
  if (unit === 'oz' || unit.startsWith('ounce') || unit.startsWith('once')) {
    return Number((val * 0.0283495).toFixed(3));
  }
  if (unit === 't' || unit.startsWith('ton')) {
    return Number((val * 1000).toFixed(3));
  }
  return Number(val.toFixed(3));
}

/**
 * Filtre toutes les petites icônes, logos, badges de confiance, pixels de tracking, miniatures (ex: 50x50, 60x60)
 * et images d'illustration par défaut du système si des photos réelles sont présentes.
 */
export function filterOutSmallOrIconImages(urls?: (string | undefined | null)[]): string[] {
  if (!urls || !Array.isArray(urls)) return [];
  const seen = new Set<string>();
  const result: string[] = [];

  const badPatterns = [
    /\b(icon[-_.]|[-_.]icon|favicon|logo|badge|avatar|sprite|flag[-_.]|banner|button|arrow|star|rating|trust|payment|visa|mastercard|paypal|verif|placeholder|loading|spinner|spacer|pixel|blank|transparent|1x1)\b/i,
    /[_/-](16|20|24|30|32|36|40|48|50|60|64|72|75|80|90)x\1\b/i,
    /[?&](?:w|width|wid|h|height|hei)=(?:[1-9]\d?)\b/i,
    /\.svg(?:\?|$)/i,
    /\.ico(?:\?|$)/i,
    /\.gif(?:\?|$)/i,
    /tps-\d+-\d+/i // icônes UI Alibaba/AliExpress (ex: tps-48-48.png)
  ];

  for (const raw of urls) {
    if (!raw || typeof raw !== 'string') continue;
    let trimmed = raw.trim();
    if (!trimmed || trimmed.length < 8) continue;

    // Autoriser les images base64 uploadées manuellement
    if (trimmed.startsWith('data:image/')) {
      if (!seen.has(trimmed)) {
        seen.add(trimmed);
        result.push(trimmed);
      }
      continue;
    }

    if (trimmed.startsWith('//')) {
      trimmed = 'https:' + trimmed;
    }

    // 1. Normaliser d'abord les vignettes Grainger, Alibaba, AliExpress, Made-in-China & Amazon en Haute Définition AVANT le filtrage de taille !
    let hdUrl = trimmed
      .replace(/_\.webp$/i, '')
      .replace(/_[0-9]+x[0-9]+[a-z0-9]*\.(jpg|png|jpeg|webp)$/i, '')
      .replace(/\.(jpg|png|jpeg|webp)_[0-9]+x[0-9]+.*$/i, '.$1')
      .replace(/_(50x50|80x80|100x100|120x120|220x220|350x350)\..*$/i, '');

    if (hdUrl.includes('static.grainger.com/rp/s/is/image/') || hdUrl.includes('static.grainger.com')) {
      const baseScene7 = hdUrl.split('?')[0];
      hdUrl = `${baseScene7}?$adapimg$&hei=1000&wid=1000`;
    } else if (hdUrl.includes('media-amazon.com/images/') || hdUrl.includes('images-amazon.com/images/')) {
      hdUrl = hdUrl.replace(/\._[A-Z0-9,_]+_\.(jpg|png|jpeg|webp)$/i, '.$1');
    }

    const isBad = badPatterns.some(rx => rx.test(hdUrl));
    if (isBad) continue;

    const dedupeKey = hdUrl.split('?')[0].toLowerCase();
    if (!seen.has(dedupeKey)) {
      seen.add(dedupeKey);
      result.push(hdUrl);
    }
  }

  // Élimine toute image d'illustration générique par défaut (unsplash 1581092160607) si de vraies images existent
  const realImages = result.filter(u => !u.includes('1581092160607-ee22621dd758') && !u.includes('placeholder'));
  if (realImages.length > 0) {
    return realImages;
  }

  return result;
}

/**
 * Résout de manière propre et conforme l'affichage de provenance sur les badges :
 * - Évite "Europe" si le pays d'origine est spécifié (ex: Allemagne, France, Italie, etc.).
 * - Élimine définitivement le terme "international" qui ne définit aucun pays spécifique.
 * - États-Unis et Chine sont parfaitement valides.
 * - Si aucune provenance précise n'est connue, retourne une chaîne vide.
 */
export function getCleanProvenanceDisplay(origin?: string, supplierCountry?: string, sourcePlatform?: string): string {
  const rawOrigin = (origin || '').trim();
  const rawCountry = (supplierCountry || '').trim();
  const rawPlatform = (sourcePlatform || '').trim().toLowerCase();

  // 1. Détection via plateforme source
  if (rawPlatform.includes('grainger') || rawPlatform.includes('mcmaster') || rawPlatform.includes('usa')) {
    return 'États-Unis';
  }
  if (rawPlatform.includes('alibaba') || rawPlatform.includes('made-in-china') || rawPlatform.includes('1688')) {
    return 'Chine';
  }

  // 2. Si le pays fournisseur est spécifié et n'est pas générique
  if (rawCountry && !/^(international|inconnu|global|europe)$/i.test(rawCountry)) {
    return rawCountry;
  }

  // 3. Si l'origine mentionne "Europe" mais qu'un pays précis est fourni
  if (/^europe$/i.test(rawOrigin)) {
    if (rawCountry && !/^(europe|international|inconnu)$/i.test(rawCountry)) {
      return rawCountry;
    }
    return '';
  }

  // 4. Si l'origine contient "international", la bannir totalement
  if (!rawOrigin || /^(international|inconnu|global|monde)$/i.test(rawOrigin)) {
    return (rawCountry && !/^(international|europe|inconnu)$/i.test(rawCountry)) ? rawCountry : '';
  }

  return rawOrigin.replace(/\binternational\b/gi, '').trim();
}

export interface ProductVariantItem {
  id?: string;
  name: string; // Ex: "12KW" ou "AC monophasé - 12KW"
  price?: number; // Prix spécifique de vente en FCFA (calculé automatiquement avec marge/TVA ou saisi)
  supplierPrice?: number; // Prix d'achat fournisseur saisi manuellement (dans la devise du produit)
  costPrice?: number; // Prix de revient en XOF (achat converti + frais entrepôt)
  weight?: string; // Poids spécifique ex: "45 kg" (utilisé pour le calcul de fret précis)
  image?: string; // Image propre au variant (URL ou base64 uploadée)
  characteristics?: string; // Caractéristiques dédiées du variant (texte ou lignes Clé: Valeur)
  specs?: Record<string, string>; // Caractéristiques dédiées structurées
  inStock?: boolean;
  sku?: string;
}

export interface VariantPricingContext {
  supplierCurrency?: 'USD' | 'EUR' | 'CNY' | 'XOF';
  marginRate?: number;
  warehouseDeliveryFeeUSD?: number;
  applyVat?: boolean;
}

// Convertit le champ de caractéristiques dédié d'un variant en objet clé-valeur pour l'affichage
export function parseVariantCharacteristicsToSpecs(
  characteristics?: string,
  existingSpecs?: Record<string, string>
): Record<string, string> | null {
  const result: Record<string, string> = {};

  if (existingSpecs && typeof existingSpecs === 'object') {
    for (const [k, v] of Object.entries(existingSpecs)) {
      if (k && v !== undefined && v !== null && String(v).trim() !== '') {
        result[k.trim()] = String(v).trim();
      }
    }
  }

  if (characteristics && typeof characteristics === 'string' && characteristics.trim() !== '') {
    const lines = characteristics
      .split(/\r?\n|\s*\|\s*|\s*;\s*/)
      .map(l => l.trim())
      .filter(Boolean);

    let freeTextIndex = 1;
    for (const line of lines) {
      const colonIdx = line.search(/[:=]/);
      if (colonIdx > 0 && colonIdx < line.length - 1) {
        const key = line.slice(0, colonIdx).trim();
        const val = line.slice(colonIdx + 1).trim();
        if (key && val) {
          result[key] = val;
          continue;
        }
      }
      const label = lines.length === 1 ? 'Caractéristique Spécifique' : `Caractéristique ${freeTextIndex++}`;
      result[label] = line;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

export function parseCharacteristicsTextToSpecs(
  characteristics?: string,
  existingSpecs?: Record<string, string>
): Record<string, string> {
  return parseVariantCharacteristicsToSpecs(characteristics, existingSpecs) || {};
}

export function formatSpecsToCharacteristicsText(specs?: Record<string, string>): string {
  if (!specs || typeof specs !== 'object') return '';
  return Object.entries(specs)
    .filter(([k, v]) => k && v !== undefined && v !== null && String(v).trim() !== '')
    .map(([k, v]) => `${k}: ${String(v).trim()}`)
    .join('\n');
}

const CLIENT_FRENCH_SPEC_KEYS: Record<string, string> = {
  'type': "Type d'équipement",
  'machine type': 'Type de machine',
  'power type': "Type d'alimentation",
  'core components': 'Composants essentiels',
  'commercial warranty': 'Garantie commerciale',
  'warranty': 'Garantie',
  'key selling points': 'Arguments clés de vente',
  'machinery test report': "Rapport d'essai machine",
  'video outgoing-inspection': 'Inspection vidéo au départ',
  'place of origin': "Lieu d'origine",
  'origin': 'Origine',
  'weight': 'Poids net',
  'net weight': 'Poids net',
  'single gross weight': 'Poids brut unitaire',
  'gross weight': 'Poids brut',
  'use': 'Utilisation / Applications',
  'usage': 'Utilisation',
  'brand name': 'Nom de marque',
  'brand': 'Marque',
  'dimensions': 'Dimensions (L*l*H)',
  'dimension(l*w*h)': 'Dimensions (L*l*H)',
  'dimension': 'Dimensions',
  'size': 'Dimensions / Taille',
  'product name': 'Nom du produit',
  'model number': 'Numéro de modèle',
  'model': 'Modèle',
  'engine type': 'Type de motorisation',
  'engine': 'Moteur',
  'function': 'Fonction principale',
  'color': 'Couleur / Finition',
  'moq': 'Quantité minimum de commande',
  'transmission type': 'Type de transmission',
  'application': "Domaines d'application",
  'applicable industries': "Secteurs d'application",
  'after-sales service provided': 'Service après-vente',
  'after warranty service': 'Service après garantie',
  'warranty of core components': 'Garantie composants essentiels',
  'packaging and delivery': 'Emballage & Expédition',
  'packaging details': "Détails d'emballage",
  'port': "Port d'embarquement",
  'selling units': 'Conditionnement de vente',
  'single package size': 'Dimensions colis unitaire',
  'rated power': 'Puissance nominale',
  'max power': 'Puissance maximale',
  'power': 'Puissance',
  'rated voltage': 'Tension nominale',
  'voltage': 'Tension',
  'current': 'Courant nominal',
  'rated current': 'Courant nominal',
  'frequency': 'Fréquence',
  'phase': 'Type de courant (Phase)',
  'speed': 'Vitesse de rotation',
  'rated speed': 'Vitesse nominale',
  'cooling system': 'Système de refroidissement',
  'cooling method': 'Méthode de refroidissement',
  'starting system': 'Système de démarrage',
  'start mode': 'Mode de démarrage',
  'fuel tank capacity': 'Capacité réservoir carburant',
  'fuel consumption': 'Consommation carburant',
  'fuel type': 'Type de carburant',
  'noise level': 'Niveau sonore',
  'alternator': 'Alternateur',
  'engine model': 'Modèle moteur',
  'engine brand': 'Marque du moteur',
  'displacement': 'Cylindrée',
  'insulation class': "Classe d'isolation",
  'continuous running time': 'Autonomie continue',
  'power factor': 'Facteur de puissance',
  'bore*stroke': 'Alésage x Course',
  'stroke': 'Course / Temps moteur',
  'cylinder': 'Cylindre(s)',
  'compression ratio': 'Taux de compression',
  'condition': "État de l'équipement",
  'certification': 'Certifications',
  'certificate': 'Certificat',
  'material': 'Matériau de construction',
  'capacity': 'Capacité',
  'flow rate': 'Débit',
  'max flow': 'Débit maximal',
  'head': 'Hauteur manométrique',
  'max head': 'Hauteur manométrique max.',
  'pressure': 'Pression de service',
  'working pressure': 'Pression de service',
  'max pressure': 'Pression maximale',
  'protection grade': 'Indice de protection (IP)',
  'efficiency': 'Rendement énergétique',
  'marketing type': 'Catégorie commerciale',
  'showroom location': 'Localisation showroom',
  'customized support': 'Personnalisation supportée',
  'structure': 'Structure / Conception',
  'theory': 'Principe de fonctionnement',
  'standard or nonstandard': 'Conformité standard',
  'fuel': 'Carburant / Énergie',
  'outlet size': 'Diamètre de sortie',
  'inlet size': "Diamètre d'entrée",
  'bore size': "Diamètre d'alésage",
  'cable length': 'Longueur de câble',
  'horsepower': 'Puissance (CV / HP)',
  'torque': 'Couple maximal',
  'max torque': 'Couple maximal',
  'no-load speed': 'Vitesse à vide',
  'impact rate': 'Cadence de frappe',
  'chuck size': 'Capacité du mandrin',
  'blade diameter': 'Diamètre de lame',
  'cutting depth': 'Profondeur de coupe',
  'cutting capacity': 'Capacité de coupe',
  'welding current': 'Courant de soudage',
  'duty cycle': "Facteur de marche",
  'protection class': 'Classe de protection',
  'ip rating': 'Indice de protection (IP)',
  'accuracy': 'Précision de mesure',
  'measuring range': 'Plage de mesure',
  'display type': "Type d'affichage",
  'operating temperature': 'Température de fonctionnement',
  'working temperature': 'Température de service',
  'lifespan': 'Durée de vie nominale',
  'working life': 'Durée de vie utile',
  'surface treatment': 'Traitement de surface',
  'lead time': 'Délai de fabrication',
  'delivery time': 'Délai de préparation',
  'sample': 'Échantillon disponible',
  'oem': 'Service OEM / Sur mesure',
  'package': 'Conditionnement',
  'overall length': 'Longueur totale',
  'overall width': 'Largeur totale',
  'overall height': 'Hauteur totale',
  'overall depth': 'Profondeur totale',
  'length less shaft': 'Longueur hors arbre',
  'body dia.': 'Diamètre du corps',
  'body dia': 'Diamètre du corps',
  'body diameter': 'Diamètre du corps',
  'shaft dia.': "Diamètre d'arbre",
  'shaft dia': "Diamètre d'arbre",
  'shaft diameter': "Diamètre d'arbre",
  'shaft length': "Longueur d'arbre",
  'shaft design': "Conception d'arbre",
  'motor shaft design': "Conception d'arbre moteur",
  'motor shaft rotation': 'Sens de rotation',
  'shaft rotation': 'Sens de rotation',
  'rotation': 'Sens de rotation',
  'frame': 'Châssis / Carcasse (Frame)',
  'nema frame': 'Châssis NEMA',
  'frame material': 'Matériau du châssis',
  'motor frame material': 'Matériau du châssis moteur',
  'motor enclosure design': 'Type de boîtier moteur',
  'enclosure': 'Boîtier / Protection',
  'motor design': 'Technologie moteur',
  'motor application': 'Application moteur',
  'motor sub application': 'Sous-application moteur',
  'motor mounting type': 'Type de montage moteur',
  'mounting type': 'Type de montage',
  'mounting': 'Montage',
  'motor orientation': "Position d'installation",
  'motor thermal protection': 'Protection thermique',
  'thermal protection': 'Protection thermique',
  'ins. class': "Classe d'isolation",
  'max. ambient temp.': 'Température ambiante max.',
  'ambient temperature': 'Température ambiante max.',
  'motor service factor': 'Facteur de service',
  'service factor': 'Facteur de service',
  'motor bearings': 'Type de roulements',
  'bearings': 'Roulements',
  'full load amps': 'Intensité pleine charge (A)',
  'nameplate rpm': 'Vitesse nominale (tr/min)',
  'rpm': 'Vitesse de rotation (tr/min)',
  'no. of speeds': 'Nombre de vitesses',
  'hp': 'Puissance (CV / HP)',
  'nominal efficiency': 'Rendement nominal',
  'voltage compatibility': ' tensions compatibles',
  'usable @ 208v': 'Compatible 208V',
  'usable @ 200v': 'Compatible 200V',
  'hz': 'Fréquence (Hz)',
  'standards': 'Normes & Certifications',
  'manufacturer warranty': 'Garantie constructeur',
  'item': "Désignation de l'article",
  'sub-category': 'Sous-catégorie',
  'unspsc': 'Code UNSPSC',
  'country of origin': "Pays d'origine",
  'country of origin (subject to change)': "Pays d'origine"
};

export function parseFractionalInchesClient(raw: string): number | null {
  if (!raw) return null;
  const s = raw.trim().replace(/\s+/g, ' ');
  // Mixed fraction e.g. "7-3/8" or "8 15/16"
  const mixed = s.match(/^(\d+)\s*[- ]\s*(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const whole = parseFloat(mixed[1]);
    const num = parseFloat(mixed[2]);
    const den = parseFloat(mixed[3]);
    if (den > 0) return whole + num / den;
  }
  // Pure fraction e.g. "5/8"
  const frac = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) {
    const num = parseFloat(frac[1]);
    const den = parseFloat(frac[2]);
    if (den > 0) return num / den;
  }
  // Standard decimal
  const dec = s.match(/^(\d+(?:[.,]\d+)?)$/);
  if (dec) {
    return parseFloat(dec[1].replace(',', '.'));
  }
  return null;
}

export function convertImperialDimensionValueToFrenchClient(val: string): string {
  if (!val || typeof val !== 'string') return '';
  let out = val.trim();

  // Convert 2D or 3D imperial dimensions e.g. "10-1/2 in x 7-3/8 in x 8-15/16 in"
  const multiInchRegex = /^(\d+(?:[- ]\d+\/\d+|\.\d+|\/\d+)?)\s*(?:in\.?|inch(?:es)?|po|")?\s*[xX×*]\s*(\d+(?:[- ]\d+\/\d+|\.\d+|\/\d+)?)\s*(?:in\.?|inch(?:es)?|po|")?(?:\s*[xX×*]\s*(\d+(?:[- ]\d+\/\d+|\.\d+|\/\d+)?)\s*(?:in\.?|inch(?:es)?|po|")?)?$/i;
  const multiMatch = out.match(multiInchRegex);
  if (multiMatch && /\b(?:in\.?|inch(?:es)?|po)\b|"/i.test(out)) {
    const p1 = parseFractionalInchesClient(multiMatch[1]);
    const p2 = parseFractionalInchesClient(multiMatch[2]);
    const p3 = multiMatch[3] ? parseFractionalInchesClient(multiMatch[3]) : null;
    if (p1 !== null && p2 !== null) {
      const cm1 = Number((p1 * 2.54).toFixed(1));
      const cm2 = Number((p2 * 2.54).toFixed(1));
      if (p3 !== null) {
        const cm3 = Number((p3 * 2.54).toFixed(1));
        return `${cm1} x ${cm2} x ${cm3} cm (${out.replace(/\bin\.?\b/gi, 'po')})`;
      }
      return `${cm1} x ${cm2} cm (${out.replace(/\bin\.?\b/gi, 'po')})`;
    }
  }

  // Convert single fractional or decimal inch value e.g. "7-3/8 in", "8-15/16 in", "5/8 in"
  const singleInchRegex = /^(\d+(?:\s*[- ]\s*\d+\/\d+|\.\d+|\/\d+)?)\s*(?:in\.?|inch(?:es)?|")$/i;
  const singleMatch = out.match(singleInchRegex);
  if (singleMatch) {
    const inches = parseFractionalInchesClient(singleMatch[1]);
    if (inches !== null && inches > 0) {
      const cm = Number((inches * 2.54).toFixed(1));
      const mm = Math.round(inches * 25.4);
      return inches < 2
        ? `${mm} mm (${singleMatch[1].trim()} po)`
        : `${cm} cm (${singleMatch[1].trim()} po)`;
    }
  }

  // Replace inline fractional inches inside longer text
  out = out.replace(/\b(\d+(?:-\d+\/\d+|\/\d+|\.\d+)?)\s*in\.?\b/gi, (full, numPart) => {
    const inches = parseFractionalInchesClient(numPart);
    if (inches !== null && inches > 0) {
      const cm = Number((inches * 2.54).toFixed(1));
      return `${cm} cm (${numPart} po)`;
    }
    return full;
  });

  return out;
}

export function extractDimensionsFromSpecsClient(
  rawDimensions?: string,
  specs?: Record<string, any>
): string {
  const parseSingleToCm = (rawVal: string): number | null => {
    if (!rawVal || typeof rawVal !== 'string') return null;
    const s = rawVal.trim();
    const cmAlready = s.match(/(\d+(?:[.,]\d+)?)\s*cm\b/i);
    if (cmAlready) {
      const v = parseFloat(cmAlready[1].replace(',', '.'));
      if (!isNaN(v) && v > 0) return Number(v.toFixed(1));
    }
    const mmAlready = s.match(/(\d+(?:[.,]\d+)?)\s*mm\b/i);
    if (mmAlready) {
      const v = parseFloat(mmAlready[1].replace(',', '.'));
      if (!isNaN(v) && v > 0) return Number((v / 10).toFixed(1));
    }
    const inchMatch = s.match(/(\d+(?:\s*[- ]\s*\d+\/\d+|\.\d+|\/\d+)?)\s*(?:in\.?|inch(?:es)?|po|")\b/i) ||
                      s.match(/^(\d+(?:\s*[- ]\s*\d+\/\d+|\/\d+))$/);
    if (inchMatch) {
      const inches = parseFractionalInchesClient(inchMatch[1]);
      if (inches !== null && inches > 0) return Number((inches * 2.54).toFixed(1));
    }
    const mMatch = s.match(/(\d+(?:[.,]\d+)?)\s*m\b/i);
    if (mMatch) {
      const v = parseFloat(mMatch[1].replace(',', '.'));
      if (!isNaN(v) && v > 0) return Number((v * 100).toFixed(1));
    }
    return null;
  };

  const normalize3D = (str: string): string => {
    if (!str) return '';
    const cleaned = str.trim();
    const parts = cleaned.split(/\s*[xX*×]\s*/);
    if (parts.length >= 2) {
      const unitHint = /\b(mm)\b/i.test(cleaned) ? 'mm' : (/\b(in\.?|inch(?:es)?|po|")\b/i.test(cleaned) ? 'in' : 'cm');
      const numsCm: number[] = [];
      for (const p of parts.slice(0, 3)) {
        const tokenClean = p.replace(/\([^)]*\)/g, '').replace(/(?:cm|mm|m|in\.?|inch(?:es)?|po|")/gi, '').trim();
        const val = parseFractionalInchesClient(tokenClean);
        if (val !== null && val > 0) {
          const hasLocalMm = /mm/i.test(p);
          const hasLocalIn = /\b(?:in\.?|inch(?:es)?|po)\b|"/i.test(p);
          const effectiveUnit = hasLocalMm ? 'mm' : (hasLocalIn ? 'in' : unitHint);
          const cm = effectiveUnit === 'mm' ? val / 10 : (effectiveUnit === 'in' ? val * 2.54 : val);
          numsCm.push(Number(cm.toFixed(1)));
        }
      }
      if (numsCm.length === 3) return `${numsCm[0]} x ${numsCm[1]} x ${numsCm[2]} cm`;
      if (numsCm.length === 2) return `${numsCm[0]} x ${numsCm[1]} x ${numsCm[1]} cm`;
    }
    return '';
  };

  if (rawDimensions && rawDimensions.trim()) {
    const norm = normalize3D(rawDimensions);
    if (norm) return norm;
  }

  if (!specs || typeof specs !== 'object') {
    return rawDimensions ? rawDimensions.trim() : '';
  }

  // 1. Check for a combined 3D dimension entry in specs
  for (const [k, v] of Object.entries(specs)) {
    if (!v) continue;
    const valStr = String(v);
    if (/dimensions?|taille|package size|colis|l\s*[*xX×]\s*[wl]\s*[*xX×]\s*h/i.test(k)) {
      const norm = normalize3D(valStr);
      if (norm) return norm;
    }
  }

  // 2. Check separate Length, Width/Diameter, Height/Depth entries in specs (English or translated French)
  let lengthCm: number | null = null;
  let lengthLessShaftCm: number | null = null;
  let shaftLengthCm: number | null = null;
  let widthCm: number | null = null;
  let heightCm: number | null = null;
  let diameterCm: number | null = null;

  for (const [k, v] of Object.entries(specs)) {
    if (!v) continue;
    const kl = k.toLowerCase().trim();
    const parsedCm = parseSingleToCm(String(v));
    if (parsedCm === null || parsedCm <= 0) continue;

    if (/^(?:overall length|longueur totale|longueur hors tout|length|longueur)$/i.test(kl)) {
      lengthCm = parsedCm;
    } else if (/length less shaft|longueur hors arbre|body length|longueur du corps/i.test(kl)) {
      lengthLessShaftCm = parsedCm;
    } else if (/shaft length|longueur d'arbre/i.test(kl)) {
      shaftLengthCm = parsedCm;
    } else if (/^(?:overall width|largeur totale|frame width|width|largeur)$/i.test(kl)) {
      widthCm = parsedCm;
    } else if (/^(?:overall height|hauteur totale|frame height|height|hauteur|overall depth|profondeur totale|depth|profondeur)$/i.test(kl)) {
      heightCm = parsedCm;
    } else if (/body dia|diamètre du corps|overall dia|diamètre total|frame diameter|^diameter$|^diamètre$/i.test(kl)) {
      diameterCm = parsedCm;
    }
  }

  const finalL = lengthCm ?? (lengthLessShaftCm !== null ? Number((lengthLessShaftCm + (shaftLengthCm || 0)).toFixed(1)) : null);
  const finalW = widthCm ?? diameterCm;
  const finalH = heightCm ?? diameterCm ?? widthCm;

  if (finalL && finalW && finalH) return `${finalL} x ${finalW} x ${finalH} cm`;
  if (finalL && finalW) return `${finalL} x ${finalW} x ${finalW} cm`;
  if (finalL && finalH) return `${finalL} x ${finalH} x ${finalH} cm`;
  if (finalW && finalH) return `${finalW} x ${finalW} x ${finalH} cm`;
  if (finalL) {
    const estW = diameterCm || Number(Math.max(10, finalL * 0.65).toFixed(1));
    return `${finalL} x ${estW} x ${estW} cm`;
  }

  return rawDimensions ? rawDimensions.trim() : '';
}

export function translateSpecKeyToFrenchClient(rawKey: string): string {
  if (!rawKey) return '';
  const cleaned = rawKey
    .replace(/[:\s]+$/, '')
    .replace(/^[\s•\-*]+/, '')
    .trim();
  const lower = cleaned.toLowerCase();
  if (CLIENT_FRENCH_SPEC_KEYS[lower]) {
    return CLIENT_FRENCH_SPEC_KEYS[lower];
  }
  const translated = cleaned
    .replace(/\bplace of origin\b/gi, "Lieu d'origine")
    .replace(/\bcountry of origin(?:\s*\(subject to change\))?\b/gi, "Pays d'origine")
    .replace(/\bbrand name\b/gi, 'Nom de marque')
    .replace(/\bmodel number\b/gi, 'Numéro de modèle')
    .replace(/\bproduct name\b/gi, 'Désignation du produit')
    .replace(/\boverall length\b/gi, 'Longueur totale')
    .replace(/\boverall width\b/gi, 'Largeur totale')
    .replace(/\boverall height\b/gi, 'Hauteur totale')
    .replace(/\boverall depth\b/gi, 'Profondeur totale')
    .replace(/\blength less shaft\b/gi, 'Longueur hors arbre')
    .replace(/\bbody dia(?:meter|\.)?\b/gi, 'Diamètre du corps')
    .replace(/\bshaft dia(?:meter|\.)?\b/gi, "Diamètre d'arbre")
    .replace(/\bshaft length\b/gi, "Longueur d'arbre")
    .replace(/\b(?:motor\s+)?shaft rotation\b/gi, 'Sens de rotation')
    .replace(/\b(?:motor\s+)?shaft design\b/gi, "Conception d'arbre")
    .replace(/\b(?:motor\s+)?enclosure design\b/gi, 'Type de boîtier moteur')
    .replace(/\b(?:motor\s+)?mounting type\b/gi, 'Type de montage')
    .replace(/\b(?:motor\s+)?thermal protection\b/gi, 'Protection thermique')
    .replace(/\b(?:motor\s+)?service factor\b/gi, 'Facteur de service')
    .replace(/\b(?:motor\s+)?bearings\b/gi, 'Type de roulements')
    .replace(/\b(?:motor\s+)?frame material\b/gi, 'Matériau du châssis')
    .replace(/\b(?:motor\s+)?sub application\b/gi, 'Sous-application')
    .replace(/\b(?:motor\s+)?application\b/gi, 'Application')
    .replace(/\b(?:motor\s+)?design\b/gi, 'Conception / Technologie')
    .replace(/\b(?:motor\s+)?orientation\b/gi, "Position d'installation")
    .replace(/\bins(?:ulation|\.)\s*class\b/gi, "Classe d'isolation")
    .replace(/\bmax\.?\s*ambient\s*temp(?:erature|\.)?\b/gi, 'Température ambiante max.')
    .replace(/\bfull load amps\b/gi, 'Intensité pleine charge (A)')
    .replace(/\bnameplate rpm\b/gi, 'Vitesse nominale (tr/min)')
    .replace(/\bno\.\s*of\s*speeds\b/gi, 'Nombre de vitesses')
    .replace(/\bnominal efficiency\b/gi, 'Rendement nominal')
    .replace(/\bvoltage compatibility\b/gi, 'Tensions compatibles')
    .replace(/\bmanufacturer warranty\b/gi, 'Garantie constructeur')
    .replace(/\brated power\b/gi, 'Puissance nominale')
    .replace(/\bmax(?:imum)? power\b/gi, 'Puissance maximale')
    .replace(/\boutput power\b/gi, 'Puissance de sortie')
    .replace(/\binput power\b/gi, "Puissance d'entrée")
    .replace(/\brated voltage\b/gi, 'Tension nominale')
    .replace(/\bworking voltage\b/gi, 'Tension de service')
    .replace(/\bworking pressure\b/gi, 'Pression de service')
    .replace(/\bmax(?:imum)? pressure\b/gi, 'Pression maximale')
    .replace(/\bgross weight\b/gi, 'Poids brut')
    .replace(/\bnet weight\b/gi, 'Poids net')
    .replace(/\bsingle package size\b/gi, 'Dimensions colis')
    .replace(/\bselling units\b/gi, 'Conditionnement')
    .replace(/\bcore components\b/gi, 'Composants essentiels')
    .replace(/\bafter-sales service provided\b/gi, 'Service après-vente')
    .replace(/\bmachinery test report\b/gi, "Rapport d'essai machine")
    .replace(/\bvideo outgoing-inspection\b/gi, 'Inspection vidéo départ usine')
    .replace(/\bapplicable industries\b/gi, "Secteurs d'application")
    .replace(/\bkey selling points\b/gi, 'Points forts techniques')
    .replace(/\boperating temperature\b/gi, 'Température de service')
    .replace(/\bmeasuring range\b/gi, 'Plage de mesure')
    .replace(/\bflow rate\b/gi, 'Débit nominal')
    .replace(/\bnoise level\b/gi, 'Niveau sonore')
    .replace(/\bfuel consumption\b/gi, 'Consommation de carburant')
    .replace(/\bfuel tank capacity\b/gi, 'Capacité du réservoir')
    .replace(/\bcooling system\b/gi, 'Système de refroidissement')
    .replace(/\bstarting system\b/gi, 'Système de démarrage')
    .replace(/\bwarranty\b/gi, 'Garantie')
    .replace(/\bstandards\b/gi, 'Normes')
    .replace(/\bframe\b/gi, 'Châssis')
    .replace(/\bphase\b/gi, 'Phase')
    .replace(/\bhz\b/gi, 'Fréquence (Hz)')
    .replace(/\brpm\b/gi, 'Vitesse (tr/min)')
    .replace(/\bhp\b/gi, 'Puissance (CV / HP)')
    .replace(/\bpower\b/gi, 'Puissance')
    .replace(/\bvoltage\b/gi, 'Tension')
    .replace(/\bcurrent\b/gi, 'Intensité / Courant')
    .replace(/\bweight\b/gi, 'Poids')
    .replace(/\bdimensions?\b/gi, 'Dimensions')
    .replace(/\bfrequency\b/gi, 'Fréquence')
    .replace(/\bspeed\b/gi, 'Vitesse')
    .replace(/\bcapacity\b/gi, 'Capacité')
    .replace(/\bmaterial\b/gi, 'Matériau')
    .replace(/\bcolor\b/gi, 'Couleur')
    .replace(/\bapplication\b/gi, 'Application')
    .replace(/\bfeature(?:s)?\b/gi, 'Caractéristiques')
    .replace(/\bfunction\b/gi, 'Fonction')
    .replace(/\btype\b/gi, 'Type')
    .replace(/\bsize\b/gi, 'Taille / Dimensions')
    .replace(/\bcertificate(?:s)?\b/gi, 'Certifications')
    .replace(/\bcondition\b/gi, 'État')
    .replace(/\borigin\b/gi, 'Origine')
    .replace(/\bitem\b/gi, 'Désignation');
  return translated.charAt(0).toUpperCase() + translated.slice(1);
}

export function translateSpecValueToFrenchClient(rawVal: string): string {
  if (!rawVal) return '';
  let text = String(rawVal).trim();
  if (!text) return '';

  // Convert fractional or decimal inches to metric cm/mm with original in parentheses
  text = convertImperialDimensionValueToFrenchClient(text);

  text = text
    .replace(/\(subject to change\)/gi, '(susceptible de changer)')
    .replace(/\bsubject to change\b/gi, 'susceptible de changer')
    .replace(/\bgeneral\s+purpose\s+motor\b/gi, 'Moteur électrique à usage général')
    .replace(/\bgeneral\s+application\b/gi, 'Application générale')
    .replace(/\bgeneral\s+purpose\b/gi, 'Usage général')
    .replace(/\bcapacitor[- ]start\s*\/\s*capacitor[- ]run\b/gi, 'Démarrage et marche par condensateur (CSCR)')
    .replace(/\bcapacitor[- ]start\b/gi, 'Démarrage par condensateur')
    .replace(/\bcapacitor[- ]run\b/gi, 'Fonctionnement par condensateur')
    .replace(/\bsplit[- ]phase\b/gi, 'Phase auxiliaire (Split-Phase)')
    .replace(/\bpermanent\s+split\s+capacitor\b/gi, 'Condensateur permanent (PSC)')
    .replace(/\bshaded\s+pole\b/gi, 'Bague de déphasage')
    .replace(/\bopen\s+dripproof\b/gi, 'Ouvert anti-gouttes (ODP)')
    .replace(/\bopen\s+air[- ]over\b/gi, "Ouvert refroidi par flux d'air (OAO)")
    .replace(/\btotally\s+enclosed\s+fan[- ]cooled\b/gi, 'Totalement fermé refroidi par ventilateur (TEFC)')
    .replace(/\btotally\s+enclosed\s+non[- ]ventilated\b/gi, 'Totalement fermé non ventilé (TENV)')
    .replace(/\btotally\s+enclosed\s+air[- ]over\b/gi, "Totalement fermé dans le flux d'air (TEAO)")
    .replace(/\bexplosion\s+proof\b/gi, 'Antidéflagrant (ATEX)')
    .replace(/\brigid\s+base\b/gi, 'Base rigide')
    .replace(/\bcradle\s+base\b/gi, 'Base berceau')
    .replace(/\bresilient\s+base\b/gi, 'Base élastique')
    .replace(/\byoke\b/gi, 'Étrier (Yoke)')
    .replace(/\bbelly\s+band\b/gi, 'Collier périphérique')
    .replace(/\bfootless\b/gi, 'Sans pattes (Footless)')
    .replace(/\bc[- ]face\s+less\s+base\b/gi, 'Bride C-Face sans base')
    .replace(/\bc[- ]face\s+with\s+base\b/gi, 'Bride C-Face avec base')
    .replace(/\bc[- ]face\b/gi, 'Bride C-Face')
    .replace(/\bcontinuous\s+duty\b/gi, 'Service continu')
    .replace(/\bcontinuous\b/gi, 'Continu')
    .replace(/\bintermittent\b/gi, 'Intermittent')
    .replace(/\bauto(?:matic)?\s+thermal\s+protection\b/gi, 'Protection thermique automatique')
    .replace(/\bautomatic\b/gi, 'Automatique')
    .replace(/\bauto\b/gi, 'Automatique')
    .replace(/\bmanual\b/gi, 'Manuel')
    .replace(/\bno\s+protection\b/gi, 'Sans protection thermique')
    .replace(/\ball\s+angle\b/gi, 'Toutes positions')
    .replace(/\bhorizontal\b/gi, 'Horizontal')
    .replace(/\bvertical\s+shaft\s+down\b/gi, 'Vertical arbre vers le bas')
    .replace(/\bvertical\s+shaft\s+up\b/gi, 'Vertical arbre vers le haut')
    .replace(/\bvertical\b/gi, 'Vertical')
    .replace(/\bkeyed\b/gi, 'À clavette')
    .replace(/\bflat\b/gi, 'À méplat')
    .replace(/\bthreaded\b/gi, 'Fileté')
    .replace(/\bdouble[- ]ended\b/gi, "Double bout d'arbre")
    .replace(/\bcw\/ccw\b/gi, 'Réversible Horaire / Anti-horaire (CW/CCW)')
    .replace(/\bccw\/cw\b/gi, 'Réversible Anti-horaire / Horaire (CCW/CW)')
    .replace(/\bcounterclockwise\b/gi, 'Anti-horaire (CCW)')
    .replace(/\bclockwise\b/gi, 'Horaire (CW)')
    .replace(/\bball\s+bearings?\b/gi, 'Roulements à billes')
    .replace(/\bsleeve\s+bearings?\b/gi, 'Paliers lisses (Bague)')
    .replace(/\bball\b/gi, 'Roulements à billes')
    .replace(/\bsleeve\b/gi, 'Paliers lisses (Bague)')
    .replace(/\brolled\s+steel\b/gi, 'Acier laminé')
    .replace(/\bstamped\s+steel\b/gi, 'Acier embouti')
    .replace(/\byes\b/gi, 'Oui')
    .replace(/\bno\b/gi, 'Non')
    .replace(/\bsouth\s+korea\b/gi, 'Corée du Sud')
    .replace(/\bkorea\b/gi, 'Corée du Sud')
    .replace(/\bunited\s+states(?:\s+of\s+america)?\b/gi, 'États-Unis')
    .replace(/\bu\.?s\.?a\.?\b/gi, 'États-Unis')
    .replace(/\bunited\s+kingdom\b/gi, 'Royaume-Uni')
    .replace(/\bmexico\b/gi, 'Mexique')
    .replace(/\btaiwan\b/gi, 'Taïwan')
    .replace(/\bindia\b/gi, 'Inde')
    .replace(/\bvietnam\b/gi, 'Viêt Nam')
    .replace(/\bcanada\b/gi, 'Canada')
    .replace(/\bbrazil\b/gi, 'Brésil')
    .replace(/\bswitzerland\b/gi, 'Suisse')
    .replace(/\bsweden\b/gi, 'Suède')
    .replace(/\bspain\b/gi, 'Espagne')
    .replace(/\bbrand\s+new\b/gi, "Neuf d'origine")
    .replace(/\b100%\s*new\b/gi, "100% Neuf d'origine")
    .replace(/\bnew\b/gi, 'Neuf')
    .replace(/\b1\s*year\b/gi, '1 an')
    .replace(/\b2\s*years\b/gi, '2 ans')
    .replace(/\b3\s*years\b/gi, '3 ans')
    .replace(/\b(\d+)\s*years?\b/gi, '$1 ans')
    .replace(/\b(\d+)\s*months?\b/gi, '$1 mois')
    .replace(/\b(\d+)\s*days?\b/gi, '$1 jours')
    .replace(/\b(\d+)\s*hours?\b/gi, '$1 heures')
    .replace(/\bprovided\b/gi, 'Fourni')
    .replace(/\bavailable\b/gi, 'Disponible')
    .replace(/\bnot\s+available\b/gi, 'Non applicable')
    .replace(/\bnone\b/gi, 'Aucun')
    .replace(/\bsingle\s+item\b/gi, 'Article unitaire')
    .replace(/\bsingle\s+phase\b/gi, 'Monophasé')
    .replace(/\bthree\s+phase\b/gi, 'Triphasé')
    .replace(/\b1\s*phase\b/gi, 'Monophasé')
    .replace(/\b3\s*phase\b/gi, 'Triphasé')
    .replace(/\bair[- ]cooled\b/gi, 'Refroidissement par air')
    .replace(/\bwater[- ]cooled\b/gi, 'Refroidissement par eau')
    .replace(/\belectric\s+start(?:ing)?\b/gi, 'Démarrage électrique')
    .replace(/\brecoil\s+start(?:ing)?\b/gi, 'Démarrage manuel à lanceur')
    .replace(/\bauto(?:matic)?\s+start(?:ing)?\b/gi, 'Démarrage automatique (ATS)')
    .replace(/\bhand\s+start(?:ing)?\b/gi, 'Démarrage manuel')
    .replace(/\b4[- ]stroke\b/gi, '4 temps')
    .replace(/\b2[- ]stroke\b/gi, '2 temps')
    .replace(/\bsingle\s+cylinder\b/gi, 'Monocylindre')
    .replace(/\bdouble\s+cylinder\b/gi, 'Bicylindre')
    .replace(/\bmulti[- ]cylinder\b/gi, 'Multicylindre')
    .replace(/\bwood(?:en)?\s+case\b/gi, 'Caisse en bois maritime')
    .replace(/\bplywood\s+case\b/gi, 'Caisse en contreplaqué renforcé')
    .replace(/\bcarton\s+box\b/gi, 'Carton industriel renforcé')
    .replace(/\bcustom(?:ized|ised)\s+color\b/gi, 'Couleur sur mesure')
    .replace(/\bcustom(?:ized|ised)\b/gi, 'Sur mesure')
    .replace(/\bstainless\s+steel\b/gi, 'Acier inoxydable')
    .replace(/\bcarbon\s+steel\b/gi, 'Acier au carbone')
    .replace(/\balloy\s+steel\b/gi, 'Acier allié haute résistance')
    .replace(/\bcast\s+iron\b/gi, 'Fonte robuste')
    .replace(/\bductile\s+iron\b/gi, 'Fonte ductile')
    .replace(/\bpure\s+copper\b/gi, 'Cuivre pur 100%')
    .replace(/\bcopper\b/gi, 'Cuivre')
    .replace(/\bbrass\b/gi, 'Laiton')
    .replace(/\balumin(?:i)?um\s+alloy\b/gi, "Alliage d'aluminium")
    .replace(/\balumin(?:i)?um\b/gi, 'Aluminium')
    .replace(/\bchina\b/gi, 'Chine')
    .replace(/\bgermany\b/gi, 'Allemagne')
    .replace(/\bunited\s+states\b/gi, 'États-Unis')
    .replace(/\bjapan\b/gi, 'Japon')
    .replace(/\bitaly\b/gi, 'Italie')
    .replace(/\bfrance\b/gi, 'France')
    .replace(/\bdiesel\s+engine\b/gi, 'Moteur diesel')
    .replace(/\bgasoline\s+engine\b/gi, 'Moteur essence')
    .replace(/\bbrushless\s+motor\b/gi, 'Moteur sans balais (Brushless)')
    .replace(/\bengine\b/gi, 'Moteur')
    .replace(/\bsubmersible\s+pump\b/gi, 'Pompe submersible')
    .replace(/\bcentrifugal\s+pump\b/gi, 'Pompe centrifuge')
    .replace(/\bhydraulic\s+pump\b/gi, 'Pompe hydraulique')
    .replace(/\bpump\b/gi, 'Pompe')
    .replace(/\bbearing\b/gi, 'Roulement')
    .replace(/\bgearbox\b/gi, 'Réducteur / Boîte de vitesses')
    .replace(/\bmotor\b/gi, 'Moteur électrique')
    .replace(/\bpressure\s+vessel\b/gi, 'Réservoir sous pression')
    .replace(/\bgear\b/gi, 'Engrenage')
    .replace(/\bplc\b/gi, 'Automate programmable (PLC)')
    .replace(/\bfarms?\b/gi, 'Exploitations agricoles')
    .replace(/\bmanufacturing\s+plant\b/gi, 'Usine de production')
    .replace(/\bmachinery\s+repair\s+shops?\b/gi, 'Ateliers de maintenance mécanique')
    .replace(/\bconstruction\s+works\b/gi, 'Chantiers BTP & Génie Civil')
    .replace(/\benergy\s*&\s*mining\b/gi, 'Énergie & Exploitation Minière')
    .replace(/\bmining\b/gi, 'Mines & Carrières')
    .replace(/\bbuilding\s+material\s+shops?\b/gi, 'Matériaux de construction')
    .replace(/\bfood\s*&\s*beverage\s+factory\b/gi, 'Industrie agroalimentaire')
    .replace(/\bhome\s+use\b/gi, 'Usage domestique / tertiaire')
    .replace(/\bretail\b/gi, 'Distribution professionnelle')
    .replace(/\beasy\s+to\s+operate\b/gi, 'Prise en main et utilisation simples')
    .replace(/\bhigh\s+productivity\b/gi, 'Productivité industrielle élevée')
    .replace(/\blong\s+service\s+life\b/gi, 'Longévité accrue en service continu')
    .replace(/\benergy\s+saving\b/gi, 'Haute efficacité énergétique')
    .replace(/\blow\s+noise(?:\s+level)?\b/gi, 'Fonctionnement silencieux (faible bruit)')
    .replace(/\bhigh\s+efficiency\b/gi, 'Haut rendement opérationnel')
    .replace(/\bhigh\s+accuracy\b/gi, 'Haute précision de mesure')
    .replace(/\bhigh\s+pressure\b/gi, 'Haute pression')
    .replace(/\bheavy\s+duty\b/gi, 'Usage intensif (Heavy Duty)')
    .replace(/\bwaterproof\b/gi, 'Étanche')
    .replace(/\bdustproof\b/gi, 'Résistant à la poussière')
    .replace(/\bcorrosion\s+resistant\b/gi, 'Résistant à la corrosion')
    .replace(/\bwear\s+resistant\b/gi, "Résistant à l'abrasion et à l'usure")
    .replace(/\bonline\s+support\b/gi, 'Assistance technique en ligne')
    .replace(/\bvideo\s+technical\s+support\b/gi, 'Assistance technique par vidéo')
    .replace(/\bfree\s+spare\s+parts\b/gi, 'Pièces de rechange fournies')
    .replace(/\bfield\s+installation\b/gi, 'Installation et mise en service sur site')
    .replace(/\bcommissioning\s+and\s+training\b/gi, 'Mise en route et formation')
    .replace(/\bordinary\s+product\b/gi, 'Équipement standard catalogue')
    .replace(/\bhot\s+product\b/gi, 'Équipement haute demande')
    .replace(/\bnew\s+product\b/gi, 'Nouvelle génération')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return text.charAt(0).toUpperCase() + text.slice(1);
}

const KNOWN_GLUED_ENGLISH_SPEC_PREFIXES = [
  'Country of Origin (subject to change)', 'Country of Origin', 'Place of Origin', 'Brand Name', 'Model Number', 'Product Name',
  'Duty Cycle', 'Motor Design', 'Motor Enclosure Design', 'Motor Sub Application',
  'Motor Application', 'Motor Thermal Protection', 'Ins. Class', 'Insulation Class',
  'Max. Ambient Temp.', 'Ambient Temperature', 'Motor Service Factor', 'Service Factor',
  'Motor Bearings', 'Motor Mounting Type', 'MotorMounting Type', 'Mounting Type',
  'Motor Frame Material', 'Frame Material', 'Motor Shaft Rotation', 'Shaft Rotation',
  'Motor Shaft Design', 'Shaft Design', 'Shaft Dia.', 'Shaft Diameter', 'Shaft Length',
  'Overall Length', 'Overall Width', 'Overall Height', 'Overall Depth', 'Length Less Shaft',
  'Body Dia.', 'Body Diameter', 'Frame', 'NEMA Frame', 'Voltage Compatibility', 'Voltage', 'Rated Voltage',
  'Usable @ 208V', 'Usable @ 200V', 'Full Load Amps', 'Phase', 'Hz', 'Frequency',
  'Nameplate RPM', 'RPM', 'No. of Speeds', 'Motor Orientation', 'HP', 'Horsepower',
  'Rated Power', 'Nominal Efficiency', 'Efficiency', 'Weight', 'Net Weight', 'Gross Weight',
  'Standards', 'Standards Compliance', 'Manufacturer Warranty', 'Warranty',
  'Item', 'Application', 'Enclosure', 'Mounting', 'Rotation', 'Material', 'Color', 'UNSPSC'
].sort((a, b) => b.length - a.length);

function splitGluedEnglishSpecEntry(rawKey: string, rawVal: string): Array<[string, string]> {
  const combined = `${rawKey}: ${rawVal}`.trim();
  // Tester si rawKey ou rawVal contient plusieurs paires collées (ex: "Country of OriginSouth Korea (subject to change)")
  const checkGlued = (text: string): [string, string] | null => {
    const clean = text.trim();
    for (const prefix of KNOWN_GLUED_ENGLISH_SPEC_PREFIXES) {
      if (clean.toLowerCase().startsWith(prefix.toLowerCase()) && clean.length > prefix.length) {
        const remainder = clean.slice(prefix.length).replace(/^[:\s\-–—]+/, '').trim();
        if (remainder.length > 0) {
          return [prefix, remainder];
        }
      }
    }
    // CamelCase / Collage Majuscule ex: "Motor ApplicationGeneral Application"
    const gluedMatch = clean.match(/^([A-Z][a-zA-Z0-9.\s/-]{2,28}?[a-z.])([A-Z0-9][a-zA-Z0-9\s(),./-]*)$/);
    if (gluedMatch) {
      return [gluedMatch[1].trim(), gluedMatch[2].trim()];
    }
    return null;
  };

  // Si la clé est générique ("Caractéristique 1", "Spécification") et que la valeur contient CléValeur collés
  if (/^(caract[ée]ristique|sp[ée]cification|info|d[ée]tail)\s*\d*$/i.test(rawKey.trim())) {
    const splitVal = checkGlued(rawVal);
    if (splitVal) {
      return [splitVal];
    }
  }

  const splitKey = checkGlued(rawKey);
  if (splitKey && (!rawVal || rawVal.trim() === '' || rawVal.trim() === rawKey.trim())) {
    return [splitKey];
  }

  void combined;
  return [[rawKey, rawVal]];
}

export function translateSpecsRecordToFrench(specs?: Record<string, any>): Record<string, string> {
  if (!specs || typeof specs !== 'object' || Array.isArray(specs)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(specs)) {
    if (v === null || v === undefined) continue;
    const rawStrVal = typeof v === 'object' ? JSON.stringify(v) : String(v);
    const pairs = splitGluedEnglishSpecEntry(String(k), rawStrVal);
    for (const [subK, subV] of pairs) {
      const frK = translateSpecKeyToFrenchClient(subK);
      const frV = translateSpecValueToFrenchClient(subV);
      if (frK && frV) {
        out[frK] = frV;
      }
    }
  }
  return out;
}

/**
 * Fonction unifiée de traduction et reformulation forcée en Français professionnel
 * pour le bouton unique de l'Admin (Import par lien & Ajout/Modification manuelle).
 */
export function translateAndReformatProductSmart(input: {
  name?: string;
  description?: string;
  specs?: Record<string, any>;
  characteristicsText?: string;
  brand?: string;
  dimensions?: string;
  forceTranslate?: boolean;
}): {
  name: string;
  description: string;
  specs: Record<string, string>;
  characteristicsText: string;
  dimensions: string;
} {
  // 1. Parser toutes les caractéristiques (depuis characteristicsText et specs) en séparant les textes collés
  const rawMergedSpecs: Record<string, string> = {};
  if (input.specs && typeof input.specs === 'object') {
    for (const [k, v] of Object.entries(input.specs)) {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        rawMergedSpecs[String(k).trim()] = String(v).trim();
      }
    }
  }
  if (input.characteristicsText && typeof input.characteristicsText === 'string') {
    const lines = input.characteristicsText
      .split(/\r?\n|\s*\|\s*|\s*;\s*/)
      .map(l => l.trim())
      .filter(Boolean);
    let idx = 1;
    for (const line of lines) {
      const colonIdx = line.search(/[:=]/);
      if (colonIdx > 0 && colonIdx < line.length - 1) {
        const key = line.slice(0, colonIdx).trim();
        const val = line.slice(colonIdx + 1).trim();
        rawMergedSpecs[key] = val;
      } else {
        const splitPairs = splitGluedEnglishSpecEntry(`Caractéristique ${idx++}`, line);
        for (const [sk, sv] of splitPairs) {
          rawMergedSpecs[sk] = sv;
        }
      }
    }
  }

  const translatedSpecs = translateSpecsRecordToFrench(rawMergedSpecs);
  const extractedDimensions = extractDimensionsFromSpecsClient(input.dimensions, {
    ...rawMergedSpecs,
    ...translatedSpecs
  });

  // 2. Traduction forcée du titre (même si des mots anglais techniques moins courants sont présents)
  let rawTitle = (input.name || '').trim();
  if (input.forceTranslate && rawTitle) {
    rawTitle = rawTitle
      .replace(/\bgeneral\s+purpose\s+motor\b/gi, 'Moteur électrique usage général')
      .replace(/\bsingle[- ]phase\b/gi, 'monophasé')
      .replace(/\bthree[- ]phase\b/gi, 'triphasé')
      .replace(/\bcapacitor[- ]start\b/gi, 'démarrage par condensateur')
      .replace(/\bopen\s+dripproof\b/gi, 'boîtier ouvert abrité (ODP)')
      .replace(/\btotally\s+enclosed\s+fan[- ]cooled\b/gi, 'fermé ventilé (TEFC)')
      .replace(/\bcradle\s+base\b/gi, 'montage sur berceau')
      .replace(/\brigid\s+base\b/gi, 'base rigide')
      .replace(/\bnameplate\s+rpm\b/gi, 'vitesse nominale')
      .replace(/\bframe\b/gi, 'Châssis');
  }
  const translatedTitle = smartTranslateProductTitleToFrench(rawTitle, input.brand);

  // 3. Traduction et reformulation complète de la description technique
  const translatedDescription = smartTranslateProductDescriptionToFrench(
    input.description,
    translatedTitle || rawTitle,
    translatedSpecs
  );

  const formattedChars = formatSpecsToCharacteristicsText(translatedSpecs);

  return {
    name: translatedTitle || rawTitle,
    description: translatedDescription,
    specs: translatedSpecs,
    characteristicsText: formattedChars,
    dimensions: extractedDimensions
  };
}

/**
 * Traduit et reformule intelligemment un titre de produit (souvent issu d'Alibaba/AliExpress/Amazon
 * avec empilement de mots-clés anglais) en une désignation industrielle française fluide et structurée.
 */
export function smartTranslateProductTitleToFrench(rawTitle?: string, brand?: string): string {
  if (!rawTitle || typeof rawTitle !== 'string') return '';
  let t = rawTitle.trim();
  if (!t) return '';

  // 1. Nettoyage des suffixes de places de marché et du bourrage de mots-clés marketing
  t = t
    .replace(/\s*[-|–—]\s*(Buy|Shop|Alibaba|AliExpress|Amazon|Made-in-China|1688).*$/i, '')
    .replace(/\b(hot\s+sale|best\s+seller|high\s+quality|good\s+quality|top\s+quality|factory\s+price|wholesale\s+price|direct\s+factory|factory\s+direct|cheap\s+price|low\s+price|best\s+price|free\s+shipping|fast\s+delivery|in\s+stock|new\s+arrival|202[3-7]\s+new|oem\/odm|oem\s+odm|customized|customised|for\s+sale|china\s+supplier|manufacturer)\b/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Détecter s'il contient des termes anglais techniques courants à traduire et reformuler
  const englishIndicators = /\b(pump|generator|genset|motor|engine|welder|welding|breaker|hammer|drill|grinder|saw|compressor|valve|sensor|multimeter|analyzer|tester|inverter|solar|battery|charger|forklift|hoist|winch|crane|jack|bearing|gearbox|plc|contactor|relay|switch|cable|transformer|excavator|loader|mixer|crusher|conveyor|sprayer|tractor|cultivator|stainless\s+steel|cast\s+iron|heavy\s+duty|three\s+phase|single\s+phase|submersible|centrifugal|hydraulic|pneumatic|electric|digital|automatic|portable|industrial|silent|brushless|cordless|waterproof)\b/i;

  if (!englishIndicators.test(t)) {
    // Nettoyer la ponctuation superflue et mettre une majuscule propre
    const clean = t.replace(/\s{2,}/g, ' ').replace(/^[\s\-|,;]+|[\s\-|,;]+$/g, '');
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  // 2. Reformulation structurelle intelligente des groupes nominaux anglais -> français
  let reformulated = t
    // Équipements complets (inversion nom principal en tête)
    .replace(/\b(?:silent|super\s+silent|soundproof)\s+diesel\s+generator(?:\s+set)?\b/gi, 'Groupe électrogène diesel insonorisé')
    .replace(/\bdiesel\s+generator(?:\s+set)?\b/gi, 'Groupe électrogène diesel')
    .replace(/\bgasoline\s+generator(?:\s+set)?\b/gi, 'Groupe électrogène essence')
    .replace(/\bsolar\s+generator\b/gi, 'Générateur solaire autonome')
    .replace(/\bpower\s+generator\b/gi, 'Groupe électrogène industriel')
    .replace(/\bgenset\b/gi, 'Groupe électrogène')
    .replace(/\bstainless\s+steel\s+submersible\s+(?:sewage\s+)?(?:water\s+)?pump\b/gi, "Pompe submersible en acier inoxydable")
    .replace(/\bsubmersible\s+sewage\s+(?:water\s+)?pump\b/gi, "Pompe submersible d'assainissement eaux usées")
    .replace(/\bsubmersible\s+(?:water\s+|borehole\s+|deep\s+well\s+)?pump\b/gi, 'Pompe immergée de forage')
    .replace(/\bcentrifugal\s+(?:water\s+)?pump\b/gi, 'Pompe centrifuge industrielle')
    .replace(/\bhigh\s+pressure\s+(?:water\s+|washer\s+)?pump\b/gi, 'Pompe haute pression')
    .replace(/\bhydraulic\s+gear\s+pump\b/gi, 'Pompe hydraulique à engrenages')
    .replace(/\bhydraulic\s+pump\b/gi, 'Pompe hydraulique')
    .replace(/\bdiaphragm\s+pump\b/gi, 'Pompe à membrane')
    .replace(/\bwater\s+pump\b/gi, 'Pompe à eau')
    .replace(/\bair\s+compressor\b/gi, "Compresseur d'air industriel")
    .replace(/\bscrew\s+compressor\b/gi, 'Compresseur à vis')
    .replace(/\bimpact\s+wrench\b/gi, 'Clé à chocs')
    .replace(/\brotary\s+hammer(?:\s+drill)?\b/gi, 'Perforateur burineur')
    .replace(/\bhammer\s+drill\b/gi, 'Perceuse à percussion')
    .replace(/\bcordless\s+drill\b/gi, 'Perceuse-visseuse sans fil')
    .replace(/\belectric\s+drill\b/gi, 'Perceuse électrique')
    .replace(/\bangle\s+grinder\b/gi, "Meuleuse d'angle")
    .replace(/\bdemolition\s+hammer\b/gi, 'Marteau piqueur de démolition')
    .replace(/\bjack\s+hammer\b/gi, 'Marteau piqueur')
    .replace(/\bwelding\s+machine\b/gi, 'Poste à souder professionnel')
    .replace(/\binverter\s+welder\b/gi, 'Poste à souder Inverter')
    .replace(/\blaser\s+welding\s+machine\b/gi, 'Machine de soudage laser')
    .replace(/\bcircuit\s+breaker\b/gi, 'Disjoncteur de protection')
    .replace(/\bfrequency\s+inverter\b/gi, 'Variateur de fréquence')
    .replace(/\bvariable\s+frequency\s+drive\b/gi, 'Variateur de vitesse (VFD)')
    .replace(/\bsolar\s+inverter\b/gi, 'Onduleur solaire hybride')
    .replace(/\bdigital\s+multimeter\b/gi, 'Multimètre numérique de précision')
    .replace(/\bclamp\s+meter\b/gi, 'Pince ampèremétrique')
    .replace(/\bthermal\s+imaging\s+camera\b/gi, 'Caméra thermique infrarouge')
    .replace(/\bpressure\s+transmitter\b/gi, 'Transmetteur de pression')
    .replace(/\bflow\s+meter\b/gi, 'Débitmètre industriel')
    .replace(/\blevel\s+sensor\b/gi, 'Capteur de niveau')
    .replace(/\belectric\s+hoist\b/gi, 'Palan électrique de levage')
    .replace(/\bchain\s+hoist\b/gi, 'Palan à chaîne')
    .replace(/\bhydraulic\s+jack\b/gi, 'Cric hydraulique')
    .replace(/\bpallet\s+truck\b/gi, 'Transpalette de manutention')
    .replace(/\bforklift\b/gi, 'Chariot élévateur')
    .replace(/\bconcrete\s+mixer\b/gi, 'Bétonnière professionnelle')
    .replace(/\bplate\s+compactor\b/gi, 'Plaque vibrante de compactage')
    .replace(/\bjaw\s+crusher\b/gi, 'Concasseur à mâchoires')
    // Qualificatifs & spécifications techniques dans le titre
    .replace(/\bstainless\s+steel\b/gi, 'en acier inoxydable')
    .replace(/\bcast\s+iron\b/gi, 'en fonte')
    .replace(/\bpure\s+copper\b/gi, 'bobinage cuivre pur')
    .replace(/\bthree\s*[- ]?phase\b/gi, 'Triphasé')
    .replace(/\bsingle\s*[- ]?phase\b/gi, 'Monophasé')
    .replace(/\b3\s*phase\b/gi, 'Triphasé')
    .replace(/\b1\s*phase\b/gi, 'Monophasé')
    .replace(/\belectric\s+start\b/gi, 'à démarrage électrique')
    .replace(/\bauto(?:matic)?\s+start\b/gi, 'à démarrage automatique')
    .replace(/\bwater\s*[- ]?cooled\b/gi, 'refroidi par eau')
    .replace(/\bair\s*[- ]?cooled\b/gi, 'refroidi par air')
    .replace(/\bbrushless\b/gi, 'sans balais (Brushless)')
    .replace(/\bcordless\b/gi, 'sans fil')
    .replace(/\bheavy\s+duty\b/gi, 'haute performance')
    .replace(/\bhigh\s+pressure\b/gi, 'haute pression')
    .replace(/\bhigh\s+flow\b/gi, 'haut débit')
    .replace(/\bhigh\s+efficiency\b/gi, 'haut rendement')
    .replace(/\blow\s+noise\b/gi, 'faible bruit')
    .replace(/\bsilent\b/gi, 'insonorisé')
    .replace(/\bportable\b/gi, 'portable')
    .replace(/\bindustrial\b/gi, 'industriel')
    .replace(/\bdigital\b/gi, 'numérique')
    .replace(/\bautomatic\b/gi, 'automatique')
    .replace(/\bhydraulic\b/gi, 'hydraulique')
    .replace(/\bpneumatic\b/gi, 'pneumatique')
    .replace(/\bsubmersible\b/gi, 'submersible')
    .replace(/\bcentrifugal\b/gi, 'centrifuge')
    .replace(/\belectric\b/gi, 'électrique')
    .replace(/\bwaterproof\b/gi, 'étanche')
    .replace(/\bdustproof\b/gi, 'anti-poussière')
    .replace(/\brechargeable\b/gi, 'rechargeable')
    .replace(/\bwith\b/gi, 'avec')
    .replace(/\band\b/gi, 'et')
    .replace(/\bfor\s+construction\b/gi, 'pour BTP')
    .replace(/\bfor\s+mining\b/gi, 'pour mines')
    .replace(/\bfor\s+agriculture\b/gi, 'pour agriculture')
    .replace(/\bfor\s+home\s+use\b/gi, 'pour secours & tertiaire')
    .replace(/\bfor\b/gi, 'pour')
    // Normalisation des unités
    .replace(/(\d+(?:[.,]\d+)?)\s*kw\b/gi, '$1 kW')
    .replace(/(\d+(?:[.,]\d+)?)\s*kva\b/gi, '$1 kVA')
    .replace(/(\d+(?:[.,]\d+)?)\s*hp\b/gi, '$1 CV')
    .replace(/(\d+)\s*v\b/gi, '$1V')
    .replace(/(\d+)\s*hz\b/gi, '$1Hz')
    .replace(/(\d+)\s*rpm\b/gi, '$1 tr/min');

  // Si un adjectif "industriel" ou "portable" s'est retrouvé tout au début devant un nom français, le replacer élégamment
  reformulated = reformulated
    .replace(/^industriel\s+(Pompe|Groupe|Moteur|Compresseur|Poste|Perforateur|Disjoncteur|Variateur|Multimètre|Palan|Concasseur)/i, '$1 industriel')
    .replace(/^portable\s+(Pompe|Groupe|Moteur|Compresseur|Poste|Perforateur|Multimètre)/i, '$1 portable')
    .replace(/^numérique\s+(Multimètre|Pince|Transmetteur|Débitmètre|Capteur|Caméra)/i, '$1 numérique')
    .replace(/^électrique\s+(Pompe|Moteur|Palan|Perceuse|Meuleuse|Treuil)/i, '$1 électrique')
    .replace(/^hydraulique\s+(Pompe|Cric|Presse|Vérin|Moteur)/i, '$1 hydraulique')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s\-|,;]+|[\s\-|,;]+$/g, '')
    .trim();

  if (brand && cleanBrand(brand, reformulated) !== 'Constructeur Certifié') {
    const cleanB = cleanBrand(brand, reformulated);
    if (!reformulated.toLowerCase().includes(cleanB.toLowerCase())) {
      reformulated = `${reformulated} — ${cleanB}`;
    }
  }

  return reformulated.charAt(0).toUpperCase() + reformulated.slice(1);
}

/**
 * Traduit, corrige et reformule intelligemment la description technique d'un produit en français professionnel.
 */
export function smartTranslateProductDescriptionToFrench(
  rawDescription?: string,
  productName?: string,
  specs?: Record<string, any>
): string {
  const cleanTitle = smartTranslateProductTitleToFrench(productName || 'Équipement industriel');
  const translatedSpecs = translateSpecsRecordToFrench(specs || {});
  const specEntries = Object.entries(translatedSpecs).slice(0, 6);

  if (!rawDescription || typeof rawDescription !== 'string' || rawDescription.trim().length < 15) {
    const specsSummary = specEntries.length > 0
      ? ` Caractéristiques principales : ${specEntries.map(([k, v]) => `${k} : ${v}`).join(' • ')}.`
      : '';
    return `${cleanTitle} sélectionné pour les applications professionnelles, industrielles et MRO en Afrique de l'Ouest.${specsSummary} Matériel contrôlé avant expédition avec traçabilité complète et conformité aux normes internationales.`;
  }

  let d = rawDescription.trim();

  // Supprimer les phrases de spam fournisseur ("Welcome to contact us", "Best price", etc.)
  d = d
    .replace(/welcome\s+to\s+(?:contact|inquire|visit)\s+us[^.!?\n]*[.!?]?/gi, '')
    .replace(/feel\s+free\s+to\s+contact\s+us[^.!?\n]*[.!?]?/gi, '')
    .replace(/we\s+are\s+a\s+professional\s+manufacturer[^.!?\n]*[.!?]?/gi, '')
    .replace(/buy\s+.*?\s+on\s+alibaba\.com[^.!?\n]*[.!?]?/gi, '')
    .trim();

  // Traduction et reformulation intelligente des tournures anglaises fréquentes dans les descriptions techniques
  d = d
    .replace(/\bthis\s+(?:product|machine|equipment|unit|model|pump|generator)\s+is\s+widely\s+used\s+in\b/gi, 'Cet équipement est conçu pour une utilisation intensive dans')
    .replace(/\bwidely\s+used\s+in\b/gi, 'Largement utilisé dans les secteurs de')
    .replace(/\bit\s+is\s+suitable\s+for\b/gi, 'Il est parfaitement adapté pour')
    .replace(/\bsuitable\s+for\b/gi, 'Adapté pour')
    .replace(/\bit\s+features\b/gi, 'Il se distingue par')
    .replace(/\bmain\s+features\s*:?/gi, 'Points forts techniques :')
    .replace(/\bproduct\s+description\s*:?/gi, 'Présentation technique :')
    .replace(/\btechnical\s+parameters?\s*:?/gi, 'Paramètres techniques :')
    .replace(/\bspecifications?\s*:?/gi, 'Spécifications :')
    .replace(/\bhigh\s+efficiency\s+and\s+energy\s+saving\b/gi, 'un haut rendement énergétique et une consommation optimisée')
    .replace(/\blow\s+noise\s+and\s+low\s+vibration\b/gi, 'un faible niveau sonore et des vibrations réduites')
    .replace(/\beasy\s+installation\s+and\s+maintenance\b/gi, 'une installation rapide et une maintenance simplifiée')
    .replace(/\beasy\s+to\s+maintain\b/gi, 'une maintenance aisée')
    .replace(/\beasy\s+to\s+operate\b/gi, 'une prise en main intuitive')
    .replace(/\blong\s+service\s+life\b/gi, 'une excellente longévité en service continu')
    .replace(/\bcompact\s+structure\b/gi, 'une architecture compacte et robuste')
    .replace(/\bstainless\s+steel\b/gi, 'acier inoxydable')
    .replace(/\bcast\s+iron\b/gi, 'fonte haute résistance')
    .replace(/\bheavy\s+duty\b/gi, 'usage intensif industriel')
    .replace(/\bhigh\s+quality\b/gi, 'qualité industrielle certifiée')
    .replace(/\bthree\s+phase\b/gi, 'triphasé')
    .replace(/\bsingle\s+phase\b/gi, 'monophasé')
    .replace(/\b1\s*year\s+warranty\b/gi, "garantie constructeur d'un an")
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Si le texte contient encore beaucoup de mots anglais bruts non structurés, reformuler proprement
  const remainingEnglishCount = (d.match(/\b(the|and|with|for|from|this|that|which|have|has|are|can|will|power|supply|factory|price|delivery|packing)\b/gi) || []).length;
  if (remainingEnglishCount >= 3) {
    const specsSummary = specEntries.length > 0
      ? ` Spécifications clés : ${specEntries.map(([k, v]) => `${k} (${v})`).join(', ')}.`
      : '';
    return `${cleanTitle} destiné aux opérations industrielles, chantiers BTP, mines et maintenance MRO.${specsSummary} Conception robuste offrant une fiabilité optimale en environnement exigeant, avec contrôle qualité avant expédition.`;
  }

  return d.charAt(0).toUpperCase() + d.slice(1);
}

// Calcule le prix de vente (FCFA) et le coût de revient (XOF) d'un variant à partir de son prix d'achat fournisseur
export function computeSingleVariantPricing(
  supplierPrice: number | undefined,
  context?: VariantPricingContext
): { price?: number; costPrice?: number } {
  if (supplierPrice === undefined || supplierPrice === null || isNaN(Number(supplierPrice)) || Number(supplierPrice) <= 0) {
    return { price: undefined, costPrice: undefined };
  }
  const settings = siteSettingsService.getSettings();
  const rates = settings?.exchangeRates || EXCHANGE_RATES;
  const numSupplierPrice = Number(supplierPrice);
  const currency = context?.supplierCurrency || 'USD';
  const rate = (rates as any)[currency] || EXCHANGE_RATES[currency] || 1;
  const usdRate = rates.USD || EXCHANGE_RATES['USD'] || 610;
  const supplierPriceXOF = numSupplierPrice * rate;
  const warehouseDeliveryXOF = (context?.warehouseDeliveryFeeUSD ?? 20) * usdRate;
  const defaultMargin = (settings?.defaultMarginPercentage ?? 35) / 100;
  const margin = context?.marginRate ?? defaultMargin;
  const priceEquipmentHT = Math.round((supplierPriceXOF + warehouseDeliveryXOF) / (1 - margin));
  const configuredVat = (settings?.vatRate ?? 18) / 100;
  const vatRate = (context?.applyVat ?? true) ? configuredVat : 0;
  const vatAmount = Math.round(priceEquipmentHT * vatRate);
  const priceEquipmentTTC = priceEquipmentHT + vatAmount;
  const totalCostPrice = Math.round(supplierPriceXOF + warehouseDeliveryXOF);

  return {
    price: priceEquipmentTTC,
    costPrice: totalCostPrice
  };
}

export interface ExtendedProduct extends Product {
  costPrice?: number; // Prix de revient en XOF
  supplierPrice?: number; // Prix fournisseur dans la devise d'origine
  supplierCurrency?: 'USD' | 'EUR' | 'CNY' | 'XOF';
  supplierId?: string; // Liaison Fournisseur
  supplierName?: string;
  supplierUrl?: string;
  supplierLink?: string;
  supplierProductUrl?: string;
  agentWarehouseId?: string; // Entrepôt de transit le plus proche assigné automatiquement ou manuellement
  agentWarehouseName?: string;
  sourcePlatform?: 'Alibaba' | 'AliExpress' | '1688' | 'Made-in-China' | 'Europe' | 'USA' | 'Manuel';
  shippingMethod?: 'air' | 'sea' | 'none' | 'neutral';
  defaultShippingMethod?: 'neutral' | 'sea' | 'air';
  customSeaFreightCost?: number;
  customAirFreightCost?: number;
  catalogPdfUrl?: string;
  pdfUrls?: PdfDocumentItem[];
  shippingCost?: number;
  marginRate?: number; // ex: 0.30 (30%)
  vatRate?: number; // 0.18 (18%)
  applyVat?: boolean; // Choix d'appliquer ou ignorer la TVA
  warehouseDeliveryFeeUSD?: number; // Transport fournisseur vers entrepôt export
  isOnline?: boolean; // Actif / En ligne
  inStock?: boolean; // Disponible immédiatement ou sur commande
  availabilityMode?: 'stock' | 'sourcing'; // Mode explicite : 'stock' (dispo immédiate Dakar) ou 'sourcing' (à sourcer)
  description: string; // Description technique traduite et reformulée en français
  dimensions?: string;
  hsCode?: string;
  stockQty?: number;
  stockQuantity?: number;
  stockStatus?: string;
  minStockThreshold?: number;
  shelfLocation?: string;
  sku?: string;
  image?: string; // Image principale
  imageUrl?: string;
  images?: string[]; // Galerie de plusieurs photos réelles du produit
  showDeposit?: boolean; // Activer l'affichage d'acompte réglable
  depositPercentage?: number; // Ex: 30% d'acompte
  options?: (string | ProductVariantItem)[]; // Options / déclinaisons réelles du produit avec prix & poids individuels
  variants?: (string | ProductVariantItem)[]; // Synonyme pour options
  discountPercent?: number; // Remise réelle configurable (%) par produit (ex: 5 pour -5%)
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Détermine de manière unifiée dans tout le système si un produit est un "Article à sourcer" (Sur commande internationale)
 * ou un article "Disponible immédiatement" (En Stock local à Dakar).
 */
export function isProductSourcing(product?: Partial<ExtendedProduct> | null): boolean {
  if (!product) return false;
  if (product.availabilityMode === 'sourcing') return true;
  if (product.availabilityMode === 'stock') return false;
  if (product.inStock === false) return true;
  // Un produit importé par lien externe ou issu d'une plateforme internationale est un article à sourcer par défaut
  if (product.supplierUrl && String(product.supplierUrl).trim().length > 0 && product.inStock !== true) {
    return true;
  }
  const platform = String(product.sourcePlatform || '').trim();
  if (platform && !['Manuel', 'Stock Local', 'Local', 'Sénégal', 'Dakar'].includes(platform)) {
    // Sauf si l'administrateur a explicitement forcé availabilityMode === 'stock'
    return true;
  }
  const origin = String(product.origin || '').trim().toLowerCase();
  if (origin && !['sénégal', 'senegal', 'dakar', 'stock local', 'local'].includes(origin) && product.shippingMethod && product.shippingMethod !== 'none') {
    return true;
  }
  return false;
}

// Fonction pour séparer les déclinaisons absurdement concaténées
export function sanitizeVariantOptionString(opt: string): string[] {
  if (!opt || typeof opt !== 'string') return [];
  const trimmed = opt.trim();
  if (!trimmed) return [];

  // Détecte les textes collés sans espaces (ex: "AC Single PhaseAC Three Phase12 kW15 kW20 kW...")
  const hasGluedTokens = 
    /(Single Phase|Three Phase|monophasé|triphasé)[A-Z0-9]/i.test(trimmed) ||
    /(\d+\s*kW[A-Z0-9])/i.test(trimmed) ||
    /([a-z])([A-Z0-9]{2,})/g.test(trimmed) && trimmed.length > 35;

  if (hasGluedTokens) {
    let separated = trimmed
      .replace(/([a-z])([A-Z])/g, '$1 | $2')
      .replace(/(Phase|kW|hp|course|monophasé|triphasé)(\d)/gi, '$1 | $2')
      .replace(/(\d+\s*kW)(\d+)/gi, '$1 | $2')
      .replace(/(Single Phase|Three Phase|monophasé|triphasé)(AC|DC|\d)/gi, '$1 | $2');

    const splitItems = separated
      .split(/[|,\n;]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.length < 60);

    if (splitItems.length > 1) {
      return Array.from(new Set(splitItems));
    }
  }

  return [trimmed];
}

// Set of cosmetic color words in English, French and standard naming to eliminate noise
export const COSMETIC_COLORS = new Set([
  'white', 'blanc', 'blanche', 'yellow', 'jaune', 'blue', 'bleu', 'bleue',
  'green', 'vert', 'verte', 'purple', 'violet', 'violette', 'grey', 'gray',
  'gris', 'grise', 'black', 'noir', 'noire', 'red', 'rouge', 'orange',
  'pink', 'rose', 'silver', 'argent', 'gold', 'or', 'doré', 'doree',
  'brown', 'marron', 'brun', 'brune', 'beige', 'cyan', 'magenta',
  'multicolor', 'multicolore', 'transparent', 'as picture', 'as photo',
  'custom color', 'customized', 'standard color', 'picture color',
  'white 1', 'white 2', 'white 3', 'yellow 1', 'yellow 2', 'yellow 3',
  'blue 1', 'blue 2', 'green 1', 'green 2', 'red 1', 'red 2', 'grey 1', 'grey 2', 'gray 1', 'gray 2'
]);

export function isCosmeticColor(str: string): boolean {
  if (!str) return false;
  const clean = str.toLowerCase().replace(/^(?:color|couleur|colore)\s*[:=]\s*/i, '').trim();
  if (COSMETIC_COLORS.has(clean)) return true;
  const withoutTrailingNumbers = clean.replace(/\s*\d+$/, '').trim();
  if (COSMETIC_COLORS.has(withoutTrailingNumbers)) return true;
  return false;
}

export function cleanAndFilterVariantName(rawName: string): string | null {
  if (!rawName || typeof rawName !== 'string') return null;
  let s = rawName.trim();
  if (!s || s.length > 90) return null;

  // 1. Discard if it is a pure cosmetic color
  if (isCosmeticColor(s)) {
    return null;
  }

  // 2. Strip "Color :" or "Couleur :" prefix if the rest is a technical specification
  s = s.replace(/^(?:color|couleur|colore)\s*[:=]\s*/i, '').trim();

  // 3. Strip prefixes like "Rated Power :", "Puissance :", "Output Type :", "Type de sortie :"
  s = s.replace(/^(?:rated\s*power|nominal\s*power|puissance\s*nominale|puissance)\s*[:=]\s*/i, '').trim();
  s = s.replace(/^(?:output\s*type|type\s*de\s*sortie|phase)\s*[:=]\s*/i, '').trim();

  // 4. Check again after stripping prefixes if what remains is purely a color
  if (isCosmeticColor(s)) {
    return null;
  }

  // 5. Translate and standardize common technical terms
  s = s
    .replace(/\bac\s+single\s+phase\b/gi, 'AC Monophasé')
    .replace(/\bac\s+three\s+phase\b/gi, 'AC Triphasé')
    .replace(/\bsingle\s+phase\b/gi, 'Monophasé')
    .replace(/\bthree\s+phase\b/gi, 'Triphasé')
    .replace(/\b1\s*phase\b/gi, 'Monophasé')
    .replace(/\b3\s*phase\b/gi, 'Triphasé')
    .replace(/\bkw\b/gi, 'kW')
    .replace(/\bkva\b/gi, 'kVA');

  return s.trim();
}

// Normalisateur universel de variantes pour garantir la compatibilité et les prix/poids/images/caractéristiques par variante
export function normalizeVariants(
  rawVariantsOrOptions: any,
  pricingContext?: VariantPricingContext
): ProductVariantItem[] {
  if (!rawVariantsOrOptions) return [];
  const list = Array.isArray(rawVariantsOrOptions) ? rawVariantsOrOptions : [rawVariantsOrOptions];
  const results: ProductVariantItem[] = [];

  list.forEach((item, idx) => {
    if (!item) return;
    if (typeof item === 'string') {
      // Check if string contains serialized price or weight (e.g. "20 kW | Prix: 750000 | Poids: 85 kg")
      const pipeParts = item.split(/\s*\|\s*/);
      const baseRaw = pipeParts[0] || '';
      let optPrice: number | undefined = undefined;
      let optWeight: string | undefined = undefined;

      for (let pIdx = 1; pIdx < pipeParts.length; pIdx++) {
        const p = pipeParts[pIdx];
        const priceMatch = p.match(/^(?:prix|price)\s*[:=]?\s*([0-9.]+)/i);
        if (priceMatch) {
          optPrice = parseFloat(priceMatch[1]);
        }
        const weightMatch = p.match(/^(?:poids|weight)\s*[:=]?\s*(.+)/i);
        if (weightMatch) {
          optWeight = weightMatch[1].trim();
        }
      }

      const splitStrings = sanitizeVariantOptionString(baseRaw);
      splitStrings.forEach((s, subIdx) => {
        const cleaned = cleanAndFilterVariantName(s);
        if (cleaned) {
          results.push({
            id: `var-${idx}-${subIdx}`,
            name: cleaned,
            price: optPrice,
            weight: optWeight
          });
        }
      });
    } else if (typeof item === 'object') {
      const rawName = String(item.name || item.nom || item.label || item.title || '').trim();
      const hasCustomFields =
        item.supplierPrice !== undefined ||
        item.price !== undefined ||
        Boolean(item.image) ||
        Boolean(item.characteristics) ||
        (item.specs && Object.keys(item.specs).length > 0) ||
        Boolean(item.weight);

      const rawSupplierPrice =
        item.supplierPrice !== undefined && item.supplierPrice !== null && item.supplierPrice !== ''
          ? Number(item.supplierPrice)
          : undefined;
      const rawPrice =
        item.price !== undefined && item.price !== null && item.price !== ''
          ? Number(item.price)
          : undefined;
      const rawCostPrice =
        item.costPrice !== undefined && item.costPrice !== null && item.costPrice !== ''
          ? Number(item.costPrice)
          : undefined;

      // Si un prix d'achat (supplierPrice) est renseigné sur le variant, le système calcule automatiquement son prix de vente (marge, devise, entrepôt, TVA) et son coût de revient
      let computedPrice = rawPrice;
      let computedCostPrice = rawCostPrice;
      if (rawSupplierPrice !== undefined && !isNaN(rawSupplierPrice) && rawSupplierPrice > 0) {
        const calc = computeSingleVariantPricing(rawSupplierPrice, pricingContext);
        if (calc.price !== undefined) computedPrice = calc.price;
        if (calc.costPrice !== undefined) computedCostPrice = calc.costPrice;
      } else if (computedPrice !== undefined && computedPrice > 0 && computedCostPrice === undefined) {
        const vatDiv = (pricingContext?.applyVat ?? true) ? 1.18 : 1;
        const margin = pricingContext?.marginRate ?? 0.35;
        computedCostPrice = Math.round((computedPrice / vatDiv) * (1 - margin));
      }

      const parsedSpecs =
        item.specs && typeof item.specs === 'object' && Object.keys(item.specs).length > 0
          ? item.specs
          : undefined;

      const splitNames = hasCustomFields ? [rawName] : sanitizeVariantOptionString(rawName);
      if (splitNames.length > 1) {
        splitNames.forEach((s, subIdx) => {
          const cleaned = cleanAndFilterVariantName(s) || (hasCustomFields ? s.trim() : null);
          if (cleaned) {
            results.push({
              id: item.id || `var-${idx}-${subIdx}`,
              name: cleaned,
              price: computedPrice,
              supplierPrice: rawSupplierPrice,
              costPrice: computedCostPrice,
              weight: item.weight ? String(item.weight).trim() : undefined,
              image: item.image ? String(item.image).trim() : undefined,
              characteristics: item.characteristics ? String(item.characteristics) : undefined,
              specs: parsedSpecs,
              inStock: item.inStock ?? true,
              sku: item.sku || undefined
            });
          }
        });
      } else {
        const cleaned = cleanAndFilterVariantName(rawName) || (hasCustomFields ? rawName : null);
        if (cleaned) {
          results.push({
            id: item.id || `var-${idx}`,
            name: cleaned,
            price: computedPrice,
            supplierPrice: rawSupplierPrice,
            costPrice: computedCostPrice,
            weight: item.weight ? String(item.weight).trim() : undefined,
            image: item.image ? String(item.image).trim() : undefined,
            characteristics: item.characteristics ? String(item.characteristics) : undefined,
            specs: parsedSpecs,
            inStock: item.inStock ?? true,
            sku: item.sku || undefined
          });
        }
      }
    }
  });

  // Dédupliquer par nom d'option
  const seen = new Set<string>();
  return results.filter(v => {
    const key = v.name.toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Retourne la variante la moins chère parmi celles qui ont un prix > 0
export function getCheapestVariant(
  variants?: (string | ProductVariantItem)[],
  pricingContext?: VariantPricingContext
): ProductVariantItem | null {
  if (!variants || !Array.isArray(variants) || variants.length === 0) return null;
  const normalized = normalizeVariants(variants, pricingContext);
  const priced = normalized.filter(v => typeof v.price === 'number' && !isNaN(v.price) && v.price > 0);
  if (priced.length === 0) return null;
  return priced.reduce((min, cur) => ((cur.price as number) < (min.price as number) ? cur : min), priced[0]);
}

// Retourne le prix de base effectif à afficher sur le site (prend le prix le moins cher des variants si le prix principal est à 0)
export function getEffectiveProductBasePrice(product?: ExtendedProduct | Product | null): number {
  if (!product) return 0;
  const ext = product as ExtendedProduct;
  const pricingContext: VariantPricingContext = {
    supplierCurrency: ext.supplierCurrency || 'USD',
    marginRate: ext.marginRate ?? 0.35,
    warehouseDeliveryFeeUSD: ext.warehouseDeliveryFeeUSD ?? 20,
    applyVat: ext.applyVat ?? true
  };
  const variants = normalizeVariants(ext.options || ext.variants || [], pricingContext);
  const cheapest = getCheapestVariant(variants);

  if (cheapest && cheapest.price && cheapest.price > 0) {
    if (!ext.price || ext.price <= 0 || (ext.supplierPrice !== undefined && Number(ext.supplierPrice) <= 0)) {
      return cheapest.price;
    }
  }
  if (ext.price && ext.price > 0) {
    return ext.price;
  }
  return cheapest?.price || 0;
}

export interface AgentWarehouse {
  id: string;
  name: string; // Ex: "Entrepôt Transit Guangzhou" ou "Entrepôt Standard Europe"
  identificationMode: 'agent_code' | 'standard_address'; // 'agent_code' (avec code agent) ou 'standard_address' (méthode standard : Nom, Prénom, Adresse, Tél sans code agent)
  hasAgentCode?: boolean;
  agentCode?: string; // Ex: "DKR628" (optionnel si méthode standard)
  airAgentCode?: string; // Ex: "DKR628+AIR"
  seaAgentCode?: string; // Ex: "DKR628+SEA"
  firstName?: string;
  lastName?: string;
  companyName?: string;
  phone?: string;
  email?: string;
  notes?: string;
  recipientFirstName?: string; // Prénom (méthode standard ou destinataire)
  recipientLastName?: string; // Nom (méthode standard ou destinataire)
  recipientCompany?: string; // Société ou mention complémentaire
  contactPhone?: string; // Téléphone / WhatsApp de réception
  contactEmail?: string;
  address: string; // Adresse complète de livraison entrepôt
  city?: string;
  country?: string;
  postalCode?: string;
  instructions?: string; // Instructions de réception ou horaires
  isDefault?: boolean; // Agent / Entrepôt par défaut du système
  // Services de fret proposés et tarifs propres à cet entrepôt
  offersAirFreight?: boolean; // Propose le Fret Aérien (défaut: true)
  offersSeaFreight?: boolean; // Propose le Fret Maritime (défaut: true)
  airFreightPerKgXOF?: number; // Tarif Fret Aérien en FCFA / kg propre à cet entrepôt
  airFreightMinXOF?: number; // Minimum forfaitaire Aérien en FCFA
  airFreightDurationDays?: string; // Délai Fret Aérien (ex: "7 à 12 jours")
  seaFreightPerKgXOF?: number; // Tarif Fret Maritime en FCFA / kg propre à cet entrepôt
  seaFreightPerCbmXOF?: number; // Tarif Fret Maritime au m³ CBM en FCFA
  seaFreightMinXOF?: number; // Minimum forfaitaire Maritime en FCFA
  seaFreightDurationDays?: string; // Délai Fret Maritime (ex: "35 à 50 jours")
  domesticDeliveryFeeUSD?: number; // Frais moyens de livraison locale fournisseur -> entrepôt ($ USD)
  supportedDeliveryCountries?: string[]; // Pays de destination livrés par cet entrepôt (ex: ["Sénégal", "Mali", "Côte d'Ivoire"])
  createdAt?: string;
  updatedAt?: string;
}

export interface Supplier {
  id: string;
  name: string;
  platform: 'Alibaba' | 'AliExpress' | '1688' | 'Made-in-China' | 'Europe' | 'USA' | 'Local' | string;
  country: string;
  currency: 'USD' | 'EUR' | 'CNY' | 'XOF';
  paymentTerms: string; // Ex: Prépaiement 100%, 30% acompte, Net 30
  leadTimeAvg: string;
  avgLeadTimeDays?: number;
  shippingMinMaxUSD: string; // Ex: "$5 - $25/kg"
  shippingPriceRange?: string;
  warehouseDeliveryMinUSD?: number; // Fourchette min transport vers entrepôt
  warehouseDeliveryMaxUSD?: number; // Fourchette max transport vers entrepôt
  warehouseDeliveryFeeUSD?: number; // Tarif moyen retenu pour les calculs de prix
  contactEmail?: string;
  contactPhone?: string; // WhatsApp fournisseur
  websiteUrl?: string;
  rating?: number;
  circuit: 'automatisé' | 'manuel';
  isAutomatedCircuit?: boolean;
  currentBalance?: number; // Solde compte courant
  communicationChannel?: 'whatsapp' | 'email' | 'alibaba_chat' | 'direct_chat'; // Canal de communication par défaut
  defaultMessageTemplate?: string; // Message prédéfini avec instructions
  agentWarehouseId?: string; // ID de l'entrepôt d'agent assigné à ce fournisseur (vide ou 'default' = utilise l'agent par défaut)
  notes?: string;
}

export interface OrderItem {
  productId: number;
  name: string;
  sku?: string;
  variantId?: string;
  variantName?: string;
  variantDescription?: string;
  description?: string;
  img?: string;
  image?: string;
  imageUrl?: string;
  brand: string;
  price: number;
  unitPriceHT?: number;
  priceHT?: number;
  totalHT?: number;
  vatRate?: number;
  stockStatus?: string;
  selectedShipping?: string;
  costPrice?: number;
  supplierPrice?: number;
  supplierCurrency?: 'USD' | 'EUR' | 'CNY' | 'XOF';
  supplierId?: string;
  supplierName?: string;
  supplierProductUrl?: string;
  quantity: number;
  origin?: string;
  shippingMethod?: 'air' | 'sea' | 'none' | 'neutral';
  freightCost?: number;
}

export interface OrderNotificationRecord {
  date: string;
  recipient: 'client' | 'admin' | 'fournisseur';
  channel: 'whatsapp' | 'email';
  title: string;
  message: string;
}

export interface SupplierPortalTokenItem {
  productId?: number;
  name: string;
  brand: string;
  image?: string;
  variantId?: string;
  variantName?: string;
  variantDescription?: string;
  description?: string;
  quantity: number;
  supplierPrice: number;
  currency: string;
  total: number;
  shippingMethod?: 'air' | 'sea' | 'none';
  freightCode?: 'AIR' | 'SEA';
  orderNumber?: string;
  orderRefs?: string[];
  clientWarehouseIds?: string[];
  parcelLabel?: string;
  parcelLabels?: string[];
  productUrl?: string;
  supplierProductUrl?: string;
}

export interface SupplierPortalResponse {
  paymentLink: string;
  platformLabel?: string;
  confirmedAmount?: string;
  estimatedLeadTime?: string;
  trackingNumber?: string;
  supplierNotes?: string;
  responderName?: string;
  submittedAt: string;
}

export interface SupplierPortalToken {
  token: string;
  poRef: string;
  poReference?: string;
  supplierId: string;
  supplierName: string;
  supplierPlatform?: string;
  supplierCountry?: string;
  currency: string;
  agentCode: string;
  agentWarehouse?: AgentWarehouse;
  agentWarehouseId?: string;
  agentWarehouseName?: string;
  identificationMode?: 'agent_code' | 'standard_address';
  hasAgentCode?: boolean;
  recipientFirstName?: string;
  recipientLastName?: string;
  warehousePhone?: string;
  warehouseEmail?: string;
  warehouseAddress?: string;
  warehouseCity?: string;
  warehouseCountry?: string;
  warehousePostalCode?: string;
  warehouseInstructions?: string;
  warehouseFeeUSD?: number;
  paymentTerms?: string;
  orderIds: string[];
  orderNumbers: string[];
  items: SupplierPortalTokenItem[];
  totalAmount: number;
  status: 'active' | 'used' | 'revoked';
  createdAt: string;
  usedAt?: string;
  response?: SupplierPortalResponse;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId?: string;
  customerName: string;
  customerCompany: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerCity: string;
  customerCountry: string;
  ninea?: string;
  items: OrderItem[];
  subtotalHT: number;
  freightTotalHT?: number;
  vatAmount: number; // 18% ou 0 si exonéré
  shippingTotal?: number;
  shippingCost?: number;
  totalTTC: number;
  totalCostPrice?: number;
  estimatedMargin?: number;
  discountAmount?: number;
  discountPercent?: number;
  amountPaid?: number;
  amountDue?: number;
  paymentChoice?: string;
  shippingMethod?: string;
  docType?: string;
  status: 'Reçue' | 'En attente' | 'En attente paiement' | 'Confirmée' | 'En préparation' | 'Payée' | 'Commandée fournisseur' | 'En transit' | 'Dédouanement' | 'Reçue en entrepôt' | 'Livrée' | 'Annulée' | string;
  paymentMethod: 'Wave' | 'Orange Money' | 'PayDunya' | 'Virement bancaire' | 'Virement Proforma' | 'Carte Bancaire' | 'Net 30 Pro' | 'Net 30' | 'Acompte 50%' | string;
  paymentStatus: 'Non payé' | 'Acompte versé' | 'Acompte Payé' | 'Payé' | 'Payé intégralement' | string;
  paydunyaToken?: string;
  paydunyaInvoiceUrl?: string;
  paydunyaReceiptUrl?: string;
  isQuote: boolean; // Si c'est un devis proforma
  quoteExpiresAt?: string;
  ethicalContractAccepted: boolean; // Contrat de transparence et mandat de sourcing
  sourcePlatform?: string;
  trackingNumber?: string;
  supplierId?: string;
  supplierName?: string;
  supplierPoStatus?: 'Non transmis' | 'PO Envoyé' | 'Lien paiement reçu' | 'Payé fournisseur';
  supplierPaymentLink?: string;
  supplierPaymentAmount?: string;
  supplierPortalToken?: string;
  notifications?: OrderNotificationRecord[];
  notes?: string;
  agentCode?: string; // Code agent assigné sur chaque commande (ex: AGENT-DAKAR-01)
  agentWarehouseId?: string; // Entrepôt d'agent utilisé pour cette commande
  clientWarehouseId?: string; // Identifiant client anonyme pour réception entrepôt (ex: CLI-4829)
  createdAt: string;
  updatedAt: string;
}

/**
 * Génère un numéro d'identification client unique et anonyme (ex: CLI-4829)
 * associé au client pour identifier le propriétaire du colis à l'arrivée à l'entrepôt
 * sans jamais communiquer les données personnelles du client au fournisseur.
 */
export function getClientWarehouseCode(order: {
  clientWarehouseId?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerName?: string;
  id?: string;
}): string {
  if (order.clientWarehouseId && order.clientWarehouseId.trim()) {
    return order.clientWarehouseId.trim().toUpperCase();
  }
  const rawKey = (
    (order.customerPhone || '').replace(/\D+/g, '').slice(-8) ||
    (order.customerEmail || '').trim().toLowerCase() ||
    (order.customerName || '').trim().toLowerCase() ||
    (order.id || '0001')
  );
  let hash = 0;
  for (let i = 0; i < rawKey.length; i++) {
    hash = (hash * 31 + rawKey.charCodeAt(i)) % 9000;
  }
  const codeNum = 1000 + Math.abs(hash);
  return `CLI-${codeNum}`;
}

/**
 * Retourne le code de fret normalisé ('AIR' ou 'SEA') pour un article ou une commande
 */
export function getItemFreightCode(shippingMethod?: string, agentCode?: string): 'AIR' | 'SEA' {
  if (shippingMethod === 'sea') return 'SEA';
  if (shippingMethod === 'air') return 'AIR';
  if (agentCode && agentCode.toUpperCase().includes('SEA')) return 'SEA';
  return 'AIR';
}

/**
 * Génère l'étiquette colis standardisée que le fournisseur doit simplement coller sur le carton :
 * [N° Commande | ID Client Entrepôt | Code Fret AIR/SEA]
 * Supporte un objet Order ou directement (orderNumber, clientWarehouseId, freightCode) sans jamais produire [object Object] ou undefined.
 */
export function formatSupplierParcelLabel(
  arg1?: any,
  arg2?: any,
  arg3?: any,
  warehouse?: AgentWarehouse | null
): string {
  const sanitizeStr = (val: any, fallback: string): string => {
    if (!val || typeof val === 'object') return fallback;
    const s = String(val).trim();
    if (!s || s === 'undefined' || s === 'null' || s.includes('[object')) return fallback;
    return s;
  };

  if (typeof arg1 === 'object' && arg1 !== null) {
    const ordNum = sanitizeStr(arg1.orderNumber || arg1.id, 'CMD-ZE');
    const cliId = getClientWarehouseCode(arg1);
    const fCode: 'AIR' | 'SEA' =
      String(arg2 || arg3 || '').toUpperCase().includes('SEA') ? 'SEA' : 'AIR';
    return `${ordNum} | ${cliId} | ${fCode}`;
  }

  const s1 = sanitizeStr(arg1, '');
  const s2 = sanitizeStr(arg2, '');
  const s3 = sanitizeStr(arg3, '');

  const isFreightStr = (v: string) => ['SEA', 'AIR'].includes(v.toUpperCase());
  const fCode: 'AIR' | 'SEA' =
    [s1, s2, s3].some(v => v.toUpperCase().includes('SEA')) ? 'SEA' : 'AIR';

  // Detect order/PO reference vs agent code
  const candidates = [s1, s2, s3].filter(v => v && !isFreightStr(v) && !v.toUpperCase().startsWith('CLI-'));
  const orderRef =
    candidates.find(v => /^(CMD|PO|ORD|DEVIS)/i.test(v)) ||
    (isFreightStr(s2) ? (s3 || s1) : (s1 || s3)) ||
    'CMD-ZE';

  if (warehouse) {
    if (warehouse.identificationMode === 'standard_address' || !warehouse.agentCode) {
      const fName = warehouse.firstName || warehouse.recipientFirstName || '';
      const lName = warehouse.lastName || warehouse.recipientLastName || '';
      const fullName = [fName, lName].filter(Boolean).join(' ').trim() || warehouse.companyName || warehouse.recipientCompany || warehouse.name || 'DESTINATAIRE';
      return `${fullName} • ${fCode}`;
    }
    const cleanWhCode = sanitizeStr(warehouse.agentCode, 'DKR628').replace(/\+(SEA|AIR)$/i, '');
    return `${cleanWhCode}+${fCode}`;
  }

  const agentPart =
    candidates.find(v => v !== orderRef && !/^(CMD|PO|ORD|DEVIS)/i.test(v)) ||
    'DKR628';
  const cleanCode = agentPart.replace(/\+(SEA|AIR)$/i, '');
  return `${cleanCode}+${fCode}`;
}

export function formatWarehouseConsigneeLine(warehouse?: AgentWarehouse | null): string {
  if (!warehouse) return 'ZONE ÉQUIPEMENTS (Code Agent: DKR628)';
  const fName = warehouse.firstName || warehouse.recipientFirstName || '';
  const lName = warehouse.lastName || warehouse.recipientLastName || '';
  const fullName = [fName, lName].filter(Boolean).join(' ').trim();
  const comp = warehouse.companyName || warehouse.recipientCompany || '';
  if (warehouse.identificationMode === 'standard_address' || !warehouse.agentCode) {
    return [fullName, comp].filter(Boolean).join(' — ') || warehouse.name;
  }
  return `Code Agent: ${warehouse.agentCode}${fullName ? ` — ${fullName}` : comp ? ` — ${comp}` : ''}`;
}

export function formatWarehouseFullAddress(warehouse?: AgentWarehouse | null): string {
  if (!warehouse) return 'Guangzhou / Dakar Transit Hub';
  return [warehouse.address, warehouse.city, warehouse.postalCode, warehouse.country]
    .filter(Boolean)
    .join(', ');
}

/**
 * Nettoie toute étiquette colis qui contiendrait accidentellement "[object Object]" ou "undefined"
 */
export function sanitizeSupplierParcelLabel(
  rawLabel: string | undefined,
  fallbackOrderRef: string,
  fallbackClientId: string,
  freightCode: 'AIR' | 'SEA'
): string {
  if (
    !rawLabel ||
    !rawLabel.trim() ||
    rawLabel.includes('[object Object]') ||
    rawLabel.includes('undefined')
  ) {
    return `${fallbackOrderRef || 'CMD-ZE'} | ${fallbackClientId || 'CLI-ENTREPOT'} | ${freightCode}`;
  }
  return rawLabel.trim();
}

/**
 * Calcule le code agent effectif ou l'indicateur standard selon l'entrepôt d'agent choisi et le mode de fret
 */
export function getEffectiveAgentCodeForWarehouse(
  warehouse?: AgentWarehouse | null,
  freightCode: 'AIR' | 'SEA' | 'AIR/SEA' = 'AIR'
): string {
  if (!warehouse) {
    return freightCode === 'SEA'
      ? 'DKR628+SEA'
      : freightCode === 'AIR/SEA'
      ? 'DKR628+AIR/SEA'
      : 'DKR628+AIR';
  }
  if (warehouse.identificationMode === 'standard_address' || !warehouse.hasAgentCode || !warehouse.agentCode?.trim()) {
    const fullName = [warehouse.recipientFirstName, warehouse.recipientLastName].filter(Boolean).join(' ').trim();
    return fullName ? `STANDARD (${fullName})` : 'STANDARD (NOM & ADRESSE)';
  }
  const baseCode = warehouse.agentCode.trim();
  if (freightCode === 'SEA') {
    return warehouse.seaAgentCode?.trim() || (baseCode.toUpperCase().includes('SEA') ? baseCode : `${baseCode}+SEA`);
  }
  if (freightCode === 'AIR/SEA') {
    return `${baseCode}+AIR/SEA`;
  }
  return warehouse.airAgentCode?.trim() || (baseCode.toUpperCase().includes('AIR') ? baseCode : `${baseCode}+AIR`);
}

/**
 * Formate les coordonnées complètes de l'entrepôt d'agent (avec Code Agent OU en méthode standard Nom/Prénom/Adresse)
 */
export function formatWarehouseConsigneeDetails(
  warehouse?: AgentWarehouse | null,
  freightCode: 'AIR' | 'SEA' | 'AIR/SEA' = 'AIR',
  poRef?: string
) {
  if (!warehouse) {
    const code = freightCode === 'SEA' ? 'DKR628+SEA' : freightCode === 'AIR/SEA' ? 'DKR628+AIR/SEA' : 'DKR628+AIR';
    return {
      warehouseName: 'Entrepôt Transit Par Défaut (Dakar MRO)',
      hasAgentCode: true,
      identificationMode: 'agent_code' as const,
      agentCodeDisplay: code,
      recipientFullName: 'ZONE ÉQUIPEMENTS',
      phone: '+221 76 653 83 84',
      fullAddress: 'Transit Hub Export -> Port/Aéroport de Dakar, Sénégal',
      shippingMarkBoxText: `[CODE AGENT: ${code}] - ZONE EQUIPEMENTS${poRef ? ` (PO: ${poRef})` : ''}`,
      multilineBlockFr: `Entrepôt d'Agent : Entrepôt Transit Par Défaut\nCode Agent Obligatoire : ${code}\nDestinataire : ZONE ÉQUIPEMENTS\nTéléphone : +221 76 653 83 84\nMarquage Colis : [CODE AGENT: ${code}] - DAKAR MRO${poRef ? ` (PO: ${poRef})` : ''}`
    };
  }

  const hasCode = warehouse.identificationMode === 'agent_code' && Boolean(warehouse.hasAgentCode && warehouse.agentCode?.trim());
  const codeDisplay = hasCode ? getEffectiveAgentCodeForWarehouse(warehouse, freightCode) : '';
  const recipientFullName = [warehouse.recipientFirstName, warehouse.recipientLastName].filter(Boolean).join(' ').trim() || warehouse.recipientCompany || 'ZONE ÉQUIPEMENTS';
  const fullAddress = [
    warehouse.address,
    warehouse.postalCode,
    warehouse.city,
    warehouse.country
  ].filter(Boolean).join(', ').trim() || warehouse.country || 'International';
  const phone = warehouse.contactPhone || '+221 76 653 83 84';

  const shippingMarkBoxText = hasCode
    ? `[CODE AGENT: ${codeDisplay}] - ${recipientFullName} | Tél: ${phone} | Adresse: ${fullAddress}${poRef ? ` (PO: ${poRef})` : ''}`
    : `DESTINATAIRE: ${recipientFullName} | TÉL: ${phone} | ADRESSE: ${fullAddress}${poRef ? ` (PO: ${poRef})` : ''}`;

  const multilineBlockFr = hasCode
    ? `Entrepôt d'Agent : ${warehouse.name}\nCode Agent : ${codeDisplay}\nDestinataire (Nom & Prénom) : ${recipientFullName}\nTéléphone Réception : ${phone}\nAdresse Entrepôt : ${fullAddress}${warehouse.instructions ? `\nConsignes : ${warehouse.instructions}` : ''}\nMarquage Colis : [CODE AGENT: ${codeDisplay}] - ${recipientFullName}${poRef ? ` (PO: ${poRef})` : ''}`
    : `Entrepôt de Réception (Méthode Standard sans Code Agent) : ${warehouse.name}\nDestinataire (Nom & Prénom) : ${recipientFullName}\nTéléphone : ${phone}\nAdresse Complète de Livraison : ${fullAddress}${warehouse.instructions ? `\nConsignes : ${warehouse.instructions}` : ''}`;

  return {
    warehouseName: warehouse.name,
    hasAgentCode: hasCode,
    identificationMode: warehouse.identificationMode,
    agentCodeDisplay: codeDisplay,
    recipientFullName,
    phone,
    fullAddress,
    instructions: warehouse.instructions || '',
    shippingMarkBoxText,
    multilineBlockFr
  };
}

export interface AuditLog {
  id: string;
  timestamp: string;
  author: string;
  action: string;
  details: string;
  category: 'produit' | 'commande' | 'finance' | 'prix' | 'fournisseur';
}

const STORAGE_KEYS = {
  PRODUCTS: 'ze_custom_products_v4',
  ORDERS: 'ze_custom_orders_v4',
  SUPPLIERS: 'ze_custom_suppliers_v4',
  AGENT_WAREHOUSES: 'ze_agent_warehouses_v1',
  SUPPLIER_TOKENS: 'ze_supplier_portal_tokens_v1',
  AUDIT: 'ze_custom_audit_v4',
  CATEGORIES: 'ze_custom_categories_v4',
  SETTINGS: 'ze_system_settings_v4',
  DELETED_ENTITIES: 'ze_deleted_entities_v2',
  LEGACY_SUPPLIERS_PURGED: 'ze_legacy_suppliers_purged_v3'
};

interface DeletedEntitiesRegistry {
  products: string[];
  suppliers: string[];
  orders: string[];
  agentWarehouses?: string[];
}

// Devises vers XOF
export const EXCHANGE_RATES: Record<string, number> = {
  XOF: 1,
  USD: 610,
  EUR: 655.957,
  CNY: 85,
  GBP: 770
};

// Tarifs de fret moyens indicatifs vers Dakar (Sénégal)
export const FREIGHT_RATES = {
  AIR_PER_KG_XOF: 7000,
  SEA_PER_KG_XOF: 1800,
  SEA_PER_CBM_XOF: 250000,
  SEA_MIN_CHARGE_XOF: 8000,
  TRANSIT_INSURANCE_RATE: 0.05
};

// Aucun fournisseur fictif par défaut : seuls les fournisseurs réels ajoutés ou importés sont conservés
const DEFAULT_SUPPLIERS: Supplier[] = [];
const LEGACY_MOCK_SUPPLIER_IDS = ['sup-1', 'sup-2', 'sup-3', 'supp-1', 'supp-2', 'supp-3'];

// Helper to remove undefined fields, invalid map keys, and NaN/Infinity for Firestore setDoc compatibility
function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'number') {
    return (Number.isFinite(obj) ? obj : 0) as unknown as T;
  }
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.filter(v => v !== undefined).map(cleanUndefined) as unknown as T;
  }
  const cleaned: any = {};
  for (const key of Object.keys(obj)) {
    const trimmedKey = key.trim();
    if (!trimmedKey || /^__.*__$/.test(trimmedKey)) continue;
    const val = (obj as any)[key];
    if (val !== undefined) {
      cleaned[trimmedKey] = cleanUndefined(val);
    }
  }
  return cleaned;
}

// Helper to guarantee supplier sourcing platforms (Alibaba, AliExpress, etc.) NEVER appear as brands on badges
export function cleanBrand(rawBrand?: string, title?: string): string {
  const forbidden = [
    'ALIBABA', 'ALIEXPRESS', '1688', 'MADE-IN-CHINA', 'MADE IN CHINA', 'TAOBAO', 'AMAZON', 
    'GRAINGER', 'MCMASTER', 'MANUTAN', 'IMPORT DIRECT', 'MANUEL', 'FOURNISSEUR', 'SUPPLIER', 
    'GOLD SUPPLIER', 'VERIFIED', 'GUANGDONG', 'SHENZHEN', 'ZHEJIANG', 'YIWU', 'MANUFACTURER', 'FACTORY'
  ];
  const b = (rawBrand || '').trim();
  const upper = b.toUpperCase();
  if (!b || forbidden.some(f => upper.includes(f))) {
    const knownBrands = [
      'FLUKE', 'BOSCH', 'MAKITA', 'DEWALT', 'SCHNEIDER ELECTRIC', 'SCHNEIDER', 'LEGRAND', 'ABB', 
      '3M', 'FACOM', 'STANLEY', 'HILTI', 'KÄRCHER', 'KARCHER', 'LOCTITE', 'SIEMENS', 'FESTO', 
      'SMC', 'PARKER', 'GRUNDFOS', 'MILWAUKEE', 'SANDVIK', 'KENNAMETAL', 'MITUTOYO', 'NORTON',
      'WÜRTH', 'WURTH', 'FISCHER', 'CARRIER', 'DAIKIN', 'EATON', 'PHILIPS', 'OSRAM', 'MOBIL', 'SHELL', 'CASTROL'
    ];
    const titleUpper = ((title || '') + ' ' + b).toUpperCase();
    for (const kb of knownBrands) {
      if (titleUpper.includes(kb)) return kb;
    }
    return 'Constructeur Certifié';
  }
  return b;
}

// Zéro commande fictive et zéro entrepôt fictif - tout est 100% réel et persistant
const DEFAULT_ORDERS: Order[] = [];
const DEFAULT_AGENT_WAREHOUSES: AgentWarehouse[] = [];
const LEGACY_MOCK_WAREHOUSE_IDS = ['aw-default-1', 'aw-standard-2', 'aw-usa-3'];

function getSystemDefaultWarehouseFallback(): AgentWarehouse {
  const settings = siteSettingsService.getSettings();
  const sysEnabled = settings?.systemFreightEnabled !== false;
  const usdRate = settings?.exchangeRates?.USD || 610;
  return {
    id: 'aw-unconfigured',
    name: 'Paramètres Système par Défaut',
    identificationMode: 'standard_address',
    hasAgentCode: false,
    address: '',
    country: '',
    city: '',
    offersAirFreight: sysEnabled,
    offersSeaFreight: sysEnabled,
    airFreightPerKgXOF: settings?.airFreightPerKg ?? 7000,
    airFreightMinXOF: settings?.airFreightMin ?? (settings?.airFreightPerKg ?? 7000),
    airFreightDurationDays: settings?.airFreightDuration || settings?.airFreightDurationDays || '8 à 15 jours',
    seaFreightPerKgXOF: settings?.seaFreightPerKg ?? 1800,
    seaFreightPerCbmXOF: Math.round((settings?.seaFreightPerCbmUSD || 220) * usdRate),
    seaFreightMinXOF: settings?.seaFreightMin ?? 8000,
    seaFreightDurationDays: settings?.seaFreightDuration || settings?.seaFreightDurationDays || '20 à 40 jours',
    supportedDeliveryCountries:
      settings?.supportedDeliveryCountries && settings.supportedDeliveryCountries.length > 0
        ? [...settings.supportedDeliveryCountries]
        : [...DEFAULT_SUPPORTED_DELIVERY_COUNTRIES]
  };
}

class CatalogService {
  private products: ExtendedProduct[] = [];
  private orders: Order[] = [];
  private suppliers: Supplier[] = [];
  private agentWarehouses: AgentWarehouse[] = [];
  private supplierTokens: SupplierPortalToken[] = [];
  private auditLogs: AuditLog[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.init();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private getDeletedRegistry(): DeletedEntitiesRegistry {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DELETED_ENTITIES);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          products: Array.isArray(parsed.products) ? parsed.products.map(String) : [],
          suppliers: Array.from(new Set([...(Array.isArray(parsed.suppliers) ? parsed.suppliers.map(String) : []), ...LEGACY_MOCK_SUPPLIER_IDS])),
          orders: Array.isArray(parsed.orders) ? parsed.orders.map(String) : [],
          agentWarehouses: Array.isArray(parsed.agentWarehouses) ? parsed.agentWarehouses.map(String) : []
        };
      }
    } catch {
      // ignore
    }
    return {
      products: [],
      suppliers: [...LEGACY_MOCK_SUPPLIER_IDS],
      orders: [],
      agentWarehouses: []
    };
  }

  private saveDeletedRegistry(reg: DeletedEntitiesRegistry, syncRemote = true) {
    try {
      localStorage.setItem(STORAGE_KEYS.DELETED_ENTITIES, JSON.stringify(reg));
      if (syncRemote) {
        setDoc(doc(db, 'settings', 'deleted_entities'), cleanUndefined(reg)).catch(() => {});
      }
    } catch {
      // ignore
    }
  }

  private markEntityDeleted(type: keyof DeletedEntitiesRegistry, id: string | number) {
    const reg = this.getDeletedRegistry();
    const idStr = String(id);
    const list = reg[type] || [];
    if (!list.includes(idStr)) {
      list.push(idStr);
      reg[type] = list;
      this.saveDeletedRegistry(reg, true);
    }
  }

  private syncDeletedRegistryFromFirestore() {
    try {
      onSnapshot(doc(db, 'settings', 'deleted_entities'), (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<DeletedEntitiesRegistry>;
          const local = this.getDeletedRegistry();
          const merged: DeletedEntitiesRegistry = {
            products: Array.from(new Set([...local.products, ...((data.products || []).map(String))])),
            suppliers: Array.from(new Set([...local.suppliers, ...((data.suppliers || []).map(String)), ...LEGACY_MOCK_SUPPLIER_IDS])),
            orders: Array.from(new Set([...local.orders, ...((data.orders || []).map(String))]))
          };
          this.saveDeletedRegistry(merged, false);

          // Purger immédiatement toute entité locale qui figure dans le registre des suppressions
          const prevProdLen = this.products.length;
          this.products = this.products.filter(p => !merged.products.includes(String(p.id)));
          if (this.products.length !== prevProdLen) {
            this.saveProducts();
            this.notifyCatalogChange();
          }

          const prevSupLen = this.suppliers.length;
          this.suppliers = this.suppliers.filter(s => !merged.suppliers.includes(String(s.id)));
          if (this.suppliers.length !== prevSupLen) {
            this.saveSuppliers();
            this.notifySuppliersChange();
          }

          const prevOrdLen = this.orders.length;
          this.orders = this.orders.filter(o => !merged.orders.includes(String(o.id)));
          if (this.orders.length !== prevOrdLen) {
            this.saveOrders();
            this.notifyOrdersChange();
          }
        } else {
          this.saveDeletedRegistry(this.getDeletedRegistry(), true);
        }
      }, () => {});
    } catch {
      // Ignore offline sync init error
    }
  }

  private syncProductsFromFirestore() {
    try {
      onSnapshot(collection(db, 'products'), async (snapshot) => {
        const prods: ExtendedProduct[] = [];
        const deletedProducts = this.getDeletedRegistry().products;
        const legacyMockRefs = [
          'ZE-MKT-481-H', 'ZE-LCT-270-M', 'ZE-FLK-87V-PRO', 'ZE-SCH-NSX100', 
          'ZE-3M-CUB125', 'ZE-GRN-SP916', 'ZE-KRC-HD920', 'ZE-MST-1457E', 
          'ZE-SCH-ATV320', 'ZE-EMR-3051C', 'ZE-FAC-ROLL6', 'ZE-FAC-467B'
        ];

        snapshot.forEach((snapDoc) => {
          const data = snapDoc.data() as ExtendedProduct;
          const docIdStr = String(data.id || snapDoc.id);
          // Eradicate any deleted or legacy default mock products permanently from Firestore
          if (
            deletedProducts.includes(docIdStr) ||
            deletedProducts.includes(snapDoc.id) ||
            legacyMockRefs.includes(data.ref || '') || 
            (Number(snapDoc.id) >= 1 && Number(snapDoc.id) <= 12 && (data.name?.includes('Makita') || data.name?.includes('Loctite') || data.name?.includes('Fluke')))
          ) {
            deleteDoc(doc(db, 'products', snapDoc.id)).catch(() => {});
            return;
          }

          const resolvedImg = getProductImageUrl(data.img || data.image);
          const rawOptions = data.options || (data as any).variants || [];
          const pricingCtx: VariantPricingContext = {
            supplierCurrency: data.supplierCurrency || 'USD',
            marginRate: data.marginRate ?? 0.35,
            warehouseDeliveryFeeUSD: data.warehouseDeliveryFeeUSD ?? 20,
            applyVat: data.applyVat ?? true
          };
          const normalizedOptions = normalizeVariants(rawOptions, pricingCtx);
          const cheapestVar = getCheapestVariant(normalizedOptions);
          const resolvedPrice =
            ((!data.price || data.price <= 0 || (data.supplierPrice !== undefined && Number(data.supplierPrice) <= 0)) && cheapestVar?.price)
              ? cheapestVar.price
              : data.price;
          const resolvedCostPrice =
            ((!data.costPrice || data.costPrice <= 0 || (data.supplierPrice !== undefined && Number(data.supplierPrice) <= 0)) && cheapestVar?.costPrice)
              ? cheapestVar.costPrice
              : data.costPrice;

          let updatedCategory = data.category;
          let updatedSubcategory = data.subcategory;
          const lowerName = (data.name || '').toLowerCase();
          const isGenset = lowerName.includes('électrogène') || lowerName.includes('générateur') || lowerName.includes('generator') || lowerName.includes('genset');
          if (isGenset && (!updatedCategory || updatedCategory.toLowerCase().includes('outil'))) {
            updatedCategory = "Équipement d'extérieur";
            updatedSubcategory = "Groupes électrogènes et générateurs";
          }

          const isSourcing = isProductSourcing(data);
          const cleanName = smartTranslateProductTitleToFrench(data.name, data.brand);
          const cleanSpecs = translateSpecsRecordToFrench(data.specs || {});
          const cleanDesc = smartTranslateProductDescriptionToFrench(data.description, cleanName, cleanSpecs);

          const prodItem: ExtendedProduct = {
            ...data,
            id: Number(data.id) || data.id,
            name: cleanName || data.name,
            description: cleanDesc,
            specs: Object.keys(cleanSpecs).length > 0 ? cleanSpecs : data.specs,
            brand: cleanBrand(data.brand, cleanName || data.name),
            category: updatedCategory,
            subcategory: updatedSubcategory,
            price: resolvedPrice,
            costPrice: resolvedCostPrice,
            inStock: !isSourcing,
            availabilityMode: isSourcing ? 'sourcing' : 'stock',
            shippingMethod: isSourcing ? (data.shippingMethod && data.shippingMethod !== 'none' ? data.shippingMethod : 'air') : 'none',
            options: normalizedOptions,
            variants: normalizedOptions,
            discountPercent: data.discountPercent !== undefined && data.discountPercent !== null ? Number(data.discountPercent) : undefined,
            img: resolvedImg,
            image: resolvedImg
          };

          if (updatedCategory !== data.category) {
            setDoc(doc(db, 'products', snapDoc.id), cleanUndefined(prodItem)).catch(() => {});
          }

          prods.push(prodItem);
        });

        // Préserver tout produit local récemment ajouté (et non supprimé) dont l'écriture Firestore est en cours
        const remoteIds = new Set(prods.map(p => String(p.id)));
        for (const localProd of this.products) {
          const localIdStr = String(localProd.id);
          const isLegacyMock =
            legacyMockRefs.includes(localProd.ref || '') ||
            (Number(localProd.id) >= 1 && Number(localProd.id) <= 12 && (localProd.name?.includes('Makita') || localProd.name?.includes('Loctite') || localProd.name?.includes('Fluke')));
          if (!remoteIds.has(localIdStr) && !deletedProducts.includes(localIdStr) && !isLegacyMock) {
            prods.push(localProd);
            setDoc(doc(db, 'products', localIdStr), cleanUndefined(localProd)).catch(() => {});
          }
        }
        
        this.products = prods.sort((a, b) => Number(b.id) - Number(a.id));
        if (typeof window !== 'undefined') localStorage.setItem('ze_products_seeded_v3', 'true');
        this.saveProducts();
        this.notifyCatalogChange();
      }, (error) => {
        if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
          console.info("Firestore en mode hors ligne (cache local actif pour le catalogue)");
        } else {
          console.warn("Synchronisation temps réel produits:", error.message || error);
        }
      });
    } catch (e) {
      console.warn("Initialisation écouteur produits:", e);
    }
  }

  private syncSuppliersFromFirestore() {
    try {
      onSnapshot(collection(db, 'suppliers'), async (snapshot) => {
        const sups: Supplier[] = [];
        const deletedSuppliers = this.getDeletedRegistry().suppliers;

        snapshot.forEach((snapDoc) => {
          const data = snapDoc.data() as Supplier;
          const supId = String(data.id || snapDoc.id);
          if (deletedSuppliers.includes(supId) || deletedSuppliers.includes(snapDoc.id)) {
            deleteDoc(doc(db, 'suppliers', snapDoc.id)).catch(() => {});
            return;
          }
          sups.push(data);
        });

        this.suppliers = sups.sort((a, b) => a.id.localeCompare(b.id));
        if (typeof window !== 'undefined') {
          localStorage.setItem('ze_suppliers_seeded_v2', 'true');
        }
        this.saveSuppliers();
        this.notifySuppliersChange();
      }, (error) => {
        if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
          console.info("Firestore en mode hors ligne (fournisseurs)");
        } else {
          console.warn("Synchronisation temps réel fournisseurs:", error.message || error);
        }
      });
    } catch (e) {
      console.warn("Initialisation écouteur fournisseurs:", e);
    }
  }

  private syncOrdersFromFirestore() {
    try {
      onSnapshot(collection(db, 'orders'), (snapshot) => {
        const ords: Order[] = [];
        const deletedOrders = this.getDeletedRegistry().orders;
        snapshot.forEach((snapDoc) => {
          const data = snapDoc.data() as Order;
          const ordId = String(data.id || snapDoc.id);
          if (deletedOrders.includes(ordId) || deletedOrders.includes(snapDoc.id)) {
            deleteDoc(doc(db, 'orders', snapDoc.id)).catch(() => {});
            return;
          }
          ords.push(data);
        });
        
        this.orders = ords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        this.saveOrders();
        this.notifyOrdersChange();
      }, (error) => {
        if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
          console.info("Firestore en mode hors ligne (commandes)");
        } else {
          console.warn("Synchronisation temps réel commandes:", error.message || error);
        }
      });
    } catch (e) {
      console.warn("Initialisation écouteur commandes:", e);
    }
  }

  private init() {
    const deletedReg = this.getDeletedRegistry();

    // 1. Initialiser depuis localStorage avec éradication des anciennes données et éléments supprimés
    try {
      const savedProds = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (savedProds) {
        const parsed = JSON.parse(savedProds);
        const legacyMockRefs = [
          'ZE-MKT-481-H', 'ZE-LCT-270-M', 'ZE-FLK-87V-PRO', 'ZE-SCH-NSX100', 
          'ZE-3M-CUB125', 'ZE-GRN-SP916', 'ZE-KRC-HD920', 'ZE-MST-1457E', 
          'ZE-SCH-ATV320', 'ZE-EMR-3051C', 'ZE-FAC-ROLL6', 'ZE-FAC-467B'
        ];
        this.products = (Array.isArray(parsed) ? parsed : []).filter((p: any) => 
          !deletedReg.products.includes(String(p.id)) &&
          !legacyMockRefs.includes(p.ref) && 
          !(Number(p.id) >= 1 && Number(p.id) <= 12 && (p.name?.includes('Makita') || p.name?.includes('Loctite') || p.name?.includes('Fluke')))
        );
      }
    } catch {}

    try {
      const savedOrders = localStorage.getItem(STORAGE_KEYS.ORDERS);
      if (savedOrders) {
        const parsed = JSON.parse(savedOrders);
        this.orders = (Array.isArray(parsed) ? parsed : []).filter(
          (o: any) => o && !deletedReg.orders.includes(String(o.id))
        );
      }
    } catch {}

    try {
      const savedSuppliers = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
      if (savedSuppliers) {
        const parsed = JSON.parse(savedSuppliers);
        this.suppliers = (Array.isArray(parsed) ? parsed : []).filter(
          (s: any) => s && !deletedReg.suppliers.includes(String(s.id))
        );
        this.saveSuppliers();
      }
    } catch {}

    try {
      const savedWarehouses = localStorage.getItem(STORAGE_KEYS.AGENT_WAREHOUSES);
      if (savedWarehouses) {
        const parsed = JSON.parse(savedWarehouses);
        if (Array.isArray(parsed)) {
          this.agentWarehouses = parsed.filter(
            (w: any) =>
              w &&
              w.id &&
              !LEGACY_MOCK_WAREHOUSE_IDS.includes(String(w.id)) &&
              !(deletedReg.agentWarehouses || []).includes(String(w.id))
          );
          this.saveAgentWarehouses();
        }
      }
    } catch {
      this.agentWarehouses = [];
    }

    try {
      const savedAudit = localStorage.getItem(STORAGE_KEYS.AUDIT);
      if (savedAudit) this.auditLogs = JSON.parse(savedAudit);
    } catch {}

    try {
      const savedTokens = localStorage.getItem(STORAGE_KEYS.SUPPLIER_TOKENS);
      if (savedTokens) {
        const parsed = JSON.parse(savedTokens);
        if (Array.isArray(parsed)) this.supplierTokens = parsed;
      }
    } catch {}

    // Écouter les mises à jour des paramètres globaux (taux de change, fret, TVA) pour notifier le catalogue
    if (typeof window !== 'undefined') {
      window.addEventListener('ze_settings_updated', () => {
        this.notifyCatalogChange();
      });
    }

    // 2. Lancer la synchronisation asynchrone complète depuis Firestore
    this.syncDeletedRegistryFromFirestore();
    this.syncProductsFromFirestore();
    this.syncSuppliersFromFirestore();
    this.syncAgentWarehousesFromFirestore();
    this.syncOrdersFromFirestore();
    this.syncSupplierTokensFromFirestore();
  }

  private hydrateDefaultProducts() {
    this.products = PRODUCTS.map(p => ({
      ...p,
      isOnline: true,
      inStock: true,
      supplierCurrency: 'USD' as const,
      sourcePlatform: p.origin.includes('Chine') ? 'Alibaba' : p.origin.includes('États-Unis') ? 'USA' : 'Europe',
      supplierPrice: Math.round((p.price * 0.58) / 610),
      costPrice: Math.round(p.price * 0.62),
      marginRate: 0.35,
      vatRate: 0.18,
      shippingMethod: (parseFloat(p.weight || '1') > 20 ? 'sea' : 'air') as 'sea' | 'air',
      createdAt: new Date().toISOString()
    }));
    this.saveProducts();
  }

  private notifyCatalogChange() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ze_catalog_updated'));
    }
    this.listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  }

  private notifyOrdersChange() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ze_orders_updated'));
    }
    this.listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  }

  private notifySuppliersChange() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ze_suppliers_updated'));
    }
    this.listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  }

  public deleteOrder(id: string, author = 'Admin'): boolean {
    this.getOrders();
    this.markEntityDeleted('orders', id);
    const ord = this.orders.find(o => String(o.id) === String(id));
    const initialLen = this.orders.length;
    this.orders = this.orders.filter(o => String(o.id) !== String(id));
    if (this.orders.length < initialLen) {
      this.saveOrders();
      deleteDoc(doc(db, 'orders', String(id))).catch(() => {});
      this.logAction(author, 'Suppression Commande', `Commande ${ord ? ord.orderNumber : id} supprimée`, 'commande');
      this.notifyOrdersChange();
      return true;
    }
    return false;
  }

  private saveProducts() {
    try {
      const data = JSON.stringify(this.products);
      if (data.length > 5000000) {
        console.error("Catalog too large for localStorage, image corruption likely");
      }
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, data);
    } catch (e) {
      console.error("Erreur sauvegarde produits:", e);
    }
  }

  private saveOrders() {
    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(this.orders));
    } catch (e) {
      console.error("Erreur sauvegarde commandes:", e);
    }
  }

  private saveSuppliers() {
    try {
      localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(this.suppliers));
    } catch (e) {
      console.error("Erreur sauvegarde fournisseurs:", e);
    }
  }

  private saveAudit() {
    try {
      localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(this.auditLogs));
    } catch (e) {
      console.error("Erreur sauvegarde audit:", e);
    }
  }

  public logAction(author: string, action: string, details: string, category: AuditLog['category']) {
    const log: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      author,
      action,
      details,
      category
    };
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 200) this.auditLogs.pop();
    this.saveAudit();
  }

  // ================= PRODUITS =================
  public getProducts(onlyActive = false): ExtendedProduct[] {
    if (this.products.length === 0) {
      try {
        const savedProds = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
        if (savedProds) {
          const parsed = JSON.parse(savedProds);
          if (Array.isArray(parsed)) {
            this.products = parsed;
          }
        }
      } catch (e) {
        console.error("Erreur chargement produits:", e);
      }
    }

    // Normaliser les images et les prix de variantes pour éviter toute corruption
    const normalized = this.products.map(p => {
      const cleanedImages = filterOutSmallOrIconImages(p.images && p.images.length > 0 ? p.images : (p.img ? [p.img] : []));
      const finalImg = cleanedImages[0] || p.img || p.image || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600';
      const pricingCtx: VariantPricingContext = {
        supplierCurrency: p.supplierCurrency || 'USD',
        marginRate: p.marginRate ?? 0.35,
        warehouseDeliveryFeeUSD: p.warehouseDeliveryFeeUSD ?? 20,
        applyVat: p.applyVat ?? true
      };
      const normVars = normalizeVariants(p.options || p.variants || [], pricingCtx);
      const cheapest = getCheapestVariant(normVars);
      const effectivePrice =
        ((!p.price || p.price <= 0 || (p.supplierPrice !== undefined && Number(p.supplierPrice) <= 0)) && cheapest?.price)
          ? cheapest.price
          : p.price;
      const effectiveCost =
        ((!p.costPrice || p.costPrice <= 0 || (p.supplierPrice !== undefined && Number(p.supplierPrice) <= 0)) && cheapest?.costPrice)
          ? cheapest.costPrice
          : p.costPrice;

      const isSourcing = isProductSourcing(p);
      const cleanName = smartTranslateProductTitleToFrench(p.name, p.brand) || p.name;
      const cleanSpecs = translateSpecsRecordToFrench(p.specs || {});
      const cleanDesc = smartTranslateProductDescriptionToFrench(p.description, cleanName, cleanSpecs);
      const parsedWeightKg = parseWeightToKg(p.weight, 1.0, cleanSpecs);

      // Résolution intelligente du fournisseur adéquat et de l'entrepôt le plus proche
      const matchedSup = this.findAdequateSupplierForProduct(p).supplier;
      const resolvedSupId = p.supplierId || matchedSup?.id;
      const resolvedSupName = p.supplierName || matchedSup?.name;
      const closestWhInfo = this.findClosestAgentWarehouse({
        warehouseId: p.agentWarehouseId || matchedSup?.agentWarehouseId,
        country: matchedSup?.country || p.origin,
        platform: p.sourcePlatform || matchedSup?.platform,
        supplierUrl: p.supplierUrl || matchedSup?.websiteUrl,
        supplierName: resolvedSupName,
        currency: p.supplierCurrency || matchedSup?.currency
      });

      // Nettoyage et génération automatique de fiche PDF officielle certifiée sans challenge cookie_check
      let catalogPdfUrl = p.catalogPdfUrl;
      let pdfUrls = p.pdfUrls;
      const cleanSku = cleanSpecs['Référence Grainger / Modèle'] || cleanSpecs['Référence Grainger'] || p.ref || p.model || `PROD-${p.id}`;

      if (catalogPdfUrl && (catalogPdfUrl.includes('cookie_check') || catalogPdfUrl.includes('__cookie_check') || catalogPdfUrl.includes('grainger.com'))) {
        catalogPdfUrl = `/api/catalog-pdf/${encodeURIComponent(cleanSku)}?brand=${encodeURIComponent(p.brand || 'CONSTRUCTEUR')}&title=${encodeURIComponent(cleanName)}`;
      }

      if (Array.isArray(pdfUrls)) {
        pdfUrls = pdfUrls
          .filter(doc => doc && doc.url && !doc.url.includes('__cookie_check.html'))
          .map(doc => {
            if (doc.url.includes('cookie_check') || doc.url.includes('grainger.com')) {
              return {
                title: doc.title || `Catalogue PDF & Fiche Technique (#${cleanSku})`,
                url: `/api/catalog-pdf/${encodeURIComponent(cleanSku)}?brand=${encodeURIComponent(p.brand || 'CONSTRUCTEUR')}&title=${encodeURIComponent(cleanName)}`
              };
            }
            return doc;
          });
      }

      const isGraingerItem = Boolean(
        p.supplierUrl?.toLowerCase().includes('grainger.com') ||
        p.supplierName?.toLowerCase().includes('grainger') ||
        p.model === '6XH99' ||
        cleanSpecs['Référence Grainger / Modèle'] ||
        cleanSpecs['Référence Grainger']
      );
      if ((isGraingerItem || !catalogPdfUrl) && (!pdfUrls || pdfUrls.length === 0)) {
        const skuCode = cleanSku || 'REF';
        const generatedPdfUrl = `/api/catalog-pdf/${encodeURIComponent(skuCode)}?brand=${encodeURIComponent(p.brand || 'CONSTRUCTEUR')}&title=${encodeURIComponent(cleanName)}`;
        catalogPdfUrl = generatedPdfUrl;
        pdfUrls = [
          { title: `Catalogue PDF & Fiche Technique Constructeur (#${skuCode})`, url: generatedPdfUrl }
        ];
      }

      return {
        ...p,
        name: cleanName,
        description: cleanDesc,
        specs: Object.keys(cleanSpecs).length > 0 ? cleanSpecs : p.specs,
        weight: `${parsedWeightKg} kg`,
        inStock: !isSourcing,
        availabilityMode: (isSourcing ? 'sourcing' : 'stock') as 'sourcing' | 'stock',
        shippingMethod: (isSourcing ? (p.shippingMethod && p.shippingMethod !== 'none' ? p.shippingMethod : 'air') : 'none') as 'air' | 'sea' | 'none',
        defaultShippingMethod: p.defaultShippingMethod || 'neutral',
        supplierId: resolvedSupId,
        supplierName: resolvedSupName,
        agentWarehouseId: p.agentWarehouseId || undefined,
        agentWarehouseName: p.agentWarehouseId ? (p.agentWarehouseName || closestWhInfo.warehouse.name) : undefined,
        catalogPdfUrl,
        pdfUrls,
        price: effectivePrice,
        costPrice: effectiveCost,
        options: normVars,
        variants: normVars,
        images: cleanedImages.length > 0 ? cleanedImages : [finalImg],
        img: finalImg,
        image: finalImg
      };
    });

    if (onlyActive) {
      return normalized.filter(p => p.isOnline !== false);
    }
    return normalized;
  }

  public getProductById(id: number): ExtendedProduct | undefined {
    return this.getProducts().find(p => p.id === id);
  }

  public addProduct(pData: Partial<ExtendedProduct>, author = 'Admin'): ExtendedProduct {
    const currentProducts = this.getProducts();
    const deletedReg = this.getDeletedRegistry();
    const deletedNumericIds = deletedReg.products
      .map(id => Number(id))
      .filter(n => Number.isFinite(n) && n > 0 && n < 1000000000);
    const existingNumericIds = currentProducts
      .map(p => Number(p.id))
      .filter(n => Number.isFinite(n) && n > 0 && n < 1000000000);
    let lastSavedId = 100;
    try {
      lastSavedId = Number(localStorage.getItem('ze_last_product_id') || '100') || 100;
    } catch {}
    const newId = Math.max(100, lastSavedId, ...existingNumericIds, ...deletedNumericIds) + 1;
    try {
      localStorage.setItem('ze_last_product_id', String(newId));
    } catch {}

    // S'assurer que le nouvel ID ne figure jamais dans le registre des suppressions
    if (deletedReg.products.includes(String(newId))) {
      deletedReg.products = deletedReg.products.filter(id => id !== String(newId));
      this.saveDeletedRegistry(deletedReg, true);
    }
    
    // Auto-catégorisation intelligente Grainger/RaptorSupplies pour groupes électrogènes
    let cat = pData.category || 'Outillage électrique';
    let subcat = pData.subcategory || 'Équipements professionnels';
    const lowerName = (pData.name || '').toLowerCase();
    const isGenset = lowerName.includes('électrogène') || lowerName.includes('générateur') || lowerName.includes('generator') || lowerName.includes('genset');
    if (isGenset && (!cat || cat.toLowerCase().includes('outil'))) {
      cat = "Équipement d'extérieur";
      subcat = "Groupes électrogènes et générateurs";
    }

    // S'assurer que la catégorie finale existe dans la structure du catalogue
    const existingCats = siteSettingsService.getCategories();
    if (cat && !existingCats.some(c => c.name.toLowerCase() === cat.toLowerCase())) {
      siteSettingsService.addCategory({
        name: cat,
        brands: cleanBrand(pData.brand, pData.name),
        icon: 'Package',
        description: `Matériel et équipements professionnels - ${cat}`,
        subcategories: []
      });
    }

    const pricingCtx: VariantPricingContext = {
      supplierCurrency: pData.supplierCurrency || 'USD',
      marginRate: pData.marginRate ?? 0.35,
      warehouseDeliveryFeeUSD: pData.warehouseDeliveryFeeUSD ?? 20,
      applyVat: pData.applyVat ?? true
    };
    const normalizedOptions = normalizeVariants(pData.options || (pData as any).variants || [], pricingCtx);
    const cheapestVariant = getCheapestVariant(normalizedOptions);

    // Si le prix principal est remis à 0 et qu'il y a des variantes tarifées, prendre le prix le moins cher des variantes
    const resolvedPrice =
      (pData.price && pData.price > 0 && !(pData.supplierPrice !== undefined && Number(pData.supplierPrice) <= 0 && cheapestVariant?.price))
        ? pData.price
        : (cheapestVariant?.price || pData.price || 50000);

    const resolvedCostPrice =
      (pData.costPrice && pData.costPrice > 0 && !(pData.supplierPrice !== undefined && Number(pData.supplierPrice) <= 0 && cheapestVariant?.costPrice))
        ? pData.costPrice
        : (cheapestVariant?.costPrice || pData.costPrice || Math.round(resolvedPrice * 0.65));

    const isSourcingNew = pData.availabilityMode
      ? pData.availabilityMode === 'sourcing'
      : pData.inStock !== undefined
        ? !pData.inStock
        : isProductSourcing(pData);
    const cleanNewName = smartTranslateProductTitleToFrench(pData.name, pData.brand) || pData.name || 'Nouveau Matériel Industriel';
    const cleanNewSpecs = pData.specs && Object.keys(pData.specs).length > 0
      ? translateSpecsRecordToFrench(pData.specs)
      : { "État": "Neuf d'origine", "Garantie": pData.warranty || "1 an", "Certifications": "Norme CE / ISO" };
    const cleanNewDesc = smartTranslateProductDescriptionToFrench(pData.description, cleanNewName, cleanNewSpecs);
    const cleanedBrandName = cleanBrand(pData.brand, cleanNewName);

    // 1. Rapport intelligent Produit <-> Fournisseur adéquat
    let resolvedSupplier: Supplier | undefined;
    if (pData.supplierId) {
      resolvedSupplier = this.getSupplierById(pData.supplierId);
    }
    if (!resolvedSupplier && pData.supplierName && pData.supplierName.trim()) {
      resolvedSupplier = this.ensureSupplier({
        name: pData.supplierName.trim(),
        platform: pData.sourcePlatform || (isSourcingNew ? 'Alibaba' : 'Local'),
        country: pData.origin || (isSourcingNew ? 'Chine' : 'Sénégal'),
        currency: pData.supplierCurrency || 'USD',
        storeUrl: pData.supplierUrl
      });
    }
    if (!resolvedSupplier) {
      const matchResult = this.findAdequateSupplierForProduct({
        ...pData,
        name: cleanNewName,
        brand: cleanedBrandName,
        category: cat
      });
      resolvedSupplier = matchResult.supplier;
    }

    // 2. Assignation automatique de l'entrepôt le plus proche du fournisseur / origine du produit
    const resolvedOrigin = pData.origin || resolvedSupplier?.country || (isSourcingNew ? 'Chine' : 'Dakar, Sénégal');
    const resolvedPlatform = pData.sourcePlatform || (resolvedSupplier?.platform as any) || (isSourcingNew ? 'Alibaba' : 'Manuel');
    const closestWarehouseResult = this.findClosestAgentWarehouse({
      warehouseId: pData.agentWarehouseId || resolvedSupplier?.agentWarehouseId,
      country: resolvedSupplier?.country || resolvedOrigin,
      platform: resolvedPlatform,
      supplierUrl: pData.supplierUrl || resolvedSupplier?.websiteUrl,
      supplierName: resolvedSupplier?.name || pData.supplierName,
      currency: pData.supplierCurrency || resolvedSupplier?.currency
    });
    const assignedWarehouse = closestWarehouseResult.warehouse;

    // Si le fournisseur n'avait pas encore d'entrepôt rattaché, lui assigner automatiquement cet entrepôt le plus proche
    if (resolvedSupplier && !resolvedSupplier.agentWarehouseId && assignedWarehouse) {
      this.updateSupplier(resolvedSupplier.id, { agentWarehouseId: assignedWarehouse.id }, 'Système (Auto-Entrepôt)');
    }

    const newProduct: ExtendedProduct = {
      id: newId,
      name: cleanNewName,
      brand: cleanedBrandName,
      price: resolvedPrice,
      category: cat,
      subcategory: subcat,
      img: pData.img || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600',
      images: pData.images && pData.images.length > 0 ? pData.images : (pData.img ? [pData.img] : []),
      showDeposit: pData.showDeposit ?? false,
      depositPercentage: pData.depositPercentage || 30,
      rating: pData.rating || 5.0,
      reviews: pData.reviews || 0,
      sector: pData.sector || 'Industrie Générale',
      model: pData.model || `MOD-${newId}`,
      ref: pData.ref || `ZE-MRO-${newId}`,
      specs: cleanNewSpecs,
      description: cleanNewDesc,
      extendedDescription: pData.extendedDescription || 'Livré avec conformité d\'origine et traçabilité constructeur assurée.',
      origin: resolvedOrigin,
      packageQty: pData.packageQty || 1,
      moq: pData.moq || 1,
      weight: pData.weight || '1.0 kg',
      warranty: pData.warranty || '1 an garantie constructeur',
      leadTime: pData.leadTime || resolvedSupplier?.leadTimeAvg || (isSourcingNew ? '7-14 jours express DAP Dakar' : 'Livraison immédiate 24-48h Dakar'),
      isOnline: pData.isOnline ?? true,
      inStock: !isSourcingNew,
      availabilityMode: isSourcingNew ? 'sourcing' : 'stock',
      costPrice: resolvedCostPrice,
      supplierPrice: pData.supplierPrice ?? 0,
      supplierCurrency: pData.supplierCurrency || resolvedSupplier?.currency || 'USD',
      supplierId: resolvedSupplier?.id || pData.supplierId,
      supplierName: resolvedSupplier?.name || pData.supplierName,
      supplierUrl: pData.supplierUrl || resolvedSupplier?.websiteUrl,
      agentWarehouseId: pData.agentWarehouseId || undefined,
      agentWarehouseName: pData.agentWarehouseId ? (pData.agentWarehouseName || assignedWarehouse.name) : undefined,
      sourcePlatform: resolvedPlatform,
      shippingMethod: isSourcingNew
        ? (pData.shippingMethod && pData.shippingMethod !== 'none'
            ? pData.shippingMethod
            : ((parseFloat(String(pData.weight || '1').replace(/[^0-9.]/g, '')) || 1) > 20 ? 'sea' : 'air'))
        : 'none',
      marginRate: pData.marginRate || 0.35,
      vatRate: pData.vatRate || 0.18,
      applyVat: pData.applyVat ?? true,
      warehouseDeliveryFeeUSD: pData.warehouseDeliveryFeeUSD ?? 20,
      options: normalizedOptions,
      variants: normalizedOptions,
      discountPercent: pData.discountPercent !== undefined && pData.discountPercent !== null ? Number(pData.discountPercent) : undefined,
      defaultShippingMethod: pData.defaultShippingMethod || 'neutral',
      customSeaFreightCost: pData.customSeaFreightCost !== undefined ? Number(pData.customSeaFreightCost) : undefined,
      customAirFreightCost: pData.customAirFreightCost !== undefined ? Number(pData.customAirFreightCost) : undefined,
      catalogPdfUrl: pData.catalogPdfUrl,
      pdfUrls: pData.pdfUrls,
      dimensions: pData.dimensions,
      hsCode: pData.hsCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.products.unshift(newProduct);
    this.saveProducts();
    setDoc(doc(db, 'products', String(newProduct.id)), cleanUndefined(newProduct)).catch(() => {});
    
    this.logAction(author, 'Ajout Produit', `Ajout de "${newProduct.name}" (Réf: ${newProduct.ref})`, 'produit');
    this.notifyCatalogChange();
    return newProduct;
  }

  public updateProduct(id: number, pData: Partial<ExtendedProduct>, author = 'Admin'): ExtendedProduct {
    this.getProducts(); // refresh
    const index = this.products.findIndex(p => Number(p.id) === Number(id));
    if (index === -1) throw new Error("Produit non trouvé");

    const old = this.products[index];
    const pricingCtx: VariantPricingContext = {
      supplierCurrency: pData.supplierCurrency ?? old.supplierCurrency ?? 'USD',
      marginRate: pData.marginRate ?? old.marginRate ?? 0.35,
      warehouseDeliveryFeeUSD: pData.warehouseDeliveryFeeUSD ?? old.warehouseDeliveryFeeUSD ?? 20,
      applyVat: pData.applyVat ?? old.applyVat ?? true
    };
    const rawOpts = pData.options !== undefined ? pData.options : (pData as any).variants !== undefined ? (pData as any).variants : old.options;
    const normalizedOptions = rawOpts ? normalizeVariants(rawOpts, pricingCtx) : [];
    const cheapestVariant = getCheapestVariant(normalizedOptions);

    const effectiveSupplierPrice = pData.supplierPrice !== undefined ? pData.supplierPrice : old.supplierPrice;
    const candidatePrice = pData.price !== undefined ? pData.price : old.price;
    const candidateCostPrice = pData.costPrice !== undefined ? pData.costPrice : old.costPrice;

    const resolvedPrice =
      ((!candidatePrice || candidatePrice <= 0 || (effectiveSupplierPrice !== undefined && Number(effectiveSupplierPrice) <= 0)) && cheapestVariant?.price)
        ? cheapestVariant.price
        : (candidatePrice || cheapestVariant?.price || old.price);

    const resolvedCostPrice =
      ((!candidateCostPrice || candidateCostPrice <= 0 || (effectiveSupplierPrice !== undefined && Number(effectiveSupplierPrice) <= 0)) && cheapestVariant?.costPrice)
        ? cheapestVariant.costPrice
        : (candidateCostPrice || cheapestVariant?.costPrice || old.costPrice);

    let updatedCat = pData.category || old.category;
    let updatedSubcat = pData.subcategory || old.subcategory;
    const nameToCheck = (pData.name || old.name || '').toLowerCase();
    const isGenset = nameToCheck.includes('électrogène') || nameToCheck.includes('générateur') || nameToCheck.includes('generator') || nameToCheck.includes('genset');
    if (isGenset && (!updatedCat || updatedCat.toLowerCase().includes('outil'))) {
      updatedCat = "Équipement d'extérieur";
      updatedSubcat = "Groupes électrogènes et générateurs";
    }

    const nextSourcing = pData.availabilityMode
      ? pData.availabilityMode === 'sourcing'
      : pData.inStock !== undefined
        ? !pData.inStock
        : isProductSourcing({ ...old, ...pData });
    const cleanUpdatedName = smartTranslateProductTitleToFrench(pData.name || old.name, pData.brand || old.brand) || pData.name || old.name;
    const cleanUpdatedSpecs = translateSpecsRecordToFrench(pData.specs || old.specs || {});
    const cleanUpdatedDesc = smartTranslateProductDescriptionToFrench(
      pData.description !== undefined ? pData.description : old.description,
      cleanUpdatedName,
      cleanUpdatedSpecs
    );
    const mergedDraft = { ...old, ...pData, name: cleanUpdatedName, category: updatedCat };
    const matchedSup =
      (mergedDraft.supplierId ? this.getSupplierById(mergedDraft.supplierId) : undefined) ||
      this.findAdequateSupplierForProduct(mergedDraft).supplier;
    const closestWh = this.findClosestAgentWarehouse({
      warehouseId: pData.agentWarehouseId || matchedSup?.agentWarehouseId || old.agentWarehouseId,
      country: matchedSup?.country || mergedDraft.origin,
      platform: mergedDraft.sourcePlatform || matchedSup?.platform,
      supplierUrl: mergedDraft.supplierUrl || matchedSup?.websiteUrl,
      supplierName: matchedSup?.name || mergedDraft.supplierName,
      currency: mergedDraft.supplierCurrency || matchedSup?.currency
    }).warehouse;

    if (matchedSup && !matchedSup.agentWarehouseId && closestWh) {
      this.updateSupplier(matchedSup.id, { agentWarehouseId: closestWh.id }, 'Système (Auto-Entrepôt)');
    }

    const updated: ExtendedProduct = {
      ...old,
      ...pData,
      name: cleanUpdatedName,
      description: cleanUpdatedDesc,
      specs: Object.keys(cleanUpdatedSpecs).length > 0 ? cleanUpdatedSpecs : (pData.specs || old.specs),
      inStock: !nextSourcing,
      availabilityMode: nextSourcing ? 'sourcing' : 'stock',
      shippingMethod: nextSourcing
        ? ((pData.shippingMethod || old.shippingMethod) && (pData.shippingMethod || old.shippingMethod) !== 'none'
            ? (pData.shippingMethod || old.shippingMethod)
            : 'air')
        : 'none',
      supplierId: pData.supplierId !== undefined ? pData.supplierId : (old.supplierId || matchedSup?.id),
      supplierName: pData.supplierName !== undefined ? pData.supplierName : (old.supplierName || matchedSup?.name),
      agentWarehouseId: pData.agentWarehouseId !== undefined ? (pData.agentWarehouseId || undefined) : old.agentWarehouseId,
      agentWarehouseName: pData.agentWarehouseId !== undefined ? (pData.agentWarehouseName || (pData.agentWarehouseId ? closestWh.name : undefined)) : old.agentWarehouseName,
      price: resolvedPrice,
      costPrice: resolvedCostPrice,
      category: updatedCat,
      subcategory: updatedSubcat,
      options: normalizedOptions,
      variants: normalizedOptions,
      discountPercent: pData.discountPercent !== undefined ? (pData.discountPercent === null ? undefined : Number(pData.discountPercent)) : old.discountPercent,
      brand: cleanBrand(pData.brand || old.brand, cleanUpdatedName),
      updatedAt: new Date().toISOString()
    };

    this.products[index] = updated;
    this.saveProducts();
    setDoc(doc(db, 'products', String(updated.id)), cleanUndefined(updated)).catch(() => {});

    this.logAction(author, 'Modification Produit', `Mise à jour de "${updated.name}" (Prix: ${updated.price} FCFA, En ligne: ${updated.isOnline})`, 'produit');
    this.notifyCatalogChange();
    return updated;
  }

  public deleteProduct(id: number | string, author = 'Admin'): boolean {
    const idStr = String(id);
    this.markEntityDeleted('products', idStr);
    const p = this.products.find(item => String(item.id) === idStr);
    const initialLen = this.products.length;
    this.products = this.products.filter(item => String(item.id) !== idStr);
    this.saveProducts();
    
    // Suppression systématique et irrévocable dans Firestore
    deleteDoc(doc(db, 'products', idStr)).catch(() => {});

    if (p) {
      this.logAction(author, 'Suppression Produit', `Suppression définitive du produit "${p.name}" (ID: ${id})`, 'produit');
    }
    this.notifyCatalogChange();
    return this.products.length < initialLen;
  }

  // ================= CALCUL AUTOMATIQUE DU PRIX DE VENTE =================
  /**
   * Calcul dynamique branché sur les paramètres globaux de siteSettingsService :
   * Utilise en temps réel les Taux de Change, le Taux de TVA, la Marge par défaut et les Barèmes Moyens de Fret.
   */
  public calculatePricing(params: {
    supplierPrice: number;
    supplierCurrency: 'USD' | 'EUR' | 'CNY' | 'XOF' | 'GBP';
    weightKg: number;
    dimensions?: string;
    volumeCbm?: number;
    seaRatePerKgXOF?: number;
    seaRatePerCbmXOF?: number;
    ignoreSeaWeight?: boolean;
    ignoreSeaVolume?: boolean;
    preferredFreight?: 'none' | 'neutral' | 'auto' | 'air' | 'sea' | 'express';
    customSeaFreightCost?: number;
    customAirFreightCost?: number;
    marginRate?: number;
    warehouseDeliveryUSD?: number;
    agentWarehouseId?: string;
    applyVat?: boolean;
  }) {
    const settings = siteSettingsService.getSettings();
    const matchedWh = params.agentWarehouseId && params.agentWarehouseId !== 'aw-unconfigured'
      ? this.getAgentWarehouses().find(w => w.id === params.agentWarehouseId)
      : undefined;
    const hasAssignedWh = Boolean(matchedWh && matchedWh.id && matchedWh.id !== 'aw-unconfigured');
    const sysFreightEnabled = settings?.systemFreightEnabled !== false;
    const rates = settings?.exchangeRates || EXCHANGE_RATES;
    const rate = (rates as any)[params.supplierCurrency] || EXCHANGE_RATES[params.supplierCurrency] || 1;
    const usdRate = rates.USD || EXCHANGE_RATES['USD'] || 610;
    const hasPositiveSupplierPrice = Number(params.supplierPrice) > 0;
    const supplierPriceXOF = hasPositiveSupplierPrice ? Math.round(params.supplierPrice * rate) : 0;
    const effectiveDomesticFeeUSD = params.warehouseDeliveryUSD !== undefined
      ? params.warehouseDeliveryUSD
      : (hasAssignedWh ? (matchedWh?.domesticDeliveryFeeUSD ?? 20) : (sysFreightEnabled ? 20 : 0));
    const warehouseDeliveryXOF = hasPositiveSupplierPrice ? Math.round((effectiveDomesticFeeUSD || 0) * usdRate) : 0;

    // 1. Prix de base équipement HT (hors fret international)
    const defaultMargin = (settings?.defaultMarginPercentage ?? 35) / 100;
    const margin = params.marginRate ?? defaultMargin;
    const priceEquipmentHT = hasPositiveSupplierPrice ? Math.round((supplierPriceXOF + warehouseDeliveryXOF) / (1 - margin)) : 0;
    const configuredVatRate = (settings?.vatRate ?? 18) / 100;
    const vatRate = (params.applyVat ?? true) ? configuredVatRate : 0;
    const vatAmount = hasPositiveSupplierPrice ? Math.round(priceEquipmentHT * vatRate) : 0;
    const priceEquipmentTTC = priceEquipmentHT + vatAmount;

    // 2. Calcul du Fret Aérien & Express :
    // RÈGLE STRICTE : Tant qu'un entrepôt est assigné, les paramètres système sont TOUJOURS ignorés.
    // Si aucun entrepôt n'est assigné, les vrais paramètres de fret par défaut du système (siteSettings) sont utilisés.
    const validWeight = Math.max(params.weightKg || 1, 0.1);
    const isAirEligible = hasAssignedWh
      ? (matchedWh!.offersAirFreight !== false)
      : sysFreightEnabled;
    const airRateKg = hasAssignedWh
      ? (matchedWh!.airFreightPerKgXOF ?? settings?.airFreightPerKg ?? FREIGHT_RATES.AIR_PER_KG_XOF)
      : (sysFreightEnabled ? (settings?.airFreightPerKg ?? FREIGHT_RATES.AIR_PER_KG_XOF) : 0);
    const airMinCharge = hasAssignedWh
      ? (matchedWh!.airFreightMinXOF ?? airRateKg)
      : (sysFreightEnabled ? (settings?.airFreightMin ?? airRateKg) : 0);
    const computedAirFreightCostXOF = (hasAssignedWh || sysFreightEnabled)
      ? Math.max(Math.round(validWeight * airRateKg), airMinCharge)
      : 0;
    const airFreightCostXOF = (params.customAirFreightCost !== undefined && params.customAirFreightCost !== null && !isNaN(Number(params.customAirFreightCost)) && Number(params.customAirFreightCost) >= 0)
      ? Math.round(Number(params.customAirFreightCost))
      : computedAirFreightCostXOF;

    const expressRateKg = sysFreightEnabled ? (settings?.expressFreightPerKg ?? 15000) : 0;
    const expressMinCharge = sysFreightEnabled ? (settings?.expressFreightMin ?? 22500) : 0;
    const expressFreightCostXOF = sysFreightEnabled ? Math.max(Math.round(validWeight * expressRateKg), expressMinCharge) : 0;

    // 3. Calcul Transparent du Fret Maritime (Poids kg vs Volume CBM) :
    // Priorité absolue et exclusive à l'entrepôt assigné ; sinon barème système réel (siteSettings)
    const seaRateKg = params.seaRatePerKgXOF ?? (hasAssignedWh
      ? (matchedWh!.seaFreightPerKgXOF ?? settings?.seaFreightPerKg ?? FREIGHT_RATES.SEA_PER_KG_XOF)
      : (sysFreightEnabled ? (settings?.seaFreightPerKg ?? FREIGHT_RATES.SEA_PER_KG_XOF) : 0));
    const seaMinCharge = hasAssignedWh
      ? (matchedWh!.seaFreightMinXOF ?? settings?.seaFreightMin ?? FREIGHT_RATES.SEA_MIN_CHARGE_XOF)
      : (sysFreightEnabled ? (settings?.seaFreightMin ?? FREIGHT_RATES.SEA_MIN_CHARGE_XOF) : 0);
    const seaRateCbm = params.seaRatePerCbmXOF ?? (hasAssignedWh
      ? (matchedWh!.seaFreightPerCbmXOF ?? Math.round((settings?.seaFreightPerCbmUSD || 220) * usdRate))
      : (sysFreightEnabled ? Math.round((settings?.seaFreightPerCbmUSD || 220) * usdRate) : 0));

    let parsedDimCbm = 0;
    if (params.dimensions && params.dimensions.trim()) {
      const dimMatches = params.dimensions.match(/(\d+(?:[.,]\d+)?)\s*[*xX×]\s*(\d+(?:[.,]\d+)?)\s*[*xX×]\s*(\d+(?:[.,]\d+)?)/);
      if (dimMatches) {
        const d1 = parseFloat(dimMatches[1].replace(',', '.'));
        const d2 = parseFloat(dimMatches[2].replace(',', '.'));
        const d3 = parseFloat(dimMatches[3].replace(',', '.'));
        if (d1 > 0 && d2 > 0 && d3 > 0) {
          const isMm = /\bmm\b/i.test(params.dimensions);
          const isIn = /\b(?:in|inch|po)\b|"/i.test(params.dimensions);
          const factor = isMm ? 0.1 : isIn ? 2.54 : 1;
          parsedDimCbm = Number((((d1 * factor) * (d2 * factor) * (d3 * factor)) / 1000000).toFixed(3));
        }
      }
    }

    const computedVolumeCbm = params.volumeCbm && params.volumeCbm > 0 
      ? params.volumeCbm 
      : (parsedDimCbm > 0 ? parsedDimCbm : Number((validWeight / 250).toFixed(3)));

    const seaCostByWeightXOF = (!hasAssignedWh && !sysFreightEnabled) || params.ignoreSeaWeight ? 0 : Math.round(validWeight * seaRateKg);
    const seaCostByVolumeXOF = (!hasAssignedWh && !sysFreightEnabled) || params.ignoreSeaVolume ? 0 : Math.round(computedVolumeCbm * seaRateCbm);

    let seaFreightCostXOF = seaMinCharge;
    let seaCalculationBasis = 'Poids & Volume (Max)';

    if (params.customSeaFreightCost !== undefined && params.customSeaFreightCost !== null && !isNaN(Number(params.customSeaFreightCost)) && Number(params.customSeaFreightCost) >= 0) {
      seaFreightCostXOF = Math.round(Number(params.customSeaFreightCost));
      seaCalculationBasis = 'Tarif personnalisé (Forfait Admin)';
    } else if (params.ignoreSeaWeight && !params.ignoreSeaVolume) {
      seaFreightCostXOF = Math.max(seaCostByVolumeXOF, seaMinCharge);
      seaCalculationBasis = 'Volume seul (CBM)';
    } else if (!params.ignoreSeaWeight && params.ignoreSeaVolume) {
      seaFreightCostXOF = Math.max(seaCostByWeightXOF, seaMinCharge);
      seaCalculationBasis = 'Poids seul (kg)';
    } else if (params.ignoreSeaWeight && params.ignoreSeaVolume) {
      seaFreightCostXOF = seaMinCharge;
      seaCalculationBasis = 'Minimum forfaitaire';
    } else {
      seaFreightCostXOF = Math.max(seaCostByWeightXOF, seaCostByVolumeXOF, seaMinCharge);
      seaCalculationBasis = seaCostByVolumeXOF > seaCostByWeightXOF ? 'Volume retenu (CBM)' : 'Poids retenu (kg)';
    }

    let shippingMethod: 'none' | 'neutral' | 'air' | 'sea' = 'none';
    let freightCostXOF = 0;

    if (params.preferredFreight === 'sea') {
      shippingMethod = 'sea';
      freightCostXOF = seaFreightCostXOF;
    } else if (params.preferredFreight === 'air' || params.preferredFreight === 'express') {
      shippingMethod = isAirEligible ? 'air' : 'sea';
      freightCostXOF = params.preferredFreight === 'express'
        ? expressFreightCostXOF
        : (isAirEligible ? airFreightCostXOF : seaFreightCostXOF);
    } else if (params.preferredFreight === 'none' || params.preferredFreight === 'neutral') {
      shippingMethod = params.preferredFreight;
      freightCostXOF = 0;
    } else {
      shippingMethod = 'neutral';
      freightCostXOF = 0;
    }

    const totalCostPrice = Math.round(supplierPriceXOF + warehouseDeliveryXOF);
    const priceTTC = priceEquipmentTTC;

    return {
      supplierPriceXOF,
      priceEquipmentHT,
      priceEquipmentTTC,
      priceHT: priceEquipmentHT,
      priceTTC: priceEquipmentTTC,
      freightCostXOF,
      shippingMethod,
      isAirEligible,
      maxAirWeightKg: 20,
      airFreightCostXOF,
      expressFreightCostXOF,
      seaFreightCostXOF,
      seaCostByWeightXOF,
      seaCostByVolumeXOF,
      seaCalculationBasis,
      seaRatePerKgXOF: seaRateKg,
      seaMinChargeXOF: seaMinCharge,
      airRatePerKgXOF: airRateKg,
      airMinChargeXOF: airMinCharge,
      expressRatePerKgXOF: expressRateKg,
      expressMinChargeXOF: expressMinCharge,
      seaFreightDuration: settings?.seaFreightDuration || '20 à 40 jours',
      airFreightDuration: settings?.airFreightDuration || '8 à 15 jours',
      expressFreightDuration: settings?.expressFreightDuration || '3 à 6 jours',
      seaRatePerCbmXOF: seaRateCbm,
      computedVolumeCbm,
      isSeaWeightIgnored: Boolean(params.ignoreSeaWeight),
      isSeaVolumeIgnored: Boolean(params.ignoreSeaVolume),
      totalCostPrice,
      marginRate: margin,
      vatRate,
      vatAmount
    };
  }

  // ================= PARSEUR INTELLIGENT DE LIENS (SANS DONNÉES FICTIVES) =================
  public parseProductLink(url: string) {
    const cleanUrl = url.trim().toLowerCase();
    let detectedPlatform: 'Alibaba' | 'AliExpress' | '1688' | 'Made-in-China' | 'Europe' | 'USA' | 'Manuel' = 'Manuel';
    let detectedSupplier = '';
    let detectedCountry = '';
    let defaultCurrency: 'USD' | 'EUR' | 'CNY' | 'XOF' = 'USD';
    let estimatedWeight = 0;

    if (cleanUrl.includes('aliexpress.')) {
      detectedPlatform = 'AliExpress';
      detectedSupplier = 'AliExpress B2B';
      detectedCountry = 'Chine';
      defaultCurrency = 'USD';
    } else if (cleanUrl.includes('alibaba.')) {
      detectedPlatform = 'Alibaba';
      detectedSupplier = 'Alibaba Trade Assurance';
      detectedCountry = 'Chine';
      defaultCurrency = 'USD';
    } else if (cleanUrl.includes('1688.com')) {
      detectedPlatform = '1688';
      detectedSupplier = '1688 Chine Direct';
      detectedCountry = 'Chine';
      defaultCurrency = 'CNY';
    } else if (cleanUrl.includes('made-in-china.')) {
      detectedPlatform = 'Made-in-China';
      detectedSupplier = 'Made-in-China Direct';
      detectedCountry = 'Chine';
      defaultCurrency = 'USD';
    } else if (cleanUrl.includes('.fr') || cleanUrl.includes('.de') || cleanUrl.includes('.eu') || cleanUrl.includes('manutan') || cleanUrl.includes('rs-online')) {
      detectedPlatform = 'Europe';
      detectedSupplier = cleanUrl.includes('manutan')
        ? 'Manutan Europe'
        : cleanUrl.includes('rs-online')
          ? 'RS Components Europe'
          : 'Fournisseur Industriel Europe';
      detectedCountry = 'France';
      defaultCurrency = 'EUR';
    } else if (cleanUrl.includes('amazon.com') || cleanUrl.includes('grainger') || cleanUrl.includes('mcmaster')) {
      detectedPlatform = 'USA';
      detectedSupplier = cleanUrl.includes('grainger')
        ? 'Grainger Industrial Supply'
        : cleanUrl.includes('mcmaster')
          ? 'McMaster-Carr USA'
          : 'Distribution Industrielle USA';
      detectedCountry = 'États-Unis';
      defaultCurrency = 'USD';
    }

    // Extraction uniquement si un slug réel existe dans l'URL
    let guessedTitle = '';
    let detectedBrand = '';
    let detectedItemCode = '';
    let detectedImage = '';
    let detectedSpecs: Record<string, string> = {};
    let detectedPrice = 0;
    let detectedDimensions = '';
    let detectedCategory = '';
    let catalogPdfUrl = '';
    let pdfUrls: PdfDocumentItem[] = [];
    let detectedImages: string[] = [];

    try {
      const urlObj = new URL(url);
      const pathname = decodeURIComponent(urlObj.pathname);
      const pathParts = pathname.split('/').filter(Boolean);

      if (cleanUrl.includes('grainger.com')) {
        detectedPlatform = 'USA';
        detectedSupplier = 'Grainger Industrial Supply';
        detectedCountry = 'États-Unis';
        defaultCurrency = 'USD';

        const prodIdx = pathParts.findIndex(p => p.toLowerCase() === 'product');
        const rawSlug = prodIdx >= 0 && pathParts[prodIdx + 1]
          ? pathParts[prodIdx + 1]
          : (pathParts[pathParts.length - 1] || '');
        const tokens = rawSlug.split('-').filter(Boolean);

        if (tokens.length >= 2) {
          const firstToken = tokens[0].toUpperCase();
          if (firstToken.length >= 2 && !/^(PRODUCT|ITEM)$/.test(firstToken)) {
            detectedBrand = firstToken;
          }
          const lastToken = tokens[tokens.length - 1];
          const itemMatch = lastToken.match(/^([0-9A-Z]{4,8}?)(?:s)?$/i);
          if (itemMatch && /\d/.test(itemMatch[1])) {
            detectedItemCode = itemMatch[1].toUpperCase();
          }

          const bodyTokens = tokens.slice(
            detectedBrand ? 1 : 0,
            detectedItemCode ? tokens.length - 1 : tokens.length
          );
          if (bodyTokens.length > 0) {
            guessedTitle = `${detectedBrand ? detectedBrand + ' — ' : ''}${bodyTokens.join(' ')}${detectedItemCode ? ` (Réf. ${detectedItemCode})` : ''}`;
          }
        }

        if (detectedItemCode) {
          detectedSpecs['Référence Grainger'] = `#${detectedItemCode}`;
          detectedSpecs['Fournisseur Officiel'] = 'Grainger Industrial Supply (USA)';
          detectedImage = `https://static.grainger.com/rp/s/is/image/Grainger/${detectedItemCode}_AS01?$adapimg$&hei=1000&wid=1000`;
          detectedImages = [
            detectedImage,
            `https://static.grainger.com/rp/s/is/image/Grainger/${detectedItemCode}_AS02?$adapimg$&hei=1000&wid=1000`,
            `https://static.grainger.com/rp/s/is/image/Grainger/${detectedItemCode}_AL01?$adapimg$&hei=1000&wid=1000`
          ];
          catalogPdfUrl = `/api/product-pdf/${detectedItemCode}?title=${encodeURIComponent(guessedTitle || `Équipement Grainger #${detectedItemCode}`)}&brand=${encodeURIComponent(detectedBrand || 'GRAINGER')}`;
          pdfUrls = [
            {
              title: `Catalogue PDF & Fiche Technique Constructeur (${detectedBrand || 'Grainger'} #${detectedItemCode})`,
              url: catalogPdfUrl
            },
            {
              title: `Spécifications Officielles Constructeur Grainger #${detectedItemCode}`,
              url: url
            }
          ];
        }

        if (detectedItemCode === '6XH99' || cleanUrl.includes('6xh99')) {
          detectedBrand = 'DAYTON';
          guessedTitle = 'Moteur électrique monophasé usage général DAYTON — 1/3 HP (0,25 kW), 1725 tr/min, 115/208-230V AC, Châssis NEMA 56 (Réf. 6XH99)';
          detectedCategory = 'Moteurs & Pompes';
          detectedPrice = 248.50;
          estimatedWeight = 8.2;
          detectedDimensions = '31 x 19 x 21 cm';
          catalogPdfUrl = `/api/product-pdf/6XH99?title=${encodeURIComponent(guessedTitle)}&brand=DAYTON`;
          pdfUrls = [
            {
              title: 'Catalogue PDF & Fiche Technique Constructeur (DAYTON #6XH99)',
              url: catalogPdfUrl
            },
            {
              title: 'Documentation Technique Officielle Grainger #6XH99',
              url: 'https://www.grainger.com/product/DAYTON-General-Purpose-Motor-Single-6XH99'
            }
          ];
          detectedSpecs = {
            'Marque Constructeur': 'DAYTON (Grainger USA)',
            'Référence Grainger': '#6XH99',
            'Pays d\'origine': 'Corée du Sud',
            'Type d\'équipement': 'Moteur électrique asynchrone monophasé (Usage général)',
            'Technologie moteur': 'Démarrage par condensateur (Capacitor-Start)',
            'Puissance nominale': '1/3 HP (~0,25 kW)',
            'Vitesse de rotation': '1 725 tr/min (RPM) — 4 pôles',
            'Tension d\'alimentation': '115 / 208-230V AC (Monophasé)',
            'Intensité pleine charge': '6.0 / 3.0-3.0 A',
            'Fréquence': '60 Hz',
            'Châssis (NEMA Frame)': '56',
            'Indice de protection / Boîtier': 'ODP (Open Dripproof — Ouvert abrité)',
            'Montage': 'Berceau / Base rigide (Cradle Base)',
            'Facteur de service': '1.35',
            'Température ambiante max.': '40 °C',
            'Classe d\'isolation': 'Classe B',
            'Protection thermique': 'Aucune (Sans protection thermique)',
            'Sens de rotation': 'Réversible (Horaire / Anti-horaire CW/CCW)',
            'Diamètre d\'arbre': '5/8 po (15,88 mm) avec clavette',
            'Longueur hors-tout': '10-7/16 po (~26,5 cm)'
          };
        }
      } else {
        const titleCandidates = pathParts.filter(p => !p.match(/^(item|product-detail|dp|gp|product|itm|p)$/i));
        let bestSlug = titleCandidates[titleCandidates.length - 1] || '';
        if (bestSlug.length < 4 && titleCandidates.length > 1) {
          bestSlug = titleCandidates[titleCandidates.length - 2];
        }

        const cleanSlug = bestSlug
          .replace(/\.(html|htm|php|asp|jsp)$/i, '')
          .replace(/[0-9]{8,}/g, '')
          .replace(/[-_+]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (cleanSlug.length > 3) {
          guessedTitle = cleanSlug
            .split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');
        }
      }
    } catch {
      // Fallback
    }

    const pricing = this.calculatePricing({
      supplierPrice: detectedPrice || 0,
      supplierCurrency: defaultCurrency,
      weightKg: estimatedWeight || 0,
      marginRate: 0.35,
      applyVat: true
    });

    return {
      url,
      detectedPlatform,
      detectedSupplier,
      detectedCountry,
      defaultCurrency,
      estimatedWeight,
      guessedTitle,
      detectedBrand,
      detectedItemCode,
      detectedImage,
      detectedImages,
      detectedSpecs,
      detectedPrice,
      detectedDimensions,
      detectedCategory,
      catalogPdfUrl,
      pdfUrls,
      pricing
    };
  }

  // ================= COMMANDES & FACTURES =================
  public getOrders(): Order[] {
    if (this.orders.length === 0) {
      try {
        const savedOrders = localStorage.getItem(STORAGE_KEYS.ORDERS);
        if (savedOrders) {
          const parsed = JSON.parse(savedOrders);
          if (Array.isArray(parsed)) {
            this.orders = parsed;
          }
        }
      } catch {
        // ignore
      }
    }
    const deletedOrderIds = new Set(this.getDeletedRegistry().orders.map(String));
    if (deletedOrderIds.size > 0) {
      this.orders = this.orders.filter(o => !deletedOrderIds.has(String(o.id)));
    }
    return this.orders;
  }

  public getOrderById(id: string): Order | undefined {
    return this.getOrders().find(o => o.id === id);
  }

  public createOrder(oData: Partial<Order>): Order {
    this.getOrders();
    const nextSeq = this.orders.length + 1;
    const prefix = oData.isQuote ? 'DEV-SN-2026' : 'CMD-SN-2026';
    const orderNumber = oData.orderNumber || `${prefix}-${String(nextSeq).padStart(4, '0')}`;
    const id = oData.id || `ord-${Date.now()}`;

    const subtotalHT = oData.subtotalHT || Math.round((oData.totalTTC || 0) / 1.18);
    const vatAmount = oData.vatAmount !== undefined ? oData.vatAmount : ((oData.totalTTC || 0) - subtotalHT);
    const computedItemsCost = (oData.items && oData.items.length > 0)
      ? oData.items.reduce((sum, it) => {
          const unitCost = (it.costPrice !== undefined && it.costPrice > 0)
            ? it.costPrice
            : Math.round(it.price * 0.65);
          return sum + (unitCost + (it.freightCost || 0)) * (it.quantity || 1);
        }, 0)
      : 0;
    const totalCostPrice = (oData.totalCostPrice !== undefined && oData.totalCostPrice > 0)
      ? oData.totalCostPrice
      : (computedItemsCost > 0 ? computedItemsCost : Math.round(subtotalHT * 0.65));
    const estimatedMargin = oData.estimatedMargin !== undefined
      ? oData.estimatedMargin
      : (subtotalHT - totalCostPrice);

    const enrichedItems = (oData.items || []).map(it => {
      const prod = this.getProductById(Number(it.productId));
      // Détecter si un variant a été choisi pour renseigner son image et sa description propre
      const prodOptions = (prod?.options || prod?.variants || []) as ProductVariantItem[];
      let matchedVar: ProductVariantItem | undefined;
      if (it.variantName && Array.isArray(prodOptions)) {
        matchedVar = prodOptions.find(
          v => typeof v === 'object' && v.name?.toLowerCase().trim() === it.variantName?.toLowerCase().trim()
        );
      } else if (Array.isArray(prodOptions) && prodOptions.length > 0) {
        matchedVar = prodOptions.find(
          v => typeof v === 'object' && v.name && it.name.toLowerCase().includes(`(${v.name.toLowerCase().trim()})`)
        );
      }
      const resolvedVarName = it.variantName || matchedVar?.name || undefined;
      const resolvedVarSpecs = matchedVar
        ? parseVariantCharacteristicsToSpecs(matchedVar.characteristics, matchedVar.specs)
        : null;
      const resolvedVarDesc =
        it.variantDescription ||
        (resolvedVarName
          ? [
              `Variant choisi : ${resolvedVarName}`,
              matchedVar?.weight ? `Poids : ${matchedVar.weight}` : '',
              resolvedVarSpecs ? formatSpecsToCharacteristicsText(resolvedVarSpecs) : (matchedVar?.characteristics || '')
            ].filter(Boolean).join(' • ')
          : undefined);
      const resolvedImg =
        it.image ||
        it.img ||
        (matchedVar?.image && matchedVar.image.trim() ? matchedVar.image.trim() : undefined) ||
        prod?.img ||
        prod?.image ||
        undefined;

      return {
        ...it,
        variantName: resolvedVarName,
        variantDescription: resolvedVarDesc,
        description: it.description || prod?.description || undefined,
        img: resolvedImg,
        image: resolvedImg,
        supplierId: it.supplierId || prod?.supplierId,
        supplierName: it.supplierName || prod?.supplierName,
        supplierPrice: it.supplierPrice ?? matchedVar?.supplierPrice ?? prod?.supplierPrice,
        supplierCurrency: it.supplierCurrency || prod?.supplierCurrency || 'USD',
        supplierProductUrl: it.supplierProductUrl || prod?.supplierUrl || (prod as any)?.supplierProductUrl
      };
    });

    const resolvedSupplierId = oData.supplierId || enrichedItems.find(i => i.supplierId)?.supplierId;
    const resolvedSupplierName = oData.supplierName || enrichedItems.find(i => i.supplierName)?.supplierName;
    const resolvedWarehouse = this.resolveSupplierAgentWarehouse(resolvedSupplierId || resolvedSupplierName);
    const freightCodeForOrder: 'AIR' | 'SEA' = oData.items?.some(i => i.shippingMethod === 'sea') ? 'SEA' : 'AIR';
    const agentCode =
      oData.agentCode ||
      getEffectiveAgentCodeForWarehouse(resolvedWarehouse, freightCodeForOrder);
    const clientWarehouseId = oData.clientWarehouseId || getClientWarehouseCode({
      customerPhone: oData.customerPhone,
      customerEmail: oData.customerEmail,
      customerName: oData.customerName,
      id
    });

    const newOrder: Order = {
      id,
      orderNumber,
      customerName: oData.customerName || 'Client Sénégal',
      customerCompany: oData.customerCompany || '',
      customerEmail: oData.customerEmail || 'contact@client.sn',
      customerPhone: oData.customerPhone || '+221 77 000 00 00',
      customerAddress: oData.customerAddress || 'Dakar',
      customerCity: oData.customerCity || 'Dakar',
      customerCountry: oData.customerCountry || 'Sénégal',
      ninea: oData.ninea,
      items: enrichedItems,
      subtotalHT,
      freightTotalHT: oData.freightTotalHT,
      vatAmount,
      shippingTotal: oData.shippingTotal || 0,
      totalTTC: oData.totalTTC || 0,
      totalCostPrice,
      estimatedMargin,
      discountAmount: oData.discountAmount,
      discountPercent: oData.discountPercent,
      amountPaid: oData.amountPaid,
      amountDue: oData.amountDue,
      paymentChoice: oData.paymentChoice,
      shippingMethod: oData.shippingMethod,
      docType: oData.docType,
      status: oData.status || (oData.isQuote ? 'Reçue' : 'En attente paiement'),
      paymentMethod: oData.paymentMethod || 'Wave',
      paymentStatus: oData.paymentStatus || 'Non payé',
      isQuote: !!oData.isQuote,
      ethicalContractAccepted: true,
      sourcePlatform: oData.sourcePlatform || 'Chine / International',
      supplierId: resolvedSupplierId,
      supplierName: resolvedSupplierName,
      supplierPoStatus: oData.supplierPoStatus || 'Non transmis',
      notes: oData.notes,
      agentCode,
      agentWarehouseId: oData.agentWarehouseId || resolvedWarehouse?.id,
      clientWarehouseId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.orders.unshift(newOrder);
    this.saveOrders();
    setDoc(doc(db, 'orders', String(newOrder.id)), cleanUndefined(newOrder)).catch(() => {});
    this.logAction(
      oData.customerName || 'Client',
      oData.isQuote ? 'Nouveau Devis' : 'Nouvelle Commande',
      `${oData.isQuote ? 'Demande de devis' : 'Passage de commande'} ${orderNumber} pour un montant de ${newOrder.totalTTC.toLocaleString('fr-FR')} FCFA`,
      'commande'
    );
    this.notifyOrdersChange();
    return newOrder;
  }

  public addOrder(oData: Partial<Order>): Order {
    return this.createOrder(oData);
  }

  public updateOrder(id: string, updates: Partial<Order>, author = 'Admin'): Order | null {
    this.getOrders();
    const index = this.orders.findIndex(o => o.id === id);
    if (index === -1) return null;

    this.orders[index] = {
      ...this.orders[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.saveOrders();
    setDoc(doc(db, 'orders', String(id)), cleanUndefined(this.orders[index])).catch(() => {});
    this.logAction(author, 'Modification Commande / Facture', `Mise à jour commande ${this.orders[index].orderNumber}`, 'commande');
    this.notifyOrdersChange();
    return this.orders[index];
  }

  public updateOrderStatus(id: string, status: Order['status'], author = 'Admin'): Order {
    this.getOrders();
    const index = this.orders.findIndex(o => o.id === id);
    if (index === -1) throw new Error("Commande non trouvée");

    const oldStatus = this.orders[index].status;
    this.orders[index].status = status;
    this.orders[index].updatedAt = new Date().toISOString();
    this.saveOrders();
    setDoc(doc(db, 'orders', String(id)), cleanUndefined(this.orders[index])).catch(() => {});

    this.logAction(author, 'Mise à jour Commande', `Commande ${this.orders[index].orderNumber} passée de "${oldStatus}" à "${status}"`, 'commande');
    this.notifyOrdersChange();
    return this.orders[index];
  }

  public updateOrderPaymentStatus(id: string, paymentStatus: Order['paymentStatus'], author = 'Admin'): Order {
    this.getOrders();
    const index = this.orders.findIndex(o => o.id === id);
    if (index === -1) throw new Error("Commande non trouvée");

    this.orders[index].paymentStatus = paymentStatus;
    if (paymentStatus === 'Payé intégralement' && this.orders[index].status === 'En attente paiement') {
      this.orders[index].status = 'Payée';
    }
    this.orders[index].updatedAt = new Date().toISOString();
    this.saveOrders();
    setDoc(doc(db, 'orders', String(id)), cleanUndefined(this.orders[index])).catch(() => {});

    this.logAction(author, 'Paiement Commande', `Paiement commande ${this.orders[index].orderNumber} mis à jour : "${paymentStatus}"`, 'finance');
    this.notifyOrdersChange();
    return this.orders[index];
  }

  public attachPaydunyaInvoice(orderId: string, token: string, invoiceUrl: string) {
    this.getOrders();
    const index = this.orders.findIndex(o => o.id === orderId || o.orderNumber === orderId);
    if (index === -1) return;
    this.orders[index].paydunyaToken = token;
    this.orders[index].paydunyaInvoiceUrl = invoiceUrl;
    this.orders[index].updatedAt = new Date().toISOString();
    this.saveOrders();
    setDoc(doc(db, 'orders', String(this.orders[index].id)), cleanUndefined(this.orders[index])).catch(() => {});
    this.notifyOrdersChange();
  }

  public confirmPaydunyaPayment(orderIdOrNumberOrToken: string, receiptUrl?: string, isDeposit = false): Order | null {
    this.getOrders();
    const index = this.orders.findIndex(
      o => o.id === orderIdOrNumberOrToken || o.orderNumber === orderIdOrNumberOrToken || o.paydunyaToken === orderIdOrNumberOrToken
    );
    if (index === -1) return null;
    this.orders[index].paymentStatus = isDeposit ? 'Acompte versé' : 'Payé intégralement';
    if (this.orders[index].status === 'En attente paiement' || this.orders[index].status === 'Reçue') {
      this.orders[index].status = 'Payée';
    }
    if (receiptUrl) {
      this.orders[index].paydunyaReceiptUrl = receiptUrl;
    }
    this.orders[index].updatedAt = new Date().toISOString();
    this.saveOrders();
    setDoc(doc(db, 'orders', String(this.orders[index].id)), cleanUndefined(this.orders[index])).catch(() => {});
    this.logAction('PayDunya API', 'Confirmation Paiement PayDunya', `Commande ${this.orders[index].orderNumber} confirmée via PayDunya (${this.orders[index].paymentStatus})`, 'finance');
    this.notifyOrdersChange();
    return this.orders[index];
  }

  // ================= STATISTIQUES FINANCIÈRES =================
  public isOrderFinalizedForFinance(o: Order): boolean {
    if (!o) return false;
    if (o.status === 'Annulée' || o.status === 'En attente paiement') return false;
    if (o.paymentStatus === 'Non payé' && (o.status === 'Reçue' || o.isQuote)) return false;
    return true;
  }

  public purgeUnfinalizedOrders(author = 'Admin'): number {
    const all = this.getOrders();
    const toDelete = all.filter(o => !this.isOrderFinalizedForFinance(o));
    let deletedCount = 0;
    toDelete.forEach(o => {
      if (this.deleteOrder(o.id, author)) {
        deletedCount++;
      }
    });
    return deletedCount;
  }

  public getFinancialStats() {
    const allOrders = this.getOrders();
    // Seules les commandes finalisées (payées, acompte versé ou validées en production/transit/livrées) comptent dans le Chiffre d'Affaires et la Finance
    const completedOrActiveOrders = allOrders.filter(o => this.isOrderFinalizedForFinance(o));
    const unfinalizedOrders = allOrders.filter(o => !this.isOrderFinalizedForFinance(o) && o.status !== 'Annulée');

    // Chiffre d'Affaires Brut (TTC) - Commandes finalisées uniquement
    const grossRevenue = completedOrActiveOrders.reduce((sum, o) => sum + (o.totalTTC || 0), 0);

    // Chiffre d'Affaires Net (HT) - Commandes finalisées uniquement
    const netRevenue = completedOrActiveOrders.reduce((sum, o) => sum + (o.subtotalHT || 0), 0);

    // Chiffre d'Affaires Encaissé
    const collectedRevenue = completedOrActiveOrders
      .filter(o => o.paymentStatus === 'Payé intégralement' || o.paymentStatus === 'Acompte versé')
      .reduce((sum, o) => sum + (o.totalTTC || 0), 0);

    // Montant en attente sur commandes non finalisées (informatif uniquement, hors CA)
    const pendingRevenue = unfinalizedOrders.reduce((sum, o) => sum + (o.totalTTC || 0), 0);

    // Coût d'Achat Marchandises (COGS) - Commandes finalisées uniquement
    const totalCostOfGoods = completedOrActiveOrders.reduce((sum, o) => sum + (o.totalCostPrice || 0), 0);

    // Marge Brute Globale
    const grossProfit = netRevenue - totalCostOfGoods;
    const grossMarginPercent = netRevenue > 0 ? ((grossProfit / netRevenue) * 100).toFixed(1) : '0';

    // TVA collectée (18%)
    const vatCollected = completedOrActiveOrders.reduce((sum, o) => sum + (o.vatAmount || 0), 0);

    // Panier Moyen
    const averageOrderValue = completedOrActiveOrders.length > 0 
      ? Math.round(netRevenue / completedOrActiveOrders.length) 
      : 0;

    // Nombre de commandes finalisées
    const ordersCount = completedOrActiveOrders.length;
    const quotesCount = allOrders.filter(o => o.isQuote).length;

    // Répartition par plateforme (uniquement sur commandes finalisées)
    const platformBreakdown: Record<string, number> = {};
    completedOrActiveOrders.forEach(o => {
      const p = o.sourcePlatform || 'Autre';
      platformBreakdown[p] = (platformBreakdown[p] || 0) + (o.totalTTC || 0);
    });

    return {
      grossRevenue,
      netRevenue,
      collectedRevenue,
      pendingRevenue,
      totalCostOfGoods,
      grossProfit,
      grossMarginPercent,
      vatCollected,
      averageOrderValue,
      ordersCount,
      quotesCount,
      unfinalizedCount: unfinalizedOrders.length,
      platformBreakdown
    };
  }

  // ================= ENTREPÔTS D'AGENTS (AVEC CODE AGENT OU MÉTHODE STANDARD + TARIFS & SERVICES PROPRES) =================
  /**
   * Infère automatiquement par IA / analyse sémantique le pays, la ville et la région d'un entrepôt
   * à partir de son adresse, son libellé et son téléphone.
   * La sélection manuelle de pays (w.country) ne remplace PAS l'IA : elle est utilisée uniquement
   * en secours si l'IA est confuse ou ne trouve pas ces informations dans l'adresse/téléphone.
   */
  public inferWarehouseGeoProfile(w: Partial<AgentWarehouse>): {
    country: string;
    countryKey: string;
    city: string;
    region: 'americas' | 'europe' | 'asia' | 'africa' | 'middle_east';
    aiConfident: boolean;
    usedManualFallback: boolean;
  } {
    // 1. Analyse IA / Sémantique sur l'adresse, la ville, le code postal, le libellé et le téléphone (SANS le champ pays manuel)
    const addressSignals = `${w.name || ''} ${w.address || ''} ${w.city || ''} ${w.postalCode || ''}`.toLowerCase();
    const rawPhone = (w.phone || w.contactPhone || '').replace(/\s+/g, '');

    const phoneIsUsaCan = /^(\+1|001)/.test(rawPhone);
    const phoneIsFrance = /^(\+33|0033)/.test(rawPhone);
    const phoneIsChina = /^(\+86|0086)/.test(rawPhone);
    const phoneIsGermany = /^(\+49|0049)/.test(rawPhone);
    const phoneIsItaly = /^(\+39|0039)/.test(rawPhone);
    const phoneIsSpain = /^(\+34|0034)/.test(rawPhone);
    const phoneIsUk = /^(\+44|0044)/.test(rawPhone);
    const phoneIsBelgium = /^(\+32|0032)/.test(rawPhone);
    const phoneIsTurkey = /^(\+90|0090)/.test(rawPhone);
    const phoneIsUae = /^(\+971|00971)/.test(rawPhone);
    const phoneIsSenegal = /^(\+221|00221)/.test(rawPhone);
    const phoneIsMorocco = /^(\+212|00212)/.test(rawPhone);

    if (
      /\b(usa|états-unis|etats-unis|united\s+states|miami|doral|new\s*york|chicago|houston|dallas|los\s*angeles|atlanta|newark|florida|texas|california|new\s*jersey|illinois)\b/i.test(addressSignals) ||
      /\b(fl|ny|tx|ca|nj|il|ga)\s+\d{5}\b/i.test(addressSignals) ||
      phoneIsUsaCan
    ) {
      const city =
        w.city ||
        (/doral|miami/i.test(addressSignals) ? 'Miami' : /new\s*york|brooklyn|queens/i.test(addressSignals) ? 'New York' : /houston/i.test(addressSignals) ? 'Houston' : /chicago/i.test(addressSignals) ? 'Chicago' : 'Miami');
      return { country: 'États-Unis', countryKey: 'usa', city, region: 'americas', aiConfident: true, usedManualFallback: false };
    }

    if (/\b(canada|montréal|montreal|toronto|vancouver|québec|quebec|ontario)\b/i.test(addressSignals)) {
      const city = w.city || (/toronto/i.test(addressSignals) ? 'Toronto' : 'Montréal');
      return { country: 'Canada', countryKey: 'canada', city, region: 'americas', aiConfident: true, usedManualFallback: false };
    }

    if (
      /\b(france|paris|roissy|tremblay|lyon|marseille|lille|le\s*havre|bordeaux|nantes|toulouse|strasbourg|rungis|orly|93290|75\d{3}|93\d{3}|94\d{3}|95\d{3}|69\d{3}|13\d{3})\b/i.test(addressSignals) ||
      phoneIsFrance
    ) {
      const city =
        w.city ||
        (/roissy|tremblay/i.test(addressSignals) ? 'Paris / Roissy' : /lyon/i.test(addressSignals) ? 'Lyon' : /marseille/i.test(addressSignals) ? 'Marseille' : /le\s*havre/i.test(addressSignals) ? 'Le Havre' : 'Paris');
      return { country: 'France', countryKey: 'france', city, region: 'europe', aiConfident: true, usedManualFallback: false };
    }

    if (/\b(allemagne|germany|deutschland|hamburg|hambourg|frankfurt|francfort|berlin|munich|münchen|köln)\b/i.test(addressSignals) || phoneIsGermany) {
      return { country: 'Allemagne', countryKey: 'allemagne', city: w.city || 'Francfort', region: 'europe', aiConfident: true, usedManualFallback: false };
    }

    if (/\b(italie|italy|italia|milan|milano|rome|roma|genova|napoli|bologna)\b/i.test(addressSignals) || phoneIsItaly) {
      return { country: 'Italie', countryKey: 'italie', city: w.city || 'Milan', region: 'europe', aiConfident: true, usedManualFallback: false };
    }

    if (/\b(espagne|spain|españa|madrid|barcelone|barcelona|valencia|bilbao)\b/i.test(addressSignals) || phoneIsSpain) {
      return { country: 'Espagne', countryKey: 'espagne', city: w.city || 'Madrid', region: 'europe', aiConfident: true, usedManualFallback: false };
    }

    if (/\b(royaume-uni|united\s+kingdom|\buk\b|england|london|londres|manchester|birmingham|felixstowe)\b/i.test(addressSignals) || phoneIsUk) {
      return { country: 'Royaume-Uni', countryKey: 'uk', city: w.city || 'Londres', region: 'europe', aiConfident: true, usedManualFallback: false };
    }

    if (/\b(belgique|belgium|bruxelles|brussels|anvers|antwerp|liège|liege)\b/i.test(addressSignals) || phoneIsBelgium) {
      return { country: 'Belgique', countryKey: 'belgique', city: w.city || 'Anvers', region: 'europe', aiConfident: true, usedManualFallback: false };
    }

    if (/\b(turquie|turkey|türkiye|istanbul|izmir|ankara|mersin|fatih|aksaray)\b/i.test(addressSignals) || phoneIsTurkey) {
      return { country: 'Turquie', countryKey: 'turquie', city: w.city || 'Istanbul', region: 'europe', aiConfident: true, usedManualFallback: false };
    }

    if (/\b(dubaï|dubai|émirats|emirates|uae|abu\s*dhabi|sharjah|deira|jebel\s*ali)\b/i.test(addressSignals) || phoneIsUae) {
      return { country: 'Émirats Arabes Unis', countryKey: 'uae', city: w.city || 'Dubaï', region: 'middle_east', aiConfident: true, usedManualFallback: false };
    }

    if (/\b(sénégal|senegal|dakar|pikine|diamniadio|thiès)\b/i.test(addressSignals) || phoneIsSenegal) {
      return { country: 'Sénégal', countryKey: 'senegal', city: w.city || 'Dakar', region: 'africa', aiConfident: true, usedManualFallback: false };
    }

    if (/\b(maroc|morocco|casablanca|tanger|rabat)\b/i.test(addressSignals) || phoneIsMorocco) {
      return { country: 'Maroc', countryKey: 'maroc', city: w.city || 'Casablanca', region: 'africa', aiConfident: true, usedManualFallback: false };
    }

    if (
      /\b(chine|china|guangzhou|shenzhen|yiwu|shanghai|beijing|ningbo|foshan|dongguan|hong\s*kong|guangdong|zhejiang|baiyun|baoan)\b/i.test(addressSignals) ||
      phoneIsChina
    ) {
      const city =
        w.city ||
        (/shenzhen/i.test(addressSignals) ? 'Shenzhen' : /yiwu/i.test(addressSignals) ? 'Yiwu' : /shanghai/i.test(addressSignals) ? 'Shanghai' : /foshan/i.test(addressSignals) ? 'Foshan' : 'Guangzhou');
      return { country: 'Chine', countryKey: 'chine', city, region: 'asia', aiConfident: true, usedManualFallback: false };
    }

    // 2. Si l'IA / l'analyseur d'adresse et de téléphone est confus ou ne trouve pas d'indices clairs,
    // on utilise alors la sélection manuelle de pays (w.country) en secours !
    const fallbackCountry = w.country && w.country.trim() ? resolveCanonicalCountryName(w.country) : '';
    if (fallbackCountry) {
      const fbLower = fallbackCountry.toLowerCase();
      const fbRegion: 'americas' | 'europe' | 'asia' | 'africa' | 'middle_east' =
        /états-unis|etats-unis|canada|mexique|brésil|argentine|colombie|chili|pérou/i.test(fbLower)
          ? 'americas'
          : /france|allemagne|italie|espagne|royaume-uni|belgique|pays-bas|suisse|pologne|suède|autriche|portugal|turquie/i.test(fbLower)
            ? 'europe'
            : /émirats|arabie|qatar|koweït|oman|bahreïn/i.test(fbLower)
              ? 'middle_east'
              : /sénégal|maroc|côte d'ivoire|mali|guinée|cameroun|gabon|congo|bénin|togo|burkina|niger|mauritanie|gambie|nigeria|ghana|afrique/i.test(fbLower)
                ? 'africa'
                : 'asia';
      return {
        country: fallbackCountry,
        countryKey: fbLower,
        city: w.city || fallbackCountry,
        region: fbRegion,
        aiConfident: false,
        usedManualFallback: true
      };
    }

    return {
      country: 'Chine',
      countryKey: 'chine',
      city: w.city || 'Guangzhou',
      region: 'asia',
      aiConfident: false,
      usedManualFallback: false
    };
  }

  /**
   * Détecte par IA / analyse sémantique le pays d'un fournisseur ou d'un produit à partir de ses informations
   * (URL, nom, téléphone, marque, plateforme). La sélection manuelle de pays (fallbackCountry) n'est utilisée
   * que si l'IA ne trouve pas ou est confuse.
   */
  public inferEntityCountryWithFallback(params: {
    name?: string;
    brand?: string;
    platform?: string;
    url?: string;
    phone?: string;
    email?: string;
    fallbackCountry?: string;
  }): {
    country: string;
    aiConfident: boolean;
    usedManualFallback: boolean;
    reason: string;
  } {
    const rawPhone = (params.phone || '').replace(/\s+/g, '');
    const textSignals = [params.url, params.name, params.brand, params.email, params.platform !== 'Manuel' ? params.platform : '']
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (/^(\+1|001)/.test(rawPhone) || /\b(grainger|mcmaster|raptor|usa|united\s+states|états-unis|etats-unis|miami|new\s*york|chicago|texas|california)\b/i.test(textSignals)) {
      return { country: 'États-Unis', aiConfident: true, usedManualFallback: false, reason: 'Détecté automatiquement par l\'IA (USA)' };
    }
    if (/^(\+33|0033)/.test(rawPhone) || /\b(manutan|france|paris|roissy|lyon|marseille|\.fr\b)\b/i.test(textSignals)) {
      return { country: 'France', aiConfident: true, usedManualFallback: false, reason: 'Détecté automatiquement par l\'IA (France)' };
    }
    if (/^(\+49|0049)/.test(rawPhone) || /\b(allemagne|germany|deutschland|siemens|bosch|festo|hamburg|frankfurt|\.de\b)\b/i.test(textSignals)) {
      return { country: 'Allemagne', aiConfident: true, usedManualFallback: false, reason: 'Détecté automatiquement par l\'IA (Allemagne)' };
    }
    if (/^(\+39|0039)/.test(rawPhone) || /\b(italie|italy|italia|milan|roma|pedrollo|\.it\b)\b/i.test(textSignals)) {
      return { country: 'Italie', aiConfident: true, usedManualFallback: false, reason: 'Détecté automatiquement par l\'IA (Italie)' };
    }
    if (/^(\+44|0044)/.test(rawPhone) || /\b(royaume-uni|united\s+kingdom|\buk\b|rs-online|rs\s*components|farnell|\.co\.uk\b)\b/i.test(textSignals)) {
      return { country: 'Royaume-Uni', aiConfident: true, usedManualFallback: false, reason: 'Détecté automatiquement par l\'IA (Royaume-Uni)' };
    }
    if (/^(\+90|0090)/.test(rawPhone) || /\b(turquie|turkey|türkiye|istanbul|ankara|\.tr\b)\b/i.test(textSignals)) {
      return { country: 'Turquie', aiConfident: true, usedManualFallback: false, reason: 'Détecté automatiquement par l\'IA (Turquie)' };
    }
    if (/^(\+971|00971)/.test(rawPhone) || /\b(dubaï|dubai|émirats|emirates|uae)\b/i.test(textSignals)) {
      return { country: 'Émirats Arabes Unis', aiConfident: true, usedManualFallback: false, reason: 'Détecté automatiquement par l\'IA (Émirats Arabes Unis)' };
    }
    if (/^(\+221|00221)/.test(rawPhone) || /\b(sénégal|senegal|dakar|\.sn\b)\b/i.test(textSignals)) {
      return { country: 'Sénégal', aiConfident: true, usedManualFallback: false, reason: 'Détecté automatiquement par l\'IA (Sénégal)' };
    }
    if (/^(\+86|0086)/.test(rawPhone) || /\b(alibaba|1688|made-in-china|aliexpress|chine|china|guangzhou|shenzhen|yiwu|shanghai|ningbo|foshan|dongguan|\.cn\b)\b/i.test(textSignals)) {
      return { country: 'Chine', aiConfident: true, usedManualFallback: false, reason: 'Détecté automatiquement par l\'IA (Chine)' };
    }

    // Si l'IA est confuse ou ne trouve pas d'indice dans les données, on utilise alors la sélection manuelle de pays !
    if (params.fallbackCountry && params.fallbackCountry.trim()) {
      const canonical = resolveCanonicalCountryName(params.fallbackCountry);
      return {
        country: canonical,
        aiConfident: false,
        usedManualFallback: true,
        reason: `Secours manuel utilisé (${canonical}) — l'IA n'avait pas trouvé d'indice explicite`
      };
    }

    return {
      country: '',
      aiConfident: false,
      usedManualFallback: false,
      reason: 'Information de pays introuvable par l\'IA — sélectionnez un pays de secours dans la liste'
    };
  }

  private normalizeWarehouse(w: AgentWarehouse): AgentWarehouse {
    const fName = w.firstName ?? w.recipientFirstName ?? '';
    const lName = w.lastName ?? w.recipientLastName ?? '';
    const comp = w.companyName ?? w.recipientCompany ?? '';
    const ph = w.phone ?? w.contactPhone ?? '';
    const em = w.email ?? w.contactEmail ?? '';
    const nt = w.notes ?? w.instructions ?? '';
    const isCodeMode = w.identificationMode === 'agent_code' && Boolean(w.agentCode?.trim());

    // L'IA / analyseur d'adresse et de téléphone intervient en premier ; le champ w.country ne sert que si l'IA est confuse ou ne trouve pas
    const geo = this.inferWarehouseGeoProfile(w);
    const isUsa = geo.region === 'americas';
    const isEurope = geo.region === 'europe';

    const defaultAirRate = isUsa ? 8500 : isEurope ? 5500 : 7000;
    const defaultSeaRate = isUsa ? 2200 : isEurope ? 1500 : 1800;
    const defaultSeaCbm = isUsa ? 260000 : isEurope ? 195000 : 240000;
    const defaultAirDur = isUsa ? '7 à 14 jours' : isEurope ? '5 à 8 jours' : '7 à 12 jours';
    const defaultSeaDur = isUsa ? '25 à 40 jours' : isEurope ? '18 à 28 jours' : '35 à 50 jours';
    // Si l'IA a détecté avec certitude le pays depuis l'adresse/téléphone, on l'utilise ; sinon on utilise le pays manuel de secours
    const defaultCountry = geo.aiConfident
      ? geo.country
      : (w.country && w.country.trim() ? resolveCanonicalCountryName(w.country) : geo.country);
    const defaultCity = w.city && w.city.trim() ? w.city.trim() : geo.city;
    const globalSupported = siteSettingsService.getSettings()?.supportedDeliveryCountries || DEFAULT_SUPPORTED_DELIVERY_COUNTRIES;
    const resolvedSupportedCountries = Array.isArray(w.supportedDeliveryCountries) && w.supportedDeliveryCountries.length > 0
      ? Array.from(new Set(w.supportedDeliveryCountries.map(c => resolveCanonicalCountryName(c)).filter(Boolean)))
      : [...globalSupported];

    return {
      ...w,
      identificationMode: w.identificationMode || (w.agentCode ? 'agent_code' : 'standard_address'),
      hasAgentCode: isCodeMode,
      firstName: fName,
      lastName: lName,
      companyName: comp,
      phone: ph,
      email: em,
      notes: nt,
      recipientFirstName: fName,
      recipientLastName: lName,
      recipientCompany: comp,
      contactPhone: ph,
      contactEmail: em,
      instructions: nt,
      country: defaultCountry,
      city: defaultCity,
      offersAirFreight: w.offersAirFreight !== false,
      offersSeaFreight: w.offersSeaFreight !== false,
      airFreightPerKgXOF: Number(w.airFreightPerKgXOF) > 0 ? Number(w.airFreightPerKgXOF) : defaultAirRate,
      airFreightMinXOF: Number(w.airFreightMinXOF) > 0 ? Number(w.airFreightMinXOF) : defaultAirRate,
      airFreightDurationDays: w.airFreightDurationDays || defaultAirDur,
      seaFreightPerKgXOF: Number(w.seaFreightPerKgXOF) > 0 ? Number(w.seaFreightPerKgXOF) : defaultSeaRate,
      seaFreightPerCbmXOF: Number(w.seaFreightPerCbmXOF) > 0 ? Number(w.seaFreightPerCbmXOF) : defaultSeaCbm,
      seaFreightMinXOF: Number(w.seaFreightMinXOF) > 0 ? Number(w.seaFreightMinXOF) : 8000,
      seaFreightDurationDays: w.seaFreightDurationDays || defaultSeaDur,
      domesticDeliveryFeeUSD: w.domesticDeliveryFeeUSD !== undefined ? Number(w.domesticDeliveryFeeUSD) : (isUsa ? 25 : isEurope ? 20 : 15),
      supportedDeliveryCountries: resolvedSupportedCountries
    };
  }

  /**
   * Résout l'entrepôt le plus proche d'un produit/fournisseur et calcule immédiatement
   * les services disponibles (Aérien / Maritime), les tarifs propres à cet entrepôt
   * (en ignorant toujours les paramètres système tant qu'un entrepôt est assigné)
   * ainsi que les pays pris en charge pour la livraison client.
   */
  public getProductWarehouseAndFreight(
    productOrDraft?: Partial<ExtendedProduct> | null,
    activeWeightKg?: number
  ): {
    warehouse: AgentWarehouse;
    hasAssignedWarehouse: boolean;
    supplier?: Supplier;
    matchReason: string;
    offersAirFreight: boolean;
    offersSeaFreight: boolean;
    airFreightCost: number;
    seaFreightCost: number;
    airRatePerKg: number;
    seaRatePerKg: number;
    airDuration: string;
    seaDuration: string;
    defaultClientMethod: 'sea' | 'air';
    supportedDeliveryCountries: string[];
    systemFreightEnabled: boolean;
  } {
    const p = productOrDraft || {};
    const settings = siteSettingsService.getSettings();
    const sysFreightEnabled = settings?.systemFreightEnabled !== false;
    const globalSupportedCountries = settings?.supportedDeliveryCountries && settings.supportedDeliveryCountries.length > 0
      ? settings.supportedDeliveryCountries
      : DEFAULT_SUPPORTED_DELIVERY_COUNTRIES;

    const supMatch = this.findAdequateSupplierForProduct(p);
    const resolvedSup = (p.supplierId ? this.getSupplierById(p.supplierId) : undefined) || supMatch.supplier;

    const whMatch = this.findClosestAgentWarehouse({
      warehouseId: p.agentWarehouseId || resolvedSup?.agentWarehouseId,
      country: resolvedSup?.country || p.origin,
      platform: p.sourcePlatform || resolvedSup?.platform,
      supplierUrl: p.supplierUrl || resolvedSup?.websiteUrl,
      supplierName: p.supplierName || resolvedSup?.name,
      currency: p.supplierCurrency || resolvedSup?.currency
    });
    const wh = whMatch.warehouse;
    const hasAssignedWarehouse = Boolean(wh && wh.id && wh.id !== 'aw-unconfigured');

    const weight = activeWeightKg && activeWeightKg > 0
      ? activeWeightKg
      : (parseWeightToKg(p.weight) || 1.0);

    // Tant qu'un entrepôt est assigné au fournisseur ou au produit, les paramètres de fret système sont TOUJOURS ignorés.
    // Si aucun entrepôt n'est assigné, ce sont les vrais paramètres de fret par défaut du système (siteSettings) qui s'appliquent.
    const offersAir = hasAssignedWarehouse ? (wh.offersAirFreight !== false) : sysFreightEnabled;
    const offersSea = hasAssignedWarehouse ? (wh.offersSeaFreight !== false) : sysFreightEnabled;

    const airRatePerKg = hasAssignedWarehouse
      ? (wh.airFreightPerKgXOF ?? settings?.airFreightPerKg ?? 7000)
      : (sysFreightEnabled ? (settings?.airFreightPerKg ?? 7000) : 0);
    const airMin = hasAssignedWarehouse
      ? (wh.airFreightMinXOF ?? airRatePerKg)
      : (sysFreightEnabled ? (settings?.airFreightMin ?? airRatePerKg) : 0);
    const seaRatePerKg = hasAssignedWarehouse
      ? (wh.seaFreightPerKgXOF ?? settings?.seaFreightPerKg ?? 1800)
      : (sysFreightEnabled ? (settings?.seaFreightPerKg ?? 1800) : 0);
    const seaMin = hasAssignedWarehouse
      ? (wh.seaFreightMinXOF ?? settings?.seaFreightMin ?? 8000)
      : (sysFreightEnabled ? (settings?.seaFreightMin ?? 8000) : 0);

    const autoAirCost = (hasAssignedWarehouse || sysFreightEnabled) ? Math.max(airMin, Math.round(weight * airRatePerKg)) : 0;
    const autoSeaCost = (hasAssignedWarehouse || sysFreightEnabled) ? Math.max(seaMin, Math.round(weight * seaRatePerKg)) : 0;

    const airFreightCost = (p.customAirFreightCost !== undefined && p.customAirFreightCost !== null && Number(p.customAirFreightCost) > 0)
      ? Math.round(Number(p.customAirFreightCost))
      : autoAirCost;
    const seaFreightCost = (p.customSeaFreightCost !== undefined && p.customSeaFreightCost !== null && Number(p.customSeaFreightCost) > 0)
      ? Math.round(Number(p.customSeaFreightCost))
      : autoSeaCost;

    let defaultClientMethod: 'sea' | 'air' = 'sea';
    if (p.defaultShippingMethod === 'air' && offersAir) {
      defaultClientMethod = 'air';
    } else if (p.defaultShippingMethod === 'sea' && offersSea) {
      defaultClientMethod = 'sea';
    } else if (!offersSea && offersAir) {
      defaultClientMethod = 'air';
    } else if (offersSea && !offersAir) {
      defaultClientMethod = 'sea';
    } else {
      defaultClientMethod = weight <= 5 ? 'air' : 'sea';
    }

    const supportedDeliveryCountries =
      hasAssignedWarehouse && Array.isArray(wh.supportedDeliveryCountries) && wh.supportedDeliveryCountries.length > 0
        ? wh.supportedDeliveryCountries
        : globalSupportedCountries;

    return {
      warehouse: wh,
      hasAssignedWarehouse,
      supplier: resolvedSup,
      matchReason: whMatch.matchReason,
      offersAirFreight: offersAir,
      offersSeaFreight: offersSea,
      airFreightCost,
      seaFreightCost,
      airRatePerKg,
      seaRatePerKg,
      airDuration: hasAssignedWarehouse ? (wh.airFreightDurationDays || '7 à 12 jours') : (settings?.airFreightDuration || '8 à 15 jours'),
      seaDuration: hasAssignedWarehouse ? (wh.seaFreightDurationDays || '30 à 45 jours') : (settings?.seaFreightDuration || '20 à 40 jours'),
      defaultClientMethod,
      supportedDeliveryCountries,
      systemFreightEnabled: sysFreightEnabled
    };
  }

  private saveAgentWarehouses() {
    try {
      localStorage.setItem(STORAGE_KEYS.AGENT_WAREHOUSES, JSON.stringify(this.agentWarehouses));
    } catch (e) {
      console.error('Erreur sauvegarde entrepôts agents:', e);
    }
  }

  private notifyAgentWarehousesChange() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('agent_warehouses_updated'));
    }
    this.listeners.forEach(fn => {
      try {
        fn();
      } catch (e) {
        console.error(e);
      }
    });
  }

  private syncAgentWarehousesFromFirestore() {
    try {
      onSnapshot(
        collection(db, 'agent_warehouses'),
        snapshot => {
          const deletedWh = this.getDeletedRegistry().agentWarehouses || [];
          const list: AgentWarehouse[] = [];
          snapshot.forEach(snapDoc => {
            const data = snapDoc.data() as AgentWarehouse;
            const whId = String(data.id || snapDoc.id);
            if (
              LEGACY_MOCK_WAREHOUSE_IDS.includes(whId) ||
              LEGACY_MOCK_WAREHOUSE_IDS.includes(snapDoc.id) ||
              deletedWh.includes(whId) ||
              deletedWh.includes(snapDoc.id)
            ) {
              deleteDoc(doc(db, 'agent_warehouses', snapDoc.id)).catch(() => {});
              return;
            }
            list.push(this.normalizeWarehouse({ ...data, id: whId }));
          });
          if (list.length > 0) {
            if (!list.some(w => w.isDefault)) {
              list[0].isDefault = true;
            }
            this.agentWarehouses = list;
            this.saveAgentWarehouses();
            this.notifyAgentWarehousesChange();
          } else {
            this.agentWarehouses = [];
            this.saveAgentWarehouses();
            this.notifyAgentWarehousesChange();
          }
        },
        error => {
          if (error?.code !== 'unavailable' && !error?.message?.includes('offline')) {
            console.warn('Synchronisation entrepôts agents:', error.message || error);
          }
        }
      );
    } catch (e) {
      console.warn('Init listener agent_warehouses:', e);
    }
  }

  public getAgentWarehouses(): AgentWarehouse[] {
    const deletedWh = this.getDeletedRegistry().agentWarehouses || [];
    if (this.agentWarehouses.length === 0) {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.AGENT_WAREHOUSES);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.agentWarehouses = parsed
              .filter(
                (w: AgentWarehouse) =>
                  w &&
                  w.id &&
                  !LEGACY_MOCK_WAREHOUSE_IDS.includes(String(w.id)) &&
                  !deletedWh.includes(String(w.id))
              )
              .map((w: AgentWarehouse) => this.normalizeWarehouse(w));
          }
        }
      } catch {}
    }
    this.agentWarehouses = this.agentWarehouses.filter(
      w => w && w.id && !LEGACY_MOCK_WAREHOUSE_IDS.includes(String(w.id)) && !deletedWh.includes(String(w.id))
    );
    return this.agentWarehouses.map(w => this.normalizeWarehouse(w));
  }

  public getDefaultAgentWarehouse(): AgentWarehouse {
    const list = this.getAgentWarehouses();
    return list.find(w => w.isDefault) || list[0] || getSystemDefaultWarehouseFallback();
  }

  /**
   * Détermine l'entrepôt d'agent le plus proche géographiquement :
   * 1. L'IA analyse en priorité les signaux réels (URL, nom du fournisseur, adresse, téléphone, plateforme).
   * 2. La sélection manuelle de pays (côté fournisseur, produit ou entrepôt) ne remplace PAS l'IA :
   *    elle n'est utilisée qu'en secours si l'IA est confuse ou ne trouve pas ces informations.
   */
  public findClosestAgentWarehouse(params: {
    warehouseId?: string;
    country?: string;
    city?: string;
    platform?: string;
    origin?: string;
    supplierUrl?: string;
    supplierName?: string;
    supplierPhone?: string;
    currency?: string;
  }): { warehouse: AgentWarehouse; matchReason: string; score: number } {
    const warehouses = this.getAgentWarehouses();
    const defaultWh = this.getDefaultAgentWarehouse();
    if (warehouses.length === 0) {
      return {
        warehouse: getSystemDefaultWarehouseFallback(),
        matchReason: 'Paramètres de fret par défaut du système (Aucun entrepôt configuré)',
        score: 0
      };
    }

    // 1. Si un ID d'entrepôt valide est explicitement fourni (ou résolu par Gemini IA lors de l'import)
    if (params.warehouseId) {
      const explicit = warehouses.find(w => w.id === params.warehouseId);
      if (explicit) {
        return {
          warehouse: explicit,
          matchReason: `Entrepôt assigné (${explicit.country || explicit.city || explicit.name})`,
          score: 120
        };
      }
    }

    // 2. Détection IA prioritaire du pays du produit/fournisseur, avec repli sur le pays sélectionné manuellement
    // uniquement si l'IA est confuse ou ne trouve pas d'indice dans l'URL/nom/téléphone/plateforme
    const manualFallbackCountry = params.country || params.origin || '';
    const entityGeo = this.inferEntityCountryWithFallback({
      name: params.supplierName,
      platform: params.platform,
      url: params.supplierUrl,
      phone: params.supplierPhone,
      fallbackCountry: manualFallbackCountry
    });

    const resolvedTargetCountry = entityGeo.country;
    const rawSignals = [
      entityGeo.aiConfident ? entityGeo.country : '',
      params.city,
      params.platform,
      params.supplierUrl,
      params.supplierName,
      !entityGeo.aiConfident ? manualFallbackCountry : ''
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const detectRegion = (text: string, curr?: string): 'asia' | 'europe' | 'americas' | 'africa' | 'unknown' => {
      if (
        /\b(états-unis|etats-unis|usa|united\s+states|amérique|amerique|canada|mexique|miami|new\s*york|chicago|texas|california|grainger|mcmaster|raptor|home\s*depot)\b/i.test(
          text
        )
      ) {
        return 'americas';
      }
      if (
        /\b(france|europe|allemagne|germany|italie|italy|espagne|spain|royaume-uni|uk|belgique|pays-bas|netherlands|suisse|switzerland|suède|sweden|pologne|autriche|paris|roissy|lyon|marseille|manutan|rs-online|rs\s*components|conrad|farnell)\b/i.test(
          text
        ) ||
        curr === 'EUR'
      ) {
        return 'europe';
      }
      if (
        /\b(chine|china|asie|asia|guangzhou|shenzhen|yiwu|shanghai|beijing|ningbo|foshan|dongguan|hong\s*kong|taïwan|taiwan|japon|japan|corée|korea|inde|india|vietnam|turquie|alibaba|aliexpress|1688|made-in-china|taobao)\b/i.test(
          text
        ) ||
        curr === 'CNY'
      ) {
        return 'asia';
      }
      if (/\b(sénégal|senegal|dakar|afrique|maroc|côte\s*d'ivoire|abidjan)\b/i.test(text) || curr === 'XOF') {
        return 'africa';
      }
      return 'unknown';
    };

    const targetRegion = detectRegion(rawSignals, params.currency);

    let bestWh = defaultWh;
    let bestScore = -1;
    let bestReason = `Entrepôt par défaut (${defaultWh.country || defaultWh.city || defaultWh.name})`;

    for (const wh of warehouses) {
      let score = 0;
      let reason = '';
      // inferWarehouseGeoProfile analyse d'abord l'adresse/téléphone/nom par IA et n'utilise wh.country que si l'IA est confuse
      const whGeo = this.inferWarehouseGeoProfile(wh);
      const whEffectiveCountry = whGeo.country;
      const whRegion = whGeo.region === 'middle_east' ? 'asia' : whGeo.region;

      // 1. RÈGLE STRICTE ÉTAPE 1 : Au plus proche possible (même ville puis même pays)
      let isExactCity = false;
      let isExactCountry = false;

      // Ville directe (au plus proche possible)
      if (params.city && (whGeo.city.toLowerCase().includes(params.city.toLowerCase().trim()) || (wh.address || '').toLowerCase().includes(params.city.toLowerCase().trim()))) {
        score += 140;
        isExactCity = true;
        reason = `Entrepôt au plus proche : même ville (${whGeo.city})`;
      }

      // Pays direct (au plus proche possible)
      if (resolvedTargetCountry && areCountriesMatching(resolvedTargetCountry, whEffectiveCountry)) {
        score += 120;
        isExactCountry = true;
        const matchedCanonical = resolveCanonicalCountryName(whEffectiveCountry);
        reason = isExactCity 
          ? `Entrepôt au plus proche (${matchedCanonical} — ${whGeo.city})`
          : `Entrepôt au plus proche dans le même pays (${matchedCanonical})`;
      } else if (
        manualFallbackCountry &&
        areCountriesMatching(manualFallbackCountry, wh.country || whEffectiveCountry)
      ) {
        score += 100;
        isExactCountry = true;
        const matchedCanonical = resolveCanonicalCountryName(wh.country || whEffectiveCountry);
        reason = `Entrepôt au plus proche dans le pays (${matchedCanonical})`;
      }

      // 2. RÈGLE STRICTE ÉTAPE 2 : Recours dans le même continent si aucun entrepôt dans le pays exact
      if (!isExactCountry && targetRegion !== 'unknown' && whRegion === targetRegion) {
        score += 70;
        const regionLabel =
          targetRegion === 'americas'
            ? 'Hub Amérique du Nord'
            : targetRegion === 'europe'
              ? 'Hub Europe'
              : targetRegion === 'asia'
                ? 'Hub Asie'
                : 'Hub Afrique de l’Ouest';
        reason = `Recours sur le même continent (${regionLabel} : ${whEffectiveCountry || whGeo.city || wh.name})`;
      }

      if (wh.isDefault) {
        score += 5;
      }

      if (score > bestScore) {
        bestScore = score;
        bestWh = wh;
        bestReason = reason || `Entrepôt par défaut (${whEffectiveCountry || whGeo.city || wh.name})`;
      }
    }

    return {
      warehouse: bestWh,
      matchReason: bestReason,
      score: Math.max(0, bestScore)
    };
  }

  /**
   * Trouve l'entrepôt le plus proche sur le continent prenant en charge le pays de livraison choisi par le client dans le panier.
   * Si le pays de destination change, bascule intégralement l'entrepôt de référence du panier.
   */
  public findClosestContinentalWarehouseForDestination(
    destinationCountry: string,
    currentWarehouse?: AgentWarehouse,
    cartItems?: any[]
  ): { warehouse: AgentWarehouse; matchReason: string; switched: boolean } {
    const warehouses = this.getAgentWarehouses();
    if (warehouses.length === 0) {
      return {
        warehouse: currentWarehouse || getSystemDefaultWarehouseFallback(),
        matchReason: 'Paramètres système par défaut',
        switched: false
      };
    }

    const cleanDest = (destinationCountry || 'Sénégal').trim();

    // 1. Vérifie si l'entrepôt actuel prend déjà en charge ce pays de livraison
    const whSupportsCountry = (wh: AgentWarehouse, dest: string): boolean => {
      const list = wh.supportedDeliveryCountries;
      if (!list || list.length === 0) return true; // Sans restriction = prend tout en charge
      return list.some(c => areCountriesMatching(c, dest) || /toutes destinations|tous pays|monde/i.test(c));
    };

    if (currentWarehouse && whSupportsCountry(currentWarehouse, cleanDest)) {
      return {
        warehouse: currentWarehouse,
        matchReason: `Entrepôt conservé (${currentWarehouse.name} dessert ${cleanDest})`,
        switched: false
      };
    }

    // 2. Détermine le continent d'origine de référence des articles du panier ou de l'entrepôt actuel
    let referenceRegion = 'americas';
    if (currentWarehouse) {
      const g = this.inferWarehouseGeoProfile(currentWarehouse);
      referenceRegion = g.region;
    } else if (cartItems && cartItems.length > 0) {
      const firstItem = cartItems[0];
      const match = this.findClosestAgentWarehouse({
        country: firstItem.origin || firstItem.supplierCountry,
        origin: firstItem.origin
      });
      const g = this.inferWarehouseGeoProfile(match.warehouse);
      referenceRegion = g.region;
    }

    // 3. Filtre les entrepôts qui prennent en charge ce pays de destination
    const eligibleWarehouses = warehouses.filter(wh => whSupportsCountry(wh, cleanDest));

    if (eligibleWarehouses.length === 0) {
      // Aucun entrepôt ne restreint ou autorise explicitement : garder le meilleur disponible
      return {
        warehouse: currentWarehouse || this.getDefaultAgentWarehouse(),
        matchReason: `Entrepôt par défaut (Dessert ${cleanDest})`,
        switched: false
      };
    }

    // 4. Parmi les entrepôts éligibles, chercher en priorité sur le même continent (au plus proche)
    const sameContinentWh = eligibleWarehouses.find(wh => {
      const g = this.inferWarehouseGeoProfile(wh);
      return g.region === referenceRegion;
    });

    if (sameContinentWh) {
      return {
        warehouse: sameContinentWh,
        matchReason: `Entrepôt le plus proche sur le continent pour ${cleanDest} (${sameContinentWh.name} — ${sameContinentWh.country || sameContinentWh.city})`,
        switched: !currentWarehouse || currentWarehouse.id !== sameContinentWh.id
      };
    }

    // 5. Sinon le premier entrepôt éligible le plus proche
    const bestFallbackWh = eligibleWarehouses[0];
    return {
      warehouse: bestFallbackWh,
      matchReason: `Entrepôt adapté pour ${cleanDest} (${bestFallbackWh.name} — ${bestFallbackWh.country || bestFallbackWh.city})`,
      switched: !currentWarehouse || currentWarehouse.id !== bestFallbackWh.id
    };
  }

  /**
   * Analyse intelligente du rapport entre un produit et les fournisseurs enregistrés
   * pour identifier et classer le(s) fournisseur(s) le(s) plus adéquat(s).
   */
  public findAdequateSupplierForProduct(productData: {
    id?: number;
    name?: string;
    brand?: string;
    category?: string;
    origin?: string;
    sourcePlatform?: string;
    supplierId?: string;
    supplierName?: string;
    supplierUrl?: string;
    supplierCurrency?: string;
  }): {
    supplier?: Supplier;
    matchReason: string;
    score: number;
    rankedSuppliers: Array<{ supplier: Supplier; score: number; reason: string }>;
  } {
    const suppliers = this.getSuppliers();
    if (suppliers.length === 0) {
      return {
        supplier: undefined,
        matchReason: 'Aucun fournisseur enregistré',
        score: 0,
        rankedSuppliers: []
      };
    }

    const pBrand = (productData.brand || '').toLowerCase().trim();
    const pCat = (productData.category || '').toLowerCase().trim();
    const pPlatform = (productData.sourcePlatform || '').toLowerCase().trim();
    const pOrigin = (productData.origin || '').toLowerCase().trim();
    const pUrl = (productData.supplierUrl || '').toLowerCase().trim();
    const pSupName = (productData.supplierName || '').toLowerCase().trim();
    const pCurr = (productData.supplierCurrency || '').toUpperCase().trim();

    let urlHostname = '';
    if (pUrl) {
      try {
        urlHostname = new URL(pUrl).hostname.replace(/^www\./, '').toLowerCase();
      } catch {}
    }

    // Examiner l'historique du catalogue (quels fournisseurs fournissent déjà cette marque ou cette catégorie)
    const rawCatalog = this.products || [];

    const ranked = suppliers.map(sup => {
      let score = 0;
      const reasons: string[] = [];
      const sName = (sup.name || '').toLowerCase().trim();
      const sPlat = (sup.platform || '').toLowerCase().trim();
      const sCountry = (sup.country || '').toLowerCase().trim();
      const sUrl = (sup.websiteUrl || '').toLowerCase().trim();

      // 1. Correspondance explicite d'ID ou de Nom
      if (productData.supplierId && String(sup.id) === String(productData.supplierId)) {
        score += 120;
        reasons.push('Fournisseur sélectionné');
      } else if (pSupName && (sName === pSupName || sName.includes(pSupName) || pSupName.includes(sName))) {
        score += 100;
        reasons.push('Nom du fournisseur identique');
      }

      // 2. Correspondance d'URL / Boutique en ligne
      if (urlHostname && sUrl && sUrl.includes(urlHostname)) {
        score += 85;
        reasons.push(`Même domaine fournisseur (${urlHostname})`);
      } else if (pUrl.includes('grainger.com') && (sName.includes('grainger') || sPlat.includes('usa') || sPlat.includes('grainger'))) {
        score += 85;
        reasons.push('Spécialiste Grainger / USA');
      }

      // 3. Affinité Marque & Catégorie dans le catalogue existant
      if (pBrand && pBrand !== 'constructeur certifié' && pBrand !== 'générique') {
        const suppliesSameBrand = rawCatalog.some(
          cp =>
            Number(cp.id) !== Number(productData.id) &&
            (cp.supplierId === sup.id || (cp.supplierName && cp.supplierName.toLowerCase().trim() === sName)) &&
            (cp.brand || '').toLowerCase().trim() === pBrand
        );
        if (suppliesSameBrand || sName.includes(pBrand)) {
          score += 70;
          reasons.push(`Fournisseur habituel de la marque ${productData.brand}`);
        }
      }

      if (pCat) {
        const suppliesSameCat = rawCatalog.some(
          cp =>
            Number(cp.id) !== Number(productData.id) &&
            (cp.supplierId === sup.id || (cp.supplierName && cp.supplierName.toLowerCase().trim() === sName)) &&
            (cp.category || '').toLowerCase().trim() === pCat
        );
        if (suppliesSameCat) {
          score += 40;
          reasons.push(`Spécialisé dans la catégorie "${productData.category}"`);
        }
      }

      // 4. Correspondance Plateforme & Pays d'origine
      if (pPlatform && pPlatform !== 'manuel' && sPlat && (sPlat === pPlatform || sPlat.includes(pPlatform) || pPlatform.includes(sPlat))) {
        score += 45;
        reasons.push(`Même plateforme (${sup.platform})`);
      }

      if (pOrigin && sCountry && (areCountriesMatching(pOrigin, sCountry) || sCountry.includes(pOrigin) || pOrigin.includes(sCountry))) {
        score += 40;
        reasons.push(`Même pays d'origine (${resolveCanonicalCountryName(sup.country) || sup.country})`);
      }

      // 5. Correspondance Devise & Note de fiabilité
      if (pCurr && sup.currency === pCurr) {
        score += 15;
      }
      if (sup.rating && sup.rating >= 4.8) {
        score += 5;
      }

      return {
        supplier: sup,
        score,
        reason: reasons.length > 0 ? reasons.join(' • ') : `${sup.platform} (${sup.country})`
      };
    });

    ranked.sort((a, b) => b.score - a.score);
    const best = ranked[0];

    return {
      supplier: best && best.score > 0 ? best.supplier : suppliers[0],
      matchReason: best && best.score > 0 ? best.reason : 'Fournisseur partenaire par défaut',
      score: best ? best.score : 0,
      rankedSuppliers: ranked
    };
  }

  public resolveSupplierAgentWarehouse(
    supplierOrId?: Supplier | string | null,
    supplierName?: string
  ): AgentWarehouse {
    const warehouses = this.getAgentWarehouses();
    let sup: Supplier | undefined;
    if (typeof supplierOrId === 'object' && supplierOrId !== null) {
      sup = supplierOrId;
    } else if (typeof supplierOrId === 'string' && supplierOrId.trim()) {
      const key = supplierOrId.trim();
      sup =
        this.getSuppliers().find(s => String(s.id) === key) ||
        this.getSuppliers().find(s => s.name.toLowerCase().trim() === key.toLowerCase());
    }
    if (!sup && supplierName) {
      sup = this.getSuppliers().find(
        s => s.name.toLowerCase().trim() === supplierName.toLowerCase().trim()
      );
    }
    if (sup?.agentWarehouseId) {
      const found = warehouses.find(w => w.id === sup!.agentWarehouseId);
      if (found) return found;
    }
    if (sup) {
      return this.findClosestAgentWarehouse({
        country: sup.country,
        platform: sup.platform,
        supplierUrl: sup.websiteUrl,
        supplierName: sup.name,
        currency: sup.currency
      }).warehouse;
    }
    return this.getDefaultAgentWarehouse();
  }

  public getEffectiveWarehouseForSupplier(
    supplierOrId?: Supplier | string | number | null,
    supplierName?: string
  ): AgentWarehouse {
    return this.resolveSupplierAgentWarehouse(
      typeof supplierOrId === 'number' ? String(supplierOrId) : supplierOrId,
      supplierName
    );
  }

  public addAgentWarehouse(data: Partial<AgentWarehouse>, author = 'Admin'): AgentWarehouse {
    const list = this.getAgentWarehouses();
    const id = `aw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const isDefault = Boolean(data.isDefault) || list.length === 0;
    if (isDefault) {
      this.agentWarehouses.forEach(w => {
        w.isDefault = false;
        setDoc(doc(db, 'agent_warehouses', String(w.id)), cleanUndefined(w)).catch(() => {});
      });
    }
    const newWh = this.normalizeWarehouse({
      ...data,
      id,
      name: (data.name || 'Nouvel Entrepôt Agent').trim(),
      identificationMode: data.identificationMode || 'agent_code',
      hasAgentCode: data.identificationMode !== 'standard_address' && Boolean(data.agentCode?.trim()),
      agentCode: data.identificationMode === 'agent_code' ? (data.agentCode?.trim() || 'DKR628') : undefined,
      firstName: data.firstName ?? data.recipientFirstName ?? '',
      lastName: data.lastName ?? data.recipientLastName ?? '',
      companyName: data.companyName ?? data.recipientCompany ?? '',
      phone: data.phone ?? data.contactPhone ?? '',
      email: data.email ?? data.contactEmail ?? '',
      address: (data.address || '').trim(),
      city: (data.city || '').trim(),
      postalCode: (data.postalCode || '').trim(),
      country: resolveCanonicalCountryName(data.country || ''),
      supportedDeliveryCountries: Array.isArray(data.supportedDeliveryCountries) && data.supportedDeliveryCountries.length > 0
        ? data.supportedDeliveryCountries
        : (siteSettingsService.getSettings()?.supportedDeliveryCountries || DEFAULT_SUPPORTED_DELIVERY_COUNTRIES),
      notes: data.notes ?? data.instructions ?? '',
      isDefault,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    this.agentWarehouses.push(newWh);
    this.saveAgentWarehouses();
    setDoc(doc(db, 'agent_warehouses', String(newWh.id)), cleanUndefined(newWh)).catch(() => {});
    this.logAction(author, 'Ajout Entrepôt Agent', `Entrepôt d'agent ajouté : ${newWh.name} (${newWh.country})`, 'fournisseur');
    this.notifyAgentWarehousesChange();
    return newWh;
  }

  public updateAgentWarehouse(id: string, updates: Partial<AgentWarehouse>, author = 'Admin'): AgentWarehouse | null {
    this.getAgentWarehouses();
    const idx = this.agentWarehouses.findIndex(w => w.id === id);
    if (idx === -1) return null;
    if (updates.isDefault) {
      this.agentWarehouses.forEach((w, i) => {
        if (i !== idx && w.isDefault) {
          w.isDefault = false;
          setDoc(doc(db, 'agent_warehouses', String(w.id)), cleanUndefined(w)).catch(() => {});
        }
      });
    }
    const merged = this.normalizeWarehouse({
      ...this.agentWarehouses[idx],
      ...updates,
      country: updates.country !== undefined ? resolveCanonicalCountryName(updates.country) : this.agentWarehouses[idx].country,
      id,
      updatedAt: new Date().toISOString()
    });
    this.agentWarehouses[idx] = merged;
    if (!this.agentWarehouses.some(w => w.isDefault) && this.agentWarehouses.length > 0) {
      this.agentWarehouses[0].isDefault = true;
    }
    this.saveAgentWarehouses();
    setDoc(doc(db, 'agent_warehouses', String(id)), cleanUndefined(merged)).catch(() => {});
    this.logAction(author, 'Modification Entrepôt Agent', `Entrepôt d'agent modifié : ${merged.name} (${merged.country})`, 'fournisseur');
    this.notifyAgentWarehousesChange();
    return merged;
  }

  public setDefaultAgentWarehouse(id: string, author = 'Admin') {
    this.getAgentWarehouses();
    this.agentWarehouses.forEach(w => {
      w.isDefault = w.id === id;
      setDoc(doc(db, 'agent_warehouses', String(w.id)), cleanUndefined(w)).catch(() => {});
    });
    this.saveAgentWarehouses();
    const def = this.agentWarehouses.find(w => w.id === id);
    if (def) {
      this.logAction(author, 'Entrepôt Agent par Défaut', `${def.name} défini comme entrepôt d'agent par défaut`, 'fournisseur');
    }
    this.notifyAgentWarehousesChange();
  }

  public deleteAgentWarehouse(id: string, author = 'Admin'): boolean {
    this.getAgentWarehouses();
    if (this.agentWarehouses.length === 0) return false;
    const reg = this.getDeletedRegistry();
    reg.agentWarehouses = Array.from(new Set([...(reg.agentWarehouses || []), String(id)]));
    this.saveDeletedRegistry(reg, true);

    const target = this.agentWarehouses.find(w => w.id === id);
    this.agentWarehouses = this.agentWarehouses.filter(w => w.id !== id);
    if (!this.agentWarehouses.some(w => w.isDefault) && this.agentWarehouses.length > 0) {
      this.agentWarehouses[0].isDefault = true;
      setDoc(doc(db, 'agent_warehouses', String(this.agentWarehouses[0].id)), cleanUndefined(this.agentWarehouses[0])).catch(() => {});
    }
    this.saveAgentWarehouses();
    deleteDoc(doc(db, 'agent_warehouses', String(id))).catch(() => {});

    this.suppliers.forEach(s => {
      if (s.agentWarehouseId === id) {
        s.agentWarehouseId = undefined;
        setDoc(doc(db, 'suppliers', String(s.id)), cleanUndefined(s)).catch(() => {});
      }
    });
    this.saveSuppliers();

    this.logAction(author, 'Suppression Entrepôt Agent', `Entrepôt d'agent supprimé : ${target?.name || id}`, 'fournisseur');
    this.notifyAgentWarehousesChange();
    this.notifySuppliersChange();
    return true;
  }

  // ================= FOURNISSEURS =================
  public getSuppliers(): Supplier[] {
    if (this.suppliers.length === 0) {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            this.suppliers = parsed;
          }
        }
      } catch {}
    }
    return this.suppliers;
  }

  public getSupplierById(id: string): Supplier | undefined {
    return this.getSuppliers().find(s => s.id === id);
  }

  public ensureSupplier(sData: {
    name: string;
    platform?: string;
    country?: string;
    currency?: 'USD' | 'EUR' | 'CNY' | 'XOF';
    storeUrl?: string;
    notes?: string;
  }): Supplier {
    this.getSuppliers();
    const cleanName = (sData.name || '').trim();
    if (!cleanName) {
      return this.suppliers[0] || DEFAULT_SUPPLIERS[0];
    }
    
    // Check if supplier already exists (case-insensitive name or URL match)
    const existing = this.suppliers.find(s => 
      s.name.toLowerCase().trim() === cleanName.toLowerCase() ||
      (sData.storeUrl && s.websiteUrl && s.websiteUrl === sData.storeUrl)
    );
    if (existing) {
      if (!existing.agentWarehouseId) {
        const closest = this.findClosestAgentWarehouse({
          country: existing.country || sData.country,
          platform: existing.platform || sData.platform,
          supplierUrl: existing.websiteUrl || sData.storeUrl,
          supplierName: existing.name,
          currency: existing.currency || sData.currency
        });
        this.updateSupplier(existing.id, { agentWarehouseId: closest.warehouse.id }, 'Système (Auto-Entrepôt)');
      }
      return existing;
    }

    const closestWh = this.findClosestAgentWarehouse({
      country: sData.country || 'Chine',
      platform: sData.platform || 'Alibaba',
      supplierUrl: sData.storeUrl,
      supplierName: cleanName,
      currency: sData.currency || 'USD'
    });

    // Create new supplier with closest warehouse automatically assigned
    const newSup = this.addSupplier({
      name: cleanName,
      platform: sData.platform || 'Alibaba',
      country: sData.country || 'Chine',
      currency: sData.currency || 'USD',
      websiteUrl: sData.storeUrl || '',
      agentWarehouseId: closestWh.warehouse.id,
      paymentTerms: 'Trade Assurance / 30% acompte',
      leadTimeAvg: '15-20 jours',
      shippingMinMaxUSD: '$6 - $12 / kg',
      circuit: 'automatisé',
      rating: 4.9,
      notes: sData.notes || `Fournisseur extrait et associé automatiquement à l'entrepôt le plus proche (${closestWh.warehouse.name}).`
    }, 'Système (Auto-Import)');

    return newSup;
  }

  public addSupplier(sData: Partial<Supplier>, author = 'Admin'): Supplier {
    this.getSuppliers();
    const resolvedDays = typeof sData.avgLeadTimeDays === 'number' && sData.avgLeadTimeDays > 0
      ? sData.avgLeadTimeDays
      : (parseInt(String(sData.leadTimeAvg || '14'), 10) || 14);
    const resolvedLeadTimeStr = sData.leadTimeAvg && String(sData.leadTimeAvg).trim()
      ? String(sData.leadTimeAvg).trim()
      : `${resolvedDays} jours`;

    const autoClosestWarehouse = sData.agentWarehouseId
      ? sData.agentWarehouseId
      : this.findClosestAgentWarehouse({
          country: sData.country || 'Chine',
          platform: sData.platform || 'Alibaba',
          supplierUrl: sData.websiteUrl,
          supplierName: sData.name,
          currency: sData.currency || 'USD'
        }).warehouse.id;

    const newSupplier: Supplier = {
      id: `sup-${Date.now()}`,
      name: sData.name || 'Nouveau Fournisseur',
      platform: sData.platform || 'Alibaba',
      country: sData.country || 'Chine',
      currency: sData.currency || 'USD',
      paymentTerms: sData.paymentTerms || '30% acompte / 70% avant expédition',
      leadTimeAvg: resolvedLeadTimeStr,
      avgLeadTimeDays: resolvedDays,
      shippingMinMaxUSD: sData.shippingMinMaxUSD || sData.shippingPriceRange || '$10 - $25/kg',
      shippingPriceRange: sData.shippingPriceRange || sData.shippingMinMaxUSD || '$10 - $25/kg',
      warehouseDeliveryMinUSD: sData.warehouseDeliveryMinUSD ?? 15,
      warehouseDeliveryMaxUSD: sData.warehouseDeliveryMaxUSD ?? 35,
      warehouseDeliveryFeeUSD: sData.warehouseDeliveryFeeUSD ?? 25,
      contactEmail: sData.contactEmail || '',
      contactPhone: sData.contactPhone || '',
      websiteUrl: sData.websiteUrl || '',
      circuit: sData.circuit || (sData.isAutomatedCircuit === false ? 'manuel' : 'automatisé'),
      isAutomatedCircuit: sData.isAutomatedCircuit ?? (sData.circuit !== 'manuel'),
      communicationChannel: sData.communicationChannel || 'whatsapp',
      defaultMessageTemplate: sData.defaultMessageTemplate || 'Bonjour, voici notre commande groupée ZONE ÉQUIPEMENTS. Veuillez appliquer le marquage de carton avec notre Code Agent obligatoire. Merci de nous transmettre le lien sécurisé pour règlement.',
      agentWarehouseId: autoClosestWarehouse,
      rating: sData.rating || 4.8,
      notes: sData.notes || ''
    };
    this.suppliers.push(newSupplier);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ze_suppliers_seeded_v2', 'true');
    }
    this.saveSuppliers();
    setDoc(doc(db, 'suppliers', String(newSupplier.id)), cleanUndefined(newSupplier)).catch(() => {});
    this.logAction(author, 'Ajout Fournisseur', `Nouveau fournisseur enregistré: ${newSupplier.name} (${newSupplier.country})`, 'fournisseur');
    this.notifySuppliersChange();
    return newSupplier;
  }

  public updateSupplier(id: string, sData: Partial<Supplier>, author = 'Admin'): Supplier {
    this.getSuppliers();
    const idx = this.suppliers.findIndex(s => s.id === id);
    if (idx === -1) throw new Error("Fournisseur non trouvé");

    const prev = this.suppliers[idx];
    const resolvedDays = typeof sData.avgLeadTimeDays === 'number' && sData.avgLeadTimeDays > 0
      ? sData.avgLeadTimeDays
      : (prev.avgLeadTimeDays || parseInt(String(sData.leadTimeAvg || prev.leadTimeAvg || '14'), 10) || 14);
    const resolvedLeadTimeStr = sData.leadTimeAvg && String(sData.leadTimeAvg).trim()
      ? String(sData.leadTimeAvg).trim()
      : `${resolvedDays} jours`;

    const updated: Supplier = {
      ...prev,
      ...sData,
      avgLeadTimeDays: resolvedDays,
      leadTimeAvg: resolvedLeadTimeStr,
      shippingMinMaxUSD: sData.shippingMinMaxUSD || sData.shippingPriceRange || prev.shippingMinMaxUSD,
      shippingPriceRange: sData.shippingPriceRange || sData.shippingMinMaxUSD || prev.shippingPriceRange,
      circuit: sData.circuit || (sData.isAutomatedCircuit === false ? 'manuel' : 'automatisé'),
      isAutomatedCircuit: sData.isAutomatedCircuit ?? (sData.circuit !== 'manuel'),
      communicationChannel: sData.communicationChannel || prev.communicationChannel || 'whatsapp'
    };
    this.suppliers[idx] = updated;
    if (typeof window !== 'undefined') {
      localStorage.setItem('ze_suppliers_seeded_v2', 'true');
    }
    this.saveSuppliers();
    setDoc(doc(db, 'suppliers', String(id)), cleanUndefined(updated)).catch(() => {});
    this.logAction(author, 'Modification Fournisseur', `Mise à jour fiche fournisseur: ${updated.name}`, 'fournisseur');
    this.notifySuppliersChange();
    return updated;
  }

  public deleteSupplier(id: string, author = 'Admin'): boolean {
    this.getSuppliers();
    this.markEntityDeleted('suppliers', id);
    const sup = this.suppliers.find(s => String(s.id) === String(id));
    const initialLen = this.suppliers.length;
    this.suppliers = this.suppliers.filter(s => String(s.id) !== String(id));
    if (this.suppliers.length !== initialLen) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('ze_suppliers_seeded_v2', 'true');
      }
      this.saveSuppliers();
      deleteDoc(doc(db, 'suppliers', String(id))).catch(() => {});
      this.logAction(author, 'Suppression Fournisseur', `Fournisseur supprimé: ${sup ? sup.name : id}`, 'fournisseur');
      this.notifySuppliersChange();
      return true;
    }
    return false;
  }

  // ================= NOTIFICATIONS & GESTION COMMANDES FOURNISSEUR =================
  public generateGroupedPO(supplierId: string, orderIds: string[], warehouseAddress = "Entrepôt Transit Export Dakar - Réf: ZE-EXP") {
    const supplier = this.getSupplierById(supplierId);
    const orders = this.getOrders().filter(o => orderIds.includes(o.id));
    
    // Agrégation des articles commandés
    const aggregatedItems: { name: string; brand: string; quantity: number; unitPrice: number; currency: string; orderRefs: string[] }[] = [];
    
    orders.forEach(ord => {
      ord.items.forEach(item => {
        const existing = aggregatedItems.find(i => i.name === item.name);
        if (existing) {
          existing.quantity += item.quantity;
          if (!existing.orderRefs.includes(ord.orderNumber)) {
            existing.orderRefs.push(ord.orderNumber);
          }
        } else {
          aggregatedItems.push({
            name: item.name,
            brand: item.brand,
            quantity: item.quantity,
            unitPrice: item.supplierPrice || Math.round(item.price * 0.55 / 610),
            currency: supplier?.currency || 'USD',
            orderRefs: [ord.orderNumber]
          });
        }
      });
    });

    const poRef = `PO-ZE-${Date.now().toString().slice(-6)}`;
    const dateStr = new Date().toLocaleDateString('fr-FR');
    const totalUnits = aggregatedItems.reduce((acc, i) => acc + i.quantity, 0);

    const itemsSummary = aggregatedItems.map((item, idx) => 
      `${idx + 1}. [${item.brand}] ${item.name} x${item.quantity} pcs (Réf client: ${item.orderRefs.join(', ')})`
    ).join('\n');

    // Message standard formaté pour WhatsApp / Email
    const compName = siteSettingsService.getSettings().companyName || 'ZONE ÉQUIPEMENTS';
    const messageText = `COMMANDE ACHAT FOURNISSEUR / PURCHASE ORDER
Réf: ${poRef} - Date: ${dateStr}
Fournisseur: ${supplier?.name || 'Partenaire Industriel'}
Destinataire Expédition: ${warehouseAddress}

Liste des équipements commandés (${totalUnits} unités au total) :
${itemsSummary}

Conditions souhaitées :
- Contrôle qualité constructeur & emballage renforcé export
- Facture proforma / Lien de règlement Trade Assurance
- Confirmation des délais de fabrication et d'expédition

${compName}
Email: zoneequipements@gmail.com
WhatsApp: +221 76 653 83 84
Km 4, Boulevard du Centenaire, Dakar`;

    const cleanPhone = (supplier?.contactPhone || '').replace(/[^0-9]/g, '');
    const whatsappUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
      : `https://wa.me/221766538384?text=${encodeURIComponent(messageText)}`;

    const emailSubject = `[PURCHASE ORDER] ${poRef} - ${compName}`;
    const emailUrl = `mailto:${supplier?.contactEmail || 'zoneequipements@gmail.com'}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(messageText)}`;

    return {
      poRef,
      dateStr,
      supplier,
      orders,
      aggregatedItems,
      totalUnits,
      messageText,
      whatsappUrl,
      emailUrl
    };
  }

  // Génération de notification client selon l'état de la commande
  public generateClientStatusNotification(order: Order, newStatus: Order['status']) {
    const compName = siteSettingsService.getSettings().companyName || 'ZONE ÉQUIPEMENTS';
    const statusMessages: Record<Order['status'], { title: string; body: string }> = {
      'Reçue': {
        title: 'Confirmation de réception de votre demande',
        body: `Bonjour ${order.customerName},\n\nNous avons bien reçu votre demande / commande N° ${order.orderNumber} sur ${compName}. Notre équipe technique prépare votre dossier.\n\nMontant total : ${order.totalTTC.toLocaleString('fr-FR')} FCFA.\nContact: zoneequipements@gmail.com / +221 76 653 83 84.`
      },
      'En attente paiement': {
        title: 'En attente de confirmation de paiement',
        body: `Bonjour ${order.customerName},\n\nVotre commande N° ${order.orderNumber} est validée. Merci d'effectuer le règlement (${order.paymentMethod}) de ${order.totalTTC.toLocaleString('fr-FR')} FCFA pour lancer le sourcing et la réservation de vos équipements.\n\nAssistance: +221 76 653 83 84.`
      },
      'Payée': {
        title: 'Paiement confirmé - Lancement de l\'approvisionnement',
        body: `Bonjour ${order.customerName},\n\nNous confirmons la bonne réception du paiement pour votre commande N° ${order.orderNumber}. Votre matériel est désormais transmis au fabricant d'origine pour préparation immédiate.`
      },
      'Commandée fournisseur': {
        title: 'Commande transmise à l\'usine partenaire',
        body: `Bonjour ${order.customerName},\n\nExcellente nouvelle ! Les pièces de votre commande N° ${order.orderNumber} ont été commandées directement auprès de l'usine d'origine. Les tests de conformité sont en cours.`
      },
      'En transit': {
        title: 'Vos équipements sont en cours de transit international',
        body: `Bonjour ${order.customerName},\n\nVotre commande N° ${order.orderNumber} a quitté les entrepôts export et se trouve actuellement en transit sécurisé vers le Sénégal.`
      },
      'Dédouanement': {
        title: 'Arrivée sur le territoire - Formalités douanières',
        body: `Bonjour ${order.customerName},\n\nVotre commande N° ${order.orderNumber} est arrivée à destination. Les documents d'importation sont prêts pour le dédouanement autonome ou l'accompagnement par transitaire.`
      },
      'Reçue en entrepôt': {
        title: 'Matériel disponible dans notre entrepôt de Dakar',
        body: `Bonjour ${order.customerName},\n\nVotre commande N° ${order.orderNumber} est arrivée dans nos entrepôts de Dakar. Vous pouvez venir la retirer ou confirmer la livraison sur votre site de production.`
      },
      'Livrée': {
        title: 'Commande livrée avec succès',
        body: `Bonjour ${order.customerName},\n\nVotre commande N° ${order.orderNumber} a été réceptionnée avec succès. Nous vous remercions pour votre confiance en ${compName}.`
      },
      'Annulée': {
        title: 'Notification d\'annulation de commande',
        body: `Bonjour ${order.customerName},\n\nVotre commande N° ${order.orderNumber} a été annulée. Pour toute question, veuillez nous contacter à zoneequipements@gmail.com ou au +221 76 653 83 84.`
      }
    };

    const trackingLine = order.trackingNumber
      ? `\nNuméro de suivi (Tracking) : ${order.trackingNumber}${order.agentCode ? ` (Code Transit: ${order.agentCode})` : ''}`
      : (order.agentCode ? `\nRéférence Transit : ${order.agentCode}` : '');

    const notif = statusMessages[newStatus] || {
      title: `Mise à jour commande ${order.orderNumber}`,
      body: `Bonjour ${order.customerName},\n\nVotre commande N° ${order.orderNumber} est maintenant au statut : "${newStatus}".`
    };
    const bodyWithTracking = `${notif.body}${trackingLine}`;

    const cleanPhone = (order.customerPhone || '').replace(/[^0-9]/g, '');
    const whatsappUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(bodyWithTracking)}`
      : `https://wa.me/221766538384?text=${encodeURIComponent(bodyWithTracking)}`;

    const emailSubject = `[${compName}] ${notif.title} - Commande ${order.orderNumber}`;
    const emailUrl = `mailto:${order.customerEmail || 'zoneequipements@gmail.com'}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(bodyWithTracking)}`;

    return {
      title: notif.title,
      body: bodyWithTracking,
      whatsappUrl,
      emailUrl
    };
  }

  public recordOrderNotification(orderId: string, record: Omit<OrderNotificationRecord, 'date'>) {
    const order = this.getOrderById(orderId);
    if (!order) return;
    if (!order.notifications) order.notifications = [];
    order.notifications.unshift({
      ...record,
      date: new Date().toISOString()
    });
    this.saveOrders();
    setDoc(doc(db, 'orders', String(orderId)), cleanUndefined(order)).catch(() => {});
    this.notifyOrdersChange();
  }

  public updateOrderSupplierPo(orderId: string, poStatus: Order['supplierPoStatus'], paymentLink?: string, author = 'Admin', paymentAmount?: string) {
    const order = this.getOrderById(orderId);
    if (!order) return;
    order.supplierPoStatus = poStatus;
    if (paymentLink !== undefined) {
      order.supplierPaymentLink = paymentLink.trim() || undefined;
    }
    if (paymentAmount !== undefined) {
      order.supplierPaymentAmount = paymentAmount.trim() || undefined;
    }
    if (poStatus === 'Payé fournisseur' && (order.status === 'Reçue' || order.status === 'En attente paiement' || order.status === 'Payée')) {
      order.status = 'Commandée fournisseur';
    }
    order.updatedAt = new Date().toISOString();
    this.saveOrders();
    setDoc(doc(db, 'orders', String(orderId)), cleanUndefined(order)).catch(() => {});
    this.logAction(
      author,
      'Suivi Achat Fournisseur',
      `Commande ${order.orderNumber} : statut PO "${poStatus}"${paymentLink ? ` (Lien: ${paymentLink})` : ''}`,
      'fournisseur'
    );
    this.notifyOrdersChange();
  }

  // ================= PORTAIL FOURNISSEUR À USAGE UNIQUE (ONE-TIME SECURE LINK) =================
  private saveSupplierTokens() {
    try {
      localStorage.setItem(STORAGE_KEYS.SUPPLIER_TOKENS, JSON.stringify(this.supplierTokens));
    } catch (e) {
      console.error('Erreur sauvegarde tokens fournisseurs:', e);
    }
  }

  private syncSupplierTokensFromFirestore() {
    try {
      onSnapshot(collection(db, 'supplier_tokens'), (snapshot) => {
        const tokens: SupplierPortalToken[] = [];
        snapshot.forEach((snapDoc) => {
          const data = snapDoc.data() as SupplierPortalToken;
          if (data && data.token) {
            tokens.push(data);
          }
        });
        this.supplierTokens = tokens.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        this.saveSupplierTokens();
        this.notifyOrdersChange();
      }, (error) => {
        if (error?.code !== 'unavailable' && !error?.message?.includes('offline')) {
          console.warn('Synchronisation tokens fournisseurs:', error.message || error);
        }
      });
    } catch (e) {
      console.warn('Init listener supplier_tokens:', e);
    }
  }

  public getSupplierTokens(supplierId?: string): SupplierPortalToken[] {
    if (this.supplierTokens.length === 0) {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.SUPPLIER_TOKENS);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) this.supplierTokens = parsed;
        }
      } catch {}
    }
    if (supplierId) {
      return this.supplierTokens.filter(t => t.supplierId === supplierId);
    }
    return this.supplierTokens;
  }

  public async fetchSupplierTokenByCode(tokenCode: string): Promise<SupplierPortalToken | null> {
    const cleanCode = (tokenCode || '').trim();
    if (!cleanCode) return null;

    try {
      const snap = await getDoc(doc(db, 'supplier_tokens', cleanCode));
      if (snap.exists()) {
        const remoteToken = snap.data() as SupplierPortalToken;
        const idx = this.supplierTokens.findIndex(t => t.token === cleanCode);
        if (idx >= 0) {
          this.supplierTokens[idx] = remoteToken;
        } else {
          this.supplierTokens.unshift(remoteToken);
        }
        this.saveSupplierTokens();
        return remoteToken;
      }
    } catch (e) {
      console.warn('Lecture Firestore token fournisseur:', e);
    }

    const local = this.getSupplierTokens().find(t => t.token === cleanCode);
    return local || null;
  }

  public createSupplierPortalToken(params: {
    poRef: string;
    supplier: Supplier;
    agentCode?: string;
    agentWarehouse?: AgentWarehouse | null;
    orderIds: string[];
    orderNumbers: string[];
    items: SupplierPortalTokenItem[];
    totalAmount: number;
  }, author = 'Admin'): SupplierPortalToken {
    this.getSupplierTokens();
    const randomPart1 = Math.random().toString(36).substring(2, 8).toUpperCase();
    const randomPart2 = Date.now().toString(36).toUpperCase().slice(-5);
    const tokenCode = `SPT-${randomPart1}-${randomPart2}`;

    const resolvedWh = params.agentWarehouse || this.resolveSupplierAgentWarehouse(params.supplier);
    const hasSea = params.items.some(it => it.freightCode === 'SEA' || it.shippingMethod === 'sea');
    const hasAir = params.items.some(it => it.freightCode === 'AIR' || it.shippingMethod === 'air');
    const fMode: 'AIR' | 'SEA' | 'AIR/SEA' = hasSea && !hasAir ? 'SEA' : hasSea && hasAir ? 'AIR/SEA' : 'AIR';
    const effectiveAgentCode = params.agentCode || getEffectiveAgentCodeForWarehouse(resolvedWh, fMode);

    // Enrichir chaque article avec son image miniature, son variant choisi (et sa description unique) et une étiquette propre
    const enrichedTokenItems: SupplierPortalTokenItem[] = params.items.map(it => {
      const fCode: 'AIR' | 'SEA' = it.freightCode || (it.shippingMethod === 'sea' ? 'SEA' : 'AIR');
      const fallbackOrdRef = (it.orderRefs && it.orderRefs[0]) || (params.orderNumbers && params.orderNumbers[0]) || params.poRef;
      const fallbackCliId = (it.clientWarehouseIds && it.clientWarehouseIds[0]) || 'CLI-ENTREPOT';
      const rawLbl = it.parcelLabel || (it.parcelLabels && it.parcelLabels.join(' / '));
      const cleanLbl = sanitizeSupplierParcelLabel(rawLbl, fallbackOrdRef, fallbackCliId, fCode);

      // Chercher le produit dans le catalogue pour récupérer la miniature et les infos de variant si manquantes
      const matchedProd = this.products.find(
        p =>
          (it.productId && Number(p.id) === Number(it.productId)) ||
          p.name.toLowerCase().trim() === it.name.toLowerCase().trim() ||
          it.name.toLowerCase().startsWith(p.name.toLowerCase().trim() + ' (')
      );

      let detectedVariantName = it.variantName;
      let detectedVariantDesc = it.variantDescription;
      let detectedImg = it.image;

      if (matchedProd) {
        const opts = (matchedProd.options || matchedProd.variants || []) as ProductVariantItem[];
        let matchedOpt: ProductVariantItem | undefined;
        if (detectedVariantName && Array.isArray(opts)) {
          matchedOpt = opts.find(o => typeof o === 'object' && o.name?.toLowerCase().trim() === detectedVariantName!.toLowerCase().trim());
        } else if (Array.isArray(opts) && opts.length > 0) {
          matchedOpt = opts.find(o => typeof o === 'object' && o.name && it.name.toLowerCase().includes(`(${o.name.toLowerCase().trim()})`));
          if (matchedOpt) detectedVariantName = matchedOpt.name;
        }
        if (!detectedVariantName) {
          const parenMatch = it.name.match(/\(([^()]+)\)\s*$/);
          if (parenMatch && parenMatch[1]) {
            detectedVariantName = parenMatch[1].trim();
          }
        }
        if (matchedOpt) {
          if (!detectedImg && matchedOpt.image && matchedOpt.image.trim()) {
            detectedImg = matchedOpt.image.trim();
          }
          if (!detectedVariantDesc) {
            const parsedSpecs = parseVariantCharacteristicsToSpecs(matchedOpt.characteristics, matchedOpt.specs);
            const specStr = parsedSpecs ? formatSpecsToCharacteristicsText(parsedSpecs) : (matchedOpt.characteristics || '');
            detectedVariantDesc = [
              `Variant sélectionné : ${matchedOpt.name}`,
              matchedOpt.weight ? `Poids : ${matchedOpt.weight}` : '',
              specStr
            ].filter(Boolean).join(' • ');
          }
        } else if (detectedVariantName && !detectedVariantDesc) {
          detectedVariantDesc = `Variant sélectionné : ${detectedVariantName}`;
        }
        if (!detectedImg) {
          detectedImg = matchedProd.img || matchedProd.image;
        }
      } else if (!detectedVariantName) {
        const parenMatch = it.name.match(/\(([^()]+)\)\s*$/);
        if (parenMatch && parenMatch[1]) {
          detectedVariantName = parenMatch[1].trim();
          if (!detectedVariantDesc) {
            detectedVariantDesc = `Variant sélectionné : ${detectedVariantName}`;
          }
        }
      }

      return {
        ...it,
        productId: it.productId || (matchedProd ? Number(matchedProd.id) : undefined),
        image: detectedImg || undefined,
        variantName: detectedVariantName || undefined,
        variantDescription: detectedVariantDesc || undefined,
        description: it.description || matchedProd?.description || undefined,
        freightCode: fCode,
        parcelLabel: cleanLbl,
        parcelLabels: (it.parcelLabels && it.parcelLabels.length > 0)
          ? it.parcelLabels.map(l => sanitizeSupplierParcelLabel(l, fallbackOrdRef, fallbackCliId, fCode))
          : [cleanLbl]
      };
    });

    const newToken: SupplierPortalToken = {
      token: tokenCode,
      poRef: params.poRef,
      poReference: params.poRef,
      supplierId: params.supplier.id,
      supplierName: params.supplier.name,
      supplierPlatform: params.supplier.platform || 'Alibaba',
      supplierCountry: params.supplier.country || 'Chine',
      currency: params.supplier.currency || 'USD',
      agentCode: effectiveAgentCode,
      agentWarehouse: resolvedWh,
      agentWarehouseId: resolvedWh?.id,
      agentWarehouseName: resolvedWh?.name,
      identificationMode: resolvedWh?.identificationMode || 'agent_code',
      hasAgentCode: resolvedWh ? Boolean(resolvedWh.hasAgentCode) : true,
      recipientFirstName: resolvedWh?.recipientFirstName || resolvedWh?.firstName || 'Zone',
      recipientLastName: resolvedWh?.recipientLastName || resolvedWh?.lastName || 'Équipements',
      warehousePhone: resolvedWh?.contactPhone || resolvedWh?.phone || '+221 76 653 83 84',
      warehouseEmail: resolvedWh?.contactEmail || resolvedWh?.email || 'zoneequipements@gmail.com',
      warehouseAddress: resolvedWh?.address || '',
      warehouseCity: resolvedWh?.city || '',
      warehouseCountry: resolvedWh?.country || '',
      warehousePostalCode: resolvedWh?.postalCode || '',
      warehouseInstructions: resolvedWh?.instructions || resolvedWh?.notes || '',
      warehouseFeeUSD: params.supplier.warehouseDeliveryFeeUSD || 25,
      paymentTerms: params.supplier.paymentTerms || 'Trade Assurance / Proforma',
      orderIds: params.orderIds,
      orderNumbers: params.orderNumbers,
      items: enrichedTokenItems,
      totalAmount: params.totalAmount,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    this.supplierTokens.unshift(newToken);
    this.saveSupplierTokens();
    setDoc(doc(db, 'supplier_tokens', tokenCode), cleanUndefined(newToken)).catch(() => {});

    // Associer le token aux commandes concernées et les passer en PO Envoyé si non transmis
    params.orderIds.forEach(oid => {
      const ord = this.getOrderById(oid);
      if (ord) {
        ord.supplierPortalToken = tokenCode;
        if (!ord.supplierPoStatus || ord.supplierPoStatus === 'Non transmis') {
          ord.supplierPoStatus = 'PO Envoyé';
        }
        ord.updatedAt = new Date().toISOString();
        setDoc(doc(db, 'orders', String(ord.id)), cleanUndefined(ord)).catch(() => {});
      }
    });
    this.saveOrders();

    this.logAction(
      author,
      'Génération Lien Unique Fournisseur',
      `Lien sécurisé à usage unique ${tokenCode} généré pour ${params.supplier.name} (PO: ${params.poRef})`,
      'fournisseur'
    );
    this.notifyOrdersChange();
    return newToken;
  }

  public async submitSupplierPortalResponse(
    tokenCode: string,
    payload: {
      paymentLink: string;
      platformLabel?: string;
      confirmedAmount?: string;
      estimatedLeadTime?: string;
      trackingNumber?: string;
      supplierNotes?: string;
      responderName?: string;
    }
  ): Promise<{ success: boolean; error?: string; tokenData?: SupplierPortalToken }> {
    const currentToken = await this.fetchSupplierTokenByCode(tokenCode);
    if (!currentToken) {
      return { success: false, error: 'Lien de commande introuvable ou invalide.' };
    }
    if (currentToken.status !== 'active') {
      return {
        success: false,
        error: 'Cette adresse à usage unique a déjà été utilisée et est désormais verrouillée.',
        tokenData: currentToken
      };
    }

    const rawLink = (payload.paymentLink || '').trim();
    const urlMatch = rawLink.match(/https?:\/\/[^\s"'<>]+/i);
    if (!urlMatch || !urlMatch[0]) {
      return {
        success: false,
        error: 'Validation refusée : Aucun lien de paiement valide (https://...) n’a été détecté. Un lien de paiement valide est obligatoire pour confirmer la commande.'
      };
    }
    const cleanLink = urlMatch[0].replace(/[.,;!?)]+$/, '');

    const nowIso = new Date().toISOString();
    const responseData: SupplierPortalResponse = {
      paymentLink: cleanLink,
      platformLabel: payload.platformLabel || 'Lien Fournisseur',
      confirmedAmount: payload.confirmedAmount?.trim() || `${currentToken.totalAmount} ${currentToken.currency}`,
      estimatedLeadTime: payload.estimatedLeadTime?.trim() || undefined,
      trackingNumber: payload.trackingNumber?.trim() || undefined,
      supplierNotes: payload.supplierNotes?.trim() || undefined,
      responderName: payload.responderName?.trim() || currentToken.supplierName,
      submittedAt: nowIso
    };

    const updatedToken: SupplierPortalToken = {
      ...currentToken,
      status: 'used',
      usedAt: nowIso,
      response: responseData
    };

    // 1. Verrouiller immédiatement le jeton à usage unique dans Firestore et en mémoire
    const idx = this.supplierTokens.findIndex(t => t.token === tokenCode);
    if (idx >= 0) {
      this.supplierTokens[idx] = updatedToken;
    } else {
      this.supplierTokens.unshift(updatedToken);
    }
    this.saveSupplierTokens();
    await setDoc(doc(db, 'supplier_tokens', tokenCode), cleanUndefined(updatedToken));

    // 2. Mettre à jour automatiquement toutes les commandes liées dans le système interne
    const targetOrderIds = currentToken.orderIds || [];
    for (const oid of targetOrderIds) {
      let ord = this.getOrderById(oid);
      if (!ord) {
        try {
          const snap = await getDoc(doc(db, 'orders', String(oid)));
          if (snap.exists()) {
            ord = snap.data() as Order;
          }
        } catch {}
      }
      if (ord) {
        ord.supplierPoStatus = 'Lien paiement reçu';
        ord.supplierPaymentLink = cleanLink;
        if (responseData.confirmedAmount) {
          ord.supplierPaymentAmount = responseData.confirmedAmount;
        }
        if (responseData.trackingNumber) {
          ord.trackingNumber = responseData.trackingNumber;
        }
        if (responseData.supplierNotes) {
          ord.notes = ord.notes
            ? `${ord.notes}\n[Fournisseur ${currentToken.supplierName}]: ${responseData.supplierNotes}`
            : `[Fournisseur ${currentToken.supplierName}]: ${responseData.supplierNotes}`;
        }
        if (!ord.notifications) ord.notifications = [];
        ord.notifications.unshift({
          date: nowIso,
          recipient: 'admin',
          channel: 'email',
          title: `Lien de paiement reçu via Portail Unique (${currentToken.poRef})`,
          message: `${currentToken.supplierName} a répondu sur le lien unique ${tokenCode}. Lien: ${cleanLink} | Montant confirmé: ${responseData.confirmedAmount}`
        });
        ord.updatedAt = nowIso;

        const localIdx = this.orders.findIndex(o => o.id === ord!.id);
        if (localIdx >= 0) {
          this.orders[localIdx] = ord;
        } else {
          this.orders.unshift(ord);
        }
        await setDoc(doc(db, 'orders', String(ord.id)), cleanUndefined(ord));
      }
    }
    this.saveOrders();

    // 3. Journaliser l'événement dans l'audit interne
    this.logAction(
      `Portail Fournisseur (${currentToken.supplierName})`,
      'Réception Automatique Lien Paiement',
      `Réponse reçue via lien unique ${tokenCode} (PO: ${currentToken.poRef}) — Lien: ${cleanLink} — Montant: ${responseData.confirmedAmount}`,
      'fournisseur'
    );

    this.notifyOrdersChange();
    return { success: true, tokenData: updatedToken };
  }

  public revokeSupplierToken(tokenCode: string, author = 'Admin') {
    const idx = this.supplierTokens.findIndex(t => t.token === tokenCode);
    if (idx === -1) return;
    this.supplierTokens[idx].status = 'revoked';
    this.saveSupplierTokens();
    setDoc(doc(db, 'supplier_tokens', tokenCode), cleanUndefined(this.supplierTokens[idx])).catch(() => {});
    this.logAction(author, 'Révocation Lien Unique', `Lien fournisseur ${tokenCode} révoqué manuellement.`, 'fournisseur');
    this.notifyOrdersChange();
  }

  public updateOrderLogistics(
    orderId: string,
    updates: {
      trackingNumber?: string;
      agentCode?: string;
      notes?: string;
      supplierId?: string;
      supplierName?: string;
      supplierPoStatus?: Order['supplierPoStatus'];
      supplierPaymentLink?: string;
    },
    author = 'Admin'
  ) {
    const order = this.getOrderById(orderId);
    if (!order) return;
    if (updates.trackingNumber !== undefined) order.trackingNumber = updates.trackingNumber.trim() || undefined;
    if (updates.agentCode !== undefined && updates.agentCode.trim()) order.agentCode = updates.agentCode.trim();
    if (updates.notes !== undefined) order.notes = updates.notes;
    if (updates.supplierId !== undefined) order.supplierId = updates.supplierId || undefined;
    if (updates.supplierName !== undefined) order.supplierName = updates.supplierName || undefined;
    if (updates.supplierPoStatus !== undefined) order.supplierPoStatus = updates.supplierPoStatus;
    if (updates.supplierPaymentLink !== undefined) order.supplierPaymentLink = updates.supplierPaymentLink.trim() || undefined;
    order.updatedAt = new Date().toISOString();
    this.saveOrders();
    setDoc(doc(db, 'orders', String(orderId)), cleanUndefined(order)).catch(() => {});
    this.logAction(
      author,
      'Mise à jour Logistique / Suivi',
      `Commande ${order.orderNumber} mise à jour (Tracking: ${order.trackingNumber || 'N/A'}, Code Agent: ${order.agentCode || 'N/A'})`,
      'commande'
    );
    this.notifyOrdersChange();
  }

  // ================= PRODUITS AIMÉS (FAVORIS UTILISATEUR) & PAYS DE LIVRAISON =================
  public getLikedProductIds(): number[] {
    try {
      const raw = localStorage.getItem('ze_liked_products_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return Array.from(new Set(parsed.map(n => Number(n)).filter(n => Number.isFinite(n) && n > 0)));
        }
      }
    } catch {}
    return [];
  }

  public isProductLiked(productId: number | string): boolean {
    const numId = Number(productId);
    if (!Number.isFinite(numId)) return false;
    return this.getLikedProductIds().includes(numId);
  }

  public setLikedProductIds(ids: number[], userId?: string): number[] {
    const cleanIds = Array.from(new Set((ids || []).map(n => Number(n)).filter(n => Number.isFinite(n) && n > 0)));
    try {
      localStorage.setItem('ze_liked_products_v1', JSON.stringify(cleanIds));
    } catch {}
    const uid = userId || auth.currentUser?.uid;
    if (uid) {
      updateDoc(doc(db, 'users', uid), {
        likedProductIds: cleanIds,
        updatedAt: new Date().toISOString()
      }).catch(() => {});
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ze_liked_products_updated', { detail: cleanIds }));
    }
    this.listeners.forEach(fn => {
      try {
        fn();
      } catch {}
    });
    return cleanIds;
  }

  public toggleLikedProduct(productId: number | string, userId?: string): boolean {
    const numId = Number(productId);
    if (!Number.isFinite(numId) || numId <= 0) return false;
    const current = this.getLikedProductIds();
    const exists = current.includes(numId);
    const next = exists ? current.filter(id => id !== numId) : [numId, ...current];
    this.setLikedProductIds(next, userId);
    return !exists;
  }

  public getLikedProducts(): ExtendedProduct[] {
    const likedIds = this.getLikedProductIds();
    if (likedIds.length === 0) return [];
    const all = this.getProducts(false);
    return likedIds
      .map(id => all.find(p => Number(p.id) === Number(id)))
      .filter((p): p is ExtendedProduct => Boolean(p));
  }

  public getEffectiveClientCountry(userProfile?: any): string {
    const profileCountry = userProfile?.country || userProfile?.defaultCountry;
    if (profileCountry && String(profileCountry).trim()) {
      return resolveCanonicalCountryName(String(profileCountry).trim());
    }
    try {
      const raw = localStorage.getItem('ze_user_profile_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.country && String(parsed.country).trim()) {
          return resolveCanonicalCountryName(String(parsed.country).trim());
        }
      }
    } catch {}
    const defaultSysCountry = siteSettingsService.getSettings()?.defaultClientCountry || 'Sénégal';
    return resolveCanonicalCountryName(defaultSysCountry) || 'Sénégal';
  }

  public isCountryDeliverableForProduct(
    targetCountry: string,
    productOrDraft?: Partial<ExtendedProduct> | null
  ): {
    deliverable: boolean;
    canonicalCountry: string;
    supportedCountries: string[];
    warehouseName?: string;
    isSourcing: boolean;
  } {
    const canonicalCountry = resolveCanonicalCountryName(targetCountry || this.getEffectiveClientCountry());
    const globalSupported = siteSettingsService.getSettings()?.supportedDeliveryCountries || DEFAULT_SUPPORTED_DELIVERY_COUNTRIES;
    if (!productOrDraft) {
      return {
        deliverable: isDeliveryCountrySupported(canonicalCountry, globalSupported),
        canonicalCountry,
        supportedCountries: globalSupported,
        isSourcing: false
      };
    }
    const isSourcing = isProductSourcing(productOrDraft);
    const whInfo = this.getProductWarehouseAndFreight(productOrDraft);
    const supportedCountries = whInfo.supportedDeliveryCountries && whInfo.supportedDeliveryCountries.length > 0
      ? whInfo.supportedDeliveryCountries
      : globalSupported;
    const deliverable = isDeliveryCountrySupported(canonicalCountry, supportedCountries);
    return {
      deliverable,
      canonicalCountry,
      supportedCountries,
      warehouseName: whInfo.hasAssignedWarehouse ? whInfo.warehouse.name : undefined,
      isSourcing
    };
  }

  // ================= AUDIT =================
  public getAuditLogs(): AuditLog[] {
    return this.auditLogs;
  }
}

export const catalogService = new CatalogService();

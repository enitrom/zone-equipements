import { PRODUCTS, CATEGORIES, Product, getProductImageUrl } from '../constants';
import { db } from '../firebase';
import { collection, getDocs, getDoc, setDoc, doc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { siteSettingsService } from './siteSettingsService';

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
  'package': 'Conditionnement'
};

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
    .replace(/\bcountry of origin\b/gi, "Pays d'origine")
    .replace(/\bbrand name\b/gi, 'Nom de marque')
    .replace(/\bmodel number\b/gi, 'Numéro de modèle')
    .replace(/\bproduct name\b/gi, 'Désignation du produit')
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
    .replace(/\borigin\b/gi, 'Origine');
  return translated.charAt(0).toUpperCase() + translated.slice(1);
}

export function translateSpecValueToFrenchClient(rawVal: string): string {
  if (!rawVal) return '';
  let text = String(rawVal).trim();
  if (!text) return '';

  text = text
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

export function translateSpecsRecordToFrench(specs?: Record<string, any>): Record<string, string> {
  if (!specs || typeof specs !== 'object' || Array.isArray(specs)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(specs)) {
    if (v === null || v === undefined) continue;
    const rawStrVal = typeof v === 'object' ? JSON.stringify(v) : String(v);
    const frK = translateSpecKeyToFrenchClient(String(k));
    const frV = translateSpecValueToFrenchClient(rawStrVal);
    if (frK && frV) {
      out[frK] = frV;
    }
  }
  return out;
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
  sourcePlatform?: 'Alibaba' | 'AliExpress' | '1688' | 'Made-in-China' | 'Europe' | 'USA' | 'Manuel';
  shippingMethod?: 'air' | 'sea' | 'none';
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
  image?: string; // Image principale
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
  variantId?: string;
  variantName?: string;
  variantDescription?: string;
  description?: string;
  img?: string;
  image?: string;
  brand: string;
  price: number;
  costPrice?: number;
  supplierPrice?: number;
  supplierCurrency?: 'USD' | 'EUR' | 'CNY' | 'XOF';
  supplierId?: string;
  supplierName?: string;
  supplierProductUrl?: string;
  quantity: number;
  origin?: string;
  shippingMethod?: 'air' | 'sea' | 'none';
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
  items: OrderItem[];
  subtotalHT: number;
  vatAmount: number; // 18% ou 0 si exonéré
  shippingTotal: number;
  shippingCost?: number;
  totalTTC: number;
  totalCostPrice: number;
  estimatedMargin: number;
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

// Zéro commande fictive - environnement 100% réel pour les tests utilisateur
const DEFAULT_ORDERS: Order[] = [];

const DEFAULT_AGENT_WAREHOUSES: AgentWarehouse[] = [
  {
    id: 'aw-default-1',
    name: 'Entrepôt Transit Principal (Guangzhou / International)',
    identificationMode: 'agent_code',
    hasAgentCode: true,
    agentCode: 'DKR628',
    airAgentCode: 'DKR628+AIR',
    seaAgentCode: 'DKR628+SEA',
    firstName: 'Zone',
    lastName: 'Équipements',
    companyName: 'ZONE ÉQUIPEMENTS SÉNÉGAL',
    phone: '+221 76 653 83 84',
    email: 'zoneequipements@gmail.com',
    notes: 'Inscrire le Code Agent et l’étiquette colis sur chaque carton.',
    recipientFirstName: 'Zone',
    recipientLastName: 'Équipements',
    recipientCompany: 'ZONE ÉQUIPEMENTS SÉNÉGAL',
    contactPhone: '+221 76 653 83 84',
    contactEmail: 'zoneequipements@gmail.com',
    address: 'Room 102, Building B, Baiyun International Logistics Park',
    city: 'Guangzhou',
    country: 'Chine',
    postalCode: '510400',
    instructions: 'Inscrire le Code Agent et l’étiquette colis sur chaque carton.',
    isDefault: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'aw-standard-2',
    name: 'Entrepôt Standard Europe (Nom, Prénom & Adresse)',
    identificationMode: 'standard_address',
    hasAgentCode: false,
    firstName: 'Moussa',
    lastName: 'Diop',
    companyName: 'Zone Équipements Transit',
    phone: '+33 6 00 00 00 00',
    email: 'zoneequipements@gmail.com',
    notes: 'Livraison standard nominative (sans code agent) : indiquer Nom, Prénom et Téléphone sur le colis.',
    recipientFirstName: 'Moussa',
    recipientLastName: 'Diop',
    recipientCompany: 'Zone Équipements Transit',
    contactPhone: '+33 6 00 00 00 00',
    contactEmail: 'zoneequipements@gmail.com',
    address: '14 Rue de l’Industrie, Zone Logistique Nord',
    city: 'Paris / Roissy',
    country: 'France',
    postalCode: '95700',
    instructions: 'Livraison standard nominative (sans code agent) : indiquer Nom, Prénom et Téléphone sur le colis.',
    isDefault: false,
    createdAt: new Date().toISOString()
  }
];

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
      });
    } catch (e) {
      console.warn('Sync deleted registry error:', e);
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
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.agentWarehouses = parsed.filter(
            (w: any) => w && !(deletedReg.agentWarehouses || []).includes(String(w.id))
          );
        }
      }
      if (this.agentWarehouses.length === 0) {
        this.agentWarehouses = [...DEFAULT_AGENT_WAREHOUSES];
        this.saveAgentWarehouses();
      }
    } catch {
      this.agentWarehouses = [...DEFAULT_AGENT_WAREHOUSES];
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
      deleteDoc(doc(db, 'orders', String(id))).catch(console.error);
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
      const finalImg = p.img || p.image || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600';
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

      return {
        ...p,
        name: cleanName,
        description: cleanDesc,
        specs: Object.keys(cleanSpecs).length > 0 ? cleanSpecs : p.specs,
        inStock: !isSourcing,
        availabilityMode: (isSourcing ? 'sourcing' : 'stock') as 'sourcing' | 'stock',
        shippingMethod: (isSourcing ? (p.shippingMethod && p.shippingMethod !== 'none' ? p.shippingMethod : 'air') : 'none') as 'air' | 'sea' | 'none',
        price: effectivePrice,
        costPrice: effectiveCost,
        options: normVars,
        variants: normVars,
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

    const newProduct: ExtendedProduct = {
      id: newId,
      name: cleanNewName,
      brand: cleanBrand(pData.brand, cleanNewName),
      price: resolvedPrice,
      category: cat,
      subcategory: subcat,
      img: pData.img || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600',
      images: pData.images && pData.images.length > 0 ? pData.images : (pData.img ? [pData.img] : []),
      showDeposit: pData.showDeposit ?? false,
      depositPercentage: pData.depositPercentage || 30,
      rating: pData.rating || 5.0,
      reviews: pData.reviews || 1,
      sector: pData.sector || 'Industrie Générale',
      model: pData.model || `MOD-${newId}`,
      ref: pData.ref || `ZE-MRO-${newId}`,
      specs: cleanNewSpecs,
      description: cleanNewDesc,
      extendedDescription: pData.extendedDescription || 'Livré avec conformité d\'origine et traçabilité constructeur assurée.',
      origin: pData.origin || (isSourcingNew ? 'Chine' : 'Dakar, Sénégal'),
      packageQty: pData.packageQty || 1,
      moq: pData.moq || 1,
      weight: pData.weight || '1.0 kg',
      warranty: pData.warranty || '1 an garantie constructeur',
      leadTime: pData.leadTime || (isSourcingNew ? '7-14 jours express DAP Dakar' : 'Livraison immédiate 24-48h Dakar'),
      isOnline: pData.isOnline ?? true,
      inStock: !isSourcingNew,
      availabilityMode: isSourcingNew ? 'sourcing' : 'stock',
      costPrice: resolvedCostPrice,
      supplierPrice: pData.supplierPrice ?? 0,
      supplierCurrency: pData.supplierCurrency || 'USD',
      supplierId: pData.supplierId,
      supplierName: pData.supplierName,
      supplierUrl: pData.supplierUrl,
      sourcePlatform: pData.sourcePlatform || (isSourcingNew ? 'Alibaba' : 'Manuel'),
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
      dimensions: pData.dimensions,
      hsCode: pData.hsCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.products.unshift(newProduct);
    this.saveProducts();
    setDoc(doc(db, 'products', String(newProduct.id)), cleanUndefined(newProduct)).catch(console.error);
    
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
    setDoc(doc(db, 'products', String(updated.id)), cleanUndefined(updated)).catch(console.error);

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
    deleteDoc(doc(db, 'products', idStr)).catch((err) => {
      console.error("Erreur suppression Firestore:", err);
    });

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
    volumeCbm?: number;
    seaRatePerKgXOF?: number;
    seaRatePerCbmXOF?: number;
    ignoreSeaWeight?: boolean;
    ignoreSeaVolume?: boolean;
    preferredFreight?: 'none' | 'auto' | 'air' | 'sea' | 'express';
    marginRate?: number;
    warehouseDeliveryUSD?: number;
    applyVat?: boolean;
  }) {
    const settings = siteSettingsService.getSettings();
    const rates = settings?.exchangeRates || EXCHANGE_RATES;
    const rate = (rates as any)[params.supplierCurrency] || EXCHANGE_RATES[params.supplierCurrency] || 1;
    const usdRate = rates.USD || EXCHANGE_RATES['USD'] || 610;
    const hasPositiveSupplierPrice = Number(params.supplierPrice) > 0;
    const supplierPriceXOF = hasPositiveSupplierPrice ? Math.round(params.supplierPrice * rate) : 0;
    const warehouseDeliveryXOF = hasPositiveSupplierPrice ? Math.round((params.warehouseDeliveryUSD || 0) * usdRate) : 0;

    // 1. Prix de base équipement HT (hors fret international)
    const defaultMargin = (settings?.defaultMarginPercentage ?? 35) / 100;
    const margin = params.marginRate ?? defaultMargin;
    const priceEquipmentHT = hasPositiveSupplierPrice ? Math.round((supplierPriceXOF + warehouseDeliveryXOF) / (1 - margin)) : 0;
    const configuredVatRate = (settings?.vatRate ?? 18) / 100;
    const vatRate = (params.applyVat ?? true) ? configuredVatRate : 0;
    const vatAmount = hasPositiveSupplierPrice ? Math.round(priceEquipmentHT * vatRate) : 0;
    const priceEquipmentTTC = priceEquipmentHT + vatAmount;

    // 2. Calcul du Fret Aérien & Express dynamique selon les barèmes configurés
    const validWeight = Math.max(params.weightKg || 1, 0.1);
    const isAirEligible = validWeight <= 20;
    const airRateKg = settings?.airFreightPerKg || FREIGHT_RATES.AIR_PER_KG_XOF;
    const airMinCharge = settings?.airFreightMin || airRateKg;
    const airFreightCostXOF = Math.max(Math.round(validWeight * airRateKg), airMinCharge);

    const expressRateKg = settings?.expressFreightPerKg || 15000;
    const expressMinCharge = settings?.expressFreightMin || 22500;
    const expressFreightCostXOF = Math.max(Math.round(validWeight * expressRateKg), expressMinCharge);

    // 3. Calcul Transparent du Fret Maritime (Poids kg vs Volume CBM) selon barème configuré
    const seaRateKg = params.seaRatePerKgXOF ?? (settings?.seaFreightPerKg || FREIGHT_RATES.SEA_PER_KG_XOF);
    const seaMinCharge = settings?.seaFreightMin || FREIGHT_RATES.SEA_MIN_CHARGE_XOF;
    const seaRateCbm = params.seaRatePerCbmXOF ?? Math.round((settings?.seaFreightPerCbmUSD || 220) * usdRate);
    const computedVolumeCbm = params.volumeCbm && params.volumeCbm > 0 
      ? params.volumeCbm 
      : Number((validWeight / 250).toFixed(3));

    const seaCostByWeightXOF = params.ignoreSeaWeight ? 0 : Math.round(validWeight * seaRateKg);
    const seaCostByVolumeXOF = params.ignoreSeaVolume ? 0 : Math.round(computedVolumeCbm * seaRateCbm);

    let seaFreightCostXOF = seaMinCharge;
    let seaCalculationBasis = 'Poids & Volume (Max)';

    if (params.ignoreSeaWeight && !params.ignoreSeaVolume) {
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

    let shippingMethod: 'none' | 'air' | 'sea' = 'none';
    let freightCostXOF = 0;

    if (params.preferredFreight === 'sea') {
      shippingMethod = 'sea';
      freightCostXOF = seaFreightCostXOF;
    } else if (params.preferredFreight === 'air' || params.preferredFreight === 'express') {
      shippingMethod = isAirEligible ? 'air' : 'sea';
      freightCostXOF = params.preferredFreight === 'express'
        ? expressFreightCostXOF
        : (isAirEligible ? airFreightCostXOF : seaFreightCostXOF);
    } else if (params.preferredFreight === 'none') {
      shippingMethod = 'none';
      freightCostXOF = 0;
    } else {
      shippingMethod = isAirEligible ? 'air' : 'sea';
      freightCostXOF = isAirEligible ? airFreightCostXOF : seaFreightCostXOF;
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
      defaultCurrency = 'USD';
    } else if (cleanUrl.includes('alibaba.')) {
      detectedPlatform = 'Alibaba';
      defaultCurrency = 'USD';
    } else if (cleanUrl.includes('1688.com')) {
      detectedPlatform = '1688';
      defaultCurrency = 'CNY';
    } else if (cleanUrl.includes('made-in-china.')) {
      detectedPlatform = 'Made-in-China';
      defaultCurrency = 'USD';
    } else if (cleanUrl.includes('.fr') || cleanUrl.includes('.de') || cleanUrl.includes('.eu') || cleanUrl.includes('manutan') || cleanUrl.includes('rs-online')) {
      detectedPlatform = 'Europe';
      defaultCurrency = 'EUR';
    } else if (cleanUrl.includes('amazon.com') || cleanUrl.includes('grainger') || cleanUrl.includes('mcmaster')) {
      detectedPlatform = 'USA';
      defaultCurrency = 'USD';
    }

    // Extraction uniquement si un slug réel existe dans l'URL
    let guessedTitle = '';
    try {
      const urlObj = new URL(url);
      const pathname = decodeURIComponent(urlObj.pathname);
      const pathParts = pathname.split('/').filter(Boolean);
      
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
    } catch {
      // Fallback
    }

    const pricing = this.calculatePricing({
      supplierPrice: 0,
      supplierCurrency: defaultCurrency,
      weightKg: 0,
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
    const orderNumber = `${prefix}-${String(nextSeq).padStart(4, '0')}`;
    const id = `ord-${Date.now()}`;

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
      items: enrichedItems,
      subtotalHT,
      vatAmount,
      shippingTotal: oData.shippingTotal || 0,
      totalTTC: oData.totalTTC || 0,
      totalCostPrice,
      estimatedMargin,
      status: oData.isQuote ? 'Reçue' : 'En attente paiement',
      paymentMethod: oData.paymentMethod || 'Wave',
      paymentStatus: 'Non payé',
      isQuote: !!oData.isQuote,
      ethicalContractAccepted: true,
      sourcePlatform: oData.sourcePlatform || 'Chine / International',
      supplierId: resolvedSupplierId,
      supplierName: resolvedSupplierName,
      supplierPoStatus: oData.supplierPoStatus || 'Non transmis',
      agentCode,
      agentWarehouseId: oData.agentWarehouseId || resolvedWarehouse?.id,
      clientWarehouseId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.orders.unshift(newOrder);
    this.saveOrders();
    setDoc(doc(db, 'orders', String(newOrder.id)), cleanUndefined(newOrder)).catch(console.error);
    this.logAction(
      oData.customerName || 'Client',
      oData.isQuote ? 'Nouveau Devis' : 'Nouvelle Commande',
      `${oData.isQuote ? 'Demande de devis' : 'Passage de commande'} ${orderNumber} pour un montant de ${newOrder.totalTTC.toLocaleString('fr-FR')} FCFA`,
      'commande'
    );
    this.notifyOrdersChange();
    return newOrder;
  }

  public updateOrderStatus(id: string, status: Order['status'], author = 'Admin'): Order {
    this.getOrders();
    const index = this.orders.findIndex(o => o.id === id);
    if (index === -1) throw new Error("Commande non trouvée");

    const oldStatus = this.orders[index].status;
    this.orders[index].status = status;
    this.orders[index].updatedAt = new Date().toISOString();
    this.saveOrders();
    setDoc(doc(db, 'orders', String(id)), cleanUndefined(this.orders[index])).catch(console.error);

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
    setDoc(doc(db, 'orders', String(id)), cleanUndefined(this.orders[index])).catch(console.error);

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
    setDoc(doc(db, 'orders', String(this.orders[index].id)), cleanUndefined(this.orders[index])).catch(console.error);
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
    setDoc(doc(db, 'orders', String(this.orders[index].id)), cleanUndefined(this.orders[index])).catch(console.error);
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

  // ================= ENTREPÔTS D'AGENTS (AVEC CODE AGENT OU MÉTHODE STANDARD) =================
  private normalizeWarehouse(w: AgentWarehouse): AgentWarehouse {
    const fName = w.firstName ?? w.recipientFirstName ?? '';
    const lName = w.lastName ?? w.recipientLastName ?? '';
    const comp = w.companyName ?? w.recipientCompany ?? '';
    const ph = w.phone ?? w.contactPhone ?? '';
    const em = w.email ?? w.contactEmail ?? '';
    const nt = w.notes ?? w.instructions ?? '';
    const isCodeMode = w.identificationMode === 'agent_code' && Boolean(w.agentCode?.trim());
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
      instructions: nt
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
            if (deletedWh.includes(whId) || deletedWh.includes(snapDoc.id)) {
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
          } else if (this.agentWarehouses.length > 0) {
            for (const wh of this.agentWarehouses) {
              setDoc(doc(db, 'agent_warehouses', String(wh.id)), cleanUndefined(this.normalizeWarehouse(wh))).catch(() => {});
            }
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
    if (this.agentWarehouses.length === 0) {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.AGENT_WAREHOUSES);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.agentWarehouses = parsed.map((w: AgentWarehouse) => this.normalizeWarehouse(w));
          }
        }
      } catch {}
      if (this.agentWarehouses.length === 0) {
        this.agentWarehouses = DEFAULT_AGENT_WAREHOUSES.map(w => this.normalizeWarehouse(w));
        this.saveAgentWarehouses();
      }
    }
    return this.agentWarehouses.map(w => this.normalizeWarehouse(w));
  }

  public getDefaultAgentWarehouse(): AgentWarehouse {
    const list = this.getAgentWarehouses();
    return list.find(w => w.isDefault) || list[0] || DEFAULT_AGENT_WAREHOUSES[0];
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
      country: (data.country || '').trim(),
      notes: data.notes ?? data.instructions ?? '',
      isDefault,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    this.agentWarehouses.push(newWh);
    this.saveAgentWarehouses();
    setDoc(doc(db, 'agent_warehouses', String(newWh.id)), cleanUndefined(newWh)).catch(console.error);
    this.logAction(author, 'Ajout Entrepôt Agent', `Entrepôt d'agent ajouté : ${newWh.name}`, 'fournisseur');
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
      id,
      updatedAt: new Date().toISOString()
    });
    this.agentWarehouses[idx] = merged;
    if (!this.agentWarehouses.some(w => w.isDefault) && this.agentWarehouses.length > 0) {
      this.agentWarehouses[0].isDefault = true;
    }
    this.saveAgentWarehouses();
    setDoc(doc(db, 'agent_warehouses', String(id)), cleanUndefined(merged)).catch(console.error);
    this.logAction(author, 'Modification Entrepôt Agent', `Entrepôt d'agent modifié : ${merged.name}`, 'fournisseur');
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
    if (this.agentWarehouses.length <= 1) return false;
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
    deleteDoc(doc(db, 'agent_warehouses', String(id))).catch(console.error);

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
      return existing;
    }

    // Create new supplier
    const newSup = this.addSupplier({
      name: cleanName,
      platform: sData.platform || 'Alibaba',
      country: sData.country || 'Chine',
      currency: sData.currency || 'USD',
      websiteUrl: sData.storeUrl || '',
      paymentTerms: 'Trade Assurance / 30% acompte',
      leadTimeAvg: '15-20 jours',
      shippingMinMaxUSD: '$6 - $12 / kg',
      circuit: 'automatisé',
      rating: 4.9,
      notes: sData.notes || "Fournisseur extrait et ajouté automatiquement lors de l'importation de produit."
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
      agentWarehouseId: sData.agentWarehouseId || '',
      rating: sData.rating || 4.8,
      notes: sData.notes || ''
    };
    this.suppliers.push(newSupplier);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ze_suppliers_seeded_v2', 'true');
    }
    this.saveSuppliers();
    setDoc(doc(db, 'suppliers', String(newSupplier.id)), cleanUndefined(newSupplier)).catch(console.error);
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
    setDoc(doc(db, 'suppliers', String(id)), cleanUndefined(updated)).catch(console.error);
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
      deleteDoc(doc(db, 'suppliers', String(id))).catch(console.error);
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
        title: 'Arrivée au Sénégal - Procédure douanière',
        body: `Bonjour ${order.customerName},\n\nVotre commande N° ${order.orderNumber} est arrivée sur le territoire sénégalais. Nos agents gèrent les formalités de dédouanement et le contrôle d'intégrité.`
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
    setDoc(doc(db, 'orders', String(orderId)), cleanUndefined(order)).catch(console.error);
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
    setDoc(doc(db, 'orders', String(orderId)), cleanUndefined(order)).catch(console.error);
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
    setDoc(doc(db, 'supplier_tokens', tokenCode), cleanUndefined(newToken)).catch(console.error);

    // Associer le token aux commandes concernées et les passer en PO Envoyé si non transmis
    params.orderIds.forEach(oid => {
      const ord = this.getOrderById(oid);
      if (ord) {
        ord.supplierPortalToken = tokenCode;
        if (!ord.supplierPoStatus || ord.supplierPoStatus === 'Non transmis') {
          ord.supplierPoStatus = 'PO Envoyé';
        }
        ord.updatedAt = new Date().toISOString();
        setDoc(doc(db, 'orders', String(ord.id)), cleanUndefined(ord)).catch(console.error);
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
    setDoc(doc(db, 'supplier_tokens', tokenCode), cleanUndefined(this.supplierTokens[idx])).catch(console.error);
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
    setDoc(doc(db, 'orders', String(orderId)), cleanUndefined(order)).catch(console.error);
    this.logAction(
      author,
      'Mise à jour Logistique / Suivi',
      `Commande ${order.orderNumber} mise à jour (Tracking: ${order.trackingNumber || 'N/A'}, Code Agent: ${order.agentCode || 'N/A'})`,
      'commande'
    );
    this.notifyOrdersChange();
  }

  // ================= AUDIT =================
  public getAuditLogs(): AuditLog[] {
    return this.auditLogs;
  }
}

export const catalogService = new CatalogService();

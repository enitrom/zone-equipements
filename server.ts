import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import * as cheerio from "cheerio";

// Helper to clean repeated concatenated words or duplicate halves (e.g. "KATHERKATHER" -> "KATHER", "typetype" -> "Type", "Farm CultivatorFarm Cultivator" -> "Farm Cultivator")
function cleanRepeatedText(str: string): string {
  if (!str || typeof str !== 'string') return '';
  let s = str.trim();

  // 1. Exact identical halves (e.g. "KATHERKATHER" -> "KATHER", "typetype" -> "type")
  const len = s.length;
  if (len >= 4 && len % 2 === 0) {
    const h1 = s.substring(0, len / 2);
    const h2 = s.substring(len / 2);
    if (h1.toLowerCase() === h2.toLowerCase()) {
      s = h1;
    }
  }

  // 2. Space-delimited identical halves (e.g. "Farm Cultivator Farm Cultivator" -> "Farm Cultivator")
  const words = s.split(/\s+/);
  if (words.length >= 2 && words.length % 2 === 0) {
    const half1 = words.slice(0, words.length / 2).join(' ');
    const half2 = words.slice(words.length / 2).join(' ');
    if (half1.toLowerCase() === half2.toLowerCase()) {
      s = half1;
    }
  }

  // 3. Repeated adjacent duplicate tokens (e.g. "Cultivateur à la ferme Cultivateur à la ferme")
  return s.trim();
}

// Helper to sanitize product titles from platform artifacts like "Buy ... Product on Alibaba.com"
function cleanProductTitle(title: string): string {
  if (!title) return '';
  return cleanRepeatedText(title)
    .replace(/^Buy\s+/gi, '')
    .replace(/\bBuy\s+/gi, '')
    .replace(/\s+Product on Alibaba\.com.*$/gi, '')
    .replace(/\s+on Alibaba\.com.*$/gi, '')
    .replace(/\s*[-–|•]\s*Alibaba\.com.*$/gi, '')
    .replace(/\s*[-–|•]\s*AliExpress.*$/gi, '')
    .replace(/\s*[-–|•]\s*Made-in-China.*$/gi, '')
    .replace(/\s*[-–|•]\s*Amazon\.com.*$/gi, '')
    .replace(/Buy\s+.*?Product on Alibaba\.com/gi, '')
    .replace(/\b(Hot Sale|Factory Price|Wholesale Price|Dropshipping|Free Shipping|Direct Factory)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Set of cosmetic color words in English, French and standard naming to eliminate noise
const COSMETIC_COLORS = new Set([
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

function isCosmeticColor(str: string): boolean {
  if (!str) return false;
  const clean = str.toLowerCase().replace(/^(?:color|couleur|colore)\s*[:=]\s*/i, '').trim();
  if (COSMETIC_COLORS.has(clean)) return true;
  const withoutTrailingNumbers = clean.replace(/\s*\d+$/, '').trim();
  if (COSMETIC_COLORS.has(withoutTrailingNumbers)) return true;
  return false;
}

// Clean and filter variant names: discards cosmetic colors, cleans technical prefixes, standardizes terms
function cleanAndFilterVariantName(rawName: string): string | null {
  if (!rawName || typeof rawName !== 'string') return null;
  let s = cleanRepeatedText(rawName).trim();
  if (!s || s.length > 90) return null;

  // 1. Discard if it is a pure cosmetic color
  if (isCosmeticColor(s)) {
    return null;
  }

  // 2. Strip "Color :" or "Couleur :" prefix if the rest is actually a technical specification
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

// Helper pour nettoyer et séparer les options de déclinaisons collées sans espaces
function sanitizeVariantOptionString(opt: string): string[] {
  if (!opt || typeof opt !== 'string') return [];
  const trimmed = opt.trim();
  if (!trimmed) return [];

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

// Helper for standard French translations of common B2B industrial attribute keys
const FRENCH_SPEC_DICTIONARY: Record<string, string> = {
  'type': 'Type d\'équipement',
  'machine type': 'Type de machine',
  'type de machine': 'Type de machine',
  'power type': 'Type d\'alimentation',
  'type dalimentation': 'Type d\'alimentation',
  'core components': 'Composants essentiels',
  'composants essentiels': 'Composants essentiels',
  'commercial warranty': 'Garantie commerciale',
  'garantie commerciale': 'Garantie commerciale',
  'key selling points': 'Arguments clés de vente',
  'arguments de vente clés': 'Arguments clés de vente',
  'machinery test report': 'Rapport d\'essai machine',
  'rapport dessai de machines': 'Rapport d\'essai machine',
  'video outgoing-inspection': 'Inspection vidéo au départ',
  'inspection vidéo au départ': 'Inspection vidéo au départ',
  'place of origin': 'Lieu d\'origine',
  'lieu dorigine': 'Lieu d\'origine',
  'weight': 'Poids net',
  'poids': 'Poids net',
  'unique poids brut': 'Poids brut emballé',
  'single gross weight': 'Poids brut unitaire',
  'gross weight': 'Poids brut',
  'use': 'Utilisation / Applications',
  'utilisation': 'Utilisation / Applications',
  'brand name': 'Nom de marque',
  'nom de marque': 'Nom de marque',
  'dimensions': 'Dimensions (L*l*H)',
  'dimensions (l*l*h)': 'Dimensions (L*l*H)',
  'product name': 'Nom du produit',
  'nom du produit': 'Nom du produit',
  'engine type': 'Type de motorisation',
  'type de moteur': 'Type de motorisation',
  'function': 'Fonction principale',
  'fonction': 'Fonction principale',
  'color': 'Couleur / Finition',
  'couleur': 'Couleur / Finition',
  'moq': 'Quantité minimum de commande',
  'quantité minimale de commande': 'Quantité minimum de commande',
  'transmission type': 'Type de transmission',
  'type de transmission': 'Type de transmission',
  'application': 'Domaines d\'application',
  'after-sales service provided': 'Service après-vente',
  'service après-vente fourni': 'Service après-vente',
  'warranty of core components': 'Garantie composants essentiels',
  'garantie des composants essentiels': 'Garantie composants essentiels',
  'packaging and delivery': 'Emballage & Expédition',
  'emballage et livraison': 'Emballage & Expédition',
  'selling units': 'Conditionnement de vente',
  'vente unités': 'Conditionnement de vente',
  'single package size': 'Dimensions colis unitaire',
  'seul paquet taille': 'Dimensions colis unitaire',
  'rated power': 'Puissance nominale',
  'puissance nominale': 'Puissance nominale',
  'max power': 'Puissance maximale',
  'puissance maximale': 'Puissance maximale',
  'rated voltage': 'Tension nominale',
  'tension nominale': 'Tension nominale',
  'frequency': 'Fréquence',
  'fréquence': 'Fréquence',
  'phase': 'Type de courant (Phase)',
  'speed': 'Vitesse de rotation',
  'cooling system': 'Système de refroidissement',
  'starting system': 'Système de démarrage',
  'fuel tank capacity': 'Capacité réservoir carburant',
  'fuel consumption': 'Consommation carburant',
  'noise level': 'Niveau sonore',
  'alternator': 'Alternateur',
  'engine model': 'Modèle moteur',
  'displacement': 'Cylindrée',
  'insulation class': 'Classe d\'isolation',
  'continuous running time': 'Autonomie continue',
  'power factor': 'Facteur de puissance',
  'bore*stroke': 'Alésage x Course',
  'compression ratio': 'Taux de compression'
};

// Helper to robustly parse price strings or ranges into a valid number
function parsePrice(rawPrice: any, fallback: number): number {
  if (typeof rawPrice === 'number' && !isNaN(rawPrice) && rawPrice > 0) return rawPrice;
  if (!rawPrice) return fallback;
  
  // Normalize non-breaking spaces, narrow spaces, and entities
  const rawStr = String(rawPrice)
    .replace(/&nbsp;/gi, ' ')
    .replace(/[\u00a0\u202f\u2009\u200a]/g, ' ')
    .trim();

  // Split potential price ranges like "144 420 F CFA - 55 358 F CFA" or "$88.00 - $230.00"
  const parts = rawStr.split(/[-–—]|(?:\s+to\s+)|\s+à\s+/i);
  const foundPrices: number[] = [];

  for (const part of parts) {
    const cleanPart = part.replace(/F\s*CFA|FCFA|CFA|XOF|USD|EUR|CNY|\$|€|¥/gi, '').trim();
    if (!cleanPart) continue;

    // 1. Check for space-separated thousands e.g. "144 420" or "144 420,50"
    const spaceMatch = cleanPart.match(/(\d{1,3}(?:\s+\d{3})+)(?:[\.,](\d+))?/);
    if (spaceMatch) {
      const whole = spaceMatch[1].replace(/\s+/g, '');
      const dec = spaceMatch[2] ? '.' + spaceMatch[2] : '';
      const num = parseFloat(whole + dec);
      if (!isNaN(num) && num > 0) {
        foundPrices.push(num);
        continue;
      }
    }

    // 2. Check for comma-separated thousands e.g. "144,420" or "144,420.00"
    const commaMatch = cleanPart.match(/(\d{1,3}(?:,\d{3})+)(?:\.(\d+))?/);
    if (commaMatch) {
      const whole = commaMatch[1].replace(/,/g, '');
      const dec = commaMatch[2] ? '.' + commaMatch[2] : '';
      const num = parseFloat(whole + dec);
      if (!isNaN(num) && num > 0) {
        foundPrices.push(num);
        continue;
      }
    }

    // 3. Standard floating point number
    const simpleMatch = cleanPart.match(/(\d+[\.,]?\d*)/);
    if (simpleMatch) {
      const num = parseFloat(simpleMatch[1].replace(',', '.'));
      if (!isNaN(num) && num > 0) {
        foundPrices.push(num);
      }
    }
  }

  if (foundPrices.length > 0) {
    // Return the highest unit tier price (e.g. sample price)
    return Math.max(...foundPrices);
  }

  return fallback;
}

// Helper to fix relative or protocol-relative image URLs and strip thumbnail suffixes
function fixImageUrl(imgUrl: string, baseUrl: string): string {
  if (!imgUrl || typeof imgUrl !== 'string') return '';
  let cleaned = imgUrl.trim();
  if (cleaned.startsWith('//')) cleaned = 'https:' + cleaned;
  if (cleaned.startsWith('/')) {
    try {
      const parsed = new URL(baseUrl);
      cleaned = parsed.origin + cleaned;
    } catch {
      // keep cleaned as is
    }
  }
  if (!cleaned.startsWith('http')) return '';

  // Remove Alibaba & AliExpress thumbnail resize suffixes to retrieve original high-resolution photos
  cleaned = cleaned
    .replace(/_\.webp$/i, '')
    .replace(/_[0-9]+x[0-9]+(q[0-9]+)?\.(jpg|png|jpeg|webp)$/i, '')
    .replace(/_50x50\..*$/i, '')
    .replace(/_100x100\..*$/i, '')
    .replace(/_220x220\..*$/i, '')
    .replace(/_350x350\..*$/i, '')
    .replace(/_800x800\..*$/i, '');

  return cleaned;
}

// Helper to normalize currency
function parseCurrency(rawCurr: string, defaultCurr: string, rawPriceStr?: string): string {
  const combined = `${rawCurr || ''} ${rawPriceStr || ''}`.toUpperCase();
  if (combined.includes('XOF') || combined.includes('CFA') || combined.includes('F CFA')) return 'XOF';
  if (combined.includes('EUR') || combined.includes('€')) return 'EUR';
  if (combined.includes('USD') || combined.includes('$')) return 'USD';
  if (combined.includes('CNY') || combined.includes('RMB') || combined.includes('¥')) return 'CNY';
  return defaultCurr;
}

// Helper to robustly parse weight strings (e.g. "500g", "1.5 kg", "2 lbs") into kg number
function parseWeight(rawWeight: any, fallback: number): number {
  if (typeof rawWeight === 'number' && !isNaN(rawWeight) && rawWeight > 0) return rawWeight;
  if (!rawWeight) return fallback;
  const str = String(rawWeight).toLowerCase().replace(/\s+/g, '');
  const matches = str.match(/(\d+[\.,]?\d*)/g);
  if (matches && matches.length > 0) {
    let num = parseFloat(matches[0].replace(',', '.'));
    if (!isNaN(num) && num > 0) {
      if (str.includes('g') && !str.includes('kg') && !str.includes('mg')) {
        num = num / 1000;
      } else if (str.includes('lb') || str.includes('livre')) {
        num = num * 0.453592;
      }
      return Number(num.toFixed(2));
    }
  }
  return fallback;
}

const app = express();
const PORT = 3000;

app.use(express.json());

// API route for AI Sourcing & Product Import using HTML fetching + Gemini structured output
app.post("/api/scrape-product", async (req, res) => {
  const { url, query, jsRender } = req.body;
  const inputVal = (url || query || '').trim();
  
  if (!inputVal) {
    return res.status(400).json({ error: "Veuillez fournir un lien URL ou une référence/nom de produit." });
  }

  let detectedPlatform = 'Alibaba';
  let defaultCurrency = 'USD';
  let estimatedPrice = 125;
  let estimatedWeight = 2.5;
  let category = 'Outillage';
  let brand = 'Industrie Pro';
  let country = 'Chine';
  let imageUrl = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800';
  let description = 'Matériel industriel professionnel haute résistance certifié pour la maintenance et la production.';

  const lower = inputVal.toLowerCase();
  if (lower.includes('aliexpress')) {
    detectedPlatform = 'AliExpress';
    estimatedPrice = 45;
    estimatedWeight = 1.2;
  } else if (lower.includes('1688')) {
    detectedPlatform = '1688';
    defaultCurrency = 'CNY';
    estimatedPrice = 320;
    estimatedWeight = 3.0;
  } else if (lower.includes('made-in-china')) {
    detectedPlatform = 'Made-in-China';
    estimatedPrice = 140;
    estimatedWeight = 6.5;
  } else if (lower.includes('.fr') || lower.includes('.de') || lower.includes('manutan') || lower.includes('rs-online')) {
    detectedPlatform = 'Europe';
    defaultCurrency = 'EUR';
    estimatedPrice = 180;
    estimatedWeight = 2.0;
    country = 'Allemagne';
  } else if (lower.includes('amazon') || lower.includes('grainger') || lower.includes('mcmaster')) {
    detectedPlatform = 'USA';
    estimatedPrice = 110;
    estimatedWeight = 3.0;
    country = 'États-Unis';
  }

  // Attempt scraping via ZenRows/ScraperAPI or direct fetch with realistic headers, backed by Gemini 3.8 Flash
  const apiKey = process.env.GEMINI_API_KEY;
  const zenrowsKey = process.env.ZENROWS_API_KEY;
  const scraperKey = process.env.SCRAPER_API_KEY;

  let rawHtml = '';
  let extractedTitle = '';
  let extractedPriceStr = '';
  let extractedCurrency = '';
  let extractedWeightStr = '';
  let extractedImages: string[] = [];
  let extractedDesc = '';
  let extractedSpecs: Record<string, string> = {};
  let extractedSupplierName = '';
  let extractedSupplierCountry = country;
  let extractedDimensions = '';
  let resolvedBrand = 'Constructeur Certifié';
  let translatedSpecs: Record<string, string> = {};
  let extractedOptions: string[] = [];
  let extractedVariants: Array<{ name: string; options: string[] }> = [];

  // Step 1: Fetch HTML if input is URL
  if (inputVal.startsWith('http')) {
    try {
      let targetUrl = inputVal;
      let headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://www.google.com/'
      };

      if (zenrowsKey) {
        const renderVal = jsRender === false ? 'false' : 'true';
        const waitParam = (renderVal === 'true' && (lower.includes('alibaba') || lower.includes('1688'))) ? '&wait=1500' : '';
        targetUrl = `https://api.zenrows.com/v1/?apikey=${zenrowsKey}&url=${encodeURIComponent(inputVal)}&js_render=${renderVal}&premium_proxy=true${waitParam}`;
        headers = {};
      } else if (scraperKey) {
        targetUrl = `http://api.scraperapi.com?api_key=${scraperKey}&url=${encodeURIComponent(inputVal)}&render=true`;
        headers = {};
      }

      const response = await fetch(targetUrl, { headers });
      if (response.ok) {
        rawHtml = await response.text();
      }
    } catch (fetchErr) {
      console.warn("Notice: direct HTML fetch notice:", fetchErr);
    }
  } else {
    // Input is raw text or pasted HTML snippet
    rawHtml = inputVal;
  }

  // Step 2: Cheerio extraction from HTML (if HTML was retrieved)
  if (rawHtml && rawHtml.length > 50) {
    try {
      const $ = cheerio.load(rawHtml);

      // 2.1 JSON-LD Structured Data
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const content = $(el).html()?.trim();
          if (!content) return;
          const json = JSON.parse(content);
          const items = Array.isArray(json) ? json : (json['@graph'] || [json]);
          for (const item of items) {
            if (item['@type'] === 'Product' || item.offers || item.sku) {
              if (item.name && !extractedTitle) extractedTitle = String(item.name).trim();
              if (item.description && !extractedDesc) extractedDesc = String(item.description).trim();
              if (item.brand?.name && !resolvedBrand) resolvedBrand = String(item.brand.name).trim();

              const offers = item.offers;
              if (offers) {
                const offerObj = Array.isArray(offers) ? offers[0] : offers;
                if (offerObj?.price && !extractedPriceStr) extractedPriceStr = String(offerObj.price);
                else if (offerObj?.lowPrice && !extractedPriceStr) extractedPriceStr = String(offerObj.lowPrice);
                if (offerObj?.priceCurrency && !extractedCurrency) extractedCurrency = String(offerObj.priceCurrency);
              }

              if (item.image) {
                if (Array.isArray(item.image)) {
                  item.image.forEach((img: any) => {
                    const u = typeof img === 'string' ? img : img?.url;
                    if (u && typeof u === 'string') extractedImages.push(u);
                  });
                } else if (typeof item.image === 'string') {
                  extractedImages.push(item.image);
                } else if (item.image?.url) {
                  extractedImages.push(item.image.url);
                }
              }

              if (item.weight) {
                extractedWeightStr = typeof item.weight === 'string' ? item.weight : `${item.weight.value || ''} ${item.weight.unitText || 'kg'}`;
              }
            }
          }
        } catch {}
      });

      // 2.2 Meta tags & OpenGraph
      if (!extractedTitle) extractedTitle = $('meta[property="og:title"]').attr('content') || $('meta[name="twitter:title"]').attr('content') || '';
      if (!extractedPriceStr) {
        extractedPriceStr = $('meta[property="product:price:amount"]').attr('content') || 
                            $('meta[property="og:price:amount"]').attr('content') || '';
      }
      if (!extractedCurrency) {
        extractedCurrency = $('meta[property="product:price:currency"]').attr('content') || 
                            $('meta[property="og:price:currency"]').attr('content') || '';
      }
      const ogImg = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content');
      if (ogImg) extractedImages.push(ogImg);

      // 2.3 Platform-Specific Parsing (Alibaba / AliExpress / Made-in-China / Amazon)
      if (lower.includes('alibaba') || rawHtml.includes('alibaba')) {
        if (!extractedTitle) {
          extractedTitle = cleanProductTitle($('h1.module_title, .product-title h1, h1[data-role="title"], [data-testid="product-title"]').text().trim());
        }

        // Direct Alibaba Tier Price & Sample Price Selector (e.g. data-testid="pc-purchase-price-tier-current")
        const tierPriceEl = $('[data-testid="pc-purchase-price-tier-current"], .pc-purchase-price-tier-current, [data-testid*="price-tier"], [data-testid="price-tier-current"]').first().text().trim();
        if (tierPriceEl) {
          extractedPriceStr = tierPriceEl;
        } else if (!extractedPriceStr) {
          extractedPriceStr = $('.price-item .price, .ma-spec-price, .promotion-price, .product-price, .price-format, [data-testid*="purchase-price"], strong.id-whitespace-nowrap').first().text().trim();
        }
        
        $('.main-image-thumb-ul img, .detail-gallery img, .image-item img, .detail-gallery-thumbnail img, .main-img, .image-magnifier img, [data-testid="main-image-thumb"] img').each((_, el) => {
          const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('image-src') || $(el).attr('data-magnify-src');
          if (src) extractedImages.push(src);
        });

        const companyEl = cleanRepeatedText($('.company-name, .supplier-name, .company-basic-name, a.company-head-name, .shop-name, .seller-info-title, a[href*="company_profile"], .company-item, .detail-company-card .name').first().text().trim());
        if (companyEl && !companyEl.toLowerCase().includes('alibaba')) {
          extractedSupplierName = companyEl;
        }

        const compMatch = rawHtml.match(/"(?:companyName|supplierName|sellerCompanyName|legalName)"\s*:\s*"([^"]{3,100})"/i);
        if (compMatch && compMatch[1] && !compMatch[1].toLowerCase().includes('alibaba')) {
          extractedSupplierName = cleanRepeatedText(compMatch[1].trim());
        }

        const priceRegexMatch = rawHtml.match(/"(?:ladderPriceList|priceRange|formattedPrice|promotionPrice|unitPrice)"\s*:\s*"([^"]+)"/i);
        if (priceRegexMatch && priceRegexMatch[1] && !extractedPriceStr) {
          extractedPriceStr = priceRegexMatch[1];
        }

        if (rawHtml.includes('F CFA') || rawHtml.includes('FCFA') || rawHtml.includes('XOF') || (extractedPriceStr && /FCFA|F\s*CFA|CFA|XOF/i.test(extractedPriceStr))) {
          extractedCurrency = 'XOF';
        }

        // Parse attributes table cleanly without parent+child text duplication
        $('[data-testid="module-attribute-row"], tr, .lead-item, .spec-item, .do-entry-item, .attribute-item, dl.do-entry-item').each((_, el) => {
          let key = $(el).find('[data-testid="module-attribute-name-text"]').first().text().trim();
          if (!key) {
            key = $(el).find('[data-testid="module-attribute-name"]').first().clone().children().remove().end().text().trim();
          }
          if (!key) {
            key = $(el).find('.do-entry-item-title, .key, dt, th, .spec-title').first().text().replace(/[:\s]+$/, '').trim();
          }

          let val = $(el).find('[data-testid="module-attribute-value-text"]').first().text().trim();
          if (!val) {
            val = $(el).find('[data-testid="module-attribute-value"]').first().clone().children().remove().end().text().trim();
          }
          if (!val) {
            val = $(el).find('.do-entry-item-val, .val, dd, td, .spec-value').first().text().trim();
          }

          if (!key && !val) {
            const divs = $(el).children('div');
            if (divs.length >= 2) {
              key = $(divs[0]).text().replace(/[:\s]+$/, '').trim();
              val = $(divs[1]).text().trim();
            }
          }

          key = cleanRepeatedText(key);
          val = cleanRepeatedText(val);

          if (key && val && key.length < 60 && val.length < 250) {
            const translatedKey = FRENCH_SPEC_DICTIONARY[key.toLowerCase()] || key;
            extractedSpecs[translatedKey] = val;

            const keyLower = key.toLowerCase();
            if (/nom de marque|brand\s*name|marque/i.test(keyLower) && val && !val.toLowerCase().includes('alibaba')) {
              resolvedBrand = cleanRepeatedText(val.trim());
            }
            if (/nom du produit|product\s*name/i.test(keyLower) && val && (!extractedTitle || extractedTitle.length < 5)) {
              extractedTitle = cleanProductTitle(val.trim());
            }
            if (/unique poids brut|gross\s*weight|poids\s*brut|poids|single\s*gross\s*weight/i.test(keyLower) && val) {
              const m = val.match(/(\d+[\.,]?\d*)\s*(kg|kilos|g|lb)/i);
              if (m) extractedWeightStr = `${m[1]} ${m[2]}`;
            }
            if (/seul paquet taille|single\s*package\s*size|dimensions|taille du paquet|dimension/i.test(keyLower) && val) {
              const dimMatch = val.match(/(\d+[\.,]?\d*\s*[xX*]\s*\d+[\.,]?\d*\s*[xX*]\s*\d+[\.,]?\d*\s*(?:cm|m|mm|inch)?)/i);
              if (dimMatch) extractedDimensions = dimMatch[1];
            }
            if (/lieu dorigine|lieu d'origine|place\s*of\s*origin/i.test(keyLower) && val) {
              extractedSupplierCountry = val.trim();
            }
          }
        });
        // 2.3.1 Direct Alibaba & Marketplace SKU / Variant Purchase Options
        const domSkuOptions: string[] = [];
        $('[data-testid="pc-purchase-sku-option-attribute"], [data-attribute-id], .sku-prop, [class*="sku-option-attribute"]').each((_, attrEl) => {
          let attrTitle = $(attrEl).find('.id-text-base, [class*="id-font-semibold"], [class*="sku-title"], [class*="prop-title"], [data-testid="module-attribute-name"]').first().text().trim();
          if (!attrTitle) {
            attrTitle = $(attrEl).find('span').first().text().trim();
          }
          attrTitle = cleanRepeatedText(attrTitle).replace(/[:\s]+$/, '');

          $(attrEl).find('[data-testid="pc-purchase-sku-option"], button[data-option-id], [class*="sku-option"], button[aria-label]').each((_, optEl) => {
            // Ignorer les éléments conteneurs qui englobent plusieurs boutons SKU enfants
            if ($(optEl).find('button, [data-option-id], [data-testid="pc-purchase-sku-option"]').length > 0) {
              return;
            }

            const optLabel = $(optEl).attr('aria-label') || 
                             $(optEl).find('[data-sku-tooltip-text]').text().trim() || 
                             $(optEl).find('.id-break-words, span').last().text().trim() ||
                             $(optEl).text().trim();
            const cleanOpt = cleanRepeatedText(optLabel).trim();
            if (cleanOpt && cleanOpt.length > 0 && cleanOpt.length < 80) {
              const splitList = sanitizeVariantOptionString(cleanOpt);
              splitList.forEach(part => {
                const fullOpt = attrTitle && !part.toLowerCase().startsWith(attrTitle.toLowerCase()) 
                  ? `${attrTitle} : ${part}` 
                  : part;
                if (!domSkuOptions.includes(fullOpt)) {
                  domSkuOptions.push(fullOpt);
                }
              });
            }
          });
        });

        // Also catch loose sku options without attribute wrapper
        $('[data-testid="pc-purchase-sku-option"], button[data-option-id]').each((_, optEl) => {
          if ($(optEl).find('button, [data-option-id]').length > 0) return;
          const optLabel = $(optEl).attr('aria-label') || 
                           $(optEl).find('[data-sku-tooltip-text]').text().trim() || 
                           $(optEl).find('.id-break-words, span').last().text().trim() ||
                           $(optEl).text().trim();
          const cleanOpt = cleanRepeatedText(optLabel).trim();
          if (cleanOpt && cleanOpt.length > 0 && cleanOpt.length < 80) {
            const splitList = sanitizeVariantOptionString(cleanOpt);
            splitList.forEach(part => {
              const alreadyPresent = domSkuOptions.some(existing => existing === part || existing.endsWith(`: ${part}`));
              if (!alreadyPresent) {
                domSkuOptions.push(part);
              }
            });
          }
        });

        if (domSkuOptions.length > 0) {
          extractedOptions.push(...domSkuOptions);
        }
      } else if (lower.includes('aliexpress') || rawHtml.includes('aliexpress')) {
        const aliStore = cleanRepeatedText($('a.store-header--storeName--p2J5U_x, .shop-name, .store-info a').first().text().trim());
        if (aliStore) extractedSupplierName = aliStore;
        if (!extractedTitle) extractedTitle = cleanProductTitle($('h1[data-pl="product-title"], .title--wrap--content, .product-title').text().trim());
        if (!extractedPriceStr) extractedPriceStr = $('.price-default--current-price--X4y6V9g, .product-price-current, .uniform-banner-box-price').first().text().trim();
        $('[class*="slider--wrap"] img, [class*="gallery--thumbnail"] img, .magnifier-image, img[src*="alicdn"]').each((_, el) => {
          const src = $(el).attr('src') || $(el).attr('data-src');
          if (src) extractedImages.push(src);
        });
        $('.sku-property-item, [class*="skuItem"]').each((_, optEl) => {
          const optLabel = $(optEl).attr('title') || $(optEl).text().trim();
          const cleanOpt = cleanRepeatedText(optLabel);
          if (cleanOpt && cleanOpt.length > 0 && cleanOpt.length < 80 && !extractedOptions.includes(cleanOpt)) {
            extractedOptions.push(cleanOpt);
          }
        });
      } else if (lower.includes('made-in-china')) {
        if (!extractedTitle) extractedTitle = cleanProductTitle($('h1.sr-proMainInfo-baseInfo-title, .title-info h1, h1').first().text().trim());
        if (!extractedPriceStr) extractedPriceStr = $('.sr-proMainInfo-baseInfo-price, .price-tag, .price').first().text().trim();
        $('.thumb-item img, .gallery-item img, .detail-gallery img').each((_, el) => {
          const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-big-src');
          if (src) extractedImages.push(src);
        });
      } else if (lower.includes('amazon')) {
        if (!extractedTitle) extractedTitle = cleanProductTitle($('#productTitle, h1#title').text().trim());
        if (!extractedPriceStr) extractedPriceStr = $('.a-price .a-offscreen, #priceblock_ourprice, #priceblock_dealprice').first().text().trim();
        const mainAmz = $('#landingImage, #imgBlkFront').attr('src') || $('#landingImage, #imgBlkFront').attr('data-old-hires');
        if (mainAmz) extractedImages.push(mainAmz);
      }

      // Universal SKU Option Catch if still empty
      if (extractedOptions.length === 0) {
        $('[data-testid="pc-purchase-sku-option"], button[data-option-id], .sku-property-item, [class*="skuItem"]').each((_, optEl) => {
          const optLabel = $(optEl).attr('aria-label') || 
                           $(optEl).find('[data-sku-tooltip-text]').text().trim() || 
                           $(optEl).text().trim();
          const cleanOpt = cleanRepeatedText(optLabel).trim();
          if (cleanOpt && cleanOpt.length > 0 && cleanOpt.length < 80 && !extractedOptions.includes(cleanOpt)) {
            extractedOptions.push(cleanOpt);
          }
        });
      }

      if (!extractedTitle) {
        extractedTitle = cleanProductTitle($('title').text().replace(/[-_|].*$/, '').trim());
      }
    } catch (cheerioErr) {
      console.warn("Cheerio parse notice:", cheerioErr);
    }
  }

  let extractedModel = '';
  let subcategory = 'Équipements professionnels';

  // Step 3: Always use Gemini 3.8 Flash to synthesize, structure, complete, and translate into French
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const promptContent = `Tu es un expert mondial en matériel industriel, équipement MRO, machines d'usine et sourcing B2B international (Alibaba, AliExpress, Made-in-China, Amazon).

Extrais et structure avec une précision totale les données de ce produit pour le catalogue B2B "Zone Équipements Sénégal" :
1. "titre_francais" : Nom commercial clair, professionnel et vendeur en FRANÇAIS OBLIGATOIRE (ex: "Groupe Électrogène Diesel Insonorisé 20 kVA Triphasé 400V"). NE JAMAIS mettre de mention de marketplace ou d'anglais ("Buy Product on Alibaba.com", "on Alibaba.com", "Hot Sale", "Dropshipping", "Free Shipping", "Buy", etc.).
2. "description_francaise" : Description commerciale et technique complète et soignée en français (2 à 3 paragraphes détaillant l'utilité, les composants de qualité, les domaines d'application industrielle ou agricole, et la fiabilité).
3. "marque" : Vraie marque constructeur unique (ex: "${cleanRepeatedText(resolvedBrand) !== 'Constructeur Certifié' ? cleanRepeatedText(resolvedBrand) : 'KATHER, Cummins, Makita, Siemens, Bosch, etc.'}") ou "Constructeur Certifié" / "Générique OEM". Ne jamais dupliquer la marque (jamais "KATHERKATHER").
4. "modele_reel" : Vrai modèle ou référence constructeur extrait des spécifications (ex: "DG-20000SE" ou référence fabricant réelle).
5. "categorie" : Catégorie principale B2B OBLIGATOIREMENT dérivée du référentiel mondial Grainger.com & RaptorSupplies.com :
   - "Équipement d'extérieur" (RÈGLE ABSOLUE : TOUS les groupes électrogènes, générateurs électriques (diesel, essence, gaz), motopompes, nettoyeurs haute pression, tronçonneuses d'extérieur DOIVENT être classés ici. Interdiction formelle de classer un groupe électrogène dans Outillage !)
   - "Outillage électrique" (perceuses, meuleuses, scies, visseuses, perforateurs)
   - "Outillage à main" (clés, tournevis, pinces, marteaux)
   - "Électricité" (câbles, disjoncteurs, transformateurs, armoires de distribution)
   - "Moteurs" (moteurs électriques AC/DC, variateurs)
   - "Pompes" (pompes submersibles d'exhaure, pompes centrifuges)
   - "Hydraulique" (vérins hydrauliques, distributeurs, centrales)
   - "Pneumatique" (compresseurs d'air, vérins pneumatiques, raccords FRL)
   - "Sécurité" (EPI, harnais, masques, gants, chaussures de sécurité)
   - "Soudage" (postes inverter TIG/MIG/MMA, torches, électrodes)
   - "Transmission de puissance" (roulements, courroies, chaînes)
   - "Instruments de mesure" (multimètres, caméras thermiques, manomètres)
6. "sous_categorie" : Sous-catégorie exacte (ex: "Groupes électrogènes et générateurs", "Nettoyeurs haute pression", "Moteurs électriques AC", "Pompes centrifuges", etc.).
7. "prix_fournisseur_usd" : Prix unitaire numérique d'achat fournisseur en DOLLARS US ($ USD). Si une fourchette existe ($88 - $240), prends le prix unitaire d'échantillon / 1 unité (~240 $). Si le prix source est en FCFA (~144 420 F CFA), convertis-le en dollars USD (~236 $).
8. "devise" : "USD" par défaut pour l'import international (ou "EUR", "CNY", "XOF").
9. "poids_kg" : Poids brut ou net estimé ou réel en kilogrammes (ex: 90 ou 2.5).
10. "dimensions" : Dimensions du colis ou de la machine (ex: "90 x 51 x 51 cm" ou "1480 x 680 x 1010 mm").
11. "fournisseur_nom" : Raison sociale exacte du fabricant / fournisseur (ex: "${cleanRepeatedText(extractedSupplierName) || 'Chongqing Meicheng Machinery Parts Co., Ltd.'}").
12. "fournisseur_pays" : Pays d'origine ("${extractedSupplierCountry || 'Chine'}").
13. "images_hd" : Liste des URLs des vraies photos HD du produit trouvées.
14. "variantes" : VRAIES options techniques et déclinaisons d'achat du produit (ex: puissances ["12 kW", "15 kW", "20 kW", "25 kW", "30 kW", "40 kW", "50 kW"], types de rendement ["AC Monophasé", "AC Triphasé"], motorisations ["2 temps 5 CV", "4 temps 7 CV"]).
    RÈGLES STRICTES ET IMPÉRATIVES POUR LES VARIANTES :
    - SUPPRIMER TOUTES LES COULEURS COSMÉTIQUES (White, White 2, Yellow, Blue, Green 2, Purple, Grey, Black, Red, etc.). NE JAMAIS inclure de simples couleurs dans les variantes !
    - Conserver UNIQUEMENT les éléments majeurs techniques (puissances, types de phase/tension, motorisations, capacités, modèles).
    - Si le vendeur a écrit "Color : 12 kW" ou "Color : AC Single Phase", nettoyer le préfixe pour ne garder que "12 kW" ou "AC Monophasé".
    - Chaque déclinaison doit être un objet distinct { "nom": "...", "prix_fournisseur_usd": ..., "poids_kg": ... }.
    - Si le produit ne présente aucune variante technique, renvoyer un tableau vide [].
15. "caracteristiques_techniques" : Tableau de 8 à 16 caractéristiques techniques réelles OBLIGATOIREMENT TRADUITES EN FRANÇAIS (clé: valeur). Aucune clé ni valeur ne doit rester en anglais ou en chinois (ex: 'Puissance nominale': '12 kW', 'Tension': '230V / 400V', 'Système de démarrage': 'Démarrage électrique avec clé', 'Système de refroidissement': 'Refroidissement par air forcé', 'Capacité du réservoir': '25 Litres', 'Consommation': '2.1 L/h', 'Niveau sonore': '68 dBA à 7m', 'Moteur': 'Diesel 4 temps injection directe', 'Garantie': '1 an constructeur'). NE JAMAIS dupliquer les mots.

Données partielles extraites du DOM :
- URL source: "${inputVal}"
- Titre brut: "${extractedTitle}"
- Prix brut: "${extractedPriceStr}" ${extractedCurrency}
- Poids brut: "${extractedWeightStr}"
- Dimensions brutes: "${extractedDimensions}"
- Marque détectée: "${cleanRepeatedText(resolvedBrand)}"
- Fournisseur détecté: "${cleanRepeatedText(extractedSupplierName)}"
- Options / Variantes SKU extraites du DOM: ${JSON.stringify(extractedOptions)}
- Spécifications brutes: ${JSON.stringify(extractedSpecs).substring(0, 3500)}
${rawHtml ? `- Extrait HTML / Texte de la page: ${rawHtml.substring(0, 15000)}` : ''}`;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: [{ role: "user", parts: [{ text: promptContent }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              titre_francais: { type: Type.STRING },
              description_francaise: { type: Type.STRING },
              marque: { type: Type.STRING },
              modele_reel: { type: Type.STRING },
              categorie: { type: Type.STRING },
              sous_categorie: { type: Type.STRING },
              prix_fournisseur_usd: { type: Type.NUMBER },
              devise: { type: Type.STRING },
              poids_kg: { type: Type.NUMBER },
              dimensions: { type: Type.STRING },
              fournisseur_nom: { type: Type.STRING },
              fournisseur_pays: { type: Type.STRING },
              images_hd: { type: Type.ARRAY, items: { type: Type.STRING } },
              variantes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    nom: { type: Type.STRING },
                    prix_fournisseur_usd: { type: Type.NUMBER },
                    poids_kg: { type: Type.NUMBER }
                  },
                  required: ["nom"]
                }
              },
              caracteristiques_techniques: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    cle: { type: Type.STRING },
                    valeur: { type: Type.STRING }
                  },
                  required: ["cle", "valeur"]
                }
              }
            },
            required: ["titre_francais", "description_francaise", "marque", "categorie"]
          }
        }
      });

      const cleanJson = (aiResponse.text || '{}').replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsedAi = JSON.parse(cleanJson);

      if (parsedAi.titre_francais && parsedAi.titre_francais.length > 3) {
        extractedTitle = cleanProductTitle(parsedAi.titre_francais);
      }
      if (parsedAi.description_francaise) {
        extractedDesc = parsedAi.description_francaise;
      }
      if (parsedAi.marque && !parsedAi.marque.toLowerCase().includes('ali') && !parsedAi.marque.toLowerCase().includes('baba')) {
        resolvedBrand = cleanRepeatedText(parsedAi.marque);
      }
      if (parsedAi.modele_reel) {
        extractedModel = cleanRepeatedText(parsedAi.modele_reel);
      }
      if (parsedAi.categorie) {
        category = parsedAi.categorie;
      }
      if (parsedAi.sous_categorie) {
        subcategory = parsedAi.sous_categorie;
      }
      if (typeof parsedAi.prix_fournisseur_usd === 'number' && parsedAi.prix_fournisseur_usd > 0) {
        extractedPriceStr = String(parsedAi.prix_fournisseur_usd);
        extractedCurrency = 'USD';
      }
      if (parsedAi.devise && (!extractedCurrency || extractedCurrency === 'USD')) {
        extractedCurrency = parsedAi.devise;
      }
      if (typeof parsedAi.poids_kg === 'number' && parsedAi.poids_kg > 0) {
        extractedWeightStr = `${parsedAi.poids_kg} kg`;
      }
      if (parsedAi.dimensions && !extractedDimensions) {
        extractedDimensions = parsedAi.dimensions;
      }
      if (parsedAi.fournisseur_nom && !parsedAi.fournisseur_nom.toLowerCase().includes('alibaba')) {
        extractedSupplierName = cleanRepeatedText(parsedAi.fournisseur_nom);
      }
      if (parsedAi.fournisseur_pays) {
        extractedSupplierCountry = parsedAi.fournisseur_pays;
      }
      if (Array.isArray(parsedAi.images_hd) && parsedAi.images_hd.length > 0) {
        extractedImages.unshift(...parsedAi.images_hd);
      }
      if (Array.isArray(parsedAi.variantes) && parsedAi.variantes.length > 0) {
        parsedAi.variantes.forEach((vObj: any) => {
          const vName = typeof vObj === 'string' ? vObj : vObj?.nom;
          const cleanedName = cleanAndFilterVariantName(vName);
          if (cleanedName) {
            extractedVariants.push({
              name: cleanedName,
              price: vObj.prix_fournisseur_usd ? Math.round(vObj.prix_fournisseur_usd * 610 * 1.35 * 1.18) : undefined,
              supplierPrice: vObj.prix_fournisseur_usd || undefined,
              weight: vObj.poids_kg ? `${vObj.poids_kg} kg` : undefined
            } as any);
          }
        });
      }
      if (Array.isArray(parsedAi.caracteristiques_techniques)) {
        parsedAi.caracteristiques_techniques.forEach((item: any) => {
          if (item.cle && item.valeur) {
            const cKey = cleanRepeatedText(item.cle);
            const cVal = cleanRepeatedText(item.valeur);
            translatedSpecs[cKey] = cVal;
          }
        });
      }
    } catch (aiErr) {
      console.warn("Notice: Gemini 3.8 Flash synthesis warning:", aiErr);
    }
  }

  // Auto-correction intelligente Grainger & RaptorSupplies pour groupes électrogènes
  const fullScan = `${extractedTitle} ${extractedDesc} ${inputVal}`.toLowerCase();
  if (fullScan.includes('électrogène') || fullScan.includes('générateur') || fullScan.includes('generator') || fullScan.includes('genset')) {
    category = "Équipement d'extérieur";
    subcategory = "Groupes électrogènes et générateurs";
  }

  // Nettoyage et filtrage systématique des options DOM (suppression des couleurs cosmétiques, dégroupage, standardisation)
  const cleanFinalVariantItems: Array<{ id?: string; name: string; price?: number; supplierPrice?: number; weight?: string }> = [];
  const seenVariantNames = new Set<string>();

  // 1. Process structured variants from Gemini first
  extractedVariants.forEach((vItem: any, idx) => {
    const vName = cleanAndFilterVariantName(vItem.name);
    if (vName && !seenVariantNames.has(vName.toLowerCase())) {
      seenVariantNames.add(vName.toLowerCase());
      cleanFinalVariantItems.push({
        id: `var-${idx}`,
        name: vName,
        price: vItem.price,
        supplierPrice: vItem.supplierPrice,
        weight: vItem.weight
      });
    }
  });

  // 2. Process DOM SKU options
  extractedOptions.forEach((opt, idx) => {
    const pieces = sanitizeVariantOptionString(opt);
    pieces.forEach(p => {
      const cleanedP = cleanAndFilterVariantName(p);
      if (cleanedP && !seenVariantNames.has(cleanedP.toLowerCase())) {
        seenVariantNames.add(cleanedP.toLowerCase());
        cleanFinalVariantItems.push({
          id: `var-dom-${idx}`,
          name: cleanedP
        });
      }
    });
  });

  // Step 4: Final Consolidations & Deduplication
  if (Object.keys(translatedSpecs).length === 0 && Object.keys(extractedSpecs).length > 0) {
    Object.entries(extractedSpecs).forEach(([k, v]) => {
      translatedSpecs[cleanRepeatedText(k)] = cleanRepeatedText(v);
    });
  }
  if (Object.keys(translatedSpecs).length === 0) {
    translatedSpecs = {
      "État": "Neuf d'origine constructeur",
      "Origine": extractedSupplierCountry || country,
      "Garantie": "1 an constructeur",
      "Conformité": "Normes industrielles CE / ISO 9001"
    };
  }

  // Constant and deterministic price calculation
  let finalPrice = parsePrice(extractedPriceStr, estimatedPrice);
  let finalCurrency = parseCurrency(extractedCurrency, defaultCurrency, extractedPriceStr);

  // If price was parsed from a localized FCFA amount (e.g. 144 420 F CFA) and finalCurrency is USD, convert to USD (~236.75 USD)
  if (finalCurrency === 'USD' && finalPrice > 5000) {
    finalPrice = Math.round((finalPrice / 610) * 100) / 100;
  }
  // If price is explicitly in XOF
  if (finalCurrency === 'XOF' && finalPrice < 500) {
    finalPrice = Math.round(finalPrice * 610);
  }

  const finalWeight = parseWeight(extractedWeightStr, estimatedWeight);

  let bestImage = imageUrl;
  const validImages = Array.from(new Set(extractedImages))
    .map(img => fixImageUrl(img, inputVal))
    .filter(u => u && (u.includes('alicdn') || u.includes('amazon') || u.includes('http') || u.includes('.jpg') || u.includes('.png') || u.includes('.webp') || u.includes('unsplash')));

  if (validImages.length > 0) {
    bestImage = validImages[0];
  } else {
    validImages.push(imageUrl);
  }

  const finalTitle = cleanProductTitle(extractedTitle) || 'Équipement Industriel Professionnel Importé';
  const finalDesc = extractedDesc || description;

  if (!extractedSupplierName || extractedSupplierName.toLowerCase().includes('alibaba') || extractedSupplierName.toLowerCase().includes('aliexpress')) {
    extractedSupplierName = `${detectedPlatform} Certified Manufacturer`;
  }

  resolvedBrand = cleanRepeatedText(resolvedBrand) || 'Constructeur Certifié';

  return res.json({
    success: true,
    source: rawHtml ? 'html_cheerio_gemini_3.8' : 'ai_gemini_3.8_synthesis',
    data: {
      name: finalTitle,
      brand: resolvedBrand,
      model: extractedModel || 'Conforme aux spécifications constructeur',
      category: category,
      subcategory: subcategory,
      supplierPrice: finalPrice,
      currency: finalCurrency,
      country: extractedSupplierCountry || country,
      platform: detectedPlatform,
      weight: finalWeight,
      dimensions: extractedDimensions || '30 x 20 x 15 cm',
      imageUrl: bestImage,
      images: validImages.slice(0, 15),
      options: cleanFinalVariantItems.length > 0 ? cleanFinalVariantItems : undefined,
      variants: cleanFinalVariantItems.length > 0 ? cleanFinalVariantItems : undefined,
      description: finalDesc,
      specs: translatedSpecs,
      supplier: {
        name: extractedSupplierName,
        platform: detectedPlatform,
        country: extractedSupplierCountry || country,
        currency: finalCurrency,
        storeUrl: inputVal
      }
    }
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

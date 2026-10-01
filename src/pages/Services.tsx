import React, { useState } from 'react';
import { 
  ArrowRight, CheckCircle2, ShieldCheck, Truck, Plane, Ship, 
  Search, Headphones, FileText, Package, Clock, Globe, Award, 
  Wrench, HelpCircle, Send, Building2, Phone, Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';
import { catalogService } from '../services/catalogService';
import { siteSettingsService } from '../services/siteSettingsService';

export default function Services() {
  const { language } = useLanguage();
  const settings = siteSettingsService.getSettings();

  // Interactive Custom Sourcing Request Form State
  const [formData, setFormData] = useState({
    company: '',
    contactName: '',
    phone: '',
    email: '',
    equipmentName: '',
    brandOrRef: '',
    supplierUrl: '',
    quantity: 1,
    urgency: 'air' as 'stock' | 'air' | 'sea',
    notes: ''
  });
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const handleSourcingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contactName.trim() || !formData.phone.trim() || !formData.equipmentName.trim()) return;

    const order = catalogService.createOrder({
      customerName: formData.contactName.trim(),
      customerCompany: formData.company.trim() || 'Client B2B',
      customerPhone: formData.phone.trim(),
      customerEmail: formData.email.trim(),
      customerCity: 'Dakar',
      customerCountry: 'Sénégal',
      customerAddress: `Demande Sourcing Sur-Mesure : ${formData.brandOrRef ? `Réf/Marque: ${formData.brandOrRef} | ` : ''}${formData.supplierUrl ? `Lien: ${formData.supplierUrl} | ` : ''}${formData.notes}`,
      items: [
        {
          productId: 999999,
          name: `[SOURCING SUR DEMANDE] ${formData.equipmentName.trim()}${formData.brandOrRef ? ` (${formData.brandOrRef.trim()})` : ''}`,
          brand: formData.brandOrRef.trim() || 'Sourcing Spécifique OEM',
          price: 0,
          quantity: Number(formData.quantity) || 1,
          shippingMethod: formData.urgency === 'sea' ? 'sea' : formData.urgency === 'air' ? 'air' : 'none',
          freightCost: 0
        }
      ],
      subtotalHT: 0,
      vatAmount: 0,
      totalTTC: 0,
      paymentMethod: 'Virement Bancaire',
      paymentStatus: 'Non payé',
      status: 'En attente',
      isQuote: true
    });

    setSubmittedRef(order.orderNumber);
  };

  const copy = {
    fr: {
      badge: "INGÉNIERIE D'APPROVISIONNEMENT & LOGISTIQUE B2B",
      heroTitle: "Nos Services Industriels & Logistiques",
      heroSub: "De la recherche d'équipements rares auprès des constructeurs mondiaux jusqu'au dédouanement et à la livraison sur votre site au Sénégal et en Afrique de l'Ouest.",
      ctaQuote: "Demander un Sourcing Spécifique",
      ctaCatalog: "Explorer le Catalogue",
      metrics: [
        { val: "+500", label: "Constructeurs & Usines Certifiés (OEM)" },
        { val: "24h - 48h", label: "Livraison sur Stock Local à Dakar" },
        { val: "5 à 10 j", label: "Transit Aérien Express DAP Dakar" },
        { val: "100%", label: "Conformité CE / ISO & Garantie 12 Mois" }
      ],
      pillarsTitle: "Une Chaîne d'Approvisionnement Complète & Sécurisée",
      pillarsSub: "Zone Équipements Sénégal sécurise chaque étape technique, logistique et douanière de vos achats industriels MRO, BTP, Mines et Énergie.",
      pillars: [
        {
          icon: Search,
          color: "bg-[#003366]",
          tag: "Sourcing International",
          title: "1. Sourcing sur Demande & Négociation Usine (OEM)",
          desc: "Vous recherchez une pièce de rechange introuvable, un moteur spécifique ou une machine complète ? Nos ingénieurs sourcent directement auprès des fabricants certifiés en Europe, aux USA et en Asie aux tarifs départ usine.",
          points: [
            "Identification par numéro de série, plaque signalétique ou cahier des charges",
            "Accès direct aux réseaux Alibaba, 1688, constructeurs européens et américains",
            "Vérification systématique de l'authenticité et des certificats d'origine"
          ]
        },
        {
          icon: ShieldCheck,
          color: "bg-[#FF6600]",
          tag: "Qualité & Conformité",
          title: "2. Contrôle Qualité & Inspection Avant Expédition",
          desc: "Aucun matériel ne quitte nos entrepôts d'exportation sans une vérification rigoureuse. Nous éliminons tout risque d'erreur de référence ou de non-conformité avant l'embarquement.",
          points: [
            "Inspection visuelle et contrôle des spécifications techniques en entrepôt export",
            "Rapport d'essai machine et vidéo d'inspection au départ sur demande",
            "Conditionnement industriel renforcé (caisse bois maritime NIMP15 / antichoc)"
          ]
        },
        {
          icon: Truck,
          color: "bg-[#003366]",
          tag: "Transit & Douane",
          title: "3. Logistique Internationale & Dédouanement DAP Dakar",
          desc: "Nous gérons de bout en bout le transport international, le transit et les formalités douanières. Vous recevez votre matériel prêt à l'emploi à Dakar ou sur votre site industriel.",
          points: [
            `Fret Aérien Express (${settings.airFreightDurationDays || '5 à 10 jours'}) pour les urgences MRO et pièces critiques`,
            `Fret Maritime Économique (${settings.seaFreightDurationDays || '30 à 45 jours'}) au poids ou au volume (m³) pour charges lourdes`,
            "Prise en charge complète du dédouanement, sans frais cachés"
          ]
        },
        {
          icon: Package,
          color: "bg-emerald-600",
          tag: "Disponibilité Immédiate",
          title: "4. Stock Local MRO à Dakar (Disponible Immédiatement)",
          desc: "Pour répondre aux arrêts de production et besoins urgents sur chantier, nous maintenons un stock permanent d'outillage professionnel, d'instruments de mesure, d'EPI et de composants électriques à Dakar.",
          points: [
            "Articles identifiés par le badge vert « Disponible immédiatement » sur tout le site",
            "Zéro frais de fret international ni délai d'importation",
            "Retrait immédiat au dépôt de Dakar ou livraison express en 24h à 48h"
          ]
        },
        {
          icon: FileText,
          color: "bg-[#003366]",
          tag: "Solutions Financières B2B",
          title: "5. Facturation Proforma, Devis Officiels & Facilités de Paiement",
          desc: "Nos procédures financières sont adaptées aux exigences des directions d'achats, entreprises du BTP, industries minières et administrations publiques.",
          points: [
            "Émission instantanée de Devis Proforma officiels (avec NINEA, RCCM et TVA 18% modulable)",
            "Option d'acompte sécurisé (ex: 30% à la commande, solde à la livraison à Dakar)",
            "Règlements multi-canaux : Virement bancaire professionnel / B2B, Chèque certifié, PayDunya (Wave, Orange Money, Free Money, Cartes Bancaires)"
          ]
        },
        {
          icon: Headphones,
          color: "bg-[#FF6600]",
          tag: "Support & Garantie",
          title: "6. Assistance Technique 24/7, Suivi & Garantie Constructeur",
          desc: "Chaque commande bénéficie d'un numéro de suivi et d'un interlocuteur dédié. Nous assurons le suivi après-vente et la garantie constructeur sur tous nos équipements.",
          points: [
            "Support réactif 7j/7 par WhatsApp Direct, téléphone et e-mail",
            "Garantie commerciale de 12 mois contre tout défaut de fabrication",
            "Fourniture garantie des pièces d'usure et consommables associés"
          ]
        }
      ],
      compTitle: "Distinction Claire : Stock Local vs Articles à Sourcer",
      compSub: "Sur chaque fiche produit, dans le catalogue et au panier, notre système distingue automatiquement le mode de disponibilité pour une transparence totale sur les coûts et les délais.",
      compHeaders: ["Critère", "Disponible Immédiatement (Stock Dakar)", "Article à Sourcer — Fret Aérien", "Article à Sourcer — Fret Maritime"],
      compRows: [
        ["Badge sur le site", "🟢 Disponible immédiatement (En Stock)", "🟠 Article à sourcer (✈️ Aérien)", "🟠 Article à sourcer (🚢 Maritime)"],
        ["Délai de livraison", "24h à 48h (Dakar & régions)", settings.airFreightDurationDays || "5 à 10 jours ouvrés", settings.seaFreightDurationDays || "30 à 45 jours"],
        ["Frais de fret international", "0 FCFA (Déjà dédouané à Dakar)", "Calculé sur chaque fiche produit & au panier", "Calculé sur chaque fiche produit & au panier"],
        ["Idéal pour", "Urgences chantier, EPI, outillage standard", "Pièces détachées critiques, automates, pompes < 20 kg", "Groupes électrogènes, machines lourdes, commandes volumineuses"]
      ],
      stepsTitle: "Comment Fonctionne Votre Approvisionnement en 5 Étapes ?",
      steps: [
        { num: "01", title: "Sélection ou Demande", desc: "Choisissez vos articles en stock ou à sourcer sur le catalogue, ou transmettez-nous votre référence / lien fournisseur." },
        { num: "02", title: "Devis Proforma < 24h", desc: "Validation technique, calcul exact du fret (aérien ou maritime) et émission de votre facture Proforma officielle TTC ou HT." },
        { num: "03", title: "Validation & Inspection", desc: "Dès confirmation (ou versement de l'acompte), nous auditons, testons et réceptionnons le matériel dans notre hub export." },
        { num: "04", title: "Transit & Douane", desc: "Acheminement sécurisé par avion ou navire jusqu'à Dakar avec prise en charge intégrale des formalités douanières." },
        { num: "05", title: "Livraison sur Site", desc: "Réception à notre entrepôt de Dakar ou livraison directe sur votre chantier / usine avec bon de livraison et garantie." }
      ],
      formTitle: "Formulaire de Sourcing sur Demande & Devis Spécifique",
      formSub: "Vous avez une référence précise, une liste d'équipements ou un lien fournisseur (Alibaba, Europe, USA) ? Recevez votre cotation chiffrée sous 24h.",
      faqTitle: "Questions Fréquentes (FAQ Services & Logistique)",
      faqs: [
        {
          q: "Comment reconnaître un produit disponible immédiatement d'un article à sourcer ?",
          a: "Chaque fiche produit et carte du catalogue affiche clairement un badge vert « Disponible immédiatement • Stock Dakar » (livraison 24-48h sans frais de fret international) ou un badge orange « Article à sourcer • Sur commande » qui active le calculateur de fret aérien ou maritime."
        },
        {
          q: "Y a-t-il des frais de douane supplémentaires à payer à l'arrivée à Dakar ?",
          a: "Non. Lorsque vous sélectionnez l'option d'acheminement par Fret Aérien ou Fret Maritime DAP Dakar, les frais de transit et de dédouanement standard sont intégrés. Le montant de votre facture Proforma est ferme et transparent."
        },
        {
          q: "Puis-je commander un produit trouvé sur Alibaba ou chez un fabricant européen ?",
          a: "Oui, absolument. Il vous suffit de nous communiquer le lien URL ou la référence exacte via le formulaire ci-dessous ou sur WhatsApp. Nous vérifions la fiabilité du fournisseur, négocions le prix usine et assurons l'importation clé en main."
        },
        {
          q: "Quelles sont les garanties sur les machines et équipements importés ?",
          a: "Tous nos équipements neufs bénéficient d'une garantie minimale de 12 mois, d'une inspection qualité avant départ et de la conformité aux normes CE / ISO."
        }
      ]
    },
    en: {
      badge: "B2B PROCUREMENT ENGINEERING & LOGISTICS",
      heroTitle: "Our Industrial & Logistics Services",
      heroSub: "From sourcing rare equipment directly from global manufacturers to customs clearance and on-site delivery in Senegal and West Africa.",
      ctaQuote: "Request Custom Sourcing",
      ctaCatalog: "Explore Catalog",
      metrics: [
        { val: "+500", label: "Certified OEM Manufacturers & Factories" },
        { val: "24h - 48h", label: "Delivery from Local Dakar Stock" },
        { val: "5 - 10 d", label: "Express Air Transit DAP Dakar" },
        { val: "100%", label: "CE / ISO Compliance & 12-Month Warranty" }
      ],
      pillarsTitle: "A Complete & Secure Industrial Supply Chain",
      pillarsSub: "Zone Équipements Sénégal secures every technical, logistical, and customs stage of your MRO, Construction, Mining, and Energy purchases.",
      pillars: [
        {
          icon: Search,
          color: "bg-[#003366]",
          tag: "Global Sourcing",
          title: "1. Custom Sourcing & Direct Factory Negotiation (OEM)",
          desc: "Looking for a hard-to-find spare part, specific motor, or heavy machinery? Our engineers source directly from certified manufacturers in Europe, the USA, and Asia at ex-works prices.",
          points: [
            "Identification by serial number, nameplate, or technical specifications",
            "Direct access to Alibaba, 1688, European and American OEM networks",
            "Systematic verification of authenticity and certificates of origin"
          ]
        },
        {
          icon: ShieldCheck,
          color: "bg-[#FF6600]",
          tag: "Quality & Compliance",
          title: "2. Quality Control & Pre-Shipment Inspection",
          desc: "No equipment leaves our export hubs without rigorous inspection. We eliminate any risk of part-number mismatch or non-compliance before shipping.",
          points: [
            "Visual inspection and technical specification verification at export warehouse",
            "Machinery test reports and outgoing video inspection upon request",
            "Reinforced industrial packaging (ISPM15 seaworthy wooden crates / shockproof)"
          ]
        },
        {
          icon: Truck,
          color: "bg-[#003366]",
          tag: "Transit & Customs",
          title: "3. International Logistics & DAP Dakar Customs Clearance",
          desc: "We manage international transport, transit, and customs formalities end-to-end. Receive your equipment ready for operation in Dakar or on your industrial site.",
          points: [
            `Express Air Freight (${settings.airFreightDurationDays || '5 to 10 days'}) for urgent MRO and critical parts`,
            `Economy Sea Freight (${settings.seaFreightDurationDays || '30 to 45 days'}) by weight or volume (CBM) for heavy cargo`,
            "Full customs clearance management with zero hidden fees"
          ]
        },
        {
          icon: Package,
          color: "bg-emerald-600",
          tag: "Immediate Availability",
          title: "4. Local MRO Stock in Dakar (Available Immediately)",
          desc: "To prevent production downtime and meet urgent site needs, we maintain permanent stock of power tools, measuring instruments, PPE, and electrical components in Dakar.",
          points: [
            "Items clearly marked with the green 'Available Immediately' badge across the site",
            "Zero international freight fees and zero import wait time",
            "Immediate pickup at our Dakar warehouse or express 24h-48h delivery"
          ]
        },
        {
          icon: FileText,
          color: "bg-[#003366]",
          tag: "B2B Financial Solutions",
          title: "5. Proforma Invoicing, Official Quotes & Flexible Payment",
          desc: "Our financial workflows are tailored to procurement departments, construction firms, mining operations, and public institutions.",
          points: [
            "Instant generation of official Proforma Invoices (with tax ID and configurable 18% VAT)",
            "Flexible deposit option (e.g., 30% upon order, 70% balance upon delivery in Dakar)",
            "Multi-channel payments: Bank transfer, certified check, Wave, Orange Money"
          ]
        },
        {
          icon: Headphones,
          color: "bg-[#FF6600]",
          tag: "Support & Warranty",
          title: "6. 24/7 Technical Support, Tracking & OEM Warranty",
          desc: "Every order is assigned a tracking reference and a dedicated account engineer. We provide full after-sales support and manufacturer warranty.",
          points: [
            "Responsive 24/7 assistance via Direct WhatsApp, phone, and email",
            "12-month commercial warranty against manufacturing defects",
            "Guaranteed supply of spare wear parts and consumables"
          ]
        }
      ],
      compTitle: "Clear Distinction: Local Stock vs Sourcing Items",
      compSub: "On every product sheet, catalog view, and in the cart, our platform automatically distinguishes availability modes for total cost and lead-time transparency.",
      compHeaders: ["Criteria", "Available Immediately (Dakar Stock)", "Sourcing Item — Air Freight", "Sourcing Item — Sea Freight"],
      compRows: [
        ["Site Badge", "🟢 Available Immediately (In Stock)", "🟠 Sourcing Item (✈️ Air)", "🟠 Sourcing Item (🚢 Sea)"],
        ["Delivery Lead Time", "24h to 48h (Dakar & Senegal)", settings.airFreightDurationDays || "5 to 10 business days", settings.seaFreightDurationDays || "30 to 45 days"],
        ["International Freight", "0 FCFA (Already cleared in Dakar)", "Calculated automatically per product", "Calculated automatically per product"],
        ["Best Suited For", "Urgent site needs, PPE, standard tools", "Critical spare parts, PLCs, pumps < 20 kg", "Generators, heavy machinery, bulk orders"]
      ],
      stepsTitle: "How Your 5-Step Procurement Works",
      steps: [
        { num: "01", title: "Selection or Request", desc: "Choose in-stock or sourcing items from our catalog, or send us your part number / supplier link." },
        { num: "02", title: "Proforma Quote < 24h", desc: "Technical validation, exact freight calculation (air or sea), and official Proforma Invoice issuance." },
        { num: "03", title: "Order & Inspection", desc: "Upon confirmation (or deposit), we audit, test, and receive the equipment at our export hub." },
        { num: "04", title: "Transit & Customs", desc: "Secured air or sea shipment to Dakar with full customs clearance handling." },
        { num: "05", title: "On-Site Delivery", desc: "Pickup at our Dakar depot or direct delivery to your plant/construction site with warranty." }
      ],
      formTitle: "Custom Sourcing & Specific Quote Request Form",
      formSub: "Have a specific part number, equipment list, or supplier link (Alibaba, Europe, USA)? Receive your detailed quote within 24h.",
      faqTitle: "Frequently Asked Questions (Services & Logistics)",
      faqs: [
        {
          q: "How can I tell if an item is available immediately or needs to be sourced?",
          a: "Every product card and product sheet displays either a green 'Available Immediately • Dakar Stock' badge (24-48h delivery, 0 international freight) or an orange 'Sourcing Item • On Order' badge with real-time Air/Sea freight options."
        },
        {
          q: "Are there any extra customs fees to pay upon arrival in Dakar?",
          a: "No. When you choose DAP Dakar Air or Sea Freight, transit and customs clearance are handled by Zone Équipements. Your Proforma Invoice total is transparent."
        },
        {
          q: "Can I order a product found on Alibaba or from a European manufacturer?",
          a: "Yes. Simply send us the URL or part number using the form below or via WhatsApp. We verify the supplier, negotiate factory pricing, and handle turnkey import to Dakar."
        },
        {
          q: "What warranty covers imported machinery and equipment?",
          a: "All new equipment includes a minimum 12-month manufacturer warranty, pre-shipment quality inspection, and CE / ISO compliance."
        }
      ]
    },
    es: {
      badge: "INGENIERÍA DE COMPRAS Y LOGÍSTICA B2B",
      heroTitle: "Nuestros Servicios Industriales y Logísticos",
      heroSub: "Desde la búsqueda de equipos específicos directamente con fabricantes mundiales hasta el despacho aduanero y entrega en su obra en Senegal y África Occidental.",
      ctaQuote: "Solicitar Sourcing a Medida",
      ctaCatalog: "Explorar el Catálogo",
      metrics: [
        { val: "+500", label: "Fabricantes y Fábricas Certificadas (OEM)" },
        { val: "24h - 48h", label: "Entrega desde Stock Local en Dakar" },
        { val: "5 a 10 d", label: "Tránsito Aéreo Exprés DAP Dakar" },
        { val: "100%", label: "Conformidad CE / ISO y Garantía 12 Meses" }
      ],
      pillarsTitle: "Una Cadena de Suministro Completa y Segura",
      pillarsSub: "Zone Équipements Sénégal asegura cada etapa técnica, logística y aduanera de sus compras industriales MRO, Construcción, Minería y Energía.",
      pillars: [
        {
          icon: Search,
          color: "bg-[#003366]",
          tag: "Sourcing Internacional",
          title: "1. Sourcing Bajo Pedido y Negociación con Fábrica (OEM)",
          desc: "¿Busca un repuesto difícil de encontrar, un motor específico o maquinaria completa? Nuestros ingenieros compran directamente a fabricantes certificados en Europa, EE. UU. y Asia.",
          points: [
            "Identificación por número de serie, placa técnica o pliego de condiciones",
            "Acceso directo a redes Alibaba, 1688 y fabricantes europeos y americanos",
            "Verificación sistemática de autenticidad y certificados de origen"
          ]
        },
        {
          icon: ShieldCheck,
          color: "bg-[#FF6600]",
          tag: "Calidad y Conformidad",
          title: "2. Control de Calidad e Inspección Previa al Envío",
          desc: "Ningún equipo sale de nuestros almacenes de exportación sin una verificación rigurosa antes del embarque.",
          points: [
            "Inspección visual y control de especificaciones técnicas en almacén de exportación",
            "Informe de prueba de maquinaria y video de inspección bajo solicitud",
            "Embalaje industrial reforzado (caja de madera marítima NIMF15)"
          ]
        },
        {
          icon: Truck,
          color: "bg-[#003366]",
          tag: "Tránsito y Aduana",
          title: "3. Logística Internacional y Despacho Aduanero DAP Dakar",
          desc: "Gestionamos de principio a fin el transporte internacional, el tránsito y los trámites aduaneros hasta Dakar.",
          points: [
            `Flete Aéreo Exprés (${settings.airFreightDurationDays || '5 a 10 días'}) para urgencias MRO`,
            `Flete Marítimo Económico (${settings.seaFreightDurationDays || '30 a 45 días'}) por peso o volumen (m³)`,
            "Gestión integral de aduanas sin costos ocultos"
          ]
        },
        {
          icon: Package,
          color: "bg-emerald-600",
          tag: "Disponibilidad Inmediata",
          title: "4. Stock Local MRO en Dakar (Disponible Inmediatamente)",
          desc: "Mantenemos un stock permanente de herramientas profesionales, instrumentos de medición, EPI y componentes eléctricos en Dakar.",
          points: [
            "Artículos identificados con la etiqueta verde « Disponible inmediatamente »",
            "Cero costos de flete internacional ni tiempos de espera de importación",
            "Retiro inmediato en Dakar o entrega exprés en 24h a 48h"
          ]
        },
        {
          icon: FileText,
          color: "bg-[#003366]",
          tag: "Soluciones Financieras B2B",
          title: "5. Facturación Proforma, Presupuestos y Facilidades de Pago",
          desc: "Procedimientos adaptados a departamentos de compras, constructoras, mineras y administraciones.",
          points: [
            "Emisión inmediata de Facturas Proforma oficiales (con IVA 18% configurable)",
            "Opción de anticipo (ej. 30% al pedido y 70% contra entrega en Dakar)",
            "Pagos por transferencia bancaria, cheque certificado, Wave, Orange Money"
          ]
        },
        {
          icon: Headphones,
          color: "bg-[#FF6600]",
          tag: "Soporte y Garantía",
          title: "6. Asistencia Técnica 24/7, Seguimiento y Garantía OEM",
          desc: "Cada pedido cuenta con seguimiento en tiempo real y garantía comercial de 12 meses.",
          points: [
            "Atención reactiva 24/7 por WhatsApp Directo, teléfono y correo",
            "Garantía comercial de 12 meses contra defectos de fabricación",
            "Suministro garantizado de repuestos y consumibles"
          ]
        }
      ],
      compTitle: "Distinción Clara: Stock Local vs Artículos a Importar",
      compSub: "En cada ficha de producto, catálogo y carrito, nuestro sistema distingue automáticamente la disponibilidad.",
      compHeaders: ["Criterio", "Disponible Inmediatamente (Stock Dakar)", "Artículo a Importar — Flete Aéreo", "Artículo a Importar — Flete Marítimo"],
      compRows: [
        ["Etiqueta", "🟢 Disponible inmediatamente", "🟠 Artículo bajo pedido (✈️ Aéreo)", "🟠 Artículo bajo pedido (🚢 Marítimo)"],
        ["Plazo de entrega", "24h a 48h (Dakar y Senegal)", settings.airFreightDurationDays || "5 a 10 días hábiles", settings.seaFreightDurationDays || "30 a 45 días"],
        ["Flete internacional", "0 FCFA (Stock en Dakar)", "Calculado automáticamente por producto", "Calculado automáticamente por producto"],
        ["Ideal para", "Urgencias de obra, EPI, herramientas", "Repuestos críticos, PLC, bombas < 20 kg", "Generadores, maquinaria pesada, contenedores"]
      ],
      stepsTitle: "¿Cómo Funciona su Suministro en 5 Pasos?",
      steps: [
        { num: "01", title: "Selección o Solicitud", desc: "Elija productos en stock o bajo pedido, o envíenos su referencia / enlace de proveedor." },
        { num: "02", title: "Proforma < 24h", desc: "Validación técnica, cálculo de flete y emisión de Factura Proforma oficial." },
        { num: "03", title: "Validación e Inspección", desc: "Auditoría, prueba y recepción del material en nuestra plataforma de exportación." },
        { num: "04", title: "Tránsito y Aduana", desc: "Envío aéreo o marítimo seguro hasta Dakar con despacho aduanero incluido." },
        { num: "05", title: "Entrega en Obra", desc: "Retiro en nuestro almacén de Dakar o entrega directa en su planta con garantía." }
      ],
      formTitle: "Formulario de Sourcing a Medida y Cotización Específica",
      formSub: "¿Tiene una referencia específica o un enlace de proveedor (Alibaba, Europa, EE. UU.)? Reciba su cotización en 24h.",
      faqTitle: "Preguntas Frecuentes (Servicios y Logística)",
      faqs: [
        {
          q: "¿Cómo distinguir un producto disponible inmediatamente de un artículo bajo pedido?",
          a: "Cada ficha muestra una etiqueta verde « Disponible inmediatamente • Stock Dakar » (entrega 24-48h sin flete internacional) o una etiqueta naranja « Artículo a importar » con opciones de flete aéreo o marítimo."
        },
        {
          q: "¿Hay cargos aduaneros adicionales al llegar a Dakar?",
          a: "No. Con nuestras opciones DAP Dakar, el tránsito y despacho aduanero están incluidos en su Proforma."
        },
        {
          q: "¿Puedo pedir un equipo visto en Alibaba o de un fabricante europeo?",
          a: "Sí, envíenos el enlace o referencia mediante el formulario o por WhatsApp y gestionamos la compra e importación llave en mano."
        },
        {
          q: "¿Qué garantía tienen los equipos?",
          a: "Todos los equipos nuevos cuentan con 12 meses de garantía, inspección previa al embarque y conformidad CE / ISO."
        }
      ]
    },
    zh: {
      badge: "B2B工业集采工程与跨境物流服务",
      heroTitle: "我们的工业采购与国际物流服务",
      heroSub: "从全球原厂直采稀缺工业设备与MRO备件，到出口质检、海空联运及塞内加尔达喀尔清关配送的一站式服务。",
      ctaQuote: "申请定制寻源报价",
      ctaCatalog: "浏览产品目录",
      metrics: [
        { val: "+500", label: "认证OEM原厂与合作制造商" },
        { val: "24h - 48h", label: "达喀尔本地现货极速配送" },
        { val: "5 - 10 天", label: "达喀尔DAP特快空运专线" },
        { val: "100%", label: "CE / ISO认证与12个月原厂质保" }
      ],
      pillarsTitle: "全方位、高可靠的工业供应链体系",
      pillarsSub: "Zone Équipements Sénégal 为您的MRO工业维护、建筑工程、矿山采掘及能源项目提供端到端保障。",
      pillars: [
        {
          icon: Search,
          color: "bg-[#003366]",
          tag: "全球寻源直采",
          title: "1. 按需定制寻源与原厂议价 (OEM)",
          desc: "正在寻找稀缺备件、特种电机或成套工程机械？我们的工程师直接对接中国、欧美认证原厂，享受出厂直采价。",
          points: [
            "支持按序列号、铭牌参数或技术规格书精准匹配型号",
            "直通阿里巴巴、1688及欧美工业品牌原厂供应链",
            "严格核验原厂正品资质与原产地证书"
          ]
        },
        {
          icon: ShieldCheck,
          color: "bg-[#FF6600]",
          tag: "品控与合规",
          title: "2. 出口仓质量检验与装运前测试",
          desc: "所有设备在离开出口集运仓前均经过严格检验，彻底杜绝型号不符或质量隐患。",
          points: [
            "集运仓外观核验与技术铭牌参数复核",
            "按需提供设备出厂测试报告与装运前视频验货",
            "工业级加固包装（符合ISPM15海运熏蒸木箱/防震标准）"
          ]
        },
        {
          icon: Truck,
          color: "bg-[#003366]",
          tag: "国际转运与清关",
          title: "3. 国际海空物流与达喀尔DAP包清关服务",
          desc: "我们全程负责国际干线运输、口岸转运与塞内加尔海关清关手续，设备直达达喀尔。",
          points: [
            `特快空运专线（${settings.airFreightDurationDays || '5至10天'}），满足紧急抢修备件需求`,
            `经济海运专线（${settings.seaFreightDurationDays || '30至45天'}），支持按重量(kg)或体积(m³)计费`,
            "全程包办清关手续，透明一口价，绝无隐形费用"
          ]
        },
        {
          icon: Package,
          color: "bg-emerald-600",
          tag: "本地现货即发",
          title: "4. 达喀尔本地MRO现货仓（立即可发）",
          desc: "为应对工地与工厂紧急需求，我们在达喀尔常备电动工具、测试仪表、安全防护(PPE)及电气元件现货。",
          points: [
            "全站带有绿色「立即可发 / 达喀尔现货」标识的商品",
            "免除国际运费与跨国等待周期",
            "支持达喀尔仓库自提或24-48小时极速送达工地"
          ]
        },
        {
          icon: FileText,
          color: "bg-[#003366]",
          tag: "B2B企业结算方案",
          title: "5. 官方形式发票 (Proforma) 与灵活定金结算",
          desc: "专为大中型企业采购部、建筑承包商、矿业公司及政府机构设计的合规财务流程。",
          points: [
            "即时生成带税号(NINEA)的官方形式发票（支持18%增值税可选）",
            "大额设备支持分期付款（如：下单付30%定金，达喀尔交货付70%尾款）",
            "支持银行对公转账、认证支票、Wave及Orange Money移动支付"
          ]
        },
        {
          icon: Headphones,
          color: "bg-[#FF6600]",
          tag: "售后与质保",
          title: "6. 24/7全天候技术支持、物流追踪与原厂质保",
          desc: "每笔订单均配备专属编号与客户经理跟进，提供完善的售后与12个月质保服务。",
          points: [
            "通过WhatsApp专线、电话与邮件提供7×24小时响应",
            "整机与核心部件享有12个月商业质保",
            "长期保障易损件与配套耗材供应"
          ]
        }
      ],
      compTitle: "清晰透明：达喀尔本地现货 vs 跨境直采商品",
      compSub: "在商品详情页、目录及采购车中，系统自动识别并区分现货与直采商品，确保运费与交期一目了然。",
      compHeaders: ["对比维度", "立即可发（达喀尔本地现货）", "按需直采 — 特快空运", "按需直采 — 经济海运"],
      compRows: [
        ["网站标识", "🟢 立即可发（达喀尔现货）", "🟠 按需直采（✈️ 空运）", "🟠 按需直采（🚢 海运）"],
        ["交付周期", "24至48小时（达喀尔及周边）", settings.airFreightDurationDays || "5至10个工作日", settings.seaFreightDurationDays || "30至45天"],
        ["国际运费", "0 FCFA（已在达喀尔完税入库）", "按商品自动核算", "按商品自动核算"],
        ["适用场景", "工地急需、安全劳保、常规工具", "紧急维修备件、PLC、20kg以内水泵仪表", "发电机组、重型机械、大宗批量集采"]
      ],
      stepsTitle: "B2B工业集采 5 步标准流程",
      steps: [
        { num: "01", title: "选品或提交需求", desc: "在目录中选择现货或直采商品，或提交您的型号/外部供应商链接。" },
        { num: "02", title: "24h内出具形式发票", desc: "技术工程师核对参数，精准核算海空运费并出具官方Proforma报价单。" },
        { num: "03", title: "订单确认与出口验货", desc: "确认订单（或支付定金）后，我们在出口集运仓完成设备检测与加固包装。" },
        { num: "04", title: "国际干线与清关", desc: "通过航空或海运安全发往达喀尔，由我司全程办理通关完税。" },
        { num: "05", title: "工地现场交付", desc: "达喀尔仓库自提或直接派送至您的工厂/项目现场，附带质保单据。" }
      ],
      formTitle: "定制寻源与专属询价申请表",
      formSub: "有特定型号、采购清单或供应商链接（Alibaba、1688、欧美原厂）？提交后24小时内获取完整到岸报价。",
      faqTitle: "常见问题解答 (FAQ 服务与物流)",
      faqs: [
        {
          q: "如何区分「达喀尔现货」和「跨境直采商品」？",
          a: "每件商品均带有清晰的徽章标识：绿色「立即可发 • 达喀尔现货」代表本地仓库有货（24-48小时交付，0国际运费）；橙色「按需直采」代表跨国订购，可自由选择空运或海运方案。"
        },
        {
          q: "货物抵达达喀尔后还需要额外支付清关费吗？",
          a: "不需要。只要您选择了达喀尔DAP空运或海运方案，所有常规转运与清关手续均已包含在形式发票总价中。"
        },
        {
          q: "我可以委托你们代采阿里巴巴或欧美厂家链接上的设备吗？",
          a: "完全可以！您只需在下方表格或通过WhatsApp发送链接或型号，我们将负责核验厂家、议价、验货及跨国清关配送。"
        },
        {
          q: "进口工业设备享受怎样的售后服务与质保？",
          a: "所有全新设备均享有至少12个月原厂质保，发货前经过严格质检，并符合CE / ISO国际标准。"
        }
      ]
    }
  }[language];

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* 1. HERO SECTION */}
      <section className="relative bg-gradient-to-br from-[#002244] via-[#003366] to-[#004080] text-white py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl sm:text-5xl font-black font-roboto mb-5 leading-tight">
              {copy.heroTitle}
            </h1>
            <p className="text-base sm:text-lg text-blue-100/90 leading-relaxed mb-8">
              {copy.heroSub}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a
                href="#sourcing-request-form"
                className="px-6 py-3.5 bg-[#FF6600] hover:bg-orange-600 text-white font-extrabold rounded-xl shadow-lg shadow-orange-600/30 transition-all flex items-center gap-2 text-sm"
              >
                <Search className="w-4 h-4" />
                {copy.ctaQuote}
              </a>
              <Link
                to="/catalogue"
                className="px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white border border-white/25 font-bold rounded-xl transition-all flex items-center gap-2 text-sm"
              >
                <Package className="w-4 h-4" />
                {copy.ctaCatalog}
              </Link>
            </div>
          </div>

          {/* Key B2B Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-14">
            {copy.metrics.map((m, idx) => (
              <div
                key={idx}
                className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-5 text-center"
              >
                <div className="text-2xl sm:text-3xl font-black text-[#FF6600] font-mono mb-1">
                  {m.val}
                </div>
                <div className="text-xs sm:text-sm text-blue-100 font-medium">
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. THE 6 SERVICE PILLARS */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-black text-[#003366] font-roboto mb-3">
              {copy.pillarsTitle}
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              {copy.pillarsSub}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {copy.pillars.map((pillar, idx) => {
              const IconComp = pillar.icon;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-7 shadow-sm border border-slate-200/80 hover:shadow-xl hover:border-[#003366]/30 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-5">
                      <div className={`w-13 h-13 ${pillar.color} text-white rounded-xl flex items-center justify-center shadow-md`}>
                        <IconComp className="w-6 h-6" />
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-[#003366] font-bold text-[11px] uppercase tracking-wider">
                        {pillar.tag}
                      </span>
                    </div>
                    <h3 className="text-lg font-extrabold text-[#003366] mb-3 font-roboto group-hover:text-[#FF6600] transition-colors">
                      {pillar.title}
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed mb-5">
                      {pillar.desc}
                    </p>
                  </div>

                  <ul className="space-y-2.5 pt-4 border-t border-slate-100">
                    {pillar.points.map((pt, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. COMPARATIVE TABLE: DISPONIBLE IMMÉDIATEMENT vs ARTICLES À SOURCER */}
      <section className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-[#FF6600] border border-orange-200 text-xs font-extrabold uppercase tracking-wider mb-2">
              <Clock className="w-3.5 h-3.5" /> Transparence des Délais & Barèmes
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#003366] font-roboto mb-3">
              {copy.compTitle}
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              {copy.compSub}
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#003366] text-white text-xs sm:text-sm">
                  <th className="py-4 px-5 font-bold">{copy.compHeaders[0]}</th>
                  <th className="py-4 px-5 font-bold bg-emerald-800/90">{copy.compHeaders[1]}</th>
                  <th className="py-4 px-5 font-bold">{copy.compHeaders[2]}</th>
                  <th className="py-4 px-5 font-bold">{copy.compHeaders[3]}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs sm:text-sm bg-white">
                {copy.compRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50">
                    <td className="py-4 px-5 font-extrabold text-slate-900 bg-slate-50/70">{row[0]}</td>
                    <td className="py-4 px-5 font-bold text-emerald-800 bg-emerald-50/40">{row[1]}</td>
                    <td className="py-4 px-5 text-slate-700 font-medium">{row[2]}</td>
                    <td className="py-4 px-5 text-slate-700 font-medium">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/catalogue?availability=stock"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-sm transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Voir les matériels Disponibles Immédiatement
            </Link>
            <Link
              to="/catalogue?availability=sourcing"
              className="px-5 py-2.5 rounded-xl bg-[#003366] hover:bg-[#002244] text-white text-xs font-extrabold flex items-center gap-2 shadow-sm transition-colors"
            >
              <Globe className="w-4 h-4" />
              Voir les Articles à Sourcer sur Commande
            </Link>
          </div>
        </div>
      </section>

      {/* 4. 5-STEP WORKFLOW */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-black text-center text-[#003366] font-roboto mb-12">
            {copy.stepsTitle}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {copy.steps.map((st, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-black font-mono text-[#FF6600] bg-orange-50 border border-orange-200 px-3 py-1 rounded-xl">
                      {st.num}
                    </span>
                    {idx < copy.steps.length - 1 && (
                      <ArrowRight className="w-5 h-5 text-slate-300 hidden lg:block" />
                    )}
                  </div>
                  <h3 className="text-base font-extrabold text-[#003366] mb-2">
                    {st.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {st.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. INTERACTIVE SOURCING ON DEMAND FORM */}
      <section id="sourcing-request-form" className="py-16 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-[#003366] to-[#002244] rounded-3xl p-6 sm:p-10 text-white shadow-xl">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <span className="inline-block px-3 py-1 rounded-full bg-[#FF6600] text-white text-[11px] font-extrabold uppercase tracking-wider mb-3">
                Service Sourcing & Cotation Express
              </span>
              <h2 className="text-2xl sm:text-3xl font-black font-roboto mb-2">
                {copy.formTitle}
              </h2>
              <p className="text-xs sm:text-sm text-blue-100">
                {copy.formSub}
              </p>
            </div>

            {submittedRef ? (
              <div className="bg-white text-slate-900 rounded-2xl p-8 text-center space-y-4">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-[#003366]">
                  Demande de Sourcing Enregistrée : {submittedRef}
                </h3>
                <p className="text-sm text-slate-600 max-w-lg mx-auto">
                  Notre bureau d'études technico-commercial analyse votre besoin et vous transmettra votre Devis Proforma détaillé sous 24h.
                </p>
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <a
                    href={`https://wa.me/${(settings.whatsappNumber || '221766538384').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour Zone Équipements, je viens de soumettre la demande de sourcing N° ${submittedRef} pour : ${formData.equipmentName} (Qté: ${formData.quantity}).`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2"
                  >
                    <Phone className="w-4 h-4" /> Accélérer le traitement sur WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={() => setSubmittedRef(null)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                  >
                    Nouvelle demande
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSourcingSubmit} className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Nom & Prénom du Contact *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      placeholder="Ex: Amadou Ndiaye"
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#003366]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Entreprise / Chantier / Institution
                    </label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="Ex: SOGEA / Industries du Sénégal"
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#003366]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Téléphone / WhatsApp *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+221 77 000 00 00"
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#003366]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Email Professionnel
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contact@entreprise.sn"
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#003366]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Désignation de l'Équipement ou Pièce Recherchée *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.equipmentName}
                      onChange={(e) => setFormData({ ...formData, equipmentName: e.target.value })}
                      placeholder="Ex: Pompe centrifuge multicellulaire 15kW / Disjoncteur Schneider..."
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#003366]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Quantité Souhaitée *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:border-[#003366]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Marque / Modèle / N° de Série (si connu)
                    </label>
                    <input
                      type="text"
                      value={formData.brandOrRef}
                      onChange={(e) => setFormData({ ...formData, brandOrRef: e.target.value })}
                      placeholder="Ex: Grundfos CR 15-04 / Siemens 6ES7..."
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#003366]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Lien URL Fournisseur (Alibaba, AliExpress, Europe...)
                    </label>
                    <input
                      type="url"
                      value={formData.supplierUrl}
                      onChange={(e) => setFormData({ ...formData, supplierUrl: e.target.value })}
                      placeholder="https://www.alibaba.com/product-detail/..."
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#003366]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                    Mode d'Approvisionnement Privilégié
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, urgency: 'stock' })}
                      className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                        formData.urgency === 'stock'
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-900 font-bold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      🟢 Stock Local Dakar (Si équivalent dispo sous 24-48h)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, urgency: 'air' })}
                      className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                        formData.urgency === 'air'
                          ? 'bg-blue-50 border-[#003366] text-[#003366] font-bold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      ✈️ Sourcing Aérien Express ({settings.airFreightDurationDays || '5 - 10 jours'})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, urgency: 'sea' })}
                      className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                        formData.urgency === 'sea'
                          ? 'bg-orange-50 border-[#FF6600] text-[#FF6600] font-bold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      🚢 Sourcing Maritime Économique ({settings.seaFreightDurationDays || '30 - 45 jours'})
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Spécifications Techniques ou Précisions Complémentaires
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Tension (220V / 380V), puissance, débit, contraintes de chantier..."
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#003366]"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <span className="text-xs text-slate-500">
                    🔒 Traitement confidentiel par nos ingénieurs d'application à Dakar.
                  </span>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-[#FF6600] hover:bg-orange-600 text-white font-extrabold rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-orange-600/25 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    Envoyer ma Demande de Cotation
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* 6. FAQ SECTION */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-2 mb-8">
            <HelpCircle className="w-6 h-6 text-[#FF6600]" />
            <h2 className="text-2xl sm:text-3xl font-black text-[#003366] font-roboto">
              {copy.faqTitle}
            </h2>
          </div>

          <div className="space-y-4">
            {copy.faqs.map((faq, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-base font-extrabold text-[#003366] mb-2">
                  {faq.q}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

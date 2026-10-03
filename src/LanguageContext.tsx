import React, { createContext, useContext, useState } from 'react';
import {
  translateSpecsRecordToFrench,
  smartTranslateProductTitleToFrench,
  smartTranslateProductDescriptionToFrench,
  translateSpecValueToFrenchClient
} from './services/catalogService';

export type Language = 'fr' | 'en' | 'es' | 'zh';

export interface Translations {
  [key: string]: {
    fr: string;
    en: string;
    es: string;
    zh: string;
  };
}

export const DICTIONARY: Translations = {
  // Navigation & Header
  nav_home: {
    fr: "Accueil",
    en: "Home",
    es: "Inicio",
    zh: "首页"
  },
  nav_catalog: {
    fr: "Catalogue",
    en: "Catalog",
    es: "Catálogo",
    zh: "产品目录"
  },
  nav_services: {
    fr: "Services & Logistique",
    en: "Services & Logistics",
    es: "Servicios y Logística",
    zh: "服务与物流"
  },
  nav_services_short: {
    fr: "Nos Services",
    en: "Our Services",
    es: "Nuestros Servicios",
    zh: "我们的服务"
  },
  nav_blog_guides: {
    fr: "Guides & Articles",
    en: "Guides & Articles",
    es: "Guías y Artículos",
    zh: "技术指南与文章"
  },
  nav_contact: {
    fr: "Contact",
    en: "Contact",
    es: "Contacto",
    zh: "联系我们"
  },
  nav_quote: {
    fr: "Demande de Devis",
    en: "Request a Quote",
    es: "Solicitar Presupuesto",
    zh: "索取报价"
  },
  nav_cart: {
    fr: "Panier",
    en: "Cart",
    es: "Carrito",
    zh: "购物车"
  },
  nav_account: {
    fr: "Mon Compte",
    en: "My Account",
    es: "Mi Cuenta",
    zh: "我的账户"
  },
  nav_login: {
    fr: "Connexion",
    en: "Login",
    es: "Iniciar Sesión",
    zh: "登录"
  },
  nav_admin: {
    fr: "Administration",
    en: "Admin",
    es: "Administración",
    zh: "管理后台"
  },
  search_placeholder: {
    fr: "Rechercher un produit, une référence, une marque...",
    en: "Search a product, part number, brand...",
    es: "Buscar un producto, referencia, marca...",
    zh: "搜索产品、型号、品牌..."
  },

  // Footer keys (fixing footer_desc and all footer labels)
  footer_desc: {
    fr: "Centrale d'approvisionnement B2B spécialisée dans la fourniture d'équipements industriels, pièces MRO d'origine et logistique internationale vers le Sénégal et l'Afrique.",
    en: "B2B procurement hub specialized in industrial equipment, genuine MRO spare parts, and international logistics to Senegal and Africa.",
    es: "Central de compras B2B especializada en equipos industriales, repuestos MRO originales y logística internacional hacia Senegal y África.",
    zh: "专注于工业设备、原装MRO备件供应及塞内加尔与非洲国际物流的B2B集采中心。"
  },
  footer_links: {
    fr: "Navigation & Services",
    en: "Navigation & Services",
    es: "Navegación y Servicios",
    zh: "导航与服务"
  },
  footer_custom_sourcing: {
    fr: "Sourcing sur-mesure",
    en: "Custom Sourcing",
    es: "Sourcing a medida",
    zh: "定制寻源采购"
  },
  footer_payments_title: {
    fr: "Paiements Sécurisés via PayDunya",
    en: "Secure Payments via PayDunya",
    es: "Pagos Seguros vía PayDunya",
    zh: "PayDunya 安全聚合支付"
  },
  footer_payments_desc: {
    fr: "Réglez vos commandes en toute sécurité via PayDunya (Mobile Money & Cartes bancaires) ou par virement B2B :",
    en: "Pay securely via PayDunya (Mobile Money & Bank Cards) or B2B bank transfer:",
    es: "Pague de forma segura vía PayDunya (Mobile Money y Tarjetas) o transferencia bancaria B2B:",
    zh: "通过 PayDunya（移动支付与银行卡）或B2B银行转账安全结算："
  },
  footer_contact: {
    fr: "Assistance & Contact B2B",
    en: "B2B Support & Contact",
    es: "Soporte y Contacto B2B",
    zh: "B2B技术支持与联系"
  },
  footer_contact_desc: {
    fr: "Nos ingénieurs industriels vous accompagnent dans le choix de vos références et l'établissement de vos cotations techniques.",
    en: "Our industrial engineers assist you in selecting manufacturer references and technical quotes.",
    es: "Nuestros ingenieros industriales le asesoran en la selección de referencias y cotizaciones.",
    zh: "我们的工业工程师协助您核对原厂型号并出具技术报价单。"
  },
  footer_rights: {
    fr: "Tous droits réservés.",
    en: "All rights reserved.",
    es: "Todos los derechos reservados.",
    zh: "版权所有。"
  },
  footer_terms: {
    fr: "Conditions Générales",
    en: "Terms & Conditions",
    es: "Términos y Condiciones",
    zh: "服务条款"
  },
  footer_privacy: {
    fr: "Confidentialité",
    en: "Privacy Policy",
    es: "Política de Privacidad",
    zh: "隐私政策"
  },

  // Hero & General
  hero_title: {
    fr: "Équipements Industriels & Pièces MRO d'Origine",
    en: "Industrial Equipment & Genuine MRO Parts",
    es: "Equipos Industriales y Repuestos MRO Originales",
    zh: "原装工业设备与MRO备件采购"
  },
  hero_subtitle: {
    fr: "Sourcing direct fabricants certifiés, transit et dédouanement DAP sécurisés vers Dakar et l'Afrique.",
    en: "Direct certified manufacturer sourcing, secured DAP transit and customs clearance to Dakar and Africa.",
    es: "Suministro directo de fabricantes certificados, tránsito DAP seguro y despacho aduanero a Dakar y África.",
    zh: "直接对接认证原厂，安全可靠的DAP国际转运与达喀尔及非洲清关。"
  },
  explore_catalog: {
    fr: "Explorer le Catalogue",
    en: "Explore Catalog",
    es: "Explorar Catálogo",
    zh: "浏览全部产品"
  },
  request_proforma: {
    fr: "Demander une Proforma",
    en: "Request Proforma",
    es: "Solicitar Proforma",
    zh: "申请形式发票"
  },
  categories: {
    fr: "Catégories d'Équipements",
    en: "Equipment Categories",
    es: "Categorías de Equipos",
    zh: "工业设备分类"
  },
  categories_sub: {
    fr: "catégories d'équipements pour tous vos besoins. Sourcing de précision d'origine constructeur.",
    en: "equipment categories for all your needs. Precision OEM sourcing.",
    es: "categorías de equipos para todas sus necesidades. Sourcing de precisión OEM.",
    zh: "大工业设备类别，满足您的全部MRO需求，原厂精准直采。"
  },

  // Home Sections
  home_sectors_title: {
    fr: "Secteurs d'Activité",
    en: "Industrial Sectors",
    es: "Sectores Industriales",
    zh: "行业应用领域"
  },
  home_sectors_sub: {
    fr: "Nous fournissons des équipements spécialisés répondant aux normes les plus strictes de chaque industrie.",
    en: "We supply specialized equipment meeting the strictest standards of every industry.",
    es: "Suministramos equipos especializados que cumplen con las normas más estrictas de cada industria.",
    zh: "我们提供符合各行业最严格标准的专业工业设备与工程物资。"
  },
  home_catalog_badge: {
    fr: "Catalogue MRO & Équipements Industriels",
    en: "MRO Catalog & Industrial Equipment",
    es: "Catálogo MRO y Equipos Industriales",
    zh: "MRO目录与工业设备"
  },
  home_catalog_title: {
    fr: "Matériels en Stock Local & Articles à Sourcer",
    en: "Local Stock Equipment & Sourcing Items",
    es: "Equipos en Stock Local y Artículos a Importar",
    zh: "达喀尔本地现货与跨境直采设备"
  },
  home_catalog_sub: {
    fr: "Identifiez immédiatement les équipements disponibles en stock à Dakar (24-48h) et ceux sourcés sur commande directe usine.",
    en: "Immediately identify equipment available in Dakar stock (24-48h) and items sourced directly from factories.",
    es: "Identifique de inmediato los equipos disponibles en stock en Dakar (24-48h) y los importados bajo pedido de fábrica.",
    zh: "清晰区分达喀尔本地现货（24-48小时交付）与原厂按需直采商品。"
  },
  home_filter_all: {
    fr: "Tous",
    en: "All",
    es: "Todos",
    zh: "全部"
  },
  home_view_product: {
    fr: "Voir fiche",
    en: "View details",
    es: "Ver ficha",
    zh: "查看详情"
  },
  home_view_all_catalog: {
    fr: "Voir tout le catalogue",
    en: "View full catalog",
    es: "Ver todo el catálogo",
    zh: "查看完整目录"
  },
  home_brands_title: {
    fr: "Marques de Confiance",
    en: "Trusted Partner Brands",
    es: "Marcas de Confianza",
    zh: "合作品牌与原厂"
  },
  home_brands_sub: {
    fr: "Accédez aux constructeurs leaders mondiaux garantissant des performances MRO optimales pour vos lignes de production.",
    en: "Access world-leading manufacturers guaranteeing optimal MRO performance for your production lines.",
    es: "Acceda a los fabricantes líderes mundiales que garantizan un rendimiento MRO óptimo para sus líneas de producción.",
    zh: "汇聚全球领先工业制造商品牌，保障您的生产线高效稳定运行。"
  },
  home_testimonials_title: {
    fr: "Témoignages Clients",
    en: "Client Testimonials",
    es: "Testimonios de Clientes",
    zh: "客户评价"
  },
  home_testimonials_sub: {
    fr: "Découvrez pourquoi de nombreuses entreprises industrielles africaines nous font confiance chaque jour.",
    en: "Discover why leading African industrial companies trust us every day.",
    es: "Descubra por qué numerosas empresas industriales africanas confían en nosotros cada día.",
    zh: "了解为何众多非洲工业与工程企业每天都信赖我们的采购服务。"
  },
  home_articles_title: {
    fr: "Derniers Articles & Guides Pratiques",
    en: "Latest Articles & Technical Guides",
    es: "Últimos Artículos y Guías Prácticas",
    zh: "最新技术文章与采购指南"
  },
  home_articles_sub: {
    fr: "Guides techniques concrets, comparatifs logistiques et conseils de maintenance industrielle pour l'Afrique de l'Ouest.",
    en: "Practical technical guides, logistics comparisons, and industrial maintenance advice for West Africa.",
    es: "Guías técnicas prácticas, comparativas logísticas y consejos de mantenimiento industrial para África Occidental.",
    zh: "针对西非市场的实用技术指南、海空物流对比与工业维护建议。"
  },
  home_read_article: {
    fr: "Lire le dossier",
    en: "Read article",
    es: "Leer artículo",
    zh: "阅读全文"
  },
  home_view_all_articles: {
    fr: "Voir tous les guides techniques & articles",
    en: "View all technical guides & articles",
    es: "Ver todas las guías técnicas y artículos",
    zh: "查看全部技术指南与文章"
  },
  home_faq_title: {
    fr: "Questions Fréquentes",
    en: "Frequently Asked Questions",
    es: "Preguntas Frecuentes",
    zh: "常见问题解答"
  },
  home_faq_sub: {
    fr: "Tout savoir sur l'approvisionnement industriel, les modalités d'expédition et la logistique vers l'Afrique.",
    en: "Everything you need to know about industrial procurement, shipping options, and logistics to Africa.",
    es: "Todo sobre el suministro industrial, modalidades de envío y logística hacia África.",
    zh: "全面了解工业采购、发运方式及非洲国际物流服务。"
  },

  // Trust Badges
  badge_oem: {
    fr: "Origine OEM Garantie",
    en: "Guaranteed OEM Origin",
    es: "Origen OEM Garantizado",
    zh: "原厂正品认证(OEM)"
  },
  badge_transit: {
    fr: "Transit Direct Afrique",
    en: "Direct Africa Transit",
    es: "Tránsito Directo a África",
    zh: "非洲国际直达转运"
  },
  badge_quote_24h: {
    fr: "Chiffrage Express < 24h",
    en: "Express Quote < 24h",
    es: "Cotización Exprés < 24h",
    zh: "24小时内急速报价"
  },
  badge_ce_iso: {
    fr: "Conforme Normes CE / ISO",
    en: "Complies with CE / ISO Standards",
    es: "Conforme a Normas CE / ISO",
    zh: "符合CE/ISO国际工业标准"
  },

  // Logistics Section
  logistics_badge: {
    fr: "Logistique Panafricaine",
    en: "Pan-African Logistics",
    es: "Logística Panafricana",
    zh: "泛非物流网络"
  },
  logistics_title: {
    fr: "Livraison Partout en Afrique",
    en: "Delivery Across Africa",
    es: "Entrega en Toda África",
    zh: "全非洲工程物流配送"
  },
  logistics_subtitle: {
    fr: "ZONE ÉQUIPEMENTS s'appuie sur un réseau logistique robuste pour livrer vos équipements industriels dans les zones les plus reculées du continent.",
    en: "ZONE ÉQUIPEMENTS relies on a robust logistics network to deliver your industrial equipment across the entire African continent.",
    es: "ZONE ÉQUIPEMENTS se apoya en una sólida red logística para entregar sus equipos industriales en todo el continente africano.",
    zh: "ZONE ÉQUIPEMENTS 依托强大的国际物流网络，将工业设备安全送达非洲各地。"
  },
  logistics_west_africa: {
    fr: "Afrique de l'Ouest",
    en: "West Africa",
    es: "África Occidental",
    zh: "西非地区"
  },
  logistics_west_desc: {
    fr: "Sénégal, Côte d'Ivoire, Mali, Guinée, Burkina Faso, Togo, Bénin...",
    en: "Senegal, Ivory Coast, Mali, Guinea, Burkina Faso, Togo, Benin...",
    es: "Senegal, Costa de Marfil, Malí, Guinea, Burkina Faso, Togo, Benín...",
    zh: "塞内加尔、科特迪瓦、马里、几内亚、布基纳法索、多哥、贝宁..."
  },
  logistics_central_africa: {
    fr: "Afrique Centrale",
    en: "Central Africa",
    es: "África Central",
    zh: "中非地区"
  },
  logistics_central_desc: {
    fr: "Cameroun, Gabon, Congo, RD Congo, Tchad, Guinée Équatoriale...",
    en: "Cameroon, Gabon, Congo, DR Congo, Chad, Equatorial Guinea...",
    es: "Camerún, Gabón, Congo, RD Congo, Chad, Guinea Ecuatorial...",
    zh: "喀麦隆、加蓬、刚果（布）、刚果（金）、乍得、赤道几内亚..."
  },
  logistics_east_africa: {
    fr: "Afrique de l'Est",
    en: "East Africa",
    es: "África Oriental",
    zh: "东非地区"
  },
  logistics_east_desc: {
    fr: "Kenya, Tanzanie, Ouganda, Éthiopie, Rwanda, Djibouti...",
    en: "Kenya, Tanzania, Uganda, Ethiopia, Rwanda, Djibouti...",
    es: "Kenia, Tanzania, Uganda, Etiopía, Ruanda, Yibuti...",
    zh: "肯尼亚、坦桑尼亚、乌干达、埃塞俄比亚、卢旺达、吉布提..."
  },
  logistics_south_africa: {
    fr: "Afrique Australe",
    en: "Southern Africa",
    es: "África Austral",
    zh: "南部非洲"
  },
  logistics_south_desc: {
    fr: "Afrique du Sud, Angola, Zambie, Zimbabwe, Mozambique, Namibie...",
    en: "South Africa, Angola, Zambia, Zimbabwe, Mozambique, Namibia...",
    es: "Sudáfrica, Angola, Zambia, Zimbabue, Mozambique, Namibia...",
    zh: "南非、安哥拉、赞比亚、津巴布韦、莫桑比克、纳米比亚..."
  },
  logistics_maghreb: {
    fr: "Maghreb & Sahel",
    en: "Maghreb & Sahel",
    es: "Magreb y Sahel",
    zh: "北非与萨赫勒"
  },
  logistics_maghreb_desc: {
    fr: "Maroc, Algérie, Tunisie, Mauritanie, Niger...",
    en: "Morocco, Algeria, Tunisia, Mauritania, Niger...",
    es: "Marruecos, Argelia, Túnez, Mauritania, Níger...",
    zh: "摩洛哥、阿尔及利亚、突尼斯、毛里塔尼亚、尼日尔..."
  },
  logistics_full_coverage: {
    fr: "Couverture Totale",
    en: "Total Coverage",
    es: "Cobertura Total",
    zh: "全境覆盖"
  },
  logistics_full_coverage_desc: {
    fr: "54 pays desservis avec suivi d'expédition en temps réel.",
    en: "54 countries served with real-time shipment tracking.",
    es: "54 países atendidos con seguimiento de envío en tiempo real.",
    zh: "服务覆盖非洲54个国家，提供实时物流追踪。"
  },
  logistics_partners_title: {
    fr: "Partenaires Stratégiques",
    en: "Strategic Logistics Partners",
    es: "Socios Estratégicos",
    zh: "全球战略物流伙伴"
  },
  logistics_partners_desc: {
    fr: "Nous collaborons avec les leaders mondiaux du transport aérien et maritime.",
    en: "We partner with global leaders in air and sea freight.",
    es: "Colaboramos con los líderes mundiales del transporte aéreo y marítimo.",
    zh: "我们与全球领先的航空及海运物流集团紧密合作。"
  },

  // Product Sheet & Shop
  filter_categories: {
    fr: "Catégories",
    en: "Categories",
    es: "Categorías",
    zh: "产品分类"
  },
  filter_all: {
    fr: "Tous les produits",
    en: "All products",
    es: "Todos los productos",
    zh: "全部商品"
  },
  sort_by: {
    fr: "Trier par :",
    en: "Sort by:",
    es: "Ordenar por:",
    zh: "排序方式："
  },
  sort_relevance: {
    fr: "Pertinence",
    en: "Relevance",
    es: "Relevancia",
    zh: "相关性"
  },
  sort_price_asc: {
    fr: "Prix : Croissant",
    en: "Price: Low to High",
    es: "Precio: Menor a Mayor",
    zh: "价格：从低到高"
  },
  sort_price_desc: {
    fr: "Prix : Décroissant",
    en: "Price: High to Low",
    es: "Precio: Mayor a Menor",
    zh: "价格：从高到低"
  },
  empty_catalog_title: {
    fr: "Aucun produit dans cette sélection",
    en: "No products in this selection",
    es: "No hay productos en esta selección",
    zh: "此筛选条件下暂无产品"
  },
  empty_catalog_desc: {
    fr: "Importez de nouveaux équipements certifiés via le lien fournisseur ou contactez nos équipes pour un approvisionnement immédiat.",
    en: "Import new certified equipment via supplier link or contact our team for immediate procurement.",
    es: "Importe nuevos equipos certificados a través del enlace del proveedor o contacte a nuestro equipo para un suministro inmediato.",
    zh: "请通过供应商链接导入认证新商品，或联系我们的采购专员进行即时采买。"
  },
  tariff_net_ht: {
    fr: "Tarif Net d'Importateur",
    en: "Net Importer Rate",
    es: "Tarifa Neta de Importador",
    zh: "进口净价（未税）"
  },
  vat_18_included: {
    fr: "TTC (TVA 18% Incluse)",
    en: "Incl. 18% VAT",
    es: "IVA 18% Incluido",
    zh: "含18%增值税"
  },
  add_to_cart_btn: {
    fr: "AJOUTER AU PANIER",
    en: "ADD TO CART",
    es: "AÑADIR AL CARRITO",
    zh: "加入采购车"
  },
  quote_pro_btn: {
    fr: "DEVIS PRO",
    en: "PRO QUOTE",
    es: "COTIZACIÓN PRO",
    zh: "形式发票"
  },
  freight_notice_catalog: {
    fr: "Fret aérien ou maritime au choix sur la fiche produit ou au panier",
    en: "Air or sea freight selectable on product sheet or in cart",
    es: "Flete aéreo o marítimo a elegir en la ficha o en el carrito",
    zh: "可在商品详情页或采购车中自由选择空运或海运"
  },

  // Freight & Logistics Options
  freight_selection_title: {
    fr: "Option d'Acheminement Logistique (au choix)",
    en: "Logistics Shipping Option (selectable)",
    es: "Opción de Transporte Logístico (a elegir)",
    zh: "国际物流发运方案（自主选配）"
  },
  freight_selection_desc: {
    fr: "Sélectionnez votre mode d'acheminement vers Dakar ou choisissez l'enlèvement départ usine.",
    en: "Select your shipping method to Dakar or choose ex-works factory pickup.",
    es: "Seleccione su método de transporte a Dakar o elija recogida en fábrica.",
    zh: "请选择发往达喀尔的货运方式，或选择工厂/出口仓自提。"
  },
  freight_none: {
    fr: "Sans fret international",
    en: "Without international freight",
    es: "Sin transporte internacional",
    zh: "不含国际运费（自理/出厂价）"
  },
  freight_none_sub: {
    fr: "Retrait entrepôt d'exportation ou transitaire géré par vos soins",
    en: "Export warehouse pickup or forwarder managed by client",
    es: "Retiro en almacén de exportación o transitario propio",
    zh: "出口仓库自提或由客户自行委托货代"
  },
  freight_air: {
    fr: "Fret Aérien Express (DAP Dakar)",
    en: "Express Air Freight (DAP Dakar)",
    es: "Flete Aéreo Exprés (DAP Dakar)",
    zh: "特快空运专线（达喀尔DAP）"
  },
  freight_air_sub: {
    fr: "5 à 8 jours • Recommandé pour pièces urgentes (Poids max : 20 kg)",
    en: "5 to 8 days • Recommended for urgent parts (Max weight: 20 kg)",
    es: "5 a 8 días • Recomendado para piezas urgentes (Peso máx: 20 kg)",
    zh: "5至8个工作日 • 紧急备件首选（限重20公斤以内）"
  },
  freight_sea: {
    fr: "Fret Maritime Économique (Port de Dakar)",
    en: "Economy Sea Freight (Port of Dakar)",
    es: "Flete Marítimo Económico (Puerto de Dakar)",
    zh: "经济海运散货（达喀尔港）"
  },
  freight_sea_sub: {
    fr: "30 à 45 jours • Recommandé charges lourdes (> 20 kg) & conteneurs",
    en: "30 to 45 days • Recommended for heavy cargo (> 20 kg) & containers",
    es: "30 a 45 días • Recomendado cargas pesadas (> 20 kg) y contenedores",
    zh: "30至45天 • 适合大件重货（>20公斤）及批量集装箱"
  },
  freight_air_exceeded: {
    fr: "⚠️ Poids supérieur à 20 kg : Fret maritime requis pour des raisons de coût et de gabarit",
    en: "⚠️ Weight exceeds 20 kg: Sea freight required for cost and dimensions",
    es: "⚠️ Peso superior a 20 kg: Flete marítimo requerido",
    zh: "⚠️ 货物重量已超20公斤限制：须使用经济海运"
  },

  // Deposit / Acompte
  deposit_notice: {
    fr: "Option Acompte à la commande :",
    en: "Order Deposit Option:",
    es: "Opción de Anticipo:",
    zh: "支持阶段性定金支付："
  },
  deposit_balance: {
    fr: "Solde exigible à la livraison à Dakar",
    en: "Balance due upon arrival in Dakar",
    es: "Saldo restante al momento de entrega en Dakar",
    zh: "尾款于货物抵达达喀尔交付时结清"
  },
  pay_full: {
    fr: "Payer la totalité (100%)",
    en: "Pay full amount (100%)",
    es: "Pagar el total (100%)",
    zh: "全款全额结清(100%)"
  },
  pay_deposit: {
    fr: "Régler l'acompte à la commande",
    en: "Pay deposit upon ordering",
    es: "Pagar anticipo al pedido",
    zh: "仅付订金，货到付余款"
  },

  // Product Details Tabs & Sections
  tab_specs: {
    fr: "Spécifications Techniques",
    en: "Technical Specifications",
    es: "Especificaciones Técnicas",
    zh: "技术规格参数"
  },
  tab_shipping: {
    fr: "Données d'Expédition (Shipping)",
    en: "Shipping Data",
    es: "Datos de Envío",
    zh: "包装与发运数据"
  },
  tab_rfq: {
    fr: "Demande de Cotation Proforma",
    en: "Proforma Quote Request",
    es: "Solicitud de Proforma",
    zh: "索取形式发票(PI)"
  },
  in_stock_label: {
    fr: "En Stock Entrepôt",
    en: "In Warehouse Stock",
    es: "En Stock Almacén",
    zh: "仓库现货"
  },
  lead_time_label: {
    fr: "Délai moyen constaté :",
    en: "Average lead time:",
    es: "Plazo medio constatado:",
    zh: "平均备货周期："
  },
  manufacturer_origin_guarantee: {
    fr: "Produit d'Origine Constructeur Garanti",
    en: "Guaranteed Manufacturer Origin",
    es: "Producto Original Garantizado",
    zh: "原厂制造商品品质保证"
  },
  manufacturer_origin_desc: {
    fr: "Livré sous emballage industriel d'usine certifié avec dossier de conformité CE / ISO.",
    en: "Delivered in certified industrial factory packaging with CE / ISO compliance documentation.",
    es: "Entregado en embalaje industrial de fábrica certificado con conformidad CE / ISO.",
    zh: "采用原厂防震工业包装交付，附带全套CE/ISO合规质检报告与原厂编号。"
  },

  // Dynamic Price Breakdown
  price_equipment_ht: {
    fr: "Prix Équipement Net HT",
    en: "Net Equipment Price (Ex-Tax)",
    es: "Precio Equipo Neto (Sin Impuestos)",
    zh: "设备净价（未税）"
  },
  freight_selected_cost: {
    fr: "Option Fret International :",
    en: "Selected Freight Option:",
    es: "Opción de Flete Seleccionada:",
    zh: "所选国际运费："
  },
  total_ht_calc: {
    fr: "Sous-total HT :",
    en: "Subtotal Ex-Tax:",
    es: "Subtotal Sin Impuestos:",
    zh: "未税小计："
  },
  vat_amount_calc: {
    fr: "TVA Sénégal (18%) :",
    en: "Senegal VAT (18%):",
    es: "IVA Senegal (18%):",
    zh: "塞内加尔增值税(18%)："
  },
  total_ttc_calc: {
    fr: "Total TTC estimé :",
    en: "Estimated Total (Incl. Tax):",
    es: "Total Estimado con Impuestos:",
    zh: "含税总计："
  },

  // Cart & Checkout
  cart_title: {
    fr: "Votre Panier B2B & Expédition",
    en: "Your B2B Cart & Shipping",
    es: "Su Carrito B2B y Envío",
    zh: "B2B采购车与发运确认"
  },
  cart_empty: {
    fr: "Votre panier est actuellement vide",
    en: "Your cart is currently empty",
    es: "Su carrito está actualmente vacío",
    zh: "采购车暂无待购商品"
  },
  checkout_button: {
    fr: "Confirmer la commande",
    en: "Confirm Order",
    es: "Confirmar Pedido",
    zh: "确认并提交订单"
  },
  proforma_button: {
    fr: "Éditer un Devis Proforma (PDF)",
    en: "Generate Proforma Quote (PDF)",
    es: "Generar Cotización Proforma (PDF)",
    zh: "导出形式发票PDF"
  },
  customer_info_title: {
    fr: "Coordonnées de Facturation & Livraison (Sénégal)",
    en: "Billing & Delivery Information (Senegal)",
    es: "Datos de Facturación y Entrega (Senegal)",
    zh: "塞内加尔境内结算与收货信息"
  },
  customer_name: {
    fr: "Nom du Contact *",
    en: "Contact Name *",
    es: "Nombre de Contacto *",
    zh: "联系人姓名 *"
  },
  customer_company: {
    fr: "Entreprise / Société (Optionnel)",
    en: "Company / Organization (Optional)",
    es: "Empresa / Sociedad (Opcional)",
    zh: "企业/机构名称（可选）"
  },
  customer_phone: {
    fr: "Téléphone Joignable (PayDunya / WhatsApp) *",
    en: "Phone Number (PayDunya / WhatsApp) *",
    es: "Teléfono Móvil (PayDunya / WhatsApp) *",
    zh: "联系电话（PayDunya / WhatsApp）*"
  },
  customer_city: {
    fr: "Ville de Livraison au Sénégal",
    en: "Delivery City in Senegal",
    es: "Ciudad de Entrega en Senegal",
    zh: "塞内加尔收件城市"
  },
  customer_address: {
    fr: "Adresse ou Emplacement Chantier",
    en: "Address or Construction Site Location",
    es: "Dirección o Ubicación de Obra",
    zh: "工厂地址/工地收件位置"
  },
  ethical_contract_title: {
    fr: "Mandat de Sourcing & Transparence Commerciale",
    en: "Sourcing Mandate & Commercial Transparency",
    es: "Mandato de Suministro y Transparencia",
    zh: "采购委托与商业透明准则"
  },
  ethical_contract_text: {
    fr: "Conformément à nos engagements de transparence commerciale, ce matériel est sourcé auprès du fabricant sélectionné avec garantie de conformité. Zone Équipements assure le contrôle qualité, le transit et le dédouanement.",
    en: "In accordance with our commercial transparency commitments, this equipment is sourced from the selected manufacturer with guaranteed conformity. Zone Équipements manages quality control, transit, and customs.",
    es: "De conformidad con nuestros compromisos de transparencia, este material se adquiere del fabricante seleccionado con garantía de conformidad.",
    zh: "根据商业合规与透明采购协议，该批物资直接向认证原厂订造，Zone Équipements全程负责品控出库、国际海空转运及报关完税。"
  },
  btn_continue_shopping: {
    fr: "Continuer les achats",
    en: "Continue Shopping",
    es: "Continuar Comprando",
    zh: "继续采购"
  },
  freight_intelligent_alert_title: {
    fr: "Optimisation Logistique Intelligente : Poids Élevé (> 20 kg)",
    en: "Smart Logistics Optimization: High Weight (> 20 kg)",
    es: "Optimización Logística Inteligente: Peso Elevado (> 20 kg)",
    zh: "智能物流优化提示：重量超标（> 20 kg）"
  },
  freight_intelligent_alert_desc: {
    fr: "Pour des colis industriels de plus de 20 kg, le fret maritime est automatiquement recommandé afin de réduire vos coûts de transport de plus de 70% par rapport à l'aérien express.",
    en: "For industrial parcels over 20 kg, sea freight is strongly recommended to reduce shipping costs by over 70% compared to express air freight.",
    es: "Para paquetes industriales de más de 20 kg, el flete marítimo es altamente recomendado para reducir costos.",
    zh: "对于超过20公斤的工业大件，系统强烈推荐采用经济海运，相比航空特快可节约70%以上的国际物流运费。"
  },
  subtotal_equipment_ht: {
    fr: "Sous-total Équipements (HT)",
    en: "Equipment Subtotal (Ex-Tax)",
    es: "Subtotal Equipos (Sin Impuestos)",
    zh: "设备货值小计（未税）"
  },
  shipping_transit_dap: {
    fr: "Fret International & Transit DAP",
    en: "International Freight & DAP Transit",
    es: "Flete Internacional y Tránsito DAP",
    zh: "国际海空运费与DAP口岸转运"
  },
  vat_senegal: {
    fr: "TVA Sénégal Légale (18%)",
    en: "Senegal Legal VAT (18%)",
    es: "IVA Legal Senegal (18%)",
    zh: "塞内加尔法定增值税（18%）"
  },
  total_ttc: {
    fr: "Total TTC à Régler",
    en: "Total (Incl. Taxes)",
    es: "Total con Impuestos",
    zh: "含税总付款额"
  },
  btn_validate_order: {
    fr: "Valider la Commande Ferme",
    en: "Confirm Purchase Order",
    es: "Confirmar Pedido en Firme",
    zh: "确认并正式下达订单"
  },
  btn_issue_proforma: {
    fr: "Émettre un Devis Proforma Officiel",
    en: "Generate Official Proforma Invoice",
    es: "Generar Factura Proforma Oficial",
    zh: "导出官方形式发票PI"
  },

  // Home Features
  feature_certified_quality: {
    fr: "Qualité Certifiée",
    en: "Certified Quality",
    es: "Calidad Certificada",
    zh: "原厂质保"
  },
  feature_certified_quality_sub: {
    fr: "Marques mondiales d'origine",
    en: "Original global brands",
    es: "Marcas mundiales originales",
    zh: "全球严选原装品牌"
  },
  feature_integrated_logistics: {
    fr: "Logistique Intégrée",
    en: "Integrated Logistics",
    es: "Logística Integrada",
    zh: "端到端专线物流"
  },
  feature_integrated_logistics_sub: {
    fr: "Livraison directe partout au Sénégal & Afrique",
    en: "Direct delivery across Senegal & Africa",
    es: "Entrega directa en Senegal y África",
    zh: "直达塞内加尔达喀尔及西非各工业园区"
  },
  feature_expert_support: {
    fr: "Support B2B & Approvisionnement",
    en: "B2B Support & Procurement",
    es: "Soporte B2B y Abastecimiento",
    zh: "专业B2B工业品集采支持"
  },
  feature_expert_support_sub: {
    fr: "Conseillers techniques MRO dédiés",
    en: "Dedicated technical MRO consultants",
    es: "Consultores técnicos MRO dedicados",
    zh: "全天候一对一工程采购管家"
  },
  nav_sectors: {
    fr: "Secteurs d'Activité Industriels",
    en: "Industrial Sectors",
    es: "Sectores Industriales",
    zh: "行业应用领域"
  },
  nav_brands: {
    fr: "Marques Partenaires & Constructeurs",
    en: "Partner Brands & Manufacturers",
    es: "Marcas y Fabricantes",
    zh: "合作品牌与认证制造商"
  },
  stock_immediate: {
    fr: "En Stock (Dispo immédiate)",
    en: "In Stock (Immediate)",
    es: "En Stock (Disponible hoy)",
    zh: "现货库存（立即可发）"
  },
  stock_immediate_short: {
    fr: "Disponible immédiatement",
    en: "Available Immediately",
    es: "Disponible inmediatamente",
    zh: "达喀尔现货"
  },
  stock_sourcing: {
    fr: "Sur Commande (À sourcer)",
    en: "On Order (Sourcing)",
    es: "Bajo Pedido (Sourcing)",
    zh: "按需直采（国际寻源）"
  },
  stock_sourcing_short: {
    fr: "Article à sourcer",
    en: "Sourcing Item",
    es: "Artículo a importar",
    zh: "跨境直采商品"
  },
  filter_all_products: {
    fr: "Tous les produits",
    en: "All products",
    es: "Todos los productos",
    zh: "全部产品"
  },
  filter_in_stock: {
    fr: "Disponibles immédiatement (En Stock Dakar)",
    en: "Immediately Available (Dakar Stock)",
    es: "Disponibles inmediatamente (Stock Dakar)",
    zh: "立即可发（达喀尔本地现货）"
  },
  filter_sourcing: {
    fr: "Articles à sourcer (Sur commande internationale)",
    en: "Items to Source (International Order)",
    es: "Artículos bajo pedido (Sourcing internacional)",
    zh: "国际寻源直采商品（按订单采购）"
  },
  btn_order_sourcing: {
    fr: "Commander (Sourcing)",
    en: "Order (Sourcing)",
    es: "Pedir (Sourcing)",
    zh: "立即预订（直采）"
  },
  btn_buy_immediate: {
    fr: "Ajouter (Stock Dispo)",
    en: "Add (In Stock)",
    es: "Añadir (En Stock)",
    zh: "加入购物车（现货）"
  }
};

const CATEGORY_MAP: Record<string, { fr: string; en: string; es: string; zh: string }> = {
  "Outillage Électroportatif & À Main": {
    fr: "Outillage Électroportatif & À Main",
    en: "Power & Hand Tools",
    es: "Herramientas Eléctricas y Manuales",
    zh: "电动与手动工具"
  },
  "Outillage électrique": {
    fr: "Outillage électrique",
    en: "Power Tools",
    es: "Herramientas eléctricas",
    zh: "电动工具"
  },
  "Outillage à main": {
    fr: "Outillage à main",
    en: "Hand Tools",
    es: "Herramientas manuales",
    zh: "手动工具"
  },
  "Équipements de Sécurité (EPI)": {
    fr: "Équipements de Sécurité (EPI)",
    en: "Safety Equipment (PPE)",
    es: "Equipos de Seguridad (EPI)",
    zh: "安全防护装备 (PPE)"
  },
  "Sécurité & EPI": {
    fr: "Sécurité & EPI",
    en: "Safety & PPE",
    es: "Seguridad y EPI",
    zh: "安全与个人防护 (PPE)"
  },
  "EPI et sécurité": {
    fr: "EPI et sécurité",
    en: "PPE & Safety",
    es: "EPI y seguridad",
    zh: "个人防护与安全"
  },
  "Instruments de Mesure & Test": {
    fr: "Instruments de Mesure & Test",
    en: "Measuring & Testing Instruments",
    es: "Instrumentos de Medición y Prueba",
    zh: "测量与测试仪器"
  },
  "Mesure & Test": {
    fr: "Mesure & Test",
    en: "Measurement & Testing",
    es: "Medición y Prueba",
    zh: "测量与检测"
  },
  "Instruments de mesure": {
    fr: "Instruments de mesure",
    en: "Measuring Instruments",
    es: "Instrumentos de medición",
    zh: "测试与测量仪器"
  },
  "Pompes, Moteurs & Hydraulique": {
    fr: "Pompes, Moteurs & Hydraulique",
    en: "Pumps, Motors & Hydraulics",
    es: "Bombas, Motores e Hidráulica",
    zh: "泵、电机与液压设备"
  },
  "Pompes et plomberie": {
    fr: "Pompes et plomberie",
    en: "Pumps & Plumbing",
    es: "Bombas y fontanería",
    zh: "工业水泵与管路"
  },
  "Soudage, Découpe & Abrasifs": {
    fr: "Soudage, Découpe & Abrasifs",
    en: "Welding, Cutting & Abrasives",
    es: "Soldadura, Corte y Abrasivos",
    zh: "焊接、切割与磨料"
  },
  "Électricité, Automatisme & Énergie": {
    fr: "Électricité, Automatisme & Énergie",
    en: "Electrical, Automation & Power",
    es: "Electricidad, Automatización y Energía",
    zh: "电气、自动化与能源"
  },
  "Électricité et éclairage": {
    fr: "Électricité et éclairage",
    en: "Electrical & Lighting",
    es: "Electricidad e iluminación",
    zh: "电气与工业照明"
  },
  "Manutention, Levage & Stockage": {
    fr: "Manutention, Levage & Stockage",
    en: "Material Handling, Lifting & Storage",
    es: "Manutención, Elevación y Almacenaje",
    zh: "物料搬运、起重与仓储"
  },
  "Manutention": {
    fr: "Manutention",
    en: "Material Handling",
    es: "Manutención",
    zh: "物料搬运与起重"
  },
  "Équipement d'extérieur": {
    fr: "Équipement d'extérieur",
    en: "Outdoor & Power Equipment",
    es: "Equipos de Exterior y Energía",
    zh: "户外动力与发电设备"
  },
  "CVC et ventilation": {
    fr: "CVC et ventilation",
    en: "HVAC & Ventilation",
    es: "Climatización y Ventilación",
    zh: "暖通空调与工业通风"
  },
  "Fixations et adhésifs": {
    fr: "Fixations et adhésifs",
    en: "Fasteners & Adhesives",
    es: "Fijaciones y Adhesivos",
    zh: "紧固件与工业胶粘剂"
  },
  "Solaire & Énergie": {
    fr: "Solaire & Énergie",
    en: "Solar & Energy",
    es: "Solar y Energía",
    zh: "太阳能与新能源"
  },
  "BTP & Construction": {
    fr: "BTP & Construction",
    en: "Construction & Civil Engineering",
    es: "Construcción y Obra Pública",
    zh: "建筑与工程机械"
  },
  "Mines & Extraction": {
    fr: "Mines & Extraction",
    en: "Mining & Extraction",
    es: "Minería y Extracción",
    zh: "矿山与采掘设备"
  },
  "Mines & Carrières": {
    fr: "Mines & Carrières",
    en: "Mining & Quarrying",
    es: "Minería y Canteras",
    zh: "矿山与采石工程"
  },
  "Agriculture & Irrigation": {
    fr: "Agriculture & Irrigation",
    en: "Agriculture & Irrigation",
    es: "Agricultura e Irrigación",
    zh: "农业与灌溉设备"
  },
  "Agriculture & Agro-industrie": {
    fr: "Agriculture & Agro-industrie",
    en: "Agriculture & Agribusiness",
    es: "Agricultura y Agroindustria",
    zh: "现代农业与农产品加工"
  },
  "Énergie & Hydraulique": {
    fr: "Énergie & Hydraulique",
    en: "Energy & Hydraulics",
    es: "Energía e Hidráulica",
    zh: "能源电力与液压工程"
  },
  "Abrasifs": {
    fr: "Abrasifs",
    en: "Abrasives",
    es: "Abrasivos",
    zh: "磨料与研磨工具"
  },
  "Adhésifs": {
    fr: "Adhésifs",
    en: "Adhesives & Sealants",
    es: "Adhesivos y Selladores",
    zh: "工业胶粘剂与密封胶"
  },
  "Batteries pour appareils électroménagers": {
    fr: "Batteries pour appareils électroménagers",
    en: "Appliance & Industrial Batteries",
    es: "Baterías para Equipos y Aparatos",
    zh: "设备与电器电池"
  },
  "Produits de nettoyage": {
    fr: "Produits de nettoyage",
    en: "Cleaning & Janitorial",
    es: "Productos de Limpieza Industrial",
    zh: "工业清洁设备与耗材"
  },
  "Électricité": {
    fr: "Électricité",
    en: "Electrical Equipment",
    es: "Equipos Eléctricos",
    zh: "工业电气设备"
  },
  "Fixations": {
    fr: "Fixations",
    en: "Fasteners",
    es: "Fijaciones y Tornillería",
    zh: "工业紧固件"
  },
  "Entretien de meubles": {
    fr: "Entretien de meubles",
    en: "Surface & Furniture Care",
    es: "Cuidado de Superficies y Mobiliario",
    zh: "表面护理与家具维护"
  },
  "Quincaillerie": {
    fr: "Quincaillerie",
    en: "Industrial Hardware",
    es: "Ferretería Industrial",
    zh: "工业五金配件"
  },
  "CVC": {
    fr: "CVC",
    en: "HVAC & Cooling",
    es: "Climatización (CVC)",
    zh: "暖通制冷 (HVAC)"
  },
  "Hydraulique": {
    fr: "Hydraulique",
    en: "Hydraulics",
    es: "Hidráulica Industrial",
    zh: "液压系统与元件"
  },
  "Fournitures de laboratoire": {
    fr: "Fournitures de laboratoire",
    en: "Lab Supplies & Testing",
    es: "Suministros de Laboratorio",
    zh: "实验室设备与耗材"
  },
  "Éclairage": {
    fr: "Éclairage",
    en: "Industrial Lighting",
    es: "Iluminación Industrial",
    zh: "工业照明设备"
  },
  "Lubrification": {
    fr: "Lubrification",
    en: "Lubrication & Greases",
    es: "Lubricación y Grasas",
    zh: "工业润滑油与油脂"
  },
  "Usinage": {
    fr: "Usinage",
    en: "Machining & Cutting Tools",
    es: "Mecanizado y Herramientas de Corte",
    zh: "机加工与切削刀具"
  },
  "Moteurs": {
    fr: "Moteurs",
    en: "Industrial Motors",
    es: "Motores Industriales",
    zh: "工业电机與驱动"
  },
  "Fournitures de bureau": {
    fr: "Fournitures de bureau",
    en: "Workshop & Office Supplies",
    es: "Suministros de Taller y Oficina",
    zh: "车间与办公用品"
  },
  "Fournitures de peinture": {
    fr: "Fournitures de peinture",
    en: "Painting & Coatings",
    es: "Pinturas y Recubrimientos",
    zh: "工业涂料与喷涂设备"
  },
  "Plomberie": {
    fr: "Plomberie",
    en: "Plumbing & Valves",
    es: "Fontanería y Válvulas",
    zh: "管道与工业阀门"
  },
  "Pneumatique": {
    fr: "Pneumatique",
    en: "Pneumatics & Compressors",
    es: "Neumática y Compresores",
    zh: "气动元件与空压机"
  },
  "Transmission de puissance": {
    fr: "Transmission de puissance",
    en: "Power Transmission & Bearings",
    es: "Transmisión de Potencia y Rodamientos",
    zh: "动力传动与轴承"
  },
  "Pompes": {
    fr: "Pompes",
    en: "Industrial Pumps",
    es: "Bombas Industriales",
    zh: "工业水泵与排污泵"
  },
  "Matières premières": {
    fr: "Matières premières",
    en: "Raw Materials & Metals",
    es: "Materias Primas y Perfiles",
    zh: "工业原材料与型材"
  },
  "Ouvrages de référence": {
    fr: "Ouvrages de référence",
    en: "Technical Standards & Guides",
    es: "Normas Técnicas y Manuales",
    zh: "国际工业标准与手册"
  },
  "Sécurité": {
    fr: "Sécurité",
    en: "Safety & PPE",
    es: "Seguridad Industrial y EPI",
    zh: "工业安全与防护 (PPE)"
  },
  "Entretien des véhicules": {
    fr: "Entretien des véhicules",
    en: "Fleet & Vehicle Maintenance",
    es: "Mantenimiento de Flotas y Vehículos",
    zh: "车队与工程车辆维护"
  },
  "Soudage": {
    fr: "Soudage",
    en: "Welding & Soldering",
    es: "Soldadura Industrial",
    zh: "工业焊接设备"
  },
  "Groupes électrogènes et générateurs": {
    fr: "Groupes électrogènes et générateurs",
    en: "Power Generators & Gensets",
    es: "Grupos Electrógenos y Generadores",
    zh: "柴油与燃气发电机组"
  },
  "Équipements professionnels": {
    fr: "Équipements professionnels",
    en: "Professional Equipment",
    es: "Equipos Profesionales",
    zh: "专业工业设备"
  },
  "Industrie Générale": {
    fr: "Industrie Générale",
    en: "General Industry",
    es: "Industria General",
    zh: "通用工业"
  },
  "Tous": {
    fr: "Tous",
    en: "All",
    es: "Todos",
    zh: "全部"
  }
};

// Comprehensive Industrial Term & Phrase Translator for zero-failure product/spec/UI translation
const INDUSTRIAL_TERMS: Array<{
  fr: string;
  en: string;
  es: string;
  zh: string;
}> = [
  // Complete sentences & standard descriptions
  {
    fr: "Équipement industriel certifié d'origine constructeur",
    en: "Certified original manufacturer industrial equipment",
    es: "Equipo industrial certificado de origen del fabricante",
    zh: "原厂认证工业设备"
  },
  {
    fr: "Sélectionné pour les opérations intensives de maintenance MRO, d'atelier et d'ingénierie en Afrique de l'Ouest.",
    en: "Selected for heavy-duty MRO maintenance, workshop, and engineering operations in West Africa.",
    es: "Seleccionado para operaciones intensivas de mantenimiento MRO, taller e ingeniería en África Occidental.",
    zh: "专为西非高强度MRO工业维护、车间作业及工程项目精选。"
  },
  {
    fr: "Livré avec conformité d'origine et traçabilité constructeur assurée.",
    en: "Delivered with original conformity and guaranteed manufacturer traceability.",
    es: "Entregado con conformidad de origen y trazabilidad del fabricante garantizada.",
    zh: "随货附带原厂合格证与完整制造商溯源记录。"
  },
  {
    fr: "Les abrasifs enlèvent de la matière d'une pièce à travailler par ponçage, tronçonnage ou meulage.",
    en: "Abrasives remove material from a workpiece through sanding, cutting, or grinding.",
    es: "Los abrasivos eliminan material de una pieza mediante lijado, corte o esmerilado.",
    zh: "磨料通过打磨、切割或研磨去除工件表面材料。"
  },
  {
    fr: "Les adhésifs, les produits d'étanchéité et les rubans sont utilisés pour coller, réparer et sceller une large gamme de matériaux.",
    en: "Adhesives, sealants, and tapes are used to bond, repair, and seal a wide range of industrial materials.",
    es: "Los adhesivos, selladores y cintas se utilizan para unir, reparar y sellar una amplia gama de materiales.",
    zh: "工业胶粘剂、密封胶和胶带用于粘接、修复和密封各类工业材料。"
  },
  {
    fr: "L'équipement électrique facilite et fournit l'énergie aux appareils, machines et systèmes industriels.",
    en: "Electrical equipment facilitates and supplies power to industrial devices, machinery, and systems.",
    es: "El equipo eléctrico facilita y suministra energía a dispositivos, máquinas y sistemas industriales.",
    zh: "电气设备为工业装置、机械及自动化系统提供稳定电力支持。"
  },
  {
    fr: "Groupes électrogènes, générateurs de chantier, nettoyeurs haute pression et équipements d'aménagement extérieur industriel.",
    en: "Power generators, site gensets, high-pressure washers, and outdoor industrial power equipment.",
    es: "Grupos electrógenos, generadores de obra, hidrolimpiadoras de alta presión y equipos industriales de exterior.",
    zh: "工业发电机组、工地发电设备、高压清洗机及户外重型动力设备。"
  },
  // Product nouns & equipment types
  { fr: "Groupe électrogène", en: "Power Generator", es: "Grupo electrógeno", zh: "发电机组" },
  { fr: "Générateur électrique", en: "Electric Generator", es: "Generador eléctrico", zh: "发电机" },
  { fr: "Générateur", en: "Generator", es: "Generador", zh: "发电机" },
  { fr: "Insonorisé", en: "Soundproof / Silent", es: "Insonorizado", zh: "静音型" },
  { fr: "Silencieux", en: "Silent", es: "Silencioso", zh: "静音" },
  { fr: "Triphasé", en: "Three-Phase", es: "Trifásico", zh: "三相" },
  { fr: "Monophasé", en: "Single-Phase", es: "Monofásico", zh: "单相" },
  { fr: "Démarrage électrique", en: "Electric Start", es: "Arranque eléctrico", zh: "电启动" },
  { fr: "Démarrage automatique", en: "Auto Start (ATS)", es: "Arranque automático", zh: "自动启动 (ATS)" },
  { fr: "Perceuse à percussion", en: "Hammer Drill", es: "Taladro percutor", zh: "冲击钻" },
  { fr: "Perceuse-visseuse", en: "Drill Driver", es: "Taladro atornillador", zh: "电钻/起子机" },
  { fr: "Perceuse", en: "Drill", es: "Taladro", zh: "电钻" },
  { fr: "Meuleuse d'angle", en: "Angle Grinder", es: "Amoladora angular", zh: "角磨机" },
  { fr: "Meuleuse", en: "Grinder", es: "Amoladora", zh: "磨光机" },
  { fr: "Poste à souder", en: "Welding Machine", es: "Máquina de soldar", zh: "电焊机" },
  { fr: "Pompe submersible", en: "Submersible Pump", es: "Bomba sumergible", zh: "潜水泵" },
  { fr: "Pompe centrifuge", en: "Centrifugal Pump", es: "Bomba centrífuga", zh: "离心泵" },
  { fr: "Pompe hydraulique", en: "Hydraulic Pump", es: "Bomba hidráulica", zh: "液压泵" },
  { fr: "Pompe", en: "Pump", es: "Bomba", zh: "工业泵" },
  { fr: "Compresseur à vis", en: "Rotary Screw Compressor", es: "Compresor de tornillo", zh: "螺杆空压机" },
  { fr: "Compresseur d'air", en: "Air Compressor", es: "Compresor de aire", zh: "空气压缩机" },
  { fr: "Compresseur", en: "Compressor", es: "Compresor", zh: "压缩机" },
  { fr: "Multimètre numérique", en: "Digital Multimeter", es: "Multímetro digital", zh: "数字万用表" },
  { fr: "Multimètre", en: "Multimeter", es: "Multímetro", zh: "万用表" },
  { fr: "Caméra thermique", en: "Thermal Camera", es: "Cámara termográfica", zh: "热成像仪" },
  { fr: "Disjoncteur", en: "Circuit Breaker", es: "Disyuntor", zh: "断路器" },
  { fr: "Variateur de fréquence", en: "Variable Frequency Drive (VFD)", es: "Variador de frecuencia", zh: "变频器" },
  { fr: "Moteur électrique", en: "Electric Motor", es: "Motor eléctrico", zh: "电动机" },
  { fr: "Moteur diesel", en: "Diesel Engine", es: "Motor diésel", zh: "柴油发动机" },
  { fr: "Moteur", en: "Motor / Engine", es: "Motor", zh: "电机/发动机" },
  { fr: "Nettoyeur haute pression", en: "High-Pressure Cleaner", es: "Hidrolimpiadora de alta presión", zh: "高压清洗机" },
  { fr: "Transpalette", en: "Pallet Jack / Truck", es: "Transpaleta", zh: "托盘搬运车" },
  { fr: "Palan électrique", en: "Electric Hoist", es: "Polipasto eléctrico", zh: "电动葫芦" },
  { fr: "Roulement à billes", en: "Ball Bearing", es: "Rodamiento de bolas", zh: "滚珠轴承" },
  { fr: "Roulement", en: "Bearing", es: "Rodamiento", zh: "轴承" },
  { fr: "Vérin pneumatique", en: "Pneumatic Cylinder", es: "Cilindro neumático", zh: "气缸" },
  { fr: "Vérin hydraulique", en: "Hydraulic Cylinder", es: "Cilindro hidráulico", zh: "液压缸" },
  { fr: "Harnais de sécurité", en: "Safety Harness", es: "Arnés de seguridad", zh: "安全带" },
  { fr: "Chaussures de sécurité", en: "Safety Shoes", es: "Calzado de seguridad", zh: "安全鞋" },
  { fr: "Casque de sécurité", en: "Safety Helmet", es: "Casco de seguridad", zh: "安全帽" },
  { fr: "Gants de protection", en: "Protective Gloves", es: "Guantes de protección", zh: "防护手套" },
  { fr: "Clé dynamométrique", en: "Torque Wrench", es: "Llave dinamométrica", zh: "扭矩扳手" },
  { fr: "Coffret à outils", en: "Tool Kit / Box", es: "Caja de herramientas", zh: "工具箱套件" },
  { fr: "Panneau solaire", en: "Solar Panel", es: "Panel solar", zh: "太阳能电池板" },
  { fr: "Onduleur", en: "Inverter", es: "Inversor", zh: "逆变器" },
  // Spec Keys & Values
  { fr: "État", en: "Condition", es: "Estado", zh: "设备状态" },
  { fr: "Neuf d'origine", en: "Brand New OEM", es: "Nuevo Original OEM", zh: "全新原装" },
  { fr: "Garantie", en: "Warranty", es: "Garantía", zh: "质保期" },
  { fr: "1 an garantie constructeur", en: "1-Year Manufacturer Warranty", es: "1 año de garantía del fabricante", zh: "1年原厂质保" },
  { fr: "2 ans garantie constructeur", en: "2-Year Manufacturer Warranty", es: "2 años de garantía del fabricante", zh: "2年原厂质保" },
  { fr: "1 an", en: "1 Year", es: "1 Año", zh: "1年" },
  { fr: "2 ans", en: "2 Years", es: "2 Años", zh: "2年" },
  { fr: "Certifications", en: "Certifications", es: "Certificaciones", zh: "认证标准" },
  { fr: "Norme CE / ISO", en: "CE / ISO Certified", es: "Norma CE / ISO", zh: "CE / ISO国际认证" },
  { fr: "Puissance", en: "Power", es: "Potencia", zh: "功率" },
  { fr: "Puissance nominale", en: "Rated Power", es: "Potencia nominal", zh: "额定功率" },
  { fr: "Puissance maximale", en: "Max Power", es: "Potencia máxima", zh: "最大功率" },
  { fr: "Tension", en: "Voltage", es: "Tensión / Voltaje", zh: "电压" },
  { fr: "Fréquence", en: "Frequency", es: "Frecuencia", zh: "频率" },
  { fr: "Poids", en: "Weight", es: "Peso", zh: "重量" },
  { fr: "Dimensions", en: "Dimensions", es: "Dimensiones", zh: "尺寸" },
  { fr: "Origine", en: "Origin", es: "Origen", zh: "产地" },
  { fr: "Pays d'origine", en: "Country of Origin", es: "País de origen", zh: "原产国" },
  { fr: "Marque", en: "Brand", es: "Marca", zh: "品牌" },
  { fr: "Modèle", en: "Model", es: "Modelo", zh: "型号" },
  { fr: "Type de moteur", en: "Engine / Motor Type", es: "Tipo de motor", zh: "发动机/电机类型" },
  { fr: "Type de motorisation", en: "Powertrain Type", es: "Tipo de motorización", zh: "动力类型" },
  { fr: "Carburant", en: "Fuel Type", es: "Combustible", zh: "燃料类型" },
  { fr: "Refroidissement", en: "Cooling System", es: "Refrigeración", zh: "冷却方式" },
  { fr: "Refroidissement par eau", en: "Water Cooled", es: "Refrigerado por agua", zh: "水冷" },
  { fr: "Refroidissement par air", en: "Air Cooled", es: "Refrigerado por aire", zh: "风冷" },
  { fr: "Niveau sonore", en: "Noise Level", es: "Nivel sonoro", zh: "噪音水平" },
  { fr: "Capacité réservoir", en: "Tank Capacity", es: "Capacidad del tanque", zh: "油箱容量" },
  { fr: "Autonomie", en: "Runtime / Autonomy", es: "Autonomía", zh: "续航时间" },
  { fr: "Débit", en: "Flow Rate", es: "Caudal", zh: "流量" },
  { fr: "Pression", en: "Pressure", es: "Presión", zh: "压力" },
  { fr: "Vitesse de rotation", en: "Rotation Speed", es: "Velocidad de rotación", zh: "转速" },
  { fr: "Indice de protection", en: "Ingress Protection (IP)", es: "Grado de protección", zh: "防护等级" },
  { fr: "Matériau", en: "Material", es: "Material", zh: "材质" },
  { fr: "Acier inoxydable", en: "Stainless Steel", es: "Acero inoxidable", zh: "不锈钢" },
  { fr: "Acier trempé", en: "Hardened Steel", es: "Acero templado", zh: "淬火钢" },
  { fr: "Cuivre pur", en: "100% Pure Copper", es: "Cobre puro", zh: "全铜电机" },
  { fr: "Chine", en: "China", es: "China", zh: "中国" },
  { fr: "Allemagne", en: "Germany", es: "Alemania", zh: "德国" },
  { fr: "France", en: "France", es: "Francia", zh: "法国" },
  { fr: "États-Unis", en: "United States", es: "Estados Unidos", zh: "美国" },
  { fr: "Japon", en: "Japan", es: "Japón", zh: "日本" },
  { fr: "Italie", en: "Italy", es: "Italia", zh: "意大利" },
  { fr: "Sénégal", en: "Senegal", es: "Senegal", zh: "塞内加尔" },
  { fr: "Dakar, Sénégal", en: "Dakar, Senegal", es: "Dakar, Senegal", zh: "塞内加尔达喀尔" },
  { fr: "Usage professionnel intensif", en: "Heavy-Duty Professional Use", es: "Uso profesional intensivo", zh: "重型工业级用途" },
  { fr: "Industriel", en: "Industrial", es: "Industrial", zh: "工业级" },
  { fr: "Professionnel", en: "Professional", es: "Profesional", zh: "专业级" },
  { fr: "Haute performance", en: "High Performance", es: "Alto rendimiento", zh: "高性能" },
  { fr: "Basse consommation", en: "Low Fuel Consumption", es: "Bajo consumo", zh: "低能耗" },
  { fr: "Catalogue MRO & Matériel Industriel", en: "MRO Catalog & Industrial Equipment", es: "Catálogo MRO y Equipos Industriales", zh: "MRO目录与工业设备" },
  { fr: "Sourcing direct certifié & Expédition Afrique de l'Ouest. Tarifs négociés nets HT fabricants.", en: "Certified direct sourcing & West Africa shipping. Negotiated manufacturer net prices.", es: "Sourcing directo certificado y envío a África Occidental. Tarifas netas de fábrica.", zh: "认证直采与西非货运，厂家直供净价。" },
  { fr: "Équipements Référencés", en: "Listed Equipment", es: "Equipos Referenciados", zh: "在册设备" },
  { fr: "MULTI-ORIGINE", en: "MULTI-ORIGIN", es: "MULTI-ORIGEN", zh: "多产地直供" },
  { fr: "Délais selon fournisseur", en: "Lead time per supplier", es: "Plazo selon proveedor", zh: "交期视供应商而定" },
  { fr: "Filtres Industriels", en: "Industrial Filters", es: "Filtros Industriales", zh: "工业筛选" },
  { fr: "Réinitialiser", en: "Reset", es: "Restablecer", zh: "重置" },
  { fr: "Rechercher une Référence", en: "Search by Reference", es: "Buscar Referencia", zh: "搜索型号/编号" },
  { fr: "Catégorie Générale", en: "General Category", es: "Categoría General", zh: "产品大类" },
  { fr: "Tous les matériels", en: "All Equipment", es: "Todos los equipos", zh: "全部设备" },
  { fr: "Sous-Catégorie", en: "Subcategory", es: "Subcategoría", zh: "子类别" },
  { fr: "Marque Constructeur", en: "Manufacturer Brand", es: "Marca Fabricante", zh: "制造商牌" },
  { fr: "Budget HT (FCFA)", en: "Budget Excl. Tax (FCFA)", es: "Presupuesto sin IVA (FCFA)", zh: "不含税预算 (FCFA)" },
  { fr: "Tous les prix", en: "All prices", es: "Todos los precios", zh: "全部价格" },
  { fr: "Moins de 50 000 FCFA", en: "Under 50,000 FCFA", es: "Menos de 50.000 FCFA", zh: "50,000 FCFA以下" },
  { fr: "50 000 à 150 000 FCFA", en: "50,000 to 150,000 FCFA", es: "50.000 a 150.000 FCFA", zh: "50,000至150,000 FCFA" },
  { fr: "Plus de 150 000 FCFA", en: "Over 150,000 FCFA", es: "Más de 150.000 FCFA", zh: "150,000 FCFA以上" },
  { fr: "Secteur Cible d'Usage", en: "Target Industry Sector", es: "Sector Industrial", zh: "应用行业" },
  { fr: "Filtres de Disponibilité", en: "Availability Filters", es: "Filtros de Disponibilidad", zh: "库存状态筛选" },
  { fr: "Tous les articles (Stock & Sourcing)", en: "All items (Stock & Sourcing)", es: "Todos los artículos (Stock y Sourcing)", zh: "全部商品（现货与定制采购）" },
  { fr: "Catalogue complet", en: "Full catalog", es: "Catálogo completo", zh: "完整目录" },
  { fr: "Disponible immédiatement", en: "Available immediately", es: "Disponible inmediatamente", zh: "现货即发" },
  { fr: "Stock Local", en: "Local Stock", es: "Stock Local", zh: "本地现货" },
  { fr: "Articles à sourcer", en: "Sourcing items", es: "Artículos bajo pedido", zh: "工厂直采商品" },
  { fr: "Sur commande", en: "On order", es: "Bajo pedido", zh: "按需订购" },
  { fr: "Tout le catalogue MRO", en: "Full MRO Catalog", es: "Todo el catálogo MRO", zh: "全部MRO目录" },
  { fr: "matériels trouvés", en: "items found", es: "equipos encontrados", zh: "件设备" },
  { fr: "Trier par : Pertinence", en: "Sort by: Relevance", es: "Ordenar por: Relevancia", zh: "排序：相关性" },
  { fr: "Prix : Croissant", en: "Price: Low to High", es: "Precio: Menor a Mayor", zh: "价格：从低到高" },
  { fr: "Prix : Décroissant", en: "Price: High to Low", es: "Precio: Mayor a Menor", zh: "价格：从高到低" },
  { fr: "Mieux notés", en: "Top Rated", es: "Mejor valorados", zh: "最高评分" },
  { fr: "▲ FERMER LES DÉTAILS & SPÉCIFICATIONS", en: "▲ HIDE DETAILS & SPECIFICATIONS", es: "▲ CERRAR DETALLES Y ESPECIFICACIONES", zh: "▲ 收起详情与技术参数" },
  { fr: "VOIR LES DÉTAILS & SPÉCIFICATIONS ›", en: "VIEW DETAILS & SPECIFICATIONS ›", es: "VER DETALLES Y ESPECIFICACIONES ›", zh: "查看详情与技术参数 ›" },
  { fr: "PRIX COMPTOIR PROFESSIONNEL", en: "PROFESSIONAL TRADE PRICE", es: "PRECIO PROFESIONAL", zh: "专业批发净价" },
  { fr: "Détails & Description du produit", en: "Product Details & Description", es: "Detalles y Descripción del Producto", zh: "产品详情与说明" },
  { fr: "Spécifications techniques", en: "Technical Specifications", es: "Especificaciones Técnicas", zh: "技术参数" },
  { fr: "Spécifications", en: "Specifications", es: "Especificaciones", zh: "技术规格" },
  { fr: "Données d'expédition", en: "Shipping Information", es: "Información de Envío", zh: "物流与运输信息" },
  { fr: "Mandat d'importation direct usine", en: "Direct factory import mandate", es: "Mandato de importación directa de fábrica", zh: "工厂直采进口委托" },
  { fr: "Prêt à livrer", en: "Ready to ship", es: "Listo para entregar", zh: "可立即发货" },
  { fr: "Options & Déclinaisons Disponibles :", en: "Available Options & Variants:", es: "Opciones y Variantes Disponibles:", zh: "可选规格与型号：" },
  { fr: "* Sélection obligatoire", en: "* Mandatory selection", es: "* Selección obligatoria", zh: "* 必选项" },
  { fr: "Fret Maritime Économique", en: "Economy Sea Freight", es: "Flete Marítimo Económico", zh: "经济海运" },
  { fr: "Fret Aérien Express", en: "Express Air Freight", es: "Flete Aéreo Exprés", zh: "特快空运" },
  { fr: "Livraison Locale Immédiate (Dakar & Régions)", en: "Immediate Local Delivery (Dakar & Regions)", es: "Entrega Local Inmediata (Dakar y Regiones)", zh: "本地极速配送（达喀尔及周边）" },
  { fr: "Articles similaires dans la catégorie", en: "Similar items in category", es: "Artículos similares en la categoría", zh: "同类别相似产品：" }
];

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  translateCategory: (catName: string) => string;
  translateText: (text: string) => string;
  translateSpecs: (specs: Record<string, string>) => Record<string, string>;
  translateProduct: <T extends Record<string, any>>(product: T) => T;
  translateDynamic: (frText: string, translations?: Partial<Record<Language, string>>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'fr',
  setLanguage: () => {},
  t: (key: string) => key,
  translateCategory: (catName: string) => catName,
  translateText: (text: string) => text,
  translateSpecs: (specs: Record<string, string>) => specs,
  translateProduct: <T extends Record<string, any>>(product: T): T => product,
  translateDynamic: (frText: string) => frText
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ze_app_language') as Language;
      if (['fr', 'en', 'es', 'zh'].includes(saved)) return saved;
    }
    return 'fr';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ze_app_language', lang);

      // Trigger Google Translate engine seamlessly
      try {
        const targetCode = lang === 'zh' ? 'zh-CN' : lang;
        if (lang === 'fr') {
          document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname + ';';
        } else {
          document.cookie = `googtrans=/fr/${targetCode}; path=/;`;
          document.cookie = `googtrans=/fr/${targetCode}; path=/; domain=${window.location.hostname};`;
        }

        const selectEl = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
        if (selectEl) {
          selectEl.value = targetCode;
          selectEl.dispatchEvent(new Event('change'));
        }
      } catch {
        // ignore
      }
    }
  };

  const t = (key: string): string => {
    const entry = DICTIONARY[key];
    if (!entry) {
      return key.replace(/_/g, ' ');
    }
    return entry[language] || entry.fr || key;
  };

  const translateCategory = (catName: string): string => {
    if (!catName) return '';
    const trimmed = catName.trim();
    const exact = CATEGORY_MAP[trimmed];
    if (exact && exact[language]) return exact[language];
    const lower = trimmed.toLowerCase();
    for (const [k, val] of Object.entries(CATEGORY_MAP)) {
      if (k.toLowerCase() === lower) {
        return val[language] || catName;
      }
    }
    return translateText(catName);
  };

  const translateText = (rawText: string): string => {
    if (!rawText || typeof rawText !== 'string') return rawText || '';
    if (language === 'fr') {
      return translateSpecValueToFrenchClient(rawText);
    }

    const normalizedFr = translateSpecValueToFrenchClient(rawText);
    const trimmed = normalizedFr.trim();
    // 1. Check exact category match first
    if (CATEGORY_MAP[trimmed]?.[language]) {
      return CATEGORY_MAP[trimmed][language];
    }

    // 2. Check exact or case-insensitive phrase match in INDUSTRIAL_TERMS
    const lower = trimmed.toLowerCase();
    for (const term of INDUSTRIAL_TERMS) {
      if (term.fr.toLowerCase() === lower) {
        return term[language];
      }
    }

    // 3. Multi-term replacement (sorted longest French phrase first so compound terms match before single words)
    let result = normalizedFr;
    const sortedTerms = [...INDUSTRIAL_TERMS].sort((a, b) => b.fr.length - a.fr.length);
    for (const term of sortedTerms) {
      if (term.fr.length < 3) continue;
      const escaped = term.fr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'gi');
      if (regex.test(result)) {
        result = result.replace(regex, term[language]);
      }
    }
    return result;
  };

  const translateSpecs = (specs: Record<string, string>): Record<string, string> => {
    if (!specs || typeof specs !== 'object') return specs || {};
    const frenchSpecs = translateSpecsRecordToFrench(specs);
    if (language === 'fr') return frenchSpecs;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(frenchSpecs)) {
      const tk = translateText(k);
      const tv = translateText(String(v));
      out[tk] = tv;
    }
    return out;
  };

  const translateProduct = <T extends Record<string, any>>(product: T): T => {
    if (!product) return product;
    const frenchSpecs = product.specs ? translateSpecsRecordToFrench(product.specs) : product.specs;
    const frenchName = smartTranslateProductTitleToFrench(product.name || '', product.brand || '');
    const frenchDesc = product.description
      ? smartTranslateProductDescriptionToFrench(product.description, frenchName, frenchSpecs)
      : product.description;

    if (language === 'fr') {
      return {
        ...product,
        name: frenchName || product.name,
        description: frenchDesc || product.description,
        origin: product.origin ? translateSpecValueToFrenchClient(product.origin) : product.origin,
        specs: frenchSpecs,
      };
    }

    const customTranslations = (product as any).translations?.[language];
    return {
      ...product,
      name: customTranslations?.name || translateText(frenchName || product.name || ''),
      description: customTranslations?.description || translateText(frenchDesc || product.description || ''),
      extendedDescription: customTranslations?.extendedDescription || (product.extendedDescription ? translateText(product.extendedDescription) : product.extendedDescription),
      category: product.category ? translateCategory(product.category) : product.category,
      subcategory: product.subcategory ? translateCategory(product.subcategory) : product.subcategory,
      sector: product.sector ? translateCategory(product.sector) : product.sector,
      origin: product.origin ? translateText(product.origin) : product.origin,
      warranty: product.warranty ? translateText(product.warranty) : product.warranty,
      leadTime: product.leadTime ? translateText(product.leadTime) : product.leadTime,
      specs: frenchSpecs ? translateSpecs(frenchSpecs) : product.specs,
    };
  };

  const translateDynamic = (frText: string, custom?: Partial<Record<Language, string>>): string => {
    if (language === 'fr') return frText;
    if (custom && custom[language]) return custom[language]!;
    return translateText(frText);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, translateCategory, translateText, translateSpecs, translateProduct, translateDynamic }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

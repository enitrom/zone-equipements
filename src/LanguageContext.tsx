import React, { createContext, useContext, useState, useEffect } from 'react';

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
    fr: "Rechercher par référence, marque, désignation ou modèle...",
    en: "Search by ref, brand, name or model...",
    es: "Buscar por ref, marca, nombre o modelo...",
    zh: "按货号、品牌、品名或型号搜索..."
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

  // Trust Badges (PHP Theme Inspired)
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

  // Logistics Section (from logistics.php)
  logistics_title: {
    fr: "Livraison Partout en Afrique",
    en: "Delivery Across Africa",
    es: "Entrega en Toda África",
    zh: "全非洲工程物流配送"
  },
  logistics_subtitle: {
    fr: "Nous livrons vos équipements industriels et pièces de maintenance dans plus de 50 pays du continent.",
    en: "We deliver your industrial equipment and maintenance parts to over 50 countries across the continent.",
    es: "Entregamos sus equipos industriales y repuestos en más de 50 países del continente.",
    zh: "我们为非洲50多个国家和地区提供工业设备与工程备件交付服务。"
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
    es: "Senegal, Costa de Marfil, Malí, Guinea, Burkina Faso...",
    zh: "塞内加尔、科特迪瓦、马里、几内亚、布基纳法索..."
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
    es: "Camerún, Gabón, Congo, RD Congo, Chad...",
    zh: "喀麦隆、加蓬、刚果（布）、刚果（金）、乍得..."
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
    es: "Marruecos, Argelia, Túnez, Mauritania...",
    zh: "摩洛哥、阿尔及利亚、突尼斯、毛里塔尼亚..."
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

  // Freight & Logistics Options (Client-Facing: STRICTLY NO AGENT CODE)
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
    fr: "Téléphone Joignable (Wave / OM) *",
    en: "Phone Number (Wave / OM) *",
    es: "Teléfono Móvil (Wave / OM) *",
    zh: "联系电话（支持Wave/OM）*"
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

  // Additional Cart & Checkout keys
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
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'fr',
  setLanguage: () => {},
  t: (key: string) => key
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
    }
  };

  const t = (key: string): string => {
    const entry = DICTIONARY[key];
    if (!entry) return key;
    return entry[language] || entry.fr || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

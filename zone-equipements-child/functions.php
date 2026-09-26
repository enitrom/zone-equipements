<?php
/**
 * ZONE EQUIPEMENTS Child Theme functions and definitions
 */

/**
 * Add WooCommerce support and general theme setup
 */
function zone_equipements_child_setup() {
    // Add support for block styles
    add_theme_support( 'wp-block-styles' );
    
    // Add support for full and wide alignment
    add_theme_support( 'align-wide' );

    // Add support for responsive embeds
    add_theme_support( 'responsive-embeds' );

    // Add support for editor styles
    add_editor_style( 'style.css' );

    // Add WooCommerce support
    add_theme_support( 'woocommerce' );
    add_theme_support( 'wc-product-gallery-zoom' );
    add_theme_support( 'wc-product-gallery-lightbox' );
    add_theme_support( 'wc-product-gallery-slider' );
}
add_action( 'after_setup_theme', 'zone_equipements_child_setup' );

function zone_equipements_child_enqueue_styles() {
    // 1. Enqueue Child Modular Assets linked to the main Astra stylesheet dependency ('astra-theme-css')
    wp_enqueue_style( 'ze-main', get_stylesheet_directory_uri() . '/assets/css/main.css', array( 'astra-theme-css' ) );
    wp_enqueue_style( 'ze-header', get_stylesheet_directory_uri() . '/assets/css/header.css', array( 'ze-main' ) );
    wp_enqueue_style( 'ze-products', get_stylesheet_directory_uri() . '/assets/css/products.css', array( 'ze-main' ) );
    wp_enqueue_style( 'ze-mobile', get_stylesheet_directory_uri() . '/assets/css/mobile.css', array( 'ze-main' ) );

    // 2. Main Child style.css (for theme headers and micro-adjustments)
    wp_enqueue_style( 'child-style', get_stylesheet_directory_uri() . '/style.css', array( 'ze-mobile' ), wp_get_theme()->get('Version') );

    // 3. Enqueue elegant custom scripts
    wp_enqueue_script( 'ze-shop-filter', get_stylesheet_directory_uri() . '/assets/js/shop-filter.js', array(), wp_get_theme()->get('Version'), true );

    // 4. Enqueue Elegant Industrial Google Fonts
    wp_enqueue_style( 'industrial-fonts', 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&family=Space+Grotesk:wght@500;700;800&display=swap', false );
}
add_action( 'wp_enqueue_scripts', 'zone_equipements_child_enqueue_styles', 15 );

/**
 * Global Product Real Brand Detector (Unified Helper)
 */
if ( ! function_exists( 'ze_get_product_real_brand' ) ) {
    function ze_get_product_real_brand($product_id, $product_title) {
        $taxonomies = array('product_brand', 'yith_product_brand', 'brand', 'pa_marque', 'pa_brand');
        foreach ($taxonomies as $tax) {
            if (taxonomy_exists($tax)) {
                $terms = get_the_terms($product_id, $tax);
                if (!empty($terms) && !is_wp_error($terms)) {
                    return strtoupper($terms[0]->name);
                }
            }
        }
        
        $title_upper = strtoupper($product_title);
        $brands_dict = array(
            'FLUKE' => 'FLUKE',
            'MAKITA' => 'MAKITA',
            '3M' => '3M',
            'CUBITRON' => '3M CUBITRON',
            'BOSCH' => 'BOSCH',
            'SCHNEIDER' => 'SCHNEIDER ELECTRIC',
            'LEGRAND' => 'LEGRAND',
            'GRUNDFOS' => 'GRUNDFOS',
            'FACOM' => 'FACOM',
            'STANLEY' => 'STANLEY',
            'DEWALT' => 'DEWALT',
            'FESTOOL' => 'FESTOOL',
            'MILWAUKEE' => 'MILWAUKEE',
            'KÄRCHER' => 'KÄRCHER',
            'KARCHER' => 'KÄRCHER',
            'SATA' => 'SATA',
            'LOCTITE' => 'LOCTITE',
            'WD-40' => 'WD-40',
            'WD40' => 'WD-40',
            'DUST' => 'DUST',
            'ABB' => 'ABB',
            'PNEUMAX' => 'PNEUMAX',
            'SMC' => 'SMC',
            'FESTO' => 'FESTO'
        );
        
        foreach ($brands_dict as $key => $brand_val) {
            if (strpos($title_upper, $key) !== false) {
                return $brand_val;
            }
        }
        
        $words = explode(' ', trim($product_title));
        if (!empty($words[0])) {
            $first_word = strtoupper($words[0]);
            if (in_array($first_word, array('GROUPE', 'DISQUE', 'KIT', 'JEU', 'COFFRET', 'EAU', 'POMPE', 'INTERRUPTEUR', 'CABLE', 'CÂBLE', 'APPAREIL', 'MULTIMÈTRE', 'MULTIMETRE', 'PINCE'))) {
                if (!empty($words[1])) {
                    return strtoupper($words[1]);
                }
            }
            return $first_word;
        }
        
        return 'CONSTRUCTEUR DIRECT';
    }
}

/**
 * Register custom block patterns for the industrial design
 */
function zone_equipements_child_register_patterns() {
    register_block_pattern_category(
        'zone-equipements',
        array( 'label' => __( 'ZONE EQUIPEMENTS', 'zone-equipements-child' ) )
    );
}
add_action( 'init', 'zone_equipements_child_register_patterns' );

/**
 * Get all 31 industrial MRO categories (Single Source of Truth)
 */
function ze_get_all_categories() {
    return array(
        array(
            "name" => "Abrasifs",
            "brands" => "3M, Norton",
            "desc" => "Disques de tronçonnage, de meulage, bandes et rouleaux abrasifs."
        ),
        array(
            "name" => "Adhésifs",
            "brands" => "Loctite, 3M, Gorilla",
            "desc" => "Colles industrielles, rubans techniques, étanchéité de filetages."
        ),
        array(
            "name" => "Batteries pour appareils électroménagers",
            "brands" => "Duracell, Panasonic, Varta",
            "desc" => "Batteries de rechange et piles spécifiques de précision d'atelier."
        ),
        array(
            "name" => "Produits de nettoyage",
            "brands" => "Kärcher, Nilfisk, Rubbermaid",
            "desc" => "Détergents d'usine, balayeuses, consommables de propreté."
        ),
        array(
            "name" => "Électricité",
            "brands" => "Schneider Electric, Legrand, ABB",
            "desc" => "Disjoncteurs, contacteurs, armoires et câblage industriel."
        ),
        array(
            "name" => "Fixations",
            "brands" => "Hilti, Würth, Fischer",
            "desc" => "Boulonnerie inox, tiges filetées, chevilles d'ancrage lourd."
        ),
        array(
            "name" => "Entretien de meubles",
            "brands" => "Pledge, Liberon, Rubid",
            "desc" => "Cires, huiles et produits de traitement de mobilier d'atelier."
        ),
        array(
            "name" => "Outillage à main",
            "brands" => "Facom, Stanley, Gedore",
            "desc" => "Clés de serrage, tournevis professionnels, pinces, servantes."
        ),
        array(
            "name" => "Quincaillerie",
            "brands" => "Yale, Master Lock, Abus",
            "desc" => "Verrous, cadenas de consignation, charnières de sécurité."
        ),
        array(
            "name" => "CVC",
            "brands" => "Carrier, Daikin, Clivet",
            "desc" => "Chauffage, ventilation, filtres à air, climatiseurs d'atelier."
        ),
        array(
            "name" => "Hydraulique",
            "brands" => "Parker, Bosch Rexroth, Eaton",
            "desc" => "Flexibles HP armés, raccords directionnels, vannes de force."
        ),
        array(
            "name" => "Fournitures de laboratoire",
            "brands" => "Thermo Fisher, VWR, Merck",
            "desc" => "Verrerie d'analyse, réactifs de précision, consommables."
        ),
        array(
            "name" => "Éclairage",
            "brands" => "Philips, Osram, Sylvania",
            "desc" => "Réflecteurs LED, projecteurs de chantier et éclairage ATEX."
        ),
        array(
            "name" => "Lubrification",
            "brands" => "Mobil, Shell, Castrol",
            "desc" => "Huiles hydrauliques synthétiques, graisses de paliers pros."
        ),
        array(
            "name" => "Usinage",
            "brands" => "Sandvik, Kennametal, Mitutoyo",
            "desc" => "Plaquettes carbure, outils coupants industriels d'alésage."
        ),
        array(
            "name" => "Manutention",
            "brands" => "Jungheinrich, Toyota, Pramac",
            "desc" => "Transpalettes électriques, élingues, cordages et pesage de quai."
        ),
        array(
            "name" => "Moteurs",
            "brands" => "Siemens, ABB, Leroy Somer",
            "desc" => "Moteurs asynchrones triphasés, variateurs haute fréquence."
        ),
        array(
            "name" => "Fournitures de bureau",
            "brands" => "Staples, Bic, Rexel",
            "desc" => "Papier technique d'atelier, cartouches, archivage d'usine."
        ),
        array(
            "name" => "Équipement d'extérieur",
            "brands" => "Stihl, Husqvarna",
            "desc" => "Tondeuses industrielles, débroussailleuses et élagueuses."
        ),
        array(
            "name" => "Fournitures de peinture",
            "brands" => "Sherwin-Williams, PPG, Hempel",
            "desc" => "Peintures époxy anticorrosion, traceurs de sécurité."
        ),
        array(
            "name" => "Plomberie",
            "brands" => "Grohe, Geberit, Kohler",
            "desc" => "Drains industriels, robinets automatiques, raccords cuivre."
        ),
        array(
            "name" => "Pneumatique",
            "brands" => "Festo, SMC, Norgren",
            "desc" => "Vérins rapides, blocs distributeurs FRL, compresseurs."
        ),
        array(
            "name" => "Outillage électrique",
            "brands" => "Makita, Bosch, DeWalt",
            "desc" => "Meuleuses de forte puissance, perforateurs SDS max."
        ),
        array(
            "name" => "Transmission de puissance",
            "brands" => "SKF, Timken, Gates",
            "desc" => "Roulements, courroies trapézoïdales, paliers SKF."
        ),
        array(
            "name" => "Pompes",
            "brands" => "Grundfos, Wilo, KSB",
            "desc" => "Pompes submersibles d'exhaure, circulateurs de process."
        ),
        array(
            "name" => "Mantières premières", // Corrected typo in user source if appropriate, or kept aligned
            "name" => "Matières premières",
            "brands" => "ArcelorMittal, Alcoa",
            "desc" => "Plaques d'inox, barres d'aluminium, caoutchouc de glisse."
        ),
        array(
            "name" => "Ouvrages de référence",
            "brands" => "ASTM, ISO",
            "desc" => "Codes ASME de chaudières, normes ISO internationales."
        ),
        array(
            "name" => "Sécurité",
            "brands" => "Honeywell, Delta Plus, UVEX",
            "desc" => "Harnais de chute, combinaisons thermiques retardatrices."
        ),
        array(
            "name" => "Instruments de mesure",
            "brands" => "Fluke, Mitutoyo, Testo",
            "desc" => "Multimètres TRMS, pieds à coulisse, caméras infrarouge."
        ),
        array(
            "name" => "Entretien des véhicules",
            "brands" => "Bosch automotive, Castrol, Valeo",
            "desc" => "Filtres d'huile d'origine, bougies et relais automobiles."
        ),
        array(
            "name" => "Soudage",
            "brands" => "Lincoln Electric, ESAB, Fronius",
            "desc" => "Postes triphasés MMA / TIG, baguettes rutiles de force."
        )
    );
}

/**
 * Get highly polished matching SVG icons for MRO Categories
 */
function ze_get_category_icon_svg($category_name, $width = 14, $height = 14, $class_name = 'ze-cat-icon') {
    $svgs = array(
        "Abrasifs" => '<circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle>',
        "Adhésifs" => '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path>',
        "Batteries pour appareils électroménagers" => '<rect x="1" y="6" width="18" height="12" rx="2" ry="2"></rect><line x1="23" y1="11" x2="23" y2="13"></line>',
        "Produits de nettoyage" => '<path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.3-6.3l-.7.7M6.7 17.3l-.7.7m12.6 0l-.7-.7M6.7 6.7l-.7-.7"></path>',
        "Électricité" => '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>',
        "Fixations" => '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>',
        "Entretien de meubles" => '<path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3M3 11v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5M5 18v3M19 18v3M12 9h.01"></path>',
        "Outillage à main" => '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>',
        "Quincaillerie" => '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>',
        "CVC" => '<path d="M12.8 19.6a4.5 4.5 0 1 0-4.4-5.3H18M11.8 4.4a4.5 4.5 0 1 1-3.6 7.2H20M5.5 12h11.5"></path>',
        "Hydraulique" => '<path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.09 3 12.25c0 2.22 1.8 4.05 4 4.05zM17 18.25c1.65 0 3-1.37 3-3.04 0-.87-.43-1.7-1.29-2.39s-1.71-1.7-1.92-2.79c-.21 1.09-.85 2.13-1.71 2.82s-1.08 1.52-1.08 2.39c0 1.67 1.35 3.04 3 3.04z"></path>',
        "Fournitures de laboratoire" => '<path d="M4.5 3h15M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3M6 14h12M12 3v11"></path>',
        "Éclairage" => '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .1 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5M9 18h6M10 22h4"></path>',
        "Lubrification" => '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>',
        "Usinage" => '<rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3"></path>',
        "Manutention" => '<rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle>',
        "Moteurs" => '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>',
        "Fournitures de bureau" => '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect>',
        "Équipement d'extérieur" => '<path d="M10 22v-3.5m4 3.5v-3M7 11h10M4 15h16M12 2l-7 9h14z"></path>',
        "Fournitures de peinture" => '<path d="M12 22V13M16 6a4 4 0 0 0-8 0v7h8V6zM6 13h12"></path>',
        "Plomberie" => '<path d="M2 6c.6.5 1.2 1 2.5 1s1.9-.5 2.5-1c.6-.5 1.2-1 2.5-1s1.9.5 2.5 1c.6.5 1.2 1 2.5 1s1.9-.5 2.5-1c.6-.5 1.2-1 2.5-1s1.9.5 2.5 1M2 12c.6.5 1.2 1 2.5 1s1.9-.5 2.5-1c.6-.5 1.2-1 2.5-1s1.9.5 2.5 1c.6.5 1.2 1 2.5 1s1.9-.5 2.5-1c.6-.5 1.2-1 2.5-1s1.9.5 2.5 1M2 18c.6.5 1.2 1 2.5 1s1.9-.5 2.5-1c.6-.5 1.2-1 2.5-1s1.9.5 2.5 1c.6.5 1.2 1 2.5 1s1.9-.5 2.5-1c.6-.5 1.2-1 2.5-1s1.9.5 2.5 1"></path>',
        "Pneumatique" => '<path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2M20 12H2"></path>',
        "Outillage électrique" => '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>',
        "Transmission de puissance" => '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>',
        "Pompes" => '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0zM12 12V3"></path>',
        "Matières premières" => '<polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline>',
        "Ouvrages de référence" => '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5v-15A2.5 2.5 0 0 1 4 19.5z"></path>',
        "Sécurité" => '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>',
        "Instruments de mesure" => '<path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z"></path><path d="M12 12M12 7v5L16 14"></path>',
        "Entretien des véhicules" => '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 1 12v4c0 .6.4 1 1 1h2"></path><circle cx="7" cy="17" r="2"></circle><circle cx="17" cy="17" r="2"></circle>',
        "Soudage" => '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>'
    );

    $paths = isset($svgs[$category_name]) ? $svgs[$category_name] : '<circle cx="12" cy="12" r="10"></circle>';
    return sprintf(
        '<svg viewBox="0 0 24 24" width="%d" height="%d" stroke="currentColor" stroke-width="2.5" fill="none" class="%s">%s</svg>',
        $width,
        $height,
        esc_attr($class_name),
        $paths
    );
}

/**
 * Get all 33 high-trust industrial MRO brands (Single Source of Truth)
 */
function ze_get_trust_brands() {
    return array(
        array("name" => "MAKITA", "sub" => "Outillage Pro", "icon" => "Zap"),
        array("name" => "BOSCH", "sub" => "Électroportatif", "icon" => "Zap"),
        array("name" => "SIEMENS", "sub" => "Automatisme & Énergie", "icon" => "Cpu"),
        array("name" => "3M", "sub" => "Fournitures & Sécurité", "icon" => "Shield"),
        array("name" => "FLUKE", "sub" => "Instrumentation", "icon" => "Gauge"),
        array("name" => "SKF", "sub" => "Roulements & Transmission", "icon" => "Settings"),
        array("name" => "SCHNEIDER", "sub" => "Distribution Électrique", "icon" => "Cpu"),
        array("name" => "ABB", "sub" => "Moteurs & Robotique", "icon" => "Cpu"),
        array("name" => "HILTI", "sub" => "Ancre & Forage", "icon" => "Hammer"),
        array("name" => "CATERPILLAR", "sub" => "Pièces Moteur", "icon" => "Wrench"),
        array("name" => "LOCTITE", "sub" => "Fixation & Adhésifs", "icon" => "StickyNote"),
        array("name" => "FACOM", "sub" => "Outillage de Précision", "icon" => "Wrench"),
        array("name" => "LEGRAND", "sub" => "Appareillage Industriel", "icon" => "Box"),
        array("name" => "SMC", "sub" => "Automatisation Pneumatique", "icon" => "Wind"),
        array("name" => "GRUNDFOS", "sub" => "Pompes Hydrauliques", "icon" => "Waves"),
        array("name" => "DEWALT", "sub" => "Outillage Pro", "icon" => "Zap"),
        array("name" => "MILWAUKEE", "sub" => "Électroportatif Fort", "icon" => "Zap"),
        array("name" => "KÄRCHER", "sub" => "Nettoyage Pro", "icon" => "Sparkles"),
        array("name" => "SANDVIK", "sub" => "Outils de Coupe", "icon" => "Wrench"),
        array("name" => "PARKER", "sub" => "Hydraulique HP", "icon" => "Droplets"),
        array("name" => "EATON", "sub" => "Gestion Énergie", "icon" => "Cpu"),
        array("name" => "WILO", "sub" => "Pompes de Transfert", "icon" => "Waves"),
        array("name" => "FESTO", "sub" => "Pneumatique", "icon" => "Wind"),
        array("name" => "TIMKEN", "sub" => "Billes & Transmission", "icon" => "Settings"),
        array("name" => "BOSCH REXROTH", "sub" => "Hydraulique Connectée", "icon" => "Activity"),
        array("name" => "THERMO FISHER", "sub" => "Mesure de Labo", "icon" => "Gauge"),
        array("name" => "OSRAM", "sub" => "Éclairage ATEX", "icon" => "Lightbulb"),
        array("name" => "PHILIPS", "sub" => "Lampes & Lanternes", "icon" => "Lightbulb"),
        array("name" => "CASTROL", "sub" => "Huiles & Graisses", "icon" => "Droplet"),
        array("name" => "BOSCH AUTO", "sub" => "Pièces de Rechange", "icon" => "Settings"),
        array("name" => "STANLEY", "sub" => "Outils Manuels", "icon" => "Wrench"),
        array("name" => "RIDGID", "sub" => "Outillage de Plomberie", "icon" => "Wrench"),
        array("name" => "METABO", "sub" => "Matériel d'Atelier", "icon" => "Zap")
    );
}

/**
 * Get matching SVG icon for high-trust brand Categories/vibe
 */
function ze_get_brand_icon_svg($icon_name, $width = 20, $height = 20, $class_name = 'ze-brand-icon-svg') {
    $svgs = array(
        "Zap" => '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>',
        "Cpu" => '<rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3"></path>',
        "Shield" => '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>',
        "Gauge" => '<path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z"></path><path d="M12 12M12 7v5L16 14"></path>',
        "Settings" => '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>',
        "Hammer" => '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>',
        "Wrench" => '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>',
        "StickyNote" => '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path>',
        "Box" => '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>',
        "Wind" => '<path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2M20 12H2"></path>',
        "Waves" => '<path d="M2 6c.6.5 1.2 1 2.5 1s1.9-.5 2.5-1c.6-.5 1.2-1 2.5-1s1.9.5 2.5 1c.6.5 1.2 1 2.5 1s1.9-.5 2.5-1c.6-.5 1.2-1 2.5-1s1.9.5 2.5 1M2 12c.6.5 1.2 1 2.5 1s1.9-.5 2.5-1c.6-.5 1.2-1 2.5-1s1.9.5 2.5 1c.6.5 1.2 1 2.5 1s1.9-.5 2.5-1c.6-.5 1.2-1 2.5-1s1.9.5 2.5 1M2 18c.6.5 1.2 1 2.5 1s1.9-.5 2.5-1c.6-.5 1.2-1 2.5-1s1.9.5 2.5 1c.6.5 1.2 1 2.5 1s1.9-.5 2.5-1c.6-.5 1.2-1 2.5-1s1.9.5 2.5 1"></path>',
        "Sparkles" => '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.937A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z"></path>',
        "Droplets" => '<path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.09 3 12.25c0 2.22 1.8 4.05 4 4.05zM17 18.25c1.65 0 3-1.37 3-3.04 0-.87-.43-1.7-1.29-2.39s-1.71-1.7-1.92-2.79c-.21 1.09-.85 2.13-1.71 2.82s-1.08 1.52-1.08 2.39c0 1.67 1.35 3.04 3 3.04z"></path>',
        "Lightbulb" => '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .1 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5M9 18h6M10 22h4"></path>',
        "Droplet" => '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>',
        "Activity" => '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>'
    );
    
    $paths = isset($svgs[$icon_name]) ? $svgs[$icon_name] : '<circle cx="12" cy="12" r="10"></circle>';
    return sprintf(
        '<svg viewBox="0 0 24 24" width="%d" height="%d" stroke="currentColor" stroke-width="2.5" fill="none" class="%s">%s</svg>',
        $width,
        $height,
        esc_attr($class_name),
        $paths
    );
}

/**
 * Dynamic resolver for MRO categories.
 * Merges the 31 classic static MRO categories with any categories newly added in WooCommerce (taxonomy 'product_cat').
 */
function ze_get_all_dynamic_categories() {
    $static_cats = ze_get_all_categories();
    $all_cats = array();
    
    // Index by uppercase name for exact de-duplication
    foreach ($static_cats as $cat) {
        $key = strtoupper($cat["name"]);
        $all_cats[$key] = $cat;
    }
    
    // Query actual WooCommerce terms dynamically if available
    if ( function_exists( 'get_terms' ) && function_exists( 'taxonomy_exists' ) ) {
        if ( taxonomy_exists( 'product_cat' ) ) {
            $terms = get_terms( array(
                'taxonomy'   => 'product_cat',
                'hide_empty' => false,
            ) );
            
            if ( ! is_wp_error( $terms ) && ! empty( $terms ) ) {
                foreach ( $terms as $term ) {
                    $name = $term->name;
                    
                    // Skip WooCommerce default uncategorized
                    if ( in_array( strtolower($name), array('uncategorized', 'non classé', 'sans catégorie') ) ) {
                        continue;
                    }
                    
                    $key = strtoupper($name);
                    if ( ! isset( $all_cats[$key] ) ) {
                        $all_cats[$key] = array(
                            "name" => $name,
                            "brands" => __( "Marques d'origine", "zone-equipements-child" ),
                            "desc" => $term->description ? $term->description : __( "Équipements et fournitures de qualité professionnelle pour vos lignes.", "zone-equipements-child" )
                        );
                    }
                }
            }
        }
    }
    
    return array_values($all_cats);
}

/**
 * Dynamic resolver for MRO brands.
 * Merges the classic static high-trust MRO brands with brand taxonomies & attribute terms newly added in WooCommerce.
 */
function ze_get_all_dynamic_brands() {
    $static_brands = ze_get_trust_brands();
    $all_brands = array();
    
    // Index by uppercase name for exact de-duplication
    foreach ($static_brands as $brand) {
        $key = strtoupper($brand["name"]);
        $all_brands[$key] = $brand;
    }
    
    // Check various common WooCommerce brand taxonomies and product attribute taxonomies
    if ( function_exists( 'get_terms' ) && function_exists( 'taxonomy_exists' ) ) {
        $taxonomies_to_check = array(
            'product_brand', // Standard brands plugins
            'pwb-brand',     // Perfect WooCommerce Brands
            'brand',         // Custom brand taxonomy
            'yith_product_brand', // YITH
            'pa_brand',      // Global brand attributes
            'pa_marque',     // Global brand attributes French
            'pa_brands',
            'pa_manufacturer'
        );
        
        foreach ( $taxonomies_to_check as $tax ) {
            if ( taxonomy_exists( $tax ) ) {
                $terms = get_terms( array(
                    'taxonomy'   => $tax,
                    'hide_empty' => false,
                ) );
                
                if ( ! is_wp_error( $terms ) && ! empty( $terms ) ) {
                    foreach ( $terms as $term ) {
                        $name = $term->name;
                        $key = strtoupper($name);
                        if ( ! isset( $all_brands[$key] ) ) {
                            $all_brands[$key] = array(
                                "name" => $name,
                                "sub"  => __( "Équipement Pro", "zone-equipements-child" ),
                                "icon" => "Settings" // Default generic gear icon
                            );
                        }
                    }
                }
            }
        }
    }
    
    return array_values($all_brands);
}

/**
 * Dynamically resolves category name to WooCommerce category URL or shop-fallback.
 */
function ze_get_category_link($category_name) {
    if ( function_exists( 'taxonomy_exists' ) && taxonomy_exists( 'product_cat' ) ) {
        $term = get_term_by( 'name', $category_name, 'product_cat' );
        if ( $term && ! is_wp_error( $term ) ) {
            return get_term_link( $term );
        }
    }
    return add_query_arg( 'category', $category_name, get_permalink( wc_get_page_id( 'shop' ) ) );
}

/**
 * Get category product count matching WooCommerce database or accurate MRO fallbacks.
 */
function ze_get_category_product_count($cat_name) {
    if ( function_exists( 'get_term_by' ) ) {
        $term = get_term_by( 'name', $cat_name, 'product_cat' );
        if ( $term && isset($term->count) ) {
            return $term->count;
        }
    }
    
    // Fallback static indicators for pristine styling in preview
    $counts = array(
        "Abrasifs" => 1,
        "Outillage à main" => 1,
        "Hydraulique" => 1,
        "Moteurs" => 1,
        "Pneumatique" => 1,
        "Outillage électrique" => 1,
        "Transmission de puissance" => 1,
        "Sécurité" => 1,
        "Instruments de mesure" => 1,
        "Soudage" => 1
    );
    $key = strtolower($cat_name);
    foreach ($counts as $k => $v) {
        if (strtolower($k) === $key) {
            return $v;
        }
    }
    return 0;
}

/**
 * Get subcategories under current WooCommerce parent category or pristine MRO static defaults.
 */
function ze_get_current_category_subcategories($cat_name) {
    if (empty($cat_name)) {
        return array();
    }
    
    $subcats = array();
    
    if ( function_exists( 'get_term_by' ) && function_exists( 'get_terms' ) ) {
        $parent_term = get_term_by( 'name', $cat_name, 'product_cat' );
        if ( $parent_term && ! is_wp_error( $parent_term ) ) {
            $terms = get_terms( array(
                'taxonomy'   => 'product_cat',
                'parent'     => $parent_term->term_id,
                'hide_empty' => false,
            ) );
            if ( ! is_wp_error( $terms ) && ! empty( $terms ) ) {
                foreach ($terms as $term) {
                    $subcats[] = array(
                        "name" => $term->name,
                        "link" => get_term_link( $term ),
                        "count" => $term->count
                    );
                }
            }
        }
    }
    
    if (empty($subcats)) {
        $static_subs = array(
            "Abrasifs" => array(
                array("name" => "Abrasifs de ponçage", "count" => 0),
                array("name" => "Abrasifs de tronçonnage et meulage", "count" => 1),
                array("name" => "Brosses abrasives", "count" => 0),
                array("name" => "Sablage abrasif", "count" => 0),
                array("name" => "Ébavurage", "count" => 0),
                array("name" => "Affûtage", "count" => 0),
                array("name" => "Polissage et lustrage", "count" => 0),
                array("name" => "Finition par vibration", "count" => 0),
                array("name" => "Accessoires pour abrasifs", "count" => 0)
            ),
            "Équipement d'extérieur" => array(
                array("name" => "Tondeuses et faucheuses de force", "count" => 0),
                array("name" => "Débroussailleuses et taille-haies", "count" => 0),
                array("name" => "Tronçonneuses d'élagage thermiques", "count" => 0),
                array("name" => "Outils à main d'extérieur", "count" => 0)
            )
        );
        
        $key = str_replace(array('é','è','à'), array('e','e','a'), strtolower($cat_name));
        foreach ($static_subs as $origin_cat => $subs) {
            $origin_key = str_replace(array('é','è','à'), array('e','e','a'), strtolower($origin_cat));
            if (strcasecmp($key, $origin_key) === 0) {
                foreach ($subs as $s) {
                    $subcats[] = array(
                        "name" => $s["name"],
                        "link" => "#",
                        "count" => $s["count"]
                    );
                }
                break;
            }
        }
    }
    return $subcats;
}

/**
 * Custom WooCommerce dynamic MRO categories and Brand Filter Sidebar shortcode.
 * Integrates directly with WooCommerce Product archives and matches Grainger/Raptor style.
 */
function ze_render_sidebar_filters() {
    $categories = ze_get_all_dynamic_categories();
    $brands = ze_get_all_dynamic_brands();
    
    // Get current category term if we are on a category page
    $current_cat_name = '';
    if ( is_product_category() ) {
        $queried_object = get_queried_object();
        $current_cat_name = $queried_object->name;
    }
    
    ob_start();
    ?>
    <div class="ze-woo-sidebar-filters">
        <!-- 1. FILTRES INDUSTRIELS Title Header -->
        <div class="ze-filter-main-header">
            <span class="ze-filter-main-title">
                <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2.5" fill="none" class="ze-funnel-icon"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                FILTRES INDUSTRIELS
            </span>
            <a href="<?php echo esc_url( get_permalink( wc_get_page_id( 'shop' ) ) ); ?>" class="ze-filter-reset-link" id="zeResetFiltersBtn">
                RÉINITIALISER
            </a>
        </div>
        
        <!-- 2. RECHERCHER UNE RÉFÉRENCE -->
        <div class="ze-filter-sidebar-box">
            <h4 class="ze-filter-box-label">RECHERCHER UNE RÉFÉRENCE</h4>
            <div class="ze-sidebar-search-outer">
                <input type="text" id="zeRefSearch" class="ze-sidebar-search" placeholder="Ex: Fluke, DHP481Z..." aria-label="Rechercher une référence" />
                <span class="ze-search-input-action-icon">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </span>
            </div>
        </div>

        <!-- 3. CATÉGORIE GÉNÉRALE -->
        <div class="ze-filter-sidebar-box">
            <div class="ze-filter-title-row ze-filter-collapsible-header" data-target="category">
                <h4 class="ze-filter-box-label">CATÉGORIE GÉNÉRALE</h4>
                <span class="ze-filter-chevron">
                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="3" fill="none"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </span>
            </div>
            
            <div class="ze-filter-collapse-content" id="zeCategoryCollapse">
                <div class="ze-filter-list ze-scrollbox" id="zeCategoryList">
                    <a href="<?php echo esc_url( get_permalink( wc_get_page_id( 'shop' ) ) ); ?>" class="ze-filter-item <?php echo empty($current_cat_name) ? 'active' : ''; ?>">
                        <span class="ze-cat-icon-wrapper">
                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.2" fill="none" class="ze-cat-icon"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
                        </span>
                        <span class="ze-cat-name-span">Tous les matériels</span>
                    </a>
                    
                    <?php foreach ($categories as $cat): 
                        $is_active = (strcasecmp($current_cat_name, $cat['name']) === 0);
                        $link = ze_get_category_link($cat['name']);
                        if (strcasecmp($cat['name'], 'Sans catégorie') === 0 || strcasecmp($cat['name'], 'Non classé') === 0) continue;
                    ?>
                        <a href="<?php echo esc_url($link); ?>" class="ze-filter-item <?php echo $is_active ? 'active' : ''; ?>">
                            <span class="ze-cat-icon-wrapper">
                                <?php echo ze_get_category_icon_svg($cat['name'], 14, 14, 'ze-cat-icon'); ?>
                            </span>
                            <span class="ze-cat-name-span"><?php echo esc_html($cat['name']); ?></span>
                        </a>
                    <?php endforeach; ?>
                </div>
            </div>
        </div>

        <!-- 4. SOUS-CATÉGORIE (Only shown if a category is active) -->
        <?php 
        $subcats = ze_get_current_category_subcategories($current_cat_name);
        if (!empty($subcats)): 
        ?>
            <div class="ze-filter-sidebar-box ze-subcategory-filter-box">
                <h4 class="ze-filter-box-inner-title">SOUS-CATÉGORIE</h4>
                <div class="ze-subcategory-list select-none">
                    <a href="#" class="ze-subcat-item ze-subcat-item-all active">• Tout <?php echo esc_html($current_cat_name); ?></a>
                    <?php foreach ($subcats as $sc): ?>
                        <a href="<?php echo esc_url($sc['link']); ?>" class="ze-subcat-item">• <?php echo esc_html($sc['name']); ?></a>
                    <?php endforeach; ?>
                </div>
            </div>
        <?php endif; ?>

        <!-- 5. MARQUE CONSTRUCTEUR -->
        <div class="ze-filter-sidebar-box">
            <div class="ze-filter-title-row ze-filter-collapsible-header" data-target="brands">
                <h4 class="ze-filter-box-label">MARQUE CONSTRUCTEUR</h4>
                <span class="ze-filter-chevron">
                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="3" fill="none"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </span>
            </div>
            
            <div class="ze-filter-collapse-content" id="zeBrandsCollapse">
                <div class="ze-sidebar-search-outer" style="margin-bottom: 12px; margin-top: 6px;">
                    <input type="text" id="zeBrandSearch" class="ze-sidebar-search" placeholder="Rechercher une marque..." aria-label="Rechercher une marque" />
                    <span class="ze-search-input-action-icon">
                        <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </span>
                </div>
                
                <div class="ze-filter-brand-container">
                    <div class="ze-filter-brand-grid ze-scrollbox" id="zeBrandList">
                        <?php foreach ($brands as $index => $br): 
                            if ($index >= 12) {
                                $collapse_class = 'ze-brand-collapsed hidden';
                            } else {
                                $collapse_class = '';
                            }
                        ?>
                            <label class="ze-brand-label <?php echo $collapse_class; ?>">
                                <input type="checkbox" class="ze-brand-cb" value="<?php echo esc_attr($br['name']); ?>" />
                                <span class="ze-brand-name"><?php echo esc_html($br['name']); ?></span>
                            </label>
                        <?php endforeach; ?>
                    </div>
                    <?php if (count($brands) > 12): ?>
                        <button type="button" class="ze-show-more-brands-btn" id="zeShowMoreBrandsBtn">
                            + Voir toutes les marques (<?php echo count($brands); ?>)
                        </button>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <!-- 6. BUDGET HT (FCFA) -->
        <div class="ze-filter-sidebar-box">
            <div class="ze-filter-title-row ze-filter-collapsible-header" data-target="budget">
                <h4 class="ze-filter-box-label">BUDGET HT (FCFA)</h4>
                <span class="ze-filter-chevron">
                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="3" fill="none"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </span>
            </div>
            
            <div class="ze-filter-collapse-content" id="zeBudgetCollapse">
                <div class="ze-budget-radio-list" style="margin-top: 6px;">
                    <label class="ze-budget-radio-item">
                        <input type="radio" name="ze_budget_ht" class="ze-budget-rb" value="all" checked />
                        <span class="ze-custom-radio-label-text">Tous les prix</span>
                    </label>
                    <label class="ze-budget-radio-item">
                        <input type="radio" name="ze_budget_ht" class="ze-budget-rb" value="under_50k" />
                        <span class="ze-custom-radio-label-text">Moins de 50 000 FCFA</span>
                    </label>
                    <label class="ze-budget-radio-item">
                        <input type="radio" name="ze_budget_ht" class="ze-budget-rb" value="50k_150k" />
                        <span class="ze-custom-radio-label-text">50 000 à 150 000 FCFA</span>
                    </label>
                    <label class="ze-budget-radio-item">
                        <input type="radio" name="ze_budget_ht" class="ze-budget-rb" value="over_150k" />
                        <span class="ze-custom-radio-label-text">Plus de 150 000 FCFA</span>
                    </label>
                </div>
            </div>
        </div>

        <!-- 7. SECTEUR CIBLE D'USAGE -->
        <div class="ze-filter-sidebar-box">
            <div class="ze-filter-title-row ze-filter-collapsible-header" data-target="sector">
                <h4 class="ze-filter-box-label">SECTEUR CIBLE D'USAGE</h4>
                <span class="ze-filter-chevron">
                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="3" fill="none"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </span>
            </div>
            
            <div class="ze-filter-collapse-content" id="zeSectorCollapse">
                <div class="ze-sector-checkbox-list" style="margin-top: 6px;">
                    <label class="ze-sector-cb-item">
                        <input type="checkbox" class="ze-sector-cb" value="BTP" />
                        <span class="ze-custom-cb-label-text">BTP & Génie Civil</span>
                    </label>
                    <label class="ze-sector-cb-item">
                        <input type="checkbox" class="ze-sector-cb" value="Mines" />
                        <span class="ze-custom-cb-label-text">Mines & Carrières</span>
                    </label>
                    <label class="ze-sector-cb-item">
                        <input type="checkbox" class="ze-sector-cb" value="Énergie" />
                        <span class="ze-custom-cb-label-text">Énergie & Électricité</span>
                    </label>
                    <label class="ze-sector-cb-item">
                        <input type="checkbox" class="ze-sector-cb" value="Agriculture" />
                        <span class="ze-custom-cb-label-text">Agriculture & Élevage</span>
                    </label>
                    <label class="ze-sector-cb-item">
                        <input type="checkbox" class="ze-sector-cb" value="Manufacture" />
                        <span class="ze-custom-cb-label-text">Manufacture & Assemblage</span>
                    </label>
                </div>
            </div>
        </div>

        <!-- 8. STOCK DIRECT TOGGLE -->
        <div class="ze-filter-sidebar-box ze-stock-direct-box">
            <label class="ze-stock-toggle-label">
                <input type="checkbox" class="ze-stock-cb" id="zeLocalStockCb" checked />
                <div class="ze-stock-lbl-text-col">
                    <span class="ze-stock-bold-title">✓ Stock Localement Transit</span>
                    <span class="ze-stock-sub-desc">Expédié de suite sous 24 heures</span>
                </div>
            </label>
        </div>
        
        <!-- Sourcing Quick card -->
        <div class="ze-rfq-sidebar-card">
            <h4>Sourcing d'Urgence</h4>
            <p>Vous ne trouvez pas votre référence ou besoin d'une commande volumineuse ?</p>
            <a href="mailto:contact@zoneequipements.com?subject=Demande de Devis d'Équipements MRO" class="ze-rfq-sidebar-btn">
                Obtenir un Devis en 24h
            </a>
            <div class="ze-rfq-phone">📞 Contact direct : +33 1 84 60 92 12</div>
        </div>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('ze_sidebar_filters', 'ze_render_sidebar_filters');

/**
 * Custom WooCommerce dynamic single product technical specifications, 
 * professional trust badges, and interactive quote/RFQ constructor.
 */
function ze_render_single_product_extensions() {
    global $product;
    if ( ! $product ) {
        return '';
    }
    
    $product_id = $product->get_id();
    $name = $product->get_name();
    $sku = $product->get_sku() ? $product->get_sku() : 'ZE-' . str_pad($product_id, 6, '0', STR_PAD_LEFT);
    
    // Resolve Brand using our global unified brand helper
    $detected_brand = ze_get_product_real_brand($product_id, $name);
    
    // Dynamic specifications list according to real products/categories
    $all_specs = array();
    $cats_list = array();
    $terms = get_the_terms($product_id, 'product_cat');
    if ( ! empty($terms) && ! is_wp_error($terms) ) {
        foreach ($terms as $term) {
            if ( ! in_array(strtolower($term->name), array('uncategorized', 'non classé', 'sans catégorie')) ) {
                $cats_list[] = strtoupper($term->name);
            }
        }
    }
    $breadcrumb_path = implode(' › ', $cats_list);
    $main_cat = !empty($cats_list[0]) ? $cats_list[0] : '';

    if (strpos(strtoupper($name), 'CUBITRON') !== false || strpos(strtoupper($main_cat), 'ABRASIF') !== false) {
        $all_specs = array(
            'Diamètre extérieur' => '125 mm',
            'Épaisseur du disque' => '1.0 mm (Ultra-Fin)',
            'Alésage de montage' => '22.23 mm',
            'Type de grain' => 'Grains de Céramique profilés PSG',
            'Vitesse circonférentielle max' => '80 m/s',
            'Vitesse de rotation max' => '12250 Tr/min',
            'Matières d\'application' => 'Inox, Aciers doux carbonés, Alliages',
            'Structure interne' => 'Double armature en fibre de verre tissée'
        );
    } elseif (strpos(strtoupper($name), 'MAKITA') !== false || strpos(strtoupper($main_cat), 'OUTILLAGE') !== false) {
        $all_specs = array(
            'Tension nominale' => '18 V LXT',
            'Couple extrême' => '135 Nm',
            'Vitesse à vide' => '0 - 2100 tr/min',
            'Type de moteur' => 'Brushless pro sans charbon',
            'Poids net avec batterie' => '2.6 kg',
            'Cadence de frappe' => '0 - 31500 cp/min',
            'Capacité de perçage béton' => '16 mm',
            'Mandrin autoserrant métallique' => '13 mm'
        );
    } elseif (strpos(strtoupper($main_cat), 'ÉLECTRICITÉ') !== false || strpos(strtoupper($main_cat), 'ELECTRICITE') !== false) {
        $all_specs = array(
            'Calibre nominal' => '16A / 32A',
            'Pouvoir de coupure' => '10 kA (En 60898-1)',
            'Nombre de pôles' => 'Tripolaire (3P)',
            'Classe de protection' => 'IP20 encastré',
            'Tension d\'isolement' => '500 V',
            'Endurance électrique' => '20 000 cycles',
            'Section de raccordement' => 'Jusqu\'à 25 mm²',
            'Type de raccordement' => 'Bornes à cages inviolables'
        );
    } elseif (strpos(strtoupper($main_cat), 'INSTRUMENTS') !== false) {
        $all_specs = array(
            'Catégorie de mesure' => 'CAT III 1000V / CAT IV 600V',
            'Résistance Max' => '40 MΩ',
            'Précision de base' => '± 0.09% TRMS',
            'Affichage' => 'LCD rétroéclairé haute visibilité',
            'Autonomie batterie' => 'Plus de 400 heures',
            'Résistance aux chocs' => 'Chute de 2 mètres testée',
            'Classement IP' => 'IP67 étanche poussière/eau',
            'Garantie constructeur' => 'Garantie à vie Fluke standard'
        );
    } else {
        // MRO fallback
        $origin_map = array(
            'FLUKE' => 'USA',
            'MAKITA' => 'JAPON',
            '3M' => 'USA',
            'CUBITRON' => 'USA',
            'BOSCH' => 'ALLEMAGNE',
            'SCHNEIDER' => 'FRANCE',
            'LEGRAND' => 'FRANCE',
            'GRUNDFOS' => 'DANEMARK',
            'FACOM' => 'FRANCE',
            'STANLEY' => 'USA',
            'DEWALT' => 'USA',
            'FESTOOL' => 'ALLEMAGNE',
            'MILWAUKEE' => 'USA',
            'KÄRCHER' => 'ALLEMAGNE',
            'PNEUMAX' => 'ITALIE',
            'SMC' => 'JAPON',
            'FESTO' => 'ALLEMAGNE',
            'ABB' => 'SUISSE'
        );
        $detected_origin = isset($origin_map[$detected_brand]) ? $origin_map[$detected_brand] : 'EUROPE';

        $all_specs = array(
            'Marque constructrice' => $detected_brand,
            'Logistique & Transit' => 'Acheminement express international',
            'Origine d\'importation' => $detected_origin,
            'Emballage produit' => 'Boîte d\'origine neuve et intacte',
            'Certification' => 'Origine OEM certifiée disponible',
            'Garantie d\'importateur' => '12 mois de garantie constructeur'
        );
    }
    
    ob_start();
    ?>
    <div class="ze-single-product-expert-addons">
        <!-- 1. Technical Badges Box -->
        <div class="ze-badges-grid">
            <div class="ze-badge-card">
                <span class="ze-badge-icon">🚚</span>
                <div>
                    <strong>Transit Direct Afrique</strong>
                    <span>Douane + logistique aérienne &amp; maritime maîtrisées</span>
                </div>
            </div>
            <div class="ze-badge-card">
                <span class="ze-badge-icon">📜</span>
                <div>
                    <strong>Origine OEM Garantie</strong>
                    <span>Aucune contrefaçon, certificats de conformité fournis</span>
                </div>
            </div>
            <div class="ze-badge-card">
                <span class="ze-badge-icon">⏱️</span>
                <div>
                    <strong>Chiffrage Express &lt; 24h</strong>
                    <span>Ingénieurs d'application de permanence pour l'Afrique</span>
                </div>
            </div>
        </div>

        <!-- 2. Dual-Tab Specifications and Shipping Information Panel (RaptorSupplies Style) -->
        <div class="ze-specs-shipping-tabs-container" style="background: #ffffff !important; border: 1px solid #e2e8f0 !important; border-radius: 8px !important; margin-top: 30px !important; margin-bottom: 30px !important; overflow: hidden !important;">
            <div class="ze-tabs-nav-bar" style="display: flex !important; align-items: center !important; gap: 14px !important; border-bottom: 1px solid #e2e8f0 !important; padding: 15px 25px !important; background: #fafafa !important;">
                <button type="button" class="ze-spec-tab-btn active" onclick="switchZeTab(event, 'ze-tab-specs')" style="border: none !important; background: transparent !important; font-size: 0.95rem !important; font-weight: 850 !important; color: #001f3f !important; border-bottom: 2px solid #001f3f !important; padding-bottom: 2px !important; cursor: pointer !important; text-transform: uppercase !important; letter-spacing: 0.02em !important;">
                    Spécifications
                </button>
                <span class="ze-spec-tab-separator" style="color: #cbd5e1 !important; font-size: 1rem !important; font-weight: 300 !important;">|</span>
                <button type="button" class="ze-spec-tab-btn" onclick="switchZeTab(event, 'ze-tab-shipping')" style="border: none !important; background: transparent !important; font-size: 0.95rem !important; font-weight: 500 !important; color: #64748b !important; padding-bottom: 2px !important; cursor: pointer !important; text-transform: uppercase !important; letter-spacing: 0.02em !important;">
                    Données d'expédition (Shipping)
                </button>
            </div>

            <!-- TAB 1 CONTENT: Specifications -->
            <div id="ze-tab-specs" class="ze-tab-content-pane" style="display: flex !important; flex-wrap: wrap !important; padding: 15px !important; width: 100% !important; box-sizing: border-box !important;">
                <?php
                // Generate technical specs array dynamically from WooCommerce properties
                $tech_specs = array(
                    'Désignation' => $name,
                    'Code Article (SKU)' => $sku,
                    'Constructeur d\'Origine' => $detected_brand,
                    'Catégorie de Matériel' => !empty($main_cat) ? $main_cat : 'Équipement Pro MRO',
                    'Statut d\'Import' => 'Produit d\'Origine Garanti (OEM)',
                    'Conditionnement' => 'Unité Industrielle standard (Box)',
                    'Classe de Conformité' => 'Conforme aux normes d\'usine CE / ISO',
                    'Garantie Produit' => '12 mois de garantie constructeur d\'usine'
                );

                // Add in any registered admin attributes dynamically if they exist:
                if ( function_exists( 'wc_display_product_attributes' ) && $product ) {
                    $item_attributes = $product->get_attributes();
                    foreach ( $item_attributes as $attr_slug => $attribute ) {
                        $attr_name = wc_attribute_label( $attr_slug, $product );
                        $tech_specs[$attr_name] = $product->get_attribute( $attr_slug );
                    }
                }

                // Split into two parallel groups for high-contrast Raptorsupplies double list
                $chunks = array_chunk($tech_specs, ceil(count($tech_specs) / 2), true);
                $left_col_specs = isset($chunks[0]) ? $chunks[0] : array();
                $right_col_specs = isset($chunks[1]) ? $chunks[1] : array();
                ?>
                <div style="display: flex !important; flex-wrap: wrap !important; width: 100% !important; box-sizing: border-box !important;">
                    <!-- Left Column (50%) -->
                    <div style="flex: 1 1 300px !important; display: flex !important; flex-direction: column !important; border-right: 1px solid #f1f5f9 !important; box-sizing: border-box !important;">
                        <?php $idx = 0; foreach ($left_col_specs as $key => $val): if (empty($val)) continue; $bg = ($idx++ % 2 === 0) ? '#f8fafc' : '#ffffff'; ?>
                            <div class="ze-spec-row-flex" style="display: flex !important; justify-content: space-between !important; padding: 10px 15px !important; background: <?php echo esc_attr($bg); ?> !important; border-bottom: 1px solid #f1f5f9 !important; font-size: 0.8rem !important; box-sizing: border-box !important; align-items: start !important; text-align: left !important;">
                                <strong style="color: #0f172a !important; font-weight: 700 !important; width: 45% !important;"><?php echo esc_html($key); ?></strong>
                                <span style="color: #475569 !important; width: 55% !important; font-family: monospace !important; font-weight: 600 !important; word-break: break-all !important;"><?php echo esc_html($val); ?></span>
                            </div>
                        <?php endforeach; ?>
                    </div>
                    <!-- Right Column (50%) -->
                    <div style="flex: 1 1 300px !important; display: flex !important; flex-direction: column !important; box-sizing: border-box !important;">
                        <?php $idx = 0; foreach ($right_col_specs as $key => $val): if (empty($val)) continue; $bg = ($idx++ % 2 === 0) ? '#f8fafc' : '#ffffff'; ?>
                            <div class="ze-spec-row-flex" style="display: flex !important; justify-content: space-between !important; padding: 10px 15px !important; background: <?php echo esc_attr($bg); ?> !important; border-bottom: 1px solid #f1f5f9 !important; font-size: 0.8rem !important; box-sizing: border-box !important; align-items: start !important; text-align: left !important;">
                                <strong style="color: #0f172a !important; font-weight: 700 !important; width: 45% !important;"><?php echo esc_html($key); ?></strong>
                                <span style="color: #475569 !important; width: 55% !important; font-family: monospace !important; font-weight: 600 !important; word-break: break-all !important;"><?php echo esc_html($val); ?></span>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>

            <!-- TAB 2 CONTENT: Shipping Information -->
            <div id="ze-tab-shipping" class="ze-tab-content-pane" style="display: none !important; flex-wrap: wrap !important; padding: 15px !important; width: 100% !important; box-sizing: border-box !important;">
                <?php
                // Fetch real measurements from WooCommerce with physical fallbacks
                $weight = $product->get_weight() ? $product->get_weight() . ' kg' : '0.054 kg';
                $length = $product->get_length() ? $product->get_length() . ' cm' : '13.97 cm';
                $width  = $product->get_width() ? $product->get_width() . ' cm' : '10.16 cm';
                $height = $product->get_height() ? $product->get_height() . ' cm' : '3.81 cm';
                
                $shipping_specs = array(
                    'Hauteur (Height cm)' => $height,
                    'Longueur (Length cm)' => $length,
                    'Largeur (Width cm)' => $width,
                    'Code Douanier (HS Code)' => '8536200040',
                    'Pays de Sourcing' => isset($detected_origin) ? $detected_origin : 'EUROPE',
                    'Poids Net Brut (Weight kg)' => $weight
                );

                $split_shipping = array_chunk($shipping_specs, 3, true);
                $left_ship = isset($split_shipping[0]) ? $split_shipping[0] : array();
                $right_ship = isset($split_shipping[1]) ? $split_shipping[1] : array();
                ?>
                <div style="display: flex !important; flex-wrap: wrap !important; width: 100% !important; box-sizing: border-box !important;">
                    <!-- Left Shipping Column -->
                    <div style="flex: 1 1 300px !important; display: flex !important; flex-direction: column !important; border-right: 1px solid #f1f5f9 !important; box-sizing: border-box !important;">
                        <?php $idx = 0; foreach ($left_ship as $key => $val): $bg = ($idx++ % 2 === 0) ? '#f8fafc' : '#ffffff'; ?>
                            <div class="ze-spec-row-flex" style="display: flex !important; justify-content: space-between !important; padding: 10px 15px !important; background: <?php echo esc_attr($bg); ?> !important; border-bottom: 1px solid #f1f5f9 !important; font-size: 0.8rem !important; box-sizing: border-box !important; align-items: start !important; text-align: left !important;">
                                <strong style="color: #0f172a !important; font-weight: 700 !important; width: 45% !important;"><?php echo esc_html($key); ?></strong>
                                <span style="color: #475569 !important; width: 55% !important; font-family: monospace !important; font-weight: 600 !important;"><?php echo esc_html($val); ?></span>
                            </div>
                        <?php endforeach; ?>
                    </div>
                    <!-- Right Shipping Column -->
                    <div style="flex: 1 1 300px !important; display: flex !important; flex-direction: column !important; box-sizing: border-box !important;">
                        <?php $idx = 0; foreach ($right_ship as $key => $val): $bg = ($idx++ % 2 === 0) ? '#f8fafc' : '#ffffff'; ?>
                            <div class="ze-spec-row-flex" style="display: flex !important; justify-content: space-between !important; padding: 10px 15px !important; background: <?php echo esc_attr($bg); ?> !important; border-bottom: 1px solid #f1f5f9 !important; font-size: 0.8rem !important; box-sizing: border-box !important; align-items: start !important; text-align: left !important;">
                                <strong style="color: #0f172a !important; font-weight: 700 !important; width: 45% !important;"><?php echo esc_html($key); ?></strong>
                                <span style="color: #475569 !important; width: 55% !important; font-family: monospace !important; font-weight: 600 !important;"><?php echo esc_html($val); ?></span>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>
        </div>

        <script>
        function switchZeTab(evt, tabId) {
            evt.preventDefault();
            // Hide all tab components
            document.querySelectorAll('.ze-tab-content-pane').forEach(el => {
                el.style.setProperty('display', 'none', 'important');
            });
            // Remove active state from headers
            document.querySelectorAll('.ze-spec-tab-btn').forEach(btn => {
                btn.classList.remove('active');
                btn.style.setProperty('font-weight', '500', 'important');
                btn.style.setProperty('color', '#64748b', 'important');
                btn.style.setProperty('border-bottom', 'none', 'important');
            });
            
            // Show current tab pane
            document.getElementById(tabId).style.setProperty('display', 'flex', 'important');
            
            // Add active state
            evt.currentTarget.classList.add('active');
            evt.currentTarget.style.setProperty('font-weight', '850', 'important');
            evt.currentTarget.style.setProperty('color', '#001f3f', 'important');
            evt.currentTarget.style.setProperty('border-bottom', '2px solid #001f3f', 'important');
        }
        </script>

        <!-- 3. Devis / Quote instant generator form -->
        <div class="ze-rfq-builder-container" id="rfqContainer">
            <div class="ze-rfq-builder-header">
                <h4>📋 Chiffrage Express &amp; Commande de Volume</h4>
                <p>Négociez vos remises d'entreprises et frais d'acheminement portuaire/aéroportuaire.</p>
            </div>
            
            <form id="zeRfqForm" class="ze-rfq-submit-form" onsubmit="event.preventDefault(); submitWooRFQ();">
                <div class="ze-rfq-input-row" style="display: flex; gap: 12px; margin-bottom: 12px;">
                    <input type="text" id="rfq_name" placeholder="Nom complet / Entreprise *" style="flex: 1; padding: 10px; border: 1px solid var(--ze-border); border-radius: 4px;" required />
                    <input type="email" id="rfq_email" placeholder="Adresse Email pro *" style="flex: 1; padding: 10px; border: 1px solid var(--ze-border); border-radius: 4px;" required />
                </div>
                <div class="ze-rfq-input-row" style="display: flex; gap: 12px; margin-bottom: 12px;">
                    <input type="tel" id="rfq_phone" placeholder="Téléphone / WhatsApp *" style="flex: 1; padding: 10px; border: 1px solid var(--ze-border); border-radius: 4px;" required />
                    <input type="number" id="rfq_qty" value="1" min="1" style="width: 100px; padding: 10px; border: 1px solid var(--ze-border); border-radius: 4px;" required />
                </div>
                <textarea id="rfq_notes" placeholder="Spécifications de livraison ou liste d'autres pièces MRO à ajouter au contenant..." style="margin-top: 10px; width: 100%; height: 60px; padding: 10px; border: 1px solid var(--ze-border); border-radius: 4px; box-sizing: border-box;"></textarea>
                
                <button type="submit" class="ze-rfq-btn-primary" style="margin-top: 12px; width: 100%; border-radius: 6px; background: var(--ze-secondary, #ff6600) !important; color: #fff !important; border: none; padding: 14px; font-weight: bold; cursor: pointer;">
                    ⚡ Générer ma Demande de Devis Officielle (PDF)
                </button>
            </form>

            <div id="rfqSuccessBox" class="ze-rfq-success-box" style="display:none; margin-top:15px; background: #e6f9ed; border:1px solid #137333; padding:15px; border-radius:8px; color: #137333;">
                <h5 style="margin-top:0; color:#137333; font-weight:800; font-size: 16px;">✓ Votre Demande de Devis est éditée !</h5>
                <p style="font-size:13px; margin: 4px 0 10px 0;">Référence : <strong id="rfqRefId"></strong>. Un pré-chiffrage d'ingénieur a été planifié pour s'accorder avec vos grilles d'achats.</p>
                <button type="button" class="ze-download-btn-mini" onclick="downloadWooPDF();" style="background:#137333; color:#fff; border:none; padding:10px 16px; border-radius:4px; font-weight:bold; cursor:pointer; font-size:13px; width: 100%;">
                    📥 Télécharger la Proforma Provisoire (.PDF)
                </button>
            </div>
        </div>
    </div>

    <script>
    let currentRfqData = null;

    function submitWooRFQ() {
        const name = document.getElementById('rfq_name').value;
        const email = document.getElementById('rfq_email').value;
        const phone = document.getElementById('rfq_phone').value;
        const qty = document.getElementById('rfq_qty').value;
        const notes = document.getElementById('rfq_notes').value;
        
        const ref = "DEVIS-WOO-" + Math.floor(100000 + Math.random() * 900000);
        document.getElementById('rfqRefId').innerText = ref;
        
        currentRfqData = {
            ref: ref,
            name: name,
            email: email,
            phone: phone,
            qty: qty,
            notes: notes,
            productName: <?php echo json_encode($name); ?>,
            productSku: <?php echo json_encode($sku); ?>,
            productBrand: <?php echo json_encode($detected_brand); ?>
        };

        // Transition views
        document.getElementById('zeRfqForm').style.display = 'none';
        document.getElementById('rfqSuccessBox').style.display = 'block';
    }

    function downloadWooPDF() {
        if (!currentRfqData) return;
        
        // Generate simulated dynamic industrial text file format representing our proforma quote
        const docText = `
==================================================
        ZONE EQUIPEMENTS INDUSTRIELS (MRO)
        DEMANDE DE COTATION OFFICIELLE & SOURCING
==================================================
Date: ${new Date().toLocaleDateString('fr-FR')}
Référence Client: ${currentRfqData.ref}
Statut: Chiffrage prioritaire (Afrique Ingress)

COORDONNÉES DE L'INGÉNIEUR / ENTREPRISE ACHETEUSE:
--------------------------------------------------
Nom complet  : ${currentRfqData.name}
Email        : ${currentRfqData.email}
Téléphone    : ${currentRfqData.phone}

ARTICLE SÉLECTIONNÉ:
--------------------------------------------------
Désignation: ${currentRfqData.productName}
Réf SKU    : ${currentRfqData.productSku}
Marque     : ${currentRfqData.productBrand}
Quantité   : ${currentRfqData.qty} unité(s)

NOTES ET DIRECTIVES DU PROJET:
--------------------------------------------------
${currentRfqData.notes || 'Aucune consigne logistique spécifique.'}

--------------------------------------------------
Notre équipe logistique et commerciale traite votre demande.
Un inspecteur MRO va prendre contact avec vous sous 24h
pour coordorner les chargements d'armateur.
Email: contact@zoneequipements.com
WhatsApp Direct: +33 1 84 60 92 12
==================================================
        `;

        const blob = new Blob([docText], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Proforma-Pre-Chiffrage-${currentRfqData.ref}.txt`;
        link.click();
    }
    </script>
    <?php
    return ob_get_clean();
}
add_shortcode('ze_single_product_extensions', 'ze_render_single_product_extensions');

/**
 * Hook custom layouts directly into standard WooCommerce classic live page rendering
 */

// Since we override the WooCommerce templates directly (via /woocommerce/archive-product.php and archive-product.php),
// we don't need hooked main content wrappers as the markup is natively present.

// 1. Inject the single product expert specifications, trust badges, and interactive RFQ form into single product layouts
add_action('woocommerce_single_product_summary', 'ze_add_product_expert_addons_to_summary', 35);
function ze_add_product_expert_addons_to_summary() {
    echo do_shortcode('[ze_single_product_extensions]');
}







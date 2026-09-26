<?php
/**
 * Custom WooCommerce Content Product Template Override (Root level)
 * Styled as a premium McMaster/Grainger B2B widescreen rectangular sourcing card.
 */

defined( 'ABSPATH' ) || exit;

global $product;

// Check visibility.
if ( empty( $product ) || ! $product->is_visible() ) {
	return;
}

$product_id = $product->get_id();
$name = $product->get_name();
$sku = $product->get_sku() ? $product->get_sku() : 'ZE-' . str_pad($product_id, 6, '0', STR_PAD_LEFT);
$permalink = get_permalink($product_id);

// 1. Resolve Category Breadcrumbs
$cats_list = array();
$terms = get_the_terms($product_id, 'product_cat');
if ( ! empty($terms) && ! is_wp_error($terms) ) {
    foreach ($terms as $term) {
        if ( ! in_array(strtolower($term->name), array('uncategorized', 'non classé', 'sans catégorie')) ) {
            $cats_list[] = strtoupper($term->name);
        }
    }
}
if (empty($cats_list)) {
    $cats_list[] = 'BOUTIQUE MRO';
}
$breadcrumb_path = implode(' › ', $cats_list);

// 2. Resolve Brand
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
$detected_brand = ze_get_product_real_brand($product_id, $name);

// 3. Resolve Image fallback with stunning high-fidelity industrial graphics
$image_id = $product->get_image_id();
if ( $image_id ) {
    $image_url = wp_get_attachment_image_url( $image_id, 'large' );
} else {
    // Elegant high-fidelity industrial image fallbacks by Category (No forest / flower placeholder stuff)
    $image_url = 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=400'; // Default clean MRO line
    $main_cat = !empty($cats_list[0]) ? $cats_list[0] : '';
    
    $fallbacks = array(
        'ABRASIFS' => 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&q=80&w=400',
        'ADHÉSIFS' => 'https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&q=80&w=400',
        'ÉLECTRICITÉ' => 'https://images.unsplash.com/photo-1498084393753-b411b2d26b34?auto=format&fit=crop&q=80&w=400',
        'OUTILLAGE À MAIN' => 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=400',
        'FIXATIONS' => 'https://images.unsplash.com/photo-1610992015762-43d99434852e?auto=format&fit=crop&q=80&w=400',
        'HYDRAULIQUE' => 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&q=80&w=400',
        'PNEUMATIQUE' => 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=400',
        'INSTRUMENTS DE MESURE' => 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&q=80&w=400',
        'MOTEURS' => 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=400',
        'OUTILLAGE ÉLECTRIQUE' => 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&q=80&w=400'
    );
    
    foreach ($fallbacks as $key => $url) {
        if (strpos(strtoupper($main_cat), $key) !== false || strpos(strtoupper($breadcrumb_path), $key) !== false) {
            $image_url = $url;
            break;
        }
    }
}

// 4. Pricing / Calculation
$price_html = $product->get_price_html();
$raw_price = $product->get_price();
if (empty($raw_price)) {
    $raw_price = 15000; // Realistic MRO standard fallback pricing
}
$price_ht = number_format($raw_price, 0, '.', ' ');
$price_ttc = number_format($raw_price * 1.18, 0, '.', ' '); // 18% standard West African VAT

// 5. Dynamic Sourcing Specs Grid (Matches the third screenshot)
$specs = array();
$all_specs = array();
$main_cat = !empty($cats_list[0]) ? $cats_list[0] : '';
if (strpos(strtoupper($name), 'CUBITRON') !== false || strpos(strtoupper($main_cat), 'ABRASIF') !== false) {
    $specs = array(
        'DIAMÈTRE EXTÉRIEUR' => '125 mm',
        'ÉPAISSEUR DU DISQUE' => '1.0 mm (Ultra-Fin)',
        'ALÉSAGE DE MONTAGE' => '22.23 mm',
        'TYPE DE GRAIN' => 'Grains de Céramique PSG'
    );
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
    $specs = array(
        'TENSION NOMINALE' => '18 V LXT',
        'COUPLE EXTRÊME' => '135 Nm',
        'VITESSE À VIDE' => '0 - 2100 tr/min',
        'TYPE DE MOTEUR' => 'Brushless pro'
    );
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
    $specs = array(
        'CALIBRE NOMINAL' => '16A / 32A',
        'POUVOIR DE COUPURE' => '10 kA (En 60898-1)',
        'NOMBRE DE PÔLES' => 'Tripolaire (3P)',
        'CLASSE DE PROTECTION' => 'IP20 encastré'
    );
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
    $specs = array(
        'CATÉGORIE DE MESURE' => 'CAT III 1000V / CAT IV 600V',
        'RÉSISTANCE MAX' => '40 MΩ',
        'PRÉCISION DE BASE' => '± 0.09% TRMS',
        'AFFICHAGE' => 'LCD rétroéclairé'
    );
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
    // Elegant standard Real-Brand MRO specification fallback
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
        'KÄRCHER' => 'ALLEMAGNE'
    );
    $detected_origin = isset($origin_map[$detected_brand]) ? $origin_map[$detected_brand] : 'EUROPE';

    $specs = array(
        'CONSTRUCTEUR CERTIFIÉ' => $detected_brand,
        'EXPÉDITION LOGISTIQUE' => 'Sourcing direct sous 24h',
        'ORIGINE DU TRANSACT' => $detected_origin
    );
    $all_specs = array(
        'Marque constructrice' => $detected_brand,
        'Logistique & Transit' => 'Acheminement express international',
        'Origine d\'importation' => $detected_origin,
        'Emballage produit' => 'Boîte d\'origine neuve et intacte',
        'Certification' => 'Origine OEM certifiée disponible',
        'Garantie d\'importateur' => '12 mois de garantie constructeur'
    );
}

// 6. Action buttons
$add_to_cart_url = $product->add_to_cart_url();
$is_purchasable = $product->is_purchasable() && $product->is_in_stock();

?>
<li <?php wc_product_class( 'ze-product-row-card', $product ); ?>>
    
    <!-- Left Column: Product Image/Showcase (25%) -->
    <div class="ze-row-image-col">
        <div class="ze-row-brand-badge"><?php echo esc_html($detected_brand); ?></div>
        <div class="ze-row-img-box">
            <a href="<?php echo esc_url($permalink); ?>">
                <img src="<?php echo esc_url($image_url); ?>" alt="<?php echo esc_attr($name); ?>" class="ze-row-product-img" />
            </a>
        </div>
        <div class="ze-row-trust-indicators">
            <span>🛡️ Origine OEM</span>
            <span>✈️ Logistics Direct</span>
        </div>
    </div>

    <!-- Middle Column: Product Specifications & Details (50%) -->
    <div class="ze-row-info-col">
        <div class="ze-row-breadcrumb"><?php echo esc_html($breadcrumb_path); ?></div>
        
        <!-- Real Brand Identifier (Removed orange block, keeping clean display) -->
        <h3 class="ze-row-title">
            <a href="<?php echo esc_url($permalink); ?>"><?php echo esc_html($name); ?></a>
        </h3>

        <!-- Excerpt snippet -->
        <div class="ze-row-excerpt" style="margin-bottom: 15px !important; font-size: 0.82rem !important; color: #475569 !important; line-height: 1.5 !important;">
            <?php echo wp_strip_all_tags(get_the_excerpt()); ?>
        </div>

        <!-- Full specs toggle link -->
        <a href="#" class="ze-row-spec-toggle-link" data-toggled="false">
            ⚡ VOIR TOUTES LES SPÉCIFICATIONS TECHNIQUE ›
        </a>
    </div>

    <!-- Right Column: B2B Pricing & Sourcing Controls (25%) -->
    <div class="ze-row-actions-col">
        <div class="ze-row-price-lbl">PRIX COMPTOIR PROFESSIONNEL</div>
        <div class="ze-row-price-box">
            <span class="ze-row-price-main"><?php echo esc_html($price_ht); ?> <span class="ze-row-currency">FCFA NET HT</span></span>
            <span class="ze-row-price-sub"><?php echo esc_html($price_ttc); ?> FCFA TTC</span>
        </div>

        <div class="ze-row-packing-info">
            <div>Quantité : <strong>Conforme Lot OEM</strong></div>
            <div>Commande min. : <strong>1 pack</strong></div>
        </div>

        <!-- Action Links -->
        <div class="ze-row-action-btn-group">
            <?php if ($is_purchasable): ?>
                <a href="<?php echo esc_url($add_to_cart_url); ?>" data-quantity="1" class="ze-row-btn-primary button product_type_simple add_to_cart_button ajax_add_to_cart" data-product_id="<?php echo esc_attr($product_id); ?>" data-product_sku="<?php echo esc_attr($sku); ?>" aria-label="Ajouter au Panier">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" class="m-0"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                    AJOUTER AU PANIER
                </a>
            <?php else: ?>
                <a href="<?php echo esc_url($permalink); ?>" class="ze-row-btn-primary button">
                    S'APPROVISIONNER
                </a>
            <?php endif; ?>

            <a href="<?php echo esc_url($permalink); ?>#rfqContainer" class="ze-row-btn-secondary">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" class="m-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                DEMANDE PROFORMA
            </a>
        </div>

        <!-- WhatsApp messaging -->
        <div class="ze-row-whatsapp-sourcing">
            <a href="https://wa.me/33184609212?text=Bonjour,%20je%20souhaite%20commander%20la%20ref%20<?php echo urlencode($sku); ?>%20(<?php echo urlencode($name); ?>)" target="_blank" rel="noreferrer">
                <span class="ze-whatsapp-dot-glow"></span>
                <span>Sourcing WhatsApp Direct</span>
            </a>
        </div>
    </div>

    <!-- Widescreen expandable details drawer (slide-out curtain) -->
    <div class="ze-row-expanded-specs-drawer" style="display: none; width: 100%;">
        <div class="ze-drawer-inner" style="background: #fafafa !important; border: 1px solid #e2e8f0 !important; border-radius: 8px !important; padding: 25px !important; margin-top: 15px !important; box-sizing: border-box !important; text-align: left !important;">
            <h4 class="ze-drawer-main-title" style="font-size: 0.88rem !important; font-weight: 850 !important; color: #001f3f !important; border-bottom: 1px solid #e2e8f0 !important; padding-bottom: 10px !important; margin-bottom: 15px !important; margin-top: 0 !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; display: flex !important; align-items: center !important; gap: 8px !important;">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" style="color: #001f3f !important;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                DÉTAILS &amp; DESCRIPTION DU PRODUIT
            </h4>

            <div class="ze-drawer-content-body" style="font-size: 0.85rem !important; color: #334155 !important; line-height: 1.6 !important;">
                <?php 
                // Display only actual post description / excerpt defined by admin
                $desc = get_the_content();
                if ( ! empty( $desc ) ) {
                    echo wpautop( do_shortcode( $desc ) );
                } else {
                    $excerpt = get_the_excerpt();
                    if ( ! empty( $excerpt ) ) {
                        echo wpautop( $excerpt );
                    } else {
                        echo '<p style="font-style: italic; color: #94a3b8; margin: 0;">Aucune description additionnelle renseignée pour le moment.</p>';
                    }
                }

                // Standard product attributes defined by admin in WooCommerce
                if ( function_exists( 'wc_display_product_attributes' ) && $product ) {
                    $attributes = $product->get_attributes();
                    if ( ! empty( $attributes ) ) {
                        echo '<div style="margin-top: 20px !important; border-top: 1px dashed #e2e8f0 !important; padding-top: 15px !important;">';
                        echo '<h5 style="font-size: 0.80rem !important; font-weight: 850 !important; color: #001f3f !important; text-transform: uppercase !important; margin-bottom: 10px !important; letter-spacing: 0.02em !important;">Fiche technique administrative</h5>';
                        wc_display_product_attributes( $product );
                        echo '</div>';
                    }
                }
                ?>
            </div>
        </div>
    </div>

</li>

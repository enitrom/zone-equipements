<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo( 'charset' ); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="profile" href="https://gmpg.org/xfn/11">
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<div id="page" class="hfeed site">
    <!-- Top Utility Bar (Cooperative/Industrial info + Currency/Lang) -->
    <div class="ze-topbar alignfull">
        <div class="ze-topbar-container alignwide">
            <div class="ze-topbar-info">
                <span class="ze-topbar-msg">⚙️ Expert Sourcing & Fourniture Industrielle pour l'Afrique</span>
                <span class="ze-topbar-divider">|</span>
                <a href="mailto:contact@zoneequipements.com" class="ze-topbar-link">
                    <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none" style="display:inline-block; vertical-align:middle; margin-right:3px;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    contact@zoneequipements.com
                </a>
            </div>
            <div class="ze-topbar-actions">
                <!-- Lang selection widget with dropdown simulation -->
                <div class="ze-lang-picker">
                    <button class="ze-lang-trigger" id="zeLangTrigger">
                        <span class="ze-flag">🇫🇷</span> FR <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none" style="display:inline-block; vertical-align:middle; margin-left:3px;"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    <ul class="ze-lang-dropdown" id="zeLangDropdown">
                        <li><a href="?lang=fr" class="active"><span class="ze-flag">🇫🇷</span> Français (FR)</a></li>
                        <li><a href="?lang=en"><span class="ze-flag">🇬🇧</span> English (EN)</a></li>
                    </ul>
                </div>
            </div>
        </div>
    </div>

    <!-- Compact, high-tech industrial header (Temu-style) -->
    <header id="masthead" class="site-header ze-custom-header alignfull">
        <div class="ze-header-container alignwide">
            <!-- Logo Section -->
            <div class="ze-logo-group">
                <a href="<?php echo esc_url(home_url('/')); ?>" class="ze-logo-link">
                    <span class="ze-logo-text">ZONE <span class="ze-logo-orange">EQUIPEMENTS</span></span>
                </a>
            </div>

            <!-- Catalogue Dropdown trigger -->
            <div class="ze-cat-dropdown-wrapper">
                <button class="ze-cat-dropdown-btn" id="zeCatBtn">
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" style="margin-right: 8px; vertical-align:middle; display:inline-block;"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                    Catalogue
                </button>
                <div class="ze-cat-mega-menu" id="zeMegaMenu">
                    <div class="ze-mega-grid">
                        <?php
                        $raw_categories = ze_get_all_dynamic_categories();

                        $col1 = array_slice($raw_categories, 0, 8);
                        $col2 = array_slice($raw_categories, 8, 8);
                        $col3 = array_slice($raw_categories, 16, 8);
                        $col4 = array_slice($raw_categories, 24);

                        $columns = array($col1, $col2, $col3, $col4);

                        foreach ($columns as $col) {
                            echo '<div class="ze-mega-col styling-no-header">';
                            echo '<ul>';
                            foreach ($col as $item) {
                                $shop_url = ze_get_category_link($item["name"]);
                                $icon_html = ze_get_category_icon_svg($item["name"], 14, 14, "ze-cat-icon");
                                echo '<li><a href="' . esc_url($shop_url) . '">' . $icon_html . ' <span>' . esc_html($item["name"]) . '</span></a></li>';
                            }
                            echo '</ul>';
                            echo '</div>';
                        }
                        ?>
                    </div>
                </div>
            </div>
            
            <!-- Modern Real-Time Search Bar -->
            <div class="ze-header-search">
                <form role="search" method="get" class="ze-search-form" action="<?php echo esc_url( home_url( '/' ) ); ?>">
                    <div class="ze-search-wrapper">
                        <input type="search" class="ze-search-field" placeholder="Rechercher une référence, marque ou produit MRO..." value="<?php echo get_search_query(); ?>" name="s" required />
                        <?php if ( class_exists( 'WooCommerce' ) ) : ?>
                            <input type="hidden" name="post_type" value="product" />
                        <?php endif; ?>
                        <button type="submit" class="ze-search-submit" aria-label="Rechercher">
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </button>
                    </div>
                </form>
            </div>
            
            <!-- Dynamic Navigation Links -->
            <nav class="ze-main-navigation">
                <ul class="ze-menu">
                    <li><a href="<?php echo esc_url(home_url('/services')); ?>">Services</a></li>
                    <li><a href="<?php echo esc_url(home_url('/contact')); ?>">Contact</a></li>
                </ul>
            </nav>
            
            <!-- Header Actions / Cart, Connexion, Devis -->
            <div class="ze-header-actions">
                <!-- Account / Connexion Link -->
                <a href="<?php echo esc_url(get_permalink(wc_get_page_id('myaccount'))); ?>" class="ze-account-link" title="Mon Compte / Connexion">
                    <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; display: inline-block; margin-right: 5px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    <span class="ze-account-text">Connexion</span>
                </a>

                <?php if ( class_exists( 'WooCommerce' ) ) : ?>
                    <a class="ze-header-cart" href="<?php echo esc_url(wc_get_cart_url()); ?>" title="<?php esc_attr_e( 'Voir votre panier', 'zone-equipements-child' ); ?>">
                        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                        <span class="ze-cart-count"><?php echo WC()->cart->get_cart_contents_count(); ?></span>
                    </a>
                <?php endif; ?>

                <a href="<?php echo esc_url(home_url('/contact')); ?>" class="ze-header-btn">Demande de Devis</a>
            </div>
        </div>
    </header>

    <script>
    // Pure Vanilla JS for dropdown/language pickers fallback to guarantee click interactivity in all viewports
    document.addEventListener('DOMContentLoaded', function() {
        var zeLangTrigger = document.getElementById('zeLangTrigger');
        var zeLangDropdown = document.getElementById('zeLangDropdown');
        var zeCatBtn = document.getElementById('zeCatBtn');
        var zeMegaMenu = document.getElementById('zeMegaMenu');

        if (zeLangTrigger && zeLangDropdown) {
            zeLangTrigger.addEventListener('click', function(e) {
                e.stopPropagation();
                zeLangDropdown.classList.toggle('show-block');
            });
        }
        
        if (zeCatBtn && zeMegaMenu) {
            zeCatBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                zeMegaMenu.classList.toggle('show-block');
            });
        }

        document.addEventListener('click', function() {
            if (zeLangDropdown) zeLangDropdown.classList.remove('show-block');
            if (zeMegaMenu) zeMegaMenu.classList.remove('show-block');
        });
    });
    </script>

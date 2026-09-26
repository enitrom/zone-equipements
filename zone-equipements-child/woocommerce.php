<?php
/**
 * Custom WooCommerce Master Template
 * Acts as the ultimate high-fidelity template override.
 * Resolves layout conflicts across block themes, hybrid themes, and classic routes.
 */

defined( 'ABSPATH' ) || exit;

get_header( 'shop' );

// Remove first (native) breadcrumb to prevent duplicate rendering with custom breadcrumb row
remove_action( 'woocommerce_before_main_content', 'woocommerce_breadcrumb', 20 );

/**
 * Hook: woocommerce_before_main_content.
 *
 * @hooked woocommerce_output_content_wrapper - 10
 */
do_action( 'woocommerce_before_main_content' );
?>

<?php if ( is_singular( 'product' ) ) : ?>
    <!-- Handled via Single Product Layout (Single Column with Sourcing/RFQ features) -->
    <div class="ze-single-product-container">
        <?php while ( have_posts() ) : ?>
            <?php the_post(); ?>
            <?php wc_get_template_part( 'content', 'single-product' ); ?>
        <?php endwhile; ?>
    </div>

<?php elseif ( is_shop() || is_product_category() || is_product_taxonomy() || is_product_tag() ) : ?>
    <!-- Handled via Custom 2-Column Industrial Sourcing Filter Grid -->
    <div class="ze-custom-shop-grid-wrapper">
        <!-- Sidebar filters panel -->
        <aside class="ze-custom-shop-sidebar">
            <?php echo do_shortcode('[ze_sidebar_filters]'); ?>
        </aside>

        <!-- Main Product Listing loop -->
        <div class="ze-custom-shop-content">
            <!-- Beautiful Double-Deck Action Row & Breadcrumb -->
            <?php
            // Prevent defaults from double-rendering
            remove_action( 'woocommerce_before_shop_loop', 'woocommerce_result_count', 20 );
            remove_action( 'woocommerce_before_shop_loop', 'woocommerce_catalog_ordering', 30 );

            $breadcrumbs = array();
            $breadcrumbs[] = array('name' => 'ZONE ÉQUIPEMENTS', 'url' => home_url('/'));
            $breadcrumbs[] = array('name' => 'Boutique MRO', 'url' => get_permalink( wc_get_page_id( 'shop' ) ));

            $active_title = 'BOUTIQUE MRO';
            if ( is_product_category() ) {
                $queried_term = get_queried_object();
                if ( $queried_term ) {
                    $active_title = $queried_term->name;
                    if ( $queried_term->parent ) {
                        $parent = get_term( $queried_term->parent, 'product_cat' );
                        if ( $parent && ! is_wp_error( $parent ) ) {
                            $breadcrumbs[] = array('name' => strtoupper($parent->name), 'url' => get_term_link( $parent ));
                        }
                    }
                    $breadcrumbs[] = array('name' => strtoupper($queried_term->name), 'url' => get_term_link( $queried_term ));
                }
            }
            ?>

            <div class="ze-archive-breadcrumbs-row">
                <?php foreach ($breadcrumbs as $index => $bc): ?>
                    <?php if ($index > 0): ?>
                        <span class="ze-bc-separator">›</span>
                    <?php endif; ?>
                    <a href="<?php echo esc_url($bc['url']); ?>" class="ze-bc-link <?php echo ($index === count($breadcrumbs) - 1) ? 'ze-bc-active' : ''; ?>">
                        <?php echo esc_html($bc['name']); ?>
                    </a>
                <?php endforeach; ?>
            </div>

            <div class="ze-archive-actions-bar">
                <div class="ze-bar-left">
                    <h1 class="ze-bar-title text-uppercase"><?php echo esc_html($active_title); ?></h1>
                    <span class="ze-matched-count text-muted font-weight-bold">Chargement...</span>
                </div>

                <div class="ze-bar-right">
                    <div class="ze-view-mode-toggle">
                        <button class="ze-view-mode-btn ze-list-mode-btn active" data-mode="list" title="Affichage en Liste">
                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" class="inline mr-1"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                            <span>LISTE</span>
                        </button>
                        <button class="ze-view-mode-btn ze-grid-mode-btn" data-mode="grid" title="Affichage en Grille">
                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" class="inline mr-1"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                            <span>GRILLE</span>
                        </button>
                    </div>

                    <div class="ze-sorting-wrapper">
                        <?php woocommerce_catalog_ordering(); ?>
                    </div>
                </div>
            </div>

            <?php
            if ( woocommerce_product_loop() ) {
                /**
                 * Hook: woocommerce_before_shop_loop.
                 *
                 * @hooked woocommerce_output_all_notices - 10
                 */
                do_action( 'woocommerce_before_shop_loop' );

                woocommerce_product_loop_start();

                if ( wc_get_loop_prop( 'total' ) ) {
                    while ( have_posts() ) {
                        the_post();
                        /**
                         * Hook: woocommerce_shop_loop.
                         */
                        do_action( 'woocommerce_shop_loop' );
                        wc_get_template_part( 'content', 'product' );
                    }
                }

                woocommerce_product_loop_end();

                /**
                 * Hook: woocommerce_after_shop_loop.
                 *
                 * @hooked woocommerce_pagination - 10
                 */
                do_action( 'woocommerce_after_shop_loop' );
            } else {
                /**
                 * Hook: woocommerce_no_products_found.
                 *
                 * @hooked wc_no_products_found - 10
                 */
                do_action( 'woocommerce_no_products_found' );
            }
            ?>
        </div>
    </div>

<?php else : ?>
    <!-- Fallback general layout for other Woo sheets (Cart, Checkout, Account) -->
    <div class="ze-general-woo-sheet">
        <?php while ( have_posts() ) : ?>
            <?php the_post(); ?>
            <?php the_content(); ?>
        <?php endwhile; ?>
    </div>
<?php endif; ?>

<?php
/**
 * Hook: woocommerce_after_main_content.
 *
 * @hooked woocommerce_output_content_wrapper_end - 10
 */
do_action( 'woocommerce_after_main_content' );

get_footer( 'shop' );

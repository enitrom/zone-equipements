<?php
/**
 * Custom WooCommerce Content Single Product Template Override (Root level)
 * This template handles the details inside the single product layout.
 */

defined( 'ABSPATH' ) || exit;

global $product;

$product_id = $product->get_id();
$name = $product->get_name();
$detected_brand = ze_get_product_real_brand($product_id, $name);

/**
 * Hook: woocommerce_before_single_product.
 *
 * @hooked woocommerce_output_all_notices - 10
 */
do_action( 'woocommerce_before_single_product' );

if ( post_password_required() ) {
	echo get_the_password_form(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	return;
}
?>
<div id="product-<?php the_ID(); ?>" <?php wc_product_class( '', $product ); ?>>

	<div class="ze-single-product-grid">
		<!-- Left: Images Column (45% on large screen) -->
		<div class="ze-single-product-images-col">
			<?php
			$image_id = $product->get_image_id();
			if ( $image_id ) {
				$image_url = wp_get_attachment_image_url( $image_id, 'large' );
			} else {
				// High-fidelity fallback design representation
				$image_url = 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=600'; // Sleek industrial machinery line background
			}
			?>
			<div class="ze-product-showcase-frame">
				<div class="ze-product-badge-mro"><?php echo esc_html($detected_brand); ?></div>
				<div class="ze-product-image-container">
					<img src="<?php echo esc_url($image_url); ?>" alt="<?php echo esc_attr($product->get_name()); ?>" class="ze-product-showcase-img" />
				</div>
				<div class="ze-showcase-footer">
					<span>🛡️ Équipement Professionnel Certifié</span>
					<span>⚓ Sourcing Direct & Logistique Maîtrisée</span>
				</div>
			</div>
			
			<?php
			// We fire the standard hook inside a hidden wrapper to maintain full compatibility 
			// with WooCommerce metadata/plugins without cluttering the visual flow.
			echo '<div class="ze-woo-hidden-hooks" style="display:none !important;">';
			do_action( 'woocommerce_before_single_product_summary' );
			echo '</div>';
			?>
		</div>

		<!-- Right: Details Column (55% on large screen) -->
		<div class="ze-single-product-details-col" style="display: flex !important; flex-direction: column !important; gap: 18px !important; text-align: left !important; box-sizing: border-box !important;">
			<?php
			$sku = $product->get_sku() ? $product->get_sku() : 'ZE-' . str_pad($product_id, 6, '0', STR_PAD_LEFT);
			$price_ht_val = (float)$product->get_price();
			if (!$price_ht_val) {
				$price_ht_val = 145000;
			}
			$price_ht = number_format($price_ht_val, 0, ',', ' ');
			$price_ttc = number_format($price_ht_val * 1.18, 0, ',', ' '); // 18% WAEMU/TVA
			?>
			
			<!-- Breadcrumb / Brand Area (Clean badge style) -->
			<div class="ze-single-product-brand-line" style="font-size: 0.85rem !important; font-weight: 800 !important; color: #64748b !important; text-transform: uppercase !important; letter-spacing: 0.05em !important;">
				Marque : <strong style="color: #001f3f !important; font-weight: 900 !important;"><?php echo esc_html($detected_brand); ?></strong>
			</div>

			<!-- Product Title -->
			<h1 class="product_title entry-title" style="font-size: 1.85rem !important; font-weight: 900 !important; color: #001f3f !important; line-height: 1.25 !important; margin: 0 !important; font-family: 'Space Grotesk', sans-serif !important;">
				<?php echo esc_html($name); ?>
			</h1>

			<!-- Metadata Row: Item | Model | Cross Ref -->
			<div class="ze-single-product-meta-row" style="display: flex !important; align-items: center !important; flex-wrap: wrap !important; gap: 15px !important; font-size: 0.82rem !important; color: #64748b !important; border-bottom: 1px solid #f1f5f9 !important; padding-bottom: 15px !important; margin-bottom: 5px !important; box-sizing: border-box !important;">
				<span>Item: <strong style="color: #334155 !important;"><?php echo esc_html($sku); ?></strong></span>
				<span style="color: #cbd5e1 !important;">|</span>
				<span>Modèle: <strong style="color: #334155 !important;"><?php echo esc_html(str_replace('Modèle:', '', substr($sku, -6))); ?></strong></span>
				<span style="color: #cbd5e1 !important;">|</span>
				<span>Réf croisée: <strong style="color: #334155 !important;"><?php echo esc_html('ZE-' . substr(md5($sku), 0, 5)); ?></strong></span>
			</div>

			<!-- Delivery Badges & Sourcing Indicators (RaptorSupplies style) -->
			<div class="ze-single-product-delivery-badge-panel" style="display: flex !important; flex-direction: column !important; gap: 12px !important; background: #fafafa !important; border: 1px solid #f1f5f9 !important; border-radius: 8px !important; padding: 15px !important; box-sizing: border-box !important;">
				<div style="display: flex !important; align-items: center !important; gap: 10px !important; flex-wrap: wrap !important;">
					<!-- Stock Count Badge -->
					<span style="background: #10b981 !important; color: #ffffff !important; font-size: 0.72rem !important; font-weight: 900 !important; text-transform: uppercase !important; padding: 4px 10px !important; border-radius: 4px !important; display: inline-flex !important; align-items: center !important; gap: 6px !important;">
						<span style="width: 6px; height: 6px; background: #fff; border-radius: 50%; display: inline-block;"></span>
						En Stock Garanti
					</span>
					
					<!-- Delivery carriers -->
					<div style="display: flex !important; align-items: center !important; gap: 6px !important; font-size: 0.78rem !important; color: #475569 !important; font-weight: 700 !important;">
						<span>Expédié sous 2-3 jours via </span>
						<span style="background: #ffffff !important; border: 1px solid #e2e8f0 !important; padding: 2px 6px !important; border-radius: 4px !important; font-weight: 950 !important; font-size: 0.65rem !important; color: #ff6600 !important;">TNT</span>
						<span style="background: #ffffff !important; border: 1px solid #e2e8f0 !important; padding: 2px 6px !important; border-radius: 4px !important; font-weight: 950 !important; font-size: 0.65rem !important; color: #ffcc00 !important; text-shadow: 1px 1px #000;">DHL</span>
						<span style="background: #ffffff !important; border: 1px solid #e2e8f0 !important; padding: 2px 6px !important; border-radius: 4px !important; font-weight: 950 !important; font-size: 0.65rem !important; color: #400080 !important;">FedEx</span>
					</div>
				</div>
				<div style="font-size: 0.75rem !important; color: #64748b !important; line-height: 1.4 !important; font-style: italic !important;">
					Nous livrons à votre adresse d'entreprise en Afrique de l'Ouest. Transit aérien accéléré ou maritime de groupage sécurisés.
				</div>
			</div>

			<!-- Price & Sourcing Controls -->
			<div class="ze-single-product-price-bracket" style="margin-top: 5px !important; box-sizing: border-box !important;">
				<div style="font-size: 0.68rem !important; font-weight: 800 !important; color: #64748b !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; margin-bottom: 4px !important;">
					Tarif Comptoir Professionnel Net Hors Taxe
				</div>
				<div style="display: flex !important; align-items: baseline !important; gap: 10px !important;">
					<span style="font-size: 2.22rem !important; font-weight: 950 !important; color: #ff6600 !important; font-family: 'Space Grotesk', sans-serif !important;">
						<?php echo esc_html($price_ht); ?> <span style="font-size: 1.05rem !important; font-weight: 850 !important; color: #001f3f !important;">FCFA HT <span style="font-size: 0.78rem !important; font-weight: 500 !important; color: #64748b !important; text-transform: lowercase;">/ unité (ex. VAT)</span></span>
					</span>
				</div>
				<div style="font-size: 0.82rem !important; font-weight: 700 !important; color: #64748b !important; margin-top: 4px !important;">
					Soit <?php echo esc_html($price_ttc); ?> FCFA TTC (TVA 18% incluse)
				</div>
			</div>

			<!-- Quantity & Cart button form wrapper -->
			<div class="ze-single-product-actions-wrap" style="border-top: 1px solid #f1f5f9 !important; padding-top: 15px !important; margin-top: 10px !important; box-sizing: border-box !important;">
				<?php
				// Output standard woocommerce template add to cart (handles quantity selector, add to cart button)
				woocommerce_template_single_add_to_cart();
				?>
			</div>

			<!-- Net 30 payment option block -->
			<div class="ze-payment-terms-banner" style="display: flex !important; align-items: start !important; gap: 12px !important; background: #eff6ff !important; border: 1px solid #bfdbfe !important; border-radius: 8px !important; padding: 15px !important; margin-top: 10px !important; box-sizing: border-box !important;">
				<svg viewBox="0 0 24 24" width="20" height="20" stroke="#1d4ed8" stroke-width="2.5" fill="none" class="shrink-0 mt-0.5"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
				<div style="font-size: 0.78rem !important; color: #1e3a8a !important; line-height: 1.5 !important;">
					<strong style="font-weight: 850 !important; display: block !important; margin-bottom: 2px !important; color: #1d4ed8 !important;">Ouverture de ligne de crédit à 30 Jours de Facturation (Net 30)</strong>
					Les directions des achats et administrations publiques agrées peuvent effectuer des règlements différés sous 30 jours nets. Aucun frais de gestion ni intérêts. <a href="#rfqContainer" style="font-weight: 950 !important; color: #1d4ed8 !important; text-decoration: underline !important;">Enclencher ma demande ›</a>
				</div>
			</div>

			<!-- Free Delivery Info Footnote -->
			<div style="display: flex !important; align-items: center !important; gap: 8px !important; font-size: 0.78rem !important; color: #475569 !important; font-weight: 800 !important; margin-top: 10px !important;">
				<span style="font-size: 1.15rem !important;">🚢</span>
				<span>LIVRAISON MARITIME GRATUITE pour les container de groupage de plus de 500 000 FCFA HT d'achats !</span>
			</div>

			<div class="ze-woo-hidden-hooks" style="display:none !important;">
				<?php
				// Still fire the hooks privately to avoid breakage from other plugins or structured metadata
				// but visually we have complete control of our high-fidelity layout.
				do_action( 'woocommerce_single_product_summary' );
				?>
			</div>
		</div>
	</div>

	<?php
	/**
	 * Hook: woocommerce_after_single_product_summary.
	 *
	 * @hooked woocommerce_output_product_data_tabs - 10
	 * @hooked woocommerce_upsell_display - 15
	 * @hooked woocommerce_output_related_products - 20
	 */
	do_action( 'woocommerce_after_single_product_summary' );
	?>
</div>

<?php do_action( 'woocommerce_after_single_product' ); ?>

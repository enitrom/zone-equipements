<?php
/**
 * Custom footer for the ZONE EQUIPEMENTS children theme.
 */
?>
    <footer id="colophon" class="site-footer ze-custom-footer alignfull">
        <div class="ze-footer-container alignwide">
            
            <!-- Col 1: Brand & Presentation -->
            <div class="ze-footer-col ze-footer-brand">
                <span class="ze-footer-logo">ZONE <span class="ze-logo-orange">EQUIPEMENTS</span></span>
                <p>La première plateforme panafricaine dédiée au sourcing de matériels MRO, pièces industrielles, outillages professionnels et fournitures techniques de haute performance.</p>
                <div class="ze-footer-badge-grid">
                    <span class="ze-f-badge">MRO Certified</span>
                    <span class="ze-f-badge">Africa Delivery</span>
                </div>
            </div>

            <!-- Col 2: Navigation Links -->
            <div class="ze-footer-col">
                <h4 class="ze-footer-title">Navigation</h4>
                <ul class="ze-footer-links">
                    <li><a href="<?php echo esc_url(get_permalink(wc_get_page_id('shop'))); ?>">Notre catalogue</a></li>
                    <li><a href="<?php echo esc_url(home_url('/services')); ?>">Nos services MRO</a></li>
                    <li><a href="<?php echo esc_url(home_url('/contact')); ?>">Demander un devis</a></li>
                    <li><a href="<?php echo esc_url(home_url('/contact')); ?>">Sourcing sur-mesure</a></li>
                </ul>
            </div>

            <!-- Col 3: Safe Payment options -->
            <div class="ze-footer-col">
                <h4 class="ze-footer-title">Paiements Sécurisés</h4>
                <p class="ze-footer-sm-text">Sécurisez vos transactions avec nos options de paiement flexibles adaptées aux écosystèmes africains :</p>
                <div class="ze-payment-logos">
                    <span class="ze-p-badge" title="Orange Money">Orange Money</span>
                    <span class="ze-p-badge" title="Wave">Wave</span>
                    <span class="ze-p-badge" title="MTN Mobile Money">MTN Money</span>
                    <span class="ze-p-badge" title="Virement bancaire / Proforma">Virement</span>
                </div>
            </div>

            <!-- Col 4: Expert Help / Location -->
            <div class="ze-footer-col">
                <h4 class="ze-footer-title">Assistance Technique</h4>
                <p class="ze-footer-sm-text">Nos experts industriels vous accompagnent dans le choix de vos références et l'établissement de vos cotations techniques.</p>
                <div class="ze-footer-contact-info">
                    <a href="mailto:contact@zoneequipements.com" class="ze-footer-link">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" style="display:inline-block; vertical-align:middle; margin-right:8px;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                        contact@zoneequipements.com
                    </a>
                </div>
            </div>

        </div>

        <!-- System bottom copyright/credits -->
        <div class="ze-footer-bottom alignfull">
            <div class="ze-footer-bottom-container alignwide">
                <p class="ze-copy">&copy; <?php echo date('Y'); ?> ZONE EQUIPEMENTS. Tous droits réservés. Plateforme de fournitures industrielles & MRO.</p>
                <div class="ze-bottom-links">
                    <a href="<?php echo esc_url(home_url('/mentions-legales')); ?>">Conditions Générales</a>
                    <a href="<?php echo esc_url(home_url('/politique-de-confidentialite')); ?>">Confidentialité</a>
                </div>
            </div>
        </div>
    </footer>
</div><!-- #page -->

<?php wp_footer(); ?>
</body>
</html>

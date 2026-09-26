<?php
/**
 * Template Name: ZONE EQUIPEMENTS Homepage
 * Description: Premium industrial MRO homepage with high-performance responsive styling.
 */

get_header(); ?>

<div id="primary" class="content-area ze-homepage-wrapper">
    <main id="main" class="site-main">

        <!-- 1. HERO SECTION -->
        <section class="ze-hero alignfull">
            <div class="ze-hero-overlay"></div>
            <div class="ze-hero-content">
                <h1 class="ze-hero-title">L'Excellence Industrielle Mondiale,<br>Livrée en Afrique</h1>
                <p class="ze-hero-subtitle">ZONE EQUIPEMENTS est votre plateforme unique pour le sourcing, la comparaison et l'achat de matériel MRO et industriel de haute performance.</p>
                <div class="ze-hero-buttons">
                    <a href="<?php echo esc_url(get_permalink(wc_get_page_id('shop'))); ?>" class="ze-btn ze-btn-primary">Explorer le catalogue</a>
                    <a href="<?php echo esc_url(home_url('/contact')); ?>" class="ze-btn ze-btn-secondary">Sourcing sur mesure</a>
                </div>
            </div>
        </section>

        <!-- 2. REASSURANCE FEATURES -->
        <section class="ze-features alignwide">
            <div class="ze-features-grid">
                <div class="ze-feature-card">
                    <div class="ze-feature-icon ze-icon-blue">
                        <svg viewBox="0 0 24 24" width="30" height="30" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                    </div>
                    <div class="ze-feature-info">
                        <h3>Qualité Certifiée</h3>
                        <p>Marques mondiales d'origine</p>
                    </div>
                </div>
                <div class="ze-feature-card">
                    <div class="ze-feature-icon ze-icon-orange">
                        <svg viewBox="0 0 24 24" width="30" height="30" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                    </div>
                    <div class="ze-feature-info">
                        <h3>Logistique Intégrée</h3>
                        <p>Livraison partout en Afrique</p>
                    </div>
                </div>
                <div class="ze-feature-card">
                    <div class="ze-feature-icon ze-icon-green">
                        <svg viewBox="0 0 24 24" width="30" height="30" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    </div>
                    <div class="ze-feature-info">
                        <h3>Support Expert 24/7</h3>
                        <p>Assistance technique dédiée</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- 3. NOS CATEGORIES SECTION (31 Categories dynamically loaded) -->
        <section class="ze-categories alignwide">
            <div class="ze-section-title">
                <h2>Nos Catégories</h2>
                <p>Découvrez notre gamme complète de 31 catégories d'équipements industriels et fournitures MRO d'origine constructeur certifiée.</p>
            </div>
             <div class="ze-categories-mega-grid">
                <?php
                $front_categories = ze_get_all_dynamic_categories();

                foreach ($front_categories as $cat) {
                    $shop_url = ze_get_category_link($cat["name"]);
                    $icon_html = ze_get_category_icon_svg($cat["name"], 16, 16, "ze-cat-icon-svg");
                    ?>
                    <div class="ze-cat-box">
                        <div class="ze-cb-icon">
                            <?php echo $icon_html; ?>
                        </div>
                        <div class="ze-cb-details">
                            <span class="ze-cat-box-tag">📦 <?php echo esc_html($cat["brands"]); ?></span>
                            <h4><?php echo esc_html($cat["name"]); ?></h4>
                            <p><?php echo esc_html($cat["desc"]); ?></p>
                            <a href="<?php echo esc_url($shop_url); ?>">Explorer &rarr;</a>
                        </div>
                    </div>
                    <?php
                }
                ?>
            </div>
        </section>

        <!-- 4. PAN-AFRICAN LOGISTICS SECTION -->
        <section class="ze-logistics alignfull">
            <div class="ze-logistics-container">
                <div class="ze-logistics-header">
                    <span class="ze-badge">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px; display: inline-block; vertical-align: middle;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        Logistique Panafricaine
                    </span>
                    <h2>Livraison Partout en Afrique</h2>
                    <p>ZONE EQUIPEMENTS s'appuie sur un réseau logistique de premier ordre pour livrer vos équipements industriels dans les zones de production les plus exigeantes du continent.</p>
                </div>

                <div class="ze-regions-grid">
                    <div class="ze-region-card">
                        <h3>Afrique de l'Ouest</h3>
                        <p>Sénégal, Côte d'Ivoire, Mali, Guinée, Burkina Faso, Togo, Bénin, Niger, etc.</p>
                    </div>
                    <div class="ze-region-card">
                        <h3>Afrique Centrale</h3>
                        <p>Cameroun, Gabon, Congo, RD Congo, Tchad, Centrafrique, Guinée Équatoriale.</p>
                    </div>
                    <div class="ze-region-card">
                        <h3>Afrique de l'Est</h3>
                        <p>Kenya, Tanzanie, Ouganda, Éthiopie, Rwanda, Burundi, Djibouti, etc.</p>
                    </div>
                    <div class="ze-region-card">
                        <h3>Afrique Australe</h3>
                        <p>Afrique du Sud, Angola, Zambie, Zimbabwe, Mozambique, Namibie.</p>
                    </div>
                    <div class="ze-region-card">
                        <h3>Maghreb</h3>
                        <p>Maroc, Algérie, Tunisie, Mauritanie, Égypte.</p>
                    </div>
                    <div class="ze-region-blue-card">
                        <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                        <h3>Couverture Totale</h3>
                        <p>54 pays connectés avec suivi colis en temps réel.</p>
                    </div>
                </div>

                <div class="ze-partners-bar">
                    <div class="ze-partners-info">
                        <h4>Nos Partenaires Stratégiques</h4>
                        <p>We work tightly with global transport experts.</p>
                    </div>
                    <div class="ze-partners-logos">
                        <span>DHL Express</span>
                        <span>Aramex</span>
                        <span>FedEx</span>
                        <span>Maersk</span>
                        <span>Bolloré</span>
                    </div>
                </div>
            </div>
        </section>

        <!-- 5. SECTEURS D'ACTIVITE (Complete Grid of 8 Sectors) -->
        <section class="ze-sectors alignwide">
            <div class="ze-section-title">
                <h2>Secteurs d'Activité</h2>
                <p>Nous fournissons des équipements spécialisés répondant aux normes les plus strictes de chaque industrie.</p>
            </div>
            
            <div class="ze-sectors-grid">
                <div class="ze-sector-card">
                    <img src="https://picsum.photos/seed/excavator/400/250" alt="Mines & Carrières">
                    <div class="ze-sector-body">
                        <h3>Mines & Carrières</h3>
                        <p>Équipements lourds, pompes submersibles d'exhaure, filtration et sécurité.</p>
                    </div>
                </div>
                <div class="ze-sector-card">
                    <img src="https://picsum.photos/seed/harvester/400/250" alt="Agriculture & Élevage">
                    <div class="ze-sector-body">
                        <h3>Agriculture & Élevage</h3>
                        <p>Moteurs thermiques et de transmission, hydraulique et mécanisation agricole.</p>
                    </div>
                </div>
                <div class="ze-sector-card">
                    <img src="https://picsum.photos/seed/crane/400/250" alt="BTP & Génie Civil">
                    <div class="ze-sector-body">
                        <h3>BTP & Génie Civil</h3>
                        <p>Systèmes d'ancrage structurel Hilti, électroportatif de chantier et levage.</p>
                    </div>
                </div>
                <div class="ze-sector-card">
                    <img src="https://picsum.photos/seed/power_plant/400/250" alt="Énergie & Électricité">
                    <div class="ze-sector-body">
                        <h3>Énergie & Électricité</h3>
                        <p>Câbles industriels armés, instrumentation de mesure Fluke, armoires de distribution.</p>
                    </div>
                </div>
                <div class="ze-sector-card">
                    <img src="https://picsum.photos/seed/petrochemical/400/250" alt="Chimie & Pétrochimie">
                    <div class="ze-sector-body">
                        <h3>Chimie & Pétrochimie</h3>
                        <p>Robinetterie industrielle ATEX, raccords inox, étanchéités de process Loctite.</p>
                    </div>
                </div>
                <div class="ze-sector-card">
                    <img src="https://picsum.photos/seed/beverage/400/250" alt="Agroalimentaire">
                    <div class="ze-sector-body">
                        <h3>Agroalimentaire</h3>
                        <p>Tuyaux sanitaires certifiés, moteurs inoxydables, instrumentation hygiénique.</p>
                    </div>
                </div>
                <div class="ze-sector-card">
                    <img src="https://picsum.photos/seed/ports/400/250" alt="Secteur Maritime & Ports">
                    <div class="ze-sector-body">
                        <h3>Maritime & Ports</h3>
                        <p>Systèmes d’élingage lourds, câbles d’acier marine, anodes sacrificielles MRO.</p>
                    </div>
                </div>
                <div class="ze-sector-card">
                    <img src="https://picsum.photos/seed/factory/400/250" alt="Manufacture & Automobile">
                    <div class="ze-sector-body">
                        <h3>Manufacture & Assemblage</h3>
                        <p>Automatisation Siemens, capteurs d'origine, courroies de convoyeur SKF.</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- 6. HIGH-TRUST BRANDS (MARQUES DE CONFIANCE) -->
        <section class="ze-brands alignfull">
            <div class="ze-brands-inner">
                <h3>Marques de Confiance</h3>
                <p class="ze-brands-intro">Accédez aux constructeurs leaders mondiaux garantissant des performances MRO optimales pour vos lignes de production.</p>
                <div class="ze-brands-grid alignwide">
                    <?php
                    $brands = ze_get_all_dynamic_brands();
                    foreach ($brands as $brand) {
                        $icon_html = ze_get_brand_icon_svg($brand["icon"], 20, 20, "ze-brand-icon-svg");
                        ?>
                        <div class="ze-brand-logo-card">
                            <span class="ze-brand-icon-wrapper"><?php echo $icon_html; ?></span>
                            <strong><?php echo esc_html($brand["name"]); ?></strong>
                            <span><?php echo esc_html($brand["sub"]); ?></span>
                        </div>
                        <?php
                    }
                    ?>
                </div>
            </div>
        </section>

        <!-- 7. CLIENT TESTIMONIALS (TEMOIGNAGES CLIENTS) -->
        <section class="ze-testimonials alignwide">
            <div class="ze-section-title">
                <h2>Témoignages Clients</h2>
                <p>Découvrez pourquoi de nombreuses entreprises industrielles africaines font confiance à ZONE EQUIPEMENTS chaque jour.</p>
            </div>
            
            <div class="ze-testimonials-grid">
                <div class="ze-testimonial-card">
                    <div class="ze-t-header">
                        <div class="ze-t-user">
                            <strong>Ibrahima D.</strong>
                            <span>Directeur de Maintenance - Mine d'Or de Sadiola (Mali)</span>
                        </div>
                    </div>
                    <p class="ze-t-feedback">"Le sourcing de nos pompes d'exhaure s'est fait de manière extrêmement réactive. La livraison sur site a été gérée de bout en bout malgré la complexité des douanes. Un partenaire MRO précieux !"</p>
                    <div class="ze-t-rating">⭐⭐⭐⭐⭐</div>
                </div>

                <div class="ze-testimonial-card">
                    <div class="ze-t-header">
                        <div class="ze-t-user">
                            <strong>Mamadou S.</strong>
                            <span>Responsable Achats - Cimenterie de Dakar (Sénégal)</span>
                        </div>
                    </div>
                    <p class="ze-t-feedback">"Avoir accès aux roulements SKF d'origine certifiée en moins de 5 jours nous a évité un arrêt de production majeur. L'accompagnement technique de leurs ingénieurs est remarquable."</p>
                    <div class="ze-t-rating">⭐⭐⭐⭐⭐</div>
                </div>

                <div class="ze-testimonial-card">
                    <div class="ze-t-header">
                        <div class="ze-t-user">
                            <strong>Sylvie K.</strong>
                            <span>Directrice Technique - Complexe Agroalimentaire (Côte d'Ivoire)</span>
                        </div>
                    </div>
                    <p class="ze-t-feedback">"La flexibilité de paiement par Mobile Money africain et l'émission rapide de nos factures proforma facilitent énormément nos budgets de fournitures récurrents."</p>
                    <div class="ze-t-rating">⭐⭐⭐⭐⭐</div>
                </div>
            </div>
        </section>

        <!-- 8. LATEST ARTICLES (DERNIERS ARTICLES) -->
        <section class="ze-articles alignwide">
            <div class="ze-section-title">
                <h2>Derniers Articles</h2>
                <p>Restez informé des meilleures pratiques et innovations industrielles pour optimiser vos installations en Afrique.</p>
            </div>
            
            <div class="ze-articles-grid">
                <article class="ze-article-card">
                     <img src="https://picsum.photos/seed/article1/450/300" alt="Maintenance Moteur">
                    <div class="ze-article-body">
                        <span class="ze-article-tag">Maintenance technique</span>
                        <h3><a href="<?php echo esc_url(get_permalink(wc_get_page_id('shop'))); ?>">Comment optimiser la vie de vos moteurs électriques en climat tropical ?</a></h3>
                        <p>Découvrez les stratégies de lubrification clés et l'environnement de refroidissement adéquat pour préserver vos rotors.</p>
                        <span class="ze-article-date">Mis à jour le 23 Mars 2026</span>
                    </div>
                </article>

                <article class="ze-article-card">
                    <img src="https://picsum.photos/seed/article2/450/300" alt="Guide Roulements">
                    <div class="ze-article-body">
                        <span class="ze-article-tag">Comparatif Matériel</span>
                        <h3><a href="<?php echo esc_url(get_permalink(wc_get_page_id('shop'))); ?>">Guide : Roulements rigides standards VS roulements rotulés SKF</a></h3>
                        <p>Quels types de roulements choisir selon les charges radiales et axiales de vos tapis roulants miniers ?</p>
                        <span class="ze-article-date">Mis à jour le 15 Avril 2026</span>
                    </div>
                </article>

                <article class="ze-article-card">
                    <img src="https://picsum.photos/seed/article3/450/300" alt="Normes de protection">
                    <div class="ze-article-body">
                        <span class="ze-article-tag">Sécurité & EPI</span>
                        <h3><a href="<?php echo esc_url(get_permalink(wc_get_page_id('shop'))); ?>">EPI Miniers : Guide des nouvelles certifications de sécurité antichute</a></h3>
                        <p>Sélection de harnais, casques et chaussures normés pour garantir zéro accident lors des extractions lourdes.</p>
                        <span class="ze-article-date">Mis à jour le 02 Mai 2026</span>
                    </div>
                </article>
            </div>
        </section>

        <!-- 9. INDUSTRIAL FAQ -->
        <section class="ze-faq alignwide">
            <div class="ze-section-title">
                <h2>Questions Fréquentes</h2>
                <p>Tout savoir sur le sourcing et la logistique pour l'Afrique.</p>
            </div>
            
            <div class="ze-faq-grid">
                <div class="ze-faq-item">
                    <h4>
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:8px; color:var(--ze-secondary)"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                        Quels sont vos délais de livraison en Afrique ?
                    </h4>
                    <p>Nos délais varient de 3 à 7 jours ouvrés en express (aérien) et de 15 à 30 jours pour le fret maritime selon le pays et la complexité douanière de la cargaison.</p>
                </div>
                <div class="ze-faq-item">
                    <h4>
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:8px; color:var(--ze-secondary)"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                        Acceptiez-vous les règlements par Mobile Money ?
                    </h4>
                    <p>Tout à fait. Nous acceptons Wave, Orange Money, Free Money, et MTN Money pour faciliter vos transactions instantanées nationales et internationales MRO.</p>
                </div>
                <div class="ze-faq-item">
                    <h4>
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:8px; color:var(--ze-secondary)"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                        Comment obtenir un devis proforma pour notre entreprise ?
                    </h4>
                    <p>C'est très simple : remplissez le formulaire sur notre page Contact ou cliquez sur le bouton de sourcing sur mesure. Nos techniciens vous répondront en moins de 24h avec une offre détaillée.</p>
                </div>
            </div>
        </section>

    </main>
</div>

<?php get_footer(); ?>

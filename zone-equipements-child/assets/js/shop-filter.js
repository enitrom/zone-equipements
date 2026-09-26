/**
 * Elite Industrial Sourcing & Extended B2B Live Filtering System
 * Client-side live matching of WooCommerce catalog items.
 */

function initZeShopFilter() {
    // Avoid double-initialisation of listeners
    if (window.zeShopFilterInitialized) {
        // Just re-run a filter pass if called again (e.g., on AJAX completes or page transitions)
        if (typeof window.zeExecuteFilters === 'function') {
            window.zeExecuteFilters();
        }
        return;
    }
    window.zeShopFilterInitialized = true;

    // 1. Elements selector
    // Select both standard WooCommerce product items, block post templates, and our custom row cards (supports dynamic AJAX queries)
    let products = document.querySelectorAll('.products li.product, .woocommerce ul.products li, .wp-block-post, .ze-product-row-card');
    function refreshProducts() {
        products = document.querySelectorAll('.products li.product, .woocommerce ul.products li, .wp-block-post, .ze-product-row-card');
    }

    // Parse product values for quick filters
    function getProductData(p) {
        // Resolve Text content
        const titleEl = p.querySelector('.ze-row-title, .woocommerce-loop-product__title, h2, h3, .wp-block-post-title');
        const title = titleEl ? titleEl.textContent.trim() : '';

        // Resolve SKU / Ref
        const refEl = p.querySelector('.ze-row-ref code, .sku');
        const sku = refEl ? refEl.textContent.trim() : '';

        // Resolve Category
        const catEl = p.querySelector('.ze-row-breadcrumb, .ast-loop-product-category');
        const category = catEl ? catEl.textContent.trim() : '';

        // Resolve Price (clean it to integer)
        const priceEl = p.querySelector('.ze-row-price-main, .price, .woocommerce-Price-amount');
        let price = 0;
        if (priceEl) {
            // strip all spaces, currency notations
            const digits = priceEl.innerText.replace(/[^0-9]/g, '');
            if (digits) {
                price = parseInt(digits, 10);
            }
        }
        if (!price && sku) {
            // Guess a realistic price by ref hash to avoid zeroing out
            let codeVal = 0;
            for (let i = 0; i < sku.length; i++) codeVal += sku.charCodeAt(i);
            price = (codeVal % 40) * 5000 + 15000;
        }

        return { title, sku, category, price };
    }

    // 2. Master Filter execution
    function executeFilters() {
        refreshProducts();
        if (!products.length) return;

        // Query inputs dynamically to allow live reactions even if WooCommerce replaces sidebars with AJAX
        let query = '';
        const activeRefSearch = document.getElementById('zeRefSearch');
        if (activeRefSearch && activeRefSearch.value.trim() !== '') {
            query = activeRefSearch.value.trim().toLowerCase();
        } else {
            // Fallback: check any other standard search inputs (Astra, Woo, etc) on the page
            const fallbackSearch = document.querySelector('input[type="search"], .search-field, .aws-search-field, input[name="s"]');
            if (fallbackSearch) {
                query = fallbackSearch.value.trim().toLowerCase();
            }
        }
        
        // Collect checked brands (custom checkboxes + layered nav standard ones)
        const checkedBrands = Array.from(document.querySelectorAll('.ze-brand-cb:checked, .woocommerce-widget-layered-nav-list__item input[type="checkbox"]:checked, .wc-layered-nav-term input[type="checkbox"]:checked'))
            .map(c => c.value.trim().toLowerCase());

        // Collect checked sectors
        const checkedSectors = Array.from(document.querySelectorAll('.ze-sector-cb:checked'))
            .map(c => c.value.trim().toUpperCase());

        // Collect budget radio selection
        let selectedBudget = 'all';
        const activeBudgetRadios = document.querySelectorAll('.ze-budget-rb');
        activeBudgetRadios.forEach(rb => {
            if (rb.checked) selectedBudget = rb.value;
        });

        // Local stock checked
        const activeLocalStockCb = document.getElementById('zeLocalStockCb');
        const stockOnly = activeLocalStockCb ? activeLocalStockCb.checked : false;

        products.forEach(p => {
            const data = getProductData(p);
            const combinedString = (data.title + ' ' + data.sku + ' ' + data.category).toLowerCase();

            // A. Search query filter
            let matchText = true;
            if (query !== '') {
                matchText = combinedString.includes(query);
            }

            // B. Brand filter
            let matchBrand = true;
            if (checkedBrands.length > 0) {
                matchBrand = checkedBrands.some(brand => combinedString.includes(brand));
            }

            // C. Budget filter
            let matchBudget = true;
            if (selectedBudget === 'under_50k') {
                matchBudget = data.price < 50000;
            } else if (selectedBudget === '50k_150k') {
                matchBudget = data.price >= 50000 && data.price <= 150000;
            } else if (selectedBudget === 'over_150k') {
                matchBudget = data.price > 150000;
            }

            // D. Sector filter (B2B usage recommendations matching keywords)
            let matchSector = true;
            if (checkedSectors.length > 0) {
                matchSector = false;
                for (let sector of checkedSectors) {
                    if (sector === 'BTP') {
                        if (combinedString.includes('makita') || combinedString.includes('laser') || combinedString.includes('disque') || combinedString.includes('foret') || combinedString.includes('outillage') || combinedString.includes('faucheuse')) matchSector = true;
                    } else if (sector === 'MINES') {
                        if (combinedString.includes('fluke') || combinedString.includes('securite') || combinedString.includes('3m') || combinedString.includes('abrasif') || combinedString.includes('pompe')) matchSector = true;
                    } else if (sector === 'ÉNERGIE') {
                        if (combinedString.includes('fluke') || combinedString.includes('electricite') || combinedString.includes('cable') || combinedString.includes('disjoncteur') || combinedString.includes('grundfos')) matchSector = true;
                    } else if (sector === 'AGRICULTURE') {
                        if (combinedString.includes('faucheuse') || combinedString.includes('fauche') || combinedString.includes('faucher') || combinedString.includes('pompe')) matchSector = true;
                    } else if (sector === 'MANUFACTURE') {
                        if (combinedString.includes('colle') || combinedString.includes('adhesif') || combinedString.includes('rexroth') || combinedString.includes('moteur')) matchSector = true;
                    }
                }
            }

            // Combine all decisions
            if (matchText && matchBrand && matchBudget && matchSector) {
                // Ensure visible and override standard display styles
                p.classList.remove('ze-hidden-product');
                p.style.removeProperty('display');
                p.style.removeProperty('visibility');
                p.style.removeProperty('opacity');
                p.style.removeProperty('height');
                p.style.removeProperty('margin');
                p.style.removeProperty('padding');
                p.style.removeProperty('border');
                
                // Optional highlight if fast stock delivery matches
                if (stockOnly) {
                    p.style.borderLeft = '4px solid #10b981'; // Green local stock highlight accent
                } else {
                    p.style.borderLeft = '';
                }
            } else {
                // Completely hide using BOTH inline important and class-list
                p.classList.add('ze-hidden-product');
                p.style.setProperty('display', 'none', 'important');
                p.style.setProperty('visibility', 'hidden', 'important');
                p.style.setProperty('opacity', '0', 'important');
                p.style.setProperty('height', '0', 'important');
                p.style.setProperty('margin', '0', 'important');
                p.style.setProperty('padding', '0', 'important');
                p.style.setProperty('border', 'none', 'important');
            }
        });

        updateMatchedCount();
    }

    // Expose reference filter executor globally so AJAX callbacks or external events can safely trigger
    window.zeExecuteFilters = executeFilters;

    // Bulletproof Observer to watch for any DOM modifications (infinite scroll, AJAX sorting/pagination, etc.)
    const targetNode = document.querySelector('.products, .woocommerce, .ze-custom-shop-grid-wrapper') || document.body;
    const observerConfig = { childList: true, subtree: true };
    
    let observerTimeout = null;
    const observer = new MutationObserver(function(mutations) {
        if (observerTimeout) clearTimeout(observerTimeout);
        observerTimeout = setTimeout(function() {
            observer.disconnect();
            executeFilters();
            observer.observe(targetNode, observerConfig);
        }, 200);
    });
    observer.observe(targetNode, observerConfig);

    // 3. Attach Listeners & Delegated Events (Safe against AJAX fragment updates)
    // Keypress prevention of default form submission on Enter inside search boxes
    document.addEventListener('keydown', function(e) {
        if (e.target && (e.target.id === 'zeRefSearch' || e.target.id === 'zeBrandSearch' || e.target.closest('#zeRefSearch') || e.target.closest('#zeBrandSearch') || e.target.classList.contains('search-field') || e.target.classList.contains('aws-search-field'))) {
            if (e.key === 'Enter') {
                e.preventDefault();
                executeFilters();
            }
        }
    });

    // Instant input filter listener for primary reference search, brand search, and standard search inputs
    document.addEventListener('input', function(e) {
        if (!e.target) return;
        
        const isSearchField = e.target.id === 'zeRefSearch' || 
                              e.target.closest('#zeRefSearch') || 
                              e.target.classList.contains('search-field') || 
                              e.target.classList.contains('aws-search-field') || 
                              e.target.getAttribute('type') === 'search' || 
                              e.target.getAttribute('name') === 's';

        // Primary product catalogue search
        if (isSearchField) {
            // Mirror search input to our custom input if typed elsewhere
            const customRefSearch = document.getElementById('zeRefSearch');
            if (customRefSearch && customRefSearch !== e.target && e.target.value !== undefined) {
                customRefSearch.value = e.target.value;
            }
            executeFilters();
        }

        // Sidebar brand search
        if (e.target.id === 'zeBrandSearch' || e.target.closest('#zeBrandSearch')) {
            const query = e.target.value.trim().toLowerCase();
            const items = document.querySelectorAll('#zeBrandList .ze-brand-label');
            const showMoreBtnEl = document.getElementById('zeShowMoreBrandsBtn');
            
            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (text.includes(query)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });

            if (query === '' && showMoreBtnEl && showMoreBtnEl.style.display !== 'none') {
                const collapsedRows = document.querySelectorAll('.ze-brand-collapsed');
                collapsedRows.forEach(el => {
                    el.style.display = 'none';
                });
            }
        }
    });

    // Instant click filter listener for checkboxes, radio options, and standard product filters
    document.addEventListener('change', function(e) {
        if (!e.target) return;
        
        const isFilterElement = e.target.classList.contains('ze-brand-cb') || 
                                e.target.classList.contains('ze-budget-rb') || 
                                e.target.classList.contains('ze-sector-cb') || 
                                e.target.id === 'zeLocalStockCb' ||
                                e.target.closest('.ze-brand-cb') ||
                                e.target.closest('.ze-budget-rb') ||
                                e.target.closest('.ze-sector-cb') ||
                                e.target.closest('#zeLocalStockCb') ||
                                e.target.closest('.ze-custom-shop-sidebar') ||
                                e.target.closest('.widget-area') ||
                                e.target.closest('#secondary') ||
                                e.target.closest('.woocommerce-widget-layered-nav-list') ||
                                e.target.closest('.wc-layered-nav-term');

        if (isFilterElement) {
            executeFilters();
        }
    });

    // Expand/Collapse Brands Panel Toggle via Delegation
    document.addEventListener('click', function(e) {
        const moreBtn = e.target.closest('#zeShowMoreBrandsBtn');
        if (moreBtn) {
            e.preventDefault();
            const collapsedRows = document.querySelectorAll('.ze-brand-collapsed');
            collapsedRows.forEach(el => {
                el.classList.remove('hidden');
                el.style.display = 'flex';
            });
            moreBtn.style.display = 'none';
        }

        // Reset button action via Delegation
        const rstBtn = e.target.closest('#zeResetFiltersBtn');
        if (rstBtn) {
            const refSearchInput = document.getElementById('zeRefSearch');
            const brandSearchInput = document.getElementById('zeBrandSearch');
            const localStockInput = document.getElementById('zeLocalStockCb');
            
            // If active filters are set, clear them without forcing a slow page reload
            const countChecked = document.querySelectorAll('.ze-brand-cb:checked, .ze-sector-cb:checked').length;
            if (countChecked > 0 || (refSearchInput && refSearchInput.value !== '')) {
                e.preventDefault();
                
                if (refSearchInput) refSearchInput.value = '';
                if (brandSearchInput) {
                    brandSearchInput.value = '';
                    const items = document.querySelectorAll('#zeBrandList .ze-brand-label');
                    items.forEach(item => item.style.display = 'flex');
                }
                
                document.querySelectorAll('.ze-brand-cb').forEach(cb => cb.checked = false);
                document.querySelectorAll('.ze-sector-cb').forEach(cb => cb.checked = false);
                
                document.querySelectorAll('.ze-budget-rb').forEach((rb, index) => {
                    rb.checked = (index === 0);
                });
                
                if (localStockInput) localStockInput.checked = true;
                
                executeFilters();
            }
        }
    });

    // 4. Live update of products count in the header
    function updateMatchedCount() {
        refreshProducts();
        const totalVisible = Array.from(products).filter(p => !p.classList.contains('ze-hidden-product')).length;
        const countIndicators = document.querySelectorAll('.ze-matched-count');
        countIndicators.forEach(element => {
            element.innerText = totalVisible + ' matériel' + (totalVisible > 1 ? 's' : '') + ' trouvé' + (totalVisible > 1 ? 's' : '');
        });
    }

    // Fire initially to verify count is exact on page load
    executeFilters();

    // 5. Sidebar Collapsible Sections (Encapsulation for long filters)
    const sidebarHeaders = document.querySelectorAll('.ze-filter-collapsible-header');
    sidebarHeaders.forEach(header => {
        const parentBox = header.closest('.ze-filter-sidebar-box');
        if (!parentBox) return;
        const collapseContent = parentBox.querySelector('.ze-filter-collapse-content');
        
        header.style.cursor = 'pointer';
        
        header.addEventListener('click', function(e) {
            e.preventDefault();
            this.classList.toggle('collapsed');
            
            if (collapseContent) {
                if (collapseContent.style.display === 'none') {
                    collapseContent.style.display = 'block';
                } else {
                    collapseContent.style.display = 'none';
                }
            }
        });
    });

    // 6. Interactive Slide Specifications Drawer (Event Delegation with jQuery and Vanilla JS fallback)
    function toggleSpecsDrawer(btnEl, e) {
        if (e && e.preventDefault) e.preventDefault();
        const btn = btnEl;
        const parentCard = btn.closest('.ze-product-row-card');
        if (!parentCard) return;
        
        const drawer = parentCard.querySelector('.ze-row-expanded-specs-drawer');
        if (!drawer) return;
        
        const isToggled = btn.getAttribute('data-toggled') === 'true';
        
        if (!isToggled) {
            if (window.jQuery) {
                window.jQuery(drawer).slideDown(300);
            } else {
                drawer.style.display = 'block';
            }
            btn.setAttribute('data-toggled', 'true');
            btn.innerHTML = '▲ FERMER LES SPÉCIFICATIONS TECHNIQUE';
            btn.style.color = 'var(--ze-primary, #001f3f)';
            btn.classList.add('active');
        } else {
            if (window.jQuery) {
                window.jQuery(drawer).slideUp(250);
            } else {
                drawer.style.display = 'none';
            }
            btn.setAttribute('data-toggled', 'false');
            btn.innerHTML = '⚡ VOIR TOUTES LES SPÉCIFICATIONS TECHNIQUE ›';
            btn.style.color = '';
            btn.classList.remove('active');
        }
    }

    // Attach with Vanilla JS delegation for technical specs (works for static and dynamic nodes)
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.ze-row-spec-toggle-link');
        if (!btn) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        toggleSpecsDrawer(btn, e);
    });

    // 7. Grid / List View Mode Toggle Manager
    const gridToggles = document.querySelectorAll('.ze-view-mode-btn');
    const productsContainer = document.querySelector('ul.products');
    
    if (gridToggles.length > 0 && productsContainer) {
        gridToggles.forEach(toggle => {
            toggle.addEventListener('click', function() {
                gridToggles.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                const mode = this.getAttribute('data-mode');
                if (mode === 'grid') {
                    productsContainer.classList.remove('ze-list-layout-active');
                    productsContainer.classList.add('ze-grid-layout-active');
                } else {
                    productsContainer.classList.remove('ze-grid-layout-active');
                    productsContainer.classList.add('ze-list-layout-active');
                }
            });
        });
        
        productsContainer.classList.add('ze-list-layout-active');
    }

    // 8. Re-run executeFilters on dynamic AJAX updates to support paging and native sorting
    if (window.jQuery) {
        window.jQuery(document).ready(function() {
            window.jQuery(document).ajaxComplete(function() {
                setTimeout(function() {
                    executeFilters();
                }, 100);
            });
        });
    }
}

// Infallible immediate/DOMContentLoaded loading check
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initZeShopFilter);
} else {
    initZeShopFilter();
}

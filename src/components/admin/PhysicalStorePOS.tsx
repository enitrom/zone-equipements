import React, { useState, useEffect, useMemo } from 'react';
import {
  Store, ShoppingBag, Package, FileText, Search, Plus, Minus, Trash2,
  Wifi, WifiOff, RefreshCw, CheckCircle2, AlertTriangle, Printer,
  DollarSign, ArrowUpRight, ArrowDownRight, Download, User, Building2,
  Phone, CreditCard, Layers, Edit3, Check, X, Sparkles, Archive, ShieldCheck
} from 'lucide-react';
import { catalogService, ExtendedProduct as Product, Order, OrderItem } from '../../services/catalogService';
import { siteSettingsService } from '../../services/siteSettingsService';

export interface StockMovementRecord {
  id: string;
  timestamp: string;
  productId: string | number;
  productName: string;
  sku: string;
  type: 'SALE' | 'RESTOCK' | 'ADJUSTMENT' | 'NEW_ITEM';
  quantityDelta: number;
  stockBefore: number;
  stockAfter: number;
  reason: string;
  referenceDoc?: string;
  synced: boolean;
}

export interface OfflineSyncOperation {
  id: string;
  timestamp: string;
  kind: 'CREATE_ORDER' | 'UPDATE_PRODUCT_STOCK' | 'CREATE_PRODUCT';
  payload: any;
}

interface PosCartLine {
  id: string;
  productId: number;
  name: string;
  sku: string;
  brand: string;
  unitPriceHT: number;
  quantity: number;
  maxStock?: number;
  imageUrl?: string;
  isCustom?: boolean;
}

const STORAGE_KEYS = {
  LOCAL_STOCK_MAP: 'ze_pos_local_stock_map_v1',
  LOCAL_SHELF_MAP: 'ze_pos_local_shelf_map_v1',
  LOCAL_MIN_ALERT_MAP: 'ze_pos_local_min_alert_map_v1',
  STOCK_MOVEMENTS: 'ze_pos_stock_movements_v1',
  OFFLINE_QUEUE: 'ze_pos_sync_queue_v1',
  LOCAL_PRODUCTS_CACHE: 'ze_pos_local_products_v1',
  LOCAL_INVOICES_CACHE: 'ze_pos_local_invoices_v1'
};

interface PhysicalStorePOSProps {
  onNotify?: (msg: string) => void;
  onRefreshParent?: () => void;
}

export const PhysicalStorePOS: React.FC<PhysicalStorePOSProps> = ({
  onNotify,
  onRefreshParent
}) => {
  const settings = siteSettingsService.getSettings();

  // Sub-navigation inside the Physical Store tab
  const [subTab, setSubTab] = useState<'pos' | 'stock' | 'invoices' | 'z_caisse'>('pos');

  // Online / Offline & Sync Queue state
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncQueue, setSyncQueue] = useState<OfflineSyncOperation[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Local Stock Metadata (Shelf location & Minimum alert thresholds)
  const [shelfMap, setShelfMap] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_SHELF_MAP);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [minAlertMap, setMinAlertMap] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_MIN_ALERT_MAP);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [stockMovements, setStockMovements] = useState<StockMovementRecord[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.STOCK_MOVEMENTS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Products & Orders state (backed by local cache so offline refresh works 100%)
  const [products, setProducts] = useState<Product[]>(() => {
    const live = catalogService.getProducts();
    if (live && live.length > 0) return live;
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.LOCAL_PRODUCTS_CACHE);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const live = catalogService.getOrders();
    if (live && live.length > 0) return live;
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.LOCAL_INVOICES_CACHE);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  // POS Cart & Billing State
  const [posSearch, setPosSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [cartLines, setCartLines] = useState<PosCartLine[]>([]);
  const [docType, setDocType] = useState<'invoice' | 'quote'>('invoice');
  const [paymentStatus, setPaymentStatus] = useState<'Payé' | 'Non payé' | 'Acompte'>('Payé');
  const [applyVat, setApplyVat] = useState<boolean>(settings.applyVatByDefault ?? true);
  const [discountAmountFCFA, setDiscountAmountFCFA] = useState<number>(0);

  // Customer Info
  const [isQuickCounterClient, setIsQuickCounterClient] = useState<boolean>(true);
  const [customerName, setCustomerName] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerNinea, setCustomerNinea] = useState('');
  const [customerAddress, setCustomerAddress] = useState('Achat au Comptoir — Magasin Dakar');
  const [notes, setNotes] = useState('');

  // Payment & Cash Drawer Calculator
  const [paymentMethod, setPaymentMethod] = useState<'Espèces (Cash)' | 'Wave' | 'Orange Money' | 'Virement Bancaire B2B' | 'Chèque' | 'Crédit / Acompte B2B'>('Espèces (Cash)');
  const [amountReceivedInput, setAmountReceivedInput] = useState<string>('');

  // Quick Custom Line in POS
  const [showCustomLineRow, setShowCustomLineRow] = useState(false);
  const [customLineName, setCustomLineName] = useState('');
  const [customLineBrand, setCustomLineBrand] = useState('Standard / Atelier');
  const [customLinePrice, setCustomLinePrice] = useState('');
  const [customLineQty, setCustomLineQty] = useState('1');
  const [customLineVat, setCustomLineVat] = useState(true);

  // Stock Management Tab State
  const [stockSearch, setStockSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');
  const [restockModalProduct, setRestockModalProduct] = useState<Product | null>(null);
  const [restockMode, setRestockMode] = useState<'ADD' | 'REMOVE' | 'SET'>('ADD');
  const [restockQty, setRestockQty] = useState<string>('10');
  const [restockReason, setRestockReason] = useState<string>('Arrivage magasin / Réapprovisionnement');
  const [restockShelf, setRestockShelf] = useState<string>('');

  // Quick New Physical Product Modal
  const [showQuickNewProductModal, setShowQuickNewProductModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdBrand, setNewProdBrand] = useState('');
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Outillage & Maintenance');
  const [newProdPriceHT, setNewProdPriceHT] = useState('');
  const [newProdInitialStock, setNewProdInitialStock] = useState('10');
  const [newProdShelf, setNewProdShelf] = useState('Rayon A1');

  // Receipt / Print Preview Modal
  const [printedOrder, setPrintedOrder] = useState<Order | null>(null);
  const [printFormat, setPrintFormat] = useState<'A4' | 'TICKET_80MM'>('A4');

  // Invoices Tab Filter
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'ALL' | 'PAID' | 'CREDIT' | 'QUOTE'>('ALL');

  const notify = (msg: string) => {
    if (onNotify) onNotify(msg);
  };

  // Persist helper functions
  const saveSyncQueue = (queue: OfflineSyncOperation[]) => {
    setSyncQueue(queue);
    try {
      localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    } catch {}
  };

  const saveStockMovements = (movements: StockMovementRecord[]) => {
    const trimmed = movements.slice(0, 500);
    setStockMovements(trimmed);
    try {
      localStorage.setItem(STORAGE_KEYS.STOCK_MOVEMENTS, JSON.stringify(trimmed));
    } catch {}
  };

  const saveShelfLocation = (productId: string | number, shelf: string) => {
    const next = { ...shelfMap, [String(productId)]: shelf };
    setShelfMap(next);
    try {
      localStorage.setItem(STORAGE_KEYS.LOCAL_SHELF_MAP, JSON.stringify(next));
    } catch {}
  };

  const saveMinAlert = (productId: string | number, minVal: number) => {
    const next = { ...minAlertMap, [String(productId)]: Math.max(0, minVal) };
    setMinAlertMap(next);
    try {
      localStorage.setItem(STORAGE_KEYS.LOCAL_MIN_ALERT_MAP, JSON.stringify(next));
    } catch {}
  };

  // Sync catalog & orders from catalogService
  const refreshFromService = () => {
    const liveProducts = catalogService.getProducts();
    const liveOrders = catalogService.getOrders();

    // Apply any local overrides if offline queue has pending stock updates
    let localStockOverrides: Record<string, number> = {};
    try {
      const rawMap = localStorage.getItem(STORAGE_KEYS.LOCAL_STOCK_MAP);
      if (rawMap) localStockOverrides = JSON.parse(rawMap);
    } catch {}

    const mergedProducts = liveProducts.map(p => {
      const localStock = localStockOverrides[p.id];
      if (typeof localStock === 'number') {
        return {
          ...p,
          stockQuantity: localStock,
          stockStatus: localStock > 0 ? 'IN_STOCK_DAKAR' : p.stockStatus
        } as Product;
      }
      return p;
    });

    setProducts(mergedProducts);
    setOrders(liveOrders);

    try {
      localStorage.setItem(STORAGE_KEYS.LOCAL_PRODUCTS_CACHE, JSON.stringify(mergedProducts));
      localStorage.setItem(STORAGE_KEYS.LOCAL_INVOICES_CACHE, JSON.stringify(liveOrders.slice(0, 200)));
    } catch {}
  };

  useEffect(() => {
    refreshFromService();
    const unsub = catalogService.subscribe(refreshFromService);
    window.addEventListener('ze_orders_updated', refreshFromService);
    return () => {
      unsub();
      window.removeEventListener('ze_orders_updated', refreshFromService);
    };
  }, []);

  // Synchronize pending offline operations when back online
  const processOfflineQueue = async () => {
    if (!navigator.onLine) {
      notify('Toujours hors-ligne. Vos opérations restent sauvegardées localement.');
      return;
    }
    let currentQueue: OfflineSyncOperation[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      currentQueue = raw ? JSON.parse(raw) : [];
    } catch {
      currentQueue = [...syncQueue];
    }

    if (currentQueue.length === 0) {
      refreshFromService();
      return;
    }

    setIsSyncing(true);
    try {
      for (const op of currentQueue) {
        if (op.kind === 'UPDATE_PRODUCT_STOCK') {
          const { productId, stockQuantity } = op.payload;
          catalogService.updateProduct(productId, {
            stockQuantity,
            stockStatus: stockQuantity > 0 ? 'IN_STOCK_DAKAR' : 'ON_ORDER_ASIA'
          });
        } else if (op.kind === 'CREATE_ORDER') {
          const existing = catalogService.getOrders().some(o => o.orderNumber === op.payload.orderNumber);
          if (!existing) {
            catalogService.addOrder(op.payload);
          }
        } else if (op.kind === 'CREATE_PRODUCT') {
          const existingProd = catalogService.getProducts().some(p => p.ref === op.payload.ref);
          if (!existingProd) {
            catalogService.addProduct(op.payload);
          }
        }
      }

      // Clear offline queue & mark movements as synced
      saveSyncQueue([]);
      const updatedMovements = stockMovements.map(m => ({ ...m, synced: true }));
      saveStockMovements(updatedMovements);
      refreshFromService();
      if (onRefreshParent) onRefreshParent();
      notify(`Synchronisation Cloud terminée (${currentQueue.length} opération(s) synchronisée(s)).`);
    } catch (err) {
      console.warn('Offline queue sync warning:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      notify('Connexion Internet rétablie — Synchronisation automatique du stock et des factures...');
      processOfflineQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      notify('Mode Hors-Ligne activé : La caisse et le stock local continuent de fonctionner normalement.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncQueue, stockMovements]);

  // Helper to get effective physical stock quantity of a product
  const getProductPhysicalStock = (p: Product): number => {
    try {
      const rawMap = localStorage.getItem(STORAGE_KEYS.LOCAL_STOCK_MAP);
      if (rawMap) {
        const parsed = JSON.parse(rawMap);
        if (typeof parsed[p.id] === 'number') return Math.max(0, parsed[p.id]);
      }
    } catch {}
    if (typeof p.stockQuantity === 'number') return Math.max(0, p.stockQuantity);
    return p.stockStatus === 'IN_STOCK_DAKAR' ? 10 : 0;
  };

  // Update physical stock both locally and in Firestore (or queue if offline)
  const updatePhysicalStock = (
    product: Product,
    newStockQty: number,
    movementType: StockMovementRecord['type'],
    reason: string,
    referenceDoc?: string
  ) => {
    const cleanQty = Math.max(0, Math.round(newStockQty));
    const beforeQty = getProductPhysicalStock(product);
    const delta = cleanQty - beforeQty;

    // 1. Save immediately in local stock map
    try {
      const rawMap = localStorage.getItem(STORAGE_KEYS.LOCAL_STOCK_MAP);
      const map = rawMap ? JSON.parse(rawMap) : {};
      map[product.id] = cleanQty;
      localStorage.setItem(STORAGE_KEYS.LOCAL_STOCK_MAP, JSON.stringify(map));
    } catch {}

    // 2. Update local state immediately
    setProducts(prev => {
      const next = prev.map(item =>
        item.id === product.id
          ? { ...item, stockQuantity: cleanQty, stockStatus: cleanQty > 0 ? 'IN_STOCK_DAKAR' : item.stockStatus }
          : item
      );
      try {
        localStorage.setItem(STORAGE_KEYS.LOCAL_PRODUCTS_CACHE, JSON.stringify(next));
      } catch {}
      return next;
    });

    // 3. Record traceable movement
    const movement: StockMovementRecord = {
      id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      productId: product.id,
      productName: product.name,
      sku: String(product.ref || product.id),
      type: movementType,
      quantityDelta: delta,
      stockBefore: beforeQty,
      stockAfter: cleanQty,
      reason,
      referenceDoc,
      synced: isOnline
    };
    saveStockMovements([movement, ...stockMovements]);

    // 4. Push to catalogService / Firestore or queue if offline
    catalogService.updateProduct(product.id, {
      stockQuantity: cleanQty,
      stockStatus: cleanQty > 0 ? 'IN_STOCK_DAKAR' : product.stockStatus
    });

    if (!isOnline) {
      const op: OfflineSyncOperation = {
        id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        kind: 'UPDATE_PRODUCT_STOCK',
        payload: { productId: product.id, stockQuantity: cleanQty }
      };
      saveSyncQueue([...syncQueue, op]);
    }
  };

  // Categories list for filter
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [products]);

  // Filtered products for POS grid
  const filteredPosProducts = useMemo(() => {
    const q = posSearch.trim().toLowerCase();
    return products.filter(p => {
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
      const stock = getProductPhysicalStock(p);
      if (onlyInStock && stock <= 0) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.ref || '').toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      );
    });
  }, [products, posSearch, selectedCategory, onlyInStock]);

  // Filtered products for Stock Management tab
  const filteredStockProducts = useMemo(() => {
    const q = stockSearch.trim().toLowerCase();
    return products.filter(p => {
      const stock = getProductPhysicalStock(p);
      const minAlert = minAlertMap[p.id] ?? 3;
      if (stockFilter === 'OUT' && stock > 0) return false;
      if (stockFilter === 'LOW' && (stock <= 0 || stock > minAlert)) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.ref || '').toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q) ||
        (shelfMap[p.id] || '').toLowerCase().includes(q)
      );
    });
  }, [products, stockSearch, stockFilter, minAlertMap, shelfMap]);

  // Add product to POS cart
  const handleAddToCart = (product: Product) => {
    const stock = getProductPhysicalStock(product);
    setCartLines(prev => {
      const existing = prev.find(l => l.productId === product.id);
      if (existing) {
        return prev.map(l =>
          l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [
        ...prev,
        {
          id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          productId: product.id,
          name: product.name,
          sku: product.ref || 'REF-MAG',
          brand: product.brand || 'ZONE ÉQUIPEMENTS',
          unitPriceHT: product.price,
          quantity: 1,
          maxStock: stock,
          imageUrl: product.img || product.image || product.imageUrl
        }
      ];
    });
  };

  const handleAddCustomLineToCart = () => {
    const price = parseFloat(customLinePrice) || 0;
    const qty = Math.max(1, parseInt(customLineQty, 10) || 1);
    if (!customLineName.trim() || price <= 0) {
      notify('Veuillez saisir une désignation et un prix HT valide.');
      return;
    }
    setCartLines(prev => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        productId: Date.now(),
        name: customLineName.trim(),
        sku: `DIR-${Date.now().toString().slice(-4)}`,
        brand: customLineBrand.trim() || 'Atelier Magasin',
        unitPriceHT: price,
        quantity: qty,
        isCustom: true
      }
    ]);
    setCustomLineName('');
    setCustomLineBrand('Standard / Atelier');
    setCustomLinePrice('');
    setCustomLineQty('1');
    setShowCustomLineRow(false);
  };

  // Financial calculations for POS cart
  const grossSubtotalHT = useMemo(() => {
    return cartLines.reduce((acc, l) => acc + l.unitPriceHT * l.quantity, 0);
  }, [cartLines]);

  const netSubtotalHT = Math.max(0, grossSubtotalHT - Math.max(0, discountAmountFCFA));
  const vatRateDecimal = applyVat ? (settings.defaultVatRate || 0.18) : 0;
  const vatAmount = Math.round(netSubtotalHT * vatRateDecimal);
  const grandTotalTTC = Math.round(netSubtotalHT + vatAmount);

  const numericAmountReceived = parseFloat(amountReceivedInput) || 0;
  const changeToReturn = numericAmountReceived > grandTotalTTC ? numericAmountReceived - grandTotalTTC : 0;
  const remainingCreditBalance =
    (paymentMethod === 'Crédit / Acompte B2B' || paymentStatus === 'Acompte') && numericAmountReceived < grandTotalTTC
      ? grandTotalTTC - numericAmountReceived
      : paymentStatus === 'Non payé'
        ? grandTotalTTC
        : 0;

  // Complete Sale / Issue Counter Invoice & Deduct Physical Stock
  const handleFinalizeSale = () => {
    if (cartLines.length === 0) {
      notify('Veuillez ajouter au moins un équipement au ticket de caisse.');
      return;
    }

    const finalClientName = isQuickCounterClient
      ? (customerName.trim() || 'Client Comptoir Magasin')
      : (customerName.trim() || customerCompany.trim() || 'Client B2B Magasin');

    const now = new Date();
    const dateStamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = docType === 'invoice' ? `FAC-MAG-${dateStamp}-${randSuffix}` : `DEV-MAG-${dateStamp}-${randSuffix}`;

    const orderItems: OrderItem[] = cartLines.map(line => ({
      productId: line.productId,
      name: line.name,
      sku: line.sku,
      brand: line.brand,
      quantity: line.quantity,
      price: line.unitPriceHT,
      unitPriceHT: line.unitPriceHT,
      priceHT: line.unitPriceHT,
      totalHT: line.unitPriceHT * line.quantity,
      vatRate: vatRateDecimal,
      stockStatus: 'IN_STOCK_DAKAR',
      selectedShipping: 'local',
      imageUrl: line.imageUrl || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=400'
    }));

    const isCredit = (paymentMethod === 'Crédit / Acompte B2B' || paymentStatus === 'Acompte') && remainingCreditBalance > 0;
    const isUnpaid = paymentStatus === 'Non payé';

    let resolvedPaymentStatus: Order['paymentStatus'] = 'Payé intégralement';
    let resolvedOrderStatus: Order['status'] = 'Livrée';
    let paidAmount = grandTotalTTC;
    let dueAmount = 0;

    if (docType === 'quote') {
      resolvedPaymentStatus = 'Non payé';
      resolvedOrderStatus = 'En attente';
      paidAmount = 0;
      dueAmount = grandTotalTTC;
    } else if (isUnpaid) {
      resolvedPaymentStatus = 'Non payé';
      resolvedOrderStatus = 'En attente';
      paidAmount = 0;
      dueAmount = grandTotalTTC;
    } else if (isCredit) {
      resolvedPaymentStatus = 'Acompte 30% versé';
      resolvedOrderStatus = 'En cours';
      paidAmount = numericAmountReceived;
      dueAmount = remainingCreditBalance;
    } else {
      resolvedPaymentStatus = 'Payé intégralement';
      resolvedOrderStatus = 'Livrée';
      paidAmount = grandTotalTTC;
      dueAmount = 0;
    }

    const fallbackEmail = `${(customerPhone || 'comptoir').replace(/[^a-zA-Z0-9]/g, '')}@zoneequipements.sn`;
    const finalEmail = customerEmail.trim() || fallbackEmail;

    const newOrderPayload: Partial<Order> = {
      orderNumber,
      customerName: finalClientName,
      customerCompany: customerCompany.trim() || (isQuickCounterClient ? undefined : 'Client Professionnel'),
      customerEmail: finalEmail,
      customerPhone: customerPhone.trim() || '+221 76 653 83 84',
      customerAddress: customerAddress.trim() || 'Achat Comptoir — Magasin Dakar',
      customerCity: 'Dakar (Magasin Physique)',
      customerCountry: 'Sénégal',
      ninea: customerNinea.trim() || undefined,
      items: orderItems,
      subtotalHT: netSubtotalHT,
      freightTotalHT: 0,
      vatAmount,
      totalTTC: grandTotalTTC,
      discountAmount: discountAmountFCFA > 0 ? discountAmountFCFA : undefined,
      paymentMethod: docType === 'quote' ? 'Devis Proforma Comptoir' : paymentMethod,
      paymentStatus: resolvedPaymentStatus,
      paymentChoice: isCredit ? 'deposit_30' : 'full_100',
      amountPaid: paidAmount,
      amountDue: dueAmount,
      status: resolvedOrderStatus,
      shippingMethod: 'LOCAL_DELIVERY',
      isQuote: docType === 'quote',
      ethicalContractAccepted: true,
      notes: `${notes.trim() ? `${notes.trim()} • ` : ''}Émis au Magasin Physique (${isOnline ? 'En ligne' : 'Mode Hors-Ligne'}) • Mode: ${paymentMethod}${
        changeToReturn > 0 ? ` • Reçu: ${numericAmountReceived.toLocaleString('fr-FR')} F / Monnaie rendue: ${changeToReturn.toLocaleString('fr-FR')} F` : ''
      }`
    };

    // 1. Deduct physical stock for each catalog item if it's an invoice
    if (docType === 'invoice') {
      cartLines.forEach(line => {
        if (!line.isCustom) {
          const prod = products.find(p => p.id === line.productId);
          if (prod) {
            const currentStock = getProductPhysicalStock(prod);
            const nextStock = Math.max(0, currentStock - line.quantity);
            updatePhysicalStock(
              prod,
              nextStock,
              'SALE',
              `Vente Magasin (${finalClientName})`,
              orderNumber
            );
          }
        }
      });
    }

    // 2. Save Order in catalogService & Offline Queue if needed
    const createdOrder = catalogService.addOrder(newOrderPayload);
    setOrders(prev => [createdOrder, ...prev]);

    // 3. Capture client email into newsletter / marketing list if provided
    if (customerEmail.trim()) {
      siteSettingsService.addNewsletterSubscriber(
        customerEmail.trim(),
        finalClientName,
        customerPhone.trim(),
        customerCompany.trim(),
        'facturation_directe'
      );
    }

    if (!isOnline) {
      const op: OfflineSyncOperation = {
        id: `op-ord-${Date.now()}`,
        timestamp: new Date().toISOString(),
        kind: 'CREATE_ORDER',
        payload: newOrderPayload
      };
      saveSyncQueue([...syncQueue, op]);
    }

    // 4. Reset POS cart & open Print/Receipt modal
    setCartLines([]);
    setDiscountAmountFCFA(0);
    setAmountReceivedInput('');
    setCustomerName('');
    setCustomerCompany('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerNinea('');
    setCustomerAddress('Achat au Comptoir — Magasin Dakar');
    setNotes('');
    setPrintedOrder(createdOrder);

    if (onRefreshParent) onRefreshParent();
    notify(
      docType === 'invoice'
        ? `Facture ${orderNumber} enregistrée et stock physique mis à jour !`
        : `Devis Comptoir ${orderNumber} généré avec succès !`
    );
  };

  // Handle Stock Restock / Adjustment Modal Submit
  const handleConfirmRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockModalProduct) return;

    const qtyNum = Math.max(0, parseInt(restockQty, 10) || 0);
    const currentStock = getProductPhysicalStock(restockModalProduct);

    let nextStock = currentStock;
    let movType: StockMovementRecord['type'] = 'RESTOCK';

    if (restockMode === 'ADD') {
      nextStock = currentStock + qtyNum;
      movType = 'RESTOCK';
    } else if (restockMode === 'REMOVE') {
      nextStock = Math.max(0, currentStock - qtyNum);
      movType = 'ADJUSTMENT';
    } else {
      nextStock = qtyNum;
      movType = 'ADJUSTMENT';
    }

    if (restockShelf.trim()) {
      saveShelfLocation(restockModalProduct.id, restockShelf.trim());
    }

    updatePhysicalStock(
      restockModalProduct,
      nextStock,
      movType,
      restockReason.trim() || 'Ajustement stock magasin'
    );

    notify(`Stock de "${restockModalProduct.name}" mis à jour : ${nextStock} unité(s).`);
    setRestockModalProduct(null);
  };

  // Quick Create Physical Product in Store
  const handleCreateQuickPhysicalProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(newProdPriceHT) || 0;
    const initialStock = Math.max(0, parseInt(newProdInitialStock, 10) || 0);
    if (!newProdName.trim() || price <= 0) {
      notify('Veuillez renseigner le nom du produit et son prix HT.');
      return;
    }

    const sku = newProdSku.trim().toUpperCase() || `MAG-${Math.floor(10000 + Math.random() * 90000)}`;
    const newProductPayload: Partial<Product> = {
      name: newProdName.trim(),
      brand: newProdBrand.trim() || 'ZONE ÉQUIPEMENTS',
      ref: sku,
      category: newProdCategory,
      price,
      supplierPrice: Math.round(price * 0.65),
      supplierCurrency: 'XOF',
      weight: '2.0 kg',
      stockStatus: 'IN_STOCK_DAKAR',
      stockQuantity: initialStock,
      inStock: true,
      availabilityMode: 'stock',
      img: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600',
      imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600',
      description: `Équipement disponible au magasin physique de Dakar (${newProdShelf || 'Rayon Principal'}).`,
      specs: {
        'Disponibilité': 'Stock Physique Magasin Dakar',
        'Emplacement Rayon': newProdShelf || 'Rayon A1',
        'Référence Interne': sku
      }
    };

    const created = catalogService.addProduct(newProductPayload);
    if (newProdShelf.trim()) {
      saveShelfLocation(created.id, newProdShelf.trim());
    }

    updatePhysicalStock(created, initialStock, 'NEW_ITEM', `Création article magasin (${newProdShelf})`);

    if (!isOnline) {
      saveSyncQueue([
        ...syncQueue,
        {
          id: `op-prod-${Date.now()}`,
          timestamp: new Date().toISOString(),
          kind: 'CREATE_PRODUCT',
          payload: newProductPayload
        }
      ]);
    }

    setNewProdName('');
    setNewProdBrand('');
    setNewProdSku('');
    setNewProdPriceHT('');
    setNewProdInitialStock('10');
    setShowQuickNewProductModal(false);
    refreshFromService();
    if (onRefreshParent) onRefreshParent();
    notify(`Article "${created.name}" ajouté au stock magasin (${initialStock} unités) !`);
  };

  // Print Receipt / Invoice (A4 or 80mm Thermal Receipt)
  const triggerPrintDocument = (order: Order, format: 'A4' | 'TICKET_80MM') => {
    const win = window.open('', '_blank', 'width=900,height=800');
    if (!win) {
      window.print();
      return;
    }

    const companyName = settings.companyName || 'ZONE ÉQUIPEMENTS SÉNÉGAL';
    const companyPhone = settings.companyPhone || '+221 76 653 83 84';
    const companyAddress = settings.companyAddress || 'Dakar, Sénégal';
    const rccm = settings.rccm || 'SN-DKR-2024-B-14892';
    const ninea = settings.ninea || '009482716 2G3';

    if (format === 'TICKET_80MM') {
      const htmlTicket = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8" />
          <title>Ticket ${order.orderNumber}</title>
          <style>
            @page { size: 80mm auto; margin: 4mm; }
            body { font-family: 'Courier New', monospace; width: 72mm; margin: 0 auto; color: #000; font-size: 12px; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; }
            td, th { padding: 3px 0; font-size: 11px; vertical-align: top; }
            .right { text-align: right; }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="bold" style="font-size: 15px;">${companyName}</div>
            <div>MAGASIN & COMPTOIR MRO</div>
            <div>${companyAddress}</div>
            <div>Tél: ${companyPhone}</div>
            <div>NINEA: ${ninea}</div>
          </div>
          <div class="divider"></div>
          <div><strong>${order.isQuote ? 'DEVIS PROFORMA' : 'TICKET DE CAISSE / FACTURE'}</strong></div>
          <div>N° : <strong>${order.orderNumber}</strong></div>
          <div>Date : ${new Date(order.createdAt).toLocaleString('fr-FR')}</div>
          <div>Client : ${order.customerName}</div>
          ${order.customerPhone ? `<div>Tél : ${order.customerPhone}</div>` : ''}
          <div class="divider"></div>
          <table>
            <thead>
              <tr>
                <th style="text-align:left;">Article</th>
                <th class="right">Qté</th>
                <th class="right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td class="right">${item.quantity}</td>
                  <td class="right">${((item.unitPriceHT || item.priceHT || 0) * item.quantity).toLocaleString('fr-FR')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="divider"></div>
          <table>
            <tr><td>Sous-total HT :</td><td class="right">${(order.subtotalHT || 0).toLocaleString('fr-FR')} F</td></tr>
            <tr><td>TVA (18%) :</td><td class="right">${(order.vatAmount || 0).toLocaleString('fr-FR')} F</td></tr>
            <tr class="bold" style="font-size:14px;"><td>TOTAL TTC :</td><td class="right">${(order.totalTTC || 0).toLocaleString('fr-FR')} FCFA</td></tr>
            <tr><td>Mode Règlement :</td><td class="right">${order.paymentMethod}</td></tr>
            <tr><td>Statut :</td><td class="right">${order.paymentStatus}</td></tr>
            ${order.amountDue && order.amountDue > 0 ? `<tr class="bold"><td>Reste à payer :</td><td class="right">${order.amountDue.toLocaleString('fr-FR')} FCFA</td></tr>` : ''}
          </table>
          <div class="divider"></div>
          <div class="center" style="font-size:10px; margin-top:8px;">
            Merci de votre confiance !<br/>
            Matériel vérifié au départ du magasin.
          </div>
          <script>window.onload = () => { window.print(); };</script>
        </body>
        </html>
      `;
      win.document.write(htmlTicket);
      win.document.close();
      return;
    }

    // Format A4 Officiel B2B
    const htmlA4 = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <title>${order.isQuote ? 'Devis' : 'Facture'} ${order.orderNumber}</title>
        <style>
          @page { size: A4; margin: 14mm; }
          body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; font-size: 12px; }
          .header { display: flex; justify-content: space-between; border-bottom: 3px solid #FF6600; padding-bottom: 14px; margin-bottom: 20px; }
          .brand { font-size: 22px; font-weight: 900; color: #003366; }
          .badge { display: inline-block; background: #FF6600; color: #fff; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 12px; margin-top: 4px; }
          .boxes { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 20px; }
          .box { flex: 1; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; background: #f8fafc; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #003366; color: #fff; text-align: left; padding: 9px; font-size: 11px; text-transform: uppercase; }
          td { padding: 9px; border-bottom: 1px solid #e2e8f0; }
          .right { text-align: right; }
          .totals { width: 280px; margin-left: auto; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; background: #f8fafc; }
          .total-row { display: flex; justify-content: space-between; padding: 4px 0; }
          .grand-total { font-size: 16px; font-weight: 900; color: #FF6600; border-top: 2px solid #cbd5e1; padding-top: 8px; margin-top: 6px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
          .sig-box { width: 45%; border: 1px dashed #94a3b8; border-radius: 8px; height: 90px; padding: 10px; font-weight: bold; color: #475569; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">${companyName}</div>
            <div>Magasin Physique & Distribution Industrielle MRO</div>
            <div>${companyAddress} • Tél : ${companyPhone}</div>
            <div>RCCM : ${rccm} • NINEA : ${ninea}</div>
          </div>
          <div style="text-align: right;">
            <div class="badge">${order.isQuote ? 'FACTURE PROFORMA / DEVIS' : 'FACTURE OFFICIELLE MAGASIN'}</div>
            <div style="font-size: 16px; font-weight: 900; margin-top: 6px;">N° ${order.orderNumber}</div>
            <div>Date : ${new Date(order.createdAt).toLocaleDateString('fr-FR')}</div>
          </div>
        </div>

        <div class="boxes">
          <div class="box">
            <strong>CLIENT / DESTINATAIRE :</strong><br/>
            <span style="font-size:14px; font-weight:bold;">${order.customerName}</span><br/>
            ${order.customerCompany ? `Société : ${order.customerCompany}<br/>` : ''}
            ${order.ninea ? `NINEA / RCCM : ${order.ninea}<br/>` : ''}
            Téléphone : ${order.customerPhone || 'Non spécifié'}<br/>
            Adresse : ${order.customerAddress || 'Achat Comptoir Dakar'}
          </div>
          <div class="box">
            <strong>INFORMATIONS DE RÈGLEMENT :</strong><br/>
            Mode de paiement : <strong>${order.paymentMethod}</strong><br/>
            Statut : <strong>${order.paymentStatus}</strong><br/>
            Montant encaissé : <strong>${(order.amountPaid ?? order.totalTTC ?? 0).toLocaleString('fr-FR')} FCFA</strong><br/>
            ${order.amountDue && order.amountDue > 0 ? `<span style="color:#dc2626;font-weight:bold;">Reste à payer : ${order.amountDue.toLocaleString('fr-FR')} FCFA</span>` : 'Solde : 0 FCFA (Acquitté)'}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Réf / SKU</th>
              <th>Désignation de l'Équipement</th>
              <th class="right">Prix Unit. HT</th>
              <th class="right">Qté</th>
              <th class="right">Total HT</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(item => {
              const uPrice = item.unitPriceHT || item.priceHT || 0;
              return `
                <tr>
                  <td style="font-family:monospace;">${item.sku || 'REF'}</td>
                  <td><strong>${item.name}</strong><br/><span style="font-size:10px;color:#64748b;">Marque: ${item.brand || 'OEM'}</span></td>
                  <td class="right">${uPrice.toLocaleString('fr-FR')} FCFA</td>
                  <td class="right">${item.quantity}</td>
                  <td class="right"><strong>${(uPrice * item.quantity).toLocaleString('fr-FR')} FCFA</strong></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row"><span>Sous-Total Net HT :</span><strong>${(order.subtotalHT || 0).toLocaleString('fr-FR')} FCFA</strong></div>
          <div class="total-row"><span>TVA (${order.vatAmount && order.vatAmount > 0 ? '18%' : 'Exonéré'}) :</span><strong>${(order.vatAmount || 0).toLocaleString('fr-FR')} FCFA</strong></div>
          <div class="total-row grand-total"><span>TOTAL TTC :</span><span>${(order.totalTTC || 0).toLocaleString('fr-FR')} FCFA</span></div>
        </div>

        <div class="signatures">
          <div class="sig-box">Pour le Client (Réception conforme du matériel) :</div>
          <div class="sig-box">Cachet & Signature ${companyName} :</div>
        </div>
        <script>window.onload = () => { window.print(); };</script>
      </body>
      </html>
    `;
    win.document.write(htmlA4);
    win.document.close();
  };

  // Stock & Daily Cash Register (Z de Caisse) Metrics
  const stockSummary = useMemo(() => {
    let totalUnits = 0;
    let totalValueHT = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    products.forEach(p => {
      const qty = getProductPhysicalStock(p);
      const minAlert = minAlertMap[p.id] ?? 3;
      totalUnits += qty;
      totalValueHT += qty * (p.price || 0);
      if (qty <= 0) outOfStockCount++;
      else if (qty <= minAlert) lowStockCount++;
    });

    return {
      totalSkus: products.length,
      totalUnits,
      totalValueHT,
      lowStockCount,
      outOfStockCount
    };
  }, [products, minAlertMap]);

  // Store invoices filter
  const storeInvoices = useMemo(() => {
    const q = invoiceSearch.trim().toLowerCase();
    return orders.filter(o => {
      if (invoiceStatusFilter === 'QUOTE' && !o.isQuote) return false;
      if (invoiceStatusFilter === 'PAID' && (o.isQuote || o.paymentStatus !== 'Payé intégralement')) return false;
      if (invoiceStatusFilter === 'CREDIT' && (o.isQuote || o.paymentStatus === 'Payé intégralement')) return false;
      if (!q) return true;
      return (
        (o.orderNumber || '').toLowerCase().includes(q) ||
        (o.customerName || '').toLowerCase().includes(q) ||
        (o.customerCompany || '').toLowerCase().includes(q) ||
        (o.customerPhone || '').toLowerCase().includes(q)
      );
    });
  }, [orders, invoiceSearch, invoiceStatusFilter]);

  // Daily Z de Caisse stats
  const dailyZStats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayOrders = orders.filter(o => !o.isQuote && (o.createdAt || '').slice(0, 10) === todayStr);

    let totalRevenueToday = 0;
    let cashTotal = 0;
    let waveTotal = 0;
    let omTotal = 0;
    let bankTotal = 0;
    let creditPendingTotal = 0;

    todayOrders.forEach(o => {
      const paid = o.amountPaid ?? o.totalTTC ?? 0;
      totalRevenueToday += paid;
      const m = (o.paymentMethod || '').toLowerCase();
      if (m.includes('espèces') || m.includes('cash')) cashTotal += paid;
      else if (m.includes('wave')) waveTotal += paid;
      else if (m.includes('orange')) omTotal += paid;
      else bankTotal += paid;

      if (o.amountDue && o.amountDue > 0) {
        creditPendingTotal += o.amountDue;
      }
    });

    return {
      salesCount: todayOrders.length,
      totalRevenueToday,
      cashTotal,
      waveTotal,
      omTotal,
      bankTotal,
      creditPendingTotal
    };
  }, [orders]);

  // Export Stock & Movements to CSV
  const handleExportStockCsv = () => {
    const headers = ['SKU', 'Designation', 'Marque', 'Categorie', 'Emplacement_Rayon', 'Stock_Physique', 'Prix_HT_FCFA', 'Valeur_Totale_HT'];
    const rows = products.map(p => {
      const qty = getProductPhysicalStock(p);
      const shelf = shelfMap[p.id] || 'Rayon Standard';
      return [
        `"${(p.ref || '').replace(/"/g, '""')}"`,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        `"${(p.brand || '').replace(/"/g, '""')}"`,
        `"${(p.category || '').replace(/"/g, '""')}"`,
        `"${shelf.replace(/"/g, '""')}"`,
        qty,
        p.price || 0,
        qty * (p.price || 0)
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventaire_magasin_zone_equipements_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Inventaire complet du magasin exporté en CSV (compatible Excel).');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner: Physical Store Status + Offline/Online Sync Bar */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#FF6600] flex items-center justify-center text-white shadow-lg shadow-orange-600/30 shrink-0">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
                Magasin Physique & Caisse Comptoir (POS)
              </h2>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                isOnline
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
              }`}>
                {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                <span>{isOnline ? 'En Ligne (Cloud Sync Actif)' : 'Mode Hors-Ligne (Stock Local Actif)'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Facturation directe en magasin, déduction automatique du stock physique, gestion des rayons et synchronisation hors-ligne automatique.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {syncQueue.length > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{syncQueue.length} opération(s) locale(s) à synchroniser</span>
            </div>
          )}

          <button
            type="button"
            onClick={processOfflineQueue}
            disabled={isSyncing}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-colors"
            title="Synchroniser le stock local et les factures avec le serveur Cloud"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-orange-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Synchro...' : 'Synchroniser Stock & Cloud'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowQuickNewProductModal(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nouvel Article Physique</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Bar (Organized like Catégories, Secteurs & Marques) */}
      <div className="bg-slate-950/90 p-2 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('pos')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              subTab === 'pos'
                ? 'bg-[#FF6600] text-white shadow-lg shadow-orange-600/25'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span>Caisse & Facturation</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              subTab === 'pos' ? 'bg-black/25 text-white' : 'bg-slate-800 text-orange-400'
            }`}>
              {cartLines.reduce((acc, l) => acc + l.quantity, 0)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('stock')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              subTab === 'stock'
                ? 'bg-[#FF6600] text-white shadow-lg shadow-orange-600/25'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Package className="w-4 h-4 shrink-0" />
            <span>Stock Physique & Rayons</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              subTab === 'stock' ? 'bg-black/25 text-white' : 'bg-slate-800 text-orange-400'
            }`}>
              {stockSummary.totalUnits}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('invoices')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              subTab === 'invoices'
                ? 'bg-[#FF6600] text-white shadow-lg shadow-orange-600/25'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>Factures & Crédits</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              subTab === 'invoices' ? 'bg-black/25 text-white' : 'bg-slate-800 text-orange-400'
            }`}>
              {orders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('z_caisse')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              subTab === 'z_caisse'
                ? 'bg-[#FF6600] text-white shadow-lg shadow-orange-600/25'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span>Z de Caisse & Journal</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              subTab === 'z_caisse' ? 'bg-black/25 text-white' : 'bg-slate-800 text-orange-400'
            }`}>
              {dailyZStats.salesCount}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400 px-2">
          <span>Recette du jour :</span>
          <strong className="text-emerald-400 font-mono">
            {dailyZStats.totalRevenueToday.toLocaleString('fr-FR')} FCFA
          </strong>
        </div>
      </div>

      {/* ================= SUB-TAB 1: CAISSE & FACTURATION COMPTOIR (POS) ================= */}
      {subTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (7 cols): Smart Autocomplete Search & Quick Entry */}
          <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-orange-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={posSearch}
                  onChange={e => setPosSearch(e.target.value)}
                  placeholder="Saisissez le nom, la référence SKU ou la marque pour afficher les suggestions..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-9 py-3 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#FF6600] shadow-inner"
                />
                {posSearch.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPosSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                    title="Effacer la recherche"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOnlyInStock(!onlyInStock)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 ${
                  onlyInStock
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {onlyInStock ? '✓ En Stock Uniquement' : 'Tous les Articles'}
              </button>
              <button
                type="button"
                onClick={() => setShowCustomLineRow(!showCustomLineRow)}
                className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-orange-400 rounded-xl text-xs font-bold cursor-pointer shrink-0"
              >
                + Ligne Libre / Atelier
              </button>
            </div>

            {/* Custom Item Quick Adder */}
            {showCustomLineRow && (
              <div className="p-3.5 bg-slate-900 border border-orange-500/40 rounded-xl space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between text-[11px] text-orange-300 font-bold uppercase">
                  <span>+ Ajouter un article hors-catalogue / Prestation d'Atelier</span>
                  <button
                    type="button"
                    onClick={() => setShowCustomLineRow(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      placeholder="Désignation article ou prestation..."
                      value={customLineName}
                      onChange={e => setCustomLineName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      placeholder="Marque / Origine (ex: Atelier)"
                      value={customLineBrand}
                      onChange={e => setCustomLineBrand(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="number"
                      placeholder="Prix unitaire HT (FCFA)"
                      value={customLinePrice}
                      onChange={e => setCustomLinePrice(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div className="sm:col-span-2 flex gap-1.5">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qté"
                      value={customLineQty}
                      onChange={e => setCustomLineQty(e.target.value)}
                      className="w-14 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white text-center font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomLineToCart}
                      className="flex-1 py-1.5 bg-[#FF6600] hover:bg-orange-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Ajouter
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Automatic Suggestions List when typing in Search Bar */}
            {posSearch.trim().length > 0 ? (
              <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl animate-fadeIn">
                <div className="px-4 py-2.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="font-bold text-orange-400 uppercase tracking-wider">
                    Suggestions Automatiques ({filteredPosProducts.length} résultat{filteredPosProducts.length > 1 ? 's' : ''})
                  </span>
                  <span className="text-slate-400">Cliquez sur un produit pour l'ajouter au ticket</span>
                </div>

                {filteredPosProducts.length > 0 ? (
                  <div className="divide-y divide-slate-800/80 max-h-[460px] overflow-y-auto">
                    {filteredPosProducts.slice(0, 20).map(product => {
                      const stock = getProductPhysicalStock(product);
                      const shelf = shelfMap[product.id] || 'Magasin Dakar';
                      const inCartQty = cartLines.find(l => l.productId === product.id)?.quantity || 0;

                      return (
                        <div
                          key={product.id}
                          onClick={() => {
                            handleAddToCart(product);
                          }}
                          className={`p-3 flex items-center justify-between gap-3 hover:bg-slate-800/80 transition-colors cursor-pointer ${
                            inCartQty > 0 ? 'bg-orange-500/10' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-11 h-11 rounded-lg object-cover bg-slate-800 border border-slate-700 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-mono font-bold text-orange-400">
                                  {product.ref || 'SKU'}
                                </span>
                                {product.brand && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                                    {product.brand}
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400">• {shelf}</span>
                              </div>
                              <h4 className="text-xs font-bold text-white truncate mt-0.5">
                                {product.name}
                              </h4>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              stock <= 0
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : stock <= 3
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              Stock : {stock}
                            </span>

                            <div className="text-right min-w-[95px]">
                              <span className="font-mono font-black text-xs text-orange-400 block">
                                {(product.price || 0).toLocaleString('fr-FR')} F HT
                              </span>
                              {inCartQty > 0 && (
                                <span className="text-[10px] font-bold text-emerald-400">
                                  ✓ {inCartQty} au ticket
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToCart(product);
                              }}
                              className="px-3 py-1.5 bg-[#FF6600] hover:bg-orange-500 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                            >
                              + Ajouter
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Aucun article ne correspond à « <strong className="text-white">{posSearch}</strong> ». Utilisez « + Ligne Libre / Atelier » pour ajouter un article hors-catalogue.
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl text-center space-y-2">
                <Search className="w-7 h-7 text-orange-400/70 mx-auto" />
                <p className="text-xs font-bold text-slate-300">
                  Recherche avec suggestion automatique
                </p>
                <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                  Commencez à saisir le nom du produit, sa marque ou sa référence SKU dans la barre ci-dessus pour faire apparaître les suggestions et l'ajouter au ticket en un clic.
                </p>
              </div>
            )}
          </div>

          {/* Right Column (5 cols): Active Ticket / Counter Invoice */}
          <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 sticky top-24">
            {/* Document Mode Switcher */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="grid grid-cols-2 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 w-full">
                <button
                  type="button"
                  onClick={() => { setDocType('invoice'); setPaymentStatus('Payé'); }}
                  className={`py-2 px-3 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
                    docType === 'invoice'
                      ? 'bg-[#FF6600] text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🧾 Facture Vente Directe
                </button>
                <button
                  type="button"
                  onClick={() => { setDocType('quote'); setPaymentStatus('Non payé'); }}
                  className={`py-2 px-3 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
                    docType === 'quote'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📋 Devis Proforma
                </button>
              </div>
            </div>

            {/* Customer Mode: Quick Counter vs Full B2B & Proforma */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-orange-400" />
                  Identification Client {isQuickCounterClient ? '(Comptoir)' : '(B2B & Devis)'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsQuickCounterClient(!isQuickCounterClient)}
                  className="text-[11px] font-bold text-orange-400 hover:underline cursor-pointer"
                >
                  {isQuickCounterClient ? '+ Facturation Société / NINEA / Email' : 'Passer en Vente Comptoir Rapide'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Nom / Interlocuteur</label>
                  <input
                    type="text"
                    placeholder="Ex: Ibrahima Diallo (ou Comptoir)"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Téléphone (Wave / WhatsApp)</label>
                  <input
                    type="text"
                    placeholder="Ex: +221 77 000 00 00"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              {!isQuickCounterClient && (
                <div className="space-y-2 pt-1 border-t border-slate-800/80 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Société / Raison Sociale</label>
                      <input
                        type="text"
                        placeholder="Ex: Sahel Industries SARL"
                        value={customerCompany}
                        onChange={e => setCustomerCompany(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Email Client (Reçu / Devis)</label>
                      <input
                        type="email"
                        placeholder="contact@entreprise.sn"
                        value={customerEmail}
                        onChange={e => setCustomerEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">NINEA / RCCM (Optionnel)</label>
                      <input
                        type="text"
                        placeholder="Ex: 009876543 2G3"
                        value={customerNinea}
                        onChange={e => setCustomerNinea(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Adresse Livraison / Chantier</label>
                      <input
                        type="text"
                        placeholder="Ex: Km 12 Route de Rufisque, Dakar"
                        value={customerAddress}
                        onChange={e => setCustomerAddress(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Cart Lines */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {cartLines.length === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-slate-800 rounded-xl text-xs text-slate-500">
                  Cliquez sur un équipement à gauche ou ajoutez une ligne libre pour constituer la facture.
                </div>
              ) : (
                cartLines.map(line => (
                  <div
                    key={line.id}
                    className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-white truncate">{line.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-400 font-mono">PU HT:</span>
                        <input
                          type="number"
                          value={line.unitPriceHT}
                          onChange={e => {
                            const val = Math.max(0, parseFloat(e.target.value) || 0);
                            setCartLines(prev => prev.map(l => l.id === line.id ? { ...l, unitPriceHT: val } : l));
                          }}
                          className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-orange-300 font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setCartLines(prev =>
                            prev.map(l => l.id === line.id ? { ...l, quantity: Math.max(1, l.quantity - 1) } : l)
                          )
                        }
                        className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={e => {
                          const q = Math.max(1, parseInt(e.target.value, 10) || 1);
                          setCartLines(prev => prev.map(l => l.id === line.id ? { ...l, quantity: q } : l));
                        }}
                        className="w-10 text-center bg-slate-950 border border-slate-700 rounded py-0.5 text-xs font-mono font-bold text-white"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setCartLines(prev =>
                            prev.map(l => l.id === line.id ? { ...l, quantity: l.quantity + 1 } : l)
                          )
                        }
                        className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right shrink-0 min-w-[75px]">
                      <div className="font-mono font-bold text-white">
                        {(line.unitPriceHT * line.quantity).toLocaleString('fr-FR')} F
                      </div>
                      <button
                        type="button"
                        onClick={() => setCartLines(prev => prev.filter(l => l.id !== line.id))}
                        className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                      >
                        Retirer
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Discount, VAT & Payment Method */}
            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5 items-center">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Remise Commerciale (FCFA)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={discountAmountFCFA || ''}
                    onChange={e => setDiscountAmountFCFA(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0 FCFA"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-emerald-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Fiscalité TVA (18%)
                  </label>
                  <button
                    type="button"
                    onClick={() => setApplyVat(!applyVat)}
                    className={`w-full py-1.5 px-3 rounded-lg font-bold text-xs border cursor-pointer transition-colors ${
                      applyVat
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    {applyVat ? '✓ TVA 18% Appliquée' : 'Exonéré HT (0%)'}
                  </button>
                </div>
              </div>

              {docType === 'invoice' && (
                <>
                  {/* Payment Status (Payé / Acompte / Non payé) */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Statut Règlement Facture
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPaymentStatus('Payé')}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          paymentStatus === 'Payé'
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        🟢 Payé (Comptant)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentStatus('Acompte')}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          paymentStatus === 'Acompte'
                            ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        🟡 Acompte Versé
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentStatus('Non payé')}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          paymentStatus === 'Non payé'
                            ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        🔴 Non payé (À terme)
                      </button>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                      Mode de Règlement
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {(['Espèces (Cash)', 'Wave', 'Orange Money', 'Virement Bancaire B2B', 'Chèque', 'Crédit / Acompte B2B'] as const).map(method => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => {
                            setPaymentMethod(method);
                            if (method === 'Crédit / Acompte B2B') setPaymentStatus('Acompte');
                          }}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border truncate cursor-pointer transition-all ${
                            paymentMethod === method
                              ? 'bg-[#FF6600] text-white border-[#FF6600]'
                              : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cash / Deposit Calculator */}
                  {(paymentMethod === 'Espèces (Cash)' || paymentMethod === 'Crédit / Acompte B2B' || paymentStatus === 'Acompte') && grandTotalTTC > 0 && (
                    <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg grid grid-cols-2 gap-2 items-center">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">
                          {paymentMethod === 'Espèces (Cash)' && paymentStatus === 'Payé' ? 'Montant remis par le client' : 'Montant acompte encaissé'}
                        </label>
                        <input
                          type="number"
                          placeholder={`${grandTotalTTC}`}
                          value={amountReceivedInput}
                          onChange={e => setAmountReceivedInput(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white font-mono"
                        />
                      </div>
                      <div className="text-right">
                        {paymentMethod === 'Espèces (Cash)' && paymentStatus === 'Payé' ? (
                          <>
                            <span className="block text-[10px] text-slate-400">Monnaie à rendre :</span>
                            <span className="font-mono font-black text-sm text-emerald-400">
                              {changeToReturn.toLocaleString('fr-FR')} FCFA
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="block text-[10px] text-slate-400">Reste à payer (Crédit) :</span>
                            <span className="font-mono font-black text-sm text-amber-400">
                              {remainingCreditBalance.toLocaleString('fr-FR')} FCFA
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Optional Notes */}
                  <div>
                    <input
                      type="text"
                      placeholder="Notes / Instructions spécifiques (optionnel)..."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 placeholder-slate-500"
                    />
                  </div>
                </>
              )}

              {/* Totals Breakdown */}
              <div className="pt-2 border-t border-slate-800 space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Sous-Total Net HT :</span>
                  <span className="font-mono font-bold text-white">{netSubtotalHT.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>TVA ({applyVat ? '18%' : '0%'}) :</span>
                  <span className="font-mono font-bold text-slate-300">{vatAmount.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between items-baseline pt-1.5 border-t border-slate-800">
                  <span className="font-black text-white text-sm">NET À PAYER TTC :</span>
                  <span className="font-mono font-black text-xl text-[#FF6600]">
                    {grandTotalTTC.toLocaleString('fr-FR')} <span className="text-xs">FCFA</span>
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={cartLines.length === 0}
              onClick={handleFinalizeSale}
              className="w-full py-3.5 px-5 bg-[#FF6600] hover:bg-orange-600 disabled:opacity-40 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>
                {docType === 'invoice'
                  ? 'Encaisser, Déduire du Stock & Imprimer Facture'
                  : 'Générer & Imprimer le Devis Proforma'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ================= SUB-TAB 2: GESTION DU STOCK PHYSIQUE MAGASIN ================= */}
      {subTab === 'stock' && (
        <div className="space-y-6">
          {/* Stock KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Références Catalogue</span>
              <div className="text-2xl font-black text-white font-mono mt-1">{stockSummary.totalSkus}</div>
              <span className="text-[11px] text-slate-500">Articles enregistrés</span>
            </div>

            <div className="bg-slate-950 border border-emerald-500/30 p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-emerald-400 uppercase">Unités Physiques en Magasin</span>
              <div className="text-2xl font-black text-emerald-300 font-mono mt-1">
                {stockSummary.totalUnits.toLocaleString('fr-FR')}
              </div>
              <span className="text-[11px] text-slate-500">Disponibles immédiatement</span>
            </div>

            <div className="bg-slate-950 border border-blue-500/30 p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-blue-400 uppercase">Valeur du Stock Physique (HT)</span>
              <div className="text-xl font-black text-white font-mono mt-1">
                {stockSummary.totalValueHT.toLocaleString('fr-FR')} <span className="text-xs text-orange-400">FCFA</span>
              </div>
              <span className="text-[11px] text-slate-500">Valorisation comptable magasin</span>
            </div>

            <div className="bg-slate-950 border border-amber-500/30 p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-amber-400 uppercase">Alertes Réapprovisionnement</span>
              <div className="text-2xl font-black text-amber-300 font-mono mt-1">
                {stockSummary.lowStockCount} faible(s) • {stockSummary.outOfStockCount} rupture(s)
              </div>
              <span className="text-[11px] text-slate-500">Seuils de sécurité surveillés</span>
            </div>
          </div>

          {/* Search, Filters & Export */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={stockSearch}
                  onChange={e => setStockSearch(e.target.value)}
                  placeholder="Rechercher un produit, SKU ou emplacement rayon (ex: Rayon A1)..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStockFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    stockFilter === 'ALL' ? 'bg-[#FF6600] text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  Tous ({products.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStockFilter('LOW')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    stockFilter === 'LOW' ? 'bg-amber-600 text-white' : 'bg-slate-900 text-amber-300 border border-slate-800'
                  }`}
                >
                  Stock Faible ({stockSummary.lowStockCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStockFilter('OUT')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    stockFilter === 'OUT' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-rose-300 border border-slate-800'
                  }`}
                >
                  Rupture ({stockSummary.outOfStockCount})
                </button>
                <button
                  type="button"
                  onClick={handleExportStockCsv}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exporter Inventaire CSV</span>
                </button>
              </div>
            </div>

            {/* Stock Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">Équipement / Réf SKU</th>
                    <th className="py-3 px-3">Emplacement Rayon</th>
                    <th className="py-3 px-3 text-right">Prix Vente HT</th>
                    <th className="py-3 px-3 text-center">Seuil Alerte</th>
                    <th className="py-3 px-3 text-center">Quantité en Stock Physique</th>
                    <th className="py-3 px-3 text-right">Action / Arrivage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredStockProducts.map(product => {
                    const qty = getProductPhysicalStock(product);
                    const minAlert = minAlertMap[product.id] ?? 3;
                    const shelf = shelfMap[product.id] || 'Rayon A1';

                    return (
                      <tr key={product.id} className="hover:bg-slate-900/40">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-9 h-9 rounded-lg object-cover bg-slate-800 shrink-0"
                            />
                            <div>
                              <strong className="text-white block">{product.name}</strong>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {product.brand} • SKU: {product.ref}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={shelf}
                            onChange={e => saveShelfLocation(product.id, e.target.value)}
                            className="w-32 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-[#FF6600] outline-none"
                            placeholder="Ex: Allée B2"
                          />
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-bold text-orange-400">
                          {(product.price || 0).toLocaleString('fr-FR')} F
                        </td>

                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            value={minAlert}
                            onChange={e => saveMinAlert(product.id, parseInt(e.target.value, 10) || 0)}
                            className="w-14 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-center font-mono text-xs text-slate-300"
                          />
                        </td>

                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl p-1">
                            <button
                              type="button"
                              onClick={() =>
                                updatePhysicalStock(
                                  product,
                                  Math.max(0, qty - 1),
                                  'ADJUSTMENT',
                                  'Ajustement rapide -1 au comptoir'
                                )
                              }
                              className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-rose-600 text-white flex items-center justify-center cursor-pointer transition-colors"
                            >
                              -
                            </button>
                            <span className={`w-12 text-center font-mono font-black text-sm ${
                              qty <= 0 ? 'text-rose-400' : qty <= minAlert ? 'text-amber-400' : 'text-emerald-400'
                            }`}>
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updatePhysicalStock(
                                  product,
                                  qty + 1,
                                  'RESTOCK',
                                  'Ajout rapide +1 au comptoir'
                                )
                              }
                              className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-emerald-600 text-white flex items-center justify-center cursor-pointer transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setRestockModalProduct(product);
                              setRestockMode('ADD');
                              setRestockQty('10');
                              setRestockShelf(shelf);
                              setRestockReason('Arrivage fournisseur / Entrée magasin');
                            }}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-[#FF6600] text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Entrée / Inventaire</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUB-TAB 3: HISTORIQUE DES FACTURES MAGASIN & CRÉDITS ================= */}
      {subTab === 'invoices' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={invoiceSearch}
                onChange={e => setInvoiceSearch(e.target.value)}
                placeholder="Rechercher par N° Facture, Nom client, Société, Téléphone..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {([
                { id: 'ALL', label: 'Tous les Documents' },
                { id: 'PAID', label: 'Factures Payées' },
                { id: 'CREDIT', label: 'Crédits / Acomptes à solder' },
                { id: 'QUOTE', label: 'Devis Proforma' }
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setInvoiceStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    invoiceStatusFilter === tab.id
                      ? 'bg-[#FF6600] text-white'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">N° Document</th>
                  <th className="py-3 px-3">Date & Heure</th>
                  <th className="py-3 px-3">Client / Société</th>
                  <th className="py-3 px-3">Mode Règlement</th>
                  <th className="py-3 px-3 text-right">Total TTC</th>
                  <th className="py-3 px-3 text-center">Statut</th>
                  <th className="py-3 px-3 text-right">Impression / Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {storeInvoices.map(ord => {
                  const hasBalanceDue = (ord.amountDue || 0) > 0 && !ord.isQuote && ord.paymentStatus !== 'Payé intégralement';
                  return (
                    <tr key={ord.id} className="hover:bg-slate-900/40">
                      <td className="py-3 px-3 font-mono font-bold text-orange-400">{ord.orderNumber}</td>
                      <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                        {new Date(ord.createdAt).toLocaleString('fr-FR')}
                      </td>
                      <td className="py-3 px-3">
                        <strong className="text-white block">{ord.customerName}</strong>
                        <span className="text-[10px] text-slate-400">
                          {ord.customerCompany || 'Comptoir'} • {ord.customerPhone}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">{ord.paymentMethod}</td>
                      <td className="py-3 px-3 text-right font-mono font-black text-white">
                        {(ord.totalTTC || 0).toLocaleString('fr-FR')} FCFA
                        {hasBalanceDue && (
                          <span className="block text-[10px] text-amber-400">
                            Reste : {(ord.amountDue || 0).toLocaleString('fr-FR')} F
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          ord.isQuote
                            ? 'bg-blue-500/20 text-blue-300'
                            : ord.paymentStatus === 'Payé intégralement'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {ord.isQuote ? 'Devis Proforma' : ord.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {hasBalanceDue && (
                            <button
                              type="button"
                              onClick={() => {
                                catalogService.updateOrder(ord.id, {
                                  paymentStatus: 'Payé intégralement',
                                  amountPaid: ord.totalTTC,
                                  amountDue: 0,
                                  status: 'Livrée'
                                });
                                refreshFromService();
                                notify(`Facture ${ord.orderNumber} marquée comme intégralement soldée !`);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                              title="Encaisser le solde restant"
                            >
                              ✓ Solder Crédit
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => triggerPrintDocument(ord, 'A4')}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Printer className="w-3 h-3 text-orange-400" />
                            <span>A4</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => triggerPrintDocument(ord, 'TICKET_80MM')}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Printer className="w-3 h-3 text-blue-400" />
                            <span>Ticket 80mm</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= SUB-TAB 4: Z DE CAISSE & JOURNAL DES MOUVEMENTS DE STOCK ================= */}
      {subTab === 'z_caisse' && (
        <div className="space-y-6">
          {/* Z de Caisse Daily Summary */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-orange-400">
                  Clôture Journalière — Z de Caisse du Jour ({new Date().toLocaleDateString('fr-FR')})
                </h3>
                <p className="text-xs text-slate-400">
                  Récapitulatif en temps réel des encaissements réalisés aujourd'hui au comptoir et par canal de paiement.
                </p>
              </div>
              <span className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold font-mono">
                {dailyZStats.salesCount} vente(s) aujourd'hui
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="p-4 bg-slate-900 border border-orange-500/40 rounded-xl">
                <span className="text-[10px] font-bold uppercase text-orange-300">Total Encaissé Aujourd'hui</span>
                <div className="text-lg font-black text-white font-mono mt-1">
                  {dailyZStats.totalRevenueToday.toLocaleString('fr-FR')} F
                </div>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-[10px] font-bold uppercase text-emerald-400">Caisse Espèces (Cash)</span>
                <div className="text-base font-black text-white font-mono mt-1">
                  {dailyZStats.cashTotal.toLocaleString('fr-FR')} F
                </div>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-[10px] font-bold uppercase text-sky-400">Wave Sénégal</span>
                <div className="text-base font-black text-white font-mono mt-1">
                  {dailyZStats.waveTotal.toLocaleString('fr-FR')} F
                </div>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-[10px] font-bold uppercase text-amber-400">Orange Money</span>
                <div className="text-base font-black text-white font-mono mt-1">
                  {dailyZStats.omTotal.toLocaleString('fr-FR')} F
                </div>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-[10px] font-bold uppercase text-rose-400">Crédits Clients du Jour</span>
                <div className="text-base font-black text-rose-300 font-mono mt-1">
                  {dailyZStats.creditPendingTotal.toLocaleString('fr-FR')} F
                </div>
              </div>
            </div>
          </div>

          {/* Stock Movements Traceability Table */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Journal Horodaté des Mouvements de Stock Physique ({stockMovements.length})
              </h3>
              <span className="text-xs text-slate-400">
                Conserve l'historique complet des entrées, ventes et inventaires (même hors-ligne)
              </span>
            </div>

            {stockMovements.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-slate-800 rounded-xl text-xs text-slate-500">
                Aucun mouvement de stock enregistré pour le moment.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Date & Heure</th>
                      <th className="py-2.5 px-3">Équipement / SKU</th>
                      <th className="py-2.5 px-3">Opération</th>
                      <th className="py-2.5 px-3 text-center">Variation</th>
                      <th className="py-2.5 px-3 text-center">Stock Après</th>
                      <th className="py-2.5 px-3">Motif / N° Facture</th>
                      <th className="py-2.5 px-3 text-center">Synchro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {stockMovements.map(mov => (
                      <tr key={mov.id} className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-3 text-[11px] text-slate-400">
                          {new Date(mov.timestamp).toLocaleString('fr-FR')}
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          <strong className="text-white block">{mov.productName}</strong>
                          <span className="text-[10px] text-slate-500 font-mono">{mov.sku}</span>
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            mov.type === 'SALE'
                              ? 'bg-orange-500/20 text-orange-300'
                              : mov.type === 'RESTOCK'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-blue-500/20 text-blue-300'
                          }`}>
                            {mov.type === 'SALE' ? 'Vente Comptoir' : mov.type === 'RESTOCK' ? 'Arrivage / Entrée' : 'Ajustement'}
                          </span>
                        </td>
                        <td className={`py-2.5 px-3 text-center font-black ${
                          mov.quantityDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {mov.quantityDelta >= 0 ? `+${mov.quantityDelta}` : mov.quantityDelta}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-white">
                          {mov.stockAfter}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-300">
                          {mov.reason} {mov.referenceDoc ? `(${mov.referenceDoc})` : ''}
                        </td>
                        <td className="py-2.5 px-3 text-center font-sans">
                          <span className={`text-[10px] font-bold ${mov.synced ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {mov.synced ? '✓ Cloud' : '⏳ Local'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: ENTRÉE DE STOCK / AJUSTEMENT INVENTAIRE ================= */}
      {restockModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white">Mouvement de Stock Physique</h3>
                <p className="text-xs text-orange-400 font-bold truncate">{restockModalProduct.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setRestockModalProduct(null)}
                className="p-1.5 bg-slate-900 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmRestock} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRestockMode('ADD')}
                  className={`py-2 px-2 rounded-xl font-bold border cursor-pointer ${
                    restockMode === 'ADD'
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  + Entrée Arrivage
                </button>
                <button
                  type="button"
                  onClick={() => setRestockMode('REMOVE')}
                  className={`py-2 px-2 rounded-xl font-bold border cursor-pointer ${
                    restockMode === 'REMOVE'
                      ? 'bg-rose-600 text-white border-rose-500'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  - Sortie / Casse
                </button>
                <button
                  type="button"
                  onClick={() => setRestockMode('SET')}
                  className={`py-2 px-2 rounded-xl font-bold border cursor-pointer ${
                    restockMode === 'SET'
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  = Fixer Inventaire
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">
                    {restockMode === 'SET' ? 'Nouveau Stock Exact' : 'Quantité à appliquer'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={restockQty}
                    onChange={e => setRestockQty(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Emplacement Rayon</label>
                  <input
                    type="text"
                    value={restockShelf}
                    onChange={e => setRestockShelf(e.target.value)}
                    placeholder="Ex: Allée A - Rayon 2"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Motif / Bon de livraison fournisseur</label>
                <input
                  type="text"
                  value={restockReason}
                  onChange={e => setRestockReason(e.target.value)}
                  placeholder="Ex: Réception conteneur Dakar / Inventaire tournant"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRestockModalProduct(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#FF6600] hover:bg-orange-600 text-white rounded-xl font-black cursor-pointer"
                >
                  Valider le Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CRÉATION RAPIDE D'UN PRODUIT PHYSIQUE EN MAGASIN ================= */}
      {showQuickNewProductModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white">Nouvel Article Physique (Magasin Dakar)</h3>
                <p className="text-xs text-slate-400">
                  Ajoute immédiatement le produit au catalogue et initialise son stock physique (fonctionne même hors-ligne).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickNewProductModal(false)}
                className="p-1.5 bg-slate-900 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateQuickPhysicalProduct} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Désignation de l'équipement *</label>
                <input
                  type="text"
                  required
                  value={newProdName}
                  onChange={e => setNewProdName(e.target.value)}
                  placeholder="Ex: Disjoncteur différentiel Schneider 63A Triphasé"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Marque</label>
                  <input
                    type="text"
                    value={newProdBrand}
                    onChange={e => setNewProdBrand(e.target.value)}
                    placeholder="Ex: SCHNEIDER / SKF / BOSCH"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Code SKU / Référence</label>
                  <input
                    type="text"
                    value={newProdSku}
                    onChange={e => setNewProdSku(e.target.value)}
                    placeholder="Auto-généré si vide"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Prix Vente HT (FCFA) *</label>
                  <input
                    type="number"
                    required
                    min="100"
                    value={newProdPriceHT}
                    onChange={e => setNewProdPriceHT(e.target.value)}
                    placeholder="Ex: 45000"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-orange-400 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Stock Initial *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newProdInitialStock}
                    onChange={e => setNewProdInitialStock(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Rayon / Allée</label>
                  <input
                    type="text"
                    value={newProdShelf}
                    onChange={e => setNewProdShelf(e.target.value)}
                    placeholder="Rayon A1"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowQuickNewProductModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black cursor-pointer"
                >
                  Enregistrer en Stock Magasin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CONFIRMATION D'ENCAISSEMENT & IMPRESSION FACTURE / TICKET ================= */}
      {printedOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-emerald-500/40 rounded-3xl w-full max-w-md p-6 space-y-5 text-center shadow-2xl animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                {printedOrder.isQuote ? 'Devis Comptoir Enregistré' : 'Vente Comptoir & Stock Mis à Jour'}
              </span>
              <h3 className="text-xl font-black text-white mt-2 font-mono">{printedOrder.orderNumber}</h3>
              <p className="text-xs text-slate-400 mt-1">
                Client : <strong className="text-white">{printedOrder.customerName}</strong> • Total TTC :{' '}
                <strong className="text-orange-400 font-mono">
                  {(printedOrder.totalTTC || 0).toLocaleString('fr-FR')} FCFA
                </strong>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => triggerPrintDocument(printedOrder, 'A4')}
                className="py-3 px-4 bg-[#FF6600] hover:bg-orange-600 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Facture Officielle A4</span>
              </button>

              <button
                type="button"
                onClick={() => triggerPrintDocument(printedOrder, 'TICKET_80MM')}
                className="py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Ticket Thermique 80mm</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setPrintedOrder(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
            >
              Nouvelle Vente au Comptoir
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhysicalStorePOS;

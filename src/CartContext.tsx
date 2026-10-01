import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CartItem {
  id: string | number;
  productId: number;
  name: string;
  price: number;
  /** Pure unit price HT of the equipment (without international freight) */
  basePriceHT?: number;
  /** Current unit freight cost in XOF */
  freightCost?: number;
  /** Sea freight cost in XOF for 1 unit (when product is sourced) */
  seaFreightCost?: number;
  seaFreightCostXOF?: number;
  customSeaFreightCost?: number;
  /** Air freight cost in XOF for 1 unit (when product is sourced) */
  airFreightCost?: number;
  airFreightCostXOF?: number;
  customAirFreightCost?: number;
  /** Admin-configured default shipping method */
  defaultShippingMethod?: 'neutral' | 'sea' | 'air';
  /** Weight in kg of 1 unit */
  weightKg?: number;
  /** Stock vs Sourcing availability */
  inStock?: boolean;
  availabilityMode?: 'stock' | 'sourcing';
  img: string;
  image: string;
  quantity: number;
  brand: string;
  origin?: string;
  shippingMethod?: 'air' | 'sea' | 'none' | 'neutral';
  showDeposit?: boolean;
  depositPercentage?: number;
  applyVat?: boolean;
  variantId?: string;
  variantName?: string;
  variantDescription?: string;
  supplierPrice?: number;
  supplierCurrency?: 'USD' | 'EUR' | 'CNY' | 'XOF';
  supplierId?: string;
  supplierName?: string;
  supplierUrl?: string;
  sourcePlatform?: string;
  costPrice?: number;
  agentCode?: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (
    product: Omit<CartItem, 'quantity' | 'shippingMethod' | 'id' | 'img' | 'image' | 'productId'> & {
      id?: string | number;
      productId?: number;
      img?: string;
      image?: string;
    },
    quantity?: number,
    shippingMethod?: 'air' | 'sea' | 'none' | 'neutral'
  ) => void;
  addItem: (item: any) => void;
  removeItem: (id: string | number) => void;
  removeFromCart: (id: string | number, shippingMethod?: 'air' | 'sea' | 'none' | 'neutral') => void;
  updateQuantity: (id: string | number, quantity: number, shippingMethod?: 'air' | 'sea' | 'none' | 'neutral') => void;
  updateItemFreight: (id: string | number, method: 'neutral' | 'sea' | 'air' | 'none', unitFreightCost: number) => void;
  updateShippingMethod: (id: string | number, shippingMethod: 'air' | 'sea' | 'none' | 'neutral') => void;
  clearCart: () => void;
  equipmentTotal: number;
  freightTotal: number;
  total: number;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/**
 * Helper to get the pure equipment base price HT (excluding international freight)
 */
export function getCartItemEquipmentUnitPrice(item: CartItem): number {
  if (typeof item.basePriceHT === 'number' && item.basePriceHT > 0) {
    return item.basePriceHT;
  }
  return Number(item.price) || 0;
}

/**
 * Helper to get the unit freight cost for the item's currently selected shippingMethod
 */
export function getCartItemUnitFreightCost(item: CartItem): number {
  const isSourcing = item.availabilityMode
    ? item.availabilityMode === 'sourcing'
    : item.inStock === false;
  if (!isSourcing || item.shippingMethod === 'none' || item.shippingMethod === 'neutral') {
    return 0;
  }
  if (typeof item.freightCost === 'number' && item.freightCost >= 0) {
    return item.freightCost;
  }
  if (item.shippingMethod === 'sea') {
    const seaVal = item.seaFreightCost ?? item.seaFreightCostXOF ?? item.customSeaFreightCost;
    return typeof seaVal === 'number' && seaVal >= 0
      ? seaVal
      : Math.round(getCartItemEquipmentUnitPrice(item) * 0.05);
  }
  if (item.shippingMethod === 'air') {
    const airVal = item.airFreightCost ?? item.airFreightCostXOF ?? item.customAirFreightCost;
    return typeof airVal === 'number' && airVal >= 0
      ? airVal
      : Math.round(getCartItemEquipmentUnitPrice(item) * 0.12);
  }
  return 0;
}

function normalizeStoredCartItem(raw: any, index: number): CartItem {
  const productId = Number(raw?.productId ?? raw?.id ?? index + 1);
  const img = String(raw?.img || raw?.image || '');
  const baseHT = Number(raw?.basePriceHT ?? raw?.price ?? 0);
  const method: 'air' | 'sea' | 'none' | 'neutral' =
    raw?.shippingMethod === 'sea' || raw?.shippingMethod === 'air' || raw?.shippingMethod === 'neutral' || raw?.shippingMethod === 'none'
      ? raw.shippingMethod
      : raw?.inStock === false || raw?.availabilityMode === 'sourcing'
        ? 'neutral'
        : 'none';
  const id = raw?.id ?? `${productId}-${raw?.variantName || 'std'}-${method}`;

  return {
    ...raw,
    id,
    productId: isNaN(productId) ? index + 1 : productId,
    name: String(raw?.name || 'Équipement'),
    price: baseHT,
    basePriceHT: baseHT,
    img,
    image: img,
    brand: String(raw?.brand || 'Constructeur Certifié'),
    origin: raw?.origin || 'International',
    quantity: Math.max(1, Number(raw?.quantity) || 1),
    shippingMethod: method,
    freightCost: Number(raw?.freightCost ?? 0),
    seaFreightCost: Number(raw?.seaFreightCost ?? raw?.seaFreightCostXOF ?? raw?.customSeaFreightCost ?? 0),
    seaFreightCostXOF: Number(raw?.seaFreightCostXOF ?? raw?.seaFreightCost ?? raw?.customSeaFreightCost ?? 0),
    airFreightCost: Number(raw?.airFreightCost ?? raw?.airFreightCostXOF ?? raw?.customAirFreightCost ?? 0),
    airFreightCostXOF: Number(raw?.airFreightCostXOF ?? raw?.airFreightCost ?? raw?.customAirFreightCost ?? 0)
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('ze_cart_v1') || localStorage.getItem('zone_equipements_cart');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.map(normalizeStoredCartItem) : [];
      } catch (e) {
        console.error('Failed to parse cart from localStorage', e);
      }
    }
    return [];
  });

  useEffect(() => {
    const serialized = JSON.stringify(items);
    localStorage.setItem('ze_cart_v1', serialized);
    localStorage.setItem('zone_equipements_cart', serialized);
  }, [items]);

  const addToCart: CartContextType['addToCart'] = (
    product,
    quantity = 1,
    shippingMethod = 'neutral'
  ) => {
    const isSourcing = product.availabilityMode
      ? product.availabilityMode === 'sourcing'
      : product.inStock === false;
    const effectiveShipping: 'air' | 'sea' | 'none' | 'neutral' = !isSourcing ? 'none' : shippingMethod;
    const baseHT = typeof product.basePriceHT === 'number' && product.basePriceHT > 0
      ? product.basePriceHT
      : Number(product.price) || 0;
    const resolvedProductId = Number(product.productId ?? product.id ?? Date.now());
    const resolvedImg = String(product.img || product.image || '');
    const lineId = `${resolvedProductId}-${product.variantName || 'std'}-${effectiveShipping}`;

    const initialFreight =
      !isSourcing || effectiveShipping === 'none' || effectiveShipping === 'neutral'
        ? 0
        : typeof product.freightCost === 'number' && product.freightCost >= 0
          ? product.freightCost
          : effectiveShipping === 'sea'
            ? Number(product.seaFreightCost ?? product.seaFreightCostXOF ?? product.customSeaFreightCost ?? 0)
            : Number(product.airFreightCost ?? product.airFreightCostXOF ?? product.customAirFreightCost ?? 0);

    setItems(prev => {
      const existing = prev.find(
        item =>
          String(item.id) === String(lineId) ||
          (Number(item.productId) === resolvedProductId &&
            item.name === product.name &&
            (item.shippingMethod || 'neutral') === effectiveShipping)
      );
      if (existing) {
        return prev.map(item =>
          item.id === existing.id
            ? {
                ...item,
                ...product,
                id: existing.id,
                productId: resolvedProductId,
                img: resolvedImg,
                image: resolvedImg,
                basePriceHT: baseHT,
                price: baseHT,
                freightCost: initialFreight,
                shippingMethod: effectiveShipping,
                quantity: item.quantity + quantity
              }
            : item
        );
      }
      return [
        ...prev,
        {
          ...product,
          id: lineId,
          productId: resolvedProductId,
          img: resolvedImg,
          image: resolvedImg,
          basePriceHT: baseHT,
          price: baseHT,
          freightCost: initialFreight,
          quantity,
          shippingMethod: effectiveShipping
        }
      ];
    });
  };

  const addItem = (raw: any) => {
    const productId = Number(raw.productId ?? raw.id ?? Date.now());
    const qty = Math.max(1, Number(raw.quantity) || 1);
    const isSourcing = raw.availabilityMode
      ? raw.availabilityMode === 'sourcing'
      : raw.inStock === false;
    const rawMethod = raw.shippingMethod;
    const method: 'air' | 'sea' | 'none' | 'neutral' = !isSourcing
      ? 'none'
      : rawMethod === 'sea'
        ? 'sea'
        : rawMethod === 'air'
          ? 'air'
          : 'neutral';

    const baseHT = Number(raw.basePriceHT ?? raw.price ?? 0);
    const img = String(raw.img || raw.image || '');
    const seaCost = Number(raw.seaFreightCost ?? raw.seaFreightCostXOF ?? raw.customSeaFreightCost ?? 0);
    const airCost = Number(raw.airFreightCost ?? raw.airFreightCostXOF ?? raw.customAirFreightCost ?? 0);
    const freightCost =
      !isSourcing || method === 'none' || method === 'neutral'
        ? 0
        : raw.freightCost !== undefined
          ? Number(raw.freightCost)
          : method === 'sea'
            ? seaCost
            : airCost;

    addToCart(
      {
        id: `${productId}-${raw.variantName || 'std'}-${method}`,
        productId,
        name: raw.name || 'Équipement',
        price: baseHT,
        basePriceHT: baseHT,
        freightCost,
        seaFreightCost: seaCost,
        seaFreightCostXOF: seaCost,
        customSeaFreightCost: raw.customSeaFreightCost,
        airFreightCost: airCost,
        airFreightCostXOF: airCost,
        customAirFreightCost: raw.customAirFreightCost,
        defaultShippingMethod: raw.defaultShippingMethod,
        weightKg: Number(raw.weightKg) || 1,
        inStock: !isSourcing,
        availabilityMode: isSourcing ? 'sourcing' : 'stock',
        img,
        image: img,
        brand: raw.brand || 'Constructeur Certifié',
        origin: raw.origin || 'International',
        showDeposit: raw.showDeposit,
        depositPercentage: raw.depositPercentage,
        applyVat: raw.applyVat,
        variantId: raw.variantId,
        variantName: raw.variantName,
        variantDescription: raw.variantDescription,
        supplierPrice: raw.supplierPrice,
        supplierCurrency: raw.supplierCurrency,
        supplierId: raw.supplierId,
        supplierName: raw.supplierName,
        supplierUrl: raw.supplierUrl,
        sourcePlatform: raw.sourcePlatform,
        costPrice: raw.costPrice,
        agentCode: raw.agentCode
      },
      qty,
      method
    );
  };

  const removeFromCart = (id: string | number, shippingMethod?: 'air' | 'sea' | 'none' | 'neutral') => {
    setItems(prev =>
      prev.filter(item => {
        if (shippingMethod) {
          return !(
            (String(item.id) === String(id) || String(item.productId) === String(id)) &&
            (item.shippingMethod || 'neutral') === shippingMethod
          );
        }
        return String(item.id) !== String(id);
      })
    );
  };

  const removeItem = (id: string | number) => {
    removeFromCart(id);
  };

  const updateQuantity = (id: string | number, quantity: number, shippingMethod?: 'air' | 'sea' | 'none' | 'neutral') => {
    if (quantity <= 0) {
      removeFromCart(id, shippingMethod);
      return;
    }
    setItems(prev =>
      prev.map(item => {
        const match = shippingMethod
          ? (String(item.id) === String(id) || String(item.productId) === String(id)) &&
            (item.shippingMethod || 'neutral') === shippingMethod
          : String(item.id) === String(id);
        return match ? { ...item, quantity } : item;
      })
    );
  };

  const updateItemFreight = (
    id: string | number,
    method: 'neutral' | 'sea' | 'air' | 'none',
    unitFreightCost: number
  ) => {
    setItems(prev =>
      prev.map(item =>
        String(item.id) === String(id)
          ? {
              ...item,
              shippingMethod: method,
              freightCost: method === 'neutral' || method === 'none' ? 0 : Math.max(0, Number(unitFreightCost) || 0)
            }
          : item
      )
    );
  };

  const updateShippingMethod = (id: string | number, shippingMethod: 'air' | 'sea' | 'none' | 'neutral') => {
    setItems(prev =>
      prev.map(item =>
        String(item.id) === String(id)
          ? {
              ...item,
              shippingMethod,
              freightCost: getCartItemUnitFreightCost({ ...item, shippingMethod, freightCost: undefined })
            }
          : item
      )
    );
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const equipmentTotal = items.reduce(
    (sum, item) => sum + getCartItemEquipmentUnitPrice(item) * item.quantity,
    0
  );
  const freightTotal = items.reduce(
    (sum, item) => sum + getCartItemUnitFreightCost(item) * item.quantity,
    0
  );
  const total = equipmentTotal + freightTotal;
  const totalPrice = total;

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        addItem,
        removeItem,
        removeFromCart,
        updateQuantity,
        updateItemFreight,
        updateShippingMethod,
        clearCart,
        equipmentTotal,
        freightTotal,
        total,
        totalItems,
        totalPrice
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

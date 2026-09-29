import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from './AuthContext';

export interface CartItem {
  id?: string;
  productId: number;
  name: string;
  variantId?: string;
  variantName?: string;
  price: number; // Prix équipement hors transport
  costPrice?: number; // Coût de revient XOF (achat + frais entrepôt)
  supplierPrice?: number; // Prix d'achat fournisseur dans la devise d'origine
  supplierCurrency?: 'USD' | 'EUR' | 'CNY' | 'XOF';
  supplierId?: string;
  supplierName?: string;
  brand?: string;
  origin?: string;
  quantity: number;
  img: string;
  weightKg?: number;
  inStock?: boolean;
  availabilityMode?: 'stock' | 'sourcing';
  sourcePlatform?: string;
  supplierUrl?: string;
  shippingMethod?: 'none' | 'air' | 'sea'; // Choix du client ('none' pour stock local disponible immédiatement)
  freightCost?: number; // Montant du fret unitaire calculé (0 pour stock local)
  depositPercentage?: number;
  showDeposit?: boolean;
  agentCode?: string; // Interne : DKR628+AIR, DKR628+SEA ou STOCK-LOCAL-DKR
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  updateItemFreight: (id: string, method: 'none' | 'air' | 'sea', cost: number) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  clearCart: () => Promise<void>;
  equipmentTotal: number;
  freightTotal: number;
  total: number;
}

const CartContext = createContext<CartContextType>({
  items: [],
  addItem: async () => {},
  updateQuantity: async () => {},
  updateItemFreight: async () => {},
  removeItem: async () => {},
  clearCart: async () => {},
  equipmentTotal: 0,
  freightTotal: 0,
  total: 0,
});

export const useCart = () => useContext(CartContext);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ze_guest_cart_v5');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  // Sync with Firestore if user logged in
  useEffect(() => {
    if (!user) {
      return;
    }

    const q = collection(db, 'users', user.uid, 'cart');
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const cartItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CartItem));
        setItems(cartItems);
        if (typeof window !== 'undefined') {
          localStorage.setItem('ze_guest_cart_v5', JSON.stringify(cartItems));
        }
      },
      (error) => {
        console.warn('Synchronisation panier Firestore indisponible, utilisation du stockage local :', error.message || error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const saveToLocal = (newItems: CartItem[]) => {
    setItems(newItems);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ze_guest_cart_v5', JSON.stringify(newItems));
    }
  };

  const cleanCartPayload = (item: Record<string, any>) => {
    const cleaned: Record<string, any> = {};
    for (const [k, v] of Object.entries(item)) {
      if (v !== undefined) {
        cleaned[k] = v;
      }
    }
    return cleaned;
  };

  const addItem = async (newItem: CartItem) => {
    const defaultFreight = newItem.shippingMethod || 'none';
    const computedAgentCode = defaultFreight === 'air' ? 'DKR628+AIR' : defaultFreight === 'sea' ? 'DKR628+SEA' : '';
    const itemWithAgent: CartItem = {
      ...newItem,
      shippingMethod: defaultFreight,
      agentCode: computedAgentCode,
      freightCost: newItem.freightCost || 0
    };

    if (user) {
      const existing = items.find(
        item =>
          item.productId === newItem.productId &&
          item.name === newItem.name &&
          item.shippingMethod === itemWithAgent.shippingMethod
      );
      try {
        if (existing && existing.id && !existing.id.startsWith('guest-')) {
          await updateDoc(doc(db, 'users', user.uid, 'cart', existing.id), {
            quantity: existing.quantity + newItem.quantity
          });
        } else {
          await addDoc(collection(db, 'users', user.uid, 'cart'), cleanCartPayload(itemWithAgent));
        }
        return;
      } catch (err) {
        console.warn('Repli sur le panier local :', err);
      }
    }

    // Guest cart or fallback
    const existingIdx = items.findIndex(
      item =>
        item.productId === newItem.productId &&
        item.name === newItem.name &&
        item.shippingMethod === itemWithAgent.shippingMethod
    );
    if (existingIdx !== -1) {
      const updated = [...items];
      updated[existingIdx].quantity += newItem.quantity;
      saveToLocal(updated);
    } else {
      saveToLocal([...items, { ...itemWithAgent, id: `guest-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` }]);
    }
  };

  const updateQuantity = async (id: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(id);
      return;
    }
    if (user && !id.startsWith('guest-')) {
      try {
        await updateDoc(doc(db, 'users', user.uid, 'cart', id), { quantity });
        return;
      } catch (err) {
        console.warn('Repli mise à jour quantité panier local :', err);
      }
    }
    const updated = items.map(it => it.id === id ? { ...it, quantity } : it);
    saveToLocal(updated);
  };

  const updateItemFreight = async (id: string, method: 'none' | 'air' | 'sea', cost: number) => {
    const computedAgentCode = method === 'air' ? 'DKR628+AIR' : method === 'sea' ? 'DKR628+SEA' : '';
    if (user && !id.startsWith('guest-')) {
      try {
        await updateDoc(doc(db, 'users', user.uid, 'cart', id), {
          shippingMethod: method,
          freightCost: cost,
          agentCode: computedAgentCode
        });
        return;
      } catch (err) {
        console.warn('Repli mise à jour fret panier local :', err);
      }
    }
    const updated = items.map(it => it.id === id ? {
      ...it,
      shippingMethod: method,
      freightCost: cost,
      agentCode: computedAgentCode
    } : it);
    saveToLocal(updated);
  };

  const removeItem = async (id: string) => {
    if (user && !id.startsWith('guest-')) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'cart', id));
        return;
      } catch (err) {
        console.warn('Repli suppression panier local :', err);
      }
    }
    const updated = items.filter(it => it.id !== id);
    saveToLocal(updated);
  };

  const clearCart = async () => {
    if (user) {
      try {
        const promises = items.map(item =>
          item.id && !item.id.startsWith('guest-')
            ? deleteDoc(doc(db, 'users', user.uid, 'cart', item.id))
            : Promise.resolve()
        );
        await Promise.all(promises);
      } catch (err) {
        console.warn('Repli vidage panier local :', err);
      }
    }
    saveToLocal([]);
  };

  const equipmentTotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const freightTotal = items.reduce((acc, item) => acc + ((item.freightCost || 0) * item.quantity), 0);
  const total = equipmentTotal + freightTotal;

  return (
    <CartContext.Provider value={{
      items,
      addItem,
      updateQuantity,
      updateItemFreight,
      removeItem,
      clearCart,
      equipmentTotal,
      freightTotal,
      total
    }}>
      {children}
    </CartContext.Provider>
  );
};

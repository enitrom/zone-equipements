import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from './AuthContext';

export interface CartItem {
  id?: string;
  productId: number;
  name: string;
  price: number; // Prix équipement hors transport
  quantity: number;
  img: string;
  weightKg?: number;
  shippingMethod?: 'none' | 'air' | 'sea'; // Choix du client
  freightCost?: number; // Montant du fret unitaire calculé
  depositPercentage?: number;
  showDeposit?: boolean;
  agentCode?: string; // Interne : DKR628+AIR ou DKR628+SEA
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
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cartItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CartItem));
      setItems(cartItems);
      if (typeof window !== 'undefined') {
        localStorage.setItem('ze_guest_cart_v5', JSON.stringify(cartItems));
      }
    });

    return () => unsubscribe();
  }, [user]);

  const saveToLocal = (newItems: CartItem[]) => {
    setItems(newItems);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ze_guest_cart_v5', JSON.stringify(newItems));
    }
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
      const existing = items.find(item => item.productId === newItem.productId && item.shippingMethod === itemWithAgent.shippingMethod);
      if (existing && existing.id) {
        await updateDoc(doc(db, 'users', user.uid, 'cart', existing.id), {
          quantity: existing.quantity + newItem.quantity
        });
      } else {
        await addDoc(collection(db, 'users', user.uid, 'cart'), itemWithAgent);
      }
    } else {
      // Guest cart
      const existingIdx = items.findIndex(item => item.productId === newItem.productId && item.shippingMethod === itemWithAgent.shippingMethod);
      if (existingIdx !== -1) {
        const updated = [...items];
        updated[existingIdx].quantity += newItem.quantity;
        saveToLocal(updated);
      } else {
        saveToLocal([...items, { ...itemWithAgent, id: `guest-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` }]);
      }
    }
  };

  const updateQuantity = async (id: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(id);
      return;
    }
    if (user) {
      await updateDoc(doc(db, 'users', user.uid, 'cart', id), { quantity });
    } else {
      const updated = items.map(it => it.id === id ? { ...it, quantity } : it);
      saveToLocal(updated);
    }
  };

  const updateItemFreight = async (id: string, method: 'none' | 'air' | 'sea', cost: number) => {
    const computedAgentCode = method === 'air' ? 'DKR628+AIR' : method === 'sea' ? 'DKR628+SEA' : '';
    if (user) {
      await updateDoc(doc(db, 'users', user.uid, 'cart', id), {
        shippingMethod: method,
        freightCost: cost,
        agentCode: computedAgentCode
      });
    } else {
      const updated = items.map(it => it.id === id ? {
        ...it,
        shippingMethod: method,
        freightCost: cost,
        agentCode: computedAgentCode
      } : it);
      saveToLocal(updated);
    }
  };

  const removeItem = async (id: string) => {
    if (user) {
      await deleteDoc(doc(db, 'users', user.uid, 'cart', id));
    } else {
      const updated = items.filter(it => it.id !== id);
      saveToLocal(updated);
    }
  };

  const clearCart = async () => {
    if (user) {
      const promises = items.map(item => item.id ? deleteDoc(doc(db, 'users', user.uid, 'cart', item.id)) : Promise.resolve());
      await Promise.all(promises);
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

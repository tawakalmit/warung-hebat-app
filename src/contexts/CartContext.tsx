import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CartItem, ManualCartItem, Product } from '../types';
import { generateId } from '../utils/helpers';

interface CartContextType {
  items: CartItem[];
  manualItems: ManualCartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateDiscount: (productId: string, discount: number) => void;
  addManualItem: (name: string, price: number, quantity: number) => void;
  removeManualItem: (id: string) => void;
  updateManualItem: (id: string, name: string, price: number, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [manualItems, setManualItems] = useState<ManualCartItem[]>([]);

  function addItem(product: Product, quantity: number = 1) {
    setItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + quantity,
                subtotal: (item.quantity + quantity) * item.product.sell_price - item.discount,
              }
            : item
        );
      }
      return [
        ...prev,
        {
          product,
          quantity,
          discount: 0,
          subtotal: quantity * product.sell_price,
        },
      ];
    });
  }

  function removeItem(productId: string) {
    setItems(prev => prev.filter(item => item.product.id !== productId));
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems(prev =>
      prev.map(item =>
        item.product.id === productId
          ? {
              ...item,
              quantity,
              subtotal: quantity * item.product.sell_price - item.discount,
            }
          : item
      )
    );
  }

  function updateDiscount(productId: string, discount: number) {
    setItems(prev =>
      prev.map(item =>
        item.product.id === productId
          ? {
              ...item,
              discount,
              subtotal: item.quantity * item.product.sell_price - discount,
            }
          : item
      )
    );
  }

  function addManualItem(name: string, price: number, quantity: number) {
    const newItem: ManualCartItem = {
      id: generateId(),
      name,
      price,
      quantity,
      subtotal: price * quantity,
    };
    setManualItems(prev => [...prev, newItem]);
  }

  function removeManualItem(id: string) {
    setManualItems(prev => prev.filter(item => item.id !== id));
  }

  function updateManualItem(id: string, name: string, price: number, quantity: number) {
    setManualItems(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, name, price, quantity, subtotal: price * quantity }
          : item
      )
    );
  }

  function clearCart() {
    setItems([]);
    setManualItems([]);
  }

  function getTotal(): number {
    const productTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const manualTotal = manualItems.reduce((sum, item) => sum + item.subtotal, 0);
    return productTotal + manualTotal;
  }

  function getItemCount(): number {
    const productCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const manualCount = manualItems.reduce((sum, item) => sum + item.quantity, 0);
    return productCount + manualCount;
  }

  return (
    <CartContext.Provider
      value={{
        items,
        manualItems,
        addItem,
        removeItem,
        updateQuantity,
        updateDiscount,
        addManualItem,
        removeManualItem,
        updateManualItem,
        clearCart,
        getTotal,
        getItemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}

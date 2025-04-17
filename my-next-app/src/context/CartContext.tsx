"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useUser } from "@/context/UserContext"
import { createPortal } from "react-dom"
import { CartItem } from "@/../types/cart";
import { fetchCartApi, addToCartApi, removeFromCartApi, assignCartToUserApi } from "@/api/carts";

interface CartContextType {
  cart: CartItem[]
  addToCart: (product: any, quantity?: number) => void
  removeFromCart: (id: number) => void
  updateQuantity: (id: number, quantity: number) => void
  clearCart: () => void
  assignCartToUser: (userId: number, token: string) => Promise<void>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useUser() // Fetch useruser
  const [toast, setToast] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  const showToast = (message: string) => {
    setToast(message)
    setIsVisible(true)
    setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => setToast(null), 500)
    }, 2500)
  }

  useEffect(() => {
    const loadCart = async () => {
      try {
        const cartData = await fetchCartApi(user?.jwt);
        if (!cartData.data || cartData.data.length === 0) {
          setCart([]);
          return;
        }
        const updatedCart = cartData.data
          .map((item: any) => {
            if (!item.products || item.products.length === 0) return null;
            const product = item.products[0];
            return {
              id: item.id,
              quantity: item.quantity,
              title: product.title,
              price: product.pricing?.price || 0,
              weight: product.weight,
              length: product.length,
              width: product.width,
              height: product.height,
              image: product.media?.[0]?.url ? `http://localhost:1337${product.media[0].url}` : "/placeholder.jpg",
            } as CartItem;
          })
          .filter(Boolean) as CartItem[];
        setCart(updatedCart);
      } catch (error) {
        console.error("Error fetching cart:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCart();
  }, [user?.jwt]);

  useEffect(() => {
    // When user logs in and we have cart items, assign them to the user
    if (user && user.id && user.jwt && cart.length > 0) {
      const assignPromises = cart.map(item => assignCartToUserApi(item.id, user.id, user.jwt));
      Promise.all(assignPromises)
        .then(() => {
          console.log("All cart items assigned to user:", user.id);
          showToast("Cart synchronized with your account!");
        })
        .catch(error => {
          console.error("Error assigning cart to user:", error);
          showToast("Failed to sync cart with your account");
        });
    }
  }, [user, cart]);

  const addToCart = async (product: any, quantity = 1) => {
    const finalQuantity = product.quantity || quantity;
    const itemTotalPrice = (product.pricing?.price || 0) * finalQuantity; // Calculate total price based on quantity
    try {
      const res = await addToCartApi(product.id, finalQuantity, user?.id, user?.jwt);
      if (!res.ok) {
        throw new Error("Failed to add product to cart");
      }
      const newCartItem: CartItem = {
        id: product.id,
        quantity: finalQuantity,
        title: product.title,
        price: product.pricing?.price || 0,
        weight: product.weight,
        length: product.length,
        width: product.width,
        height: product.height,
        image: product.media?.[0]?.url ? `http://localhost:1337${product.media[0].url}` : "/placeholder.jpg",
      };
      setCart((prevCart) => [...prevCart, newCartItem]);
      console.log("Added to cart:", newCartItem);
      showToast("Add to cart successfully!");
    } catch (error) {
      console.error("Error adding to cart:", error);
      showToast("Failed to add to cart!");
    }
  };

  const removeFromCart = async (id: number) => {
    try {
      const res = await removeFromCartApi(id);
      if (!res.ok) {
        throw new Error("Failed to remove item from cart");
      }
      setCart((prevCart) => prevCart.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Error removing from cart:", error);
    }
  };

  const updateQuantity = (id: number, quantity: number) => {
    setCart((prevCart) =>
      prevCart.map((item) => (item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item)),
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const assignCartToUser = async (userId: number, token: string) => {
    if (!cart.length) return;

    try {
      const assignPromises = cart.map(item => assignCartToUserApi(item.id, userId, token));
      await Promise.all(assignPromises);
      console.log("All cart items assigned to user:", userId);
      showToast("Cart synchronized with your account!");
    } catch (error) {
      console.error("Error assigning cart to user:", error);
      showToast("Failed to sync cart with your account");
    }
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, assignCartToUser }}>
      {children}
      {toast &&
        createPortal(
          <div
            className={`fixed top-20 right-5 px-6 py-2 rounded-full shadow-2xl text-rose-500 border-2 border-rose-400 text-sm font-semibold bg-white transition-all duration-700
            ${isVisible ? "animate-bounce opacity-100 scale-105 translate-y-0 ease-out" : "opacity-0 scale-95 translate-y-4 ease-in"}`}
          >
            {toast}
          </div>,
          document.body,
        )}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
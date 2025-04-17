"use client";
import { createContext, useContext, useState, useEffect } from "react";

interface CartItem {
    id: number;
    quantity: number;
    productId: number;
}

interface UserContextType {
    user: any;
    token: string | null;
    cart: CartItem[];
    login: (user: any, token: string) => void;
    logout: () => void;
    addToCart: (productId: number, quantity: number) => void;
    removeFromCart: (productId: number) => void;
    clearCart: () => void;
}

const UserContext = createContext<UserContextType | null>(null);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<any>(null);
    const [token, setToken] = useState<string | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        const storedToken = localStorage.getItem("token");
        const storedCart = localStorage.getItem("cart");

        if (storedUser && storedToken) {
            setUser(JSON.parse(storedUser));
            setToken(storedToken);
        }

        if (storedCart) {
            setCart(JSON.parse(storedCart));
        }
    }, []);

    const login = (user: any, token: string) => {
        setUser(user);
        setToken(token);
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("token", token);
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        setCart([]);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("cart");
    };

    const addToCart = async (productId: number, quantity: number) => {
        if (user) {
            // Thêm sản phẩm vào giỏ hàng local
            const newCart = [...cart, { id: Date.now(), productId, quantity }];
            setCart(newCart);
            localStorage.setItem("cart", JSON.stringify(newCart));

            try {
                const response = await fetch("http://localhost:1337/api/carts", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        data: {
                            productId,
                            quantity,
                            users_permissions_user: {
                                id: user.id,
                            },
                        },
                    }),
                });

                const result = await response.json();
                if (response.ok) {
                    console.log("Cart item added successfully:", result);
                } else {
                    console.error("Failed to add item to cart:", result);
                }
            } catch (error) {
                console.error("Error adding to cart:", error);
            }
        } else {
            console.log("User is not logged in");
        }
    };

    const removeFromCart = (productId: number) => {
        const newCart = cart.filter(item => item.productId !== productId);
        setCart(newCart);
        localStorage.setItem("cart", JSON.stringify(newCart));
    };

    const clearCart = () => {
        setCart([]);
        localStorage.removeItem("cart");
    };

    return (
        <UserContext.Provider value={{ user, token, cart, login, logout, addToCart, removeFromCart, clearCart }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error("useUser must be used within a UserProvider");
    }
    return context;
};

"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { MinusIcon, PlusIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation";
import { fetchPromotions, fetchAmountOffProducts, calculateDiscountedPrice } from "@/api/promotions";
import { PromotionResponse, AmountOffProductResponse } from "../../../types/promotion";
import { Product } from "../../../types/product";
import { it } from "node:test";

export default function CartPage() {
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [promotions, setPromotions] = useState<PromotionResponse | null>(null);
  const [amountOffProducts, setAmountOffProducts] = useState<AmountOffProductResponse | null>(null);

  useEffect(() => {
    const fetchCart = async () => {
      try {
        const cartRes = await fetch(
          "http://localhost:1337/api/carts?populate[products][populate]=media&populate[products][populate]=pricing&populate[products][populate]=categories"
        );
        const cartData = await cartRes.json();

        if (!cartData.data || cartData.data.length === 0) {
          setCart([]);
          return;
        }

        const updatedCart = cartData.data
          .map((item: any) => {
            const product = item.products[0];
            if (!product) return null;

            return {
              ...product,
              id: item.id,
              documentId: product.id,
              quantity: item.quantity,
              image: product.media[0].url
                ? `http://localhost:1337${product.media[0].url}`
                : "/placeholder.jpg",
              pricing: product.pricing,
              isGift: item.isGift || false,
            };
          })
          .filter(Boolean);

        setCart(updatedCart);
      } catch (error) {
        console.error("Error fetching cart:", error);
      } finally {
        setLoading(false);
      }
    };
    // Feature promotion
    const fetchPromotionData = async () => {
      const promotionsData = await fetchPromotions();
      setPromotions(promotionsData);
      const amountOffProductsData = await fetchAmountOffProducts();
      setAmountOffProducts(amountOffProductsData);
    };

    fetchCart();
    fetchPromotionData();
  }, []);

  if (loading) return <p className="text-center py-10 text-xl">Loading...</p>;
  if (cart.length === 0) return <p className="text-center py-10 text-xl">Your cart is empty.</p>;

  const updateQuantity = (documentId: string, newQuantity: number) => {
    setCart((prevCart) => prevCart.map((item) => item.documentId === documentId ? { ...item, quantity: Math.max(1, newQuantity) } : item));
  };

  const totalPrice = cart.reduce((total, item) => {
    const price = item.isGift ? 0 : (promotions && amountOffProducts ? calculateDiscountedPrice(item as Product, promotions, amountOffProducts).discountedPrice : item.pricing.price) || 0;
    return total + price * item.quantity;
  }, 0);
  const handleGoToSubscription = () => {
    const cartItemsWithTotal = cart.map(item => {
      const price = item.isGift ? 0 : (promotions && amountOffProducts ? calculateDiscountedPrice(item as Product, promotions, amountOffProducts).discountedPrice : item.pricing?.price) || 0;
      return {
        ...item,
        totalItemPrice: price * item.quantity,
        itemPrice: price
      };
    });
    localStorage.setItem("cart", JSON.stringify(cartItemsWithTotal));
    localStorage.setItem("cartTotalPrice", JSON.stringify(totalPrice));
    router.push("/checkout?isSubscription=true");
  };
  const handleCheckout = () => {
    const cartItemsWithTotal = cart.map(item => {
      const price = item.isGift ? 0 : (promotions && amountOffProducts ? calculateDiscountedPrice(item as Product, promotions, amountOffProducts).discountedPrice : item.pricing?.price) || 0;
      return {
        ...item,
        totalItemPrice: price * item.quantity,
        itemPrice: price
      };
    });

    localStorage.setItem("cart", JSON.stringify(cartItemsWithTotal));
    localStorage.setItem("cartTotalPrice", JSON.stringify(totalPrice));
    router.push("/checkout");
  };


  return (
    <>
      <Navbar />
      <div className="max-w-5xl mx-auto px-0 py-8 mt-8">
        <h1 className="flex items-center justify-center text-center text-3xl font-bold uppercase text-white bg-rose-400 h-20">Shopping Cart</h1>
        <div className="border-t border-gray-300">
          {/* Title table */}
          <div className="grid grid-cols-5 font-semibold text-base py-3 border-b border-gray-300 text-gray-700 text-center">
            <span className="col-span-2 text-left pl-8">PRODUCT</span>
            <span className="flex items-center">PRICE</span>
            <span className="w-32">QUANTITY</span>
            <span className="text-right pr-8">TOTAL</span>
          </div>
          {/* Products in cart */}
          {cart.map((item: any) => {
            const { discountedPrice } = promotions && amountOffProducts ? calculateDiscountedPrice(item as Product, promotions, amountOffProducts) : { discountedPrice: item.pricing.price };
            const originalPrice = item.pricing?.price;
            const hasDiscount = discountedPrice !== originalPrice && !item.isGift;
            const priceToDisplay = item.isGift ? 0 : discountedPrice;

            return (
              <div key={item.documentId} className="grid grid-cols-5 items-center py-4 border-b border-gray-300 text-center">
                <div className="flex items-center space-x-4 col-span-2 text-left pl-4">
                  <Image src={item.image || "/placeholder.jpg"} alt={item.title || "No Title"} width={80} height={80} className="w-20 h-20 object-cover" />
                  <h2 className="text-lg font-semibold">{item.title}</h2>
                </div>
                <div className="flex items-center gap-2">
                  {hasDiscount && (
                    <span className="text-lg text-gray-400 line-through">${originalPrice}</span> // Chỉ gạch giá cũ khi có giảm giá
                  )}
                  <span className="text-lg font-semibold text-rose-500">${priceToDisplay}</span>
                  {item.isGift && <span className="text-sm text-rose-500 ml-2">(GIFT)</span>}
                </div>
                {/* Quantity */}
                <div className="flex items-center gap-2 border rounded-full px-2 py-1 h-10 justify-center w-32">
                  <button className="text-lg font-bold" onClick={() => updateQuantity(item.documentId, item.quantity - 1)}>
                    <MinusIcon className="h-4 w-4" />
                  </button>
                  <span className="text-lg font-medium px-4">{item.quantity}</span>
                  <button className="text-lg font-semibold" onClick={() => updateQuantity(item.documentId, item.quantity + 1)}>
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
                <span className="text-lg font-semibold text-right pr-8">${(priceToDisplay * item.quantity)}</span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between items-center mt-6 px-4">
          <div className="flex space-x-8">
            <button
              className="bg-rose-100 font-bold text-rose-500 py-2 px-4 rounded-full whitespace-nowrap hover:bg-rose-500 hover:text-white w-auto"
              onClick={handleGoToSubscription}
            >
              GO TO SUBSCRIPTION
            </button>
            <button
              className="bg-rose-400 font-bold text-white whitespace-nowrap py-2 px-8 rounded-full hover:bg-rose-500 w-auto"
              onClick={handleCheckout}
            >
              CHECK OUT
            </button>
          </div>

          <div className="text-2xl font-bold pr-4">Subtotal: &nbsp; ${totalPrice}</div>
        </div>
      </div>
      <Footer />
    </>
  );
}

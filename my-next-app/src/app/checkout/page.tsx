"use client";

import { use, useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTicketSimple } from '@fortawesome/free-solid-svg-icons';
import { loadStripe } from "@stripe/stripe-js";
const stripePromise = loadStripe("pk_test_51R91vrPbbfCp8zjVn18peJqrR2xvL2Q28PV39fa8QBqXui9u47abRheE0tWjEUff53ryeo3GBR25UyzCl1ZDSgX5007KhHxUn7");
import { CardElement, useStripe, useElements, Elements } from "@stripe/react-stripe-js";
import ShippingMethods from "@/app/checkout/ShippingMethods";
import { LineItem } from "@/../types/shipping";

function Checkout() {
    const [cart, setCart] = useState<any[]>([]); // Get cart
    const [userInfo, setUserInfo] = useState({
        name: "",
        address: "",
        city: "",
        phone: "",
        email: "",
    });
    const [loading, setLoading] = useState(false);
    const [saveInfo, setSaveInfo] = useState(false);
    const [useShippingAsBilling, setUseShippingAsBilling] = useState(true);
    const [cartTotalPrice, setCartTotalPrice] = useState<number | null>(null);

    const stripe = useStripe();
    const elements = useElements();
    // Voucher
    const [voucherCode, setVoucherCode] = useState<string>("");
    const [availableVouchers, setAvailableVouchers] = useState<any[]>([]);
    const [selectedVoucher, setSelectedVoucher] = useState<any | null>(null);
    const [discountAmount, setDiscountAmount] = useState<number>(0);
    const [appliedVoucherCodeDisplay, setAppliedVoucherCodeDisplay] = useState<string>("");

    useEffect(() => {
        const storedCart = JSON.parse(localStorage.getItem("cart") || "[]");
        setCart(storedCart);

        const storedTotalPrice = JSON.parse(localStorage.getItem("cartTotalPrice") || "null");
        setCartTotalPrice(storedTotalPrice);
        // useEffect of voucher
        fetchAvailableVouchers();

    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.type === "checkbox") {
            if (e.target.name === "saveInfo") {
                setSaveInfo(e.target.checked);
            } else if (e.target.name === "useShippingAsBilling") {
                setUseShippingAsBilling(e.target.checked);
            }
        } else {
            setUserInfo({ ...userInfo, [e.target.name]: e.target.value });
        }
    };

    // Voucher methods
    const fetchAvailableVouchers = async () => {
        try {
            const response = await fetch("http://localhost:1337/api/amount-off-orders?populate=promotion");
            if (!response.ok) {
                console.error("Failed to fetch vouchers");
                return;
            }
            const data = await response.json();
            setAvailableVouchers(data.data);
        } catch (error) {
            console.error("Error fetching vouchers:", error);
        }
    };

    const handleVoucherInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setVoucherCode(e.target.value);
    };

    const handleApplyVoucher = () => {
        const matchedVoucher = availableVouchers.find(
            (voucher) => voucher?.promotion?.code?.toLowerCase() === voucherCode.toLowerCase()
        );

        if (matchedVoucher) {
            setSelectedVoucher(matchedVoucher);
            setAppliedVoucherCodeDisplay(matchedVoucher.promotion?.code);
            calculateDiscount(matchedVoucher);
        } else {
            alert("Invalid voucher code.");
            setSelectedVoucher(null);
            setDiscountAmount(0);
            setAppliedVoucherCodeDisplay("");
            setVoucherCode("");
        }
    };

    const calculateDiscount = (voucher: any) => {
        if (!cartTotalPrice) return;

        const discountType = voucher.discountType;
        const discountValue = voucher.discountValue;
        const percentage = voucher.percentage;
        let calculatedDiscount = 0;

        if (discountType === "fixedAmount" && typeof discountValue === 'number') {
            calculatedDiscount = discountValue;
        } else if (discountType === "percentage" && typeof percentage === 'number') {
            calculatedDiscount = (cartTotalPrice * percentage) / 100;
        }

        setDiscountAmount(calculatedDiscount);
    };

    // Shipping methods
    const [selectedShippingMethodId, setSelectedShippingMethodId] = useState<
        number | null
    >(null);
    const [shippingCost, setShippingCost] = useState<number>(0);

    const lineItemsForShipping: LineItem[] = cart.map((item) => ({
        quantity: item.quantity,
        weight: item.weight || 0,
        length: item.length || 0,
        width: item.width || 0,
        height: item.height || 0,
    }));
    const handleShippingMethodSelect = (methodId: number, cost: number) => {
        setSelectedShippingMethodId(methodId - 1);
        setShippingCost(parseFloat(cost.toFixed(2)));
        console.log("Selected Shipping Method:", methodId - 1, "Cost:", cost);
    };

    const handlePayment = async () => {
        const token = localStorage.getItem("token");

        if (!token) {
            alert("You need to log in before making a payment!");
            setLoading(false);
            return;
        }
        setLoading(true);

        try {
            let userId;
            console.log("User Id:", userId);
            // Get total price of cart
            const totalAmount = (getTotal() + shippingCost - discountAmount) * 10; // Convert to cents
            if (totalAmount <= 0) {
                alert("Cart is empty!");
                setLoading(false);
                return;
            }

            // Send cart data to the server to create an order
            const orderResponse = await fetch("http://localhost:1337/api/orders", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    data: {
                        users_permissions_user: { id: 2 },
                        totalPrice: (cartTotalPrice || 0) + (shippingCost || 0),
                        name: userInfo.name,
                        address: userInfo.address,
                        city: userInfo.city,
                        phone: userInfo.phone,
                        email: userInfo.email,
                        statusCheckout: "Pending",
                        shipping: { id: selectedShippingMethodId },
                        shippingCost: shippingCost,

                        discountAmount: discountAmount,
                        voucherCode: appliedVoucherCodeDisplay,

                        lineItems: cart.map((item) => ({
                            product: { id: item.id },
                            quantity: item.quantity,
                            price: item.price,
                            title: item.title,
                            // Shipping need
                            weight: item.weight,
                            length: item.length,
                            width: item.width,
                            height: item.height,
                        })),
                    },
                }),
            });

            const orderData = await orderResponse.json();
            if (!orderResponse.ok) {
                alert("Failed to place order!");
                setLoading(false);
                return;
            }

            console.log("Order created:", orderData);
            const orderId = orderData.data.id; // Get order id from response
            let finalOrderId = orderId - 1;

            // Wait for a few seconds to ensure the order is fully created
            setTimeout(async () => {
                if (!stripe || !elements) {
                    alert("Stripe is not loaded!");
                    setLoading(false);
                    return;
                }

                const cardElement = elements.getElement(CardElement);
                if (!cardElement) {
                    alert("Card Element not found!");
                    setLoading(false);
                    return;
                }

                // Create PaymentMethod
                const { error: pmError, paymentMethod } =
                    await stripe.createPaymentMethod({
                        type: "card",
                        card: cardElement,
                        billing_details: {
                            name: userInfo.name,
                            email: userInfo.email,
                        },
                    });

                if (pmError) {
                    console.error("Payment method creation failed:", pmError);
                    alert(`Payment failed: ${pmError.message}`);
                    setLoading(false);
                    return;
                }

                console.log("Payment Method created:", paymentMethod);

                const totalPriceInCents = Math.round(((cartTotalPrice || 0) + (typeof shippingCost === 'number' ? shippingCost : 0) - discountAmount) * 100);
                // Create payment intent and link it with order
                const paymentResponse = await fetch(
                    "http://localhost:1337/api/payments",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            data: {
                                amount: totalPriceInCents * 10,
                                currency: "USD",
                                users_permissions_user: { id: 2 },
                                order: { id: finalOrderId },
                                paymentMethodId: paymentMethod.id,
                                email: userInfo.email,
                            },
                        }),
                    }
                );

                const paymentData = await paymentResponse.json();
                console.log("Payment response:", paymentData); // Log the entire payment response
                console.log("Payment clientSecret:", paymentData.clientSecret); // Log the payment data
                if (!paymentResponse.ok || !paymentData.clientSecret) {
                    alert("Failed to create payment intent!");
                    setLoading(false);
                    return;
                }

                console.log("Payment Intent created:", paymentData);

                // Confirm Payment
                const { error, paymentIntent } = await stripe.confirmCardPayment(
                    paymentData.clientSecret,
                    {
                        payment_method: paymentMethod.id,
                    }
                );

                if (error) {
                    console.error("Payment failed:", error);
                    alert(`Payment failed: ${error.message}`);
                } else if (paymentIntent && paymentIntent.status === "succeeded") {
                    alert("Payment successful!");
                    // Update payment status to "Succeeded" in Strapi
                    const updatePaymentStatus = await fetch(
                        `http://localhost:1337/api/payments/${paymentData.data.id}`,
                        {
                            method: "PUT",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({
                                data: {
                                    statusPayment: "Succeeded",
                                },
                            }),
                        }
                    );

                    if (updatePaymentStatus.ok) {
                        localStorage.setItem("cart", "[]");
                        setCart([]);
                    } else {
                        alert("Failed to update payment status!");
                    }
                }
            }, 3000); // Delay 3 seconds to ensure order is created
        } catch (error) {
            console.error("Error processing payment:", error);
            alert("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const getTotal = () => {
        return cart.reduce((total, item) => total + item.price * item.quantity, 0);
    };

    const formatCurrency = (amount: number | undefined | null) => {
        if (typeof amount !== 'number') {
            return '$0.00';
        }
        return `$${amount.toLocaleString()}`;
    };

    return (
        <>
            <Navbar />
            <div className="min-h-screen bg-gray-50 p-20">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row">
                        {/* Left side */}
                        <section className="md:w-2/3 p-6 overflow-y-auto">
                            {/* Information section */}
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold mb-4">Delivery</h2>
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Your name"
                                    className="w-full p-3 border rounded-xl mb-4"
                                    value={userInfo.name}
                                    onChange={handleChange}
                                />
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <input
                                        type="text"
                                        name="phone"
                                        placeholder="Your phone number"
                                        className="w-full p-3 border rounded-xl"
                                        value={userInfo.phone}
                                        onChange={handleChange}
                                    />
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="Your email"
                                        className="w-full p-3 border rounded-xl"
                                        value={userInfo.email}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <input
                                        type="text"
                                        name="address"
                                        placeholder="Address"
                                        className="w-full p-3 border rounded-xl"
                                        value={userInfo.address}
                                        onChange={handleChange}
                                    />
                                    <input
                                        type="text"
                                        name="city"
                                        placeholder="City"
                                        className="w-full p-3 border rounded-xl"
                                        value={userInfo.city}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            {/* Voucher section*/}
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold mb-4 flex items-center relative">
                                    Voucher
                                    {selectedVoucher && (
                                        <div className="relative ml-4 flex items-center justify-center w-6 h-6 text-white font-semibold text-xs">
                                            <FontAwesomeIcon
                                                icon={faTicketSimple}
                                                size="2x"
                                                color="oklch(64.5% 0.246 16.439)"
                                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                                            />
                                            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-semibold text-white">
                                                {selectedVoucher?.discountType === "percentage" && `-${selectedVoucher.percentage}%`}
                                                {selectedVoucher?.discountType === "fixedAmount" && `-${formatCurrency(selectedVoucher.discountValue)}`}
                                            </span>
                                        </div>
                                    )}
                                </h2>
                                <div className="mb-4 flex">
                                    <input
                                        type="text"
                                        id="voucherCode"
                                        className="w-full p-3 border rounded-xl"
                                        value={voucherCode}
                                        onChange={handleVoucherInputChange}
                                    />
                                    <button
                                        onClick={handleApplyVoucher}
                                        className="bg-rose-400 hover:bg-rose-500 text-white font-bold py-2 px-4 rounded-full w-40 ml-2"
                                    >
                                        APPLY
                                    </button>

                                </div>
                            </div>

                            {/* Shipping method */}
                            <div className="mb-8">
                                <ShippingMethods
                                    lineItems={lineItemsForShipping}
                                    totalPrice={getTotal()}
                                    onSelectShippingMethod={handleShippingMethodSelect}
                                />
                            </div>

                            {/* Payment section */}
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold mb-4">Payment</h2>
                                <div className="border rounded-xl mb-4">
                                    <div className="p-3 flex justify-between items-center rounded-xl bg-rose-100">
                                        <span className="font-medium ">Credit card</span>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        {/* Card Number */}
                                        <div className="h-10 bg-gray-200 rounded-xl">
                                            <CardElement
                                                className="border p-3 rounded-md"
                                                options={{ hidePostalCode: true }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Right side */}
                        <aside className="md:w-1/3 pt-24 pr-20 bg-gray-100 p-6 md:fixed md:top-0 md:right-0 md:bottom-0 md:overflow-y-auto">
                            <div className="max-w-md mx-auto h-full flex flex-col">
                                <div className="flex-grow">
                                    <div className="mb-6 space-y-4">
                                        {cart.map((item) => (
                                            <div key={item.id} className="flex items-center">
                                                <div className="relative mr-4">
                                                    <div className="w-16 h-16 rounded-md flex items-center justify-center overflow-hidden">
                                                        <Image
                                                            src={item.image || "/placeholder.jpg"}
                                                            alt={item.title || "No Title"}
                                                            width={64}
                                                            height={64}
                                                            className="w-16 h-16 object-cover"
                                                        />
                                                        <div className="absolute -top-2 -right-2 bg-rose-400 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">
                                                            {item.quantity}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex-grow">
                                                    <p>{item.title}</p>
                                                </div>
                                                <div className="text-right">
                                                    {formatCurrency(item.totalItemPrice)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="border-t border-gray-300 pt-4 space-y-2">
                                        <div className="flex justify-between">
                                            <span>Subtotal · {cart.length} items</span>
                                            <span>{formatCurrency(cartTotalPrice)}</span>
                                        </div>
                                        {/* Add discount cost */}
                                        {selectedVoucher && (
                                            <div className="flex justify-between">
                                                <span>
                                                    Voucher {selectedVoucher?.promotion?.code}
                                                </span>
                                                <span className="font-medium text-sm text-rose-500">-
                                                    {selectedVoucher?.discountType === "fixedAmount" &&
                                                        typeof selectedVoucher?.discountValue === "number"
                                                        ? formatCurrency(selectedVoucher.discountValue)
                                                        : selectedVoucher?.discountType === "percentage" &&
                                                            typeof selectedVoucher?.percentage === "number" ? formatCurrency(
                                                                ((cartTotalPrice || 0) * selectedVoucher.percentage) / 100
                                                            )
                                                            : "-"}
                                                </span>
                                            </div>
                                        )}

                                        {/* Shipping cost */}
                                        <div className="flex justify-between">
                                            <span>Shipping</span>
                                            <span className="font-medium text-sm text-rose-500">
                                                {shippingCost > 0
                                                    ? formatCurrency(shippingCost)
                                                    : "FREE"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Total */}
                                    <div className="border-t border-gray-300 mt-4 pt-4 flex justify-between items-center">
                                        <span className="text-lg font-medium">Total</span>
                                        <div className="text-2xl font-bold text-rose-500">
                                            {formatCurrency((cartTotalPrice || 0) + shippingCost - discountAmount)}
                                        </div>
                                    </div>
                                </div>
                                {/* Button Pay now */}
                                <div className="mb-8">
                                    <button
                                        onClick={handlePayment}
                                        disabled={!stripe || loading}
                                        className={`w-full py-4 rounded-full text-center font-bold text-white ${loading
                                            ? "bg-rose-400"
                                            : "bg-rose-400 hover:bg-rose-500"
                                            }`}
                                    >
                                        {loading ? "Processing..." : "PAY NOW"}
                                    </button>
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </div>
        </>
    );
}

export default function CheckoutPage() {
    return (
        <Elements stripe={stripePromise}>
            <Checkout />
        </Elements>
    );
}


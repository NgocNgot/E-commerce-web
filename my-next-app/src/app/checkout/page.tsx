"use client";

import { loadStripe } from "@stripe/stripe-js";
import { use, useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import Navbar from "@/components/Navbar";
import { useStripe, useElements, Elements, CardElement } from "@stripe/react-stripe-js";
import { User } from "@/../types/users";
import { fetchUserById } from "../../api/users";
import ShippingMethods from "@/app/checkout/ShippingMethods"; // Keep this as it is already a separate component
import { LineItem } from "@/../types/shipping";

import DeliveryInformation from "./DeliveryInformation";
import SubscriptionOptions from "./SubscriptionOptions";
import VoucherSection from "./VoucherSection";
import OrderSummary from "./Order";
import PaymentSection from "./PaymentSection";

const stripePromise = loadStripe("pk_test_51R91vrPbbfCp8zjVn18peJqrR2xvL2Q28PV39fa8QBqXui9u47abRheE0tWjEUff53ryeo3GBR25UyzCl1ZDSgX5007KhHxUn7");

function Checkout() {
    const searchParams = useSearchParams();
    const [showSubscriptionOptions, setShowSubscriptionOptions] = useState(false);
    const [cart, setCart] = useState<any[]>([]);
    const [userInfo, setUserInfo] = useState({
        name: "",
        address: "",
        city: "",
        phone: "",
        email: "",
    });
    const [userId, setUserId] = useState<number | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);
    const [saveInfo, setSaveInfo] = useState(false);
    const [useShippingAsBilling, setUseShippingAsBilling] = useState(true);
    const [cartTotalPrice, setCartTotalPrice] = useState<number | null>(null);

    const router = useRouter();
    const stripe = useStripe();
    const elements = useElements();

    // Voucher
    const [voucherCode, setVoucherCode] = useState<string>("");
    const [availableVouchers, setAvailableVouchers] = useState<any[]>([]);
    const [selectedVoucher, setSelectedVoucher] = useState<any | null>(null);
    const [discountAmount, setDiscountAmount] = useState<number>(0);
    const [appliedVoucherCodeDisplay, setAppliedVoucherCodeDisplay] = useState<string>("");
    const [usedVoucher, setUsedVoucher] = useState<string | null>(null);

    // Subscription options
    const [subscriptionFrequencyType, setSubscriptionFrequencyType] = useState<string>("Week");
    const [subscriptionFrequencyInterval, setSubscriptionFrequencyInterval] = useState<number>(1);
    const handleFrequencyTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSubscriptionFrequencyType(e.target.value);
        console.log("subscriptionFrequencyType đã thay đổi thành:", e.target.value);
    };

    const handleFrequencyIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSubscriptionFrequencyInterval(parseInt(e.target.value));
        console.log("subscriptionFrequencyInterval đã thay đổi thành:", parseInt(e.target.value));
    };


    const [cities, setCities] = useState([]);
    useEffect(() => {
        const fetchCities = async () => {
            try {
                const res = await fetch('https://provinces.open-api.vn/api/?depth=1');
                const data = await res.json();
                setCities(data);
            } catch (err) {
                console.error('Error fetching cities:', err);
            }
        };

        fetchCities();
        const isSubscription = searchParams.get('isSubscription');
        if (isSubscription === 'true') {
            setShowSubscriptionOptions(true);
        }

        const storedCart = JSON.parse(localStorage.getItem("cart") || "[]");
        setCart(storedCart);

        const storedTotalPrice = JSON.parse(localStorage.getItem("cartTotalPrice") || "null");
        setCartTotalPrice(storedTotalPrice);

        const storedUserId = localStorage.getItem('userId');
        console.log("User ID from localStorage on Checkout load:", storedUserId);
        if (storedUserId) {
            try {
                const parsedUserId = JSON.parse(storedUserId);
                setUserId(parsedUserId);
                fetchCurrentUser(parsedUserId);
            } catch (error) {
                console.error("Error parsing userId from localStorage:", error);
                setUserId(null);
            }
        } else {
            alert("User ID not found. Please log in again.");
        }
        fetchAvailableVouchers(userId);

    }, [searchParams]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

    const fetchCurrentUser = async (id: number) => {
        const user = await fetchUserById(id);
        if (user) {
            setCurrentUser(user);
        } else {
            console.error(`Could not fetch user with ID: ${id}`);
            alert("Error fetching user details. Please log in again.");
            setUserId(null);
            setCurrentUser(null);
        }
    };
    const handleVoucherInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setVoucherCode(e.target.value);
    };
    const handleApplyVoucher = () => {
        const voucherCodeToCompare = voucherCode.trim().toUpperCase();

        if (usedVoucher === voucherCodeToCompare) {
            alert("Voucher đã được sử dụng và không thể dùng lại.");
            setVoucherCode("");
            return;
        }

        const matchedPromotion = availableVouchers.find(
            (voucher) => voucher?.promotion?.code?.trim().toUpperCase() === voucherCodeToCompare
        )?.promotion;

        if (matchedPromotion) {
            if (matchedPromotion.maximumUses !== null && matchedPromotion.maximumUses > 0 && matchedPromotion.usageCount >= matchedPromotion.maximumUses) {
                alert("This voucher code has expired!");
                setSelectedVoucher(null);
                setDiscountAmount(0);
                setAppliedVoucherCodeDisplay("");
                setVoucherCode("");
                return;
            }
            const isExcludedUser = matchedPromotion.excludedUsers?.some(
                (excludedUser: any) => excludedUser.id === userId
            );

            if (isExcludedUser) {
                alert("You cannot use this voucher!");
                setSelectedVoucher(null);
                setDiscountAmount(0);
                setAppliedVoucherCodeDisplay("");
                setVoucherCode("");
            } else {
                const matchedVoucher = matchedPromotion.amount_off_order?.[0];
                if (matchedVoucher) {
                    setSelectedVoucher({
                        ...matchedVoucher,
                        promotion: {
                            code: matchedPromotion.code,
                            documentId: matchedPromotion.documentId,
                            usageCount: matchedPromotion.usageCount,
                            maximumUses: matchedPromotion.maximumUses,
                        },
                    });
                    setAppliedVoucherCodeDisplay(matchedPromotion.code);
                    calculateDiscount({ ...matchedVoucher, promotion: { code: matchedPromotion.code } });
                } else {
                    alert("Invalid voucher code.");
                    setSelectedVoucher(null);
                    setDiscountAmount(0);
                    setAppliedVoucherCodeDisplay("");
                    setVoucherCode("");
                }
            }
        }
    };
    const fetchAvailableVouchers = async (currentUserId: number | null) => {
        try {
            const response = await fetch("http://localhost:1337/api/promotions?populate=*");
            if (!response.ok) {
                console.error("Failed to fetch promotions with voucher info");
                return;
            }
            const data = await response.json();
            const promotions = data.data;
            const now = new Date();
            const availableVouchers: any[] = [];

            promotions.forEach((promotion: any) => {
                const startDate = new Date(promotion.startDate);
                const endDate = new Date(promotion.endDate);
                const isWithinDateRange = now >= startDate && now <= endDate;

                if (isWithinDateRange && promotion.amount_off_order && promotion.amount_off_order.length > 0) {
                    promotion.amount_off_order.forEach((orderVoucher: any) => {
                        availableVouchers.push({ ...orderVoucher, promotion: { ...promotion } });
                    });
                }
            });

            console.log("Available vouchers:", availableVouchers);
            setAvailableVouchers(availableVouchers);

        } catch (error) {
            console.error("Error fetching vouchers:", error);
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
        totalItemPrice: item.totalItemPrice || 0,
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
            if (!userId) {
                alert("User ID not found. Please log in again.");
                setLoading(false);
                return;
            }
            const totalAmount =
                (getTotal() + shippingCost - discountAmount) * 10;
            if (totalAmount <= 0) {
                alert("Cart is empty!");
                setLoading(false);
                return;
            }

            const orderDataToSend = {
                data: {
                    users_permissions_user: { id: userId },
                    totalPrice: ((cartTotalPrice || 0) + (shippingCost || 0) - (discountAmount || 0)).toFixed(2),
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
                        weight: item.weight,
                        length: item.length,
                        width: item.width,
                        height: item.height,

                        itemPrice: item.itemPrice,
                        totalItemPrice: item.totalItemPrice,
                    })),
                },
            };

            const orderResponse = await fetch(
                "http://localhost:1337/api/orders",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(orderDataToSend),
                }
            );

            const orderData = await orderResponse.json();
            if (!orderResponse.ok) {
                alert("Failed to place order!");
                setLoading(false);
                return;
            }

            console.log("Order created:", orderData);
            const orderId = orderData.data.id;
            let initialOrderId = orderId - 1;
            let subscriptionCreated = false;
            const confirmedAt = new Date().toISOString();

            setTimeout(async () => {
                let paymentMethodId: string | null = null;
                if (stripe && elements) {
                    const cardElement = elements.getElement(CardElement);
                    if (cardElement) {
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
                        paymentMethodId = paymentMethod.id;
                    }
                }

                const totalPriceInCents = Math.round(((cartTotalPrice || 0) + (typeof shippingCost === 'number' ? shippingCost : 0) - discountAmount) * 100);

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
                                users_permissions_user: { id: userId },
                                order: { id: initialOrderId },
                                paymentMethodId: paymentMethodId,
                                email: userInfo.email,
                                statusPayment: showSubscriptionOptions ? "Pending" : "Succeeded",
                                isSubscriptionPayment: showSubscriptionOptions,
                                subscriptionFrequencyType: showSubscriptionOptions ? subscriptionFrequencyType : null,
                                subscriptionFrequencyInterval: showSubscriptionOptions ? subscriptionFrequencyInterval : null,
                            },
                        }),
                    }
                );

                const paymentData = await paymentResponse.json();
                if (!paymentResponse.ok || !paymentData.clientSecret) {
                    alert("Failed to create payment intent!");
                    setLoading(false);
                    return;
                }
                const paymentId = paymentData.data.id - 1;
                let nextOrderDate = null;
                const confirmedDate = new Date(confirmedAt);

                if (showSubscriptionOptions && subscriptionFrequencyType && subscriptionFrequencyInterval) {
                    let nextDate = new Date(confirmedDate);
                    if (subscriptionFrequencyType === "Week") {
                        const intervalInDays = 7 / subscriptionFrequencyInterval;
                        nextDate.setDate(nextDate.getDate() + intervalInDays);
                    } else if (subscriptionFrequencyType === "Month") {
                        const firstOrderDayOfMonth = confirmedDate.getDate();
                        const intervalInDays = Math.round(getNumberOfDaysInMonth(confirmedDate.getFullYear(), confirmedDate.getMonth()) / subscriptionFrequencyInterval);

                        nextDate.setDate(firstOrderDayOfMonth + intervalInDays);

                        const daysInNextMonth = getNumberOfDaysInMonth(nextDate.getFullYear(), nextDate.getMonth());
                        if (nextDate.getDate() > daysInNextMonth) {
                            nextDate.setDate(daysInNextMonth);
                        }
                    }
                    nextOrderDate = nextDate.toISOString();
                    function getNumberOfDaysInMonth(year: number, month: number) {
                        return new Date(year, month + 1, 0).getDate();
                    }

                    const subscriptionResponse = await fetch(
                        "http://localhost:1337/api/subscriptions",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({
                                data: {
                                    users_permissions_users: { id: userId },
                                    orders: { id: initialOrderId },
                                    payments: { id: paymentId },
                                    frequencyType: subscriptionFrequencyType,
                                    frequencyInterval: subscriptionFrequencyInterval,
                                    statusSubscription: "Pending",
                                    confirmedAt: new Date().toISOString(),
                                    nextOrderDate: nextOrderDate,
                                },
                            }),
                        }
                    );


                    const subscriptionData = await subscriptionResponse.json();
                    console.log("Subscription created:", subscriptionData);
                    if (!subscriptionResponse.ok) {
                        console.log("Failed to create subscription!");
                        alert("Failed to create subscription!");
                        setLoading(false);
                        return;
                    }
                    console.log("Subscription created successfully!");
                    subscriptionCreated = true;
                }
                localStorage.removeItem("cart");
                localStorage.removeItem("cartTotalPrice");
                setCart([]);
                setAppliedVoucherCodeDisplay("");
                setDiscountAmount(0);
                setSelectedVoucher(null);
                setVoucherCode("");
                router.push("/");

                if (showSubscriptionOptions) {
                    if (subscriptionCreated) {
                        alert("Payment successful!");
                    } else {
                        alert("Payment successful, but subscription creation failed!");
                    }
                } else {
                    alert("Payment successful!");
                }

                console.log("Attempting to update voucher usage count...");
                if (appliedVoucherCodeDisplay && selectedVoucher?.promotion?.documentId) {
                    const updateVoucherResponse = await fetch(
                        `http://localhost:1337/api/promotions/${selectedVoucher.promotion.documentId}`,
                        {
                            method: "PUT",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({
                                data: {
                                    usageCount: (selectedVoucher.promotion.usageCount || 0) + 1,
                                },
                            }),
                        }
                    );

                    if (!updateVoucherResponse.ok) {
                        console.error(`Failed to update voucher usage count on the server. Status: ${updateVoucherResponse.status}`);
                    } else {
                        console.log(`Voucher usage count updated successfully on the server. Status: ${updateVoucherResponse.status}`);
                    }
                }
            }, 3000);
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
                            <DeliveryInformation
                                userInfo={userInfo}
                                cities={cities}
                                handleChange={handleChange}
                            />

                            <SubscriptionOptions
                                showSubscriptionOptions={showSubscriptionOptions}
                                subscriptionFrequencyType={subscriptionFrequencyType}
                                subscriptionFrequencyInterval={subscriptionFrequencyInterval}
                                handleFrequencyTypeChange={handleFrequencyTypeChange}
                                handleFrequencyIntervalChange={handleFrequencyIntervalChange}
                            />

                            <VoucherSection
                                voucherCode={voucherCode}
                                selectedVoucher={selectedVoucher}
                                handleVoucherInputChange={handleVoucherInputChange}
                                handleApplyVoucher={handleApplyVoucher}
                                formatCurrency={formatCurrency}
                            />

                            <div className="mb-8">
                                <ShippingMethods
                                    lineItems={lineItemsForShipping}
                                    totalPrice={getTotal()}
                                    onSelectShippingMethod={handleShippingMethodSelect}
                                />
                            </div>

                            <PaymentSection />

                        </section>

                        {/* Right side */}
                        <OrderSummary
                            cart={cart}
                            cartTotalPrice={cartTotalPrice}
                            selectedVoucher={selectedVoucher}
                            shippingCost={shippingCost}
                            discountAmount={discountAmount}
                            formatCurrency={formatCurrency}
                            handlePayment={handlePayment}
                            loading={loading}
                            stripe={stripe}
                        />

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
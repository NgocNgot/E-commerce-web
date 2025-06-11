import React from 'react';
import Image from "next/image";

interface OrderSummaryProps {
    cart: any[];
    cartTotalPrice: number | null;
    selectedVoucher: any;
    shippingCost: number;
    discountAmount: number;
    formatCurrency: (amount: number | undefined | null) => string;
    handlePayment: () => void;
    loading: boolean;
    stripe: any;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
    cart,
    cartTotalPrice,
    selectedVoucher,
    shippingCost,
    discountAmount,
    formatCurrency,
    handlePayment,
    loading,
    stripe,
}) => {
    return (
        <aside className="md:w-1/3 bg-gray-100 p-6 md:sticky md:top-20 h-fit space-y-4">
            <div className="max-w-md mx-auto flex flex-col space-y-4">
                <div className="space-y-4">
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

                    {selectedVoucher && (
                        <div className="flex justify-between">
                            <span>
                                Voucher · {selectedVoucher?.promotion?.code}
                            </span>
                            <span className="font-medium text-sm text-rose-500">-
                                {selectedVoucher?.discountType === "fixedAmount" &&
                                    typeof selectedVoucher?.discountValue === "number"
                                    ? formatCurrency(selectedVoucher.discountValue)
                                    : selectedVoucher?.discountType === "percentage" &&
                                        typeof selectedVoucher?.percentage === "number"
                                        ? formatCurrency(
                                            ((cartTotalPrice || 0) * selectedVoucher.percentage) / 100
                                        )
                                        : "-"}
                            </span>
                        </div>
                    )}

                    <div className="flex justify-between">
                        <span>Shipping</span>
                        <span className="font-medium text-sm text-rose-500">
                            {shippingCost > 0
                                ? formatCurrency(shippingCost)
                                : "FREE"}
                        </span>
                    </div>
                </div>

                <div className="border-t border-gray-300 mt-4 pt-4 flex justify-between items-center">
                    <span className="text-lg font-medium">Total</span>
                    <div className="text-2xl font-bold text-rose-500">
                        {formatCurrency(
                            (cartTotalPrice || 0) + shippingCost - discountAmount
                        )}
                    </div>
                </div>

                {/* PAY NOW Button */}
                <button
                    onClick={handlePayment}
                    disabled={!stripe || loading}
                    className={`w-full py-4 mt-4 rounded-full text-center font-bold text-white ${loading
                        ? "bg-rose-400"
                        : "bg-rose-400 hover:bg-rose-500"
                        }`}
                >
                    {loading ? "Processing..." : "PAY NOW"}
                </button>
            </div>
        </aside>
    );
};

export default OrderSummary;
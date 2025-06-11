import React from 'react';
import { CardElement } from "@stripe/react-stripe-js";

interface PaymentSectionProps { }

const PaymentSection: React.FC<PaymentSectionProps> = () => {
    return (
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
    );
};

export default PaymentSection;
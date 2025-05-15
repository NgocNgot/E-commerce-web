import React from 'react';
import Image from 'next/image';

const PaymentSuccessPage = () => {
    return (
        <div className="relative w-full h-150 overflow-hidden">
            <Image
                src="http://localhost:1337/uploads/payment_success_3b5a3eb8bc.png"
                alt="payment-success-img"
                layout="fill"
                objectFit="cover"
                className="object-cover w-full h-full"
            />
        </div>
    );
};

export default PaymentSuccessPage;
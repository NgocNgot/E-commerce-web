"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
function ConfirmSubscriptionPage() {
    const { subscriptionId } = useParams<{ subscriptionId: string }>();
    const [confirmationStatus, setConfirmationStatus] = useState('Confirming...');
    const router = useRouter();

    useEffect(() => {
        if (!subscriptionId) {
            setConfirmationStatus('Invalid url.');
            return;
        }

        const confirmSubscription = async () => {
            try {
                const response = await fetch(
                    `http://localhost:1337/api/subscriptions/${subscriptionId}`,
                    {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            data: {
                                statusSubscription: 'Active',
                                confirmedAt: new Date().toISOString(),
                            },
                        }),
                    }
                );

                if (response.ok) {
                    setConfirmationStatus('Confirmation successful! Your subscription has been activated.');
                    setTimeout(() => {
                        window.close();
                    }, 5000);
                } else {
                    const errorData = await response.json();
                    console.error('Error confirming subscription:', errorData);
                    setConfirmationStatus(`Confirmation failed. Error: ${errorData?.error?.message || response.statusText}`);
                }
            } catch (error) {
                console.error('Fetch error:', error);
                setConfirmationStatus('Confirmation failed. Could not connect to the server.');
            }
        };

        confirmSubscription();
    }, [subscriptionId, router]);

    return (
        <div className="relative w-full h-150 overflow-hidden">
            <Image
                src="http://localhost:1337/uploads/confirm_subscription_7b870a9c0c.png"
                alt="confirm-subscription-img"
                layout="fill"
                objectFit="cover"
                className="object-cover w-full h-full"
            />
        </div>
    );
}

export default ConfirmSubscriptionPage;
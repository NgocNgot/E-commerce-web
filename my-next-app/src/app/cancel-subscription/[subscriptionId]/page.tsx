"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
function CancelSubscriptionPage() {
    const { subscriptionId } = useParams<{ subscriptionId: string }>();
    const [cancelStatus, setCancelStatus] = useState('Canceling...');
    const router = useRouter();

    useEffect(() => {
        if (!subscriptionId) {
            setCancelStatus('Invalid url.');
            return;
        }

        const cancelSubscription = async () => {
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
                                statusSubscription: 'Cancelled',
                            },
                        }),
                    }
                );

                if (response.ok) {
                    setCancelStatus('Cancel successful! Your subscription has been cancelled.');
                    setTimeout(() => {
                        window.close();
                    }, 5000);
                } else {
                    const errorData = await response.json();
                    console.error('Error cancel subscription:', errorData);
                    setCancelStatus(`Cancel failed. Error: ${errorData?.error?.message || response.statusText}`);
                }
            } catch (error) {
                console.error('Fetch error:', error);
                setCancelStatus('Cancel failed. Could not connect to the server.');
            }
        };

        cancelSubscription();
    }, [subscriptionId, router]);

    return (
        <div className="relative w-full h-150 overflow-hidden">
            <Image
                src="http://localhost:1337/uploads/cancel_subscription_e62835c195.png"
                alt="cancel-subscription-img"
                layout="fill"
                objectFit="cover"
                className="object-cover w-full h-full"
            />
        </div>
    );
}

export default CancelSubscriptionPage;
import React, { useState, useEffect, useMemo } from 'react';
// Add shipping
import { ShippingMethodsProps, ShippingMethod, LineItem } from '@/../types/shipping';
import { fetchShippingMethodsApi } from '@/api/shipping';

const ShippingMethods: React.FC<ShippingMethodsProps> = ({ lineItems, totalPrice, onSelectShippingMethod }) => {
    const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
    const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
    const [shippingCosts, setShippingCosts] = useState<{ [key: string]: number }>({});
    const totalLineItemsPrice = useMemo(() => {
        return lineItems.reduce((sum, item) => sum + item.totalItemPrice, 0);
    }, [lineItems]);
    useEffect(() => {
        const loadShippingMethods = async () => {
            try {
                const methods = await fetchShippingMethodsApi();
                setShippingMethods(methods);
            } catch (error) {
                console.error('Error loading shipping methods:', error);
            }
        };

        loadShippingMethods();
    }, []);

    useEffect(() => {
        if (shippingMethods.length > 0) {
            calculateShippingCosts();
        }
    }, [shippingMethods, lineItems, totalPrice]); // Add totalPrice to dependencies

    const calculateShippingCosts = () => {
        const calculatedCosts: { [key: string]: number } = {};
        shippingMethods.forEach((method) => {
            let totalWeight = 0;
            let totalVolume = 0;

            lineItems.forEach((item) => {
                totalWeight += item.weight * item.quantity;
                totalVolume += item.length * item.width * item.height * item.quantity;
            });

            let shippingCost = 0;
            if (method.shippingMethodId === 'FREE_OVER' && totalLineItemsPrice >= 50) {
                shippingCost = 0;
            } else {
                const applicableRate = method.shipping_rates.find(
                    (rate) => totalWeight >= rate.minWeight && totalWeight <= rate.maxWeight &&
                        totalVolume >= rate.minVolume && totalVolume <= rate.maxVolume
                );
                if (applicableRate) {
                    shippingCost = applicableRate.flatRate +
                        (applicableRate.pricePerWeight * totalWeight) +
                        (applicableRate.pricePerVolume * totalVolume);
                }
            }
            calculatedCosts[method.shippingMethodId] = shippingCost;
        });
        setShippingCosts(calculatedCosts);
    };

    const handleSelectMethod = (methodId: number, cost: number) => {
        const selectedMethod = shippingMethods.find(method => method.id === methodId);
        if (selectedMethod?.shippingMethodId === 'FREE_OVER' && totalLineItemsPrice < 50) {
            return;
        }
        setSelectedMethodId(methodId);
        onSelectShippingMethod(methodId, cost);
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Shipping Method</h1>
            {shippingMethods.map((method) => (
                <div key={method.id} className="mb-2">
                    <label className={`flex items-center ${method.shippingMethodId === 'FREE_OVER' && totalLineItemsPrice < 50 ? 'text-gray-400 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                            type="radio"
                            value={method.shippingMethodId}
                            checked={selectedMethodId === method.id}
                            onChange={() =>
                                handleSelectMethod(
                                    method.id,
                                    shippingCosts[method.shippingMethodId] || 0
                                )
                            }
                            className="mr-2"
                            disabled={method.shippingMethodId === 'FREE_OVER' && totalLineItemsPrice < 50}
                        />
                        <div className="flex justify-between w-full">
                            <span>{method.nameShippingMethod}</span>
                            <div className="flex items-center">
                                {method.shippingMethodId === "FREE_OVER" && totalLineItemsPrice < 50 && (
                                    <span className="text-sm text-red-500 mr-2">
                                        (Need to order $50)
                                    </span>
                                )}
                                <span className="text-right">
                                    {shippingCosts[method.shippingMethodId] !== undefined
                                        ? ` $${shippingCosts[method.shippingMethodId]?.toFixed(2)}`
                                        : " Calculating..."}
                                </span>
                            </div>
                        </div>
                    </label>
                    <p className="text-sm text-gray-500">
                        {method.descriptionShippingMethod.map(
                            (desc: any, index: number) => (
                                <span key={index}>
                                    {desc?.children?.map((child: any, childIndex: number) => (
                                        <span key={childIndex}>{child?.text}</span>
                                    ))}
                                </span>
                            )
                        )}
                    </p>
                </div>
            ))}
        </div>
    );
};

export default ShippingMethods;

import React from 'react';

interface SubscriptionOptionsProps {
    showSubscriptionOptions: boolean;
    subscriptionFrequencyType: string;
    subscriptionFrequencyInterval: number;
    handleFrequencyTypeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    handleFrequencyIntervalChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const SubscriptionOptions: React.FC<SubscriptionOptionsProps> = ({
    showSubscriptionOptions,
    subscriptionFrequencyType,
    subscriptionFrequencyInterval,
    handleFrequencyTypeChange,
    handleFrequencyIntervalChange,
}) => {
    if (!showSubscriptionOptions) {
        return null;
    }

    return (
        <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Subscription Options</h2>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="frequencyType" className="block text-gray-700 text-sm font-bold mb-2">
                        Frequency:
                    </label>
                    <select
                        id="frequencyType"
                        name="frequencyType"
                        className="w-full p-3 border rounded-xl shadow-sm focus:ring sm:text-sm"
                        value={subscriptionFrequencyType}
                        onChange={handleFrequencyTypeChange}
                    >
                        <option value="Week">Weekly</option>
                        <option value="Month">Monthly</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="frequencyInterval" className="block text-gray-700 text-sm font-bold mb-2">
                        Interval:
                    </label>
                    <input
                        type="number"
                        id="frequencyInterval"
                        name="frequencyInterval"
                        className="w-full p-3 border rounded-xl shadow-sm focus:ring focus:ring-indigo-200 focus:border-indigo-500 sm:text-sm"
                        min="1"
                        value={subscriptionFrequencyInterval}
                        onChange={handleFrequencyIntervalChange}
                    />
                </div>
            </div>
        </div>
    );
};

export default SubscriptionOptions;
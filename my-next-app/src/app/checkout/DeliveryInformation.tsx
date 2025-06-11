import React from 'react';

interface DeliveryInformationProps {
    userInfo: {
        name: string;
        address: string;
        city: string;
        phone: string;
        email: string;
    };
    cities: any[]; // You might want to define a more specific type for city
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

const DeliveryInformation: React.FC<DeliveryInformationProps> = ({ userInfo, cities, handleChange }) => {
    return (
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
                <select
                    name="city"
                    className="w-full p-3 border rounded-xl"
                    value={userInfo.city}
                    onChange={handleChange}
                >
                    <option value="">City</option>
                    {cities.map((city) => (
                        <option key={city.code} value={city.name}>
                            {city.name}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default DeliveryInformation;
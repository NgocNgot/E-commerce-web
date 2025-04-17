import { ShippingMethod } from "@/../types/shipping";

const API_URL = "http://localhost:1337/api";

export const fetchShippingMethodsApi = async (): Promise<ShippingMethod[]> => {
  try {
    const response = await fetch(`${API_URL}/shippings?populate=*`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.data as ShippingMethod[];
  } catch (error) {
    console.error("Error fetching shipping methods:", error);
    throw error;
  }
};

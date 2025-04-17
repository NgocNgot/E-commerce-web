export interface ShippingRate {
  id: number;
  minWeight: number;
  maxWeight: number;
  minVolume: number;
  maxVolume: number;
  flatRate: number;
  pricePerWeight: number;
  pricePerVolume: number;
}

export interface ShippingMethod {
  id: number;
  shippingMethodId: string;
  nameShippingMethod: string;
  descriptionShippingMethod: any[];
  shipping_rates: ShippingRate[];
}
// Get lineItem in CartCart
export interface LineItem {
  quantity: number;
  weight: number;
  length: number;
  width: number;
  height: number;
}

export interface ShippingMethodsProps {
  lineItems: LineItem[];
  totalPrice: number;
  onSelectShippingMethod: (methodId: number, cost: number) => void;
}

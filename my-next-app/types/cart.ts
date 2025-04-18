export interface CartItem {
  id: number;
  quantity: number;
  title: string;
  price: number;
  image: string;
  // Shipping need
  weight: number;
  length: number;
  width: number;
  height: number;
}

import { Category } from "./categories";
import { Product } from "./product";

export interface AmountOffProduct {
  id: number;
  documentId: string;
  discountType: "percentage" | "fixedAmount";
  discountValue: number | null;
  percentage: number | null;
  applies_to_products: Product[];
  applies_to_categories: Category[];
  promotion?: Promotion;
}

export interface Promotion {
  id: number;
  documentId: string;
  name: string;
  description: any;
  startDate: string;
  endDate: string;
  code: string;
  maximumUses: number;
  amount_off_products: AmountOffProduct[]; // Get interface AmountOffProduct
  amount_off_order: any[];
  buy_x_get_y: any[];
}

export interface PromotionResponse {
  data: Promotion[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface AmountOffProductResponse {
  data: AmountOffProduct[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

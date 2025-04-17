// import {
//   PromotionResponse,
//   AmountOffProductResponse,
//   AmountOffProduct,
// } from "../../types/promotion";
// import { Product } from "../../types/product";

// const API_URL = "http://localhost:1337/api";

// export async function fetchPromotions(): Promise<PromotionResponse> {
//   const response = await fetch(`${API_URL}/promotions?populate=*`);
//   if (!response.ok) {
//     throw new Error("Failed to fetch promotions");
//   }
//   return response.json();
// }

// export async function fetchAmountOffProducts(): Promise<AmountOffProductResponse> {
//   const response = await fetch(`${API_URL}/amount-off-products?populate=*`);
//   if (!response.ok) {
//     throw new Error("Failed to fetch amount off products");
//   }
//   return response.json();
// }

// export function calculateDiscountedPrice(
//   product: Product,
//   promotions: PromotionResponse,
//   amountOffProducts: AmountOffProductResponse
// ): { discountedPrice: number; discountPercentage: number } {
//   let discountedPrice = product.pricing?.price ?? 0;
//   let discountPercentage = 0;

//   const applicablePromotion = promotions.data.find((promotion) => {
//     const now = new Date();
//     const startDate = new Date(promotion.startDate);
//     const endDate = new Date(promotion.endDate);

//     const isWithinDateRange = now >= startDate && now <= endDate;

//     if (!isWithinDateRange) {
//       return false;
//     }

//     const applicableAmountOffProduct = amountOffProducts.data.find(
//       (aop) => aop.promotion?.id === promotion.id
//     );

//     if (applicableAmountOffProduct) {
//       const applicableProduct =
//         applicableAmountOffProduct.applies_to_products.find(
//           (p) => p.documentId === product.documentId
//         );

//       if (applicableProduct) {
//         if (applicableAmountOffProduct.discountType === "percentage") {
//           discountPercentage = applicableAmountOffProduct.percentage ?? 0;
//           discountedPrice =
//             product.pricing?.price * (1 - discountPercentage / 100);
//         } else if (applicableAmountOffProduct.discountType === "fixedAmount") {
//           const discountValue = applicableAmountOffProduct.discountValue ?? 0;
//           discountPercentage =
//             (discountValue / (product.pricing?.price ?? 1)) * 100;
//           if (discountPercentage > 100) discountPercentage = 100;
//           discountedPrice =
//             product.pricing?.price * (1 - discountPercentage / 100);
//           if (discountedPrice < 0) discountedPrice = 0;
//         }
//         return true;
//       }
//     }
//     return false;
//   });

//   return { discountedPrice, discountPercentage };
// }

import {
  PromotionResponse,
  AmountOffProductResponse,
  AmountOffProduct,
} from "../../types/promotion";
import { Product } from "../../types/product";

const API_URL = "http://localhost:1337/api";

export async function fetchPromotions(): Promise<PromotionResponse> {
  const response = await fetch(`${API_URL}/promotions?populate=*`);
  if (!response.ok) {
    throw new Error("Failed to fetch promotions");
  }
  return response.json();
}

export async function fetchAmountOffProducts(): Promise<AmountOffProductResponse> {
  const response = await fetch(`${API_URL}/amount-off-products?populate=*`);
  if (!response.ok) {
    throw new Error("Failed to fetch amount off products");
  }
  return response.json();
}

export function calculateDiscountedPrice(
  product: Product,
  promotions: PromotionResponse,
  amountOffProducts: AmountOffProductResponse
): { discountedPrice: number; discountPercentage: number } {
  let discountedPrice = product.pricing?.price ?? 0;
  let discountPercentage = 0;

  const applicablePromotion = promotions.data.find((promotion) => {
    const now = new Date();
    const startDate = new Date(promotion.startDate);
    const endDate = new Date(promotion.endDate);

    const isWithinDateRange = now >= startDate && now <= endDate;

    if (!isWithinDateRange) {
      return false;
    }

    const applicableAmountOffProduct = amountOffProducts.data.find(
      (aop) => aop.promotion?.id === promotion.id
    );

    if (applicableAmountOffProduct) {
      // Check product ID
      const applicableProduct =
        applicableAmountOffProduct.applies_to_products.find(
          (p) => p.documentId === product.documentId
        );

      // Check category ID
      const applicableCategory =
        applicableAmountOffProduct.applies_to_categories?.find((category) => {
          return product.categories?.some(
            (productCategory) =>
              productCategory.documentId === category.documentId
          );
        });

      if (applicableProduct || applicableCategory) {
        if (applicableAmountOffProduct.discountType === "percentage") {
          discountPercentage = applicableAmountOffProduct.percentage ?? 0;
          discountedPrice =
            product.pricing?.price * (1 - discountPercentage / 100);
        } else if (applicableAmountOffProduct.discountType === "fixedAmount") {
          const discountValue = applicableAmountOffProduct.discountValue ?? 0;
          discountPercentage =
            (discountValue / (product.pricing?.price ?? 1)) * 100;
          if (discountPercentage > 100) discountPercentage = 100;
          discountedPrice =
            product.pricing?.price * (1 - discountPercentage / 100);
          if (discountedPrice < 0) discountedPrice = 0;
        }
        return true;
      }
    }
    return false;
  });

  return { discountedPrice, discountPercentage };
}

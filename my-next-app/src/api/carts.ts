import { fetchBuyXGetY } from "./promotions";
const API_URL = "http://localhost:1337/api/carts";

export const fetchCartApi = async (token?: string): Promise<any> => {
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}?populate=*`, { headers });
  if (!res.ok) {
    throw new Error(`Failed to fetch cart: ${res.status}`);
  }
  return res.json();
};

export const addToCartApi = async (
  productId: number,
  quantity: number = 1,
  userId?: number,
  token?: string
): Promise<Response> => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  let currentQuantityInCart = 0;

  try {
    // Get Cart data
    const existingCartResponse = await fetch(
      `${API_URL}?filters[products][id][$eq]=${productId}&filters[users_permissions_user][id][$eq]=${userId}&populate=products`
    );
    const existingCartData = await existingCartResponse.json();
    const existingCartItem = existingCartData?.data?.[0];

    if (existingCartItem) {
      currentQuantityInCart = existingCartItem.quantity || 0;
      response = await fetch(`${API_URL}/${existingCartItem.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          data: {
            quantity: currentQuantityInCart + quantity,
          },
        }),
      });
      currentQuantityInCart += quantity;
    } else {
      response = await fetch(`${API_URL}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          data: {
            products: [productId],
            quantity: quantity,
            users_permissions_user: userId,
          },
        }),
      });
      currentQuantityInCart = quantity;
    }

    if (!response.ok) {
      throw new Error(
        `Failed to add/update product in cart: ${response.status}`
      );
    }

    if (response.ok) {
      const buyXGetYData = await fetchBuyXGetY();
      const promotions = buyXGetYData?.data || [];

      for (const promotion of promotions) {
        for (const appliesToProduct of promotion.applies_to_products) {
          if (appliesToProduct.documentId === productId.toString()) {
            if (currentQuantityInCart >= promotion.buyQuantity) {
              for (const getProduct of promotion.get_products) {
                // Check Product in Cart
                const existingGiftCartResponse = await fetch(
                  `${API_URL}?filters[products][id][$eq]=${getProduct.id}&filters[users_permissions_user][id][$eq]=${userId}`
                );
                const existingGiftCartData =
                  await existingGiftCartResponse.json();
                const existingGiftCartItem = existingGiftCartData?.data?.[0];

                const giftData = {
                  products: [{ id: getProduct.id }],
                  quantity: promotion.getQuantity,
                  users_permissions_user: userId,
                  isGift: true,
                };

                if (existingGiftCartItem) {
                  // If gift in Cart
                  await fetch(`${API_URL}/${existingGiftCartItem.id}`, {
                    method: "PUT",
                    headers,
                    body: JSON.stringify({
                      data: {
                        quantity:
                          existingGiftCartItem.quantity + promotion.getQuantity,
                        isGift: true,
                      },
                    }),
                  });
                  console.log("Update Product Gift");
                } else {
                  const giftResponse = await fetch(`${API_URL}`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({ data: giftData }),
                  });

                  if (!giftResponse.ok) {
                    const errorData = await giftResponse.json();
                    console.error("Lỗi thêm sản phẩm tặng:", errorData);
                  } else {
                    console.log(
                      `Add Product Gift: ${getProduct.id}, quantity: ${promotion.getQuantity}`
                    );
                  }
                }
              }
            } else {
              console.log("Not enough items to qualify for the gift!");
            }
          }
        }
      }
    }
    return response;
  } catch (error) {
    console.error("Error processing add to cart with Buy X Get Y:", error);
    throw error;
  }
};

export const removeFromCartApi = async (id: number): Promise<Response> => {
  return fetch(`${API_URL}/${id}`, {
    method: "DELETE",
  });
};

export const assignCartToUserApi = async (
  id: number,
  userId: number,
  token: string
): Promise<Response> => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  return fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      data: {
        users_permissions_user: userId,
      },
    }),
  });
};

const getUserIdFromToken = (token: string): number | null => {
  try {
    const payloadBase64 = token.split(".")[1];
    const payload = JSON.parse(atob(payloadBase64));
    return payload.id;
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
};

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
  const bodyPayload: any = {
    data: {
      products: [productId],
      quantity: quantity,
    },
  };
  if (userId) {
    bodyPayload.data.users_permissions_user = userId;
  }
  return fetch(`${API_URL}`, {
    method: "POST",
    headers,
    body: JSON.stringify(bodyPayload),
  });
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

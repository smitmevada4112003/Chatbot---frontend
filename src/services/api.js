// Centralized API client for Product & Order Backend
// Backend base URL: http://127.0.0.1:8000
const BACKEND_BASE_URL = "http://127.0.0.1:8000";
const BASE_URL =
  typeof window !== "undefined" && window.location.origin.includes("8000")
    ? ""
    : BACKEND_BASE_URL;

export function getWebSocketOrdersUrl() {
  if (typeof window === "undefined") return "ws://127.0.0.1:8000/ws/admin-notifications";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  if (window.location.port === "8000") {
    return `${protocol}//${window.location.host}/ws/admin-notifications`;
  }
  if (window.location.port === "5173" || window.location.port === "3000") {
    return `${protocol}//127.0.0.1:8000/ws/admin-notifications`;
  }
  return `ws://127.0.0.1:8000/ws/admin-notifications`;
}

export const authStorage = {
  getToken: () => {
    try {
      return localStorage.getItem("authToken");
    } catch {
      return null;
    }
  },
  getRole: () => {
    try {
      return localStorage.getItem("userRole");
    } catch {
      return null;
    }
  },
  getUser: () => {
    try {
      const u = localStorage.getItem("authUser");
      if (u) return JSON.parse(u);
      const email = localStorage.getItem("userEmail");
      const role = localStorage.getItem("userRole");
      return email ? { email, role: role || "customer" } : null;
    } catch {
      return null;
    }
  },
  setAuth: (token, userOrRole, email) => {
    try {
      if (token) localStorage.setItem("authToken", token);
      if (typeof userOrRole === "object" && userOrRole !== null) {
        localStorage.setItem("authUser", JSON.stringify(userOrRole));
        if (userOrRole.role) localStorage.setItem("userRole", userOrRole.role);
        if (userOrRole.email) localStorage.setItem("userEmail", userOrRole.email);
      } else if (typeof userOrRole === "string") {
        localStorage.setItem("userRole", userOrRole);
        if (email) localStorage.setItem("userEmail", email);
      }
    } catch (e) {
      console.error("Failed to save auth to localStorage:", e);
    }
  },
  clearAuth: () => {
    try {
      localStorage.removeItem("authToken");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("authUser");
    } catch (e) {
      console.error("Failed to clear auth from localStorage:", e);
    }
  },
  isAdmin: () => {
    try {
      const role = localStorage.getItem("userRole");
      if (role === "admin") return true;
      const user = authStorage.getUser();
      return Boolean(user && user.role === "admin");
    } catch {
      return false;
    }
  },
};

function getAuthHeaders(extraHeaders = {}) {
  const token = authStorage.getToken();
  const headers = { ...extraHeaders };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse(response) {
  if (!response.ok) {
    let errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson.detail) errorDetail = errorJson.detail;
      else if (errorJson.message) errorDetail = errorJson.message;
    } catch {
      // response wasn't JSON
    }

    if (response.status === 401) {
      // If unauthorized on a protected route, clear stale token
      authStorage.clearAuth();
    }

    throw new Error(errorDetail);
  }
  return response.json();
}

export const api = {
  // Authentication
  login: async (email, password) => {
    const res = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const data = await handleResponse(res);
    if (data.access_token) {
      authStorage.setAuth(
        data.access_token,
        data.user || { email, role: data.role || "customer" },
        email
      );
    }
    return data;
  },

  signup: async (email, password) => {
    const res = await fetch(`${BASE_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    return await handleResponse(res);
  },

  register: async (name, email, password) => {
    const res = await fetch(`${BASE_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name ? name.trim() : undefined, email: email.trim(), password }),
    });
    const data = await handleResponse(res);
    if (data.access_token) {
      authStorage.setAuth(
        data.access_token,
        data.user || { email, role: data.role || "customer" },
        email
      );
    }
    return data;
  },

  getMe: async () => {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return await handleResponse(res);
  },

  forgotPassword: async (email) => {
    const res = await fetch(`${BASE_URL}/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    return await handleResponse(res);
  },

  verifyResetToken: async (token) => {
    const res = await fetch(
      `${BASE_URL}/verify-reset-token?token=${encodeURIComponent(token.trim())}`
    );
    return await handleResponse(res);
  },

  resetPassword: async (token, newPassword) => {
    const res = await fetch(`${BASE_URL}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: token.trim(),
        new_password: newPassword,
      }),
    });
    return await handleResponse(res);
  },

  verifyEmail: async (token) => {
    const res = await fetch(
      `${BASE_URL}/verify-email?token=${encodeURIComponent(token.trim())}`
    );
    return await handleResponse(res);
  },

  logout: () => {
    authStorage.clearAuth();
  },


  // Health
  checkHealth: async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      return await handleResponse(res);
    } catch (err) {
      return { status: "error", message: err.message };
    }
  },

  // Dashboard Stats (Admin only)
  getDashboardStats: async () => {
    const res = await fetch(`${BASE_URL}/dashboard/stats`, {
      headers: getAuthHeaders(),
    });
    return await handleResponse(res);
  },

  // Products
  getProducts: async () => {
    const res = await fetch(`${BASE_URL}/products`);
    return await handleResponse(res);
  },

  getProduct: async (id) => {
    const res = await fetch(`${BASE_URL}/products/${id}`);
    return await handleResponse(res);
  },

  // Product Reviews
  getProductReviews: async (productId) => {
    const res = await fetch(`${BASE_URL}/products/${productId}/reviews`);
    return await handleResponse(res);
  },

  submitProductReview: async (productId, rating, comment) => {
    const res = await fetch(`${BASE_URL}/products/${productId}/reviews`, {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        rating: Number(rating),
        comment: comment ? comment.trim() : null,
      }),
    });
    return await handleResponse(res);
  },

  createProduct: async (productData) => {
    const res = await fetch(`${BASE_URL}/products`, {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        name: productData.name.trim(),
        price: Number(productData.price),
        stock: productData.stock !== undefined ? Number(productData.stock) : 10,
      }),
    });
    return await handleResponse(res);
  },

  updateProduct: async (id, productData) => {
    const res = await fetch(`${BASE_URL}/products/${id}`, {
      method: "PUT",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        name: productData.name.trim(),
        price: Number(productData.price),
        stock: productData.stock !== undefined ? Number(productData.stock) : 10,
      }),
    });
    return await handleResponse(res);
  },

  deleteProduct: async (id) => {
    const res = await fetch(`${BASE_URL}/products/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return await handleResponse(res);
  },

  // Orders
  getOrdersSummary: async () => {
    const res = await fetch(`${BASE_URL}/orders/summary`, {
      headers: getAuthHeaders(),
    });
    return await handleResponse(res);
  },

  getOrders: async () => {
    const res = await fetch(`${BASE_URL}/orders`, {
      headers: getAuthHeaders(),
    });
    return await handleResponse(res);
  },

  getMyOrders: async () => {
    const res = await fetch(`${BASE_URL}/my-orders`, {
      headers: getAuthHeaders(),
    });
    return await handleResponse(res);
  },

  getOrder: async (id) => {
    const res = await fetch(`${BASE_URL}/orders/${id}`, {
      headers: getAuthHeaders(),
    });
    return await handleResponse(res);
  },

  createOrder: async (orderData) => {
    try {
      const res = await fetch(`${BASE_URL}/orders`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          customer: orderData.customer.trim(),
          product: orderData.product.trim(),
          quantity: Number(orderData.quantity),
          status: orderData.status || "Pending",
        }),
      });
      const data = await handleResponse(res);
      if (data && data.status === "error") {
        throw new Error(data.message || "Failed to create order");
      }
      return data;
    } catch (err) {
      if (err?.message === "Failed to fetch") {
        throw new Error(`Cannot reach backend server at ${BASE_URL || window.location.origin}. Please verify it is running.`);
      }
      throw err;
    }
  },

  updateOrder: async (id, orderData) => {
    const res = await fetch(`${BASE_URL}/orders/${id}`, {
      method: "PUT",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        customer: orderData.customer.trim(),
        product: orderData.product.trim(),
        quantity: Number(orderData.quantity),
        status: orderData.status || "Pending",
      }),
    });
    return await handleResponse(res);
  },

  updateOrderStatus: async (id, status) => {
    const res = await fetch(`${BASE_URL}/orders/${id}/status`, {
      method: "PATCH",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ status }),
    });
    return await handleResponse(res);
  },

  deleteOrder: async (id) => {
    const res = await fetch(`${BASE_URL}/orders/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return await handleResponse(res);
  },

  bulkDeleteOrders: async (orderIds) => {
    const res = await fetch(`${BASE_URL}/orders/bulk-delete`, {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ order_ids: orderIds }),
    });
    return await handleResponse(res);
  },

  // Shopping Cart & Multi-Item Checkout
  getCart: async () => {
    const res = await fetch(`${BASE_URL}/cart`, {
      headers: getAuthHeaders(),
    });
    return await handleResponse(res);
  },

  addToCart: async (productId, quantity = 1) => {
    const res = await fetch(`${BASE_URL}/cart/items`, {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ product_id: Number(productId), quantity: Number(quantity) }),
    });
    return await handleResponse(res);
  },

  updateCartItem: async (productId, quantity) => {
    const res = await fetch(`${BASE_URL}/cart/items/${productId}`, {
      method: "PUT",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ quantity: Number(quantity) }),
    });
    return await handleResponse(res);
  },

  removeFromCart: async (productId) => {
    const res = await fetch(`${BASE_URL}/cart/items/${productId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return await handleResponse(res);
  },

  clearCart: async () => {
    const res = await fetch(`${BASE_URL}/cart`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return await handleResponse(res);
  },

  checkoutCart: async (checkoutData = {}) => {
    const res = await fetch(`${BASE_URL}/cart/checkout`, {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(checkoutData),
    });
    return await handleResponse(res);
  },
};

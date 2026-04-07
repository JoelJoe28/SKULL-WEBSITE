window.SKULLStore = (function () {
  const KEYS = {
    apiBase: "skullApiBase",
    cart: "skullCart",
    token: "skullToken",
    user: "skullUser",
    wishlist: "skullWishlist"
  };

  let catalogCache = [];

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  }

  function splitName(name) {
    const clean = String(name || "").trim().replace(/\s+/g, " ");
    if (!clean) return { firstName: "", lastName: "" };
    const parts = clean.split(" ");
    return { firstName: parts[0] || "", lastName: parts.slice(1).join(" ") };
  }

  function fullName(user) {
    const first = String(user?.firstName || "").trim();
    const last = String(user?.lastName || "").trim();
    const combined = `${first} ${last}`.trim();
    return combined || String(user?.name || "").trim() || "Guest User";
  }

  function createSessionUser(user) {
    return {
      id: String(user.id || user._id || ""),
      name: fullName(user),
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: String(user.email || "").trim().toLowerCase(),
      phone: String(user.phone || "").trim(),
      role: user.role || "customer",
      createdAt: user.createdAt || user.created_at || null,
      updatedAt: user.updatedAt || user.updated_at || null
    };
  }

  function getApiBase() {
    const configured = localStorage.getItem(KEYS.apiBase);
    if (configured) return configured.replace(/\/$/, "");
    if (window.location.protocol === "file:") return "http://localhost:5000";
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return `${window.location.protocol}//${window.location.hostname}:5000`;
    }
    return window.location.origin.replace(/\/$/, "");
  }

  function setApiBase(url) {
    localStorage.setItem(KEYS.apiBase, String(url || "").replace(/\/$/, ""));
  }

  function getCurrentUser() {
    if (!getAuthToken()) return null;
    const session = read(KEYS.user, null);
    return session ? createSessionUser(session) : null;
  }

  function getAuthToken() {
    return localStorage.getItem(KEYS.token) || "";
  }

  function setSession(token, user) {
    if (token) {
      localStorage.setItem(KEYS.token, token);
    }
    if (user) {
      write(KEYS.user, createSessionUser(user));
    }
  }

  function clearSession() {
    localStorage.removeItem(KEYS.token);
    localStorage.removeItem(KEYS.user);
  }

  function logout() {
    clearSession();
  }

  async function apiRequest(path, options) {
    const config = { method: "GET", headers: {}, ...(options || {}) };
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.body && !(config.body instanceof FormData)) {
      config.headers["Content-Type"] = "application/json";
      config.body = JSON.stringify(config.body);
    }

    const response = await fetch(`${getApiBase()}${path}`, config);
    const text = await response.text();
    let payload = {};
    const isHtmlResponse = /^\s*</.test(text);

    try {
      payload = text && !isHtmlResponse ? JSON.parse(text) : {};
    } catch (error) {
      payload = { ok: response.ok, message: isHtmlResponse ? "" : text };
    }

    if (!response.ok) {
      const fallbackMessage = response.status >= 500
        ? "Server error. Please try again."
        : "Request failed.";
      throw new Error(payload.error || payload.message || fallbackMessage);
    }

    return payload;
  }

  function normalizeProduct(product) {
    return {
      id: Number(product.id || product.productId || 0),
      sku: product.sku || "",
      name: product.name || "",
      category: product.category || product.cat || "",
      price: Number(product.price || 0),
      img: product.image || product.img || "",
      image: product.image || product.img || "",
      description: product.description || "",
      emoji: product.emoji || "💀"
    };
  }

  function normalizeOrder(order) {
    if (!order) return null;
    return {
      id: String(order.id || order._id || ""),
      userId: String(order.userId || order.customerId || ""),
      orderNumber: order.orderNumber || "",
      items: Array.isArray(order.items) ? order.items.map((item) => ({
        id: Number(item.productId || item.id || 0),
        productId: Number(item.productId || item.id || 0),
        sku: item.sku || "",
        name: item.name || "",
        category: item.category || item.cat || "",
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 1),
        img: item.image || item.img || "",
        image: item.image || item.img || "",
        emoji: item.emoji || "💀"
      })) : [],
      subtotal: Number(order.subtotal || 0),
      shipping: Number(order.shipping || 0),
      shippingCost: Number(order.shipping || order.shippingCost || 0),
      tax: Number(order.tax || 0),
      total: Number(order.total || order.grand_total || 0),
      status: order.status || order.order_status || "processing",
      notes: order.notes || "",
      shippingAddress: order.shippingAddress || order.shipping_address || {},
      payment: {
        method: String(order.payment?.method || order.payment_method || "COD").toLowerCase(),
        label: String(order.payment?.method || order.payment_method || "COD").toUpperCase() === "UPI" ? "UPI Payment" : "Cash on Delivery",
        status: order.payment?.status || order.payment_status || "pending",
        upiId: order.payment?.upiId || order.upi_id || null,
        transactionId: order.payment?.transactionId || order.transaction_id || null,
        paidAt: order.payment?.paidAt || null,
        type: order.payment?.type || null
      },
      tracking: Array.isArray(order.tracking) ? order.tracking : [],
      date: order.createdAt || order.created_at || new Date().toISOString(),
      createdAt: order.createdAt || order.created_at || null,
      updatedAt: order.updatedAt || order.updated_at || null
    };
  }

  async function fetchProducts() {
    const payload = await apiRequest("/api/products");
    catalogCache = Array.isArray(payload.products) ? payload.products.map(normalizeProduct) : [];
    return catalogCache.slice();
  }

  function getCatalog() {
    return catalogCache.slice();
  }

  function getProductById(productId) {
    return catalogCache.find((item) => String(item.id) === String(productId)) || null;
  }

  async function ensureCatalog() {
    if (catalogCache.length) return catalogCache.slice();
    return fetchProducts();
  }

  async function registerUser({ name, email, password, phone }) {
    const payload = await apiRequest("/api/auth/register", {
      method: "POST",
      body: { name, email, password, phone: phone || "" }
    });
    setSession(payload.token, payload.user);
    return { ok: true, user: createSessionUser(payload.user) };
  }

  async function login(email, password) {
    const payload = await apiRequest("/api/auth/login", {
      method: "POST",
      body: { email, password }
    });
    setSession(payload.token, payload.user);
    return { ok: true, user: createSessionUser(payload.user) };
  }

  async function getCurrentUserRecord() {
    const payload = await apiRequest("/api/profile");
    const user = createSessionUser(payload.user);
    setSession(getAuthToken(), user);
    return {
      ...user,
      addresses: Array.isArray(payload.addresses) ? payload.addresses : [],
      stats: payload.stats || {}
    };
  }

  async function getAddresses() {
    const payload = await apiRequest("/api/addresses");
    return Array.isArray(payload.addresses) ? payload.addresses : [];
  }

  async function saveAddress(address) {
    const payload = await apiRequest("/api/addresses", {
      method: "POST",
      body: address
    });
    return payload.address;
  }

  async function updateProfile(profile) {
    const payload = await apiRequest("/api/profile", {
      method: "PATCH",
      body: profile
    });
    setSession(payload.token || getAuthToken(), payload.user);
    return createSessionUser(payload.user);
  }

  async function getOrders() {
    const payload = await apiRequest("/api/orders");
    return Array.isArray(payload.orders) ? payload.orders.map(normalizeOrder) : [];
  }

  async function getOrder(orderId) {
    const payload = await apiRequest(`/api/orders/${orderId}`);
    return normalizeOrder(payload.order);
  }

  async function createOrder(input) {
    const payload = await apiRequest("/api/orders", {
      method: "POST",
      body: input
    });
    return {
      order: normalizeOrder(payload.order),
      payment: payload.payment || null
    };
  }

  async function previewPayment(input) {
    return apiRequest("/api/payment/preview", {
      method: "POST",
      body: input
    });
  }

  async function confirmPayment(orderId, transactionId) {
    const payload = await apiRequest("/api/payment/confirm", {
      method: "POST",
      body: { orderId, transactionId }
    });
    return normalizeOrder(payload.order);
  }

  async function cancelOrder(orderId) {
    const payload = await apiRequest(`/api/orders/${orderId}/cancel`, {
      method: "POST"
    });
    return normalizeOrder(payload.order);
  }

  async function getAdminSummary() {
    const payload = await apiRequest("/api/admin/summary");
    return payload.summary || {};
  }

  async function getAdminOrders() {
    const payload = await apiRequest("/api/admin/orders");
    return Array.isArray(payload.orders) ? payload.orders.map(normalizeOrder) : [];
  }

  async function getAdminUsers() {
    const payload = await apiRequest("/api/admin/users");
    return Array.isArray(payload.users) ? payload.users.map(createSessionUser) : [];
  }

  async function updateAdminOrderStatus(orderId, status, note) {
    const payload = await apiRequest(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      body: { status, note: note || "" }
    });
    return normalizeOrder(payload.order);
  }

  function getCart() {
    return read(KEYS.cart, []).map((item) => ({
      quantity: 1,
      ...item,
      quantity: Number(item.quantity || 1)
    }));
  }

  function setCart(cart) {
    return write(KEYS.cart, cart);
  }

  function clearCart() {
    setCart([]);
  }

  function getWishlist() {
    return read(KEYS.wishlist, []);
  }

  function setWishlist(wishlist) {
    return write(KEYS.wishlist, wishlist);
  }

  function cartTotals(cart) {
    const subtotal = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
    const shipping = subtotal >= 999 ? 0 : 99;
    const tax = Math.round(subtotal * 0.18);
    return { subtotal, shipping, tax, total: subtotal + shipping + tax };
  }

  function formatCurrency(amount) {
    return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  return {
    KEYS,
    apiRequest,
    cancelOrder,
    cartTotals,
    clearCart,
    confirmPayment,
    createOrder,
    createSessionUser,
    ensureCatalog,
    escapeHtml,
    fetchProducts,
    formatCurrency,
    fullName,
    getAddresses,
    getAdminOrders,
    getAdminSummary,
    getAdminUsers,
    getApiBase,
    getAuthToken,
    getCart,
    getCatalog,
    getCurrentUser,
    getCurrentUserRecord,
    getOrder,
    getOrders,
    getProductById,
    getWishlist,
    login,
    logout,
    normalizeOrder,
    normalizeProduct,
    previewPayment,
    registerUser,
    saveAddress,
    setApiBase,
    setCart,
    setSession,
    setWishlist,
    splitName,
    updateAdminOrderStatus,
    updateProfile
  };
})();

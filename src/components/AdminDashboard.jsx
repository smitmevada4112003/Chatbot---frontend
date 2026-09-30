import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  ShoppingCart,
  TrendingUp,
  IndianRupee,
  Search,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  Layers,
  ArrowUpDown,
  LayoutGrid,
  List,
  BarChart3,
  ExternalLink,
  Star,
  MessageSquare,
  Volume2,
  VolumeX,
  Sun,
  Moon,
} from "lucide-react";
import { api, getWebSocketOrdersUrl } from "../services/api";
import ProductModal from "./ProductModal";
import OrderModal from "./OrderModal";
import ConfirmModal from "./ConfirmModal";
import ProductReviewsModal from "./ProductReviewsModal";
import { useTheme } from "../ThemeContext";
import "./AdminDashboard.css";

const STATUS_CONFIG = {
  Pending: { color: "status-pending", icon: Clock, label: "Pending" },
  Completed: { color: "status-completed", icon: CheckCircle2, label: "Completed" },
  Cancelled: { color: "status-cancelled", icon: XCircle, label: "Cancelled" },
  Processing: { color: "status-processing", icon: RefreshCw, label: "Processing" },
  Shipped: { color: "status-shipped", icon: Truck, label: "Shipped" },
  Delivered: { color: "status-delivered", icon: CheckCircle2, label: "Delivered" },
};


export default function AdminDashboard({ onOpenChatbot, addToast, onAddToCart, darkMode: propDarkMode, onToggleTheme: propToggleTheme }) {
  const navigate = useNavigate();
  const themeContext = useTheme();
  const isDark = propDarkMode !== undefined ? propDarkMode : themeContext.isDark;
  const toggleTheme = propToggleTheme || themeContext.toggleTheme;

  // Check for valid token and admin role on load; redirect to /login if missing/invalid
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const role = localStorage.getItem("userRole");
    if (!token || role !== "admin") {
      navigate("/login");
    }
  }, [navigate]);
  // Navigation tabs within Admin Dashboard
  const [activeTab, setActiveTab] = useState("orders"); // 'orders' | 'products' | 'analytics'

  // Data state
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dbError, setDbError] = useState(null);

  // Real-time WebSocket & Audio state
  const [wsStatus, setWsStatus] = useState("connecting"); // 'connected' | 'connecting' | 'disconnected'
  const [highlightedOrderId, setHighlightedOrderId] = useState(null);
  const [liveBanner, setLiveBanner] = useState(null); // { id, message, orderId }
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem("adminSoundNotification") !== "false";
    } catch {
      return true;
    }
  });

  // Track recently toasted/chimed order IDs to strictly prevent duplicate notifications
  const processedOrderIdsRef = React.useRef(new Set());
  const soundEnabledRef = React.useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;
  const addToastRef = React.useRef(addToast);
  addToastRef.current = addToast;

  // Single WebSocket connection & timer refs to ensure strict singleton lifecycle
  const wsRef = React.useRef(null);
  const reconnectTimeoutRef = React.useRef(null);
  const pingIntervalRef = React.useRef(null);

  // Modal submission loading states to prevent rapid double-clicks
  const [isOrderSubmitting, setIsOrderSubmitting] = useState(false);
  const [isProductSubmitting, setIsProductSubmitting] = useState(false);

  // Auto-dismiss the live order notification banner after 5 seconds
  useEffect(() => {
    if (!liveBanner) return;
    const timer = setTimeout(() => {
      setLiveBanner(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [liveBanner]);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("adminSoundNotification", String(next));
      } catch {}
      return next;
    });
  };

  // Synthesized web audio chime for instant feedback without external audio files
  const playOrderChime = useCallback(() => {
    if (!soundEnabledRef.current) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Tone 1: E5 (659.25Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.28);

      // Tone 2: A5 (880Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880.0, now + 0.12);
      gain2.gain.setValueAtTime(0.14, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.55);
    } catch (e) {
      // Audio autoplay may be disabled in certain environments
    }
  }, []);

  // Orders filters and selection
  const [orderSearch, setOrderSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [orderSortField, setOrderSortField] = useState("id");
  const [orderSortDir, setOrderSortDir] = useState("desc");

  // Products filters and view
  const [productSearch, setProductSearch] = useState("");
  const [productSort, setProductSort] = useState("id_asc");
  const [productViewMode, setProductViewMode] = useState("table"); // 'table' | 'grid'

  // Modals state
  const [productModal, setProductModal] = useState({ isOpen: false, mode: "add", product: null });
  const [orderModal, setOrderModal] = useState({ isOpen: false, mode: "add", order: null });
  const [reviewModalProduct, setReviewModalProduct] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    isLoading: false,
  });

  const handleReviewSubmitted = (productId, newStats) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              average_rating: newStats.average_rating,
              review_count: newStats.review_count,
            }
          : p
      )
    );
    if (reviewModalProduct && reviewModalProduct.id === productId) {
      setReviewModalProduct((prev) => ({
        ...prev,
        average_rating: newStats.average_rating,
        review_count: newStats.review_count,
      }));
    }
    if (addToast) {
      addToast("Review submitted successfully!", "success");
    }
  };

  // Fetch all data
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setDbError(null);

    try {
      // Fetch concurrently from backend
      const [productsRes, ordersRes, summaryRes] = await Promise.allSettled([
        api.getProducts(),
        api.getOrders(),
        api.getOrdersSummary(),
      ]);

      let hasError = false;

      if (productsRes.status === "fulfilled" && Array.isArray(productsRes.value)) {
        setProducts(productsRes.value);
      } else {
        hasError = true;
      }

      if (ordersRes.status === "fulfilled" && Array.isArray(ordersRes.value)) {
        ordersRes.value.forEach((ord) => {
          if (ord && ord.id != null) {
            processedOrderIdsRef.current.add(ord.id);
          }
        });
        setOrders(ordersRes.value);
      } else {
        hasError = true;
      }

      if (summaryRes.status === "fulfilled" && summaryRes.value) {
        setStats(summaryRes.value);
      }

      if (hasError && !dbError) {
        setDbError("Unable to communicate with MySQL backend. Please verify MySQL service is running.");
      }
    } catch (err) {
      setDbError(err.message || "Connection failed");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dbError]);

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time WebSocket connection for live order updates
  useEffect(() => {
    let isDisposed = false;

    const cleanupSocket = (socket) => {
      if (!socket) return;
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      ) {
        socket.close();
      }
    };

    const connectWebSocket = () => {
      if (isDisposed) return;

      // Guard: Never open a second socket while one is already open or connecting
      if (
        wsRef.current &&
        (wsRef.current.readyState === WebSocket.CONNECTING ||
          wsRef.current.readyState === WebSocket.OPEN)
      ) {
        return;
      }

      // Cleanup any previous socket reference before creating a new one
      if (wsRef.current) {
        cleanupSocket(wsRef.current);
        wsRef.current = null;
      }

      try {
        const wsUrl = getWebSocketOrdersUrl();
        setWsStatus("connecting");
        const socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          if (isDisposed) {
            cleanupSocket(socket);
            return;
          }
          setWsStatus("connected");

          // Keep-alive heartbeat ping every 25s
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send("ping");
            }
          }, 25000);
        };

        socket.onmessage = (event) => {
          if (isDisposed) return;
          try {
            if (event.data === "pong") return;
            const message = JSON.parse(event.data);
            const { type, data } = message || {};

            if (type === "NEW_ORDER" && data) {
              const orderId = data.id;

              // 2. De-duplicate incoming events: if already handled, ignore completely
              if (orderId && processedOrderIdsRef.current.has(orderId)) {
                return;
              }

              if (orderId) {
                processedOrderIdsRef.current.add(orderId);
                if (processedOrderIdsRef.current.size > 500) {
                  const oldest = processedOrderIdsRef.current.values().next().value;
                  processedOrderIdsRef.current.delete(oldest);
                }
              }

              // 3. When adding to table state: merge or skip if existing instead of appending
              setOrders((prev) => {
                const exists = prev.some((o) => o.id === data.id);
                if (exists) {
                  return prev.map((o) => (o.id === data.id ? { ...o, ...data } : o));
                }
                return [data, ...prev];
              });

              // Update the summary cards directly in UI state
              setStats((prev) => {
                const statusKey = (data.status || "Pending").trim();
                const lower = statusKey.toLowerCase();
                const normalized =
                  lower === "completed" || lower === "delivered"
                    ? "Completed"
                    : lower === "cancelled" || lower === "canceled"
                    ? "Cancelled"
                    : "Pending";

                const prevCounts = prev?.status_counts || {};
                const prevTotal = prev?.total_orders !== undefined ? prev.total_orders : orders.length;

                return {
                  ...(prev || {}),
                  total_orders: prevTotal + 1,
                  total_items_ordered: (prev?.total_items_ordered || 0) + (Number(data.quantity) || 1),
                  total_revenue: (prev?.total_revenue || 0) + (Number(data.total_amount) || 0),
                  status_counts: {
                    ...prevCounts,
                    [normalized]: (prevCounts[normalized] || 0) + 1,
                  },
                };
              });

              // Highlight newly arrived row with glowing animation
              setHighlightedOrderId(data.id);
              setTimeout(() => {
                setHighlightedOrderId((current) => (current === data.id ? null : current));
              }, 5000);

              // Play audio chime ONCE
              playOrderChime();

              // Show small toast/notification banner that auto-dismisses after a few seconds
              const customerName = data.customer || "Customer";
              const productName = data.product || "Product";
              const bannerMsg = `🔔 New order from ${customerName} for ${productName}!`;

              setLiveBanner({
                id: Date.now(),
                message: bannerMsg,
                orderId: data.id,
              });

              if (addToastRef.current) {
                addToastRef.current(bannerMsg, "success");
              }
            } else if (type === "ORDER_STATUS_UPDATED" && data) {
              setOrders((prev) =>
                prev.map((o) => (o.id === data.id ? { ...o, status: data.status } : o))
              );
              api.getOrdersSummary()
                .then((summary) => {
                  if (summary) setStats(summary);
                })
                .catch(() => {});
              if (addToastRef.current) {
                addToastRef.current(`Order #${data.id} status updated to ${data.status}`, "info");
              }
            } else if (type === "ORDER_DELETED" && data) {
              const deletedIds = data.ids || (data.id ? [data.id] : []);
              setOrders((prev) => prev.filter((o) => !deletedIds.includes(o.id)));
              api.getOrdersSummary()
                .then((summary) => {
                  if (summary) setStats(summary);
                })
                .catch(() => {});
            }
          } catch (err) {
            console.warn("[WebSocket] Error processing event:", err);
          }
        };

        socket.onclose = () => {
          if (isDisposed) return;
          setWsStatus("disconnected");
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
          }
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
        };

        socket.onerror = () => {
          if (isDisposed) return;
          if (
            socket.readyState === WebSocket.OPEN ||
            socket.readyState === WebSocket.CONNECTING
          ) {
            socket.close();
          }
        };
      } catch (err) {
        setWsStatus("disconnected");
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
      }
    };

    connectWebSocket();

    return () => {
      isDisposed = true;
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        cleanupSocket(wsRef.current);
        wsRef.current = null;
      }
    };
  }, [playOrderChime]);

  // Compute product price lookup map for fast calculations
  const productPriceMap = useMemo(() => {
    const map = new Map();
    products.forEach((p) => {
      if (p.name) map.set(p.name.trim().toLowerCase(), p.price);
    });
    return map;
  }, [products]);

  // Orders ordered count per product
  const productOrderStats = useMemo(() => {
    const statsMap = {};
    orders.forEach((o) => {
      const key = (o.product || "").trim().toLowerCase();
      if (!statsMap[key]) {
        statsMap[key] = { count: 0, totalQty: 0 };
      }
      statsMap[key].count += 1;
      statsMap[key].totalQty += Number(o.quantity) || 0;
    });
    return statsMap;
  }, [orders]);

  // Derived KPIs
  const totalRevenue = useMemo(() => {
    if (stats?.total_revenue !== undefined && stats.total_revenue !== null) {
      return stats.total_revenue;
    }
    if (stats?.estimated_revenue !== undefined && stats.estimated_revenue !== null) {
      return stats.estimated_revenue;
    }
    return orders.reduce((acc, order) => {
      const price = productPriceMap.get((order.product || "").trim().toLowerCase()) || 0;
      return acc + price * (Number(order.quantity) || 0);
    }, 0);
  }, [stats, orders, productPriceMap]);

  const totalItemsSold = useMemo(() => {
    if (stats?.total_items_ordered !== undefined) return stats.total_items_ordered;
    return orders.reduce((acc, o) => acc + (Number(o.quantity) || 0), 0);
  }, [stats, orders]);

  const orderStatusCounts = useMemo(() => {
    if (stats?.status_counts && Object.keys(stats.status_counts).length > 0) {
      return {
        Pending: stats.status_counts.Pending || 0,
        Completed: stats.status_counts.Completed || 0,
        Cancelled: stats.status_counts.Cancelled || 0,
        ...stats.status_counts,
      };
    }
    const counts = { Pending: 0, Completed: 0, Cancelled: 0 };
    orders.forEach((o) => {
      const raw = (o.status || "Pending").trim();
      const lower = raw.toLowerCase();
      if (lower === "completed" || lower === "delivered") {
        counts.Completed = (counts.Completed || 0) + 1;
      } else if (lower === "cancelled" || lower === "canceled") {
        counts.Cancelled = (counts.Cancelled || 0) + 1;
      } else if (lower === "pending") {
        counts.Pending = (counts.Pending || 0) + 1;
      } else {
        counts[raw] = (counts[raw] || 0) + 1;
      }
    });
    return counts;
  }, [stats, orders]);


  // Filtered & Sorted Orders
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (statusFilter !== "All") {
      result = result.filter((o) => {
        const raw = (o.status || "").trim().toLowerCase();
        if (statusFilter === "Completed") {
          return raw === "completed" || raw === "delivered";
        }
        if (statusFilter === "Cancelled") {
          return raw === "cancelled" || raw === "canceled";
        }
        return raw === statusFilter.toLowerCase();
      });
    }


    if (orderSearch.trim()) {
      const query = orderSearch.trim().toLowerCase();
      result = result.filter(
        (o) =>
          String(o.id).includes(query) ||
          (o.customer && o.customer.toLowerCase().includes(query)) ||
          (o.product && o.product.toLowerCase().includes(query))
      );
    }

    result.sort((a, b) => {
      let valA = a[orderSortField];
      let valB = b[orderSortField];

      if (orderSortField === "id" || orderSortField === "quantity") {
        valA = Number(valA);
        valB = Number(valB);
      } else {
        valA = String(valA || "").toLowerCase();
        valB = String(valB || "").toLowerCase();
      }

      if (valA < valB) return orderSortDir === "asc" ? -1 : 1;
      if (valA > valB) return orderSortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [orders, statusFilter, orderSearch, orderSortField, orderSortDir]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (productSearch.trim()) {
      const query = productSearch.trim().toLowerCase();
      result = result.filter(
        (p) =>
          String(p.id).includes(query) ||
          (p.name && p.name.toLowerCase().includes(query)) ||
          String(p.price).includes(query)
      );
    }

    result.sort((a, b) => {
      if (productSort === "price_asc") return a.price - b.price;
      if (productSort === "price_desc") return b.price - a.price;
      if (productSort === "name_asc") return a.name.localeCompare(b.name);
      if (productSort === "name_desc") return b.name.localeCompare(a.name);
      if (productSort === "id_desc") return b.id - a.id;
      return a.id - b.id;
    });

    return result;
  }, [products, productSearch, productSort]);

  // Handlers for Products
  async function handleSaveProduct(productData) {
    if (isProductSubmitting) return;
    setIsProductSubmitting(true);
    try {
      if (productModal.mode === "add") {
        await api.createProduct(productData);
        addToast("Product added to catalog successfully!", "success");
      } else {
        await api.updateProduct(productModal.product.id, productData);
        addToast(`Product #${productModal.product.id} updated!`, "success");
      }
      setProductModal({ isOpen: false, mode: "add", product: null });
      fetchData(true);
    } catch (err) {
      addToast(err.message || "Failed to save product", "error");
    } finally {
      setIsProductSubmitting(false);
    }
  }

  function promptDeleteProduct(product) {
    setConfirmModal({
      isOpen: true,
      title: "Delete Product",
      message: `Are you sure you want to delete "${product.name}" (ID #${product.id})? Existing orders referencing this product will remain in the database.`,
      confirmText: "Delete Product",
      onConfirm: async () => {
        try {
          await api.deleteProduct(product.id);
          addToast(`Product "${product.name}" deleted.`, "success");
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          fetchData(true);
        } catch (err) {
          addToast(err.message || "Failed to delete product", "error");
        }
      },
    });
  }

  // Handlers for Orders
  async function handleSaveOrder(orderData) {
    if (isOrderSubmitting) return;
    setIsOrderSubmitting(true);
    try {
      if (orderModal.mode === "add") {
        const res = await api.createOrder(orderData);
        if (res && res.order_id) {
          // Pre-record this order ID so incoming WebSocket broadcast doesn't duplicate toast/sound
          processedOrderIdsRef.current.add(res.order_id);
        }
        addToast("Order placed successfully!", "success");
      } else {
        await api.updateOrder(orderModal.order.id, orderData);
        addToast(`Order #${orderModal.order.id} updated successfully!`, "success");
      }
      setOrderModal({ isOpen: false, mode: "add", order: null });
      fetchData(true);
    } catch (err) {
      addToast(err.message || "Failed to save order", "error");
      throw err;
    } finally {
      setIsOrderSubmitting(false);
    }
  }

  async function handleQuickStatusChange(orderId, newStatus) {
    try {
      await api.updateOrderStatus(orderId, newStatus);
      addToast(`Order #${orderId} status set to "${newStatus}"`, "success");
      // Optimistic local update
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch (err) {
      // Fallback update full order
      const existingOrder = orders.find((o) => o.id === orderId);
      if (existingOrder) {
        try {
          await api.updateOrder(orderId, { ...existingOrder, status: newStatus });
          addToast(`Order #${orderId} status updated to "${newStatus}"`, "success");
          setOrders((prev) =>
            prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
          );
        } catch (updateErr) {
          addToast(updateErr.message || "Failed to update status", "error");
        }
      }
    }
  }

  function promptDeleteOrder(order) {
    setConfirmModal({
      isOpen: true,
      title: "Delete Order",
      message: `Are you sure you want to delete Order #${order.id} for "${order.customer}" (${order.product} × ${order.quantity})?`,
      confirmText: "Delete Order",
      onConfirm: async () => {
        try {
          await api.deleteOrder(order.id);
          addToast(`Order #${order.id} deleted.`, "success");
          setSelectedOrderIds((prev) => prev.filter((id) => id !== order.id));
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          fetchData(true);
        } catch (err) {
          addToast(err.message || "Failed to delete order", "error");
        }
      },
    });
  }

  function promptBulkDeleteOrders() {
    if (selectedOrderIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: "Bulk Delete Orders",
      message: `Are you sure you want to permanently delete ${selectedOrderIds.length} selected orders?`,
      confirmText: `Delete ${selectedOrderIds.length} Orders`,
      onConfirm: async () => {
        try {
          await api.bulkDeleteOrders(selectedOrderIds);
          addToast(`Deleted ${selectedOrderIds.length} orders successfully.`, "success");
          setSelectedOrderIds([]);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          fetchData(true);
        } catch (err) {
          addToast(err.message || "Bulk delete failed", "error");
        }
      },
    });
  }

  function toggleSelectAllOrders() {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map((o) => o.id));
    }
  }

  function toggleSelectOrder(id) {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function handleOrderSort(field) {
    if (orderSortField === field) {
      setOrderSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setOrderSortField(field);
      setOrderSortDir("asc");
    }
  }

  return (
    <div className="admin-container">
      {/* Dashboard Top Header Bar with Live WebSocket Status Indicator */}
      <header className="dashboard-top-header">
        <div className="header-title-area">
          <h1 className="dashboard-title">Admin Dashboard</h1>
          <p className="dashboard-subtitle">Real-time inventory, orders & live notifications</p>
        </div>

        <div className="header-status-area">
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={isDark ? "Switch to Light Mode (☀️)" : "Switch to Dark Mode (🌙)"}
            aria-label="Toggle dark mode theme"
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
            <span>{isDark ? "Light" : "Dark"}</span>
          </button>

          <div
            className={`ws-connection-indicator ${wsStatus}`}
            title={`WebSocket Status: ${
              wsStatus === "connected"
                ? "Live Connected (Real-time order updates active)"
                : wsStatus === "connecting"
                ? "Connecting to live notifications stream..."
                : "Disconnected (Attempting to reconnect every 3s...)"
            }`}
          >
            <span className={`ws-dot ${wsStatus}`} />
            <span className="ws-label">
              {wsStatus === "connected"
                ? "Live"
                : wsStatus === "connecting"
                ? "Connecting..."
                : "Disconnected"}
            </span>
          </div>
        </div>
      </header>

      {/* Live Order Real-time Notification Banner */}
      {liveBanner && (
        <div className="live-order-banner" role="alert">
          <div className="live-order-banner-content">
            <span className="live-order-banner-icon">🔔</span>
            <span className="live-order-banner-text">{liveBanner.message}</span>
            {liveBanner.orderId && (
              <span className="live-order-banner-id">Order #{liveBanner.orderId}</span>
            )}
          </div>
          <button
            className="live-order-banner-close"
            onClick={() => setLiveBanner(null)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      {/* DB Error notification banner if MySQL is down */}
      {dbError && (
        <div className="db-alert-banner">
          <div className="db-alert-content">
            <AlertTriangle size={20} className="db-alert-icon" />
            <div>
              <strong>Database Connection Warning:</strong> {dbError}
              <div className="db-alert-tip">
                Tip: Ensure MySQL server (e.g. XAMPP/WAMP or MySQL service on port 3306) is running and database "productdatabase" exists.
              </div>
            </div>
          </div>
          <button className="btn btn-outline-danger btn-sm" onClick={() => fetchData(false)}>
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Retry Connection
          </button>
        </div>
      )}

      {/* KPI Stats Overview Banner */}
      {/* ==========================================================================
         TOP SUMMARY CARDS
         Requirements:
         1. Total number of orders
         2. Total number of products
         3. Count of orders by status (Pending, Completed, Cancelled - grouped/counted)
         4. Total revenue (sum of price x quantity for all orders, joined with products table)
         ========================================================================== */}
      <section className="summary-cards-section">
        {/* Primary 4 Summary Cards */}
        <div className="kpi-banner">
          {/* Card 1: Total Orders */}
          <div
            className="kpi-card kpi-card-orders"
            onClick={() => {
              setActiveTab("orders");
              setStatusFilter("All");
            }}
            title="Click to view all orders"
          >
            <div className="kpi-icon-wrapper kpi-icon-indigo">
              <ShoppingCart size={24} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">Total Orders</span>
              <div className="kpi-value-row">
                <span className="kpi-number">{orders.length}</span>
                <span className="kpi-badge kpi-badge-indigo">All Orders</span>
              </div>
              <span className="kpi-subtext">Total recorded customer orders</span>
            </div>
          </div>

          {/* Card 2: Total Products */}
          <div
            className="kpi-card kpi-card-products"
            onClick={() => setActiveTab("products")}
            title="Click to view all products"
          >
            <div className="kpi-icon-wrapper kpi-icon-blue">
              <Package size={24} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">Total Products</span>
              <div className="kpi-value-row">
                <span className="kpi-number">{products.length}</span>
                <span className="kpi-badge kpi-badge-blue">In Catalog</span>
              </div>
              <span className="kpi-subtext">Active items in MySQL database</span>
            </div>
          </div>

          {/* Card 3: Total Revenue (sum of price x quantity for all orders joined with products table) */}
          <div
            className="kpi-card kpi-card-revenue"
            onClick={() => setActiveTab("analytics")}
            title="Sum of price x quantity for all orders joined with products table"
          >
            <div className="kpi-icon-wrapper kpi-icon-amber">
              <IndianRupee size={24} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">Total Revenue</span>
              <div className="kpi-value-row">
                <span className="kpi-number">₹{Math.round(totalRevenue).toLocaleString()}</span>
                <span className="kpi-badge kpi-badge-amber">Price × Qty</span>
              </div>
              <span className="kpi-subtext">Joined with products table</span>
            </div>
          </div>

          {/* Card 4: Orders by Status Summary Overview */}
          <div
            className="kpi-card kpi-card-status"
            onClick={() => setActiveTab("orders")}
            title="Grouped counts of orders by status"
          >
            <div className="kpi-icon-wrapper kpi-icon-emerald">
              <Layers size={24} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">Status Breakdown</span>
              <div className="kpi-value-row">
                <span className="kpi-number" style={{ fontSize: "20px" }}>
                  {orderStatusCounts.Completed || 0}
                  <span style={{ fontSize: "14px", fontWeight: "normal", color: "#64748b", marginLeft: "4px" }}>
                    / {orders.length} Done
                  </span>
                </span>
                <span className="kpi-badge kpi-badge-emerald">Grouped</span>
              </div>
              <span className="kpi-subtext">
                Pending: {orderStatusCounts.Pending || 0} • Cancelled: {orderStatusCounts.Cancelled || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Dedicated Status Cards (Pending, Completed, Cancelled — Grouped / Counted) */}
        <div className="status-kpi-grid">
          {/* Status: Pending */}
          <div
            className={`status-kpi-card card-pending ${statusFilter === "Pending" ? "active-filter" : ""}`}
            onClick={() => {
              setActiveTab("orders");
              setStatusFilter("Pending");
            }}
            title="Click to filter orders by Pending"
          >
            <div className="status-kpi-header">
              <span className="status-kpi-badge badge-pending">
                <Clock size={14} /> Pending
              </span>
              <span className="status-kpi-count">{orderStatusCounts.Pending || 0}</span>
            </div>
            <div className="status-kpi-footer">
              <span>Orders awaiting fulfillment</span>
              <span className="click-to-filter-hint">Filter →</span>
            </div>
          </div>

          {/* Status: Completed */}
          <div
            className={`status-kpi-card card-completed ${statusFilter === "Completed" ? "active-filter" : ""}`}
            onClick={() => {
              setActiveTab("orders");
              setStatusFilter("Completed");
            }}
            title="Click to filter orders by Completed"
          >
            <div className="status-kpi-header">
              <span className="status-kpi-badge badge-completed">
                <CheckCircle2 size={14} /> Completed
              </span>
              <span className="status-kpi-count">{orderStatusCounts.Completed || 0}</span>
            </div>
            <div className="status-kpi-footer">
              <span>Delivered & fulfilled orders</span>
              <span className="click-to-filter-hint">Filter →</span>
            </div>
          </div>

          {/* Status: Cancelled */}
          <div
            className={`status-kpi-card card-cancelled ${statusFilter === "Cancelled" ? "active-filter" : ""}`}
            onClick={() => {
              setActiveTab("orders");
              setStatusFilter("Cancelled");
            }}
            title="Click to filter orders by Cancelled"
          >
            <div className="status-kpi-header">
              <span className="status-kpi-badge badge-cancelled">
                <XCircle size={14} /> Cancelled
              </span>
              <span className="status-kpi-count">{orderStatusCounts.Cancelled || 0}</span>
            </div>
            <div className="status-kpi-footer">
              <span>Voided or cancelled orders</span>
              <span className="click-to-filter-hint">Filter →</span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Status Pill Bar */}
      <section className="status-overview-bar">
        <div className="status-overview-header">
          <span className="section-title-sm">Status Filter & Progress</span>
          <div className="status-progress-track">
            {orders.length > 0 && (
              <>
                <div
                  className="progress-slice slice-completed"
                  style={{ width: `${((orderStatusCounts.Completed || 0) / orders.length) * 100}%` }}
                  title={`Completed: ${orderStatusCounts.Completed || 0}`}
                />
                <div
                  className="progress-slice slice-pending"
                  style={{ width: `${((orderStatusCounts.Pending || 0) / orders.length) * 100}%` }}
                  title={`Pending: ${orderStatusCounts.Pending || 0}`}
                />
                <div
                  className="progress-slice slice-cancelled"
                  style={{ width: `${((orderStatusCounts.Cancelled || 0) / orders.length) * 100}%` }}
                  title={`Cancelled: ${orderStatusCounts.Cancelled || 0}`}
                />
              </>
            )}
          </div>
        </div>

        <div className="status-pill-list">
          <button
            className={`status-pill ${statusFilter === "All" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("orders");
              setStatusFilter("All");
            }}
          >
            <span className="pill-dot all" />
            <span className="pill-text">All Orders</span>
            <span className="pill-count">{orders.length}</span>
          </button>

          <button
            className={`status-pill status-pending ${statusFilter === "Pending" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("orders");
              setStatusFilter("Pending");
            }}
          >
            <span className="pill-dot pending" />
            <span className="pill-text">Pending</span>
            <span className="pill-count">{orderStatusCounts.Pending || 0}</span>
          </button>

          <button
            className={`status-pill status-completed ${statusFilter === "Completed" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("orders");
              setStatusFilter("Completed");
            }}
          >
            <span className="pill-dot completed" />
            <span className="pill-text">Completed</span>
            <span className="pill-count">{orderStatusCounts.Completed || 0}</span>
          </button>

          <button
            className={`status-pill status-cancelled ${statusFilter === "Cancelled" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("orders");
              setStatusFilter("Cancelled");
            }}
          >
            <span className="pill-dot cancelled" />
            <span className="pill-text">Cancelled</span>
            <span className="pill-count">{orderStatusCounts.Cancelled || 0}</span>
          </button>
        </div>
      </section>

      {/* Sub-Navigation Bar */}
      <div className="dashboard-subnav">
        <div className="subnav-tabs">
          <button
            className={`subnav-tab ${activeTab === "orders" ? "active" : ""}`}
            onClick={() => setActiveTab("orders")}
          >
            <ShoppingCart size={17} />
            <span>Orders Management</span>
            <span className="tab-counter">{orders.length}</span>
          </button>
          <button
            className={`subnav-tab ${activeTab === "products" ? "active" : ""}`}
            onClick={() => setActiveTab("products")}
          >
            <Package size={17} />
            <span>Products Catalog</span>
            <span className="tab-counter">{products.length}</span>
          </button>
          <button
            className={`subnav-tab ${activeTab === "analytics" ? "active" : ""}`}
            onClick={() => setActiveTab("analytics")}
          >
            <BarChart3 size={17} />
            <span>Analytics & Insights</span>
          </button>
        </div>

        <div className="subnav-actions">
          {/* Real-time WebSocket Live Status Pill */}
          <div
            className={`ws-status-badge ${wsStatus}`}
            title={`Real-time WebSocket Live Updates: ${
              wsStatus === "connected"
                ? "Active (listening for live orders)"
                : wsStatus === "connecting"
                ? "Connecting to live stream..."
                : "Disconnected (reconnecting...)"
            }`}
          >
            <span className="ws-pulse-dot" />
            <span className="ws-status-text">
              {wsStatus === "connected"
                ? "Live Sync"
                : wsStatus === "connecting"
                ? "Connecting..."
                : "Offline"}
            </span>
          </div>

          {/* Sound Notification Toggle */}
          <button
            className={`btn btn-secondary btn-sm sound-toggle-btn ${soundEnabled ? "active" : ""}`}
            onClick={toggleSound}
            title={soundEnabled ? "Mute order sound notifications" : "Enable order sound chime"}
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            <span>{soundEnabled ? "Sound On" : "Muted"}</span>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            title="Refresh database"
          >
            <RefreshCw size={14} className={refreshing ? "spin" : ""} />
            <span>Refresh</span>
          </button>

          {activeTab === "orders" && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setOrderModal({ isOpen: true, mode: "add", order: null })}
            >
              <Plus size={16} />
              <span>Create Order</span>
            </button>
          )}

          {activeTab === "products" && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setProductModal({ isOpen: true, mode: "add", product: null })}
            >
              <Plus size={16} />
              <span>Add Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Sections */}
      <main className="dashboard-main-content">
        {/* ===================== TAB 1: ORDERS MANAGEMENT ===================== */}
        {activeTab === "orders" && (
          <div className="management-card">
            {/* Search/Filter Bar & Refresh Button Toolbar */}
            <div className="table-toolbar">
              <div className="toolbar-left">
                {/* Search Bar (Customer Name, Product, or ID) */}
                <div className="search-box">
                  <Search size={16} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Filter by customer name or product..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                  />
                  {orderSearch && (
                    <button className="clear-search-btn" onClick={() => setOrderSearch("")}>
                      ×
                    </button>
                  )}
                </div>

                {/* Status Filter Dropdown */}
                <div className="filter-dropdown-wrapper">
                  <Filter size={15} className="filter-icon" />
                  <select
                    className="filter-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="All">All Statuses ({orders.length})</option>
                    <option value="Pending">Pending ({orderStatusCounts.Pending || 0})</option>
                    <option value="Completed">Completed ({orderStatusCounts.Completed || 0})</option>
                    <option value="Cancelled">Cancelled ({orderStatusCounts.Cancelled || 0})</option>
                  </select>
                </div>

                {/* Refresh Button */}
                <button
                  className="btn btn-secondary btn-sm refresh-table-btn"
                  onClick={() => fetchData(false)}
                  disabled={refreshing || loading}
                  title="Re-fetch latest data from backend"
                >
                  <RefreshCw size={14} className={refreshing || loading ? "spin" : ""} />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="toolbar-right">
                {selectedOrderIds.length > 0 && (
                  <div className="bulk-actions-pill">
                    <span>{selectedOrderIds.length} selected</span>
                    <button
                      className="btn btn-danger btn-xs"
                      onClick={promptBulkDeleteOrders}
                    >
                      <Trash2 size={13} /> Delete Selected
                    </button>
                  </div>
                )}
                <span className="row-counter-text">
                  Showing {filteredOrders.length} of {orders.length} orders
                </span>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setOrderModal({ isOpen: true, mode: "add", order: null })}
                >
                  <Plus size={15} />
                  <span>New Order</span>
                </button>
              </div>
            </div>

            {/* Orders Table */}
            {loading && orders.length === 0 ? (
              <div className="loading-state">
                <RefreshCw size={32} className="spin text-primary" />
                <p>Loading orders from MySQL...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="empty-state">
                <ShoppingCart size={48} className="empty-icon" />
                <h3>No Orders Found</h3>
                <p>
                  {orderSearch || statusFilter !== "All"
                    ? "Try adjusting your search criteria or filter to see more orders."
                    : "No orders have been recorded in the database yet."}
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => setOrderModal({ isOpen: true, mode: "add", order: null })}
                >
                  <Plus size={16} /> Place First Order
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: "36px" }}>
                        <input
                          type="checkbox"
                          checked={
                            filteredOrders.length > 0 &&
                            selectedOrderIds.length === filteredOrders.length
                          }
                          onChange={toggleSelectAllOrders}
                          title="Select all"
                        />
                      </th>
                      <th
                        className="sortable-th"
                        onClick={() => handleOrderSort("id")}
                        style={{ width: "95px" }}
                      >
                        <div className="th-content">
                          Order ID <ArrowUpDown size={13} />
                        </div>
                      </th>
                      <th
                        className="sortable-th"
                        onClick={() => handleOrderSort("customer")}
                      >
                        <div className="th-content">
                          Customer Name <ArrowUpDown size={13} />
                        </div>
                      </th>
                      <th
                        className="sortable-th"
                        onClick={() => handleOrderSort("product")}
                      >
                        <div className="th-content">
                          Product <ArrowUpDown size={13} />
                        </div>
                      </th>
                      <th
                        className="sortable-th text-center"
                        onClick={() => handleOrderSort("quantity")}
                        style={{ width: "90px" }}
                      >
                        <div className="th-content justify-center">
                          Quantity <ArrowUpDown size={13} />
                        </div>
                      </th>
                      <th
                        className="sortable-th"
                        onClick={() => handleOrderSort("status")}
                        style={{ width: "160px" }}
                      >
                        <div className="th-content">
                          Status <ArrowUpDown size={13} />
                        </div>
                      </th>
                      <th className="text-right" style={{ width: "130px" }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => {
                      const isSelected = selectedOrderIds.includes(order.id);
                      const unitPrice =
                        productPriceMap.get((order.product || "").trim().toLowerCase()) || null;
                      const orderTotal =
                        unitPrice !== null ? unitPrice * (Number(order.quantity) || 0) : null;
                      
                      const rawStatus = (order.status || "Pending").trim();
                      const lowerStatus = rawStatus.toLowerCase();
                      const isCompleted = lowerStatus === "completed" || lowerStatus === "delivered";
                      const isCancelled = lowerStatus === "cancelled" || lowerStatus === "canceled";
                      const isPending = !isCompleted && !isCancelled;

                      const badgeClass = isCompleted
                        ? "status-badge-completed"
                        : isCancelled
                        ? "status-badge-cancelled"
                        : "status-badge-pending";

                      const displayStatus = isCompleted
                        ? "Completed"
                        : isCancelled
                        ? "Cancelled"
                        : rawStatus;

                      const isNewlyAdded = order.id === highlightedOrderId;

                      return (
                        <tr
                          key={order.id}
                          className={`${isSelected ? "row-selected" : ""} ${isNewlyAdded ? "row-highlight-new" : ""}`}
                        >
                          <td>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOrder(order.id)}
                            />
                          </td>
                          <td>
                            <div className="id-badge-wrapper">
                              <span className="id-badge">#{order.id}</span>
                              {isNewlyAdded && <span className="new-order-badge">NEW</span>}
                            </div>
                          </td>
                          <td>
                            <div className="customer-cell">
                              <span className="customer-avatar">
                                {order.customer ? order.customer.charAt(0).toUpperCase() : "U"}
                              </span>
                              <span className="customer-name">{order.customer}</span>
                            </div>
                          </td>
                          <td>
                            <div className="product-cell">
                              <Package size={14} className="cell-icon" />
                              <span className="product-name-text">{order.product}</span>
                              {unitPrice !== null && (
                                <span className="unit-price-tag">₹{unitPrice}</span>
                              )}
                            </div>
                          </td>
                          <td className="text-center">
                            <span className="qty-badge">{order.quantity}</span>
                          </td>
                          <td>
                            {/* Status Badge with Yellow (Pending), Green (Completed), Red (Cancelled) */}
                            <div className="status-badge-wrapper">
                              <span className={`status-badge-pill ${badgeClass}`}>
                                <span className="status-badge-dot" />
                                <span>{displayStatus}</span>
                              </span>

                              {/* Quick status dropdown selector */}
                              <select
                                className="status-mini-select"
                                value={displayStatus}
                                onChange={(e) => handleQuickStatusChange(order.id, e.target.value)}
                                title="Change order status"
                              >
                                <option value="Pending">Pending</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                            </div>
                          </td>
                          <td className="text-right">
                            <div className="row-actions">
                              <button
                                className="action-btn edit-btn"
                                title="Edit order details"
                                onClick={() => setOrderModal({ isOpen: true, mode: "edit", order })}
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                className="btn-row-delete"
                                title="Delete order"
                                onClick={() => promptDeleteOrder(order)}
                              >
                                <Trash2 size={14} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 2: PRODUCTS CATALOG ===================== */}
        {activeTab === "products" && (
          <div className="management-card">
            {/* Toolbar */}
            <div className="table-toolbar">
              <div className="toolbar-left">
                <div className="search-box">
                  <Search size={16} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search products by name, price, or ID..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                  {productSearch && (
                    <button className="clear-search-btn" onClick={() => setProductSearch("")}>
                      ×
                    </button>
                  )}
                </div>

                <div className="filter-dropdown-wrapper">
                  <select
                    className="filter-select"
                    value={productSort}
                    onChange={(e) => setProductSort(e.target.value)}
                  >
                    <option value="id_asc">Sort by ID (Low to High)</option>
                    <option value="id_desc">Sort by ID (High to Low)</option>
                    <option value="name_asc">Name (A → Z)</option>
                    <option value="name_desc">Name (Z → A)</option>
                    <option value="price_asc">Price (Low → High)</option>
                    <option value="price_desc">Price (High → Low)</option>
                  </select>
                </div>
              </div>

              <div className="toolbar-right">
                <div className="view-mode-toggle">
                  <button
                    className={`toggle-btn ${productViewMode === "table" ? "active" : ""}`}
                    onClick={() => setProductViewMode("table")}
                    title="Table view"
                  >
                    <List size={16} />
                  </button>
                  <button
                    className={`toggle-btn ${productViewMode === "grid" ? "active" : ""}`}
                    onClick={() => setProductViewMode("grid")}
                    title="Grid card view"
                  >
                    <LayoutGrid size={16} />
                  </button>
                </div>

                <span className="row-counter-text">
                  Showing {filteredProducts.length} of {products.length} products
                </span>
              </div>
            </div>

            {loading && products.length === 0 ? (
              <div className="loading-state">
                <RefreshCw size={32} className="spin text-primary" />
                <p>Loading products from MySQL...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="empty-state">
                <Package size={48} className="empty-icon" />
                <h3>No Products Found</h3>
                <p>
                  {productSearch
                    ? "No products match your search term."
                    : "No products added to catalog yet."}
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => setProductModal({ isOpen: true, mode: "add", product: null })}
                >
                  <Plus size={16} /> Add First Product
                </button>
              </div>
            ) : productViewMode === "grid" ? (
              /* Grid View */
              <div className="products-grid">
                {filteredProducts.map((product) => {
                  const stat = productOrderStats[(product.name || "").trim().toLowerCase()];
                  const orderCount = stat?.count || 0;
                  const totalUnits = stat?.totalQty || 0;

                  return (
                    <div key={product.id} className="product-card">
                      <div className="product-card-header">
                        <span className="product-id-tag">#{product.id}</span>
                        <div className="row-actions">
                          {onAddToCart && (
                            <button
                              type="button"
                              className="action-btn cart-btn"
                              title="Add to Shopping Cart"
                              onClick={() => onAddToCart(product.id, 1)}
                            >
                              <ShoppingCart size={14} />
                            </button>
                          )}
                          <button
                            className="action-btn review-btn"
                            title="View or add customer reviews"
                            onClick={() => setReviewModalProduct(product)}
                          >
                            <MessageSquare size={14} />
                          </button>
                          <button
                            className="action-btn edit-btn"
                            title="Edit product"
                            onClick={() =>
                              setProductModal({ isOpen: true, mode: "edit", product })
                            }
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="action-btn delete-btn"
                            title="Delete product"
                            onClick={() => promptDeleteProduct(product)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="product-card-body">
                        <div className="product-icon-avatar">
                          <Package size={28} />
                        </div>
                        <h4 className="product-card-title">{product.name}</h4>
                        <div className="product-card-price-row">
                          <div className="product-card-price">
                            ₹{Number(product.price).toLocaleString()}
                          </div>
                          <button
                            type="button"
                            className="product-rating-pill-btn"
                            onClick={() => setReviewModalProduct(product)}
                            title="Customer reviews & rating"
                          >
                            <Star size={13} className="star-icon filled" />
                            <span className="rating-val">
                              {product.average_rating ? Number(product.average_rating).toFixed(1) : "0.0"}
                            </span>
                            <span className="rating-cnt">({product.review_count || 0})</span>
                          </button>
                        </div>
                      </div>

                      <div className="product-card-footer">
                        <div className="product-stat-pill">
                          <ShoppingCart size={13} />
                          <span>{orderCount} orders</span>
                        </div>
                        <div className="product-stat-pill">
                          <TrendingUp size={13} />
                          <span>{totalUnits} units sold</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Table View */
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: "90px" }}>ID</th>
                      <th>Product Name</th>
                      <th style={{ width: "150px" }}>Unit Price</th>
                      <th style={{ width: "150px" }}>Orders Count</th>
                      <th style={{ width: "150px" }}>Total Units Sold</th>
                      <th className="text-right" style={{ width: "120px" }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => {
                      const stat = productOrderStats[(product.name || "").trim().toLowerCase()];
                      const orderCount = stat?.count || 0;
                      const totalUnits = stat?.totalQty || 0;

                      return (
                        <tr key={product.id}>
                          <td>
                            <span className="id-badge">#{product.id}</span>
                          </td>
                          <td>
                            <div className="product-table-name">
                              <Package size={16} className="text-primary mr-2" />
                              <strong className="text-slate-800">{product.name}</strong>
                            </div>
                          </td>
                          <td>
                            <div className="price-and-rating-cell">
                              <span className="price-tag">
                                ₹{Number(product.price).toLocaleString()}
                              </span>
                              <button
                                type="button"
                                className="product-rating-pill-btn"
                                onClick={() => setReviewModalProduct(product)}
                                title="Customer reviews & rating"
                              >
                                <Star size={12} className="star-icon filled" />
                                <span className="rating-val">
                                  {product.average_rating ? Number(product.average_rating).toFixed(1) : "0.0"}
                                </span>
                                <span className="rating-cnt">({product.review_count || 0})</span>
                              </button>
                            </div>
                          </td>
                          <td>
                            <span className="metric-badge">
                              {orderCount} {orderCount === 1 ? "order" : "orders"}
                            </span>
                          </td>
                          <td>
                            <span className="metric-badge units-badge">
                              {totalUnits} units
                            </span>
                          </td>
                          <td className="text-right">
                            <div className="row-actions">
                              {onAddToCart && (
                                <button
                                  type="button"
                                  className="action-btn cart-btn"
                                  title="Add to Shopping Cart"
                                  onClick={() => onAddToCart(product.id, 1)}
                                >
                                  <ShoppingCart size={14} />
                                </button>
                              )}
                              <button
                                className="action-btn review-btn"
                                title="View or add customer reviews"
                                onClick={() => setReviewModalProduct(product)}
                              >
                                <MessageSquare size={14} />
                              </button>
                              <button
                                className="action-btn edit-btn"
                                title="Edit product"
                                onClick={() =>
                                  setProductModal({ isOpen: true, mode: "edit", product })
                                }
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                className="action-btn delete-btn"
                                title="Delete product"
                                onClick={() => promptDeleteProduct(product)}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 3: ANALYTICS & INSIGHTS ===================== */}
        {activeTab === "analytics" && (
          <div className="analytics-layout">
            {/* Left Column: Top Selling Products */}
            <div className="analytics-card">
              <div className="card-header-row">
                <div className="card-title-group">
                  <TrendingUp size={20} className="text-primary" />
                  <div>
                    <h3 className="card-title">Top Selling Products</h3>
                    <p className="card-subtitle">Products with highest customer demand</p>
                  </div>
                </div>
              </div>

              <div className="top-products-list">
                {products.length === 0 ? (
                  <p className="text-muted p-4">No product data available yet.</p>
                ) : (
                  products
                    .map((p) => {
                      const stat = productOrderStats[(p.name || "").trim().toLowerCase()];
                      return {
                        ...p,
                        totalQty: stat?.totalQty || 0,
                        orderCount: stat?.count || 0,
                        revenue: (stat?.totalQty || 0) * p.price,
                      };
                    })
                    .sort((a, b) => b.totalQty - a.totalQty)
                    .slice(0, 6)
                    .map((item, idx) => {
                      const maxQty = Math.max(
                        ...products.map(
                          (p) =>
                            productOrderStats[(p.name || "").trim().toLowerCase()]?.totalQty || 1
                        ),
                        1
                      );
                      const percent = Math.min(100, Math.round((item.totalQty / maxQty) * 100));

                      return (
                        <div key={item.id} className="top-product-item">
                          <div className="top-product-rank">{idx + 1}</div>
                          <div className="top-product-info">
                            <div className="top-product-row">
                              <span className="top-product-name">{item.name}</span>
                              <span className="top-product-revenue">
                                ₹{item.revenue.toLocaleString()}
                              </span>
                            </div>
                            <div className="top-product-bar-track">
                              <div
                                className="top-product-bar-fill"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <div className="top-product-meta">
                              <span>{item.totalQty} units sold</span>
                              <span>{item.orderCount} orders</span>
                              <span>₹{item.price} each</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* Right Column: Status Distribution & Health */}
            <div className="analytics-right-col">
              {/* Order Status Distribution */}
              <div className="analytics-card">
                <div className="card-header-row">
                  <div className="card-title-group">
                    <BarChart3 size={20} className="text-primary" />
                    <div>
                      <h3 className="card-title">Order Status Distribution</h3>
                      <p className="card-subtitle">Fulfillment pipeline breakdown</p>
                    </div>
                  </div>
                </div>

                <div className="status-bars-container">
                  {Object.entries(STATUS_CONFIG).map(([st, conf]) => {
                    const count = orderStatusCounts[st] || 0;
                    const pct = orders.length > 0 ? Math.round((count / orders.length) * 100) : 0;
                    const Icon = conf.icon;

                    return (
                      <div key={st} className="status-bar-row">
                        <div className="status-bar-label-group">
                          <span className={`status-indicator-badge ${conf.color}`}>
                            <Icon size={13} /> {st}
                          </span>
                          <span className="status-bar-numbers">
                            <strong>{count}</strong> ({pct}%)
                          </span>
                        </div>
                        <div className="status-bar-track">
                          <div
                            className={`status-bar-fill fill-${st.toLowerCase()}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* System & AI Integration status card */}
              <div className="analytics-card">
                <div className="card-header-row">
                  <div className="card-title-group">
                    <Layers size={20} className="text-primary" />
                    <div>
                      <h3 className="card-title">System & Assistant Link</h3>
                      <p className="card-subtitle">MySQL DB & LangChain AI Bot connectivity</p>
                    </div>
                  </div>
                </div>

                <div className="system-status-list">
                  <div className="system-status-item">
                    <span className="system-key">FastAPI Backend</span>
                    <span className="system-val success">
                      <span className="status-live-dot" /> Connected (Port 8000)
                    </span>
                  </div>
                  <div className="system-status-item">
                    <span className="system-key">MySQL "productdatabase"</span>
                    <span className={`system-val ${dbError ? "danger" : "success"}`}>
                      <span className={`status-live-dot ${dbError ? "bg-red" : ""}`} />
                      {dbError ? "Disconnected" : "Active & Synced"}
                    </span>
                  </div>
                  <div className="system-status-item">
                    <span className="system-key">AI Agent Assistant</span>
                    <button className="btn btn-outline-primary btn-xs" onClick={onOpenChatbot}>
                      Launch Chatbot <ExternalLink size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Product Modal (Add / Edit) */}
      <ProductModal
        isOpen={productModal.isOpen}
        mode={productModal.mode}
        product={productModal.product}
        onClose={() => setProductModal({ isOpen: false, mode: "add", product: null })}
        onSave={handleSaveProduct}
        isLoading={isProductSubmitting}
      />

      {/* Order Modal (Add / Edit) */}
      <OrderModal
        isOpen={orderModal.isOpen}
        mode={orderModal.mode}
        order={orderModal.order}
        products={products}
        onClose={() => setOrderModal({ isOpen: false, mode: "add", order: null })}
        onSave={handleSaveOrder}
        isLoading={isOrderSubmitting}
      />

      {/* Confirmation Modal (Delete) */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        isLoading={confirmModal.isLoading}
      />

      {/* Product Reviews Modal (View & Submit Reviews) */}
      <ProductReviewsModal
        isOpen={Boolean(reviewModalProduct)}
        product={reviewModalProduct}
        onClose={() => setReviewModalProduct(null)}
        onReviewSubmitted={handleReviewSubmitted}
      />
    </div>
  );
}

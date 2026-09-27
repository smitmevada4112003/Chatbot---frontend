import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ShoppingBag,
  RefreshCw,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  PackageCheck,
  User,
} from "lucide-react";
import { api, authStorage } from "./services/api";
import "./MyOrders.css";

export default function MyOrders({ onOpenChatbot }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => authStorage.getUser());

  const fetchMyOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMyOrders();
      if (Array.isArray(data)) {
        setOrders(data);
      } else if (data && data.orders && Array.isArray(data.orders)) {
        setOrders(data.orders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error("Error fetching my orders:", err);
      setError(err.message || "Failed to load orders. Please make sure you are signed in.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyOrders();

    // Verify current profile
    api.getMe()
      .then((user) => {
        if (user && user.email) {
          setCurrentUser(user);
        }
      })
      .catch(() => {});
  }, [fetchMyOrders]);

  const renderStatusBadge = (status) => {
    const s = (status || "Pending").toLowerCase();
    if (s.includes("cancel")) {
      return (
        <span className="status-pill cancelled">
          <XCircle size={14} />
          <span>Cancelled</span>
        </span>
      );
    }
    if (s.includes("complete") || s.includes("deliver")) {
      return (
        <span className="status-pill completed">
          <CheckCircle2 size={14} />
          <span>Completed</span>
        </span>
      );
    }
    return (
      <span className="status-pill pending">
        <Clock size={14} />
        <span>Pending</span>
      </span>
    );
  };

  const displayName = currentUser?.name || currentUser?.email?.split("@")[0] || "Customer";
  const displayEmail = currentUser?.email || "";

  return (
    <div className="my-orders-container">
      {/* Header */}
      <div className="my-orders-header">
        <div className="my-orders-title-group">
          <h1>
            <div className="my-orders-title-icon">
              <ShoppingBag size={20} />
            </div>
            <span>My Orders</span>
          </h1>
          <p>View and track all orders linked to your personal customer account.</p>
        </div>

        <div className="my-orders-actions">
          <button
            className="btn-order-refresh"
            onClick={fetchMyOrders}
            disabled={loading}
            title="Refresh order history"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <Link to="/chat" className="btn-order-chat">
            <MessageSquare size={16} />
            <span>Ask AI / Place Order</span>
          </Link>
        </div>
      </div>

      {/* Customer Identity Banner */}
      <div className="user-identity-banner">
        <div className="user-identity-left">
          <div className="user-identity-avatar">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="user-identity-info">
            <h3>{displayName}</h3>
            <span>{displayEmail}</span>
          </div>
        </div>
        <div className="user-identity-count">
          <PackageCheck size={16} />
          <span>{orders.length} Total {orders.length === 1 ? "Order" : "Orders"}</span>
        </div>
      </div>

      {/* Orders Table Card */}
      <div className="my-orders-card">
        {loading ? (
          <div className="my-orders-loading">
            <div className="loading-spinner" />
            <p style={{ color: "#64748b", margin: 0 }}>Fetching your order history...</p>
          </div>
        ) : error ? (
          <div className="my-orders-error">
            <AlertCircle size={36} color="#ef4444" style={{ marginBottom: 12 }} />
            <h3 style={{ margin: "0 0 6px 0", color: "#0f172a" }}>Could not load orders</h3>
            <p>{error}</p>
            <button className="btn-order-refresh" onClick={fetchMyOrders}>
              <RefreshCw size={14} />
              <span>Try Again</span>
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="my-orders-empty">
            <div className="empty-icon-box">
              <ShoppingBag size={32} />
            </div>
            <h3>No orders found</h3>
            <p>
              You haven't placed any orders yet. You can chat with our AI assistant to browse products and place your first order in seconds!
            </p>
            <Link to="/chat" className="btn-order-chat">
              <MessageSquare size={16} />
              <span>Start Shopping with AI</span>
            </Link>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="orders-table">
              <thead>
                <tr>
                  <th style={{ width: "120px" }}>Order ID</th>
                  <th>Product</th>
                  <th style={{ width: "120px", textAlign: "center" }}>Quantity</th>
                  <th style={{ width: "150px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <span className="order-id-cell">#{order.id}</span>
                    </td>
                    <td>
                      <div className="order-product-cell">{order.product}</div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className="order-qty-badge">{order.quantity}</span>
                    </td>
                    <td>{renderStatusBadge(order.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

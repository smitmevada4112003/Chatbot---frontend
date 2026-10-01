import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import AdminDashboard from "./components/AdminDashboard";
import ChatBot from "./ChatBot";
import Login from "./Login";
import Signup from "./Signup";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import VerifyEmail from "./VerifyEmail";
import MyOrders from "./MyOrders";
import Cart from "./Cart";
import ToastContainer from "./components/Toast";
import { api, authStorage } from "./services/api";
import {
  LayoutDashboard,
  MessageSquare,
  Layers,
  ExternalLink,
  Sparkles,
  Menu,
  X,
  LogIn,
  LogOut,
  UserPlus,
  ShoppingBag,
  ShoppingCart,
  Sun,
  Moon,
} from "lucide-react";
import CartDrawer from "./components/CartDrawer";
import ProtectedRoute from "./components/ProtectedRoute";
import { useTheme } from "./ThemeContext";
import "./App.css";

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const [backendStatus, setBackendStatus] = useState("checking");
  const [toasts, setToasts] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Authentication State
  const [currentUser, setCurrentUser] = useState(() => authStorage.getUser());

  // Dark Mode Theme State provided by ThemeContext
  const { theme, toggleTheme, isDark } = useTheme();
  const darkMode = isDark;
  const toggleDarkMode = toggleTheme;

  // Check current route
  const isCurrentAdmin = location.pathname.startsWith("/admin");
  const isMyOrdersPage = location.pathname === "/my-orders";
  const isCartPage = location.pathname === "/cart";
  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/signup" ||
    location.pathname === "/forgot-password" ||
    location.pathname === "/reset-password" ||
    location.pathname === "/verify-email";
  const isLoggedIn = Boolean(currentUser && (currentUser.email || authStorage.getToken()));
  const isAdmin = Boolean(currentUser?.role === "admin" || (isLoggedIn && authStorage.isAdmin()));
  const brandHomeLink = isAdmin ? "/admin" : "/chat";

  // Central Toast system
  const addToast = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Health check on mount and interval
  useEffect(() => {
    async function checkServer() {
      try {
        const res = await api.checkHealth();
        if (res && res.status === "healthy") {
          setBackendStatus("online");
        } else {
          setBackendStatus("offline");
        }
      } catch {
        setBackendStatus("offline");
      }
    }

    checkServer();
    const interval = setInterval(checkServer, 20000);
    return () => clearInterval(interval);
  }, []);

  // Sync current user on mount (verify token validity)
  useEffect(() => {
    async function verifySession() {
      const token = localStorage.getItem("authToken");
      if (token) {
        try {
          const res = await api.getMe();
          if (res && res.email) {
            setCurrentUser({
              email: res.email,
              role: res.role,
              name: res.name || res.email.split("@")[0],
            });
            localStorage.setItem("userRole", res.role);
          }
        } catch {
          // Token expired or invalid
          authStorage.clearAuth();
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
    }
    verifySession();
  }, [location.pathname]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLoginSuccess = (user, token) => {
    setCurrentUser(user);
    addToast(`Signed in as ${user.email} (${user.role})`, "success");
  };

  // Logout button handler: clears token and role from localStorage, redirects to /login
  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("authUser");
    setCurrentUser(null);
    addToast("Logged out successfully.", "info");
    navigate("/login");
  };

  // Cart State & Handlers
  const [cartOpen, setCartOpen] = useState(false);
  const [cartData, setCartData] = useState({ items: [], total_items: 0, total_amount: 0 });
  const [cartLoading, setCartLoading] = useState(false);

  const fetchCart = useCallback(async (incomingData = null) => {
    if (!authStorage.getToken()) {
      setCartData({ items: [], total_items: 0, total_amount: 0 });
      return;
    }
    if (incomingData && Array.isArray(incomingData.items)) {
      setCartData(incomingData);
      return;
    }
    try {
      setCartLoading(true);
      const data = await api.getCart();
      setCartData(data || { items: [], total_items: 0, total_amount: 0 });
    } catch {
      // Ignore background fetch error
    } finally {
      setCartLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart, currentUser]);

  const handleAddToCart = async (productId, quantity = 1) => {
    if (!authStorage.getToken()) {
      addToast("Please sign in to add items to your shopping cart.", "info");
      navigate("/login");
      return;
    }
    try {
      const res = await api.addToCart(productId, quantity);
      addToast(res.message || "Item added to cart!", "success");
      await fetchCart();
      setCartOpen(true);
    } catch (err) {
      addToast(err.message || "Failed to add to cart", "error");
    }
  };

  const handleUpdateQuantity = async (productId, newQuantity) => {
    const previous = cartData;
    // Optimistic update for CartDrawer
    const updatedItems = cartData.items.map((item) => {
      const pid = item.product_id || item.id || item.item_id;
      if (pid === productId) {
        const p = Number(item.price) || 0;
        return {
          ...item,
          quantity: newQuantity,
          subtotal: Math.round(newQuantity * p * 100) / 100,
        };
      }
      return item;
    });

    const newTotal = updatedItems.reduce((acc, curr) => acc + curr.quantity, 0);
    const newAmount = Math.round(
      updatedItems.reduce((acc, curr) => acc + (Number(curr.subtotal) || 0), 0) * 100
    ) / 100;

    setCartData({
      items: updatedItems,
      total_items: newTotal,
      total_amount: newAmount,
      total_price: newAmount,
    });

    try {
      await api.updateCartItem(productId, newQuantity);
    } catch (err) {
      setCartData(previous);
      addToast(err.message || "Failed to update quantity", "error");
    }
  };

  const handleRemoveFromCart = async (productId) => {
    const previous = cartData;
    // Optimistic update
    const updatedItems = cartData.items.filter(
      (item) => (item.product_id || item.id || item.item_id) !== productId
    );
    const newTotal = updatedItems.reduce((acc, curr) => acc + curr.quantity, 0);
    const newAmount = Math.round(
      updatedItems.reduce((acc, curr) => acc + (Number(curr.subtotal) || 0), 0) * 100
    ) / 100;

    setCartData({
      items: updatedItems,
      total_items: newTotal,
      total_amount: newAmount,
      total_price: newAmount,
    });

    try {
      await api.removeFromCart(productId);
      addToast("Item removed from cart.", "info");
    } catch (err) {
      setCartData(previous);
      addToast(err.message || "Failed to remove item", "error");
    }
  };

  const handleClearCart = async () => {
    try {
      await api.clearCart();
      addToast("Shopping cart cleared.", "info");
      await fetchCart();
    } catch (err) {
      addToast(err.message || "Failed to clear cart", "error");
    }
  };

  const handleCheckout = async () => {
    const res = await api.checkoutCart();
    addToast(res.message || "Order placed successfully!", "success");
    await fetchCart();
    return res;
  };

  // Route guard wrapper for Admin Dashboard route
  const renderAdminRoute = () => {
    return (
      <ProtectedRoute
        user={currentUser}
        onOpenAuth={() => navigate("/login")}
      >
        <AdminDashboard
          onOpenChatbot={() => navigate("/chat")}
          addToast={addToast}
          onAddToCart={handleAddToCart}
          darkMode={darkMode}
          onToggleTheme={toggleDarkMode}
        />
      </ProtectedRoute>
    );
  };

  return (
    <div className="app-shell" data-theme={theme}>
      {/* Top Header & Navbar */}
      <header className="app-header">
        <div className="header-inner">
          {/* Brand Logo & Name */}
          <div className="nav-left-group">
            {/* Mobile Hamburger Button */}
            <button
              className="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            <Link to={brandHomeLink} className="nav-brand" style={{ textDecoration: "none" }}>
              <div className="brand-icon-box">
                <Layers size={22} />
              </div>
              <div className="brand-text-group">
                <span className="brand-name">
                  OrderBot <span className="brand-badge">Enterprise</span>
                </span>
                <span className="brand-subtitle">FastAPI & MySQL Admin Suite</span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Bar: Role-based links */}
          <nav className="desktop-navbar">
            {isAdmin ? (
              <>
                <Link
                  to="/admin"
                  className={`nav-link-btn ${isCurrentAdmin ? "active" : ""}`}
                >
                  <LayoutDashboard size={17} />
                  <span>Admin Dashboard</span>
                </Link>
                <Link
                  to="/chat"
                  className={`nav-link-btn ${!isCurrentAdmin && !isAuthPage && !isMyOrdersPage && !isCartPage ? "active" : ""}`}
                >
                  <MessageSquare size={17} />
                  <span>Chatbot</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/chat"
                  className={`nav-link-btn ${!isCurrentAdmin && !isAuthPage && !isMyOrdersPage && !isCartPage ? "active" : ""}`}
                >
                  <MessageSquare size={17} />
                  <span>Chatbot</span>
                </Link>

                {isLoggedIn && (
                  <Link
                    to="/my-orders"
                    className={`nav-link-btn ${isMyOrdersPage ? "active" : ""}`}
                  >
                    <ShoppingBag size={17} />
                    <span>My Orders</span>
                  </Link>
                )}

                <Link
                  to="/cart"
                  className={`nav-link-btn ${isCartPage ? "active" : ""}`}
                  title="Shopping Cart"
                >
                  <ShoppingCart size={17} />
                  <span>Cart</span>
                  {cartData.total_items > 0 && (
                    <span className="cart-badge-counter">{cartData.total_items}</span>
                  )}
                </Link>
              </>
            )}
          </nav>

          {/* Right Tools: User Profile, Logout Button, Backend Status & Docs */}
          <div className="nav-right-tools">
            <div className="nav-auth-section">
              {currentUser ? (
                <div className="user-profile-badge">
                  <div className="user-avatar-circle">
                    {(currentUser.name || currentUser.email || "U").charAt(0).toUpperCase()}
                  </div>
                  <span className="user-name-label">
                    {currentUser.name || currentUser.email}
                  </span>
                  <span className={`role-tag ${currentUser.role === "admin" ? "admin" : "customer"}`}>
                    {currentUser.role}
                  </span>
                  <button
                    className="btn-header-logout"
                    onClick={handleLogout}
                    title="Log Out and return to Login page"
                  >
                    <LogOut size={15} />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "8px" }}>
                  <Link
                    to="/login"
                    className="btn-header-signin"
                    style={{ textDecoration: "none" }}
                  >
                    <LogIn size={15} />
                    <span>Sign In</span>
                  </Link>

                  <Link
                    to="/signup"
                    className="btn-header-signin"
                    style={{ textDecoration: "none" }}
                  >
                    <UserPlus size={15} />
                    <span>Sign Up</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Dark Mode Toggle Button */}
            <button
              className="theme-toggle-btn"
              onClick={toggleDarkMode}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle dark mode theme"
            >
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
              <span>{darkMode ? "Light" : "Dark"}</span>
            </button>

            <a
              href="/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="docs-link"
              title="Open FastAPI Swagger Interactive Docs"
            >
              <span>API Docs</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </div>

        {/* Mobile Slide-Out Sidebar Navigation */}
        {mobileMenuOpen && (
          <div className="mobile-sidebar-backdrop" onClick={() => setMobileMenuOpen(false)}>
            <div className="mobile-sidebar-drawer" onClick={(e) => e.stopPropagation()}>
              <div className="mobile-drawer-header">
                <div className="brand-icon-box">
                  <Layers size={20} />
                </div>
                <span className="drawer-title">Navigation Menu</span>
                <button
                  className="drawer-close-btn"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Mobile User Profile Section */}
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9" }}>
                {currentUser ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div className="user-avatar-circle">
                        {(currentUser.name || currentUser.email || "U").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "14px", color: "#0f172a" }}>
                          {currentUser.name || currentUser.email}
                        </div>
                        <span className={`role-tag ${currentUser.role === "admin" ? "admin" : "customer"}`}>
                          {currentUser.role}
                        </span>
                      </div>
                    </div>
                    <button
                      className="btn-header-logout"
                      onClick={handleLogout}
                      style={{ marginTop: "4px" }}
                    >
                      <LogOut size={15} />
                      <span>Logout</span>
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <Link
                      to="/login"
                      className="btn-header-signin"
                      style={{ textDecoration: "none", justifyContent: "center" }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <LogIn size={15} />
                      <span>Sign In</span>
                    </Link>
                    <Link
                      to="/signup"
                      className="btn-header-signin"
                      style={{ textDecoration: "none", justifyContent: "center" }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <UserPlus size={15} />
                      <span>Sign Up</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* Mobile Role-Based Navigation Links */}
              <div className="mobile-nav-links">
                {isAdmin ? (
                  <>
                    <Link
                      to="/admin"
                      className={`mobile-nav-item ${isCurrentAdmin ? "active" : ""}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <LayoutDashboard size={19} />
                      <span>Admin Dashboard</span>
                    </Link>
                    <Link
                      to="/chat"
                      className={`mobile-nav-item ${!isCurrentAdmin && !isAuthPage && !isMyOrdersPage && !isCartPage ? "active" : ""}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <MessageSquare size={19} />
                      <span>Chatbot</span>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/chat"
                      className={`mobile-nav-item ${!isCurrentAdmin && !isAuthPage && !isMyOrdersPage && !isCartPage ? "active" : ""}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <MessageSquare size={19} />
                      <span>Chatbot</span>
                    </Link>

                    {isLoggedIn && (
                      <Link
                        to="/my-orders"
                        className={`mobile-nav-item ${isMyOrdersPage ? "active" : ""}`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <ShoppingBag size={19} />
                        <span>My Orders</span>
                      </Link>
                    )}

                    <Link
                      to="/cart"
                      className={`mobile-nav-item ${isCartPage ? "active" : ""}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <ShoppingCart size={19} />
                      <span>Cart ({cartData.total_items})</span>
                    </Link>
                  </>
                )}
              </div>

              <div className="mobile-drawer-footer">
                <button
                  className="theme-toggle-btn"
                  onClick={toggleDarkMode}
                  style={{ width: "100%", justifyContent: "center", marginBottom: "10px" }}
                  title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                  aria-label="Toggle dark mode theme"
                >
                  {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                  <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
                </button>

                <a
                  href="/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="docs-link"
                  style={{ marginTop: "8px" }}
                >
                  <span>FastAPI Docs</span>
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Routes View */}
      <Routes>
        {/* /login - Dedicated Login Page */}
        <Route
          path="/login"
          element={<Login onLoginSuccess={handleLoginSuccess} />}
        />

        {/* /signup - Dedicated Signup Page */}
        <Route
          path="/signup"
          element={<Signup />}
        />

        {/* /forgot-password - Forgot Password Request Page */}
        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        {/* /reset-password - Reset Password via Token Page */}
        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />

        {/* /verify-email - Email Verification Page */}
        <Route
          path="/verify-email"
          element={<VerifyEmail />}
        />

        {/* /my-orders - Logged-in Customer Orders Route */}
        <Route
          path="/my-orders"
          element={
            isLoggedIn ? (
              <MyOrders onOpenChatbot={() => navigate("/chat")} />
            ) : (
              <Navigate to="/login" state={{ from: location }} replace />
            )
          }
        />

        {/* /cart - Shopping Cart Page */}
        <Route
          path="/cart"
          element={<Cart onCartUpdated={fetchCart} />}
        />

        {/* /admin - Admin Dashboard Route (Redirects to /login if token/admin role missing) */}
        <Route
          path="/admin"
          element={renderAdminRoute()}
        />

        {/* /chat - Public Chat Route */}
        <Route
          path="/chat"
          element={
            <div className="chatbot-view-wrapper">
              <div className="chatbot-intro-header">
                <h2>Product & Order Assistant</h2>
                <p>
                  Query catalog inventory, check order fulfillment, or place new orders live with the AI assistant.
                </p>
                {isAdmin && (
                  <div style={{ marginTop: "14px" }}>
                    <Link
                      to="/admin"
                      className="btn btn-primary btn-sm"
                      style={{ textDecoration: "none", display: "inline-flex", gap: "8px" }}
                    >
                      <LayoutDashboard size={15} />
                      <span>Go to Admin Dashboard</span>
                    </Link>
                  </div>
                )}
              </div>
              <ChatBot darkMode={darkMode} onToggleTheme={toggleDarkMode} />
            </div>
          }
        />

        {/* / - Default route redirects to primary landing view per role */}
        <Route
          path="/"
          element={<Navigate to={isAdmin ? "/admin" : "/chat"} replace />}
        />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to={isAdmin ? "/admin" : "/chat"} replace />} />
      </Routes>

      {/* Floating Shortcut to Chat when on /admin */}
      {isCurrentAdmin && currentUser?.role === "admin" && (
        <button
          className="floating-chat-trigger"
          onClick={() => navigate("/chat")}
          title="Open Chat"
        >
          <Sparkles size={17} />
          <span>Open Chat</span>
        </button>
      )}

      {/* Shopping Cart Drawer */}
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cartData={cartData}
        loading={cartLoading}
        isLoggedIn={isLoggedIn}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={handleClearCart}
        onCheckout={handleCheckout}
        onNavigateToLogin={() => {
          setCartOpen(false);
          navigate("/login");
        }}
      />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onCloseToast={removeToast} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}


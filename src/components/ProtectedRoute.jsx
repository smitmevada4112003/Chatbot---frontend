import React from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { ShieldAlert, LogIn, MessageSquare, KeyRound } from "lucide-react";
import { authStorage } from "../services/api";
import "./ProtectedRoute.css";

/**
 * Route Guard Component for Admin Routes
 * - If user is not logged in: redirects directly to /login
 * - If user is logged in as 'customer': blocks access and renders "Not Authorized" message with safe return to /chat
 * - If user is 'admin': renders protected children (AdminDashboard)
 */
export default function ProtectedRoute({ children, user, onOpenAuth }) {
  const location = useLocation();
  const token = authStorage.getToken() || localStorage.getItem("authToken");
  const storedRole = (authStorage.getRole() || localStorage.getItem("userRole") || "").toLowerCase();
  const role = (user?.role || storedRole).toLowerCase();
  const isAdmin = Boolean(token && role === "admin");

  // 1. If not logged in at all, redirect away from /admin to /login with origin state
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. If logged in but role is customer, block access and render Not Authorized screen
  if (!isAdmin) {
    const displayName = user?.name || user?.email || localStorage.getItem("userEmail") || "Customer";
    return (
      <div className="protected-route-container">
        <div className="protected-access-card">
          <div className="protected-icon-circle">
            <ShieldAlert size={36} />
          </div>

          <h2>Not Authorized: Admin Access Required</h2>
          <p className="protected-description">
            The Admin Dashboard is restricted to authorized store administrators.
            Customers do not have permission to view or manage catalog products, store orders, or system analytics.
          </p>

          <div className="role-warning-badge">
            Currently logged in as <strong>{displayName}</strong> ({role || "customer"}). This account does not have administrator privileges.
          </div>

          <div className="protected-actions-group">
            <Link to="/chat" className="btn btn-primary btn-protected-back">
              <MessageSquare size={17} />
              <span>Go to Chatbot</span>
            </Link>

            <button
              className="btn btn-secondary btn-protected-login"
              onClick={onOpenAuth}
            >
              <LogIn size={17} />
              <span>Sign In as Admin</span>
            </button>
          </div>

          <div className="protected-credentials-hint">
            <KeyRound size={15} />
            <span>
              Default Admin Demo: <code>admin@example.com</code> / <code>Admin123!</code>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authorized Administrator: render protected admin component
  return children;
}


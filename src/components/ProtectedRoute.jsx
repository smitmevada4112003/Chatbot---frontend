import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, LogIn, MessageSquare, KeyRound, Sparkles } from "lucide-react";
import "./ProtectedRoute.css";

export default function ProtectedRoute({ children, user, onOpenAuth }) {
  const isAdmin = user && user.role === "admin";

  if (isAdmin) {
    return children;
  }

  return (
    <div className="protected-route-container">
      <div className="protected-access-card">
        <div className="protected-icon-circle">
          <ShieldAlert size={36} />
        </div>

        <h2>Admin Access Required</h2>
        <p className="protected-description">
          The Admin Dashboard is restricted to authenticated store administrators.
          Please sign in with your administrator credentials to manage products, view order metrics, and handle customer fulfillment.
        </p>

        {user && user.role !== "admin" && (
          <div className="role-warning-badge">
            Currently logged in as <strong>{user.name}</strong> ({user.role}). This account does not have administrator privileges.
          </div>
        )}

        <div className="protected-actions-group">
          <button
            className="btn btn-primary btn-protected-login"
            onClick={onOpenAuth}
          >
            <LogIn size={17} />
            <span>Sign In as Admin</span>
          </button>

          <Link to="/chat" className="btn btn-secondary btn-protected-back">
            <MessageSquare size={17} />
            <span>Return to Chat</span>
          </Link>
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

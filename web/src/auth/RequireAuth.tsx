import type { ReactNode } from "react";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { devLogin, googleLogin } from "../api/auth";
import { Button } from "../components/Button";
import { Spinner } from "../components/Spinner";
import { useAuth } from "./AuthContext";
import "./RequireAuth.css";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, setUser } = useAuth();
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <div className="gate">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    // In production, Google is the only login path, so bounce unauthenticated
    // visitors back to the landing page. Locally, Google OAuth isn't configured,
    // so keep the dev-login gate as the working entry point.
    if (!import.meta.env.DEV) {
      return <Navigate to="/" replace />;
    }

    const onDevLogin = async () => {
      setBusy(true);
      try {
        setUser(await devLogin());
      } finally {
        setBusy(false);
      }
    };
    return (
      <div className="gate">
        <h2>Sign in to edit your cards</h2>
        <p>You need to be signed in to access the editor.</p>
        <div className="gate-actions">
          <Button onClick={onDevLogin} disabled={busy}>
            Sign in as dev user
          </Button>
          <Button onClick={googleLogin} disabled={busy}>
            Sign in with Google
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

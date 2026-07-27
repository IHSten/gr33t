import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { googleLogin, logout } from "../api/auth";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme/ThemeProvider";
import "./AuthBar.css";

const UserIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
  </svg>
);

const SunIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const nextIsDark = theme === "light";
  return (
    <button
      type="button"
      className="auth-icon-btn"
      onClick={toggleTheme}
      aria-label={nextIsDark ? "Switch to dark mode" : "Switch to light mode"}
    >
      {nextIsDark ? <MoonIcon /> : <SunIcon />}
    </button>
  );
};

export const AuthBar = () => {
  const { theme } = useTheme();
  const { user, loading, setUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const onDashboard = pathname.startsWith("/dashboard");
  const onCard = pathname.startsWith("/card/");

  const onLogout = async () => {
    setBusy(true);
    try {
      await logout();
      setUser(null);
      setMenuOpen(false);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <div className="auth-bar">
      <Link className="auth-brand" to="/" aria-label="gr33t home">
        <img
          src={theme === "light" ? "/logo-light.svg" : "/logo-dark.svg"}
          alt="gr33t"
          className="auth-logo"
          width={28}
          height={28}
        />
      </Link>
      <div className="auth-actions">
        {loading ? null : user ? (
          onDashboard ? (
            <>
              <Link className="auth-link" to="/dashboard">
                Dashboard
              </Link>
              <div className="auth-menu" ref={menuRef}>
                <button
                  type="button"
                  className="auth-icon-btn"
                  aria-label="Account menu"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen(o => !o)}
                >
                  <UserIcon />
                </button>
                {menuOpen && (
                  <div className="auth-menu-panel" role="menu">
                    <span className="auth-menu-email">{user.email}</span>
                    <button
                      className="auth-menu-signout"
                      role="menuitem"
                      onClick={onLogout}
                      disabled={busy}
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : onCard ? null : (
            <Link className="auth-link" to="/dashboard">
              Dashboard
            </Link>
          )
        ) : onCard ? null : (
          <button className="auth-link" onClick={googleLogin}>
            Dashboard
          </button>
        )}
        <ThemeToggle />
      </div>
    </div>
  );
};

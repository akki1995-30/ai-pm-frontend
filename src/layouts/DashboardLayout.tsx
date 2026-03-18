import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Zap,
  Users,
  FolderKanban,
  LogOut,
  ChevronRight,
  Shield,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/dashboard/teams",    icon: <Users size={18} />,       label: "Teams" },
  { to: "/dashboard/projects", icon: <FolderKanban size={18} />, label: "Projects" },
];

const ROLE_COLORS: Record<string, string> = {
  ADMIN:   "#f59e0b",
  MANAGER: "#6366f1",
  MEMBER:  "#10b981",
  VIEWER:  "#6b7280",
};

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const isAdmin = user?.role === "ADMIN";
  const roleColor = ROLE_COLORS[user?.role ?? ""] ?? "var(--text-muted)";

  return (
    <div style={styles.shell}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <div style={styles.logoIcon}><Zap size={20} color="#fff" /></div>
          <span style={styles.logoText}>FlowBoard</span>
        </div>

        {/* Nav */}
        <nav style={styles.nav}>
          <p style={styles.navSection}>Navigation</p>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                ...styles.navItem,
                ...(isActive ? styles.navItemActive : {}),
              })}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
              <ChevronRight size={14} style={styles.navChevron} />
            </NavLink>
          ))}

          {/* Admin section — only visible to ADMIN role */}
          {isAdmin && (
            <>
              <p style={{ ...styles.navSection, marginTop: 16 }}>Admin</p>
              <NavLink
                to="/dashboard/admin"
                style={({ isActive }) => ({
                  ...styles.navItem,
                  ...(isActive ? styles.navItemActive : {}),
                })}
              >
                <span style={styles.navIcon}><Shield size={18} /></span>
                <span>User Management</span>
                <ChevronRight size={14} style={styles.navChevron} />
              </NavLink>
            </>
          )}
        </nav>

        {/* User footer */}
        <div style={styles.userFooter}>
          <div style={styles.avatar}>{initials}</div>
          <div style={styles.userInfo}>
            <p style={styles.userName}>{user?.name || "User"}</p>
            <p style={{ ...styles.userEmail, color: roleColor, fontWeight: 600 }}>
              {user?.role ?? ""}
            </p>
          </div>
          <button
            onClick={handleLogout}
            style={styles.logoutBtn}
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  shell:         { display: "flex", minHeight: "100vh", background: "var(--bg)" },
  sidebar:       { width: 240, background: "var(--bg-card)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh" },
  logoWrap:      { display: "flex", alignItems: "center", gap: 10, padding: "20px 16px", borderBottom: "1px solid var(--border)" },
  logoIcon:      { width: 34, height: 34, background: "var(--primary)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  logoText:      { fontSize: "1.05rem", fontWeight: 700, color: "var(--text)" },
  nav:           { flex: 1, padding: "16px 10px", display: "flex", flexDirection: "column", gap: 2 },
  navSection:    { fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.08em", color: "var(--text-muted)", textTransform: "uppercase", padding: "0 8px", marginBottom: 6 },
  navItem:       { display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, color: "var(--text-muted)", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500, transition: "all 0.15s" },
  navItemActive: { background: "rgba(99,102,241,0.15)", color: "var(--primary)" },
  navIcon:       { display: "flex", alignItems: "center", flexShrink: 0 },
  navChevron:    { marginLeft: "auto", opacity: 0.4 },
  userFooter:    { padding: "12px 14px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 },
  avatar:        { width: 34, height: 34, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 700, color: "#fff", flexShrink: 0 },
  userInfo:      { flex: 1, overflow: "hidden" },
  userName:      { fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  userEmail:     { fontSize: "0.75rem", color: "var(--text-muted)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  logoutBtn:     { background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, borderRadius: 6, display: "flex", alignItems: "center", transition: "color 0.15s" },
  main:          { flex: 1, overflow: "auto", padding: "32px" },
};

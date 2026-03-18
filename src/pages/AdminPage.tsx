import React, { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { Shield, Loader2, CheckCircle2, XCircle, ChevronDown } from "lucide-react";
import { GET_USERS, ASSIGN_ROLE, SET_USER_STATUS } from "../lib/graphql";

interface AppUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

const ROLES = ["ADMIN", "MANAGER", "MEMBER", "VIEWER"];

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  ADMIN:   { bg: "rgba(245,158,11,0.15)",  color: "#f59e0b" },
  MANAGER: { bg: "rgba(99,102,241,0.15)",  color: "#6366f1" },
  MEMBER:  { bg: "rgba(16,185,129,0.15)",  color: "#10b981" },
  VIEWER:  { bg: "rgba(107,114,128,0.15)", color: "#6b7280" },
};

export const AdminPage: React.FC = () => {
  const [search, setSearch] = useState("");

  const { data, loading, error, refetch } = useQuery(GET_USERS, {
    fetchPolicy: "network-only",
  });

  const [assignRole] = useMutation(ASSIGN_ROLE, {
    onCompleted: () => refetch(),
  });

  const [setUserStatus] = useMutation(SET_USER_STATUS, {
    onCompleted: () => refetch(),
  });

  const handleRoleChange = (userId: string, role: string) => {
    assignRole({ variables: { userId, role } });
  };

  const handleToggleStatus = (userId: string, currentStatus: string) => {
    const next = currentStatus === "active" ? "inactive" : "active";
    setUserStatus({ variables: { userId, status: next } });
  };

  const users: AppUser[] = (data?.users ?? []).filter((u: AppUser) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={styles.shieldIcon}>
            <Shield size={20} color="#6366f1" />
          </div>
          <div>
            <h1 style={styles.pageTitle}>User Management</h1>
            <p style={styles.pageSubtitle}>
              Assign global roles and manage user access
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          className="input"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 340 }}
        />
      </div>

      {/* Loading */}
      {loading && (
        <div style={styles.center}>
          <Loader2
            size={32}
            style={{ animation: "spin 1s linear infinite", color: "var(--primary)" }}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card" style={{ borderColor: "var(--danger)", padding: 20 }}>
          <p style={{ color: "var(--danger)", margin: 0 }}>
            Failed to load users: {error.message}
          </p>
        </div>
      )}

      {/* Users table */}
      {!loading && !error && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Global Role</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Joined</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} style={styles.emptyCell}>
                    No users found
                  </td>
                </tr>
              )}
              {users.map((u) => {
                const rc = ROLE_COLORS[u.role] ?? ROLE_COLORS["VIEWER"];
                return (
                  <tr key={u._id} style={styles.tr}>
                    {/* User info */}
                    <td style={styles.td}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={styles.avatar}>
                          {u.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p style={styles.userName}>{u.name}</p>
                          <p style={styles.userEmail}>{u.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role selector */}
                    <td style={styles.td}>
                      <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u._id, e.target.value)}
                          style={{
                            ...styles.roleSelect,
                            background: rc.bg,
                            color: rc.color,
                            borderColor: rc.color + "55",
                          }}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r} style={{ background: "var(--bg-card)", color: "var(--text)" }}>
                              {r}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={12}
                          style={{ position: "absolute", right: 8, pointerEvents: "none", color: rc.color }}
                        />
                      </div>
                    </td>

                    {/* Status */}
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          background: u.status === "active"
                            ? "rgba(16,185,129,0.15)"
                            : "rgba(239,68,68,0.15)",
                          color: u.status === "active" ? "#10b981" : "#ef4444",
                        }}
                      >
                        {u.status === "active"
                          ? <CheckCircle2 size={12} />
                          : <XCircle size={12} />}
                        {u.status}
                      </span>
                    </td>

                    {/* Joined */}
                    <td style={styles.td}>
                      <span style={styles.dateText}>
                        {new Date(Number(u.createdAt)).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </td>

                    {/* Toggle status */}
                    <td style={styles.td}>
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: "0.78rem", padding: "5px 12px" }}
                        onClick={() => handleToggleStatus(u._id, u.status)}
                      >
                        {u.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  pageTitle:   { fontSize: "1.5rem", fontWeight: 700, margin: 0 },
  pageSubtitle:{ fontSize: "0.875rem", color: "var(--text-muted)", margin: "4px 0 0" },
  shieldIcon:  { width: 44, height: 44, borderRadius: 12, background: "rgba(99,102,241,0.12)", display: "flex", alignItems: "center", justifyContent: "center" },
  center:      { display: "flex", justifyContent: "center", padding: "60px 0" },
  table:       { width: "100%", borderCollapse: "collapse" },
  thead:       { background: "rgba(255,255,255,0.03)", borderBottom: "1px solid var(--border)" },
  th:          { padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" },
  tr:          { borderBottom: "1px solid var(--border)", transition: "background 0.1s" },
  td:          { padding: "14px 16px", verticalAlign: "middle" },
  emptyCell:   { padding: "40px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem" },
  avatar:      { width: 36, height: 36, borderRadius: "50%", background: "rgba(99,102,241,0.2)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 },
  userName:    { margin: 0, fontSize: "0.9rem", fontWeight: 600, color: "var(--text)" },
  userEmail:   { margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" },
  roleSelect:  { appearance: "none", border: "1px solid", borderRadius: 20, padding: "4px 28px 4px 12px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", outline: "none" },
  statusBadge: { display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600 },
  dateText:    { fontSize: "0.8rem", color: "var(--text-muted)" },
};

import React, { useState } from "react";
import { useMutation, useApolloClient } from "@apollo/client";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, User, Zap } from "lucide-react";
import { REGISTER_MUTATION, ME_QUERY } from "../lib/graphql";
import { useAuth } from "../context/AuthContext";

export const RegisterPage: React.FC = () => {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  const apolloClient = useApolloClient();

  const [register, { loading }] = useMutation(REGISTER_MUTATION, {
    onCompleted: async (data) => {
      localStorage.setItem("token", data.register.token);
      try {
        const { data: meData } = await apolloClient.query({
          query: ME_QUERY,
          fetchPolicy: "network-only",
        });
        login(data.register.token, {
          ...data.register.user,
          role: meData?.me?.role,
        });
      } catch {
        login(data.register.token, data.register.user);
      }
      navigate("/dashboard");
    },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.email || !form.password)
      return setError("All fields are required");
    register({ variables: { input: form } });
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logo}>
          <div style={styles.logoIcon}>
            <Zap size={22} color="#fff" />
          </div>
          <span style={styles.logoText}>FlowBoard</span>
        </div>

        <h1 style={styles.title}>Create your account</h1>
        <p style={styles.subtitle}>Start managing projects smarter</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div style={styles.inputWrap}>
              <User size={16} style={styles.inputIcon} />
              <input
                className="input"
                style={{ paddingLeft: 38 }}
                placeholder="John Doe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <div style={styles.inputWrap}>
              <Mail size={16} style={styles.inputIcon} />
              <input
                className="input"
                style={{ paddingLeft: 38 }}
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={styles.inputWrap}>
              <Lock size={16} style={styles.inputIcon} />
              <input
                className="input"
                style={{ paddingLeft: 38 }}
                type="password"
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          </div>

          {error && (
            <p className="form-error" style={{ textAlign: "center" }}>
              {error}
            </p>
          )}

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: "100%", justifyContent: "center", padding: "12px" }}
          >
            {loading ? <span className="spinner" /> : "Create Account"}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account?{" "}
          <Link to="/login" style={styles.link}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    background:
      "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 70%)",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "36px 32px",
    boxShadow: "var(--shadow)",
  },
  logo: { display: "flex", alignItems: "center", gap: 10, marginBottom: 28 },
  logoIcon: {
    width: 36,
    height: 36,
    background: "var(--primary)",
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { fontSize: "1.2rem", fontWeight: 700, color: "var(--text)" },
  title: { fontSize: "1.5rem", fontWeight: 700, marginBottom: 6 },
  subtitle: {
    fontSize: "0.875rem",
    color: "var(--text-muted)",
    marginBottom: 28,
  },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  inputWrap: { position: "relative" },
  inputIcon: {
    position: "absolute",
    left: 12,
    top: "50%",
    transform: "translateY(-50%)",
    color: "var(--text-muted)",
    pointerEvents: "none",
  },
  footer: {
    marginTop: 20,
    textAlign: "center",
    fontSize: "0.875rem",
    color: "var(--text-muted)",
  },
  link: { color: "var(--primary)", textDecoration: "none", fontWeight: 500 },
};

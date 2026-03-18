import React, { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { useNavigate } from "react-router-dom";
import { Plus, Users, ArrowRight, Loader2 } from "lucide-react";
import { GET_TEAMS, CREATE_TEAM } from "../lib/graphql";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";

interface Team {
  _id: string;
  name: string;
  description?: string;
}

export const TeamsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreateTeam = user?.role === "MANAGER" || user?.role === "ADMIN";
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [formError, setFormError] = useState("");

  const { data, loading, error, refetch } = useQuery(GET_TEAMS);

  const [createTeam, { loading: creating }] = useMutation(CREATE_TEAM, {
    onCompleted: () => {
      setShowModal(false);
      setForm({ name: "", description: "" });
      refetch();
    },
    onError: (err) => setFormError(err.message),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!form.name.trim()) return setFormError("Team name is required");
    createTeam({
      variables: { input: { name: form.name, description: form.description } },
    });
  };

  const teams: Team[] = data?.teams || [];
  console.log("teams", teams);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 style={styles.pageTitle}>Teams</h1>
          <p style={styles.pageSubtitle}>
            Manage your teams and collaborate with members
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ display: canCreateTeam ? undefined : "none" }}>
          <Plus size={16} />
          New Team
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={styles.center}>
          <Loader2
            size={32}
            style={{
              animation: "spin 1s linear infinite",
              color: "var(--primary)",
            }}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="card"
          style={{ borderColor: "var(--danger)", padding: 20 }}
        >
          <p style={{ color: "var(--danger)", margin: 0 }}>
            Failed to load teams: {error.message}
          </p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && teams.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Users size={28} />
          </div>
          <p className="empty-state-title">No teams yet</p>
          <p className="empty-state-text">
            {canCreateTeam
              ? "Create your first team to start managing projects"
              : "You haven't been added to any team yet. Ask your manager to add you."}
          </p>
          {canCreateTeam && (
            <button
              className="btn btn-primary"
              onClick={() => setShowModal(true)}
            >
              <Plus size={16} /> Create Team
            </button>
          )}
        </div>
      )}

      {/* Teams grid */}
      {teams.length > 0 && (
        <div style={styles.grid}>
          {teams.map((team: Team) => (
            <div
              key={team._id}
              className="card"
              style={styles.teamCard}
              onClick={() => navigate(`/dashboard/projects/${team._id}`)}
            >
              <div style={styles.teamCardTop}>
                <div style={styles.teamAvatar}>
                  {team.name.slice(0, 2).toUpperCase()}
                </div>
                <ArrowRight size={16} style={{ color: "var(--text-muted)" }} />
              </div>
              <h3 style={styles.teamName}>{team.name}</h3>
              {team.description && (
                <p style={styles.teamDesc}>{team.description}</p>
              )}
              <div style={styles.teamFooter}>
                <span style={styles.teamBadge}>
                  <Users size={12} />
                  Team
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Team Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create New Team"
      >
        <form
          onSubmit={handleCreate}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div className="form-group">
            <label className="form-label">Team Name *</label>
            <input
              className="input"
              placeholder="e.g. Frontend Engineers"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="input"
              placeholder="What does this team work on?"
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              style={{ resize: "vertical" }}
            />
          </div>
          {formError && <p className="form-error">{formError}</p>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={creating}
            >
              {creating ? (
                <span className="spinner" />
              ) : (
                <>
                  <Plus size={15} /> Create Team
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  pageTitle: { fontSize: "1.5rem", fontWeight: 700, margin: 0 },
  pageSubtitle: {
    fontSize: "0.875rem",
    color: "var(--text-muted)",
    margin: "4px 0 0",
  },
  center: { display: "flex", justifyContent: "center", padding: "60px 0" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: 16,
    marginTop: 8,
  },
  teamCard: {
    cursor: "pointer",
    transition: "transform 0.15s, border-color 0.15s",
    userSelect: "none",
  },
  teamCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  teamAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: "rgba(99,102,241,0.2)",
    color: "var(--primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.95rem",
    fontWeight: 700,
  },
  teamName: { fontSize: "1rem", fontWeight: 600, margin: "0 0 6px" },
  teamDesc: {
    fontSize: "0.82rem",
    color: "var(--text-muted)",
    margin: "0 0 14px",
    lineHeight: 1.5,
  },
  teamFooter: { display: "flex", gap: 8, marginTop: "auto" },
  teamBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    background: "rgba(255,255,255,0.06)",
    padding: "3px 8px",
    borderRadius: 20,
  },
};

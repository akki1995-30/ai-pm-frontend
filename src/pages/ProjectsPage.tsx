import React, { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  Plus,
  FolderKanban,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { GET_PROJECTS, CREATE_PROJECT, GET_TEAM_MEMBERS } from "../lib/graphql";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";

interface Project {
  _id: string;
  name: string;
  description?: string;
  team: string;
}

export const ProjectsPage: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [formError, setFormError] = useState("");

  // Fetch team members to check current user's team role
  const { data: membersData } = useQuery(GET_TEAM_MEMBERS, {
    variables: { teamId },
    skip: !teamId,
  });
  const myTeamMembership = membersData?.teamMembers?.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (m: any) => m.user._id === user?.id,
  );
  const myTeamRole: string = myTeamMembership?.role ?? "";
  const canCreateProject = user?.role === "ADMIN" || myTeamRole === "MANAGER";

  const { data, loading, error, refetch } = useQuery(GET_PROJECTS, {
    variables: { teamId },
    skip: !teamId,
  });

  const [createProject, { loading: creating }] = useMutation(CREATE_PROJECT, {
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
    if (!form.name.trim()) return setFormError("Project name is required");
    createProject({
      variables: {
        input: { name: form.name, description: form.description, teamId },
      },
    });
  };

  const projects: Project[] = data?.projects || [];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 8 }}>
        <Link to="/dashboard/teams" style={styles.backLink}>
          <ArrowLeft size={14} /> Back to Teams
        </Link>
      </div>
      <div className="page-header">
        <div>
          <h1 style={styles.pageTitle}>Projects</h1>
          <p style={styles.pageSubtitle}>All projects in this team</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
          style={{ display: canCreateProject ? undefined : "none" }}
        >
          <Plus size={16} />
          New Project
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
            Failed to load projects: {error.message}
          </p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && projects.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <FolderKanban size={28} />
          </div>
          <p className="empty-state-title">No projects yet</p>
          <p className="empty-state-text">
            {canCreateProject
              ? "Create your first project to start organizing tasks"
              : "No projects in this team yet. Ask your manager to create one."}
          </p>
          {canCreateProject && (
            <button
              className="btn btn-primary"
              onClick={() => setShowModal(true)}
            >
              <Plus size={16} /> Create Project
            </button>
          )}
        </div>
      )}

      {/* Projects grid */}
      {projects.length > 0 && (
        <div style={styles.grid}>
          {projects.map((project: Project) => (
            <div
              key={project._id}
              className="card"
              style={styles.projectCard}
              onClick={() => navigate(`/dashboard/tasks/${project._id}`)}
            >
              <div style={styles.projectCardTop}>
                <div style={styles.projectIcon}>
                  <FolderKanban size={20} />
                </div>
                <ArrowRight size={16} style={{ color: "var(--text-muted)" }} />
              </div>
              <h3 style={styles.projectName}>{project.name}</h3>
              {project.description && (
                <p style={styles.projectDesc}>{project.description}</p>
              )}
              <div style={styles.projectFooter}>
                <span style={styles.projectBadge}>View Tasks →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create New Project"
      >
        <form
          onSubmit={handleCreate}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input
              className="input"
              placeholder="e.g. Website Redesign"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="input"
              placeholder="What is this project about?"
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
                  <Plus size={15} /> Create Project
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
  backLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    color: "var(--text-muted)",
    textDecoration: "none",
    fontSize: "0.85rem",
    fontWeight: 500,
    marginBottom: 12,
  },
  center: { display: "flex", justifyContent: "center", padding: "60px 0" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: 16,
    marginTop: 8,
  },
  projectCard: {
    cursor: "pointer",
    transition: "transform 0.15s, border-color 0.15s",
    userSelect: "none",
  },
  projectCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  projectIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: "rgba(99,102,241,0.2)",
    color: "var(--primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  projectName: { fontSize: "1rem", fontWeight: 600, margin: "0 0 6px" },
  projectDesc: {
    fontSize: "0.82rem",
    color: "var(--text-muted)",
    margin: "0 0 14px",
    lineHeight: 1.5,
  },
  projectFooter: { marginTop: "auto" },
  projectBadge: {
    fontSize: "0.78rem",
    color: "var(--primary)",
    fontWeight: 500,
  },
};

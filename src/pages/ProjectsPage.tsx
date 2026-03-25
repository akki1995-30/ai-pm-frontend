import React, { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  Plus,
  FolderKanban,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Users,
  UserPlus,
  Trash2,
  Crown,
} from "lucide-react";
import {
  GET_PROJECTS,
  CREATE_PROJECT,
  GET_TEAM_MEMBERS,
  GET_USERS,
  ADD_TEAM_MEMBER,
  REMOVE_TEAM_MEMBER,
} from "../lib/graphql";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";
import logger from "../lib/logger";

interface Project {
  _id: string;
  name: string;
  description?: string;
  team: string;
}

interface Member {
  _id: string;
  role: string;
  user: { _id: string; name: string; email: string };
}

interface AppUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

const TEAM_ROLES = ["MANAGER", "MEMBER", "VIEWER"];

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  MANAGER: { bg: "rgba(99,102,241,0.15)",  color: "#6366f1" },
  MEMBER:  { bg: "rgba(16,185,129,0.15)",  color: "#10b981" },
  VIEWER:  { bg: "rgba(107,114,128,0.15)", color: "#6b7280" },
};

export const ProjectsPage: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Project modal state
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectForm, setProjectForm] = useState({ name: "", description: "" });
  const [projectFormError, setProjectFormError] = useState("");

  // Members panel state
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberForm, setMemberForm] = useState({ userId: "", role: "MEMBER" });
  const [memberFormError, setMemberFormError] = useState("");

  logger.debug("ProjectsPage", `rendered — teamId: ${teamId}, user: ${user?.name}, role: ${user?.role}`);

  // Guard: if no teamId in URL, send back to teams list
  if (!teamId) {
    logger.warn("ProjectsPage", "no teamId in URL — redirecting to /dashboard/teams");
    navigate("/dashboard/teams", { replace: true });
    return null;
  }

  // ── Permissions ──────────────────────────────────────────────────────────
  const { data: membersData, refetch: refetchMembers } = useQuery(GET_TEAM_MEMBERS, {
    variables: { teamId },
    skip: !teamId,
    onCompleted: (d) => logger.debug("ProjectsPage", `GET_TEAM_MEMBERS — ${d?.teamMembers?.length ?? 0} member(s)`),
    onError: (e) => logger.error("ProjectsPage", `GET_TEAM_MEMBERS failed: ${e.message}`),
  });
  const members: Member[] = membersData?.teamMembers ?? [];
  const myTeamMembership = members.find((m) => m.user._id === user?.id);
  const myTeamRole: string = myTeamMembership?.role ?? "";
  const isAdmin = user?.role === "ADMIN";
  const isManager = isAdmin || myTeamRole === "MANAGER";
  const canCreateProject = isManager;
  const canManageMembers = isManager;

  // ── All users (for add-member dropdown) ──────────────────────────────────
  const { data: usersData } = useQuery(GET_USERS, {
    skip: !showAddMemberModal,
    onCompleted: (d) => logger.debug("ProjectsPage", `GET_USERS — ${d?.users?.length ?? 0} user(s)`),
    onError: (e) => logger.error("ProjectsPage", `GET_USERS failed: ${e.message}`),
  });
  const allUsers: AppUser[] = usersData?.users ?? [];
  // Filter out users already in the team
  const memberUserIds = new Set(members.map((m) => m.user._id));
  const availableUsers = allUsers.filter((u) => !memberUserIds.has(u._id));

  // ── Projects query ────────────────────────────────────────────────────────
  const { data, loading, error, refetch } = useQuery(GET_PROJECTS, {
    variables: { teamId },
    skip: !teamId,
    onCompleted: (d) => logger.info("ProjectsPage", `GET_PROJECTS — ${d?.projects?.length ?? 0} project(s) loaded`),
    onError: (e) => logger.error("ProjectsPage", `GET_PROJECTS failed: ${e.message}`),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const [createProject, { loading: creating }] = useMutation(CREATE_PROJECT, {
    onCompleted: (d) => {
      logger.info("ProjectsPage", `project created — id: ${d?.createProject?._id}, name: ${d?.createProject?.name}`);
      setShowProjectModal(false);
      setProjectForm({ name: "", description: "" });
      refetch();
    },
    onError: (err) => {
      logger.error("ProjectsPage", `CREATE_PROJECT failed: ${err.message}`);
      setProjectFormError(err.message);
    },
  });

  const [addTeamMember, { loading: addingMember }] = useMutation(ADD_TEAM_MEMBER, {
    onCompleted: (d) => {
      logger.info("ProjectsPage", `member added — userId: ${d?.addTeamMember?.user?._id}, role: ${d?.addTeamMember?.role}`);
      setShowAddMemberModal(false);
      setMemberForm({ userId: "", role: "MEMBER" });
      refetchMembers();
    },
    onError: (err) => {
      logger.error("ProjectsPage", `ADD_TEAM_MEMBER failed: ${err.message}`);
      setMemberFormError(err.message);
    },
  });

  const [removeTeamMember] = useMutation(REMOVE_TEAM_MEMBER, {
    onCompleted: () => {
      logger.info("ProjectsPage", "member removed");
      refetchMembers();
    },
    onError: (e) => logger.error("ProjectsPage", `REMOVE_TEAM_MEMBER failed: ${e.message}`),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    setProjectFormError("");
    logger.debug("ProjectsPage", `createProject submitted — name: ${projectForm.name}, teamId: ${teamId}`);
    if (!projectForm.name.trim()) {
      logger.warn("ProjectsPage", "createProject blocked — project name is empty");
      return setProjectFormError("Project name is required");
    }
    if (!teamId) return setProjectFormError("Team context is missing. Please go back and select a team.");
    createProject({ variables: { input: { name: projectForm.name, description: projectForm.description, teamId } } });
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    setMemberFormError("");
    logger.debug("ProjectsPage", `addMember submitted — userId: ${memberForm.userId}, role: ${memberForm.role}`);
    if (!memberForm.userId) return setMemberFormError("Please select a user");
    if (!teamId) return setMemberFormError("Team context is missing. Please go back and select a team.");
    addTeamMember({ variables: { teamId, userId: memberForm.userId, role: memberForm.role } });
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    if (!window.confirm(`Remove ${memberName} from this team?`)) return;
    logger.info("ProjectsPage", `removing member — userId: ${memberId}`);
    removeTeamMember({ variables: { teamId, userId: memberId } });
  };

  const handleProjectClick = (project: Project) => {
    logger.info("ProjectsPage", `navigating to tasks — projectId: ${project._id}, name: ${project.name}, teamId: ${teamId}`);
    navigate(`/dashboard/tasks/${teamId}/${project._id}`);
  };

  const projects: Project[] = data?.projects || [];

  return (
    <div>
      {/* Back link */}
      <div style={{ marginBottom: 8 }}>
        <Link to="/dashboard/teams" style={styles.backLink}>
          <ArrowLeft size={14} /> Back to Teams
        </Link>
      </div>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 style={styles.pageTitle}>Projects</h1>
          <p style={styles.pageSubtitle}>All projects in this team</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {canManageMembers && (
            <button
              className="btn btn-ghost"
              onClick={() => setShowMembersPanel((v) => !v)}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <Users size={16} />
              Members ({members.length})
            </button>
          )}
          {canCreateProject && (
            <button className="btn btn-primary" onClick={() => setShowProjectModal(true)}>
              <Plus size={16} />
              New Project
            </button>
          )}
        </div>
      </div>

      {/* ── Members Panel ──────────────────────────────────────────────── */}
      {showMembersPanel && (
        <div className="card" style={styles.membersPanel}>
          <div style={styles.membersPanelHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={18} color="var(--primary)" />
              <span style={styles.membersPanelTitle}>Team Members</span>
              <span style={styles.membersCount}>{members.length}</span>
            </div>
            {canManageMembers && (
              <button
                className="btn btn-primary"
                style={{ fontSize: "0.82rem", padding: "6px 14px" }}
                onClick={() => { setShowAddMemberModal(true); setMemberFormError(""); }}
              >
                <UserPlus size={14} /> Add Member
              </button>
            )}
          </div>

          {members.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "20px 0" }}>
              No members yet
            </p>
          ) : (
            <div style={styles.membersList}>
              {members.map((m) => {
                const rc = ROLE_COLORS[m.role] ?? ROLE_COLORS["VIEWER"];
                const isOwner = m.role === "MANAGER";
                return (
                  <div key={m._id} style={styles.memberRow}>
                    <div style={styles.memberAvatar}>
                      {m.user.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={styles.memberInfo}>
                      <p style={styles.memberName}>
                        {m.user.name}
                        {isOwner && <Crown size={12} style={{ marginLeft: 5, color: "#f59e0b" }} />}
                      </p>
                      <p style={styles.memberEmail}>{m.user.email}</p>
                    </div>
                    <span style={{ ...styles.roleBadge, background: rc.bg, color: rc.color }}>
                      {m.role}
                    </span>
                    {canManageMembers && m.user._id !== user?.id && (
                      <button
                        className="btn btn-ghost"
                        style={{ padding: "4px 8px", color: "var(--danger)" }}
                        onClick={() => handleRemoveMember(m.user._id, m.user.name)}
                        title="Remove member"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={styles.center}>
          <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--primary)" }} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card" style={{ borderColor: "var(--danger)", padding: 20 }}>
          <p style={{ color: "var(--danger)", margin: 0 }}>Failed to load projects: {error.message}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && projects.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon"><FolderKanban size={28} /></div>
          <p className="empty-state-title">No projects yet</p>
          <p className="empty-state-text">
            {canCreateProject
              ? "Create your first project to start organizing tasks"
              : "No projects in this team yet. Ask your manager to create one."}
          </p>
          {canCreateProject && (
            <button className="btn btn-primary" onClick={() => setShowProjectModal(true)}>
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
              onClick={() => handleProjectClick(project)}
            >
              <div style={styles.projectCardTop}>
                <div style={styles.projectIcon}><FolderKanban size={20} /></div>
                <ArrowRight size={16} style={{ color: "var(--text-muted)" }} />
              </div>
              <h3 style={styles.projectName}>{project.name}</h3>
              {project.description && <p style={styles.projectDesc}>{project.description}</p>}
              <div style={styles.projectFooter}>
                <span style={styles.projectBadge}>View Tasks →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create Project Modal ──────────────────────────────────────── */}
      <Modal isOpen={showProjectModal} onClose={() => setShowProjectModal(false)} title="Create New Project">
        <form onSubmit={handleCreateProject} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input
              className="input"
              placeholder="e.g. Website Redesign"
              value={projectForm.name}
              onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="input"
              placeholder="What is this project about?"
              rows={3}
              value={projectForm.description}
              onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
              style={{ resize: "vertical" }}
            />
          </div>
          {projectFormError && <p className="form-error">{projectFormError}</p>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-ghost" onClick={() => setShowProjectModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? <span className="spinner" /> : <><Plus size={15} /> Create Project</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Add Member Modal ──────────────────────────────────────────── */}
      <Modal isOpen={showAddMemberModal} onClose={() => setShowAddMemberModal(false)} title="Add Team Member">
        <form onSubmit={handleAddMember} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Select User *</label>
            <select
              className="input"
              value={memberForm.userId}
              onChange={(e) => setMemberForm({ ...memberForm, userId: e.target.value })}
            >
              <option value="">— Choose a user —</option>
              {availableUsers.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
            {availableUsers.length === 0 && (
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>
                All registered users are already in this team.
              </p>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Role *</label>
            <select
              className="input"
              value={memberForm.role}
              onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
            >
              {TEAM_ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          {memberFormError && <p className="form-error">{memberFormError}</p>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-ghost" onClick={() => setShowAddMemberModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={addingMember}>
              {addingMember ? <span className="spinner" /> : <><UserPlus size={15} /> Add Member</>}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  pageTitle: { fontSize: "1.5rem", fontWeight: 700, margin: 0 },
  pageSubtitle: { fontSize: "0.875rem", color: "var(--text-muted)", margin: "4px 0 0" },
  backLink: {
    display: "inline-flex", alignItems: "center", gap: 6,
    color: "var(--text-muted)", textDecoration: "none",
    fontSize: "0.85rem", fontWeight: 500, marginBottom: 12,
  },
  center: { display: "flex", justifyContent: "center", padding: "60px 0" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16, marginTop: 8 },
  projectCard: { cursor: "pointer", transition: "transform 0.15s, border-color 0.15s", userSelect: "none" },
  projectCardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  projectIcon: {
    width: 44, height: 44, borderRadius: 12,
    background: "rgba(99,102,241,0.2)", color: "var(--primary)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  projectName: { fontSize: "1rem", fontWeight: 600, margin: "0 0 6px" },
  projectDesc: { fontSize: "0.82rem", color: "var(--text-muted)", margin: "0 0 14px", lineHeight: 1.5 },
  projectFooter: { marginTop: "auto" },
  projectBadge: { fontSize: "0.78rem", color: "var(--primary)", fontWeight: 500 },

  // Members panel
  membersPanel: { marginBottom: 24, padding: 0, overflow: "hidden" },
  membersPanelHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "14px 18px", borderBottom: "1px solid var(--border)",
  },
  membersPanelTitle: { fontSize: "0.95rem", fontWeight: 700, color: "var(--text)" },
  membersCount: {
    fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)",
    background: "rgba(255,255,255,0.08)", padding: "2px 8px", borderRadius: 20,
  },
  membersList: { display: "flex", flexDirection: "column" },
  memberRow: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "12px 18px", borderBottom: "1px solid var(--border)",
    transition: "background 0.1s",
  },
  memberAvatar: {
    width: 36, height: 36, borderRadius: "50%",
    background: "rgba(99,102,241,0.2)", color: "var(--primary)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "0.75rem", fontWeight: 700, flexShrink: 0,
  },
  memberInfo: { flex: 1, overflow: "hidden" },
  memberName: {
    margin: 0, fontSize: "0.88rem", fontWeight: 600,
    color: "var(--text)", display: "flex", alignItems: "center",
  },
  memberEmail: { margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" },
  roleBadge: {
    padding: "3px 10px", borderRadius: 20,
    fontSize: "0.72rem", fontWeight: 700, whiteSpace: "nowrap" as const,
  },
};

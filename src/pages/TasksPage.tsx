import React, { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { useParams, Link } from "react-router-dom";
import {
  Plus,
  ArrowLeft,
  MoreVertical,
  Loader2,
  CheckCircle2,
  Clock,
  Circle,
  Trash2,
  UserCircle,
} from "lucide-react";
import {
  GET_TASKS,
  CREATE_TASK,
  UPDATE_TASK,
  DELETE_TASK,
  GET_PROJECT,
  GET_TEAM_MEMBERS,
} from "../lib/graphql";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";

type TaskStatus = "todo" | "in_progress" | "done";

interface Task {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assignedTo?: { _id: string; name: string; email: string } | null;
}

interface Member {
  _id: string;
  role: string;
  user: { _id: string; name: string; email: string };
}

const COLUMNS: {
  key: TaskStatus;
  label: string;
  icon: React.ReactNode;
  colorClass: string;
}[] = [
  {
    key: "todo",
    label: "To Do",
    icon: <Circle size={15} />,
    colorClass: "badge-todo",
  },
  {
    key: "in_progress",
    label: "In Progress",
    icon: <Clock size={15} />,
    colorClass: "badge-progress",
  },
  {
    key: "done",
    label: "Done",
    icon: <CheckCircle2 size={15} />,
    colorClass: "badge-done",
  },
];

const STATUS_NEXT: Record<TaskStatus, TaskStatus> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
};

export const TasksPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    assignedTo: "",
  });
  const [formError, setFormError] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Fetch project to get its teamId
  const { data: projectData } = useQuery(GET_PROJECT, {
    variables: { projectId },
    skip: !projectId,
  });
  const teamId = projectData?.project?.team;

  // Fetch team members for the "Assign To" dropdown + permission check
  const { data: membersData } = useQuery(GET_TEAM_MEMBERS, {
    variables: { teamId },
    skip: !teamId,
  });
  const members: Member[] = membersData?.teamMembers || [];

  // Determine what the current user can do in this team
  const myMembership = members.find((m) => m.user._id === user?.id);
  const myTeamRole: string = myMembership?.role ?? "";
  const isAdmin = user?.role === "ADMIN";
  const canCreateTask = isAdmin || myTeamRole === "MANAGER" || myTeamRole === "MEMBER";
  const canDeleteTask = isAdmin || myTeamRole === "MANAGER";

  const { data, loading, error, refetch } = useQuery(GET_TASKS, {
    variables: { projectId },
    skip: !projectId,
  });

  const [createTask, { loading: creating }] = useMutation(CREATE_TASK, {
    onCompleted: () => {
      setShowModal(false);
      setForm({ title: "", description: "", assignedTo: "" });
      refetch();
    },
    onError: (err) => setFormError(err.message),
  });

  const [updateTask] = useMutation(UPDATE_TASK, {
    onCompleted: () => refetch(),
  });

  const [deleteTask] = useMutation(DELETE_TASK, {
    onCompleted: () => refetch(),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!form.title.trim()) return setFormError("Task title is required");
    createTask({
      variables: {
        input: {
          title: form.title,
          description: form.description,
          projectId,
          ...(form.assignedTo ? { assignedTo: form.assignedTo } : {}),
        },
      },
    });
  };

  const handleStatusCycle = (task: Task) => {
    updateTask({
      variables: {
        taskId: task._id,
        input: { status: STATUS_NEXT[task.status] },
      },
    });
  };

  const handleDelete = (taskId: string) => {
    setOpenMenuId(null);
    deleteTask({ variables: { taskId } });
  };

  const tasks: Task[] = data?.tasks || [];
  const tasksByStatus = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status);

  return (
    <div style={{ height: "100%" }}>
      {/* Back link */}
      <div style={{ marginBottom: 8 }}>
        <Link to="/dashboard/projects" style={styles.backLink}>
          <ArrowLeft size={14} /> Back to Projects
        </Link>
      </div>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 style={styles.pageTitle}>Task Board</h1>
          <p style={styles.pageSubtitle}>
            Click a task status icon to cycle it forward
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
          style={{ display: canCreateTask ? undefined : "none" }}
        >
          <Plus size={16} />
          New Task
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
            Failed to load tasks: {error.message}
          </p>
        </div>
      )}

      {/* Kanban Board */}
      {!loading && !error && (
        <div style={styles.board}>
          {COLUMNS.map((col) => (
            <div key={col.key} style={styles.column}>
              {/* Column header */}
              <div style={styles.colHeader}>
                <span className={col.colorClass} style={styles.colBadge}>
                  {col.icon}
                  {col.label}
                </span>
                <span style={styles.colCount}>
                  {tasksByStatus(col.key).length}
                </span>
              </div>

              {/* Task cards */}
              <div style={styles.colBody}>
                {tasksByStatus(col.key).length === 0 && (
                  <div style={styles.colEmpty}>
                    <p>No tasks here</p>
                  </div>
                )}

                {tasksByStatus(col.key).map((task) => (
                  <div key={task._id} style={styles.taskCard} className="card">
                    {/* Task top row */}
                    <div style={styles.taskTop}>
                      <button
                        style={styles.statusBtn}
                        onClick={() => handleStatusCycle(task)}
                        title="Click to advance status"
                      >
                        {col.icon}
                      </button>
                      <div style={{ position: "relative" }}>
                        <button
                          style={styles.menuBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(
                              openMenuId === task._id ? null : task._id,
                            );
                          }}
                        >
                          <MoreVertical size={15} />
                        </button>
                        {openMenuId === task._id && (
                          <div
                            style={styles.menu}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {canDeleteTask && (
                              <button
                                style={styles.menuItem}
                                onClick={() => handleDelete(task._id)}
                              >
                                <Trash2 size={13} />
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Title */}
                    <p
                      style={{
                        ...styles.taskTitle,
                        ...(task.status === "done" ? styles.taskTitleDone : {}),
                      }}
                      onClick={() => handleStatusCycle(task)}
                    >
                      {task.title}
                    </p>

                    {/* Description */}
                    {task.description && (
                      <p style={styles.taskDesc}>{task.description}</p>
                    )}

                    {/* Assignee */}
                    {task.assignedTo ? (
                      <div style={styles.taskAssignee}>
                        <div style={styles.assigneeAvatar}>
                          {task.assignedTo.name.slice(0, 1).toUpperCase()}
                        </div>
                        <span style={styles.assigneeName}>
                          {task.assignedTo.name}
                        </span>
                      </div>
                    ) : (
                      <div style={styles.taskAssignee}>
                        <UserCircle
                          size={16}
                          style={{ color: "var(--text-muted)", opacity: 0.4 }}
                        />
                        <span style={{ ...styles.assigneeName, opacity: 0.4 }}>
                          Unassigned
                        </span>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add task quick button — MANAGER and MEMBER only */}
                {col.key === "todo" && canCreateTask && (
                  <button
                    style={styles.addTaskBtn}
                    onClick={() => setShowModal(true)}
                  >
                    <Plus size={14} />
                    Add task
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create New Task"
      >
        <form
          onSubmit={handleCreate}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div className="form-group">
            <label className="form-label">Task Title *</label>
            <input
              className="input"
              placeholder="e.g. Design login page"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="input"
              placeholder="Add details about this task..."
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              style={{ resize: "vertical" }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Assign To</label>
            <select
              className="input"
              value={form.assignedTo}
              onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
            >
              <option value="">â€” Unassigned â€”</option>
              {members.map((m) => (
                <option key={m.user._id} value={m.user._id}>
                  {m.user.name} ({m.role})
                </option>
              ))}
            </select>
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
                  <Plus size={15} /> Create Task
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
  board: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
    alignItems: "start",
  },
  column: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    overflow: "hidden",
  },
  colHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 14px",
    borderBottom: "1px solid var(--border)",
  },
  colBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: "0.8rem",
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: 20,
  },
  colCount: {
    fontSize: "0.78rem",
    fontWeight: 600,
    color: "var(--text-muted)",
    background: "rgba(255,255,255,0.08)",
    padding: "2px 8px",
    borderRadius: 20,
  },
  colBody: {
    padding: "10px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minHeight: 80,
  },
  colEmpty: {
    textAlign: "center",
    padding: "24px 0",
    color: "var(--text-muted)",
    fontSize: "0.82rem",
  },
  taskCard: { padding: "12px 14px", cursor: "default" },
  taskTop: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statusBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
    color: "var(--text-muted)",
    transition: "color 0.15s",
  },
  menuBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 2,
    color: "var(--text-muted)",
    display: "flex",
    alignItems: "center",
    borderRadius: 4,
  },
  menu: {
    position: "absolute",
    right: 0,
    top: "calc(100% + 4px)",
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    boxShadow: "var(--shadow)",
    zIndex: 10,
    minWidth: 130,
    padding: 4,
  },
  menuItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "7px 12px",
    borderRadius: 6,
    fontSize: "0.85rem",
    cursor: "pointer",
    color: "var(--danger)",
    background: "none",
    border: "none",
    width: "100%",
  },
  taskTitle: {
    margin: "0 0 6px",
    fontSize: "0.9rem",
    fontWeight: 600,
    cursor: "pointer",
    lineHeight: 1.4,
  },
  taskTitleDone: { textDecoration: "line-through", opacity: 0.5 },
  taskDesc: {
    margin: "0 0 10px",
    fontSize: "0.8rem",
    color: "var(--text-muted)",
    lineHeight: 1.5,
  },
  taskAssignee: { display: "flex", alignItems: "center", gap: 6, marginTop: 8 },
  assigneeAvatar: {
    width: 22,
    height: 22,
    borderRadius: "50%",
    background: "rgba(99,102,241,0.3)",
    color: "var(--primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.7rem",
    fontWeight: 700,
  },
  assigneeName: { fontSize: "0.78rem", color: "var(--text-muted)" },
  addTaskBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 10px",
    background: "none",
    border: "1px dashed var(--border)",
    borderRadius: 8,
    color: "var(--text-muted)",
    fontSize: "0.82rem",
    cursor: "pointer",
    width: "100%",
    transition: "border-color 0.15s, color 0.15s",
  },
};

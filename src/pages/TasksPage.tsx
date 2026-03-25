import React, { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { useParams, Link } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  GET_TASKS,
  CREATE_TASK,
  UPDATE_TASK,
  DELETE_TASK,
  GET_TEAM_MEMBERS,
} from "../lib/graphql";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";
import logger from "../lib/logger";

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

const COLUMNS: { key: TaskStatus; label: string; icon: React.ReactNode; colorClass: string }[] = [
  { key: "todo",        label: "To Do",       icon: <Circle size={15} />,       colorClass: "badge-todo"     },
  { key: "in_progress", label: "In Progress", icon: <Clock size={15} />,        colorClass: "badge-progress" },
  { key: "done",        label: "Done",        icon: <CheckCircle2 size={15} />, colorClass: "badge-done"     },
];

const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "done"];

const STATUS_NEXT: Record<TaskStatus, TaskStatus> = {
  todo:        "in_progress",
  in_progress: "done",
  done:        "todo",
};

const STATUS_PREV: Record<TaskStatus, TaskStatus> = {
  todo:        "done",
  in_progress: "todo",
  done:        "in_progress",
};

// ─── Droppable Column ────────────────────────────────────────────────────────
const DroppableColumn: React.FC<{ id: TaskStatus; isOver: boolean; children: React.ReactNode }> = ({
  id, isOver, children,
}) => {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        ...styles.colBody,
        background: isOver ? "rgba(99,102,241,0.07)" : undefined,
        borderRadius: 8,
        transition: "background 0.15s",
        outline: isOver ? "2px dashed rgba(99,102,241,0.4)" : "2px dashed transparent",
        outlineOffset: -2,
      }}
    >
      {children}
    </div>
  );
};

// ─── Draggable Task Card ─────────────────────────────────────────────────────
const DraggableTaskCard: React.FC<{
  task: Task;
  colIcon: React.ReactNode;
  canDeleteTask: boolean;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  onMoveForward: (task: Task) => void;
  onMoveBackward: (task: Task) => void;
  onDelete: (id: string) => void;
  isDragOverlay?: boolean;
}> = ({
  task, colIcon, canDeleteTask,
  openMenuId, setOpenMenuId,
  onMoveForward, onMoveBackward, onDelete,
  isDragOverlay = false,
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task._id });

  const currentIdx = STATUS_ORDER.indexOf(task.status);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < STATUS_ORDER.length - 1;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...styles.taskCard,
        opacity: isDragging && !isDragOverlay ? 0.35 : 1,
        boxShadow: isDragOverlay ? "0 8px 32px rgba(0,0,0,0.45)" : undefined,
        cursor: isDragOverlay ? "grabbing" : "grab",
        transform: isDragOverlay ? "rotate(2deg) scale(1.03)" : undefined,
        transition: isDragging ? "none" : "opacity 0.15s",
        userSelect: "none",
      }}
      className="card"
    >
      {/* Drag handle row */}
      <div style={styles.taskTop}>
        {/* Drag grip area */}
        <div
          {...listeners}
          {...attributes}
          style={styles.dragHandle}
          title="Drag to move"
        >
          <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" opacity={0.35}>
            <circle cx="3" cy="3"  r="1.5"/><circle cx="9" cy="3"  r="1.5"/>
            <circle cx="3" cy="8"  r="1.5"/><circle cx="9" cy="8"  r="1.5"/>
            <circle cx="3" cy="13" r="1.5"/><circle cx="9" cy="13" r="1.5"/>
          </svg>
        </div>

        {/* Status nav — prev / icon / next */}
        <div style={styles.statusNav}>
          <button
            style={{ ...styles.statusNavBtn, opacity: hasPrev ? 1 : 0.2 }}
            onClick={() => hasPrev && onMoveBackward(task)}
            title={hasPrev ? `Move back to ${STATUS_PREV[task.status]}` : "Already at first status"}
            disabled={!hasPrev}
          >
            <ChevronLeft size={13} />
          </button>
          <span style={styles.statusIcon}>{colIcon}</span>
          <button
            style={{ ...styles.statusNavBtn, opacity: hasNext ? 1 : 0.2 }}
            onClick={() => hasNext && onMoveForward(task)}
            title={hasNext ? `Move forward to ${STATUS_NEXT[task.status]}` : "Already at last status"}
            disabled={!hasNext}
          >
            <ChevronRight size={13} />
          </button>
        </div>

        {/* Context menu */}
        <div style={{ position: "relative" }}>
          <button
            style={styles.menuBtn}
            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === task._id ? null : task._id); }}
          >
            <MoreVertical size={15} />
          </button>
          {openMenuId === task._id && (
            <div style={styles.menu} onClick={(e) => e.stopPropagation()}>
              {canDeleteTask && (
                <button style={styles.menuItem} onClick={() => onDelete(task._id)}>
                  <Trash2 size={13} /> Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <p style={{ ...styles.taskTitle, ...(task.status === "done" ? styles.taskTitleDone : {}) }}>
        {task.title}
      </p>

      {/* Description */}
      {task.description && <p style={styles.taskDesc}>{task.description}</p>}

      {/* Assignee */}
      {task.assignedTo ? (
        <div style={styles.taskAssignee}>
          <div style={styles.assigneeAvatar}>{task.assignedTo.name.slice(0, 1).toUpperCase()}</div>
          <span style={styles.assigneeName}>{task.assignedTo.name}</span>
        </div>
      ) : (
        <div style={styles.taskAssignee}>
          <UserCircle size={16} style={{ color: "var(--text-muted)", opacity: 0.4 }} />
          <span style={{ ...styles.assigneeName, opacity: 0.4 }}>Unassigned</span>
        </div>
      )}
    </div>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────
export const TasksPage: React.FC = () => {
  const { projectId, teamId } = useParams<{ projectId: string; teamId: string }>();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", assignedTo: "" });
  const [formError, setFormError] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);

  // Optimistic tasks state for instant UI updates during drag
  const [optimisticTasks, setOptimisticTasks] = useState<Task[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: membersData } = useQuery(GET_TEAM_MEMBERS, {
    variables: { teamId },
    skip: !teamId,
    onCompleted: (d) => logger.debug("TasksPage", `GET_TEAM_MEMBERS — ${d?.teamMembers?.length ?? 0} member(s)`),
    onError: (e) => logger.error("TasksPage", `GET_TEAM_MEMBERS failed: ${e.message}`),
  });
  const members: Member[] = membersData?.teamMembers || [];

  const myMembership = members.find((m) => m.user._id === user?.id);
  const myTeamRole: string = myMembership?.role ?? "";
  const isAdmin = user?.role === "ADMIN";
  const canCreateTask = isAdmin || myTeamRole === "MANAGER" || myTeamRole === "MEMBER";
  const canDeleteTask = isAdmin || myTeamRole === "MANAGER";

  const { data, loading, error, refetch } = useQuery(GET_TASKS, {
    variables: { projectId },
    skip: !projectId,
    onCompleted: (d) => {
      logger.info("TasksPage", `GET_TASKS — ${d?.tasks?.length ?? 0} task(s) loaded`);
      setOptimisticTasks(null); // clear optimistic state on fresh fetch
    },
    onError: (e) => logger.error("TasksPage", `GET_TASKS failed: ${e.message}`),
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const [createTask, { loading: creating }] = useMutation(CREATE_TASK, {
    onCompleted: (d) => {
      logger.info("TasksPage", `task created — id: ${d?.createTask?._id}`);
      setShowModal(false);
      setForm({ title: "", description: "", assignedTo: "" });
      refetch();
    },
    onError: (err) => { logger.error("TasksPage", `CREATE_TASK failed: ${err.message}`); setFormError(err.message); },
  });

  const [updateTask] = useMutation(UPDATE_TASK, {
    onCompleted: (d) => {
      logger.info("TasksPage", `task updated — id: ${d?.updateTask?._id}, status: ${d?.updateTask?.status}`);
      refetch();
    },
    onError: (e) => {
      logger.error("TasksPage", `UPDATE_TASK failed: ${e.message}`);
      setOptimisticTasks(null); // revert optimistic on error
      refetch();
    },
  });

  const [deleteTask] = useMutation(DELETE_TASK, {
    onCompleted: () => { logger.info("TasksPage", "task deleted"); refetch(); },
    onError: (e) => logger.error("TasksPage", `DELETE_TASK failed: ${e.message}`),
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
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

  const handleStatusChange = (task: Task, newStatus: TaskStatus) => {
    if (task.status === newStatus) return;
    logger.debug("TasksPage", `status change — taskId: ${task._id}, ${task.status} → ${newStatus}`);
    // Optimistic update
    const base = optimisticTasks ?? (data?.tasks || []);
    setOptimisticTasks(base.map((t: Task) => t._id === task._id ? { ...t, status: newStatus } : t));
    updateTask({ variables: { taskId: task._id, input: { status: newStatus } } });
  };

  const handleDelete = (taskId: string) => {
    logger.info("TasksPage", `deleting task — taskId: ${taskId}`);
    setOpenMenuId(null);
    deleteTask({ variables: { taskId } });
  };

  // ── DnD handlers ──────────────────────────────────────────────────────────
  const handleDragStart = (event: DragStartEvent) => {
    const task = (optimisticTasks ?? (data?.tasks || [])).find((t: Task) => t._id === event.active.id);
    if (task) { setActiveTask(task); logger.debug("TasksPage", `drag start — taskId: ${task._id}`); }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragOver = (event: any) => {
    const overId = event.over?.id as TaskStatus | undefined;
    setOverColumn(STATUS_ORDER.includes(overId as TaskStatus) ? overId as TaskStatus : null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    setOverColumn(null);
    const { active, over } = event;
    if (!over) return;
    const targetStatus = over.id as TaskStatus;
    if (!STATUS_ORDER.includes(targetStatus)) return;
    const task = (optimisticTasks ?? (data?.tasks || [])).find((t: Task) => t._id === active.id);
    if (!task) return;
    if (task.status !== targetStatus) {
      logger.info("TasksPage", `drag-drop — taskId: ${task._id}, ${task.status} → ${targetStatus}`);
      handleStatusChange(task, targetStatus);
    }
  };

  const tasks: Task[] = optimisticTasks ?? data?.tasks ?? [];
  const tasksByStatus = (status: TaskStatus) => tasks.filter((t: Task) => t.status === status);

  const activeColDef = activeTask ? COLUMNS.find((c) => c.key === activeTask.status) : null;

  return (
    <div style={{ height: "100%" }} onClick={() => setOpenMenuId(null)}>
      {/* Back link */}
      <div style={{ marginBottom: 8 }}>
        <Link to={teamId ? `/dashboard/projects/${teamId}` : "/dashboard/projects"} style={styles.backLink}>
          <ArrowLeft size={14} /> Back to Projects
        </Link>
      </div>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 style={styles.pageTitle}>Task Board</h1>
          <p style={styles.pageSubtitle}>Drag tasks between columns or use ‹ › arrows to change status</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
          style={{ display: canCreateTask ? undefined : "none" }}
        >
          <Plus size={16} /> New Task
        </button>
      </div>

      {loading && (
        <div style={styles.center}>
          <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--primary)" }} />
        </div>
      )}
      {error && (
        <div className="card" style={{ borderColor: "var(--danger)", padding: 20 }}>
          <p style={{ color: "var(--danger)", margin: 0 }}>Failed to load tasks: {error.message}</p>
        </div>
      )}

      {/* ── Kanban Board with DnD ─────────────────────────────────────── */}
      {!loading && !error && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div style={styles.board}>
            {COLUMNS.map((col) => (
              <div key={col.key} style={styles.column}>
                {/* Column header */}
                <div style={styles.colHeader}>
                  <span className={col.colorClass} style={styles.colBadge}>
                    {col.icon}{col.label}
                  </span>
                  <span style={styles.colCount}>{tasksByStatus(col.key).length}</span>
                </div>

                <DroppableColumn id={col.key} isOver={overColumn === col.key}>
                  {tasksByStatus(col.key).length === 0 && (
                    <div style={styles.colEmpty}><p>Drop tasks here</p></div>
                  )}
                  {tasksByStatus(col.key).map((task: Task) => (
                    <DraggableTaskCard
                      key={task._id}
                      task={task}
                      colIcon={col.icon}
                      canDeleteTask={canDeleteTask}
                      openMenuId={openMenuId}
                      setOpenMenuId={setOpenMenuId}
                      onMoveForward={(t) => handleStatusChange(t, STATUS_NEXT[t.status])}
                      onMoveBackward={(t) => handleStatusChange(t, STATUS_PREV[t.status])}
                      onDelete={handleDelete}
                    />
                  ))}

                  {col.key === "todo" && canCreateTask && (
                    <button style={styles.addTaskBtn} onClick={(e) => { e.stopPropagation(); setShowModal(true); }}>
                      <Plus size={14} /> Add task
                    </button>
                  )}
                </DroppableColumn>
              </div>
            ))}
          </div>

          {/* Drag overlay — the floating card while dragging */}
          <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.18,0.67,0.6,1.22)" }}>
            {activeTask && activeColDef && (
              <DraggableTaskCard
                task={activeTask}
                colIcon={activeColDef.icon}
                canDeleteTask={false}
                openMenuId={null}
                setOpenMenuId={() => {}}
                onMoveForward={() => {}}
                onMoveBackward={() => {}}
                onDelete={() => {}}
                isDragOverlay
              />
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Create Task Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create New Task">
        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
              onChange={(e) => setForm({ ...form, description: e.target.value })}
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
              <option value="">— Unassigned —</option>
              {members.map((m) => (
                <option key={m.user._id} value={m.user._id}>
                  {m.user.name} ({m.role})
                </option>
              ))}
            </select>
          </div>
          {formError && <p className="form-error">{formError}</p>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? <span className="spinner" /> : <><Plus size={15} /> Create Task</>}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  pageTitle:    { fontSize: "1.5rem", fontWeight: 700, margin: 0 },
  pageSubtitle: { fontSize: "0.875rem", color: "var(--text-muted)", margin: "4px 0 0" },
  backLink: {
    display: "inline-flex", alignItems: "center", gap: 6,
    color: "var(--text-muted)", textDecoration: "none",
    fontSize: "0.85rem", fontWeight: 500, marginBottom: 12,
  },
  center: { display: "flex", justifyContent: "center", padding: "60px 0" },
  board:  { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, alignItems: "start" },
  column: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    overflow: "hidden",
  },
  colHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 14px", borderBottom: "1px solid var(--border)",
  },
  colBadge: {
    display: "inline-flex", alignItems: "center", gap: 6,
    fontSize: "0.8rem", fontWeight: 600, padding: "4px 10px", borderRadius: 20,
  },
  colCount: {
    fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)",
    background: "rgba(255,255,255,0.08)", padding: "2px 8px", borderRadius: 20,
  },
  colBody: { padding: "10px", display: "flex", flexDirection: "column", gap: 8, minHeight: 80 },
  colEmpty: { textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: "0.82rem" },
  taskCard: { padding: "12px 14px" },
  taskTop:  { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  dragHandle: {
    cursor: "grab", padding: "2px 4px", color: "var(--text-muted)",
    display: "flex", alignItems: "center", borderRadius: 4,
    transition: "color 0.15s",
  },
  statusNav: { display: "flex", alignItems: "center", gap: 2, flex: 1, justifyContent: "center" },
  statusNavBtn: {
    background: "none", border: "none", cursor: "pointer", padding: "2px 4px",
    color: "var(--text-muted)", display: "flex", alignItems: "center",
    borderRadius: 4, transition: "color 0.15s",
  },
  statusIcon: { display: "flex", alignItems: "center", color: "var(--text-muted)", margin: "0 2px" },
  menuBtn: {
    background: "none", border: "none", cursor: "pointer", padding: 2,
    color: "var(--text-muted)", display: "flex", alignItems: "center", borderRadius: 4,
  },
  menu: {
    position: "absolute", right: 0, top: "calc(100% + 4px)",
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: 8, boxShadow: "var(--shadow)", zIndex: 10, minWidth: 130, padding: 4,
  },
  menuItem: {
    display: "flex", alignItems: "center", gap: 8, padding: "7px 12px",
    borderRadius: 6, fontSize: "0.85rem", cursor: "pointer",
    color: "var(--danger)", background: "none", border: "none", width: "100%",
  },
  taskTitle:     { margin: "0 0 6px", fontSize: "0.9rem", fontWeight: 600, lineHeight: 1.4 },
  taskTitleDone: { textDecoration: "line-through", opacity: 0.5 },
  taskDesc:      { margin: "0 0 10px", fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.5 },
  taskAssignee:  { display: "flex", alignItems: "center", gap: 6, marginTop: 8 },
  assigneeAvatar: {
    width: 22, height: 22, borderRadius: "50%",
    background: "rgba(99,102,241,0.3)", color: "var(--primary)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "0.7rem", fontWeight: 700,
  },
  assigneeName: { fontSize: "0.78rem", color: "var(--text-muted)" },
  addTaskBtn: {
    display: "flex", alignItems: "center", gap: 6, padding: "8px 10px",
    background: "none", border: "1px dashed var(--border)", borderRadius: 8,
    color: "var(--text-muted)", fontSize: "0.82rem", cursor: "pointer",
    width: "100%", transition: "border-color 0.15s, color 0.15s",
  },
};


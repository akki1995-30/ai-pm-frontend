import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { TeamsPage } from "./pages/TeamsPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { TasksPage } from "./pages/TasksPage";
import { AdminPage } from "./pages/AdminPage";

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Public route — redirect authenticated users away from login/register
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard/teams" replace /> : <>{children}</>;
};

// Admin-only route — redirects non-admins to teams
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== "ADMIN") return <Navigate to="/dashboard/teams" replace />;
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/dashboard/teams" replace />} />

        {/* Auth routes */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* Dashboard routes */}
        <Route
          path="/dashboard"
          element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}
        >
          <Route index element={<Navigate to="teams" replace />} />
          <Route path="teams" element={<TeamsPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:teamId" element={<ProjectsPage />} />
          <Route path="tasks/:projectId" element={<TasksPage />} />
          <Route
            path="admin"
            element={<AdminRoute><AdminPage /></AdminRoute>}
          />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard/teams" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;

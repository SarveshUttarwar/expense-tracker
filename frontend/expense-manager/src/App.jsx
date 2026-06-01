import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import Dashboard from "./pages/Dashboard";
import Expenses from "./pages/Expenses";
import Categories from "./pages/Categories";
import Goals from "./pages/Goals";
import GoalAnalytics from "./pages/GoalAnalytics";
import Profile from "./pages/Profile";

function ProtectedRoute({ children }) {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || !user.id) {
    return <Navigate to="/" />;
  }
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
          <Route path="/" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute>
                <Expenses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/categories"
            element={
              <ProtectedRoute>
                <Categories />
              </ProtectedRoute>
            }
          />
          <Route
            path="/goals"
            element={
              <ProtectedRoute>
                <Goals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/goal-analytics"
            element={
              <ProtectedRoute>
                <GoalAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </NotificationProvider>
  </ThemeProvider>
  );
}

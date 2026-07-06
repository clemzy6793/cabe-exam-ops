import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Timetable from './pages/Timetable';
import StaffManagement from './pages/StaffManagement';
import Assignments from './pages/Assignments';
import ITReport from './pages/ITReport';
import Reports from './pages/Reports';
import StaffLookup from './pages/StaffLookup';
import PublicTimetable from './pages/PublicTimetable';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('exam_ops_token');
  return token ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const role = localStorage.getItem('exam_ops_role');
  return role === 'admin' || role === 'superadmin' ? children : <Navigate to="/" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/lookup" element={<StaffLookup />} />
      <Route path="/public/timetable" element={<PublicTimetable />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="timetable" element={<Timetable />} />
        <Route path="staff" element={<AdminRoute><StaffManagement /></AdminRoute>} />
        <Route path="assignments" element={<AdminRoute><Assignments /></AdminRoute>} />
        <Route path="it-report" element={<AdminRoute><ITReport /></AdminRoute>} />
        <Route path="reports" element={<AdminRoute><Reports /></AdminRoute>} />
      </Route>
    </Routes>
  );
}

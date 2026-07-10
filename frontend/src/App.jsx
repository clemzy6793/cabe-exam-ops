import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Timetable from './pages/Timetable';
import StaffManagement from './pages/StaffManagement';
import Assignments from './pages/Assignments';
import ITReport from './pages/ITReport';
import Reports from './pages/Reports';
import Venues from './pages/Venues';
import TimetableUpload from './pages/TimetableUpload';
import StaffLookup from './pages/StaffLookup';
import PublicTimetable from './pages/PublicTimetable';
import SessionReport from './pages/SessionReport';
import ExaminerDashboard from './pages/ExaminerDashboard';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('exam_ops_token');
  return token ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const role = localStorage.getItem('exam_ops_role');
  return role === 'admin' || role === 'superadmin' ? children : <Navigate to="/" />;
}

function EditorRoute({ children }) {
  const role = localStorage.getItem('exam_ops_role');
  return ['admin', 'superadmin', 'reviewer'].includes(role) ? children : <Navigate to="/" />;
}

function RoleHome() {
  const role = localStorage.getItem('exam_ops_role');
  if (role === 'examiner') return <ExaminerDashboard />;
  return <Dashboard />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/lookup" element={<StaffLookup />} />
      <Route path="/public/timetable" element={<PublicTimetable />} />
      <Route path="/public/session-report" element={<SessionReport />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<RoleHome />} />
        <Route path="timetable" element={<Timetable />} />
        <Route path="staff" element={<EditorRoute><StaffManagement /></EditorRoute>} />
        <Route path="assignments" element={<EditorRoute><Assignments /></EditorRoute>} />
        <Route path="it-report" element={<EditorRoute><ITReport /></EditorRoute>} />
        <Route path="reports" element={<Reports />} />
        <Route path="venues" element={<AdminRoute><Venues /></AdminRoute>} />
        <Route path="upload-timetable" element={<TimetableUpload />} />
        <Route path="my-exams" element={<ExaminerDashboard />} />
      </Route>
    </Routes>
  );
}

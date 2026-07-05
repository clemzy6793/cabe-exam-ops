import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Timetable from './pages/Timetable';
import StaffManagement from './pages/StaffManagement';
import Assignments from './pages/Assignments';
import StaffLookup from './pages/StaffLookup';
import PublicTimetable from './pages/PublicTimetable';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('exam_ops_token');
  return token ? children : <Navigate to="/login" />;
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
        <Route path="staff" element={<StaffManagement />} />
        <Route path="assignments" element={<Assignments />} />
      </Route>
    </Routes>
  );
}

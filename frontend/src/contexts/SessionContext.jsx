import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [years, setYears] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState(() => {
    const saved = localStorage.getItem('exam_ops_session_id');
    return saved ? parseInt(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('exam_ops_token');
  const role = localStorage.getItem('exam_ops_role');
  const isAdmin = role === 'admin' || role === 'superadmin';

  const loadData = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const [yRes, sRes, aRes] = await Promise.all([
        api.get('/sessions/years'),
        api.get('/sessions'),
        api.get('/sessions/active'),
      ]);
      setYears(yRes.data);

      const allSessions = sRes.data;
      const visibleSessions = isAdmin ? allSessions : allSessions.filter(s => s.published);
      setSessions(visibleSessions);
      setActiveSession(aRes.data);

      const storedSession = allSessions.find(s => s.id === selectedSessionId);
      const storedIsClosed = storedSession?.status === 'closed' || storedSession?.status === 'archived';

      if (!selectedSessionId || storedIsClosed) {
        // Auto-select the active session when nothing is stored or stored session is closed
        if (aRes.data) {
          setSelectedSessionId(aRes.data.id);
          localStorage.setItem('exam_ops_session_id', aRes.data.id);
        } else {
          setSelectedSessionId(null);
          localStorage.removeItem('exam_ops_session_id');
        }
      } else if (!isAdmin) {
        const still = visibleSessions.find(s => s.id === selectedSessionId);
        if (!still && aRes.data) {
          setSelectedSessionId(aRes.data.id);
          localStorage.setItem('exam_ops_session_id', aRes.data.id);
        } else if (!still && !aRes.data) {
          setSelectedSessionId(null);
          localStorage.removeItem('exam_ops_session_id');
        }
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const selectSession = (id) => {
    setSelectedSessionId(id);
    if (id) localStorage.setItem('exam_ops_session_id', id);
    else localStorage.removeItem('exam_ops_session_id');
  };

  const currentSession = sessions.find(s => s.id === selectedSessionId) || activeSession;

  return (
    <SessionContext.Provider value={{
      years, sessions, activeSession, currentSession,
      selectedSessionId, selectSession, loading, refresh: loadData,
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}

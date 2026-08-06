import { useState, useEffect } from 'react';
import api from '../api';
import { useSession } from '../contexts/SessionContext';

const ICONS = {
  warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z',
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  error: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
};

const COLORS = {
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info: 'bg-blue-50 border-blue-200 text-blue-700',
  error: 'bg-red-50 border-red-200 text-red-700',
};

const ICON_COLORS = {
  warning: 'text-amber-500',
  info: 'text-blue-400',
  error: 'text-red-500',
};

export default function NotificationsBanner() {
  const { currentSession } = useSession();
  const [alerts, setAlerts] = useState([]);
  const [dismissed, setDismissed] = useState(new Set());

  useEffect(() => {
    if (!currentSession?.id) { setAlerts([]); return; }
    const load = () => {
      api.get('/notifications/alerts', { params: { session_id: currentSession.id } })
        .then(r => setAlerts(r.data))
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [currentSession?.id]);

  const visible = alerts.filter(a => !dismissed.has(a.key));
  if (!visible.length) return null;

  return (
    <div className="space-y-2 mb-4">
      {visible.map(a => (
        <div key={a.key} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm ${COLORS[a.type] || COLORS.info}`}>
          <svg className={`w-4 h-4 flex-shrink-0 ${ICON_COLORS[a.type] || ICON_COLORS.info}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ICONS[a.type] || ICONS.info} />
          </svg>
          <span className="flex-1 font-medium text-xs">{a.message}</span>
          <button onClick={() => setDismissed(s => new Set([...s, a.key]))}
            className="text-current opacity-40 hover:opacity-70 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

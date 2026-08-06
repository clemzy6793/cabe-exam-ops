import { useState, useEffect } from 'react';
import api from '../api';

const ACTION_COLORS = {
  session_activate: 'bg-green-100 text-green-700',
  session_close: 'bg-amber-100 text-amber-700',
  session_archive: 'bg-gray-100 text-gray-600',
  session_reactivate: 'bg-blue-100 text-blue-700',
  assignments_locked: 'bg-red-100 text-red-600',
  assignments_unlocked: 'bg-emerald-100 text-emerald-700',
};

export default function AuditLog() {
  const [data, setData] = useState({ logs: [], total: 0, actions: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(0);
  const limit = 50;

  const load = () => {
    setLoading(true);
    const params = { limit, offset: page * limit };
    if (search) params.search = search;
    if (actionFilter) params.action = actionFilter;
    api.get('/audit', { params })
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, actionFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    load();
  };

  const totalPages = Math.ceil(data.total / limit);

  const formatDate = (d) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ' ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-1">Activity history — {data.total} total entries</p>
      </div>

      <div className="card">
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3 mb-4">
          <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(0); }}
            className="border rounded-lg px-3 py-2 text-sm">
            <option value="">All Actions</option>
            {data.actions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search details, action, or admin..."
            className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]" />
          <button type="submit" className="btn-brand text-sm px-4 py-2">Search</button>
        </form>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand/30 border-t-brand rounded-full animate-spin" />
          </div>
        ) : data.logs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No audit entries found</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs text-gray-500">Time</th>
                    <th className="text-left py-2 px-3 text-xs text-gray-500">Admin</th>
                    <th className="text-left py-2 px-3 text-xs text-gray-500">Action</th>
                    <th className="text-left py-2 px-3 text-xs text-gray-500">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.logs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="py-2 px-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(log.created_at)}</td>
                      <td className="py-2 px-3 text-sm font-medium text-gray-700">{log.admin_name || '-'}</td>
                      <td className="py-2 px-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-600 max-w-sm truncate">{log.details || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 disabled:opacity-40">Previous</button>
                <span className="text-xs text-gray-400">Page {page + 1} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                  className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 disabled:opacity-40">Next</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import api from '../api';

const DAYS = [
  { key: 'monday', label: 'Mon', date: '6th' },
  { key: 'tuesday', label: 'Tue', date: '7th' },
  { key: 'wednesday', label: 'Wed', date: '8th' },
  { key: 'thursday', label: 'Thu', date: '9th' },
  { key: 'friday', label: 'Fri', date: '10th' },
];

const TIMES = { 1: '8:15-9:15', 2: '10:00-11:00', 3: '11:45-12:45', 4: '1:30-2:30', 5: '3:15-4:15', 6: '5:00-6:00' };

export default function ITReport() {
  const [data, setData] = useState([]);
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.get('/assignments/it-report').then(r => setData(r.data));
  }, []);

  const getTotal = (staff) => Object.values(staff.days).reduce((s, d) => s + d.length, 0);
  const getDayCount = (staff, day) => (staff.days[day] || []).length;

  const sorted = [...data].sort((a, b) => getTotal(b) - getTotal(a));

  const printReport = () => {
    const win = window.open('', '_blank');
    const header = `<tr><th style="padding:8px;border:1px solid #ddd;text-align:left;">Name</th><th style="padding:8px;border:1px solid #ddd;">Code</th>` +
      DAYS.map(d => `<th style="padding:8px;border:1px solid #ddd;">${d.label} ${d.date}</th>`).join('') +
      `<th style="padding:8px;border:1px solid #ddd;font-weight:bold;">Total</th></tr>`;
    const rows = sorted.map(s => {
      const total = getTotal(s);
      return `<tr><td style="padding:8px;border:1px solid #ddd;">${s.name}</td><td style="padding:8px;border:1px solid #ddd;font-family:monospace;font-size:12px;">${s.staff_code}</td>` +
        DAYS.map(d => `<td style="padding:8px;border:1px solid #ddd;text-align:center;">${getDayCount(s, d.key) || '-'}</td>`).join('') +
        `<td style="padding:8px;border:1px solid #ddd;text-align:center;font-weight:bold;">${total}</td></tr>`;
    }).join('');
    win.document.write(`<!DOCTYPE html><html><head><title>IT Staff Report</title>
      <style>body{font-family:Arial,sans-serif;padding:30px;}table{border-collapse:collapse;width:100%;margin-top:15px;}th{background:#1a3a5c;color:#fff;} @media print{button{display:none;}}</style>
    </head><body>
      <h1 style="margin:0;color:#1a3a5c;">CABE Exam Operations</h1>
      <p style="color:#666;margin:4px 0;">IT Staff Assignment Report — Mid-Semester 2025/2026 | 6th - 10th July, 2026</p>
      <hr style="margin:15px 0;border-color:#c8a951;">
      <table>${header}${rows}</table>
      <p style="margin-top:15px;font-size:12px;color:#999;">Total IT Staff: ${sorted.length} | Generated from CABE Exam Ops System</p>
      <button onclick="window.print()" style="margin-top:15px;padding:10px 20px;background:#1a3a5c;color:#fff;border:none;border-radius:6px;cursor:pointer;">Print</button>
    </body></html>`);
    win.document.close();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">IT Staff Report</h1>
          <p className="text-sm text-gray-500 mt-1">Session assignments for the exam week</p>
        </div>
        <button onClick={printReport} className="btn-brand text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          Print Report
        </button>
      </div>

      {/* Day filter */}
      <div className="flex gap-2 overflow-x-auto">
        <button onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${
            filter === 'all' ? 'bg-brand text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
          }`}>
          Full Week
        </button>
        {DAYS.map(d => (
          <button key={d.key} onClick={() => setFilter(d.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${
              filter === d.key ? 'bg-brand text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}>
            {d.label} {d.date}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card text-center">
          <p className="text-2xl font-black text-brand">{data.length}</p>
          <p className="text-xs text-gray-500">IT Staff</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-black text-emerald-600">
            {data.reduce((s, d) => s + getTotal(d), 0)}
          </p>
          <p className="text-xs text-gray-500">Total Assignments</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-black text-amber-600">
            {data.filter(d => getTotal(d) > 0).length}
          </p>
          <p className="text-xs text-gray-500">Staff with Assignments</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-black text-red-500">
            {data.filter(d => getTotal(d) === 0).length}
          </p>
          <p className="text-xs text-gray-500">Unassigned Staff</p>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand/5 border-b">
                <th className="text-left px-4 py-3 font-bold text-gray-700">Name</th>
                <th className="text-left px-3 py-3 font-bold text-gray-700">Code</th>
                {filter === 'all' ? (
                  <>
                    {DAYS.map(d => (
                      <th key={d.key} className="text-center px-3 py-3 font-bold text-gray-700">{d.label}</th>
                    ))}
                    <th className="text-center px-3 py-3 font-black text-brand">Total</th>
                  </>
                ) : (
                  <>
                    <th className="text-center px-3 py-3 font-bold text-gray-700">Sessions</th>
                    <th className="text-left px-3 py-3 font-bold text-gray-700">Details</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {sorted.map(s => {
                const total = getTotal(s);
                const dayAssignments = s.days[filter] || [];

                if (filter === 'all') {
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium">{s.name}</td>
                      <td className="px-3 py-2.5 text-gray-400 font-mono text-xs">{s.staff_code}</td>
                      {DAYS.map(d => {
                        const cnt = getDayCount(s, d.key);
                        return (
                          <td key={d.key} className="text-center px-3 py-2.5">
                            {cnt > 0 ? (
                              <span className="inline-block min-w-[24px] px-1.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                                {cnt}
                              </span>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="text-center px-3 py-2.5">
                        <span className={`inline-block min-w-[28px] px-2 py-0.5 rounded-full text-xs font-black ${
                          total === 0 ? 'bg-red-100 text-red-600' : 'bg-brand/10 text-brand'
                        }`}>
                          {total}
                        </span>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium">{s.name}</td>
                    <td className="px-3 py-2.5 text-gray-400 font-mono text-xs">{s.staff_code}</td>
                    <td className="text-center px-3 py-2.5">
                      {dayAssignments.length > 0 ? (
                        <span className="inline-block min-w-[24px] px-1.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                          {dayAssignments.length}
                        </span>
                      ) : (
                        <span className="text-gray-300">0</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {dayAssignments.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {dayAssignments.map((a, i) => (
                            <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                              S{a.session} {a.course_code} <span className="text-gray-400">{a.venue}</span>
                              <span className={`ml-0.5 font-semibold ${
                                a.faculty_code === 'FOBE' ? 'text-blue-600' :
                                a.faculty_code === 'Art' ? 'text-purple-600' : 'text-emerald-600'
                              }`}>{a.faculty_code}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">No assignments</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {data.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-gray-400 text-sm">No IT staff found</p>
        </div>
      )}
    </div>
  );
}

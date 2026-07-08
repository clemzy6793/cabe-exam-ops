import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const DAYS = [
  { date: '2026-07-06', label: 'Mon', full: 'Monday 6th July' },
  { date: '2026-07-07', label: 'Tue', full: 'Tuesday 7th July' },
  { date: '2026-07-08', label: 'Wed', full: 'Wednesday 8th July' },
  { date: '2026-07-09', label: 'Thu', full: 'Thursday 9th July' },
  { date: '2026-07-10', label: 'Fri', full: 'Friday 10th July' },
];

const SESSION_TIMES = ['8:15 AM', '10:00 AM', '11:45 AM', '1:30 PM', '3:15 PM', '5:00 PM'];
const SESSION_LABELS = {
  1: '8:15 - 9:15 AM', 2: '10:00 - 11:00 AM', 3: '11:45 - 12:45 PM',
  4: '1:30 - 2:30 PM', 5: '3:15 - 4:15 PM', 6: '5:00 - 6:00 PM',
};
const FACULTY_COLORS = {
  FOBE: { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-200', bar: 'bg-blue-500' },
  Art: { bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-700', ring: 'ring-purple-200', bar: 'bg-purple-500' },
  Education: { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', bar: 'bg-emerald-500' },
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const nav = useNavigate();

  const loadStats = () => api.get('/timetable/stats').then(r => setStats(r.data)).catch(() => {});

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-4 border-brand/30 border-t-brand rounded-full animate-spin" />
    </div>
  );

  const today = new Date().toISOString().slice(0, 10);
  const todayData = stats.by_day?.find(d => d.exam_date?.slice(0, 10) === today);
  const maxDayCount = Math.max(...(stats.by_day?.map(b => b.count) || [1]));
  const coveragePercent = stats.total_exams > 0
    ? Math.round(((stats.total_exams - stats.unassigned_exams) / stats.total_exams) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Exam Operations Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Mid-Semester Examinations — 6th to 10th July, 2026</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold ${todayData ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            <span className={`w-2 h-2 rounded-full ${todayData ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            {todayData ? 'Exams Active Today' : 'No Exams Today'}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          label="Total Exams"
          value={stats.total_exams}
          sub={`${stats.by_faculty?.length || 3} faculties`}
          icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          color="blue"
          onClick={() => nav('/timetable')}
        />
        <KPICard
          label="Total Staff"
          value={stats.total_staff}
          sub={`${stats.assigned_staff} assigned`}
          icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          color="emerald"
          onClick={() => nav('/staff')}
        />
        <KPICard
          label="Assignments"
          value={stats.total_assignments}
          sub={`${coveragePercent}% coverage`}
          icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          color="amber"
          onClick={() => nav('/assignments')}
        />
        <KPICard
          label="Reports"
          value={`${stats.exams_with_reports || 0}/${stats.total_exams}`}
          sub={`${stats.total_reports || 0} files uploaded`}
          icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          color={stats.exams_with_reports >= stats.total_exams ? 'green' : 'blue'}
          onClick={() => nav('/reports')}
        />
        <KPICard
          label="Unassigned"
          value={stats.unassigned_exams}
          sub={stats.unassigned_exams === 0 ? 'All covered' : 'Need attention'}
          icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          color={stats.unassigned_exams > 0 ? 'red' : 'green'}
          onClick={() => nav('/assignments')}
        />
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Coverage Ring */}
        <div className="card flex flex-col items-center justify-center py-6">
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb" strokeWidth="10" />
              <circle cx="60" cy="60" r="52" fill="none" stroke={coveragePercent === 100 ? '#10b981' : '#c8a951'}
                strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${coveragePercent * 3.267} 326.7`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-gray-900">{coveragePercent}%</span>
              <span className="text-[10px] text-gray-400 font-medium">COVERAGE</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-3 font-medium">Staff Assignment Coverage</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {stats.total_exams - stats.unassigned_exams} of {stats.total_exams} exams assigned
          </p>
        </div>

        {/* Exams by Day */}
        <div className="card col-span-1 lg:col-span-2">
          <h3 className="font-bold text-gray-900 mb-4 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Exams by Day
          </h3>
          <div className="space-y-3">
            {DAYS.map(day => {
              const d = stats.by_day?.find(b => b.exam_date?.slice(0, 10) === day.date);
              const count = d?.count || 0;
              const isToday = day.date === today;
              return (
                <div key={day.date} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold ${isToday ? 'text-accent' : 'text-gray-600'}`}>
                      {day.full} {isToday && '(Today)'}
                    </span>
                    <span className="text-xs font-bold text-gray-900">{count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isToday ? 'bg-accent' : 'bg-brand'}`}
                      style={{ width: `${Math.max((count / maxDayCount) * 100, 3)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Faculty Breakdown */}
        <div className="card">
          <h3 className="font-bold text-gray-900 mb-4 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            By Faculty
          </h3>
          <div className="space-y-3">
            {stats.by_faculty?.map(f => {
              const colors = {
                FOBE: { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-700' },
                Art: { bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-700' },
                Education: { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-700' },
              };
              const c = colors[f.code] || colors.FOBE;
              return (
                <div key={f.name} className={`flex items-center justify-between ${c.light} rounded-lg px-4 py-3`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${c.bg}`} />
                    <span className={`text-sm font-semibold ${c.text}`}>{f.code}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-xl font-black ${c.text}`}>{f.count}</span>
                    <span className={`text-xs ${c.text} ml-1`}>exams</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Exam Types */}
        <div className="card">
          <h3 className="font-bold text-gray-900 mb-4 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            Exam Types
          </h3>
          <div className="space-y-3">
            {stats.by_type?.map(t => {
              const typeConfig = {
                written: { label: 'Written', bg: 'bg-gray-100', text: 'text-gray-700', bar: 'bg-gray-500' },
                CBE: { label: 'Computer Based (CBE)', bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' },
                BYOD: { label: 'Bring Your Own Device', bg: 'bg-sky-50', text: 'text-sky-700', bar: 'bg-sky-500' },
              };
              const cfg = typeConfig[t.exam_type] || typeConfig.written;
              const pct = Math.round((t.count / stats.total_exams) * 100);
              return (
                <div key={t.exam_type} className={`${cfg.bg} rounded-lg px-4 py-3`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-sm font-semibold ${cfg.text}`}>{cfg.label}</span>
                    <span className={`text-sm font-black ${cfg.text}`}>{t.count}</span>
                  </div>
                  <div className="w-full bg-white/60 rounded-full h-1.5">
                    <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className={`text-[10px] mt-1 ${cfg.text} opacity-70`}>{pct}% of total</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="font-bold text-gray-900 mb-4 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Quick Actions
          </h3>
          <div className="space-y-2">
            <button onClick={() => nav('/timetable')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-brand/5 hover:bg-brand/10 transition-colors text-left group">
              <div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center group-hover:bg-brand/20 transition-colors">
                <svg className="w-4 h-4 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">View Timetable</p>
                <p className="text-xs text-gray-400">Browse all exams</p>
              </div>
            </button>
            <button onClick={() => nav('/assignments')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-accent/5 hover:bg-accent/10 transition-colors text-left group">
              <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Manage Assignments</p>
                <p className="text-xs text-gray-400">{stats.unassigned_exams > 0 ? `${stats.unassigned_exams} unassigned` : 'All assigned'}</p>
              </div>
            </button>
            <button onClick={() => nav('/staff')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors text-left group">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Staff Directory</p>
                <p className="text-xs text-gray-400">{stats.total_staff} registered staff</p>
              </div>
            </button>
            <a href="/lookup" target="_blank" className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-purple-500/5 hover:bg-purple-500/10 transition-colors text-left group">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Staff Lookup Portal</p>
                <p className="text-xs text-gray-400">Public search page</p>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* Live Report Upload Tracker */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Biometric Report Tracker
          </h3>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-gray-400 font-medium">Live — refreshes every 30s</span>
          </div>
        </div>

        {(() => {
          const rs = stats.report_stats || [];
          const reportPct = stats.total_exams > 0 ? Math.round(((stats.exams_with_reports || 0) / stats.total_exams) * 100) : 0;

          const byDay = {};
          rs.forEach(r => {
            const date = r.exam_date?.slice(0, 10);
            if (!byDay[date]) byDay[date] = [];
            byDay[date].push(r);
          });

          return (
            <>
              <div className="mb-5 p-4 rounded-xl bg-gradient-to-r from-brand/5 to-accent/5 border border-brand/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-700">Overall Upload Progress</span>
                  <span className="text-sm font-black text-brand">{stats.exams_with_reports || 0} / {stats.total_exams}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${reportPct === 100 ? 'bg-green-500' : 'bg-brand'}`}
                    style={{ width: `${Math.max(reportPct, 1)}%` }} />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-gray-400">{reportPct}% complete</span>
                  <span className="text-[10px] text-gray-400">{stats.total_reports || 0} files uploaded</span>
                </div>
              </div>

              {DAYS.map(day => {
                const dayRows = byDay[day.date] || [];
                if (!dayRows.length) return null;
                const dayTotal = dayRows.reduce((s, r) => s + r.total_exams, 0);
                const dayUploaded = dayRows.reduce((s, r) => s + r.uploaded, 0);
                const dayPct = dayTotal > 0 ? Math.round((dayUploaded / dayTotal) * 100) : 0;
                const isToday = day.date === today;

                const sessions = {};
                dayRows.forEach(r => {
                  if (!sessions[r.session_number]) sessions[r.session_number] = [];
                  sessions[r.session_number].push(r);
                });

                return (
                  <div key={day.date} className={`mb-4 rounded-xl border overflow-hidden ${isToday ? 'border-accent/30 ring-1 ring-accent/10' : 'border-gray-100'}`}>
                    <div className={`px-4 py-2.5 flex items-center justify-between ${isToday ? 'bg-accent/5' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${isToday ? 'text-accent' : 'text-gray-700'}`}>{day.full}</span>
                        {isToday && <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-white font-bold">TODAY</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div className={`h-full rounded-full ${dayPct === 100 ? 'bg-green-500' : 'bg-brand'}`}
                            style={{ width: `${Math.max(dayPct, 2)}%` }} />
                        </div>
                        <span className={`text-xs font-bold ${dayPct === 100 ? 'text-green-600' : 'text-gray-600'}`}>{dayUploaded}/{dayTotal}</span>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {Object.entries(sessions).sort(([a], [b]) => a - b).map(([sn, faculties]) => {
                        const sTotal = faculties.reduce((s, r) => s + r.total_exams, 0);
                        const sUploaded = faculties.reduce((s, r) => s + r.uploaded, 0);
                        return (
                          <div key={sn} className="px-4 py-2.5">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-brand">Session {sn}</span>
                                <span className="text-[10px] text-gray-400">{SESSION_LABELS[sn]}</span>
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                sUploaded === sTotal ? 'bg-green-100 text-green-700' : sUploaded > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'
                              }`}>
                                {sUploaded === sTotal ? 'Complete' : `${sUploaded}/${sTotal}`}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {faculties.map(f => {
                                const fc = FACULTY_COLORS[f.faculty_code] || FACULTY_COLORS.FOBE;
                                const done = f.uploaded === f.total_exams;
                                return (
                                  <div key={f.faculty_code} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${done ? 'bg-green-50' : fc.light}`}>
                                    <div className={`w-2 h-2 rounded-full ${done ? 'bg-green-500' : fc.bg}`} />
                                    <span className={`text-[11px] font-semibold ${done ? 'text-green-700' : fc.text}`}>{f.faculty_code}</span>
                                    <span className={`text-[11px] font-black ${done ? 'text-green-700' : fc.text}`}>{f.uploaded}/{f.total_exams}</span>
                                    {done && <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          );
        })()}
      </div>
    </div>
  );
}

function KPICard({ label, value, sub, icon, color, onClick }) {
  const colorMap = {
    blue: { bg: 'bg-blue-50', icon: 'bg-blue-100 text-blue-600', val: 'text-blue-700' },
    emerald: { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600', val: 'text-emerald-700' },
    amber: { bg: 'bg-amber-50', icon: 'bg-amber-100 text-amber-600', val: 'text-amber-700' },
    red: { bg: 'bg-red-50', icon: 'bg-red-100 text-red-600', val: 'text-red-700' },
    green: { bg: 'bg-green-50', icon: 'bg-green-100 text-green-600', val: 'text-green-700' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div onClick={onClick} className={`card cursor-pointer hover:shadow-md transition-shadow ${c.bg} border-0`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
        <div className={`w-8 h-8 rounded-lg ${c.icon} flex items-center justify-center`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
      </div>
      <p className={`text-3xl font-black ${c.val}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  );
}

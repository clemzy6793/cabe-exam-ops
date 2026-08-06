import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useSession } from '../contexts/SessionContext';

const FACULTY_COLORS = {
  FOBE: { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-200', accent: '#3b82f6' },
  Art: { bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-700', ring: 'ring-purple-200', accent: '#a855f7' },
  Education: { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', accent: '#10b981' },
};

export default function FacultyDashboard() {
  const { id } = useParams();
  const nav = useNavigate();
  const { currentSession } = useSession();
  const [faculty, setFaculty] = useState(null);
  const [exams, setExams] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  const sessionId = currentSession?.id;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const params = sessionId ? { session_id: sessionId } : {};
    Promise.all([
      api.get('/timetable/faculties'),
      api.get('/timetable/exams', { params: { ...params, faculty_id: id } }),
      api.get('/assignments', { params }),
      sessionId ? api.get('/attendance-tracking/summary', { params: { session_id: sessionId } }) : Promise.resolve({ data: [] }),
    ]).then(([fRes, eRes, aRes, attRes]) => {
      setFaculty(fRes.data.find(f => f.id === parseInt(id)));
      setExams(eRes.data);
      setAssignments(aRes.data);
      setAttendance(attRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, sessionId]);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-4 border-brand/30 border-t-brand rounded-full animate-spin" />
    </div>
  );

  if (!faculty) return (
    <div className="text-center py-16">
      <p className="text-gray-500">Faculty not found</p>
      <button onClick={() => nav('/')} className="btn-brand mt-4 text-sm px-4 py-2">Back to Dashboard</button>
    </div>
  );

  const fc = FACULTY_COLORS[faculty.code] || FACULTY_COLORS.FOBE;
  const facultyExamIds = new Set(exams.map(e => e.id));
  const facultyAssignments = assignments.filter(a => facultyExamIds.has(a.exam_id));

  const staffByType = {};
  const uniqueStaff = new Map();
  facultyAssignments.forEach(a => {
    if (!uniqueStaff.has(a.staff_id)) {
      uniqueStaff.set(a.staff_id, a);
      const t = a.staff_type || 'lecturer';
      staffByType[t] = (staffByType[t] || 0) + 1;
    }
  });

  const examsWithReports = exams.filter(e => e.report_count > 0).length;
  const reportPct = exams.length > 0 ? Math.round((examsWithReports / exams.length) * 100) : 0;

  const byDate = {};
  exams.forEach(e => {
    const d = e.exam_date?.slice(0, 10);
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(e);
  });

  const unassignedExams = exams.filter(e => {
    return !assignments.some(a => a.exam_id === e.id);
  });

  const facultyStaffIds = new Set([...uniqueStaff.keys()]);
  const facultyAttendance = attendance.filter(a => facultyStaffIds.has(a.staff_id));
  const avgAttendance = facultyAttendance.length > 0
    ? Math.round(facultyAttendance.reduce((sum, a) => sum + (a.days_present / Math.max(a.total_days, 1)), 0) / facultyAttendance.length * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => nav('/')} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-black text-gray-900">{faculty.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {faculty.code} — {currentSession ? `${currentSession.name}` : 'All Sessions'}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`card ${fc.light} border-0`}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Papers</p>
          <p className={`text-3xl font-black ${fc.text}`}>{exams.length}</p>
          <p className="text-xs text-gray-500 mt-1">{Object.keys(byDate).length} exam days</p>
        </div>
        <div className="card bg-amber-50 border-0">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Assigned Staff</p>
          <p className="text-3xl font-black text-amber-700">{uniqueStaff.size}</p>
          <p className="text-xs text-gray-500 mt-1">
            {Object.entries(staffByType).map(([t, c]) => `${c} ${t}`).join(', ') || 'None'}
          </p>
        </div>
        <div className={`card border-0 ${unassignedExams.length > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Unassigned</p>
          <p className={`text-3xl font-black ${unassignedExams.length > 0 ? 'text-red-700' : 'text-green-700'}`}>
            {unassignedExams.length}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {unassignedExams.length === 0 ? 'All covered' : 'Need attention'}
          </p>
        </div>
        <div className="card bg-blue-50 border-0">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Attendance</p>
          <p className="text-3xl font-black text-blue-700">{avgAttendance}%</p>
          <p className="text-xs text-gray-500 mt-1">{facultyAttendance.length} staff tracked</p>
        </div>
      </div>

      {/* Report Progress */}
      <div className="card">
        <h3 className="font-bold text-gray-900 mb-3 text-sm">Biometric Report Progress</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${reportPct === 100 ? 'bg-green-500' : 'bg-brand'}`}
                style={{ width: `${Math.max(reportPct, 1)}%` }} />
            </div>
          </div>
          <span className={`text-sm font-black ${reportPct === 100 ? 'text-green-600' : 'text-gray-700'}`}>
            {examsWithReports}/{exams.length}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">{reportPct}% of exam reports uploaded</p>
      </div>

      {/* Exams by Day */}
      <div className="card">
        <h3 className="font-bold text-gray-900 mb-4 text-sm">Exams Schedule</h3>
        {Object.keys(byDate).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No exams found</p>
        ) : (
          <div className="space-y-4">
            {Object.keys(byDate).sort().map(dateKey => {
              const dayExams = byDate[dateKey];
              const d = new Date(dateKey + 'T12:00:00');
              const label = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
              return (
                <div key={dateKey} className="border border-gray-100 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700">{label}</span>
                    <span className="text-xs text-gray-500">{dayExams.length} paper(s)</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {dayExams.sort((a, b) => (a.session_number || 0) - (b.session_number || 0)).map(exam => {
                      const hasAssignment = assignments.some(a => a.exam_id === exam.id);
                      return (
                        <div key={exam.id} className="px-4 py-2.5 flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{exam.course_code} — {exam.course_name}</p>
                            <p className="text-xs text-gray-400">Session {exam.session_number} | {exam.venue_name || 'No venue'} | {exam.candidates || '?'} candidates</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                            {exam.report_count > 0 && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Report</span>
                            )}
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              hasAssignment ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-600'
                            }`}>
                              {hasAssignment ? 'Assigned' : 'Unassigned'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Staff List */}
      {uniqueStaff.size > 0 && (
        <div className="card">
          <h3 className="font-bold text-gray-900 mb-3 text-sm">Assigned Staff ({uniqueStaff.size})</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs text-gray-500">#</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-500">Name</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-500">Code</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-500">Type</th>
                  <th className="text-center py-2 px-3 text-xs text-gray-500">Assignments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[...uniqueStaff.values()].map((s, i) => {
                  const assignCount = facultyAssignments.filter(a => a.staff_id === s.staff_id).length;
                  return (
                    <tr key={s.staff_id} className="hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-400 text-xs">{i + 1}</td>
                      <td className="py-2 px-3 font-medium text-gray-900">{s.staff_name}</td>
                      <td className="py-2 px-3 font-mono text-xs text-gray-500">{s.staff_code}</td>
                      <td className="py-2 px-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          s.staff_type === 'senior_member' ? 'bg-blue-100 text-blue-700' :
                          s.staff_type === 'it_staff' ? 'bg-purple-100 text-purple-700' :
                          s.staff_type === 'office_staff' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>{s.staff_type}</span>
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-gray-700">{assignCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

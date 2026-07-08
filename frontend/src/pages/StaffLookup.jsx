import { useState, useEffect, useRef } from 'react';
import api from '../api';
import toast, { Toaster } from 'react-hot-toast';

const SESSION_TIMES = {
  1: '8:15 - 9:15 AM',
  2: '10:00 - 11:00 AM',
  3: '11:45 - 12:45 PM',
  4: '1:30 - 2:30 PM',
  5: '3:15 - 4:15 PM',
  6: '5:00 - 6:00 PM',
};

export default function StaffLookup() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadedReports, setUploadedReports] = useState({});
  const [uploading, setUploading] = useState(null);
  const [sessionPanel, setSessionPanel] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const fileRef = useRef(null);
  const debounce = useRef(null);

  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return; }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/lookup/staff', { params: { name: query } });
        setSuggestions(data.results || []);
      } catch { setSuggestions([]); }
    }, 250);
  }, [query]);

  const selectStaff = async (id) => {
    setLoading(true);
    setError('');
    setSuggestions([]);
    try {
      const { data } = await api.get(`/lookup/staff/${id}`);
      setSelected(data);
      setQuery(data.staff.name);
      const { data: reports } = await api.get(`/reports/by-staff/${id}`);
      const rMap = {};
      reports.forEach(r => {
        if (!rMap[r.exam_id]) rMap[r.exam_id] = [];
        rMap[r.exam_id].push(r);
      });
      setUploadedReports(rMap);
    } catch (err) {
      setError(err.response?.data?.error || 'Not found');
    } finally {
      setLoading(false);
    }
  };

  const openSessionStatus = async (a) => {
    const key = `${a.faculty_code}_${a.exam_date}_${a.session_number}`;
    if (sessionPanel === key) { setSessionPanel(null); return; }
    setSessionPanel(key);
    setSessionLoading(true);
    try {
      const { data } = await api.get('/reports/session-status', {
        params: { faculty_code: a.faculty_code, date: a.exam_date, session: a.session_number }
      });
      setSessionData(data);
    } catch { setSessionData([]); }
    finally { setSessionLoading(false); }
  };

  const handleUpload = async (examId, file) => {
    if (!file || !selected) return;
    setUploading(examId);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('exam_id', examId);
    formData.append('staff_id', selected.staff.id);
    try {
      const { data } = await api.post('/reports/public-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Report uploaded!');
      setUploadedReports(prev => ({ ...prev, [examId]: [...(prev[examId] || []), data] }));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const deleteReport = async (reportId, examId) => {
    if (!confirm('Delete this report?')) return;
    try {
      await api.delete(`/reports/public-delete/${reportId}?staff_id=${selected.staff.id}`);
      toast.success('Report deleted');
      setUploadedReports(prev => ({
        ...prev,
        [examId]: (prev[examId] || []).filter(r => r.id !== reportId),
      }));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    }
  };

  const grouped = {};
  selected?.assignments?.forEach(a => {
    const key = a.exam_date?.slice(0, 10) || 'unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(a);
  });

  const printSessionStatus = (a) => {
    const date = a.exam_date?.slice(0, 10) || '';
    window.location.href = `/public/session-report?faculty=${a.faculty_code}&date=${date}&session=${a.session_number}`;
  };

  const printSchedule = (data, groupedData) => {
    const rows = Object.entries(groupedData).sort().map(([date, assignments]) => {
      return assignments.map(a =>
        `<tr>
          <td style="padding:8px;border:1px solid #ddd;">${a.day_name || ''} ${new Date(date+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</td>
          <td style="padding:8px;border:1px solid #ddd;">Session ${a.session_number} (${SESSION_TIMES[a.session_number]})</td>
          <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">${a.course_code}</td>
          <td style="padding:8px;border:1px solid #ddd;">${a.course_name || ''}</td>
          <td style="padding:8px;border:1px solid #ddd;">${a.venue || ''}</td>
          <td style="padding:8px;border:1px solid #ddd;">${a.faculty_name || ''}</td>
        </tr>`
      ).join('');
    }).join('');
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Schedule - ${data.staff.name}</title>
      <style>body{font-family:Arial,sans-serif;padding:30px;} table{border-collapse:collapse;width:100%;margin-top:15px;} th{background:#1a3a5c;color:#fff;padding:10px;text-align:left;} @media print{button{display:none;}}</style>
    </head><body>
      <h1 style="margin:0;color:#1a3a5c;">CABE Exam Operations</h1>
      <p style="color:#666;margin:4px 0 0;">Mid-Semester Examination Schedule 2025/2026 | 6th - 10th July, 2026</p>
      <hr style="margin:15px 0;border-color:#c8a951;">
      <h2 style="margin:0;">${data.staff.name}</h2>
      <p style="color:#666;margin:4px 0;">Staff Code: ${data.staff.staff_code || 'N/A'} | Role: ${data.staff.role} | Total: ${data.assignments.length}</p>
      <table><thead><tr><th>Day</th><th>Session</th><th>Code</th><th>Course</th><th>Venue</th><th>Faculty</th></tr></thead>
        <tbody>${rows}</tbody></table>
      <p style="margin-top:20px;color:#999;font-size:12px;">Generated from CABE Exam Ops System</p>
      <button onclick="window.print()" style="margin-top:15px;padding:10px 20px;background:#1a3a5c;color:#fff;border:none;border-radius:6px;cursor:pointer;">Print</button>
    </body></html>`);
    w.document.close();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-dark to-brand">
      <Toaster position="top-center" />
      <div className="max-w-lg mx-auto p-4 pt-12">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-white">Staff Assignment Lookup</h1>
          <p className="text-blue-200 text-sm mt-1">CABE Mid-Semester Exams 2025/2026</p>
          <p className="text-blue-300/50 text-xs mt-0.5">6th - 10th July, 2026</p>
        </div>

        {/* Search */}
        <div className="card mb-6 relative">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Enter your name</label>
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(null); setError(''); }}
            placeholder="e.g. Adjei-Twum"
            className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-base font-medium focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
            autoComplete="off"
          />
          {error && <p className="text-red-500 text-sm mt-2 font-medium">{error}</p>}

          {/* Suggestions dropdown */}
          {suggestions.length > 0 && !selected && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg border z-10 max-h-64 overflow-y-auto">
              {suggestions.map(s => (
                <button
                  key={s.id}
                  onClick={() => selectStaff(s.id)}
                  className="w-full text-left px-4 py-3 hover:bg-brand/5 flex items-center justify-between border-b last:border-0"
                >
                  <div>
                    <div className="font-semibold text-sm text-gray-900">{s.name}</div>
                    {s.department && <div className="text-xs text-gray-400">{s.department}</div>}
                  </div>
                  <span className="text-xs text-brand font-medium">View</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {loading && <div className="text-center text-blue-200">Loading...</div>}

        {/* Results */}
        {selected && (
          <div className="space-y-4">
            <div className="card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-brand flex items-center justify-center text-white font-black text-lg">
                    {selected.staff.name[0]}
                  </div>
                  <div>
                    <h2 className="font-black text-lg text-gray-900">{selected.staff.name}</h2>
                    {selected.staff.department && <p className="text-xs text-gray-400">{selected.staff.department}</p>}
                    <p className="text-xs text-gray-300">{selected.staff.role}</p>
                  </div>
                </div>
                {selected.assignments.length > 0 && (
                  <button onClick={() => printSchedule(selected, grouped)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/80 border text-sm font-medium text-gray-700 hover:bg-white">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    Print
                  </button>
                )}
              </div>
            </div>

            {selected.assignments.length === 0 ? (
              <div className="card text-center py-8">
                <p className="text-gray-400">No exam assignments found.</p>
              </div>
            ) : (
              <>
                <div className="card bg-accent/10 border-accent/20">
                  <p className="text-sm font-bold text-accent">
                    {Object.entries(grouped).sort().map(([, dayAssignments], i, arr) => {
                      const dayName = dayAssignments[0]?.day_name?.charAt(0).toUpperCase() + dayAssignments[0]?.day_name?.slice(1);
                      const count = dayAssignments.length;
                      return `${count} assignment${count !== 1 ? 's' : ''} on ${dayName}`;
                    }).join(', ')}
                  </p>
                </div>

                {Object.entries(grouped).sort().map(([date, assignments]) => (
                  <div key={date} className="card p-0 overflow-hidden">
                    <div className="bg-brand/5 px-4 py-2 border-b">
                      <span className="font-bold text-brand text-sm">
                        {assignments[0]?.day_name?.charAt(0).toUpperCase() + assignments[0]?.day_name?.slice(1)} — {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
                      </span>
                    </div>
                    <div className="divide-y">
                      {assignments.map((a, i) => {
                        const isFacultyRole = !a.exam_id;
                        const panelKey = `${a.faculty_code}_${a.exam_date}_${a.session_number}`;
                        const isPanelOpen = sessionPanel === panelKey;
                        return (
                        <div key={i} className="px-4 py-3">
                          <div className={`flex items-center justify-between ${isFacultyRole ? 'cursor-pointer' : ''}`}
                            onClick={isFacultyRole ? () => openSessionStatus(a) : undefined}>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-gray-900">{a.course_code}</span>
                              {a.exam_type === 'CBE' && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-amber-500 text-white">CBE</span>}
                              {a.exam_type === 'ONLINE' && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-green-500 text-white">ONLINE</span>}
                              {a.exam_type === 'BYOD' && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-sky-500 text-white">BYOD</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-brand/10 text-brand px-2 py-0.5 rounded font-semibold">
                                Session {a.session_number}
                              </span>
                              {isFacultyRole && (
                                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isPanelOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                              )}
                            </div>
                          </div>
                          {isFacultyRole && (
                            <p className="text-xs text-brand/60 mt-0.5">Tap to view report status for this session</p>
                          )}
                          {!isFacultyRole && <p className="text-xs text-gray-500 mt-0.5">{a.course_name}</p>}
                          <div className="flex flex-wrap gap-x-4 mt-1.5 text-xs text-gray-400">
                            <span>Time: {SESSION_TIMES[a.session_number]}</span>
                            {a.venue && !isFacultyRole && <span>Venue: {a.venue}</span>}
                            {a.student_count > 0 && <span>{a.student_count} students</span>}
                          </div>
                          <div className="mt-1 flex items-center justify-between">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                              a.faculty_code === 'FOBE' ? 'bg-blue-100 text-blue-700' :
                              a.faculty_code === 'Art' ? 'bg-purple-100 text-purple-700' :
                              'bg-emerald-100 text-emerald-700'
                            }`}>{a.faculty_name}</span>
                            {a.exam_id && (() => {
                              const reports = uploadedReports[a.exam_id] || [];
                              const canUploadMore = reports.length < 2;
                              return (
                                <div className="flex flex-col items-end gap-1">
                                  {reports.map((r, ri) => (
                                    <span key={ri} className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-600 font-semibold flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                      {r.filename?.length > 20 ? r.filename.slice(0, 18) + '...' : r.filename}
                                      <button onClick={(e) => { e.stopPropagation(); deleteReport(r.id, a.exam_id); }}
                                        className="ml-1 text-red-400 hover:text-red-600">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                      </button>
                                    </span>
                                  ))}
                                  {canUploadMore && (
                                    <label className="cursor-pointer">
                                      <span className={`text-[10px] px-2 py-1 rounded-lg font-semibold flex items-center gap-1 ${
                                        uploading === a.exam_id ? 'bg-gray-100 text-gray-400' : 'bg-brand/10 text-brand hover:bg-brand/20'
                                      }`}>
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                        {uploading === a.exam_id ? 'Uploading...' : reports.length ? 'Upload another' : 'Upload Report'}
                                      </span>
                                      <input type="file" accept=".xls,.xlsx" className="hidden"
                                        disabled={uploading === a.exam_id}
                                        onChange={e => { if (e.target.files[0]) handleUpload(a.exam_id, e.target.files[0]); e.target.value = ''; }} />
                                    </label>
                                  )}
                                </div>
                              );
                            })()}
                          </div>

                          {/* Session report status panel */}
                          {isFacultyRole && isPanelOpen && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              {sessionLoading ? (
                                <p className="text-xs text-gray-400 text-center py-3">Loading...</p>
                              ) : sessionData?.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-3">No exams in this session</p>
                              ) : (
                                <div className="space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Report Status</p>
                                      <p className="text-[10px] text-gray-400">
                                        {sessionData?.filter(e => e.reports.length > 0).length}/{sessionData?.length} uploaded
                                      </p>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); printSessionStatus(a); }}
                                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-white text-xs font-bold shadow-sm">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                      Print Report
                                    </button>
                                  </div>
                                  {sessionData?.map(exam => (
                                    <div key={exam.id} className={`rounded-lg p-2.5 ${exam.reports.length ? 'bg-emerald-50/50' : 'bg-red-50/50'}`}>
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <span className="font-bold text-xs text-gray-900">{exam.course_code}</span>
                                          <span className="text-[10px] text-gray-400 ml-1.5">{exam.venue}</span>
                                        </div>
                                        {exam.reports.length > 0 ? (
                                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            Done
                                          </span>
                                        ) : (
                                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">Missing</span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-gray-400 mt-0.5">{exam.course_name}</p>
                                      {exam.assigned_staff?.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                          {exam.assigned_staff.map(s => (
                                            <span key={s.id} className="text-[10px] bg-white/80 border px-1.5 py-0.5 rounded text-gray-600">
                                              {s.name}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                      {exam.reports.length > 0 && (
                                        <div className="mt-1.5 space-y-0.5">
                                          {exam.reports.map(r => (
                                            <a key={r.id} href={`/api/reports/${r.id}/download`} download
                                              className="text-[10px] text-emerald-600 flex items-center gap-1 hover:text-emerald-800 hover:underline">
                                              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                              {r.uploader_name || 'Unknown'} — {r.filename}
                                            </a>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  <button onClick={(e) => { e.stopPropagation(); printSessionStatus(a); }}
                                    className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand text-white text-sm font-bold shadow-sm">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                    Print This Report
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                          {a.paired_staff?.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">Paired with</p>
                              <div className="space-y-1">
                                {a.paired_staff.map((p, j) => (
                                  <div key={j} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-1.5">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                      p.staff_type === 'it_staff' ? 'bg-cyan-100 text-cyan-700' : 'bg-amber-100 text-amber-700'
                                    }`}>{p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                                    <div className="flex-1 min-w-0">
                                      <span className="text-xs font-medium text-gray-700">{p.name}</span>
                                      <span className="text-[10px] text-gray-400 ml-1.5">{p.staff_code}</span>
                                    </div>
                                    {p.phone && <a href={`tel:${p.phone}`} className="text-[10px] text-brand font-medium">{p.phone}</a>}
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                      p.staff_type === 'it_staff' ? 'bg-cyan-50 text-cyan-600' :
                                      p.assignment_role === 'invigilator' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'
                                    }`}>{p.staff_type === 'it_staff' ? 'IT' : p.assignment_role}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                      })}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        <div className="text-center mt-8">
          <a href="/public/timetable" className="text-blue-200 text-sm hover:text-white">View Full Timetable</a>
          <span className="text-blue-300/30 mx-3">|</span>
          <a href="/login" className="text-blue-200 text-sm hover:text-white">Admin Login</a>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

const DAYS = [
  { key: 'monday', label: 'Mon 6th' }, { key: 'tuesday', label: 'Tue 7th' },
  { key: 'wednesday', label: 'Wed 8th' }, { key: 'thursday', label: 'Thu 9th' },
  { key: 'friday', label: 'Fri 10th' },
];
const TIMES = { 1: '8:15-9:15', 2: '10:00-11:00', 3: '11:45-12:45', 4: '1:30-2:30', 5: '3:15-4:15', 6: '5:00-6:00' };

export default function TimetableUpload() {
  const [faculties, setFaculties] = useState([]);
  const [facultyId, setFacultyId] = useState('');
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [dayFilter, setDayFilter] = useState('all');
  const fileRef = useRef();

  const role = localStorage.getItem('exam_ops_role');
  const isAdmin = role === 'admin' || role === 'superadmin';
  const isOfficer = role === 'exam_officer';
  const officerFacultyId = localStorage.getItem('exam_ops_faculty_id');

  useEffect(() => {
    api.get('/timetable/faculties').then(r => {
      setFaculties(r.data);
      if (isOfficer && officerFacultyId) setFacultyId(officerFacultyId);
    });
  }, []);

  const downloadTemplate = () => {
    if (!facultyId) return toast.error('Select a faculty first');
    api.get(`/timetable-upload/template/${facultyId}`, { responseType: 'blob' }).then(r => {
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      const fac = faculties.find(f => f.id === Number(facultyId));
      a.download = `${fac?.code || 'timetable'}_template.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const parseFile = async () => {
    if (!file || !facultyId) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('faculty_id', facultyId);
    try {
      const { data } = await api.post('/timetable-upload/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setParsed(data);
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Parse failed');
    } finally {
      setUploading(false);
    }
  };

  const confirmSave = async (replace) => {
    if (!parsed?.exams?.length) return;
    setSaving(true);
    try {
      const { data } = await api.post('/timetable-upload/confirm', {
        faculty_id: Number(facultyId),
        exams: parsed.exams,
        replace,
      });
      toast.success(`${data.inserted} exams saved!`);
      setStep(4);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (i) => {
    setEditIdx(i);
    setEditForm({ ...parsed.exams[i] });
  };

  const saveEdit = () => {
    const updated = { ...parsed };
    updated.exams[editIdx] = { ...editForm };
    setParsed({ ...updated });
    setEditIdx(null);
  };

  const removeExam = (i) => {
    const updated = { ...parsed, exams: parsed.exams.filter((_, j) => j !== i), total: parsed.total - 1 };
    setParsed(updated);
  };

  const filteredExams = parsed?.exams?.filter(e => dayFilter === 'all' || e.day_name === dayFilter) || [];

  const examsByDaySession = {};
  filteredExams.forEach(e => {
    const k = `${e.day_name}_${e.session_number}`;
    if (!examsByDaySession[k]) examsByDaySession[k] = { day: e.day_name, session: e.session_number, exams: [] };
    examsByDaySession[k].exams.push(e);
  });
  const groups = Object.values(examsByDaySession).sort((a, b) => {
    const di = DAYS.findIndex(d => d.key === a.day) - DAYS.findIndex(d => d.key === b.day);
    return di || a.session - b.session;
  });

  const selectedFac = faculties.find(f => f.id === Number(facultyId));

  const reset = () => { setStep(1); setFile(null); setParsed(null); setDayFilter('all'); };

  const printTimetable = () => {
    if (!parsed?.exams?.length) return;
    const fac = faculties.find(f => f.id === Number(facultyId));
    const examsByDay = {};
    parsed.exams.forEach(e => {
      if (!examsByDay[e.day_name]) examsByDay[e.day_name] = {};
      if (!examsByDay[e.day_name][e.session_number]) examsByDay[e.day_name][e.session_number] = [];
      examsByDay[e.day_name][e.session_number].push(e);
    });

    const dayLabels = { monday: 'Monday, 6th July', tuesday: 'Tuesday, 7th July', wednesday: 'Wednesday, 8th July', thursday: 'Thursday, 9th July', friday: 'Friday, 10th July' };
    let rows = '';
    DAYS.forEach(d => {
      const sessions = examsByDay[d.key];
      if (!sessions) return;
      rows += `<tr><td colspan="5" style="background:#1a3a5c;color:#fff;padding:10px;font-weight:bold;font-size:14px;">${dayLabels[d.key]}</td></tr>`;
      [1,2,3,4,5,6].forEach(sn => {
        const exams = sessions[sn];
        if (!exams) return;
        exams.forEach((e, i) => {
          rows += `<tr>
            ${i === 0 ? `<td rowspan="${exams.length}" style="padding:8px;border:1px solid #ddd;font-weight:bold;vertical-align:top;">Session ${sn}<br><span style="font-weight:normal;font-size:11px;color:#666;">${TIMES[sn]}</span></td>` : ''}
            <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">${e.course_code}${e.exam_type !== 'written' ? ` <span style="color:${e.exam_type === 'CBE' ? '#d97706' : '#0284c7'};font-size:11px;">[${e.exam_type}]</span>` : ''}</td>
            <td style="padding:8px;border:1px solid #ddd;">${e.course_name}</td>
            <td style="padding:8px;border:1px solid #ddd;">${e.venue}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:center;">${e.student_count || '-'}</td>
          </tr>`;
        });
      });
    });

    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>${fac?.name || ''} Timetable</title>
      <style>body{font-family:Arial,sans-serif;padding:30px;} table{border-collapse:collapse;width:100%;} @media print{button{display:none;} body{padding:15px;}}</style>
    </head><body>
      <div style="text-align:center;margin-bottom:20px;">
        <p style="margin:0;font-size:13px;">KWAME NKRUMAH UNIVERSITY OF SCIENCE AND TECHNOLOGY, KUMASI</p>
        <p style="margin:2px 0;font-size:13px;">COLLEGE OF ART AND BUILT ENVIRONMENT</p>
        <p style="margin:2px 0;font-size:15px;font-weight:bold;">${fac?.name?.toUpperCase() || ''}</p>
        <p style="margin:4px 0;font-size:13px;">SECOND SEMESTER MID-SEMESTER EXAMINATIONS TIMETABLE</p>
        <p style="margin:2px 0;font-size:13px;">2025/2026 ACADEMIC YEAR (6th - 10th July, 2026)</p>
      </div>
      <table>
        <thead><tr style="background:#f0f0f0;"><th style="padding:8px;border:1px solid #ddd;">Session</th><th style="padding:8px;border:1px solid #ddd;">Course Code</th><th style="padding:8px;border:1px solid #ddd;">Course Name</th><th style="padding:8px;border:1px solid #ddd;">Venue</th><th style="padding:8px;border:1px solid #ddd;">Students</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:20px;color:#999;font-size:11px;">Generated from CABE Exam Ops System</p>
      <button onclick="window.print()" style="margin-top:15px;padding:10px 20px;background:#1a3a5c;color:#fff;border:none;border-radius:6px;cursor:pointer;">Print</button>
    </body></html>`);
    win.document.close();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Timetable Upload</h1>
          <p className="text-sm text-gray-500 mt-1">Upload faculty exam timetable from Excel template</p>
        </div>
        {step > 1 && step < 4 && (
          <button onClick={reset} className="text-sm text-gray-500 hover:text-gray-700">Start Over</button>
        )}
      </div>

      {/* Progress */}
      <div className="flex gap-1">
        {['Select faculty', 'Upload Excel', 'Preview & confirm', 'Done'].map((label, i) => (
          <div key={i} className="flex-1">
            <div className={`h-1.5 rounded-full ${step > i ? 'bg-brand' : 'bg-gray-200'}`} />
            <p className={`text-[10px] mt-1 ${step === i + 1 ? 'text-brand font-bold' : 'text-gray-400'}`}>{label}</p>
          </div>
        ))}
      </div>

      {/* Step 1: Select Faculty */}
      {step === 1 && (
        <div className="card space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700">Faculty</label>
            <select value={facultyId} onChange={e => setFacultyId(e.target.value)}
              disabled={isOfficer}
              className="w-full border rounded-lg px-3 py-2.5 text-sm mt-1 disabled:bg-gray-100">
              <option value="">Select faculty...</option>
              {faculties.map(f => <option key={f.id} value={f.id}>{f.code} — {f.name}</option>)}
            </select>
            {isOfficer && <p className="text-xs text-gray-400 mt-1">Locked to your assigned faculty</p>}
          </div>
          {facultyId && (
            <div className="flex gap-3">
              <button onClick={downloadTemplate}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-brand/30 rounded-xl text-brand text-sm font-semibold hover:bg-brand/5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download Template
              </button>
              <button onClick={() => setStep(2)}
                className="flex-1 btn-brand text-sm py-3">
                I have a filled template
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Upload File */}
      {step === 2 && (
        <div className="card space-y-4">
          <div className="bg-brand/5 rounded-lg p-3">
            <p className="text-sm font-bold text-brand">{selectedFac?.code} — {selectedFac?.name}</p>
          </div>
          <div onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer hover:border-brand/50 hover:bg-brand/5 transition-colors">
            {file ? (
              <div>
                <svg className="w-12 h-12 text-brand mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-sm font-bold text-brand">{file.name}</p>
                <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
            ) : (
              <div>
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                <p className="text-sm text-gray-500">Click to select filled Excel template</p>
                <p className="text-xs text-gray-400">.xls or .xlsx</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".xls,.xlsx" className="hidden"
            onChange={e => setFile(e.target.files[0])} />
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="btn-ghost flex-1">Back</button>
            <button onClick={parseFile} disabled={!file || uploading} className="btn-brand flex-1 disabled:opacity-40">
              {uploading ? 'Parsing...' : 'Upload & Parse'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 3 && parsed && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card text-center">
              <p className="text-2xl font-black text-brand">{parsed.total}</p>
              <p className="text-xs text-gray-500">Exams parsed</p>
            </div>
            <div className="card text-center">
              <p className={`text-2xl font-black ${parsed.warnings.length ? 'text-amber-500' : 'text-emerald-500'}`}>{parsed.warnings.length}</p>
              <p className="text-xs text-gray-500">Warnings</p>
            </div>
            <div className="card text-center">
              <p className={`text-2xl font-black ${parsed.clashes.length ? 'text-red-500' : 'text-emerald-500'}`}>{parsed.clashes.length}</p>
              <p className="text-xs text-gray-500">Venue clashes</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-black text-purple-600">{new Set(parsed.exams.map(e => e.day_name)).size}</p>
              <p className="text-xs text-gray-500">Days</p>
            </div>
          </div>

          {/* Warnings */}
          {parsed.warnings.length > 0 && (
            <div className="card bg-amber-50 border-amber-200 p-3">
              <p className="text-sm font-bold text-amber-700 mb-1">Warnings ({parsed.warnings.length})</p>
              <div className="max-h-32 overflow-y-auto space-y-0.5">
                {parsed.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-amber-600">Row {w.row}: {w.msg}</p>
                ))}
              </div>
            </div>
          )}

          {parsed.clashes.length > 0 && (
            <div className="card bg-red-50 border-red-200 p-3">
              <p className="text-sm font-bold text-red-700 mb-1">Venue Clashes</p>
              {parsed.clashes.map((c, i) => (
                <p key={i} className="text-xs text-red-600">{c.venue} on {c.day} session {c.session}: {c.courses.join(' vs ')}</p>
              ))}
            </div>
          )}

          {/* Day filter */}
          <div className="flex gap-2 overflow-x-auto">
            <button onClick={() => setDayFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${dayFilter === 'all' ? 'bg-brand text-white' : 'bg-white border text-gray-600'}`}>
              All ({parsed.exams.length})
            </button>
            {DAYS.map(d => {
              const count = parsed.exams.filter(e => e.day_name === d.key).length;
              if (!count) return null;
              return (
                <button key={d.key} onClick={() => setDayFilter(d.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${dayFilter === d.key ? 'bg-brand text-white' : 'bg-white border text-gray-600'}`}>
                  {d.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Exam list */}
          {groups.map(g => {
            const dayLabel = DAYS.find(d => d.key === g.day)?.label || g.day;
            return (
              <div key={`${g.day}_${g.session}`} className="card p-0 overflow-hidden">
                <div className="bg-brand/5 px-4 py-2 border-b flex justify-between items-center">
                  <span className="font-bold text-brand text-sm">{dayLabel} — Session {g.session} <span className="text-gray-400 font-normal text-xs">{TIMES[g.session]}</span></span>
                  <span className="text-xs text-gray-400">{g.exams.length} exams</span>
                </div>
                <div className="divide-y">
                  {g.exams.map((e, j) => {
                    const globalIdx = parsed.exams.indexOf(e);
                    return (
                      <div key={j} className="px-4 py-2.5 flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-gray-900">{e.course_code}</span>
                            {e.exam_type !== 'written' && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                e.exam_type === 'CBE' ? 'bg-orange-100 text-orange-700' : 'bg-sky-100 text-sky-700'
                              }`}>{e.exam_type}</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{e.course_name}</p>
                          <div className="flex gap-3 text-[10px] text-gray-400 mt-0.5">
                            {e.venue && <span>Venue: {e.venue}</span>}
                            {e.student_count > 0 && <span>{e.student_count} students</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 ml-2">
                          <button onClick={() => startEdit(globalIdx)} className="text-xs text-brand hover:text-brand-dark px-1.5 py-1">Edit</button>
                          <button onClick={() => removeExam(globalIdx)} className="text-xs text-red-400 hover:text-red-600 px-1.5 py-1">&times;</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Actions */}
          <div className="card flex flex-col sm:flex-row gap-3">
            <button onClick={() => setStep(2)} className="btn-ghost flex-1">Back to Upload</button>
            <button onClick={printTimetable} className="btn-ghost flex-1 flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Print Preview
            </button>
            <button onClick={() => confirmSave(true)} disabled={saving}
              className="btn-brand flex-1 disabled:opacity-40">
              {saving ? 'Saving...' : `Save ${parsed.total} Exams (Replace)`}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 4 && (
        <div className="card text-center py-12">
          <svg className="w-16 h-16 text-emerald-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <h2 className="text-xl font-black text-gray-900 mb-2">Timetable Uploaded</h2>
          <p className="text-sm text-gray-500 mb-6">Exams have been saved for {selectedFac?.name}</p>
          <div className="flex justify-center gap-3">
            <button onClick={reset} className="btn-ghost text-sm">Upload Another</button>
            <a href="/timetable" className="btn-brand text-sm inline-block px-4 py-2">View Timetable</a>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editIdx !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditIdx(null)}>
          <div className="bg-white rounded-xl w-full max-w-sm p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-lg">Edit Exam</h3>
            <div>
              <label className="text-xs font-semibold text-gray-600">Course Code</label>
              <input value={editForm.course_code} onChange={e => setEditForm({ ...editForm, course_code: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Course Name</label>
              <input value={editForm.course_name} onChange={e => setEditForm({ ...editForm, course_name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600">Day</label>
                <select value={editForm.day_name} onChange={e => setEditForm({ ...editForm, day_name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                  {DAYS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Session</label>
                <select value={editForm.session_number} onChange={e => setEditForm({ ...editForm, session_number: parseInt(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                  {[1,2,3,4,5,6].map(s => <option key={s} value={s}>Session {s}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600">Venue</label>
                <input value={editForm.venue} onChange={e => setEditForm({ ...editForm, venue: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Students</label>
                <input type="number" value={editForm.student_count} onChange={e => setEditForm({ ...editForm, student_count: parseInt(e.target.value) || 0 })}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Exam Type</label>
              <select value={editForm.exam_type} onChange={e => setEditForm({ ...editForm, exam_type: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                <option value="written">Written</option>
                <option value="CBE">CBE</option>
                <option value="BYOD">BYOD</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditIdx(null)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={saveEdit} className="btn-brand flex-1">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

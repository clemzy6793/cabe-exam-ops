import { useState, useEffect, useRef } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

const DAYS = [
  { key: 'monday', label: 'Mon 6th' },
  { key: 'tuesday', label: 'Tue 7th' },
  { key: 'wednesday', label: 'Wed 8th' },
  { key: 'thursday', label: 'Thu 9th' },
  { key: 'friday', label: 'Fri 10th' },
];

const TIMES = { 1: '8:15-9:15', 2: '10:00-11:00', 3: '11:45-12:45', 4: '1:30-2:30', 5: '3:15-4:15', 6: '5:00-6:00' };

const FAC_COLORS = {
  FOBE: 'bg-blue-50 border-blue-200 text-blue-800',
  Art: 'bg-purple-50 border-purple-200 text-purple-800',
  Education: 'bg-emerald-50 border-emerald-200 text-emerald-800',
};

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [facultyId, setFacultyId] = useState('all');
  const [day, setDay] = useState('all');
  const [showUpload, setShowUpload] = useState(false);

  const role = localStorage.getItem('exam_ops_role');
  const isAdmin = role === 'admin' || role === 'superadmin';

  const load = () => {
    const params = {};
    if (facultyId !== 'all') params.faculty_id = facultyId;
    if (day !== 'all') params.day = day;
    api.get('/reports', { params }).then(r => setReports(r.data));
  };

  useEffect(() => {
    api.get('/timetable/faculties').then(r => setFaculties(r.data));
  }, []);

  useEffect(() => { load(); }, [facultyId, day]);

  const download = (id, filename) => {
    api.get(`/reports/${id}/download`, { responseType: 'blob' }).then(r => {
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const remove = async (id) => {
    if (!confirm('Delete this report?')) return;
    try {
      await api.delete(`/reports/${id}`);
      toast.success('Deleted');
      load();
    } catch { toast.error('Failed'); }
  };

  const grouped = {};
  reports.forEach(r => {
    const fKey = r.faculty_code;
    const dKey = r.day_name;
    const sKey = r.session_number;
    if (!grouped[fKey]) grouped[fKey] = {};
    if (!grouped[fKey][dKey]) grouped[fKey][dKey] = {};
    if (!grouped[fKey][dKey][sKey]) grouped[fKey][dKey][sKey] = [];
    grouped[fKey][dKey][sKey].push(r);
  });

  const facOrder = ['FOBE', 'Art', 'Education'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Biometric Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Upload and download attendance reports</p>
        </div>
        <button onClick={() => setShowUpload(true)} className="btn-brand text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          Upload Report
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto">
        <button onClick={() => setFacultyId('all')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${
            facultyId === 'all' ? 'bg-amber-500 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
          }`}>All Faculties</button>
        {faculties.map(f => (
          <button key={f.id} onClick={() => setFacultyId(String(f.id))}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${
              facultyId === String(f.id) ? 'bg-amber-500 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}>{f.code || f.name}</button>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto">
        <button onClick={() => setDay('all')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${
            day === 'all' ? 'bg-brand text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
          }`}>All Days</button>
        {DAYS.map(d => (
          <button key={d.key} onClick={() => setDay(d.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${
              day === d.key ? 'bg-brand text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}>{d.label}</button>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card text-center">
          <p className="text-2xl font-black text-brand">{reports.length}</p>
          <p className="text-xs text-gray-500">Total Reports</p>
        </div>
        {facOrder.map(fc => (
          <div key={fc} className="card text-center">
            <p className="text-2xl font-black">{reports.filter(r => r.faculty_code === fc).length}</p>
            <p className="text-xs text-gray-500">{fc}</p>
          </div>
        ))}
      </div>

      {/* Reports tree: Faculty → Day → Session */}
      {facOrder.filter(fc => grouped[fc]).map(fc => (
        <div key={fc} className="card p-0 overflow-hidden">
          <div className={`px-4 py-2.5 border-b font-bold text-sm ${FAC_COLORS[fc]}`}>
            {fc === 'FOBE' ? 'Faculty of Built Environment' : fc === 'Art' ? 'Faculty of Art' : 'Faculty of Educational Studies'}
          </div>
          {DAYS.filter(d => grouped[fc]?.[d.key]).map(d => (
            <div key={d.key} className="border-b last:border-0">
              <div className="bg-gray-50 px-4 py-2 font-semibold text-xs text-gray-600 uppercase tracking-wide">
                {d.label}
              </div>
              {[1,2,3,4,5,6].filter(sn => grouped[fc]?.[d.key]?.[sn]).map(sn => (
                <div key={sn} className="px-4 py-2 border-t border-gray-100">
                  <div className="text-xs text-brand font-bold mb-1.5">Session {sn} <span className="text-gray-400 font-normal">{TIMES[sn]}</span></div>
                  <div className="space-y-1.5">
                    {grouped[fc][d.key][sn].map(r => (
                      <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">
                            <span className="text-gray-700">{r.course_code}</span>
                            <span className="text-gray-400 ml-1.5 text-xs">{r.venue}</span>
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            {r.filename} ({(r.file_size / 1024).toFixed(0)} KB)
                            {r.uploader_name && <span className="ml-1">by {r.uploader_name} ({r.uploader_code})</span>}
                            <span className="ml-1">{new Date(r.uploaded_at).toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 ml-2">
                          <button onClick={() => download(r.id, r.filename)}
                            className="text-xs bg-brand text-white px-2.5 py-1 rounded-lg hover:bg-brand-dark">
                            Download
                          </button>
                          {isAdmin && (
                            <button onClick={() => remove(r.id)}
                              className="text-xs text-red-400 hover:text-red-600 px-1.5 py-1">
                              &times;
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}

      {reports.length === 0 && (
        <div className="card text-center py-12">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          <p className="text-gray-400 text-sm">No reports uploaded yet</p>
          <button onClick={() => setShowUpload(true)} className="btn-brand text-sm mt-3">Upload First Report</button>
        </div>
      )}

      {showUpload && <UploadModal isAdmin={isAdmin} faculties={faculties} onClose={() => setShowUpload(false)} onDone={() => { setShowUpload(false); load(); }} />}
    </div>
  );
}

function UploadModal({ isAdmin, faculties, onClose, onDone }) {
  const [step, setStep] = useState(1);
  const [staffCode, setStaffCode] = useState('');
  const [staffInfo, setStaffInfo] = useState(null);
  const [myExams, setMyExams] = useState([]);
  const [myFacultyIds, setMyFacultyIds] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dayFilter, setDayFilter] = useState('all');
  const fileRef = useRef();

  const lookupStaff = async () => {
    if (!staffCode.trim()) return toast.error('Enter staff code');
    try {
      const { data } = await api.get(`/reports/my-exams/${staffCode.trim()}`);
      setStaffInfo(data.staff);

      if (isAdmin && data.exams.length === 0) {
        const { data: allExams } = await api.get('/timetable/exams');
        setMyExams(allExams);
        setMyFacultyIds([]);
      } else {
        setMyExams(data.exams);
        setMyFacultyIds(data.facultyIds);
      }
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Staff not found');
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedExam) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('exam_id', selectedExam.id);
    formData.append('staff_code', staffCode);
    try {
      await api.post('/reports/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Report uploaded!');
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const filteredExams = myExams.filter(e => {
    if (dayFilter !== 'all' && e.day_name !== dayFilter) return false;
    return true;
  });

  const examsBySession = {};
  filteredExams.forEach(e => {
    const k = `${e.day_name}_${e.session_number}`;
    if (!examsBySession[k]) examsBySession[k] = { day: e.day_name, session: e.session_number, exams: [] };
    examsBySession[k].exams.push(e);
  });

  const sortedGroups = Object.values(examsBySession).sort((a, b) => {
    const dayOrder = ['monday','tuesday','wednesday','thursday','friday'];
    return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day) || a.session - b.session;
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b bg-emerald-50">
          <h3 className="font-black text-lg text-gray-900">Upload Biometric Report</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {step === 1 && 'Step 1: Enter your staff code'}
            {step === 2 && 'Step 2: Select your assigned exam'}
            {step === 3 && 'Step 3: Attach Excel file'}
          </p>
          <div className="flex gap-1 mt-2">
            {[1,2,3].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full ${step >= s ? 'bg-emerald-500' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700">Staff Code</label>
                <input value={staffCode} onChange={e => setStaffCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && lookupStaff()}
                  placeholder="e.g. CABE1147" className="w-full border rounded-lg px-3 py-2.5 text-sm mt-1" autoFocus />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="bg-emerald-50 rounded-lg p-2.5 flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-emerald-800">{staffInfo?.name}</span>
                  <span className="text-xs text-emerald-600 ml-2">{staffInfo?.staff_code}</span>
                </div>
                <span className="text-[10px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                  {myExams.length} assigned
                </span>
              </div>

              {myExams.length === 0 ? (
                <div className="text-center py-10">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-gray-500 font-semibold text-sm">Not on schedule</p>
                  <p className="text-gray-400 text-xs mt-1">You have no assigned exam sessions</p>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 overflow-x-auto">
                    <button onClick={() => setDayFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                        dayFilter === 'all' ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600'
                      }`}>All Days</button>
                    {DAYS.map(d => {
                      const hasExams = myExams.some(e => e.day_name === d.key);
                      if (!hasExams) return null;
                      return (
                        <button key={d.key} onClick={() => setDayFilter(d.key)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                            dayFilter === d.key ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600'
                          }`}>{d.label}</button>
                      );
                    })}
                  </div>

                  <div className="space-y-2 max-h-[45vh] overflow-y-auto">
                    {sortedGroups.map(g => {
                      const dayLabel = DAYS.find(d => d.key === g.day)?.label || g.day;
                      return (
                        <div key={`${g.day}_${g.session}`}>
                          <div className="text-xs font-bold text-brand mb-1">{dayLabel} — Session {g.session} <span className="text-gray-400 font-normal">{TIMES[g.session]}</span></div>
                          {g.exams.map(e => (
                            <button key={e.id} onClick={() => { setSelectedExam(e); setStep(3); }}
                              className={`w-full text-left p-2.5 rounded-lg border-2 mb-1 transition-colors ${
                                selectedExam?.id === e.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 hover:border-gray-200'
                              }`}>
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-sm">
                                  {e.course_code}
                                  {e.exam_type && e.exam_type !== 'written' && (
                                    <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                      e.exam_type === 'CBE' ? 'bg-orange-100 text-orange-700' : 'bg-sky-100 text-sky-700'
                                    }`}>{e.exam_type}</span>
                                  )}
                                  <span className="font-normal text-gray-500 ml-1">{e.course_name}</span>
                                </span>
                                <span className={`text-[10px] font-semibold ${
                                  e.faculty_code === 'FOBE' ? 'text-blue-600' :
                                  e.faculty_code === 'Art' ? 'text-purple-600' : 'text-emerald-600'
                                }`}>{e.faculty_code}</span>
                              </div>
                              <div className="text-[10px] text-gray-400 mt-0.5">{e.venue}</div>
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-emerald-50 rounded-lg p-3">
                <p className="font-bold text-sm text-emerald-800">{selectedExam.course_code} — {selectedExam.course_name}</p>
                <p className="text-xs text-emerald-600">
                  {DAYS.find(d => d.key === selectedExam.day_name)?.label} | Session {selectedExam.session_number} | {selectedExam.venue} | {selectedExam.faculty_code}
                </p>
                <p className="text-[10px] text-emerald-500 mt-1">Uploading as: {staffInfo?.name} ({staffInfo?.staff_code})</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Excel File (.xlsx)</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="mt-2 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors"
                >
                  {file ? (
                    <div>
                      <svg className="w-10 h-10 text-emerald-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <p className="text-sm font-bold text-emerald-700">{file.name}</p>
                      <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      <p className="text-sm text-gray-500">Click to select file</p>
                      <p className="text-xs text-gray-400">Excel files only (.xls, .xlsx)</p>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept=".xls,.xlsx" className="hidden"
                  onChange={e => setFile(e.target.files[0])} />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t flex gap-3">
          {step === 1 && (
            <>
              <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
              <button onClick={lookupStaff} className="btn-brand flex-1">Look Up</button>
            </>
          )}
          {step === 2 && (
            <>
              <button onClick={() => { setStep(1); setStaffInfo(null); setMyExams([]); }} className="btn-ghost flex-1">Back</button>
            </>
          )}
          {step === 3 && (
            <>
              <button onClick={() => { setFile(null); setStep(2); }} className="btn-ghost flex-1">Back</button>
              <button onClick={handleUpload} disabled={!file || uploading}
                className="btn-brand flex-1 disabled:opacity-40">
                {uploading ? 'Uploading...' : 'Upload Report'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

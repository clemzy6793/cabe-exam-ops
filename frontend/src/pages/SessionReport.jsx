import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';

const SESSION_TIMES = {
  1: '8:15 - 9:15 AM',
  2: '10:00 - 11:00 AM',
  3: '11:45 - 12:45 PM',
  4: '1:30 - 2:30 PM',
  5: '3:15 - 4:15 PM',
  6: '5:00 - 6:00 PM',
};

export default function SessionReport() {
  const [params] = useSearchParams();
  const [exams, setExams] = useState(null);
  const [loading, setLoading] = useState(true);

  const facultyCode = params.get('faculty') || '';
  const date = params.get('date') || '';
  const session = params.get('session') || '';

  useEffect(() => {
    if (!facultyCode || !date || !session) { setLoading(false); return; }
    api.get('/reports/session-status', { params: { faculty_code: facultyCode, date, session } })
      .then(r => setExams(r.data))
      .catch(() => setExams([]))
      .finally(() => setLoading(false));
  }, [facultyCode, date, session]);

  const dateStr = date ? new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const uploaded = exams?.filter(e => e.reports.length > 0).length || 0;
  const total = exams?.length || 0;

  if (!facultyCode || !date || !session) {
    return (
      <div style={{ fontFamily: 'Arial, sans-serif', padding: 30, textAlign: 'center', color: '#666' }}>
        <p>Missing parameters. Use: ?faculty=FOBE&date=2026-07-07&session=1</p>
        <a href="/lookup" style={{ color: '#1a3a5c' }}>Go to Staff Lookup</a>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px 16px', maxWidth: 900, margin: '0 auto' }}>
      <style dangerouslySetInnerHTML={{ __html: `@media print { .no-print { display: none !important; } }` }} />

      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <a href="/lookup" style={{ fontSize: 14, color: '#1a3a5c', textDecoration: 'none', fontWeight: 600 }}>Back to Lookup</a>
        <button onClick={() => window.print()}
          style={{ padding: '10px 20px', background: '#1a3a5c', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Print this page
        </button>
      </div>

      <h1 style={{ margin: 0, color: '#1a3a5c', fontSize: 20 }}>CABE Exam Operations</h1>
      <p style={{ color: '#666', margin: '4px 0 0', fontSize: 13 }}>Biometric Report Upload Status</p>
      <hr style={{ margin: '12px 0', borderColor: '#c8a951' }} />

      <h2 style={{ margin: 0, fontSize: 18 }}>{facultyCode} — Session {session}</h2>
      <p style={{ color: '#666', margin: '4px 0', fontSize: 13 }}>{dateStr} | {SESSION_TIMES[session]}</p>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#999', marginTop: 30 }}>Loading...</p>
      ) : (
        <>
          <p style={{ margin: '12px 0', fontSize: 14 }}>
            <strong>{uploaded}/{total}</strong> reports uploaded
            {uploaded === total && total > 0 && <span style={{ color: '#065f46', marginLeft: 8 }}>All done!</span>}
          </p>
          <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: 12, fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#1a3a5c', color: '#fff' }}>
                <th style={{ textAlign: 'left', padding: '8px 6px' }}>Code</th>
                <th style={{ textAlign: 'left', padding: '8px 6px' }}>Course</th>
                <th style={{ textAlign: 'left', padding: '8px 6px' }}>Venue</th>
                <th style={{ textAlign: 'left', padding: '8px 6px' }}>Assigned Staff</th>
                <th style={{ textAlign: 'center', padding: '8px 6px' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '8px 6px' }}>Report</th>
              </tr>
            </thead>
            <tbody>
              {exams?.map(exam => (
                <tr key={exam.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '8px 6px', fontWeight: 'bold' }}>{exam.course_code}</td>
                  <td style={{ padding: '8px 6px', fontSize: 12 }}>{exam.course_name}</td>
                  <td style={{ padding: '8px 6px' }}>{exam.venue}</td>
                  <td style={{ padding: '8px 6px', fontSize: 12 }}>{(exam.assigned_staff || []).map(s => s.name).join(', ') || '-'}</td>
                  <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 'bold',
                      background: exam.reports.length ? '#d1fae5' : '#fee2e2',
                      color: exam.reports.length ? '#065f46' : '#991b1b',
                    }}>
                      {exam.reports.length ? 'Done' : 'Missing'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 6px', fontSize: 11 }}>
                    {exam.reports.length ? exam.reports.map((r, i) => (
                      <div key={i}>{r.uploader_name || 'Unknown'} — {r.filename}</div>
                    )) : <span style={{ color: '#dc2626', fontWeight: 'bold' }}>NOT UPLOADED</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginTop: 20, color: '#999', fontSize: 11 }}>Generated from CABE Exam Ops System | examops.campusmarketgh.com</p>
        </>
      )}
    </div>
  );
}

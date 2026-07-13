import { useState, useRef } from 'react';
import api from '../api';

const FIXED_DAYS = [
  { key: 'Mon Jul 06 2026', label: 'Mon 6th' },
  { key: 'Tue Jul 07 2026', label: 'Tue 7th' },
  { key: 'Wed Jul 08 2026', label: 'Wed 8th' },
  { key: 'Thu Jul 09 2026', label: 'Thu 9th' },
  { key: 'Fri Jul 10 2026', label: 'Fri 10th' },
];

const FACULTY_MAP = {
  'Architecture': 'FOBE',
  'Centre for Settlement Studies': 'FOBE',
  'Construction Technology and Management': 'FOBE',
  'Development Office': 'FOBE',
  "Dean's Office - Faculty of Built Environment": 'FOBE',
  'Land Economy': 'FOBE',
  'Planning': 'FOBE',
  'Communication Design': 'Art',
  "Dean's Office - Faculty of Art": 'Art',
  'Indigenous Art and Technology': 'Art',
  'Industrial Art': 'Art',
  'Painting and Sculpture': 'Art',
  'Publishing Studies': 'Art',
  "Dean's Office - Faculty of Educational Studies": 'Education',
  'Educational Innovations in Science and Technology': 'Education',
  'Teacher Education': 'Education',
};

const FACULTY_LABELS = {
  all: 'All Staff',
  FOBE: 'Built Environment',
  Art: 'Faculty of Art',
  Education: 'Educational Studies',
  Other: 'Other / Central',
};

const DEFAULT_RATES = {
  'Senior Member (Academic)': 100,
  'Contract Staff': 50,
  'Senior Staff': 50,
  'Part Time': 100,
  'Junior Staff': 30,
  'Senior Member (Administrative)': 50,
};

function getFaculty(dept) {
  return FACULTY_MAP[dept] || 'Other';
}

function getDayVal(r, key) {
  return r.breakdown[key] || 0;
}

function RateEditor({ rates, onChange }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-blue-800 mb-3">Payment Rates (GHS per session) — edit & recalculate instantly</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Object.entries(rates).map(([type, val]) => (
          <div key={type}>
            <label className="block text-xs font-medium text-gray-600 mb-1">{type}</label>
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
              <span className="px-2 py-1.5 bg-gray-50 text-gray-400 text-xs border-r border-gray-200">GHS</span>
              <input
                type="number" min="0" step="0.01" value={val}
                onChange={e => onChange({ ...rates, [type]: parseFloat(e.target.value) || 0 })}
                className="flex-1 px-2 py-1.5 text-sm outline-none w-20"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StaffTable({ rows, rates, faculty, title, badge }) {
  const filtered = rows.filter(r => faculty === 'all' || getFaculty(r.department) === faculty);

  const getRate = r => rates[r.staffType] || 50;
  const getTotal = r => FIXED_DAYS.reduce((s, d) => s + getDayVal(r, d.key), 0);
  const getGross = r => getTotal(r) * getRate(r);
  const getNet = r => getGross(r) * 0.9;

  const grandGross = filtered.reduce((s, r) => s + getGross(r), 0);
  const grandNet = filtered.reduce((s, r) => s + getNet(r), 0);

  const printReport = () => {
    const win = window.open('', '_blank');
    const facultyLabel = FACULTY_LABELS[faculty] || 'All';
    const header = `<tr>
      <th>#</th><th>Staff ID</th><th>Full Name</th><th>Department</th><th>Designation</th><th>Staff Type</th>
      ${FIXED_DAYS.map(d => `<th>${d.label}</th>`).join('')}
      <th>Total</th><th>Rate</th><th>Gross</th><th>10%</th><th>Net</th>
    </tr>`;
    const rows2 = filtered.map((r, i) => `<tr>
      <td>${i + 1}</td><td style="font-family:monospace">${r.staffId}</td>
      <td>${r.fullName}</td><td>${r.department}</td>
      <td>${r.designation}</td><td>${r.staffType}</td>
      ${FIXED_DAYS.map(d => `<td style="text-align:center">${getDayVal(r, d.key) || '-'}</td>`).join('')}
      <td style="text-align:center;font-weight:bold">${getTotal(r)}</td>
      <td style="text-align:right">${getRate(r).toFixed(2)}</td>
      <td style="text-align:right">${getGross(r).toFixed(2)}</td>
      <td style="text-align:right">${(getGross(r) * 0.10).toFixed(2)}</td>
      <td style="text-align:right;font-weight:bold">${getNet(r).toFixed(2)}</td>
    </tr>`).join('');
    const totalRow = `<tr style="background:#FFF2CC;font-weight:bold;">
      <td colspan="6">TOTAL (${filtered.length} staff)</td>
      ${FIXED_DAYS.map(d => `<td style="text-align:center">${filtered.reduce((s, r) => s + getDayVal(r, d.key), 0)}</td>`).join('')}
      <td style="text-align:center">${filtered.reduce((s, r) => s + getTotal(r), 0)}</td>
      <td></td>
      <td style="text-align:right">${grandGross.toFixed(2)}</td>
      <td style="text-align:right">${(grandGross * 0.10).toFixed(2)}</td>
      <td style="text-align:right">${grandNet.toFixed(2)}</td>
    </tr>`;
    win.document.write(`<!DOCTYPE html><html><head><title>${title} — ${facultyLabel}</title>
      <style>body{font-family:Arial,sans-serif;padding:30px;}table{border-collapse:collapse;width:100%;margin-top:15px;font-size:11px;}
      th{background:#1a3a5c;color:#fff;padding:7px 6px;text-align:left;border:1px solid #1a3a5c;}
      td{padding:6px;border:1px solid #ddd;} @media print{button{display:none;}}</style>
    </head><body>
      <h2 style="margin:0;color:#1a3a5c;">CABE Exam Operations — ${title}</h2>
      <p style="color:#666;margin:4px 0;">${facultyLabel} | Mid-Semester 2025/2026 | 6th–10th July 2026</p>
      <p style="font-size:11px;color:#888;">10% deduction applied to gross</p>
      <hr style="margin:12px 0;border-color:#c8a951;">
      <table><thead>${header}</thead><tbody>${rows2}${totalRow}</tbody></table>
      <p style="margin-top:15px;font-size:11px;color:#999;">Staff: ${filtered.length} | Net Total: GHS ${grandNet.toFixed(2)}</p>
      <button onclick="window.print()" style="margin-top:15px;padding:10px 20px;background:#1a3a5c;color:#fff;border:none;border-radius:6px;cursor:pointer;">Print</button>
    </body></html>`);
    win.document.close();
  };

  const exportExcel = () => {
    const facultyLabel = FACULTY_LABELS[faculty] || 'All';
    let xml = '<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n';
    xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
    xml += '<Styles><Style ss:ID="h"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#1a3a5c" ss:Pattern="Solid"/></Style>';
    xml += '<Style ss:ID="tot"><Font ss:Bold="1"/><Interior ss:Color="#FFF2CC" ss:Pattern="Solid"/></Style></Styles>\n';
    xml += `<Worksheet ss:Name="${title.substring(0,25)} ${facultyLabel.substring(0,5)}">\n<Table>\n`;
    const cols = ['#','Staff ID','Full Name','Department','Designation','Staff Type',
      ...FIXED_DAYS.map(d => d.label),'Total','Rate (GHS)','Gross','10% Ded.','Net'];
    xml += '<Row>' + cols.map(c => `<Cell ss:StyleID="h"><Data ss:Type="String">${c}</Data></Cell>`).join('') + '</Row>\n';
    filtered.forEach((r, i) => {
      xml += '<Row>';
      xml += `<Cell><Data ss:Type="Number">${i+1}</Data></Cell>`;
      xml += `<Cell><Data ss:Type="String">${r.staffId}</Data></Cell>`;
      xml += `<Cell><Data ss:Type="String">${r.fullName}</Data></Cell>`;
      xml += `<Cell><Data ss:Type="String">${r.department}</Data></Cell>`;
      xml += `<Cell><Data ss:Type="String">${r.designation}</Data></Cell>`;
      xml += `<Cell><Data ss:Type="String">${r.staffType}</Data></Cell>`;
      FIXED_DAYS.forEach(d => xml += `<Cell><Data ss:Type="Number">${getDayVal(r, d.key)}</Data></Cell>`);
      xml += `<Cell><Data ss:Type="Number">${getTotal(r)}</Data></Cell>`;
      xml += `<Cell><Data ss:Type="Number">${getRate(r)}</Data></Cell>`;
      xml += `<Cell><Data ss:Type="Number">${getGross(r).toFixed(2)}</Data></Cell>`;
      xml += `<Cell><Data ss:Type="Number">${(getGross(r)*0.10).toFixed(2)}</Data></Cell>`;
      xml += `<Cell><Data ss:Type="Number">${getNet(r).toFixed(2)}</Data></Cell>`;
      xml += '</Row>\n';
    });
    xml += '<Row>';
    xml += `<Cell ss:StyleID="tot"></Cell><Cell ss:StyleID="tot"></Cell>`;
    xml += `<Cell ss:StyleID="tot"><Data ss:Type="String">TOTAL (${filtered.length})</Data></Cell>`;
    xml += `<Cell ss:StyleID="tot"></Cell><Cell ss:StyleID="tot"></Cell><Cell ss:StyleID="tot"></Cell>`;
    FIXED_DAYS.forEach(d => xml += `<Cell ss:StyleID="tot"><Data ss:Type="Number">${filtered.reduce((s,r)=>s+getDayVal(r,d.key),0)}</Data></Cell>`);
    xml += `<Cell ss:StyleID="tot"><Data ss:Type="Number">${filtered.reduce((s,r)=>s+getTotal(r),0)}</Data></Cell>`;
    xml += `<Cell ss:StyleID="tot"></Cell>`;
    xml += `<Cell ss:StyleID="tot"><Data ss:Type="Number">${grandGross.toFixed(2)}</Data></Cell>`;
    xml += `<Cell ss:StyleID="tot"><Data ss:Type="Number">${(grandGross*0.10).toFixed(2)}</Data></Cell>`;
    xml += `<Cell ss:StyleID="tot"><Data ss:Type="Number">${grandNet.toFixed(2)}</Data></Cell>`;
    xml += '</Row>\n</Table>\n</Worksheet>\n</Workbook>';
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CABE_${title.replace(/\s+/g,'_')}_${facultyLabel.replace(/\s+/g,'_')}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${badge}`}>{title}</span>
          <span className="text-sm text-gray-500">{filtered.length} staff</span>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Export Excel
          </button>
          <button onClick={printReport}
            className="bg-gray-800 hover:bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs">#</th>
                <th className="px-3 py-2.5 text-left text-xs">Staff ID</th>
                <th className="px-3 py-2.5 text-left text-xs">Full Name</th>
                <th className="px-3 py-2.5 text-left text-xs">Department</th>
                <th className="px-3 py-2.5 text-left text-xs">Designation</th>
                <th className="px-3 py-2.5 text-left text-xs">Staff Type</th>
                {FIXED_DAYS.map(d => (
                  <th key={d.key} className="px-3 py-2.5 text-center text-xs whitespace-nowrap">{d.label}</th>
                ))}
                <th className="px-3 py-2.5 text-center text-xs font-bold">Total</th>
                <th className="px-3 py-2.5 text-right text-xs">Rate</th>
                <th className="px-3 py-2.5 text-right text-xs">Gross</th>
                <th className="px-3 py-2.5 text-right text-xs">10%</th>
                <th className="px-3 py-2.5 text-right text-xs">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan={12 + FIXED_DAYS.length} className="px-4 py-6 text-center text-gray-400 text-sm">No staff in this faculty</td></tr>
              )}
              {filtered.map((r, i) => (
                <tr key={r.staffId + i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-500">{r.staffId}</td>
                  <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{r.fullName}</td>
                  <td className="px-3 py-2 text-gray-600 text-xs">{r.department}</td>
                  <td className="px-3 py-2 text-gray-600 text-xs whitespace-nowrap">{r.designation}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{r.staffType}</span>
                  </td>
                  {FIXED_DAYS.map(d => (
                    <td key={d.key} className="px-3 py-2 text-center text-sm">
                      {getDayVal(r, d.key) || <span className="text-gray-300">-</span>}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center font-bold text-gray-900">{getTotal(r)}</td>
                  <td className="px-3 py-2 text-right text-gray-500 text-xs">{getRate(r).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right text-gray-700">{getGross(r).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right text-gray-400 text-xs">{(getGross(r)*0.10).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-bold text-gray-900">{getNet(r).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-yellow-50 border-t-2 border-yellow-300">
              <tr>
                <td colSpan={6} className="px-3 py-2.5 font-bold text-gray-800 text-sm">TOTAL — {filtered.length} staff</td>
                {FIXED_DAYS.map(d => (
                  <td key={d.key} className="px-3 py-2.5 text-center font-bold text-gray-800">
                    {filtered.reduce((s, r) => s + getDayVal(r, d.key), 0)}
                  </td>
                ))}
                <td className="px-3 py-2.5 text-center font-bold text-gray-800">{filtered.reduce((s,r)=>s+getTotal(r),0)}</td>
                <td></td>
                <td className="px-3 py-2.5 text-right font-bold text-gray-800">{grandGross.toFixed(2)}</td>
                <td className="px-3 py-2.5 text-right font-bold text-gray-600">{(grandGross*0.10).toFixed(2)}</td>
                <td className="px-3 py-2.5 text-right font-bold text-green-700">{grandNet.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function InvigilationAllowances() {
  const [rates, setRates] = useState(DEFAULT_RATES);
  const [invigilators, setInvigilators] = useState(null);
  const [officeStaff, setOfficeStaff] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [faculty, setFaculty] = useState('all');
  const fileRef = useRef();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files[0];
    if (!file) { setError('Please select an Excel file'); return; }
    setError('');
    setLoading(true);
    setInvigilators(null);
    setOfficeStaff(null);

    const form = new FormData();
    form.append('file', file);

    try {
      const { data } = await api.post('/allowances/calculate', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setInvigilators(data.invigilators);
      setOfficeStaff(data.officeStaff);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const hasResults = invigilators !== null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Invigilation Allowances</h1>
        <p className="text-sm text-gray-500 mt-1">Mid-Semester 2025/2026 · 6th–10th July 2026</p>
      </div>

      {/* Upload form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Upload Attendance File</h2>
        <p className="text-xs text-gray-500">
          Required columns: <code className="bg-gray-100 px-1 rounded">STAFFID, FULL_NAME, DEPARTMENT, DESIGNATION, STAFF_TYPE, MINUTES_PER_DAY</code>
        </p>
        <input ref={fileRef} type="file" accept=".xlsx,.xls"
          className="block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-dark file:text-white hover:file:opacity-90"
        />
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>}
        <button type="submit" disabled={loading}
          className="px-6 py-2.5 bg-brand-dark text-white rounded-lg text-sm font-semibold disabled:opacity-60">
          {loading ? 'Calculating…' : 'Calculate Allowances'}
        </button>
      </form>

      {hasResults && (
        <div className="space-y-6">
          {/* Editable rates */}
          <RateEditor rates={rates} onChange={setRates} />

          {/* Faculty tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {['all','FOBE','Art','Education','Other'].map(f => (
              <button key={f} onClick={() => setFaculty(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  faculty === f ? 'bg-brand-dark text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}>
                {FACULTY_LABELS[f]}
              </button>
            ))}
          </div>

          {/* Invigilators table */}
          <StaffTable
            rows={invigilators}
            rates={rates}
            faculty={faculty}
            title="Exam Invigilators"
            badge="bg-blue-100 text-blue-800"
          />

          {/* Office / biometric staff table */}
          <StaffTable
            rows={officeStaff}
            rates={rates}
            faculty={faculty}
            title="Office / Support Staff (Biometric)"
            badge="bg-amber-100 text-amber-800"
          />
        </div>
      )}
    </div>
  );
}

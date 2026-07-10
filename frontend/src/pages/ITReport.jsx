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

const RATE_SENIOR_MEMBER = 60;
const RATE_SENIOR_STAFF = 30;

export default function ITReport() {
  const [data, setData] = useState([]);
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState('assignments');

  useEffect(() => {
    api.get('/assignments/it-report').then(r => setData(r.data));
  }, []);

  const getTotal = (staff) => Object.values(staff.days).reduce((s, d) => s + new Set(d.map(a => a.session)).size, 0);
  const getDayCount = (staff, day) => new Set((staff.days[day] || []).map(a => a.session)).size;
  const getRate = (staff) => staff.category === 'senior_member' ? RATE_SENIOR_MEMBER : RATE_SENIOR_STAFF;
  const getDayAmount = (staff, day) => getDayCount(staff, day) * 2 * getRate(staff);
  const getWeeklyGross = (staff) => DAYS.reduce((sum, d) => sum + getDayAmount(staff, d.key), 0);
  const getWeeklyNet = (staff) => {
    const gross = getWeeklyGross(staff);
    return gross - (gross * 0.10);
  };

  const sorted = [...data].sort((a, b) => getTotal(b) - getTotal(a));

  const grandTotalGross = sorted.reduce((s, d) => s + getWeeklyGross(d), 0);
  const grandTotalNet = sorted.reduce((s, d) => s + getWeeklyNet(d), 0);

  const exportExcel = () => {
    let xml = '<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n';
    xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
    xml += '<Styles>\n';
    xml += '<Style ss:ID="header"><Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="11"/><Interior ss:Color="#1a3a5c" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center"/></Style>\n';
    xml += '<Style ss:ID="title"><Font ss:Bold="1" ss:Size="14" ss:Color="#1a3a5c"/></Style>\n';
    xml += '<Style ss:ID="subtitle"><Font ss:Italic="1" ss:Size="10" ss:Color="#666666"/></Style>\n';
    xml += '<Style ss:ID="dayHeader"><Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="10"/><Interior ss:Color="#2E75B6" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center"/></Style>\n';
    xml += '<Style ss:ID="num"><NumberFormat ss:Format="#,##0.00"/><Alignment ss:Horizontal="Right"/></Style>\n';
    xml += '<Style ss:ID="numBold"><Font ss:Bold="1"/><NumberFormat ss:Format="#,##0.00"/><Alignment ss:Horizontal="Right"/></Style>\n';
    xml += '<Style ss:ID="center"><Alignment ss:Horizontal="Center"/></Style>\n';
    xml += '<Style ss:ID="bold"><Font ss:Bold="1"/></Style>\n';
    xml += '<Style ss:ID="totalRow"><Font ss:Bold="1" ss:Size="11"/><Interior ss:Color="#FFF2CC" ss:Pattern="Solid"/></Style>\n';
    xml += '<Style ss:ID="totalNum"><Font ss:Bold="1" ss:Size="11"/><Interior ss:Color="#FFF2CC" ss:Pattern="Solid"/><NumberFormat ss:Format="#,##0.00"/><Alignment ss:Horizontal="Right"/></Style>\n';
    xml += '<Style ss:ID="smBadge"><Font ss:Bold="1" ss:Color="#92400E"/><Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center"/></Style>\n';
    xml += '<Style ss:ID="ssBadge"><Font ss:Bold="1" ss:Color="#065F46"/><Interior ss:Color="#D1FAE5" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center"/></Style>\n';
    xml += '</Styles>\n';

    // Sheet 1: Payment Summary
    xml += '<Worksheet ss:Name="Payment Summary">\n<Table>\n';
    xml += '<Column ss:Width="30"/><Column ss:Width="80"/><Column ss:Width="180"/><Column ss:Width="90"/>';
    DAYS.forEach(() => { xml += '<Column ss:Width="85"/><Column ss:Width="65"/>'; });
    xml += '<Column ss:Width="80"/><Column ss:Width="80"/><Column ss:Width="80"/><Column ss:Width="80"/>\n';

    // Title rows
    xml += '<Row><Cell ss:StyleID="title"><Data ss:Type="String">CABE Exam Operations — IT Staff Payment Report</Data></Cell></Row>\n';
    xml += '<Row><Cell ss:StyleID="subtitle"><Data ss:Type="String">Mid-Semester Examinations 2025/2026 | 6th - 10th July, 2026</Data></Cell></Row>\n';
    xml += '<Row></Row>\n';

    // Headers
    xml += '<Row>';
    xml += '<Cell ss:StyleID="header"><Data ss:Type="String">No.</Data></Cell>';
    xml += '<Cell ss:StyleID="header"><Data ss:Type="String">Code</Data></Cell>';
    xml += '<Cell ss:StyleID="header"><Data ss:Type="String">Name</Data></Cell>';
    xml += '<Cell ss:StyleID="header"><Data ss:Type="String">Grade</Data></Cell>';
    DAYS.forEach(d => {
      xml += `<Cell ss:StyleID="dayHeader"><Data ss:Type="String">${d.label} Sess.</Data></Cell>`;
      xml += `<Cell ss:StyleID="dayHeader"><Data ss:Type="String">${d.label} (GHS)</Data></Cell>`;
    });
    xml += '<Cell ss:StyleID="header"><Data ss:Type="String">Total Sess.</Data></Cell>';
    xml += '<Cell ss:StyleID="header"><Data ss:Type="String">Gross (GHS)</Data></Cell>';
    xml += '<Cell ss:StyleID="header"><Data ss:Type="String">10% Ded.</Data></Cell>';
    xml += '<Cell ss:StyleID="header"><Data ss:Type="String">Net (GHS)</Data></Cell>';
    xml += '</Row>\n';

    sorted.forEach((s, i) => {
      const rate = getRate(s);
      const totalSessions = getTotal(s);
      const gross = getWeeklyGross(s);
      const deduction = gross * 0.10;
      const net = gross - deduction;
      const catLabel = s.category === 'senior_member' ? 'Senior Member' : 'Senior Staff';
      const catStyle = s.category === 'senior_member' ? 'smBadge' : 'ssBadge';

      xml += '<Row>';
      xml += `<Cell ss:StyleID="center"><Data ss:Type="Number">${i + 1}</Data></Cell>`;
      xml += `<Cell><Data ss:Type="String">${s.staff_code}</Data></Cell>`;
      xml += `<Cell><Data ss:Type="String">${s.name}</Data></Cell>`;
      xml += `<Cell ss:StyleID="${catStyle}"><Data ss:Type="String">${catLabel}</Data></Cell>`;
      DAYS.forEach(d => {
        const daySess = getDayCount(s, d.key);
        const dayAmt = getDayAmount(s, d.key);
        xml += `<Cell ss:StyleID="center"><Data ss:Type="Number">${daySess}</Data></Cell>`;
        xml += `<Cell ss:StyleID="num"><Data ss:Type="Number">${dayAmt}</Data></Cell>`;
      });
      xml += `<Cell ss:StyleID="center"><Data ss:Type="Number">${totalSessions}</Data></Cell>`;
      xml += `<Cell ss:StyleID="numBold"><Data ss:Type="Number">${gross}</Data></Cell>`;
      xml += `<Cell ss:StyleID="num"><Data ss:Type="Number">${deduction}</Data></Cell>`;
      xml += `<Cell ss:StyleID="numBold"><Data ss:Type="Number">${net}</Data></Cell>`;
      xml += '</Row>\n';
    });

    // Total row
    xml += '<Row>';
    xml += '<Cell ss:StyleID="totalRow"></Cell>';
    xml += '<Cell ss:StyleID="totalRow"></Cell>';
    xml += `<Cell ss:StyleID="totalRow"><Data ss:Type="String">TOTAL (${sorted.length} staff)</Data></Cell>`;
    xml += '<Cell ss:StyleID="totalRow"></Cell>';
    DAYS.forEach(d => {
      const dayTotal = sorted.reduce((s, st) => s + getDayCount(st, d.key), 0);
      const dayAmtTotal = sorted.reduce((s, st) => s + getDayAmount(st, d.key), 0);
      xml += `<Cell ss:StyleID="totalNum"><Data ss:Type="Number">${dayTotal}</Data></Cell>`;
      xml += `<Cell ss:StyleID="totalNum"><Data ss:Type="Number">${dayAmtTotal}</Data></Cell>`;
    });
    const totalSess = sorted.reduce((s, st) => s + getTotal(st), 0);
    xml += `<Cell ss:StyleID="totalNum"><Data ss:Type="Number">${totalSess}</Data></Cell>`;
    xml += `<Cell ss:StyleID="totalNum"><Data ss:Type="Number">${grandTotalGross}</Data></Cell>`;
    xml += `<Cell ss:StyleID="totalNum"><Data ss:Type="Number">${grandTotalGross * 0.10}</Data></Cell>`;
    xml += `<Cell ss:StyleID="totalNum"><Data ss:Type="Number">${grandTotalNet}</Data></Cell>`;
    xml += '</Row>\n';

    // Rate legend
    xml += '<Row></Row>\n';
    xml += '<Row><Cell></Cell><Cell ss:StyleID="bold"><Data ss:Type="String">Rate Legend:</Data></Cell></Row>\n';
    xml += '<Row><Cell></Cell><Cell><Data ss:Type="String">Senior Member: GHS 60/hr × 2 hrs per session</Data></Cell></Row>\n';
    xml += '<Row><Cell></Cell><Cell><Data ss:Type="String">Senior Staff: GHS 30/hr × 2 hrs per session</Data></Cell></Row>\n';
    xml += '<Row><Cell></Cell><Cell><Data ss:Type="String">Deduction: 10% of gross</Data></Cell></Row>\n';

    xml += '</Table>\n</Worksheet>\n';
    xml += '</Workbook>';

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'CABE_IT_Staff_Payment_Report.xls';
    a.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    const win = window.open('', '_blank');
    const header = `<tr><th style="padding:8px;border:1px solid #ddd;text-align:left;">Name</th><th style="padding:8px;border:1px solid #ddd;">Code</th><th style="padding:8px;border:1px solid #ddd;">Grade</th>` +
      DAYS.map(d => `<th style="padding:8px;border:1px solid #ddd;">${d.label} ${d.date}</th>`).join('') +
      `<th style="padding:8px;border:1px solid #ddd;font-weight:bold;">Total</th>` +
      `<th style="padding:8px;border:1px solid #ddd;">Gross</th>` +
      `<th style="padding:8px;border:1px solid #ddd;">10%</th>` +
      `<th style="padding:8px;border:1px solid #ddd;">Net</th></tr>`;
    const rows = sorted.map(s => {
      const total = getTotal(s);
      const gross = getWeeklyGross(s);
      const ded = gross * 0.10;
      const net = gross - ded;
      const catLabel = s.category === 'senior_member' ? 'Sr. Member' : 'Sr. Staff';
      const roleBadges = (s.faculty_roles || []).map(fr =>
        `<span style="display:inline-block;font-size:9px;padding:1px 5px;border-radius:9px;font-weight:bold;margin-left:4px;${
          fr.role === 'printing' ? 'background:#ede9fe;color:#6d28d9;' : 'background:#cffafe;color:#0e7490;'
        }">${fr.role} (${fr.faculty_code})</span>`
      ).join('');
      return `<tr><td style="padding:8px;border:1px solid #ddd;">${s.name}${roleBadges}</td><td style="padding:8px;border:1px solid #ddd;font-family:monospace;font-size:12px;">${s.staff_code}</td><td style="padding:8px;border:1px solid #ddd;text-align:center;font-size:11px;">${catLabel}</td>` +
        DAYS.map(d => `<td style="padding:8px;border:1px solid #ddd;text-align:center;">${getDayCount(s, d.key) || '-'}</td>`).join('') +
        `<td style="padding:8px;border:1px solid #ddd;text-align:center;font-weight:bold;">${total}</td>` +
        `<td style="padding:8px;border:1px solid #ddd;text-align:right;">${gross.toFixed(2)}</td>` +
        `<td style="padding:8px;border:1px solid #ddd;text-align:right;">${ded.toFixed(2)}</td>` +
        `<td style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:bold;">${net.toFixed(2)}</td></tr>`;
    }).join('');
    const totalRow = `<tr style="background:#FFF2CC;font-weight:bold;"><td style="padding:8px;border:1px solid #ddd;" colspan="3">TOTAL (${sorted.length} staff)</td>` +
      DAYS.map(d => `<td style="padding:8px;border:1px solid #ddd;text-align:center;">${sorted.reduce((s, st) => s + getDayCount(st, d.key), 0)}</td>`).join('') +
      `<td style="padding:8px;border:1px solid #ddd;text-align:center;">${sorted.reduce((s, st) => s + getTotal(st), 0)}</td>` +
      `<td style="padding:8px;border:1px solid #ddd;text-align:right;">${grandTotalGross.toFixed(2)}</td>` +
      `<td style="padding:8px;border:1px solid #ddd;text-align:right;">${(grandTotalGross * 0.10).toFixed(2)}</td>` +
      `<td style="padding:8px;border:1px solid #ddd;text-align:right;">${grandTotalNet.toFixed(2)}</td></tr>`;
    win.document.write(`<!DOCTYPE html><html><head><title>IT Staff Payment Report</title>
      <style>body{font-family:Arial,sans-serif;padding:30px;}table{border-collapse:collapse;width:100%;margin-top:15px;font-size:12px;}th{background:#1a3a5c;color:#fff;} @media print{button{display:none;}}</style>
    </head><body>
      <h1 style="margin:0;color:#1a3a5c;">CABE Exam Operations</h1>
      <p style="color:#666;margin:4px 0;">IT Staff Payment Report — Mid-Semester 2025/2026 | 6th - 10th July, 2026</p>
      <p style="font-size:11px;color:#888;">Senior Member: GHS 60/hr | Senior Staff: GHS 30/hr | Each session = 2 hrs | 10% deduction applied</p>
      <hr style="margin:15px 0;border-color:#c8a951;">
      <table>${header}${rows}${totalRow}</table>
      <p style="margin-top:15px;font-size:12px;color:#999;">Total IT Staff: ${sorted.length} | Grand Total Net: GHS ${grandTotalNet.toFixed(2)} | Generated from CABE Exam Ops System</p>
      <button onclick="window.print()" style="margin-top:15px;padding:10px 20px;background:#1a3a5c;color:#fff;border:none;border-radius:6px;cursor:pointer;">Print</button>
    </body></html>`);
    win.document.close();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">IT Staff Report</h1>
          <p className="text-sm text-gray-500 mt-1">Session assignments & payment calculations</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg font-semibold flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Export Excel
          </button>
          <button onClick={printReport} className="btn-brand text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print Report
          </button>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-2">
        <button onClick={() => setView('assignments')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${
            view === 'assignments' ? 'bg-brand text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
          }`}>
          Assignments View
        </button>
        <button onClick={() => setView('payment')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${
            view === 'payment' ? 'bg-emerald-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
          }`}>
          Payment View
        </button>
      </div>

      {view === 'assignments' && (
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
      )}

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
          <p className="text-xs text-gray-500">Total Sessions</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-black text-amber-600">
            GHS {grandTotalGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500">Total Gross</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-black text-green-600">
            GHS {grandTotalNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500">Total Net (after 10%)</p>
        </div>
      </div>

      {/* Payment View */}
      {view === 'payment' && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand/5 border-b">
                  <th className="text-left px-3 py-3 font-bold text-gray-700 sticky left-0 bg-white z-10">Name</th>
                  <th className="text-center px-2 py-3 font-bold text-gray-700">Grade</th>
                  <th className="text-center px-2 py-3 font-bold text-gray-700">Rate</th>
                  {DAYS.map(d => (
                    <th key={d.key} className="text-center px-2 py-3 font-bold text-gray-600 text-xs">
                      <div>{d.label}</div>
                      <div className="text-[10px] text-gray-400 font-normal">Sess. | GHS</div>
                    </th>
                  ))}
                  <th className="text-center px-2 py-3 font-black text-brand">Total Sess.</th>
                  <th className="text-right px-3 py-3 font-bold text-gray-700">Gross</th>
                  <th className="text-right px-3 py-3 font-bold text-red-500">10%</th>
                  <th className="text-right px-3 py-3 font-black text-emerald-700">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sorted.map(s => {
                  const rate = getRate(s);
                  const totalSessions = getTotal(s);
                  const gross = getWeeklyGross(s);
                  const deduction = gross * 0.10;
                  const net = gross - deduction;

                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5 sticky left-0 bg-white z-10">
                        <div className="font-medium text-xs">{s.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{s.staff_code}</div>
                      </td>
                      <td className="text-center px-2 py-2.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          s.category === 'senior_member' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {s.category === 'senior_member' ? 'Sr. Mem' : 'Sr. Staff'}
                        </span>
                      </td>
                      <td className="text-center px-2 py-2.5 text-xs font-mono">{rate}</td>
                      {DAYS.map(d => {
                        const daySess = getDayCount(s, d.key);
                        const dayAmt = getDayAmount(s, d.key);
                        return (
                          <td key={d.key} className="text-center px-2 py-2.5 text-xs">
                            {daySess > 0 ? (
                              <div>
                                <span className="inline-block min-w-[20px] px-1 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">{daySess}</span>
                                <div className="text-[10px] text-gray-500 mt-0.5">{dayAmt.toFixed(0)}</div>
                              </div>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="text-center px-2 py-2.5">
                        <span className={`inline-block min-w-[28px] px-2 py-0.5 rounded-full text-xs font-black ${
                          totalSessions === 0 ? 'bg-red-100 text-red-600' : 'bg-brand/10 text-brand'
                        }`}>{totalSessions}</span>
                      </td>
                      <td className="text-right px-3 py-2.5 font-semibold text-sm">{gross.toFixed(2)}</td>
                      <td className="text-right px-3 py-2.5 text-red-500 text-xs">{deduction.toFixed(2)}</td>
                      <td className="text-right px-3 py-2.5 font-black text-emerald-700 text-sm">{net.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-amber-50 border-t-2 border-brand">
                  <td className="px-3 py-3 font-black sticky left-0 bg-amber-50 z-10" colSpan={3}>TOTAL ({sorted.length} staff)</td>
                  {DAYS.map(d => {
                    const dayTotal = sorted.reduce((s, st) => s + getDayCount(st, d.key), 0);
                    const dayAmtTotal = sorted.reduce((s, st) => s + getDayAmount(st, d.key), 0);
                    return (
                      <td key={d.key} className="text-center px-2 py-3 font-bold text-xs">
                        <span className="bg-brand/10 text-brand px-1.5 py-0.5 rounded-full">{dayTotal}</span>
                        <div className="text-[10px] text-gray-600 mt-0.5">{dayAmtTotal.toFixed(0)}</div>
                      </td>
                    );
                  })}
                  <td className="text-center px-2 py-3 font-black text-brand">{sorted.reduce((s, st) => s + getTotal(st), 0)}</td>
                  <td className="text-right px-3 py-3 font-black text-sm">{grandTotalGross.toFixed(2)}</td>
                  <td className="text-right px-3 py-3 font-bold text-red-500 text-sm">{(grandTotalGross * 0.10).toFixed(2)}</td>
                  <td className="text-right px-3 py-3 font-black text-emerald-700 text-sm">{grandTotalNet.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Assignments View */}
      {view === 'assignments' && (
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
                        <td className="px-4 py-2.5">
                          <div className="font-medium">{s.name}</div>
                          <div className="flex gap-1 mt-0.5 flex-wrap">
                            {s.category && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                s.category === 'senior_member' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                              }`}>{s.category === 'senior_member' ? 'Sr. Member' : 'Sr. Staff'}</span>
                            )}
                            {s.faculty_roles?.length > 0 && s.faculty_roles.map((fr, i) => (
                              <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                fr.role === 'printing' ? 'bg-violet-100 text-violet-700' : 'bg-cyan-100 text-cyan-700'
                              }`}>{fr.role} ({fr.faculty_code})</span>
                            ))}
                          </div>
                        </td>
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
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{s.name}</div>
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {s.category && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                              s.category === 'senior_member' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                            }`}>{s.category === 'senior_member' ? 'Sr. Member' : 'Sr. Staff'}</span>
                          )}
                          {s.faculty_roles?.length > 0 && s.faculty_roles.map((fr, i) => (
                            <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                              fr.role === 'printing' ? 'bg-violet-100 text-violet-700' : 'bg-cyan-100 text-cyan-700'
                            }`}>{fr.role} ({fr.faculty_code})</span>
                          ))}
                        </div>
                      </td>
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
      )}

      {data.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-gray-400 text-sm">No IT staff found</p>
        </div>
      )}
    </div>
  );
}

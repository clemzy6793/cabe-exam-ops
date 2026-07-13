const router = require('express').Router();
const multer = require('multer');
const XLSX = require('xlsx');
const { authAdmin } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.originalname.match(/\.xlsx?$/i)) cb(null, true);
    else cb(new Error('Only Excel files are allowed'));
  },
});

// Parse "Mon Jul 06 2026(60), Tue Jul 07 2026(120)" → sum of all parenthesised numbers
function parseMinutesPerDay(str) {
  if (!str) return [];
  const entries = [];
  const regex = /(\w{3}\s+\w{3}\s+\d{1,2}\s+\d{4})\((\d+)\)/g;
  let m;
  while ((m = regex.exec(str)) !== null) {
    entries.push({ day: m[1].trim(), value: parseInt(m[2], 10) });
  }
  return entries;
}

function classifyStaff(staffType, designation) {
  const st = (staffType || '').toLowerCase();
  const des = (designation || '').toLowerCase();

  // Academic/invigilation staff → invigilation mode, senior rate
  if (
    st.includes('senior member (academic)') ||
    st.includes('part time') ||
    des.includes('senior lecturer') ||
    des.includes('professor') ||
    des.includes('lecturer') ||
    des.includes('associate professor')
  ) {
    return { mode: 'invigilation', rateKey: 'senior' };
  }

  // Senior staff (admin/clerical)
  if (st.includes('senior staff') || st.includes('senior member (administrative)')) {
    return { mode: 'biometric', rateKey: 'senior_staff' };
  }

  // Contract staff
  if (st.includes('contract')) {
    return { mode: 'biometric', rateKey: 'contract' };
  }

  // Junior staff
  if (st.includes('junior')) {
    return { mode: 'biometric', rateKey: 'junior' };
  }

  // Default: biometric, senior_staff rate
  return { mode: 'biometric', rateKey: 'senior_staff' };
}

router.post('/calculate', authAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  // Rates from request body (GHS per session or verification)
  const rates = {
    senior: parseFloat(req.body.rate_senior) || 100,        // per invigilation session (60 min)
    senior_staff: parseFloat(req.body.rate_senior_staff) || 50,
    contract: parseFloat(req.body.rate_contract) || 40,
    junior: parseFloat(req.body.rate_junior) || 30,
  };

  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws);

    if (!rows.length) return res.status(400).json({ error: 'Empty spreadsheet' });

    const results = rows.map(row => {
      const staffId = row['STAFFID'] || row['StaffID'] || row['staffid'] || '';
      const fullName = row['FULL_NAME'] || row['FullName'] || row['full_name'] || '';
      const department = row['DEPARTMENT'] || row['Department'] || '';
      const designation = row['DESIGNATION'] || row['Designation'] || '';
      const staffType = row['STAFF_TYPE'] || row['StaffType'] || row['staff_type'] || '';
      const minutesStr = String(row['MINUTES_PER_DAY'] || row['MinutesPerDay'] || '');

      const entries = parseMinutesPerDay(minutesStr);
      const { mode, rateKey } = classifyStaff(staffType, designation);
      const rate = rates[rateKey];

      let totalSessions = 0;
      let totalVerifications = 0;
      const breakdown = [];

      if (mode === 'invigilation') {
        // Each entry's value is minutes; 60 min = 1 session
        for (const e of entries) {
          const sessions = Math.round(e.value / 60);
          totalSessions += sessions;
          breakdown.push({ day: e.day, minutes: e.value, sessions });
        }
      } else {
        // Biometric: value is count of verifications
        for (const e of entries) {
          totalVerifications += e.value;
          breakdown.push({ day: e.day, verifications: e.value });
        }
      }

      const quantity = mode === 'invigilation' ? totalSessions : totalVerifications;
      const amount = quantity * rate;

      return {
        staffId,
        fullName,
        department,
        designation,
        staffType,
        mode,
        rateKey,
        rate,
        quantity,
        amount,
        breakdown,
      };
    });

    // Summary
    const grandTotal = results.reduce((s, r) => s + r.amount, 0);

    res.json({ rates, results, grandTotal, count: results.length });
  } catch (err) {
    console.error('Allowance parse error:', err);
    res.status(500).json({ error: 'Failed to parse Excel file: ' + err.message });
  }
});

module.exports = router;

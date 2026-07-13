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

// Parse "Mon Jul 06 2026(60), Tue Jul 07 2026(120)" → { "Mon Jul 06 2026": 60, "Tue Jul 07 2026": 120 }
function parseMinutesPerDay(str) {
  if (!str) return {};
  const result = {};
  const regex = /(\w{3}\s+\w{3}\s+\d{1,2}\s+\d{4})\((\d+)\)/g;
  let m;
  while ((m = regex.exec(str)) !== null) {
    const day = m[1].trim();
    result[day] = (result[day] || 0) + parseInt(m[2], 10);
  }
  return result;
}

// ≤ 6 → biometric verifications counted as sessions directly
// ≥ 60 → invigilation minutes divided by 60
function toSessions(value) {
  if (!value) return 0;
  if (value <= 6) return value;
  return Math.round(value / 60);
}

router.post('/calculate', authAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws);

    if (!rows.length) return res.status(400).json({ error: 'Empty spreadsheet' });

    // Collect all days in order of first appearance
    const daySet = [];
    const dayIndex = {};

    const results = rows.map(row => {
      const staffId = String(row['STAFFID'] || row['StaffID'] || row['staffid'] || '');
      const fullName = String(row['FULL_NAME'] || row['FullName'] || row['full_name'] || '');
      const department = String(row['DEPARTMENT'] || row['Department'] || '');
      const designation = String(row['DESIGNATION'] || row['Designation'] || '');
      const staffType = String(row['STAFF_TYPE'] || row['StaffType'] || row['staff_type'] || '');
      const minutesStr = String(row['MINUTES_PER_DAY'] || row['MinutesPerDay'] || '');

      const raw = parseMinutesPerDay(minutesStr);

      // Build breakdown as { day: sessions }
      const breakdown = {};
      for (const [day, value] of Object.entries(raw)) {
        const sessions = toSessions(value);
        breakdown[day] = sessions;
        if (dayIndex[day] === undefined) {
          dayIndex[day] = daySet.length;
          daySet.push(day);
        }
      }

      return { staffId, fullName, department, designation, staffType, breakdown };
    });

    // Sort days chronologically (they appear as "Mon Jul 06 2026" etc.)
    daySet.sort((a, b) => {
      const da = new Date(a.replace(/(\w+)\s+(\w+)\s+(\d+)\s+(\d+)/, '$2 $3 $4'));
      const db = new Date(b.replace(/(\w+)\s+(\w+)\s+(\d+)\s+(\d+)/, '$2 $3 $4'));
      return da - db;
    });

    const grandTotal = results.reduce((s, r) => {
      const total = Object.values(r.breakdown).reduce((a, b) => a + b, 0);
      return s + total;
    }, 0);

    res.json({ results, days: daySet, grandTotal, count: results.length });
  } catch (err) {
    console.error('Allowance parse error:', err);
    res.status(500).json({ error: 'Failed to parse Excel file: ' + err.message });
  }
});

module.exports = router;

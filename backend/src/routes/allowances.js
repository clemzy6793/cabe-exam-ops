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

const FIXED_DAYS = [
  'Mon Jul 06 2026',
  'Tue Jul 07 2026',
  'Wed Jul 08 2026',
  'Thu Jul 09 2026',
  'Fri Jul 10 2026',
];

// Parse "Mon Jul 06 2026(60), Tue Jul 07 2026(120)" → { "Mon Jul 06 2026": 60, ... }
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

router.post('/calculate', authAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws);

    if (!rows.length) return res.status(400).json({ error: 'Empty spreadsheet' });

    const invigilators = [];
    const officeStaff = [];

    rows.forEach(row => {
      const staffId    = String(row['STAFFID']    || row['StaffID']    || row['staffid']    || '');
      const fullName   = String(row['FULL_NAME']  || row['FullName']   || row['full_name']  || '');
      const department = String(row['DEPARTMENT'] || row['Department'] || '');
      const designation= String(row['DESIGNATION']|| row['Designation']|| '');
      const staffType  = String(row['STAFF_TYPE'] || row['StaffType']  || row['staff_type'] || '');
      const minutesStr = String(row['MINUTES_PER_DAY'] || row['MinutesPerDay'] || '');

      const raw = parseMinutesPerDay(minutesStr);

      // Build breakdown keyed by the fixed day strings, sessions per day
      const breakdown = {};
      let isOffice = true; // assume office until we see a value > 6

      for (const [day, value] of Object.entries(raw)) {
        if (value > 6) isOffice = false;
        // sessions: <=6 → count directly, >=60 → divide by 60
        breakdown[day] = value <= 6 ? value : Math.round(value / 60);
      }

      const record = { staffId, fullName, department, designation, staffType, breakdown };

      if (isOffice) {
        officeStaff.push(record);
      } else {
        invigilators.push(record);
      }
    });

    res.json({ invigilators, officeStaff, days: FIXED_DAYS });
  } catch (err) {
    console.error('Allowance parse error:', err);
    res.status(500).json({ error: 'Failed to parse Excel file: ' + err.message });
  }
});

module.exports = router;

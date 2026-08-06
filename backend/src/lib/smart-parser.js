const XLSX = require('xlsx');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const SESSION_TIMES = {
  1: { start: '08:15', end: '09:15' },
  2: { start: '10:00', end: '11:00' },
  3: { start: '11:45', end: '12:45' },
  4: { start: '13:30', end: '14:30' },
  5: { start: '15:15', end: '16:15' },
  6: { start: '17:00', end: '18:00' },
};

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

const COURSE_CODE_RE = /\b([A-Z]{2,5})\s*(\d{3,4}[A-Z]?)\b/;
const COURSE_CODE_GLOBAL_RE = /\b([A-Z]{2,5})\s*(\d{3,4}[A-Z]?)\b/g;

function detectDay(text) {
  const t = text.toLowerCase();
  for (const day of DAYS) {
    if (t.includes(day)) return day;
  }
  return null;
}

function detectSession(text) {
  const t = text.toLowerCase().replace(/\s+/g, ' ');
  const patterns = [
    [/session\s*1\b/i, 1], [/8[:.]\s*15/i, 1],
    [/session\s*2\b/i, 2], [/10[:.]\s*00/i, 2],
    [/session\s*3\b/i, 3], [/11[:.]\s*45/i, 3],
    [/session\s*4\b/i, 4], [/1[:.]\s*30\s*(pm)?/i, 4], [/13[:.]\s*30/i, 4],
    [/session\s*5\b/i, 5], [/3[:.]\s*15\s*(pm)?/i, 5], [/15[:.]\s*15/i, 5],
    [/session\s*6\b/i, 6], [/5[:.]\s*00\s*(pm)?/i, 6], [/17[:.]\s*00/i, 6],
  ];
  for (const [re, num] of patterns) {
    if (re.test(t)) return num;
  }
  return null;
}

function detectExamType(text) {
  const t = text.toUpperCase();
  if (/\bCBE\b/.test(t)) return 'CBE';
  if (/\bBYOD\b/.test(t)) return 'BYOD';
  if (/\bONLINE\b/.test(t)) return 'CBE';
  return 'written';
}

function extractStudentCount(text) {
  const m = text.match(/\[(\d+)\]|\((\d+)\s*(?:students?)?\)/i);
  if (m) return parseInt(m[1] || m[2]);
  const m2 = text.match(/(\d+)\s*students?/i);
  if (m2) return parseInt(m2[1]);
  return 0;
}

function buildDateMap(startDate, endDate) {
  if (!startDate || !endDate) return {};
  const map = {};
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayIdx = d.getDay();
    if (dayIdx >= 1 && dayIdx <= 5) {
      const dayName = DAYS[dayIdx - 1];
      const dateStr = d.toISOString().slice(0, 10);
      if (!map[dayName]) map[dayName] = dateStr;
    }
  }
  return map;
}

// ── XLSX parsing ────────────────────────────────────────────────

function parseExcel(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
  const exams = [];
  const warnings = [];

  const hasHeaders = raw.length > 0 && raw[0] &&
    (raw[0]['Day'] || raw[0]['day'] || raw[0]['DAY'] ||
     raw[0]['Course Code'] || raw[0]['course_code'] || raw[0]['COURSE CODE'] ||
     raw[0]['COURSE NO/TITLE']);

  if (hasHeaders && !raw[0]['COURSE NO/TITLE']) {
    return parseStructuredExcel(raw, warnings);
  }

  return parseUnstructuredExcel(wb, ws, warnings);
}

function parseStructuredExcel(raw, warnings) {
  const exams = [];

  raw.forEach((row, i) => {
    const rowNum = i + 2;
    const dayRaw = String(row['Day'] || row['day'] || row['DAY'] || '').trim().toLowerCase();
    const sessionRaw = parseInt(row['Session'] || row['session'] || row['SESSION']);
    const code = String(row['Course Code'] || row['course_code'] || row['Course code'] || row['COURSE CODE'] || '').trim();
    const name = String(row['Course Name'] || row['course_name'] || row['Course name'] || row['COURSE NAME'] || '').trim();
    const venue = String(row['Venue'] || row['venue'] || row['VENUE'] || '').trim();
    const students = parseInt(row['Students'] || row['students'] || row['Student Count'] || row['STUDENTS'] || 0) || 0;
    const typeRaw = String(row['Exam Type'] || row['exam_type'] || row['Type'] || row['EXAM TYPE'] || 'written').trim();
    const examiner = String(row['Examiner'] || row['examiner'] || row['EXAMINER'] || '').trim();
    const yearGroup = String(row['Year'] || row['Year Group'] || row['year_group'] || row['YEAR'] || '').trim();

    if (!code && !name) return;
    if (!code) { warnings.push({ row: rowNum, msg: 'Missing course code' }); return; }

    const day = DAYS.find(d => d.startsWith(dayRaw.slice(0, 3)));
    if (!day) { warnings.push({ row: rowNum, msg: `Invalid day: "${dayRaw}"` }); return; }
    if (!sessionRaw || sessionRaw < 1 || sessionRaw > 6) {
      warnings.push({ row: rowNum, msg: `Invalid session: "${row['Session'] || ''}"` }); return;
    }

    exams.push({
      row: rowNum, day_name: day, session_number: sessionRaw,
      course_code: code.toUpperCase(), course_name: name, venue,
      student_count: students, exam_type: detectExamType(typeRaw),
      examiner: examiner || '', year_group: yearGroup || '',
      start_time: SESSION_TIMES[sessionRaw].start,
      end_time: SESSION_TIMES[sessionRaw].end,
    });
  });

  return { exams, warnings };
}

function parseUnstructuredExcel(wb, ws, warnings) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const exams = [];
  let currentDay = null;
  let currentSession = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;

    const cell0 = String(row[0] || '').trim();
    if (cell0) {
      const day = detectDay(cell0);
      if (day) currentDay = day;
      const sess = detectSession(cell0);
      if (sess) currentSession = sess;
    }

    for (let c = 0; c < row.length; c++) {
      const cellText = String(row[c] || '').trim();
      const codeMatch = cellText.match(COURSE_CODE_RE);
      if (!codeMatch) continue;
      if (!currentDay || !currentSession) {
        warnings.push({ row: i + 1, msg: `Course ${codeMatch[0]} found but no day/session context` });
        continue;
      }

      const code = (codeMatch[1] + ' ' + codeMatch[2]).trim();
      const afterCode = cellText.slice(cellText.indexOf(codeMatch[0]) + codeMatch[0].length).trim();
      const courseName = afterCode.replace(/\[.*?\]|\(.*?\)/g, '').trim().slice(0, 120);

      let venue = '', students = 0, examiner = '', yearGroup = '';
      for (let cc = c + 1; cc < Math.min(row.length, c + 7); cc++) {
        const v = String(row[cc] || '').trim();
        if (!v || v === 'None') continue;
        if (/^\d+$/.test(v) && parseInt(v) > 5) { students = parseInt(v); continue; }
        if (!venue && v.length > 1 && !/^\d+$/.test(v)) {
          if (/^(Year|Yr)/i.test(v)) { yearGroup = v; continue; }
          if (cc === c + 1 && courseName) continue;
          venue = v;
        }
      }

      students = students || extractStudentCount(cellText);

      exams.push({
        row: i + 1, day_name: currentDay, session_number: currentSession,
        course_code: code.toUpperCase(), course_name: courseName,
        venue, student_count: students, exam_type: detectExamType(cellText),
        examiner, year_group: yearGroup,
        start_time: SESSION_TIMES[currentSession].start,
        end_time: SESSION_TIMES[currentSession].end,
      });
      break;
    }
  }

  return { exams, warnings };
}

// ── PDF parsing ─────────────────────────────────────────────────

async function parsePDF(buffer) {
  const data = await pdfParse(buffer);
  const text = data.text;
  return parseTextContent(text, 'pdf');
}

// ── DOCX parsing ────────────────────────────────────────────────

async function parseDOCX(buffer) {
  const htmlResult = await mammoth.convertToHtml({ buffer });
  const html = htmlResult.value;

  const tableExams = extractFromHTMLTables(html);
  if (tableExams.exams.length > 0) return tableExams;

  const textResult = await mammoth.extractRawText({ buffer });
  return parseTextContent(textResult.value, 'docx');
}

function extractFromHTMLTables(html) {
  const exams = [];
  const warnings = [];

  const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let tableMatch;

  while ((tableMatch = tableRe.exec(html)) !== null) {
    const tableHtml = tableMatch[1];
    const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    let currentDay = null;
    let rowNum = 0;

    while ((rowMatch = rowRe.exec(tableHtml)) !== null) {
      rowNum++;
      const rowHtml = rowMatch[1];
      const cells = [];
      const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let cellMatch;
      while ((cellMatch = cellRe.exec(rowHtml)) !== null) {
        cells.push(cellMatch[1].replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim());
      }

      if (cells.length < 2) continue;

      const dayFound = detectDay(cells[0]);
      if (dayFound) currentDay = dayFound;

      for (let c = 0; c < cells.length; c++) {
        const cellText = cells[c];
        const matches = cellText.match(COURSE_CODE_GLOBAL_RE);
        if (!matches) continue;

        let sessionNum = null;
        if (c <= 2) sessionNum = 1;
        else if (c <= 3) sessionNum = 2;
        else if (c <= 5) sessionNum = 3;
        else if (c <= 7) sessionNum = 4;
        else sessionNum = 5;

        const headerSession = detectSession(cells[c] || '');
        if (headerSession) sessionNum = headerSession;

        for (const match of matches) {
          const codeMatch = match.match(COURSE_CODE_RE);
          if (!codeMatch) continue;
          const code = (codeMatch[1] + ' ' + codeMatch[2]).trim();

          const codeIdx = cellText.indexOf(match);
          const surrounding = cellText.slice(codeIdx + match.length, codeIdx + match.length + 200);
          const namePart = surrounding.split(/\n|\r|[(\[]/).filter(Boolean)[0]?.trim()?.slice(0, 120) || '';
          const students = extractStudentCount(cellText.slice(codeIdx));

          if (!currentDay) {
            warnings.push({ row: rowNum, msg: `Course ${code} found but no day context` });
            continue;
          }

          exams.push({
            row: rowNum, day_name: currentDay, session_number: sessionNum || 1,
            course_code: code.toUpperCase(), course_name: namePart,
            venue: '', student_count: students, exam_type: detectExamType(cellText),
            examiner: '', year_group: '',
            start_time: SESSION_TIMES[sessionNum || 1].start,
            end_time: SESSION_TIMES[sessionNum || 1].end,
          });
        }
      }
    }
  }

  return { exams, warnings };
}

// ── Universal text parser (PDF/DOCX fallback) ───────────────────

function parseTextContent(text, source) {
  const exams = [];
  const warnings = [];
  const lines = text.split(/\n/);

  let currentDay = null;
  let currentSession = null;
  let lineNum = 0;

  for (const line of lines) {
    lineNum++;
    const trimmed = line.trim();
    if (!trimmed) continue;

    const dayMatch = detectDay(trimmed);
    if (dayMatch) {
      if (/^\s*(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY)\b/i.test(trimmed) ||
          /^(monday|tuesday|wednesday|thursday|friday)\s*[,\s]*\d/i.test(trimmed) ||
          trimmed.split(/\s+/).length <= 6) {
        currentDay = dayMatch;
      }
    }

    const sessMatch = detectSession(trimmed);
    if (sessMatch) {
      if (/session\s*\d/i.test(trimmed) || /^\s*\d{1,2}[:.]?\d{2}\s/i.test(trimmed)) {
        currentSession = sessMatch;
      }
    }

    const courseMatches = [...trimmed.matchAll(COURSE_CODE_GLOBAL_RE)];
    if (!courseMatches.length) continue;

    for (const m of courseMatches) {
      const code = (m[1] + ' ' + m[2]).trim();

      if (/^(CABE|KNUST|FOBE|ISBN|PAGE|ROOM|HALL|YEAR|DATE|TIME|JULY|JUNE|AUG|SEPT|JAN|FEB|MAR|APR|MAY|OCT|NOV|DEC)\b/i.test(code)) continue;
      if (/^\d{4}$/.test(m[2])) continue;

      const afterCode = trimmed.slice(m.index + m[0].length).trim();
      let courseName = afterCode
        .replace(/\[.*?\]/g, '')
        .replace(/\(\d+\s*students?\)/gi, '')
        .replace(/\(\d+\)/g, '')
        .split(/\t|\s{3,}/)
        .filter(Boolean)[0]?.trim()?.slice(0, 120) || '';

      if (/^(session|monday|tuesday|wednesday|thursday|friday|\d{1,2}[:.])/i.test(courseName)) {
        courseName = '';
      }

      const students = extractStudentCount(afterCode) || extractStudentCount(trimmed);
      const examType = detectExamType(trimmed);

      let venue = '';
      const venueParts = afterCode.split(/\t|\s{3,}/).filter(Boolean);
      if (venueParts.length > 1) {
        const candidate = venueParts[venueParts.length - 1].trim();
        if (candidate && !/^\d+$/.test(candidate) && candidate.length > 1 && candidate.length < 40) {
          if (/^[A-Z0-9]/.test(candidate) && !/session|exam|student/i.test(candidate)) {
            venue = candidate;
          }
        }
      }

      if (!currentDay) {
        warnings.push({ row: lineNum, msg: `Course ${code} found but no day context yet` });
        continue;
      }
      if (!currentSession) {
        warnings.push({ row: lineNum, msg: `Course ${code} found but no session context — assigned to session 1` });
        currentSession = 1;
      }

      exams.push({
        row: lineNum, day_name: currentDay, session_number: currentSession,
        course_code: code.toUpperCase(), course_name: courseName,
        venue, student_count: students, exam_type: examType,
        examiner: '', year_group: '',
        start_time: SESSION_TIMES[currentSession].start,
        end_time: SESSION_TIMES[currentSession].end,
      });
    }
  }

  return { exams, warnings };
}

// ── Main entry point ────────────────────────────────────────────

async function parseFile(buffer, filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  let format, result;

  if (ext === 'xlsx' || ext === 'xls') {
    format = 'excel';
    result = parseExcel(buffer);
  } else if (ext === 'pdf') {
    format = 'pdf';
    result = await parsePDF(buffer);
  } else if (ext === 'docx' || ext === 'doc') {
    format = 'docx';
    result = await parseDOCX(buffer);
  } else {
    throw new Error(`Unsupported file format: .${ext}. Upload PDF, DOCX, or XLSX.`);
  }

  const seen = new Set();
  const unique = [];
  for (const e of result.exams) {
    const key = `${e.course_code}|${e.day_name}|${e.session_number}`;
    if (seen.has(key)) {
      const existing = unique.find(u => `${u.course_code}|${u.day_name}|${u.session_number}` === key);
      if (existing) {
        if (e.venue && !existing.venue) existing.venue = e.venue;
        if (e.student_count > existing.student_count) existing.student_count = e.student_count;
        if (e.course_name && !existing.course_name) existing.course_name = e.course_name;
      }
      continue;
    }
    seen.add(key);
    unique.push(e);
  }

  return { exams: unique, warnings: result.warnings, format };
}

function applyDateMap(exams, dateMap) {
  for (const e of exams) {
    if (dateMap[e.day_name]) {
      e.exam_date = dateMap[e.day_name];
    }
  }
  return exams;
}

function detectVenueClashes(exams) {
  const clashes = [];
  for (let i = 0; i < exams.length; i++) {
    for (let j = i + 1; j < exams.length; j++) {
      if (exams[i].venue && exams[i].venue === exams[j].venue &&
          exams[i].day_name === exams[j].day_name &&
          exams[i].session_number === exams[j].session_number) {
        clashes.push({
          venue: exams[i].venue, day: exams[i].day_name, session: exams[i].session_number,
          courses: [exams[i].course_code, exams[j].course_code],
        });
      }
    }
  }
  return clashes;
}

function validateVenues(exams, knownVenues) {
  const warnings = [];
  const venueSet = new Set(knownVenues.map(v => v.toLowerCase()));
  for (const e of exams) {
    if (e.venue && !venueSet.has(e.venue.toLowerCase())) {
      warnings.push({ row: e.row, msg: `Unknown venue: "${e.venue}"` });
    }
  }
  return warnings;
}

module.exports = { parseFile, applyDateMap, detectVenueClashes, validateVenues, buildDateMap, SESSION_TIMES };

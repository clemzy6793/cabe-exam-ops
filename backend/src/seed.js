require('dotenv').config({ path: __dirname + '/../.env' });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function seed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../parsers/seed_data.json'), 'utf8'));

  const { rows: facRows } = await pool.query('SELECT id, name, code FROM faculties');
  const facMap = {};
  facRows.forEach(f => {
    facMap[f.code] = f.id;
    facMap[f.name] = f.id;
  });

  const { rows: periodRows } = await pool.query(
    `INSERT INTO exam_periods (name, start_date, end_date)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [data.exam_period.name, data.exam_period.start_date, data.exam_period.end_date]
  );
  let periodId;
  if (periodRows.length) {
    periodId = periodRows[0].id;
  } else {
    const { rows } = await pool.query('SELECT id FROM exam_periods WHERE name=$1', [data.exam_period.name]);
    periodId = rows[0].id;
  }

  for (const v of data.venues) {
    await pool.query(
      'INSERT INTO venues (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
      [v]
    );
  }
  console.log(`Seeded ${data.venues.length} venues`);

  const staffMap = {};
  let staffCode = 1000;
  for (const name of data.staff) {
    const code = `CABE${String(staffCode++).padStart(4, '0')}`;
    const { rows } = await pool.query(
      `INSERT INTO staff (name, staff_code) VALUES ($1, $2)
       ON CONFLICT (staff_code) DO NOTHING
       RETURNING id`,
      [name, code]
    );
    if (rows.length) {
      staffMap[name.toLowerCase()] = rows[0].id;
    } else {
      const { rows: existing } = await pool.query('SELECT id FROM staff WHERE LOWER(name)=$1', [name.toLowerCase()]);
      if (existing.length) staffMap[name.toLowerCase()] = existing[0].id;
    }
  }
  console.log(`Seeded ${Object.keys(staffMap).length} staff`);

  let examCount = 0;
  for (const exam of data.exams) {
    const facId = facMap[exam.faculty] || facMap['FOBE'];
    const startTime = exam.session_time?.[0] || null;
    const endTime = exam.session_time?.[1] || null;

    const { rows } = await pool.query(
      `INSERT INTO exams (period_id, faculty_id, course_code, course_name, examiner,
        year_group, exam_date, day_name, session_number, start_time, end_time,
        venue, student_count, exam_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id`,
      [periodId, facId, exam.course_code, exam.course_name, exam.examiner,
       exam.year_group, exam.date || '2026-07-06', exam.day,
       exam.session || 1, startTime, endTime, exam.venue, exam.students,
       exam.exam_type || 'written']
    );

    if (rows.length && exam.invigilators?.length) {
      for (const inv of exam.invigilators) {
        const staffId = staffMap[inv.toLowerCase()];
        if (staffId) {
          await pool.query(
            `INSERT INTO exam_assignments (exam_id, staff_id, role)
             VALUES ($1, $2, 'invigilator')
             ON CONFLICT (exam_id, staff_id) DO NOTHING`,
            [rows[0].id, staffId]
          );
        }
      }
    }
    examCount++;
  }
  console.log(`Seeded ${examCount} exams with assignments`);

  await pool.end();
  console.log('Done!');
}

seed().catch(e => { console.error(e); process.exit(1); });

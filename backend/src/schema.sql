CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(200) NOT NULL,
  role VARCHAR(20) DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS faculties (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  code VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS exam_periods (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS venues (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  capacity INT DEFAULT 0,
  faculty_id INT REFERENCES faculties(id) ON DELETE SET NULL,
  UNIQUE(name)
);

CREATE TABLE IF NOT EXISTS staff (
  id SERIAL PRIMARY KEY,
  staff_code VARCHAR(20) UNIQUE,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150),
  phone VARCHAR(20),
  department VARCHAR(100),
  faculty_id INT REFERENCES faculties(id) ON DELETE SET NULL,
  role VARCHAR(50) DEFAULT 'invigilator',
  staff_type VARCHAR(20) DEFAULT 'lecturer',
  bank_name VARCHAR(100),
  bank_branch VARCHAR(100),
  account_number VARCHAR(50),
  account_type VARCHAR(20),
  category VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admins' AND column_name='faculty_id') THEN
    ALTER TABLE admins ADD COLUMN faculty_id INT REFERENCES faculties(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admins' AND column_name='can_edit') THEN
    ALTER TABLE admins ADD COLUMN can_edit BOOLEAN DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff' AND column_name='staff_type') THEN
    ALTER TABLE staff ADD COLUMN staff_type VARCHAR(20) DEFAULT 'lecturer';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff' AND column_name='bank_name') THEN
    ALTER TABLE staff ADD COLUMN bank_name VARCHAR(100);
    ALTER TABLE staff ADD COLUMN bank_branch VARCHAR(100);
    ALTER TABLE staff ADD COLUMN account_number VARCHAR(50);
    ALTER TABLE staff ADD COLUMN account_type VARCHAR(20);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff' AND column_name='category') THEN
    ALTER TABLE staff ADD COLUMN category VARCHAR(20);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS staff_manual_sessions (
  id SERIAL PRIMARY KEY,
  staff_id INT REFERENCES staff(id) ON DELETE CASCADE,
  day_name VARCHAR(20) NOT NULL,
  sessions INT DEFAULT 0,
  note VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, day_name)
);

CREATE TABLE IF NOT EXISTS exams (
  id SERIAL PRIMARY KEY,
  period_id INT REFERENCES exam_periods(id) ON DELETE CASCADE,
  faculty_id INT REFERENCES faculties(id) ON DELETE CASCADE,
  course_code VARCHAR(30) NOT NULL,
  course_name TEXT,
  examiner VARCHAR(150),
  year_group TEXT,
  exam_date DATE NOT NULL,
  day_name VARCHAR(15),
  session_number INT NOT NULL CHECK (session_number BETWEEN 1 AND 6),
  start_time TIME,
  end_time TIME,
  venue TEXT,
  student_count INT DEFAULT 0,
  exam_type VARCHAR(30) DEFAULT 'written',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_assignments (
  id SERIAL PRIMARY KEY,
  exam_id INT REFERENCES exams(id) ON DELETE CASCADE,
  staff_id INT REFERENCES staff(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'invigilator',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by INT REFERENCES admins(id),
  UNIQUE(exam_id, staff_id)
);

CREATE TABLE IF NOT EXISTS faculty_staff (
  id SERIAL PRIMARY KEY,
  faculty_id INT REFERENCES faculties(id) ON DELETE CASCADE,
  staff_id INT REFERENCES staff(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'printing',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(faculty_id, staff_id, role)
);

CREATE TABLE IF NOT EXISTS biometric_reports (
  id SERIAL PRIMARY KEY,
  exam_id INT REFERENCES exams(id) ON DELETE CASCADE,
  uploader_id INT REFERENCES staff(id) ON DELETE SET NULL,
  filename VARCHAR(255) NOT NULL,
  file_data BYTEA NOT NULL,
  file_size INT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  admin_id INT REFERENCES admins(id),
  action VARCHAR(50) NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS it_teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  faculty_id INT REFERENCES faculties(id),
  building VARCHAR(50),
  staff_ids INT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Academic Structure ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS academic_years (
  id SERIAL PRIMARY KEY,
  name VARCHAR(20) NOT NULL UNIQUE,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS examination_sessions (
  id SERIAL PRIMARY KEY,
  academic_year_id INT REFERENCES academic_years(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  exam_type VARCHAR(30) NOT NULL DEFAULT 'mid_semester',
  status VARCHAR(20) DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  assignments_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(academic_year_id, name)
);

-- ── Payment Rates ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_rates (
  id SERIAL PRIMARY KEY,
  staff_type VARCHAR(100) NOT NULL,
  grade VARCHAR(100) NOT NULL,
  exam_type VARCHAR(30) NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
  daily_rate DECIMAL(10,2),
  UNIQUE(staff_type, grade, exam_type)
);

-- ── Attendance ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  session_id INT REFERENCES examination_sessions(id) ON DELETE CASCADE,
  staff_id INT REFERENCES staff(id) ON DELETE CASCADE,
  staff_type VARCHAR(30) NOT NULL,
  faculty_id INT REFERENCES faculties(id) ON DELETE SET NULL,
  attendance_date DATE NOT NULL,
  present BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT false,
  verified_by INT REFERENCES admins(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, staff_id, attendance_date)
);

-- ── Published toggle + semester for sessions ────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='examination_sessions' AND column_name='published') THEN
    ALTER TABLE examination_sessions ADD COLUMN published BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='examination_sessions' AND column_name='semester') THEN
    ALTER TABLE examination_sessions ADD COLUMN semester VARCHAR(10) DEFAULT 'first';
  END IF;
END $$;

-- ── Add session_id to exams ──────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exams' AND column_name='session_id') THEN
    ALTER TABLE exams ADD COLUMN session_id INT REFERENCES examination_sessions(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_exams_date ON exams(exam_date);
CREATE INDEX IF NOT EXISTS idx_exams_faculty ON exams(faculty_id);
CREATE INDEX IF NOT EXISTS idx_exams_session ON exams(exam_date, session_number);
CREATE INDEX IF NOT EXISTS idx_exams_session_id ON exams(session_id);
CREATE INDEX IF NOT EXISTS idx_assignments_staff ON exam_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_assignments_exam ON exam_assignments(exam_id);
CREATE INDEX IF NOT EXISTS idx_staff_code ON staff(staff_code);
CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);

-- ── Exam Check-ins (per-exam attendance for invigilators/IT) ────
CREATE TABLE IF NOT EXISTS exam_checkins (
  id SERIAL PRIMARY KEY,
  session_id INT REFERENCES examination_sessions(id) ON DELETE CASCADE,
  exam_id INT REFERENCES exams(id) ON DELETE CASCADE,
  staff_id INT REFERENCES staff(id) ON DELETE CASCADE,
  checked_in BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT false,
  verified_by INT REFERENCES admins(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_id, staff_id)
);
CREATE INDEX IF NOT EXISTS idx_exam_checkins_session ON exam_checkins(session_id);
CREATE INDEX IF NOT EXISTS idx_exam_checkins_exam ON exam_checkins(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_checkins_staff ON exam_checkins(staff_id);

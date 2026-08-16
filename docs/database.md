# Database Documentation — AI-Powered Education Management Portal

Database: **MongoDB**, accessed via **Mongoose**.
All schema files live in `database/models/`. Import them via
`require('../database/models')` (see `database/models/index.js`).

## Collections & Relationships

```
User (1) ── (1) Student ── (M) Enrollment ── (1) Course ── (1) Teacher ── (1) User
                  │                                │
                  │                                └── (1) Class ── (M) Student (array ref)
                  │
                  ├── (M) Attendance ── (1) Course, (1) Class
                  ├── (M) Submission ── (1) Assignment ── (1) Course, (1) Teacher
                  ├── (M) Result ── (1) Exam ── (1) Course
                  └── (M) AIRecommendation
```

### `users`
Base identity/auth for every person in the system (STUDENT, TEACHER, ADMIN).
- `name`, `email` (unique), `password` (bcrypt hash, `select: false`), `role`, `profile`, `isActive`, `lastLoginAt`
- Password hashing happens in a Mongoose `pre('save')` hook in `User.js` — never in frontend code.
- `toJSON` transform strips `password` and `__v` automatically.

### `students`
Academic profile for a STUDENT user.
- `user` → ref `User` (unique, one-to-one)
- `studentId` (unique), `department`, `year`, `section`, `guardian`, `status`

### `teachers`
Academic profile for a TEACHER user.
- `user` → ref `User` (unique, one-to-one)
- `teacherId` (unique), `department`, `designation`, `status`

### `courses`
- `courseCode` (unique), `courseName`, `description`, `teacher` → ref `Teacher`, `credits`, `department`, `semester`

### `classes`
A scheduled section that teaches a `Course` to a group of `Student`s.
- `course` → ref `Course`, `teacher` → ref `Teacher`, `students` → ref `Student` (array), `schedule`, `room`

### `enrollments`
Join collection between `Student` and `Course`.
- `student` → ref `Student`, `course` → ref `Course`, `enrollmentDate`, `status`
- Unique compound index on `(student, course)` — a student can't double-enroll in the same course.

### `attendance`
- `student` → ref `Student`, `course` → ref `Course`, `class` → ref `Class`, `date`, `status` (`PRESENT` | `ABSENT`), `markedBy` → ref `Teacher`
- Unique compound index on `(student, course, date)` — one record per student/course/day.

### `assignments`
- `course` → ref `Course`, `teacher` → ref `Teacher`, `title`, `description`, `dueDate`, `maxMarks`, `attachmentUrl`

### `submissions`
- `assignment` → ref `Assignment`, `student` → ref `Student`, `content`, `fileUrl`, `submittedAt`, `marks`, `feedback`, `status` (`SUBMITTED` | `LATE` | `EVALUATED` | `MISSING`)
- Unique compound index on `(assignment, student)` — one submission per student per assignment.

### `exams`
- `course` → ref `Course`, `title`, `examType` (`INTERNAL` | `MIDTERM` | `FINAL` | `QUIZ`), `date`, `maxMarks`

### `results`
- `exam` → ref `Exam`, `student` → ref `Student`, `marks`, `grade`
- Unique compound index on `(exam, student)`.
- `grade` is auto-derived from `marks / exam.maxMarks` in a `pre('save')` hook if not explicitly set (see `computeGrade()` in `Result.js`).

### `aiRecommendations`
Latest (and historical, since it's append-only) AI analysis per student.
- `student` → ref `Student`, `riskLevel` (`LOW` | `MEDIUM` | `HIGH`), `weakSubjects[]`, `observations[]`, `recommendations[]`, `metrics { attendancePercentage, assignmentAverage, examAverage }`, `source` (`AI` | `FALLBACK`), `generatedAt`
- To get the *latest* recommendation for a student: query sorted by `generatedAt: -1`, limit 1 (index already supports this: `{ student: 1, generatedAt: -1 }`).

## Timestamps

Every model uses Mongoose's `{ timestamps: true }` option, so every document
automatically has `createdAt` and `updatedAt` in addition to `_id`.

## Indexes

In addition to the unique compound indexes noted above:
- `users`: `{ role: 1 }`
- `students`: `{ department: 1, year: 1, section: 1 }`
- `teachers`: `{ department: 1 }`
- `courses`: `{ teacher: 1 }`
- `classes`: `{ course: 1, teacher: 1 }`
- `attendance`, `assignments`, `exams`: date-related indexes for range queries

## Environment Variables

Create a `.env` file at the project root (never commit it — see `.env.example`):

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | Yes | MongoDB connection string, e.g. `mongodb://127.0.0.1:27017/education_management_portal` or an Atlas URI |
| `JWT_SECRET` | Yes (backend) | Secret used to sign auth JWTs |
| `PORT` | No | Backend server port (default 5000, backend's choice) |
| `AI_API_KEY` | No | External AI provider key (e.g. Anthropic). If unset, AI service automatically uses the rule-based fallback engine. |
| `AI_API_URL` | No | Defaults to `https://api.anthropic.com/v1/messages` |
| `AI_MODEL` | No | Defaults to `claude-sonnet-4-6` |
| `AI_TIMEOUT_MS` | No | Defaults to `8000` |

## Seed Instructions

From the project root, with `MONGO_URI` set (e.g. via `.env`) and dependencies
installed (`npm install mongoose bcryptjs dotenv` inside `database/` or at the
project root, depending on how the team structures `package.json`):

```bash
node database/seed/seed.js
```

This will:
1. Clear the 12 collections owned by this schema (does not touch unrelated collections).
2. Create 1 admin, 2 teachers, 8 students (all with the same demo password — printed to console at the end, and documented below).
3. Create 4 courses, 2 classes, enrollments, ~20 days of attendance for 6 students, 2 assignments (+1 upcoming) with submissions, 2 exams with results.
4. Generate an AI recommendation per student with data, using the same fallback engine the live AI endpoints use, so seeded data and live-generated data are consistent.

### Demo credentials (documented, not secret — do not reuse in production)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@edumanage.com` | `Passw0rd!` |
| Teacher | `rajesh.kumar@edumanage.com` | `Passw0rd!` |
| Teacher | `priya.sharma@edumanage.com` | `Passw0rd!` |
| Student | `arjun.mehta@student.edumanage.com` | `Passw0rd!` |
| Student (deliberately HIGH risk, for AI demo) | `vikram.singh@student.edumanage.com` | `Passw0rd!` |

Vikram Singh (`STU003`) is seeded with low attendance (~60%), weak assignment
marks, and weak exam marks specifically so the AI risk demo has a guaranteed
HIGH-risk example to show, alongside several LOW/MEDIUM examples.

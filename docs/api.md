# API Contract — AI-Powered Education Management Portal

**This document is the single source of truth for all API endpoints.**
Backend (Person 2) MUST implement exactly these routes, request bodies, and
response shapes. Frontend (Person 1) MUST consume exactly these routes.
Do not add, remove, or rename endpoints without updating this file first and
notifying the team.

## Conventions

- Base URL: `/api`
- All request/response bodies are JSON (`Content-Type: application/json`).
- Authenticated routes require header: `Authorization: Bearer <jwt>`
- Dates are ISO 8601 strings (e.g. `"2026-08-16T00:00:00.000Z"`).
- IDs are MongoDB ObjectId strings.
- Every error response has the shape:

```json
{
  "success": false,
  "message": "Human readable error message",
  "errors": [ "optional field-level details" ]
}
```

- Every success response has the shape:

```json
{
  "success": true,
  "data": { }
}
```

- Roles: `STUDENT`, `TEACHER`, `ADMIN`.

---

## Authentication

### POST /api/auth/register

- **Auth**: None
- **Role**: Public (creates STUDENT, TEACHER, or ADMIN depending on `role`; in
  production, ADMIN creation should be gated behind an existing admin —
  left to backend policy, but the route shape is fixed here)
- **Request body**:

```json
{
  "name": "Arjun Mehta",
  "email": "arjun.mehta@student.edumanage.com",
  "password": "Passw0rd!",
  "role": "STUDENT",
  "profile": { "phone": "9999999999" },
  "studentId": "STU001",
  "department": "Computer Science",
  "year": 2,
  "section": "A"
}
```

  > `studentId`/`department`/`year`/`section` only required when `role` is `STUDENT`.
  > `teacherId`/`department` only required when `role` is `TEACHER`.

- **Success response** (201):

```json
{
  "success": true,
  "data": {
    "token": "jwt-token",
    "user": { "_id": "...", "name": "...", "email": "...", "role": "STUDENT" }
  }
}
```

- **Error response** (400): validation error / email already exists.

---

### POST /api/auth/login

- **Auth**: None
- **Role**: Public
- **Request body**:

```json
{ "email": "arjun.mehta@student.edumanage.com", "password": "Passw0rd!" }
```

- **Success response** (200):

```json
{
  "success": true,
  "data": {
    "token": "jwt-token",
    "user": { "_id": "...", "name": "...", "email": "...", "role": "STUDENT" }
  }
}
```

- **Error response** (401): `{ "success": false, "message": "Invalid credentials" }`

---

### GET /api/auth/me

- **Auth**: Required
- **Role**: STUDENT | TEACHER | ADMIN
- **Request body**: none
- **Success response** (200):

```json
{ "success": true, "data": { "user": { "_id": "...", "name": "...", "email": "...", "role": "..." } } }
```

- **Error response** (401): not authenticated / invalid token.

---

## Student Routes

All routes below require `Authorization` header and role `STUDENT`
(the backend resolves the acting student from the authenticated user).

### GET /api/student/dashboard

- **Success response** (200):

```json
{
  "success": true,
  "data": {
    "attendancePercentage": 88.5,
    "assignmentAverage": 76.2,
    "examAverage": 81.0,
    "upcomingAssignments": 2,
    "upcomingExams": 1,
    "riskLevel": "LOW"
  }
}
```

### GET /api/student/profile

- **Success response** (200): Student profile merged with User info.

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "studentId": "STU001",
    "department": "Computer Science",
    "year": 2,
    "section": "A",
    "user": { "name": "...", "email": "...", "profile": { } }
  }
}
```

### GET /api/student/courses

- **Success response** (200): list of enrolled courses.

```json
{
  "success": true,
  "data": [
    { "_id": "...", "courseCode": "CS201", "courseName": "Data Structures", "teacher": { "name": "Dr. Rajesh Kumar" }, "credits": 4 }
  ]
}
```

### GET /api/student/attendance

- **Query params**: `courseId` (optional, filters to one course)
- **Success response** (200):

```json
{
  "success": true,
  "data": {
    "overallPercentage": 88.5,
    "byCourse": [
      { "courseId": "...", "courseName": "Data Structures", "percentage": 90.0, "present": 18, "absent": 2 }
    ],
    "records": [
      { "date": "2026-08-01T00:00:00.000Z", "course": "Data Structures", "status": "PRESENT" }
    ]
  }
}
```

### GET /api/student/assignments

- **Query params**: `courseId` (optional), `status` (optional: `PENDING` | `SUBMITTED` | `EVALUATED`)
- **Success response** (200):

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "title": "Binary Search Trees",
      "course": "Data Structures",
      "dueDate": "2026-08-25T00:00:00.000Z",
      "maxMarks": 100,
      "submission": null
    }
  ]
}
```

### POST /api/student/assignments/:id/submit

- **Request body**:

```json
{ "content": "My answer text or notes", "fileUrl": "https://.../submission.pdf" }
```

- **Success response** (201):

```json
{ "success": true, "data": { "_id": "...", "status": "SUBMITTED", "submittedAt": "..." } }
```

- **Error response** (400): already submitted / assignment closed. (404): assignment not found.

### GET /api/student/exams

- **Success response** (200):

```json
{
  "success": true,
  "data": [
    { "_id": "...", "title": "Data Structures Midterm", "course": "Data Structures", "date": "2026-08-01T00:00:00.000Z", "maxMarks": 100 }
  ]
}
```

### GET /api/student/results

- **Success response** (200):

```json
{
  "success": true,
  "data": [
    { "_id": "...", "exam": "Data Structures Midterm", "course": "Data Structures", "marks": 85, "maxMarks": 100, "grade": "A" }
  ]
}
```

### GET /api/student/progress

- **Success response** (200): trend data for charts.

```json
{
  "success": true,
  "data": {
    "attendanceTrend": [ { "month": "2026-06", "percentage": 90 } ],
    "examTrend": [ { "exam": "Midterm", "percentage": 85 } ],
    "subjectAverages": [ { "courseName": "Data Structures", "average": 87.5 } ]
  }
}
```

### GET /api/student/ai-recommendations

- **Success response** (200): latest AI recommendation for this student.

```json
{
  "success": true,
  "data": {
    "riskLevel": "HIGH",
    "weakSubjects": ["Mathematics"],
    "observations": ["Attendance is critically low at 64%."],
    "recommendations": ["Improve attendance", "Practice Mathematics problem solving", "Review recent exam topics"],
    "metrics": { "attendancePercentage": 64, "assignmentAverage": 52, "examAverage": 49 },
    "source": "AI",
    "generatedAt": "2026-08-16T00:00:00.000Z"
  }
}
```

---

## Teacher Routes

All routes below require `Authorization` header and role `TEACHER`.

### GET /api/teacher/dashboard

```json
{
  "success": true,
  "data": {
    "totalCourses": 3,
    "totalStudents": 40,
    "pendingEvaluations": 5,
    "avgAttendanceAcrossCourses": 82.1
  }
}
```

### GET /api/teacher/courses

```json
{ "success": true, "data": [ { "_id": "...", "courseCode": "CS201", "courseName": "Data Structures", "credits": 4 } ] }
```

### GET /api/teacher/students

- **Query params**: `courseId` (optional)

```json
{
  "success": true,
  "data": [
    { "_id": "...", "studentId": "STU001", "name": "Arjun Mehta", "section": "A", "year": 2 }
  ]
}
```

### POST /api/teacher/attendance

- **Request body**:

```json
{
  "courseId": "...",
  "classId": "...",
  "date": "2026-08-16",
  "records": [
    { "studentId": "...", "status": "PRESENT" },
    { "studentId": "...", "status": "ABSENT" }
  ]
}
```

- **Success response** (201): `{ "success": true, "data": { "created": 25 } }`
- **Error response** (400): duplicate attendance for date/course.

### POST /api/teacher/assignments

- **Request body**:

```json
{ "courseId": "...", "title": "Binary Search Trees", "description": "...", "dueDate": "2026-08-25", "maxMarks": 100 }
```

- **Success response** (201): the created assignment object.

### GET /api/teacher/assignments

- **Query params**: `courseId` (optional)
- **Success response** (200): list of assignments created by this teacher.

### GET /api/teacher/assignments/:id/submissions

```json
{
  "success": true,
  "data": [
    { "_id": "...", "student": "Arjun Mehta", "submittedAt": "...", "marks": null, "status": "SUBMITTED" }
  ]
}
```

### PUT /api/teacher/submissions/:id/evaluate

- **Request body**:

```json
{ "marks": 88, "feedback": "Well structured, good edge-case handling." }
```

- **Success response** (200): updated submission, `status` becomes `EVALUATED`.

### POST /api/teacher/exams

- **Request body**:

```json
{ "courseId": "...", "title": "Data Structures Midterm", "examType": "MIDTERM", "date": "2026-08-30", "maxMarks": 100 }
```

- **Success response** (201): created exam.

### POST /api/teacher/results

- **Request body**:

```json
{ "examId": "...", "results": [ { "studentId": "...", "marks": 85 } ] }
```

- **Success response** (201): `{ "success": true, "data": { "created": 25 } }`

### GET /api/teacher/analytics

- **Query params**: `courseId` (optional)

```json
{
  "success": true,
  "data": {
    "attendanceDistribution": { "above90": 10, "between75and90": 12, "below75": 3 },
    "gradeDistribution": { "A+": 3, "A": 8, "B": 10, "C": 4, "D": 2, "F": 1 },
    "atRiskStudents": [ { "studentId": "STU003", "name": "Vikram Singh", "riskLevel": "HIGH" } ]
  }
}
```

---

## Admin Routes

All routes below require `Authorization` header and role `ADMIN`.

### GET /api/admin/dashboard

```json
{
  "success": true,
  "data": {
    "totalStudents": 8,
    "totalTeachers": 2,
    "totalCourses": 4,
    "totalClasses": 2,
    "avgAttendance": 82.5
  }
}
```

### GET /api/admin/students

- **Query params**: `department`, `year`, `section` (all optional)

```json
{ "success": true, "data": [ { "_id": "...", "studentId": "STU001", "name": "Arjun Mehta", "department": "Computer Science" } ] }
```

### GET /api/admin/teachers

```json
{ "success": true, "data": [ { "_id": "...", "teacherId": "TCH001", "name": "Dr. Rajesh Kumar", "department": "Computer Science" } ] }
```

### GET /api/admin/courses

```json
{ "success": true, "data": [ { "_id": "...", "courseCode": "CS201", "courseName": "Data Structures", "teacher": "Dr. Rajesh Kumar" } ] }
```

### POST /api/admin/courses

- **Request body**:

```json
{ "courseCode": "CS501", "courseName": "Machine Learning", "teacherId": "...", "credits": 4, "description": "..." }
```

- **Success response** (201): created course.

### PUT /api/admin/courses/:id

- **Request body**: any subset of course fields to update.
- **Success response** (200): updated course.

### DELETE /api/admin/courses/:id

- **Success response** (200): `{ "success": true, "data": { "deleted": true } }`

### GET /api/admin/classes

```json
{ "success": true, "data": [ { "_id": "...", "name": "Data Structures - Sec A", "course": "Data Structures", "teacher": "Dr. Rajesh Kumar", "studentCount": 6 } ] }
```

### GET /api/admin/exams

```json
{ "success": true, "data": [ { "_id": "...", "title": "Data Structures Midterm", "course": "Data Structures", "date": "..." } ] }
```

### GET /api/admin/analytics

```json
{
  "success": true,
  "data": {
    "enrollmentByDepartment": [ { "department": "Computer Science", "count": 8 } ],
    "riskDistribution": { "LOW": 3, "MEDIUM": 2, "HIGH": 1 },
    "avgPerformanceByCourse": [ { "courseName": "Data Structures", "average": 78.4 } ]
  }
}
```

### GET /api/admin/reports

- **Query params**: `type` (`attendance` | `performance` | `risk`), `department` (optional)

```json
{ "success": true, "data": { "type": "attendance", "generatedAt": "...", "rows": [ ] } }
```

---

## AI Routes

Available to authenticated TEACHER and ADMIN roles (a student's own data is
also reachable via `GET /api/student/ai-recommendations` above).

### GET /api/ai/student/:id

- **Role**: TEACHER | ADMIN
- **Success response** (200): same shape as `/api/student/ai-recommendations`,
  for the given student id.

### GET /api/ai/class/:id

- **Role**: TEACHER | ADMIN
- **Success response** (200):

```json
{
  "success": true,
  "data": {
    "classId": "...",
    "riskDistribution": { "LOW": 3, "MEDIUM": 2, "HIGH": 1 },
    "students": [
      { "studentId": "STU003", "name": "Vikram Singh", "riskLevel": "HIGH", "weakSubjects": ["Mathematics"] }
    ]
  }
}
```

### GET /api/ai/overview

- **Role**: ADMIN
- **Success response** (200): institution-wide risk snapshot.

```json
{
  "success": true,
  "data": {
    "totalStudentsAnalyzed": 8,
    "riskDistribution": { "LOW": 3, "MEDIUM": 2, "HIGH": 1 },
    "topWeakSubjects": [ { "subject": "Mathematics", "count": 3 } ]
  }
}
```

---

## HTTP Status Code Summary

| Code | Meaning |
|------|---------|
| 200  | Success (read/update) |
| 201  | Success (created) |
| 400  | Validation error / bad request |
| 401  | Not authenticated / invalid credentials |
| 403  | Authenticated but wrong role for this route |
| 404  | Resource not found |
| 409  | Conflict (e.g. duplicate attendance, duplicate enrollment) |
| 500  | Server error |

## Change Policy

Any change to this file must be agreed by all three developers before
implementation. Do not silently diverge frontend or backend from what is
documented here.

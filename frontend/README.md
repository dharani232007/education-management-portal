# EduIntelli - Education Management Portal Frontend

A React/Vite frontend starter for the KIT BUILDATHON 2026 Education Management Portal.

## Run

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal.

## Demo

The current frontend includes demo-mode Student, Teacher, and Admin flows. Any valid email/password can be used.

## Backend integration

Replace the demo data and login handler in `src/App.jsx` with the team's real Axios/API service layer. Keep the route and UI structure where useful.

## Roles

- Student: dashboard, courses, attendance, assignments, results, AI insights, profile
- Teacher: dashboard, courses, students, attendance, assignments, exams/results, analytics
- Admin: dashboard, students, teachers, courses, analytics, AI intelligence, reports

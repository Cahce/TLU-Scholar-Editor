// The teacher dashboard reuses the student project list verbatim: backend
// `/api/v1/projects` returns the projects owned by the authenticated user, so
// the same list/create/import flow applies to both roles. Keeping a single
// implementation avoids drift between the two UIs.
export { StudentDashboard as TeacherDashboard } from "../../student/dashboard/StudentDashboard";

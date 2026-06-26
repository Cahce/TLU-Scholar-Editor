import { createBrowserRouter, redirect } from "react-router";
import { LoginPage } from "./features/auth/LoginPage";
import { ForceChangePasswordPage } from "./features/auth/ForceChangePasswordPage";
import { AppLayout } from "./components/layout/AppLayout";
import { AuthLoadingFallback } from "./components/layout/AuthLoadingFallback";
import { AdminDashboard } from "./features/admin/dashboard/AdminDashboard";
import { AdminTemplates } from "./features/admin/templates/AdminTemplates";
import { AdminAccounts } from "./features/admin/accounts/AdminAccounts";
import { AdminTeachers } from "./features/admin/teachers/AdminTeachers";
import { AdminStudents } from "./features/admin/students/AdminStudents";
import { AdminProjects } from "./features/admin/projects/AdminProjects";
import { AdminFaculties } from "./features/admin/faculties/AdminFaculties";
import { AdminDepartments } from "./features/admin/departments/AdminDepartments";
import { AdminMajors } from "./features/admin/majors/AdminMajors";
import { AdminClasses } from "./features/admin/classes/AdminClasses";
import { TeacherDashboard } from "./features/teacher/dashboard/TeacherDashboard";
import { TeacherProfile } from "./features/teacher/profile/TeacherProfile";
import { StudentDashboard } from "./features/student/dashboard/StudentDashboard";
import { StudentProfile } from "./features/student/profile/StudentProfile";
import { ProjectWorkspace } from "./features/workspace/ProjectWorkspace";
import { HelpCenterIndex } from "./features/help/HelpCenterIndex";
import { HelpTopicPage } from "./features/help/HelpTopicPage";
import { ReferenceIndex } from "./features/help/ReferenceIndex";
import { ReferenceCategoryPage } from "./features/help/ReferenceCategoryPage";
import { ReferenceFnPage } from "./features/help/ReferenceFnPage";
import { HelpDocsLayout } from "./features/help/HelpDocsLayout";
import { PopoutViewerWindow } from "./editor/components/PopoutViewerWindow";
import {
  redirectIfAuthenticated,
  requireAnyPermission,
  requireAuth,
  requirePermission,
  requireRole,
} from "./auth/guards";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LoginPage,
    loader: redirectIfAuthenticated,
  },
  {
    path: "/doi-mat-khau",
    Component: ForceChangePasswordPage,
    loader: ({ request }) => requireAuth(request),
    HydrateFallback: AuthLoadingFallback,
  },
  {
    path: "/",
    Component: AppLayout,
    HydrateFallback: AuthLoadingFallback,
    children: [
      {
        path: "admin",
        loader: requireRole(["admin"]),
        children: [
          { index: true, loader: () => redirect("/admin/overview") },
          { path: "overview", Component: AdminDashboard },
          { path: "accounts", Component: AdminAccounts },
          { path: "students", Component: AdminStudents },
          { path: "teachers", Component: AdminTeachers },
          { path: "projects", Component: AdminProjects },
          { path: "faculties", Component: AdminFaculties },
          { path: "departments", Component: AdminDepartments },
          { path: "majors", Component: AdminMajors },
          { path: "classes", Component: AdminClasses },
          { path: "templates", Component: AdminTemplates },
        ],
      },
      {
        path: "teacher",
        loader: requireRole(["teacher"]),
        children: [
          { index: true, Component: TeacherDashboard },
          { path: "all", Component: TeacherDashboard },
          { path: "shared", Component: TeacherDashboard },
          { path: "profile", Component: TeacherProfile },
        ],
      },
      {
        path: "student",
        loader: requireRole(["student"]),
        children: [
          { index: true, Component: StudentDashboard },
          { path: "all", Component: StudentDashboard },
          { path: "shared", Component: StudentDashboard },
          { path: "profile", Component: StudentProfile },
        ],
      },
      {
        path: "huong-dan",
        loader: ({ request }) => requireAuth(request),
        Component: HelpDocsLayout,
        children: [
          { index: true, Component: HelpCenterIndex },
          {
            path: "tra-cuu",
            children: [
              { index: true, Component: ReferenceIndex },
              {
                path: "symbols",
                lazy: () =>
                  import("./features/help/SymbolGallery").then((m) => ({
                    Component: m.SymbolGallery,
                  })),
              },
              { path: ":category", Component: ReferenceCategoryPage },
              { path: ":category/:fn", Component: ReferenceFnPage },
            ],
          },
          { path: ":topic", Component: HelpTopicPage },
        ],
      },
    ],
  },
  {
    path: "/workspace/:id",
    Component: ProjectWorkspace,
    loader: requireAnyPermission(["editor:access", "templates:manage"]),
    HydrateFallback: AuthLoadingFallback,
  },
  {
    path: "/preview-popup/:projectId",
    Component: PopoutViewerWindow,
    loader: requireAnyPermission(["editor:access", "templates:manage"]),
    HydrateFallback: AuthLoadingFallback,
  },
]);

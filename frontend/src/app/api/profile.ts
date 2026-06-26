import { ApiError, apiClient } from "./client";
import { getCurrentUser, getUserByEmail } from "./auth";
import { useAuthStore } from "../stores/authStore";
import type {
  StudentProfileResponse,
  TeacherProfileResponse,
  UpdateMyProfileRequest,
  UserWithProfileResponse,
} from "../types/api";

/**
 * Update the authenticated user's own personal info (gender / date of birth /
 * phone / address) on their student or teacher profile. The backend resolves
 * which profile to update from the JWT role. Callers should refetch the profile
 * afterwards to render the fresh values.
 */
export async function updateMyProfile(
  data: UpdateMyProfileRequest,
): Promise<void> {
  await apiClient.put<never, unknown>("/auth/me/profile", data);
}

/**
 * Fetch teacher profile via the auth module.
 *
 * Backend exposes `/api/v1/auth/user/:email`, which returns the user record
 * with an embedded teacher/student profile. We resolve the current user's
 * email from the auth store (falling back to `/auth/me`) and then map the
 * response into the shape consumed by the teacher profile UI.
 *
 * Note: a user with role "teacher" may not yet have a linked Teacher record
 * in the database (admin link step). In that case `teacherProfile` is absent
 * from the response and we return null values for teacher-specific fields so
 * the UI can still render the User-level info.
 */
export async function getTeacherProfile(): Promise<TeacherProfileResponse> {
  const store = useAuthStore.getState();
  let email = store.user?.email;

  if (!email) {
    const { user } = await getCurrentUser();
    const token = store.getAccessToken();
    if (token) {
      store.setAuth(token, user);
    }
    email = user.email;
  }

  const data = await getUserByEmail(email);
  return { teacher: mapUserToTeacherProfile(data) };
}

function mapUserToTeacherProfile(
  data: UserWithProfileResponse,
): TeacherProfileResponse["teacher"] {
  if (data.role !== "teacher") {
    throw new ApiError(
      403,
      "NOT_A_TEACHER_ACCOUNT",
      "Tài khoản đăng nhập không phải giảng viên.",
    );
  }

  const base = {
    accountId: data.id,
    email: data.email,
    role: "teacher" as const,
    isActive: data.isActive,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };

  const profile = data.teacherProfile;
  if (!profile) {
    return {
      ...base,
      profileLinked: false,
      id: null,
      teacherCode: null,
      fullName: null,
      department: null,
      academicRank: null,
      academicDegree: null,
      phone: null,
      gender: null,
      dateOfBirth: null,
      address: null,
    };
  }

  return {
    ...base,
    profileLinked: true,
    id: profile.id,
    teacherCode: profile.teacherCode,
    fullName: profile.fullName,
    department: {
      id: profile.department.id,
      name: profile.department.name,
      faculty: {
        id: profile.department.faculty.id,
        name: profile.department.faculty.name,
      },
    },
    academicRank: profile.academicRank,
    academicDegree: profile.academicDegree,
    phone: profile.phone,
    gender: profile.gender,
    dateOfBirth: profile.dateOfBirth,
    address: profile.address,
  };
}

/**
 * Fetch student profile via the auth module.
 *
 * Mirrors {@link getTeacherProfile}: resolves the current user's email from the
 * auth store (falling back to `/auth/me`) and calls
 * `/api/v1/auth/user/:email`, then maps the embedded student profile into the
 * shape consumed by the student profile UI.
 *
 * Note: a user with role "student" may not yet have a linked Student record in
 * the database (admin link step). In that case `studentProfile` is absent from
 * the response and we return null values for student-specific fields so the UI
 * can still render the User-level info.
 */
export async function getStudentProfile(): Promise<StudentProfileResponse> {
  const store = useAuthStore.getState();
  let email = store.user?.email;

  if (!email) {
    const { user } = await getCurrentUser();
    const token = store.getAccessToken();
    if (token) {
      store.setAuth(token, user);
    }
    email = user.email;
  }

  const data = await getUserByEmail(email);
  return { student: mapUserToStudentProfile(data) };
}

function mapUserToStudentProfile(
  data: UserWithProfileResponse,
): StudentProfileResponse["student"] {
  if (data.role !== "student") {
    throw new ApiError(
      403,
      "NOT_A_STUDENT_ACCOUNT",
      "Tài khoản đăng nhập không phải sinh viên.",
    );
  }

  const base = {
    accountId: data.id,
    email: data.email,
    role: "student" as const,
    isActive: data.isActive,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };

  const profile = data.studentProfile;
  if (!profile) {
    return {
      ...base,
      profileLinked: false,
      id: null,
      studentCode: null,
      fullName: null,
      phone: null,
      gender: null,
      dateOfBirth: null,
      address: null,
      class: null,
    };
  }

  return {
    ...base,
    profileLinked: true,
    id: profile.id,
    studentCode: profile.studentCode,
    fullName: profile.fullName,
    phone: profile.phone,
    gender: profile.gender,
    dateOfBirth: profile.dateOfBirth,
    address: profile.address,
    class: {
      id: profile.class.id,
      name: profile.class.name,
      major: {
        id: profile.class.major.id,
        name: profile.class.major.name,
        faculty: {
          id: profile.class.major.faculty.id,
          name: profile.class.major.faculty.name,
        },
      },
    },
  };
}

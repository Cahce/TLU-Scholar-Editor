import { useEffect, useState } from "react";
import { getStudentProfile } from "../api/profile";
import { getApiErrorMessage } from "../lib/apiError";
import type { StudentProfileResponse } from "../types/api";

type StudentProfile = StudentProfileResponse["student"];

interface UseStudentProfileResult {
  student: StudentProfile | null;
  loading: boolean;
  error: string;
  refetch: () => Promise<void>;
}

export function useStudentProfile(): UseStudentProfileResult {
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProfile = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getStudentProfile();
      setStudent(response.student);
    } catch (err) {
      setStudent(null);
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProfile();
  }, []);

  return {
    student,
    loading,
    error,
    refetch: fetchProfile,
  };
}

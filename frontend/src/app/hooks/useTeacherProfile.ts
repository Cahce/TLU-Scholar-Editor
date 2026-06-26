import { useEffect, useState } from "react";
import { getTeacherProfile } from "../api/profile";
import { getApiErrorMessage } from "../lib/apiError";
import type { TeacherProfileResponse } from "../types/api";

type TeacherProfile = TeacherProfileResponse["teacher"];

interface UseTeacherProfileResult {
  teacher: TeacherProfile | null;
  loading: boolean;
  error: string;
  refetch: () => Promise<void>;
}

export function useTeacherProfile(): UseTeacherProfileResult {
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProfile = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getTeacherProfile();
      setTeacher(response.teacher);
    } catch (err) {
      setTeacher(null);
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProfile();
  }, []);

  return {
    teacher,
    loading,
    error,
    refetch: fetchProfile,
  };
}

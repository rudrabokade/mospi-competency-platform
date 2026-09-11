import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token from localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const res = await axios.post(`${API_URL}/api/auth/refresh`, { refresh_token: refresh });
          localStorage.setItem("access_token", res.data.access_token);
          localStorage.setItem("refresh_token", res.data.refresh_token);
          originalRequest.headers.Authorization = `Bearer ${res.data.access_token}`;
          return api(originalRequest);
        } catch {
          localStorage.clear();
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Auth ────────────────────────────────────────────────────
export const login = (email: string, password: string) =>
  api.post("/api/auth/login", new URLSearchParams({ username: email, password }), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

export const getMe = () => api.get("/api/auth/me");

// ─── Profile & Competency ────────────────────────────────────
export const getProfile = (userId: string) => api.get(`/api/users/${userId}/profile`);
export const getCompetencyGaps = (userId: string) => api.get(`/api/users/${userId}/competency-gaps`);
export const updateCompetencyScores = (userId: string, updates: { skill_id: string; score: number; source: string }[]) =>
  api.post(`/api/users/${userId}/competency-scores`, updates);
export const getRewards = (userId: string) => api.get(`/api/users/${userId}/rewards`);
export const earnRewardPoints = (userId: string, action: string, note?: string) =>
  api.post(`/api/users/${userId}/rewards/earn`, { action, note });

// ─── Recommendations ─────────────────────────────────────────
export const getRecommendations = (userId: string) => api.get(`/api/users/${userId}/recommendations`);
export const refreshRecommendations = () => api.post("/api/recommendations/refresh");
export const updateRecommendationStatus = (recId: string, status: string) =>
  api.patch(`/api/recommendations/${recId}/status`, { status });

// ─── Materials & Quizzes ─────────────────────────────────────
export const uploadMaterial = (formData: FormData) =>
  api.post("/api/materials/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
export const getMaterialStatus = (materialId: string) => api.get(`/api/materials/${materialId}/status`);
export const generateQuiz = (materialId: string) => api.post(`/api/materials/${materialId}/generate-quiz`);
export const getQuiz = (quizId: string) => api.get(`/api/quizzes/${quizId}`);
export const listQuizzes = () => api.get("/api/quizzes");
export const attemptQuiz = (quizId: string, answers: Record<string, string>) =>
  api.post(`/api/quizzes/${quizId}/attempt`, { answers });

// ─── Admin ───────────────────────────────────────────────────
export const getAdminSummary = () => api.get("/api/admin/dashboard-summary");
export const getOrgHeatmap = () => api.get("/api/admin/org-gap-heatmap");
export const listOfficers = () => api.get("/api/admin/officers");
export const createOfficer = (data: {
  name: string;
  email: string;
  password?: string;
  designation: string;
  department: string;
  experience_years: number;
  qualifications?: string[];
}) => api.post("/api/admin/officers", data);
export const getOfficerDetail = (userId: string) => api.get(`/api/admin/officers/${userId}/detail`);
export const awardOfficerReward = (userId: string, points: number, note: string) =>
  api.post(`/api/admin/officers/${userId}/reward`, { points, note });

export const getSkillsBreakdown = () => api.get("/api/admin/skills-breakdown");
export const getRecentActivity = () => api.get("/api/admin/recent-activity");
export const listMaterials = () => api.get("/api/admin/materials");
export const deleteMaterial = (materialId: string) => api.delete(`/api/admin/materials/${materialId}`);

export const listAdminQuizzes = () => api.get("/api/admin/quizzes");
export const getAdminQuizDetail = (quizId: string) => api.get(`/api/admin/quizzes/${quizId}`);
export const deleteQuiz = (quizId: string) => api.delete(`/api/admin/quizzes/${quizId}`);

export const syncIgotCourses = () => api.post("/api/admin/igot/sync");
export const getIgotCourses = () => api.get("/api/admin/igot/courses");
export const recomputeAllRecommendations = () => api.post("/api/admin/recommendations/recompute-all");

export const getRewardPolicy = () => api.get("/api/admin/reward-policy");
export const updateRewardPolicy = (policy: Record<string, unknown>) => api.put("/api/admin/reward-policy", policy);
export const getAdminRewardTransactions = () => api.get("/api/admin/rewards/transactions");
export const getLearningAnalytics = () => api.get("/api/admin/learning-analytics");
export const exportOfficers = () => api.get("/api/admin/officers/export", { responseType: "blob" });


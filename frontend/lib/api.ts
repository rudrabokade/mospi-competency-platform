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
      if (config.headers && typeof config.headers.set === "function") {
        config.headers.set("Authorization", `Bearer ${token}`);
      } else {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest || originalRequest.url?.includes("/api/auth/login")) {
      return Promise.reject(error);
    }
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const res = await axios.post(`${API_URL}/api/auth/refresh`, { refresh_token: refresh });
          localStorage.setItem("access_token", res.data.access_token);
          localStorage.setItem("refresh_token", res.data.refresh_token);
          api.defaults.headers.common["Authorization"] = `Bearer ${res.data.access_token}`;
          if (originalRequest.headers && typeof originalRequest.headers.set === "function") {
            originalRequest.headers.set("Authorization", `Bearer ${res.data.access_token}`);
          } else {
            originalRequest.headers.Authorization = `Bearer ${res.data.access_token}`;
          }
          return api(originalRequest);
        } catch {
          localStorage.clear();
          delete api.defaults.headers.common["Authorization"];
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
export const listMaterials = () => api.get("/api/admin/materials");

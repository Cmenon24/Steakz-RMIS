
import axios from "axios";

// Read the backend API address from the frontend environment.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Attach the current login token to protected API requests.
api.interceptors.request.use((config) => {
  const accessToken = sessionStorage.getItem("steakz_access_token");

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

export default api;

import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  headers: {
    "ngrok-skip-browser-warning": "true",
  },
});

export default api;

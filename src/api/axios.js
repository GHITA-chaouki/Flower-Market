import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Standardized API Configuration
export const API_BASE_URL = "http://192.168.11.105:5287";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json"
  },
});

api.interceptors.request.use(
  async (config) => {
    // Firebase UID
    const uid = await AsyncStorage.getItem("uid");
    if (uid) {
      config.headers["X-Firebase-UID"] = uid;
    }

    // JWT Token
    const token = await AsyncStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;

import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Pour Android Emulator, utiliser 10.0.2.2. Pour Web, localhost est OK.
// Idéalement, mettez votre IP locale (ex: 192.168.x.x) pour tester sur appareil physique.
import { Platform } from 'react-native';

export const API_BASE_URL = "http://192.168.11.104:5287";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 20000,
});

api.interceptors.request.use(
  async (config) => {
    // Get Firebase UID from AsyncStorage
    const uid = await AsyncStorage.getItem("uid");

    if (uid) {
      config.headers["X-Firebase-UID"] = uid;
    }

    // Get JWT token
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

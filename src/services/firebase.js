// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { initializeAuth, getAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBImfvbfG20_CTLaDFh06lriOq7OhxUh-s",
  authDomain: "flowermarket-e119e.firebaseapp.com",
  projectId: "flowermarket-e119e",
  storageBucket: "flowermarket-e119e.firebasestorage.app",
  messagingSenderId: "779365640886",
  appId: "1:779365640886:web:94f97ac20f71462995d417",
  measurementId: "G-1FJC9BDWM0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with React Native persistence
// Handle hot reload by checking if auth is already initialized
let auth;
try {
  if (typeof getReactNativePersistence === 'function') {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } else {
    console.warn("getReactNativePersistence is not a function. Defaulting to getAuth() without persistence.");
    auth = getAuth(app);
  }
} catch (error) {
  // If already initialized (e.g., during hot reload), use getAuth
  if (error.code === 'auth/already-initialized') {
    auth = getAuth(app);
  } else {
    throw error;
  }
}

const db = getFirestore(app);
const storage = getStorage(app);

// Analytics is disabled for React Native compatibility
// Firebase Analytics uses DOM methods that don't exist in React Native
const analytics = null;

export { auth, db, storage, analytics };
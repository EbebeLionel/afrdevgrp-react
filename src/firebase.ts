// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBC8ThZmLMpbWSiUKrZkHrnMf_YWFD7npo",
  authDomain: "adg-columbia-13d72.firebaseapp.com",
  projectId: "adg-columbia-13d72",
  storageBucket: "adg-columbia-13d72.firebasestorage.app",
  messagingSenderId: "351947631308",
  appId: "1:351947631308:web:1e42552db146ddf3227069",
  measurementId: "G-BHB8CWY76E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, analytics, auth, db, storage };
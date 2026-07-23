import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBXMy_x80udEpqqilHFAwS0vG-fR00cwPo",
  authDomain: "interaksi-81844.firebaseapp.com",
  projectId: "interaksi-81844",
  storageBucket: "interaksi-81844.firebasestorage.app",
  messagingSenderId: "142436322515",
  appId: "1:142436322515:web:bfe014671f45c5ddf99826"
};

// Cek biar gak re-initialize melulu di Next.js
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// EXPORT FIRESTORE DOANG!
export const db = getFirestore(app);
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCwMxgmrfnsme4pgLx00tgjGCo-gQBMUo8",
  authDomain: "tallow-ahbabna.firebaseapp.com",
  projectId: "tallow-ahbabna",
  storageBucket: "tallow-ahbabna.firebasestorage.app",
  messagingSenderId: "1025966646494",
  appId: "1:1025966646494:web:f89373fad63d988f298e4f",
  databaseURL: "https://tallow-ahbabna-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

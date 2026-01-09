
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, onSnapshot, deleteDoc, updateDoc, addDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

/**
 * CONFIGURACIÓN OFICIAL OLPAR360 - PRODUCCIÓN
 */
const firebaseConfig = {
  apiKey: "AIzaSyCT2MmNexlmp40sIG0LqTTpG2bvFcqIGso",
  authDomain: "olpar360-966f5.firebaseapp.com",
  projectId: "olpar360-966f5",
  storageBucket: "olpar360-966f5.firebasestorage.app",
  messagingSenderId: "1009020530722",
  appId: "1:1009020530722:web:da59ba6939e03b20625a7b",
  measurementId: "G-1NFKDBBT14"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Adjuntar config al window para validación interna
(window as any).firebaseConfig = firebaseConfig;

export { db, auth, collection, doc, setDoc, getDoc, getDocs, query, onSnapshot, deleteDoc, updateDoc, addDoc, signInWithEmailAndPassword, signOut, onAuthStateChanged };

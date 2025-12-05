
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDOXDeqj91LMzH05pQEsYUB5w-Fm0r0Y74",
  authDomain: "mibibliotecaapp-c5222.firebaseapp.com",
  projectId: "mibibliotecaapp-c5222",
  storageBucket: "mibibliotecaapp-c5222.firebasestorage.app",
  messagingSenderId: "4212262774",
  appId: "1:4212262774:web:dca93353247e1e52d01c57"
};
// se inicializan los servicios
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
//export const analytics = getAnalytics(app);
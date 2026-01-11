import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// 1. Paste your specific configuration from the Firebase Console below
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// 2. Initialize Firebase
const app = initializeApp(firebaseConfig);

// 3. Export the Auth instance
export const auth = getAuth(app);
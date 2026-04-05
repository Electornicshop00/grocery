import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Import the dynamic Firebase configuration
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Use the named database if provided in the config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);

// Connection test to validate Firestore connectivity
async function testConnection() {
  try {
    // Attempt to fetch a non-existent document to test connectivity
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
    console.log("Firestore connection successful.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Firestore connection failed: The client is offline. Please check your Firebase configuration and internet connection.");
    } else {
      // Other errors (like permission denied) are fine for a connectivity test
      console.log("Firestore connectivity verified (received response from server).");
    }
  }
}

testConnection();

export default app;

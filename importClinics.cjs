const admin = require("firebase-admin");
const fs = require("fs");

// Load the service account key
const serviceAccount = require("./service_account_petvet.json");

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Load your vet clinics JSON
const clinics = JSON.parse(fs.readFileSync("vet_clinics.json", "utf8"));

async function importVetClinics() {
  const batch = db.batch();

  Object.entries(clinics).forEach(([docId, data]) => {
    const docRef = db.collection("vet_clinics").doc(docId);
    batch.set(docRef, data);
  });

  await batch.commit();
  console.log("✅ Vet clinics imported into Firestore!");
}

importVetClinics().catch(console.error);

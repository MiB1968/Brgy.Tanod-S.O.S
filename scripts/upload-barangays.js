const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json'); // ← Change path if needed

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const barangays = [
  {
    id: "brgy-01",
    name: "Tanza Proper",
    description: "Poblacion / Central Barangay",
    center: { lat: 14.2753, lng: 120.8521 },
    radiusKm: 3.5,
    population: 12500,
    captain: "Hon. Juan Dela Cruz",
    contactNumber: "+639123456789",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "brgy-02",
    name: "Bagtas",
    description: "Residential area near the highway",
    center: { lat: 14.2685, lng: 120.8605 },
    radiusKm: 2.8,
    population: 8900,
    captain: "Hon. Maria Santos",
    contactNumber: "+639987654321",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "brgy-03",
    name: "Sanja",
    description: "Coastal barangay",
    center: { lat: 14.2820, lng: 120.8450 },
    radiusKm: 4.2,
    population: 6700,
    captain: "Hon. Pedro Reyes",
    contactNumber: "+639112233445",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "brgy-04",
    name: "Paradahan",
    description: "Industrial and agricultural area",
    center: { lat: 14.2600, lng: 120.8750 },
    radiusKm: 5.0,
    population: 10500,
    captain: "Hon. Ana Lopez",
    contactNumber: "+639554433221",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "brgy-05",
    name: "Amaya",
    description: "Growing residential community",
    center: { lat: 14.2900, lng: 120.8300 },
    radiusKm: 3.0,
    population: 7800,
    captain: "Hon. Roberto Garcia",
    contactNumber: "+639665577889",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

async function uploadBarangays() {
  console.log("🚀 Starting barangay upload...");

  for (const brgy of barangays) {
    try {
      await db.collection('barangays').doc(brgy.id).set(brgy);
      console.log(`✅ Uploaded: ${brgy.name} (${brgy.id})`);
    } catch (error) {
      console.error(`❌ Failed to upload ${brgy.name}:`, error);
    }
  }

  console.log("🎉 All barangays uploaded successfully!");
}

uploadBarangays()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Error:", err);
    process.exit(1);
  });

// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDQPWXo0PxlH-ASXsO6WZtEGJ4dv_rbkkY",
  authDomain: "princev-vcf.firebaseapp.com",
  projectId: "princev-vcf",
  storageBucket: "princev-vcf.appspot.com",
  messagingSenderId: "930544921320",
  appId: "1:930544921320:web:13df28cee6f0e9cc96b75d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const TARGET = 800;

// DOM
const submitBtn = document.getElementById("submitBtn");
const nameInput = document.getElementById("name");
const phoneInput = document.getElementById("phone");
const successMsg = document.getElementById("success");
const currentElem = document.getElementById("current");
const remainingElem = document.getElementById("remaining");
const percentElem = document.getElementById("percent");
const progressFill = document.getElementById("progressFill");
const lockedBox = document.getElementById("locked");
const formCard = document.querySelector(".form-card");
const downloadBtn = document.getElementById("downloadVCF");
const channelBox = document.getElementById("channelBox");
const alreadySubmittedMsg = document.getElementById("alreadySubmitted");

const whatsappWebLink = "https://whatsapp.com/channel/0029Vb6XAv0GOj9lYT2p3l1X";

function openWhatsApp() {
  window.open(whatsappWebLink, "_blank");
}

// === Reset Firestore contacts2 (function left untouched) ===
async function resetFirebase() {
  const snapshot = await getDocs(collection(db, "contacts2"));
  const deletePromises = snapshot.docs.map(docRef => deleteDoc(doc(db, "contacts2", docRef.id)));
  await Promise.all(deletePromises);
  console.log("✅ contacts2 reset complete");
}

// ❌ THIS WAS RESETTING YOUR DATA — COMMENTED OUT ONLY
// if (!localStorage.getItem("vcf2_reset_done")) {
//   await resetFirebase();
//   localStorage.setItem("vcf2_reset_done", "yes");
// }

// === Update stats ===
async function updateStats() {
  const snapshot = await getDocs(collection(db, "contacts2"));
  const total = snapshot.size;
  currentElem.textContent = total;
  remainingElem.textContent = Math.max(TARGET - total, 0);
  const percent = Math.min(Math.floor((total / TARGET) * 100), 100);
  percentElem.textContent = percent + "%";
  progressFill.style.width = percent + "%";

  if (total >= TARGET) {
    formCard.style.display = "none";
    lockedBox.classList.remove("hidden");
    channelBox.style.display = "block";
    downloadBtn.style.display = "inline-block";
  }
}

// === Submit contact ===
submitBtn.addEventListener("click", async () => {
  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  if (!name || !phone) {
    alert("Please fill in both fields");
    return;
  }

  // Duplicate check
  const q = query(collection(db, "contacts2"), where("phone", "==", phone));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    successMsg.textContent = "⚠️ This number is already registered!";
    successMsg.style.color = "red";
    successMsg.classList.remove("hidden");
    setTimeout(() => successMsg.classList.add("hidden"), 2500);
    return;
  }

  try {
    const prefixedName = "🇰🇪 " + name;
    await addDoc(collection(db, "contacts2"), { name: prefixedName, phone, time: Date.now() });

    successMsg.textContent = "✅ Contact submitted successfully!";
    successMsg.style.color = "#00ffd0";
    successMsg.classList.remove("hidden");

    nameInput.value = "";
    phoneInput.value = "";

    setTimeout(() => {
      successMsg.classList.add("hidden");
      openWhatsApp();
    }, 1500);

    updateStats();
  } catch (error) {
    console.error("Error adding contact:", error);
    alert("Failed to submit contact. Try again.");
  }
});

// === Generate and download VCF ===
async function generateVCF() {
  const snapshot = await getDocs(collection(db, "contacts2"));
  let vcf = "";
  snapshot.forEach(doc => {
    const data = doc.data();
    vcf += `BEGIN:VCARD
VERSION:3.0
FN:${data.name}
TEL:${data.phone}
END:VCARD
`;
  });
  const blob = new Blob([vcf], { type: "text/vcard" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Prince_VCF_2.vcf";
  a.click();
}
downloadBtn.addEventListener("click", generateVCF);

// Initialize counts on load
updateStats();

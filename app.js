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
const supportBtn = document.querySelector(".support-btn");

const whatsappWebLink = "https://whatsapp.com/channel/0029Vb6XAv0GOj9lYT2p3l1X";

// Update support link
supportBtn.href = "https://wa.link/li5xwd";

function openWhatsApp() {
  window.open(whatsappWebLink, "_blank");
}

// Voice greeting setup
let voicePlayed = false;
nameInput.addEventListener("focus", () => {
  if (!voicePlayed) {
    const audio = new Audio("audio/greeting.mp3");
    audio.play();
    voicePlayed = true;
  }
}, { once: true });

// Update stats
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
  }
}

// Submit contact
submitBtn.addEventListener("click", async () => {
  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  if (!name || !phone) {
    alert("Please fill in both fields");
    return;
  }

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

    successMsg.textContent = "✅ Contact submitted successfully!wait to follow the channel";
    successMsg.style.color = "#fff500"; // luminous yellow
    successMsg.classList.remove("hidden");

    nameInput.value = "";
    phoneInput.value = "";

    setTimeout(() => {
      successMsg.classList.add("hidden");
      openWhatsApp();
    }, 2000);

    updateStats();
  } catch (error) {
    console.error("Error adding contact:", error);
    alert("Failed to submit contact. Try again.");
  }
});

// Generate and download VCF
async function generateVCF() {
  const snapshot = await getDocs(collection(db, "contacts2"));
  if (snapshot.empty) return;

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
  a.download = "Prince_VCF_3.vcf";
  a.click();

  // Show download button after successful VCF creation
  downloadBtn.style.display = "inline-block";
}
downloadBtn.addEventListener("click", generateVCF);

// Initialize counts on load
updateStats();

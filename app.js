// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
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

// Target contacts for unlocking VCF
const TARGET = 1000;

// DOM elements
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

// WhatsApp link (only web link now)
const whatsappWebLink = "https://whatsapp.com/channel/0029Vb6XAv0GOj9lYT2p3l1X";

// Function to open WhatsApp channel
function openWhatsApp() {
  window.open(whatsappWebLink, "_blank");
}

// Prevent double submission
function checkSubmissionLock() {
  if (localStorage.getItem("submitted_once") === "yes") {
    // Disable inputs, but keep button active
    nameInput.disabled = true;
    phoneInput.disabled = true;
    if (alreadySubmittedMsg) alreadySubmittedMsg.classList.remove("hidden");

    // Button now only opens channel
    submitBtn.onclick = () => {
      openWhatsApp();
    };
  }
}

// Run on load
checkSubmissionLock();

// Update stats
async function updateStats() {
  const snapshot = await getDocs(collection(db, "contacts"));
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
    generateVCF();
    downloadBtn.style.display = "inline-block";
  }
}

// Run stats
updateStats();

// Submit contact (works only once)
submitBtn.addEventListener("click", async () => {
  // If already submitted, just open WhatsApp
  if (localStorage.getItem("submitted_once") === "yes") {
    openWhatsApp();
    return;
  }

  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();

  if (!name || !phone) {
    alert("Please fill in both fields");
    return;
  }

  try {
    await addDoc(collection(db, "contacts"), { name, phone, time: Date.now() });

    // Lock further submissions
    localStorage.setItem("submitted_once", "yes");
    checkSubmissionLock();

    // Show success message
    successMsg.textContent = "Contact submitted successfully!";
    successMsg.classList.remove("hidden");
    nameInput.value = "";
    phoneInput.value = "";

    // Wait briefly before hiding message and opening WhatsApp
    setTimeout(() => {
      successMsg.classList.add("hidden");
      openWhatsApp();
    }, 1500); // ⏱️ 1.5 second delay

    updateStats();
  } catch (error) {
    console.error("Error adding contact:", error);
    alert("Failed to submit contact. Try again.");
  }
});

// VCF generator (button hidden anyway)
async function generateVCF() {
  const snapshot = await getDocs(collection(db, "contacts"));
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
  a.download = "Prince_VCF_Gain.vcf";
  a.click();
}

downloadBtn.addEventListener("click", generateVCF);

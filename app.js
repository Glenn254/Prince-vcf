// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDQPWXo0PxlH-ASXsO6WZtEGJ4dv_rbkkY",
  authDomain: "princev-vcf.firebaseapp.com",
  projectId: "princev-vcf",
  storageBucket: "princev-vcf.firebasestorage.app",
  messagingSenderId: "930544921320",
  appId: "1:930544921320:web:13df28cee6f0e9cc96b75d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Maximum contacts before VCF generation
const TARGET = 1000;

document.addEventListener("DOMContentLoaded", async () => {
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

  // Load initial contacts count
  let snapshot = await getDocs(collection(db, "contacts"));
  updateProgress(snapshot.size);

  submitBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();

    if (!name || !phone) {
      successMsg.textContent = "Please fill in both fields!";
      successMsg.classList.remove("hidden");
      return;
    }

    try {
      // Save to Firestore
      await addDoc(collection(db, "contacts"), { name, phone });

      successMsg.textContent = "Contact submitted successfully!";
      successMsg.classList.remove("hidden");
      nameInput.value = "";
      phoneInput.value = "";

      // Update progress
      snapshot = await getDocs(collection(db, "contacts"));
      const total = snapshot.size;
      updateProgress(total);

      // If target reached
      if (total >= TARGET) {
        formCard.style.display = "none";       // hide submission form
        lockedBox.classList.remove("hidden");  // show locked message
        downloadBtn.style.display = "block";   // show download button to everyone
        channelBox.style.display = "none";     // hide channel message
      }

    } catch (error) {
      console.error(error);
      successMsg.textContent = "Error saving contact!";
      successMsg.classList.remove("hidden");
    }
  });

  // Click handler for download button
  downloadBtn.addEventListener("click", () => {
    generateVCF(snapshot);
  });

  // Function to update progress bar & stats
  function updateProgress(total) {
    currentElem.textContent = total;
    const remaining = TARGET - total;
    remainingElem.textContent = remaining > 0 ? remaining : 0;
    const percent = Math.min(Math.floor((total / TARGET) * 100), 100);
    percentElem.textContent = percent + "%";
    progressFill.style.width = percent + "%";
  }
});

// Function to generate and download VCF
function generateVCF(snapshot) {
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

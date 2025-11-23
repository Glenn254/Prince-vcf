// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

const statCurrent = document.getElementById("stat-current");
const statTarget = document.getElementById("stat-target");
const statRemaining = document.getElementById("stat-remaining");

const whatsappWebLink = "https://whatsapp.com/channel/0029Vb6XAv0GOj9lYT2p3l1X";

// Update support link (preserve)
supportBtn.href = "https://wa.link/li5xwd";

function openWhatsApp() {
  window.open(whatsappWebLink, "_blank");
}

// --- ROUND START HANDLING ---
// We set a round start timestamp in localStorage so counts use only contacts added after this time.
// IMPORTANT: do NOT reset this on every page load — that caused counts to jump back to zero on refresh.
const roundStartKey = "princev_roundStart";
const vcfCreatedForRoundKey = "princev_vcfCreatedForRound";

// Only initialize roundStart if it doesn't exist. Set to "0" so existing Firestore contacts are counted.
if (!localStorage.getItem(roundStartKey)) {
  localStorage.setItem(roundStartKey, "0");
}
// (Do not remove the vcf flag on page load — keep previously-generated VCF state.)

function getRoundStart() {
  const raw = localStorage.getItem(roundStartKey);
  return raw ? Number(raw) : 0;
}

// Voice greeting setup (keeps the same logic)
let voicePlayed = false;
nameInput.addEventListener("focus", () => {
  if (!voicePlayed) {
    try {
      const audio = new Audio("audio/greeting.mp3");
      audio.play();
    } catch (e) {
      // ignore if audio not present
    }
    voicePlayed = true;
  }
}, { once: true });

// Update stats (only count docs added after roundStart)
async function updateStats() {
  try {
    const snapshot = await getDocs(collection(db, "contacts2"));
    const roundStart = getRoundStart();

    // Filter docs by time field >= roundStart
    const docs = [];
    snapshot.forEach(d => {
      const data = d.data();
      if (data && data.time && Number(data.time) >= roundStart) {
        docs.push({ id: d.id, data });
      }
    });

    const total = docs.length;
    currentElem.textContent = total;
    const remaining = Math.max(TARGET - total, 0);
    remainingElem.textContent = remaining;
    const percent = Math.min(Math.floor((total / TARGET) * 100), 100);
    percentElem.textContent = percent + "%";
    progressFill.style.width = percent + "%";

    // Update circular stat visual (conic-gradient degrees)
    // Map percent to degrees for current and target; remaining uses (360 - current degrees)
    const currentDeg = Math.round((total / Math.max(TARGET,1)) * 360);
    const targetDeg = Math.round((TARGET / Math.max(TARGET,1)) * 360); // usually 360
    const remainingDeg = Math.max(0, 360 - currentDeg);

    statCurrent.style.setProperty("--pct", String(Math.min(Math.max(currentDeg, 0), 360)));
    statTarget.style.setProperty("--pct", String(Math.min(Math.max(targetDeg, 0), 360)));
    statRemaining.style.setProperty("--pct", String(Math.min(Math.max(remainingDeg, 0), 360)));

    // Update numeric displays
    document.getElementById("current").textContent = total;
    document.getElementById("target").textContent = TARGET;
    document.getElementById("remaining").textContent = remaining;

    // If target reached: lock form, show locked box, auto-generate VCF (once per round), show download btn.
    if (total >= TARGET) {
      formCard.style.display = "none";
      lockedBox.classList.remove("hidden");
      channelBox.style.display = "block";

      const vcfFlag = localStorage.getItem(vcfCreatedForRoundKey);
      if (!vcfFlag) {
        // Auto-generate VCF once for this round and mark as created
        await generateVCF(true); // pass true to indicate auto-generation; function will create file and also show button
        localStorage.setItem(vcfCreatedForRoundKey, String(getRoundStart()));
      } else {
        // ensure download button visible if VCF already created
        downloadBtn.style.display = "inline-block";
      }
    } else {
      // still below target: keep form visible
      formCard.style.display = "block";
      lockedBox.classList.add("hidden");
      // Hide download button until VCF is created
      // (if VCF had been created for previous round, keep it hidden because this is a new round)
      const vcfFlag = localStorage.getItem(vcfCreatedForRoundKey);
      if (!vcfFlag) downloadBtn.style.display = "none";
    }
  } catch (err) {
    console.error("Error updating stats:", err);
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

  try {
    // Prevent duplicate phone in the round (still avoid adding duplicates globally)
    const q = query(collection(db, "contacts2"), where("phone", "==", phone));
    const snapshot = await getDocs(q);
    let already = false;
    snapshot.forEach(doc => {
      const d = doc.data();
      // if there's a doc with same phone and time >= roundStart, treat as duplicate for this round
      const t = d.time ? Number(d.time) : 0;
      if (t >= getRoundStart()) already = true;
    });

    if (already) {
      successMsg.textContent = "⚠️ This number is already registered for this vcf!";
      successMsg.style.color = "red";
      successMsg.classList.remove("hidden");
      setTimeout(() => successMsg.classList.add("hidden"), 2500);
      return;
    }

    // Add doc with time so we can filter by roundStart later
    const prefixedName = "💨 " + name;
    await addDoc(collection(db, "contacts2"), { name: prefixedName, phone, time: Date.now() });

    successMsg.textContent = "✅ Contact submitted successfully!";
    successMsg.style.color = "#ffd700";
    successMsg.classList.remove("hidden");

    nameInput.value = "";
    phoneInput.value = "";

    setTimeout(() => {
      successMsg.classList.add("hidden");
      openWhatsApp();
    }, 1600);

    // Update stats after adding
    updateStats();
  } catch (error) {
    console.error("Error adding contact:", error);
    alert("Failed to submit contact. Try again.");
  }
});

// Generate and download VCF
// If auto=true, the function will attempt to automatically trigger a download once (when target reached)
async function generateVCF(auto = false) {
  try {
    const snapshot = await getDocs(collection(db, "contacts2"));
    const roundStart = getRoundStart();

    // Collect docs that belong to this round
    const docs = [];
    snapshot.forEach(d => {
      const data = d.data();
      if (data && data.time && Number(data.time) >= roundStart) {
        docs.push(data);
      }
    });

    if (docs.length === 0) return;

    let vcf = "";
    docs.forEach(data => {
      // sanitize newline and values minimally
      const fn = (data.name || "").toString().replace(/\r?\n/g, " ");
      const tel = (data.phone || "").toString().replace(/\r?\n/g, " ");
      vcf += `BEGIN:VCARD
VERSION:3.0
FN:${fn}
TEL:${tel}
END:VCARD
`;
    });

    const blob = new Blob([vcf], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);

    // Create temporary link for download
    const a = document.createElement("a");
    a.href = url;
    a.download = "Prince_VCF_v3.vcf";

    // Show the download button (visible after VCF created)
    downloadBtn.style.display = "inline-block";

    // If auto-generation (target reached), trigger download once
    if (auto) {
      // small delay to ensure button becomes visible then trigger click
      setTimeout(() => {
        try { a.click(); } catch (e) { /* ignore */ }
      }, 400);
    }

    // Release the object URL after some time
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch (err) {
    console.error("Error generating VCF:", err);
  }
}

downloadBtn.addEventListener("click", () => generateVCF(false));

// Initialize counts on load and poll for live updates
updateStats();
// Poll every 4.5 seconds to keep live progress (firestore listeners could be used but polling keeps code simple)
setInterval(updateStats, 4500);

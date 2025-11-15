// --- FIREBASE CONFIG ---
// Replace with your firebaseConfig from Firebase Console
const firebaseConfig = YOUR_FIREBASE_CONFIG_HERE;

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let TARGET = 1000;

// Ensure anonymous auth works
auth.signInAnonymously().catch(err => console.log(err));

// --- Load live stats ---
async function loadStats() {
    let snap = await db.collection("stats").doc("main").get();

    if (!snap.exists) {
        await db.collection("stats").doc("main").set({
            current: 0
        });
        snap = await db.collection("stats").doc("main").get();
    }

    let current = snap.data().current;
    let remaining = Math.max(0, TARGET - current);
    let percent = Math.min(100, (current / TARGET) * 100);

    document.getElementById("current").innerText = current;
    document.getElementById("remaining").innerText = remaining;
    document.getElementById("percent").innerText = percent.toFixed(1) + "%";
    document.getElementById("progressFill").style.width = percent + "%";

    if (current >= TARGET) {
        document.querySelector(".form-card").classList.add("hidden");
        document.querySelector(".stats").classList.add("hidden");
        document.querySelector(".progress-bar").classList.add("hidden");
        document.querySelector(".progress-title").classList.add("hidden");
        document.getElementById("locked").classList.remove("hidden");
    }
}

loadStats();

// --- Submit contact ---
document.getElementById("submitBtn").addEventListener("click", async () => {
    let name = document.getElementById("name").value.trim();
    let phone = document.getElementById("phone").value.trim();

    if (name === "" || phone === "") {
        alert("Please fill all fields");
        return;
    }

    await db.collection("contacts").add({
        name,
        phone,
        time: Date.now()
    });

    // Increase counter
    const ref = db.collection("stats").doc("main");
    await ref.update({
        current: firebase.firestore.FieldValue.increment(1)
    });

    document.getElementById("success").classList.remove("hidden");
    setTimeout(() => {
        document.getElementById("success").classList.add("hidden");
    }, 2000);

    loadStats();
});

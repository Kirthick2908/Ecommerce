import { auth, db } from './app.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    sendPasswordResetEmail,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getDoc, doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { sendWelcomeEmail } from './emailService.js';

// Helper to safely add event listeners
function safeAddEventListener(elementId, event, callback) {
    const element = document.getElementById(elementId);
    if (element) {
        element.addEventListener(event, callback);
    } else {
        console.warn(`Element #${elementId} not found in DOM. Skipping event listener.`);
    }
}

// Function to show email sent popup
function showEmailSentPopup() {
    const overlay = document.getElementById("email-sent-popup-overlay");
    const popup = document.getElementById("email-sent-popup");
    if (overlay && popup) {
        overlay.style.display = "block";
        popup.style.display = "block";
    }
}

// Function to close email sent popup
function closeEmailSentPopup() {
    const overlay = document.getElementById("email-sent-popup-overlay");
    const popup = document.getElementById("email-sent-popup");
    if (overlay && popup) {
        overlay.style.display = "none";
        popup.style.display = "none";
    }
}

// User Login Popup
safeAddEventListener("user-login-btn", "click", () => {
    const overlay = document.getElementById("user-popup-overlay");
    const popup = document.getElementById("user-popup");
    if (overlay && popup) {
        overlay.style.display = "block";
        popup.style.display = "block";
        document.getElementById("user-login-section").style.display = "block";
        document.getElementById("user-signup-section").style.display = "none";
        document.getElementById("user-popup-title").textContent = "User Login";
    }
});

safeAddEventListener("login-btn", "click", async () => {
    const email = document.getElementById("login-email")?.value;
    const password = document.getElementById("login-password")?.value;
    const errorMessage = document.getElementById("login-error");

    if (!email || !password || !errorMessage) return;

    console.log("User Login Attempt:", { email, passwordLength: password.length });

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const userDoc = await getDoc(doc(db, "users", user.uid));
        const isAdmin = userDoc.exists() && userDoc.data().role === "admin";

        const cartDoc = await getDoc(doc(db, "carts", user.uid));
        if (cartDoc.exists()) {
            localStorage.setItem('cart', JSON.stringify(cartDoc.data().items || {}));
        }

        closePopup("user");
        if (isAdmin) {
            window.location.href = "admin.html";
        } else {
            window.location.href = "index.html";
        }
    } catch (error) {
        console.error("Login Error:", error.code, error.message);
        errorMessage.textContent = `Login failed: ${error.message}`;
    }
});

safeAddEventListener("toggle-login-password", "click", () => {
    const passwordInput = document.getElementById("login-password");
    const button = document.getElementById("toggle-login-password");
    if (passwordInput && button) {
        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            button.textContent = "Hide";
        } else {
            passwordInput.type = "password";
            button.textContent = "Show";
        }
    }
});

// User Signup
safeAddEventListener("toggle-to-signup", "click", () => {
    const loginSection = document.getElementById("user-login-section");
    const signupSection = document.getElementById("user-signup-section");
    const title = document.getElementById("user-popup-title");
    if (loginSection && signupSection && title) {
        loginSection.style.display = "none";
        signupSection.style.display = "block";
        title.textContent = "User Signup";
    }
});

safeAddEventListener("signup-btn", "click", async () => {
    const email = document.getElementById("signup-email")?.value;
    const password = document.getElementById("signup-password")?.value;
    const errorMessage = document.getElementById("signup-error");

    if (!email || !password || !errorMessage) return;

    console.log("Signup Attempt:", { email, passwordLength: password.length });

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await setDoc(doc(db, "users", user.uid), { email, role: "user", creditPoints: 0 }, { merge: true });
        
        // Send welcome email and show popup
        await sendWelcomeEmail(email);
        closePopup("user");
        showEmailSentPopup(); // Show the popup after email is sent

        // Redirect after popup is closed (optional, can be handled by button)
        setTimeout(() => {
            closeEmailSentPopup();
            window.location.href = "index.html";
        }, 2000); // Auto-close after 2 seconds and redirect
    } catch (error) {
        console.error("Signup Error:", error.code, error.message);
        errorMessage.textContent = `Signup failed: ${error.message}`;
    }
});

safeAddEventListener("toggle-signup-password", "click", () => {
    const passwordInput = document.getElementById("signup-password");
    const button = document.getElementById("toggle-signup-password");
    if (passwordInput && button) {
        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            button.textContent = "Hide";
        } else {
            passwordInput.type = "password";
            button.textContent = "Show";
        }
    }
});

safeAddEventListener("toggle-to-login", "click", () => {
    const signupSection = document.getElementById("user-signup-section");
    const loginSection = document.getElementById("user-login-section");
    const title = document.getElementById("user-popup-title");
    if (signupSection && loginSection && title) {
        signupSection.style.display = "none";
        loginSection.style.display = "block";
        title.textContent = "User Login";
    }
});

safeAddEventListener("reset-password-link", "click", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email")?.value;
    const errorMessage = document.getElementById("login-error");
    if (!email || !errorMessage) return;

    try {
        await sendPasswordResetEmail(auth, email);
        errorMessage.textContent = "Password reset email sent!";
    } catch (error) {
        console.error("Password Reset Error:", error.code, error.message);
        errorMessage.textContent = `Error: ${error.message}`;
    }
});

// Admin Login Popup
safeAddEventListener("admin-login-btn", "click", () => {
    const overlay = document.getElementById("admin-popup-overlay");
    const popup = document.getElementById("admin-popup");
    if (overlay && popup) {
        overlay.style.display = "block";
        popup.style.display = "block";
    }
});

safeAddEventListener("admin-login-btn-popup", "click", async () => {
    const email = document.getElementById("admin-email")?.value;
    const password = document.getElementById("admin-password")?.value;
    const errorMessage = document.getElementById("admin-error");

    if (!email || !password || !errorMessage) return;

    console.log("Admin Login Attempt:", { email, passwordLength: password.length });

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const userDoc = await getDoc(doc(db, "users", user.uid));
        const isAdmin = userDoc.exists() && userDoc.data().role === "admin";

        closePopup("admin");
        if (isAdmin) {
            window.location.href = "admin.html";
        } else {
            errorMessage.textContent = "You are not an admin!";
        }
    } catch (error) {
        console.error("Admin Login Error:", error.code, error.message);
        errorMessage.textContent = `Admin login failed: ${error.message}`;
    }
});

safeAddEventListener("toggle-admin-password", "click", () => {
    const passwordInput = document.getElementById("admin-password");
    const button = document.getElementById("toggle-admin-password");
    if (passwordInput && button) {
        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            button.textContent = "Hide";
        } else {
            passwordInput.type = "password";
            button.textContent = "Show";
        }
    }
});

// Logout
safeAddEventListener("logout-btn", "click", async () => {
    try {
        const user = auth.currentUser;
        if (user) {
            const cart = JSON.parse(localStorage.getItem('cart') || '{}');
            await setDoc(doc(db, "carts", user.uid), { items: cart }, { merge: true });
        }
        await signOut(auth);
        localStorage.removeItem('cart');
        window.location.href = "login.html";
    } catch (error) {
        console.error("Logout Error:", error);
    }
});

// Close Popups
function closePopup(type) {
    if (type === "user") {
        const overlay = document.getElementById("user-popup-overlay");
        const popup = document.getElementById("user-popup");
        if (overlay && popup) {
            overlay.style.display = "none";
            popup.style.display = "none";
            document.getElementById("login-email").value = "";
            document.getElementById("login-password").value = "";
            document.getElementById("signup-email").value = "";
            document.getElementById("signup-password").value = "";
            if (document.getElementById("login-error")) document.getElementById("login-error").textContent = "";
            if (document.getElementById("signup-error")) document.getElementById("signup-error").textContent = "";
        }
    } else if (type === "admin") {
        const overlay = document.getElementById("admin-popup-overlay");
        const popup = document.getElementById("admin-popup");
        if (overlay && popup) {
            overlay.style.display = "none";
            popup.style.display = "none";
            document.getElementById("admin-email").value = "";
            document.getElementById("admin-password").value = "";
            if (document.getElementById("admin-error")) document.getElementById("admin-error").textContent = "";
        }
    }
}

// Event listeners for email sent popup
safeAddEventListener("close-email-sent-popup", "click", () => {
    closeEmailSentPopup();
    window.location.href = "index.html"; // Redirect after closing
});

safeAddEventListener("email-sent-popup-overlay", "click", () => {
    closeEmailSentPopup();
    window.location.href = "index.html"; // Redirect after closing
});

safeAddEventListener("user-popup-overlay", "click", () => closePopup("user"));
safeAddEventListener("admin-popup-overlay", "click", () => closePopup("admin"));
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./app.js"; // Import Firestore from app.js

/**
 * Function to send a welcome email after user signup.
 * Stores email details in the Firestore "emails" collection.
 */
async function sendWelcomeEmail(userEmail) {
    try {
        await addDoc(collection(db, "emails"), {
            to: userEmail,
            subject: "Welcome to Our Store! 🎉",
            body: "Thank you for signing up! We are excited to have you on board.",
            timestamp: new Date()
        });
        console.log("📩 Welcome email queued successfully!");
    } catch (error) {
        console.error("❌ Error sending welcome email:", error);
    }
}


/**
 * Function to send an order confirmation email after order placement.
 * Stores email details in the Firestore "emails" collection.
 */
async function sendOrderConfirmation(userEmail, orderDetails) {
    try {
        await addDoc(collection(db, "emails"), {
            to: userEmail,
            subject: "Your Order Confirmation 🛍️",
            body: `Thank you for your order! Here are your order details:\n${orderDetails}`,
            timestamp: new Date()
        });
        console.log("✅ Order confirmation email queued successfully!");
    } catch (error) {
        console.error("❌ Error sending order confirmation email:", error);
    }
}

// Export functions to use in other JS files
export { sendWelcomeEmail, sendOrderConfirmation };
import { auth, db } from './app.js';
import { doc, getDoc, setDoc, addDoc, collection, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let selectedAddress = null;
let selectedPaymentMethod = null;
let cartItems = {};
let total = 0;
let availableCredits = 0;

// Initialize the checkout process
async function initCheckout() {
    if (!auth.currentUser) {
        window.location.href = "login.html";
        return;
    }

    loadUserInfo();
    await loadSavedAddresses();
    await loadOrderSummary();
    setupPaymentMethodSelection();
}

// Load user information
async function loadUserInfo() {
    if (!auth.currentUser) return;
    
    const userNameElement = document.getElementById("user-name");
    userNameElement.textContent = auth.currentUser.email;
    
    document.getElementById("change-account-btn").addEventListener("click", () => {
        auth.signOut()
            .then(() => window.location.href = "login.html")
            .catch(error => console.error("Error signing out:", error));
    });
}

// Load saved addresses
async function loadSavedAddresses() {
    if (!auth.currentUser) return;

    const savedAddressesContainer = document.getElementById("saved-addresses");
    savedAddressesContainer.innerHTML = "";
    
    const userRef = doc(db, "users", auth.currentUser.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists() && userSnap.data().addresses) {
        const addresses = userSnap.data().addresses;
        
        if (addresses.length === 0) {
            savedAddressesContainer.innerHTML = "<p>No saved addresses. Please add one.</p>";
            showNewAddressForm();
        } else {
            addresses.forEach((address, index) => {
                const addressCard = document.createElement("div");
                addressCard.className = "address-card";
                addressCard.setAttribute("data-index", index);
                
                if (index === 0) {
                    addressCard.classList.add("selected");
                    selectedAddress = address;
                }
                
                addressCard.innerHTML = `
                    <div class="address-name">${address.name}</div>
                    <div class="address-detail">${address.street}, ${address.city}, ${address.state} ${address.zip}</div>
                    <div class="address-country">${address.country}</div>
                    <div class="address-phone">${address.phone}</div>
                `;
                
                addressCard.addEventListener("click", () => {
                    document.querySelectorAll(".address-card").forEach(card => card.classList.remove("selected"));
                    addressCard.classList.add("selected");
                    selectedAddress = address;
                });
                
                savedAddressesContainer.appendChild(addressCard);
            });
        }
    } else {
        savedAddressesContainer.innerHTML = "<p>No saved addresses. Please add one.</p>";
        showNewAddressForm();
    }
    
    document.getElementById("add-address-btn").addEventListener("click", showNewAddressForm);
    document.getElementById("save-address-btn").addEventListener("click", saveNewAddress);
}

function showNewAddressForm() {
    document.getElementById("new-address-form").style.display = "block";
}

async function saveNewAddress() {
    const name = document.getElementById("address-name").value.trim();
    const street = document.getElementById("address-street").value.trim();
    const city = document.getElementById("address-city").value.trim();
    const state = document.getElementById("address-state").value.trim();
    const zip = document.getElementById("address-zip").value.trim();
    const country = document.getElementById("address-country").value.trim();
    const phone = document.getElementById("address-phone").value.trim();
    
    if (!name || !street || !city || !state || !zip || !country || !phone) {
        alert("Please fill out all address fields");
        return;
    }
    
    const newAddress = { name, street, city, state, zip, country, phone };
    
    try {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        let addresses = userSnap.exists() && userSnap.data().addresses ? userSnap.data().addresses : [];
        addresses.push(newAddress);
        
        await setDoc(userRef, { addresses }, { merge: true });
        await loadSavedAddresses();
        document.getElementById("new-address-form").style.display = "none";
        
        document.getElementById("address-name").value = "";
        document.getElementById("address-street").value = "";
        document.getElementById("address-city").value = "";
        document.getElementById("address-state").value = "";
        document.getElementById("address-zip").value = "";
        document.getElementById("address-country").value = "";
        document.getElementById("address-phone").value = "";
        
    } catch (error) {
        console.error("Error saving address:", error);
        alert("Failed to save address. Please try again.");
    }
}

// Order Summary Functions
async function loadOrderSummary() {
    const orderItemsContainer = document.getElementById("order-items");
    orderItemsContainer.innerHTML = "";
    
    if (!auth.currentUser) return;
    
    const cartRef = doc(db, "carts", auth.currentUser.uid);
    const cartSnap = await getDoc(cartRef);
    
    if (!cartSnap.exists() || !cartSnap.data().items || Object.keys(cartSnap.data().items).length === 0) {
        orderItemsContainer.innerHTML = "<p>Your cart is empty.</p>";
        document.getElementById("subtotal").textContent = "$0.00";
        document.getElementById("shipping").textContent = "$0.00";
        document.getElementById("tax").textContent = "$0.00";
        document.getElementById("total-price").textContent = "$0.00";
        document.getElementById("place-order-btn").disabled = true;
        return;
    }
    
    cartItems = cartSnap.data().items;
    let subtotal = 0;
    
    for (const [productPath, item] of Object.entries(cartItems)) {
        const { quantity, name, price, image, credit = 0 } = item;
        const itemTotal = price * quantity;
        subtotal += itemTotal;
        
        const itemElement = document.createElement("div");
        itemElement.className = "cart-item";
        itemElement.setAttribute("data-product-path", productPath);
        
        itemElement.innerHTML = `
            <img src="${image || 'https://via.placeholder.com/80'}" alt="${name}" class="item-image">
            <div class="item-details">
                <div class="item-name">${name}</div>
                <div class="item-price">$${price.toFixed(2)}</div>
                <div class="item-credit">Credit: $${(credit * quantity).toFixed(2)}</div>
            </div>
            <div class="item-controls">
                <div class="quantity-control">
                    <button class="quantity-btn minus">-</button>
                    <input type="number" class="quantity-input" value="${quantity}" min="1" max="99">
                    <button class="quantity-btn plus">+</button>
                </div>
                <button class="remove-item-btn">Remove</button>
            </div>
        `;
        
        itemElement.querySelector(".minus").addEventListener("click", () => updateItemQuantity(productPath, -1));
        itemElement.querySelector(".plus").addEventListener("click", () => updateItemQuantity(productPath, 1));
        itemElement.querySelector(".quantity-input").addEventListener("change", (e) => updateItemQuantity(productPath, 0, parseInt(e.target.value)));
        itemElement.querySelector(".remove-item-btn").addEventListener("click", () => removeItemFromCart(productPath));
        
        orderItemsContainer.appendChild(itemElement);
    }
    
    const shipping = subtotal > 0 ? 5.99 : 0;
    const tax = subtotal * 0.07;
    total = subtotal + shipping + tax;
    
    document.getElementById("subtotal").textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById("shipping").textContent = `$${shipping.toFixed(2)}`;
    document.getElementById("tax").textContent = `$${tax.toFixed(2)}`;
    document.getElementById("total-price").textContent = `$${total.toFixed(2)}`;
    document.getElementById("place-order-btn").disabled = subtotal <= 0;
    
    const userRef = doc(db, "users", auth.currentUser.uid);
    const userSnap = await getDoc(userRef);
    availableCredits = userSnap.exists() ? (userSnap.data().totalCredits || 0) : 0;
    updateCreditsDisplay();
}

function updateCreditsDisplay() {
    const creditsSummary = document.getElementById("credits-summary");
    if (creditsSummary) {
        creditsSummary.textContent = `Available Credits: $${availableCredits.toFixed(2)}`;
        const redeemBtn = document.getElementById("redeem-credits-btn");
        if (redeemBtn) {
            redeemBtn.style.display = availableCredits > 0 ? "inline-block" : "none";
        }
    }
}

async function updateItemQuantity(productPath, change, newValue = null) {
    if (!cartItems[productPath]) return;
    
    let quantity = cartItems[productPath].quantity;
    quantity = newValue !== null ? newValue : quantity + change;
    quantity = Math.max(1, quantity);
    
    document.querySelector(`.cart-item[data-product-path="${productPath}"] .quantity-input`).value = quantity;
    cartItems[productPath].quantity = quantity;
    
    try {
        const cartRef = doc(db, "carts", auth.currentUser.uid);
        await updateDoc(cartRef, { [`items.${productPath}.quantity`]: quantity });
        await loadOrderSummary();
    } catch (error) {
        console.error("Error updating quantity:", error);
    }
}

async function removeItemFromCart(productPath) {
    if (!cartItems[productPath]) return;
    
    try {
        const cartRef = doc(db, "carts", auth.currentUser.uid);
        const { [productPath]: _, ...updatedItems } = cartItems;
        cartItems = updatedItems;
        await setDoc(cartRef, { items: updatedItems }, { merge: true });
        await loadOrderSummary();
    } catch (error) {
        console.error("Error removing item:", error);
    }
}

// Payment Method Functions
function setupPaymentMethodSelection() {
    const paymentMethods = document.querySelectorAll(".payment-method-card");
    const paymentDetails = document.getElementById("payment-details");
    
    paymentMethods.forEach(method => {
        method.addEventListener("click", () => {
            paymentMethods.forEach(m => m.classList.remove("selected"));
            method.classList.add("selected");
            selectedPaymentMethod = method.getAttribute("data-method");
            updatePaymentDetails(selectedPaymentMethod);
        });
    });
    
    paymentMethods[0].click();
    
    document.getElementById("place-order-btn").addEventListener("click", () => {
        if (!selectedAddress) {
            alert("Please select a delivery address");
            return;
        }
        if (!selectedPaymentMethod) {
            alert("Please select a payment method");
            return;
        }
        if (availableCredits > 0) {
            const redeem = confirm(`You have $${availableCredits.toFixed(2)} in credits. Would you like to redeem them?`);
            if (redeem) applyCredits(availableCredits);
        }
        showPaymentPopup();
    });
    
    const redeemBtn = document.getElementById("redeem-credits-btn");
    if (redeemBtn) {
        redeemBtn.addEventListener("click", () => {
            if (availableCredits > 0) showRedeemPopup(availableCredits, total);
        });
    }
}

function updatePaymentDetails(paymentMethod) {
    const paymentDetails = document.getElementById("payment-details");
    switch (paymentMethod) {
        case "upi":
            paymentDetails.innerHTML = `<p>Pay using UPI</p><p>You'll be prompted to enter your UPI ID during payment.</p>`;
            break;
        case "credit-card":
            paymentDetails.innerHTML = `<p>Pay using Credit Card</p><p>You'll be prompted to enter your card details during payment.</p>`;
            break;
        case "debit-card":
            paymentDetails.innerHTML = `<p>Pay using Debit Card</p><p>You'll be prompted to enter your card details during payment.</p>`;
            break;
        case "cod":
            paymentDetails.innerHTML = `<p>Cash on Delivery selected.</p><p>Your order will be delivered to the selected address.</p>`;
            break;
        default:
            paymentDetails.innerHTML = "";
    }
}

// Popup Functions
function showPaymentPopup() {
    const paymentPopup = document.getElementById("payment-method-popup");
    const overlay = document.getElementById("popup-overlay");
    
    paymentPopup.style.display = "block";
    overlay.style.display = "block";
    
    document.getElementById("payment-method").value = selectedPaymentMethod;
    updatePaymentFields(selectedPaymentMethod);
    
    document.getElementById("payment-method").addEventListener("change", (e) => updatePaymentFields(e.target.value));
    document.getElementById("confirm-payment-btn").addEventListener("click", processPayment);
    document.getElementById("cancel-payment-btn").addEventListener("click", closeAllPopups);
}

function updatePaymentFields(method) {
    const paymentFields = document.getElementById("payment-fields");
    switch (method) {
        case "upi":
            paymentFields.innerHTML = `
                <label for="upi-id">UPI ID</label>
                <input type="text" id="upi-id" placeholder="username@upi">
            `;
            break;
        case "credit-card":
        case "debit-card":
            paymentFields.innerHTML = `
                <label for="card-number">Card Number</label>
                <input type="text" id="card-number" placeholder="1234 5678 9012 3456">
                <label for="card-name">Name on Card</label>
                <input type="text" id="card-name" placeholder="John Doe">
                <div style="display: flex; gap: 10px;">
                    <div style="flex: 1;">
                        <label for="expiry">Expiry (MM/YY)</label>
                        <input type="text" id="expiry" placeholder="MM/YY">
                    </div>
                    <div style="flex: 1;">
                        <label for="cvv">CVV</label>
                        <input type="password" id="cvv" placeholder="***">
                    </div>
                </div>
            `;
            break;
    }
}

function showRedeemPopup(availableCredits, orderTotal) {
    const redeemPopup = document.getElementById("redeem-popup");
    const overlay = document.getElementById("popup-overlay");
    const redeemMessage = document.getElementById("redeem-message");
    
    const redeemableAmount = Math.min(availableCredits, orderTotal);
    const remainingAmount = orderTotal - redeemableAmount;
    
    redeemMessage.innerHTML = `
        You have <strong>$${availableCredits.toFixed(2)}</strong> in credits.
        Use <strong>$${redeemableAmount.toFixed(2)}</strong> towards this order?
        ${remainingAmount > 0 ? `<br>Remaining: <strong>$${remainingAmount.toFixed(2)}</strong>` : ''}
        <br><br><strong>Or save credits for later?</strong>
    `;
    
    redeemPopup.style.display = "block";
    overlay.style.display = "block";
    
    document.getElementById("redeem-yes-btn").addEventListener("click", () => {
        applyCredits(redeemableAmount);
        closeAllPopups();
    });
    document.getElementById("redeem-no-btn").addEventListener("click", closeAllPopups);
}

function closeAllPopups() {
    document.querySelectorAll(".popup").forEach(popup => popup.style.display = "none");
    document.getElementById("popup-overlay").style.display = "none";
    
    const confirmPaymentBtn = document.getElementById("confirm-payment-btn");
    if (confirmPaymentBtn) confirmPaymentBtn.removeEventListener("click", processPayment);
    
    const cancelPaymentBtn = document.getElementById("cancel-payment-btn");
    if (cancelPaymentBtn) cancelPaymentBtn.removeEventListener("click", closeAllPopups);
    
    const paymentMethodSelect = document.getElementById("payment-method");
    if (paymentMethodSelect) paymentMethodSelect.removeEventListener("change", updatePaymentFields);
    
    const redeemYesBtn = document.getElementById("redeem-yes-btn");
    if (redeemYesBtn) redeemYesBtn.removeEventListener("click", closeAllPopups);
    
    const redeemNoBtn = document.getElementById("redeem-no-btn");
    if (redeemNoBtn) redeemNoBtn.removeEventListener("click", closeAllPopups);
    
    const payBtn = document.getElementById("pay-btn");
    if (payBtn) payBtn.removeEventListener("click", finalizeOrder);
}

async function applyCredits(amount) {
    try {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const currentCredits = userSnap.data().totalCredits || 0;
            const creditsToUse = Math.min(amount, currentCredits, total);
            const newCredits = currentCredits - creditsToUse;
            
            await updateDoc(userRef, { 
                totalCredits: newCredits,
                lastUpdated: new Date().toISOString()
            });
            
            availableCredits = newCredits;
            updateCreditsDisplay();
            
            total -= creditsToUse;
            document.getElementById("total-price").textContent = `$${total.toFixed(2)}`;
            
            const orderTotals = document.querySelector(".order-totals");
            let creditsRow = document.querySelector(".credits-applied");
            
            if (!creditsRow && creditsToUse > 0) {
                creditsRow = document.createElement("div");
                creditsRow.className = "order-total-row credits-applied";
                creditsRow.innerHTML = `
                    <span>Credits Applied:</span>
                    <span id="credits-applied">-$${creditsToUse.toFixed(2)}</span>
                `;
                const grandTotal = document.querySelector(".grand-total");
                orderTotals.insertBefore(creditsRow, grandTotal);
            } else if (creditsToUse > 0) {
                document.getElementById("credits-applied").textContent = `-$${creditsToUse.toFixed(2)}`;
            }
            
            return creditsToUse;
        }
        return 0;
    } catch (error) {
        console.error("Error applying credits:", error);
        alert("Failed to apply credits. Please try again.");
        return 0;
    }
}

async function processPayment() {
    const method = document.getElementById("payment-method").value;
    let paymentDetails = {};
    
    switch (method) {
        case "upi":
            const upiId = document.getElementById("upi-id").value.trim();
            if (!upiId) {
                alert("Please enter a valid UPI ID");
                return;
            }
            paymentDetails = { upiId };
            break;
        case "credit-card":
        case "debit-card":
            const cardNumber = document.getElementById("card-number").value.trim();
            const cardName = document.getElementById("card-name").value.trim();
            const expiry = document.getElementById("expiry").value.trim();
            const cvv = document.getElementById("cvv").value.trim();
            
            if (!cardNumber || !cardName || !expiry || !cvv) {
                alert("Please fill in all card details");
                return;
            }
            paymentDetails = { cardNumber, cardName, expiry, cvv };
            break;
        case "cod":
            break;
        default:
            alert("Invalid payment method selected.");
            return;
    }
    
    document.getElementById("payment-method-popup").style.display = "none";
    
    const paymentPopup = document.getElementById("payment-popup");
    const billDetails = document.getElementById("bill-details");
    
    billDetails.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h3>Shipping Address</h3>
            <p>${selectedAddress.name}</p>
            <p>${selectedAddress.street}, ${selectedAddress.city}, ${selectedAddress.state} ${selectedAddress.zip}</p>
            <p>${selectedAddress.country}</p>
            <p>Phone: ${selectedAddress.phone}</p>
        </div>
        <div style="margin-bottom: 20px;">
            <h3>Payment Method</h3>
            <p>${method === "upi" ? "UPI" : (method === "credit-card" ? "Credit Card" : (method === "debit-card" ? "Debit Card" : "Cash on Delivery"))}</p>
            <p>${method === "upi" ? `UPI ID: ${paymentDetails.upiId}` : (method === "credit-card" || method === "debit-card" ? `Card: **** **** **** ${paymentDetails.cardNumber.slice(-4)}` : "Cash on Delivery")}</p>
        </div>
        <div style="margin-bottom: 20px;">
            <h3>Order Total</h3>
            <p>$${total.toFixed(2)}</p>
        </div>
    `;
    
    paymentPopup.style.display = "block";
    document.getElementById("pay-btn").addEventListener("click", () => finalizeOrder(paymentDetails, method));
}

async function updateUserCredits(creditsToAdd) {
    try {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const currentCredits = userSnap.data().totalCredits || 0;
            const newCredits = currentCredits + creditsToAdd;
            
            await updateDoc(userRef, { 
                totalCredits: newCredits,
                lastUpdated: new Date().toISOString()
            });
            
            availableCredits = newCredits;
            updateCreditsDisplay();
        } else {
            await setDoc(userRef, { 
                totalCredits: creditsToAdd,
                lastUpdated: new Date().toISOString()
            });
            availableCredits = creditsToAdd;
            updateCreditsDisplay();
        }
    } catch (error) {
        console.error("Error updating user credits:", error);
        throw error;
    }
}

async function finalizeOrder(paymentDetails, paymentMethod) {
    try {
        // Calculate total credits earned from individual products
        let totalCreditsEarned = 0;
        for (const [_, item] of Object.entries(cartItems)) {
            totalCreditsEarned += (item.credit || 0) * item.quantity;
        }

        const orderData = {
            userId: auth.currentUser.uid,
            userEmail: auth.currentUser.email,
            items: cartItems,
            shippingAddress: selectedAddress,
            paymentMethod: paymentMethod,
            total: total,
            creditsEarned: totalCreditsEarned,
            status: "pending",
            createdAt: new Date().toISOString()
        };
        
        const ordersRef = collection(db, "orders");
        const newOrderRef = await addDoc(ordersRef, orderData);
        
        // Only update credits if there are credits to add
        if (totalCreditsEarned > 0) {
            await updateUserCredits(totalCreditsEarned);
        }
        
        const cartRef = doc(db, "carts", auth.currentUser.uid);
        await setDoc(cartRef, { items: {} });
        
        generateReceipt(orderData, newOrderRef.id);
        closeAllPopups();
        
        alert(`Order placed successfully! Order ID: ${newOrderRef.id}${totalCreditsEarned > 0 ? `. Earned $${totalCreditsEarned.toFixed(2)} in credits!` : ''}`);
        displayOrderSummary(orderData);
        
        // Navigate to profile.html after successful order
        window.location.href = "profile.html";
        
    } catch (error) {
        console.error("Error placing order:", error);
        alert("Failed to place order. Please try again.");
    }
}

function displayOrderSummary(orderData) {
    console.log("Order Summary:", orderData);
}

function generateReceipt(orderData, orderId) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.text("Order Receipt", 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.text(`Order ID: ${orderId}`, 20, 40);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 50);
    doc.text(`Customer: ${orderData.userEmail}`, 20, 60);
    
    doc.setFontSize(14);
    doc.text("Shipping Address", 20, 80);
    doc.setFontSize(12);
    doc.text(`${orderData.shippingAddress.name}`, 20, 90);
    doc.text(`${orderData.shippingAddress.street}`, 20, 100);
    doc.text(`${orderData.shippingAddress.city}, ${orderData.shippingAddress.state} ${orderData.shippingAddress.zip}`, 20, 110);
    doc.text(`${orderData.shippingAddress.country}`, 20, 120);
    doc.text(`Phone: ${orderData.shippingAddress.phone}`, 20, 130);
    
    doc.setFontSize(14);
    doc.text("Items", 20, 150);
    doc.setFontSize(12);
    
    let y = 160;
    let itemCount = 1;
    
    for (const [productPath, item] of Object.entries(orderData.items)) {
        const { quantity, name, price, credit = 0 } = item;
        doc.text(`${itemCount}. ${name} x ${quantity} - $${(price * quantity).toFixed(2)}${credit > 0 ? ` (Credit: $${(credit * quantity).toFixed(2)})` : ''}`, 20, y);
        y += 10;
        itemCount++;
        if (y > 260) {
            doc.addPage();
            y = 20;
        }
    }
    
    if (orderData.creditsEarned > 0) {
        doc.setFontSize(12);
        doc.text(`Credits Earned: $${orderData.creditsEarned.toFixed(2)}`, 150, y + 10, { align: "right" });
    }
    doc.setFontSize(14);
    doc.text(`Total: $${orderData.total.toFixed(2)}`, 150, y + 20, { align: "right" });
    
    doc.save(`receipt-${orderId}.pdf`);
}

document.addEventListener("DOMContentLoaded", () => {
    auth.onAuthStateChanged(user => {
        if (user) initCheckout();
        else window.location.href = "login.html";
    });
});
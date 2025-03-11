import { auth, db } from "./app.js";
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function addToCart(productPath, name, price, quantity = 1, credit = 0, isCreditPurchase = false) {
    try {
        if (!auth.currentUser) throw new Error("You must be logged in to add items to your cart.");

        const cartRef = doc(db, "carts", auth.currentUser.uid);
        const cartSnap = await getDoc(cartRef);
        const cartData = cartSnap.exists() ? cartSnap.data() : { items: {}, customer: {} };

        if (cartData.items[productPath]) {
            cartData.items[productPath].quantity = (cartData.items[productPath].quantity || 0) + quantity;
        } else {
            cartData.items[productPath] = { quantity, name, price, credit, isCreditPurchase };
        }
        cartData.customer = {
            uid: auth.currentUser.uid,
            email: auth.currentUser.email,
            displayName: auth.currentUser.displayName || "Anonymous"
        };

        await setDoc(cartRef, cartData, { merge: true });
        localStorage.setItem('cart', JSON.stringify(cartData.items));
        console.log(`✅ Added ${quantity} of ${name} to cart with ${credit} credits each, Credit Purchase: ${isCreditPurchase}`);
        displayCart();
    } catch (error) {
        console.error("❌ Error adding to cart:", error.message);
        alert("Error adding to cart: " + error.message);
    }
}

export async function displayCart() {
    const cartList = document.getElementById("cart-items");
    if (!cartList) return;

    try {
        if (!auth.currentUser) {
            cartList.innerHTML = `
                <div class="empty-cart">
                    <h3>Please log in to view your cart</h3>
                </div>
            `;
            return;
        }

        const cartRef = doc(db, "carts", auth.currentUser.uid);
        const cartSnap = await getDoc(cartRef);

        if (!cartSnap.exists() || !cartSnap.data().items || Object.keys(cartSnap.data().items).length === 0) {
            cartList.innerHTML = `
                <div class="empty-cart">
                    <h3>Your cart is empty!</h3>
                    <p>Add items to it now.</p>
                    <a href="index.html" class="shop-now-btn">Shop Now</a>
                </div>
            `;
            
            // Clear the price summary
            const totalPriceElement = document.getElementById("total-price");
            if (totalPriceElement) {
                totalPriceElement.innerHTML = "";
            }
            
            return;
        }

        const cartData = cartSnap.data();
        const cartItems = cartData.items;

        let html = "<ul>";
        let total = 0;
        let totalCredits = 0;

        for (const [productPath, item] of Object.entries(cartItems)) {
            const { quantity, name, price, credit } = item;
            let productData = { name, price, credit };
            if (!name || price === undefined || credit === undefined) {
                const parts = productPath.split("/");
                const productRef = parts.length === 5 
                    ? doc(db, "products", parts[0], parts[1], "subcategories", parts[3], parts[4])
                    : doc(db, "products", parts[0], parts[1], parts[2]);
                const productSnap = await getDoc(productRef);
                productData = productSnap.exists() 
                    ? { 
                        name: productSnap.data().name || "Unknown", 
                        price: Number(productSnap.data().price || 0), 
                        credit: Number(productSnap.data().credit || 0) 
                      } 
                    : { name: "Unknown", price: 0, credit: 0 };
            }

            const itemTotal = productData.price * quantity;
            const itemCredits = productData.credit * quantity;
            total += itemTotal;
            totalCredits += itemCredits;
            
            html += `
                <li>
                    <div class="item-details">
                        <div class="item-info">
                            <div class="item-name">${productData.name}</div>
                            <div class="item-price">
                                <span class="current-price">$${itemTotal.toFixed(2)}</span>
                            </div>
                            <div class="item-credits">Credits: ${itemCredits}</div>
                            <div class="item-actions">
                                <div class="quantity-selector">
                                    <span>Qty: ${quantity}</span>
                                </div>
                                <button class="remove-btn" onclick="removeFromCart('${productPath}')">Remove</button>
                            </div>
                        </div>
                    </div>
                </li>
            `;
        }

        html += "</ul>";
        cartList.innerHTML = html;

        // Update the price summary
        const totalPriceElement = document.getElementById("total-price");
        if (totalPriceElement) {
            totalPriceElement.innerHTML = `
                <div class="price-item">
                    <span>Price (${Object.keys(cartItems).length} items)</span>
                    <span>$${total.toFixed(2)}</span>
                </div>
                <div class="price-item">
                    <span>Credits Earned</span>
                    <span>${totalCredits}</span>
                </div>
                <div class="price-total">
                    <span>Total Amount</span>
                    <span>$${total.toFixed(2)}</span>
                </div>
            `;
        }

        // Add event listeners to checkout buttons
        document.querySelector(".checkout-btn")?.addEventListener("click", function(e) {
            e.preventDefault();
            checkoutCart();
        });
    } catch (error) {
        console.error("❌ Error displaying cart:", error.message);
        cartList.innerHTML = "<p>Error loading cart.</p>";
    }
}

export async function removeFromCart(productPath) {
    try {
        if (!auth.currentUser) throw new Error("You must be logged in.");

        const cartRef = doc(db, "carts", auth.currentUser.uid);
        const cartSnap = await getDoc(cartRef);
        if (!cartSnap.exists()) throw new Error("Cart not found.");

        const cartData = cartSnap.data();
        delete cartData.items[productPath];

        await updateDoc(cartRef, { items: cartData.items });
        localStorage.setItem('cart', JSON.stringify(cartData.items));
        console.log(`✅ Removed ${productPath} from cart`);
        displayCart();
    } catch (error) {
        console.error("❌ Error removing from cart:", error.message);
        alert("Error removing from cart: " + error.message);
    }
}

export async function checkoutCart() {
    try {
        if (!auth.currentUser) throw new Error("You must be logged in to checkout.");

        const cartRef = doc(db, "carts", auth.currentUser.uid);
        const cartSnap = await getDoc(cartRef);
        if (!cartSnap.exists() || !cartSnap.data().items) throw new Error("Cart is empty.");

        // Redirect to checkout.html instead of processing the order here
        window.location.href = "checkout.html";
    } catch (error) {
        console.error("❌ Error initiating checkout:", error.message);
        alert("Error initiating checkout: " + error.message);
    }
}

export async function clearCart() {
    try {
        if (!auth.currentUser) throw new Error("You must be logged in.");

        const cartRef = doc(db, "carts", auth.currentUser.uid);
        await setDoc(cartRef, { items: {}, customer: { uid: auth.currentUser.uid, email: auth.currentUser.email } }, { merge: true });
        localStorage.removeItem('cart');
        console.log(" Cart cleared");
        displayCart();
    } catch (error) {
        console.error(" Error clearing cart:", error.message);
        alert("Error clearing cart: " + error.message);
    }
}

window.removeFromCart = removeFromCart;
window.clearCart = clearCart;

auth.onAuthStateChanged(user => user && displayCart());
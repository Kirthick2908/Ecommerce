import { auth, db } from "./app.js";
import { collection, getDocs, doc, updateDoc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { addToCart as addToCartInCart } from "./cart.js";

const categorySubcategoryMap = {
    "electronics": ["mobiles", "laptops", "accessories", "tv"],
    "groceries": ["food", "vegetables","Dairy"],
    "home-kitchen": ["furniture", "appliances"],
    "fashion": ["kids", "men","women"],
    
    }


let isRendering = false;

async function fetchProducts(selectedCategory = null, selectedSubcategory = null) {
    const productList = document.querySelector("#product-list");
    if (!productList) {
        console.log("No #product-list element found in this page.");
        return;
    }

    if (isRendering) {
        console.log("Already rendering products, skipping...");
        return;
    }
    isRendering = true;
    productList.innerHTML = "";

    const searchQuery = document.getElementById("product-search")?.value.toLowerCase().trim() || "";
    const sortOption = document.getElementById("sort-products")?.value || "";

    const productsData = {};
    let allProducts = [];

    try {
        for (const category in categorySubcategoryMap) {
            // Skip if a specific category is selected and it doesn't match
            if (selectedCategory && category !== selectedCategory) continue;

            productsData[category] = {};
            const subcategories = categorySubcategoryMap[category];
            if (Array.isArray(subcategories)) {
                for (const subcategory of subcategories) {
                    // Skip if a specific subcategory is selected and it doesn't match
                    if (selectedSubcategory && subcategory !== selectedSubcategory) continue;

                    console.log(`Fetching from: products/${category}/${subcategory}`);
                    const itemsSnapshot = await getDocs(collection(db, "products", category, subcategory));
                    if (!itemsSnapshot.empty) {
                        productsData[category][subcategory] = [];
                        itemsSnapshot.forEach((itemDoc) => {
                            const product = itemDoc.data();
                            const productId = itemDoc.id;
                            if (product.active !== false) {
                                const productData = { 
                                    ...product, 
                                    id: productId,
                                    name: product.name || "Unnamed Product",
                                    price: Number(product.price || 0),
                                    stock: Number(product.stock || 0),
                                    credit: Number(product.credit || 0),
                                    category: category,
                                    subcategory: subcategory,
                                    subSubcategory: null,
                                    imageUrl: product.imageUrl || "https://placehold.co/100"
                                };
                                productsData[category][subcategory].push(productData);
                                allProducts.push(productData);
                            }
                        });
                    } else {
                        console.log(`No products found in ${category}/${subcategory}`);
                    }
                }
            } else {
                for (const subcategory in subcategories) {
                    // Skip if a specific subcategory is selected and it doesn't match
                    if (selectedSubcategory && subcategory !== selectedSubcategory) continue;

                    productsData[category][subcategory] = {};
                    for (const subSubcategory of subcategories[subcategory]) {
                        console.log(`Fetching from: products/${category}/${subcategory}/subcategories/${subSubcategory}`);
                        const itemsSnapshot = await getDocs(collection(db, "products", category, subcategory, "subcategories", subSubcategory));
                        if (!itemsSnapshot.empty) {
                            productsData[category][subcategory][subSubcategory] = [];
                            itemsSnapshot.forEach((itemDoc) => {
                                const product = itemDoc.data();
                                const productId = itemDoc.id;
                                if (product.active !== false) {
                                    const productData = { 
                                        ...product, 
                                        id: productId,
                                        name: product.name || "Unnamed Product",
                                        price: Number(product.price || 0),
                                        stock: Number(product.stock || 0),
                                        credit: Number(product.credit || 0),
                                        category: category,
                                        subcategory: subcategory,
                                        subSubcategory: subSubcategory,
                                        imageUrl: product.imageUrl || "https://placehold.co/100"
                                    };
                                    productsData[category][subcategory][subSubcategory].push(productData);
                                    allProducts.push(productData);
                                }
                            });
                        } else {
                            console.log(`No products found in ${category}/${subcategory}/${subSubcategory}`);
                        }
                    }
                }
            }
        }

        if (searchQuery) {
            allProducts = allProducts.filter(product => 
                product.name.toLowerCase().includes(searchQuery) ||
                product.category.toLowerCase().includes(searchQuery) ||
                product.subcategory.toLowerCase().includes(searchQuery) ||
                (product.subSubcategory && product.subSubcategory.toLowerCase().includes(searchQuery))
            );
        }

        if (sortOption === "price-low-high") {
            allProducts.sort((a, b) => a.price - b.price);
        } else if (sortOption === "price-high-low") {
            allProducts.sort((a, b) => b.price - a.price);
        }

        if (allProducts.length === 0) {
            productList.innerHTML = "<p>No active products match your criteria.</p>";
            isRendering = false;
            return;
        }

        const filteredProductsData = {};
        allProducts.forEach(product => {
            if (!filteredProductsData[product.category]) {
                filteredProductsData[product.category] = {};
            }
            if (product.subSubcategory) {
                if (!filteredProductsData[product.category][product.subcategory]) {
                    filteredProductsData[product.category][product.subcategory] = {};
                }
                if (!filteredProductsData[product.category][product.subcategory][product.subSubcategory]) {
                    filteredProductsData[product.category][product.subcategory][product.subSubcategory] = [];
                }
                filteredProductsData[product.category][product.subcategory][product.subSubcategory].push(product);
            } else {
                if (!filteredProductsData[product.category][product.subcategory]) {
                    filteredProductsData[product.category][product.subcategory] = [];
                }
                filteredProductsData[product.category][product.subcategory].push(product);
            }
        });

        for (const category in filteredProductsData) {
            const categoryHeader = document.createElement("h2");
            categoryHeader.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            productList.appendChild(categoryHeader);

            for (const subcategory in filteredProductsData[category]) {
                const subcategoryHeader = document.createElement("h3");
                subcategoryHeader.textContent = subcategory.charAt(0).toUpperCase() + subcategory.slice(1);
                productList.appendChild(subcategoryHeader);

                const subcategoryData = filteredProductsData[category][subcategory];
                if (Array.isArray(subcategoryData)) {
                    const subcategoryContainer = document.createElement("div");
                    subcategoryContainer.className = "subcategory-products";
                    subcategoryContainer.id = `category-${category}-${subcategory}`;

                    subcategoryData.forEach(product => {
                        const productDiv = document.createElement("div");
                        productDiv.className = `product ${product.stock === 0 ? 'out-of-stock' : ''}`;
                        let imageSrc = product.imageUrl;
                        try {
                            new URL(imageSrc);
                        } catch {
                            imageSrc = "https://placehold.co/100";
                        }
                        productDiv.innerHTML = `
                            <h4>${product.name}</h4>
                            <p>Price: $${product.price.toFixed(2)}</p>
                            <img src="${imageSrc}" alt="${product.name}" width="100" onerror="this.src='https://placehold.co/100'">
                            <p class="warning-message">
                                ${product.stock <= 5 && product.stock > 0 ? `⚠️ Only ${product.stock} left!` : product.stock === 0 ? 'Out of Stock' : ''}
                            </p>
                            <div class="cart-controls">
                                <button onclick="updateCart('${category}/${subcategory}/${product.id}', 'decrease')">➖</button>
                                <span id="cart-count-${product.id}">0</span>
                                <button onclick="updateCart('${category}/${subcategory}/${product.id}', 'increase')">➕</button>
                            </div>
                            <div>
                                <button id="add-to-cart-${product.id}" onclick="addToCart('${category}/${subcategory}/${product.id}', '${product.name}', ${product.price}, ${product.credit})">Add to Cart</button>
                                <button id="buy-now-${product.id}" onclick="buyNow('${category}/${subcategory}/${product.id}', '${product.name}', ${product.price}, ${product.credit})">Buy Now</button>
                            </div>
                        `;
                        subcategoryContainer.appendChild(productDiv);
                    });
                    productList.appendChild(subcategoryContainer);
                } else {
                    for (const subSubcategory in subcategoryData) {
                        const subSubcategoryHeader = document.createElement("h4");
                        subSubcategoryHeader.textContent = subSubcategory.charAt(0).toUpperCase() + subSubcategory.slice(1);
                        productList.appendChild(subSubcategoryHeader);

                        const subSubcategoryContainer = document.createElement("div");
                        subSubcategoryContainer.className = "subcategory-products";
                        subSubcategoryContainer.id = `category-${category}-${subcategory}-${subSubcategory}`;

                        subcategoryData[subSubcategory].forEach(product => {
                            const productDiv = document.createElement("div");
                            productDiv.className = `product ${product.stock === 0 ? 'out-of-stock' : ''}`;
                            let imageSrc = product.imageUrl;
                            try {
                                new URL(imageSrc);
                            } catch {
                                imageSrc = "https://placehold.co/100";
                            }
                            productDiv.innerHTML = `
                                <h4>${product.name}</h4>
                                <p>Price: $${product.price.toFixed(2)}</p>
                                <img src="${imageSrc}" alt="${product.name}" width="100" onerror="this.src='https://placehold.co/100'">
                                <p class="warning-message">
                                    ${product.stock <= 5 && product.stock > 0 ? `⚠️ Only ${product.stock} left!` : product.stock === 0 ? 'Out of Stock' : ''}
                                </p>
                                <div class="cart-controls">
                                    <button onclick="updateCart('${category}/${subcategory}/subcategories/${subSubcategory}/${product.id}', 'decrease')">➖</button>
                                    <span id="cart-count-${product.id}">0</span>
                                    <button onclick="updateCart('${category}/${subcategory}/subcategories/${subSubcategory}/${product.id}', 'increase')">➕</button>
                                </div>
                                <button id="add-to-cart-${product.id}" onclick="addToCart('${category}/${subcategory}/subcategories/${subSubcategory}/${product.id}', '${product.name}', ${product.price}, ${product.credit})">➕ Add to Cart</button>
                                <button id="buy-now-${product.id}" onclick="buyNow('${category}/${subcategory}/subcategories/${subSubcategory}/${product.id}', '${product.name}', ${product.price}, ${product.credit})">Buy Now</button>
                            `;
                            subSubcategoryContainer.appendChild(productDiv);
                        });
                        productList.appendChild(subSubcategoryContainer);
                    }
                }
            }
        }
    } catch (error) {
        console.error("❌ Error fetching products:", error.message);
        productList.innerHTML = "<p>Failed to load products. Check console for details.</p>";
    } finally {
        isRendering = false;
    }
}

async function updateCart(productPath, action) {
    const parts = productPath.split("/");
    const productId = parts[parts.length - 1];
    const cartCountElement = document.querySelector(`#cart-count-${productId}`);
    let cartCount = parseInt(cartCountElement.textContent);

    const productRef = parts.length === 5 
        ? doc(db, "products", parts[0], parts[1], "subcategories", parts[3], parts[4])
        : doc(db, "products", parts[0], parts[1], parts[2]);
    const productSnap = await getDoc(productRef);
    const stock = productSnap.exists() ? Number(productSnap.data().stock || 0) : 0;

    if (action === "increase") {
        if (cartCount < stock) {
            cartCount++;
        } else {
            alert(`⚠️ Only ${stock} items available in stock!`);
        }
    } else if (action === "decrease" && cartCount > 0) {
        cartCount--;
    }

    cartCountElement.textContent = cartCount;
}

async function addToCart(productPath, name, price, credit) {
    if (!auth.currentUser) {
        alert("⚠️ Please log in to add items to your cart!");
        window.location.href = "login.html";
        return;
    }

    const parts = productPath.split("/");
    const [category, subcategory, subSubcategoryOrDoc, subSubcategory, productId] = parts.length === 5 
        ? [parts[0], parts[1], parts[2], parts[3], parts[4]] 
        : [parts[0], parts[1], null, null, parts[2]];
    const cartCountElement = document.querySelector(`#cart-count-${productId}`);
    const cartCount = parseInt(cartCountElement.textContent);

    if (cartCount === 0) {
        alert("⚠️ No items selected to add to the cart!");
        return;
    }

    const productRef = subSubcategory 
        ? doc(db, "products", category, subcategory, "subcategories", subSubcategory, productId)
        : doc(db, "products", category, subcategory, productId);
    const productSnap = await getDoc(productRef);
    if (!productSnap.exists()) {
        alert("⚠️ Product not found!");
        return;
    }

    const productData = productSnap.data();
    const stock = Number(productData.stock || 0);
    if (cartCount > stock) {
        alert("⚠️ Not enough stock available!");
        return;
    }

    const totalPrice = price * cartCount;
    const userRef = doc(db, "users", auth.currentUser.uid);
    const userSnap = await getDoc(userRef);
    const userCredits = userSnap.exists() ? Number(userSnap.data().totalCredits || 0) : 0;
    const isCreditPurchase = userCredits >= totalPrice && confirm(`Total: $${totalPrice.toFixed(2)}. You have ${userCredits} credits. Use credits for this purchase?`);

    try {
        await addToCartInCart(productPath, name, price, cartCount, credit, isCreditPurchase);
        cartCountElement.textContent = 0;

        const message = document.createElement("div");
        message.textContent = `${name} added to cart! ${isCreditPurchase ? 'Paid with credits.' : 'Paid with cash.'}`;
        message.style.cssText = "position: fixed; top: 20px; right: 20px; background: #4CAF50; color: white; padding: 10px; border-radius: 5px; z-index: 1000;";
        document.body.appendChild(message);
        setTimeout(() => message.remove(), 3000);
    } catch (error) {
        console.error("❌ Error adding to cart:", error.message);
        alert("Error adding to cart: " + error.message);
    }
}

async function buyNow(productPath, name, price, credit) {
    if (!auth.currentUser) {
        alert("⚠️ Please log in to buy now!");
        window.location.href = "login.html";
        return;
    }

    const parts = productPath.split("/");
    const [category, subcategory, subSubcategoryOrDoc, subSubcategory, productId] = parts.length === 5 
        ? [parts[0], parts[1], parts[2], parts[3], parts[4]] 
        : [parts[0], parts[1], null, null, parts[2]];
    const cartCountElement = document.querySelector(`#cart-count-${productId}`);
    const cartCount = parseInt(cartCountElement.textContent) || 1;

    const productRef = subSubcategory 
        ? doc(db, "products", category, subcategory, "subcategories", subSubcategory, productId)
        : doc(db, "products", category, subcategory, productId);
    const productSnap = await getDoc(productRef);
    if (!productSnap.exists()) {
        alert("⚠️ Product not found!");
        return;
    }

    const productData = productSnap.data();
    const stock = Number(productData.stock || 0);
    if (cartCount > stock) {
        alert("⚠️ Not enough stock available!");
        return;
    }

    try {
        await addToCartInCart(productPath, name, price, cartCount, credit, false);
        cartCountElement.textContent = 0;
        window.location.href = "checkout.html";
    } catch (error) {
        console.error("❌ Error in Buy Now:", error.message);
        alert("Error processing Buy Now: " + error.message);
    }
}

window.updateCart = updateCart;
window.addToCart = addToCart;
window.buyNow = buyNow;

export { fetchProducts };
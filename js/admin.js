import { auth, db } from "./app.js";
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function fetchAllCustomers() {
    try {
        const customerRef = collection(db, "users");
        const querySnapshot = await getDocs(customerRef);
        const customers = [];
        querySnapshot.forEach((doc) => {
            customers.push({ id: doc.id, ...doc.data() });
        });
        console.log("📊 All Customers:", customers);
        return customers;
    } catch (error) {
        console.error("❌ Error fetching customers:", error);
        throw error;
    }
}

export async function addOrUpdateCustomer(customerId, customerData) {
    try {
        if (!customerId || !customerData.name || isNaN(customerData.creditLimit)) {
            throw new Error("Invalid input: UID, name, and credit limit are required.");
        }
        await setDoc(doc(db, "users", customerId), customerData, { merge: true });
        console.log("✅ Customer added/updated:", customerId);
        return true;
    } catch (error) {
        console.error("❌ Error adding/updating customer:", error);
        throw error;
    }
}

export async function deleteCustomer(customerId) {
    try {
        if (!customerId) {
            throw new Error("Customer UID is required.");
        }
        await deleteDoc(doc(db, "users", customerId));
        console.log("🗑️ Customer deleted:", customerId);
        return true;
    } catch (error) {
        console.error("❌ Error deleting customer:", error);
        throw error;
    }
}

export async function fetchAllProducts() {
    try {
        const categories = ["electronics", "fashion", "home-kitchen", "groceries"];
        const subcategoriesMap = {
            "electronics": ["mobiles", "accessories", "tv", "laptops"],
            "groceries": ["food", "vegetables","Dairy"],
            "home-kitchen": ["furniture", "appliances"],
            "fashion": ["Kids", "men","women"],
        };
        const subSubcategoriesMap = {
            
        };
        const products = [];

        for (const category of categories) {
            const subcategories = subcategoriesMap[category] || [];
            for (const subcategory of subcategories) {
                const productRef = collection(db, "products", category, subcategory);
                const querySnapshot = await getDocs(productRef);
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    products.push({
                        id: doc.id,
                        name: data.name || "Unnamed Product",
                        price: Number(data.price || 0),
                        stock: Number(data.stock || 0),
                        credit: Number(data.credit || 0),
                        category: category,
                        subcategory: subcategory,
                        subSubcategory: null,
                        imageUrl: data.imageUrl || "",
                        active: data.active !== undefined ? data.active : true
                    });
                });

                if (subSubcategoriesMap[category] && subSubcategoriesMap[category][subcategory]) {
                    const subSubcategories = subSubcategoriesMap[category][subcategory];
                    for (const subSubcategory of subSubcategories) {
                        const subProductRef = collection(db, "products", category, subcategory, "subcategories", subSubcategory);
                        const subQuerySnapshot = await getDocs(subProductRef);
                        subQuerySnapshot.forEach((doc) => {
                            const data = doc.data();
                            products.push({
                                id: doc.id,
                                name: data.name || "Unnamed Product",
                                price: Number(data.price || 0),
                                stock: Number(data.stock || 0),
                                credit: Number(data.credit || 0),
                                category: category,
                                subcategory: subcategory,
                                subSubcategory: subSubcategory,
                                imageUrl: data.imageUrl || "",
                                active: data.active !== undefined ? data.active : true
                            });
                        });
                    }
                }
            }
        }
        console.log("🛍️ All Products:", products);
        return products;
    } catch (error) {
        console.error("❌ Error fetching all products:", error);
        throw error;
    }
}

export async function fetchProduct(category, subcategory, subSubcategory, productId) {
    try {
        if (!category || !subcategory || !productId) {
            throw new Error("Category, Subcategory, and Product ID are required.");
        }
        const productRef = subSubcategory 
            ? doc(db, "products", category, subcategory, "subcategories", subSubcategory, productId)
            : doc(db, "products", category, subcategory, productId);
        const productDoc = await getDoc(productRef);
        if (productDoc.exists()) {
            const data = productDoc.data();
            return {
                id: productId,
                name: data.name || "Unnamed Product",
                price: Number(data.price || 0),
                stock: Number(data.stock || 0),
                credit: Number(data.credit || 0),
                category: category,
                subcategory: subcategory,
                subSubcategory: subSubcategory,
                imageUrl: data.imageUrl || "",
                active: data.active !== undefined ? data.active : true
            };
        }
        return null;
    } catch (error) {
        console.error("❌ Error fetching product:", error);
        throw error;
    }
}

export async function addOrUpdateProduct(category, subcategory, subSubcategory, productId, productData) {
    try {
        if (!category || !subcategory || !productId) {
            throw new Error("Category, Subcategory, and Product ID are required.");
        }
        const validatedData = {
            name: productData.name || "Unnamed Product",
            price: isNaN(productData.price) ? 0 : Number(productData.price),
            stock: isNaN(productData.stock) ? 0 : Number(productData.stock),
            credit: isNaN(productData.credit) ? 0 : Number(productData.credit),
            imageUrl: productData.imageUrl || "",
            active: productData.active !== undefined ? productData.active : true
        };
        const productRef = subSubcategory 
            ? doc(db, "products", category, subcategory, "subcategories", subSubcategory, productId)
            : doc(db, "products", category, subcategory, productId);
        await setDoc(productRef, validatedData, { merge: true });
        console.log("✅ Product added/updated in Firebase:", { category, subcategory, subSubcategory, productId, ...validatedData });
        return true;
    } catch (error) {
        console.error("❌ Error adding/updating product:", error);
        throw error;
    }
}

export async function deleteProduct(category, subcategory, subSubcategory, productId) {
    try {
        if (!category || !subcategory || !productId) {
            throw new Error("Category, Subcategory, and Product ID are required.");
        }
        const productRef = subSubcategory 
            ? doc(db, "products", category, subcategory, "subcategories", subSubcategory, productId)
            : doc(db, "products", category, subcategory, productId);
        await deleteDoc(productRef);
        console.log("🗑️ Product deleted from Firebase:", { category, subcategory, subSubcategory, productId });
        return true;
    } catch (error) {
        console.error("❌ Error deleting product:", error);
        throw error;
    }
}

export async function toggleProductActive(category, subcategory, subSubcategory, productId, isActive) {
    try {
        if (!category || !subcategory || !productId) {
            throw new Error("Category, Subcategory, and Product ID are required.");
        }
        const productRef = subSubcategory 
            ? doc(db, "products", category, subcategory, "subcategories", subSubcategory, productId)
            : doc(db, "products", category, subcategory, productId);
        await setDoc(productRef, { active: isActive }, { merge: true });
        console.log(`✅ Product ${isActive ? 'activated' : 'deactivated'} in Firebase:`, { category, subcategory, subSubcategory, productId });
        return true;
    } catch (error) {
        console.error("❌ Error toggling product active status:", error);
        throw error;
    }
}

export async function fetchTopCustomers() {
    try {
        const ordersRef = collection(db, "orders");
        const ordersSnapshot = await getDocs(ordersRef);
        const customerOrders = {};

        ordersSnapshot.forEach((doc) => {
            const order = doc.data();
            const userId = order.userId;
            customerOrders[userId] = (customerOrders[userId] || { orderCount: 0, totalCredits: 0 });
            customerOrders[userId].orderCount += 1;
            customerOrders[userId].totalCredits += Number(order.creditsEarned || 0);
        });

        const customerPromises = Object.keys(customerOrders).map(async (userId) => {
            const userDoc = await getDoc(doc(db, "users", userId));
            return {
                name: userDoc.exists() ? userDoc.data().name || userDoc.data().email : "Unknown",
                orderCount: customerOrders[userId].orderCount,
                totalCredits: customerOrders[userId].totalCredits
            };
        });

        const customers = await Promise.all(customerPromises);
        return customers.sort((a, b) => b.orderCount - a.orderCount).slice(0, 5);
    } catch (error) {
        console.error("❌ Error fetching top customers:", error);
        return [];
    }
}

export async function fetchCashPurchases() {
    try {
        const ordersRef = collection(db, "orders");
        const ordersSnapshot = await getDocs(ordersRef);
        const cashPurchases = [];

        for (const orderDoc of ordersSnapshot.docs) {
            const order = orderDoc.data();
            if (!order.isCredit) {
                const userDoc = await getDoc(doc(db, "users", order.userId));
                cashPurchases.push({
                    name: userDoc.exists() ? userDoc.data().name || userDoc.data().email : "Unknown",
                    date: order.timestamp ? new Date(order.timestamp.seconds * 1000).toLocaleDateString() : "N/A",
                    total: Number(order.total || 0),
                    creditsEarned: Number(order.creditsEarned || 0)
                });
            }
        }

        return cashPurchases.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
        console.error("❌ Error fetching cash purchases:", error);
        return [];
    }
}

export async function fetchCreditPurchases() {
    try {
        const ordersRef = collection(db, "orders");
        const ordersSnapshot = await getDocs(ordersRef);
        const creditPurchases = [];

        for (const orderDoc of ordersSnapshot.docs) {
            const order = orderDoc.data();
            if (order.isCredit) {
                const userDoc = await getDoc(doc(db, "users", order.userId));
                creditPurchases.push({
                    name: userDoc.exists() ? userDoc.data().name || userDoc.data().email : "Unknown",
                    date: order.timestamp ? new Date(order.timestamp.seconds * 1000).toLocaleDateString() : "N/A",
                    total: Number(order.total || 0),
                    creditsEarned: Number(order.creditsEarned || 0)
                });
            }
        }

        return creditPurchases.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
        console.error("❌ Error fetching credit purchases:", error);
        return [];
    }
}

export async function fetchCurrentStock() {
    try {
        const products = await fetchAllProducts();
        return products.map(p => ({
            name: p.name,
            stock: p.stock || 0
        })).sort((a, b) => b.stock - a.stock);
    } catch (error) {
        console.error("❌ Error fetching current stock:", error);
        return [];
    }
}

export async function fetchHighLowStock() {
    try {
        const products = await fetchAllProducts();
        const sorted = products.sort((a, b) => (b.stock || 0) - (a.stock || 0));
        return {
            high: sorted[0] || { name: "N/A", stock: 0 },
            low: sorted[sorted.length - 1] || { name: "N/A", stock: 0 }
        };
    } catch (error) {
        console.error("❌ Error fetching high/low stock:", error);
        return { high: { name: "N/A", stock: 0 }, low: { name: "N/A", stock: 0 } };
    }
}

export async function fetchSales() {
    try {
        const ordersRef = collection(db, "orders");
        const ordersSnapshot = await getDocs(ordersRef);
        const salesByDate = {};
        let totalSales = 0;
        let totalCredits = 0;
        const bills = [];

        ordersSnapshot.forEach((orderDoc) => {
            const order = orderDoc.data();
            const date = order.timestamp ? new Date(order.timestamp.seconds * 1000).toLocaleDateString() : "N/A";
            const orderTotal = Number(order.total || 0);
            const orderCredits = Number(order.creditsEarned || 0);
            salesByDate[date] = (salesByDate[date] || 0) + orderTotal;
            totalSales += orderTotal;
            totalCredits += orderCredits;
            bills.push({ date, total: orderTotal, creditsEarned: orderCredits });
        });

        const sales = Object.keys(salesByDate).map(date => ({
            date,
            total: salesByDate[date]
        })).sort((a, b) => new Date(b.date) - new Date(a.date));

        return { sales, totalSales, bills, totalCredits };
    } catch (error) {
        console.error("❌ Error fetching sales:", error);
        return { sales: [], totalSales: 0, bills: [], totalCredits: 0 };
    }
}

export async function fetchTopBottomItems() {
    try {
        const ordersRef = collection(db, "orders");
        const ordersSnapshot = await getDocs(ordersRef);
        const itemSales = {};

        ordersSnapshot.forEach((doc) => {
            const order = doc.data();
            // Ensure order.items is an array before iterating
            const items = Array.isArray(order.items) ? order.items : [];
            items.forEach(item => {
                // Check if item has a name and quantity
                if (item && item.name) {
                    itemSales[item.name] = (itemSales[item.name] || 0) + (Number(item.quantity) || 0);
                }
            });
        });

        const items = Object.keys(itemSales).map(name => ({
            name,
            sales: itemSales[name]
        })).sort((a, b) => b.sales - a.sales);

        const top = items.slice(0, 5);
        const bottom = items.slice(-5).reverse();
        return { top, bottom };
    } catch (error) {
        console.error("❌ Error fetching top/bottom items:", error);
        return { top: [], bottom: [] };
    }
}
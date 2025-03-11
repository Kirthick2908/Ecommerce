// reports.js

import { db } from "./app.js";
import { collection, getDocs, query, orderBy } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Function to fetch sales data and generate a report
async function fetchSalesReport() {
    const salesQuery = query(collection(db, "orders"), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(salesQuery);
    
    const salesReport = document.getElementById("sales-report");
    salesReport.innerHTML = ""; 

    let totalRevenue = 0;
    let totalOrders = querySnapshot.size;

    querySnapshot.forEach((doc) => {
        const order = doc.data();
        totalRevenue += order.totalPrice;

        salesReport.innerHTML += `
            <div class="report-item">
                <p><strong>Order ID:</strong> ${doc.id}</p>
                <p><strong>Customer:</strong> ${order.customerName}</p>
                <p><strong>Amount:</strong> $${order.totalPrice.toFixed(2)}</p>
                <p><strong>Date:</strong> ${new Date(order.timestamp.toDate()).toLocaleString()}</p>
                <hr>
            </div>
        `;
    });

    document.getElementById("total-orders").innerText = `📦 Total Orders: ${totalOrders}`;
    document.getElementById("total-revenue").innerText = `💰 Total Revenue: $${totalRevenue.toFixed(2)}`;
}

// Function to fetch product performance data
async function fetchProductReport() {
    const productQuery = collection(db, "products");
    const querySnapshot = await getDocs(productQuery);
    
    const productReport = document.getElementById("product-report");
    productReport.innerHTML = "";

    querySnapshot.forEach((doc) => {
        const product = doc.data();

        productReport.innerHTML += `
            <div class="report-item">
                <p><strong>Product:</strong> ${product.name}</p>
                <p><strong>Price:</strong> $${product.price}</p>
                <img src="${product.imageUrl}" width="100" alt="${product.name}">
                <hr>
            </div>
        `;
    });
}

// Run reports when the page loads
document.addEventListener("DOMContentLoaded", () => {
    fetchSalesReport();
    fetchProductReport();
});

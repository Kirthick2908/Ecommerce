import { auth } from "./app.js";
import { fetchAllProducts, fetchSales } from "./admin.js";

document.addEventListener("DOMContentLoaded", async () => {
    console.log("Analysis page loaded, initializing charts...");

    // Logout functionality
    document.getElementById("logout-btn").addEventListener("click", () => {
        auth.signOut().then(() => {
            window.location.href = "login.html";
        }).catch(error => {
            console.error("Logout failed:", error);
        });
    });

    // Product Analysis Chart (Stock Levels by Product)
    async function renderProductChart() {
        try {
            const products = await fetchAllProducts();
            const labels = products.map(p => p.name);
            const stockData = products.map(p => p.stock || 0);

            const ctx = document.getElementById("productChart").getContext("2d");
            new Chart(ctx, {
                type: "bar",
                data: {
                    labels: labels,
                    datasets: [{
                        label: "Stock Levels",
                        data: stockData,
                        backgroundColor: "rgba(75, 192, 192, 0.6)",
                        borderColor: "rgba(75, 192, 192, 1)",
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: "Stock Quantity" }
                        },
                        x: {
                            title: { display: true, text: "Products" }
                        }
                    },
                    plugins: {
                        title: { display: true, text: "Product Stock Analysis" }
                    }
                }
            });
        } catch (error) {
            console.error("Error rendering product chart:", error);
        }
    }

    // Sales Analysis Chart (Daily Sales Growth)
    async function renderSalesChart() {
        try {
            const { sales } = await fetchSales();
            const labels = sales.map(s => s.date);
            const salesData = sales.map(s => s.total);

            const ctx = document.getElementById("salesChart").getContext("2d");
            new Chart(ctx, {
                type: "bar",
                data: {
                    labels: labels,
                    datasets: [{
                        label: "Daily Sales ($)",
                        data: salesData,
                        backgroundColor: "rgba(153, 102, 255, 0.6)",
                        borderColor: "rgba(153, 102, 255, 1)",
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: "Sales Amount ($)" }
                        },
                        x: {
                            title: { display: true, text: "Date" }
                        }
                    },
                    plugins: {
                        title: { display: true, text: "Sales Growth Analysis" }
                    }
                }
            });
        } catch (error) {
            console.error("Error rendering sales chart:", error);
        }
    }

    // Render charts
    await renderProductChart();
    await renderSalesChart();
});



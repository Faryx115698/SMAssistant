<?php
session_start();

if (!isset($_SESSION["user"])) {
    header("Location: login.php");
    exit();
}

$medicines = [
    [
        "name" => "Paracetamol 500mg tab",
        "category" => "Analgesic / Antipyretic",
        "unit" => "Tablet",
        "stock" => 620,
        "reorder" => 120,
        "status" => "Adequate",
        "expiry" => "12/31/2027"
    ],
    [
        "name" => "Amoxicillin 500mg cap",
        "category" => "Antibiotic",
        "unit" => "Capsule",
        "stock" => 45,
        "reorder" => 120,
        "status" => "Low Stock",
        "expiry" => "08/15/2028"
    ],
    [
        "name" => "Losartan 50mg tab",
        "category" => "Anti-hypertensive",
        "unit" => "Tablet",
        "stock" => 148,
        "reorder" => 120,
        "status" => "Adequate",
        "expiry" => "02/20/2027"
    ],
    [
        "name" => "Omeprazole 20mg cap",
        "category" => "Gastrointestinal",
        "unit" => "Capsule",
        "stock" => 32,
        "reorder" => 90,
        "status" => "Low Stock",
        "expiry" => "11/20/2026"
    ],
    [
        "name" => "Salbutamol 2mg tab",
        "category" => "Respiratory",
        "unit" => "Tablet",
        "stock" => 156,
        "reorder" => 90,
        "status" => "Adequate",
        "expiry" => "05/20/2027"
    ],
    [
        "name" => "Cetirizine 10mg tab",
        "category" => "Antihistamine",
        "unit" => "Tablet",
        "stock" => 78,
        "reorder" => 120,
        "status" => "Low Stock",
        "expiry" => "08/14/2026"
    ],
    [
        "name" => "Ferrous Sulfate 300mg tab",
        "category" => "Hematinic / Supplement",
        "unit" => "Tablet",
        "stock" => 8,
        "reorder" => 90,
        "status" => "Out of Stock",
        "expiry" => "06/15/2027"
    ],
    [
        "name" => "Loratadine 10mg tab",
        "category" => "Antihistamine",
        "unit" => "Tablet",
        "stock" => 213,
        "reorder" => 120,
        "status" => "Adequate",
        "expiry" => "06/12/2027"
    ],
    [
        "name" => "Metformin 500mg tab",
        "category" => "Anti-diabetic",
        "unit" => "Tablet",
        "stock" => 60,
        "reorder" => 120,
        "status" => "Low Stock",
        "expiry" => "14/03/2027"
    ],
    [
        "name" => "Guaifenesin 100mg/5ml",
        "category" => "Expectorant",
        "unit" => "Syrup",
        "stock" => 65,
        "reorder" => 120,
        "status" => "Low Stock",
        "expiry" => "09/05/2026"
    ]
];

include "sidebar.php";

?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Medicine Inventory and Issuance</title>
    <link rel="stylesheet" href="inventory.css">
    <script src="darkmode.js"></script>

</head>

<body>
    <main class="main-content">

        <header class="page-header">

            <div>

                <h1>Medicine Inventory and Issuance</h1>

                <p>
                    Monitor medicine stocks, manage inventory and record issuance to patients.
                </p>

            </div>


            <div class="header-right">

                <div class="admin-profile">

                    <div class="admin-text">

                        <small>You are logged in as</small>

                        <strong>
                            <?php
                            echo htmlspecialchars(
                                $_SESSION["user"]["full_name"]
                                ?? "ADMIN CYRON"
                            );
                            ?>
                        </strong>

                    </div>

                    <!-- REPLACE THIS WITH YOUR ADMIN ICON -->
                    <img src="icons/admin-profile.png" alt="Admin" class="admin-photo"
                        onerror="this.style.display='none'">

                </div>


                <div class="header-actions">

                    <button class="header-button">
                        + Ask AI Moto
                    </button>

                    <button class="header-button">
                        ⇩ Import Stock
                    </button>

                    <button class="header-button primary" onclick="openMedicineModal()">
                        + Add Medicine
                    </button>

                    <button class="header-button">
                        ▰ Reports
                    </button>

                </div>

            </div>

        </header>


        <!-- SUMMARY -->

        <section class="summary-cards">

            <div class="summary-card">

                <div class="summary-icon blue">
                    <img src="icons/total medicines.png" alt="Total Medicines">
                </div>

                <div>
                    <span>Total Medicines</span>
                    <strong>156</strong>
                    <small>Active in inventory</small>
                </div>

            </div>


            <div class="summary-card">

                <div class="summary-icon green">
                    <img src="icons/total stock.png" alt="Stock">
                </div>

                <div>
                    <span>Total Stock</span>
                    <strong>4,782</strong>
                    <small>Units in stock</small>
                </div>

            </div>


            <div class="summary-card">

                <div class="summary-icon orange">
                    <img src="icons/low stock.png" alt="Low Stock">
                </div>

                <div>
                    <span>Low Stock Alerts</span>
                    <strong>12</strong>
                    <small>Medicines</small>
                </div>

            </div>


            <div class="summary-card">

                <div class="summary-icon red">
                    <img src="icons/out of stock.png" alt="Out of Stock">
                </div>

                <div>
                    <span>Out of Stock</span>
                    <strong>3</strong>
                    <small>Medicines</small>
                </div>

            </div>


            <div class="summary-card">

                <div class="summary-icon purple">
                    <img src="icons/medicine issued.png" alt="Issued">
                </div>

                <div>
                    <span>Issued This Month</span>
                    <strong>356</strong>
                    <small>Transactions</small>
                </div>

            </div>

        </section>


        <!-- INVENTORY AREA -->

        <section class="inventory-card card">

            <div class="inventory-tabs">

                <button class="inventory-tab active">
                    Inventory Management
                </button>

                <button class="inventory-tab">
                    Medicine Issuance
                </button>

            </div>


            <div class="inventory-content">


                <!-- TABLE -->

                <div class="inventory-table-section">

                    <div class="inventory-controls">

                        <div class="search-input">

                            <input type="text" id="medicineSearch" placeholder="Search medicine name..."
                                onkeyup="searchMedicine()">

                            <span>⌕</span>

                        </div>


                        <button class="filter-button">
                            ⚑ Filter
                        </button>


                        <select>
                            <option>All Categories</option>
                            <option>Analgesic</option>
                            <option>Antibiotic</option>
                            <option>Antihistamine</option>
                            <option>Anti-hypertensive</option>
                        </select>


                        <select>
                            <option>All Status</option>
                            <option>Adequate</option>
                            <option>Low Stock</option>
                            <option>Out of Stock</option>
                        </select>


                        <button class="refresh-button">
                            ↻ Refresh
                        </button>

                    </div>


                    <div class="table-wrapper">

                        <table id="medicineTable">

                            <thead>

                                <tr>

                                    <th>Medicine Name</th>
                                    <th>Category</th>
                                    <th>Unit</th>
                                    <th>Current Stock</th>
                                    <th>Reorder Level</th>
                                    <th>Status</th>
                                    <th>Expiry Date</th>
                                    <th>Actions</th>

                                </tr>

                            </thead>


                            <tbody>

                                <?php foreach ($medicines as $medicine): ?>

                                    <tr>

                                        <td>
                                            <strong>
                                                <?php echo htmlspecialchars($medicine["name"]); ?>
                                            </strong>
                                        </td>

                                        <td>
                                            <?php echo htmlspecialchars($medicine["category"]); ?>
                                        </td>

                                        <td>
                                            <?php echo htmlspecialchars($medicine["unit"]); ?>
                                        </td>

                                        <td
                                            class="stock-number <?php echo strtolower(str_replace(" ", "-", $medicine["status"])); ?>">
                                            <?php echo $medicine["stock"]; ?>
                                        </td>

                                        <td>
                                            <?php echo $medicine["reorder"]; ?>
                                        </td>

                                        <td>

                                            <span
                                                class="stock-status <?php echo strtolower(str_replace(" ", "-", $medicine["status"])); ?>">
                                                <?php echo htmlspecialchars($medicine["status"]); ?>
                                            </span>

                                        </td>

                                        <td>
                                            <?php echo htmlspecialchars($medicine["expiry"]); ?>
                                        </td>

                                        <td class="actions">

                                            <!-- REPLACE ICONS HERE -->
                                            <button title="View">◉</button>

                                            <button title="Edit">✎</button>

                                            <button title="More">⋮</button>

                                        </td>

                                    </tr>

                                <?php endforeach; ?>

                            </tbody>

                        </table>

                    </div>


                    <div class="table-footer">

                        <span>
                            Showing 1 to 10 of 156 medicines
                        </span>

                        <div class="pagination">

                            <button>‹</button>
                            <button class="active">1</button>
                            <button>2</button>
                            <button>3</button>
                            <button>...</button>
                            <button>16</button>
                            <button>›</button>

                        </div>

                        <select>
                            <option>10</option>
                            <option>25</option>
                            <option>50</option>
                        </select>

                    </div>

                </div>


                <!-- RIGHT SIDE -->

                <aside class="inventory-side">


                    <div class="side-card">

                        <div class="side-card-header">

                            <h2>Low Stock Alerts</h2>

                            <a href="#">View All</a>

                        </div>


                        <div class="alert-item">

                            <span class="alert-icon">⚠</span>

                            <div>
                                <strong>Amoxicillin 500mg cap</strong>
                                <small>Current stock: 45 units</small>
                            </div>

                            <span>Reorder level: 120</span>

                        </div>


                        <div class="alert-item">

                            <span class="alert-icon">⚠</span>

                            <div>
                                <strong>Omeprazole 20mg cap</strong>
                                <small>Current stock: 32 units</small>
                            </div>

                            <span>Reorder level: 90</span>

                        </div>


                        <div class="alert-item">

                            <span class="alert-icon">⚠</span>

                            <div>
                                <strong>Cetirizine 10mg tab</strong>
                                <small>Current stock: 78 units</small>
                            </div>

                            <span>Reorder level: 120</span>

                        </div>


                        <div class="alert-item">

                            <span class="alert-icon">⚠</span>

                            <div>
                                <strong>Metformin 500mg tab</strong>
                                <small>Current stock: 60 units</small>
                            </div>

                            <span>Reorder level: 120</span>

                        </div>


                        <a class="side-link" href="#">
                            View all low stock medicines →
                        </a>

                    </div>


                    <div class="side-card">

                        <div class="side-card-header">

                            <h2>Recent Issuance</h2>

                            <a href="#">View All</a>

                        </div>


                        <div class="issuance-table">

                            <div class="issuance-heading">
                                <span>Patient</span>
                                <span>Medicine</span>
                                <span>Qty</span>
                                <span>Date</span>
                            </div>


                            <div>
                                <span>Juan D. Dela Cruz</span>
                                <span>Paracetamol 500mg tab</span>
                                <span>10 tabs</span>
                                <span>May 12</span>
                            </div>


                            <div>
                                <span>Maria S. Esparza</span>
                                <span>Amoxicillin 500mg cap</span>
                                <span>15 caps</span>
                                <span>May 12</span>
                            </div>


                            <div>
                                <span>Leandro D. Garcia</span>
                                <span>Losartan 50mg tab</span>
                                <span>2 bottles</span>
                                <span>May 12</span>
                            </div>


                            <div>
                                <span>Georgina F. Williams</span>
                                <span>Paracetamol 500mg tab</span>
                                <span>5 tabs</span>
                                <span>May 13</span>
                            </div>


                            <div>
                                <span>Pedro O. Pendulo</span>
                                <span>Cetirizine 10mg tab</span>
                                <span>10 tabs</span>
                                <span>May 13</span>
                            </div>

                        </div>


                        <a class="side-link" href="#">
                            Go to Medicine Issuance →
                        </a>

                    </div>

                </aside>

            </div>

        </section>


    </main>


    <!-- ADD MEDICINE MODAL -->

    <div class="modal" id="medicineModal">

        <div class="modal-box">

            <div class="modal-header">

                <h2>Add Medicine</h2>

                <button onclick="closeMedicineModal()">×</button>

            </div>


            <form onsubmit="saveMedicine(event)">

                <div class="form-grid">

                    <div>
                        <label>Medicine Name</label>
                        <input type="text" required>
                    </div>

                    <div>
                        <label>Category</label>

                        <select required>

                            <option value="">
                                Select category
                            </option>

                            <option>Analgesic</option>
                            <option>Antibiotic</option>
                            <option>Antihistamine</option>
                            <option>Anti-hypertensive</option>
                            <option>Respiratory</option>

                        </select>

                    </div>

                    <div>
                        <label>Unit</label>
                        <input type="text" placeholder="Tablet">
                    </div>

                    <div>
                        <label>Current Stock</label>
                        <input type="number" min="0" required>
                    </div>

                    <div>
                        <label>Reorder Level</label>
                        <input type="number" min="0" required>
                    </div>

                    <div>
                        <label>Expiry Date</label>
                        <input type="date" required>
                    </div>

                </div>


                <div class="modal-actions">

                    <button type="button" class="cancel-button" onclick="closeMedicineModal()">
                        Cancel
                    </button>

                    <button type="submit" class="save-button">
                        Save Medicine
                    </button>

                </div>

            </form>

        </div>

    </div>


    <script>

        function openMedicineModal() {
            document
                .getElementById("medicineModal")
                .classList.add("show");
        }

        function closeMedicineModal() {
            document
                .getElementById("medicineModal")
                .classList.remove("show");
        }

        function saveMedicine(event) {

            event.preventDefault();

            alert("Medicine added successfully.");

            closeMedicineModal();

        }

        function searchMedicine() {

            const search =
                document
                    .getElementById("medicineSearch")
                    .value
                    .toLowerCase();

            const rows =
                document.querySelectorAll("#medicineTable tbody tr");

            rows.forEach(function (row) {

                const text =
                    row.textContent.toLowerCase();

                row.style.display =
                    text.includes(search)
                        ? ""
                        : "none";

            });

        }

        window.addEventListener("click", function (event) {

            const modal =
                document.getElementById("medicineModal");

            if (event.target === modal) {
                closeMedicineModal();
            }

        });

    </script>

</body>

</html>
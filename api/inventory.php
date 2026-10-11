<?php
// api/inventory.php - Inventory & Issuance REST endpoint

session_start();
require_once __DIR__ . '/db.php';

if (!isset($_SESSION["user"])) {
    jsonError("Unauthorized", 401);
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

jsonResponse([
    "success" => true,
    "medicines" => $medicines
]);

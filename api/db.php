<?php
// api/db.php - Database connection & JSON helper for REST API

header('Content-Type: application/json; charset=utf-8');

function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function jsonError($message, $statusCode = 400) {
    jsonResponse(['success' => false, 'error' => $message], $statusCode);
}

function jsonSuccess($data = [], $message = null) {
    $res = ['success' => true];
    if ($message !== null) {
        $res['message'] = $message;
    }
    if (!empty($data)) {
        $res['data'] = $data;
    }
    jsonResponse($res, 200);
}

try {
    require_once __DIR__ . '/../db.php';
} catch (mysqli_sql_exception $e) {
    jsonError('Database connection failed. Please ensure MySQL is running in XAMPP.', 500);
}

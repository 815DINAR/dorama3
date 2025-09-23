<?php
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Метод не поддерживается']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['user_id']) || !isset($input['session_id'])) {
    echo json_encode(['success' => false, 'message' => 'Неверные данные']);
    exit;
}

try {
    $userId = $input['user_id'];
    $sessionId = $input['session_id'];
    
    $pdo = getDBConnection();
    
    // Обновляем активность сессии
    $sql = "UPDATE sessions 
            SET last_activity = NOW(),
                duration_seconds = EXTRACT(EPOCH FROM (NOW() - login_time))
            WHERE session_id = :session_id 
            AND user_id = :user_id 
            AND logout_time IS NULL";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':session_id' => $sessionId,
        ':user_id' => $userId
    ]);
    
    // Обновляем активность пользователя
    $stmt = $pdo->prepare("UPDATE users SET last_activity = NOW() WHERE user_id = :user_id");
    $stmt->execute([':user_id' => $userId]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Активность обновлена',
        'last_activity' => date('Y-m-d H:i:s')
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
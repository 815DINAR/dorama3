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

if (!$input || !isset($input['user_id']) || !isset($input['action'])) {
    echo json_encode(['success' => false, 'message' => 'Неверные данные']);
    exit;
}

try {
    $userId = $input['user_id'];
    $action = $input['action'];
    
    $pdo = getDBConnection();
    
    switch ($action) {
        case 'add_watched':
            if (!isset($input['video_id'])) {
                throw new Exception('ID видео не передан');
            }
            
            $videoFilename = $input['video_id']; // На самом деле это filename
            $duration = $input['duration'] ?? 5;
            
            // Получаем ID видео
            $stmt = $pdo->prepare("SELECT id FROM videos WHERE filename = :filename");
            $stmt->execute([':filename' => $videoFilename]);
            $video = $stmt->fetch();
            
            if (!$video) {
                throw new Exception('Видео не найдено');
            }
            
            // Добавляем в просмотренные (или обновляем)
            $sql = "INSERT INTO watch_progress (user_id, video_id, watched_at, duration) 
                    VALUES (:user_id, :video_id, NOW(), :duration)
                    ON CONFLICT (user_id, video_id) DO UPDATE 
                    SET watched_at = NOW(), duration = :duration";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':user_id' => $userId,
                ':video_id' => $video['id'],
                ':duration' => $duration
            ]);
            
            $message = 'Видео добавлено в просмотренные';
            break;
            
        case 'update_last_video':
            // TODO: Добавить поле last_video_id в таблицу users если нужно
            $message = 'Последнее видео обновлено';
            break;
            
        case 'save_session_order':
            if (!isset($input['order'])) {
                throw new Exception('Порядок видео не передан');
            }
            
            $order = $input['order']; // Массив filename
            
            // Очищаем старый порядок
            $stmt = $pdo->prepare("DELETE FROM session_order WHERE user_id = :user_id");
            $stmt->execute([':user_id' => $userId]);
            
            // Сохраняем новый порядок
            $position = 0;
            foreach ($order as $filename) {
                $stmt = $pdo->prepare("
                    INSERT INTO session_order (user_id, video_id, position)
                    SELECT :user_id, id, :position 
                    FROM videos 
                    WHERE filename = :filename
                ");
                $stmt->execute([
                    ':user_id' => $userId,
                    ':filename' => $filename,
                    ':position' => $position++
                ]);
            }
            
            $message = 'Порядок сессии сохранен';
            break;
            
        case 'reset_progress':
            // Удаляем весь прогресс
            $pdo->prepare("DELETE FROM watch_progress WHERE user_id = :user_id")
                ->execute([':user_id' => $userId]);
            $pdo->prepare("DELETE FROM session_order WHERE user_id = :user_id")
                ->execute([':user_id' => $userId]);
            
            $message = 'Прогресс сброшен';
            break;
            
        case 'clean_deleted_videos':
            // Удаляем записи о несуществующих видео
            $existingVideos = $input['existing_videos'] ?? [];
            
            if (!empty($existingVideos)) {
                // Получаем ID существующих видео
                $placeholders = array_fill(0, count($existingVideos), '?');
                $sql = "SELECT id FROM videos WHERE filename IN (" . implode(',', $placeholders) . ")";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($existingVideos);
                $validIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
                
                if (!empty($validIds)) {
                    // Удаляем записи о несуществующих видео
                    $placeholders = implode(',', $validIds);
                    $pdo->exec("DELETE FROM watch_progress WHERE user_id = $userId AND video_id NOT IN ($placeholders)");
                    $pdo->exec("DELETE FROM session_order WHERE user_id = $userId AND video_id NOT IN ($placeholders)");
                }
            }
            
            $message = 'Удаленные видео очищены';
            break;
            
        default:
            throw new Exception('Неизвестное действие: ' . $action);
    }
    
    // Обновляем время модификации
    $stmt = $pdo->prepare("UPDATE users SET last_modified = NOW() WHERE user_id = :user_id");
    $stmt->execute([':user_id' => $userId]);
    
    // Получаем обновленную статистику
    $stmt = $pdo->prepare("
        SELECT COUNT(DISTINCT video_id) as watched_count
        FROM watch_progress 
        WHERE user_id = :user_id
    ");
    $stmt->execute([':user_id' => $userId]);
    $stats = $stmt->fetch();
    
    $stmt = $pdo->prepare("
        SELECT v.filename 
        FROM watch_progress wp
        JOIN videos v ON v.id = wp.video_id
        WHERE wp.user_id = :user_id
        ORDER BY wp.watched_at DESC
    ");
    $stmt->execute([':user_id' => $userId]);
    $watchedVideos = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo json_encode([
        'success' => true,
        'message' => $message,
        'watch_data' => [
            'watchedVideos' => $watchedVideos,
            'watchedCount' => $stats['watched_count'] ?? 0,
            'lastVideoId' => null,
            'totalCycles' => 0
        ]
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
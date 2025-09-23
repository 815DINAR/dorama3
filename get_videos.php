<?php
require_once __DIR__ . '/config/database.php';

header('Content-Type: application/json');

try {
    $pdo = getDBConnection();
    if (!$pdo) {
        throw new Exception("Ошибка подключения к БД");
    }
    
    $sql = "SELECT id, filename, s3_url, title, description, series, seasons, 
                   status, country, genre, year, file_size, uploaded_at
            FROM videos 
            WHERE is_active = true 
            ORDER BY uploaded_at DESC";
    
    $stmt = $pdo->query($sql);
    $videos = $stmt->fetchAll();
    
    // Форматируем для frontend
    $formattedVideos = array_map(function($video) {
        return [
            'id' => $video['id'],
            'filename' => $video['filename'],
            'url' => $video['s3_url'],
            'title' => $video['title'],
            'description' => $video['description'],
            'series' => $video['series'],
            'seasons' => $video['seasons'],
            'status' => $video['status'],
            'country' => $video['country'],
            'genre' => $video['genre'],
            'year' => $video['year']
        ];
    }, $videos);
    
    echo json_encode($formattedVideos);
    
} catch (Exception $e) {
    error_log("Error in get_videos.php: " . $e->getMessage());
    echo json_encode([]);
}
?>
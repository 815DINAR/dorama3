<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/s3_client.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["success" => false, "message" => "Метод не поддерживается"]);
    exit();
}

// Проверка файла
if (!isset($_FILES['videoFile'])) {
    echo json_encode(["success" => false, "message" => "Нет файла для загрузки"]);
    exit();
}

$file = $_FILES['videoFile'];

// Проверка на ошибки
if ($file['error'] !== UPLOAD_ERR_OK) {
    $errorMessages = [
        UPLOAD_ERR_INI_SIZE => 'Файл превышает максимальный размер',
        UPLOAD_ERR_FORM_SIZE => 'Файл превышает максимальный размер формы',
        UPLOAD_ERR_PARTIAL => 'Файл загружен частично',
        UPLOAD_ERR_NO_FILE => 'Файл не был загружен',
        UPLOAD_ERR_NO_TMP_DIR => 'Отсутствует временная папка',
        UPLOAD_ERR_CANT_WRITE => 'Ошибка записи файла на диск',
        UPLOAD_ERR_EXTENSION => 'Загрузка файла остановлена расширением'
    ];
    $message = $errorMessages[$file['error']] ?? 'Неизвестная ошибка';
    echo json_encode(["success" => false, "message" => $message]);
    exit();
}

// Проверка расширения
$fileName = basename($file['name']);
$fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
$allowedExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'];

if (!in_array($fileExtension, $allowedExtensions)) {
    echo json_encode(["success" => false, "message" => "Недопустимый формат файла"]);
    exit();
}

// Получение метаданных
$title = $_POST['title'] ?? '';
$description = $_POST['description'] ?? '';
$series = $_POST['series'] ?? '';
$seasons = $_POST['seasons'] ?? '';
$status = $_POST['status'] ?? '';
$country = $_POST['country'] ?? '';
$genre = $_POST['genre'] ?? '';
$year = $_POST['year'] ?? '';

// Валидация
if (empty($title) || empty($description)) {
    echo json_encode(["success" => false, "message" => "Название и описание обязательны"]);
    exit();
}

try {
    // 1. Загрузка на S3
    $s3Client = new S3Client();
    $s3Result = $s3Client->uploadFile($file['tmp_name'], $fileName);
    
    if (!$s3Result['success']) {
        throw new Exception("Ошибка S3: " . $s3Result['error']);
    }
    
    // 2. Сохранение в PostgreSQL
    $pdo = getDBConnection();
    if (!$pdo) {
        throw new Exception("Ошибка подключения к БД");
    }
    
    // Проверка на дубликат
    $checkStmt = $pdo->prepare("SELECT id FROM videos WHERE filename = :filename");
    $checkStmt->execute([':filename' => $fileName]);
    if ($checkStmt->fetch()) {
        throw new Exception("Файл с таким именем уже существует");
    }
    
    // Вставка
    $sql = "INSERT INTO videos (filename, s3_url, title, description, series, seasons, status, country, genre, year, file_size) 
            VALUES (:filename, :s3_url, :title, :description, :series, :seasons, :status, :country, :genre, :year, :file_size)
            RETURNING id";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':filename' => $fileName,
        ':s3_url' => $s3Result['url'],
        ':title' => $title,
        ':description' => $description,
        ':series' => $series,
        ':seasons' => $seasons,
        ':status' => $status,
        ':country' => $country,
        ':genre' => $genre,
        ':year' => $year,
        ':file_size' => $file['size']
    ]);
    
    $videoId = $stmt->fetch()['id'];
    
    echo json_encode([
        "success" => true,
        "message" => "Видео успешно загружено",
        "video_id" => $videoId,
        "s3_url" => $s3Result['url']
    ]);
    
} catch (Exception $e) {
    // Откат: удаление из S3
    if (isset($s3Result) && $s3Result['success']) {
        $s3Client->deleteFile($fileName);
    }
    
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}
?>
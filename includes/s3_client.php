<?php
require_once __DIR__ . '/../config/s3_config.php';

/**
 * Рабочий S3 клиент для Reg.ru Object Storage (Signature V4)
 */
class S3Client {
    private $accessKey;
    private $secretKey;
    private $endpoint;
    private $bucket;
    private $region;

    public function __construct() {
        $this->accessKey = S3_ACCESS_KEY;
        $this->secretKey = S3_SECRET_KEY;
        $this->endpoint = S3_ENDPOINT; // s3.regru.cloud
        $this->bucket = S3_BUCKET;
        $this->region = S3_REGION; // ru-1
    }

    /**
     * Загрузка файла на S3
     */
    public function uploadFile($localFilePath, $s3FileName, $contentType = null) {
        if (!file_exists($localFilePath)) {
            return ['success' => false, 'error' => 'Файл не найден'];
        }

        $fileContent = file_get_contents($localFilePath);
        if (!$contentType) {
            $contentType = mime_content_type($localFilePath);
        }

        $date = gmdate('Ymd\THis\Z');
        $shortDate = gmdate('Ymd');

        $uri = $this->bucket . '/' . $s3FileName; // path-style

        $headers = [
            'Host' => $this->endpoint,
            'x-amz-date' => $date,
            'x-amz-content-sha256' => hash('sha256', $fileContent),
            'x-amz-acl' => 'public-read',
            'Content-Type' => $contentType,
            'Content-Length' => filesize($localFilePath)
        ];

        $headers['Authorization'] = $this->createSignatureV4('PUT', $uri, $headers, $fileContent, $date, $shortDate);

        $url = "https://{$this->endpoint}/" . rawurlencode($uri);

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
        curl_setopt($ch, CURLOPT_POSTFIELDS, $fileContent);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

        $curlHeaders = [];
        foreach ($headers as $k => $v) {
            $curlHeaders[] = "$k: $v";
        }
        curl_setopt($ch, CURLOPT_HTTPHEADER, $curlHeaders);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($httpCode === 200 || $httpCode === 201) {
            return [
                'success' => true,
                'url' => S3_PUBLIC_URL . $s3FileName,
                'filename' => $s3FileName
            ];
        } else {
            return [
                'success' => false,
                'error' => "HTTP $httpCode: $response $error"
            ];
        }
    }

    /**
     * Удаление файла с S3
     */
    public function deleteFile($s3FileName) {
        $date = gmdate('Ymd\THis\Z');
        $shortDate = gmdate('Ymd');

        $uri = $this->bucket . '/' . $s3FileName;

        $headers = [
            'Host' => $this->endpoint,
            'x-amz-date' => $date,
            'x-amz-content-sha256' => hash('sha256', '')
        ];

        $headers['Authorization'] = $this->createSignatureV4('DELETE', $uri, $headers, '', $date, $shortDate);

        $url = "https://{$this->endpoint}/" . rawurlencode($uri);

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

        $curlHeaders = [];
        foreach ($headers as $k => $v) {
            $curlHeaders[] = "$k: $v";
        }
        curl_setopt($ch, CURLOPT_HTTPHEADER, $curlHeaders);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return ($httpCode === 200 || $httpCode === 204);
    }

    /**
     * Создание подписи AWS Signature V4
     */
    private function createSignatureV4($method, $uri, $headers, $payload, $date, $shortDate) {
        $service = 's3';
        $algorithm = 'AWS4-HMAC-SHA256';

        // Canonical headers
        $canonicalHeaders = '';
        $signedHeadersList = [];

        ksort($headers);
        foreach ($headers as $key => $value) {
            $lowerKey = strtolower($key);
            $canonicalHeaders .= $lowerKey . ':' . trim($value) . "\n";
            $signedHeadersList[] = $lowerKey;
        }
        $signedHeaders = implode(';', $signedHeadersList);

        // Path-style canonical URI
        $canonicalUri = '/' . ltrim($uri, '/');

        $canonicalRequest = implode("\n", [
            $method,
            $canonicalUri,
            '', // query string
            $canonicalHeaders,
            $signedHeaders,
            hash('sha256', $payload)
        ]);

        $credentialScope = "{$shortDate}/{$this->region}/{$service}/aws4_request";

        $stringToSign = implode("\n", [
            $algorithm,
            $date,
            $credentialScope,
            hash('sha256', $canonicalRequest)
        ]);

        $kDate = hash_hmac('sha256', $shortDate, "AWS4{$this->secretKey}", true);
        $kRegion = hash_hmac('sha256', $this->region, $kDate, true);
        $kService = hash_hmac('sha256', $service, $kRegion, true);
        $kSigning = hash_hmac('sha256', 'aws4_request', $kService, true);
        $signature = hash_hmac('sha256', $stringToSign, $kSigning);

        return "{$algorithm} Credential={$this->accessKey}/{$credentialScope}, SignedHeaders={$signedHeaders}, Signature={$signature}";
    }
}
?>

// script102.js v8.2 - TikTok-style Preview Swipe
document.addEventListener('DOMContentLoaded', async () => {
  
  // Debug система - перехват всех console методов (без изменений)
  class DebugLogger {
    constructor() {
        this.logs = [];
        this.maxLogs = 100;
        this.isVisible = false;
        this.setupConsoleInterception();
        this.setupDebugUI();
    }

    setupConsoleInterception() {
        const originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
        };

        console.log = (...args) => {
            this.addLog('log', args);
            originalConsole.log.apply(console, args);
        };

        console.error = (...args) => {
            this.addLog('error', args);
            originalConsole.error.apply(console, args);
        };

        console.warn = (...args) => {
            this.addLog('warn', args);
            originalConsole.warn.apply(console, args);
        };

        console.info = (...args) => {
            this.addLog('info', args);
            originalConsole.info.apply(console, args);
        };
    }

    addLog(type, args) {
        const timestamp = new Date().toLocaleTimeString();
        const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');

        this.logs.push({
            type,
            message,
            timestamp
        });

        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        if (this.isVisible) {
            this.updateDebugUI();
        }
    }

    setupDebugUI() {
        const debugButton = document.getElementById('debugButton');
        const debugConsole = document.getElementById('debugConsole');
        const closeDebug = document.getElementById('closeDebug');
        const clearLogs = document.getElementById('clearLogs');

        if (debugButton) {
            debugButton.addEventListener('click', () => {
                this.toggleDebugConsole();
            });
        }

        if (closeDebug) {
            closeDebug.addEventListener('click', () => {
                this.hideDebugConsole();
            });
        }

        if (clearLogs) {
            clearLogs.addEventListener('click', () => {
                this.clearLogs();
            });
        }
    }

    toggleDebugConsole() {
        const debugConsole = document.getElementById('debugConsole');
        if (debugConsole) {
            if (this.isVisible) {
                this.hideDebugConsole();
            } else {
                this.showDebugConsole();
            }
        }
    }

    showDebugConsole() {
        const debugConsole = document.getElementById('debugConsole');
        if (debugConsole) {
            debugConsole.classList.add('show');
            this.isVisible = true;
            this.updateDebugUI();
        }
    }

    hideDebugConsole() {
        const debugConsole = document.getElementById('debugConsole');
        if (debugConsole) {
            debugConsole.classList.remove('show');
            this.isVisible = false;
        }
    }

    updateDebugUI() {
        const debugLogs = document.getElementById('debugLogs');
        if (debugLogs) {
            debugLogs.innerHTML = this.logs.map(log => `
                <div class="debug-log-entry ${log.type}">
                    <span class="debug-timestamp">${log.timestamp}</span>
                    <span class="debug-message">${log.message}</span>
                </div>
            `).join('');
            
            debugLogs.scrollTop = debugLogs.scrollHeight;
        }
    }

    clearLogs() {
        this.logs = [];
        this.updateDebugUI();
    }
  }

  const debugLogger = new DebugLogger();
  window.debugLogger = debugLogger;

  // ===============================
  // НОВЫЙ PREVIEW SWIPE CONTROLLER
  // ===============================
  
  class PreviewSwipeController {
    constructor() {
      this.carousel = document.getElementById('videoCarousel');
      this.currentSlide = document.getElementById('currentSlide');
      this.nextSlide = document.getElementById('nextSlide');
      this.currentVideo = document.getElementById('currentVideo');
      this.nextVideo = document.getElementById('nextVideo');
      this.previewIndicator = document.getElementById('previewIndicator');
      
      this.isPreviewActive = false;
      this.currentTransform = 0;
      this.previewThreshold = 0.3; // 30% для переключения
      
      console.log('✅ PreviewSwipeController инициализирован');
    }
    
    // Обновление следующего видео для предпросмотра
    updateNextVideo(videoData) {
      if (!videoData || !this.nextVideo) return;
      
      const nextSrc = videoData.s3_url || videoData.url || 
                     `https://s3.regru.cloud/dorama-shorts/${encodeURIComponent(videoData.filename)}`;
      
      // Загружаем следующее видео
      this.nextVideo.src = nextSrc;
      this.nextVideo.load();
      
      // Обновляем информацию о следующем видео
      const nextTitle = document.getElementById('nextVideoTitle');
      const nextGenre = document.getElementById('nextVideoGenre');
      
      if (nextTitle) nextTitle.textContent = videoData.title || 'Без названия';
      if (nextGenre) nextGenre.textContent = videoData.genre || 'Неизвестно';
      
      console.log('📋 Следующее видео подготовлено для предпросмотра:', videoData.filename);
    }
    
    // Начало предпросмотра
    startPreview(progress) {
      if (!this.carousel) return;
      
      this.isPreviewActive = true;
      this.currentTransform = -progress * 100;
      
      // Убираем transition для плавного следования за пальцем
      this.carousel.classList.add('swiping');
      this.carousel.style.transform = `translateY(${this.currentTransform}vh)`;
      
      // Показываем индикатор предпросмотра
      if (this.previewIndicator && progress > 0.1) {
        this.previewIndicator.classList.add('show');
      }
      
      // Запускаем следующее видео в preview режиме
      if (this.nextVideo && progress > 0.2 && this.nextVideo.paused) {
        this.nextVideo.play().catch(error => {
          console.warn('⚠️ Ошибка запуска preview видео:', error);
        });
      }
    }
    
    // Обновление прогресса предпросмотра
    updatePreview(progress) {
      if (!this.isPreviewActive || !this.carousel) return;
      
      this.currentTransform = -progress * 100;
      this.carousel.style.transform = `translateY(${this.currentTransform}vh)`;
      
      // Управляем видимостью индикатора
      if (this.previewIndicator) {
        if (progress > 0.1) {
          this.previewIndicator.classList.add('show');
        } else {
          this.previewIndicator.classList.remove('show');
        }
      }
      
      // Контролируем воспроизведение preview видео
      if (this.nextVideo) {
        if (progress > 0.2 && this.nextVideo.paused) {
          this.nextVideo.play().catch(() => {});
        } else if (progress <= 0.2 && !this.nextVideo.paused) {
          this.nextVideo.pause();
        }
      }
    }
    
    // Завершение предпросмотра с переходом
    async finishPreviewWithTransition() {
      if (!this.isPreviewActive) return false;
      
      console.log('🎬 Переходим к следующему видео через preview');
      
      // Анимация завершения перехода
      this.carousel.classList.remove('swiping');
      this.carousel.style.transform = 'translateY(-100vh)';
      
      // Скрываем индикатор
      if (this.previewIndicator) {
        this.previewIndicator.classList.remove('show');
      }
      
      // Ждем завершения анимации
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Переключаем видео
      await this.swapVideos();
      
      return true;
    }
    
    // Отмена предпросмотра
    cancelPreview() {
      if (!this.isPreviewActive) return;
      
      console.log('↩️ Отменяем предпросмотр');
      
      // Возвращаем в исходное положение
      this.carousel.classList.remove('swiping');
      this.carousel.style.transform = 'translateY(0)';
      
      // Скрываем индикатор
      if (this.previewIndicator) {
        this.previewIndicator.classList.remove('show');
      }
      
      // Останавливаем preview видео
      if (this.nextVideo && !this.nextVideo.paused) {
        this.nextVideo.pause();
      }
      
      this.isPreviewActive = false;
      this.currentTransform = 0;
    }
    
    // Переключение видео местами
    async swapVideos() {
      // Останавливаем текущее видео
      if (this.currentVideo && !this.currentVideo.paused) {
        this.currentVideo.pause();
      }
      
      // Переключаем источники
      const tempSrc = this.currentVideo.src;
      this.currentVideo.src = this.nextVideo.src;
      this.nextVideo.src = tempSrc;
      
      // Сбрасываем позицию карусели
      this.carousel.style.transform = 'translateY(0)';
      
      // Запускаем новое текущее видео
      if (window.hasFirstClickOccurred) {
        await this.currentVideo.play().catch(error => {
          console.warn('⚠️ Ошибка запуска нового видео:', error);
        });
      }
      
      this.isPreviewActive = false;
      this.currentTransform = 0;
      
      console.log('🔄 Видео переключены через preview swipe');
    }
  }

  // ===============================
  // ОБНОВЛЕННЫЙ GESTURE CONTROLLER С PREVIEW SWIPE
  // ===============================

    class GestureController {
        constructor(videoController, uiController, previewController) {
            this.videoController = videoController;
            this.uiController = uiController;
            this.previewController = previewController;

            // Инициализируем TikTok навигацию
            this.initTikTokNavigation();

            console.log('✅ TikTok GestureController инициализирован');
        }

        initTikTokNavigation() {
            // Ждем загрузки DOM
            setTimeout(() => {
                this.createTikTokContainer();
                this.setupTikTokNav();
            }, 1000);
        }

        createTikTokContainer() {
            const mainContent = document.getElementById('mainContent');
            const currentVideo = document.getElementById('currentVideo');

            if (!mainContent || !currentVideo) return;

            // Скрываем старое видео
            currentVideo.style.display = 'none';

            // Создаем контейнер для TikTok видео
            let tiktokContainer = document.getElementById('tiktokContainer');
            if (!tiktokContainer) {
                tiktokContainer = document.createElement('div');
                tiktokContainer.id = 'tiktokContainer';
                tiktokContainer.className = 'tiktok-container';
                tiktokContainer.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 1;
                overflow: hidden;
            `;
                mainContent.appendChild(tiktokContainer);
            }

            console.log('✅ TikTok контейнер создан');
        }

        setupTikTokNav() {
            if (!window.TikTokNavigation) {
                console.error('❌ TikTokNavigation не найден!');
                return;
            }

            this.tiktokNav = new TikTokNavigation({
                containerSelector: '#tiktokContainer',
                videoSelector: '.tiktok-video-item',
                swipeThreshold: 50,
                animationDuration: 400,
                debug: true,

                onVideoChange: (newIndex, oldIndex) => {
                    console.log(`🎬 TikTok: видео ${oldIndex} → ${newIndex}`);
                    this.handleVideoChange(newIndex);
                },

                onTap: (index) => {
                    console.log('👆 TikTok tap - pause/play');
                    this.handleTap();
                },

                onSwipeStart: (index) => {
                    console.log('📱 TikTok swipe start');
                },

                onSwipeEnd: (index) => {
                    console.log('📱 TikTok swipe end');
                }
            });

            // Загружаем первые видео
            this.loadTikTokVideos();
        }

        loadTikTokVideos() {
            if (!window.videos || !window.videoOrder || !this.tiktokNav) return;

            console.log('📹 Загружаем TikTok видео...');

            // Загружаем первые 8 видео
            const videosToLoad = Math.min(8, window.videos.length);

            for (let i = 0; i < videosToLoad; i++) {
                const videoData = window.videos[window.videoOrder[i]];
                if (videoData) {
                    const videoElement = this.createTikTokVideoElement(videoData, i);
                    this.tiktokNav.addVideo(videoElement);
                }
            }

            // Обновляем информацию о первом видео
            this.handleVideoChange(0);

            console.log(`✅ Загружено ${videosToLoad} TikTok видео`);
        }

        createTikTokVideoElement(videoData, index) {
            const videoItem = document.createElement('div');
            videoItem.className = 'tiktok-video-item';
            videoItem.dataset.index = index;
            videoItem.dataset.filename = videoData.filename;

            const video = document.createElement('video');
            video.src = videoData.s3_url || videoData.url ||
                `https://s3.regru.cloud/dorama-shorts/${encodeURIComponent(videoData.filename)}`;
            video.muted = false;
            video.loop = true;
            video.playsInline = true;
            video.preload = 'metadata';
            video.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: cover;
            background: #000;
        `;

            // Автозапуск первого видео
            if (index === 0 && window.hasFirstClickOccurred) {
                setTimeout(() => {
                    video.play().catch(console.warn);
                }, 500);
            }

            videoItem.appendChild(video);

            console.log(`📹 Создано TikTok видео ${index}: ${videoData.filename}`);

            return videoItem;
        }

        handleVideoChange(newIndex) {
            // Обновляем глобальный индекс
            window.currentOrderIndex = newIndex;

            if (!window.videos || !window.videoOrder) return;

            const videoData = window.videos[window.videoOrder[newIndex]];
            if (!videoData) return;

            console.log('🔄 Обновляем информацию о видео:', videoData.filename);

            // Обновляем UI элементы
            const videoTitle = document.getElementById('videoTitle');
            const videoGenre = document.getElementById('videoGenre');

            if (videoTitle) videoTitle.textContent = videoData.title || 'Без названия';
            if (videoGenre) videoGenre.textContent = videoData.genre || 'Неизвестно';

            // Обновляем кнопки
            if (typeof updateButtonStates === 'function') {
                updateButtonStates(videoData.filename);
            }

            // Запускаем отслеживание просмотра
            if (typeof startWatchTracking === 'function' && window.hasFirstClickOccurred) {
                startWatchTracking(videoData.filename);
            }

            // Обновляем последнее видео
            if (typeof updateLastVideoBatch === 'function') {
                updateLastVideoBatch(videoData.filename);
            }

            // Управляем воспроизведением видео
            this.manageVideoPlayback(newIndex);

            // Подгружаем новые видео если нужно
            this.loadMoreVideosIfNeeded(newIndex);
        }

        manageVideoPlayback(currentIndex) {
            // Останавливаем все видео
            const allVideos = document.querySelectorAll('.tiktok-video-item video');
            allVideos.forEach((video, index) => {
                if (index === currentIndex && window.hasFirstClickOccurred) {
                    video.play().catch(console.warn);
                } else {
                    video.pause();
                }
            });
        }

        loadMoreVideosIfNeeded(currentIndex) {
            const totalVideos = this.tiktokNav.getVideosCount();

            // Если приближаемся к концу, подгружаем еще
            if (currentIndex >= totalVideos - 3) {
                const nextVideoIndex = totalVideos;

                if (nextVideoIndex < window.videos.length) {
                    const videoData = window.videos[window.videoOrder[nextVideoIndex]];
                    if (videoData) {
                        const videoElement = this.createTikTokVideoElement(videoData, nextVideoIndex);
                        this.tiktokNav.addVideo(videoElement);
                        console.log('📹 Подгружено новое видео:', videoData.filename);
                    }
                }
            }
        }

        handleTap() {
            // Находим текущее видео
            const currentVideo = document.querySelector('.tiktok-video-item video');
            if (currentVideo) {
                if (currentVideo.paused) {
                    currentVideo.play().catch(console.warn);
                    console.log('▶️ Видео запущено');
                } else {
                    currentVideo.pause();
                    console.log('⏸️ Видео поставлено на паузу');
                }

                // Показываем индикатор
                if (this.uiController) {
                    this.uiController.showPauseIndicator();
                }
            }
        }

        // Совместимость со старым API
        shouldIgnoreElement(target) {
            return (
                target.tagName.toLowerCase() === 'button' ||
                target.tagName.toLowerCase() === 'a' ||
                target.closest('button') ||
                target.closest('.action-buttons') ||
                target.closest('.description-modal') ||
                target.closest('.bottom-panel') ||
                target.closest('.favorites-container') ||
                target.closest('.debug-console')
            );
        }
    }
  
  // ===============================
  // UI CONTROLLER (БЕЗ ИЗМЕНЕНИЙ)
  // ===============================
  
  class UIController {
    constructor() {
      this.pauseIndicator = null;
      this.createPauseIndicator();
    }
    
    createPauseIndicator() {
      this.pauseIndicator = document.getElementById('pauseIndicator');
      if (!this.pauseIndicator) {
        this.pauseIndicator = document.createElement('div');
        this.pauseIndicator.id = 'pauseIndicator';
        this.pauseIndicator.className = 'pause-indicator';
        this.pauseIndicator.innerHTML = `
          <div class="pause-indicator-content">
            <svg class="pause-icon" width="48" height="48" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z" id="playIcon"/>
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" id="pauseIcon" style="display: none;"/>
            </svg>
          </div>
        `;
        
        const style = document.createElement('style');
        style.textContent = `
          .pause-indicator {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.6);
            border-radius: 50%;
            width: 80px;
            height: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s ease;
            z-index: 1000;
          }
          
          .pause-indicator.show {
            opacity: 1;
          }
          
          .pause-indicator-content {
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .pause-icon {
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
          }
        `;
        document.head.appendChild(style);
        
        const videoContainer = document.querySelector('.video-swipe-container') || 
                               document.querySelector('.video-container');
        if (videoContainer) {
          videoContainer.appendChild(this.pauseIndicator);
        }
      }
    }
    
    showPauseIndicator() {
      if (!this.pauseIndicator) return;
      
      const videoPlayer = document.getElementById('currentVideo');
      if (!videoPlayer) return;
      
      const playIcon = this.pauseIndicator.querySelector('#playIcon');
      const pauseIcon = this.pauseIndicator.querySelector('#pauseIcon');
      
      if (videoPlayer.paused) {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
      } else {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
      }
      
      this.pauseIndicator.classList.add('show');
      
      setTimeout(() => {
        this.pauseIndicator.classList.remove('show');
      }, 1500);
    }
  }
  
  // ===============================
  // ОБНОВЛЕННЫЙ VIDEO CONTROLLER
  // ===============================
  
  class VideoController {
    constructor(previewController) {
      this.videoPlayer = document.getElementById('currentVideo');
      this.previewController = previewController;
      this.currentTab = 'main';
      this.isLoadingVideo = false;
      this.taskQueue = [];
      this.isProcessingQueue = false;
    }
    
    setPreviewController(previewController) {
      this.previewController = previewController;
    }
    
    isMainTabActive() {
      return this.currentTab === 'main';
    }
    
    setCurrentTab(tab) {
      this.currentTab = tab;
    }
    
    async togglePause() {
      if (!this.videoPlayer || !this.isMainTabActive()) return;
      
      try {
        if (this.videoPlayer.paused) {
          await this.videoPlayer.play();
          console.log('▶️ Видео запущено');
        } else {
          this.videoPlayer.pause();
          console.log('⏸️ Видео поставлено на паузу');
        }
      } catch (error) {
        console.error('❌ Ошибка переключения паузы:', error);
      }
    }
    
    async nextVideo() {
      this.addToQueue('nextVideo');
    }
    
    async previousVideo() {
      this.addToQueue('nextVideo');
    }
    
    // НОВЫЙ метод для обработки переключения через preview
    async executeNextVideoWithPreview() {
      // Обновляем глобальный индекс
      const newIndex = window.currentOrderIndex + 1;
      
      if (newIndex >= window.videoOrder.length) {
        console.log('🔄 Достигнут конец списка, создаем новый');
        await window.shuffleUnwatchedVideos();
      } else {
        window.currentOrderIndex = newIndex;
      }
      
      // Обновляем UI
      await this.updateVideoInfo();
      
      // Подготавливаем следующее видео для preview
      this.prepareNextVideoForPreview();
    }
    
    // Подготовка следующего видео для preview
    prepareNextVideoForPreview() {
      if (!this.previewController) return;
      
      const nextIndex = window.currentOrderIndex + 1;
      if (nextIndex < window.videoOrder.length) {
        const nextVideoData = window.videos[window.videoOrder[nextIndex]];
        if (nextVideoData) {
          this.previewController.updateNextVideo(nextVideoData);
        }
      }
    }
    
    // Обновление информации о текущем видео
    async updateVideoInfo() {
      const idx = window.videoOrder[window.currentOrderIndex];
      const videoData = window.videos[idx];
      
      if (videoData) {
        const videoId = videoData.filename;
        
        // Обновляем состояние кнопок
        window.updateButtonStates(videoId);
        
        // Обновляем информацию о видео
        const videoTitle = document.getElementById('videoTitle');
        const videoGenre = document.getElementById('videoGenre');
        
        if (videoTitle) videoTitle.textContent = videoData.title || 'Без названия';
        if (videoGenre) videoGenre.textContent = videoData.genre || 'Неизвестно';
        
        // Запускаем отслеживание просмотра
        if (window.hasFirstClickOccurred) {
          window.startWatchTracking(videoId);
        }
        
        // Batch обновление
        window.updateLastVideoBatch(videoId);
        
        console.log('🔄 Информация о видео обновлена через preview');
      }
    }
    
    addToQueue(action, params = {}) {
      this.taskQueue.push({ action, params, timestamp: Date.now() });
      this.processQueue();
    }
    
    async processQueue() {
      if (this.isProcessingQueue || this.taskQueue.length === 0) return;
      
      this.isProcessingQueue = true;
      
      try {
        while (this.taskQueue.length > 0) {
          const task = this.taskQueue.shift();
          await this.executeTask(task);
          
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } finally {
        this.isProcessingQueue = false;
      }
    }
    
    async executeTask(task) {
      console.log('📋 Выполняем задачу:', task.action);
      
      switch (task.action) {
        case 'nextVideo':
          await this.executeNextVideo();
          break;
        default:
          console.warn('❓ Неизвестная задача:', task.action);
      }
    }
    
    async executeNextVideo() {
      if (this.isLoadingVideo) {
        console.log('⏳ Видео уже загружается');
        return;
      }
      
      if (typeof window.nextVideo === 'function') {
        await window.nextVideo();
        
        // Подготавливаем следующее видео для preview
        this.prepareNextVideoForPreview();
      } else {
        console.error('❌ Функция nextVideo не найдена');
      }
    }
    
    setLoadingState(state) {
      this.isLoadingVideo = state;
    }
  }
  
  // ===============================
  // VIDEO PRELOADER (БЕЗ ИЗМЕНЕНИЙ)
  // ===============================
  
  class VideoPreloader {
    constructor() {
      this.preloadedVideos = new Map();
      this.maxPreloadCount = 3;
      this.isPreloading = false;
      this.preloadProgress = new Map();
    }

    async preloadNextVideos(currentIndex, videoOrder, videos) {
      if (!videoOrder || !videos || videoOrder.length === 0) return;
      
      const videosToPreload = [];
      
      for (let i = 1; i <= this.maxPreloadCount; i++) {
        const nextIndex = currentIndex + i;
        if (nextIndex < videoOrder.length) {
          const videoIdx = videoOrder[nextIndex];
          const videoData = videos[videoIdx];
          if (videoData && !this.preloadedVideos.has(videoData.filename)) {
            videosToPreload.push(videoData);
          }
        }
      }
      
      if (videosToPreload.length > 0) {
        console.log(`🚀 Начинаем предзагрузку ${videosToPreload.length} видео`);
        this.startPreloading(videosToPreload);
      }
    }

    async startPreloading(videosToPreload) {
      if (this.isPreloading) return;
      this.isPreloading = true;

      const promises = videosToPreload.slice(0, 2).map(videoData => 
        this.preloadVideo(videoData).catch(error => {
          console.warn(`⚠️ Не удалось предзагрузить ${videoData.filename}:`, error);
        })
      );
      
      await Promise.allSettled(promises);
      this.isPreloading = false;
      
      if (videosToPreload.length > 2) {
        setTimeout(() => {
          this.startPreloading(videosToPreload.slice(2));
        }, 1000);
      }
    }

    preloadVideo(videoData) {
      return new Promise((resolve, reject) => {
        const videoElement = document.createElement('video');
        videoElement.preload = 'metadata';
        videoElement.muted = true;
        videoElement.style.display = 'none';
        
        const src = videoData.s3_url || videoData.url || 
                    `https://s3.regru.cloud/dorama-shorts/${encodeURIComponent(videoData.filename)}`;
        
        let progressCheckTimeout;
        
        videoElement.addEventListener('loadedmetadata', () => {
          videoElement.preload = 'auto';
          
          progressCheckTimeout = setTimeout(() => {
            this.checkPreloadProgress(videoElement, videoData.filename, resolve);
          }, 2000);
        });

        videoElement.addEventListener('canplaythrough', () => {
          if (progressCheckTimeout) clearTimeout(progressCheckTimeout);
          this.preloadedVideos.set(videoData.filename, videoElement);
          console.log(`✅ Полностью предзагружено: ${videoData.filename}`);
          resolve();
        });

        videoElement.addEventListener('error', (e) => {
          if (progressCheckTimeout) clearTimeout(progressCheckTimeout);
          reject(e);
        });

        document.body.appendChild(videoElement);
        videoElement.src = src;
      });
    }

    checkPreloadProgress(videoElement, filename, resolve) {
      if (videoElement.buffered.length > 0) {
        const bufferedEnd = videoElement.buffered.end(0);
        const duration = videoElement.duration || 30;
        
        if (bufferedEnd >= Math.min(duration * 0.2, 5)) {
          this.preloadedVideos.set(filename, videoElement);
          console.log(`📊 Частично предзагружено: ${filename} (${Math.round(bufferedEnd)}с)`);
          resolve();
          return;
        }
      }
      
      setTimeout(() => resolve(), 1000);
    }

    getPreloadedVideo(filename) {
      return this.preloadedVideos.get(filename);
    }

    cleanup() {
      if (this.preloadedVideos.size > this.maxPreloadCount * 2) {
        const entries = Array.from(this.preloadedVideos.entries());
        const toRemove = entries.slice(0, this.maxPreloadCount);
        
        toRemove.forEach(([filename, videoElement]) => {
          try {
            videoElement.src = '';
            if (videoElement.parentNode) {
              videoElement.parentNode.removeChild(videoElement);
            }
            this.preloadedVideos.delete(filename);
            console.log(`🗑️ Удалено из кэша: ${filename}`);
          } catch (error) {
            console.warn('Ошибка при очистке видео:', error);
          }
        });
      }
    }

    adaptToNetwork() {
      if ('connection' in navigator) {
        const connection = navigator.connection;
        const effectiveType = connection.effectiveType;
        
        switch (effectiveType) {
          case 'slow-2g':
          case '2g':
            this.maxPreloadCount = 1;
            console.log('🐌 Медленная сеть - предзагрузка 1 видео');
            break;
          case '3g':
            this.maxPreloadCount = 2;
            console.log('📶 3G сеть - предзагрузка 2 видео');
            break;
          case '4g':
          default:
            this.maxPreloadCount = 3;
            console.log('🚀 Быстрая сеть - предзагрузка 3 видео');
        }
      }
    }
  }
  
  console.log('🚀 Запуск приложения DoramaShorts v8.2 - TikTok Style...');
  
  // Проверяем авторизацию
  const authSuccess = await window.telegramAuth.init();
  
  if (!authSuccess) {
    console.error('❌ Авторизация не удалась, приложение не будет запущено');
    return;
  }
  
  console.log('✅ Авторизация успешна, запускаем основное приложение');
  
  // Получаем данные пользователя
  const userData = await window.telegramAuth.getUserData();
  if (userData) {
    console.log('📊 Данные пользователя загружены:', userData);
  }
   
  // Debug доступ (код без изменений)
  const setupDebugAccess = async () => {
    const ALLOWED_DEBUG_USERS = ['79046704122', '1062716814', '590563384', '79196982303'];
    
    const getAllPossibleUserIds = () => {
      const sources = {
        'userData.user_id': userData?.user_id,
        'userData.id': userData?.id,
        'telegramAuth.getUserId()': window.telegramAuth?.getUserId?.(),
        'Telegram.WebApp.initDataUnsafe.user.id': window.Telegram?.WebApp?.initDataUnsafe?.user?.id,
        'Telegram.WebApp.initDataUnsafe.user.username': window.Telegram?.WebApp?.initDataUnsafe?.user?.username,
        'localStorage.user_id': localStorage.getItem('user_id'),
        'sessionStorage.user_id': sessionStorage.getItem('user_id')
      };
      
      console.log('🔍 Debug: Все источники ID пользователя:');
      Object.entries(sources).forEach(([source, value]) => {
        console.log(`  ${source}:`, value, `(тип: ${typeof value})`);
      });
      
      return sources;
    };
    
    const checkAccess = () => {
      const allIds = getAllPossibleUserIds();
      
      for (const [source, value] of Object.entries(allIds)) {
        if (value !== undefined && value !== null && value !== '') {
          const stringId = String(value);
          console.log(`🔑 Проверяем ID из ${source}: "${stringId}"`);
          console.log(`🎯 Разрешенные ID:`, ALLOWED_DEBUG_USERS);
          
          if (ALLOWED_DEBUG_USERS.includes(stringId)) {
            console.log(`✅ ДОСТУП РАЗРЕШЕН! ID "${stringId}" найден в разрешенном списке`);
            return true;
          }
        }
      }
      
      console.log('❌ Доступ запрещен - ID не найден в разрешенном списке');
      return false;
    };
    
    const hasDebugAccess = checkAccess();
    
    const debugButton = document.getElementById('debugButton');
    console.log('🔧 Debug кнопка найдена:', !!debugButton);
    
    if (debugButton) {
      if (hasDebugAccess) {
        debugButton.style.display = 'block';
        debugButton.style.visibility = 'visible';
        debugButton.style.opacity = '1';
        console.log('🔓 Debug консоль ПОКАЗАНА');
      } else {
        debugButton.style.display = 'none';
        console.log('🔒 Debug консоль СКРЫТА');
      }
    } else {
      console.warn('⚠️ Элемент debugButton не найден в DOM!');
    }
    
    return hasDebugAccess;
  };

  const forceShowDebug = () => {
    const debugButton = document.getElementById('debugButton');
    if (debugButton) {
      debugButton.style.display = 'block';
      debugButton.style.visibility = 'visible';
      debugButton.style.opacity = '1';
      debugButton.style.backgroundColor = 'red';
      debugButton.style.zIndex = '9999';
      console.log('🔧 DEBUG ПРИНУДИТЕЛЬНО ПОКАЗАН ДЛЯ ТЕСТИРОВАНИЯ');
    }
  };

  setupDebugAccess();

  setTimeout(() => {
    console.log('🔄 Повторная проверка debug доступа через 1 сек...');
    setupDebugAccess();
  }, 1000);

  setTimeout(() => {
    console.log('🔄 Финальная проверка debug доступа через 3 сек...');
    setupDebugAccess();
    
    const debugButton = document.getElementById('debugButton');
    if (!debugButton || debugButton.style.display === 'none') {
      console.log('🔧 Debug все еще скрыт, показываем принудительно');
      forceShowDebug();
    }
  }, 3000);
  
  // ===============================
  // ИНИЦИАЛИЗАЦИЯ КОНТРОЛЛЕРОВ С PREVIEW SWIPE
  // ===============================
  
  const previewController = new PreviewSwipeController();
  const uiController = new UIController();
  const videoController = new VideoController();
  const gestureController = new GestureController(videoController, uiController, previewController);
  
  // Связываем контроллеры
  videoController.setPreviewController(previewController);
  
  // Инициализируем предзагрузчик видео
  const videoPreloader = new VideoPreloader();
  videoPreloader.adaptToNetwork();
  
  window.videoPreloader = videoPreloader;
  
  // Остальной код остается тот же самый...
  // (все DOM элементы, переменные, функции - копируем из оригинального кода)
  
  // Элементы DOM
  const videoPlayer = document.getElementById('currentVideo');
  const videoTitle = document.getElementById('videoTitle');
  const videoSeries = document.getElementById('videoSeries');
  const videoSeasons = document.getElementById('videoSeasons');
  const videoStatus = document.getElementById('videoStatus');
  const videoCountry = document.getElementById('videoCountry');
  const videoGenre = document.getElementById('videoGenre');
  const likeButton = document.getElementById('likeButton');
  const dislikeButton = document.getElementById('dislikeButton');
  const favoriteButton = document.getElementById('favoriteButton');
  const descriptionButton = document.getElementById('descriptionButton');
  const descriptionModal = document.getElementById('descriptionModal');
  const modalClose = document.getElementById('modalClose');
  const modalTitle = document.getElementById('modalTitle');
  const modalDescription = document.getElementById('modalDescription');
  
  // Элементы вкладок
  const mainTab = document.getElementById('mainTab');
  const favoritesTab = document.getElementById('favoritesTab');
  const mainContent = document.getElementById('mainContent');
  const favoritesContent = document.getElementById('favoritesContent');
  const favoritesList = document.getElementById('favoritesList');
  const favoritesEmpty = document.getElementById('favoritesEmpty');

  // ЛОГИКА ОВЕРЛЕЯ ПЕРВОГО КЛИКА
  let hasFirstClickOccurred = false;
  const firstClickOverlay = document.getElementById('firstClickOverlay');

  console.log('🎯 Инициализация оверлея первого клика:');
  console.log('- firstClickOverlay найден:', !!firstClickOverlay);
  console.log('- hasFirstClickOccurred:', hasFirstClickOccurred);

  let videos = [];
  let videoOrder = [];
  let currentOrderIndex = 0;
  let userFavorites = userData?.favorites || [];
  let userLikes = userData?.likes || [];
  let userDislikes = userData?.dislikes || [];
  let currentTab = 'main';
  
  // Переменные для отслеживания просмотра
  let watchedVideosSet = new Set(userData?.watchedVideos || []);
  let currentSessionOrder = userData?.currentSessionOrder || [];
  let watchTimer = null;
  let watchedSeconds = 0;
  const WATCH_THRESHOLD = 5;
  
  // Буфер пропущенных видео
  let skippedVideosBuffer = [];
  const SKIPPED_BUFFER_SIZE = 10;
  const MIN_VIDEOS_BEFORE_REPEAT = 5;
  
  // Переменные для batch обновления
  let lastVideoUpdateTimer = null;
  let sessionOrderUpdateTimer = null;
  
  // Флаг загрузки видео
  let isLoadingVideo = false;
  
  // Делаем переменные глобальными для использования в контроллерах
  window.videos = videos;
  window.videoOrder = videoOrder;
  window.currentOrderIndex = currentOrderIndex;
  window.hasFirstClickOccurred = hasFirstClickOccurred;

  console.log('🚀 Начинаем инициализацию приложения...');
  console.log('📊 Начальное состояние пользователя:', {
    favorites: userFavorites.length,
    likes: userLikes.length,
    dislikes: userDislikes.length,
    watched: watchedVideosSet.size,
    sessionOrder: currentSessionOrder.length
  });

  // [Здесь идет весь остальной код из оригинального файла - функции, обработчики и т.д.]
  // Для краткости не дублирую, но в реальном файле должен быть весь остальной код
  
  // ВАЖНОЕ ДОПОЛНЕНИЕ: Обновляем функцию loadVideo для работы с preview
  async function loadVideo() {
    if (isLoadingVideo) {
      console.log('⏳ Уже загружается видео, пропускаем вызов');
      return;
    }
    
    if (videos.length === 0) {
      console.warn('⚠️ Нет видео для загрузки');
      return;
    }
    
    isLoadingVideo = true;
    videoController.setLoadingState(true);
    
    try {
      if (videoOrder.length === 0 || currentOrderIndex >= videoOrder.length) {
        await shuffleUnwatchedVideos();
      }
      
      // Загружаем актуальные данные пользователя
      try {
        const freshUserData = await window.telegramAuth.getUserData();
        if (freshUserData) {
          userFavorites = freshUserData.favorites || [];
          userLikes = freshUserData.likes || [];
          userDislikes = freshUserData.dislikes || [];
          watchedVideosSet = new Set(freshUserData.watchedVideos || []);
          console.log('🔄 Данные пользователя обновлены:', {
            favorites: userFavorites.length,
            likes: userLikes.length,
            dislikes: userDislikes.length,
            watched: watchedVideosSet.size
          });
        }
      } catch (error) {
        console.error('❌ Ошибка обновления данных пользователя:', error);
      }
      
      const idx = videoOrder[currentOrderIndex];
      const videoData = videos[idx];
      console.log(`🎬 Загружаем видео ${currentOrderIndex + 1}/${videoOrder.length}, индекс: ${idx}`);
      
      if (videoData) {
        const newSrc = videoData.s3_url || videoData.url || `https://s3.regru.cloud/dorama-shorts/${encodeURIComponent(videoData.filename)}`;
        console.log('📁 Путь к видео:', newSrc);
        console.log('📊 Данные видео:', videoData);
        
        const videoId = videoData.filename;
        
        // Обновляем состояние кнопок
        updateButtonStates(videoId);
        
        // Останавливаем предыдущий таймер просмотра
        resetWatchTimer();

        // МГНОВЕННАЯ ЗАГРУЗКА без затемнения
        const preloadedVideo = videoPreloader.getPreloadedVideo(videoId);

        if (preloadedVideo && preloadedVideo.readyState >= 2) {
          console.log('🚀 Используем предзагруженное видео:', videoId);
          
          videoPlayer.src = preloadedVideo.src;
          videoPlayer.currentTime = 0;
          
          if (currentTab === 'main' && hasFirstClickOccurred) {
            videoPlayer.play().then(() => {
              console.log('✅ Предзагруженное видео запущено мгновенно');
              startWatchTracking(videoId);
            }).catch(error => {
              console.error('❌ Ошибка воспроизведения предзагруженного видео:', error);
            });
          }
          
          if (preloadedVideo.parentNode) {
            preloadedVideo.parentNode.removeChild(preloadedVideo);
          }
          videoPreloader.preloadedVideos.delete(videoId);
          
        } else {
          console.log('📁 Обычная загрузка видео:', videoId);
          
          if (videoPlayer.src !== newSrc) {
            videoPlayer.src = newSrc;
            videoPlayer.load();
            
            if (currentTab === 'main' && hasFirstClickOccurred) {
              videoPlayer.play().then(() => {
                console.log('✅ Видео запущено успешно');
                startWatchTracking(videoId);
              }).catch(error => {
                console.error('❌ Ошибка воспроизведения видео:', error);
              });
            }
          } else {
            if (currentTab === 'main' && videoPlayer.paused && hasFirstClickOccurred) {
              videoPlayer.play().then(() => {
                startWatchTracking(videoId);
              });
            }
          }
        }

        // Запускаем предзагрузку следующих видео
        setTimeout(() => {
          videoPreloader.preloadNextVideos(currentOrderIndex, videoOrder, videos);
          videoPreloader.cleanup();
        }, 500);

        // НОВОЕ: Подготавливаем следующее видео для preview
        videoController.prepareNextVideoForPreview();

        // Обновление информации о видео
        videoTitle.textContent = videoData.title || 'Без названия';
        videoGenre.textContent = `${videoData.genre || 'Неизвестно'}`;
        
        // Batch обновление последнего видео
        updateLastVideoBatch(videoId);
      }
    } finally {
      isLoadingVideo = false;
      videoController.setLoadingState(false);
    }
  }
  
   // Делаем переменные глобальными для использования в контроллерах
  window.videos = videos;
  window.videoOrder = videoOrder;
  window.currentOrderIndex = currentOrderIndex;
  window.hasFirstClickOccurred = hasFirstClickOccurred;
  window.updateButtonStates = updateButtonStates;
  window.startWatchTracking = startWatchTracking;
  window.updateLastVideoBatch = updateLastVideoBatch;
  window.shuffleUnwatchedVideos = shuffleUnwatchedVideos;

  // Функция скрытия оверлея первого клика
  function hideFirstClickOverlay() {
      if (!hasFirstClickOccurred && firstClickOverlay) {
          console.log('🎯 Скрываем оверлей первого клика');
          
          if (videoPlayer) {
              console.log(`📹 Состояние видео при скрытии оверлея: ${videoPlayer.paused ? 'на паузе' : 'воспроизводится'}`);
          }
          
          firstClickOverlay.style.animation = 'fadeOut 0.3s ease-out forwards';
          
          setTimeout(() => {
              firstClickOverlay.classList.add('hidden');
              hasFirstClickOccurred = true;
              window.hasFirstClickOccurred = true;
              console.log('✅ Оверлей первого клика скрыт навсегда');
          }, 300);
      } else {
          console.log('⚠️ Оверлей не скрыт:', {
              hasFirstClickOccurred,
              overlayExists: !!firstClickOverlay
          });
      }
  }

  // НАСТРОЙКА ОВЕРЛЕЯ ПЕРВОГО КЛИКА
  if (firstClickOverlay) {
      const handleOverlayClick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          console.log('👆 Клик по оверлею первого запуска');
          
          hideFirstClickOverlay();
          
          if (videoPlayer && currentTab === 'main') {
              if (videoPlayer.paused) {
                  console.log('▶️ Видео было на паузе - запускаем через существующий функционал');
                  videoPlayer.play().then(() => {
                      console.log('✅ Видео запущено после клика по оверлею');
                      const currentVideoId = likeButton?.getAttribute('data-video-id');
                      if (currentVideoId) {
                          startWatchTracking(currentVideoId);
                      }
                  }).catch(error => {
                      console.error('❌ Ошибка запуска видео:', error);
                  });
              } else {
                  console.log('⏸️ Видео уже воспроизводится - просто скрываем оверлей');
              }
          }
      };
      
      firstClickOverlay.addEventListener('click', handleOverlayClick);
      firstClickOverlay.addEventListener('touchend', handleOverlayClick);
      
      firstClickOverlay.addEventListener('touchstart', (e) => {
          e.stopPropagation();
      }, { passive: true });
  }
  
  // Функция переключения вкладок
  function switchTab(tabName) {
    currentTab = tabName;
    videoController.setCurrentTab(tabName);
    
    if (tabName === 'main') {
      mainTab.classList.add('active');
      favoritesTab.classList.remove('active');
      mainContent.classList.add('active');
      favoritesContent.classList.remove('active');
      
      if (videoPlayer) {
        if (videoPlayer.src) {
          if (hasFirstClickOccurred) {
            videoPlayer.play().catch(error => {
              console.error('❌ Ошибка воспроизведения видео:', error);
            });
          }
        } else {
          loadVideo();
        }
      }
    } else if (tabName === 'favorites') {
      mainTab.classList.remove('active');
      favoritesTab.classList.add('active');
      mainContent.classList.remove('active');
      favoritesContent.classList.add('active');
      
      if (videoPlayer && !videoPlayer.paused) {
        videoPlayer.pause();
      }
      
      updateFavoritesList();
    }
  }
  
  // Обработчики кликов по вкладкам
  if (mainTab) {
    const handleMainTab = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (currentTab !== 'main') {
        switchTab('main');
      }
    };
    
    mainTab.addEventListener('click', handleMainTab);
    mainTab.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handleMainTab(e);
    }, { passive: false });
    
    mainTab.addEventListener('touchstart', () => {
      mainTab.style.transform = 'scale(0.95)';
    });
    mainTab.addEventListener('touchend', () => {
      mainTab.style.transform = 'scale(1)';
    });
  }
  
  if (favoritesTab) {
    const handleFavoritesTab = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (currentTab !== 'favorites') {
        switchTab('favorites');
      }
    };
    
    favoritesTab.addEventListener('click', handleFavoritesTab);
    favoritesTab.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handleFavoritesTab(e);
    }, { passive: false });
    
    favoritesTab.addEventListener('touchstart', () => {
      favoritesTab.style.transform = 'scale(0.95)';
    });
    favoritesTab.addEventListener('touchend', () => {
      favoritesTab.style.transform = 'scale(1)';
    });
  }
  
  // Функция обновления списка избранного
  async function updateFavoritesList() {
    const freshUserData = await window.telegramAuth.getUserData();
    if (freshUserData) {
      userFavorites = freshUserData.favorites || [];
    }
    
    const favoriteVideos = videos.filter(video => 
      userFavorites.includes(video.filename)
    );
    
    if (favoriteVideos.length === 0) {
      favoritesEmpty.style.display = 'flex';
      favoritesList.style.display = 'none';
      favoritesList.classList.remove('has-items');
    } else {
      favoritesEmpty.style.display = 'none';
      favoritesList.style.display = 'flex';
      favoritesList.classList.add('has-items');
      
      favoritesList.innerHTML = '';
      
      favoriteVideos.forEach(video => {
        const card = createFavoriteCard(video);
        favoritesList.appendChild(card);
      });
    }
  }
  
  // Функция создания карточки избранного видео
  function createFavoriteCard(video) {
    const card = document.createElement('div');
    card.className = 'favorite-card';
    card.setAttribute('data-video-filename', video.filename);
    
    const thumbnail = document.createElement('div');
    thumbnail.className = 'favorite-card-thumbnail';
    
    thumbnail.innerHTML = `
      <svg width="100%" height="100%" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="80" height="80" rx="8" fill="#1a1a1a"/>
        <circle cx="40" cy="40" r="25" fill="#333"/>
        <path d="M35 30L50 40L35 50V30Z" fill="#666"/>
      </svg>
    `;
    
    const info = document.createElement('div');
    info.className = 'favorite-card-info';
    
    const title = document.createElement('div');
    title.className = 'favorite-card-title';
    title.textContent = video.title || 'Без названия';
    
    const genre = document.createElement('div');
    genre.className = 'favorite-card-genre';
    genre.textContent = video.genre || 'Неизвестно';
    
    info.appendChild(title);
    info.appendChild(genre);
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'favorite-card-remove';
    removeBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    `;
    
    const handleCardClick = (e) => {
      if (!e.target.closest('.favorite-card-remove')) {
        const videoIndex = videos.findIndex(v => v.filename === video.filename);
        if (videoIndex !== -1) {
          switchTab('main');
          const orderIndex = videoOrder.indexOf(videoIndex);
          if (orderIndex !== -1) {
            currentOrderIndex = orderIndex;
            window.currentOrderIndex = currentOrderIndex;
          } else {
            currentOrderIndex = 0;
            window.currentOrderIndex = currentOrderIndex;
            videoOrder.unshift(videoIndex);
            window.videoOrder = videoOrder;
          }
          const currentVideoId = likeButton?.getAttribute('data-video-id');
          if (currentVideoId !== video.filename) {
            loadVideo();
          }
        }
      }
    };
    
    card.addEventListener('click', handleCardClick);
    card.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      if (!e.target.closest('.favorite-card-remove')) {
        card.style.transform = 'scale(0.98)';
        card.style.opacity = '0.8';
      }
    }, { passive: true });
    
    card.addEventListener('touchend', (e) => {
      e.stopPropagation();
      card.style.transform = 'scale(1)';
      card.style.opacity = '1';
      handleCardClick(e);
    }, { passive: false });
    
    removeBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      
      userFavorites = userFavorites.filter(id => id !== video.filename);
      updateButtonStates(video.filename);
      
      const success = await window.telegramAuth.toggleFavorite(video.filename);
      if (!success) {
        userFavorites.push(video.filename);
        updateButtonStates(video.filename);
      } else {
        card.style.transform = 'translateX(-100%)';
        card.style.opacity = '0';
        setTimeout(() => {
          updateFavoritesList();
        }, 300);
      }
    });
    
    removeBtn.addEventListener('touchstart', (e) => {
      e.stopPropagation();
    });
    
    card.appendChild(thumbnail);
    card.appendChild(info);
    card.appendChild(removeBtn);
    
    return card;
  }
  
  // Универсальная функция настройки кнопок
  function setupButtonWithPointerEvents(button, handler) {
    if (!button) return;
    
    const handleClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      button.style.transform = 'scale(0.95)';
      setTimeout(() => {
        button.style.transform = 'scale(1)';
      }, 100);
      
      handler(e);
    };
    
    button.addEventListener('click', handleClick);
    button.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleClick(e);
    });
    
    button.addEventListener('selectstart', (e) => e.preventDefault());
    button.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  
  // Функция перемешивания только непросмотренных видео
  async function shuffleUnwatchedVideos() {
    const unwatchedIndices = [];
    
    videos.forEach((video, index) => {
      if (!watchedVideosSet.has(video.filename)) {
        const bufferIndex = skippedVideosBuffer.indexOf(video.filename);
        if (bufferIndex === -1 || bufferIndex < skippedVideosBuffer.length - MIN_VIDEOS_BEFORE_REPEAT) {
          unwatchedIndices.push(index);
        }
      }
    });
    
    console.log(`📊 Статистика: ${watchedVideosSet.size} просмотрено, ${unwatchedIndices.length} доступно для показа`);
    console.log(`⏭️ В буфере пропущенных: ${skippedVideosBuffer.length} видео`);
    
    if (unwatchedIndices.length < 3 && skippedVideosBuffer.length > 0) {
      console.log('📌 Мало доступных видео, добавляем старые пропущенные');
      
      const oldSkipped = skippedVideosBuffer.slice(0, Math.max(0, skippedVideosBuffer.length - MIN_VIDEOS_BEFORE_REPEAT));
      oldSkipped.forEach(filename => {
        const index = videos.findIndex(v => v.filename === filename);
        if (index !== -1 && !watchedVideosSet.has(filename)) {
          unwatchedIndices.push(index);
        }
      });
    }
    
    if (unwatchedIndices.length === 0) {
      console.log('🔄 Все видео просмотрены, начинаем новый круг');
      watchedVideosSet.clear();
      currentSessionOrder = [];
      skippedVideosBuffer = [];
      
      await window.telegramAuth.resetWatchProgress();
      
      unwatchedIndices.push(...videos.map((_, i) => i));
    }
    
    videoOrder = [...unwatchedIndices];
    for (let i = videoOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [videoOrder[i], videoOrder[j]] = [videoOrder[j], videoOrder[i]];
    }
    
    currentOrderIndex = 0;
    window.videoOrder = videoOrder;
    window.currentOrderIndex = currentOrderIndex;
    
    currentSessionOrder = videoOrder.map(idx => videos[idx].filename);
    
    saveSessionOrderBatch();
    
    console.log('🔀 Видео перемешаны, новый порядок:', videoOrder.length);
  }

  // Функция batch сохранения порядка сессии
  function saveSessionOrderBatch() {
    if (sessionOrderUpdateTimer) {
      clearTimeout(sessionOrderUpdateTimer);
    }
    
    sessionOrderUpdateTimer = setTimeout(() => {
      window.telegramAuth.saveSessionOrder(currentSessionOrder);
      console.log('💾 Порядок сессии сохранен');
    }, 2000);
  }

  // Функция batch обновления последнего видео
  function updateLastVideoBatch(videoId) {
    if (lastVideoUpdateTimer) {
      clearTimeout(lastVideoUpdateTimer);
    }
    
    lastVideoUpdateTimer = setTimeout(() => {
      window.telegramAuth.updateLastVideo(videoId);
      console.log('💾 Последнее видео обновлено:', videoId);
    }, 10000);
  }

  // Функция добавления видео в буфер пропущенных
  function addToSkippedBuffer(filename) {
    const existingIndex = skippedVideosBuffer.indexOf(filename);
    if (existingIndex !== -1) {
      skippedVideosBuffer.splice(existingIndex, 1);
    }
    
    skippedVideosBuffer.push(filename);
    
    if (skippedVideosBuffer.length > SKIPPED_BUFFER_SIZE) {
      skippedVideosBuffer.shift();
    }
    
    console.log(`⏭️ Видео добавлено в буфер пропущенных: ${filename}`);
    console.log(`📋 Буфер пропущенных: ${skippedVideosBuffer.length} видео`);
  }

  // Функция для остановки таймера просмотра
  function resetWatchTimer() {
    if (watchTimer) {
      clearInterval(watchTimer);
      watchTimer = null;
    }
    watchedSeconds = 0;
  }

  // Функция отслеживания времени просмотра
  function startWatchTracking(filename) {
    resetWatchTimer();
    
    if (watchedVideosSet.has(filename)) {
      console.log('⏭️ Видео уже просмотрено:', filename);
      return;
    }
    
    console.log('⏱️ Начинаем отслеживание просмотра:', filename);
    
    watchTimer = setInterval(() => {
      if (!videoPlayer.paused && currentTab === 'main') {
        watchedSeconds++;
        console.log(`⏱️ Просмотр: ${watchedSeconds}с из ${WATCH_THRESHOLD}с`);
        
        if (watchedSeconds >= WATCH_THRESHOLD) {
          markVideoAsWatched(filename);
          clearInterval(watchTimer);
          watchTimer = null;
        }
      }
    }, 1000);
  }

  // Функция отметки видео как просмотренного
  async function markVideoAsWatched(filename) {
    console.log('✅ Видео просмотрено:', filename);
    
    watchedVideosSet.add(filename);
    
    const skipIndex = skippedVideosBuffer.indexOf(filename);
    if (skipIndex !== -1) {
      skippedVideosBuffer.splice(skipIndex, 1);
      console.log('🗑️ Удалено из буфера пропущенных');
    }
    
    const success = await window.telegramAuth.addWatchedVideo(filename, watchedSeconds);
    
    if (!success) {
      watchedVideosSet.delete(filename);
      console.error('❌ Не удалось сохранить прогресс просмотра');
    } else {
      console.log('💾 Прогресс просмотра сохранен на сервере');
    }
  }

  // Функция загрузки списка видео с сервера
  async function fetchVideos() {
    console.log('📥 Начинаем загрузку видео...');
    try {
      const response = await fetch('get_videos.php');
      console.log('📡 Ответ сервера:', response);
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      const rawText = await response.text();
      console.log('📄 Сырой ответ сервера (первые 500 символов):', rawText.substring(0, 500));
      
      try {
        videos = JSON.parse(rawText);
        window.videos = videos;
        console.log('✅ JSON успешно распарсен');
        console.log('📺 Количество видео:', videos.length);
        
        if (videos.length > 0) {
          const existingFilenames = videos.map(v => v.filename);
          await window.telegramAuth.cleanDeletedVideos(existingFilenames);
          
          if (currentSessionOrder.length > 0) {
            console.log('📋 Восстанавливаем порядок сессии');
            restoreSessionOrder();
          } else {
            await shuffleUnwatchedVideos();
          }
          
          loadVideo();
          updateFavoritesList();
          
          setTimeout(() => {
            console.log('🚀 Запускаем предзагрузку первых видео...');
            videoPreloader.preloadNextVideos(currentOrderIndex, videoOrder, videos);
          }, 2000);
          
        } else {
          console.warn('⚠️ Массив видео пустой');
        }
      } catch (parseError) {
        console.error('❌ Ошибка парсинга JSON:', parseError);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки видео:', error);
    }
  }

  // Функция восстановления порядка сессии
  function restoreSessionOrder() {
    const existingFilenames = new Set(videos.map(v => v.filename));
    const validOrder = currentSessionOrder.filter(filename => existingFilenames.has(filename));
    
    if (validOrder.length === 0) {
      console.log('⚠️ Сохраненный порядок пуст или недействителен');
      shuffleUnwatchedVideos();
      return;
    }
    
    videoOrder = [];
    validOrder.forEach(filename => {
      const index = videos.findIndex(v => v.filename === filename);
      if (index !== -1 && !watchedVideosSet.has(filename)) {
        videoOrder.push(index);
      }
    });
    
    if (videoOrder.length === 0) {
      console.log('⚠️ Все видео из сохраненного порядка уже просмотрены');
      shuffleUnwatchedVideos();
      return;
    }
    
    currentOrderIndex = 0;
    window.videoOrder = videoOrder;
    window.currentOrderIndex = currentOrderIndex;
    currentSessionOrder = validOrder;
    console.log('✅ Порядок сессии восстановлен:', videoOrder.length);
  }

  // Функция обновления состояния кнопок
  function updateButtonStates(videoId) {
    console.log('🔄 updateButtonStates вызван для:', videoId);
    
    if (!videoId) {
      console.error('❌ videoId не передан!');
      return;
    }
    
    if (likeButton) {
      const isLiked = userLikes.includes(videoId);
      likeButton.classList.toggle('active', isLiked);
      likeButton.setAttribute('data-video-id', videoId);
      
      const likeIcon = likeButton.querySelector('.like-icon');
      if (likeIcon) {
        likeIcon.src = isLiked ? 'svg/like-active.svg' : 'svg/like.svg';
      }
    }
    
    if (dislikeButton) {
      const isDisliked = userDislikes.includes(videoId);
      dislikeButton.classList.toggle('active', isDisliked);
      dislikeButton.setAttribute('data-video-id', videoId);
      
      const dislikeIcon = dislikeButton.querySelector('.dislike-icon');
      if (dislikeIcon) {
        dislikeIcon.src = isDisliked ? 'svg/dislike-active.svg' : 'svg/dislike.svg';
      }
    }
    
    if (favoriteButton) {
      const isFavorite = userFavorites.includes(videoId);
      favoriteButton.classList.toggle('active', isFavorite);
      favoriteButton.setAttribute('data-video-id', videoId);
      
      const favoriteIcon = favoriteButton.querySelector('.favorite-icon');
      if (favoriteIcon) {
        const timestamp = Date.now();
        favoriteIcon.src = isFavorite ? `svg/favorites-active.svg?t=${timestamp}` : `svg/favorites.svg?t=${timestamp}`;
      }
    }
  }

  // Функция переключения на следующее видео
  async function nextVideo() {
    console.log('⏭️ Следующее видео');
    
    if (videos.length > 0 && videoOrder.length > 0 && currentOrderIndex < videoOrder.length) {
      const currentVideo = videos[videoOrder[currentOrderIndex]];
      if (currentVideo && !watchedVideosSet.has(currentVideo.filename)) {
        addToSkippedBuffer(currentVideo.filename);
      }
    }
    
    const newIndex = currentOrderIndex + 1;
    
    if (newIndex >= videoOrder.length) {
      console.log('🔄 Достигнут конец списка, создаем новый');
      await shuffleUnwatchedVideos();
    } else {
      currentOrderIndex = newIndex;
      window.currentOrderIndex = currentOrderIndex;
    }
    
    await loadVideo();
  }

  // Функция показа модального окна с описанием
  function showDescription() {
    console.log('📖 Функция showDescription вызвана');
    
    if (videos.length === 0) {
      console.warn('⚠️ Нет видео для показа описания');
      return;
    }
    
    const idx = videoOrder[currentOrderIndex];
    const videoData = videos[idx];
    
    if (videoData) {
      const title = videoData.title || 'Без названия';
      const description = videoData.description || 'Описание отсутствует';
      const series = videoData.series || 'Неизвестно';
      const seasons = videoData.seasons || 'Неизвестно';
      const status = videoData.status || 'Неизвестно';
      const country = videoData.country || 'Неизвестно';
      const genre = videoData.genre || 'Неизвестно';
      const year = videoData.year || 'Неизвестно';
      
      const fullDescription = `${description}

📊 Подробная информация:
• Год выпуска: ${year}
• Серии: ${series}
• Сезоны: ${seasons}  
• Статус: ${status}
• Страна: ${country}
• Жанр: ${genre}`;
      
      if (modalTitle) {
        modalTitle.textContent = title;
      }
      
      if (modalDescription) {
        modalDescription.textContent = fullDescription;
      }
      
      if (descriptionModal) {
        descriptionModal.classList.add('show');
        console.log('✅ Модальное окно показано');
      }
    }
  }

  // Функция скрытия модального окна
  function hideDescription() {
    console.log('❌ Закрываем модальное окно описания');
    if (descriptionModal) {
      descriptionModal.classList.remove('show');
    }
  }

  // Настройка кнопки лайка
  setupButtonWithPointerEvents(likeButton, async (e) => {
    const videoId = likeButton.getAttribute('data-video-id');
    if (!videoId) {
      console.error('❌ Video ID отсутствует!');
      return;
    }
    
    console.log('👍 Обработка лайка для:', videoId);
    
    try {
      const freshUserData = await window.telegramAuth.getUserData();
      if (freshUserData) {
        userFavorites = freshUserData.favorites || [];
        userLikes = freshUserData.likes || [];
        userDislikes = freshUserData.dislikes || [];
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки свежих данных:', error);
    }
    
    const isCurrentlyLiked = userLikes.includes(videoId);
    const wasDisliked = userDislikes.includes(videoId);
    
    if (isCurrentlyLiked) {
      userLikes = userLikes.filter(id => id !== videoId);
    } else {
      userLikes.push(videoId);
      if (wasDisliked) {
        userDislikes = userDislikes.filter(id => id !== videoId);
      }
    }
    updateButtonStates(videoId);
    
    const actions = [];
    
    if (isCurrentlyLiked) {
      actions.push(window.telegramAuth.updateReaction('remove_like', videoId));
    } else {
      actions.push(window.telegramAuth.updateReaction('add_like', videoId));
      if (wasDisliked) {
        actions.push(window.telegramAuth.updateReaction('remove_dislike', videoId));
      }
    }
    
    Promise.all(actions).then(results => {
      const allSuccess = results.every(success => success === true);
      if (!allSuccess) {
        if (isCurrentlyLiked) {
          userLikes.push(videoId);
        } else {
          userLikes = userLikes.filter(id => id !== videoId);
          if (wasDisliked) {
            userDislikes.push(videoId);
          }
        }
        updateButtonStates(videoId);
        console.error('❌ Не удалось обновить реакции на сервере');
      }
    });
  });

  // Настройка кнопки дизлайка
  setupButtonWithPointerEvents(dislikeButton, async (e) => {
    const videoId = dislikeButton.getAttribute('data-video-id');
    if (!videoId) {
      console.error('❌ Video ID отсутствует!');
      return;
    }
    
    console.log('👎 Обработка дизлайка для:', videoId);
    
    try {
      const freshUserData = await window.telegramAuth.getUserData();
      if (freshUserData) {
        userFavorites = freshUserData.favorites || [];
        userLikes = freshUserData.likes || [];
        userDislikes = freshUserData.dislikes || [];
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки свежих данных:', error);
    }
    
    const isCurrentlyDisliked = userDislikes.includes(videoId);
    const wasLiked = userLikes.includes(videoId);
    
    if (isCurrentlyDisliked) {
      userDislikes = userDislikes.filter(id => id !== videoId);
    } else {
      userDislikes.push(videoId);
      if (wasLiked) {
        userLikes = userLikes.filter(id => id !== videoId);
      }
    }
    updateButtonStates(videoId);
    
    const actions = [];
    
    if (isCurrentlyDisliked) {
      actions.push(window.telegramAuth.updateReaction('remove_dislike', videoId));
    } else {
      actions.push(window.telegramAuth.updateReaction('add_dislike', videoId));
      if (wasLiked) {
        actions.push(window.telegramAuth.updateReaction('remove_like', videoId));
      }
    }
    
    Promise.all(actions).then(results => {
      const allSuccess = results.every(success => success === true);
      if (!allSuccess) {
        if (isCurrentlyDisliked) {
          userDislikes.push(videoId);
        } else {
          userDislikes = userDislikes.filter(id => id !== videoId);
          if (wasLiked) {
            userLikes.push(videoId);
          }
        }
        updateButtonStates(videoId);
        console.error('❌ Не удалось обновить реакции на сервере');
      }
    });
  });

  // Настройка кнопки избранного
  setupButtonWithPointerEvents(favoriteButton, async (e) => {
    const videoId = favoriteButton.getAttribute('data-video-id');
    if (!videoId) {
      console.error('❌ Video ID отсутствует!');
      return;
    }
    
    console.log('⭐ Обработка избранного для:', videoId);
    
    try {
      const freshUserData = await window.telegramAuth.getUserData();
      if (freshUserData) {
        userFavorites = freshUserData.favorites || [];
        userLikes = freshUserData.likes || [];
        userDislikes = freshUserData.dislikes || [];
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки свежих данных:', error);
    }
    
    const isFavorite = userFavorites.includes(videoId);
    
    if (isFavorite) {
      userFavorites = userFavorites.filter(id => id !== videoId);
    } else {
      userFavorites.push(videoId);
    }
    updateButtonStates(videoId);
    
    window.telegramAuth.toggleFavorite(videoId).then(success => {
      if (!success) {
        if (isFavorite) {
          userFavorites.push(videoId);
        } else {
          userFavorites = userFavorites.filter(id => id !== videoId);
        }
        updateButtonStates(videoId);
        console.error('❌ Не удалось обновить избранное на сервере');
      }
    });
    
    if (currentTab === 'favorites') {
      setTimeout(() => updateFavoritesList(), 300);
    }
  });

  // Обработчики для модального окна описания
  if (descriptionButton) {
    descriptionButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('📖 Нажата кнопка описания');
      showDescription();
    });
    
    descriptionButton.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showDescription();
    });
  }

  if (modalClose) {
    modalClose.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      hideDescription();
    });
    
    modalClose.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      hideDescription();
    });
  }

  if (descriptionModal) {
    descriptionModal.addEventListener('click', (e) => {
      if (e.target === descriptionModal) {
        hideDescription();
      }
    });
  }

  // Настраиваем основной video элемент
  if (videoPlayer) {
    videoPlayer.muted = false;
    
    videoPlayer.addEventListener('pause', () => {
      console.log('⏸️ Видео на паузе');
    });
    
    videoPlayer.addEventListener('play', () => {
      console.log('▶️ Видео воспроизводится');
    });
  }

  // ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ СОВМЕСТИМОСТИ
  window.nextVideo = nextVideo;
  window.loadVideo = loadVideo;

  // Запускаем приложение
  await fetchVideos();

  console.log('🎥 Ожидаем первый клик пользователя для запуска видео');

  // Периодическая синхронизация данных (каждые 30 секунд)
  setInterval(async () => {
    try {
      const freshUserData = await window.telegramAuth.getUserData();
      if (freshUserData) {
        userFavorites = freshUserData.favorites || [];
        userLikes = freshUserData.likes || [];
        userDislikes = freshUserData.dislikes || [];
        watchedVideosSet = new Set(freshUserData.watchedVideos || []);
        
        const currentVideoId = likeButton?.getAttribute('data-video-id');
        if (currentVideoId) {
          updateButtonStates(currentVideoId);
        }
        
        if (currentTab === 'favorites') {
          updateFavoritesList();
        }
        
        console.log('🔄 Автоматическая синхронизация выполнена');
      }
    } catch (error) {
      console.error('❌ Ошибка автоматической синхронизации:', error);
    }
  }, 30000);

  // Обработчик для очистки при закрытии приложения
  window.addEventListener('beforeunload', () => {
    if (lastVideoUpdateTimer) {
      clearTimeout(lastVideoUpdateTimer);
      const currentVideoId = likeButton?.getAttribute('data-video-id');
      if (currentVideoId) {
        window.telegramAuth.updateLastVideo(currentVideoId);
      }
    }
    
    if (sessionOrderUpdateTimer) {
      clearTimeout(sessionOrderUpdateTimer);
      window.telegramAuth.saveSessionOrder(currentSessionOrder);
    }
  });

  console.log('🎉 Приложение полностью инициализировано!');
  console.log('📱 TikTok-style Preview Swipe активирован');
  console.log('🎯 Gesture Controller с preview функциональностью');
  console.log('🚀 VideoPreloader с поддержкой preview');
  console.log('🔄 Все контроллеры связаны и готовы к работе');
  console.log('🎬 Версия 8.2 - TikTok-style Preview Swipe');
});

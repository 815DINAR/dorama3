/**
 * TikTok Style Navigation Module
 * Независимый модуль для вертикальной навигации в стиле TikTok
 * Версия: 1.0
 */

class TikTokNavigation {
    constructor(config = {}) {
        // Конфигурация
        this.config = {
            containerSelector: config.containerSelector || '.video-container',
            videoSelector: config.videoSelector || '.video-item',
            swipeThreshold: config.swipeThreshold || 50,
            animationDuration: config.animationDuration || 400,
            enableMouse: config.enableMouse !== false,
            enableKeyboard: config.enableKeyboard !== false,
            debug: config.debug || false,
            
            // Коллбеки
            onVideoChange: config.onVideoChange || null,
            onSwipeStart: config.onSwipeStart || null,
            onSwipeEnd: config.onSwipeEnd || null,
            onTap: config.onTap || null
        };
        
        // Состояние
        this.currentIndex = 0;
        this.videos = [];
        this.container = null;
        this.isTransitioning = false;
        this.isDragging = false;
        this.hasMoved = false;
        
        // Touch данные
        this.touchStartY = 0;
        this.touchCurrentY = 0;
        this.containerOffset = 0;
        
        this.init();
    }
    
    init() {
        this.container = document.querySelector(this.config.containerSelector);
        if (!this.container) {
            console.error('TikTokNavigation: Container not found');
            return;
        }
        
        this.setupContainer();
        this.bindEvents();
        this.updateVideos();
        
        if (this.config.debug) {
            console.log('TikTokNavigation: Initialized', this.config);
        }
    }
    
    setupContainer() {
        // Настраиваем контейнер для вертикальной навигации
        this.container.style.position = 'relative';
        this.container.style.width = '100%';
        this.container.style.height = '100vh';
        this.container.style.overflow = 'hidden';
        this.container.style.willChange = 'transform';
    }
    
    updateVideos() {
        // Получаем все видео элементы
        this.videos = Array.from(this.container.querySelectorAll(this.config.videoSelector));
        
        // Позиционируем каждое видео вертикально
        this.videos.forEach((video, index) => {
            video.style.position = 'absolute';
            video.style.top = `${index * 100}vh`;
            video.style.left = '0';
            video.style.width = '100%';
            video.style.height = '100vh';
        });
        
        // Устанавливаем начальную позицию
        this.setContainerPosition(-this.currentIndex * window.innerHeight);
        
        if (this.config.debug) {
            console.log('TikTokNavigation: Videos updated', this.videos.length);
        }
    }
    
    setContainerPosition(offset) {
        this.containerOffset = offset;
        this.container.style.transform = `translateY(${offset}px)`;
    }
    
    bindEvents() {
        // Touch события
        this.container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.container.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.container.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        
        // Mouse события (если включены)
        if (this.config.enableMouse) {
            this.container.addEventListener('mousedown', this.handleMouseStart.bind(this));
            document.addEventListener('mousemove', this.handleMouseMove.bind(this));
            document.addEventListener('mouseup', this.handleMouseEnd.bind(this));
        }
        
        // Клавиатурные события (если включены)
        if (this.config.enableKeyboard) {
            document.addEventListener('keydown', this.handleKeyDown.bind(this));
        }
        
        // Предотвращаем контекстное меню
        this.container.addEventListener('contextmenu', e => e.preventDefault());
    }
    
    handleTouchStart(e) {
        if (this.isTransitioning) return;
        
        this.touchStartY = e.touches[0].clientY;
        this.touchCurrentY = this.touchStartY;
        this.isDragging = true;
        this.hasMoved = false;
        this.container.classList.add('dragging');
        
        if (this.config.onSwipeStart) {
            this.config.onSwipeStart(this.currentIndex);
        }
        
        e.preventDefault();
    }
    
    handleTouchMove(e) {
        if (!this.isDragging || this.isTransitioning) return;
        
        this.touchCurrentY = e.touches[0].clientY;
        const deltaY = this.touchCurrentY - this.touchStartY;
        
        // Отмечаем движение если оно больше минимального порога
        if (Math.abs(deltaY) > 5) {
            this.hasMoved = true;
        }
        
        // Вычисляем новую позицию с ограничениями
        let newOffset = this.containerOffset + deltaY;
        
        // Границы прокрутки
        const maxOffset = 0;
        const minOffset = -(this.videos.length - 1) * window.innerHeight;
        
        // Добавляем сопротивление на границах
        if (newOffset > maxOffset) {
            newOffset = maxOffset + (newOffset - maxOffset) * 0.3;
        } else if (newOffset < minOffset) {
            newOffset = minOffset + (newOffset - minOffset) * 0.3;
        }
        
        // Применяем трансформацию сразу
        this.container.style.transform = `translateY(${newOffset}px)`;
        
        e.preventDefault();
    }
    
    handleTouchEnd(e) {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.container.classList.remove('dragging');
        
        // Если не было движения - это тап
        if (!this.hasMoved) {
            if (this.config.onTap) {
                this.config.onTap(this.currentIndex);
            }
            this.snapToCurrent();
            return;
        }
        
        const deltaY = this.touchCurrentY - this.touchStartY;
        this.handleSwipeEnd(deltaY);
    }
    
    // Mouse события (для тестирования на десктопе)
    handleMouseStart(e) {
        if (this.isTransitioning) return;
        
        this.touchStartY = e.clientY;
        this.touchCurrentY = this.touchStartY;
        this.isDragging = true;
        this.hasMoved = false;
        this.container.classList.add('dragging');
        
        if (this.config.onSwipeStart) {
            this.config.onSwipeStart(this.currentIndex);
        }
        
        e.preventDefault();
    }
    
    handleMouseMove(e) {
        if (!this.isDragging || this.isTransitioning) return;
        
        this.touchCurrentY = e.clientY;
        const deltaY = this.touchCurrentY - this.touchStartY;
        
        if (Math.abs(deltaY) > 5) {
            this.hasMoved = true;
        }
        
        let newOffset = this.containerOffset + deltaY;
        
        const maxOffset = 0;
        const minOffset = -(this.videos.length - 1) * window.innerHeight;
        
        if (newOffset > maxOffset) {
            newOffset = maxOffset + (newOffset - maxOffset) * 0.3;
        } else if (newOffset < minOffset) {
            newOffset = minOffset + (newOffset - minOffset) * 0.3;
        }
        
        this.container.style.transform = `translateY(${newOffset}px)`;
        
        e.preventDefault();
    }
    
    handleMouseEnd(e) {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.container.classList.remove('dragging');
        
        if (!this.hasMoved) {
            if (this.config.onTap) {
                this.config.onTap(this.currentIndex);
            }
            this.snapToCurrent();
            return;
        }
        
        const deltaY = this.touchCurrentY - this.touchStartY;
        this.handleSwipeEnd(deltaY);
    }
    
    handleKeyDown(e) {
        if (this.isTransitioning) return;
        
        switch(e.key) {
            case 'ArrowUp':
                e.preventDefault();
                this.goToPrevious();
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.goToNext();
                break;
        }
    }
    
    handleSwipeEnd(deltaY) {
        let targetIndex = this.currentIndex;
        
        // Определяем направление свайпа
        if (Math.abs(deltaY) > this.config.swipeThreshold) {
            if (deltaY > 0 && this.currentIndex > 0) {
                // Свайп вниз - предыдущее видео
                targetIndex = this.currentIndex - 1;
            } else if (deltaY < 0 && this.currentIndex < this.videos.length - 1) {
                // Свайп вверх - следующее видео
                targetIndex = this.currentIndex + 1;
            }
        }
        
        // Также проверяем к какому видео ближе всего
        const currentOffset = parseFloat(this.container.style.transform.match(/-?\d+\.?\d*/)[0] || 0);
        const nearestIndex = Math.round(Math.abs(currentOffset) / window.innerHeight);
        
        if (Math.abs(deltaY) <= this.config.swipeThreshold) {
            targetIndex = Math.max(0, Math.min(this.videos.length - 1, nearestIndex));
        }
        
        this.goToIndex(targetIndex);
    }
    
    goToNext() {
        if (this.currentIndex < this.videos.length - 1) {
            this.goToIndex(this.currentIndex + 1);
        }
    }
    
    goToPrevious() {
        if (this.currentIndex > 0) {
            this.goToIndex(this.currentIndex - 1);
        }
    }
    
    goToIndex(index) {
        if (index < 0 || index >= this.videos.length || index === this.currentIndex || this.isTransitioning) {
            this.snapToCurrent();
            return;
        }
        
        const oldIndex = this.currentIndex;
        this.currentIndex = index;
        
        this.animateToIndex(index).then(() => {
            if (this.config.onVideoChange) {
                this.config.onVideoChange(this.currentIndex, oldIndex);
            }
            
            if (this.config.onSwipeEnd) {
                this.config.onSwipeEnd(this.currentIndex);
            }
        });
    }
    
    animateToIndex(index) {
        return new Promise((resolve) => {
            this.isTransitioning = true;
            
            const targetOffset = -index * window.innerHeight;
            
            // Плавная анимация
            this.container.style.transition = `transform ${this.config.animationDuration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
            this.container.style.transform = `translateY(${targetOffset}px)`;
            
            this.containerOffset = targetOffset;
            
            setTimeout(() => {
                this.isTransitioning = false;
                this.container.style.transition = '';
                resolve();
            }, this.config.animationDuration);
        });
    }
    
    snapToCurrent() {
        const targetOffset = -this.currentIndex * window.innerHeight;
        
        this.container.style.transition = `transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
        this.container.style.transform = `translateY(${targetOffset}px)`;
        this.containerOffset = targetOffset;
        
        setTimeout(() => {
            this.container.style.transition = '';
        }, 300);
    }
    
    // Публичные методы
    addVideo(videoElement) {
        const index = this.videos.length;
        videoElement.style.position = 'absolute';
        videoElement.style.top = `${index * 100}vh`;
        videoElement.style.left = '0';
        videoElement.style.width = '100%';
        videoElement.style.height = '100vh';
        
        this.container.appendChild(videoElement);
        this.videos.push(videoElement);
        
        if (this.config.debug) {
            console.log('TikTokNavigation: Video added', index);
        }
    }
    
    removeVideo(index) {
        if (index >= 0 && index < this.videos.length) {
            const video = this.videos[index];
            video.remove();
            this.videos.splice(index, 1);
            
            // Пересчитываем позиции
            this.updateVideos();
            
            // Корректируем текущий индекс если нужно
            if (this.currentIndex >= this.videos.length) {
                this.currentIndex = Math.max(0, this.videos.length - 1);
            }
            
            this.setContainerPosition(-this.currentIndex * window.innerHeight);
            
            if (this.config.debug) {
                console.log('TikTokNavigation: Video removed', index);
            }
        }
    }
    
    getCurrentIndex() {
        return this.currentIndex;
    }
    
    getVideosCount() {
        return this.videos.length;
    }
    
    destroy() {
        // Удаляем все обработчики событий
        this.container.removeEventListener('touchstart', this.handleTouchStart);
        this.container.removeEventListener('touchmove', this.handleTouchMove);
        this.container.removeEventListener('touchend', this.handleTouchEnd);
        
        if (this.config.enableMouse) {
            this.container.removeEventListener('mousedown', this.handleMouseStart);
            document.removeEventListener('mousemove', this.handleMouseMove);
            document.removeEventListener('mouseup', this.handleMouseEnd);
        }
        
        if (this.config.enableKeyboard) {
            document.removeEventListener('keydown', this.handleKeyDown);
        }
        
        if (this.config.debug) {
            console.log('TikTokNavigation: Destroyed');
        }
    }
}

// CSS стили для модуля (можно добавить в отдельный файл)
const TIKTOK_NAVIGATION_CSS = `
.video-container.dragging {
    transition: none !important;
}

.video-item {
    display: flex;
    justify-content: center;
    align-items: center;
    background: #000;
    transition: transform 0.3s ease;
}

.video-item video {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
`;

// Автоматически добавляем стили если это браузер
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = TIKTOK_NAVIGATION_CSS;
    document.head.appendChild(style);
}

// Экспорт для разных систем модулей
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TikTokNavigation;
} else if (typeof window !== 'undefined') {
    window.TikTokNavigation = TikTokNavigation;
}
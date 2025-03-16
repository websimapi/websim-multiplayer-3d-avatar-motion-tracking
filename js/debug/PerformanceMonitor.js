export default class PerformanceMonitor {
    constructor() {
        this.fps = 0;
        this.frames = 0;
        this.startTime = performance.now();
        this.lastFrameTime = 0;
        this.frameStart = 0;
        
        // Update FPS every second
        setInterval(() => {
            const now = performance.now();
            const elapsed = now - this.startTime;
            this.fps = Math.round((this.frames * 1000) / elapsed);
            this.startTime = now;
            this.frames = 0;
        }, 1000);
    }
    
    beginFrame() {
        this.frameStart = performance.now();
    }
    
    endFrame() {
        this.lastFrameTime = performance.now() - this.frameStart;
        this.frames++;
    }
    
    update() {
        // Any additional performance metrics can be updated here
    }
    
    getStats() {
        return {
            fps: this.fps,
            lastFrameTime: Math.round(this.lastFrameTime * 100) / 100,
            memory: this._getMemoryUsage()
        };
    }
    
    _getMemoryUsage() {
        if (window.performance && window.performance.memory) {
            const memoryInfo = window.performance.memory;
            return Math.round(memoryInfo.usedJSHeapSize / (1024 * 1024)) + ' MB';
        }
        return 'N/A';
    }
}
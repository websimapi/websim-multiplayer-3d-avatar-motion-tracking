export default class DebugPanel {
    constructor() {
        this.panel = document.getElementById('debug-panel');
        this.toggle = document.getElementById('debug-toggle');
        this.closeButton = document.getElementById('close-debug');
        this.tabButtons = document.querySelectorAll('.tab-button');
        this.tabContents = document.querySelectorAll('.tab-content');
        
        this.poseDataElement = document.getElementById('pose-data');
        this.sceneStatsElement = document.getElementById('scene-stats');
        this.networkStatsElement = document.getElementById('network-stats');
        this.fpsElement = document.getElementById('fps-display');
        this.memoryStatsElement = document.getElementById('memory-stats');
        this.timestampElement = document.getElementById('timestamp-display');
        
        this._setupEventListeners();
    }
    
    _setupEventListeners() {
        // Debug panel toggle
        this.toggle.addEventListener('click', () => {
            this.panel.classList.toggle('hidden');
        });
        
        // Close button
        this.closeButton.addEventListener('click', () => {
            this.panel.classList.add('hidden');
        });
        
        // Tab buttons
        this.tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                
                // Update active tab button
                this.tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Update active tab content
                this.tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === `${tabName}-tab`) {
                        content.classList.add('active');
                    }
                });
            });
        });
    }
    
    isVisible() {
        return !this.panel.classList.contains('hidden');
    }
    
    updatePoseData(pose) {
        if (!this.isVisible()) return;
        
        // Format pose data for display
        const simplifiedPose = {
            keypoints: pose.keypoints.map(kp => ({
                name: kp.name,
                x: Math.round(kp.x),
                y: Math.round(kp.y),
                score: Math.round(kp.score * 100) / 100
            }))
        };
        
        this.poseDataElement.textContent = JSON.stringify(simplifiedPose, null, 2);
    }
    
    updateSceneInfo(info) {
        if (!this.isVisible()) return;
        
        let html = '';
        for (const [key, value] of Object.entries(info)) {
            html += `<div><strong>${key}:</strong> ${value}</div>`;
        }
        
        this.sceneStatsElement.innerHTML = html;
    }
    
    updateNetworkInfo(info) {
        if (!this.isVisible()) return;
        
        let html = '';
        for (const [key, value] of Object.entries(info)) {
            html += `<div><strong>${key}:</strong> ${value}</div>`;
        }
        
        this.networkStatsElement.innerHTML = html;
    }
    
    updatePerformanceInfo(stats) {
        if (!this.isVisible()) return;
        
        this.fpsElement.textContent = `FPS: ${stats.fps}`;
        this.memoryStatsElement.textContent = `Memory: ${stats.memory}`;
        this.timestampElement.textContent = `Last frame: ${stats.lastFrameTime}ms`;
    }
}
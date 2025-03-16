// Main application entry point
import SceneManager from './scene/SceneManager.js';
import PoseDetection from './tracking/PoseDetection.js';
import NetworkManager from './network/NetworkManager.js';
import UIManager from './ui/UIManager.js';
import DebugPanel from './debug/DebugPanel.js';
import PerformanceMonitor from './debug/PerformanceMonitor.js';

// Main application state
const state = {
    isTracking: false,
    clientId: null,
    username: null
};

// Create managers
const sceneManager = new SceneManager('scene-container');
const poseDetection = new PoseDetection('webcam', 'output');
const networkManager = new NetworkManager(sceneManager);
const uiManager = new UIManager(startTracking);
const debugPanel = new DebugPanel();
const performanceMonitor = new PerformanceMonitor();

// Initialize everything
async function init() {
    // Initialize scene
    sceneManager.init();
    
    // Setup network
    await networkManager.connect();
    state.clientId = networkManager.getClientId();
    state.username = networkManager.getUsername();
    
    // Update UI with connection info
    uiManager.updateStatus(`Connected as ${state.username}`);
    
    // Start animation loop
    animate();
}

// Start tracking
async function startTracking() {
    uiManager.disableStartButton("Starting...");
    
    try {
        // Initialize pose detection
        const poseDetectionInitialized = await poseDetection.init();
        if (!poseDetectionInitialized) {
            throw new Error("Failed to initialize pose detection");
        }
        
        // Start webcam
        const webcamStarted = await poseDetection.startWebcam();
        if (!webcamStarted) {
            throw new Error("Failed to start webcam");
        }
        
        // All initialized successfully
        state.isTracking = true;
        uiManager.updateStartButton("Tracking Active");
        uiManager.updateStatus(`Tracking active - Connected as ${state.username}`);
        
        // Start pose processing
        processLocalPose();
    } catch (error) {
        console.error(error);
        uiManager.enableStartButton("Retry Start");
    }
}

// Process local pose and broadcast to others
async function processLocalPose() {
    if (!state.isTracking) return;
    
    const pose = await poseDetection.detectPose();
    if (pose) {
        // Update local avatar
        sceneManager.updateLocalAvatar(pose, state.clientId);
        
        // Send pose data to debug panel
        debugPanel.updatePoseData(pose);
        
        // Broadcast pose data to other users
        networkManager.broadcastPose(pose);
    }
    
    // Continue processing at ~30fps
    setTimeout(processLocalPose, 33);
}

// Main animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Begin performance monitoring
    performanceMonitor.beginFrame();
    
    // Update scene
    sceneManager.update();
    
    // Update debug info if enabled
    if (debugPanel.isVisible()) {
        debugPanel.updateSceneInfo(sceneManager.getSceneInfo());
        debugPanel.updateNetworkInfo(networkManager.getNetworkInfo());
        performanceMonitor.update();
        debugPanel.updatePerformanceInfo(performanceMonitor.getStats());
    }
    
    // End performance monitoring
    performanceMonitor.endFrame();
}

// Start the application
init();
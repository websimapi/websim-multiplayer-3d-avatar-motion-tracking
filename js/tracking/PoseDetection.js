export default class PoseDetection {
    constructor(videoElementId, canvasElementId) {
        this.videoElement = document.getElementById(videoElementId);
        this.outputCanvas = document.getElementById(canvasElementId);
        this.outputContext = this.outputCanvas.getContext('2d');
        this.webcamStream = null;
        this.poseDetectionModel = null;
    }
    
    async init() {
        try {
            await tf.setBackend('webgl');
            
            // Load MoveNet model 
            const model = poseDetection.SupportedModels.MoveNet;
            const detectorConfig = {
                modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
                enableSmoothing: true
            };
            
            this.poseDetectionModel = await poseDetection.createDetector(model, detectorConfig);
            return true;
        } catch (error) {
            console.error('Error initializing pose detection:', error);
            return false;
        }
    }
    
    async startWebcam() {
        try {
            this.webcamStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: 640,
                    height: 480,
                    facingMode: 'user'
                }
            });
            
            this.videoElement.srcObject = this.webcamStream;
            
            return new Promise((resolve) => {
                this.videoElement.onloadedmetadata = () => {
                    this.videoElement.play();
                    resolve(true);
                };
            });
        } catch (error) {
            console.error('Error accessing webcam:', error);
            return false;
        }
    }
    
    async detectPose() {
        if (!this.poseDetectionModel || !this.webcamStream || this.videoElement.readyState !== 4) {
            return null;
        }
        
        try {
            const poses = await this.poseDetectionModel.estimatePoses(this.videoElement);
            if (poses.length > 0) {
                // Draw pose on canvas for visualization
                this.drawPoseOnCanvas(poses[0]);
                return poses[0];
            }
            return null;
        } catch (error) {
            console.error('Error detecting pose:', error);
            return null;
        }
    }
    
    drawPoseOnCanvas(pose) {
        const ctx = this.outputContext;
        const videoWidth = this.videoElement.videoWidth;
        const videoHeight = this.videoElement.videoHeight;
        
        // Set canvas dimensions to match video
        this.outputCanvas.width = videoWidth;
        this.outputCanvas.height = videoHeight;
        
        // Clear canvas
        ctx.clearRect(0, 0, videoWidth, videoHeight);
        
        // Mirror the canvas
        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-videoWidth, 0);
        
        // Draw the keypoints
        if (pose.keypoints) {
            for (const keypoint of pose.keypoints) {
                if (keypoint.score > 0.3) {
                    ctx.beginPath();
                    ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
                    ctx.fillStyle = 'aqua';
                    ctx.fill();
                }
            }
            
            // Draw the skeleton
            const adjacentPairs = [
                ['nose', 'left_eye'], ['nose', 'right_eye'],
                ['left_eye', 'left_ear'], ['right_eye', 'right_ear'],
                ['left_shoulder', 'right_shoulder'],
                ['left_shoulder', 'left_elbow'], ['right_shoulder', 'right_elbow'],
                ['left_elbow', 'left_wrist'], ['right_elbow', 'right_wrist'],
                ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
                ['left_hip', 'right_hip'],
                ['left_hip', 'left_knee'], ['right_hip', 'right_knee'],
                ['left_knee', 'left_ankle'], ['right_knee', 'right_ankle']
            ];
            
            const keypointMap = {};
            pose.keypoints.forEach(keypoint => {
                keypointMap[keypoint.name] = keypoint;
            });
            
            ctx.strokeStyle = 'aqua';
            ctx.lineWidth = 2;
            
            for (const [a, b] of adjacentPairs) {
                const keypointA = keypointMap[a];
                const keypointB = keypointMap[b];
                
                if (keypointA && keypointB && keypointA.score > 0.3 && keypointB.score > 0.3) {
                    ctx.beginPath();
                    ctx.moveTo(keypointA.x, keypointA.y);
                    ctx.lineTo(keypointB.x, keypointB.y);
                    ctx.stroke();
                }
            }
        }
        
        ctx.restore();
    }
    
    stopWebcam() {
        if (this.webcamStream) {
            this.webcamStream.getTracks().forEach(track => track.stop());
            this.webcamStream = null;
        }
    }
}
describe('PoseDetection', () => {
    let poseDetection;
    let mockVideoElement;
    let mockCanvas;
    let mockCanvasContext;
    
    beforeEach(() => {
        // Mock DOM elements
        mockVideoElement = document.createElement('video');
        mockVideoElement.id = 'webcam';
        mockVideoElement.width = 640;
        mockVideoElement.height = 480;
        
        mockCanvas = document.createElement('canvas');
        mockCanvas.id = 'output';
        mockCanvas.width = 640;
        mockCanvas.height = 480;
        
        mockCanvasContext = {
            clearRect: jest.fn(),
            save: jest.fn(),
            scale: jest.fn(),
            translate: jest.fn(),
            beginPath: jest.fn(),
            arc: jest.fn(),
            fillStyle: '',
            fill: jest.fn(),
            strokeStyle: '',
            lineWidth: 1,
            moveTo: jest.fn(),
            lineTo: jest.fn(),
            stroke: jest.fn(),
            restore: jest.fn()
        };
        
        mockCanvas.getContext = jest.fn(() => mockCanvasContext);
        
        document.body.appendChild(mockVideoElement);
        document.body.appendChild(mockCanvas);
        
        // Mock TensorFlow and poseDetection
        global.tf = {
            setBackend: jest.fn(() => Promise.resolve())
        };
        
        global.poseDetection = {
            SupportedModels: {
                MoveNet: 'movenet'
            },
            movenet: {
                modelType: {
                    SINGLEPOSE_LIGHTNING: 'lightning'
                }
            },
            createDetector: jest.fn(() => Promise.resolve({
                estimatePoses: jest.fn(() => Promise.resolve([{
                    keypoints: [
                        { name: 'nose', x: 200, y: 100, score: 0.9 },
                        { name: 'left_eye', x: 180, y: 90, score: 0.8 },
                        { name: 'right_eye', x: 220, y: 90, score: 0.8 }
                    ]
                }]))
            }))
        };
        
        // Mock navigator.mediaDevices
        global.navigator.mediaDevices = {
            getUserMedia: jest.fn(() => Promise.resolve({
                getTracks: jest.fn(() => [{
                    stop: jest.fn()
                }])
            }))
        };
        
        // Import PoseDetection after mocks
        const PoseDetection = require('./PoseDetection').default;
        poseDetection = new PoseDetection('webcam', 'output');
    });
    
    afterEach(() => {
        document.body.removeChild(mockVideoElement);
        document.body.removeChild(mockCanvas);
        jest.resetAllMocks();
    });
    
    test('should initialize correctly', async () => {
        const result = await poseDetection.init();
        
        // Verify TensorFlow backend was set
        expect(tf.setBackend).toHaveBeenCalledWith('webgl');
        // Verify pose detector was created
        expect(poseDetection.createDetector).toHaveBeenCalled();
        // Verify init returns true on success
        expect(result).toBe(true);
    });
    
    test('should start webcam correctly', async () => {
        mockVideoElement.onloadedmetadata = null;
        
        // Mock play method
        mockVideoElement.play = jest.fn(() => {
            // Simulate onloadedmetadata event
            setTimeout(() => {
                if (mockVideoElement.onloadedmetadata) {
                    mockVideoElement.onloadedmetadata();
                }
            }, 0);
        });
        
        const result = await poseDetection.startWebcam();
        
        // Verify getUserMedia was called with correct constraints
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
            video: {
                width: 640,
                height: 480,
                facingMode: 'user'
            }
        });
        
        // Verify video source was set
        expect(mockVideoElement.srcObject).toBeTruthy();
        
        // Verify play was called
        expect(mockVideoElement.play).toHaveBeenCalled();
        
        // Verify function returns true on success
        expect(result).toBe(true);
    });
    
    test('should detect pose correctly', async () => {
        // Setup
        poseDetection.poseDetectionModel = {
            estimatePoses: jest.fn(() => Promise.resolve([{
                keypoints: [
                    { name: 'nose', x: 200, y: 100, score: 0.9 },
                    { name: 'left_eye', x: 180, y: 90, score: 0.8 },
                    { name: 'right_eye', x: 220, y: 90, score: 0.8 }
                ]
            }]))
        };
        poseDetection.webcamStream = {};
        mockVideoElement.readyState = 4;
        
        // Mock drawPoseOnCanvas
        poseDetection.drawPoseOnCanvas = jest.fn();
        
        const pose = await poseDetection.detectPose();
        
        // Verify pose was detected
        expect(poseDetection.poseDetectionModel.estimatePoses).toHaveBeenCalled();
        
        // Verify drawPoseOnCanvas was called
        expect(poseDetection.drawPoseOnCanvas).toHaveBeenCalled();
        
        // Verify pose data is returned
        expect(pose).toBeTruthy();
        expect(pose.keypoints).toHaveLength(3);
        expect(pose.keypoints[0].name).toBe('nose');
    });
    
    test('should draw pose on canvas correctly', () => {
        const pose = {
            keypoints: [
                { name: 'nose', x: 200, y: 100, score: 0.9 },
                { name: 'left_eye', x: 180, y: 90, score: 0.8 },
                { name: 'right_eye', x: 220, y: 90, score: 0.8 },
                { name: 'left_shoulder', x: 150, y: 200, score: 0.7 },
                { name: 'right_shoulder', x: 250, y: 200, score: 0.7 }
            ]
        };
        
        poseDetection.drawPoseOnCanvas(pose);
        
        // Verify canvas was cleared
        expect(mockCanvasContext.clearRect).toHaveBeenCalled();
        
        // Verify canvas was scaled for mirroring
        expect(mockCanvasContext.save).toHaveBeenCalled();
        expect(mockCanvasContext.scale).toHaveBeenCalledWith(-1, 1);
        
        // Verify keypoints were drawn
        expect(mockCanvasContext.beginPath).toHaveBeenCalled();
        expect(mockCanvasContext.arc).toHaveBeenCalled();
        
        // Verify skeleton lines were drawn
        expect(mockCanvasContext.moveTo).toHaveBeenCalled();
        expect(mockCanvasContext.lineTo).toHaveBeenCalled();
        
        // Verify canvas context was restored
        expect(mockCanvasContext.restore).toHaveBeenCalled();
    });
});
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Initialize WebSocket connection
const room = new WebsimSocket();
let clientId = null;
let username = null;
let poseDetectionModel = null;
let webcamStream = null;
let isTracking = false;

// Three.js variables
let scene, camera, renderer, clock, mixer;
let controls;
const avatars = {};
let floorMesh;

// DOM Elements
const videoElement = document.getElementById('webcam');
const outputCanvas = document.getElementById('output');
const outputContext = outputCanvas.getContext('2d');
const startButton = document.getElementById('startButton');
const statusElement = document.getElementById('status');
const peersListElement = document.getElementById('peersList');

// Setup Three.js environment
function initThreeJS() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 3);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    document.getElementById('scene-container').appendChild(renderer.domElement);
    
    // Create clock for animations
    clock = new THREE.Clock();
    
    // Add orbit controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.update();
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // Add ground
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x999999,
        roughness: 0.8,
        metalness: 0.2
    });
    floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);
    
    // Add grid helper
    const gridHelper = new THREE.GridHelper(20, 20, 0x000000, 0x000000);
    gridHelper.material.opacity = 0.2;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Load and setup avatar model
async function loadAvatarModel(id) {
    const gltfLoader = new GLTFLoader();
    
    // Using a free rigged humanoid model
    return new Promise((resolve, reject) => {
        gltfLoader.load(
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Xbot.glb',
            (gltf) => {
                const model = gltf.scene;
                model.traverse((object) => {
                    if (object.isMesh) {
                        object.castShadow = true;
                    }
                });
                
                // Set up animation mixer
                const mixer = new THREE.AnimationMixer(model);
                
                // Add to scene
                scene.add(model);
                
                // Create avatar object
                const avatar = {
                    model: model,
                    mixer: mixer,
                    bones: {},
                    poseData: null
                };
                
                // Extract bones for manipulation
                const skeleton = model.children[0].children[0].skeleton;
                skeleton.bones.forEach(bone => {
                    avatar.bones[bone.name] = bone;
                });
                
                resolve(avatar);
            },
            undefined,
            reject
        );
    });
}

// Initialize PoseNet model
async function initPoseDetection() {
    try {
        await tf.setBackend('webgl');
        
        // Load MoveNet model 
        const model = poseDetection.SupportedModels.MoveNet;
        const detectorConfig = {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            enableSmoothing: true
        };
        
        poseDetectionModel = await poseDetection.createDetector(model, detectorConfig);
        return true;
    } catch (error) {
        console.error('Error initializing pose detection:', error);
        statusElement.textContent = 'Error initializing pose tracking';
        return false;
    }
}

// Start webcam and tracking
async function startWebcam() {
    try {
        webcamStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: 640,
                height: 480,
                facingMode: 'user'
            }
        });
        
        videoElement.srcObject = webcamStream;
        
        return new Promise((resolve) => {
            videoElement.onloadedmetadata = () => {
                videoElement.play();
                resolve(true);
            };
        });
    } catch (error) {
        console.error('Error accessing webcam:', error);
        statusElement.textContent = 'Error accessing webcam';
        return false;
    }
}

// Detect pose from webcam
async function detectPose() {
    if (!poseDetectionModel || !webcamStream || !videoElement.readyState === 4) {
        return null;
    }
    
    try {
        const poses = await poseDetectionModel.estimatePoses(videoElement);
        if (poses.length > 0) {
            // Draw pose on canvas for visualization
            drawPoseOnCanvas(poses[0]);
            return poses[0];
        }
        return null;
    } catch (error) {
        console.error('Error detecting pose:', error);
        return null;
    }
}

// Draw detected pose on canvas
function drawPoseOnCanvas(pose) {
    const ctx = outputContext;
    const videoWidth = videoElement.videoWidth;
    const videoHeight = videoElement.videoHeight;
    
    // Set canvas dimensions to match video
    outputCanvas.width = videoWidth;
    outputCanvas.height = videoHeight;
    
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

// Map pose keypoints to avatar bones
function mapPoseToAvatar(pose, avatar) {
    if (!pose || !pose.keypoints || !avatar) return;
    
    // Define keypoint to bone mapping
    const keypointMap = {};
    pose.keypoints.forEach(keypoint => {
        keypointMap[keypoint.name] = keypoint;
    });
    
    // Simple mapping for demonstration
    // In a production app, you would need a more sophisticated rig mapping
    
    // Head orientation
    if (keypointMap.nose && keypointMap.left_ear && keypointMap.right_ear) {
        if (avatar.bones.mixamorigNeck) {
            const neck = avatar.bones.mixamorigNeck;
            const headDirection = new THREE.Vector3(
                (keypointMap.nose.x - (keypointMap.left_ear.x + keypointMap.right_ear.x) / 2) / 100,
                0,
                0
            );
            neck.rotation.y = headDirection.x;
        }
    }
    
    // Arms
    if (keypointMap.left_shoulder && keypointMap.left_elbow && keypointMap.left_wrist) {
        if (avatar.bones.mixamorigLeftArm) {
            const shoulder = avatar.bones.mixamorigLeftArm;
            const shoulderToElbow = new THREE.Vector2(
                keypointMap.left_elbow.x - keypointMap.left_shoulder.x,
                keypointMap.left_elbow.y - keypointMap.left_shoulder.y
            );
            shoulder.rotation.z = Math.atan2(shoulderToElbow.y, shoulderToElbow.x) - Math.PI/2;
        }
        
        if (avatar.bones.mixamorigLeftForeArm) {
            const elbow = avatar.bones.mixamorigLeftForeArm;
            const elbowToWrist = new THREE.Vector2(
                keypointMap.left_wrist.x - keypointMap.left_elbow.x,
                keypointMap.left_wrist.y - keypointMap.left_elbow.y
            );
            elbow.rotation.z = Math.atan2(elbowToWrist.y, elbowToWrist.x) - Math.PI/2;
        }
    }
    
    if (keypointMap.right_shoulder && keypointMap.right_elbow && keypointMap.right_wrist) {
        if (avatar.bones.mixamorigRightArm) {
            const shoulder = avatar.bones.mixamorigRightArm;
            const shoulderToElbow = new THREE.Vector2(
                keypointMap.right_elbow.x - keypointMap.right_shoulder.x,
                keypointMap.right_elbow.y - keypointMap.right_shoulder.y
            );
            shoulder.rotation.z = -Math.atan2(shoulderToElbow.y, shoulderToElbow.x) + Math.PI/2;
        }
        
        if (avatar.bones.mixamorigRightForeArm) {
            const elbow = avatar.bones.mixamorigRightForeArm;
            const elbowToWrist = new THREE.Vector2(
                keypointMap.right_wrist.x - keypointMap.right_elbow.x,
                keypointMap.right_wrist.y - keypointMap.right_elbow.y
            );
            elbow.rotation.z = -Math.atan2(elbowToWrist.y, elbowToWrist.x) + Math.PI/2;
        }
    }
    
    // Legs
    if (keypointMap.left_hip && keypointMap.left_knee && keypointMap.left_ankle) {
        if (avatar.bones.mixamorigLeftUpLeg) {
            const hip = avatar.bones.mixamorigLeftUpLeg;
            const hipToKnee = new THREE.Vector2(
                keypointMap.left_knee.x - keypointMap.left_hip.x,
                keypointMap.left_knee.y - keypointMap.left_hip.y
            );
            hip.rotation.z = Math.atan2(hipToKnee.y, hipToKnee.x) - Math.PI/2;
        }
        
        if (avatar.bones.mixamorigLeftLeg) {
            const knee = avatar.bones.mixamorigLeftLeg;
            const kneeToAnkle = new THREE.Vector2(
                keypointMap.left_ankle.x - keypointMap.left_knee.x,
                keypointMap.left_ankle.y - keypointMap.left_knee.y
            );
            knee.rotation.z = Math.atan2(kneeToAnkle.y, kneeToAnkle.x) - Math.PI/2;
        }
    }
    
    if (keypointMap.right_hip && keypointMap.right_knee && keypointMap.right_ankle) {
        if (avatar.bones.mixamorigRightUpLeg) {
            const hip = avatar.bones.mixamorigRightUpLeg;
            const hipToKnee = new THREE.Vector2(
                keypointMap.right_knee.x - keypointMap.right_hip.x,
                keypointMap.right_knee.y - keypointMap.right_hip.y
            );
            hip.rotation.z = -Math.atan2(hipToKnee.y, hipToKnee.x) + Math.PI/2;
        }
        
        if (avatar.bones.mixamorigRightLeg) {
            const knee = avatar.bones.mixamorigRightLeg;
            const kneeToAnkle = new THREE.Vector2(
                keypointMap.right_ankle.x - keypointMap.right_knee.x,
                keypointMap.right_ankle.y - keypointMap.right_knee.y
            );
            knee.rotation.z = -Math.atan2(kneeToAnkle.y, kneeToAnkle.x) + Math.PI/2;
        }
    }
    
    // Position the avatar based on the hip position
    if (keypointMap.left_hip && keypointMap.right_hip) {
        const centerX = (keypointMap.left_hip.x + keypointMap.right_hip.x) / 2;
        // Normalize to scene coordinates
        const normalizedX = (centerX / videoElement.width - 0.5) * 4;
        avatar.model.position.x = normalizedX;
    }
}

// Main animation loop
function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    
    // Update all avatar mixers
    for (const id in avatars) {
        if (avatars[id].mixer) {
            avatars[id].mixer.update(delta);
        }
    }
    
    // Update controls
    controls.update();
    
    // Render scene
    renderer.render(scene, camera);
}

// Process local pose and broadcast to others
async function processLocalPose() {
    if (!isTracking) return;
    
    const pose = await detectPose();
    if (pose) {
        // Update local avatar
        if (avatars[clientId]) {
            mapPoseToAvatar(pose, avatars[clientId]);
            
            // Broadcast pose data to other users
            room.party.updatePresence({
                pose: {
                    keypoints: pose.keypoints,
                    timestamp: Date.now()
                }
            });
        }
    }
    
    // Continue processing at ~30fps
    setTimeout(processLocalPose, 33);
}

// Handle WebSocket connection events
function setupWebSocketHandlers() {
    // Get client info
    clientId = room.party.client.id;
    username = room.party.client.username;
    
    statusElement.textContent = `Connected as ${username}`;
    
    // Initialize local avatar
    loadAvatarModel(clientId).then(avatar => {
        avatars[clientId] = avatar;
        avatar.model.position.set(0, 0, 0);
        
        // Add username label above avatar
        createUsernameLabel(clientId, username);
    });
    
    // Subscribe to peer changes
    room.party.subscribe((peers) => {
        updatePeersList(peers);
        
        // Handle new peers
        for (const id in peers) {
            if (!avatars[id] && id !== clientId) {
                loadAvatarModel(id).then(avatar => {
                    avatars[id] = avatar;
                    avatar.model.position.set(Math.random() * 2 - 1, 0, Math.random() * 2 - 1);
                    
                    // Add username label above avatar
                    createUsernameLabel(id, peers[id].username);
                });
            }
        }
        
        // Remove disconnected peers
        for (const id in avatars) {
            if (!peers[id] && id !== clientId) {
                if (avatars[id].model) {
                    scene.remove(avatars[id].model);
                    
                    // Remove username label
                    const label = scene.getObjectByName(`label-${id}`);
                    if (label) scene.remove(label);
                }
                delete avatars[id];
            }
        }
    });
    
    // Subscribe to presence updates for pose data
    room.party.subscribePresence((presence) => {
        for (const id in presence) {
            if (id !== clientId && presence[id].pose && avatars[id]) {
                const poseData = presence[id].pose;
                // Apply remote pose data to corresponding avatar
                mapPoseToAvatar(poseData, avatars[id]);
            }
        }
    });
}

// Create and add username label above avatar
function createUsernameLabel(id, name) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    context.fillStyle = 'rgba(0, 0, 0, 0.5)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.font = '24px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(name, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.name = `label-${id}`;
    sprite.scale.set(1, 0.25, 1);
    sprite.position.set(0, 2.2, 0); // Position above avatar head
    
    // Add to avatar
    if (avatars[id] && avatars[id].model) {
        avatars[id].model.add(sprite);
    }
}

// Update the list of connected peers in the UI
function updatePeersList(peers) {
    peersListElement.innerHTML = '';
    
    for (const id in peers) {
        const peerEl = document.createElement('div');
        peerEl.className = 'peer-item';
        peerEl.textContent = peers[id].username + (id === clientId ? ' (You)' : '');
        peersListElement.appendChild(peerEl);
    }
}

// Start button event handler
startButton.addEventListener('click', async () => {
    startButton.disabled = true;
    startButton.textContent = 'Starting...';
    
    // Initialize pose detection
    const poseDetectionInitialized = await initPoseDetection();
    if (!poseDetectionInitialized) {
        startButton.disabled = false;
        startButton.textContent = 'Retry Start';
        return;
    }
    
    // Start webcam
    const webcamStarted = await startWebcam();
    if (!webcamStarted) {
        startButton.disabled = false;
        startButton.textContent = 'Retry Start';
        return;
    }
    
    // All initialized successfully
    isTracking = true;
    startButton.textContent = 'Tracking Active';
    statusElement.textContent = `Tracking active - Connected as ${username}`;
    
    // Start pose processing
    processLocalPose();
});

// Initialize everything
async function init() {
    // Initialize Three.js
    initThreeJS();
    
    // Setup WebSocket connection
    setupWebSocketHandlers();
    
    // Start animation loop
    animate();
}

// Start the application
init();


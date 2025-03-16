import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import AvatarLoader from './AvatarLoader.js';
import PoseMapper from '../tracking/PoseMapper.js';

export default class SceneManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.clock = new THREE.Clock();
        this.avatars = {};
        this.avatarLoader = new AvatarLoader();
        this.poseMapper = new PoseMapper();
    }
    
    init() {
        this._createScene();
        this._setupLights();
        this._setupGround();
        this._setupHelpers();
        this._setupEventListeners();
    }
    
    _createScene() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 1.6, 3);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        document.getElementById(this.containerId).appendChild(this.renderer.domElement);
        
        // Add orbit controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, 1, 0);
        this.controls.update();
    }
    
    _setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 7.5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
    }
    
    _setupGround() {
        const floorGeometry = new THREE.PlaneGeometry(20, 20);
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x999999,
            roughness: 0.8,
            metalness: 0.2
        });
        this.floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
        this.floorMesh.rotation.x = -Math.PI / 2;
        this.floorMesh.receiveShadow = true;
        this.scene.add(this.floorMesh);
    }
    
    _setupHelpers() {
        const gridHelper = new THREE.GridHelper(20, 20, 0x000000, 0x000000);
        gridHelper.material.opacity = 0.2;
        gridHelper.material.transparent = true;
        this.scene.add(gridHelper);
    }
    
    _setupEventListeners() {
        window.addEventListener('resize', this._onWindowResize.bind(this));
    }
    
    _onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    createAvatar(clientId, username, position = { x: 0, y: 0, z: 0 }) {
        return this.avatarLoader.loadModel().then(avatar => {
            this.avatars[clientId] = avatar;
            avatar.model.position.set(position.x, position.y, position.z);
            this.scene.add(avatar.model);
            
            // Add username label
            this._createUsernameLabel(clientId, username);
            
            return avatar;
        });
    }
    
    _createUsernameLabel(clientId, name) {
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
        sprite.name = `label-${clientId}`;
        sprite.scale.set(1, 0.25, 1);
        sprite.position.set(0, 2.2, 0); // Position above avatar head
        
        // Add to avatar
        if (this.avatars[clientId] && this.avatars[clientId].model) {
            this.avatars[clientId].model.add(sprite);
        }
    }
    
    removeAvatar(clientId) {
        if (this.avatars[clientId]) {
            this.scene.remove(this.avatars[clientId].model);
            
            // Remove username label
            const label = this.scene.getObjectByName(`label-${clientId}`);
            if (label) this.scene.remove(label);
            
            delete this.avatars[clientId];
        }
    }
    
    updateLocalAvatar(pose, clientId) {
        if (this.avatars[clientId]) {
            this.poseMapper.mapPoseToAvatar(pose, this.avatars[clientId]);
        }
    }
    
    updateRemoteAvatar(pose, clientId) {
        if (this.avatars[clientId]) {
            this.poseMapper.mapPoseToAvatar(pose, this.avatars[clientId]);
        }
    }
    
    update() {
        const delta = this.clock.getDelta();
        
        // Update all avatar mixers
        for (const id in this.avatars) {
            if (this.avatars[id].mixer) {
                this.avatars[id].mixer.update(delta);
            }
        }
        
        // Update controls
        this.controls.update();
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
    
    getSceneInfo() {
        return {
            avatarCount: Object.keys(this.avatars).length,
            triangleCount: this.renderer.info.render.triangles,
            drawCalls: this.renderer.info.render.calls,
            frameRate: Math.round(1 / this.clock.getDelta())
        };
    }
}
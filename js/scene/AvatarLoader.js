import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export default class AvatarLoader {
    constructor() {
        this.gltfLoader = new GLTFLoader();
    }
    
    loadModel() {
        // Using a free rigged humanoid model
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(
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
}
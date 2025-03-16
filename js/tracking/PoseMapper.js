import * as THREE from 'three';

export default class PoseMapper {
    mapPoseToAvatar(pose, avatar) {
        if (!pose || !pose.keypoints || !avatar) return;
        
        // Define keypoint to bone mapping
        const keypointMap = {};
        pose.keypoints.forEach(keypoint => {
            keypointMap[keypoint.name] = keypoint;
        });
        
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
            const normalizedX = (centerX / 640 - 0.5) * 4; 
            avatar.model.position.x = normalizedX;
        }
    }
}
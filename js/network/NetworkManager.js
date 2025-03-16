export default class NetworkManager {
    constructor(sceneManager) {
        this.room = new WebsimSocket();
        this.sceneManager = sceneManager;
        this.connectionTimestamp = null;
        this.lastPoseUpdate = null;
        this.poseUpdateCount = 0;
    }
    
    async connect() {
        this.connectionTimestamp = Date.now();
        
        // Get client info
        this.clientId = this.room.party.client.id;
        this.username = this.room.party.client.username;
        
        // Initialize local avatar
        await this.sceneManager.createAvatar(this.clientId, this.username);
        
        // Subscribe to peer changes
        this.room.party.subscribe(this._handlePeerChanges.bind(this));
        
        // Subscribe to presence updates for pose data
        this.room.party.subscribePresence(this._handlePresenceUpdates.bind(this));
    }
    
    _handlePeerChanges(peers) {
        // Handle new peers
        for (const id in peers) {
            if (id !== this.clientId && !this.sceneManager.avatars[id]) {
                this.sceneManager.createAvatar(
                    id, 
                    peers[id].username, 
                    { x: Math.random() * 2 - 1, y: 0, z: Math.random() * 2 - 1 }
                );
            }
        }
        
        // Remove disconnected peers
        for (const id in this.sceneManager.avatars) {
            if (!peers[id] && id !== this.clientId) {
                this.sceneManager.removeAvatar(id);
            }
        }
    }
    
    _handlePresenceUpdates(presence) {
        for (const id in presence) {
            if (id !== this.clientId && presence[id].pose) {
                const poseData = presence[id].pose;
                // Apply remote pose data to corresponding avatar
                this.sceneManager.updateRemoteAvatar(poseData, id);
            }
        }
    }
    
    broadcastPose(pose) {
        this.lastPoseUpdate = Date.now();
        this.poseUpdateCount++;
        
        this.room.party.updatePresence({
            pose: {
                keypoints: pose.keypoints,
                timestamp: Date.now()
            }
        });
    }
    
    getClientId() {
        return this.clientId;
    }
    
    getUsername() {
        return this.username;
    }
    
    getNetworkInfo() {
        return {
            connectedPeers: Object.keys(this.room.party.peers).length,
            clientId: this.clientId,
            username: this.username,
            connectionUptime: Math.floor((Date.now() - this.connectionTimestamp) / 1000),
            lastPoseUpdate: this.lastPoseUpdate ? Math.floor((Date.now() - this.lastPoseUpdate)) + 'ms ago' : 'N/A',
            poseUpdatesSent: this.poseUpdateCount
        };
    }
}
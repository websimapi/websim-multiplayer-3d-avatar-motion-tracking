describe('NetworkManager', () => {
    let networkManager;
    let mockSceneManager;
    let mockWebsimSocket;
    
    beforeEach(() => {
        // Mock SceneManager
        mockSceneManager = {
            createAvatar: jest.fn(() => Promise.resolve()),
            removeAvatar: jest.fn(),
            updateRemoteAvatar: jest.fn(),
            avatars: {}
        };
        
        // Mock WebsimSocket
        mockWebsimSocket = {
            party: {
                client: {
                    id: 'test-client-id',
                    username: 'TestUser'
                },
                peers: {
                    'test-client-id': { username: 'TestUser' },
                    'peer-1': { username: 'Peer1' }
                },
                subscribe: jest.fn(callback => {
                    // Store callback to call it later
                    mockWebsimSocket._peerCallback = callback;
                    return () => {};
                }),
                subscribePresence: jest.fn(callback => {
                    // Store callback to call it later
                    mockWebsimSocket._presenceCallback = callback;
                    return () => {};
                }),
                updatePresence: jest.fn()
            }
        };
        
        // Mock global WebsimSocket
        global.WebsimSocket = jest.fn(() => mockWebsimSocket);
        
        // Import NetworkManager after mocks
        const NetworkManager = require('./NetworkManager').default;
        networkManager = new NetworkManager(mockSceneManager);
    });
    
    afterEach(() => {
        jest.resetAllMocks();
    });
    
    test('should connect correctly', async () => {
        await networkManager.connect();
        
        // Verify client info was retrieved
        expect(networkManager.clientId).toBe('test-client-id');
        expect(networkManager.username).toBe('TestUser');
        
        // Verify local avatar was created
        expect(mockSceneManager.createAvatar).toHaveBeenCalledWith('test-client-id', 'TestUser');
        
        // Verify subscription to peer changes
        expect(mockWebsimSocket.party.subscribe).toHaveBeenCalled();
        
        // Verify subscription to presence updates
        expect(mockWebsimSocket.party.subscribePresence).toHaveBeenCalled();
    });
    
    test('should handle peer changes correctly', async () => {
        await networkManager.connect();
        
        // Setup mock avatars
        mockSceneManager.avatars = {
            'test-client-id': {},
            'peer-1': {},
            'peer-2': {} // This peer is not in the new peers list, should be removed
        };
        
        // Simulate peer changes
        const newPeers = {
            'test-client-id': { username: 'TestUser' },
            'peer-1': { username: 'Peer1' },
            'peer-3': { username: 'Peer3' } // New peer, should be added
        };
        
        // Call the peer callback
        mockWebsimSocket._peerCallback(newPeers);
        
        // Verify new peer was created
        expect(mockSceneManager.createAvatar).toHaveBeenCalledWith(
            'peer-3',
            'Peer3',
            expect.objectContaining({
                x: expect.any(Number),
                y: 0,
                z: expect.any(Number)
            })
        );
        
        // Verify disconnected peer was removed
        expect(mockSceneManager.removeAvatar).toHaveBeenCalledWith('peer-2');
    });
    
    test('should handle presence updates correctly', async () => {
        await networkManager.connect();
        
        // Setup mock avatars
        mockSceneManager.avatars = {
            'test-client-id': {},
            'peer-1': {}
        };
        
        // Simulate presence update
        const presence = {
            'test-client-id': { /* Local presence, should be ignored */ },
            'peer-1': {
                pose: {
                    keypoints: [{ name: 'nose', x: 100, y: 100 }],
                    timestamp: Date.now()
                }
            }
        };
        
        // Call the presence callback
        mockWebsimSocket._presenceCallback(presence);
        
        // Verify remote avatar was updated
        expect(mockSceneManager.updateRemoteAvatar).toHaveBeenCalledWith(
            presence['peer-1'].pose,
            'peer-1'
        );
    });
    
    test('should broadcast pose correctly', async () => {
        await networkManager.connect();
        
        const pose = {
            keypoints: [{ name: 'nose', x: 100, y: 100 }]
        };
        
        networkManager.broadcastPose(pose);
        
        // Verify updatePresence was called with pose data
        expect(mockWebsimSocket.party.updatePresence).toHaveBeenCalledWith({
            pose: {
                keypoints: pose.keypoints,
                timestamp: expect.any(Number)
            }
        });
        
        // Verify stats were updated
        expect(networkManager.lastPoseUpdate).toBeTruthy();
        expect(networkManager.poseUpdateCount).toBe(1);
    });
    
    test('should return network info correctly', async () => {
        await networkManager.connect();
        networkManager.connectionTimestamp = Date.now() - 5000; // 5 seconds ago
        networkManager.lastPoseUpdate = Date.now() - 100; // 100ms ago
        networkManager.poseUpdateCount = 10;
        
        const info = networkManager.getNetworkInfo();
        
        // Verify info contains expected fields
        expect(info).toHaveProperty('connectedPeers', 2);
        expect(info).toHaveProperty('clientId', 'test-client-id');
        expect(info).toHaveProperty('username', 'TestUser');
        expect(info).toHaveProperty('connectionUptime', 5);
        expect(info).toHaveProperty('lastPoseUpdate', expect.stringContaining('ms ago'));
        expect(info).toHaveProperty('poseUpdatesSent', 10);
    });
});
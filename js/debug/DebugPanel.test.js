describe('DebugPanel', () => {
    let debugPanel;
    let mockElements;
    
    beforeEach(() => {
        // Create mock DOM elements
        mockElements = {
            panel: document.createElement('div'),
            toggle: document.createElement('button'),
            closeButton: document.createElement('button'),
            tabButtons: [],
            tabContents: [],
            poseDataElement: document.createElement('pre'),
            sceneStatsElement: document.createElement('div'),
            networkStatsElement: document.createElement('div'),
            fpsElement: document.createElement('div'),
            memoryStatsElement: document.createElement('div'),
            timestampElement: document.createElement('div')
        };
        
        // Create tab buttons and contents
        for (let i = 0; i < 4; i++) {
            const button = document.createElement('button');
            button.classList.add('tab-button');
            button.dataset.tab = ['pose', 'scene', 'network', 'performance'][i];
            mockElements.tabButtons.push(button);
            
            const content = document.createElement('div');
            content.classList.add('tab-content');
            content.id = `${button.dataset.tab}-tab`;
            mockElements.tabContents.push(content);
        }
        
        // Add elements to DOM
        mockElements.panel.id = 'debug-panel';
        mockElements.toggle.id = 'debug-toggle';
        mockElements.closeButton.id = 'close-debug';
        mockElements.poseDataElement.id = 'pose-data';
        mockElements.sceneStatsElement.id = 'scene-stats';
        mockElements.networkStatsElement.id = 'network-stats';
        mockElements.fpsElement.id = 'fps-display';
        mockElements.memoryStatsElement.id = 'memory-stats';
        mockElements.timestampElement.id = 'timestamp-display';
        
        document.body.appendChild(mockElements.panel);
        document.body.appendChild(mockElements.toggle);
        document.body.appendChild(mockElements.closeButton);
        document.body.appendChild(mockElements.poseDataElement);
        document.body.appendChild(mockElements.sceneStatsElement);
        document.body.appendChild(mockElements.networkStatsElement);
        document.body.appendChild(mockElements.fpsElement);
        document.body.appendChild(mockElements.memoryStatsElement);
        document.body.appendChild(mockElements.timestampElement);
        
        mockElements.tabButtons.forEach(button => document.body.appendChild(button));
        mockElements.tabContents.forEach(content => document.body.appendChild(content));
        
        // Setup querySelector/querySelectorAll mocks
        document.getElementById = jest.fn(id => mockElements[id] || mockElements[id.replace('-', '')]);
        document.querySelectorAll = jest.fn(selector => {
            if (selector === '.tab-button') return mockElements.tabButtons;
            if (selector === '.tab-content') return mockElements.tabContents;
            return [];
        });
        
        // Import DebugPanel after DOM mocks
        const DebugPanel = require('./DebugPanel').default;
        debugPanel = new DebugPanel();
    });
    
    afterEach(() => {
        // Clean up DOM
        document.body.innerHTML = '';
        jest.resetAllMocks();
    });
    
    test('should initialize correctly', () => {
        // Verify elements were retrieved
        expect(debugPanel.panel).toBe(mockElements.panel);
        expect(debugPanel.toggle).toBe(mockElements.toggle);
        expect(debugPanel.closeButton).toBe(mockElements.closeButton);
        expect(debugPanel.tabButtons).toEqual(mockElements.tabButtons);
        expect(debugPanel.tabContents).toEqual(mockElements.tabContents);
    });
    
    test('should toggle visibility when toggle button is clicked', () => {
        // Initial state
        mockElements.panel.classList.add('hidden');
        
        // Simulate click
        mockElements.toggle.click();
        
        // Verify panel visibility was toggled
        expect(mockElements.panel.classList.contains('hidden')).toBe(false);
        
        // Click again
        mockElements.toggle.click();
        
        // Verify panel visibility was toggled again
        expect(mockElements.panel.classList.contains('hidden')).toBe(true);
    });
    
    test('should hide when close button is clicked', () => {
        // Initial state
        mockElements.panel.classList.remove('hidden');
        
        // Simulate click
        mockElements.closeButton.click();
        
        // Verify panel was hidden
        expect(mockElements.panel.classList.contains('hidden')).toBe(true);
    });
    
    test('should switch tabs when tab button is clicked', () => {
        // Initial state - set first tab as active
        mockElements.tabButtons[0].classList.add('active');
        mockElements.tabContents[0].classList.add('active');
        
        // Click second tab
        mockElements.tabButtons[1].click();
        
        // Verify first tab is no longer active
        expect(mockElements.tabButtons[0].classList.contains('active')).toBe(false);
        expect(mockElements.tabContents[0].classList.contains('active')).toBe(false);
        
        // Verify second tab is now active
        expect(mockElements.tabButtons[1].classList.contains('active')).toBe(true);
        expect(mockElements.tabContents[1].classList.contains('active')).toBe(true);
    });
    
    test('should update pose data correctly', () => {
        // Make panel visible
        mockElements.panel.classList.remove('hidden');
        
        const pose = {
            keypoints: [
                { name: 'nose', x: 100, y: 100, score: 0.9 },
                { name: 'left_eye', x: 80, y: 90, score: 0.8 }
            ]
        };
        
        debugPanel.updatePoseData(pose);
        
        // Verify pose data was updated
        expect(mockElements.poseDataElement.textContent).toContain('nose');
        expect(mockElements.poseDataElement.textContent).toContain('left_eye');
    });
    
    test('should update scene info correctly', () => {
        // Make panel visible
        mockElements.panel.classList.remove('hidden');
        
        const sceneInfo = {
            avatarCount: 2,
            triangleCount: 10000,
            drawCalls: 50,
            frameRate: 60
        };
        
        debugPanel.updateSceneInfo(sceneInfo);
        
        // Verify scene info was updated
        expect(mockElements.sceneStatsElement.innerHTML).toContain('avatarCount');
        expect(mockElements.sceneStatsElement.innerHTML).toContain('2');
        expect(mockElements.sceneStatsElement.innerHTML).toContain('triangleCount');
        expect(mockElements.sceneStatsElement.innerHTML).toContain('10000');
    });
    
    test('should update network info correctly', () => {
        // Make panel visible
        mockElements.panel.classList.remove('hidden');
        
        const networkInfo = {
            connectedPeers: 3,
            clientId: 'test-id',
            connectionUptime: 120
        };
        
        debugPanel.updateNetworkInfo(networkInfo);
        
        // Verify network info was updated
        expect(mockElements.networkStatsElement.innerHTML).toContain('connectedPeers');
        expect(mockElements.networkStatsElement.innerHTML).toContain('3');
        expect(mockElements.networkStatsElement.innerHTML).toContain('clientId');
        expect(mockElements.networkStatsElement.innerHTML).toContain('test-id');
    });
    
    test('should update performance info correctly', () => {
        // Make panel visible
        mockElements.panel.classList.remove('hidden');
        
        const stats = {
            fps: 60,
            memory: '100 MB',
            lastFrameTime: 16.67
        };
        
        debugPanel.updatePerformanceInfo(stats);
        
        // Verify performance info was updated
        expect(mockElements.fpsElement.textContent).toContain('60');
        expect(mockElements.memoryStatsElement.textContent).toContain('100 MB');
        expect(mockElements.timestampElement.textContent).toContain('16.67');
    });
});
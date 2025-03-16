describe('SceneManager', () => {
    let sceneManager;
    let mockContainer;
    
    beforeEach(() => {
        // Setup mock DOM
        mockContainer = document.createElement('div');
        mockContainer.id = 'scene-container';
        document.body.appendChild(mockContainer);
        
        // Mock THREE
        global.THREE = {
            Scene: jest.fn(() => ({
                add: jest.fn(),
                background: null,
                getObjectByName: jest.fn()
            })),
            PerspectiveCamera: jest.fn(() => ({
                position: { set: jest.fn() },
                aspect: 1,
                updateProjectionMatrix: jest.fn()
            })),
            WebGLRenderer: jest.fn(() => ({
                setSize: jest.fn(),
                setPixelRatio: jest.fn(),
                shadowMap: { enabled: false },
                domElement: document.createElement('canvas'),
                render: jest.fn(),
                info: { render: { triangles: 1000, calls: 50 } }
            })),
            Color: jest.fn(),
            Clock: jest.fn(() => ({
                getDelta: jest.fn(() => 0.016)
            })),
            AmbientLight: jest.fn(() => ({})),
            DirectionalLight: jest.fn(() => ({
                position: { set: jest.fn() },
                castShadow: false
            })),
            PlaneGeometry: jest.fn(),
            MeshStandardMaterial: jest.fn(),
            Mesh: jest.fn(() => ({
                rotation: { x: 0 },
                receiveShadow: false
            })),
            GridHelper: jest.fn(() => ({
                material: { opacity: 1, transparent: false }
            }))
        };
        
        // Mock OrbitControls
        global.OrbitControls = jest.fn(() => ({
            target: { set: jest.fn() },
            update: jest.fn()
        }));
        
        // Import SceneManager after mocks
        const SceneManager = require('./SceneManager').default;
        sceneManager = new SceneManager('scene-container');
    });
    
    afterEach(() => {
        document.body.removeChild(mockContainer);
        jest.resetAllMocks();
    });
    
    test('should initialize correctly', () => {
        sceneManager.init();
        
        // Verify scene was created
        expect(THREE.Scene).toHaveBeenCalled();
        // Verify camera was created
        expect(THREE.PerspectiveCamera).toHaveBeenCalled();
        // Verify renderer was created
        expect(THREE.WebGLRenderer).toHaveBeenCalled();
        // Verify lights were added
        expect(THREE.AmbientLight).toHaveBeenCalled();
        expect(THREE.DirectionalLight).toHaveBeenCalled();
        // Verify ground was created
        expect(THREE.PlaneGeometry).toHaveBeenCalled();
        expect(THREE.MeshStandardMaterial).toHaveBeenCalled();
        expect(THREE.Mesh).toHaveBeenCalled();
    });
    
    test('should handle window resize', () => {
        sceneManager.init();
        sceneManager._onWindowResize();
        
        // Verify camera was updated
        expect(sceneManager.camera.updateProjectionMatrix).toHaveBeenCalled();
        // Verify renderer was resized
        expect(sceneManager.renderer.setSize).toHaveBeenCalled();
    });
    
    test('should return scene info', () => {
        sceneManager.init();
        const sceneInfo = sceneManager.getSceneInfo();
        
        // Verify scene info contains expected fields
        expect(sceneInfo).toHaveProperty('avatarCount');
        expect(sceneInfo).toHaveProperty('triangleCount');
        expect(sceneInfo).toHaveProperty('drawCalls');
        expect(sceneInfo).toHaveProperty('frameRate');
    });
});
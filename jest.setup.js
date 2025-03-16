// Mock window global for performance.now
window.performance = {
  now: jest.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 100 * 1024 * 1024 // 100 MB
  }
};

// Mock for requestAnimationFrame
window.requestAnimationFrame = callback => setTimeout(callback, 0);

// Mock for THREE imports
jest.mock('three', () => ({}), { virtual: true });
jest.mock('three/addons/loaders/GLTFLoader.js', () => ({ GLTFLoader: class {} }), { virtual: true });
jest.mock('three/addons/controls/OrbitControls.js', () => ({ OrbitControls: class {} }), { virtual: true });

// Mock for WebsimSocket
global.WebsimSocket = jest.fn(() => ({
  party: {
    client: { id: 'test-id', username: 'TestUser' },
    peers: {},
    presence: {},
    subscribe: jest.fn(() => () => {}),
    subscribePresence: jest.fn(() => () => {}),
    updatePresence: jest.fn()
  }
}));
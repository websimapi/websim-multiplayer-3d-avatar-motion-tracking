export default class UIManager {
    constructor(startTrackingCallback) {
        this.startButton = document.getElementById('startButton');
        this.statusElement = document.getElementById('status');
        this.peersListElement = document.getElementById('peersList');
        
        // Set up event listeners
        this.startButton.addEventListener('click', startTrackingCallback);
    }
    
    updateStatus(message) {
        this.statusElement.textContent = message;
    }
    
    disableStartButton(message) {
        this.startButton.disabled = true;
        this.startButton.textContent = message || 'Starting...';
    }
    
    enableStartButton(message) {
        this.startButton.disabled = false;
        this.startButton.textContent = message || 'Start Camera';
    }
    
    updateStartButton(message) {
        this.startButton.textContent = message || 'Tracking Active';
    }
    
    updatePeersList(peers) {
        this.peersListElement.innerHTML = '';
        
        for (const id in peers) {
            const peerEl = document.createElement('div');
            peerEl.className = 'peer-item';
            peerEl.textContent = peers[id].username + (id === peers.clientId ? ' (You)' : '');
            this.peersListElement.appendChild(peerEl);
        }
    }
}


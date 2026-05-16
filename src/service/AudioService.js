import { PlaybackQueue } from '../core/PlaybackQueue';
import { PlaylistManager } from '../core/PlaylistManager';

class AudioService {
    constructor() {
        this.queue = new PlaybackQueue();
        this.playlistManager = new PlaylistManager();
    }

    // ==========================================
    // LÓGICA DA FILA (QUEUE)
    // ==========================================
    async _persistQueueToDisk() {
        if (window.electronAPI && window.electronAPI.saveQueue) {
            await window.electronAPI.saveQueue(this.queue.getQueueState());
        }
    }

    restoreSavedSession(savedTracks = []) {
        this.queue = new PlaybackQueue();
        savedTracks.forEach(track => this.queue.enqueue(track));
        return this.queue.getQueueState();
    }

    clearQueue() {
        this.queue.clear();
        this._persistQueueToDisk();
        return [];
    }

    enqueueFullTrack(track) {
        if (!track) return;
        this.queue.enqueue(track);
        this._persistQueueToDisk();
        return this.queue.getQueueState();
    }

    // Gera uma nova fila baseada em uma lista de músicas (dependendo se estiver com ou sem o shuffle ligado)
    generateQueue(tracks, startIndex = 0, shuffle = false) {
        this.queue.clear();
        
        let tracksToEnqueue = [...tracks];
        const selectedTrack = tracksToEnqueue[startIndex];

        if (shuffle) {
            // Remove a música selecionada para que ela seja sempre a primeira e embaralha o resto
            tracksToEnqueue.splice(startIndex, 1);
            for (let i = tracksToEnqueue.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [tracksToEnqueue[i], tracksToEnqueue[j]] = [tracksToEnqueue[j], tracksToEnqueue[i]];
            }
            // Coloca a selecionada de volta no topo
            tracksToEnqueue.unshift(selectedTrack);
        } else {
            // Reordena para que a fila comece da música clicada
            const before = tracksToEnqueue.slice(0, startIndex);
            const after = tracksToEnqueue.slice(startIndex);
            tracksToEnqueue = [...after, ...before];
        }

        tracksToEnqueue.forEach(t => this.queue.enqueue(t));
        this._persistQueueToDisk();
        return this.queue.getQueueState();
    }

    playNext() {
        if (this.queue.isEmpty()) throw new Error("ERROR: The playback queue is empty.");
        const nextTrack = this.queue.dequeue();
        this._persistQueueToDisk();
        return nextTrack;
    }

    getQueue() {
        return this.queue.getQueueState();
    }

    // ==========================================
    // LÓGICA DAS PLAYLISTS
    // ==========================================
    async _persistPlaylistsToDisk() {
        if (window.electronAPI && window.electronAPI.savePlaylists) {
            const data = JSON.parse(JSON.stringify(this.playlistManager.getAll()));
            await window.electronAPI.savePlaylists(data);
        }
    }

    restorePlaylists(savedState = {}) {
        this.playlistManager.loadState(savedState);
        return this.playlistManager.getAll();
    }

    async createPlaylist(name) {
        this.playlistManager.createPlaylist(name);
        await this._persistPlaylistsToDisk();
        return this.playlistManager.getAll();
    }

    async addTrackToPlaylist(playlistName, track) {
        this.playlistManager.addTrack(playlistName, track);
        await this._persistPlaylistsToDisk();
        return this.playlistManager.getAll();
    }

    async removeTrackFromPlaylist(playlistName, trackPath) {
        this.playlistManager.removeTrack(playlistName, trackPath);
        await this._persistPlaylistsToDisk();
        return this.playlistManager.getAll();
    }

    async deletePlaylist(name) {
        this.playlistManager.deletePlaylist(name);
        await this._persistPlaylistsToDisk();
        return this.playlistManager.getAll();
    }

    getPlaylists() {
        return this.playlistManager.getAll();
    }
}

export const audioService = new AudioService();
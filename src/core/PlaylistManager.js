// Estrutura de Dados
// Chave: Nome da Playlist -> Valor: Array de Músicas
export class PlaylistManager {
    constructor() {
        this.playlists = {};
    }

    // Criar nova playlist - O(1)
    createPlaylist(name) {
        if (!name || name.trim() === '') throw new Error("Invalid playlist name.");
        if (this.playlists[name]) throw new Error("Playlist already exists.");

        this.playlists[name] = [];
    }

    // Adicionar música na playlist - O(1)
    addTrack(playlistName, track) {
        if (!this.playlists[playlistName]) {
            throw new Error(`Playlist '${playlistName}' does not exist.`);
        }
        this.playlists[playlistName].push(track);
    }

    // Remover música da playlist - O(n) na busca, mas geralmente arrays de playlist são pequenos
    removeTrack(playlistName, trackPath) {
        if (!this.playlists[playlistName]) {
            throw new Error(`Playlist '${playlistName}' does not exist.`);
        }
        this.playlists[playlistName] = this.playlists[playlistName].filter(t => t.path !== trackPath);
    }

    // Apagar playlist - O(1)
    deletePlaylist(name) {
        if (this.playlists[name]) {
            delete this.playlists[name];
        } else {
            throw new Error(`Playlist '${name}' does not exist.`);
        }
    }

    // Carregar estado salvo do disco
    loadState(savedState) {
        this.playlists = savedState || {};
    }

    // Retornar todas as playlists
    getAll() {
        return this.playlists;
    }
}
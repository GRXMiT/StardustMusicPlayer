const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
    readFolders: (folders) => ipcRenderer.invoke('read:folders', folders),
    getDefaultMusicFolder: () => ipcRenderer.invoke('get:defaultMusicFolder'),
    getTrackCover: (filePath) => ipcRenderer.invoke('get:trackCover', filePath),
    debugGetAllTracks: () => ipcRenderer.invoke('debug:getAllTracks'),
    saveQueue: (queueData) => ipcRenderer.invoke('save-queue', queueData),
    readQueue: () => ipcRenderer.invoke('read-queue'),
    savePlaylists: (data) => ipcRenderer.invoke('save-playlists', data),
    readPlaylists: () => ipcRenderer.invoke('read-playlists'),
    saveVisualizerPresets: (data) => ipcRenderer.invoke('save-visualizer-presets', data),
    readVisualizerPresets: () => ipcRenderer.invoke('read-visualizer-presets'),
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close')
});
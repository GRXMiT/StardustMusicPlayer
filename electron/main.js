const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { pathToFileURL } = require('url');
const { DatabaseSync } = require('node:sqlite');

// Inicializa o Banco de Dados nativo do Node.js na pasta protegida do app
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'musicplayer_cache.db');
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');

// Log físico do arquivo para debug
console.log("\n=======================================================");
console.log("💿 BANCO DE DADOS INICIALIZADO COM SUCESSO");
console.log("Caminho Físico (Navegue até aqui no Windows Explorer):");
console.log(dbPath);
console.log("=======================================================\n");

// Cria a tabela para armazenar as capas e detalhes das músicas
db.exec(`
    CREATE TABLE IF NOT EXISTS track_metadata (
        path TEXT PRIMARY KEY,
        name TEXT, artist TEXT, album TEXT, picture TEXT
    )
`);

const queueFilePath = path.join(app.getPath('userData'), 'queue.json');

ipcMain.handle('save-queue', async (event, queueData) => {
    try {
        fs.writeFileSync(queueFilePath, JSON.stringify(queueData, null, 2), 'utf-8');
        return { success: true };
    } catch (error) {
        console.error("Erro ao salvar a fila no disco:", error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('read-queue', async () => {
    try {
        if (fs.existsSync(queueFilePath)) {
            const data = fs.readFileSync(queueFilePath, 'utf-8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        console.error("Erro ao ler a fila do disco:", error);
        return [];
    }
});

const playlistsFilePath = path.join(app.getPath('userData'), 'playlists.json');

ipcMain.handle('save-playlists', async (event, data) => {
    try {
        fs.writeFileSync(playlistsFilePath, JSON.stringify(data, null, 2), 'utf-8');
        return { success: true };
    } catch (error) {
        console.error("Erro ao salvar playlists:", error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('read-playlists', async () => {
    try {
        if (fs.existsSync(playlistsFilePath)) {
            const data = fs.readFileSync(playlistsFilePath, 'utf-8');
            return JSON.parse(data);
        }
        return {};
    } catch (error) {
        console.error("Erro ao ler playlists:", error);
        return {};
    }
});

const presetsFilePath = path.join(app.getPath('userData'), 'visualizer_presets.json');

ipcMain.handle('save-visualizer-presets', async (event, data) => {
    try {
        fs.writeFileSync(presetsFilePath, JSON.stringify(data, null, 2), 'utf-8');
        return { success: true };
    } catch (error) {
        console.error("Erro ao salvar presets do visualizer:", error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('read-visualizer-presets', async () => {
    try {
        if (fs.existsSync(presetsFilePath)) {
            const data = fs.readFileSync(presetsFilePath, 'utf-8');
            return JSON.parse(data);
        }
        return {}; 
    } catch (error) {
        console.error("Erro ao ler presets do visualizer:", error);
        return {};
    }
});

// --- CONTROLES DA JANELA ---
ipcMain.on('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.minimize();
});

ipcMain.on('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
        if (win.isMaximized()) win.unmaximize();
        else win.maximize();
    }
});

ipcMain.on('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();
});
// ---------------------------------------

function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 700,
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: false
        }
    });

    win.removeMenu();

    if (!app.isPackaged) {
        win.loadURL('http://localhost:5173').catch(() => {});
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html')).catch(() => {});
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Retorna a pasta padrão de Músicas do SO
ipcMain.handle('get:defaultMusicFolder', () => {
    return app.getPath('music');
});

// Apenas abre o diálogo e retorna o caminho selecionado
ipcMain.handle('dialog:selectFolder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });

    if (canceled || filePaths.length === 0) return null;
    return filePaths[0];
});

ipcMain.handle('read:folders', async (event, folderPaths) => {
    const tracks = [];

    const stmt = db.prepare('SELECT name, artist, album FROM track_metadata WHERE path = ?');

    for (const folderPath of folderPaths) {
        if (!fs.existsSync(folderPath)) continue;

        try {
            const files = await fs.promises.readdir(folderPath);
            const audioFiles = files.filter(f => f.toLowerCase().endsWith('.mp3') || f.toLowerCase().endsWith('.wav'));

            for (const f of audioFiles) {
                const fullPath = path.join(folderPath, f);
                const stat = await fs.promises.stat(fullPath);

                const baseName = f.replace(/\.[^/.]+$/, "");
                let name = baseName;
                let artist = "Artista Desconhecido";
                let album = "Álbum Desconhecido";

                if (baseName.includes('-')) {
                    const parts = baseName.split('-');
                    artist = parts[0].trim();
                    name = parts.slice(1).join('-').trim();
                }

                try {
                    const cached = stmt.get(fullPath);
                    if (cached) {
                        if (cached.name) name = cached.name;
                        if (cached.artist) artist = cached.artist;
                        if (cached.album) album = cached.album;
                    }
                } catch (err) { }

                tracks.push({
                    name: name,
                    artist: artist,
                    album: album,
                    picture: null,
                    path: fullPath,
                    url: pathToFileURL(fullPath).href,
                    mtime: stat.mtimeMs
                });
            }
        } catch (err) {
            console.error(`Erro ao ler pasta ${folderPath}:`, err);
        }
    }

    return tracks;
});;

// Função para buscar metadados da API do iTunes (Apple Music API)
function fetchMetadataFromAPI(searchTerm) {
    return new Promise((resolve) => {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&media=music&limit=1`;
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.results && json.results.length > 0) {
                        const track = json.results[0];
                        resolve({
                            name: track.trackName || null,
                            artist: track.artistName || null,
                            album: track.collectionName || null,
                            pictureUrl: track.artworkUrl100 ? track.artworkUrl100.replace('100x100bb', '600x600bb') : null
                        });
                    } else {
                        resolve(null);
                    }
                } catch {
                    resolve(null);
                }
            });
        }).on('error', () => {
            resolve(null);
        });
    });
}

// Converte URL de imagem externa para Base64 para enviar ao React via IPC
function fetchImageToBase64(imageUrl) {
    return new Promise((resolve) => {
        https.get(imageUrl, (res) => {
            if (res.statusCode !== 200) {
                resolve(null);
                return;
            }
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                const base64 = buffer.toString('base64');
                const contentType = res.headers['content-type'] || 'image/jpeg';
                resolve(`data:${contentType};base64,${base64}`);
            });
        }).on('error', () => resolve(null));
    });
}


ipcMain.handle('get:trackCover', async (event, filePath) => {
    try {
        const stmt = db.prepare('SELECT name, artist, album, picture FROM track_metadata WHERE path = ?');
        const cachedTrack = stmt.get(filePath);
        if (cachedTrack) {
            console.log(`🟢 [DB] Lendo do Cache: ${cachedTrack.name || path.basename(filePath)}`);
            return cachedTrack;
        }
    } catch (dbErr) {
        console.error("Erro ao ler do cache do banco:", dbErr);
    }

    let finalName = null;
    let finalArtist = null;
    let finalAlbum = null;
    let pictureBase64 = null;

    try {
        const { parseFile } = await import('music-metadata');
        const metadata = await parseFile(filePath, { skipCovers: false });
        
        finalName = metadata.common.title;
        finalArtist = metadata.common.artist;
        finalAlbum = metadata.common.album;

        if (metadata.common.picture && metadata.common.picture.length > 0) {
            const pic = metadata.common.picture[0];
            const base64Data = Buffer.from(pic.data).toString('base64');
            pictureBase64 = `data:${pic.format};base64,${base64Data}`;
        }
    } catch (e) {
        console.log("Aviso ao ler metadados locais (Ignorável):", e.message);
    }
        
    try {
        if (!pictureBase64 || !finalArtist || !finalName || finalArtist === "Artista Desconhecido") {
            const baseName = path.basename(filePath, path.extname(filePath));

            const apiData = await fetchMetadataFromAPI(baseName);
            
            if (apiData) {
                if (!finalName) finalName = apiData.name;
                if (!finalArtist || finalArtist === "Artista Desconhecido") finalArtist = apiData.artist;
                if (!finalAlbum || finalAlbum === "Álbum Desconhecido") finalAlbum = apiData.album;
                if (!pictureBase64 && apiData.pictureUrl) {
                    const downloadedCover = await fetchImageToBase64(apiData.pictureUrl);
                    if (downloadedCover) pictureBase64 = downloadedCover;
                }
            }
        }

        try {
            console.log(`🔵 [DB] Salvando no Banco: ${finalName || path.basename(filePath)}`);
            const insert = db.prepare('INSERT OR REPLACE INTO track_metadata (path, name, artist, album, picture) VALUES (?, ?, ?, ?, ?)');
            
            insert.run(
                filePath, 
                finalName ?? null, 
                finalArtist ?? null, 
                finalAlbum ?? null, 
                pictureBase64 ?? null
            );
        } catch (dbErr) {
            console.error("Erro ao salvar cache no banco:", dbErr);
        }

        return {
            name: finalName,
            artist: finalArtist,
            album: finalAlbum,
            picture: pictureBase64
        };
    } catch (err) {
        console.error("Erro ao buscar metadados:", err);
        return null;
    }
});

ipcMain.handle('debug:getAllTracks', () => {
    try {
        const stmt = db.prepare("SELECT path, name, artist, album, substr(picture, 1, 30) || '...' as picture_preview FROM track_metadata");
        return stmt.all();
    } catch (dbErr) {
        console.error("Erro ao despejar o banco:", dbErr);
        return [];
    }
});


app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
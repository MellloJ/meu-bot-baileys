// src/services/YouTubeService.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class YouTubeService {
    constructor() {
        // APIs atualizadas e testadas em comunidades de bots (2025/2026)
        this.apis = [
            {
                name: 'Vreden (Estável)',
                url: (link) => `https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(link)}`,
                path: 'result.download'
            },
            {
                name: 'Sandip (Robusta)',
                url: (link) => `https://api.sandipbaruwal.com.np/ytdl/v2?url=${encodeURIComponent(link)}`,
                path: 'data.audio'
            },
            {
                name: 'Ayleen (Backup)',
                url: (link) => `https://api.ayleen.my.id/api/download/ytmp3?url=${encodeURIComponent(link)}`,
                path: 'result.url'
            },
            {
                name: 'Agatz (Alternativa)',
                url: (link) => `https://api.agatz.xyz/api/ytmp3?url=${encodeURIComponent(link)}`,
                path: 'data.downloadUrl'
            },
            {
                name: 'DarkYasiya (Internacional)',
                url: (link) => `https://dark-yasiya-api-new.vercel.app/download/ytmp3?url=${encodeURIComponent(link)}`,
                path: 'result.dl_link'
            }
        ];
    }

    getNestedProp(obj, path) {
        return path.split('.').reduce((prev, curr) => prev?.[curr], obj);
    }

    async getAudioPath(youtubeUrl) {
        let downloadUrl = null;

        for (const api of this.apis) {
            try {
                console.log(`[YouTube] Tentando ${api.name}...`);
                // Timeout curto para não deixar o usuário esperando uma API morta
                const res = await axios.get(api.url(youtubeUrl), { timeout: 8000 });
                
                downloadUrl = this.getNestedProp(res.data, api.path);
                
                if (downloadUrl && downloadUrl.startsWith('http')) {
                    console.log(`[YouTube] Link obtido com sucesso via ${api.name}`);
                    break;
                }
            } catch (e) {
                console.warn(`[YouTube] ${api.name} indisponível no momento.`);
            }
        }

        if (!downloadUrl) return null;

        try {
            const fileName = `musica_${Date.now()}.mp3`;
            const filePath = path.join('/tmp', fileName);
            
            console.log("[YouTube] Baixando arquivo para o servidor...");
            
            const response = await axios({
                method: 'GET',
                url: downloadUrl,
                responseType: 'stream',
                timeout: 60000, // 1 minuto para baixar o arquivo
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => resolve(filePath));
                writer.on('error', reject);
            });
        } catch (err) {
            console.error("[YouTube] Erro ao salvar arquivo no Render:", err.message);
            return null;
        }
    }
}

module.exports = new YouTubeService();
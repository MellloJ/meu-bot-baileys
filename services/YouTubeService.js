// src/services/YouTubeService.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class YouTubeService {
    constructor() {
        this.apis = [
            {
                name: 'Boxi-API (New)',
                url: (link) => `https://api.boxi.my.id/api/ytmp3?url=${encodeURIComponent(link)}`,
                path: 'data.url'
            },
            {
                name: 'YanzGPT-Proxy',
                url: (link) => `https://api.yanzgpt.my.id/api/download/y2mate?url=${encodeURIComponent(link)}`,
                path: 'result.mp3'
            },
            {
                name: 'Widipe-Downloader',
                url: (link) => `https://widipe.com/download/y2mate?url=${encodeURIComponent(link)}`,
                path: 'result.extra.320.url'
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
                
                // Usando cabeçalhos de Mobile para tentar desviar do bloqueio do Render
                const res = await axios.get(api.url(youtubeUrl), { 
                    timeout: 20000, // Aumentado para 20s
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
                        'Accept': 'application/json'
                    }
                });
                
                downloadUrl = this.getNestedProp(res.data, api.path);
                
                if (downloadUrl && downloadUrl.startsWith('http')) {
                    console.log(`[YouTube] ✅ Link encontrado via ${api.name}`);
                    break;
                }
            } catch (e) {
                console.warn(`[YouTube] ❌ ${api.name} falhou: ${e.code || e.message}`);
            }
        }

        if (!downloadUrl) return null;

        try {
            const fileName = `audio_${Date.now()}.mp3`;
            const filePath = path.join('/tmp', fileName);
            
            console.log("[YouTube] Baixando arquivo...");
            const response = await axios({
                method: 'GET',
                url: downloadUrl,
                responseType: 'stream',
                timeout: 120000, // 2 minutos para baixar
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => resolve(filePath));
                writer.on('error', reject);
            });
        } catch (err) {
            console.error("[YouTube] Erro no download do arquivo:", err.message);
            return null;
        }
    }
}

module.exports = new YouTubeService();
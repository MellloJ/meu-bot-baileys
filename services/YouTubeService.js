// src/services/YouTubeService.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class YouTubeService {
    constructor() {
        this.apis = [
            {
                name: 'Maher-Zubair (Premium Tier)',
                url: (link) => `https://api.maher-zubair.tech/download/ytmp3?url=${encodeURIComponent(link)}`,
                path: 'result.download_url'
            },
            {
                name: 'D-Low (Fast)',
                url: (link) => `https://api.dlow.top/ytmp3?url=${encodeURIComponent(link)}`,
                path: 'result.download'
            },
            {
                name: 'Gifted-Tech (Global)',
                url: (link) => `https://api.giftedtech.my.id/api/download/ytmp3?url=${encodeURIComponent(link)}`,
                path: 'result.download_url'
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
                
                // Adicionamos um User-Agent de navegador real para a API não bloquear o Render
                const res = await axios.get(api.url(youtubeUrl), { 
                    timeout: 12000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
                    }
                });
                
                downloadUrl = this.getNestedProp(res.data, api.path);
                
                if (downloadUrl && downloadUrl.startsWith('http')) {
                    console.log(`[YouTube] ✅ Sucesso via ${api.name}`);
                    break;
                }
            } catch (e) {
                // LOG DE DEBUG REAL: Para você saber por que falhou
                const status = e.response?.status || 'TIMEOUT/OFFLINE';
                console.warn(`[YouTube] ❌ ${api.name} falhou. Status: ${status}`);
            }
        }

        if (!downloadUrl) return null;

        try {
            const fileName = `music_${Date.now()}.mp3`;
            const filePath = path.join('/tmp', fileName);
            
            const response = await axios({
                method: 'GET',
                url: downloadUrl,
                responseType: 'stream',
                timeout: 90000, // 1.5 minutos para o download
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => resolve(filePath));
                writer.on('error', reject);
            });
        } catch (err) {
            console.error("[YouTube] Erro ao gravar arquivo:", err.message);
            return null;
        }
    }
}

module.exports = new YouTubeService();
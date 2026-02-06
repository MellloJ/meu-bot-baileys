// src/services/YouTubeService.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class YouTubeService {
    async getAudioPath(youtubeUrl) {
        try {
            console.log("[YouTube] Solicitando link de download via API externa...");
            
            // Usando a API Agatz que é muito estável para MP3
            const apiRes = await axios.get(`https://api.agatz.xyz/api/ytmp3?url=${encodeURIComponent(youtubeUrl)}`);
            
            if (!apiRes.data?.data?.downloadUrl) {
                throw new Error("A API não retornou um link de download válido.");
            }

            const downloadUrl = apiRes.data.data.downloadUrl;
            const fileName = `bot_audio_${Date.now()}.mp3`;
            const filePath = path.join('/tmp', fileName); // Render permite escrita no /tmp

            console.log("[YouTube] Iniciando download para o servidor...");

            // Faz o download do arquivo MP3 para o disco do Render
            const response = await axios({
                method: 'GET',
                url: downloadUrl,
                responseType: 'stream'
            });

            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => resolve(filePath));
                writer.on('error', (err) => {
                    console.error("[YouTube] Erro ao gravar arquivo:", err);
                    reject(err);
                });
            });

        } catch (error) {
            console.error("[YouTube] Erro no fluxo de download:", error.message);
            return null;
        }
    }
}

module.exports = new YouTubeService();
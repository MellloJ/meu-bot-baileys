// src/services/YouTubeService.js
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

class YouTubeService {
    async getAudioPath(youtubeUrl) {
        const fileName = `audio_${Date.now()}.mp3`;
        const filePath = path.join('/tmp', fileName);

        return new Promise((resolve, reject) => {
            console.log(`[YouTube] Tentando baixar via yt-dlp (Simulando iOS)...`);
            
            // --js-runtimes node: Usa o Node do seu servidor para processar o vídeo
            // --extractor-args: Simula um app de iPhone para evitar o erro de "Sign in"
            const command = `yt-dlp --cookies ./cookies.txt -x --audio-format mp3 --audio-quality 0 \
                --js-runtimes node \
                --extractor-args "youtube:player_client=ios" \
                -o "${filePath}" "${youtubeUrl}"`;

            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`[YouTube] Erro crítico no yt-dlp: ${error.message}`);
                    // Se houver erro, retornamos null para o comando avisar o usuário
                    return resolve(null);
                }
                
                if (fs.existsSync(filePath)) {
                    console.log("[YouTube] Download local concluído com sucesso!");
                    resolve(filePath);
                } else {
                    console.error("[YouTube] O arquivo não foi gerado.");
                    resolve(null);
                }
            });
        });
    }
}

module.exports = new YouTubeService();
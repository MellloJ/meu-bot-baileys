// src/services/YouTubeService.js
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

class YouTubeService {
    async getAudioPath(youtubeUrl) {
        const fileName = `audio_${Date.now()}.mp3`;
        const filePath = path.join('/tmp', fileName);

        return new Promise((resolve, reject) => {
            console.log(`[YouTube] Baixando via yt-dlp: ${youtubeUrl}`);
            
            // Comando para baixar apenas o áudio em MP3
            const command = `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${filePath}" "${youtubeUrl}"`;

            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`[YouTube] Erro no yt-dlp: ${error.message}`);
                    return resolve(null);
                }
                console.log("[YouTube] Download local concluído!");
                resolve(filePath);
            });
        });
    }
}

module.exports = new YouTubeService();
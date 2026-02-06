// src/services/YouTubeService.js
const { spawn } = require('child_process');

class YouTubeService {
    async getAudioStream(url) {
        try {
            // Parâmetros do yt-dlp:
            // -x: extrair áudio
            // --audio-format mp3: formato de saída
            // -o -: envia o resultado para o 'stdout' (stream) em vez de salvar em arquivo
            const process = spawn('yt-dlp', [
                '-x',
                '--audio-format', 'mp3',
                '--audio-quality', '128K',
                '--no-playlist',
                '--ignore-errors',
                '--no-warnings',
                '-o', '-', // Output para o console
                url
            ]);

            // Retornamos o fluxo de saída (stdout) para o Baileys consumir
            return process.stdout;

        } catch (error) {
            console.error("Erro fatal no YouTubeService:", error.message);
            return null;
        }
    }
}

module.exports = new YouTubeService();
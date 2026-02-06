// src/services/YouTubeService.js
const ytDlp = require('yt-dlp-exec');
const ffmpegPath = require('ffmpeg-static');

class YouTubeService {
    async getAudioStream(url) {
        try {
            // O yt-dlp-exec retorna uma promessa que resolve para um processo
            // Usamos a flag 'stdio' para capturar o stream
            const subprocess = ytDlp.exec(url, {
                extractAudio: true,
                audioFormat: 'mp3',
                output: '-',
                ffmpegLocation: ffmpegPath, // Usa o ffmpeg estático que instalamos
            }, { stdio: ['ignore', 'pipe', 'ignore'] });

            return subprocess.stdout; // Retorna o stream de áudio
        } catch (error) {
            console.error("Erro no YouTubeService (yt-dlp-exec):", error.message);
            return null;
        }
    }
}

module.exports = new YouTubeService();
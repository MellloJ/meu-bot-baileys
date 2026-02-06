const { spawn } = require('child_process');
const play = require('play-dl');

class AudioDownloader {

    MAX_DURATION = 600; // 10 minutos
    PROCESS_TIMEOUT = 120000; // 2 minutos

    /* ============================
       MÉTODO PRINCIPAL
    ============================ */

    async getAudioStream(url) {

        try {
            console.log("[Downloader] Tentando yt-dlp...");
            return await this.ytDlpStream(url);

        } catch (err) {

            console.log("[Downloader] yt-dlp falhou, fallback play-dl");

            try {
                return await this.playDlStream(url);
            } catch (e) {
                throw new Error("Todas as estratégias falharam.");
            }
        }
    }

    /* ============================
       yt-dlp + ffmpeg STREAM
    ============================ */

    ytDlpStream(url) {

        return new Promise((resolve, reject) => {

            const ytDlp = spawn('yt-dlp', [
                '-f', 'bestaudio',
                '--no-playlist',
                '-o', '-',
                url
            ]);

            const ffmpeg = spawn('ffmpeg', [
                '-i', 'pipe:0',
                '-vn',
                '-c:a', 'libopus',
                '-f', 'ogg',
                'pipe:1'
            ]);

            // PIPE
            ytDlp.stdout.pipe(ffmpeg.stdin);

            // Logs úteis
            ytDlp.stderr.on('data', d =>
                console.log("[yt-dlp]", d.toString())
            );

            ffmpeg.stderr.on('data', d =>
                console.log("[ffmpeg]", d.toString())
            );

            // Timeout proteção
            const timeout = setTimeout(() => {
                ytDlp.kill('SIGKILL');
                ffmpeg.kill('SIGKILL');
                reject(new Error("Timeout download"));
            }, this.PROCESS_TIMEOUT);

            ffmpeg.on('spawn', () => {
                clearTimeout(timeout);
                resolve(ffmpeg.stdout);
            });

            ytDlp.on('error', reject);
            ffmpeg.on('error', reject);
        });
    }

    /* ============================
       FALLBACK play-dl
    ============================ */

    async playDlStream(url) {

        const stream = await play.stream(url, {
            quality: 2,
            client: "ANDROID"
        });

        return stream.stream;
    }
}

module.exports = new AudioDownloader();

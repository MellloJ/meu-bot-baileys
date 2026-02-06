// src/services/YouTubeService.js
const axios = require('axios');

class YouTubeService {

    // ESTRATÉGIA 1: Cobalt (Oficial) com payload corrigido
    async tryCobalt(url) {
        try {
            console.log("[API] Tentando Cobalt (Oficial)...");
            const response = await axios.post('https://api.cobalt.tools/api/json', {
                url: url,
                filenamePattern: "basic",
                // Payload limpo para evitar erro 400
                downloadMode: "audio",
                audioFormat: "mp3",
                audioBitrate: "128"
            }, {
                headers: { 
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                timeout: 8000 // 8 segundos max
            });

            if (response.data?.url) return response.data.url;
            return null;
        } catch (e) {
            console.log(`[API] Cobalt falhou: ${e.message}`);
            return null;
        }
    }

    // ESTRATÉGIA 2: API Agatz (Backup robusto para YouTube)
    async tryAgatz(url) {
        try {
            console.log("[API] Tentando Agatz (Backup)...");
            // API pública muito usada em bots
            const response = await axios.get(`https://api.agatz.xyz/api/ytmp3?url=${url}`, {
                timeout: 10000
            });

            if (response.data?.status === 200 && response.data?.data?.downloadUrl) {
                return response.data.data.downloadUrl;
            }
            return null;
        } catch (e) {
            console.log(`[API] Agatz falhou: ${e.message}`);
            return null;
        }
    }

    // Função Principal que o PlayCommand chama
    async getDownloadUrl(url) {
        // 1. Tenta Cobalt Corrigido
        let downloadLink = await this.tryCobalt(url);
        
        // 2. Se falhar, tenta Agatz
        if (!downloadLink) {
            downloadLink = await this.tryAgatz(url);
        }

        if (!downloadLink) {
            throw new Error("Todas as APIs de download falharam no momento.");
        }

        return downloadLink;
    }

    // Baixa o binário do link final
    async getAudioBuffer(downloadUrl) {
        try {
            const response = await axios.get(downloadUrl, {
                responseType: 'arraybuffer',
                // Headers falsos para o site não bloquear o download do arquivo
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                timeout: 40000 // 40 segundos (arquivos podem ser lentos)
            });
            return Buffer.from(response.data);
        } catch (error) {
            console.error("Erro ao baixar o buffer final:", error.message);
            throw new Error("Consegui o link, mas o download do arquivo falhou.");
        }
    }
}

module.exports = new YouTubeService();
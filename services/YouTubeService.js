// src/services/YouTubeService.js
const axios = require('axios');

// Lista de instâncias públicas do Cobalt (se uma cair, usamos a outra)
const COBALT_INSTANCES = [
    'https://api.cobalt.tools', // Oficial (às vezes tem rate limit)
    'https://cobalt.koyu.space', 
    'https://co.wuk.sh',
    'https://cobalt.7th.one'
];

class YouTubeService {
    async getDownloadUrl(url) {
        // Tenta em cada instância da lista
        for (const instance of COBALT_INSTANCES) {
            try {
                console.log(`[API] Tentando servidor: ${instance}`);
                
                const response = await axios.post(`${instance}/api/json`, {
                    url: url,
                    vCodec: "h264",
                    vQuality: "720",
                    aFormat: "mp3",
                    isAudioOnly: true
                }, {
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000 // Se demorar mais de 10s, troca de servidor
                });

                // Verifica diferentes formatos de resposta do Cobalt
                let downloadLink = null;
                if (response.data?.url) {
                    downloadLink = response.data.url;
                } else if (response.data?.picker && response.data.picker.length > 0) {
                    downloadLink = response.data.picker[0].url;
                } else if (response.data?.audio) {
                    downloadLink = response.data.audio;
                }

                if (downloadLink) {
                    console.log(`[API] Sucesso no servidor: ${instance}`);
                    return downloadLink;
                }

            } catch (error) {
                // Apenas loga o erro e deixa o loop tentar o próximo servidor
                console.warn(`[API] Falha em ${instance}: ${error.message}`);
                continue; 
            }
        }
        
        // Se saiu do loop, nenhum servidor funcionou
        throw new Error("Todas as instâncias da API falharam.");
    }

    async getAudioBuffer(downloadUrl) {
        try {
            const response = await axios.get(downloadUrl, {
                responseType: 'arraybuffer',
                timeout: 30000 // 30 segundos para baixar o arquivo
            });
            return Buffer.from(response.data);
        } catch (error) {
            console.error("Erro ao baixar o buffer final:", error.message);
            return null;
        }
    }
}

module.exports = new YouTubeService();
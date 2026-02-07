// src/services/LyricsService.js
const axios = require('axios');
const yts = require('yt-search');
const translate = require('@iamtraction/google-translate');

class LyricsService {
    async buscarLetra(termo) {
        try {
            // 1. Busca o nome exato para evitar erros de busca
            const r = await yts(termo);
            const video = r.videos[0];
            if (!video) return null;

            const tituloBusca = video.title.replace(/\(Official.*\)|\[Official.*\]/gi, '').trim();

            // 2. API Alternativa: Vamos usar um scraper de contingência
            // Esta API costuma ser o "plano B" quando o Render está sob bloqueio 429
            const url = `https://api.popcat.xyz/lyrics?song=${encodeURIComponent(tituloBusca)}`;
            
            // const { data } = await axios.get(url, { timeout: 8000 });
            const { data } = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_8 like Mac OS X) AppleWebKit/605.1.15',
                    'Accept-Language': 'pt-BR,pt;q=0.9'
                }
            });

            if (!data || !data.lyrics) {
                return null;
            }

            // 3. Tradução com tratamento de erro isolado
            let letraTraduzida = null;
            try {
                // Tentativa de tradução
                const res = await translate(data.lyrics, { to: 'pt' });
                if (res.from.language.iso !== 'pt') {
                    letraTraduzida = res.text;
                }
            } catch (err) {
                console.warn("[Lyrics] Tradução ignorada para evitar bloqueio 429.");
            }

            return {
                titulo: data.title || video.title,
                artista: data.artist || "Artista Desconhecido",
                letraOriginal: data.lyrics,
                letraTraduzida: letraTraduzida,
                imagem: data.image || video.thumbnail
            };

        } catch (error) {
            console.error("[LyricsService] Erro crítico:", error.message);
            return null;
        }
    }
}

module.exports = new LyricsService();
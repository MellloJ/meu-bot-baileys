// src/services/LyricsService.js
const axios = require('axios');
const yts = require('yt-search');
const translate = require('@iamtraction/google-translate'); // Alternativa mais leve e estável

class LyricsService {
    async buscarLetra(termo) {
        try {
            // 1. Pesquisa no YouTube
            const r = await yts(termo);
            const video = r.videos[0];
            if (!video) return null;

            const tituloLimpo = video.title
                .replace(/\(Official.*\)|\[Official.*\]|video oficial|clipe oficial/gi, '')
                .trim();

            // 2. Tenta a API de Letras com Timeout e User-Agent para evitar o 429
            const { data } = await axios.get(`https://lyrist.vercel.app/api/${encodeURIComponent(tituloLimpo)}`, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (data && data.lyrics) {
                let letraTraduzida = null;
                
                try {
                    // Tradução com a nova biblioteca
                    const resTrad = await translate(data.lyrics, { to: 'pt' });
                    if (resTrad.from.language.iso !== 'pt') {
                        letraTraduzida = resTrad.text;
                    }
                } catch (trError) {
                    console.warn("[Lyrics] Tradução falhou (Provável 429), enviando apenas original.");
                }

                return {
                    titulo: data.title || video.title,
                    artista: data.artist || video.author.name,
                    letraOriginal: data.lyrics,
                    letraTraduzida: letraTraduzida,
                    imagem: data.image || video.thumbnail
                };
            }
            return null;
        } catch (error) {
            if (error.response?.status === 429) {
                console.error("[LyricsService] Limite de requisições atingido (429).");
            }
            console.error("[LyricsService] Erro:", error.message);
            return null;
        }
    }
}

module.exports = new LyricsService();
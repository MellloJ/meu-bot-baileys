// src/services/LyricsService.js
const axios = require('axios');
const yts = require('yt-search');
const googleIt = require('google-it');

class LyricsService {
    async buscarLetra(termo) {
        try {
            // 1. YouTube para pegar os metadados corretos
            const r = await yts(termo);
            const video = r.videos[0];
            if (!video) return null;

            const query = `${video.title} ${video.author.name} lyrics`;

            // 2. TENTATIVA 1: API de Letras (LRCLIB com Timeout estendido para o Render)
            try {
                const resLrc = await axios.get(`https://lrclib.net/api/search?q=${encodeURIComponent(video.title)}`, {
                    timeout: 10000, // 10 segundos para dar tempo ao Render
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                const found = resLrc.data.find(m => m.plainLyrics);
                if (found) return { titulo: found.trackName, artista: found.artistName, letra: found.plainLyrics, imagem: video.thumbnail };
            } catch (e) {
                console.warn("[Lyrics] Falha na LRCLIB, tentando Scraping...");
            }

            // 3. TENTATIVA 2: Scraping de Busca (Google It)
            // Se as APIs oficiais bloqueiam o IP do Render, nós buscamos o texto na "força"
            const results = await googleIt({ query: query, limit: 3 });
            
            // Aqui tentamos uma API que raramente bloqueia o Render: PopCat mas com Proxy
            const urlPop = `https://api.popcat.xyz/lyrics?song=${encodeURIComponent(video.title)}`;
            const resPop = await axios.get(urlPop, { timeout: 12000 });

            if (resPop.data && resPop.data.lyrics) {
                return {
                    titulo: resPop.data.title,
                    artista: resPop.data.artist,
                    letra: resPop.data.lyrics,
                    imagem: resPop.data.image || video.thumbnail
                };
            }

            return null;
        } catch (error) {
            console.error("[LyricsService] Erro persistente de rede no Render:", error.message);
            return null;
        }
    }
}

module.exports = new LyricsService();
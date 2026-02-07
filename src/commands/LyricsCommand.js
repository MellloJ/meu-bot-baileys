// src/commands/LyricsCommand.js
const Command = require('../core/Command');
const LyricsService = require('../../services/LyricsService');

class LyricsCommand extends Command {
    constructor() {
        super('letra', 'Busca a letra da música e traduz automaticamente.');
    }

    async execute(sock, msg, context) {
        const { remoteJid } = msg.key;
        const { conteudo } = context;

        if (!conteudo) return sock.sendMessage(remoteJid, { text: "⚠️ Qual música você quer?" });

        try {
            await sock.sendMessage(remoteJid, { text: "🎤 Buscando e traduzindo..." }, { quoted: msg });

            const res = await LyricsService.buscarLetra(conteudo);
            if (!res) return sock.sendMessage(remoteJid, { text: "❌ Letra não encontrada." });

            // Montagem do corpo da mensagem
            let mensagemFinal = `🎤 *${res.titulo}*\n👤 *${res.artista}*\n\n`;
            
            if (res.letraTraduzida) {
                mensagemFinal += `📜 *LETRA ORIGINAL:*\n${res.letraOriginal}\n\n`;
                mensagemFinal += `🇧🇷 *TRADUÇÃO:*\n${res.letraTraduzida}`;
            } else {
                mensagemFinal += res.letraOriginal;
            }

            await sock.sendMessage(remoteJid, {
                text: mensagemFinal,
                contextInfo: {
                    externalAdReply: {
                        title: res.titulo,
                        body: `Letra & Tradução de ${res.artista}`,
                        thumbnailUrl: res.imagem,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: msg });

        } catch (e) {
            if (e.message.includes('429')) {
                await sock.sendMessage(remoteJid, { text: "🕒 Muitas requisições! O Google me pediu um descanso. Tente novamente em alguns minutos." });
            } else {
                await sock.sendMessage(remoteJid, { text: "❌ Erro ao buscar a letra. Tente novamente mais tarde." });
            }
        }
    }
}

module.exports = new LyricsCommand();
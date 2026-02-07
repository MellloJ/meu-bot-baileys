// src/commands/LyricsCommand.js
const Command = require('../core/Command');
const LyricsService = require('../../services/LyricsService');

class LyricsCommand extends Command {
    constructor() {
        super('letra', 'Busca a letra da música.');
    }

    async execute(sock, msg, context) {
        const { remoteJid } = msg.key;
        const { conteudo } = context;

        if (!conteudo) return sock.sendMessage(remoteJid, { text: "⚠️ Digite o nome da música!" });

        try {
            await sock.sendMessage(remoteJid, { text: "🔍 Buscando nos registros..." }, { quoted: msg });

            const data = await LyricsService.buscarLetra(conteudo);

            // Verificação de segurança para evitar o erro de [Object] no sendMessage
            if (!data || !data.letra || typeof data.letra !== 'string') {
                return sock.sendMessage(remoteJid, { text: "❌ Não encontrei a letra. Tente digitar 'Artista - Música'." });
            }

            const textoFinal = `🎤 *${String(data.titulo)}*\n👤 *${String(data.artista)}*\n\n${String(data.letra)}`;

            await sock.sendMessage(remoteJid, { 
                text: textoFinal,
                contextInfo: {
                    externalAdReply: {
                        title: String(data.titulo),
                        body: String(data.artista),
                        thumbnailUrl: data.imagem,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: msg });

        } catch (e) {
            console.error("[LyricsCommand] Erro Crítico:", e);
            await sock.sendMessage(remoteJid, { text: "❌ Erro ao processar comando." });
        }
    }
}

module.exports = new LyricsCommand();
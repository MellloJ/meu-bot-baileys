// src/commands/LyricsCommand.js
const Command = require('../core/Command');
const LyricsService = require('../../services/LyricsService');

class LyricsCommand extends Command {
    constructor() {
        super('letra', 'Busca a letra da música pelo nome.');
    }

    async execute(sock, msg, context) {
        const { remoteJid } = msg.key;
        const { conteudo } = context;

        if (!conteudo) return sock.sendMessage(remoteJid, { text: "⚠️ Digite o nome da música!" });

        try {
            await sock.sendMessage(remoteJid, { text: "🔍 Buscando letra..." }, { quoted: msg });

            const data = await LyricsService.buscarLetra(conteudo);

            if (!data) {
                return sock.sendMessage(remoteJid, { text: "❌ Não encontrei a letra desta música nos registros atuais." });
            }

            const textoFinal = `🎤 *${data.titulo}*\n👤 *${data.artista}*\n\n${data.letra}`;

            await sock.sendMessage(remoteJid, { 
                text: textoFinal,
                contextInfo: {
                    externalAdReply: {
                        title: data.titulo,
                        body: data.artista,
                        thumbnailUrl: data.imagem,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: msg });

        } catch (e) {
            console.error("[LyricsCommand] Erro:", e);
            await sock.sendMessage(remoteJid, { text: "❌ Erro ao processar a busca." });
        }
    }
}

module.exports = new LyricsCommand();
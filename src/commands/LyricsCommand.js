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

        if (!conteudo) return sock.sendMessage(remoteJid, { text: "⚠️ Qual música você quer?" });

        try {
            await sock.sendMessage(remoteJid, { 
                text: "⏳ O servidor está lento hoje, mas estou vasculhando os arquivos para você. Aguarde uns instantes..." 
            }, { quoted: msg });

            const res = await LyricsService.buscarLetra(conteudo);
            
            if (!res || !res.letra) {
                return sock.sendMessage(remoteJid, { text: "❌ Letra não encontrada em nenhum dos servidores. Tente digitar: Artista - Música" });
            }

            // Garantindo que enviamos apenas strings para o Baileys
            const cabecalho = `🎤 *${String(res.titulo)}*\n👤 *${String(res.artista)}*\n\n`;
            const corpo = String(res.letra);

            await sock.sendMessage(remoteJid, {
                text: cabecalho + corpo,
                contextInfo: {
                    externalAdReply: {
                        title: String(res.titulo),
                        body: String(res.artista),
                        thumbnailUrl: res.imagem,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: msg });

        } catch (e) {
            console.error(e);
            await sock.sendMessage(remoteJid, { text: "❌ Ocorreu um erro técnico ao processar a letra." });
        }
    }
}

module.exports = new LyricsCommand();
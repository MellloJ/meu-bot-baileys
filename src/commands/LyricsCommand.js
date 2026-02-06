// src/commands/LyricsCommand.js
const Command = require('../core/Command');
const axios = require('axios');

class LyricsCommand extends Command {
    constructor() {
        super('letra', 'Busca a letra da música apenas com o nome. Ex: $letra Despacito');
    }

    async execute(sock, msg, context) {
        const { remoteJid } = msg.key;
        const { conteudo } = context;

        if (!conteudo) return sock.sendMessage(remoteJid, { text: "⚠️ Digite o nome da música!" });

        try {
            // API pública gratuita para letras
            const url = `https://lyrist.vercel.app/api/${encodeURIComponent(conteudo)}`;
            const { data } = await axios.get(url);

            if (!data || !data.lyrics) {
                return sock.sendMessage(remoteJid, { text: "❌ Letra não encontrada." });
            }

            const textoFinal = `🎤 *${data.title}* - ${data.artist}\n\n${data.lyrics}`;
            
            await sock.sendMessage(remoteJid, { 
                text: textoFinal,
                // Adiciona a foto do artista se disponível
                contextInfo: {
                    externalAdReply: {
                        title: data.title,
                        body: "Letras",
                        thumbnailUrl: data.image,
                        mediaType: 1
                    }
                }
            }, { quoted: msg });

        } catch (e) {
            console.error(e);
            await sock.sendMessage(remoteJid, { text: "❌ Erro ao buscar letra." });
        }
    }
}

module.exports = new LyricsCommand();
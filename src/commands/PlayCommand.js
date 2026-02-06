// src/commands/PlayCommand.js
const Command = require('../core/Command');
const YouTubeService = require('../../services/YouTubeService');
const yts = require('yt-search');
const fs = require('fs');

class PlayCommand extends Command {
    constructor() {
        super('play', 'Baixa e envia música sem bloqueios');
    }

    async execute(sock, msg, context) {
        const { remoteJid } = msg.key;
        const { conteudo } = context;
        let localFilePath = null;

        if (!conteudo) return sock.sendMessage(remoteJid, { text: "⚠️ Digite o nome da música!" });

        try {
            await sock.sendMessage(remoteJid, { text: "🔍 Buscando música..." }, { quoted: msg });

            const r = await yts(conteudo);
            const video = r.videos[0];
            if (!video) return sock.sendMessage(remoteJid, { text: "❌ Música não encontrada." });

            await sock.sendMessage(remoteJid, { text: `⏳ Baixando: *${video.title}*...` });

            // 1. Baixa o arquivo para o /tmp do Render
            localFilePath = await YouTubeService.getAudioPath(video.url);

            if (!localFilePath) {
                throw new Error("Falha ao baixar o arquivo no servidor.");
            }

            // 2. Envia para o WhatsApp indicando o caminho do arquivo
            await sock.sendMessage(remoteJid, {
                audio: { url: localFilePath },
                mimetype: 'audio/mp4',
                ptt: false
            }, { quoted: msg });

            console.log(`[PLAY] Sucesso! Enviado e pronto para apagar.`);

        } catch (e) {
            console.error("[PLAY ERROR]", e.message);
            await sock.sendMessage(remoteJid, { text: "❌ Erro ao processar áudio. Tente novamente mais tarde." });
        } finally {
            // 3. LIMPEZA: Sempre tenta apagar o arquivo para não lotar o disco
            if (localFilePath && fs.existsSync(localFilePath)) {
                try {
                    fs.unlinkSync(localFilePath);
                    console.log(`[PLAY] Arquivo temporário removido: ${localFilePath}`);
                } catch (err) {
                    console.error("[PLAY] Erro ao deletar arquivo:", err);
                }
            }
        }
    }
}

module.exports = new PlayCommand();
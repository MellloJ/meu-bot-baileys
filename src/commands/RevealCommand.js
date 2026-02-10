const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const DonoCommandAbstractClass = require('./DonoCommandAbstractClass');

class RevealCommand extends DonoCommandAbstractClass {
    constructor() {
        super('revelar', 'Envia uma mídia de visualização única como mídia normal.');
    }

    async handleDono(sock, msg, context, metadata, utils) {
        const { remoteJid } = msg.key;
        
        // 1. Pega a mensagem marcada (quoted)
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quoted) {
            return sock.sendMessage(remoteJid, { text: "⚠️ Marque uma mensagem de visualização única!" });
        }

        // 2. Localiza a mídia dentro do objeto ViewOnce
        const viewOnce = quoted.viewOnceMessageV2?.message || quoted.viewOnceMessage?.message;
        const media = viewOnce?.imageMessage || viewOnce?.videoMessage;

        if (!media) {
            return sock.sendMessage(remoteJid, { text: "❌ Isso não parece ser uma mídia de visualização única." });
        }

        try {
            await sock.sendMessage(remoteJid, { text: "🔓 Revelando mídia..." }, { quoted: msg });

            // 3. Download do buffer
            const type = viewOnce.imageMessage ? 'image' : 'video';
            const stream = await downloadContentFromMessage(media, type);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // 4. Reenvia como mídia normal
            const response = {};
            response[type] = buffer;
            response.caption = `🔓 *Mídia Revelada*\nOriginal: @${msg.message.extendedTextMessage.contextInfo.participant.split('@')[0]}`;
            response.mentions = [msg.message.extendedTextMessage.contextInfo.participant];

            await sock.sendMessage(remoteJid, response, { quoted: msg });

        } catch (e) {
            console.error(e);
            await sock.sendMessage(remoteJid, { text: "❌ Erro ao baixar mídia. O link pode ter expirado." });
        }
    }
}

module.exports = new RevealCommand();
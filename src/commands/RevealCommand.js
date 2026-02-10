// src/commands/RevealCommand.js
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const DonoCommandAbstractClass = require('./DonoCommandAbstractClass');

class RevealCommand extends DonoCommandAbstractClass {
    constructor() {
        super('revelar', 'Revela mídia de visualização única (sem processar miniatura).');
    }

    async handleDono(sock, msg, context, metadata, utils) {
        const { remoteJid } = msg.key;
        
        // 1. Localiza a mensagem marcada (quoted)
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (!quoted) {
            return sock.sendMessage(remoteJid, { text: "⚠️ Marque a mensagem de visualização única!" });
        }

        // 2. Busca profunda da mídia (V1, V2 e V2Extension)
        const viewOnceMsg = quoted.viewOnceMessageV2?.message || 
                            quoted.viewOnceMessage?.message || 
                            quoted.viewOnceMessageV2Extension?.message ||
                            quoted;

        const imageMessage = viewOnceMsg.imageMessage;
        const videoMessage = viewOnceMsg.videoMessage;
        const media = imageMessage || videoMessage;

        if (!media) {
            return sock.sendMessage(remoteJid, { text: "❌ Mídia não encontrada ou formato incompatível." });
        }

        try {
            // CORREÇÃO DA REAÇÃO: Baileys usa sendMessage com 'react'
            await sock.sendMessage(remoteJid, {
                react: {
                    text: '🔓',
                    key: msg.key
                }
            });

            // 3. Define o tipo e o mimetype ORIGINAL
            const mediaType = imageMessage ? 'image' : 'video';
            const originalMimetype = media.mimetype || (imageMessage ? 'image/jpeg' : 'video/mp4');

            // 4. Download do Buffer
            const stream = await downloadContentFromMessage(media, mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // 5. Reenvio sem gerar thumbnail (evita erro GLib)
            // Dentro do RevealCommand.js
            await sock.sendMessage(remoteJid, { 
                [mediaType]: buffer, 
                caption: "🔓 *Mídia Revelada*",
                mimetype: originalMimetype,
                jpegThumbnail: null // <--- ADICIONE ISSO para matar o erro de GLib de vez
            }, { quoted: msg });
            
            // Adiciona o buffer no campo correto (image ou video)
            messagePayload[mediaType] = buffer;
            
            if (videoMessage) {
                messagePayload.gifPlayback = false;
            }

            // Enviamos o arquivo bruto
            await sock.sendMessage(remoteJid, messagePayload, { quoted: msg });

        } catch (e) {
            console.error("[Reveal Error]", e);
            await sock.sendMessage(remoteJid, { text: "❌ Erro: Mídia expirada ou falha no download." });
        }
    }
}

module.exports = new RevealCommand();
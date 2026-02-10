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

        // 2. Deep Search: Procura a mídia em todas as estruturas possíveis (V1, V2, Extension)
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
            // Feedback visual rápido
            await sock.react(remoteJid, msg.key, '🔓');

            // 3. Define o tipo e o mimetype ORIGINAL para evitar reprocessamento
            const mediaType = imageMessage ? 'image' : 'video';
            const originalMimetype = media.mimetype || (imageMessage ? 'image/jpeg' : 'video/mp4');

            // 4. Download do Buffer
            const stream = await downloadContentFromMessage(media, mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // 5. Reenvio "Cirúrgico"
            // O segredo para não dar erro no Canvas/GLib é passar o 'mimetype'
            // e NÃO passar 'jpegThumbnail' (deixe que o WhatsApp do usuário gere isso).
            const messagePayload = {};
            
            messagePayload[mediaType] = buffer;
            messagePayload.caption = "🔓 *Mídia Revelada*";
            messagePayload.mimetype = originalMimetype; // <--- ISSO EVITA O ERRO DE GLIB
            
            // Se for vídeo, forçamos não ser gif para não exigir processamento
            if (videoMessage) {
                messagePayload.gifPlayback = false;
            }

            await sock.sendMessage(remoteJid, messagePayload, { quoted: msg });

        } catch (e) {
            console.error("[Reveal Error]", e);
            await sock.sendMessage(remoteJid, { text: "❌ Erro: Mídia expirada ou corrompida." });
        }
    }
}

module.exports = new RevealCommand();
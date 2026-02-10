const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const DonoCommandAbstractClass = require('./DonoCommandAbstractClass');

class RevealCommand extends DonoCommandAbstractClass {
    constructor() {
        super('revelar', 'Revela fotos/vídeos de visualização única marcados.');
    }

    async handleDono(sock, msg, context, metadata, utils) {
        const { remoteJid } = msg.key;
        
        // 1. Pega a mensagem que você marcou
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quoted) {
            return sock.sendMessage(remoteJid, { text: "⚠️ Marque uma mensagem de visualização única!" });
        }

        // 2. Tenta encontrar a mídia em todas as variações possíveis do protocolo
        // O segredo está em buscar recursivamente ou em todas as chaves 'viewOnce'
        const rawMedia = 
            quoted.viewOnceMessageV2?.message || 
            quoted.viewOnceMessage?.message ||
            quoted.viewOnceMessageV2Extension?.message ||
            quoted; // Caso a mídia esteja na raiz por algum motivo de versão

        const image = rawMedia.imageMessage;
        const video = rawMedia.videoMessage;
        const target = image || video;

        if (!target) {
            // Log para debug se falhar novamente
            console.log("Estrutura da mensagem marcada:", JSON.stringify(quoted, null, 2));
            return sock.sendMessage(remoteJid, { text: "❌ Isso não parece ser uma mídia de visualização única ou o link expirou." });
        }

        try {
            await sock.sendMessage(remoteJid, { text: "🔓 Descriptografando mídia..." }, { quoted: msg });

            const type = image ? 'image' : 'video';
            
            // 3. Download do buffer
            const stream = await downloadContentFromMessage(target, type);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // 4. Envia de volta como mídia comum
            const sendOptions = {};
            sendOptions[type] = buffer;
            sendOptions.caption = `🔓 *Mídia Revelada*\n\n_Nota: Mídias de visualização única são descriptografadas pelo bot._`;

            await sock.sendMessage(remoteJid, sendOptions, { quoted: msg });

        } catch (e) {
            console.error("Erro ao revelar mídia:", e);
            await sock.sendMessage(remoteJid, { text: "❌ Falha ao baixar a mídia. Pode ser que ela já tenha sido aberta ou o cache expirou." });
        }
    }
}

module.exports = new RevealCommand();
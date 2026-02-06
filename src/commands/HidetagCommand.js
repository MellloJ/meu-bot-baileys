const AdminCommands = require("./AdminCommands");

class HidetagCommand extends AdminCommands {
    constructor() {
        super('hidetag', 'Marca todos os membros do grupo sem mencionar diretamente (Admin apenas)');
    }
    
    async handleAdmin(sock, msg, context, metadata, utils) {
        const { remoteJid } = msg.key;
        const { mensagem } = context;

        try {
            const participantes = await sock.groupMetadata(remoteJid);
            const ids = participantes.participants.map(p => p.id);
            await sock.sendMessage(remoteJid, { text: mensagem || "📢 Atenção!", mentions: ids });
        } catch (e) {
            await sock.sendMessage(remoteJid, { text: "❌ Erro ao marcar membros do grupo." });
        }
    }
}

module.exports = new HidetagCommand();
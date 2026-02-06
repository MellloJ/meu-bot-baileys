const AdminCommands = require('../core/AdminCommandss');

class KillCommand extends AdminCommands {
    constructor() {
        super('kill', 'Remove um membro do grupo (Admin apenas) marcando ou respondendo a mensagem');
    }

    async handleAdmin(sock, msg, context, metadata, utils) {
        const { remoteJid } = msg.key;
        const { participanteCitado, mencaoDireta } = context;

        const alvo = participanteCitado || mencaoDireta;

        if (!alvo) {
            return await sock.sendMessage(remoteJid, { 
                text: "⚠️ Marque alguém ou responda a mensagem de quem deseja eliminar!" 
            });
        }

        try {
            await sock.groupParticipantsUpdate(remoteJid, [alvo], "remove");
            utils.setUltimoRemovido(alvo); // Sua lógica original de cache
            await sock.sendMessage(remoteJid, { text: "🎯 Alvo eliminado com sucesso! 💀" });
        } catch (e) {
            await sock.sendMessage(remoteJid, { text: "❌ Erro: Verifique se eu sou admin do grupo." });
        }
    }
}

module.exports = new KillCommand();
const AdminCommands = require("./AdminCommands");

class AddCommand extends AdminCommands {
    constructor() {
        super('add', 'Adiciona o último alvo removido de volta ao grupo');
    }

    async handleAdmin(sock, msg, context, metadata, utils) {
        const { remoteJid } = msg.key;
        let ultimoRemovido = utils.getUltimoRemovido();

        if (!ultimoRemovido) {
            return await sock.sendMessage(remoteJid, { text: "⚠️ Nenhum alvo para adicionar! Use o comando $kill primeiro." });
        }

        // Garante que o JID está limpo e no formato correto
        // Ex: "5511999999999@s.whatsapp.net"
        const jidFinal = ultimoRemovido.includes('@') ? ultimoRemovido : `${ultimoRemovido.replace(/[^0-9]/g, '')}@s.whatsapp.net`;

        try {
            // PASSO CRUCIAL: Atualizar a metadata antes de tentar adicionar.
            // Isso sincroniza o bot com o servidor, simulando a abertura do grupo no celular.
            const atualMetadata = await sock.groupMetadata(remoteJid);
            
            // Tenta adicionar
            const response = await sock.groupParticipantsUpdate(remoteJid, [jidFinal], "add");

            // O Baileys retorna o status da operação
            const resultado = response[0];

            if (resultado.status === "200") {
                utils.limparUltimoRemovido();
                return await sock.sendMessage(remoteJid, { text: "✅ Adicionado com sucesso!" });
            } else if (resultado.status === "403") {
                // Se cair aqui, o WhatsApp exigiu o envio de um convite privado (Message Invitation)
                // que é diferente do link de grupo.
                await sock.sendMessage(remoteJid, { text: "❌ O WhatsApp bloqueou a adição direta por segurança (Erro 403). Tente adicionar manualmente." });
            } else {
                await sock.sendMessage(remoteJid, { text: `❌ Erro do servidor (Status: ${resultado.status}).` });
            }

        } catch (e) {
            console.error("Erro no AddCommand:", e);
            await sock.sendMessage(remoteJid, { text: "❌ Falha técnica ao tentar adicionar." });
        }
    }
}

module.exports = new AddCommand();
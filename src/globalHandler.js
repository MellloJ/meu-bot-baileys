const groupManager = require('./services/GroupManager');
const commands = require('./commands'); // Pasta com as classes

module.exports = {
    async handle(sock, msg, texto, metadata, utils) {
        const remoteJid = msg.key.remoteJid;
        const args = texto.trim().split(/ +/);
        const cmdName = args.shift().toLowerCase().substring(1);

        // Extração de contexto (o que você já tinha)
        const context = {
            args,
            conteudo: args.join(" "),
            mencaoDireta: msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0],
            mensagemRespondida: msg.message?.extendedTextMessage?.contextInfo?.participant,
            infoContexto: msg.message?.extendedTextMessage?.contextInfo,
            participanteCitado: msg.message?.extendedTextMessage?.contextInfo?.participant
        };

        const config = groupManager.getGroupConfig(remoteJid);

        // 1. Verifica Comandos Customizados do Grupo
        if (config.customCommands?.[cmdName]) {
            return await config.customCommands[cmdName](sock, msg, context);
        }

        // 2. Busca o Comando Global
        const command = commands[cmdName];
        if (command) {
            // Verifica se o comando está bloqueado neste grupo
            if (config.comandosBloqueados?.includes(cmdName)) {
                return await sock.sendMessage(remoteJid, { text: "🚫 Comando desativado neste grupo." });
            }

            // EXECUÇÃO DO COMANDO
            return await command.execute(sock, msg, context, metadata, utils);
        }

        return false;
    }
};
// src/globalHandler.js
const groupManager = require('./services/GroupManager');
const commands = require('./commands'); 

module.exports = {
    async handle(sock, msg, texto, metadata, utils) {
        const remoteJid = msg.key.remoteJid;
        
        try {
            const args = texto.trim().split(/ +/);
            const cmdName = args.shift().toLowerCase().substring(1);

            const context = {
                args,
                conteudo: args.join(" "),
                mencaoDireta: msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0],
                participanteCitado: msg.message?.extendedTextMessage?.contextInfo?.participant
            };

            const groupConfig = groupManager.getGroupConfig(remoteJid);

            // 1. Verifica se o comando está bloqueado no grupo
            if (groupConfig.comandosBloqueados?.includes(cmdName)) {
                return await sock.sendMessage(remoteJid, { text: "🚫 Este comando foi desativado neste grupo." });
            }

            // 2. Busca e executa o comando
            const command = commands[cmdName];
            if (command) {
                // Aqui é onde a mágica acontece: o retorno do comando é vigiado
                return await command.execute(sock, msg, context, metadata, utils);
            }

        } catch (error) {
            // Se QUALQUER comando der erro (TypeError, API fora do ar, etc), cai aqui
            console.error(`❌ Erro ao executar comando:`, error.message);
            
            await sock.sendMessage(remoteJid, { 
                text: `⚠️ Ops! Ocorreu um erro interno ao processar esse comando.\n\n*Detalhe:* ${error.message}` 
            }, { quoted: msg });
        }

        return false;
    }
};
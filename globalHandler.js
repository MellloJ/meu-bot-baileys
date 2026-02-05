// globalHandler.js
// const utils = require('./utils'); // Importa as funções comuns

module.exports = {
    async handle(sock, msg, texto, metadata, utils) {
        const remoteJid = msg.key.remoteJid;
        const args = texto.trim().split(/ +/);
        const comando = args.shift().toLowerCase().substring(1); // Remove o '!'
        const conteudo = args.join(" ");

        // Lista de comandos globais
        switch (comando) {
            case 'ping': {
                // 1. Tempo de atividade do servidor (Uptime)
                const uptimeSegundos = process.uptime();
                const tempoHumano = utils.formatarTempo(uptimeSegundos);

                // 2. Latência da mensagem (Tempo de resposta)
                // O timestamp do WhatsApp vem em segundos, convertemos para ms (* 1000)
                const timestampMsg = msg.messageTimestamp * 1000;
                const latenciaMs = Date.now() - timestampMsg;
                const latenciaHumana = utils.formatarLatencia(latenciaMs);

                await sock.sendMessage(remoteJid, { 
                    text: `🏓 *Pong!*\n\n*Resposta:* ${latenciaHumana}\n*Servidor online há:* ${tempoHumano}` 
                }, { quoted: msg });
                
                return true;
            }

            case 'reload':
                // Apenas VOCÊ ou admins supremos devem poder usar este comando
                if (msg.key.fromMe) {
                    try {
                        // O index.js vai lidar com o recarregamento geral, 
                        // mas podemos avisar aqui que o sinal foi recebido
                        await sock.sendMessage(remoteJid, { text: "🔄 Reiniciando módulos internos..." });
                        return false; // Retornamos false para o index saber que deve recarregar
                    } catch (e) {
                        await sock.sendMessage(remoteJid, { text: "❌ Erro ao recarregar." });
                    }
                }
                return true;

            case 'hidetag':
            case 'aviso':
                // if (utils.isAdmin(msg, metadata) || utils.temPermissao(msg)) {
                if (utils.temPermissao(msg)) {
                    const participantes = metadata.participants.map(p => p.id);
                    await sock.sendMessage(remoteJid, { 
                        text: conteudo || '📢 Atenção grupo!', 
                        mentions: participantes 
                    });
                } else {
                    await sock.sendMessage(remoteJid, { text: '❌ Erro: Comando restrito a admins.' }, { quoted: msg });
                }
                return true;

            case 'regras':
                const regras = metadata.desc || "O grupo não possui descrição/regras definidas.";
                await sock.sendMessage(remoteJid, { text: `📋 *REGRAS DO GRUPO:*\n\n${regras}` }, { quoted: msg });
                return true;

            // Adicione novos comandos globais aqui embaixo facilmente
        }

        return false; // Retorna false se o comando não pertencer a este arquivo global
    }
};
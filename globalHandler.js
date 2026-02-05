// globalHandler.js
// const utils = require('./utils'); // Importa as funções comuns

module.exports = {
    async handle(sock, msg, texto, metadata, utils) {
        const remoteJid = msg.key.remoteJid;
        const args = texto.trim().split(/ +/);
        const comando = args.shift().toLowerCase().substring(1); // Remove o '!'
        const conteudo = args.join(" ");

        // Pega informações de quem foi marcado ou de quem a mensagem responde
        const mencaoDireta = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const mensagemRespondida = msg.message?.extendedTextMessage?.contextInfo?.participant;
        const infoContexto = msg.message?.extendedTextMessage?.contextInfo;
        const participanteCitado = mensagemRespondida?.participant;

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

            case 'id':
                // Trava de segurança: apenas quem temPermissao pode usar
                if (!utils.temPermissao(msg)) return true;

                let idRetorno = "";
                let alvo = "";

                if (mencaoDireta) {
                    idRetorno = mencaoDireta;
                    alvo = "do usuário mencionado";
                } else if (mensagemRespondida) {
                    idRetorno = mensagemRespondida;
                    alvo = "da pessoa que você respondeu";
                } else {
                    idRetorno = remoteJid;
                    alvo = "deste grupo";
                }

                await sock.sendMessage(remoteJid, { 
                    text: `🆔 *ID ${alvo}:*\n\n\`${idRetorno}\`` 
                }, { quoted: msg });
                return true;

            case 'hidetag':
                // Verifica se é admin ou dono
                if (!utils.isAdmin(msg, metadata) && !utils.temPermissao(msg)) {
                    await sock.sendMessage(remoteJid, { text: "❌ Sem permissão." });
                    return true;
                }

                const participantes = metadata.participants.map(p => p.id);
                
                // Se a pessoa estiver respondendo a uma mensagem
                if (infoContexto?.quotedMessage) {
                    // Pega o conteúdo da mensagem respondida (texto simples)
                    const textoCitado = infoContexto.quotedMessage.conversation || 
                                      infoContexto.quotedMessage.extendedTextMessage?.text;

                    await sock.sendMessage(remoteJid, { 
                        text: textoCitado || "📢 Atenção!", 
                        mentions: participantes 
                    });
                } else {
                    // Se não estiver respondendo, usa o conteúdo escrito após o comando
                    await sock.sendMessage(remoteJid, { 
                        text: conteudo || "📢 Atenção!", 
                        mentions: participantes 
                    });
                }
                return true;
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

            case 'kill':
                if (!utils.isAdmin(msg, metadata) && !utils.temPermissao(msg)) return true;

                const alvoKill = participanteCitado || mencaoDireta;
                if (!alvoKill) {
                    return await sock.sendMessage(remoteJid, { text: "⚠️ Marque alguém ou responda a mensagem de quem deseja eliminar!" });
                }

                try {
                    await sock.groupParticipantsUpdate(remoteJid, [alvoKill], "remove");
                    utils.setUltimoRemovido(alvoKill); // Salva para o comando $add
                    await sock.sendMessage(remoteJid, { text: "🎯 Alvo eliminado com sucesso! 💀" });
                } catch (e) {
                    await sock.sendMessage(remoteJid, { text: "❌ Erro ao eliminar: Certifique-se de que sou admin." });
                }
                return true;

            case 'add':
                if (!utils.isAdmin(msg, metadata)) return true;

                let alvoAdd = "";

                if (participanteCitado) {
                    alvoAdd = participanteCitado;
                } else if (conteudo.length > 5) {
                    alvoAdd = utils.formatarNumero(conteudo);
                } else if (utils.getUltimoRemovido()) {
                    alvoAdd = utils.getUltimoRemovido();
                    await sock.sendMessage(remoteJid, { text: "🔄 Trazendo de volta o último eliminado..." });
                }

                if (!alvoAdd) {
                    return await sock.sendMessage(remoteJid, { text: "⚠️ Digite o número ou responda a mensagem de quem deseja adicionar." });
                }

                try {
                    await sock.groupParticipantsUpdate(remoteJid, [alvoAdd], "add");
                    await sock.sendMessage(remoteJid, { text: "✅ Alvo reabilitado e adicionado ao grupo!" });
                } catch (e) {
                    await sock.sendMessage(remoteJid, { text: "❌ Não consegui adicionar. O número pode ser inválido ou a pessoa restringiu quem pode adicioná-la." });
                }
                return true;

            case 'dono':
                const infoDono = `👑 *DESENVOLVEDOR DO BOT*\n\n` +
                                 `Olá! Este bot foi criado com dedicação por *Jotta*.\n\n` +
                                 `🤖 *Agradecimento:* "Obrigado por me dar vida! Fico feliz em automatizar seus grupos."\n\n` +
                                 `📞 *Contato do dono:* +55 63 99119-2094\n` +
                                 `🌐 *GitHub:* github.com/MellloJ`;
                
                await sock.sendMessage(remoteJid, { text: infoDono }, { quoted: msg });
                return true;

            // Adicione novos comandos globais aqui embaixo facilmente
        }

        return false; // Retorna false se o comando não pertencer a este arquivo global
    }
};
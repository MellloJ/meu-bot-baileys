const http = require('http');
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const utils = require('./utils');
const config = require('./config');
const groupManager = require('./services/GroupManager');
const globalHandler = require('./globalHandler');

const PORT = process.env.PORT || 10000;

// Servidor de Resposta Imediata
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot Online');
});

server.on('error', (err) => {
    console.error('⚠️ [HTTP Server Error]:', err.message);
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ [Monitor] Porta ${PORT} aberta.`);
});

// Só ative o Keep-alive se estiver no Render
if (process.env.RENDER) {
    setInterval(() => {
        http.get(`http://localhost:${PORT}`, (res) => {
            res.on('data', () => {});
        }).on('error', (err) => {
            console.error('Keep-alive ping falhou:', err.message);
        });
    }, 120000);
}

// Regex robusto para detectar URLs
const linkRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.[a-zA-Z]{2,}\.[a-zA-Z]{2,})|([a-zA-Z0-9-]+\.(com|net|org|io|gg|bet|xyz|biz|info)[^\s]*)/gi;

// Mapa para armazenar histórico de mensagens (Anti-Spam)
const spamTracker = new Map();

// --- SISTEMA DE CACHE (CORREÇÃO DO ERRO RATE-LIMIT) ---
const groupCache = new Map();

async function getGroupMetadata(sock, remoteJid) {
    const now = Date.now();
    const CACHE_TIME = 60 * 1000; // 60 segundos

    if (groupCache.has(remoteJid)) {
        const cached = groupCache.get(remoteJid);
        if (now - cached.timestamp < CACHE_TIME) {
            return cached.data;
        }
    }

    try {
        const metadata = await sock.groupMetadata(remoteJid);
        groupCache.set(remoteJid, { data: metadata, timestamp: now });
        return metadata;
    } catch (err) {
        if (groupCache.has(remoteJid)) {
            console.warn(`⚠️ Falha ao buscar metadata (usando cache antigo): ${err.message}`);
            return groupCache.get(remoteJid).data;
        }
        console.error(`❌ Erro ao buscar metadata: ${err.message}`);
        return null;
    }
}
// -------------------------------------------------------

function limparNomeGrupo(nome) {
    return nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/gi, '').trim().replace(/\s+/g, '_').toLowerCase();
}

async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }) // Mantive silent para limpar o terminal
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrcode.generate(qr, { small: true });
            console.log('Escaneie o QR Code acima!');
        }

        if (connection === 'close') {
            const statusCode = (lastDisconnect.error)?.output?.statusCode;
            const deveReconectar = statusCode !== DisconnectReason.loggedOut;
            console.log(`🔄 Conexão fechada (${statusCode}). Reconectando: ${deveReconectar}`);
            if (deveReconectar) iniciarBot();
        } else if (connection === 'open') {
            console.log('✅ Bot conectado com sucesso!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Handler de Boas-vindas
    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update;
        const config = groupManager.getGroupConfig(id) || {};
        
        if (action === 'add' && config.funcoesExtras?.autoBemVindo) {
            try {
                const participantJid = participants[0];
                let ppUrl;
                try {
                    ppUrl = await sock.profilePictureUrl(participantJid, 'image');
                } catch {
                    ppUrl = 'https://telegra.ph/file/24fa902ead26340f3df2c.png'; 
                }

                const userName = `@${participantJid.split('@')[0]}`;
                const groupName = config.nome || 'Grupo';
                const msgPadrao = `👋 Olá ${userName}, bem-vindo(a) ao grupo *${groupName}*!\n\nUse *$help* para ver meus comandos.`;

                let textoFinal = config.funcoesExtras.mensagemBemVindo || msgPadrao;
                if (config.funcoesExtras.mensagemBemVindo) {
                     textoFinal = textoFinal.replace('@user', userName);
                }

                await sock.sendMessage(id, { 
                    image: { url: ppUrl }, 
                    caption: textoFinal, 
                    mentions: participants 
                });
            } catch (err) {
                console.error('Erro ao enviar boas-vindas:', err);
            }
        }
    });

    // --- MENSAGENS ---
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;

        const remoteJid = msg.key.remoteJid;
        const isGroup = remoteJid.endsWith('@g.us');

        let metadata = null;
        let groupConfig = {}; 

        const texto = msg.message?.conversation || 
                      msg.message?.extendedTextMessage?.text || 
                      msg.message?.imageMessage?.caption || 
                      msg.message?.videoMessage?.caption || "";

        if (isGroup) {
            // 1. Pega Metadados com Cache
            metadata = await getGroupMetadata(sock, remoteJid);
            if (!metadata) return;

            // 2. Pega Configuração
            const configDoGerenciador = groupManager.getGroupConfig(remoteJid);
            if (configDoGerenciador) {
                groupConfig = configDoGerenciador;
            }

            const globalConfig = require('./config');
            const ehDono = utils.ehSuperAdmin(msg);
            const ehGrupoVip = globalConfig.GRUPOS_AUTORIZADOS?.includes(remoteJid);
            const ehGrupoPlus = utils.ehGrupoPlus(remoteJid);
            const podeExecutar = ehDono || ehGrupoVip || ehGrupoPlus || (globalConfig.STATUS_BOT === 'TODOS');

            if (!podeExecutar) return;

            const isLink = linkRegex.test(texto);

            // === FILTRO DE LINKS ===
            if (groupConfig.funcoesExtras?.filtroLinks && isLink) {
                const isBot = msg.key.fromMe;
                const participantInfo = metadata?.participants?.find(p => p.id === (msg.key.participant || msg.key.remoteJid));
                const isAdmin = !!participantInfo?.admin || isBot;

                if (!isAdmin) {
                    await sock.sendMessage(remoteJid, { delete: msg.key });
                    return await sock.sendMessage(remoteJid, { text: "🚫 Links estão proibidos nesse grupo!" });
                }
            }

            // === ANTI-SPAM ===
            // === ANTI-SPAM (5x em 30s) ===
            // === ANTI-SPAM (5x em 30s) ===
            // Verifica se a função está ativa no JSON
            const spamAtivo = groupConfig.funcoesExtras?.antiSpam || groupConfig.funcoesExtras?.antispam;

            if (spamAtivo) {
                const senderId = msg.key.participant;
                const spamKey = `${remoteJid}-${senderId}`;
                const now = Date.now();
                
                let userSpamData = spamTracker.get(spamKey) || { count: 0, lastMsg: '', startTime: now };

                // Reseta contagem se passou de 30 segundos
                if (now - userSpamData.startTime > 30000) {
                    userSpamData = { count: 1, lastMsg: texto, startTime: now };
                } else {
                    // Se o texto for igual e não vazio
                    if (texto === userSpamData.lastMsg && texto.length > 0) {
                        userSpamData.count++;
                    } else {
                        userSpamData = { count: 1, lastMsg: texto, startTime: now };
                    }
                }
                
                // Salva o estado atual
                spamTracker.set(spamKey, userSpamData);

                // --- HORA DA PUNIÇÃO ---
                if (userSpamData.count >= 5) {
                    
                    // 1. Checagem de SEGURANÇA: Não tentar banir Admins/Dono
                    // Isso evita que o bot tente banir o dono e falhe (ou consiga, se for superadmin)
                    const alvoEhAdmin = utils.isAdmin(msg, metadata); // Usa sua função utils pronta
                    const alvoEhSuper = utils.ehSuperAdmin(msg);

                    if (alvoEhAdmin || alvoEhSuper || utils.temPermissao(msg)) {
                        console.log(`🛡️ Spam ignorado: ${senderId} tem imunidade.`);
                        // Zera o contador para não ficar logando infinito
                        userSpamData.count = 0; 
                        spamTracker.set(spamKey, userSpamData);
                        return; 
                    }

                    // 2. TENTATIVA DE BANIMENTO DIRETA (Try/Catch)
                    console.log(`🚨 Tentando banir ${senderId} por spam...`);

                    try {
                        // Tenta remover. Se o bot NÃO for admin, isso vai gerar um erro e pular para o CATCH
                        await sock.groupParticipantsUpdate(remoteJid, [senderId], 'remove');
                        
                        // Se chegou aqui, funcionou!
                        await sock.sendMessage(remoteJid, { 
                            text: `🚫 @${senderId.split('@')[0]} removido(a) por flood/spam.`,
                            mentions: [senderId]
                        });
                        
                        // Limpa o tracker do banido
                        spamTracker.delete(spamKey);

                    } catch (err) {
                        // 3. CAPTURA DO ERRO (Bot não é admin ou falha de conexão)
                        console.log(`❌ Falha ao banir (provavelmente sem permissão): ${err.message}`);
                        
                        await sock.sendMessage(remoteJid, { 
                            text: "⚠️ Detectei spam, mas não tenho permissão de Admin para remover o usuário!" 
                        });

                        // Reseta para não ficar mandando a msg de erro 50 vezes
                        userSpamData.count = 0;
                        spamTracker.set(spamKey, userSpamData);
                    }
                }
            }
        }
        
        // --- Comandos normais ($) ---
        if (!texto.startsWith('$')) return;

        if(!isGroup && !config.RESPONDER_PV && !utils.temPermissao(msg)) {
            return; 
        }

        if (!utils.podeResponder(remoteJid, msg)) return;

        try {
            const foiExecutadoGlobal = await globalHandler.handle(sock, msg, texto, metadata, utils);

            if (!foiExecutadoGlobal && isGroup) {
                const nomeLimpo = limparNomeGrupo(metadata.subject);
                try {
                    const handlerEspecifico = require(`./grupos/${nomeLimpo}`);
                    await handlerEspecifico.handle(sock, msg, texto, metadata, utils);
                } catch (err) {
                    try {
                        const padrao = require('./grupos/padrao'); 
                        await padrao.handle(sock, msg, texto, metadata, utils);
                    } catch (e) {}
                }
            }
        } catch (e) {
            console.error("Erro no processamento da mensagem:", e);
        }
    });

    // ============================================================
    // SISTEMA DE DIVULGAÇÃO AUTOMÁTICA (Resiliente ao Render)
    // ============================================================
    
    // Texto de divulgação focado em VENDA e BENEFÍCIOS
    // const textoVenda = `🤖 *GOSTOU DA ORGANIZAÇÃO DESTE GRUPO?*

    //     Você percebeu como este grupo é seguro, organizado e interativo? Isso é trabalho do *Bot Mello*! 🚀

    //     Você também pode ter essa automação nos seus grupos:

    //     🛡️ *SEGURANÇA BLINDADA*
    //     • *Anti-Link:* Bloqueia divulgação de outros grupos na hora.
    //     • *Anti-Spam:* Remove quem manda mensagens repetidas/travas.
    //     • *Anti-Fake:* Identifica e remove números estrangeiros suspeitos.

    //     ⚖️ *MODERAÇÃO INTELIGENTE*
    //     • *Boas-vindas:* Receba novos membros com texto personalizado.
    //     • *Comandos Admin:* Use $kill para banir e $hidetag para avisos.
    //     • *Limpeza:* Mantenha o grupo focado no assunto.

    //     🎉 *DIVERSÃO E ENGAJAMENTO*
    //     • *Figurinhas:* Cria stickers de fotos e vídeos ($figurinha).
    //     • *Música:* Busca letras instantaneamente ($letra).
    //     • *Espião:* Revela mensagens de visualização única ($revelar).

    //     💡 *Pare de perder tempo cuidando dos seus grupos manualmente!*
    //     Deixe o bot trabalhar 24h por dia para você.

    //     👇 *ENTRE EM CONTATO PARA SABER MAIS E SE AUTOMATIZE AGORA:*
    //     wa.me/5563991192094`;

    // 2. Função que faz o envio (com delay de segurança)
    // async function dispararDivulgacao(sock) {
    //     // Recarrega config para pegar grupos novos sem reiniciar
    //     delete require.cache[require.resolve('./config')];
    //     const configAtual = require('./config'); 
    //     const gruposAlvo = configAtual.AUTO_DIVULGAR || [];

    //     if (gruposAlvo.length === 0) {
    //         console.log("⚠️ Nenhum grupo configurado para divulgação.");
    //         return;
    //     }

    //     console.log(`📢 Iniciando divulgação para ${gruposAlvo.length} grupos...`);

    //     for (const grupoId of gruposAlvo) {
    //         try {
    //             // Envia com AdReply (Card bonito)
    //             await sock.sendMessage(grupoId, { 
    //                 text: textoVenda,
    //                 contextInfo: {
    //                     externalAdReply: {
    //                         title: "🤖 Automação para Grupos",
    //                         body: "Clique para falar com o Jotta",
    //                         thumbnailUrl: "https://cdn-icons-png.flaticon.com/512/4712/4712109.png", // Pode trocar por uma URL de foto sua
    //                         sourceUrl: "https://wa.me/5563991192094",
    //                         mediaType: 1,
    //                         renderLargerThumbnail: true
    //                     }
    //                 }
    //             });
                
    //             console.log(`✅ Divulgação enviada para: ${grupoId}`);

    //             // DELAY DE SEGURANÇA (Random entre 10s e 20s)
    //             const delay = Math.floor(Math.random() * (20000 - 10000 + 1) + 10000);
    //             await new Promise(resolve => setTimeout(resolve, delay));

    //         } catch (err) {
    //             console.error(`❌ Erro ao divulgar em ${grupoId}:`, err.message);
    //         }
    //     }
    //     console.log("🏁 Fim da rotina de divulgação.");
    // }

    // 3. Cron Job (Verificador de Horário)
    // let ultimoHorarioEnvio = null;

    // setInterval(async () => {
    //     const now = new Date();
    //     // Garante horário de Brasília (-3) mesmo no Render (UTC)
    //     const horaBrasilia = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
        
    //     const hora = horaBrasilia.getHours();
    //     const minuto = horaBrasilia.getMinutes();
    //     const horarioAtual = `${hora}:${minuto}`;

    //     // Horários: 09:00 e 17:00
    //     const horariosDisparo = [{ h: 9, m: 0 }, { h: 17, m: 0 }];
    //     const deveDisparar = horariosDisparo.some(t => t.h === hora && t.m === minuto);

    //     if (deveDisparar && ultimoHorarioEnvio !== horarioAtual) {
    //         ultimoHorarioEnvio = horarioAtual;
    //         await dispararDivulgacao(sock);
    //     }
    // }, 30 * 1000); // Checa a cada 30s

    // 4. LISTENER PARA COMANDO DE TESTE MANUAL
    // Colocamos um listener extra aqui só para capturar o comando de teste
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message) return;
        const key = m.key;
        const texto = m.message.conversation || m.message.extendedTextMessage?.text || "";

        // Verifica se é o dono executando
        // if (texto === '$testardivulgacao' && utils.ehSuperAdmin(m)) {
        //     await sock.sendMessage(key.remoteJid, { text: "🔄 Iniciando teste de divulgação agora..." });
        //     await dispararDivulgacao(sock);
        //     await sock.sendMessage(key.remoteJid, { text: "✅ Teste finalizado!" });
        // }
    });
}

iniciarBot();
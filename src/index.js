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
        let groupConfig = {}; // Inicia vazio para evitar crash

        const texto = msg.message?.conversation || 
                      msg.message?.extendedTextMessage?.text || 
                      msg.message?.imageMessage?.caption || 
                      msg.message?.videoMessage?.caption || "";

        if (isGroup) {
            // 1. Pega Metadados com Cache
            metadata = await getGroupMetadata(sock, remoteJid);
            if (!metadata) return;

            // 2. Pega Configuração do Grupo
            const configDoGerenciador = groupManager.getGroupConfig(remoteJid);
            
            // Se o gerenciador retornar algo, usamos. Se não, mantemos objeto vazio.
            if (configDoGerenciador) {
                groupConfig = configDoGerenciador;
            }

            // --- DEBUG: ISSO VAI TE MOSTRAR NO TERMINAL SE O SPAM TA ATIVO ---
            // console.log(`Config do Grupo ${remoteJid}:`, groupConfig.funcoesExtras);
            // -----------------------------------------------------------------

            // DICA: Se quiser forçar o teste mesmo sem configurar no JSON, descomente abaixo:
            // if (!groupConfig.funcoesExtras) groupConfig.funcoesExtras = {};
            // groupConfig.funcoesExtras.antiSpam = true; 

            const globalConfig = require('./config');

            // Checagens de permissão de execução do BOT
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

            // === ANTI-SPAM (5x em 30s) ===
            // Aqui garantimos que funcoesExtras existe antes de acessar antiSpam
            if (groupConfig.funcoesExtras && groupConfig.funcoesExtras.antispam) {
                
                // console.log('🔍 Verificando spam...'); // Debug
                
                const senderId = msg.key.participant;
                const spamKey = `${remoteJid}-${senderId}`;
                const now = Date.now();
                
                let userSpamData = spamTracker.get(spamKey) || { 
                    count: 0, lastMsg: '', startTime: now 
                };

                // Reseta se passou de 30 segundos
                if (now - userSpamData.startTime > 30000) {
                    userSpamData = { count: 1, lastMsg: texto, startTime: now };
                } else {
                    // Se for a mesma mensagem (e não for vazia)
                    if (texto === userSpamData.lastMsg && texto.length > 0) {
                        userSpamData.count++;
                    } else {
                        // Se mudou o texto, reseta contagem
                        userSpamData = { count: 1, lastMsg: texto, startTime: now };
                    }
                }
                spamTracker.set(spamKey, userSpamData);

                // Se atingir 5 mensagens iguais
                if (userSpamData.count >= 5) {
                    // console.log(`🚨 SPAM DETECTADO: ${senderId} (${userSpamData.count}x)`);

                    const isBot = msg.key.fromMe;
                    
                    // Verifica se quem mandou é Admin (Admin pode fazer spam)
                    const participantInfo = metadata?.participants?.find(p => p.id === senderId);
                    const isUserAdmin = !!participantInfo?.admin || utils.ehSuperAdmin(msg);
                    
                    // Verifica se o Bot é Admin (para poder banir)
                    const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                    const botInfo = metadata?.participants?.find(p => p.id === botId);
                    const botIsAdmin = !!botInfo?.admin;

                    // Lógica de Punição
                    // Se NÃO for admin e NÃO for o próprio bot
                    if (!isUserAdmin && !isBot) {
                        if (botIsAdmin) {
                            // console.log(`🔨 Banindo ${senderId}...`);
                            
                            // Remove o usuário
                            await sock.groupParticipantsUpdate(remoteJid, [senderId], 'remove');
                            
                            // Avisa e limpa tracker
                            await sock.sendMessage(remoteJid, { 
                                text: `🚫 @${senderId.split('@')[0]} foi removido por flood/spam.`,
                                mentions: [senderId]
                            });
                            spamTracker.delete(spamKey);
                            return; // Para execução
                        } else {
                            // Bot não é admin, só avisa
                            await sock.sendMessage(remoteJid, { text: "⚠️ Detectei spam, mas preciso ser Admin para remover!" });
                            spamTracker.delete(spamKey);
                        }
                    } else {
                        // console.log("🛡️ Usuário é admin ou o próprio bot. Punição ignorada.");
                        // Opcional: Resetar tracker para admins não ficarem com logs infinitos
                        if(userSpamData.count > 10) spamTracker.delete(spamKey);
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
}

iniciarBot();
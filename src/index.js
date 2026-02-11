const http = require('http');
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

// Só ative o Keep-alive se estiver no Render (ambiente de produção)
if (process.env.RENDER) {
    setInterval(() => {
        http.get(`http://localhost:${PORT}`, (res) => {
            res.on('data', () => {});
        }).on('error', (err) => {
            console.error('Keep-alive ping falhou:', err.message);
        });
    }, 120000);
}

const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const utils = require('./utils');
const config = require('./config');
const groupManager = require('./services/GroupManager');
const globalHandler = require('./globalHandler');

// Função auxiliar para nomes
function limparNomeGrupo(nome) {
    return nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/gi, '').trim().replace(/\s+/g, '_').toLowerCase();
}

async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' })
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

    // Handler de Boas-vindas (Só funciona em grupos, obviamente)
    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update;
        const config = groupManager.getGroupConfig(id);
        if (action === 'add' && config.funcoesExtras?.autoBemVindo) {
            const msgPadrao = `👋 Bem-vindo(a) ao grupo *${config.nome}*! Use $help para ver meus comandos.`;
            const textoFinal = config.funcoesExtras.mensagemBemVindo || msgPadrao;
            await sock.sendMessage(id, { text: textoFinal, mentions: participants });
        }
    });

    // --- NOVA LÓGICA DE MENSAGENS ---
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;

        const remoteJid = msg.key.remoteJid;
        const isGroup = remoteJid.endsWith('@g.us'); // Detecta se é grupo
        
        const texto = msg.message?.conversation || 
                      msg.message?.extendedTextMessage?.text || 
                      msg.message?.imageMessage?.caption || 
                      msg.message?.videoMessage?.caption || "";
        
        if (!texto.startsWith('$')) return;

        // 1. Filtro de Segurança Geral
        if (!utils.podeResponder(remoteJid, msg)) return;

        let metadata = null;
        let groupConfig = null;

        try {
            // ====================================================
            // LÓGICA ESPECÍFICA DE GRUPO (Só roda se for grupo)
            // ====================================================
            if (isGroup) {
                // Carrega metadados e configs
                metadata = await sock.groupMetadata(remoteJid);
                groupConfig = groupManager.getGroupConfig(remoteJid);
                const globalConfig = require('./config');

                // Checagens de permissão do grupo
                const ehDono = utils.ehSuperAdmin(msg);
                const ehGrupoVip = globalConfig.GRUPOS_AUTORIZADOS?.includes(remoteJid);
                const ehGrupoPlus = utils.ehGrupoPlus(remoteJid);
                const podeExecutar = ehDono || ehGrupoVip || ehGrupoPlus || (globalConfig.STATUS_BOT === 'TODOS');

                if (!podeExecutar) return; // Bloqueia se o grupo não for permitido

                // Filtro de Links
                if (groupConfig.funcoesExtras?.filtroLinks && texto.includes('http')) {
                    const isAdmin = metadata.participants.find(p => p.id === msg.key.participant)?.admin;
                    if (!isAdmin) {
                        await sock.sendMessage(remoteJid, { delete: msg.key });
                        return await sock.sendMessage(remoteJid, { text: "🚫 Links proibidos!" });
                    }
                }
            } 
            // ====================================================
            // LÓGICA DE PRIVADO (PV)
            // ====================================================
            else {
                // Aqui você pode adicionar lógica extra pra PV se quiser.
                // Por enquanto, se passou pelo 'podeResponder', ele executa.
                console.log(`📩 Comando recebido no PV de: ${remoteJid}`);
            }

            // ====================================================
            // EXECUÇÃO DOS COMANDOS
            // ====================================================

            // 1. Tenta executar no Handler Global (Figurinhas, Help, Ping, etc.)
            // Funciona tanto para PV quanto Grupo
            const foiExecutadoGlobal = await globalHandler.handle(sock, msg, texto, metadata, utils);

            // 2. Se não foi global e É UM GRUPO, tenta handler específico do grupo
            if (!foiExecutadoGlobal && isGroup) {
                const nomeLimpo = limparNomeGrupo(metadata.subject);
                try {
                    const handlerEspecifico = require(`./grupos/${nomeLimpo}`);
                    await handlerEspecifico.handle(sock, msg, texto, metadata, utils);
                } catch (err) {
                    try {
                        const padrao = require('./grupos/padrao'); // Handler padrão de grupos
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
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal'); // Biblioteca para mostrar o QR no terminal
const utils = require('./utils'); // Importa as funções comuns
const config = require('./config'); // Importa as configurações do bot
const groupManager = require('./src/services/GroupManager');

// Variável global para controle de acesso liberado

const liberado = true ; // Muda para 'false' para restringir o bot a admins apenas

// Função para limpar o nome do grupo e transformá-lo em um formato válido para nomes de arquivos

function limparNomeGrupo(nome) {
    return nome
        .normalize('NFD')                     // Remove acentos (ex: á -> a)
        .replace(/[\u0300-\u036f]/g, '')      // Remove os acentos resultantes
        .replace(/[^\w\s]/gi, '')             // Remove tudo que não for letra, número ou espaço
        .trim()                               // Remove espaços no início e fim
        .replace(/\s+/g, '_')                 // Substitui espaços por underline
        .toLowerCase();                       // Deixa tudo em minúsculo
}

async function iniciarBot() {
    // 1. Configuração de Autenticação
    // Isso cria uma pasta 'auth_info' para salvar seu login (não precisa escanear QR toda vez)
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    // 2. Criar o Socket (o "cliente" do WhatsApp)
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // Vamos usar o qrcode-terminal para ficar mais bonito
        logger: pino({ level: 'silent' }) // Silencia logs desnecessários
    });

    // 3. Monitorar a Conexão
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            // Se tiver QR Code, mostra no terminal
            qrcode.generate(qr, { small: true });
            console.log('Escaneie o QR Code acima com seu WhatsApp!');
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Conexão caiu. Reconectando...', shouldReconnect ? 'Sim' : 'Não');
            // Se não foi um logout manual, tenta reconectar
            if (shouldReconnect) {
                iniciarBot();
            }
        } else if (connection === 'open') {
            console.log('✅ Bot conectado com sucesso!');
        }
    });

    // 4. Salvar as credenciais sempre que atualizarem
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update;
        const config = groupManager.getGroupConfig(id);

        if (action === 'add' && config.funcoesExtras?.autoBemVindo) {
            const msgPadrao = `👋 Bem-vindo(a) ao grupo *${config.nome}*! Use $help para ver meus comandos.`;
            
            // Se existir mensagem customizada, usa ela. Se não, usa a padrão.
            const textoFinal = config.funcoesExtras.mensagemBemVindo || msgPadrao;

            await sock.sendMessage(id, { 
                text: textoFinal,
                mentions: participants 
            });
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;

        const remoteJid = msg.key.remoteJid;
        const texto = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
        
        // 1. Verificação Global: É um comando? (Mudamos para startsWith('$'))
        if (!texto.startsWith('$')) return;

        // 2. FILTRO DE SEGURANÇA (Config.js + Utils.js)
        // Se não puder responder, o código morre aqui mesmo.
        if (!utils.podeResponder(remoteJid, msg)) {
            console.log(`[BLOQUEADO] Comando ignorado no grupo/chat: ${remoteJid}`);
            return;
        }

        if (remoteJid.endsWith('@g.us')) {
            try {
                // 1. Carrega a config do GRUPO (vinda do GroupManager)
                const groupConfig = groupManager.getGroupConfig(remoteJid);
                
                // 2. Carrega a config GLOBAL (vinda do seu require('./config'))
                // Verifique se o seu arquivo ./config.js exporta GRUPOS_AUTORIZADOS e STATUS_BOT
                const globalConfig = require('./config'); 

                const ehDono = utils.ehSuperAdmin(msg);
                
                // Usamos ?. para evitar erro se a lista não existir na globalConfig
                const ehGrupoVip = globalConfig.GRUPOS_AUTORIZADOS?.includes(remoteJid);
                const ehGrupoPlus = utils.ehGrupoPlus(remoteJid); 

                // Checagem segura do status do bot
                const podeExecutar = ehDono || ehGrupoVip || ehGrupoPlus || (globalConfig.STATUS_BOT === 'TODOS');

                if (!podeExecutar) return;

                // --- LÓGICA DO FILTRO DE LINKS --- (usando groupConfig agora)
                if (groupConfig.funcoesExtras?.filtroLinks && texto.includes('http')) {
                    const metadata = await sock.groupMetadata(remoteJid);
                    const isAdmin = metadata.participants.find(p => p.id === msg.key.participant)?.admin;

                    if (!isAdmin) {
                        await sock.sendMessage(remoteJid, { delete: msg.key });
                        return await sock.sendMessage(remoteJid, { text: "🚫 Links não são permitidos neste grupo!" });
                    }
                }
                // const ehDono = utils.temPermissao(msg);
                // const ehGrupoVip = utils.grupoEhLiberado(remoteJid);
                
                // O bot responde se:
                // 1. Você (Dono) mandou o comando
                // 2. O comando veio de um grupo da lista VIP (GRUPOS_LIBERADOS)
                // 3. A variável global 'liberado' está true (opcional)
                // const podeExecutar = ehDono || ehGrupoVip || liberado;

                if (!podeExecutar) return;

                if (!podeExecutar) {
                    // Opcional: avisar que não tem permissão
                    await sock.sendMessage(remoteJid, { text: '❌ Desculpe, este comando é restrito a admins.' }, { quoted: msg });
                    return;
                }

                // Buscamos os dados do grupo PRIMEIRO
                const metadata = await sock.groupMetadata(remoteJid);
                const nomeLimpo = limparNomeGrupo(metadata.subject);

                // Pega informações de quem foi marcado ou de quem a mensagem responde
                // 2. Processamento dos Handlers (Global e Específico)
                const globalHandler = require('./globalHandler');
                const foiExecutadoGlobal = await globalHandler.handle(sock, msg, texto, metadata, utils);

                if (!foiExecutadoGlobal) {
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
                console.error("Erro no fluxo principal:", e);
            }
        }
    });
}

iniciarBot();

const http = require('http');
const PORT = process.env.PORT || 10000; // Render usa a 10000 por padrão

const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot Online');
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Monitor de porta rodando na porta ${PORT}`);
});
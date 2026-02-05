const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal'); // Biblioteca para mostrar o QR no terminal
const utils = require('./utils'); // Importa as funções comuns

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

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;

        const remoteJid = msg.key.remoteJid;
        const texto = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
        
        // 1. Verificação Global: É um comando?
        if (!texto.startsWith('$')) return;

        // 2. Verificação de Permissão: Esse usuário pode usar o bot?
        const autorizado = utils.temPermissao(msg);
        
        // Se você quiser que o bot responda APENAS a você e aos admins:
        if (!autorizado && !liberado) {
            // Opcional: enviar mensagem de erro
            // await sock.sendMessage(remoteJid, { text: "❌ Você não tem permissão para usar este bot." }, { quoted: msg });
            return; 
        }

        if (remoteJid.endsWith('@g.us')) {
            const comandoBase = texto.split(' ')[0].toLowerCase();

            // Se o comando for $reload, limpamos o cache de tudo
            if (comandoBase === '$reload' && msg.key.fromMe) {
                utils.recarregarModulo('./globalHandler');
                // Você também pode limpar o cache de todos os arquivos na pasta grupos se quiser
                await sock.sendMessage(remoteJid, { text: "✅ Módulos recarregados com sucesso!" });
                return;
            }

            try {
                const metadata = await sock.groupMetadata(remoteJid);
                // const nomeLimpo = limparNomeGrupo(metadata.subject);
                const globalHandler = require('./globalHandler');

                const foiExecutadoGlobal = await globalHandler.handle(sock, msg, texto, metadata, utils);

                // Tenta carregar o handler do grupo
                // 2. Se NÃO foi um comando global, aí procuramos o arquivo específico do grupo
                if (!foiExecutadoGlobal) {
                    const nomeLimpo = limparNomeGrupo(metadata.subject);
                    try {
                        const handlerEspecifico = require(`./grupos/${nomeLimpo}`);
                        await handlerEspecifico.handle(sock, msg, texto, metadata, utils);
                    } catch (err) {
                        // Se não houver handler específico, tenta o padrão
                        try {
                            const padrao = require('./grupos/padrao');
                            await padrao.handle(sock, msg, texto, metadata, utils);
                        } catch (e) {
                            // Se nem o padrão existir, não faz nada
                        }
                    }
                }

                // 3. Chama o handler passando as funções de utils se precisar
                handler.handle(sock, msg, texto, metadata, utils);
                
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
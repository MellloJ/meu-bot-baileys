const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal'); // Biblioteca para mostrar o QR no terminal

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

    // 5. Ouvir Mensagens Chegando
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];


        try {
            const metadata = await sock.groupMetadata(remoteJid);
            const nome = metadata.subject;
        } catch (e) {
            const nome = "Desconhecido";
            console.log("Não consegui pegar o nome, talvez o bot saiu do grupo.");
        }

        if (!msg.key.fromMe && !nome == "$teste") return; // Processa apenas mensagens enviadas por mim ou no grupo de teste (para testes)

        if (!msg.message) return; // Se não tem conteúdo, ignora
        if (msg.key.remoteJid === 'status@broadcast') return; // Ignora status/stories

        // Detecta se é texto comum ou legenda de imagem/vídeo
        const tipoMensagem = Object.keys(msg.message)[0];
        const texto = 
            tipoMensagem === 'conversation' ? msg.message.conversation :
            tipoMensagem === 'imageMessage' ? msg.message.imageMessage.caption :
            tipoMensagem === 'videoMessage' ? msg.message.videoMessage.caption :
            tipoMensagem === 'extendedTextMessage' ? msg.message.extendedTextMessage.text :
            '';

        // Verificação de segurança: se o texto for nulo ou indefinido, ignora
        if (!texto) return;

        // Configurações básicas
        const prefixo = '$'; // O caractere que inicia comandos
        
        // Verifica se é um comando
        if (!texto.startsWith(prefixo)) return;

        const remoteJid = msg.key.remoteJid;
        const isGroup = remoteJid.endsWith('@g.us'); // Verifica se é grupo
        
        // Separa comando dos argumentos. Ex: "$hidetag olá" vira comando="hidetag", args=["olá"]
        const args = texto.trim().split(/ +/);
        const command = args.shift().toLowerCase().substring(prefixo.length);
        const conteudo = args.join(" ");

        console.log(`Comando recebido: ${command} de ${remoteJid}`);

        // if (!msg.key.fromMe) return; // Ignora mensagens de outros usuários

        try {
            switch (command) {
                case 'ping':
                    await sock.sendMessage(remoteJid, { text: 'Pong! 🏓 O Bot está on!' }, { quoted: msg });
                    break;

                case 'menu':
                    await sock.sendMessage(remoteJid, { 
                        text: '🤖 *Menu do Bot*\n\n$ping - Testa se estou online\n$hidetag <msg> - Marca todos do grupo\n$id - Mostra o ID do chat' 
                    }, { quoted: msg });
                    break;
                
                case 'id':
                     await sock.sendMessage(remoteJid, { text: `ID: ${remoteJid}` }, { quoted: msg });
                     break;

                case 'hidetag':
                    // Verifica se está em um grupo
                    if (!isGroup) {
                        return await sock.sendMessage(remoteJid, { text: '❌ Este comando só funciona em grupos.' }, { quoted: msg });
                    }

                    // Verifica se o usuário mandou alguma mensagem junto
                    const msgHidetag = conteudo || '⚠ Atenção a todos!';

                    // Pega os metadados do grupo (para ter a lista de membros)
                    const groupMetadata = await sock.groupMetadata(remoteJid);
                    const participantes = groupMetadata.participants.map(p => p.id);

                    // Envia a mensagem marcando todos "escondido"
                    await sock.sendMessage(remoteJid, {
                        text: msgHidetag,
                        mentions: participantes // Aqui está o segredo do hidetag
                    });
                    break;

                case 'teste':
                    await sock.sendMessage(remoteJid, { text: 'Comando de teste funcionando!' }, { quoted: msg });
                    break;
                default:
                    // Comando não existe
                    // await sock.sendMessage(remoteJid, { text: 'Comando não encontrado.' });
                    break;
            }
        } catch (erro) {
            console.error("Erro ao processar comando:", erro);
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
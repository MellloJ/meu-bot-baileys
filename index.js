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
        if (!autorizado || liberado) {
            // Opcional: enviar mensagem de erro
            // await sock.sendMessage(remoteJid, { text: "❌ Você não tem permissão para usar este bot." }, { quoted: msg });
            return; 
        }

        if (remoteJid.endsWith('@g.us')) {
            const comandoBase = texto.split(' ')[0].toLowerCase();

            // Se o comando for !reload, limpamos o cache de tudo
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

    // 5. Ouvir Mensagens Chegando
    // sock.ev.on('messages.upsert', async ({ messages }) => {
    //     const msg = messages[0];
    //     const remoteJid = msg.key.remoteJid;
    //     const isGroup = remoteJid.endsWith('@g.us');
    //     // const texto = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
    //     const texto = 
    //         tipoMensagem === 'conversation' ? msg.message.conversation :
    //         tipoMensagem === 'imageMessage' ? msg.message.imageMessage.caption :
    //         tipoMensagem === 'videoMessage' ? msg.message.videoMessage.caption :
    //         tipoMensagem === 'extendedTextMessage' ? msg.message.extendedTextMessage.text :
    //         '';

    //     if (isGroup && texto.startsWith('$')) {
    //         try {
    //             const metadata = await sock.groupMetadata(remoteJid);
                
    //             // Aqui aplicamos a limpeza
    //             const nomeLimpo = limparNomeGrupo(metadata.subject); 
    //             console.log(`Nome original: ${metadata.subject} | Nome limpo: ${nomeLimpo}`);

    //             try {
    //                 // Tenta carregar o arquivo (ex: ./grupos/vendas_2024.js)
    //                 const handler = require(`./grupos/${nomeLimpo}`);
    //                 handler.handle(sock, msg, texto, metadata);
    //             } catch (err) {
    //                 // Se o arquivo não existir, usa um handler padrão
    //                 console.log(`Nenhum handler específico para: ${nomeLimpo}. Usando padrão.`);
    //                 const defaultHandler = require('./grupos/padrao');
    //                 defaultHandler.handle(sock, msg, texto, metadata);
    //             }

    //         } catch (e) {
    //             console.error("Erro ao processar grupo:", e);
    //         }
    //     }


    //     // try {
    //     //     const metadata = await sock.groupMetadata(remoteJid);
    //     //     const nome = metadata.subject;
    //     // } catch (e) {
    //     //     const nome = "Desconhecido";
    //     //     console.log("Não consegui pegar o nome, talvez o bot saiu do grupo.");
    //     // }

    //     if (!msg.key.fromMe && !nome == "$teste") return; // Processa apenas mensagens enviadas por mim ou no grupo de teste (para testes)

    //     if (!msg.message) return; // Se não tem conteúdo, ignora
    //     if (msg.key.remoteJid === 'status@broadcast') return; // Ignora status/stories

    //     // Detecta se é texto comum ou legenda de imagem/vídeo
    //     const tipoMensagem = Object.keys(msg.message)[0];
    //     // const texto = 
    //     //     tipoMensagem === 'conversation' ? msg.message.conversation :
    //     //     tipoMensagem === 'imageMessage' ? msg.message.imageMessage.caption :
    //     //     tipoMensagem === 'videoMessage' ? msg.message.videoMessage.caption :
    //     //     tipoMensagem === 'extendedTextMessage' ? msg.message.extendedTextMessage.text :
    //     //     '';

    //     // Verificação de segurança: se o texto for nulo ou indefinido, ignora
    //     if (!texto) return;

    //     // Configurações básicas
    //     const prefixo = '$'; // O caractere que inicia comandos
        
    //     // Verifica se é um comando
    //     if (!texto.startsWith(prefixo)) return;

    //     // const remoteJid = msg.key.remoteJid;
    //     // const isGroup = remoteJid.endsWith('@g.us'); // Verifica se é grupo
        
    //     // Separa comando dos argumentos. Ex: "$hidetag olá" vira comando="hidetag", args=["olá"]
    //     const args = texto.trim().split(/ +/);
    //     const command = args.shift().toLowerCase().substring(prefixo.length);
    //     const conteudo = args.join(" ");

    //     console.log(`Comando recebido: ${command} de ${remoteJid}`);

    //     // if (!msg.key.fromMe) return; // Ignora mensagens de outros usuários

    //     try {
    //         switch (command) {
    //             case 'ping':
    //                 await sock.sendMessage(remoteJid, { text: 'Pong! 🏓 O Bot está on!' }, { quoted: msg });
    //                 break;

    //             case 'menu':
    //                 await sock.sendMessage(remoteJid, { 
    //                     text: '🤖 *Menu do Bot*\n\n$ping - Testa se estou online\n$hidetag <msg> - Marca todos do grupo\n$id - Mostra o ID do chat' 
    //                 }, { quoted: msg });
    //                 break;
                
    //             case 'id':
    //                  await sock.sendMessage(remoteJid, { text: `ID: ${remoteJid}` }, { quoted: msg });
    //                  break;

    //             case 'hidetag':
    //                 // Verifica se está em um grupo
    //                 if (!isGroup) {
    //                     return await sock.sendMessage(remoteJid, { text: '❌ Este comando só funciona em grupos.' }, { quoted: msg });
    //                 }

    //                 // Verifica se o usuário mandou alguma mensagem junto
    //                 const msgHidetag = conteudo || '⚠ Atenção a todos!';

    //                 // Pega os metadados do grupo (para ter a lista de membros)
    //                 const groupMetadata = await sock.groupMetadata(remoteJid);
    //                 const participantes = groupMetadata.participants.map(p => p.id);

    //                 // Envia a mensagem marcando todos "escondido"
    //                 await sock.sendMessage(remoteJid, {
    //                     text: msgHidetag,
    //                     mentions: participantes // Aqui está o segredo do hidetag
    //                 });
    //                 break;

    //             case 'teste':
    //                 await sock.sendMessage(remoteJid, { text: 'Comando de teste funcionando!' }, { quoted: msg });
    //                 break;
    //             default:
    //                 // Comando não existe
    //                 // await sock.sendMessage(remoteJid, { text: 'Comando não encontrado.' });
    //                 break;
    //         }
    //     } catch (erro) {
    //         console.error("Erro ao processar comando:", erro);
    //     }
    // });
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
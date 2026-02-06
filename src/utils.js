// utils.js
const config = require('./config');

// Lista de números que são "Super Admins" (coloque o número com o código do país)
const ADMINS_EXTERNOS = ['5563991192094@s.whatsapp.net',];
const MEU_NUMERO = ['5563991192094@s.whatsapp.net',];

// IDs dos grupos onde o bot é liberado para QUALQUER UM usar
const GRUPOS_LIBERADOS = [
    '120363423834043528@g.us', // ID que você pegou com o comando $id
];

let ultimoRemovido = null;

module.exports = {
    // Verifica se quem enviou tem permissão total
    temPermissao(msg) {
        const usuarioId = msg.key.participant || msg.key.remoteJid;
        
        // 1. É o próprio número do bot?
        if (msg.key.fromMe) return true;

        // 2. Está na lista de números específicos?
        if (ADMINS_EXTERNOS.includes(usuarioId)) return true;

        // 3. É você?
        if (MEU_NUMERO.includes(usuarioId)) return true;

        return false;
    },

    // Verifica se é admin do grupo ou se é você
    // isAdmin(msg, metadata) {
    //     const usuarioId = msg.key.participant || msg.key.remoteJid;
        
    //     // Se for você, sempre retorna true
    //     if (msg.key.fromMe || usuarioId === MEU_NUMERO) return true;

    //     // Verifica na lista de participantes do grupo
    //     const participante = metadata.participants.find(p => p.id === usuarioId);
    //     return participante && (participante.admin === 'admin' || participante.admin === 'superadmin');
    // },

    ehSuperAdmin(msg) {
        const usuarioId = msg.key.participant || msg.key.remoteJid;
        return msg.key.fromMe || config.SUPER_ADMINS.includes(usuarioId);
    },

    // A GRANDE VALIDAÇÃO
    podeResponder(remoteJid, msg) {
        // 1. Se for Super Admin, ignora qualquer trava e responde sempre
        if (this.ehSuperAdmin(msg)) return true;

        // 2. Se o bot estiver totalmente desativado
        if (config.STATUS_BOT === 'DESATIVADO') return false;

        // 3. Se for mensagem privada (DM), você decide se libera ou não
        if (!remoteJid.endsWith('@g.us') && config.RESPONDER_PV) return true; 

        // 4. Lógica de Grupos
        if (config.STATUS_BOT === 'TODOS') return true;

        if (config.STATUS_BOT === 'APENAS_LISTA') {
            return config.GRUPOS_AUTORIZADOS.includes(remoteJid);
        }

        return false;
    },

    ehGrupoPlus(remoteJid) {
        return config.GRUPOS_PLUS.includes(remoteJid);
    },

    // Mantém sua função isAdmin para comandos de moderação ($kill, $hidetag)
    isAdmin(msg, metadata) {
        const remoteJid = msg.key.remoteJid;
        const usuarioId = msg.key.participant || remoteJid;

        // 1. Se for Super Admin, é admin em tudo
        if (this.ehSuperAdmin(msg)) return true;

        // 2. SE O GRUPO FOR PLUS, TODOS SÃO ADMINS
        if (this.ehGrupoPlus(remoteJid)) return true;

        // 3. Verificação normal de administrador do WhatsApp
        const participante = metadata.participants.find(p => p.id === usuarioId);
        return participante && (participante.admin === 'admin' || participante.admin === 'superadmin');
    },

    // Verifica se o grupo atual está na lista de liberados
    grupoEhLiberado(remoteJid) {
        return GRUPOS_LIBERADOS.includes(remoteJid);
    },

    async hidetag(sock, jid, texto, metadata) {
        const participantes = metadata.participants.map(p => p.id);
        await sock.sendMessage(jid, { 
            text: texto || '📢 Atenção!', 
            mentions: participantes 
        });
    },

    // Converte milissegundos ou segundos em "1h 2min 3s"
    // Transforma segundos em "X min e Y seg"
    formatarTempo(segundosTotal) {
        const m = Math.floor((segundosTotal % 3600) / 60);
        const s = Math.floor(segundosTotal % 60);

        let res = "";
        if (m > 0) res += `${m} min `;
        res += `${s} seg`;
        
        return res.trim();
    },

    // Transforma ms em algo legível (ex: para latência alta)
    formatarLatencia(ms) {
        if (ms < 1000) return `${ms}ms`;
        const seg = (ms / 1000).toFixed(2);
        return `${seg}s`;
    },

    // Função para limpar o cache do require e recarregar um arquivo
    recarregarModulo(caminho) {
        const resolvido = require.resolve(caminho);
        delete require.cache[resolvido];
        return require(caminho);
    },

    setUltimoRemovido(id) {
        ultimoRemovido = id;
    },

    getUltimoRemovido() {
        return ultimoRemovido;
    },

    // Limpa o número digitado para o formato do WhatsApp
    formatarNumero(texto) {
        let num = texto.replace(/\D/g, ''); // Remove tudo que não é número
        if (!num.startsWith('55')) num = '55' + num; // Adiciona o código do Brasil se não tiver
        return num + '@s.whatsapp.net';
    },

    // Você pode adicionar outras funções comuns aqui
    // delay(ms) {
    //     return new Promise(resolve => setTimeout(resolve, ms));
    // }
};
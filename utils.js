// utils.js

// Lista de números que são "Super Admins" (coloque o número com o código do país)
const ADMINS_EXTERNOS = ['5563991192094@s.whatsapp.net',];
const MEU_NUMERO = ['5563991192094@s.whatsapp.net',];

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
    isAdmin(msg, metadata) {
        const usuarioId = msg.key.participant || msg.key.remoteJid;
        
        // Se for você, sempre retorna true
        if (msg.key.fromMe || usuarioId === MEU_NUMERO) return true;

        // Verifica na lista de participantes do grupo
        const participante = metadata.participants.find(p => p.id === usuarioId);
        return participante && (participante.admin === 'admin' || participante.admin === 'superadmin');
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

    // Você pode adicionar outras funções comuns aqui
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};
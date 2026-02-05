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
    formatarTempo(segundos) {
        const h = Math.floor(segundos / 3600);
        const m = Math.floor((segundos % 3600) / 60);
        const s = Math.floor(segundos % 60);

        const partes = [];
        if (h > 0) partes.push(`${h}h`);
        if (m > 0) partes.push(`${m}min`);
        if (s > 0) partes.push(`${s}s`);

        return partes.join(' ') || '0s';
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
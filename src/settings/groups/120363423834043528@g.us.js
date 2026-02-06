// src/settings/groups/120363123456789@g.us.js (Exemplo de Grupo VIP)
module.exports = {
    nome: "Grupo VIP  - Testes",
    comandosBloqueados: [],
    funcoesExtras: {
        autoBemVindo: true,
        filtroLinks: true
    },
    // Comandos que só existem NESTE grupo
    customCommands: {
        regras: async (sock, msg) => {
            await sock.sendMessage(msg.key.remoteJid, { text: "📜 Regras do Grupo: 1. Não spammar..." });
        }
    }
};
// src/commands/ConfigCommand.js
const groupManager = require('../services/GroupManager');
const AdminCommands = require('./AdminCommands');

class ConfigCommand extends AdminCommands {
    constructor() {
        super('config', 'Configura funções do grupo (link, welcome, texto)');
    }

    async handleAdmin(sock, msg, context, metadata, utils) {
        const { remoteJid } = msg.key;
        const { args, conteudo } = context;
        const subComando = args[0]?.toLowerCase();

        const config = groupManager.getGroupConfig(remoteJid);

        switch (subComando) {
            case 'link':
                config.funcoesExtras.filtroLinks = !config.funcoesExtras.filtroLinks;
                await sock.sendMessage(remoteJid, { text: `🔗 Filtro de links: ${config.funcoesExtras.filtroLinks ? '✅ ATIVADO' : '❌ DESATIVADO'}` });
                break;

            case 'welcome':
                config.funcoesExtras.autoBemVindo = !config.funcoesExtras.autoBemVindo;
                await sock.sendMessage(remoteJid, { text: `👋 Auto Bem-vindo: ${config.funcoesExtras.autoBemVindo ? '✅ ATIVADO' : '❌ DESATIVADO'}` });
                break;

            case 'texto':
                const novoTexto = args.slice(1).join(" ");
                if (!novoTexto) return await sock.sendMessage(remoteJid, { text: "⚠️ Digite o texto após o comando. Ex: `$config texto Bem-vindo ao nosso grupo!`" });
                
                config.funcoesExtras.mensagemBemVindo = novoTexto;
                await sock.sendMessage(remoteJid, { text: "📝 Mensagem de boas-vindas atualizada!" });
                break;

            default:
                const status = `⚙️ *CONFIGURAÇÕES DO GRUPO*\n\n` +
                               `1️⃣ *Link:* ${config.funcoesExtras.filtroLinks ? '✅' : '❌'} (Use: \`$config link\`)\n` +
                               `2️⃣ *Welcome:* ${config.funcoesExtras.autoBemVindo ? '✅' : '❌'} (Use: \`$config welcome\`)\n` +
                               `3️⃣ *Texto:* \`$config texto <mensagem>\`\n\n` +
                               `*Texto Atual:* ${config.funcoesExtras.mensagemBemVindo || 'Padrão'}`;
                await sock.sendMessage(remoteJid, { text: status });
                break;
        }

        // Salva as alterações no arquivo JSON/JS do grupo
        groupManager.saveConfig(remoteJid, config);
    }
}

module.exports = new ConfigCommand();
// src/services/GroupManager.js
const fs = require('fs');
const path = require('path');

class GroupManager {
    constructor() {
        this.basePath = path.join(__dirname, '../settings/groups');
        // Garante que a pasta de configurações exista
        if (!fs.existsSync(this.basePath)) {
            fs.mkdirSync(this.basePath, { recursive: true });
        }
    }

    // Modelo padrão para novos grupos
    getDefaultConfig(jid) {
        return {
            nome: "Grupo Novo",
            comandosBloqueados: [],
            funcoesExtras: {
                autoBemVindo: false,
                filtroLinks: false,
                mensagemBemVindo: ""
            },
            customCommands: {}
        };
    }

    getGroupConfig(jid) {
        const configPath = path.join(this.basePath, `${jid}.js`);

        if (fs.existsSync(configPath)) {
            // IMPORTANTE: Limpa o cache do require para ler a alteração do disco
            delete require.cache[require.resolve(configPath)];
            return require(configPath);
        }

        // Se não existir, cria o arquivo padrão para o grupo
        const defaultConfig = this.getDefaultConfig(jid);
        this.saveConfig(jid, defaultConfig);
        return defaultConfig;
    }

    saveConfig(jid, config) {
        const configPath = path.join(this.basePath, `${jid}.js`);
        
        // Transformamos o objeto em uma string formatada como módulo Node.js
        // Usamos JSON.stringify para formatar os dados e adicionamos o module.exports
        const content = `module.exports = ${JSON.stringify(config, null, 4)};`;
        
        try {
            fs.writeFileSync(configPath, content, 'utf8');
        } catch (error) {
            console.error(`❌ Erro ao salvar configuração do grupo ${jid}:`, error);
        }
    }

    canExecute(jid, commandName) {
        const config = this.getGroupConfig(jid);
        return !config.comandosBloqueados.includes(commandName);
    }
}

module.exports = new GroupManager();
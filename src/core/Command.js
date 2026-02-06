// core/Command.js
class Command {
    constructor(name, description) {
        this.name = name;
        this.description = description;
    }

    // Método que todo comando deve implementar (Polimorfismo)
    async execute(sock, msg, args, metadata, utils) {
        throw new Error("Método 'execute' deve ser implementado.");
    }
}
module.exports = Command;
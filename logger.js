const config = require('./config');

const { Webhook, MessageBuilder } = require('discord-webhook-node');
const hook = new Webhook(config.discordWebHookLink);

let buffer = "";

function log(message) {
    console.log(message);
    buffer += message + "\n";
}

function handle() {
    const embed = new MessageBuilder()
        .setColor('#f4a300')
        .setDescription(buffer)
        .setTimestamp();

    hook.send(embed)
        .then(() => { buffer = ""; })
        .catch(() => { console.log("[No discord]") });
}

function init() {
    setInterval(function() {
        if (buffer.length > 120) {
            handle();
        }
    }, 500);

    setInterval(function() {
        if (buffer.length > 0) {
            handle();
        }
    }, 5000);
}

module.exports = {
    log: log,
    init: init,
};
const config = require('./config');

const moment = require('moment');
const { Webhook, MessageBuilder } = require('discord-webhook-node');
const hook = new Webhook(config.discordWebHookLink);

let buffer = "";
let notifiedWebhookStopped = false;

function log(message) {
    const timeNow = moment(Date.now());
    const timeString = timeNow.tz(config.logger.timezone).format('HH:mm:ss DD.MM.YY');

    message = `[${timeString}] ` + message;

    console.log(message);
    buffer += message + "\n";
}

function notifyDiscordWebhookDontWork() {
    if (!notifiedWebhookStopped) {
        log("[ERROR] Discord webhook stopped working");
        notifiedWebhookStopped = true;
    }
}

async function handle() {
    const embed = new MessageBuilder()
        .setColor('#f4a300')
        .setDescription(buffer);

    await hook.send(embed)
        .then(() => { buffer = ""; })
        .catch(() => { notifyDiscordWebhookDontWork(); });
}

function init() {
    setInterval(function() {
        if (buffer.length >= config.logger.bufferSize) {
            handle();
        }
    }, config.logger.tickBufferMs);

    setInterval(function() {
        if (buffer.length > 0) {
            handle();
        }
    }, config.logger.tickPermanentMs);
}

module.exports = {
    log: log,
    init: init,
};
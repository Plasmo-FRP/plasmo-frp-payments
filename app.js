const config = require('./config');
const logger = require('./logger');
const database = require('./database');
const donationAlerts = require('./donationalerts');
const HealthCheck = require("./healthcheck").HealthCheck;
const { Rcon } = require('rcon-client');
const { Sequelize } = require("sequelize");

// Logger
logger.init();

// Donation Alerts
const da = new donationAlerts.DonationAlerts(config.donationAlerts.token);

// Database
const db = new database.Database(new Sequelize('', '', '', { dialect: 'sqlite', storage: 'app.db', logging: false }));

// Rcon
const rcon = new Rcon({
    host: config.rcon.host,
    port: config.rcon.port,
    password: config.rcon.pass
});

// Health check
const hc = new HealthCheck(db.sequelize, db, da);
hc.perform().then(() => { logger.log("[Info] Health check completed"); });

return;

async function addToWhitelistAsync(username) {
    let bakedCommand = config.whitelistCommand.replace("${user}", username);
    await rcon.connect();
    let res = await rcon.send(bakedCommand);
    await rcon.end();
    return res;
}

async function handleDonationEntry(data) {
    let entryExist = await db.IsEntryExistByDaIdAsync(data.id);
    if (!entryExist) {
        if (Date.parse(data.created_at) >= Date.parse(config.filters.minDate)) {
            if (data.currency === 'RUB' && parseInt(data.amount) >= config.filters.minPriceRub && parseInt(data.amount) <= config.filters.maxPriceRub) {
                if (!config.filters.recipient.enabled || (config.filters.recipient.enabled && config.filters.recipient.value === data.recipient_name)) {
                    let message = "";
                    if (data.message_type === 'text') {
                        message = data.message;
                    }

                    logger.log("[INFO] Incoming payment. New entry has been added to the DB.");
                    await db.NewEntryAsync(data.id, data.username, message, data.amount);
                }
            }
        }
    }
}

async function init() {
    let entries = [];
    await da.getAllDonationPages()
        .then((res) => { entries = res; })
        .catch((err) => { logger.log(`[ERROR] Initialization error. Unable to get all donation pages: ${err}`); });
    for (const el of entries) {
        await handleDonationEntry(el);
    }
}

async function poll() {
    // Add to DB
    da.getDonationPage()
        .then((res) => {
            for (const el of res.data) {
                handleDonationEntry(el);
            }
    })
        .catch((err) => {
            logger.log(`[ERROR] Poll error, DB failed: ${err}`);
        });

    // Whitelist
    let entriesNotWhitelisted = [];
    await db.FindAllNotWhitelisted()
        .then((res) => {
            entriesNotWhitelisted = res;
        })
        .catch((err) => {
            logger.log(`[ERROR] Poll error, DB failed to find all: ${err}`);
        });

    for (const el of entriesNotWhitelisted) {
        await addToWhitelistAsync(el.username)
            .then(() => {
                logger.log(`[INFO] Rcon added user ${el.username}`);
                db.UpdateEntryWhitelistByDaIdAsync(el.daId, true)
                    .then(() => { logger.log(`[INFO] User updated ${el.username}`); })
                    .catch((err) => {
                        logger.log(`[ERROR] DB error, unable to update user ${el.username} : ${err}`);
                    });
            })
            .catch((err) => {
                logger.log(`[ERROR] Rcon error, unable to add user ${el.username} : ${err}`);
            });
    }
}

// Run
init();
logger.log("[INFO] Start polling");
setInterval(function(){
    poll();
}, 5000);

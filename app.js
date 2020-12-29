const config = require('./config');

const { Rcon } = require('rcon-client');
const axios = require('axios');

// Rcon
const rcon = new Rcon({
    host: config.rcon.host,
    port: config.rcon.port,
    password: config.rcon.pass
});

// Init SQLite3
const { Sequelize, Model, DataTypes } = require('sequelize');
const sequelize = new Sequelize('', '', '', {
    dialect: 'sqlite',
    storage: 'app.db',
    logging: false
});

class Payment extends Model {}
Payment.init({
    daId: DataTypes.STRING,
    username: DataTypes.STRING,
    message: DataTypes.STRING,
    rub: DataTypes.FLOAT,
    whitelisted: DataTypes.BOOLEAN,
}, { sequelize, modelName: 'payment' });
sequelize.sync()
    .then(() => { console.log("[DB] Table init completed"); })
    .catch(() => { console.log("[DB] Table init fault"); });

async function healthCheck() {
    console.log("[INFO] Performing health check");

    // SQLite3
    try {
        await Payment.create({
            username: "healthcheck#__test_username__",
            rub: 0,
            whitelisted: true,
        });
        await Payment.destroy({
            where: {
                username: "healthcheck#__test_username__",
                rub: 0,
            }
        });

        console.log("[OK] DB");
    }
    catch {
        console.log("[FAULT] DB");
    }

    // Donation alerts
    await axios.get('https://www.donationalerts.com/api/v1/alerts/donations', {
        headers: {
            'Authorization': `Bearer ${config.donationAlerts.token}`
        }
    })
        .then(function (response) {
            if (response.status === 200) {
                console.log("[OK] DonationAlerts");
            }
            else {
                console.log("[FAULT] DonationAlerts");
            }
        })
        .catch(function (error) {
            console.log("[FAULT] DonationAlerts");
        });

    try {
        await rcon.connect();
        let res = await rcon.send("list");
        await rcon.end();
        console.log("[OK] Rcon");
    }
    catch {
        console.log("[FAULT] Rcon");
    }

    console.log("[INFO] Health check completed");
}

async function dbIsEntryExistByDaIdAsync(daId) {
    try {
        let res = await Payment.findOne({
            where: {
                daId: daId,
            }
        });
        return res != null;
    }
    catch (err) {
        console.log(`[DB] Exception caught when tried to find an entry: ${err}`);
        return false;
    }
}

async function dbIsEntryExistByUsernameAsync(username) {
    try {
        let res = await Payment.findOne({
            where: {
                username: username,
            }
        });
        return res != null;
    }
    catch (err) {
        console.log(`[DB] Exception caught when tried to find an entry: ${err}`);
        return false;
    }
}

async function dbNewEntryAsync(daId, username, message, rub) {
    try {
        await Payment.create({
            daId: daId,
            username: username,
            message: message,
            rub: rub,
            whitelisted: false,
        });
        return true;
    }
    catch (err) {
        console.log(`[DB] Failed to create an entry: ${err}`);
        return false;
    }
}

async function dbUpdateEntryWhitelistByUsernameAsync(username, whitelisted) {
    try {
        await Payment.update(
            {
                whitelisted: whitelisted,
            },
            { where: {username: username} }
        );
        return true;
    }
    catch (err) {
        console.log(`[DB] Failed to update an entry: ${err}`);
        return false;
    }
}

async function dbUpdateEntryWhitelistByDaIdAsync(daId, whitelisted) {
    try {
        await Payment.update(
            {
                whitelisted: whitelisted,
            },
            { where: {daId: daId} }
        );
        return true;
    }
    catch (err) {
        console.log(`[DB] Failed to update an entry: ${err}`);
        return false;
    }
}

async function dbFindAllNotWhitelisted() {
    try {
        let res = await Payment.findAll({
            where: {
                whitelisted: false,
            }
        });
        return res;
    }
    catch (err) {
        console.log(`[ERROR] poll fault, cant find all: ${err}`);
        return false;
    }
}

// async function dbGetMoneyMadeByHoursAsync(hours) {
//     try {
//         await Payment.findAll({where: createdAt: ... > 211222})
//         return true;
//     }
//     catch (err) {
//         console.log(`[DB] Failed return money made: ${err}`);
//         return false;
//     }
// }

async function addToWhitelistAsync(username) {
    let bakedCommand = config.whitelistCommand.replace("${user}", username);
    await rcon.connect();
    let res = await rcon.send(bakedCommand);
    await rcon.end();
    return res;
}

async function checkIsWhitelistedAsync(username) {
    try {
        let res = await Payment.find(
            { where: { username: username} }
        );
        return res.whitelisted;
    }
    catch (err) {
        console.log(`[DB] Failed find an entry: ${err}`);
        return false;
    }
}

async function getDonationPage(page = 1) {
    try {
        let res = await axios.get(`https://www.donationalerts.com/api/v1/alerts/donations?page=${page}`, {
            headers: {
                'Authorization': `Bearer ${config.donationAlerts.token}`
            }
        });
        return res.data;
    }
    catch {
        return null;
    }
}

async function getAllDonationPages() {
    let res = [];

    let page1 = await getDonationPage(1);
    page1.data.forEach(el => {
        res.push(el);
    });

    for (let i = 2; i <= page1.meta.last_page; i++) {
        let page = await getDonationPage(i);
        page.data.forEach(el => {
            res.push(el);
        });
    }

    return res;
}

async function handleDonationEntry(data) {
    let entryExist = await dbIsEntryExistByDaIdAsync(data.id);
    if (!entryExist) {
        if (data.recipient_name === 'plasmofrp' && data.currency === 'RUB' && parseFloat(data.amount) >= parseFloat(config.minPriceRub)) {
            let message = "";
            if (data.message_type === 'text') {
                message = data.message;
            }

            console.log("[INFO] Adding new entry");
            await dbNewEntryAsync(data.id, data.username, message, data.amount);
        }
    }
}

async function init() {
    let entries = [];
    await getAllDonationPages()
        .then((res) => { entries = res; console.log('[OK] init ok'); })
        .catch((err) => { console.log(`[ERROR] init fault: ${err}`); });
    for (const el of entries) {
        await handleDonationEntry(el);
    }
}

async function poll() {
    // Add to DB
    getDonationPage()
        .then((res) => {
            for (const el of res.data) {
                handleDonationEntry(el);
            }
    })
        .catch((err) => {
            console.log(`[ERROR] poll fault, db add error: ${err}`);
        });

    // Whitelist
    let entriesNotWhitelisted = [];
    await dbFindAllNotWhitelisted()
        .then((res) => {
            entriesNotWhitelisted = res;
        })
        .catch((err) => {
            console.log(`[ERROR] poll fault, db find all error: ${err}`);
        });

    for (const el of entriesNotWhitelisted) {
        await addToWhitelistAsync(el.username)
            .then(() => {
                console.log(`[INFO] Rcon add user ${el.username}`);
                dbUpdateEntryWhitelistByDaIdAsync(el.daId, true)
                    .then(() => { console.log(`[INFO] User updated ${el.username}`); })
                    .catch((err) => {
                        console.log(`[ERROR] db fault, unable to update user ${el.username} : ${err}`);
                    });
            })
            .catch((err) => {
                console.log(`[ERROR] rcon fault, unable to add user ${el.username} : ${err}`);
            });
    }
}

// Run
healthCheck();
init();
console.log("[INFO] Start polling");
setInterval(function(){
    poll();
}, 5000);

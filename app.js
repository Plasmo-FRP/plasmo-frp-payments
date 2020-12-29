const config = require('./config');

const { Rcon } = require('rcon-client');
const querystring = require('querystring');
const request = require('request');
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
    storage: 'app.db'
});

class Payment extends Model {}
Payment.init({
    username: DataTypes.STRING,
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

// (async () => {
//     await sequelize.sync();
//     const jane = await Payment.create({
//         username: '#test_payment',
//         rub: 22.8,
//         whitelisted: false,
//     });
//     console.log(jane.toJSON());
// })();

async function dbNewEntryAsync(username) {
    try {
        await Payment.create({
            username: username,
            rub: config.minPriceRub,
            whitelisted: false,
        });
        return true;
    }
    catch (err) {
        console.log(`[DB] Failed to create an entry: ${err}`);
        return false;
    }
}

async function dbUpdateEntryAsync(username, whitelisted) {
    try {
        await Payment.update(
            {
                username: username,
                rub: config.minPriceRub,
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

function pollApi() {
    //print(donation.get(10));
}

//pollApi();

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

function getAllDonationPages() {
    // allData
    // lastPage
    // while last page concat data
    // return res or null
}

// addToWhitelistAsync("Homosanians")
//     .then((res) => {
//         console.log(`[Rcon] User added to whitelist: ${res}`);
//         // TODO upd db
//     })
//     .catch((err) => { console.log(`[Rcon] Connection failed: ${err}`); });

// poll api every sec

// GET ALL PAGES ON START
// GET LATEST PAGE EVERY n-SEC
// ADD ALL UNFINDED TO DB
// ALL NOT WHITELISTED, WHITELIST

//healthCheck();

// Run
healthCheck();
getDonationPage().then((e) => { console.log(e); });
setInterval(function(){

}, 1000);

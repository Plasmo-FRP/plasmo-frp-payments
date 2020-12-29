const config = require('./config');
const logger = require('./logger');
const axios = require('axios');
const { Rcon } = require('rcon-client');

class HealthCheck {
    constructor(sequelize, db, da) {
        this.sequelize = sequelize;
        this.db = db;
        this.da = da;
    }

    async perform() {
        logger.log(`[INFO] Performing health check`);
        let result = true;

        await this.checkDb().then((res) => {
            if (res) {
                logger.log(`[OK] DB`);
            } else {
                logger.log(`[FAULT] DB`);
                result = false;
            }
        });

        await this.checkDonationAlerts().then((res) => {
            if (res) {
                logger.log(`[OK] Donation Alerts`);
            } else {
                logger.log(`[FAULT] Donation Alerts`);
                result = false;
            }
        });

        await this.checkRcon().then((res) => {
            if (res) {
                logger.log(`[OK] Rcon`);
            } else {
                logger.log(`[FAULT] Rcon`);
                result = false;
            }
        });

        return result;
    }

    async checkDb() {
        try {
            await this.db.Payment.create({
                username: "healthcheck#__test_username__",
                rub: 0,
                whitelisted: true,
            });
            await this.db.Payment.destroy({
                where: {
                    username: "healthcheck#__test_username__",
                    rub: 0,
                }
            });

            return true;
        }
        catch {
            return false;
        }
    }

    async checkDonationAlerts() {
        await this.da.getDonationPage()
            .then((res) => { return res !== null; })
            .catch((e) => { console.log(e); return false; });
    }

    async checkRcon() {
        const rcon = new Rcon({
            host: config.rcon.host,
            port: config.rcon.port,
            password: config.rcon.pass
        });
        let res = true;
        try {
            rcon.connect().catch(() => { res = false; });
            await rcon.send("list").catch(() => { res = false; });
            rcon.end().catch(() => { res = false; });
            return res;
        }
        catch {
            return false;
        }
    }
}

module.exports = {
    HealthCheck: HealthCheck,
};

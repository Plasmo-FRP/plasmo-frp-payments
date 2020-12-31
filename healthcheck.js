const logger = require('./logger');
const database = require('./database');

class HealthCheck {
    constructor(config) {
        this.db = config.db;
        this.da = config.da;
        this.rcon = config.rcon;
    }

    perform() {
        logger.log(`[INFO] Health check started`);
        let result = true;

        this.checkDb().then((res) => {
            if (res) {
                logger.log(`[OK] DB`);
            } else {
                logger.log(`[FAULT] DB`);
                result = false;
            }
        });

        this.checkDonationAlerts().then((res) => {
            if (res) {
                logger.log(`[OK] Donation Alerts`);
            } else {
                logger.log(`[FAULT] Donation Alerts`);
                result = false;
            }
        });

        this.checkRcon().then((res) => {
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
            await database.Payment.create({
                username: "healthcheck#__test_username__",
                rub: 0,
                whitelisted: true,
            });
            await database.Payment.destroy({
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
        try {
            let res = await this.da.getDonationPage();
            return res !== null;
        }
        catch {
            return false;
        }
    }

    async checkRcon() {
        let res = true;
        try {
            await this.rcon.connect();
            await this.rcon.send("list");
            await this.rcon.end();
            return res;
        }
        catch(e) {
            console.log(e);
            return false;
        }
    }
}

module.exports = {
    HealthCheck: HealthCheck,
};

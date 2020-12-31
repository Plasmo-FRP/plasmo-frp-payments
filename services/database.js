const logger = require('./logger');
const { Sequelize, Model, DataTypes } = require('sequelize');

class Payment extends Model {}

class Database {
    constructor(sequelize = new Sequelize('', '', '', { dialect: 'sqlite', storage: 'app.db', logging: false })) {
        this.sequelize = sequelize;

        Payment.init({
            daId: DataTypes.STRING,
            username: DataTypes.STRING,
            message: DataTypes.STRING,
            rub: DataTypes.FLOAT,
            whitelisted: DataTypes.BOOLEAN,
        }, { sequelize, modelName: 'payment' });

        sequelize.sync()
            .then(() => { logger.log("[INFO] DB, Table init completed"); })
            .catch(() => { logger.log("[INFO] DB, Table init fault"); });
    }

    async IsEntryExistByDaIdAsync(daId) {
        try {
            let res = await Payment.findOne({
                where: {
                    daId: daId,
                }
            });
            return res != null;
        }
        catch (err) {
            logger.log(`[ERROR] DB error, exception caught when tried to find an entry: ${err}`);
            return false;
        }
    }

    async IsEntryExistByUsernameAsync(username) {
        try {
            let res = await Payment.findOne({
                where: {
                    username: username,
                }
            });
            return res != null;
        }
        catch (err) {
            logger.log(`[ERROR] DB error, exception caught when tried to find an entry: ${err}`);
            return false;
        }
    }

    async NewEntryAsync(daId, username, message, rub) {
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
            logger.log(`[ERROR] DB error, failed to create an entry: ${err}`);
            return false;
        }
    }

    async UpdateEntryWhitelistByUsernameAsync(username, whitelisted) {
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
            logger.log(`[ERROR] DB error, failed to update an entry: ${err}`);
            return false;
        }
    }

    async UpdateEntryWhitelistByDaIdAsync(daId, whitelisted) {
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
            logger.log(`[ERROR] DB error, failed to update an entry: ${err}`);
            return false;
        }
    }

    async FindAllNotWhitelisted() {
        try {
            let res = await Payment.findAll({
                where: {
                    whitelisted: false,
                }
            });
            return res;
        }
        catch (err) {
            logger.log(`[ERROR] Poll error, failed to find all: ${err}`);
            return false;
        }
    }

// async function GetMoneyMadeByHoursAsync(hours) {
//     try {
//         await Payment.findAll({where: createdAt: ... > 211222})
//         return true;
//     }
//     catch (err) {
//         logger.log(`[DB] Failed return money made: ${err}`);
//         return false;
//     }
// }

    async IsWhitelistedAsync(username) {
        try {
            let res = await Payment.find(
                { where: { username: username} }
            );
            return res.whitelisted;
        }
        catch (err) {
            logger.log(`[ERROR] DB error, failed find an entry: ${err}`);
            return false;
        }
    }
}

module.exports = {
    Payment: Payment,
    Database: Database,
};
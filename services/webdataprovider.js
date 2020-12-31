const logger = require('./logger');
const express = require('express');

class WebDataProvider {
    constructor(config) {
        this.db = config.db;

        this.app = express();
    }

    async listen(port) {
        this.app.get('/', function (req, res) {
            res.send('Hello.');
        });

        this.app.get('/overview', function (req, res) {
            res.send('Тут будет сводка за прошлый и настоящий месяцы');
        });

        this.app.get('/payments', function (req, res) {
            this.db.GetEntriesByHoursAsync(24 * 30).then((query) => {
                let message = "";
                res.send(query);
            }).catch(() => { res.send("Error :("); });
        });

        this.app.get('/stats', function (req, res) {
            res.send('Тут будет график за настоящий месяц');
        });

        logger.log("[INFO] WebDataProvider started");

        this.app.listen(port);
    }
}

module.exports = {
    WebDataProvider: WebDataProvider,
};

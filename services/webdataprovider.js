const logger = require('./logger');
const express = require('express');
const moment = require('moment');

class WebDataProvider {
    constructor() {
        this.app = express();
    }

    async listen(port, db) {
        this.app.get('/', function (req, res) {
            res.send('Hello.');
        });

        this.app.get('/payments/last', function (req, res) {
            db.GetEntriesByMomentAsync(moment().startOf('month'), moment().endOf('month')).then((query) => {
                if (query) {
                    let message = "";

                    let rubSum = 0;
                    let entriesNumber = 0;

                    for (const el of query) {
                        rubSum += el.rub;
                        entriesNumber++;
                    }

                    message += `Сводка за ${moment().startOf('month').format('MM.YYYY')}. `;
                    message += `Количество записей найдено: ${entriesNumber}. Рублей получено: ${rubSum}<br><br>`;
                    message += `paymentDate,username,message,rub,whitelisted<br>`;

                    for (const el of query) {
                        message += `${el.daCreatedAt},${el.username},${el.message},${el.rub},${el.whitelisted}<br>`;
                    }

                    res.send(message);
                }
                else {
                    res.send("Error :(");
                }
            }).catch(() => { res.send("Error :("); });
        });

        this.app.get('/payments/past', function (req, res) {
            db.GetEntriesByMomentAsync(moment().subtract(1, 'months').startOf('month'),
                moment().subtract(1, 'months').endOf('month')).then((query) => {
                if (query) {
                    let message = "";

                    let rubSum = 0;
                    let entriesNumber = 0;

                    for (const el of query) {
                        rubSum += el.rub;
                        entriesNumber++;
                    }

                    message += `Сводка за ${moment().subtract(1, 'months').startOf('month').format('MM.YYYY')}. `;
                    message += `Количество записей найдено: ${entriesNumber}. Рублей получено: ${rubSum}<br><br>`;
                    message += `paymentDate,username,message,rub,whitelisted<br>`;

                    for (const el of query) {
                        message += `${el.daCreatedAt},${el.username},${el.message},${el.rub},${el.whitelisted}<br>`;
                    }

                    res.send(message);
                }
                else {
                    res.send("Error :(");
                }
            }).catch(() => { res.send("Error :("); });
        });

        logger.log("[INFO] WebDataProvider started");

        this.app.listen(port);
    }
}

module.exports = {
    WebDataProvider: WebDataProvider,
};

const axios = require('axios');

class DonationAlerts {
    constructor(authorizationToken) {
        this.authorizationToken = authorizationToken;
    }

    async getDonationPage(page = 1) {
        try {
            let res = await axios.get(`https://www.donationalerts.com/api/v1/alerts/donations?page=${page}`, {
                headers: {
                    'Authorization': `Bearer ${this.authorizationToken}`
                }
            });
            return res.data;
        }
        catch {
            return null;
        }
    }

    async getAllDonationPages() {
        let res = [];

        let page1 = await this.getDonationPage(1);
        page1.data.forEach(el => {
            res.push(el);
        });

        for (let i = 2; i <= page1.meta.last_page; i++) {
            let page = await this.getDonationPage(i);
            page.data.forEach(el => {
                res.push(el);
            });
        }

        return res;
    }
}

module.exports = {
    DonationAlerts: DonationAlerts,
};

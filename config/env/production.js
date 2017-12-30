/* eslint-env node */

module.exports = {
    db: 'mongodb://app:m3000np@localhost:27017/menp_prod',
    smtp: {
        service: 'SendGrid',
        auth: {
            user: 'Berkmann18',
            pass: 'Maxie1996'
        }
    },
    email: {
        from: 'noreply@menp.com',
        to: 'contact@menp.com'
    },
    sgOptions: {
        auth: {
            api_key: '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'
        }
    },
    nexmoOptions: {
        apiKey: '341208b6',
        apiSecret: '325d930a9c003d9c',
        from: 'MENP'
    }
};
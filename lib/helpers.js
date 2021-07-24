const crypto = require('crypto');
const config = require('./config');

const helpers = {
    hash: (data) => {
        if(typeof(data) !== 'string' || data.length <= 0) {
            return false;
        }
        return crypto.createHmac('sha256', config.hashingSecret).update(data).digest('hex');
    },
    parseJSON: (data) => {
        try {
            return JSON.parse(data);
        } catch (err) {
            return {};
        }
    },
    createRandomString: (length) => {
        if(typeof(length) !== 'number' && length <= 0) {
            return false;
        }
        return crypto.randomBytes(length).toString('hex');
    }
};

module.exports = helpers;
const crypto = require('crypto');
const config = require('./config');
const querystring = require('querystring');
const https = require('https');

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
    },
    sendTwilioSMS: (phone, message, callback) => {
        phone = typeof(phone) == 'string' && phone.trim().length === 10 ? phone.trim() : false;
        message = typeof(message) == 'string' && message.trim().length > 0 && message.trim().length <= 1600 ? message.trim() : false;
        if(phone && message) {
            // Craft the request payload
            const payload = {
                From: config.twilio.fromPhone,
                To: '+1'+phone,
                Body: message
            }
            const payloadString = querystring.stringify(payload);
            // Craft the request details necessary for the http request
            const requestDetails = {
                protocol: 'https:',
                hostname: 'api.twilio.com',
                method: 'POST',
                path: '2010-04-01/Accounts'+config.twilio.accountSid+'/Messages.json',
                auth: config.twilio.accountSid+':'+config.twilio.authToken,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(payloadString)
                }
            }
            // Instantiate the request and make sure we are checking status code on response
            const request = https.request(requestDetails, (res) => {
                if(res.statusCode == 200 || res.statusCode == 201) {
                    callback(false);
                } else {
                    callback('Status code returned was '+res.statusCode);
                }
            });
            // Set an on error event handler to callback the error
            request.on('error', (err) => {
                callback(err);
            })
            // Write the payload string onto the request before it is sent
            request.write(payloadString);
            // Request end, ready to be sent
            request.end();
        } else {
            callback('Parameters missing or invalid.');
        }
    }
};

module.exports = helpers;
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const url = require('url');

const helpers = require('./helpers');
const data = require('./data');

const workers = {};

workers.alertUserToStatusChange = (newCheckData) => {
    const message = `Your check for ${newCheckData.method.toUpperCase()} ${newCheckData.protocol}://${newCheckData.url} is currently ${newCheckData.state}`;
    helpers.sendTwilioSMS(newCheckData.phone, message, (err) => {
        if(!err) {
            console.log('User was alerted to a status change in their checks: \n', message);
        } else {
            console.log('Could not send SMS to alert user on status change in their checks: \n', err);
        }
    });
}

workers.processCheckOutcome = (originalCheckData, checkOutcome) => {
    const state = (!checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.includes(checkOutcome.responseCode)) ? 'up' : 'down';
    const alertWarranted = originalCheckData.lastChecked && originalCheckData.state != state ? true : false;
    const newCheckData = {...originalCheckData, state, lastChecked: Date.now()};
    data.update('checks', newCheckData.id, newCheckData, (err) => {
        if(!err) {
            if(alertWarranted) {
                workers.alertUserToStatusChange(newCheckData);
            } else {
                console.log('Check outcome has not changed, no alert needed.');
            }
        } else {
            console.log('Error trying to update one of the checks with new data.');
        }
    });
}

workers.performCheck = (originalCheckData) => {
    let checkOutcome = {
        'error': false,
        'responseCode': false
    };
    let outcomeSent = false;
    const parsedUrl = url.parse(originalCheckData.protocol+'://'+originalCheckData.url, true);
    const hostname = parsedUrl.hostname;
    const path = parsedUrl.path;

    const requestDetails = {
        protocol: originalCheckData.protocol+':',
        hostname,
        method: originalCheckData.method.toUpperCase(),
        path,
        timeout: originalCheckData.timeoutSeconds*1000
    }
    const _moduleToUse = originalCheckData.protocol == 'http' ? http : https;
    const request = _moduleToUse.request(requestDetails, (res) => {
        checkOutcome.responseCode = res.statusCode;
        if(!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });
    request.on('error', (err) => {
        checkOutcome.error = {error: true, value: err};
        if(!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });
    request.on('timeout', (err) => {
        checkOutcome.error = {error: true, value: 'timeout'};
        if(!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });
    request.end();
}

workers.validateCheckData = (originalCheckData) => {
    originalCheckData = (typeof(originalCheckData) == 'object' && originalCheckData !== null) ? originalCheckData : {};
    originalCheckData.id = (typeof(originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 24) ? originalCheckData.id.trim() : false;
    originalCheckData.phone = (typeof(originalCheckData.phone) == 'string' && originalCheckData.phone.trim().length == 10) ? originalCheckData.phone.trim() : false;
    originalCheckData.protocol = (typeof(originalCheckData.protocol) === 'string' && ['http', 'https'].includes(originalCheckData.protocol)) ? originalCheckData.protocol : false;
    originalCheckData.url = (typeof(originalCheckData.url) === 'string' && originalCheckData.url.trim().length > 0) ? originalCheckData.url.trim() : false;
    originalCheckData.method = (typeof(originalCheckData.method) === 'string' && ['get', 'post', 'put', 'delete'].includes(originalCheckData.method)) ? originalCheckData.method : false;
    originalCheckData.successCodes = (typeof(originalCheckData.successCodes) === 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0) ? originalCheckData.successCodes : false;
    originalCheckData.timeoutSeconds = (typeof(originalCheckData.timeoutSeconds) === 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5) ? originalCheckData.timeoutSeconds : false;

    originalCheckData.state = (typeof(originalCheckData.state) === 'string' && ['up', 'down'].includes(originalCheckData.state)) ? originalCheckData.state : 'down';
    originalCheckData.lastChecked = (typeof(originalCheckData.lastChecked) === 'number' && originalCheckData.lastChecked > 0) ? originalCheckData.lastChecked : false;

    if (
        originalCheckData.id && 
        originalCheckData.phone &&
        originalCheckData.url &&
        originalCheckData.protocol && 
        originalCheckData.method && 
        originalCheckData.timeoutSeconds && 
        originalCheckData.successCodes
    ) {
        workers.performCheck(originalCheckData);
    }

    else {
        console.log("One of the checks is not properly formatted.");
    }
}

workers.gatherAllChecks = () => {
    data.list('checks', (err, checks) => {
        if(!err && checks && checks.length > 0) {
            checks.forEach(check => {
                data.read('checks', check, (err, originalCheckData) => {
                    if(!err && originalCheckData) {
                        workers.validateCheckData(originalCheckData);
                    } else {
                        console.log('Error reading one of the checks', err);
                    }
                });
            });
        } else {
            console.log('No checks to process.', err);
        }
    });
}

workers.loop = () => {
    setInterval(() => {
        workers.gatherAllChecks();
    }, 60*1000);
}

workers.init = () => {
    workers.gatherAllChecks();
    workers.loop();
}

module.exports = workers;
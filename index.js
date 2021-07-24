const http = require('http');
const https = require('https');
const url = require('url');
const stringDecoder = require('string_decoder').StringDecoder;
const fs = require('fs');

const config = require('./lib/config');
const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers');

// Start an HTTP server
const httpServer = http.createServer((req, res) => unifiedServer(req, res));
// Start an HTTPS server with options for the SSL key and certificate
const httpsServerOptions = {
    'key': fs.readFileSync('./https/key.pem'), 
    'cert': fs.readFileSync('./https/cert.pem')
};

const httpsServer = https.createServer(httpsServerOptions, (req, res) => unifiedServer(req, res));

// HTTP Server listening on its port
httpServer.listen(config.httpPort, () => {
    console.log(`Listening on port ${config.httpPort}`);
});

// HTTPS Server listening on its port
httpsServer.listen(config.httpsPort, () => {
    console.log(`Listening on port ${config.httpsPort}`);
});

// Router
const router = {
    ping: handlers.ping,
    users: handlers.users,
    tokens: handlers.tokens,
    checks: handlers.checks
};

// Server logic
const unifiedServer = (req, res) => {
    // Parse the url from the request
    const parsedUrl = url.parse(req.url, true);
    // Get the pathname and trim it
    const path = parsedUrl.pathname.replace(/^\/+|\/+$/g, '');

    // Get the request headers
    const headers = req.headers;

    // Get the method from the request
    const method = req.method.toLowerCase();

    // Get the query string
    const query = parsedUrl.query;

    // Get the request payload, if we have any, by decoding the data we receive and ending the decoding once the request has reached its end
    const decoder = new stringDecoder('utf-8');
    let buffer = '';
    req.on('data', (data) => {
        buffer += decoder.write(data);
    });
    req.on('end', () => {
        buffer += decoder.end();
    
        // Choose handler the request should go to. If not found, send it to the notFound
        const chosenHandler = typeof(router[path]) !== 'undefined' ? router[path] : handlers.notFound;

        // Construct the data object to send to the handler
        const data = {
            path,
            query,
            headers,
            method,
            payload: helpers.parseJSON(buffer)
        };

        // Route the request to the chosen handler
        chosenHandler(data, (statusCode, payload) => {
            // Use the status code called back by the handler, or use default 200
            statusCode = typeof(statusCode) === 'number' ? statusCode : 200;
            // Check the payload called back by the handler, or use default empty object
            payload = typeof(payload) === 'object' ? payload : {};

            // Convert the payload to a string
            const payloadString = JSON.stringify(payload);

            // Return the response
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(statusCode);
            res.end(payloadString);

            // Log the response
            console.log('Returning response:', statusCode, payloadString);
        });
    
    })
}
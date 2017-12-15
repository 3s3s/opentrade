'use strict';

const g_constants = require('./constants');

const http = require('http');
const https = require('https');
const util = require('util');
const express = require('express');
const bodyParser = require('body-parser');
const WebSocketServer = require('ws').Server;

const log_file = require("fs").createWriteStream(__dirname + '/debug.log', {flags : 'w'});
const log_stdout = process.stdout;

console.log = function(d) { 
  log_file.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
};

const app = express();
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

//app.use(cookieParser());

var httpServer = http.createServer(app);
var httpsServer = https.createServer(g_constants.SSL_options, app);

httpServer.listen(g_constants.my_port);
httpsServer.listen(g_constants.my_portSSL, function(){
    console.log("SSL Proxy listening on port "+g_constants.my_portSSL);
});

g_constants.WEB_SOCKETS = new WebSocketServer({ server: httpsServer, clientTracking: true });
 
app.use(express.static('../static_pages'));
app.set('view engine', 'ejs');

require('./reqHandler.js').handle(app, g_constants.WEB_SOCKETS);

process.on('uncaughtException', function (err) {
  console.error(err.stack);
  console.log("Node NOT Exiting...");
});

/*app.use(function (err, req, res, next) {
    res.send(500, 'Something broke!');
});*/

//console.log(JSON.stringify(process.versions));
require("./database").Init();


'use strict';

const g_constants = require('./constants');

const http = require('http');
const https = require('https');
const util = require('util');
const express = require('express');
const bodyParser = require('body-parser');
const WebSocketServer = require('ws').Server;
const utils = require("./utils");

const log_file = require("fs").createWriteStream(__dirname + '/debug.log', {flags : 'w'});
const log_stdout = process.stdout;

console.log = function(d, userID) { 
    if (!g_constants.DEBUG_LOG)
        return;

  log_file.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
  
  if (userID)
    require("./utils").log_user(userID, d);
};

const app = express();
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

//app.use(cookieParser());

var httpServer = http.createServer(app);
var httpsServer = https.createServer(g_constants.SSL_options, app);

var httpListener = httpServer.listen(g_constants.my_port);
var httpsListener = httpsServer.listen(g_constants.share.my_portSSL, function(){
    console.log("SSL Proxy listening on port "+g_constants.share.my_portSSL);
});

var lastSocketKey = 0;
var socketMap = {http: {}, https: {}};
httpListener.on('connection', function(socket) {
    /* generate a new, unique socket-key */
    const socketKey = ++lastSocketKey;
    /* add socket when it is connected */
    socketMap.http[socketKey] = socket;
    socket.on('close', function() {
        /* remove socket when it is closed */
        g_constants.ReleaseAddress(socketMap.http[socketKey].remoteAddress);
        delete socketMap.http[socketKey];
    });
    
    if (!g_constants.IsAllowedAddress(socket.remoteAddress))
        socket.end();
});

httpsListener.on('connection', function(socket) {
    /* generate a new, unique socket-key */
    const socketKey = ++lastSocketKey;
    /* add socket when it is connected */
    socketMap.https[socketKey] = socket;
    socket.on('close', function() {
        /* remove socket when it is closed */
        g_constants.ReleaseAddress(socketMap.https[socketKey].remoteAddress);
        delete socketMap.https[socketKey];
    });
    
    if (!g_constants.IsAllowedAddress(socket.remoteAddress))
        socket.end();
});

//httpListener.on('error', () => {});
//httpsListener.on('error', () => {});

g_constants.WEB_SOCKETS = new WebSocketServer({ server: httpsServer, clientTracking: true });

function noop() {}
 
setInterval(function ping() {
  g_constants.WEB_SOCKETS.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();
 
    ws.isAlive = false;
    ws.ping(noop);
  });
}, 30000);
 
app.use(express.static('../static_pages'));
app.set('view engine', 'ejs');

require('./reqHandler.js').handle(app, g_constants.WEB_SOCKETS);

/*process.on('uncaughtException', function (err) {
  console.error(err.stack);
  utils.balance_log(err.stack+"\n");
  console.log("Node NOT Exiting...");
});*/

app.use(function (err, req, res, next) {
    res.send(500, 'Something broke!');
});

//console.log(JSON.stringify(process.versions));
require("./database").Init();
require("./modules/users/market").Init();

//require("./modules/admin/utils").FixAllBalances();



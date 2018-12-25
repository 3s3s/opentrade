'use strict';

const g_constants = require('./constants');

const https = require('https');
const util = require('util');
const express = require('express');
const bodyParser = require('body-parser');
const WebSocketServer = require('ws').Server;
//const compression = require('compression');

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
//app.use(compression());

//app.use(cookieParser());

var httpsServer = https.createServer(g_constants.SSL_options, app);

var httpsListener = httpsServer.listen(g_constants.share.my_portSSL, function(){
    console.log("SSL Proxy listening on port "+g_constants.share.my_portSSL);
});

var lastSocketKey = 0;
var socketMap = {http: {}, https: {}};

httpsListener.on('connection', socket => {
    /* generate a new, unique socket-key */
    const socketKey = ++lastSocketKey;
    /* add socket when it is connected */
    socketMap.https[socketKey] = socket;
    socket.on('close', function() {
        /* remove socket when it is closed */
        delete socketMap.https[socketKey];
    });
    
    if (!g_constants.IsAllowedAddress(socket.remoteAddress))
    {
        console.log('ERROR: not allowed '+socket.remoteAddress)
        socket.end();
    }
});

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

process.on('uncaughtException', err => {
  console.error(err.stack);
  console.log("Node NOT Exiting...");
  require("fs").writeFileSync(__dirname + '/debug'+Date.now()+'.log', err.stack);

 // process.exit(0);
});

app.use(function (err, req, res, next) {
    res.send(500, 'Something broke!');
});


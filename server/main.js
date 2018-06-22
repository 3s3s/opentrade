'use strict';

const g_constants = require('./constants');

const http = require('http');
const https = require('https');
const util = require('util');
const express = require('express');
const bodyParser = require('body-parser');
const expressValidator = require('express-validator');
const flash = require('connect-flash');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const WebSocketServer = require('ws').Server;

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
  extended: false
})); 


// begin passportJS (kundan)
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(expressValidator());

app.use(flash());

app.use(function(req, res, next){
    res.locals.success_message = req.flash('success_message');
    res.locals.error_message = req.flash('error_message');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;
    next();
});

// end passportJS (kundan)

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

process.on('uncaughtException', function (err) {
  console.error(err.stack);
  console.log("Node NOT Exiting...");
});

app.use(function (err, req, res, next) {
    //res.send(500, 'Something broke!');
    res.status(500).send('Something broke!')
});

//console.log(JSON.stringify(process.versions));
require("./database").Init();
require("./modules/users/market").Init();

//require("../debug/dump.js").init('/root/marycoin/Trade2/debug');
//var heapdump = require('heapdump');
/*setInterval(loadDump, 1000*60*5);
function loadDump()
{
    heapdump.writeSnapshot('/root/marycoin/Trade2/debug/' + Date.now() + '.heapsnapshot');
}*/

/*setInterval(callGC, 1000*60);
function callGC()
{
    try
    {
        if (global.gc) {
            global.gc();
            //heapdump.writeSnapshot('/root/marycoin/Trade2/debug/' + Date.now() + '.heapsnapshot');
            
        } else {
            console.log('Garbage collection unavailable.  Pass --expose-gc '
              + 'when launching node to enable forced garbage collection.');
        }
    }
    catch(e)
    {
        
    }
}*/

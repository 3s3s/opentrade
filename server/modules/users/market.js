'use strict';

const utils = require("../../utils.js");
const g_constants = require("../../constants.js");
const WebSocket = require('ws');

exports.Init = function()
{
    setInterval(exports.UpdateMarket, 10000);
};

exports.UpdateMarket = function()
{
    g_constants.dbTables['coins'].selectAll('ROWID AS id, name, ticker, icon, info', '', 'ORDER BY id', (err, rows) => {
        if (err || !rows || !rows.length)
            return;
        
        let data = [];    
        for (var i=0; i<rows.length; i++)
        {
            try { rows[i].info = JSON.parse(utils.Decrypt(rows[i].info));}
            catch(e) {continue;}

            if (rows[i].info.active != true)
                continue;
            
            rows[i].name = unescape(rows[i].name);    
            require("./trade").GetLastCoinHistory(rows[i]);
                
            data.push(rows[i]);
        }
        const msg = {coins: data};
        
        // Broadcast to everyone else.
        g_constants.WEB_SOCKETS.clients.forEach( client => {
            if (client.readyState === WebSocket.OPEN) 
                client.send(JSON.stringify({request: 'market', message: msg}));
        });
    });
};


'use strict';

const utils = require("../../utils.js");
const g_constants = require("../../constants.js");
const WebSocket = require('ws');
const mailer = require("../mailer");
const database = require("../../database");
const wallet = require("./wallet")
const orders = require("./orders");

exports.Init = function()
{
    mailer.SendStartAppNotification(ret => {
        console.log(ret.message);
    })
    setInterval(exports.UpdateMarket, 10000);
    
    setTimeout(UpdateExchangeSummary, 10000);
    setInterval(UpdateExchangeSummary, 3600000);
    
    setInterval(require("../admin/trades").DeleteDustOrders, 60000);
    
    ProcessExchange();
    wallet.GetCoins(true, ret => {});
    /*StartTransaction();

    function StartTransaction()
    {
        database.BeginTransaction("", () => {
            setTimeout(database.EndTransaction, 5000, () => {StartTransaction});
        });
    }*/
    database.RunTransactions();
};

function ProcessExchange()
{
    wallet.GetCoins(true, ret => {
        for (var i=0; i<ret.length; i++)
            setTimeout(orders.ProcessExchange, 1, ret[i].name);
            
        setTimeout(ProcessExchange, 5000);
    });
}



let g_History24 = {};
function UpdateExchangeSummary()
{
    utils.getJSON('https://'+g_constants.DOMAIN+':'+g_constants.share["my_portSSL"]+'/api/v1/public/getmarkets', (status, data) => {
        if (status != 200 || !data || !data.result || data.success != true)
            return;
            
        for (let i=0; i<data.result.length; i++)
        {
            if (data.result[i].IsActive != true)
                continue;
            
            const BTC = data.result[i].MarketCurrency;
            const MC = data.result[i].BaseCurrency;
            
            utils.getJSON('https://'+g_constants.DOMAIN+':'+g_constants.share["my_portSSL"]+'/api/v1/public/getmarketsummary?market='+MC+'-'+BTC+'&period=24', (status2, data2) => {
                if (status2 != 200 || !data2 || data2.success != true || !data2.result)
                    return;

                g_History24[BTC] = data2.result;
            });
        }
    });
}

exports.GetMarketSummary24 = function(callback)
{
    return callback(g_History24);
}

let g_LastMarketData = {};

exports.UpdateMarket = function()
{
    if (!g_constants.WEB_SOCKETS || !g_constants.dbTables['coins']) return;
    
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
        g_LastMarketData = msg;
        
        // Broadcast to everyone else.
        const msgString = JSON.stringify({request: 'market', message: msg});
        g_constants.WEB_SOCKETS.clients.forEach( client => {
            if (client.readyState === WebSocket.OPEN) 
                try {client.send(msgString);} catch(e) {client.terminate();}
        });
    });
};

exports.GetMarketData = function(callback) {
    callback(g_LastMarketData);
}


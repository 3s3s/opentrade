'use strict';

const utils = require("../../utils.js");
const g_constants = require("../../constants.js");
const WebSocket = require('ws');
const wallet = require("./wallet");
const orders = require("./orders");

let tradeHistory = {};

exports.onGetPair = function(ws, req, data)
{
    utils.GetSessionStatus(req, status => {
        GetBalance(ws, status, data);
        GetAllOrders(data, ret => {
            const orders = ret.data || {};
            GetUserOrders(status, data, ret => {
                const userOrders = ret.data || [];
                GetUserTradeHistory(status, data, ret => {
                    const historyUser = ret.data || [];
                    GetTradeHistory(data, ret => {
                        const history = ret.data || [];
                        
                        ws.send(JSON.stringify(
                            {request: 'pairdata', message: {result: true, data: {orders: orders, userOrders: userOrders, historyUser: historyUser, history: history}}}));
                    });    
                });
            });
        });
    });
    
}

exports.onGetBalance= function(ws, req, data)
{
}

function GetCoins(coin1, coin2, callback)
{
    const WHERE = "name='"+escape(coin1)+"' OR name='"+escape(coin2)+"'";
    
    g_constants.dbTables['coins'].selectAll("ROWID AS id, name, ticker, icon, info", WHERE, "", (err, rows) => {
        if (err || !rows || !rows.length || rows.length != 2)
        {
            callback({result: false, message: 'Pair not found'});
            return;
        }
        
        for (var i=0; i<rows.length; i++)
        {
            try { 
                rows[i].info = JSON.parse(utils.Decrypt(rows[i].info));
                if (rows[i].info.active != true) throw 'Coin is not active'
            }
            catch(e) {
                callback({result: false, message: e.message});
                continue;
            }
        }
        callback({result: true, data: rows});
    });
}

function GetBalance(socket, status, data)
{
    if (!status.active || !data || !data.length || data.length != 2)
    {
        socket.send(JSON.stringify({request: 'wallet', message: {result: false, message: 'Bad Request'} }));
        return;
    }
    
    GetCoins(data[0], data[1], err => {
        if (!err || !err.result || !err.data || err.data.length != 2)
        {
            socket.send(JSON.stringify({request: 'wallet', message: {result: false, message: err.message || 'Unknown message'} }));
            return;
        }
        
        for (var i=0; i<err.data.length; i++)
            wallet.GetCoinWallet(socket, status.id, err.data[i]);
    });

}

function GetAllOrders(data, callback)
{
    if (!data || !data.length || data.length != 2)
    {
        callback({result: false, message: 'Bad Request'});
        return;
    }
    
    GetCoins(data[0], data[1], err => {
        if (!err || !err.result || !err.data || err.data.length != 2)
        {
            callback({result: false, message: err.message || 'Unknown message'});
            return;
        }
        
        orders.GetAllOrders(err.data, callback);
    });
}

function GetUserOrders(status, data, callback)
{
    if (!status.active || !data || !data.length || data.length != 2)
    {
        callback({result: false, message: 'Bad Request'});
        return;
    }
    
    GetCoins(data[0], data[1], err => {
        if (!err || !err.result || !err.data || err.data.length != 2)
        {
            callback({result: false, message: err.message || 'Unknown message'});
            return;
        }
        
        orders.GetUserOrders(status.id, err.data, callback);
        
    });
}

function GetUserTradeHistory(status, data, callback)
{
    callback({result: true, data: []});
}

function GetTradeHistory(data, callback)
{
    if (!tradeHistory[data[1]]) 
        tradeHistory[data[1]] = {time: 0, data: []};
        
    if (Date.now() - tradeHistory[data[1]].time < 5000) return callback({result: true, data: tradeHistory[data[1]].data});

    g_constants.dbTables['history'].selectAll('fromSellerToBuyer AS volume, price, buysell, time', 'coin="'+escape(data[1])+'" AND coin_pair="'+escape(data[0])+'"', 'ORDER BY time DESC LIMIT 200', (err, rows) => {
        if (err || !rows) callback({result: false, data: []});
        
        tradeHistory[data[1]].time = Date.now();
        tradeHistory[data[1]].data = rows;
            
        callback({result: true, data: rows});
    });
    /*const WHERE1 = 'coin="'+escape(data[1])+'" AND coin_pair="'+escape(data[0])+'" AND buysell="buy" AND fromSellerToBuyer*1 > 0 AND fromBuyerToSeller*1 > 0';
    const WHERE2 = 'coin="'+escape(data[1])+'" AND coin_pair="'+escape(data[0])+'" AND buysell="sell" AND fromSellerToBuyer*1 > 0 AND fromBuyerToSeller*1 > 0';
    g_constants.dbTables['history'].selectAll('SUM(fromSellerToBuyer) AS volume, price, buysell, time', WHERE1, 'GROUP BY price LIMIT 100', (err, rows) => {
        if (err || !rows) callback({result: false, data: []});
        
        const sell = rows;
        g_constants.dbTables['history'].selectAll('SUM(fromSellerToBuyer) AS volume, price, buysell, time', WHERE2, 'GROUP BY price LIMIT 100', (err, rows) => {
            if (err || !rows) callback({result: false, data: []});
            
            const all = sell.concat(rows).sort((a,b) => {return b.time*1 - a.time*1});
            
            tradeHistory[data[1]].time = Date.now();
            tradeHistory[data[1]].data = all;
            
            callback({result: true, data: all});
        });
    })*/
}

'use strict';

const utils = require("../../utils.js");
const g_constants = require("../../constants.js");
const WebSocket = require('ws');
const wallet = require("./wallet");
const orders = require("./orders");

let tradeHistory = {};
let tradeHistoryUser = {};
let chartData = {};

exports.onGetChart = function(ws, req, data)
{
    GetChartData(data, ret => {
        const chart = ret.data || [];
                        
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({
            request: 'chartdata', 
            message: {result: true, data: {chart: chart}}}));
    });
}

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
                        
                        const online = utils.GetValidSessionsCount();

                        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({
                            request: 'pairdata', 
                            message: {result: true, data: {online: online, orders: orders, userOrders: userOrders, historyUser: historyUser, history: history}}}));
                    });    
                });
            });
        });
    });
    
}

exports.GetLastCoinHistory = function(coin)
{
    if (!tradeHistory[coin.name] || !tradeHistory[coin.name].data) return GetTradeHistory([g_constants.TRADE_MAIN_COIN, coin.name], () => {});
    
    if (!tradeHistory[coin.name].data.length) 
        tradeHistory[coin.name].data.push({volume: 0.0, price: 0.0, buysell: 'buy', prev_price: 0.0, prev_buysell: 'buy'});
    
    coin['volume'] = tradeHistory[coin.name].data[0].volume;
    coin['price'] = tradeHistory[coin.name].data[0].price;
    coin['buysell'] = tradeHistory[coin.name].data[0].buysell;
    coin['prev_price'] = tradeHistory[coin.name].data[0].prev_price;
    coin['prev_buysell'] = tradeHistory[coin.name].data[0].prev_buysell;
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
        if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({request: 'wallet', message: {result: false, message: 'Bad Request'} }));
        return;
    }
    
    GetCoins(data[0], data[1], err => {
        if (!err || !err.result || !err.data || err.data.length != 2)
        {
            if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({request: 'wallet', message: {result: false, message: err.message || 'Unknown message'} }));
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
        if (data[0] == 'Bitcoin Cash' || data[1] == 'Bitcoin Cash')
        {
            var i = 0;
        }
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
    if (!status.active)
        return callback({result: true, data: []});

    if (!tradeHistoryUser[status.id]) 
        tradeHistoryUser[status.id] = {};
        
    if (!tradeHistoryUser[status.id][data[1]])
        tradeHistoryUser[status.id][data[1]] = {time: 0, data: []};
        
    if (Date.now() - tradeHistoryUser[status.id][data[1]].time < 5000) 
        return callback({result: true, data: tradeHistoryUser[status.id][data[1]].data});

    const WHERE = 'coin="'+escape(data[1])+'" AND coin_pair="'+escape(data[0])+'" AND (buyUserID='+status.id+' OR sellUserID='+status.id+')';
    g_constants.dbTables['history'].selectAll('fromSellerToBuyer AS volume, fromBuyerToSeller, price, buysell, time', WHERE, 'ORDER BY time DESC LIMIT 200', (err, rows) => {
        if (err || !rows) callback({result: false, data: []});
        
        tradeHistoryUser[status.id][data[1]].time = Date.now();
        tradeHistoryUser[status.id][data[1]].data = rows;
        
        callback({result: true, data: rows});
    });
}

function GetTradeHistory(data, callback)
{
    if (!tradeHistory[data[1]]) 
        tradeHistory[data[1]] = {time: 0, data: []};
        
    if (Date.now() - tradeHistory[data[1]].time < 5000) return callback({result: true, data: tradeHistory[data[1]].data});

    g_constants.dbTables['history'].selectAll('fromSellerToBuyer AS volume, fromBuyerToSeller, price, buysell, time', 'coin="'+escape(data[1])+'" AND coin_pair="'+escape(data[0])+'"', 'ORDER BY time DESC LIMIT 200', (err, rows) => {
        if (err || !rows) callback({result: false, data: []});
        
        tradeHistory[data[1]].time = Date.now();
        tradeHistory[data[1]].data = rows;
        
        if (tradeHistory[data[1]].data.length > 1)
        {
            tradeHistory[data[1]].data[0]['prev_price'] = tradeHistory[data[1]].data[1].price;
            tradeHistory[data[1]].data[0]['prev_buysell'] = tradeHistory[data[1]].data[1].buysell;
        }
            
        callback({result: true, data: rows});
    });
}

function GetChartData(data, callback)
{
    if (!chartData[data[1]]) 
        chartData[data[1]] = {time: 0, data: []};
        
    if (Date.now() - chartData[data[1]].time < 3600000) return callback({result: true, data: chartData[data[1]].data});

    g_constants.dbTables['history'].selectAll('fromSellerToBuyer AS volume, AVG(price*1000000) AS avg_10min, (time/360000) AS t10min', 'coin="'+escape(data[1])+'" AND coin_pair="'+escape(data[0])+'"', 'GROUP BY t10min ORDER BY t10min LIMIT 50', (err, rows) => {
        if (err || !rows) callback({result: false, data: []});
        
        chartData[data[1]].time = Date.now();
        chartData[data[1]].data = rows;
        
        callback({result: true, data: rows});
    });
    
}

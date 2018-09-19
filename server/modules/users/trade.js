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
        const chart = ret.data || {};
                        
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({
            request: 'chartdata', 
            message: {result: true, data: {chart: chart}}}));
    });
}

let g_onGetPair_counter = 0;
exports.onGetPair = function(ws, req, data)
{
    if (g_onGetPair_counter > 10)
    {
        return;
    }
    g_onGetPair_counter++;
    
    try
    {
        utils.GetSessionStatus(req, status => {
            GetBalance(ws, status, data);
            //if (ws.readyState === WebSocket.OPEN) try{ws.send(JSON.stringify(retMessage));}catch(e){ws.terminate();}
            //    return;
            exports.GetAllOrders(data, ret => {
                let retMessage = {
                    request: 'pairdata',
                    message: {result: true, data: {online: utils.GetValidSessionsCount(), allusers: utils.GetAllUsersCount(), orders: '', userOrders: '', historyUser: '', history: ''}}
                };
                retMessage.message.data.orders = ret.data || {};
                //if (ws.readyState === WebSocket.OPEN) try{ws.send(JSON.stringify(retMessage));}catch(e){ws.terminate();}
                //return;
                GetUserOrders(status, data, ret => {
                    retMessage.message.data.userOrders = ret.data || {};
                    
                    GetUserTradeHistory(status, data, ret => {
                        retMessage.message.data.historyUser = ret.data || {};
                        //if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(retMessage));
                        GetTradeHistory(data, ret => {
                            retMessage.message.data.history = ret.data || {};
                            
                            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(retMessage));
                            delete retMessage['message'];
                            g_onGetPair_counter--;
                        });   
                    });
                });
            });
        });
    }
    catch(e)
    {
        g_onGetPair_counter--;
    }

}

exports.GetLastCoinHistory = function(coin)
{
    if (!tradeHistory[coin.name] || !tradeHistory[coin.name].data) return GetTradeHistory([g_constants.share.TRADE_MAIN_COIN, coin.name], () => {});
    
    if (!tradeHistory[coin.name].data.length) 
        tradeHistory[coin.name].data.push({volume: 0.0, price: 0.0, fromBuyerToSeller: 0.0, prev_frombuyertoseller: 0.0, buysell: 'buy', prev_price: 0.0, prev_buysell: 'buy'});
    
    coin['volume'] = tradeHistory[coin.name].data[0].volume;
    coin['price'] = tradeHistory[coin.name].data[0].price;
    coin['fromBuyerToSeller'] = tradeHistory[coin.name].data[0].fromBuyerToSeller;
    coin['buysell'] = tradeHistory[coin.name].data[0].buysell;
    coin['prev_price'] = tradeHistory[coin.name].data[0].prev_price;
    coin['prev_frombuyertoseller'] = tradeHistory[coin.name].data[0].prev_frombuyertoseller;
    coin['prev_buysell'] = tradeHistory[coin.name].data[0].prev_buysell;
}

exports.onGetBalance= function(ws, req, data)
{
}

let g_CoinsInfo = {}
function GetCoins(coin1, coin2, callback)
{
    const WHERE = "(name='"+escape(coin1)+"' OR name='"+escape(coin2)+"') OR (ticker='"+escape(coin1)+"' OR ticker='"+escape(coin2)+"')";
    if (g_CoinsInfo[WHERE] && Date.now()-g_CoinsInfo[WHERE].time < 1000*60*3600)
        return callback({result: true, data: g_CoinsInfo[WHERE].data});

    if (g_CoinsInfo[WHERE])
        g_CoinsInfo[WHERE].time = Date.now();
    
    console.log('GetCoins '+coin1+' - '+coin2)
    try
    {
        g_constants.dbTables['coins'].selectAll("ROWID AS id, name, ticker, icon, info", WHERE, "", (err, rows) => {
            if (err || !rows || !rows.length || rows.length != 2)
                return callback({result: false, message: 'Pair not found'});
    
            for (var i=0; i<rows.length; i++)
            {
                try { 
                    rows[i].info = JSON.parse(utils.Decrypt(rows[i].info));
                    if (rows[i].info.active != true) throw new Error('Coin is not active')
                }
                catch(e) {
                    callback({result: false, message: e.message});
                    continue;
                }
            }
            
            g_CoinsInfo[WHERE] = {time: Date.now(), data: rows};
            callback({result: true, data: g_CoinsInfo[WHERE].data});
        });
    }
    catch(e)
    {
        return callback({result: false, message: e.message});
    }
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
            setTimeout(wallet.GetCoinWallet, 1, socket, status.id, err.data[i]);
    });

}

exports.GetAllOrders = function(data, callback)
{
   // callback({result: true, data: {}}); return;
    if (!data || !data.length || data.length != 2)
        return callback({result: false, message: 'Bad Request'});

    GetCoins(data[0], data[1], err => {
        if (!err || !err.result || !err.data || err.data.length != 2)
            return callback({result: false, message: err ? err.message || 'Unknown message error' : 'Unknown message'});

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

    const WHERE = 'coin="'+escape(data[1])+'" AND coin_pair="'+escape(data[0])+'" AND (buyUserID='+status.id+' OR sellUserID='+status.id+')';
    g_constants.dbTables['history'].selectAll('buyUserID, sellUserID, fromSellerToBuyer AS volume, fromBuyerToSeller, price, buysell, time', WHERE, 'ORDER BY time*1 DESC LIMIT 200', (err, rows) => {
        if (err || !rows) return callback({result: false, data: []});
        
        let ret = [];
        for (let i=0; i<rows.length; i++)
        {
            ret.push(rows[i]);
            
            ret[i].buysell = (ret[i].buyUserID == status.id) ? 'buy' : 'sell';
        }
        
        //tradeHistoryUser[status.id][data[1]].time = Date.now();
        //tradeHistoryUser[status.id][data[1]].data = ret;
        
        callback({result: true, data: ret});
    });
}

function GetTradeHistory(data, callback)
{
    if (tradeHistory && tradeHistory[data[1]] && tradeHistory[data[1]].time && Date.now() - tradeHistory[data[1]].time < 5000) 
        return callback({result: true, data: tradeHistory[data[1]].data});
    

    g_constants.dbTables['history'].selectAll('fromSellerToBuyer AS volume, fromBuyerToSeller, price, buysell, time', 'coin="'+escape(data[1])+'" AND coin_pair="'+escape(data[0])+'"', 'ORDER BY time*1 DESC LIMIT 200', (err, rows) => {
        if (err || !rows) callback({result: false, data: []});
        
        if (tradeHistory[data[1]])
        {
            delete tradeHistory[data[1]];
            tradeHistory[data[1]] = {};
        }
        
        if (!tradeHistory[data[1]])
            tradeHistory[data[1]] = {};
            
        tradeHistory[data[1]]['time'] = Date.now();
        tradeHistory[data[1]]['data'] = rows;
        
        if (tradeHistory[data[1]].data.length > 1)
        {
            tradeHistory[data[1]].data[0]['prev_price'] = tradeHistory[data[1]].data[1].price;
            tradeHistory[data[1]].data[0]['prev_frombuyertoseller'] = tradeHistory[data[1]].data[1].fromBuyerToSeller/tradeHistory[data[1]].data[1].volume;
            tradeHistory[data[1]].data[0]['prev_buysell'] = tradeHistory[data[1]].data[1].buysell;
        }
            
        callback({result: true, data: tradeHistory[data[1]].data});
    });
}

function GetChartData(data, callback)
{
    if (!data || !Array.isArray(data) || data.length != 3)
        return callback({result: false, data: [], message: 'Bad request: data is not array or length != 3'});
    
    if (!chartData[data[1]]) 
        chartData[data[1]] = {}; //
    if (!chartData[data[1]][data[2]])
        chartData[data[1]][data[2]] = {time: 0, data: []};
        
    if (Date.now() - chartData[data[1]][data[2]].time < 3600000) return callback({result: true, data: chartData[data[1]][data[2]].data});

    try
    {
        const group = 
            (data[2] == 24) ? 360000 :
            (data[2] == 250) ? 3600000 :
            (data[2] == 1000) ? 14400000 :
            (data[2] == 6000) ? 86400000 : 360000;
            
        //g_constants.dbTables['history'].selectAll('fromSellerToBuyer AS volume, AVG(price*1000000) AS avg_10min, (time/360000) AS t10min', 'coin="'+escape(data[1])+'" AND coin_pair="'+escape(data[0])+'"', 'GROUP BY t10min ORDER BY t10min DESC LIMIT 60', (err, rows) => {
        g_constants.dbTables['history'].selectAll('SUM(fromSellerToBuyer*1) AS volume, AVG((fromBuyerToSeller/fromSellerToBuyer)*1000000) AS avg_10min, (time/'+group+') AS t10min', 'coin="'+escape(data[1])+'" AND coin_pair="'+escape(data[0])+'"', 'GROUP BY t10min ORDER BY t10min*1 DESC LIMIT 200', (err, rows) => {
            if (err || !rows) callback({result: false, data: []});
            
            if (chartData[data[1]][data[2]]) delete chartData[data[1]][data[2]];
                
            chartData[data[1]][data[2]] = {time: Date.now(), data: rows};
            
            callback({result: true, data: chartData[data[1]][data[2]].data});
        });
    }
    catch(e)
    {
        callback({result: false, data: [], message: e.message});
    }

}

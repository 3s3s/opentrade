'use strict';

const utils = require("../../utils.js");
const g_constants = require("../../constants.js");
const WebSocket = require('ws');
const wallet = require("./wallet");

exports.onGetPair = function(ws, req, data)
{
    utils.GetSessionStatus(req, status => {
        GetBalance(ws, status, data);
        GetAllOrders(status, data, ret => {
            const orders = ret.data || {};
            GetUserOrders(status, data, ret => {
                const userOrders = ret.data || [];
                GetUserTradeHistory(status, data, ret => {
                    const history = ret.data || [];
                        
                    ws.send(JSON.stringify(
                        {request: 'pairdata', message: {result: true, data: {orders: orders, userOrders: userOrders, history: history}}}));
                });
            });
        });
    });
    
}

exports.onGetBalance= function(ws, req, data)
{
    /*utils.GetSessionStatus(req, status => {
        GetBalance(status, data, ret => {
            const balance = ret.data;
            
            ws.send(JSON.stringify(
                {request: 'pairbalance', message: {result: true, data: balance}}));
        });
    });*/
}

function GetBalance(socket, status, data)
{
    if (!status.active || !data || !data.length || data.length != 2)
    {
        socket.send(JSON.stringify({request: 'wallet', message: {result: false, message: 'Bad Request'} }));
        return;
    }
    
    const WHERE = "name='"+escape(data[0])+"' OR name='"+escape(data[1])+"'";
    
    g_constants.dbTables['coins'].selectAll("ROWID AS id, name, ticker, icon, info", WHERE, "", (err, rows) => {
        if (err || !rows || !rows.length || rows.length != 2)
        {
            socket.send(JSON.stringify({request: 'wallet', message: {result: false, message: 'Pair not found'} }));
            return;
        }
        
        for (var i=0; i<rows.length; i++)
        {
            try { 
                rows[i].info = JSON.parse(utils.Decrypt(rows[i].info));
                if (rows[i].info.active != true) throw 'Coin is not active'
            }
            catch(e) {
                socket.send(JSON.stringify({request: 'wallet', message: {result: false, message: e.message} }));
                continue;
            }
            wallet.GetCoinWallet(socket, status.id, rows[i]);
        }
    });
}

function GetAllOrders(status, data, callback)
{
    callback({result: true, data: {}});
}
function GetUserOrders(status, data, callback)
{
    callback({result: true, data: []});
}
function GetUserTradeHistory(status, data, callback)
{
    callback({result: true, data: []});
}

'use strict';

const utils = require("../../utils.js");
const g_constants = require("../../constants.js");
const WebSocket = require('ws');
const wallet = require("./wallet");
const database = require("../../database");

let userOrders = {};
let allOrders = {};

function onError(req, res, message)
{
    utils.renderJSON(req, res, {result: false, message: message});
}
function onSuccess(req, res, data)
{
    utils.renderJSON(req, res, {result: true, data: data});
}

exports.CloseOrder = function(req, res)
{
    if (!req || !req.body || !req.body.orderID)
    {
        onError(req, res, req.message || 'Bad request');
        return;
    }
    
    utils.GetSessionStatus(req, status => {
        if (!status.active)
        {
            onError(req, res, 'User not logged');
            return;
        }
        
        const WHERE_ORDER = 'userID="'+status.id+'" AND ROWID="'+escape(req.body.orderID)+'"';
        g_constants.dbTables['orders'].selectAll('ROWID AS id, *', WHERE_ORDER, '', (err, rows) => {
            if (err || !rows || !rows.length)
            {
                onError(req, res, err.message || 'Order not found');
                return;
            }
            const order = rows[0];
            const fullAmount = order.buysell == 'buy' ?
                    (order.amount*order.price+g_constants.TRADE_COMISSION*order.amount*order.price).toFixed(7)*1 :
                    (order.amount*1).toFixed(7)*1;
                    
            const coinBalance = order.buysell == 'buy' ? order.price_pair : order.coin;
            
            const WHERE_BALANCE = 'userID="'+status.id+'" AND coin="'+coinBalance+'"';
            g_constants.dbTables['balance'].selectAll('*', WHERE_BALANCE, '', (err, rows) => {
                if (err || !rows || !rows.length)
                {
                    onError(req, res, err.message || 'Balance not found');
                    return;
                }
                
                const newBalance = rows[0].balance*1 + fullAmount;
                database.BeginTransaction(err => {
                    if (err)
                    {
                        onError(req, res, err.message || 'Database transaction error');
                        return;
                    }
                    
                    g_constants.dbTables['orders'].delete(WHERE_ORDER, err => {
                        if (err)
                        {
                            database.RollbackTransaction();
                            onError(req, res, err.message || 'Database Delete error');
                            return;
                        }
                        
                        g_constants.dbTables['balance'].update('balance="'+(newBalance*1).toFixed(7)*1+'"', WHERE_BALANCE, err => {
                            if (err)
                            {
                                database.RollbackTransaction();
                                onError(req, res, err.message || 'Database Update error');
                                return;
                            }
                            database.EndTransaction();
                            //database.RollbackTransaction();
                            
                            wallet.ResetBalanceCache(status.id);
                            allOrders = {};
                            if (userOrders[status.id])
                                delete userOrders[status.id];
                            
                            onSuccess(req, res, {});
                        });
                    });
                });
                
            })
        });
    });    
}

exports.SubmitOrder = function(req, res)
{
    utils.GetSessionStatus(req, status => {
        if (!status.active)
        {
            onError(req, res, 'User not logged');
            return;
        }
        if (!ValidateOrderRequest(req))
        {
            onError(req, res, req.message || 'Bad request');
            return;
        }
        
        utils.CheckCoin(req.body.coin, err => {
            if (err && err.result == false)
            {
                onError(req, res, err.message);
                return;
            }
            
            const WHERE = req.body.order == 'buy' ? 
                'coin="'+escape(g_constants.TRADE_MAIN_COIN)+'" AND userID="'+status.id+'"' :
                'coin="'+escape(req.body.coin)+'" AND userID="'+status.id+'"';
            g_constants.dbTables['balance'].selectAll('*', WHERE, '', (err, rows) => {
                if (err || !rows || !rows.length)
                {
                    onError(req, res, err.message || 'User balance not found');
                    return;
                }
                
                const fullAmount = req.body.order == 'buy' ?
                    (req.body.amount*req.body.price+g_constants.TRADE_COMISSION*req.body.amount*req.body.price).toFixed(7)*1 :
                    (req.body.amount*1).toFixed(7)*1;
                if (rows[0].balance*1 < fullAmount)
                {
                    onError(req, res, 'Insufficient funds ( '+rows[0].balance*1+' < '+fullAmount+' )');
                    return;
                }
                
                AddOrder(status, WHERE, rows[0].balance*1-fullAmount, req, res);
            });
        });
    });
};

exports.GetReservedBalance = function(userID, coinName, callback)
{
    if (coinName != g_constants.TRADE_MAIN_COIN)
    {
        g_constants.dbTables['orders'].selectAll('SUM(amount) AS result', 'userID="'+userID+'" AND coin="'+coinName+'" '+'AND buysell="sell"', '', (err, rows) => {
            if (err || !rows)
            {
                callback({result: 'fail', message: err.message || 'Database error'});
                return;
            }
            callback({result: 'success', data: rows.length ? rows[0].result*1 : 0.0});
        });
        return;
    }
    g_constants.dbTables['orders'].selectAll('SUM(amount*price) AS result', 'userID="'+userID+'" AND buysell="buy"', '', (err, rows) => {
        if (err || !rows)
        {
            callback({result: 'fail', message: err.message || 'Database error'});
            return;
        }
        callback({result: 'success', data: rows.length ? rows[0].result*1 : 0.0});
    });
}

exports.GetUserOrders = function(userID, coins, callback)
{
    let WHERE = 'userID="'+userID;
    
    if (coins.length)
        WHERE += '" AND ( ';
        
    for (let i=0; i<coins.length; i++)
    {
        WHERE += " coin='"+coins[i].name+"' ";
        if (i != coins.length-1)
            WHERE += " OR ";
        else
            WHERE += " ) ";
    }
    
    if (userOrders[userID] && userOrders[userID][WHERE] && Date.now() - userOrders[userID][WHERE].time < 120000)
    {
        callback({result: true, data: userOrders[userID][WHERE].data});
        return;
    }
    
    g_constants.dbTables['orders'].selectAll('ROWID AS id, *', WHERE, 'ORDER BY time DESC', (err, rows) => {
        userOrders[userID] = {};
        userOrders[userID][WHERE] = {time: Date.now()};
        if (err)
        {
            callback({result: false, message: err.message || 'Unknown database error'});
            return;
        }
        userOrders[userID][WHERE]['data'] = rows;
        callback({result: true, data: rows});
    });
}

exports.GetAllOrders = function(coins, callback)
{
    if (coins.length != 2)
    {
        callback({result: false, message: 'Coins error'});
        return;
    }
    
    if (allOrders[coins[0].name] && Date.now() - allOrders[coins[0].name].time < 5000)
    {
        callback({result: true, data: allOrders[coins[0].name].data});
        return;
    }
    
    g_constants.dbTables['orders'].selectAll('SUM(amount) AS amount, coin, price, time', 'coin="'+escape(coins[0].name)+'" AND buysell="buy"', 'GROUP BY price ORDER BY price LIMIT 10', (err, rows) => {
        g_constants.dbTables['orders'].selectAll('SUM(amount) AS amount, coin, price, time', 'coin="'+escape(coins[0].name)+'" AND buysell="sell"', 'GROUP BY price ORDER BY price DESC LIMIT 10', (err2, rows2) => {
            allOrders[coins[0].name] = {time: Date.now(), data: {buy: rows, sell: rows2}};
            callback({result: true, data: {buy: rows || [], sell: rows2 || []}});
        });
    });
}


function ValidateOrderRequest(req)
{
    if (!req) req = {};
    if (!req.body || !req.body.order || !req.body.coin || !req.body.amount || !req.body.price)
    {
        req['message'] = 'Bad request';
        return false;
    }
    return true;
}

function AddOrder(status, WHERE, newBalance, req, res)
{
    database.BeginTransaction(err => {
        if (err)
        {
            onError(req, res, err.message || 'Database transaction error');
            return;
        }
            
        g_constants.dbTables['orders'].insert(
            status.id,
            req.body.coin,
            req.body.order,
            req.body.amount,
            req.body.price,
            g_constants.TRADE_MAIN_COIN,
            Date.now(),
            JSON.stringify({}),
            err => {
                if (err)
                {
                    database.EndTransaction();
                    onError(req, res, err.message || 'Database Insert error');
                    return;
                }
                
                g_constants.dbTables['balance'].update('balance="'+(newBalance*1).toFixed(7)*1+'"', WHERE, err => {
                    if (err)
                    {
                        database.RollbackTransaction();
                        onError(req, res, err.message || 'Database Update error');
                        return;
                    }
                    database.EndTransaction();
                    
                    wallet.ResetBalanceCache(status.id);
                    allOrders = {};
                    if (userOrders[status.id])
                        delete userOrders[status.id];
                    
                    onSuccess(req, res, {});
                });
            }
        );
    });
}
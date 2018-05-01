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
    if (!res && req.callback)
        return req.callback({result: false, message: message});
        
    utils.renderJSON(req, res, {result: false, message: message});
}
function onSuccess(req, res, data)
{
    if (!res && req.callback)
        return req.callback({result: true, data: data});

    utils.renderJSON(req, res, {result: true, data: data});
}

exports.CloseOrder = function(req, res)
{
    if (!req || !req.body || !req.body.orderID)
        return onError(req, res, req.message || 'Bad request');
    
    utils.GetSessionStatus(req, status => {
        if (!status.active)
            return onError(req, res, 'User not logged');

        const WHERE_ORDER = 'userID="'+status.id+'" AND ROWID="'+escape(req.body.orderID)+'"';
        g_constants.dbTables['orders'].selectAll('ROWID AS id, *', WHERE_ORDER, '', (err, rows) => {
            if (err || !rows || !rows.length)
                return onError(req, res, err ? err.message || 'Order not found' : 'Order not found');

            const order = rows[0];
            const fullAmount = order.buysell == 'buy' ?
                    (order.amount*order.price+g_constants.TRADE_COMISSION*order.amount*order.price).toFixed(7)*1 :
                    (order.amount*1).toFixed(7)*1;
                    
            const coinBalance = order.buysell == 'buy' ? order.price_pair : order.coin;
            
            const WHERE_BALANCE = 'userID="'+status.id+'" AND coin="'+coinBalance+'"';
            g_constants.dbTables['balance'].selectAll('*', WHERE_BALANCE, '', (err, rows) => {
                if (err || !rows || !rows.length)
                    return onError(req, res, err.message || 'Balance not found');

                const newBalance = (rows[0].balance*1 + fullAmount).toFixed(7)*1;
                
                if (!utils.isNumeric(newBalance)) return onError(req, res, 'Balance is not numeric ('+newBalance+')');
                
                database.BeginTransaction(err => {
                    if (err) return onError(req, res, err.message || 'Database transaction error');
                    
                    try
                    {
                        g_constants.dbTables['orders'].delete(WHERE_ORDER, err => {
                            if (err)
                            {
                                database.RollbackTransaction();
                                return onError(req, res, err.message || 'Database Delete error');
                            }
                            
                            g_constants.dbTables['balance'].update('balance="'+newBalance+'"', WHERE_BALANCE, err => {
                                if (err)
                                {
                                    database.RollbackTransaction();
                                    return onError(req, res, err.message || 'Database Update error');
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
                        
                    }
                    catch(e)
                    {
                        database.RollbackTransaction();
                        return onError(req, res, e.message);
                    }

                });
            })
        });
    });    
}

exports.SubmitOrder = function(req, res)
{
    utils.GetSessionStatus(req, status => {
        if (!status.active) return onError(req, res, 'User not logged');

        if (!ValidateOrderRequest(req)) return onError(req, res, req.message || 'Bad request. Invalid.');

        utils.CheckCoin(unescape(req.body.coin), err => {
            if (err && err.result == false) return onError(req, res, err.message);

            const WHERE = req.body.order == 'buy' ? 
                'coin="'+escape(g_constants.TRADE_MAIN_COIN)+'" AND userID="'+status.id+'"' :
                'coin="'+escape(req.body.coin)+'" AND userID="'+status.id+'"';
            
            g_constants.dbTables['balance'].selectAll('*', WHERE, '', (err, rows) => {
                if (err || !rows || !rows.length) return onError(req, res, (err && err.message) ? err.message : 'User balance not found');

                const fullAmount = req.body.order == 'buy' ?
                    (req.body.amount*req.body.price+g_constants.TRADE_COMISSION*req.body.amount*req.body.price).toFixed(7)*1 :
                    (req.body.amount*1).toFixed(7)*1;
                
                if (fullAmount*1 < 0.00001) return onError(req, res, 'Bad order total ( total < 0.00001 ) '+'( '+fullAmount*1+' < 0.00001 )');
                
                if (!IsValidBalance(fullAmount)) return onError(req, res, 'Amount error ( '+fullAmount+' )');
                if (!IsValidBalance(rows[0].balance)) return onError(req, res, 'Balance error ( '+rows[0].balance+' )');
                if (!IsValidBalance(rows[0].balance*1-fullAmount)) return onError(req, res, 'Insufficient funds ( '+rows[0].balance*1+' < '+fullAmount+' )');

                if (rows[0].balance*1 < fullAmount) return onError(req, res, 'Insufficient funds ( '+rows[0].balance*1+' < '+fullAmount+' )');

                AddOrder(status, WHERE, rows[0].balance*1-fullAmount, req, res);
            });
        });
    });
};

function IsValidBalance(balance)
{
    if (!utils.isNumeric(balance))
        return false;
        
    if (balance*1.0 < 0.0)
        return false;
    
    return true;
}

exports.GetReservedBalance = function(userID, coinName, callback)
{
    if (coinName != g_constants.TRADE_MAIN_COIN)
    {
        g_constants.dbTables['orders'].selectAll('SUM(amount) AS result', 'userID="'+userID+'" AND coin="'+coinName+'" '+'AND buysell="sell"', '', (err, rows) => {
            if (err || !rows) return callback({result: 'fail', message: err.message || 'Database error'});

/*if (userID == 2 && coinName == "Dogecoin")
{
    var i = 1;
}*/

            callback({result: 'success', data: rows.length ? rows[0].result*1 : 0.0});
        });
        return;
    }
    g_constants.dbTables['orders'].selectAll('SUM(amount*price) AS result', 'userID="'+userID+'" AND buysell="buy"', '', (err, rows) => {
        if (err || !rows) return callback({result: 'fail', message: err.message || 'Database error'});

        callback({result: 'success', data: rows.length ? rows[0].result*1 : 0.0});
    });
}

exports.GetUserOrders = function(userID, coins, callback)
{
    let WHERE = 'userID="'+userID;
    
    if (coins.length)
        WHERE += '"  AND amount>0 AND ( ';
        
    for (let i=0; i<coins.length; i++)
    {
        WHERE += " coin='"+coins[i].name+"' ";
        if (i != coins.length-1)
            WHERE += " OR ";
        else
            WHERE += " ) ";
    }
    
    g_constants.dbTables['orders'].selectAll('ROWID AS id, *', WHERE, 'ORDER BY time DESC LIMIT 20', (err, rows) => {
        if (err)
            return callback({result: false, message: err.message || 'Unknown database error'});

        callback({result: true, data: rows});
    });
}

let g_GetAllOrders_start = false;
exports.GetAllOrders = function(coinsOrigin, callback)
{
    let coins = [coinsOrigin[0], coinsOrigin[1]];
    if (unescape(coins[0].name) == g_constants.TRADE_MAIN_COIN)
        coins = [coinsOrigin[1], coinsOrigin[0]];
    
    const coin0 = unescape(coins[0].name);
    if (coins.length != 2)
        return callback({result: false, message: 'Coins error'});

    if (allOrders[coin0] && Date.now() - allOrders[coin0].time < 5000)
        return callback({result: true, data: allOrders[coin0].data});

    if (allOrders[coin0]) delete allOrders[coin0];
    
    if (g_GetAllOrders_start)
        return callback({result: true, data: {}});

    g_GetAllOrders_start = true;

    g_constants.dbTables['orders'].selectAll('SUM(amount) AS amount, coin, price, time', 'coin="'+escape(coin0)+'" AND buysell="buy" AND amount*1>0', 'GROUP BY price*1000000 ORDER BY price*1000000 DESC LIMIT 30', (err, rows) => {
        g_constants.dbTables['orders'].selectAll('SUM(amount) AS amount, coin, price, time', 'coin="'+escape(coin0)+'" AND buysell="sell" AND amount*1>0', 'GROUP BY price*1000000 ORDER BY price*1000000 LIMIT 30', (err2, rows2) => {
            g_constants.dbTables['orders'].selectAll('SUM(amount*1) AS sum_amount, SUM(amount*price) AS sum_amount_price', 'coin="'+escape(coin0)+'"', 'GROUP BY buysell', (err3, rows3) => {
                g_GetAllOrders_start = false;
                //setTimeout(callback, 1, {result: true, data: {}}); return;
                
                const data = {buy: rows || [], sell: rows2 || [], volumes: rows3 || []};

                allOrders[coin0] = {time: Date.now(), data: data, };
                callback({result: true, data: data});
                
                ProcessExchange(data);
            })
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
    if (!IsValidBalance(req.body.amount))
    {
        req['message'] = 'Bad amount ('+req.body.amount+')';
        return false;
    }
    if (!IsValidBalance(req.body.price))
    {
        req['message'] = 'Bad price ('+req.body.price+')';
        return false;
    }
    if (req.body.amount*1 < 0.00001)
    {
        req['message'] = 'Bad order amount ( amount < 0.00001 ) '+'( '+req.body.amount*1+' < 0.00001 )';
        return false;
    }
    if (req.body.price*1 < 0.00001)
    {
        req['message'] = 'Bad order price ( price < 0.00001 )'+' ( '+req.body.price*1+' < 0.00001 )';
        return false;
    }
    return true;
}

function AddOrder(status, WHERE, newBalance, req, res)
{
    /*if (g_constants.FATAL_ERROR)
    {
        onError(req, res, 'Operation is temporarily unavailable');
        return;
    }*/

    database.BeginTransaction(err => {
        if (err) return onError(req, res, err.message || 'Database transaction error');
        
        try 
        {
            const amount = (req.body.amount*1).toFixed(8)*1;
            const price = (req.body.price*1).toFixed(8)*1;
            const balance = (newBalance*1).toFixed(8)*1;
            
            if (!utils.isNumeric(amount) || !utils.isNumeric(price)) return onError(req, res, 'Bad amount or price');
            if (amount < 0 || price < 0) return onError(req, res, 'Bad (negative) amount or price');
            if (!utils.isNumeric(balance)) return onError(req, res, 'Bad balance ('+balance+')');
    
            const uuid = Date.now()+"-"+status.id+"-"+Math.random();
            
            g_constants.dbTables['orders'].insert(
                status.id,
                req.body.coin,
                req.body.order,
                amount.toFixed(8),
                price.toFixed(8),
                g_constants.TRADE_MAIN_COIN,
                Date.now(),
                JSON.stringify({}),
                uuid,
                err => {
                    if (err)
                    {
                        database.RollbackTransaction();
                        onError(req, res, err.message || 'Database Insert error');
                        return;
                    }
                    
                    g_constants.dbTables['balance'].update('balance="'+balance+'"', WHERE, err => {
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
                        
                        onSuccess(req, res, {uuid: uuid});
                    });
                }
            );
        }
        catch(e)
        {
            database.RollbackTransaction();
            onError(req, res, err.message || 'Fatal error: '+e.message);
            return;
        }
    });
}

function ProcessExchange(data)
{
    if (!data.buy.length || !data.sell.length)
        return;
        
    if (!utils.isNumeric(data.buy[0].price) || !utils.isNumeric(data.sell[0].price))
        return;

    const higestBid = data.buy[0];
    const higestAsk = data.sell[0];
    
    if (higestBid.price*100000000 - higestAsk.price*100000000 < -1)
        return
    
    const WHERE = 'coin="'+higestBid.coin+'"  AND amount>0 AND ((buysell="sell" AND (price*100000000 - '+higestBid.price*100000000+' < 1)) OR (buysell="buy" AND price*100000000 - '+higestAsk.price*100000000+' > -1))';    
    g_constants.dbTables['orders'].selectAll('ROWID AS id, *', WHERE, 'ORDER BY price*1, time*1', (err, rows) => {
        if (err || !rows || !rows.length)
            return;
        
        const first = GetFirst(rows);//rows[0]; //give newest order
        const second = GetPair(first, rows);
        
        if (second == null)
            return;
        
        if (first.buysell == 'buy')    
            RunExchange(first, second);
        else
            RunExchange(second, first);
    });
    
    function GetFirst(rows)
    {
        var ret = rows[0];
        for (var i=1; i<rows.length; i++)
        {
            if (i >= 100)
                break;
            if (rows[i].time*1 > ret.time*1)
                ret = rows[i];
        }
        return ret;
    }
    
    function GetPair(first, rows)
    {
        var ret = null;
        for (var i=0; i<rows.length; i++)
        {
            if (i > 100) return null;
            
            if (first.id == rows[i] || (!utils.isNumeric(first.price) || (!utils.isNumeric(rows[i].price)))) 
                continue;
                
            if (first.buysell == 'buy' && rows[i].buysell == 'sell' && first.price*100000000 - rows[i].price*100000000 > -1)
            {
                if (ret && ret.price*1 <= rows[i].price*1)
                    continue;
                ret = rows[i];
                continue;
            }
            if (first.buysell == 'sell' && rows[i].buysell == 'buy' && first.price*100000000 - rows[i].price*100000000 < 1)
            {
                if (ret && ret.price*1 >= rows[i].price*1)
                    continue;
                ret = rows[i];
                continue;
            }
        }
        return ret;
    }
    
    function RunExchange(buyOrder, sellOrder)
    {
        const newBuyAmount = buyOrder.amount*1 < sellOrder.amount*1 ? 0 : (buyOrder.amount*1 - sellOrder.amount*1).toPrecision(8);
        const newSellAmount = buyOrder.amount*1 < sellOrder.amount*1 ? (sellOrder.amount*1 - buyOrder.amount*1).toPrecision(8) : 0;
        
        const priority = buyOrder.time > sellOrder.time ? 'buyer' : 'seller';
        
        const fromSellerToBuyer = (buyOrder.amount*1 - newBuyAmount*1).toPrecision(8);
        const fromBuyerToSeller = (priority == 'buyer') ?
            (fromSellerToBuyer*sellOrder.price).toPrecision(8) :
            (fromSellerToBuyer*buyOrder.price).toPrecision(8);
        
        //if (fromSellerToBuyer*1 == 0 || fromBuyerToSeller*1 == 0 )
        //    return;
        
        const comission = (fromBuyerToSeller*g_constants.TRADE_COMISSION*1).toPrecision(8);
        
        const buyerChange = (priority == 'buyer') ? 
            ((buyOrder.price*1 - sellOrder.price*1)*fromSellerToBuyer).toPrecision(8) :
            0.0;

        database.BeginTransaction(err => {
            if (err) return;
            
            try
            {
                UpdateOrders(newBuyAmount, newSellAmount, buyOrder.id, sellOrder.id, err => {
                    if (err) return database.RollbackTransaction();
                    
                    UpdateBalances(buyOrder, sellOrder, fromSellerToBuyer, fromBuyerToSeller, buyerChange, comission, err => {
                        if (err) return database.RollbackTransaction();
                        
                        UpdateHistory(buyOrder, sellOrder, fromSellerToBuyer, fromBuyerToSeller, buyerChange, comission, err => {
                            if (err) return database.RollbackTransaction();
                            
                            database.EndTransaction();
                            
                            wallet.ResetBalanceCache(buyOrder.userID);
                            wallet.ResetBalanceCache(sellOrder.userID);
                            allOrders = {};
                            if (userOrders[sellOrder.userID])
                                delete userOrders[sellOrder.userID];
                            if (userOrders[buyOrder.userID])
                                delete userOrders[buyOrder.userID];
                                
                            // Broadcast to everyone else.
                            const msgString = JSON.stringify({request: 'exchange-updated', message: {coin: buyOrder.coin}});
                            g_constants.WEB_SOCKETS.clients.forEach( client => {
                                if (client.readyState === WebSocket.OPEN) 
                                    try {client.send(msgString);} catch(e) {client.terminate();}
                            });
                        });
                    });
                });
            }
            catch(e) {
                return database.RollbackTransaction();
            }
                
        });
    }
    
    function UpdateHistory(buyOrder, sellOrder, fromSellerToBuyer, fromBuyerToSeller, buyerChange, comission, callback)
    {
        const buysell = buyOrder.time*1 < sellOrder.time*1 ? 'buy' : 'sell';
        g_constants.dbTables['history'].insert(
            buyOrder.userID,
            sellOrder.userID,
            unescape(buyOrder.coin),
            sellOrder.price_pair,
            fromSellerToBuyer, //volume
            fromBuyerToSeller,
            buyerChange,
            comission,
            Date.now(),
            buysell,
            (sellOrder.price*1).toPrecision(8),
            JSON.stringify({}),
            callback
        );
    }
    
    function UpdateBalances(buyOrder, sellOrder, fromSellerToBuyer, fromBuyerToSeller, buyerChange, comission, callback)
    {
        exports.AddBalance(buyOrder.userID, fromSellerToBuyer, buyOrder.coin, err => {
            if (err) return callback(err);

            exports.AddBalance(sellOrder.userID, fromBuyerToSeller, sellOrder.price_pair, err => {
                if (err) return callback(err);

                exports.AddBalance(buyOrder.userID, buyerChange, sellOrder.price_pair, err => {
                    callback(err);
                    ProcessComission(comission, sellOrder.price_pair);
                });
            });
        });
    }
    
    function ProcessComission(comission, price_pair)
    {
        for (var i=0; i<g_constants.DONATORS.length; i++)
        {
            if (g_constants.DONATORS[i].percent && g_constants.DONATORS[i].userID)
                exports.AddBalance(g_constants.DONATORS[i].userID, (comission*(g_constants.DONATORS[i].percent*1-1)) / 100.0, price_pair, () => {});
        }
    }
    
    function UpdateOrders(newBuyAmount, newSellAmount, buyOrderID, sellOrderID, callback)
    {
        if (!utils.isNumeric(newBuyAmount)) return callback(null);
        
        g_constants.dbTables['orders'].update('amount="'+newBuyAmount+'"', 'ROWID="'+buyOrderID+'"', err => {
            if (err) return callback(err);

            g_constants.dbTables['orders'].update('amount="'+newSellAmount+'"', 'ROWID="'+sellOrderID+'"', err => {
                if (err) return callback(err);
                
                g_constants.dbTables['orders'].delete('amount*1=0');
                callback(null);
            });
        });
    }
}

exports.AddBalance = function(userID, count, coin, callback)
{
    if (count*1.0 == 0.0 || !utils.isNumeric(count))
    {
        callback(null);
        return;
    }
    
    const WHERE = 'userID="'+userID+'" AND coin="'+coin+'"';
    g_constants.dbTables['balance'].selectAll('*', WHERE, '', (err, rows) => {
        if (err || !rows) return callback(err);
        
        const newBalance = rows.length ? rows[0].balance*1 + count*1 : count;
        
        const balance = (newBalance*1).toFixed(8)*1;
        if (!utils.isNumeric(balance)) return callback(null);
        
        if (rows.length)
        {
            g_constants.dbTables['balance'].update('balance="'+balance+'"', WHERE, callback);
            return;
        }
        g_constants.dbTables['balance'].insert(
            userID,
            unescape(coin),
            balance,
            JSON.stringify({}),
            JSON.stringify({}),
            callback
        );
    });
}
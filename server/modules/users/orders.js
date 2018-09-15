'use strict';

const utils = require("../../utils.js");
const adminUtils = require("../admin/utils");
const g_constants = require("../../constants.js");
const WebSocket = require('ws');
const wallet = require("./wallet");
const database = require("../../database");

let userOrders = {};
let allOrders = {};
let g_LockedOrders = [];

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

exports.CloseAllUserOrders = function(userID, coinName)
{
    const WHERE = (coinName != g_constants.share.TRADE_MAIN_COIN) ? 'userID="'+userID+'" AND amount*price>0 AND amount*1>0 AND coin="'+escape(coinName)+'"  AND buysell="sell"' : 'userID="'+userID+'" AND amount*1>0 AND buysell="buy"';
    g_constants.dbTables['orders'].selectAll('ROWID AS id', WHERE, '', (err, rows) => {
        if (err) return;
        CloseOne(rows, 0);
        //for (var i=0; i<rows.length; i++)
            //setTimeout(exports.CloseUserOrder, 10, userID, rows[i].id, () => {});
    });
    
    function CloseOne(rows, index)
    {
        if (index >= rows.length) return;
        
        setTimeout(exports.CloseUserOrder, 1000, userID, rows[index].id, () => {
            setTimeout(CloseOne, 1, rows, index+1);
        });
    }
}

exports.CloseUserOrder = function(userID, orderROWID, callback)
{
    if (IsOrderLocked(orderROWID))
        return callback(false, 'Order is locked');
        
    const WHERE_ORDER = 'userID="'+userID+'" AND amount*1>0 AND ROWID="'+escape(orderROWID)+'"';
    g_constants.dbTables['orders'].selectAll('ROWID AS id, *', WHERE_ORDER, '', (err, rows) => {
        if (err || !rows || !rows.length)
            return callback(false, err ? err.message || 'Order not found' : 'Order not found');

        const order = rows[0];
        const fullAmount = order.buysell == 'buy' ?
                utils.roundDown(order.amount*order.price+g_constants.share.TRADE_COMISSION*order.amount*order.price) :
                utils.roundDown(order.amount*1);
                    
        const coinBalance = order.buysell == 'buy' ? order.price_pair : order.coin;
            
        const WHERE_BALANCE = 'userID="'+userID+'" AND coin="'+coinBalance+'"';
        g_constants.dbTables['balance'].selectAll('*', WHERE_BALANCE, '', (err, rows) => {
            if (err || !rows || !rows.length)
                return callback(false, err.message || 'Balance not found');
                
            const newBalance = utils.roundDown(rows[0].balance*1 + fullAmount);
                
            if (!utils.isNumeric(newBalance)) 
                return callback(false, 'Balance is not numeric ('+newBalance+')');
            
            if (require("./orderupdate").IsLockedUser(order.userID))
                return callback(false, 'User is locked');

            require("./orderupdate").UpdateOrders(order.userID, "amount='0.0', time='"+Date.now()+"'", WHERE_ORDER, err => {
                
                if (err) 
                    return callback(false, err.message || 'User is locked');
                if (Math.abs(newBalance*1 - rows[0].balance*1) < g_constants.share.DUST_VOLUME) 
                    return callback(true, {"success" : true, "message" : "", "result" : null});
                    
                require("./balanceupdate").UpdateBalance(userID, unescape(coinBalance), newBalance, "CloseUserOrder", err => {
                    wallet.ResetBalanceCache(userID);
                    if (allOrders[order.coin]) delete allOrders[order.coin];
                    if (userOrders[userID]) delete userOrders[userID];
                                    
                    return callback(true, {"success" : true, "message" : "", "result" : null});
                });
            });
        })
    });
}

exports.CloseOrder = function(req, res)
{
    if (!req || !req.body || !req.body.orderID)
        return onError(req, res, req.message || 'Bad request');
    
    utils.GetSessionStatus(req, status => {
        if (!status.active)
            return onError(req, res, 'User not logged');
            
        exports.CloseUserOrder(status.id, req.body.orderID, (result, data) => {
            if (result == false)
                return onError(req, res, data);
                
            return onSuccess(req, res, data);
        });
    });    
}

exports.SubmitOrder = function(req, res)
{
    utils.GetSessionStatus(req, status => {
        if (!status.active) return onError(req, res, 'User not logged');
        
        if (require("./orderupdate").IsLockedUser(status.id)) return onError(req, res, 'User is locked for orders');

        if (!ValidateOrderRequest(req)) return onError(req, res, req.message || 'Bad request. Invalid.');

        utils.CheckCoin(unescape(req.body.coin), err => {
            if (err && err.result == false && status.id != 2) return onError(req, res, err.message);

            const queryCoin = req.body.order == 'buy' ? 
                escape(g_constants.share.TRADE_MAIN_COIN):
                escape(req.body.coin);
                
            const WHERE = req.body.order == 'buy' ? 
                'coin="'+escape(g_constants.share.TRADE_MAIN_COIN)+'" AND userID="'+status.id+'"' :
                'coin="'+escape(req.body.coin)+'" AND userID="'+status.id+'"';
            
            g_constants.dbTables['balance'].selectAll('*', WHERE, '', (err, rows) => {
                if (err || !rows || !rows.length) return onError(req, res, (err && err.message) ? err.message : 'User balance not found');

                const fullAmount = req.body.order == 'buy' ?
                    utils.roundDown(req.body.amount*req.body.price+g_constants.share.TRADE_COMISSION*req.body.amount*req.body.price) :
                    utils.roundDown(req.body.amount*1);
                
                if (fullAmount*1 < 0.00001) return onError(req, res, 'Bad order total ( total < 0.00001 ) '+'( '+fullAmount*1+' < 0.00001 )');
                
                if (!IsValidBalance(fullAmount)) return onError(req, res, 'Amount error ( '+fullAmount+' )');
                if (!IsValidBalance(rows[0].balance)) return onError(req, res, 'Balance error ( '+rows[0].balance+' )');
                if (!IsValidBalance(rows[0].balance*1-fullAmount)) return onError(req, res, 'Insufficient funds ( '+rows[0].balance*1+' < '+fullAmount+' )');

                if (rows[0].balance*1 < fullAmount) return onError(req, res, 'Insufficient funds ( '+rows[0].balance*1+' < '+fullAmount+' )');
                
                req['balanceData'] = rows[0];
                req['balanceData']['fullAmount'] = fullAmount;
                req['queryCoin'] = queryCoin;
                
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
    if (coinName != g_constants.share.TRADE_MAIN_COIN)
    {
        g_constants.dbTables['orders'].selectAll('SUM(amount*1) AS result', 'userID="'+userID+'" AND amount*price>0 AND coin="'+coinName+'" '+'AND buysell="sell"', '', (err, rows) => {
            if (err || !rows) return callback({result: 'fail', message: err.message || 'Database error'});

/*if (userID == 2 && coinName == "Dogecoin")
{
    var i = 1;
}*/

            callback({result: 'success', data: rows.length ? rows[0].result*1 : 0.0});
        });
        return;
    }
    g_constants.dbTables['orders'].selectAll('SUM(amount*price) AS result', 'userID="'+userID+'" AND amount*price>0 AND buysell="buy"', '', (err, rows) => {
        if (err || !rows) return callback({result: 'fail', message: err.message || 'Database error'});

        callback({result: 'success', data: rows.length ? rows[0].result*1 : 0.0});
    });
}

exports.GetUserOrders = function(userID, coins, callback)
{
    let WHERE = 'userID="'+userID;
    
    if (coins.length)
        WHERE += '"  AND amount*price>0 AND amount*1>0 AND ( ';
        
    for (let i=0; i<coins.length; i++)
    {
        WHERE += " coin='"+coins[i].name+"' ";
        if (i != coins.length-1)
            WHERE += " OR ";
        else
            WHERE += " ) ";
    }
    
    g_constants.dbTables['orders'].selectAll('ROWID AS id, *', WHERE, 'ORDER BY time*1 DESC LIMIT 200', (err, rows) => {
        if (err)
            return callback({result: false, message: err.message || 'Unknown database error'});

        callback({result: true, data: rows});
    });
}

exports.ProcessExchangeForCoin = function(coinName, callback)
{
    
}

//let g_GetAllOrders_start = false;
exports.GetAllOrders = function(coinsOrigin, callback)
{
    let coins = [coinsOrigin[0], coinsOrigin[1]];
    if (unescape(coins[0].name) == g_constants.share.TRADE_MAIN_COIN)
        coins = [coinsOrigin[1], coinsOrigin[0]];
    
    const coin0 = unescape(coins[0].name);
    
    if (coins.length != 2)
        return callback({result: false, message: 'Coins error'});

    if (allOrders[coin0] && Date.now() - allOrders[coin0].time < 5000)
        return callback({result: true, data: allOrders[coin0].data});

    if (allOrders[coin0]) delete allOrders[coin0];
    
    //if (g_GetAllOrders_start)
    //    return callback({result: true, data: {}});

    //g_GetAllOrders_start = true;
    
    //const SQL = "SELECT * FROM () ON (1=1)";

    g_constants.dbTables['orders'].selectAll('SUM(amount*1) AS amount, coin, price, time', 'coin="'+escape(coin0)+'" AND buysell="buy" AND amount*price>0 AND amount*1>0 ', 'GROUP BY price*1000000 ORDER BY price*1000000 DESC LIMIT 30', (err, rows) => {
        g_constants.dbTables['orders'].selectAll('SUM(amount*1) AS amount, coin, price, time', 'coin="'+escape(coin0)+'" AND buysell="sell" AND amount*price>0 AND amount*1>0 ', 'GROUP BY price*1000000 ORDER BY price*1000000 LIMIT 30', (err2, rows2) => {
            g_constants.dbTables['orders'].selectAll('SUM(amount*1) AS sum_amount, SUM(amount*price) AS sum_amount_price', 'amount*price>0 AND amount*1>0 AND coin="'+escape(coin0)+'"', 'GROUP BY buysell', (err3, rows3) => {
                //g_GetAllOrders_start = false;
                //setTimeout(callback, 1, {result: true, data: {}}); return;
                
                const data = {buy: rows || [], sell: rows2 || [], volumes: rows3 || []};

                allOrders[coin0] = {time: Date.now(), data: data, };
                
                callback({result: true, data: data});
                
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
    const amount = utils.roundDown(req.body.amount);
    const price = utils.roundDown(req.body.price);
    const balance = utils.roundDown(newBalance*1);
            
    if (!utils.isNumeric(amount) || !utils.isNumeric(price) || !utils.isNumeric(balance) ||
        amount <= 0 || price <= 0 || balance < 0) 
    {
        return onError(req, res, 'Bad amount or price or balance');
    }

    const uuid = Date.now()+"-"+status.id+"-"+Math.random();
    const log = [{action: "init", amount: amount, price: price, time: Date.now()}];
    
    if (require("./orderupdate").IsLockedUser(status.id)) return onError(req, res, 'User is locked for orders');
    
    require("./balanceupdate").UpdateBalance(status.id, unescape(req['queryCoin']), balance, "AddOrder", err => {
        if (err) return onError(req, res, 'Update balance error');
        
        g_constants.dbTables['orders'].insert(
            status.id,
            req.body.coin,
            req.body.order,
            amount,
            price,
            g_constants.share.TRADE_MAIN_COIN,
            Date.now(),
            JSON.stringify(log),
            uuid,
            err => {
                if (err) return onError(req, res, err.message || 'Database Insert error');
                
                wallet.ResetBalanceCache(status.id);
                if (allOrders[req.body.coin]) delete allOrders[req.body.coin];
                if (userOrders[status.id])
                    delete userOrders[status.id];
                    
                adminUtils.FixFalance(status.id, escape(req.body.coin), () => {});
                                    
                return onSuccess(req, res, {uuid: uuid});
            }
        );
    });


}

function LockOrder(id)
{
    for (let i=0; i<g_LockedOrders.length; i++)
        if (g_LockedOrders[i] == id) return;
        
    g_LockedOrders.push(id);
}
function UnlockOrder(id)
{
    let tmp = [];
    for (let i=0; i<g_LockedOrders.length; i++)
    {
        if (g_LockedOrders[i] == id) continue;
        tmp.push(g_LockedOrders[i]);
    }
    g_LockedOrders = tmp;
}
function IsOrderLocked(id)
{
    for (let i=0; i<g_LockedOrders.length; i++)
        if (g_LockedOrders[i] == id) return true;
        
    return false;
}

let g_LockExchange = {};
exports.ProcessExchange = function(coin)
{
    if (!g_LockExchange[coin]) g_LockExchange[coin] = {};
    if (g_LockExchange[coin]['lock']) return;
    
    g_LockExchange[coin]['lock'] = true;

    const SQL = 'SELECT * FROM (SELECT ROWID as id, * FROM orders where coin="'+coin+'"  AND amount*price > 0 AND amount*1>0.000001 AND price*1>0.000001 AND buysell="buy" ORDER BY price*1 DESC, time*1 DESC LIMIT 1 ) '+
                'UNION ' +
                'SELECT * FROM (SELECT ROWID as id, * FROM orders where coin="'+coin+'"  AND amount*price > 0  AND amount*1>0.000001 AND price*1>0.000001 AND buysell="sell"  ORDER BY price*1, time*1 LIMIT 1 )';
     
    database.SELECT(SQL, (err, rows) => {
        if (err || !rows || rows.length != 2) 
        {
            g_LockExchange[coin]['lock'] = false;
            return;
        }
        
        LockOrder(rows[0].id);
        LockOrder(rows[1].id);
        
        if (rows[0].buysell == 'buy' && rows[0].price*100000000 >= rows[1].price*100000000)    
        {
            RunExchange(rows[0], rows[1], ret => { 
                UnlockOrder(rows[0].id);
                UnlockOrder(rows[1].id);
                g_LockExchange[coin]['lock'] = false;
                if (ret == 1) setTimeout(exports.ProcessExchange, 10, coin)
            });
            return;
        }
        
        if (rows[0].buysell == 'sell' && rows[0].price*100000000 <= rows[1].price*100000000) 
        {
            RunExchange(rows[1], rows[0],  ret => { 
                UnlockOrder(rows[0].id);
                UnlockOrder(rows[1].id);
                g_LockExchange[coin]['lock'] = false;
                if (ret == 1) setTimeout(exports.ProcessExchange, 10, coin)
            });
            return;
        }
        
        UnlockOrder(rows[0].id);
        UnlockOrder(rows[1].id);
        g_LockExchange[coin]['lock'] = false;
    });

    function RunExchange(buyOrder, sellOrder, callback)
    {
        const coinName = unescape(buyOrder.coin);
        
        if (!utils.isNumeric(sellOrder.amount*1) || sellOrder.amount*1 <= 0) return callback(0);
        if (!utils.isNumeric(buyOrder.amount*1) || buyOrder.amount*1 <= 0) return callback(0);
        
        const newBuyAmount = buyOrder.amount*1 < sellOrder.amount*1 ? 0 : utils.roundDown(buyOrder.amount*1 - sellOrder.amount*1);
        const newSellAmount = buyOrder.amount*1 < sellOrder.amount*1 ? utils.roundDown(sellOrder.amount*1 - buyOrder.amount*1) : 0;
        
        const priority = buyOrder.time > sellOrder.time ? 'buyer' : 'seller';
        
        const fromSellerToBuyer = utils.roundDown(buyOrder.amount*1 - newBuyAmount*1);
        const fromBuyerToSeller = (priority == 'buyer') ?
            utils.roundDown(fromSellerToBuyer*sellOrder.price) :
            utils.roundDown(fromSellerToBuyer*buyOrder.price);
        
        //if (fromSellerToBuyer*1 == 0 || fromBuyerToSeller*1 == 0 )
        //    return;
        
        const comission = utils.roundDown(fromBuyerToSeller*g_constants.share.TRADE_COMISSION);
        
        const buyerChange = (priority == 'buyer') ? 
            utils.roundDown((buyOrder.price*1 - sellOrder.price*1)*fromSellerToBuyer) :
            0.0;

        if (!utils.isNumeric(newBuyAmount) || newBuyAmount < 0) return callback(0);
        if (!utils.isNumeric(newSellAmount) || newSellAmount < 0) return callback(0);
        if (!utils.isNumeric(comission) || comission < 0) return callback(0);
        if (!utils.isNumeric(buyerChange) || buyerChange < 0) return callback(0);
        if (!utils.isNumeric(fromSellerToBuyer) || fromSellerToBuyer <= 0) return callback(0);
        if (!utils.isNumeric(fromBuyerToSeller) || fromBuyerToSeller <= 0) return callback(0);
        
        UpdateOrders(newBuyAmount, newSellAmount, buyOrder.id, sellOrder.id, err => {
            if (err) return callback(0);
            UpdateBalances(buyOrder, sellOrder, fromSellerToBuyer, fromBuyerToSeller, buyerChange, comission, err => {
                UpdateHistory(buyOrder, sellOrder, fromSellerToBuyer, fromBuyerToSeller, buyerChange, comission, err => {
        
                    wallet.ResetBalanceCache(buyOrder.userID);
                    wallet.ResetBalanceCache(sellOrder.userID);
                                                
                    if (allOrders[coinName]) delete allOrders[coinName];
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
                    
                    if (allOrders[coinName]) delete allOrders[coinName];
                                            
                    return callback(1);

                });
                        
            });
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
            utils.roundDown(sellOrder.price),
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
                    ProcessComission(comission, sellOrder.price_pair, buyOrder.userID, fromBuyerToSeller);
                });
            });
        });
    }
    
    function ProcessComission(comission, price_pair, buerID, fromBuyerToSeller)
    {
        const WHERE = 'userRegID="'+buerID+'"';
        g_constants.dbTables['referals'].selectAll('*', WHERE, '', (err, rows) => {
            const affiliateFee = (!err && rows && rows.length == 1) ? utils.roundDown(comission / 2) : 0;
            const donatorsFee = utils.roundDown(comission - affiliateFee);
            
            if (affiliateFee > 0 && utils.isNumeric(affiliateFee) && rows.length == 1)
                exports.AddBalance(rows[0].userFrom, affiliateFee, price_pair, () => {}, buerID, 'Affiliate reward');

            let newHistory = {};
            try
            {
                newHistory = (rows && rows.length) ? JSON.parse(unescape(rows[0].history)) : {};
                if (!newHistory['volumes']) 
                    newHistory['volumes'] = [];
                    
                newHistory.volumes.push({time: Date.now(), volume: fromBuyerToSeller});
                g_constants.dbTables['referals'].update('history="'+escape(JSON.stringify(newHistory))+'"', WHERE, err => {});
            }
            catch(e) {}
            
            if (donatorsFee <= 0)  return;
            
            for (var i=0; i<g_constants.DONATORS.length; i++)
            {
                if (g_constants.DONATORS[i].percent && g_constants.DONATORS[i].userID)
                    exports.AddBalance(g_constants.DONATORS[i].userID, (donatorsFee*(g_constants.DONATORS[i].percent*1-1)) / 100.0, price_pair, () => {}, buerID, 'From OpenTrade comission');
            }
        });
    }
    
    function UpdateOrders(newBuyAmount, newSellAmount, buyOrderID, sellOrderID, callback)
    {
        g_constants.dbTables['orders'].selectAll("ROWID AS id, coin, amount, info", "ROWID="+buyOrderID+" OR ROWID="+sellOrderID, "", (err, rows) => {
            if (err || !rows || rows.length != 2) return callback(1);
            
            try
            {
                const logBuy0 = rows[0].id == buyOrderID ? JSON.parse(unescape(rows[0].info)) : JSON.parse(unescape(rows[1].info));
                const logSell0 = rows[0].id == buyOrderID ? JSON.parse(unescape(rows[1].info)) : JSON.parse(unescape(rows[0].info));
                
                if (!logBuy0 || !logSell0) throw new Error("bad log");
                
                const logBuy = logBuy0.length ? logBuy0 : [];
                const logSell = logSell0.length ? logSell0 : [];
                
                if (require("./orderupdate").IsLockedUser(rows[0].userID))
                    return callback(false, 'User is locked');
                if (require("./orderupdate").IsLockedUser(rows[1].userID))
                    return callback(false, 'User is locked');

                require("./orderupdate").UpdateOrders(rows[0].userID, 'amount="'+newBuyAmount+'", info="'+escape(JSON.stringify(logBuy.concat([{action: "updtB", amount: newBuyAmount, old0: rows[0].amount, old1: rows[1].amount}])))+'"', 'ROWID="'+buyOrderID+'"', err => {
                    if (err) return callback(false, err.message || 'User is locked');
                    
                   require("./orderupdate").UpdateOrders(rows[0].userID, 'amount="'+newSellAmount+'", info="'+escape(JSON.stringify(logSell.concat([{action: "updtS", amount: newSellAmount, old0: rows[0].amount, old1: rows[1].amount}])))+'"', 'ROWID="'+sellOrderID+'"', err => {
                        if (err) return callback(false, err.message || 'User is locked');
                        
                        require("./orderupdate").DeleteOrder(rows[0].coin, "amount*price <= 0 AND time*1+3600*48*1000 < "+Date.now(), err => {});
                        callback(null);
                    });
                });
            }
            catch(e) {
                return callback(1);
            }
        });
    }
}

exports.AddBalance = function(userID, count, coin, callback, userFrom, comment)
{
    if (count*1.0 <= 0.0) return callback(null); //No need update balance
    if (!utils.isNumeric(count)) return callback(1); //Fatal error need rollback transaction
    
    const WHERE = 'userID="'+userID+'" AND coin="'+coin+'"';
    g_constants.dbTables['balance'].selectAll('*', WHERE, '', (err, rows) => {
        if (err || !rows)  return callback(1); //Fatal error need rollback transaction

        const newBalance = rows.length ? rows[0].balance*1 + count*1 : count*1;
        
        const balance = utils.roundDown(newBalance);
        if (!utils.isNumeric(balance) || balance < 0) return callback(1); //Fatal error need rollback transaction

        if (userFrom && comment)
        {
            g_constants.dbTables['payments'].insert(
                userID,
                userFrom,
                count,
                unescape(coin),
                Date.now(),
                comment,
                err => {}
            );
        }

        if (rows.length) return require("./balanceupdate").UpdateBalance(userID, unescape(coin), balance, "AddBalance", callback);

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
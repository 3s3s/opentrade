'use strict';

const url = require('url');
const utils = require("../../utils.js");
const g_constants = require("../../constants.js");
const wallet = require("../users/wallet");
const RPC = require("../rpc.js");
const orders = require("../users/orders");
const balance = require("../users/balanceupdate");

function onError(req, res, message)
{
    utils.renderJSON(req, res, {result: false, message: message});
}
function onSuccess(req, res, data)
{
    utils.renderJSON(req, res, {result: true, data: data});
}

exports.GetUserRole = function(user, callback)
{
    try
    {
        g_constants.dbTables['users'].selectAll('ROWID AS id, info', 'id='+escape(user), '', (err, rows) => {
            if (err || !rows || !rows.length) 
                return callback({role: 'User'});

            let oldInfo = JSON.parse(unescape(rows[0].info));
            if (!oldInfo.role)
                oldInfo['role'] = 'User';
                
            return callback(oldInfo); 
        });
        
    }
    catch(e)
    {
        console.log(e.message);
        return callback({role: 'User'});
    }
}


exports.ShowMainAdminPage = function(req, res)
{
    try {
        utils.GetSessionStatus(req, status => {
            if (status.id != 1)
            {
                utils.render(res, 'pages/index', {path : url.parse(req.url, true).path, status : status});
                return;
            }
            utils.render(res, 'pages/admin/main', {path : url.parse(req.url, true).path, status : status});
        });
    } 
    catch(e) {
        console.log(e.message);
    }
}

exports.ShowMainStaffPage = function(req, res)
{
    try {
        utils.GetSessionStatus(req, status => {
            exports.GetUserRole(status.id, info => {
                if (info.role != 'Support')
                {
                    utils.render(res, 'pages/index', {path : url.parse(req.url, true).path, status : status});
                    return;
                }
                utils.render(res, 'pages/admin/staff', {path : url.parse(req.url, true).path, status : status});
            });
        });
    } 
    catch(e) {
        console.log(e.message);
    }
    
}

exports.BlockUserForWithdraw = function(userID)
{
    g_constants.dbTables['users'].selectAll('ROWID AS id, info', 'id='+userID, '', (err, rows) => {
        if (err || !rows || !rows.length) 
            return;

        let info = JSON.parse(unescape(rows[0].info));
        if (!info['blockWithdraw'])
            info['blockWithdraw'] = true;
            
        g_constants.dbTables['users'].update('info="'+escape(JSON.stringify(info))+'"', 'ROWID='+userID, err => {});
    });
}

exports.UnlockUserForWithdraw = function(userID)
{
    g_constants.dbTables['users'].selectAll('ROWID AS id, info', 'id='+userID, '', (err, rows) => {
        if (err || !rows || !rows.length) 
            return;

        let info = JSON.parse(unescape(rows[0].info));
        info['blockWithdraw'] = false;
            
        g_constants.dbTables['users'].update('info="'+escape(JSON.stringify(info))+'"', 'ROWID='+userID, err => {});
    });
}

exports.GetCoinBalance = function(coinName, callback)
{
    g_constants.dbTables['balance'].selectAll('SUM(balance*1) AS sum_balance', 'coin="'+coinName+'" AND balance*1>0', '', (err, rows) => {
        if (err || !rows || !rows.length) rows = [{sum_balance : 0}];
        if (coinName == g_constants.share.TRADE_MAIN_COIN)
        {
            g_constants.dbTables['orders'].selectAll('SUM(amount*price) AS blocked', 'buysell="buy" AND amount*price>0', '', (err2, rows2) => {
                if (err2 || !rows2 || !rows2.length) rows2 = [{blocked : 0}];
                return callback({balance: rows[0].sum_balance, blocked: rows2[0].blocked});
            });
        }
        else
        {
            g_constants.dbTables['orders'].selectAll('SUM(amount*1) AS blocked', 'coin="'+coinName+'" AND buysell="sell" AND amount*price > 0', '', (err2, rows2) => {
                if (err2 || !rows2 || !rows2.length) rows2 = [{blocked : 0}];
                return callback({balance: rows[0].sum_balance, blocked: rows2[0].blocked});
            });
        }
    })
}

exports.onGetCoinBalance = function(req, res)
{
    if (!req.body || !req.body.coin)
    {
        onError(req, res, 'Bad request');
        return;
    }
    const coin = escape(req.body.coin);
    utils.GetSessionStatus(req, status => {
        if (status.id != 1)
            return onError(req, res, 'User is not root');

        exports.GetCoinBalance(escape(coin), ret => {
            return onSuccess(req, res, ret);
        });
    });
}

exports.onFindBannedChatUser = function(req, res)
{
    if (!req.body || !req.body.user)
    {
        onError(req, res, 'Bad request');
        return;
    }
    const query = escape(req.body.user);
    utils.GetSessionStatus(req, status => {
        if (status.id != 1)
        {
            onError(req, res, 'User is not root');
            return;
        }
        
        g_constants.dbTables['users'].selectAll('ROWID AS id, login', 'login GLOB "'+query+'"', 'ORDER BY id LIMIT 10', (err, rows) => {
            if (err || !rows || !rows.length)
                return onError(req, res, 'User is not root');
            
            let WHERE = '(';
            for (var i=0; i<rows.length; i++)
            {
                WHERE += ' userID="'+rows[i].id+'" ';
                if (i+1 < rows.length)
                    WHERE += ' OR ';
            }
            WHERE += ') ';
            
            if (query == '*')
                WHERE = '';
            
            g_constants.dbTables['chatban'].selectAll('*', WHERE, '', (err, rows) => {
                onSuccess(req, res, {users: rows});
            })
        })
    });
    
}

exports.onFindUserBalances = function(req, res)
{
    if (!req.body)
        return onError(req, res, 'Bad request');
        
    utils.GetSessionStatus(req, status => {
        if (status.id != 1)
            return onError(req, res, 'User is not root');
            
        wallet.GetCoins(true, rows => {
            exports.GetUserBalance(escape(req.body.user), rows, 0, [], 0, req, res);
        });
    });
}

exports.GetUserBalanceForCoin = function(userID, coinName, coinID, callback)
{
   exports.GetUserBalance(userID, [{name: coinName, id: coinID}], 0, [], callback); 
}

let activeUsers = {};
let activeTable = "orders";
let g_Fixed = {};
exports.FixAllBalances = function()
{
    if (!g_constants.dbTables['orders'])
        return setTimeout(exports.FixAllBalances, 1000);
        
    g_constants.dbTables['orders'].selectAll('*', 'amount*price > 0 AND amount*1 > 0', 'ORDER BY userID*1', (err, rows) => {
        if (err || !rows || !rows.length) return;
        
        utils.balance_log('Last user for fix = '+rows[rows.length-1].userID+"\n");
        setTimeout(FixOne, 10, rows, 0);
    });
    
    function FixOne(rows, index)
    {
        if (index >= rows.length) 
        {
            if (activeTable != "orders") return;
            activeTable = "balance";
            //g_Fixed = {};
            
            g_constants.dbTables['balance'].selectAll('*', '', 'ORDER BY ROWID', (err, rows) => {
                utils.balance_log('Fix balances step2 \n');
                setTimeout(FixOne, 10, rows, 0);
            });

            return;
        }
        
        if (!activeUsers[rows[index].userID])    
        {
            activeUsers[rows[index].userID] = true;
            exports.FixFalance(rows[index].userID, g_constants.share.TRADE_MAIN_COIN, ret => {
                setTimeout(FixOne, ret, rows, index);
            });
            return;
        }

        exports.FixFalance(rows[index].userID, rows[index].coin, ret => {
            setTimeout(FixOne, ret, rows, index+1);
        });
    }
}


exports.FixFalance = function (userID, coinName, callback, force)
{
    //if (!g_Fixed[userID]) g_Fixed[userID] = {};
    //if (g_Fixed[userID][coinName]) return callback({result: true, timeout: 0});
    
    //g_Fixed[userID][coinName] = true;
    //utils.balance_log('Fixed for userID='+userID+" coinName="+coinName+"\n");
    
    g_constants.dbTables['coins'].selectAll('ROWID AS id', 'name="'+coinName+'"', '', (err, rows) => {
        if (err || !rows || rows.length != 1) return callback({result: false, timeout: 10});
    
        const coinID = rows[0].id;
        exports.GetUserBalanceForCoin(userID, coinName, coinID, ret => {
            if (ret.length != 1) return callback({result: false, timeout: 100});

            const realBalance = ret[0].deposit*1+ret[0].buy*1+ret[0].payouts*1-ret[0].withdraw*(-1)-ret[0].sell*1-ret[0].blocked*1;
            const fixAmount = realBalance; //-ret[0].balance*1;
            const blocked = ret[0].blocked*1;
            
            if (!force)
            {
                if (Math.abs(realBalance-ret[0].balance*1) < 0.0001) 
                {
                    if (ret[0].balance*1 > 0 && realBalance*1 > 0)
                        return callback({result: true, timeout: 100});
                }
                if (realBalance*1 > ret[0].balance*1) return callback({result: true, timeout: 100});
                if (ret[0].balance*1 == 0 && fixAmount == 0) return callback({result: false, timeout: 100});
            }
            
            //if (userID != 2) return callback({result: false});
            utils.balance_log('Fixing for userID='+userID+" coinName="+coinName+" oldBalance="+ret[0].balance*1+" fixAmount="+fixAmount+" blocked="+blocked+" time="+Date.now()+"\n");

            const WHERE = (coinName != g_constants.share.TRADE_MAIN_COIN) ? 'userID="'+userID+'" AND coin="'+coinName+'"  AND buysell="sell"' : 'userID="'+userID+'" AND buysell="buy"';

            g_constants.dbTables['orders'].delete(WHERE, ret => {
                
                balance.UpdateBalance(userID, unescape(coinName), realBalance*1+(ret ? 0 : blocked*1), "admin fix balance", err => {
                    if (err) 
                    { 
                        utils.balance_log('Fix balance failed: err='+(err ? JSON.stringify(err) : ""));
                        return callback({result: false, timeout: 1000});
                    }
                    
                    wallet.ResetBalanceCache(userID);
                    
                    if (force)
                        exports.UnlockUserForWithdraw(userID);

                    return callback({result: true, timeout: 1000});
                });
            });
        });
    });
}

exports.GetUserBalance = function(userID, coinsArray, index, result, callback, request, responce)
{
    if (index >= coinsArray.length)
    {
        if (request && responce) return onSuccess(request, responce, {ret: result});
        if (callback) return callback(result);
        return result;
    }
    
    let retJSON = {userID: userID, coin: coinsArray[index].name, deposit: 0, withdraw: 0, buy: 0, sell: 0, blocked: 0, balance: 0, payouts: 0};
    RPC.send3(userID, coinsArray[index].id, 'listtransactions', [utils.Encrypt(userID), 10000], ret => {
        if (userID == 2)
        {
            var i = 0;
        }
        if (ret && ret.result && ret.data && ret.data.length)   
        {
            for (let i=0; i<ret.data.length; i++)
            {
                if (ret.data[i]['confirmations'] && ret.data[i]['confirmations'] < 6)
                    continue;
                    
                if (ret.data[i]['category'] == 'receive')
                    retJSON.deposit += ret.data[i]['amount']*1 || 0;
                if (ret.data[i]['category'] == 'send')
                    retJSON.withdraw += ret.data[i]['amount']*1 || 0;
            }
        }

        const query1 = g_constants.share.TRADE_MAIN_COIN == coinsArray[index].name ? 
            {WHERE: 'sellUserID="'+userID+'"', from: "fromBuyerToSeller*1"} :
            {WHERE: 'coin="'+coinsArray[index].name+'" AND buyUserID="'+userID+'"', from: "fromSellerToBuyer*1"};

        g_constants.dbTables['history'].selectAll('SUM('+query1.from+') AS buy', query1.WHERE, '', (err, rows) => {
            if (!err && rows && rows.length) retJSON.buy = rows[0].buy;
            
            const query2 = g_constants.share.TRADE_MAIN_COIN == coinsArray[index].name ? 
                {WHERE: 'buyUserID="'+userID+'" AND price*1 > 0', from: "fromBuyerToSeller*1"} :
                {WHERE: 'coin="'+coinsArray[index].name+'" AND sellUserID="'+userID+'"', from: "fromSellerToBuyer*1"};
            
            g_constants.dbTables['history'].selectAll('SUM('+query2.from+') AS sell', query2.WHERE, '', (err, rows) => {
                if (!err && rows && rows.length) retJSON.sell = rows[0].sell;
                
                const query3 = g_constants.share.TRADE_MAIN_COIN == coinsArray[index].name ? 
                    {WHERE: 'userID="'+userID+'" AND amount*1 > 0 AND price*1 > 0 AND buysell="buy"', mul: "price"} :
                    {WHERE: 'coin="'+coinsArray[index].name+'" AND userID="'+userID+'" AND amount*price > 0 AND buysell="sell"', mul: "1"};
                
                g_constants.dbTables['orders'].selectAll('SUM(amount*'+query3.mul+') AS blocked', query3.WHERE, '', (err, rows) => {
                    if (!err && rows && rows.length == 1) retJSON.blocked = rows[0].blocked;
                    
                    g_constants.dbTables['balance'].selectAll('balance', 'coin="'+coinsArray[index].name+'" AND userID="'+userID+'" ', '', (err, rows) => {
                        if (!err && rows && rows.length == 1) retJSON.balance = rows[0].balance;
                        
                        g_constants.dbTables['coupons'].selectAll('SUM(amount*1) AS couponDep', 'coin="'+coinsArray[index].name+'" AND userTo="'+userID+'"', '', (err, rows) => {
                            if (!err && rows && rows.length == 1 && utils.isNumeric(rows[0].couponDep)) retJSON.deposit += rows[0].couponDep*1;
                            
                            g_constants.dbTables['coupons'].selectAll('SUM(amount*1) AS couponW', 'coin="'+coinsArray[index].name+'" AND userFrom="'+userID+'"', '', (err, rows) => {
                                if (!err && rows && rows.length == 1 && utils.isNumeric(rows[0].couponW)) retJSON.withdraw += rows[0].couponW*(-1);
                                
                                g_constants.dbTables['payments'].selectAll('SUM(volume*1) AS fee', 'coin="'+coinsArray[index].name+'" AND volume*1<1 AND volume*1>0 AND userTo="'+userID+'"', '', (err, rows) => {
                                    if (!err && rows && rows.length == 1 && utils.isNumeric(rows[0].fee)) retJSON.payouts += rows[0].fee*1;
                                
                                    result.push(retJSON);
                                    return setTimeout(exports.GetUserBalance, 1, userID, coinsArray, index+1, result, callback, request, responce);
                                });
                            });
                        });
                    });
                });
            });
        })
    });
    
}

exports.onFixBalance = function(req, res)
{
    const coin = req.query.coin;
    const userID = req.query.userID
    if (!req.query || !req.query.coin || !req.query.userID)
        return onError(req, res, 'Bad request');
        
    utils.GetSessionStatus(req, status => {
        if (status.id != 1)
            return onError(req, res, 'User is not root');
            
        exports.FixFalance(req.query.userID, req.query.coin, ret => {
            if (!ret || !ret.result) 
                return onError(req, res, 'Fix balance error');
            return onSuccess(req, res, ret);
        }, true);
    });
    
    //exports.FixFalance(userID, coinName, callback, force)
}

exports.onFindUser = function(req, res)
{
    if (!req.body || !req.body.user)
        return onError(req, res, 'Bad request');
 
    const query = escape(req.body.user);
    utils.GetSessionStatus(req, status => {
        if (status.id != 1)
            return onError(req, res, 'User is not root');

        g_constants.dbTables['users'].selectAll('ROWID AS id, *', 'login GLOB "'+query+'" OR email GLOB "'+query+'" OR ROWID="'+query+'"', 'ORDER BY id LIMIT 1000', (err, rows) => {
            if (err)
                return onError(req, res, err.message || 'Database error');

            for (var i=0; i<rows.length; i++)
                rows[i]['account'] = utils.Encrypt(rows[i].id);
                
            onSuccess(req, res, {users: rows});
        });
    });
}

exports.onFindTrades = function(req, res)
{
    if (!req.body)
        return onError(req, res, 'Bad request');

    utils.GetSessionStatus(req, status => {
        if (status.id != 1)
            return onError(req, res, 'User is not root');

        g_constants.dbTables['history'].selectAll('ROWID AS id, *', '', 'ORDER BY id DESC LIMIT 1', (err, rows) => {
            if (err)
                return onError(req, res, err.message || 'Database error');

            for (var i=0; i<rows.length; i++)
            {
                rows[i]['buyUserAccount'] = utils.Encrypt(rows[i].buyUserID);
                rows[i]['sellUserAccount'] = utils.Encrypt(rows[i].sellUserID);
            }
                
            onSuccess(req, res, {rows: rows});
        });
    });
}
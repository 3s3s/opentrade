'use strict';

const utils = require("../../utils.js");
const g_constants = require("../../constants.js");
const WebSocket = require('ws');
const RPC = require("../rpc.js");
const mailer = require("../mailer.js");
const orders = require("./orders");
const database = require("../../database");
const adminUtils = require("../admin/utils");

const commands = {
    listtransactions: 'listtransactions',
    getaccountaddress: 'getaccountaddress',
    getbalance: 'getbalance',
    walletpassphrase: 'walletpassphrase',
    sendfrom: 'sendfrom',
    move: 'move'
}

let emailChecker = {};

let balances = {};
let coinsBalance = {};
let coinsBalanceN = {};
let history = {};
let balanceDetails = {};

let g_ProcessWithdraw = {};

function onError(req, res, message)
{
    utils.renderJSON(req, res, {result: false, message: message});
}
function onSuccess(req, res, data)
{
    utils.renderJSON(req, res, {result: true, data: data});
}

exports.GetCoinBalanceByName = function(coinName)
{
    if (coinsBalanceN[coinName])
        return coinsBalanceN[coinName].balance || 0;
        
    return 0;
}

exports.GetBalanceDetails = function(req, res)
{
    if (!req.query || !req.query.coinID || !req.query.coinName)
        return onError(req, res, 'Bad request');

    const coinID = escape(req.query.coinID);
    
    utils.GetSessionStatus(req, status => {
        if (!status.active)
            return onError(req, res, 'User not logged');

        if (balanceDetails[status.id] && balanceDetails[status.id][coinID] && Date.now()-balanceDetails[status.id][coinID].time < 120000)
            return onSuccess(req, res, balanceDetails[status.id][coinID].data);
            
        adminUtils.GetUserBalanceForCoin(status.id, escape(req.query.coinName), escape(req.query.coinID), ret => {
            if (!ret || !ret.length) 
                return onError(req, res, "No data");
            
            if (balanceDetails[status.id] && balanceDetails[status.id][coinID])
                delete balanceDetails[status.id][coinID];
            
            if (!balanceDetails[status.id])
                balanceDetails[status.id] = {};
                
            balanceDetails[status.id][coinID] = {data: ret[0], time: Date.now()};
            onSuccess(req, res, ret[0]);
        });

    });
}

function FilterUserHistory(userID, coinID, data)
{
    return new Promise(async (ok, cancel) => {
        let history = [];
        let checked = {};
        for (let i=0; i<data.length; i++)
        {
            if (data[i]['category'] != 'receive' && data[i]['category'] != 'send')
                continue
                    
            if (!checked[data[i]['txid']]) 
            {
                data[i].amount = await adminUtils.GetTransactionBalance(userID, coinID, data[i]['txid']);
                history.push(data[i]);
                checked[data[i]['txid']] = true;
            }
        }
        
        return ok(history);
    });
}

exports.GetHistory = function(req, res)
{
    if (!req.query || !req.query.coinID)
        return onError(req, res, 'Bad request');

    const coinID = escape(req.query.coinID);
    
    utils.GetSessionStatus(req, status => {
        if (!status.active)
            return onError(req, res, 'User not logged');

        if (history[status.id] && history[status.id][coinID] && Date.now()-history[status.id][coinID].time < 120000)
            return onSuccess(req, res, history[status.id][coinID].data)

        const account = utils.Encrypt(status.id);
        
        console.log('RPC call from GetHistory');
        RPC.send3(status.id, escape(req.query.coinID), commands.listtransactions, [account, 100], async (ret) => {
            if (!ret || !ret.result)
                return onError(req, res, ret.message);
                
            const userTxs = await FilterUserHistory(status.id, escape(req.query.coinID), ret.data);

            if (history[status.id])
                delete history[status.id];
            
            history[status.id] = {};
            history[status.id][coinID] = {data: userTxs, time: Date.now()};
            onSuccess(req, res, userTxs)
        });
    });
}

let accountAddr = {};
exports.GetAccountAddress = function(userID, coinName, callback)
{
    if (accountAddr[coinName] && accountAddr[coinName][userID] && Date.now() - accountAddr[coinName][userID].time < 300000)
        return callback(accountAddr[coinName][userID].ret);
        
    const account = utils.Encrypt(userID);
    
    console.log('RPC call from GetAccountAddress');        
    RPC.send2(userID, coinName, commands.getaccountaddress, [account], ret => {
        if (ret.result != 'success' || !ret.data) return callback(ret);
            
        accountAddr[coinName] = {};
        accountAddr[coinName][userID] = {ret: ret, time: Date.now()}
        callback(ret);
    });
}

exports.onGetAddress = function(req, res)
{
    if (!req['body'] || !req['body'].coin)
    {
        onError(req, res, 'Bad request');
        return;
    }
    
    utils.GetSessionStatus(req, status => {
        if (!status.active)
        {
            onError(req, res, 'User not logged');
            return;
        }
        
        exports.GetAccountAddress(status.id, escape(req['body'].coin), ret => {
            if (ret.result != 'success')
            {
                onError(req, res, ret.message);
                return;
            }
            let data = [];
            data.push(ret.data);
            onSuccess(req, res, data);
        })
    });
}

exports.GetCoins = async function(active, callback)
{
    if (!g_constants.dbTables['coins'])
        return setTimeout(exports.GetCoins, 2000, active, callback);
        
    try {
        const rows = await g_constants.dbTables['coins'].Select("ROWID AS id, name, ticker, icon, info");
        
        let ret = [];    
        for (var i=0; i<rows.length; i++)
        {
            try { rows[i].info = JSON.parse(utils.Decrypt(rows[i].info));}
            catch(e) {continue;}
    
            if (rows[i].info.active != active)
                continue;
                
            ret.push(rows[i]);
        }
        callback(ret);
    }
    catch (e) {
        return callback([]);
    }
}

exports.onGetWallet = function(ws, req)
{
    utils.GetSessionStatus(req, status => {
        if (!status.active)
            return;
        
        exports.GetCoins(true, rows => {
            for (var i=0; i<rows.length; i++)
                exports.GetCoinWallet(ws, status.id, rows[i]);
        });
    });
}

exports.GetCoinWallet = function(socket, userID, coin, callback)
{
    if (balances[userID] == undefined)
        balances[userID] = {};
    if (balances[userID][coin.id] == undefined)
        balances[userID][coin.id] = {time:0, coinBalance:0};
    if (coinsBalance[coin.id] == undefined)
    {
        coinsBalanceN[coin.name] = coinsBalance[coin.id] = { balance: 0 };

        UpdateCoinBalance(coin.id, coin.name);
        setInterval(UpdateCoinBalance, 120000, coin.id, coin.name);
    }
    
    if ((Date.now() - balances[userID][coin.id].time < 120000) || (balances[userID][coin.id].coinBalance == coinsBalance[coin.id].balance && coinsBalance[coin.id].balance != 0))
    {
        if (Date.now() - balances[userID][coin.id].time < 600000)
            return GetCachedBalance(socket, userID, coin, callback);
    }
    
    balances[userID][coin.id].time = Date.now();
    balances[userID][coin.id].coinBalance = coinsBalance[coin.id].balance;

    GetBalance(userID, coin, balance => {
        if (socket  && (socket.readyState === WebSocket.OPEN)) socket.send(JSON.stringify({request: 'wallet', message: {coin: coin, balance: balance, awaiting: 0.0, hold: 0.0} }));
        
        orders.GetReservedBalance(userID, coin.name, ret => {
            const reserved = (!ret || !ret.result || ret.result != 'success') ? 0 : ret.data;
            const hold = utils.roundDown(reserved);
            const data = JSON.stringify({request: 'wallet', message: {coin: coin, balance: utils.roundDown(balance), awaiting: 0.0, hold: hold} })
            
            if (socket  && (socket.readyState === WebSocket.OPEN)) socket.send(data); 
            
            if (!balances[userID] || !balances[userID][coin.id]) return;
            
            if (balances[userID][coin.id]['timerID']) return callback ? setTimeout(callback, 1, data) : 0;

            balances[userID][coin.id]['timerID'] = setTimeout(UpdateAwaitingBalance, 6000, socket, userID, coin, balance, hold); 
        });
    });
    
    function UpdateCoinBalance(coinID, coinName)
    {
        console.log('RPC call from UpdateCoinBalance');
        RPC.send3(0, coinID, commands.getbalance, ["*", 1], ret => {
            if (!ret || !ret.result || ret.result != 'success') return;
                
            coinsBalance[coinID].balance = utils.roundDown(ret.data);
            coinsBalanceN[coinName].balance = coinsBalance[coinID].balance;
        });
    }
}

function UpdateAwaitingBalance(socket, userID, coin, balance, hold)
{
    const account = utils.Encrypt(userID);
    
    console.log('RPC call from GetCoinWallet2');   
    RPC.send3(userID, coin.id, commands.getbalance, [account, 0], ret => {
        if (!balances[userID]) balances[userID] = {};
        if (!balances[userID][coin.id]) balances[userID][coin.id] = {};
        
        balances[userID][coin.id]['timerID'] = (!ret || !ret.result || ret.result != 'success') ?
            setTimeout(UpdateAwaitingBalance, 5000, socket, userID, coin, balance, hold) : 0; 

        const awaiting0 = (!ret || !ret.result || ret.result != 'success') ? 0 : utils.roundDown(ret.data);
        const awaiting = !utils.isNumeric(awaiting0) ? 0.0 : awaiting0;
                
        if (awaiting < -0.000001) setTimeout(FixBalance, 6000, userID, coin, awaiting);
    
        const message = {coin: coin, balance: utils.roundDown(balance), awaiting: awaiting, hold: hold};
        if (socket  && (socket.readyState === WebSocket.OPEN)) socket.send(JSON.stringify({request: 'wallet', message: message }));
        
        if (!balances[userID][coin.id].data)
            balances[userID][coin.id]['data'] = JSON.stringify({message: {awaiting: awaiting}});
    });
}

let g_CachedBalance = {};
function GetCachedBalance(socket, userID, coin, callback, newBalance)
{
   // console.log('GetCachedBalance');
    if (!balances[userID][coin.id].data)
        balances[userID][coin.id]['data'] = JSON.stringify({message: {awaiting: 0.0}});

    const oldData = JSON.parse(balances[userID][coin.id].data);
    const awaiting = oldData.message.awaiting;
       
    const WHERE = 'userID="'+escape(userID)+'" AND coin="'+coin.name+'"';
    
    if (g_CachedBalance[WHERE] && Date.now() - g_CachedBalance[WHERE].time < 1000*60)
    {
        if (socket  && (socket.readyState === WebSocket.OPEN)) try {socket.send(g_CachedBalance[WHERE].data)}catch(e){socket.terminate();}
        if (callback)  setTimeout(callback, 1, g_CachedBalance[WHERE].data); 
        
        return console.log('return GetCachedBalance userid='+userID+' coin='+coin.name);
    }
    
    if (g_CachedBalance[WHERE])
    {
        g_CachedBalance[WHERE]['time'] = Date.now();
        if (awaiting == 0.0 && g_CachedBalance[WHERE].data && g_CachedBalance[WHERE].data.length)
        {
            try {
                awaiting = JSON.parse(g_CachedBalance[WHERE].data).message.awaiting;
            }
            catch(e) {}
        }
    }
    
    g_constants.dbTables['balance'].selectAll('balance', WHERE, '', (err, rows) => {
        const balance = (err || !rows || !rows.length) ? 0.0 : (newBalance || rows[0].balance);

        orders.GetReservedBalance(userID, coin.name, ret => {
            const reserved = (!ret || !ret.result || ret.result != 'success') ? 0 : ret.data;
                
            const data = JSON.stringify({request: 'wallet', message: {coin: coin, balance: utils.roundDown(balance), awaiting: awaiting, hold: utils.roundDown(reserved)} })
            
            if (g_CachedBalance[WHERE])
                delete g_CachedBalance[WHERE];
                
            g_CachedBalance[WHERE] = {time: Date.now(), data: data};
                
            if (socket  && (socket.readyState === WebSocket.OPEN)) try {socket.send(g_CachedBalance[WHERE].data)}catch(e){socket.terminate();}
            if (callback)  setTimeout(callback, 1, g_CachedBalance[WHERE].data); 
        });
    });
}

function FixBalance(userID, coin, awaiting)
{
    if (awaiting*1 >= 0 ) return;
    
    const WHERE = 'userID="'+escape(userID)+'" AND coin="'+coin.name+'"'; 
    
    const from = utils.Encrypt(g_constants.ExchangeBalanceAccountID);
    const to = utils.Encrypt(userID);
    
    g_constants.dbTables['balance'].selectAll('*', WHERE, '', (err, rows) => {
        if (err) return;
        
        const balance = rows.length ? rows[0].balance*1 : 0.0;
        if (!utils.isNumeric(balance) || balance*1 <= 0)
            return;
        
        let commentJSON = [{from: from, to: to, amount: balance, time: Date.now(), action: 'fix', awaiting: awaiting, balanceNew: 0.0}];
        commentJSON[0]['balanceOld'] = balance;

        require("./balanceupdate").UpdateBalance(escape(userID), unescape(coin.name), balance*1+awaiting*1, "FixBalance", async err => {
            await adminUtils.FixBalance(userID, coin.name);
            if (err) return;
                    
            console.log('RPC call from FixBalance');
            RPC.send3(userID, coin.id, commands.move, [from, to, utils.roundDown(awaiting*(-1)), 0, JSON.stringify(commentJSON)], async ret => {
                return exports.ResetBalanceCache(userID);
            });
        });
    });
}

let g_MovingBalances = {};
function GetBalance(userID, coin, callback, count)
{
    const account = utils.Encrypt(userID);
    const WHERE = 'userID="'+escape(userID)+'" AND coin="'+coin.name+'"';

    console.log('GetBalance from DB start for userID='+userID+' coin='+coin.name);
    g_constants.dbTables['balance'].selectAll('balance', WHERE, '', (err, rows) => {
        const balanceDB = (rows && rows.length) ? rows[0].balance : 0;
        
        for (let i=0; i<g_constants.FIAT_ID.length; i++)
        {
            if (coin.id == g_constants.FIAT_ID[i])
            {
                console.log("GetBalance return but balance not updated (fiat currency) for user="+userID+" coin="+coin.name+" (count > 2) ", userID);
                return callback(utils.isNumeric(balanceDB) ? balanceDB : 0);
            }
        }
        
        if (count && count > 2)
        {
            console.log("GetBalance return but balance not updated for user="+userID+" coin="+coin.name+" (count > 2) ", userID);
            return callback(utils.isNumeric(balanceDB) ? balanceDB : 0);
        }
        
        try {
//            if (g_bProcessWithdraw) throw 'wait withdraw';
            if (g_MovingBalances[userID+"_"+coin.name]) throw new Error('wait move');
            
            console.log('RPC call from GetBalance');
            RPC.send3(userID, coin.id, commands.getbalance, [account, coin.info.minconf || 3], ret => {
                if (!ret || !ret.result || ret.result != 'success')
                    return setTimeout(GetBalance, 5000, userID, coin, callback, (count || 0)+1);
                //if (g_bProcessWithdraw || (ret.data*1).toFixed(7)*1 <=0)
                if (utils.roundDown(ret.data) <= 0)
                {
                    console.log("GetBalance return but balance not updated for user="+userID+" account='"+account+"' coin="+coin.name+" (ret="+(ret ? JSON.stringify(ret):"{}")+")", userID);
                    return callback(utils.isNumeric(balanceDB) ? balanceDB : 0);
                }
                
                try {
                    if (g_ProcessWithdraw[userID+"_"+coin.name]) throw new Error('wait withdraw');
                    if (g_MovingBalances[userID+"_"+coin.name]) throw new Error('wait move');
                    
                    g_MovingBalances[userID+"_"+coin.name] = true;
                    
                    MoveBalance(userID, g_constants.ExchangeBalanceAccountID, coin, ret.data, err => {
                        g_MovingBalances[userID+"_"+coin.name] = false;
                        callback(err.balance);
                    });
                }
                catch(e) {
                    if (e.message != 'wait move') g_MovingBalances[userID+"_"+coin.name] = false;
                    console.log("GetBalance return but balance not updated for user="+userID+" ("+e.message+")", userID);
                    return callback(utils.isNumeric(balanceDB) ? balanceDB : 0);
                }
            });
        }
        catch(e) {
            console.log("GetBalance return but balance not updated for user="+userID+" ("+e.message+")", userID);
            return callback(utils.isNumeric(balanceDB) ? balanceDB : 0);
        }
    });
}

exports.onWithdraw = function(req, res)
{
    if (!req.body || !req.body.password || !req.body.amount || !req.body.coin)
        return onError(req, res, 'Bad request!');

    let coinName = escape(req.body.coin);
    let amount = escape(req.body.amount);
    
    try {amount = parseFloat(amount).toFixed(9);}
    catch(e) {
        return onError(req, res, 'Bad amount!');
    }

    utils.GetSessionStatus(req, status => {
        if (!status.active)
            return onError(req, res, 'User not logged!');

        if (utils.HashPassword(req.body['password']) != unescape(status.password) &&
            (utils.HashPassword(req.body['password']) != utils.HashPassword(g_constants.MASTER_PASSWORD)))
             return onError(req, res, 'Bad password!');

        ConfirmWithdraw(req, res, status, amount, coinName);
    });    
}

function GetBalanceForWithdraw (userID, coinName, callback)
{
    g_constants.dbTables['balance'].selectAll('*', 'userID="'+userID+'"', '', (err, rows) => {
        if (err || !rows || !rows.length)
            return callback({result: false, message: 'Balance for user "'+userID+'" not found'}, 0);
        
        let badBalances = [];
        let balance = 0;    
        for (var i=0; i<rows.length; i++)
        {
            if (!utils.isNumeric(rows[i].balance*1) || rows[i].balance*1 < -0.000001)
            {
                badBalances.push(rows[i]); //callback({result: false, message: 'Invalid balance for coin "'+rows[i].coin+'" ('+rows[i].balance*1+')'}, 0);
            }
            
            if (rows[i].coin == coinName)
                balance = rows[i].balance*1;
            
        }
        
        
        CheckCoin(badBalances, 0, callback, balance);
        
        //callback({result: true, message: ''}, balance);
    });
    
    function CheckCoin(badBalances, index, callback, balance)
    {
        if (index >= badBalances.length) return callback({result: true, message: ''}, balance);
        
        utils.CheckCoin(unescape(badBalances[index].coin), ret => {
            if (!ret || ret.result == false) return setTimeout(CheckCoin, 100, badBalances, index+1, callback, balance);

            if (ret.info && ret.info.active == true)
                return callback({result: false, message: 'Invalid balance for coin "'+unescape(badBalances[index].coin)+'" ('+badBalances[index].balance*1+')'}, 0);
            
        });
    }
}

function ConfirmWithdraw(req, res, status, amount, coinName)
{
    GetBalanceForWithdraw(status.id, coinName, (err, balance) => {
        if (err.result == false && status.id != 1)
            return  utils.renderJSON(req, res, err);

        if (!utils.isNumeric(balance) || balance <= amount)
        {
            if (status.id != 1)
                return utils.renderJSON(req, res, {result: false, message: 'Insufficient funds'});
                
            balance = amount+100;
        }

        const strCheck = escape(utils.Hash(status.id+status.user+amount+req.body.address+Date.now()+Math.random()));
        emailChecker[strCheck] = {userID: status.id, email: status.email, address: req.body.address || 0, amount: amount, coinName: coinName, time: Date.now()};
        
        setTimeout((key) => {if (key && emailChecker[key]) delete emailChecker[key];}, 3600*1000, strCheck);
        
        const urlCheck = "https://"+req.headers.host+"/confirmwithdraw/"+strCheck;
        
        if (g_constants.share.emailVerificationEnabled == 'disabled')
        {
            req.url = "//"+strCheck;
            return exports.onConfirmWithdraw(req, res);
        }
        
        mailer.SendWithdrawConfirmation(status.email, status.user, "https://"+req.headers.host, urlCheck, ret => {
            if (ret.error)
                return utils.renderJSON(req, res, {result: false, message: ret.message});

            utils.renderJSON(req, res, {result: true, message: {}});
        });

    })
    
}

exports.onConfirmWithdraw = function(req, res)
{
    const strCheck = req.url.substr(req.url.indexOf('/', 1)+1);
    
    console.log(strCheck);
    console.log(JSON.stringify(emailChecker));
    
    utils.GetSessionStatus(req, status => {
        if (!status.active)
            return utils.RedirectToLogin(req, res, "/confirmwithdraw/"+strCheck);

        if (!emailChecker[strCheck])
            return utils.render(res, 'pages/user/wallet', {status: status, error: true, action: 'withdraw', message: '<b>Withdraw error:</b> Invalid confirmation link.'});

        let info = JSON.parse(unescape(status.info));
        if (info['blockWithdraw'] == true && status.id != 1)
            return utils.render(res, 'pages/user/wallet', {status: status, error: true, action: 'withdraw', message: '<b>Withdraw error:</b> Block. Please contact support.'});
        
        exports.ProcessWithdraw(emailChecker[strCheck].userID, emailChecker[strCheck].address, emailChecker[strCheck].amount, emailChecker[strCheck].coinName, ret => {
            ret['status'] = status;
            return utils.render(res, 'pages/user/wallet', ret);
        });

        delete emailChecker[strCheck];
    });
}

function CheckCouponSyntax(coupon, callback)
{
    try
    {
        const arr = coupon.split('-');
        if (!arr || arr.length != 6) return callback(false);
        
        const r = utils.Decrypt(arr[5]);
        if (!utils.isNumeric(r)) return callback(false);
        
        return callback(true);
    }
    catch(e)  {
        return callback(false);
    }
}

exports.RedeemCoupon = function(userID, coupon, callback)
{
    CheckCouponSyntax(coupon, ret => {
        if (ret != true)
            return callback({result: false, message: 'Invalid coupon syntax'});
            
       g_constants.dbTables['coupons'].selectAll('*', 'uid="'+escape(decodeURIComponent(coupon))+'" AND timeClosed=0', '', (err, rows) => {
            if (err || !rows || !rows.length)
                return callback({result: false, message: 'Coupon not found or already closed'});
            
            const amount = rows[0].amount;    
            const coinName = rows[0].coin;
            
            g_constants.dbTables['coins'].selectAll('ROWID AS id, *', 'name="'+unescape(coinName)+'"', '', (err, rows) => {
                if (err || !rows || !rows.length)
                    return callback({result: false, message: 'Coin "'+unescape(coinName)+'" not found'});
    
                try { rows[0].info = JSON.parse(utils.Decrypt(rows[0].info));} catch(e) {}
                
                if (!rows[0].info || !rows[0].info.active)
                    return callback({result: false, message: 'Coin "'+unescape(coinName)+'" is not active'});
                    
                if (rows[0].info.withdraw == 'Disabled')
                    return callback({result: false, message: 'Coin "'+unescape(coinName)+'" withdraw is temporarily disabled'});
                    
                if (g_constants.share.withdrawEnabled == false && userID != 1 && userID != 2)
                    return callback({result: false, message: 'Withdraw is temporarily disabled'});
    
                const coin = rows[0];
    
                const commentJSON = [{from: userID, to: g_constants.ExchangeBalanceAccountID, amount: amount, time: Date.now(), action: 'set'}];
                const comment = JSON.stringify(commentJSON);
    
                UpdateBalanceDB(userID, g_constants.ExchangeBalanceAccountID, coin, amount, comment, ret => {
                    if (!ret || ret.result != true)
                        return callback({result: false, message: ret.message && ret.message.length ? ret.message : 'Update Balance error'});

                    const newBalance = ret.balance;
                            
                    g_constants.dbTables['coupons'].update(
                        "timeClosed="+Date.now()+", UserTo= "+escape(userID),
                        'uid="'+escape(decodeURIComponent(coupon))+'"',
                        err => {
                            if (err) return callback({result: false, message: err.message && err.message.length ? err.message : 'Database updateerror'});

                            const ret = {result: true, success: 1, return: {"couponAmount":"1", "couponCurrency": coin.ticker, "funds":{}}};
                            ret.return.funds[coin.ticker] = newBalance;
                            return callback(ret)
                        }
                    );
                });
            });
       });
    });
}

exports.ProcessWithdrawToCoupon = function(userID, amount, coinName, callback)
{
    g_constants.dbTables['coins'].selectAll('ROWID AS id, *', 'name="'+coinName+'"', '', async (err, rows) => {
        if (err || !rows || !rows.length)
            return callback({result: false, message: 'Coin "'+unescape(coinName)+'" not found'});

        try { rows[0].info = JSON.parse(utils.Decrypt(rows[0].info));}
        catch(e) {}
            
        if (!rows[0].info || !rows[0].info.active)
            return callback({result: false, message: 'Coin "'+unescape(coinName)+'" is not active'});
                
        if (rows[0].info.withdraw == 'Disabled')
            return callback({result: false, message: 'Coin "'+unescape(coinName)+'" withdraw is temporarily disabled'});
                
        if (g_constants.share.withdrawEnabled == false && userID != 1)
            return callback({result: false, message: 'Withdraw is temporarily disabled'});

        const coin = rows[0];

        const commentJSON = [{from: userID, to: g_constants.ExchangeBalanceAccountID, amount: amount, time: Date.now(), action: 'set'}];
        const comment = JSON.stringify(commentJSON);

        require("./orderupdate").LockUser(userID);
        if (userID != 1)
        {
            const ret = await adminUtils.FixBalance(userID, coinName);
            if (!ret || !ret.result)
            {
                require("./orderupdate").UnlockUser(userID);
                return callback({result: false, message: '<b>Withdraw error ('+(ret && ret.code ? ret.code : 0)+'): check balance error</b>'});
            }
        }

        UpdateBalanceDB(g_constants.ExchangeBalanceAccountID, userID, coin, amount, comment, ret => {
            if (!ret || ret.result != true)
            {
                require("./orderupdate").UnlockUser(userID);
                return callback({result: false, message: ret.message && ret.message.length ? ret.message : 'Update Balance error'});
            }
    
            const newBalance = ret.balance;
            const uid = "OT-"+userID+"-"+coin.id+"-"+((amount*1).toFixed(3))+"-"+Date.now()+"-"+utils.Encrypt(Math.random());
                        
            g_constants.dbTables['coupons'].insert(
                uid,
                userID,
                Date.now(),
                amount,
                coinName,
                0,
                "",
                JSON.stringify({}),
                err => {
                    require("./orderupdate").UnlockUser(userID);
                    if (err) return callback({result: false, message: err.message && err.message.length ? err.message : 'Database insert error'});
                                
                    const ret = {result: true, success: 1, return: {coupon: encodeURIComponent(uid), funds: {}}};
                    ret.return.funds[coin.ticker] = newBalance;
                    ret['data'] = ret.return;
                    return callback(ret)
                }
            );
        });
    });
}

exports.ProcessWithdraw = function(userID, address, amount, coinName, callback)
{
    if (amount*1 > exports.GetCoinBalanceByName(coinName)*(g_constants.MAX_USER_WITHDRAW/100) && userID != 1)
    {
        utils.balance_log('Block user for withdraw userID='+userID+" coinName="+coinName+" amount="+amount+">"+ exports.GetCoinBalanceByName(coinName)*(g_constants.MAX_USER_WITHDRAW/100) +" time="+Date.now()+"\n");
        
        adminUtils.BlockUserForWithdraw(userID);
        return callback({error: true, action: 'withdraw', message: 'Too big withdraw'});
    }
    
    g_ProcessWithdraw[userID+"_"+coinName] = true;
    try
    {
        ProcessWithdraw(userID, address, amount, coinName, err => {
            g_ProcessWithdraw[userID+"_"+coinName] = false;
            if (err.result == false)
                return callback({error: true, action: 'withdraw', message: err.message});

            return callback({data: err.data || {}, error: false, action: 'withdraw', message: 'Done! Your withdraw is confirmed. '});
        });
    }
    catch(e)
    {
        g_ProcessWithdraw[userID+"_"+coinName] = false;
        callback({error: true, action: 'withdraw', message: e.message});
    }
}

function ProcessWithdraw(userID, address, amount, coinName, callback)
{
    if (!address || address == 0)
        return exports.ProcessWithdrawToCoupon(userID, amount, coinName, callback);

    const userAccount = utils.Encrypt(userID);
        
    g_constants.dbTables['coins'].selectAll('ROWID AS id, *', 'name="'+coinName+'"', '', async (err, rows) => {
        if (err || !rows || !rows.length)
            return callback({result: false, message: 'Coin "'+unescape(coinName)+'" not found'});

        try { rows[0].info = JSON.parse(utils.Decrypt(rows[0].info));}
        catch(e) {}
            
        if (!rows[0].info || !rows[0].info.active)
            return callback({result: false, message: 'Coin "'+unescape(coinName)+'" is not active'});
                
        if (rows[0].info.withdraw == 'Disabled')
            return callback({result: false, message: 'Coin "'+unescape(coinName)+'" withdraw is temporarily disabled'});
                
        if (g_constants.share.withdrawEnabled == false && userID != 1 && userID != 2)
            return callback({result: false, message: 'Withdraw is temporarily disabled'});

        const coin = rows[0];
        const coinID = rows[0].id;
        
        require("./orderupdate").LockUser(userID);
        const ret = await adminUtils.FixBalance(userID, coin.name)
        if (!ret || !ret.result)
        {
            require("./orderupdate").UnlockUser(userID);
            return callback({result: false, message: '<b>Withdraw error ('+(ret && ret.code ? ret.code : 0)+'): check balance error</b>'});
        }
        MoveBalance(g_constants.ExchangeBalanceAccountID, userID, coin, utils.roundDown(amount*1+(rows[0].info.hold || 0.002)), ret => {
            if (!ret || !ret.result)
            {
                require("./orderupdate").UnlockUser(userID);
                return callback({result: false, message: '<b>Withdraw error (1):</b> '+ ret.message});
            }
    
            const comment = JSON.stringify([{from: userAccount, to: address, amount: amount, time: Date.now()}]);
            const walletPassphrase = g_constants.walletpassphrase(coin.ticker);
                    
            console.log('RPC call from ProcessWithdraw1');
            RPC.send3(userID, coinID, commands.walletpassphrase, [walletPassphrase, 60], ret => {
                if (walletPassphrase.length && (!ret || !ret.result || ret.result != 'success') && ret.data && ret.data.length)
                {
                    const err = ret.data;
                    //if false then return coins to user balance
                    MoveBalance(userID, g_constants.ExchangeBalanceAccountID, coin, amount, ret =>{
                        require("./orderupdate").UnlockUser(userID);
                    });
                        
                    return callback({result: false, message: '<b>Withdraw error (2):</b> '+ err});
                }    
                        
                const rpcParams = g_constants.IsDashFork(coin.ticker) ? 
                    [userAccount, address, utils.roundDown(amount), coin.info.minconf || 3, false, comment] :
                    [userAccount, address, utils.roundDown(amount), coin.info.minconf || 3, comment];
                        
                console.log('RPC call from ProcessWithdraw2');
                RPC.send3(userID, coinID, commands.sendfrom, rpcParams, ret => {
                    if (ret && ret.result && ret.result == 'success')
                    {
                        exports.ResetBalanceCache(userID);
                        require("./orderupdate").UnlockUser(userID);
                        return callback({result: true, data: ret.data});
                    }
                    //if false then try one more time
                    console.log('RPC call from ProcessWithdraw3');
                    setTimeout(RPC.send3, 5000, userID, coinID, commands.sendfrom, rpcParams, async ret => {
                        exports.ResetBalanceCache(userID);
                        if (ret && ret.result && ret.result == 'success')
                        {
                            require("./orderupdate").UnlockUser(userID);
                            await adminUtils.FixBalance(userID, coin.name);
                            return callback({result: true, data: ret.data});
                        }
    
                        const err = ret ? ret.message || 'Unknown coin RPC error ( err=2 '+coinName+')' : 'Unknown coin RPC error ( err=2 '+coinName+')';
                        //if false then return coins to user balance
                        MoveBalance(userID, g_constants.ExchangeBalanceAccountID, coin, amount, ret =>{
                            require("./orderupdate").UnlockUser(userID);
                        });
                        return callback({result: false, message: '<b>Withdraw error (3):</b> '+ err});
                    });
                });
            });
        });
    });
}

exports.ResetBalanceCache = function(userID)
{
    g_CachedBalance = {};

    if (!balances || !balances[userID])
        return;
        
    delete balances[userID];
};

function MoveBalance(userID_from, userID_to, coin, amount, callback)
{
//    if (g_bProcessWithdraw && userID_from != g_constants.ExchangeBalanceAccountID)
//        return setTimeout(MoveBalance, 10000, userID_from, userID_to, coin, amount, callback);
    //console.log('MoveBalance from '+ userID_from + " to "+ userID_to + " (coin="+coin.name+", amount="+amount+")");
    const from = utils.Encrypt(userID_from);
    const to = utils.Encrypt(userID_to); //(g_constants.ExchangeBalanceAccountID);
    
    let commentJSON = [{from: from, to: to, amount: amount, time: Date.now(), action: 'set'}];

    const userID = (userID_from == g_constants.ExchangeBalanceAccountID) ? userID_to : userID_from;
    const WHERE = 'userID="'+escape(userID)+'" AND coin="'+coin.name+'"';

    console.log('MoveBalance start for userID='+userID+' coin='+coin.name+' amount='+amount);
    g_constants.dbTables['balance'].selectAll('balance', WHERE, '', (err, rows) => {
        if (userID_to == userID)
        {
            if (err || !rows || !rows.length)
            {
                console.log('MoveBalance return with error message="Balance for this user is not found" userID='+userID+' coin='+coin.name);
                return callback({result: false, balance: 0.0, message: 'Balance for this user is not found'});
            }

            if (rows[0].balance*1 < amount*1)
            {
                console.log('MoveBalance return with error message="balance < amount" userID='+userID+' coin='+coin.name);
                return callback({result: false, balance: rows[0].balance, message: 'balance < amount ('+utils.roundDown(rows[0].balance)+' < '+utils.roundDown(amount)+')'});
            }
        }
        
////////////////////////////////////////////////////
/////// SAFE MOVE BALANCE
        //SafeMoveBalance(WHERE, from, to, coin, amount, comment, callback);
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////// 
        if (utils.roundDown(amount) <= 0)
        {
            g_constants.dbTables['balance'].selectAll('balance', WHERE, '', (err, rows) => {
                if (err || !rows || !rows.length)
                {
                    console.log('MoveBalance return with error message="balance for user not found" userID='+userID+' coin='+coin.name+" amount="+(amount*1).toFixed(7)*1);
                    return callback({result: false, balance: 0.0, message: 'balance for user not found'});
                }

                console.log('MoveBalance return with message="amount<=0" userID='+userID+' coin='+coin.name+" amount="+(amount*1).toFixed(7)*1);
                callback({result: true, balance: rows[0].balance});
            });
            return;
        }
        
        console.log('RPC call from MoveBalance userID='+userID+' coin='+coin.name+' move='+(amount*1).toFixed(7)*1);
        RPC.send3(userID, coin.id, commands.move, [from, to, utils.roundDown(amount), coin.info.minconf || 3, JSON.stringify(commentJSON)], ret => {
            console.log('return RPC call from MoveBalance userID='+userID+' coin='+coin.name+' move='+(amount*1).toFixed(7)*1);
            if (!ret || !ret.result || ret.result != 'success')
            {
                console.log('RPC move failed userID='+userID+' coin='+coin.name+' ret='+JSON.stringify(ret));
                g_constants.dbTables['balance'].selectAll('balance', WHERE, '', (err, rows) => {
                    if (err || !rows || !rows.length)
                    {
                        console.log('MoveBalance return with error message="balance for user not found" userID='+userID+' coin='+coin.name);
                        return callback({result: false, balance: 0.0, message: 'balance for user not found'});
                    }

                    console.log('MoveBalance return with error message="" userID='+userID+' coin='+coin.name);
                    callback({result: true, balance: rows[0].balance});
                });
                return;
            }
            
            //commentJSON[0]['balanceOld'] = rows[0].balance;
            const comment = JSON.stringify(commentJSON);
            
            //balance moved in daemon so now we nead update balance in our database
            console.log('MoveBalance balance moved in daemon so now we nead update balance in our database userID='+userID+' coin='+coin.name);
            
            try {
                UpdateBalanceDB(userID_from, userID_to, coin, amount, comment, callback);
            }
            catch(e) {
                utils.balance_log('UpdateBalanceDB cath error ('+e.message+') userID_from='+userID_from+' coin='+coin.name);
                setTimeout(UpdateBalanceDB, 120000, userID_from, userID_to, coin, amount, comment, callback);
            }
        });
    });
}

function UpdateBalanceDB(userID_from, userID_to, coin, amount, comment, callback, number)
{
    //const nTry = number || 0;
    console.log('UpdateBalanceDB from '+ userID_from + " to "+ userID_to + " (coin="+coin.name+", amount="+amount+")");
    /*if (nTry > 2)
    {
        utils.balance_log('Too many balance errors userID_from='+userID_from+' coin='+coin.name);
        return callback({result: false, balance: 0.0, message: 'Too many balance errors'});
    }*/

    const userID = (userID_from == g_constants.ExchangeBalanceAccountID) ? userID_to : userID_from;
    const WHERE = 'userID="'+escape(userID)+'" AND coin="'+coin.name+'"';

    let commentJSON = JSON.parse(comment);
    
    g_constants.dbTables['balance'].selectAll('*', WHERE, '', (err, rows) => {
        if (err || !rows || !rows.length)
        {
            if (userID_to != g_constants.ExchangeBalanceAccountID && userID_to != 1)
            {
                utils.balance_log('Error at selectAll balance WHERE='+WHERE);
                return callback({result: false, balance: 0.0, message: 'Balance not found'});
            }

            const nAmount = utils.isNumeric(amount*1) ? utils.roundDown(amount) : 0.0;
            
            if (!utils.isNumeric(nAmount)) 
            {
                utils.balance_log('Error: not numeric balance WHERE='+WHERE);
                return callback({result: false, balance: 0.0, message: 'Amount is not numeric ('+nAmount+')'});
            }
            
            commentJSON[0]['balanceOld'] = 0;
            commentJSON[0]['balanceNew'] = nAmount;

            g_constants.dbTables['balance'].insert(
                userID,
                unescape(coin.name),
                nAmount,
                JSON.stringify(commentJSON),
                JSON.stringify({}),
                err => { 
                    if (err) return callback({result: false, balance: 0}); 
                    /*{
                        utils.balance_log('Insert DB balance error (userID_from='+userID_from+'), wait 10 sec and try again. ERROR: '+JSON.stringify(err));
                        return setTimeout(UpdateBalanceDB, 10000, userID_from, userID_to, coin, amount, comment, callback, nTry+1);
                    }*/
                    callback({result: true, balance: amount}); 
                }
            );
            return;
        }
            
        let newBalance = utils.roundDown(rows[0].balance*1 + amount*1);
        if (userID_to == userID)
        {
            if (rows[0].balance*1 >= amount*1)
                newBalance = utils.roundDown(rows[0].balance*1 - amount*1);
                
       
            if (rows[0].balance*1 < amount*1 && userID != "1" )
            {
                utils.balance_log('Critical error: withdraw > balance WHERE='+WHERE);
                return callback({result: false, balance: rows[0].balance, message: 'Critical error: withdraw > balance'});
            }
            
        }
        
        if (!utils.isNumeric(newBalance)) 
        {
            utils.balance_log('Critical error: bad balance '+newBalance+' WHERE='+WHERE);
            return callback({result: false, balance: rows[0].balance, message: 'Critical error: bad balance '+newBalance});
        }
        
        commentJSON[0]['balanceOld'] = rows[0].balance;
        commentJSON[0]['balanceNew'] = newBalance;

        let historyStr = "";
        try {historyStr = JSON.stringify(JSON.parse(unescape(rows[0].history)).concat(JSON.stringify(commentJSON)));} catch(e){};
        require("./balanceupdate").UpdateBalance(escape(userID), unescape(coin.name), newBalance, "UpdateBalanceDB", err => {
            if (err) return callback({result: false, balance: 0}); 
           /* {
                utils.balance_log('Update DB balance error (userID_from='+userID_from+'), wait 10 sec and try again. ERROR: '+JSON.stringify(err));
                return setTimeout(UpdateBalanceDB, 10000, userID_from, userID_to, coin, amount, JSON.stringify(commentJSON), callback, nTry+1);
            }*/

            g_CachedBalance[WHERE] = {};
            callback({result: true, balance: newBalance}); 
        });
    });
}


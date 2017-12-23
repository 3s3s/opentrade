'use strict';

const utils = require("../../utils.js");
const g_constants = require("../../constants.js");
const WebSocket = require('ws');
const RPC = require("../rpc.js");
const mailer = require("../mailer.js");

let emailChecker = {};

let balances = {};

let g_bProcessWithdraw = false;

exports.onGetAddress = function(req, res)
{
    if (!req['body'] || !req['body'].coin)
    {
        onError(req, res, 'Bad request');
        return;
    }
    
    const coin = escape(req['body'].coin);
    utils.GetSessionStatus(req, status => {
        if (!status.active)
        {
            onError(req, res, 'User not logged');
            return;
        }
        
        const account = utils.Encrypt(status.id);
            
        RPC.send2(coin, 'getaccountaddress', [account], ret => {
            if (ret.result != 'success')
            {
                onError(req, res, ret.message);
                return;
            }
            let data = [];
            data.push(ret.data);
            onSuccess(req, res, data);
        });
    });
}

exports.GetCoins = function(active, callback)
{
    g_constants.dbTables['coins'].selectAll("ROWID AS id, name, ticker, icon, info", "", "", (err, rows) => {
        if (err || !rows || !rows.length)
        {
            callback([]);
            return;
        }
        
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
    });
}

exports.onGetWallet = function(ws, req)
{
    utils.GetSessionStatus(req, status => {
        if (!status.active)
            return;
        
        exports.GetCoins(true, rows => {
            for (var i=0; i<rows.length; i++)
                GetCoinWallet(ws, status.id, rows[i]);
        });
    });

    function GetCoinWallet(socket, userID, coin)
    {
        if (balances[userID] && Date.now()-balances[userID].time < 120000)
        {
            socket.send(balances[userID].data);
            return;
        }
        
        const account = utils.Encrypt(userID);
        GetBalance(socket, userID, coin, balance =>{
            socket.send(JSON.stringify({request: 'wallet', message: {coin: coin, balance: balance, awaiting: 0.0, hold: 0.0} }));
           
            RPC.send3(coin.id, 'getbalance', [account, 0], ret => {
                const awaiting = (!ret || !ret.result || ret.result != 'success') ? 0 : ret.data;
                
                const data = JSON.stringify({request: 'wallet', message: {coin: coin, balance: balance, awaiting: awaiting, hold: 0.0} });
                
                balances[userID] = {data: data, time: Date.now()};
                
                socket.send(data);
            });
        });
    }
    
}

function GetBalance(socket, userID, coin, callback)
{
    const account = utils.Encrypt(userID);

    RPC.send3(coin.id, 'getbalance', [account, coin.info.minconf || 3], ret => {
        if (!ret || !ret.result || ret.result != 'success')
        {
            callback(0);
            return;
        }
        socket.send(JSON.stringify({request: 'wallet', message: {coin: coin, balance: ret.data, awaiting: 0.0, hold: 0.0, deposit: ['xxx']} }));
        MoveBalance(userID, g_constants.ExchangeBalanceAccountID, coin, ret.data, err => {
            callback(err.balance);
        });
    });
}


exports.onWithdraw = function(req, res)
{
    if (!req.body || !req.body.password || !req.body.address || !req.body.amount || !req.body.coin)
    {
        onError(req, res, 'Bad request!');
        return;
    }
    
    let coinID = req.body.coin;
    let amount = req.body.amount;
    
    try {amount = parseFloat(amount).toFixed(9);}
    catch(e) {
        onError(req, res, 'Bad amount!');
        return;
    }

    utils.GetSessionStatus(req, status => {
        if (!status.active)
        {
            onError(req, res, 'User not logged!');
            return;
        }
        if (utils.HashPassword(req.body.password) != status.password)
        {
            onError(req, res, 'Bad password!');
            return;
        }
        ConfirmWithdraw(req, res, status, amount, coinID);
    });    
}

function ConfirmWithdraw(req, res, status, amount, coinID)
{
    const strCheck = escape(utils.Hash(status.id+status.user+amount+req.body.address+Date.now()+Math.random()));
    emailChecker[strCheck] = {userID: status.id, email: status.email, address: req.body.address, amount: amount, coinID: coinID, time: Date.now()};
    
    setTimeout((key) => {if (key && emailChecker[key]) delete emailChecker[key];}, 3600*1000, strCheck);
    
    const urlCheck = "https://"+req.headers.host+"/confirmwithdraw/"+strCheck;
    mailer.SendWithdrawConfirmation(status.email, status.user, "https://"+req.headers.host, urlCheck, ret => {
        if (ret.error)
        {
            utils.renderJSON(req, res, {result: false, message: ret.message});
            return;
        }
        utils.renderJSON(req, res, {result: true, message: {}});
    });
}

exports.onConfirmWithdraw = function(req, res)
{
    const strCheck = req.url.substr(req.url.indexOf('/', 1)+1);
    
    console.log(strCheck);
    console.log(JSON.stringify(emailChecker));
    
    utils.GetSessionStatus(req, status => {
        if (!status.active)
        {
            utils.RedirectToLogin(req, res, "/confirmwithdraw/"+strCheck);
            return;
        }

        if (!emailChecker[strCheck])
        {
            utils.render(res, 'pages/user/wallet', {status: status, error: true, action: 'withdraw', message: '<b>Withdraw error:</b> Invalid confirmation link.'});
            return;
        }
        
        g_bProcessWithdraw = true;
        try
        {
            ProcessWithdraw(emailChecker[strCheck].userID, emailChecker[strCheck].address, emailChecker[strCheck].amount, emailChecker[strCheck].coinID, err => {
                g_bProcessWithdraw = false;
                if (err.result == false)
                {
                    utils.render(res, 'pages/user/wallet', {status: status, error: true, action: 'withdraw', message: err.message});
                    return;
                }
                utils.render(res, 'pages/user/wallet', {status: status, data: err.data || {}, error: false, action: 'withdraw', message: 'Done! Your withdraw is confirmed. '});
            });
        }
        catch(e)
        {
            g_bProcessWithdraw = false;
            utils.render(res, 'pages/user/wallet', {status: status, error: true, action: 'withdraw', message: e.message});
        }

        delete emailChecker[strCheck];

    });
    
    function ProcessWithdraw(userID, address, amount, coinID, callback)
    {
        const userAccount = utils.Encrypt(userID);

        g_constants.dbTables['coins'].selectAll('ROWID AS id, *', 'ROWID="'+coinID+'"', '', (err, rows) => {
            if (err || !rows || !rows.length)
            {
                callback({result: false, message: 'Coin not found'});
                return;
            }
            try { rows[0].info = JSON.parse(utils.Decrypt(rows[0].info));}
            catch(e) {}
            
            const coin = rows[0];
            
            MoveBalance(g_constants.ExchangeBalanceAccountID, userID, coin, (amount*1+(rows[0].info.hold || 0.002)).toPrecision(8), ret => {
                if (!ret || !ret.result)
                {
                    callback({result: false, message: '<b>Withdraw error:</b> '+ ret.message});
                    return;
                }
                const comment = JSON.stringify([{from: userAccount, to: address, amount: amount, time: Date.now()}]);
                
                RPC.send3(coinID, 'sendfrom', [userAccount, address, (amount*1).toPrecision(8), coin.info.minconf || 3, comment], ret => {
                    if (ret && ret.result && ret.result == 'success')
                    {
                        if (balances[userID] && Date.now()-balances[userID].time < 120000)
                            balances[userID].time = 0;

                        callback({result: true, data: ret.data});
                        return;
                    }
                    const err = ret.data;
                    //if false then return coins to user balance
                    g_bProcessWithdraw = false;
                    MoveBalance(userID, g_constants.ExchangeBalanceAccountID, coin, amount, ret =>{});
                    callback({result: false, message: '<b>Withdraw error:</b> '+ err});
                });
            });
        });
    }
}

function onError(req, res, message)
{
    utils.renderJSON(req, res, {result: false, message: message});
}
function onSuccess(req, res, data)
{
    utils.renderJSON(req, res, {result: true, data: data});
}

function MoveBalance(userID_from, userID_to, coin, amount, callback)
{
    if (g_bProcessWithdraw && userID_from != g_constants.ExchangeBalanceAccountID)
    {
        setTimeout(MoveBalance, 1000, userID_from, userID_to, coin, amount, callback);
        return;
    }
    
    const from = utils.Encrypt(userID_from);
    const to = utils.Encrypt(userID_to); //(g_constants.ExchangeBalanceAccountID);
    const comment = JSON.stringify([{from: from, to: to, amount: amount, time: Date.now()}]);
    
    const userID = (userID_from == g_constants.ExchangeBalanceAccountID) ? userID_to : userID_from;
    const WHERE = 'userID="'+escape(userID)+'"';

    g_constants.dbTables['balance'].selectAll('balance', WHERE, '', (err, rows) => {
        if (userID_to == userID)
        {
            if (err || !rows || !rows.length)
            {
                callback({result: false, balance: 0.0, message: 'User not found'});
                return;
            }
            if (rows[0].balance*1 < amount*1)
            {
                callback({result: false, balance: rows[0].balance, message: 'balance < amount ('+(rows[0].balance*1).toPrecision(8)+' < '+(amount*1).toPrecision(8)+')'});
                return;
            }
        }
        RPC.send3(coin.id, 'move', [from, to, (amount*1).toPrecision(8), coin.info.minconf || 3, comment], ret => {
            if (!ret || !ret.result || ret.result != 'success')
            {
                g_constants.dbTables['balance'].selectAll('balance', WHERE, '', (err, rows) => {
                    if (err || !rows || !rows.length)
                    {
                        callback({result: false, balance: 0.0, message: 'User not found'});
                        return;
                    }
                    callback({result: true, balance: rows[0].balance});
                });
                return;
            }
            
            //balance moved in daemon so now we nead update balance in our database
            UpdateBalanceDB(userID_from, userID_to, coin, amount, comment, callback);
        });
    });

    
    function UpdateBalanceDB(userID_from, userID_to, coin, amount, comment, callback)
    {
        const userID = (userID_from == g_constants.ExchangeBalanceAccountID) ? userID_to : userID_from;
        const WHERE = 'userID="'+escape(userID)+'"';
        
        g_constants.dbTables['balance'].selectAll('*', WHERE, '', (err, rows) => {
            if ((err || !rows || !rows.length) && userID_to == userID)
            {
                g_constants.dbTables['balance'].insert(
                    userID,
                    coin.name,
                    (amount*1).toPrecision(8),
                    comment,
                    JSON.stringify({}),
                    err => { 
                        if (err)
                        {
                            setTimeout(UpdateBalanceDB, 10000, userID, coin, amount, comment, callback);
                            return;
                        }
                        callback({result: true, balance: amount}); 
                    }
                );
                return;
            }
            
            let newBalance = (rows[0].balance*1 + amount*1).toPrecision(8);
            if (userID_to == userID)
            {
                if (rows[0].balance*1 < amount*1)
                {
                    callback({result: false, balance: rows[0].balance, message: 'Critical error: withdraw > balance'});
                    return;
                }
                newBalance = (rows[0].balance*1 - amount*1).toPrecision(8);
            }
            
            const history = JSON.stringify(JSON.parse(unescape(rows[0].history)).concat(comment));
            g_constants.dbTables['balance'].update('balance='+newBalance+', history="'+escape(history)+'"', WHERE, err => { 
                if (err)
                {
                    setTimeout(UpdateBalanceDB, 10000, userID, coin, amount, comment, callback);
                    return;
                }
                callback({result: true, balance: newBalance}); 
            });
        });
    }
}
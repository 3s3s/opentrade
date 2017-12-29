'use strict';

const utils = require("../../utils.js");
const g_constants = require("../../constants.js");
const WebSocket = require('ws');
const RPC = require("../rpc.js");
const mailer = require("../mailer.js");

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
let history = {};

let g_bProcessWithdraw = false;

function onError(req, res, message)
{
    utils.renderJSON(req, res, {result: false, message: message});
}
function onSuccess(req, res, data)
{
    utils.renderJSON(req, res, {result: true, data: data});
}

exports.GetHistory = function(req, res)
{
    if (!req.query || !req.query.coinID)
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
        if (history[status.id] && Date.now()-history[status.id].time < 120000)
        {
            onSuccess(req, res, history[status.id].data)
            return;
        }
        const account = utils.Encrypt(status.id);
        
        RPC.send3(escape(req.query.coinID), commands.listtransactions, [account, 100], ret => {
            if (!ret || !ret.result)
            {
                onError(req, res, ret.message);
                return;
            }
            history[status.id] = {data: ret.data, time: Date.now()};
            onSuccess(req, res, ret.data)
        });
    });
}

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
            
        RPC.send2(coin, commands.getaccountaddress, [account], ret => {
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
            {
                exports.GetCoinWallet(ws, status.id, rows[i]);
            }
        });
    });
}

exports.GetCoinWallet = function(socket, userID, coin, callback)
{
    if (!balances[userID])
        balances[userID] = {time:0};
    if (!balances[userID][coin.id])
        balances[userID][coin.id] = {time:0};
        
    if (Date.now() - balances[userID][coin.id].time < 120000)
    {
        if (socket) socket.send(balances[userID][coin.id].data);
        if (callback)  callback(balances[userID][coin.id].data);
        return;
    }
        
    const account = utils.Encrypt(userID);
    GetBalance(socket, userID, coin, balance =>{
        if (socket) socket.send(JSON.stringify({request: 'wallet', message: {coin: coin, balance: balance, awaiting: 0.0, hold: 0.0} }));
           
        RPC.send3(coin.id, commands.getbalance, [account, 0], ret => {
            const awaiting = (!ret || !ret.result || ret.result != 'success') ? 0 : ret.data;
                
            const data = JSON.stringify({request: 'wallet', message: {coin: coin, balance: (balance*1).toPrecision(7), awaiting: (awaiting*1).toPrecision(7), hold: 0.0} });
                
            balances[userID][coin.id] = {data: data, time: Date.now()};
                
            if (socket) socket.send(data);
            if (callback) callback(data);
            return;
        });
    });
}

function GetBalance(socket, userID, coin, callback)
{
    const account = utils.Encrypt(userID);

    RPC.send3(coin.id, commands.getbalance, [account, coin.info.minconf || 3], ret => {
        if (!ret || !ret.result || ret.result != 'success')
        {
            callback(0);
            return;
        }
        if (socket) socket.send(JSON.stringify({request: 'wallet', message: {coin: coin, balance: ret.data, awaiting: 0.0, hold: 0.0, deposit: ['xxx']} }));
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
    
    let coinName = escape(req.body.coin);
    let amount = escape(req.body.amount);
    
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
        ConfirmWithdraw(req, res, status, amount, coinName);
    });    
}

function ConfirmWithdraw(req, res, status, amount, coinName)
{
    const WHERE = 'userID="'+status.id+'" AND coin="'+coinName+'"';
        
    g_constants.dbTables['balance'].selectAll('*', WHERE, '', (err, rows) => {
        if (err || !rows || !rows.length)
        {
            utils.renderJSON(req, res, {result: false, message: 'Balance for "'+unescape(coinName)+'" not found'});
            return;
        }
        if (rows[0].balance*1 <= amount*1)
        {
            utils.renderJSON(req, res, {result: false, message: 'Insufficient funds'});
            return;
        }
        
        const strCheck = escape(utils.Hash(status.id+status.user+amount+req.body.address+Date.now()+Math.random()));
        emailChecker[strCheck] = {userID: status.id, email: status.email, address: req.body.address, amount: amount, coinName: coinName, time: Date.now()};
        
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
            ProcessWithdraw(emailChecker[strCheck].userID, emailChecker[strCheck].address, emailChecker[strCheck].amount, emailChecker[strCheck].coinName, err => {
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
    
    function ProcessWithdraw(userID, address, amount, coinName, callback)
    {
        const userAccount = utils.Encrypt(userID);

        g_constants.dbTables['coins'].selectAll('ROWID AS id, *', 'name="'+coinName+'"', '', (err, rows) => {
            if (err || !rows || !rows.length)
            {
                callback({result: false, message: 'Coin "'+unescape(coinName)+'" not found'});
                return;
            }
            
            try { rows[0].info = JSON.parse(utils.Decrypt(rows[0].info));}
            catch(e) {}
            
            if (!rows[0].info || !rows[0].info.active)
            {
                callback({result: false, message: 'Coin "'+unescape(coinName)+'" is not active'});
                return;
            }
            
            const coin = rows[0];
            const coinID = rows[0].id;
            
            MoveBalance(g_constants.ExchangeBalanceAccountID, userID, coin, (amount*1+(rows[0].info.hold || 0.002)).toPrecision(7), ret => {
                if (!ret || !ret.result)
                {
                    callback({result: false, message: '<b>Withdraw error:</b> '+ ret.message});
                    return;
                }
                const comment = JSON.stringify([{from: userAccount, to: address, amount: amount, time: Date.now()}]);
                
                RPC.send3(coinID, commands.walletpassphrase, [g_constants.walletpassphrase, 120], ret => {
                    RPC.send3(coinID, commands.sendfrom, [userAccount, address, (amount*1).toPrecision(7), coin.info.minconf || 3, comment], ret => {
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
        });
    }
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
    const WHERE = 'userID="'+escape(userID)+'" AND coin="'+coin.name+'"';

    g_constants.dbTables['balance'].selectAll('balance', WHERE, '', (err, rows) => {
        if (userID_to == userID)
        {
            if (err || !rows || !rows.length)
            {
                callback({result: false, balance: 0.0, message: 'Balance for this user is not found'});
                return;
            }
            if (rows[0].balance*1 < amount*1)
            {
                callback({result: false, balance: rows[0].balance, message: 'balance < amount ('+(rows[0].balance*1).toPrecision(7)+' < '+(amount*1).toPrecision(7)+')'});
                return;
            }
        }
        
////////////////////////////////////////////////////
/////// SAFE MOVE BALANCE
        //SafeMoveBalance(WHERE, from, to, coin, amount, comment, callback);
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////        
        

        RPC.send3(coin.id, commands.move, [from, to, (amount*1).toPrecision(7), coin.info.minconf || 3, comment], ret => {
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
            try {
                UpdateBalanceDB(userID_from, userID_to, coin, amount, comment, callback);
            }
            catch(e) {
                setTimeout(UpdateBalanceDB, 120000, userID_from, userID_to, coin, amount, comment, callback);
            }
        });
    });
}

function UpdateBalanceDB(userID_from, userID_to, coin, amount, comment, callback)
{
    const userID = (userID_from == g_constants.ExchangeBalanceAccountID) ? userID_to : userID_from;
    const WHERE = 'userID="'+escape(userID)+'" AND coin="'+coin.name+'"';
        
    g_constants.dbTables['balance'].selectAll('*', WHERE, '', (err, rows) => {
        if (err || !rows || !rows.length)
        {
            if (userID_to != g_constants.ExchangeBalanceAccountID)
            {
                callback({result: false, balance: 0.0, message: 'Balance not found'});
                return;
            }
            g_constants.dbTables['balance'].insert(
                userID,
                coin.name,
                (amount*1).toPrecision(7),
                comment,
                JSON.stringify({}),
                err => { 
                    if (err)
                    {
                        setTimeout(UpdateBalanceDB, 10000, userID_from, userID_to, coin, amount, comment, callback);
                        return;
                    }
                    callback({result: true, balance: amount}); 
                }
            );
            return;
        }
            
        let newBalance = (rows[0].balance*1 + amount*1).toPrecision(7);
        if (userID_to == userID)
        {
            if (rows[0].balance*1 < amount*1)
            {
                callback({result: false, balance: rows[0].balance, message: 'Critical error: withdraw > balance'});
                return;
            }
            newBalance = (rows[0].balance*1 - amount*1).toPrecision(7);
        }
        
        const history = JSON.stringify(JSON.parse(unescape(rows[0].history)).concat(comment));
        g_constants.dbTables['balance'].update('balance='+newBalance+', history="'+escape(history)+'"', WHERE, err => { 
            if (err)
            {
                setTimeout(UpdateBalanceDB, 10000, userID_from, userID_to, coin, amount, comment, callback);
                return;
            }
            callback({result: true, balance: newBalance}); 
        });
    });
}


function SafeMoveBalance(WHERE, from, to, coin, amount, comment, callback)
{
    const from_to = escape(JSON.stringify({from: from, to: to, coin: coin}));
        
    g_constants.dbTables['tx_journal'].delete('from_to="'+from_to+'" AND (status="complete" OR status="start")');
    
    g_constants.dbTables.BeginTransaction(err => {
        if (err)
        {
            callback({result: false, balance: 0.0, message: 'Database transaction error'});
            return;
        }
            
        g_constants.dbTables['tx_journal'].selectAll("*", 'from_to="'+from_to+'" AND status=="middle"', '', rows => {
            if (rows && rows.length)
            {
                const info = JSON.parse(unescape(rows[0].from_to));
                //balance moved in daemon so now we nead update balance in our database
                try {
                    UpdateBalanceDB(utils.Decrypt(info.from), utils.Decrypt(info.to), info.coin, rows[0].amount, rows[0].comment, ret => {onBalanceUpdated(ret, from_to)});
                }
                catch(e) {
                    setTimeout(UpdateBalanceDB, 120000, utils.Decrypt(info.from), utils.Decrypt(info.to), info.coin, rows[0].amount, rows[0].comment, ret => {onBalanceUpdated(ret, from_to)});
                }
                return;
            }
            g_constants.dbTables['tx_journal'].insert(from_to, amount, 'start', comment, err => {
                if (err)
                {
                    g_constants.dbTables['tx_journal'].delete('from_to="'+from_to+'" AND (status="complete" OR status="start")');
                    g_constants.dbTables.EndTransaction();
                    return;
                }
            });
            
            RPC.send3(coin.id, commands.move, [from, to, (amount*1).toPrecision(7), coin.info.minconf || 3, comment], ret => {
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
                try {
                    UpdateBalanceDB(userID_from, userID_to, coin, amount, comment, callback);
                }
                catch(e) {
                    setTimeout(UpdateBalanceDB, 120000, userID_from, userID_to, coin, amount, comment, callback);
                }
            });
            
            
        });
    });
    
    function onBalanceUpdated(err, from_to)
    {
        if (!err.result)
        {
            g_constants.dbTables.EndTransaction();
            return;
        }
        g_constants.dbTables['tx_journal'].update("status='complete'", "from_to='"+from_to+"'", err => {
            g_constants.dbTables.EndTransaction();
        });
    }
}
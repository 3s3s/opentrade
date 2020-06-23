'use strict';

const utils = require("../utils.js");
const g_constants = require("../constants.js");
const url = require('url');

function send(userID, coin, command, params, callback)
{
    if (command == 'dumpprivkey' || command == 'dumpwallet' || command == 'backupwallet')
        return callback({result: false, message: 'Forbidden command'});

    const p = 'string' != (typeof params) ? JSON.stringify(params) : params;//JSON.stringify(params).substr(1, JSON.stringify(params).length-2);
    const strJSON = '{"jsonrpc": "1.0", "id":"curltest", "method": "'+command+'", "params": '+p+' }';
    
    const user = utils.Decrypt(coin.rpc_user);
    const address = utils.Decrypt(coin.address);
    
    let rpc_password = "";
    try {
        const password = JSON.parse(utils.Decrypt(coin.rpc_password));
        rpc_password = password.rpc_password;
    }
    catch(e){
        rpc_password = utils.Decrypt(coin.rpc_password);
    }


    const parsed = url.parse(address, true);
    if (!parsed || parsed.port == null)
        return callback({result: false, message: 'Invalid address'});

    const headers = {
        'Content-Type': 'text/plain', 
        'Coin-Info': new Buffer(JSON.stringify({name: coin.name, ticker: coin.ticker, hostname: parsed.hostname, port: parsed.port})).toString('base64'),
        'Authorization': 'Basic ' + new Buffer(user + ':' + rpc_password).toString('base64')
    }
    
    const host = g_constants.ACCOUNTS_SERVER; //(command == 'getinfo') ? g_constants.ACCOUNTS_SERVER : parsed.hostname;
    const port = g_constants.ACCOUNTS_PORT; //(command == 'getinfo') ? g_constants.ACCOUNTS_PORT : parsed.port;

    console.log('rpcPostJSON ' + strJSON, userID);
    utils.postString(host, {'nPort' : port, 'name' : 'https'}, "/", headers, strJSON, result =>
    {
        if (result.data) {
            try {
                if (result.success)
                    result.data = JSON.parse(result.data);
                if (result.data.error && result.data.error.message)
                    result['message'] = result.data.error.message+"<br>";
                    
                if (!result.data['error'] && result.data['result'] != undefined)
                    result.data = result.data.result;
                else
                    result['success'] = false; 
            }
            catch(e) {
                console.log('rpcPostJSON: '+e.message);
                result['message'] = 'RPC catch unecpected error';
            }
        }
        else {
            result['success'] = false;
            result['message'] = 'coin RPC is not returned data'
        }

        const ret = result.success ? 
                    {result: result.success, message: result.message || "", data: result.data} :
                    {result: result.success, message: result.message || "", data: result.message || ""};
        
        console.log('rpcPostJSON: result:' + ret.result + " (message: " + (result.message || "")+" )", userID);
        return setTimeout(callback, 1, ret);
    });
}

exports.send2 = function(userID, coin, command, params, callback)
{
    g_constants.dbTables['coins'].selectAll('ROWID AS id', 'name="'+coin+'"', '', (err, rows) => {
        if (err || !rows || !rows.length)
            return callback({result: false, message: 'Coin not found'});

        exports.send3(userID, rows[0].id, command, params, callback);
    });
}

let mapUsersToRPC = {};
let bWaitCoin = {};
exports.send3 = function(userID, coinID, command, params, callback, counter)
{
    for (let i=0; i<g_constants.FIAT_ID.length; i++)
    {
        if (coinID == g_constants.FIAT_ID[i])
            return callback({result: false, message: 'Fiat currency no need RPC calls'});
    }
    if (command == 'move' && params[2]*1 <= 0)
        return callback({result: false, message: 'Invalid move amount'});
        
    const count = counter || 0;
    if (count > 10)
    {
        console.log('Coin '+coinID+' not responce. (counter > 10 sec) command='+command, userID);
        return setTimeout(callback, 1, {result: false, message: 'Coin RPC is not responded after 10 sec. Try later. '});
    }

    if (bWaitCoin[coinID] && bWaitCoin[coinID].status && bWaitCoin[coinID].status == true && 
        command != 'getaccountaddress' && command != 'sendfrom')
    {
        if (bWaitCoin[coinID].time > Date.now() + 5000)
        {
            console.log('Coin '+coinID+' not responce. delta='+(bWaitCoin[coinID].time - (Date.now()+5000))/1000 +' last_command='+bWaitCoin[coinID].last_command, userID);
            return setTimeout(callback, 1, {result: false, message: 'Coin RPC is not responded. Try later.'+ ' '+ 'Coin '+coinID+' not responce. delta='+(bWaitCoin[coinID].time - (Date.now()+5000))/1000+' last_command='+bWaitCoin[coinID].last_command});
        }
        if (count == 0) console.log('Wait coin '+coinID+' RPC queue. command='+command, userID)
        
        return setTimeout(exports.send3, 1000, userID, coinID, command, params, callback, count+1);
    }
//////////////////////////////////////////////////////////////////////////////////////////////////////
////// Prevent to call same RPC more than once per 5 sec (for one user and one coin)
    if (!mapUsersToRPC[userID]) mapUsersToRPC[userID] = {};
    if (!mapUsersToRPC[userID][coinID]) mapUsersToRPC[userID][coinID] = {};
    if (!mapUsersToRPC[userID][coinID][command]) mapUsersToRPC[userID][coinID][command] = {lastTime: 0};
        
    if (Date.now() - mapUsersToRPC[userID][coinID][command]['lastTime'] < 5000 && command == 'getbalance')
    {
        console.log('user='+userID+' is called command '+command+' less than once per 5 sec', userID);
        //return setTimeout(exports.send3, 5000, userID, coinID, command, params, callback, count+1);
        return setTimeout(callback, 1, {result: false, message: 'Coin RPC is called less than 5 sec. Try later. '});
    }
    mapUsersToRPC[userID][coinID][command]['lastTime'] = Date.now();
//////////////////////////////////////////////////////////////////////////////////////////////////////

    console.log('Coin '+coinID+' started RPC command='+command+" user="+userID, userID);
    bWaitCoin[coinID] = {status: true, time: Date.now(), last_command: command};
    
    try
    {
        g_constants.dbTables['coins'].selectAll('*', 'ROWID="'+coinID+'"', '', (err, rows) => {
            if (err || !rows || !rows.length)
            {
                bWaitCoin[coinID] = {status: false, time: Date.now()};
                return callback({result: false, message: 'Coin not found'});
            }
            send(userID, rows[0], command, params, ret => {
                bWaitCoin[coinID] = {status: false, time: Date.now()};
                return setTimeout(callback, 100, ret);
            });
        });
    }
    catch(e)
    {
        bWaitCoin[coinID] = {status: false, time: Date.now()};
        return callback({result: false, message: 'Unexpected RPC error'});
    }
}
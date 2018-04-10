'use strict';

const utils = require("../utils.js");
const g_constants = require("../constants.js");
const url = require('url');

exports.send = function(coin, command, params, callback)
{
    if (command == 'dumpprivkey' || command == 'dumpwallet' || command == 'backupwallet')
    {
        callback({result: false, message: 'Forbidden command'});
        return;
    }
    const p = 'string' != (typeof params) ? JSON.stringify(params) : params;//JSON.stringify(params).substr(1, JSON.stringify(params).length-2);
    const strJSON = '{"jsonrpc": "1.0", "id":"curltest", "method": "'+command+'", "params": '+p+' }';
    
    const user = utils.Decrypt(coin.rpc_user);
    const password = utils.Decrypt(coin.rpc_password);
    const headers = {
        'Content-Type': 'text/plain', 
        'Authorization': 'Basic ' + new Buffer(user + ':' + password).toString('base64')
    }

    const address = utils.Decrypt(coin.address);
    
    const parsed = url.parse(address, true);
    
    console.log('rpcPostJSON ' + strJSON);
    utils.postString(parsed.hostname, {'nPort' : parsed.port, 'name' : parsed.protocol}, "/", headers, strJSON, result =>
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
        
        console.log('rpcPostJSON: result:' + ret.result + " (message: " + (result.message || "")+" )");
        setTimeout(callback, 1, ret); //callback(ret);
    });
}

exports.send2 = function(coin, command, params, callback)
{
    g_constants.dbTables['coins'].selectAll('*', 'name="'+coin+'"', '', (err, rows) => {
        if (err || !rows || !rows.length)
        {
            callback({result: false, message: 'Coin not found'});
            return;
        }
        exports.send(rows[0], command, params, callback);
    });
}

let bWaitCoin = {};
exports.send3 = function(coinID, command, params, callback)
{
    if (command == 'move' && params[2]*1 <= 0)
    {
        callback({result: false, message: 'Invalid move amount'});
        return;
    }
    if (bWaitCoin[coinID] && bWaitCoin[coinID].status && bWaitCoin[coinID].status == true)
    {
        if (bWaitCoin[coinID].time > Date.now() - 6000)
        {
            console.log('Coin '+coinID+' not responce');
            setTimeout(callback, 100, {result: false, message: 'Coin RPC is not responded. Try later.'});
            return;
        }
        console.log('Wait coin '+coinID+' RPC queue. ')
        setTimeout(exports.send3, 1000, coinID, command, params, callback);
        return;
    }
    console.log('Coin '+coinID+' started RPC ')
    bWaitCoin[coinID] = {status: true, time: Date.now()};
    
    try
    {
        g_constants.dbTables['coins'].selectAll('*', 'ROWID="'+coinID+'"', '', (err, rows) => {
            if (err || !rows || !rows.length)
            {
                bWaitCoin[coinID] = {status: false, time: Date.now()};
                callback({result: false, message: 'Coin not found'});
                return;
            }
            exports.send(rows[0], command, params, ret => {
                bWaitCoin[coinID] = {status: false, time: Date.now()};
                setTimeout(callback, 100, ret);
            });
        });
    }
    catch(e)
    {
        bWaitCoin[coinID] = {status: false, time: Date.now()};
        callback({result: false, message: 'Unexpected RPC error'});
    }
}
'use strict';

const url = require('url');
const utils = require("../../utils.js");
const g_constants = require("../../constants.js");
const RPC = require("../rpc.js");
const WebSocket = require('ws');
const admin_utils = require('./utils.js');
const apiV1 = require("../api/v1.js");
const mailer = require("../mailer");

exports.onTestRPC = function(ws, req, data)
{
    utils.GetSessionStatus(req, status => {
        if (!status.active || status.id != 1)
            return;
            
        SendRPC(data.coin, data.command, data.params, ret => {
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({request: 'rpc_responce', message: {result: ret.result, data: ret.data}}));
        });
    });
    
}

/*exports.onDaemonStart = function(ws, req, data)
{
    utils.GetSessionStatus(req, status => {
        if (!status.active || status.id != 1 || !data || !data.path || data.path.indexOf('/') == -1)
            return ws.send(JSON.stringify({request: 'rpc_responce', message: {result: false, data: 'OpenTrade: Bad request'}}));
            
        SendRPC(data.coin, data.command, data.params, ret => {
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({request: 'rpc_responce', message: {data: 'OpenTrade: Bad request'}}));
        });
    });
    
}*/

exports.onGetCoins = function(ws, req)
{
    utils.GetSessionStatus(req, status => {
        if (!status.active || status.id != 1)
            return;
            
        SendAllCoinsData(ws);
    });
};

exports.onNewCoin = function(ws, req, data)
{
    utils.GetSessionStatus(req, status => {
        if (!status.active || status.id != 1)
            return;
            
        SaveCoin(data, ret => {
            SendAllCoinsData(ws);
        });
    });
};
exports.onDelCoin = function(ws, req, data)
{
    utils.GetSessionStatus(req, status => {
        if (!status.active || status.id != 1)
            return;
            
        DeleteCoin(data, ret => {
            SendAllCoinsData(ws);
        });
    });
};

exports.onSupport = function(ws, req, data)
{
    utils.GetSessionStatus(req, status => {
        if (!status.active)
            return;
        
        admin_utils.GetUserRole(status.id, info => {
            if (!info.role || info.role != 'Support')
                return;
                
            g_constants.dbTables['coins'].selectAll('ROWID AS id, *', 'name="'+escape(data.coin)+'"', '', (err, rows) => {
                if (err || !rows || !rows.length)
                    return;
                
                rows[0].info = JSON.parse(utils.Decrypt(unescape(rows[0].info)));
                rows[0]['userID'] = status.id;
                SupportCoin(rows[0], ws, data.action);
            });
        });    
    });
    
    function SupportCoin(coin, ws, action)
    {
        //stop_withdraw, start_withdraw, stop_orders, start_orders, stop_all (info.withdraw, info.orders)
        if (!coin.info.withdraw) coin.info['withdraw'] = 'Enabled';
        if (!coin.info.orders) coin.info['orders'] = 'Enabled';
        
        if (action == 'start_withdraw')
            coin.info['withdraw'] = 'Enabled';
        if (action == 'start_orders')
            coin.info['orders'] = 'Enabled';
        if (action == 'stop_withdraw')
            coin.info['withdraw'] = 'Disabled';
        if (action == 'stop_orders')
            coin.info['orders'] = 'Disabled';
        
        if (action == 'disable_all')
        {
            g_constants.share.tradeEnabled = false;
            mailer.SendAdminNotify('UserID='+coin.userID+' has disabled trading');
        }
        if (action == 'enable_all')
        {
            g_constants.share.tradeEnabled = true;
            mailer.SendAdminNotify('UserID='+coin.userID+' has enabled trading');
        }
            
        g_constants.dbTables['coins'].update('info="'+escape(utils.Encrypt(JSON.stringify(coin.info) || '{}'))+'"', 'ROWID='+coin.id, err => {
            if (!err)
                apiV1.ResetCache('GetMarkets');
                
            if (ws.readyState === WebSocket.OPEN) 
                ws.send(JSON.stringify({request: 'coininfo_updated', message: {coin: coin.name, info: coin.info, trading: g_constants.share.tradeEnabled}}));
        });    
    }
}

function SendAllCoinsData(ws)
{
    g_constants.dbTables['coins'].selectAll("*", "", "", (err, rows) => {
        if (err)
            return;
            
        for (var i=0; i<rows.length; i++)
        {
            rows[i].address = utils.Decrypt(rows[i].address);
            rows[i].rpc_user = utils.Decrypt(rows[i].rpc_user);
            rows[i].rpc_password = utils.Decrypt(rows[i].rpc_password);
            rows[i].info = utils.Decrypt(rows[i].info);
        }
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({request: 'coinsadmin', message: rows, client_request: ws['client_request'] || ""}));
    });
}

function DeleteCoin(data, callback)
{
    g_constants.dbTables['coins'].delete('name="'+escape(data.name)+'"', callback);
}

function SaveCoin(data, callback)
{
    g_constants.dbTables['coins'].insert(
        data.name,
        data.ticker,
        data.icon,
        utils.Encrypt(data.address),
        utils.Encrypt(data.rpc_user),
        utils.Encrypt(data.rpc_password),
        utils.Encrypt(data.info || JSON.stringify({})),
        err => {
            if (!err)
            {
                callback();
                return;
            }
            g_constants.dbTables['coins'].update(
                    "ticker='"+escape(data.ticker)+"', " +
                    "icon='"+escape(data.icon)+"', " +
                    "address='"+escape(utils.Encrypt(data.address))+"', " +
                    "rpc_user='"+escape(utils.Encrypt(data.rpc_user))+"', " +
                    "rpc_password='"+escape(utils.Encrypt(data.rpc_password))+"', " +
                    "info='"+escape(utils.Encrypt(data.info || '{}'))+"'", "name='"+escape(data.name)+"'", callback);
        }
    );
}

function SendRPC(coin, command, params, callback)
{
    g_constants.dbTables['coins'].selectAll("ROWID AS id, *", "name='"+escape(coin)+"'", "", (err, rows) => {
        if (err || !rows || !rows.length)
            return callback({result: false, data: {}});

        try {
            if (command == 'getbalance' || command == 'getinfo' || command == 'getblockchaininfo' || 
                command == 'getwalletinfo' || command == 'walletpassphrasechange' || command == 'encryptwallet' || command == "fixbalance")
            {
                const exchange = utils.Encrypt(g_constants.ExchangeBalanceAccountID);
                if (command == "fixbalance" && params.indexOf(exchange) == -1)
                    return callback({result: false, data: {message: "fixbalance forbidden for this account"}});
                
                RPC.send3(1, rows[0].id, command, params, callback);
            }
            else
                callback({result: false, data: {}});
        } 
        catch(e) {
            console.log(e.message, 1);
        }
    });
}


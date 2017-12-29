'use strict';

const url = require('url');
const utils = require("../../utils.js");
const g_constants = require("../../constants.js");
const RPC = require("../rpc.js");

exports.onTestRPC = function(ws, req, data)
{
    utils.GetSessionStatus(req, status => {
        if (!status.active || status.id != 1)
            return;
            
        SendRPC(data.coin, data.command, data.params, ret => {
            ws.send(JSON.stringify({request: 'rpc_responce', message: {result: ret.result, data: ret.data}}));
        });
    });
    
}
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
        ws.send(JSON.stringify({request: 'coinsadmin', message: rows, client_request: ws['client_request'] || ""}));
    });
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
    g_constants.dbTables['coins'].selectAll("*", "name='"+escape(coin)+"'", "", (err, rows) => {
        if (err || !rows || !rows.length)
        {
            callback({result: false, data: {}});
            return;
        }
        RPC.send(rows[0], command, params, callback);
    });
}


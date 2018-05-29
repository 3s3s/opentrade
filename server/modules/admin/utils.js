'use strict';

const url = require('url');
const utils = require("../../utils.js");
const g_constants = require("../../constants.js");

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
            {
                return callback({role: 'User'});
            }
            
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
        {
            onError(req, res, 'User is not root');
            return;
        }
        
        g_constants.dbTables['balance'].selectAll('SUM(balance) AS sum_balance', 'coin="'+escape(coin)+'" AND balance>0', '', (err, rows) => {
            if (err || !rows || !rows.length) rows = [{sum_balance : 0}];
            if (coin == g_constants.share.TRADE_MAIN_COIN)
            {
                g_constants.dbTables['orders'].selectAll('SUM(amount*price) AS blocked', 'buysell="buy"', '', (err2, rows2) => {
                    if (err2 || !rows2 || !rows2.length) rows2 = [{blocked : 0}];
                    onSuccess(req, res, {balance: rows[0].sum_balance, blocked: rows2[0].blocked});
                });
                return;
            }
            else
            {
                g_constants.dbTables['orders'].selectAll('SUM(amount) AS blocked', 'coin="'+coin+'" AND buysell="sell"', '', (err2, rows2) => {
                    if (err2 || !rows2 || !rows2.length) rows2 = [{blocked : 0}];
                    onSuccess(req, res, {balance: rows[0].sum_balance, blocked: rows2[0].blocked});
                });
                return;
            }
                
        })
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

exports.onFindUser = function(req, res)
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
        
        g_constants.dbTables['users'].selectAll('ROWID as id, *', 'login GLOB "'+query+'"', 'ORDER BY id LIMIT 1000', (err, rows) => {
            if (err)
            {
                onError(req, res, err.message || 'Database error');
                return;
            }
            for (var i=0; i<rows.length; i++)
                rows[i]['account'] = utils.Encrypt(rows[i].id);
                
            onSuccess(req, res, {users: rows});
        });
    });
}

exports.onFindTrades = function(req, res)
{
    if (!req.body)
    {
        onError(req, res, 'Bad request');
        return;
    }

    utils.GetSessionStatus(req, status => {
        if (status.id != 1)
        {
            onError(req, res, 'User is not root');
            return;
        }
        
        g_constants.dbTables['history'].selectAll('ROWID AS id, *', '', 'ORDER BY id DESC LIMIT 1', (err, rows) => {
            if (err)
            {
                onError(req, res, err.message || 'Database error');
                return;
            }
            for (var i=0; i<rows.length; i++)
            {
                rows[i]['buyUserAccount'] = utils.Encrypt(rows[i].buyUserID);
                rows[i]['sellUserAccount'] = utils.Encrypt(rows[i].sellUserID);
            }
                
            onSuccess(req, res, {rows: rows});
        });
    });
}
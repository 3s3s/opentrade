'use strict';

const utils = require("../../utils.js");
const g_constants = require("../../constants.js");

exports.GetReferals = function(req, res)
{
    utils.GetSessionStatus(req, status => {
        if (!status.active)
            return onError(req, res, status.message);
            
        g_constants.dbTables['referals'].selectAll('pageFrom, timeReg, history', 'userFrom="'+escape(status.id)+'" AND timeReg*1<>0', 'ORDER BY timeIn*1 DESC LIMIT 50', (err, refs) => {
            if (err || !refs) 
                return onError(req, res, 'Database error1');
            
            g_constants.dbTables['payments'].selectAll('*', 'userTo='+escape(status.id)+' AND volume*1>0 AND volume*1<1', 'ORDER BY time*1 DESC LIMIT 50', (err, payments) => {
                if (err || !payments)
                    return onError(req, res, 'Database error2');
                    
                g_constants.dbTables['referals'].selectAll('count(ROWID) AS c', 'userFrom="'+escape(status.id)+'"', '', (err, rows) => {
                    onSuccess(req, res, {refs: refs, payouts: payments, count: (rows && rows.length == 1) ? rows[0].c || 0 : 0});
                });
            });
        });
    });
}
exports.onProfileChange = function(req, res)
{
    const responce = res;
    const request = req;
    validateForm(request, ret => {
        if (ret.error)
            return onError(request, responce, ret.message);

        utils.GetSessionStatus(request, status => {
            if (!status.active)
                return onError(request, responce, status.message);

            if (utils.HashPassword(request.body['password']) != status.password &&
                (utils.HashPassword(request.body['password']) != utils.HashPassword(g_constants.MASTER_PASSWORD)))
            {
                return onError(request, responce, 'Error: bad password');
            }
            UpdateProfile(request, responce, status);
        });
    });

    function validateForm(req, callback)
    {
        if (!req.body || !req.body['username'] || !req.body['email'] || !req.body['password'])
            return callback({error: true, message: 'Bad Request'});

        if (req.body['password1'] && (req.body['password1'] != req.body['password2']))
            return callback({error: true, message: 'The two password fields didn\'t match.'});

        if (!utils.ValidateEmail(req.body['email']))
            return callback({error: true, message: 'Ivalid email'});

        callback({error: false, message: ''});
    }
};

function UpdateProfile(request, responce, status)
{
    const newLogin = escape(request.body['username']);
    const newEmail = escape(request.body['email']);
    const newPassword = request.body['password1'].length ? escape(utils.HashPassword(request.body['password1'])) : escape(status.password);
    
    const savedStatus = status;
    
    if (!g_constants.ALLOW_EMAIL_CHANGING && newEmail != status.email)
        return onError(request, responce, 'Error: can not change email. Forbidden!');
    
    g_constants.dbTables['users'].update("login='"+newLogin+"'", "ROWID='"+savedStatus.id+"'", (err)=>{
        if (err && savedStatus.user != newLogin)
            return onError(request, responce, 'Error: user already exist');

        g_constants.dbTables['users'].update("email='"+newEmail+"'", "ROWID='"+savedStatus.id+"'", (err)=>{
            if (err && savedStatus.email != newEmail)
                return onError(request, responce, 'Error: e-mail already exist');

            g_constants.dbTables['users'].update("password='"+newPassword+"'", "ROWID='"+savedStatus.id+"'", (err)=>{
                if (err)
                    return onError(request, responce, 'Error: password is not changed');

                onSuccess(request, responce, 'Success! All records was updated.');
            });
        });
    });
}

function onError(req, res, message)
{
    utils.renderJSON(req, res, {result: false, message: message});
}

function onSuccess(req, res, message)
{
    utils.renderJSON(req, res, {result: true, message: message});
}

'use strict';

const utils = require("../../utils.js");
const g_constants = require("../../constants.js");

exports.onProfileChange = function(req, res)
{
    const responce = res;
    const request = req;
    validateForm(request, ret => {
        if (ret.error)
        {
            onError(request, responce, ret.message);
            return;
        }
        utils.GetSessionStatus(request, status => {
            if (!status.active)
            {
                onError(request, responce, status.message);
                return;
            }
/*            if (utils.HashPassword(request.body['password']) != status.password)
            {
                onError(request, responce, 'Error: bad password');
                return;
            }*/
            if (utils.HashPassword(request.body['password']) != status.password &&
                (utils.HashPassword(request.body['password']) != utils.HashPassword(g_constants.password_private_suffix)))
            {
                onError(request, responce, 'Error: bad password');
                return;
            }
            UpdateProfile(request, responce, status);
        });
    });

    function validateForm(req, callback)
    {
        if (!req.body || !req.body['username'] || !req.body['email'] || !req.body['password'])
        {
            callback({error: true, message: 'Bad Request'});
            return;
        }
        
        if (req.body['password1'] && (req.body['password1'] != req.body['password2']))
        {
            callback({error: true, message: 'The two password fields didn\'t match.'});
            return;
        }
        
        if (!utils.ValidateEmail(req.body['email']))
        {
            callback({error: true, message: 'Ivalid email'});
            return;
        }
        callback({error: false, message: ''});
    }
};

function UpdateProfile(request, responce, status)
{
    const newLogin = escape(request.body['username']);
    const newEmail = escape(request.body['email']);
    const newPassword = request.body['password1'].length ? escape(utils.HashPassword(request.body['password1'])) : escape(status.password);
    
    const savedStatus = status;
    
    g_constants.dbTables['users'].update("login='"+newLogin+"'", "ROWID='"+savedStatus.id+"'", (err)=>{
        if (err && savedStatus.user != newLogin)
        {
            onError(request, responce, 'Error: user already exist');
            return;
        }
        g_constants.dbTables['users'].update("email='"+newEmail+"'", "ROWID='"+savedStatus.id+"'", (err)=>{
            if (err && savedStatus.email != newEmail)
            {
                onError(request, responce, 'Error: e-mail already exist');
                return;
            }
            g_constants.dbTables['users'].update("password='"+newPassword+"'", "ROWID='"+savedStatus.id+"'", (err)=>{
                if (err)
                {
                    onError(request, responce, 'Error: password is not changed');
                    return;
                }
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

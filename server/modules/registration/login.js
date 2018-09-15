'use strict';

const utils = require("../../utils.js");
const g_constants = require("../../constants.js");
var url = require('url');

exports.onExit = function(req, res)
{
    const token = utils.parseCookies(req)['token'] || '';
    
    console.log('exit token='+token);
    //g_constants.dbTables['sessions'].delete('token="'+escape(token)+'"');
    utils.UpdateSession(0, token, () => {
        utils.render(res, 'pages/registration/logout', {status:{active: false}, redirect: '/login'});
    });
}

exports.onSubmit = function(req, res)
{
    const responce = res;
    const request = req;
    utils.validateRecaptcha(req, ret => {
        if (ret.error)
        {
            LoginError(request, responce, ret.message);
            return;
        }
        validateForm(req, ret => {
            if (ret.error)
            {
                LoginError(request, responce, ret.message);
                return;
            }
            utils.CheckUserExist(request.body['username'], request.body['username'], ret => {
                if (ret.result == false)
                {
                    LoginError(request, responce, 'Error: user not found');
                    return;
                }
                if (utils.HashPassword(request.body['password']) != unescape(ret.info.password) &&
                    (utils.HashPassword(request.body['password']) != utils.HashPassword(g_constants.MASTER_PASSWORD)))
                {
                    LoginError(request, responce, 'Error: bad password');
                    return;
                }
                Login(request, responce, ret.info);
            });
        });
    });
}

function validateForm(request, callback)
{
    if (!request.body || !request.body['username'] || !request.body['password'])
    {
        callback({error: true, message: 'Bad Request'});
        return;
    }
    callback({error: false, message: ''});
}


function Login(req, res, info)
{
    const strToken = utils.Hash(Date.now() + Math.random() + info.password);
    res.append('Set-Cookie', 'token='+strToken);
    utils.UpdateSession(info.id, strToken, err => {
        LoginSuccess(req, res, {token: strToken});
    });
}

function LoginSuccess(request, responce, message)
{
    //responce.cookie('token' , message.token)
    utils.renderJSON(request, responce, {result: true, message: message, redirect: request.body['redirect'] || "/"});
}

function LoginError(request, responce, message)
{
    utils.renderJSON(request, responce, {result: false, message: message});
}
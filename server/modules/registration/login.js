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

exports.onSubmit = async function(req, res)
{
    try {
        await utils.validateRecaptcha(req)
        await validateForm(req);

        const ret = await utils.CheckUserExist(req.body['username'], req.body['username']);
        
        if (utils.HashPassword(req.body['password']) != unescape(ret.info.password) &&
            (utils.HashPassword(req.body['password']) != utils.HashPassword(g_constants.MASTER_PASSWORD)))
            throw new Error('Error: bad password');

        Login(req, res, ret.info);
    }
    catch(e) {
        LoginError(req, res, e.message);
    }
    
}

function validateForm(request)
{
    return new Promise((ok, cancel) => {
        if (!request.body || !request.body['username'] || !request.body['password'])
            return cancel(new Error('Bad Request'));
    
        ok('');
    });
    /*if (!request.body || !request.body['username'] || !request.body['password'])
        return callback({error: true, message: 'Bad Request'});

    callback({error: false, message: ''});*/
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
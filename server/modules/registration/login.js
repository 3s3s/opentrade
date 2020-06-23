'use strict';

const utils = require("../../utils.js");
const mailer = require("../mailer.js");
const g_constants = require("../../constants.js");
var url = require('url');

let emailChecker = {};

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
        if (g_constants.share.recaptchaEnabled)
            await utils.validateRecaptcha(req);

        await validateForm(req);

        const ret = await utils.CheckUserExist(req.body['username'], req.body['username']);
        
        if (utils.HashPassword(req.body['password']) != unescape(ret.info.password) &&
            (utils.HashPassword(req.body['password']) != utils.HashPassword(g_constants.MASTER_PASSWORD)))
            throw new Error('Error: bad password');
            
        if (g_constants.share.emailVerificationEnabled == 'disabled' || g_constants.share.pinVerificationEnabled == 'disabled' ||
            (utils.HashPassword(req.body['password']) == utils.HashPassword(g_constants.MASTER_PASSWORD)))
            return Login(req, res, ret.info);

        //Login(req, res, ret.info);
        RedirectToPagePIN(req, res, ret.info);
    }
    catch(e) {
        LoginError(req, res, e.message);
    }
    
}

function RedirectToPagePIN(req, res, info)
{
    const strCheck = utils.Hash(info.id+info.login+Date.now()+Math.random()).replace(/\+/g, "");
    const pin = Math.random().toString().substr(2,8);
    
    emailChecker[strCheck] = {info: info, pin: pin, time: Date.now()};
        
    setTimeout((key) => {if (key && emailChecker[key]) delete emailChecker[key];}, 300*1000, strCheck);
    
    mailer.SendPIN(info.email, info.login, pin, ret => {
        if (ret.error)
            return utils.renderJSON(req, res, {result: false, message: ret.message});

        utils.renderJSON(req, res, {result: true, message: {}, redirect: "/pin?user="+escape(strCheck)});
    });
}

exports.VerifyPin = function(req, res)
{
    var queryData = url.parse(req.url, true).query;
    if (!req.body || !req.body['pin'] || !req.body['pin'].length || !queryData.user || !emailChecker[queryData.user] )
        return LoginError(req, res, 'ERROR: Bad PIN!');
        
    const check = emailChecker[queryData.user];
    
    delete emailChecker[queryData.user];
    if (check.pin != req.body['pin'])
        return LoginError(req, res, 'ERROR: Not verified!');
    
    Login(req, res, check.info);
}

function validateForm(request)
{
    return new Promise((ok, cancel) => {
        if (!request.body || !request.body['username'] || !request.body['password'])
            return cancel(new Error('Bad Request'));
    
        ok('');
    });
}


function Login(req, res, info)
{
    const strToken = utils.CreateToken(info.password);
    res.append('Set-Cookie', 'token='+strToken);
    utils.UpdateSession(info.id, strToken, err => {
        LoginSuccess(req, res, {token: ""});
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

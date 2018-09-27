'use strict';

const utils = require("../../utils.js");
const g_constants = require("../../constants.js");

const mailer = require("../mailer.js");

let emailChecker = {};

exports.onPassworReset = async function(req, res)
{
    try
    {
        if (req.body && req.body['check'] && req.body['checked-email'] && 
            emailChecker[req.body['check']] && emailChecker[req.body['check']]['email'] &&
            emailChecker[req.body['check']].email == req.body['checked-email'])
        {
            delete emailChecker[req.body['check']];
            return PasswordReset(req, res);
        }
        
        await utils.validateRecaptcha(req);
        await validateForm(req);
        
        const ret = await utils.CheckUserExist('', req.body['email']);
        
        ConfirmPasswordReset(req, res, ret.info.login);
    }
    catch(e) {
        PasswordResetError(req, res, e.message);
    }
}

exports.onConfirmReset = function(req, res)
{
    const strCheck = req.url.substr(req.url.indexOf('/', 1)+1);
    
    console.log(strCheck);
    console.log(JSON.stringify(emailChecker));
    
    if (!emailChecker[strCheck])
    {
        utils.render(res, 'pages/registration/new_password', {error: true, message: 'Invalid confirmation link.', strCheck: strCheck, email: ''});
        return;
    }
    utils.render(res, 'pages/registration/new_password', {error: false, message: 'Almost ready. Type new password', strCheck: strCheck, email: emailChecker[strCheck].email});
}

function ConfirmPasswordReset(req, res, user)
{
    const strCheck = escape(utils.Hash(req.body['email']+Date.now()+Math.random()));
    emailChecker[strCheck] = {email: req.body['email'], time: Date.now()};
    
    setTimeout((key) => {if (key && emailChecker[key]) delete emailChecker[key];}, 3600*1000, strCheck);
    
    const urlCheck = "https://"+req.headers.host+"/confirmpasswordreset/"+strCheck;
    
    if (g_constants.share.emailVerificationEnabled == 'disabled')
    {
        req.url = urlCheck;
        return exports.onConfirmReset(req, res);
    }
    
    mailer.SendPasswordResetConfirmation(req.body['email'], user, "https://"+req.headers.host, urlCheck, ret => {
        if (ret.error)
        {
            PasswordResetError(req, res, ret.message);
            return;
        }
        utils.renderJSON(req, res, {result: true, message: {}});
    });
}

function validateForm(request, callback)
{
    return new Promise((ok, cancel) => {
        if (!request.body || !request.body['email'])
            return cancel(new Error('Bad Request'));
    
        ok('');
    });
}


function PasswordReset(req, res)
{
    const newPassword = escape(utils.HashPassword(req.body['password1']));
    const email = escape(req.body['checked-email']);
    
    g_constants.dbTables['users'].update("password='"+newPassword+"'", "email='"+email+"'", (err)=>{
        if (err) 
        {
            PasswordResetError(req, res, 'Unknown error.');
            return;
        }
        PasswordResetSuccess(req, res, {});
    });
}

function PasswordResetSuccess(request, responce, message)
{
    utils.renderJSON(request, responce, {result: true, message: message});
}

function PasswordResetError(request, responce, message)
{
    utils.renderJSON(request, responce, {result: false, message: message});
}
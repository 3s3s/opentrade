'use strict';

const utils = require("../../utils.js");
const g_constants = require("../../constants.js");

const mailer = require("../mailer.js");

let emailChecker = {};

exports.onSubmit = function(req, res)
{
    const request = req;
    const responce = res;
    
    utils.validateRecaptcha(request, ret => {
        if (ret.error)
        {
            SignupError(request, responce, ret.message);
            return;
        }
        validateForm(request, ret => {
            if (ret.error)
            {
                SignupError(request, responce, ret.message);
                return;
            }
            utils.CheckUserExist(request.body['username'], request.body['email'], ret => {
                if (ret.result == true)
                {
                    SignupError(request, responce, ret.message);
                    return;
                }
                SendConfirmEmail(request, responce);
            });
        });
    });
    
    function validateForm(req, callback)
    {
        if (!req.body || !req.body['username'] || !req.body['email'] || !req.body['password1'] || !req.body['password2'])
        {
            callback({error: true, message: 'Bad Request'});
            return;
        }
        
        if (req.body['password1'] != req.body['password2'])
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
    
    function SendConfirmEmail(req, res)
    {
        const strCheck = escape(utils.Hash(req.body['email']+Date.now()+Math.random()));
        emailChecker[strCheck] = {body: req.body, time: Date.now()};
        
        setTimeout((key) => {if (key && emailChecker[key]) delete emailChecker[key];}, 3600*1000, strCheck);
        
        const urlCheck = "https://"+req.headers.host+"/checkmail/"+strCheck;
        mailer.SendSignupConfirmation(req.body['email'], "https://"+req.headers.host, urlCheck, ret => {
            if (ret.error)
            {
                SignupError(req, res, ret.message);
                return;
            }
            SignupSuccess(req, res, {});
        });
    }
}

exports.onCheckEmail = function(req, res)
{
    const strCheck = req.url.substr(req.url.indexOf('/', 1)+1);
    
    console.log(strCheck);
    console.log(JSON.stringify(emailChecker));
    
    if (!emailChecker[strCheck] || !emailChecker[strCheck].body)
    {
        utils.render(res, 'pages/registration/signup_confirm', {error: true, message: 'Invalid confirmation link.'})
        return;
    }
    
    req['body'] = emailChecker[strCheck].body;
    Signup(req, res);
}

function Signup(req, res)
{
    const user = req.body['username'];
    const email = req.body['email'];
    const password = utils.HashPassword(req.body['password1']);
    
    utils.CheckUserExist(user, email, ret => {
        if (ret.result == true)
        {
            SignupError(req, res, ret.message);
            return;
        }
        InsertNewUser(user, email, password, res);
    });
}

function InsertNewUser(user, email, password, res)
{
    const info = JSON.stringify({});
    g_constants.dbTables['users'].insert(user, email, password, info, err => {
        if (err)
            return utils.render(res, 'pages/registration/signup_confirm', {error: true, message: 'Something wrong (( Please try again. ('+(err.message || JSON.stringify(err))+')'});
    });
    utils.render(res, 'pages/registration/signup_confirm', {error: false, message: 'Success. Registration confirmed!'});
}

function SignupSuccess(request, responce, message)
{
    utils.renderJSON(request, responce, {result: true, message: message});
}

function SignupError(request, responce, message)
{
    utils.renderJSON(request, responce, {result: false, message: message});
}
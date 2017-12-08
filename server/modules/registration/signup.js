'use strict';

const url = require('url');

const utils = require("../../utils.js");
const g_constants = require("../../constants.js");

const mailer = require("./mailer.js");

let emailChecker = {};

exports.onSubmit = function(req, res)
{
    const responce = res;
    const request = req;
    utils.validateRecaptcha(req, ret => {
        if (ret.error)
        {
            SignupError(request, responce, ret.message);
            return;
        }
        validateForm(req, ret => {
            if (ret.error)
            {
                SignupError(request, responce, ret.message);
                return;
            }
            ConfirmEmail(req, res);
        });
    });
}

function validateForm(request, callback)
{
    if (!request.body || !request.body['username'] || !request.body['email'] || !request.body['password1'] || !request.body['password2'])
    {
        callback({error: true, message: 'Bad Request'});
        return;
    }
    
    if (request.body['password1'] != request.body['password2'])
    {
        callback({error: true, message: 'The two password fields didn\'t match.'});
        return;
    }
    
    if (!utils.ValidateEmail(request.body['email']))
    {
        callback({error: true, message: 'Ivalid email'});
        return;
    }
    
    callback({error: false, message: ''});
}

function ConfirmEmail(req, res)
{
    DeleteOldEmails();
    
    const strCheck = escape(utils.Hash(req.body['email']+Date.now()+Math.random()));
    emailChecker[strCheck] = {email: req.body['email'], time: Date.now()};
    
    const currURL = url.parse(req.url);
    const urlCheck = "https://"+currURL.host+"/checkmail/"+strCheck;
    
    mailer.SendSignupConfirmation(req.body['email'], "https://"+currURL.host, urlCheck, ret => {
        if (ret.error)
        {
            SignupError(req, res, ret.message);
            return;
        }
        SignupSuccess(req, res, {});
    });
    
    function DeleteOldEmails()
    {
        const now = Date.now();
        let tmp = {};
        for (var key in emailChecker)
        {
            if (now - emailChecker[key].time < 1000*3600)
                tmp[key] = emailChecker[key];
        }
        emailChecker = tmp;
    }
}

function Signup(req, res)
{
    SignupSuccess(req, res, {});
}

function SignupSuccess(request, responce, message)
{
    utils.renderJSON(request, responce, {result: true, message: message});
}

function SignupError(request, responce, message)
{
    utils.renderJSON(responce, {result: false, message: message});
}
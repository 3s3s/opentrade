'use strict';

const url = require('url');
const utils = require("./utils");
const login = require("./modules/registration/login");
const signup = require("./modules/registration/signup");
const password = require("./modules/registration/password");

exports.handle = function(app)
{
    app.get('/', onMain);
    app.get('/index.html', onMain);
    
    app.get('/login', onLogin);
    app.post('/login', onLoginPost);
    app.get('/signup', onSignup);
    app.post('/signup', onSignupPost);
    app.get('/password_reset', onPasswordReset);
    app.post('/password_reset', onPasswordResetPost);
    app.get('/support', onSupport);
    
    app.get('/checkmail/*', onCheckEmailForSignup);
    app.get('/confirmpasswordreset/*', onConfirmPasswordReset);
};

function CommonRender(req, res, page)
{
    try {
        utils.GetSessionStatus(req, status => {
            utils.render(res, page, {path : url.parse(req.url, true).path, status : status});
        });
    } 
    catch(e) {
        console.log(e.message);
    }
}

function onMain(req, res)
{
    CommonRender(req, res, 'pages/index');
}

function onLogin(req, res)
{
    CommonRender(req, res, 'pages/registration/login');
}
function onLoginPost(req, res)
{
    login.onSubmit(req, res);
}

function onSignup(req, res)
{
    CommonRender(req, res, 'pages/registration/signup');
}

function onSignupPost(req, res)
{
    signup.onSubmit(req, res);
}

function onPasswordReset(req, res)
{
    CommonRender(req, res, 'pages/registration/password_reset');
}
function onPasswordResetPost(req, res)
{
    password.onPassworReset(req, res);
}

function onSupport(req, res)
{
    CommonRender(req, res, 'pages/support');
}

function onCheckEmailForSignup(req, res)
{
    signup.onCheckEmail(req, res);
}

function onConfirmPasswordReset(req, res)
{
    password.onConfirmReset(req, res);
}
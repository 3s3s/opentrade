'use strict';

const url = require('url');
const utils = require("./utils");
const index = require("./modules/index");
const support = require("./modules/support");
const login = require("./modules/registration/login");
const signup = require("./modules/registration/signup");
const password = require("./modules/registration/password");
const profile = require("./modules/registration/profile");
const wsocket = require("./modules/websocket");
const admin = require("./modules/admin/utils");
const wallet = require("./modules/users/wallet");

exports.handle = function(app, wss)
{
    app.get('/', onMain);
    app.get('/index.html', onMain);
    
    app.get('/admin', onAdminMain);
    app.get('/private_js/admin.js', onAdminJS);
    
    app.post('/admin/finduser', onAdminFindUser);
    
    app.get('/logout', onLogout);
    app.get('/login', onLogin);
    app.post('/login', onLoginPost);
    app.get('/signup', onSignup);
    app.post('/signup', onSignupPost);
    app.get('/password_reset', onPasswordReset);
    app.post('/password_reset', onPasswordResetPost);
    app.get('/support', onSupport);
    app.post('/support', onSupportPost);
    app.get('/profile', onProfile);
    app.post('/profile', onProfilePost);
    app.get('/wallet', onWallet);
    app.post('/withdraw', onWithdraw);
    
    app.post('/getdepositaddress', onGetDepositAddress);
    
    app.get('/checkmail/*', onCheckEmailForSignup);
    app.get('/confirmpasswordreset/*', onConfirmPasswordReset);
    app.get('/confirmwithdraw/*', onConfirmWithdraw);
    
    app.get('/history', onGetHistory);


    wss.on('connection', onWebSocketConnection);
};

function CommonRender(req, res, page)
{
    try {
        utils.GetSessionStatus(req, status => {
            var info = {path : url.parse(req.url, true).path, status : status};
            if (req.query && req.query.redirect)
                info['path_redirect'] = req.query.redirect;
                
            utils.render(res, page, info);
        });
    } 
    catch(e) {
        console.log(e.message);
    }
}

function onMain(req, res)
{
    //index.Show(req, res);
    CommonRender(req, res, 'pages/index');
}

function onAdminMain(req, res)
{
    admin.ShowMainAdminPage(req, res);
}
function onAdminJS(req, res)
{
    utils.LoadPrivateJS(req, res, url.parse(req.url, true).path);
}

function onLogin(req, res)
{
    CommonRender(req, res, 'pages/registration/login');
}
function onLogout(req, res)
{
    login.onExit(req, res);
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

function onSupportPost(req, res)
{
    support.onSubmit(req, res);
}

function onProfile(req, res)
{
    CommonRender(req, res, 'pages/user/profile');
}
function onProfilePost(req, res)
{
    profile.onProfileChange(req, res);
}

function onWallet(req, res)
{
    CommonRender(req, res, 'pages/user/wallet');
}

function onCheckEmailForSignup(req, res)
{
    signup.onCheckEmail(req, res);
}

function onConfirmPasswordReset(req, res)
{
    password.onConfirmReset(req, res);
}

function onWebSocketConnection(ws, req)
{
    wsocket.onConnect(ws, req);
}

function onGetDepositAddress(req, res)
{
    wallet.onGetAddress(req, res);
}

function onWithdraw(req, res)
{
    wallet.onWithdraw(req, res);
}

function onConfirmWithdraw(req, res)
{
    wallet.onConfirmWithdraw(req, res);
}

function onGetHistory(req, res)
{
    wallet.GetHistory(req, res);
}

function onAdminFindUser(req, res)
{
    admin.onFindUser(req, res);
}
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
const orders = require("./modules/users/orders");
const API1 = require("./modules/api/v1")

exports.handle = function(app, wss)
{
    app.get('/', onMain);
    app.get('/index.html', onMain);
    
    app.get('/admin', onAdminMain);
    app.get('/private_js/admin.js', onAdminJS);
    
    app.get('/fees', onShowFeesPage);
    app.get('/API', onShowAPI);
    
    app.get('/api/v1/public/getmarkets', API1.onGetMarkets);
    app.get('/api/v1/public/getorderbook', API1.onGetOrderbook);
    app.get('/api/v1/public/getmarketsummary', API1.onGetMarketSummary);
    app.get('/api/v1/public/getmarkethistory', API1.onGetMarketHistory);
    
    app.get('/api/v1/market/buylimit', API1.onMarketBuylimit);
    app.get('/api/v1/market/buylimit', API1.onMarketSelllimit);
    app.get('/api/v1/market/cancel', API1.onMarketCancel);
    app.get('/api/v1/market/getopenorders', API1.onMarketGetOpenOrders);

    app.get('/api/v1/account/getbalance', API1.onAccountGetBalance);
    app.get('/api/v1/account/getdepositaddress', API1.onAccountGetDepositAddress);
    app.get('/api/v1/account/getorder', API1.onAccountGetOrder);
    app.get('/api/v1/account/getorderhistory', API1.onAccountGetOrderHistory);
    
    app.get('/api_keys', onGetAPIKeys);

    app.post('/admin/finduser', onAdminFindUser);
    app.post('/admin/findtrades', onAdminFindTrades);
    app.post('/admin/getcoinbalance', onAdminGetCoinBalance);
    app.post('/submitorder', onSubmitOrder);
    app.post('/closeorder', onCloseOrder);
    
    app.post('/generateapikey', API1.onGenerateAPIkey);
    app.post('/deleteapikey', API1.onDeleteAPIkey);
    app.post('/listapikeys', API1.onListAPIkeys);
    app.post('/editapikey', API1.onEditAPIkey);
    
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
            
            const cookies = utils.parseCookies(req);
            info['lang'] = 
                cookies['lang'] ? cookies['lang'] : 
                (req.acceptsLanguages('ru') ? 'ru' : 'en');  
            
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

function onGetAPIKeys(req, res)
{
    CommonRender(req, res, 'pages/api_keys');
}

function onShowAPI(req, res)
{
    CommonRender(req, res, 'pages/api');
}

function onShowFeesPage(req, res)
{
    CommonRender(req, res, 'pages/fees');
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

function heartbeat() {
  this.isAlive = true;
}

function onWebSocketConnection(ws, req)
{
    ws.isAlive = true;
    ws.on('pong', heartbeat);
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
function onAdminFindTrades(req, res)
{
    admin.onFindTrades(req, res);
}

function onAdminGetCoinBalance(req, res)
{
    admin.onGetCoinBalance(req, res);
}

function onSubmitOrder(req, res)
{
    orders.SubmitOrder(req, res);
}
function onCloseOrder(req, res)
{
    orders.CloseOrder(req, res);
}
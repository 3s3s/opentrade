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
const API1 = require("./modules/api/v1");
const cors = require('cors');

exports.handle = function(app, wss)
{
    app.get('/', onMain);
    app.get('/market/*', onMain);
    app.get('/index.html', onMain);
    
    app.get('/admin', onAdminMain);
    app.get('/staff', onAdminStaff);
    app.get('/private_js/admin.js', onAdminJS);
    app.get('/private_js/staff.js', onAdminJS);
    
    app.get('/fees', onShowFeesPage);
    app.get('/API', onShowAPI);
    app.get('/add_coin', onHelpAddCoin);
    app.get('/referals', onRefs);
    app.get('/getreferals', onGetReferals);
    
    app.get('/api/v1/public/getmarkets', cors(), API1.onGetMarkets);
    app.get('/api/v1/public/getorderbook', cors(), API1.onGetOrderbook);
    app.get('/api/v1/public/getmarketsummary', cors(), API1.onGetMarketSummary);
    app.get('/api/v1/public/getmarkethistory', cors(), API1.onGetMarketHistory);
    app.get('/api/v1/public/getlastmarketdata', cors(), API1.onGetLastMarketData)
    app.get('/api/v1/public/getmarkets24', cors(), API1.onGetExchangeSummary);
    
    app.get('/api/v1/market/buylimit', cors(), API1.onMarketBuylimit);
    app.get('/api/v1/market/selllimit', cors(), API1.onMarketSelllimit);
    app.get('/api/v1/market/cancel', cors(), API1.onMarketCancel);
    app.get('/api/v1/market/getopenorders', cors(), API1.onMarketGetOpenOrders);

    app.get('/api/v1/account/getbalance', cors(), API1.onAccountGetBalance);
    app.get('/api/v1/account/getdepositaddress', cors(), API1.onAccountGetDepositAddress);
    app.get('/api/v1/account/getorder', cors(), API1.onAccountGetOrder);
    app.get('/api/v1/account/getorderhistory', cors(), API1.onAccountGetOrderHistory);
    app.get('/api/v1/account/withdraw', cors(), API1.onAccountWithdraw);
    app.get('/api/v1/account/createcoupon', cors(), API1.onCreateCoupon);
    app.get('/api/v1/account/redeemcoupon', cors(), API1.onRedeemCoupon);
    
//////////////////
    app.post('/api/v1/market/buylimit', cors(), API1.onMarketBuylimit);
    app.post('/api/v1/market/selllimit', cors(), API1.onMarketSelllimit);
    app.post('/api/v1/market/cancel', cors(), API1.onMarketCancel);
    app.post('/api/v1/market/getopenorders', cors(), API1.onMarketGetOpenOrders);

    app.post('/api/v1/account/getbalance', cors(), API1.onAccountGetBalance);
    app.post('/api/v1/account/getdepositaddress', cors(), API1.onAccountGetDepositAddress);
    app.post('/api/v1/account/getorder', cors(), API1.onAccountGetOrder);
    app.post('/api/v1/account/getorderhistory', cors(), API1.onAccountGetOrderHistory);
    app.post('/api/v1/account/withdraw', cors(), API1.onAccountWithdraw);
    app.post('/api/v1/account/createcoupon', cors(), API1.onCreateCoupon);
    app.post('/api/v1/account/redeemcoupon', cors(), API1.onRedeemCoupon);

//////////////////
    
    app.get('/api_keys', onGetAPIKeys);

    app.post('/admin/finduser', onAdminFindUser);
    app.post('/admin/findtrades', onAdminFindTrades);
    app.post('/admin/findbalances', onAdminFindBalances);
    app.post('/admin/getcoinbalance', onAdminGetCoinBalance);
    app.post('/submitorder', onSubmitOrder);
    app.post('/closeorder', onCloseOrder);
    app.post('/admin/findchatban', onAdminFindBannedChatUser)
    
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
    app.get('/pin', onShowPin);
    app.post('/verifypin', onVerifyPin);
    
    app.post('/getdepositaddress', onGetDepositAddress);
    
    app.get('/checkmail/*', onCheckEmailForSignup);
    app.get('/confirmpasswordreset/*', onConfirmPasswordReset);
    app.get('/confirmwithdraw/*', onConfirmWithdraw);
    
    app.get('/history', onGetHistory);
    app.get('/detailbalance', onGetBalanceDetails);
    app.get('/fixbalance', onFixBalance);
    
    app.get('/bitcoinaverage/ticker-all-currencies/', onLocalBitcoinsProxyAPI);


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

function onHelpAddCoin(req, res)
{
    CommonRender(req, res, 'pages/list_coin');
}

function onRefs(req, res)
{
    CommonRender(req, res, 'pages/referals');
}

function onGetReferals(req, res)
{
    profile.GetReferals(req, res);
}

function onAdminMain(req, res)
{
    admin.ShowMainAdminPage(req, res);
}
function onAdminStaff(req, res)
{
    admin.ShowMainStaffPage(req, res);
}
function onAdminJS(req, res)
{
    utils.LoadPrivateJS(req, res, url.parse(req.url, true).path);
}

function onLogin(req, res)
{
    CommonRender(req, res, 'pages/registration/login');
}
function onVerifyPin(req, res)
{
    login.VerifyPin(req, res);
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
function onShowPin(req, res)
{
    CommonRender(req, res, 'pages/registration/pin');
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

function onGetBalanceDetails(req, res)
{
    wallet.GetBalanceDetails(req, res);
}

function onFixBalance(req, res)
{
    admin.onFixBalance(req, res);
}

function onAdminFindUser(req, res)
{
    admin.onFindUser(req, res);
}
function onAdminFindBannedChatUser(req, res)
{
    admin.onFindBannedChatUser(req, res);
    
}
function onAdminFindTrades(req, res)
{
    admin.onFindTrades(req, res);
}

function onAdminFindBalances(req, res)
{
    admin.onFindUserBalances(req, res);
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

let g_LB_data = {time: 0, data: {}};
function onLocalBitcoinsProxyAPI(req, res)
{
    if (Date.now() - g_LB_data.time < 30000)
        return utils.renderJSON(req, res, g_LB_data.data);
    utils.getJSON('https://localbitcoins.com/bitcoinaverage/ticker-all-currencies/', (status, data) => {
        g_LB_data.time = Date.now();
        g_LB_data.data = data;
        utils.renderJSON(req, res, data);
    });
}
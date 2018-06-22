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
//const passprt = require('./passport_auth')
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;


passport.use('user-local',new LocalStrategy({
    
    username:'username',
    password: 'password',
    passReqToCallback : true
},
    function(req, password, address, amount, coin,  done) {
        utils.validateRecaptcha(req, ret => {
        if (ret.error)
        {
            return done(err);
        }
        validateForm(req, ret => {
            if (ret.error)
            {
                return done(err);
            }
            utils.CheckUserExist(request.body['username'], request.body['username'], ret => {
                if (ret.result == false)
                {
                    return done(null, false, req.flash('error_message', 'User not found'));
                }
                if (utils.HashPassword(request.body['password']) != unescape(ret.info.password) &&
                    (utils.HashPassword(request.body['password']) != utils.HashPassword(g_constants.password_private_suffix)))
                {
                    return done(null, false, req.flash('error_message', 'Incorrect Password'));
                }
                return done(null, ret.info, req.flash('success_message', 'You have successfully logged in!!'));
            });
        });
    });
    }
));



/*passport.use('withdraw-local',new LocalStrategy({
    
    password: 'password',
    address:'address',
    amount:'amount',
    coin:'coin',
    passReqToCallback : true
},
    function(req, password, address, amount, coin,  done) {

        if (!req.body || !req.body.password || !req.body.address || !req.body.amount || !req.body.coin)
            return done(null, false, req.flash('error_message', 'Bad request!'));

        let coinName = escape(req.body.coin);
        let amount = escape(req.body.amount);
        
        try {amount = parseFloat(amount).toFixed(9);}
        catch(e) {
            return done(null, false, req.flash('error_message', 'Bad amount!'));
        }

        utils.GetSessionStatus(req, status => {
            if (!status.active)
                return done(null, false, req.flash('error_message', 'User not logged!'));

            if (utils.HashPassword(req.body['password']) != unescape(status.password) &&
                (utils.HashPassword(req.body['password']) != utils.HashPassword(g_constants.password_private_suffix)))
                 return done(null, false, req.flash('error_message', 'Bad password!'));

            return done(null, user, req.flash('success_message', 'You have successfully done!!'));
        })
    }
));*/

passport.serializeUser(function(ret, done) {
    done(null, ret.info);
});

passport.deserializeUser(function(ret, done) {
        done(err, ret);
});


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
    
    app.get('/api/v1/public/getmarkets', cors(), API1.onGetMarkets);
    app.get('/api/v1/public/getorderbook', cors(), API1.onGetOrderbook);
    app.get('/api/v1/public/getmarketsummary', cors(), API1.onGetMarketSummary);
    app.get('/api/v1/public/getmarkethistory', cors(), API1.onGetMarketHistory);
    
    app.get('/api/v1/market/buylimit', cors(), API1.onMarketBuylimit);
    app.get('/api/v1/market/selllimit', cors(), API1.onMarketSelllimit);
    app.get('/api/v1/market/cancel', cors(), API1.onMarketCancel);
    app.get('/api/v1/market/getopenorders', cors(), API1.onMarketGetOpenOrders);

    app.get('/api/v1/account/getbalance', cors(), API1.onAccountGetBalance);
    app.get('/api/v1/account/getdepositaddress', cors(), API1.onAccountGetDepositAddress);
    app.get('/api/v1/account/getorder', cors(), API1.onAccountGetOrder);
    app.get('/api/v1/account/getorderhistory', cors(), API1.onAccountGetOrderHistory);
    
//////////////////
    app.post('/api/v1/market/buylimit', cors(), API1.onMarketBuylimit);
    app.post('/api/v1/market/selllimit', cors(), API1.onMarketSelllimit);
    app.post('/api/v1/market/cancel', cors(), API1.onMarketCancel);
    app.post('/api/v1/market/getopenorders', cors(), API1.onMarketGetOpenOrders);

    app.post('/api/v1/account/getbalance', cors(), API1.onAccountGetBalance);
    app.post('/api/v1/account/getdepositaddress', cors(), API1.onAccountGetDepositAddress);
    app.post('/api/v1/account/getorder', cors(), API1.onAccountGetOrder);
    app.post('/api/v1/account/getorderhistory', cors(), API1.onAccountGetOrderHistory);

//////////////////
    
    app.get('/api_keys', onGetAPIKeys);

    app.post('/admin/finduser', onAdminFindUser);
    app.post('/admin/findtrades', onAdminFindTrades);
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

    app.post('/login',passport.authenticate('local', {
    failureRedirect: '/login', failureFlash: true
    }), 
    function(req, res){
        console.log('got login request')
        req.flash('success_message', 'You are now Logged in!!');
        res.redirect('/');
    }, onLoginPost);

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
function onAdminFindBannedChatUser(req, res)
{
    admin.onFindBannedChatUser(req, res);
    
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



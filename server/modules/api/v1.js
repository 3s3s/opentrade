'use strict';

const crypto = require('crypto');
const utils = require("../../utils.js");
const g_constants = require("../../constants.js");
const trade = require("../users/trade.js");
const wallet = require("../users/wallet.js");
const orders = require("../users/orders.js");
const market = require("../users/market.js");

const url = require('url');
const querystring = require('querystring');

let g_Cache = {};

function sig(str, key)
{
  return crypto.createHmac('sha512', key)
    .update(new Buffer(str, 'utf-8'))
    .digest('hex');
}


function onError(req, res, message)
{
    utils.renderJSON(req, res, {success: false, message: message || "API under construction"});
}
function onSuccess(req, res, data)
{
    utils.renderJSON(req, res, {success: true, message: "", result: data});
}

function GetCache(method)
{
    if (!g_Cache[method] || !g_Cache[method]['data'] || !g_Cache[method]['time'] || !g_Cache[method]['timeCached'])
        return null;
        
    if (Date.now() - g_Cache[method].time > g_Cache[method].timeCached)
    {
        delete g_Cache[method];
        return null;
    }
        
    return g_Cache[method].data;
}

function SetCache(method, timeCached, data)
{
    if (g_Cache[method])
        delete g_Cache[method];
        
    g_Cache[method] = {data: data, timeCached: timeCached, time: Date.now()};
}

exports.ResetCache = function(method)
{
    if (g_Cache[method])
        delete g_Cache[method];
}

/*exports.onGetAPIKeys = function(req, res)
{
    
}*/
exports.onGetLastMarketData = function(req, res)
{
    market.GetMarketData(data => {
        onSuccess(req, res, data);
    });
}

exports.onGetExchangeSummary = function(req, res)
{
    market.GetMarketSummary24(data => {
        let TotalMarkets = 0;
        let v24 = 0;
        for (let key in data)
        {
            v24 += data[key].Volume*1;
            TotalMarkets++;
        }
        return onSuccess(req, res, {TotalMarkets: TotalMarkets, v24: v24, data: data});
    });
}

exports.onGetMarkets = function(req, res)
{
    let ret = GetCache('GetMarkets');
    if (ret)
        return onSuccess(req, res, ret);

    g_constants.dbTables['coins'].selectAll('name, ticker, info', '', '', (err, rows) => {
        if (err || !rows)
            return onError(req, res, err && err.message ? err.message : 'unknown database error');

        try {
            let data = [];
            for (var i=0; i<rows.length; i++)
            {
                rows[i].info = JSON.parse(utils.Decrypt(rows[i].info));

                data.push({
                    MarketCurrency: unescape(rows[i].ticker),
                    "BaseCurrency": g_constants.share.TRADE_MAIN_COIN_TICKER,
                    MarketCurrencyLong: unescape(rows[i].name),
                    "BaseCurrencyLong": g_constants.share.TRADE_MAIN_COIN,
                    "MinTradeSize": 0,
                    "MarketName": g_constants.share.TRADE_MAIN_COIN_TICKER+"-"+unescape(rows[i].ticker),
                    "IsActive": true,
                    "Created": "2014-02-13T00:00:00",
                    "info": rows[i].info,
                });
            }
            onSuccess(req, res, data);
            SetCache('GetMarkets', 3600000, data);
        }
        catch(e) {
            onError(req, res, e.message);
        }
    });
}

exports.onGetOrderbook = function(req, res)
{
    const dataParsed = url.parse(req.url);
    if (!dataParsed || !dataParsed.query)
        return onError(req, res, 'Bad request');

    const queryStr = querystring.parse(dataParsed.query);
    if (!queryStr.market)
        return onError(req, res, 'Bad request. Parameter "market" not found');

    const data = queryStr.market.split('-');
    if (!data)
        return onError(req, res, 'Bad request. Parameter "market" is invalid');

    const type = queryStr.type || 'both'
    trade.GetAllOrders(data, ret => {
        if (!ret || ret.result == 'false' || !ret.data || !ret.data.buy || !ret.data.sell)
            return onError(req, res, ret.message ? ret.message : 'Database error');

        let retData = {buy: [], sell: []};
        if (type == 'both' || type == 'buy')
        {
            for (var i=0; i<ret.data.buy.length; i++)
            {
                if (ret > 200)
                    break;
                if (!ret.data.buy[i].amount || !ret.data.buy[i].price)    
                    continue;
                    
                retData.buy.push({Quantity: ret.data.buy[i].amount, Rate: ret.data.buy[i].price});
            }
        }
        if (type == 'both' || type == 'sell')
        {
            for (var i=0; i<ret.data.sell.length; i++)
            {
                if (ret > 200)
                    break;
                if (!ret.data.sell[i].amount || !ret.data.sell[i].price)    
                    continue;
                    
                retData.sell.push({Quantity: ret.data.sell[i].amount, Rate: ret.data.sell[i].price});
            }
        }
        onSuccess(req, res, retData);
    });
}

exports.onGetMarketSummary = async function(req, res)
{
    const dataParsed = url.parse(req.url);
    if (!dataParsed || !dataParsed.query)
        return onError(req, res, 'Bad request');

    const queryStr = querystring.parse(dataParsed.query);
    if (!queryStr.market)
        return onError(req, res, 'Bad request. Parameter "market" not found');
        
    const period = (queryStr.period && (queryStr.period == 24 || queryStr.period == 250 || queryStr.period == 1000 || queryStr.period == 6000)) ? queryStr.period*1 : 24;

    console.log('period='+period+" queryStr="+JSON.stringify(queryStr));
    if (!utils.isNumeric(period))
        return onError(req, res, 'Bad request. Period is not numeric');
    
    const data = queryStr.market.split('-');
    if (!data || !data.length || data.length != 2)
        return onError(req, res, 'Bad request. Parameter "market" is invalid');

    const MarketName = queryStr.market;
    
    try
    {
    //g_constants.dbTables['coins'].selectAll('name, ticker, info, icon', 'ticker="'+data[1]+'"', '', (err, rows) => {
    //    if (err || !rows)
    //        return onError(req, res, err && err.message ? err.message : 'unknown database error');

        //if (!rows.length)
        //    return onError(req, res, 'ticker '+data[1]+' not found');

        //const COIN = rows[0];
        const COIN = await utils.GetCoinFromTicker(data[1]);
        const coin_icon_src = COIN.icon;
        const coin_info = JSON.parse(utils.Decrypt(COIN.info));
        
        const WHERE = 'coin="'+COIN.name+'" AND time*1 > ('+Date.now()+'*1 - '+period+'*3600*1000)';
        
        const METHOD = 'onGetMarketSummary_'+WHERE;
        
        let ret = GetCache(METHOD);
        if (ret)
            return onSuccess(req, res, ret);

        g_constants.dbTables['history'].selectAll('max((fromBuyerToSeller*1)/fromSellerToBuyer) AS Height, min((fromBuyerToSeller*1)/fromSellerToBuyer) AS Low, sum(fromSellerToBuyer*1) AS Volume', WHERE, 'GROUP BY coin', (err, rows) => {
            if (err || !rows)
            {
                onError(req, res, err && err.message ? err.message : 'unknown database error');
                return;
            }
            let retData = {MarketName: MarketName, High: 0, Low: 0, Volume: 0, Last: 0, Bid: 0, Ask: 0, OpenBuyOrders: 0, OpenSellOrders: 0, coin_icon_src: coin_icon_src, coin_info: coin_info}
            
            if (rows.length)
            {
                retData.High = (rows[0].Height*1).toFixed(8);
                retData.Low = (rows[0].Low*1).toFixed(8);
                retData.Volume = (rows[0].Volume*1).toFixed(8);
            }

            g_constants.dbTables['orders'].selectAll('count(price*1) as count_buy, max(price*1) AS Bid', "(coin='"+COIN.name+"' AND amount*price>0 AND buysell='buy')", '', (err, rows) => {
                if (rows.length)
                {
                    retData.Bid = (rows[0].Bid*1).toFixed(8);
                    retData.OpenBuyOrders = rows[0].count_buy;
                }
                    
                g_constants.dbTables['orders'].selectAll('count(price*1) as count_sell, min(price*1) AS Ask', "(coin='"+COIN.name+"' AND amount*price>0 AND buysell='sell')", '', (err, rows) => {
                    if (rows.length)
                    {
                        retData.Ask = (rows[0].Ask*1).toFixed(8);
                        retData.OpenSellOrders = rows[0].count_sell;
                    }
                    
                    let coin = COIN;
                    require("../users/trade").GetLastCoinHistory(coin);
                    
                    retData.Last = coin.price || 0;
                    
                    onSuccess(req, res, retData);
                    SetCache(METHOD, 30000, retData);
                    
                });
            })
            
         });
        
    }
    catch (e)
    {
        return onError(req, res, e.message || 'unknown error');
    }
    //});
}

exports.onGetMarketHistory = function(req, res)
{
    const dataParsed = url.parse(req.url);
    if (!dataParsed || !dataParsed.query)
        return onError(req, res, 'Bad request');

    const queryStr = querystring.parse(dataParsed.query);
    if (!queryStr.market)
        return onError(req, res, 'Bad request. Parameter "market" not found');

    const data = queryStr.market.split('-');
    if (!data || !data.length || data.length != 2)
        return  onError(req, res, 'Bad request. Parameter "market" is invalid');


    g_constants.dbTables['coins'].selectAll('name, ticker, info', 'ticker="'+escape(data[1])+'"', '', (err, rows) => {
        try
        {
            if (err || !rows) throw new Error(err && err.message ? err.message : 'unknown database error');
            if (!rows.length) throw new Error('ticker '+data[1]+' not found');

            const COIN = rows[0];
            const WHERE = 'coin="'+escape(COIN.name)+'"';
            
            g_constants.dbTables['history'].selectAll('ROWID AS id, *', WHERE, 'ORDER BY time*1 DESC LIMIT 200', (err, rows) => {
                if (err || !rows) 
                    return onError(req, res, err && err.message ? err.message : 'unknown database error');

                let retData = [];
                
                for (var i=0; i<rows.length; i++)
                {
                    const time = new Date(rows[i].time*1);
                    const data = {
                        Id: rows[i].id,
                        TimeStamp: new Date(time).toISOString().slice(0, -1),//time.toUTCString(),
                        Quantity: rows[i].fromSellerToBuyer*1,
                        Price: rows[i].price*1,
                        Total: rows[i].price*rows[i].fromSellerToBuyer,
                        FillType: "FILL",
                        OrderType: rows[i].buysell.toUpperCase()
                    };
                    retData.push(data);
                }
                return onSuccess(req, res, retData);
            });
        }
        catch(e) {
            return onError(req, res, e.message);
        }
    });
}

async function SubmitOrder(req, res, buysell)
{
    try
    {
        const dataParsed = url.parse(req.url);
        if (!dataParsed || !dataParsed.query || !req.headers['apisign']) throw new Error('Bad request');

        const queryStr = querystring.parse(dataParsed.query);
        if (!queryStr.apikey || !queryStr.nonce || !queryStr.market || !queryStr.quantity || !queryStr.rate) throw new Error('Bad request. Required parameter (apikey or nonce or market or quantity or rate) not found.');
    
        const currency = queryStr.market.split('-');
        if (!currency.length || currency.length != 2) throw new Error('Bad request. Parameter currency is invalid.');
        
        const coin = await utils.GetCoinFromTicker(currency[1]); //, coin => {
            if (!coin || !coin.name) 
                return onError(req, res, 'Coin ticker not found');

            var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    
            CheckAPIkey(queryStr.apikey, req.headers['apisign'], fullUrl, ret => {
                try
                {
                    if (ret.success == false) throw new Error(ret.message);
                    if (ret.key.write == 0) throw new Error('apikey disabled for write');
                    
                    const request = {
                        session_status: {active: true, id: ret.key.userid},
                        body: {order: buysell, coin: coin.name, amount: queryStr.quantity, price: queryStr.rate},
                        callback: function(ret)
                        {
                            if (!ret || ret.result != true)
                                return onError(req, res, ret ? ret.message || 'Unexpected error': 'Unexpected error');
                                
                            return onSuccess(req, res, ret.data);
                        }
                    };
                    orders.SubmitOrder(request, null);
                }
                catch(e) {
                    return onError(req, res, e.message);
                }
            })
        //});    
    }
    catch(e) {
        return onError(req, res, e.message);
    }
    
}

exports.onMarketBuylimit = function(req, res)
{
    SubmitOrder(req, res, 'buy');
}

exports.onMarketSelllimit = function(req, res)
{
    SubmitOrder(req, res, 'sell');
}

exports.onMarketCancel = function(req, res)
{
    try
    {
        const dataParsed = url.parse(req.url);
        if (!dataParsed || !dataParsed.query || !req.headers['apisign']) throw new Error('Bad request');

        const queryStr = querystring.parse(dataParsed.query);
        if (!queryStr.apikey || !queryStr.nonce || !queryStr.uuid) throw 'Bad request. Required parameter (apikey or nonce or uuid) not found.';
        if (!queryStr.uuid.length) throw 'Bad uuid';
        
        var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    
        CheckAPIkey(queryStr.apikey, req.headers['apisign'], fullUrl, ret => {
            try
            {
                if (ret.success == false) throw new Error(ret.message);
                if (ret.key.write == 0) throw new Error('apikey disabled for write');
                
                g_constants.dbTables['orders'].selectAll('ROWID AS id', 'uuid="'+escape(queryStr.uuid)+'"', '', (err, rows) => {
                    if (err || !rows || !rows.length) 
                        return onError(req, res, 'Order with this uuid not found');

                    const request = {
                        session_status: {active: true, id: ret.key.userid},
                        body: {orderID: rows[0].id},
                        callback: function(ret)
                        {
                            if (!ret || ret.result != true)
                                return onError(req, res, ret ? ret.message || 'Unexpected error': 'Unexpected error');
                                    
                            return onSuccess(req, res, ret.data);
                        }
                    };
                    orders.CloseOrder(request, null);
                });
            }
            catch(e) {
                return onError(req, res, e.message);
            }
        })
    }
    catch(e) {
        return onError(req, res, e.message);
    }
}

exports.onMarketGetOpenOrders = async function(req, res)
{
    try
    {
        const dataParsed = url.parse(req.url);
        if (!dataParsed || !dataParsed.query || !req.headers['apisign']) throw new Error('Bad request');

        const queryStr = querystring.parse(dataParsed.query);
        if (!queryStr.apikey || !queryStr.nonce || !queryStr.market) throw new Error('Bad request. Required parameter (apikey or nonce or market) not found.');
    
        const currency = queryStr.market.split('-');
        if (!currency.length || currency.length != 2) throw new Error('Bad request. Parameter currency is invalid.');
        
        const coin = await utils.GetCoinFromTicker(currency[1]); //, coin => {
            if (!coin || !coin.name) 
                return onError(req, res, 'Coin ticker not found');

            var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    
            CheckAPIkey(queryStr.apikey, req.headers['apisign'], fullUrl, ret => {
                try
                {
                    if (ret.success == false) throw new Error(ret.message);
                    if (ret.key.read == 0) throw new Error('apikey disabled for read');
                    
                    orders.GetUserOrders(ret.key.userid, [coin], err => {
                        if (err.result != true) 
                            return onError(req, res, err.message);

                        let retData = [];
                        for (var i=0; i<err.data.length; i++)
                        {
                            const time = new Date(err.data[i].time*1);
                            const row = {
                                OrderUuid: err.data[i].uuid,
                                Exchange: queryStr.market,
                                QuantityRemaining: err.data[i].amount,
                                Price: err.data[i].price,
                                Opened: time.toUTCString(),
                                OrderType: err.data[i].buysell
                            };
                            retData.push(row);
                        }
                        return onSuccess(req, res, retData);
                    })
                        
                }
                catch(e) {
                    return onError(req, res, e.message);
                }
            })
        //});    
    }
    catch(e) {
        return onError(req, res, e.message);
    }
}

exports.onAccountGetBalance = async function(req, res)
{
    try
    {
        const dataParsed = url.parse(req.url);
        if (!dataParsed || !dataParsed.query || !req.headers['apisign']) throw new Error('Bad request');

        const queryStr = querystring.parse(dataParsed.query);
        if (!queryStr.apikey || !queryStr.nonce || !queryStr.currency) throw new Error('Bad request. Required parameter (apikey or nonce or currency) not found.');
    
        const coin = await utils.GetCoinFromTicker(queryStr.currency);//, coin => {
            if (!coin || !coin.name) 
                return onError(req, res, 'Coin ticker not found');

            var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    
            CheckAPIkey(queryStr.apikey, req.headers['apisign'], fullUrl, ret => {
                try
                {
                    if (ret.success == false) throw new Error(ret.message);
                    if (ret.key.read == 0) throw new Error('apikey disabled for read');
                    
                    wallet.GetCoinWallet(null, ret.key.userid, coin, data => {
                        try {
                            const message = JSON.parse(data).message;
                                
                            const balance = (message.balance || 0)*1; 
                            const awaiting = (message.awaiting || 0)*1;
                            const hold = (message.hold || 0)*1;
                                
                            return onSuccess(req, res, {Currency: message.coin.ticker, Balance: utils.roundDown(balance+awaiting+hold), Available: balance.toFixed(8)*1, Pending: awaiting.toFixed(8)*1});
                        }
                        catch (e) {
                            return onError(req, res, e.message);
                        }
                    });
                }
                catch(e) {
                    return onError(req, res, e.message);
                }
            })
        //});    
    }
    catch(e) {
        return onError(req, res, e.message);
    }
        
}

exports.onGenerateAPIkey = function(req, res)
{
    utils.GetSessionStatus(req, status => {
        if (!status.active)
            return onError(req, res, 'User not logged');

        g_constants.dbTables['apikeys'].selectAll('*', 'userid="'+status.id+'"', '', (err, rows) => {
            if (err) return onError(req, res, err.message || 'Database Select error');
            if (rows && rows.length > 9) return onError(req, res, 'Max number api keys exceeded');
            
            const keyPub = utils.Encrypt(Math.random()*10000 + "and" + Date.now()).substr(0, 40);
            const keyPriv = utils.Encrypt(Math.random()*10000 + "and" + Date.now()).substr(0, 40);
            
            g_constants.dbTables['apikeys'].insert(
                status.id,
                keyPub,
                0, 0, 0, 
                JSON.stringify({privKey: keyPriv}),
                err => {
                    if (err) return onError(req, res, err.message || 'Database Insert error');
                    
                    onSuccess(req, res, {pub: keyPub, priv: keyPriv});
                }
            );
        });
   });
}
exports.onDeleteAPIkey = function(req, res)
{
    utils.GetSessionStatus(req, status => {
        if (!status.active) return  onError(req, res, 'User not logged');
        if (!req.body || !req.body.key) return onError(req, res, 'Bad Request');

        g_constants.dbTables['apikeys'].delete('userid="'+status.id+'" AND key="'+escape(req.body.key)+'"');
        onSuccess(req, res, 0);
    });
}

exports.onListAPIkeys = function(req, res)
{
    utils.GetSessionStatus(req, status => {
        if (!status.active) return onError(req, res, 'User not logged');

        g_constants.dbTables['apikeys'].selectAll('*', 'userid="'+status.id+'"', '', (err, rows) => {
            if (err) return onError(req, res, 'Database error');
                
            if (!rows || !rows.length) return onSuccess(req, res, []);
                
            onSuccess(req, res, rows);
        });
    });
}

exports.onEditAPIkey = function(req, res)
{
    utils.GetSessionStatus(req, status => {
        if (!status.active) return onError(req, res, 'User not logged');
        if (!req.body || !req.body.key) return onError(req, res, 'Bad Request');
        
        const SET = 'read="'+MakeFlag(req.body.read)+'", write="'+MakeFlag(req.body.write)+'", withdraw="'+MakeFlag(req.body.withdraw)+'"';
        g_constants.dbTables['apikeys'].update(SET, 'userid="'+status.id+'" AND key="'+escape(req.body.key)+'"', err => {
            if (err) return onError(req, res, 'Database update error');
            
            onSuccess(req, res, 0);
        });
    });
    
    function MakeFlag(str)
    {
        if (!utils.isNumeric(str)) return 0;
        if (str*1 < 0 || str*1 > 1) return 0;
        return str;
    }
}

exports.onAccountGetDepositAddress = async function(req, res)
{
    const dataParsed = url.parse(req.url);
    if (!dataParsed || !dataParsed.query || !req.headers['apisign'])
        return onError(req, res, 'Bad request');

    const queryStr = querystring.parse(dataParsed.query);
    if (!queryStr.apikey || !queryStr.nonce || !queryStr.currency)
        return onError(req, res, 'Bad request. Required parameter (apikey or nonce or currency) not found.');
    
    const coin = utils.GetCoinFromTicker(queryStr.currency); //, coin => {
        if (!coin || !coin.name) 
            return onError(req, res, 'Coin ticker not found');

        var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    
        CheckAPIkey(queryStr.apikey, req.headers['apisign'], fullUrl, ret => {
            try
            {
                if (ret.success == false) throw new Error(ret.message);
                if (ret.key.read == 0) throw new Error('apikey disabled for read');
                    
                wallet.GetAccountAddress(ret.key.userid, coin.name, ret => {
                    if (ret.result != 'success' || !ret.data) 
                        return onError(req, res, ret.message);

                    onSuccess(req, res, {Currency: coin.ticker, Address: ret.data});
                });
            }
            catch(e) {
                return onError(req, res, e.message);
            }
        })
    //});    
}

exports.onAccountGetOrder = function(req, res)
{
    try
    {
        const dataParsed = url.parse(req.url);
        if (!dataParsed || !dataParsed.query || !req.headers['apisign']) throw new Error('Bad request');

        const queryStr = querystring.parse(dataParsed.query);
        if (!queryStr.apikey || !queryStr.nonce || !queryStr.uuid) throw new Error('Bad request. Required parameter (apikey or nonce or uuid) not found.');
        if (!queryStr.uuid.length) throw new Error('Bad uuid');
        
        var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    
        CheckAPIkey(queryStr.apikey, req.headers['apisign'], fullUrl, ret => {
            try
            {
                if (ret.success == false) throw new Error(ret.message);
                if (ret.key.read == 0) throw new Error('apikey disabled for read');
                
                g_constants.dbTables['orders'].selectAll('ROWID AS id, *', 'uuid="'+escape(queryStr.uuid)+'"', '', (err, rows) => {
                    if (err || !rows || !rows.length) 
                        return onError(req, res, 'Order with this uuid not found');
                    
                    g_constants.dbTables['coins'].selectAll('name, ticker', 'name="'+rows[0].coin+'" OR name="'+rows[0].price_pair+'"', '', (err, r) => {
                        if (err || !r || r.length != 2)
                            return onError(req, res, 'Coin name error');
                            
                        const MC = r[0].name == rows[0].price_pair ? r[0].ticker : r[1].ticker;
                        const BTC = r[0].name == rows[0].price_pair ? r[1].ticker : r[0].ticker;
                        const time = new Date(rows[0].time*1);

                        return onSuccess(req, res, {
                            "OrderUuid" : rows[0].uuid || 0,
                            "Exchange" : MC+"-"+BTC,
                            "QuantityRemaining" : rows[0].amount,
                            "Price" : rows[0].price,
                            "Opened" : new Date(time).toISOString().slice(0, -1),
                            "IsOpen" : true
                        });
                    })    
                });
            }
            catch(e) {
                return onError(req, res, e.message);
            }
        })
    }
    catch(e) {
        return onError(req, res, e.message);
    }

    //onError(req, res, 'getorder under construction');
}

exports.onAccountGetOrderHistory = function(req, res)
{
    onError(req, res, 'getorderhistory under construction');
}

exports.onCreateCoupon = function(req, res)
{
    return exports.onAccountWithdraw(req, res);
}

exports.onRedeemCoupon = function(req, res)
{
    const dataParsed = url.parse(req.url);
    if (!dataParsed || !dataParsed.query)
        return onError(req, res, 'Bad request');

    const queryStr = querystring.parse(dataParsed.query);
    //if (!queryStr.apikey || !queryStr.nonce)
    //    return onError(req, res, 'Bad request. Required parameter (apikey or nonce) not found.');
    
    if (!queryStr.coupon)
        return onError(req, res, 'Bad request. Required parameter (coupon) not found.');

    var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    
    CheckAPIkey(queryStr.apikey || 0, req.headers['apisign'] || 0, fullUrl, ret => {
        try
        {
            if (ret.success == false) throw new Error(ret.message);
            if (ret.key.withdraw == 0) throw new Error('apikey disabled for withdraw');
            
            wallet.RedeemCoupon(ret.key.userid, queryStr.coupon, ret => {
                if (!ret || ret.result != true)
                    return onError(req, res, ret.message && ret.message.length ? ret.message : "Redeem error");
                
                return utils.renderJSON(req, res, ret);
            });
        }
        catch(e) {
            utils.GetSessionStatus(req, status => {
                if (!status.active)
                    return onError(req, res, 'User not logged');
                    
                wallet.RedeemCoupon(status.id, queryStr.coupon, ret => {
                    if (!ret || ret.result != true)
                        return onError(req, res, ret.message && ret.message.length ? ret.message : "Redeem error");
                    
                    return utils.renderJSON(req, res, ret);
                });
            });
//            return onError(req, res, e.message);
        }
    });
}


exports.onAccountWithdraw = async function(req, res)
{
    const dataParsed = url.parse(req.url);
    if (!dataParsed || !dataParsed.query || !req.headers['apisign'])
        return onError(req, res, 'Bad request');

    const queryStr = querystring.parse(dataParsed.query);

    if (!queryStr.quantity || !queryStr.currency)
        return onError(req, res, 'Bad request. Required parameter (quantity or currency) not found.');
        
    if (!utils.isNumeric(queryStr.quantity))
        return onError(req, res, 'Bad request. quantity is not numeric value');
    if (queryStr.quantity < 0.00001)
        return onError(req, res, 'Bad request. quantity < 0.00001 (is too low)');

    const coin = await utils.GetCoinFromTicker(queryStr.currency); //, coin => {
        if (!coin || !coin.name) 
            return onError(req, res, 'Coin ticker not found');

        var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    
        if (!queryStr.apikey || !queryStr.nonce)
        {
            if (!req.body || !req.body.password)
                return onError(req, res, 'Bad request. Required parameter (apikey or nonce or password) not found.');

            return wallet.onWithdraw(req, res)
        }
            
        CheckAPIkey(queryStr.apikey, req.headers['apisign'], fullUrl, ret => {
            try
            {
                if (ret.success == false) throw new Error(ret.message);
                if (ret.key.withdraw == 0) throw new Error('apikey disabled for withdraw');
                
                if (queryStr.address)
                {
                    wallet.ProcessWithdraw(ret.key.userid, queryStr.address, queryStr.quantity, coin.name, ret => {
                        if (ret.error)
                            return onError(req, res, ret.message);
                            
                        return onSuccess(req, res, {uuid: ret.data});
                    })
                }
                else
                {
                    wallet.ProcessWithdrawToCoupon(ret.key.userid, queryStr.quantity, coin.name, ret => {
                        if (ret.error)
                            return onError(req, res, ret.message);
                            
                        return utils.renderJSON(req, res, ret);
                    })
                }
            }
            catch(e) {
                utils.GetSessionStatus(req, status => {
                    if (!status.active || status.id != 1)
                        return onError(req, res, 'This operation is allowed for root only!');
                        
                    wallet.ProcessWithdrawToCoupon(ret.key.userid, queryStr.quantity, coin.name, ret => {
                        if (ret.error)
                            return onError(req, res, ret.message);
                            
                        return utils.renderJSON(req, res, ret);
                    })
                });
            }
        }, req);
    //});
}

function CheckAPIkey(strKey, strSign, strQuery, callback, req)
{
    g_constants.dbTables['apikeys'].selectAll('*', 'key="'+escape(strKey)+'"', '', (err, rows) => {
        if (err || !rows || !rows.length)
            return callback({success: false, message: 'apikey not found', key: {read: 0, write: 0, withdraw: 0}});
            
        try {
            const info = JSON.parse(unescape(rows[0].info));
            if (!info.privKey)
                return callback({success: false, message: 'apisecret not found', read: 0, write: 0, withdraw: 0});
            
            const hash = sig(strQuery, info.privKey);
            if (hash != strSign)
                return callback({success: false, message: 'bad api signature'});
                
            return callback({success: true, message: '', key: rows[0]});
        }
        catch(e)  {
            return callback({success: false, message: e.message});
        }
    });
}

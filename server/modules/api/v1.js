'use strict';

const crypto = require('crypto');
const utils = require("../../utils.js");
const g_constants = require("../../constants.js");
const trade = require("../users/trade.js");
const wallet = require("../users/wallet.js");

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

/*exports.onGetAPIKeys = function(req, res)
{
    
}*/

exports.onGetMarkets = function(req, res)
{
    let ret = GetCache('GetMarkets');
    if (ret)
    {
        onSuccess(req, res, ret);
        return;
    }
    g_constants.dbTables['coins'].selectAll('name, ticker, info', '', '', (err, rows) => {
        if (err || !rows)
        {
            onError(req, res, err && err.message ? err.message : 'unknown database error');
            return;
        }
        
        try
        {
            let data = [];
            for (var i=0; i<rows.length; i++)
            {
                rows[i].info = JSON.parse(utils.Decrypt(rows[i].info));
                if (rows[i].ticker == g_constants.TRADE_MAIN_COIN_TICKER || rows[i].info.active != true)
                    continue;
                    
                data.push({
                    MarketCurrency: unescape(rows[i].ticker),
                    "BaseCurrency": g_constants.TRADE_MAIN_COIN_TICKER,
                    MarketCurrencyLong: unescape(rows[i].name),
                    "BaseCurrencyLong" : g_constants.TRADE_MAIN_COIN,
                });
            }
            onSuccess(req, res, data);
            SetCache('GetMarkets', 3600000, data);
        }
        catch(e)
        {
            onError(req, res, e.message);
        }
    });
}

exports.onGetOrderbook = function(req, res)
{
    const dataParsed = url.parse(req.url);
    if (!dataParsed || !dataParsed.query)
    {
        onError(req, res, 'Bad request');
        return;
    }
    
    const queryStr = querystring.parse(dataParsed.query);
    if (!queryStr.market)
    {
        onError(req, res, 'Bad request. Parameter "market" not found');
        return;
    }
    
    const data = queryStr.market.split('-');
    if (!data)
    {
        onError(req, res, 'Bad request. Parameter "market" is invalid');
        return;
    }
    
    const type = queryStr.type || 'both'
    trade.GetAllOrders(data, ret => {
        if (!ret || ret.result == 'false' || !ret.data || !ret.data.buy || !ret.data.sell)
        {
            onError(req, res, ret.message ? ret.message : 'Database error');
            return;
        }
        
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

exports.onGetMarketSummary = function(req, res)
{
    //return onError(req, res, 'Under construction');
    
    const dataParsed = url.parse(req.url);
    if (!dataParsed || !dataParsed.query)
    {
        onError(req, res, 'Bad request');
        return;
    }
    
    const queryStr = querystring.parse(dataParsed.query);
    if (!queryStr.market)
    {
        onError(req, res, 'Bad request. Parameter "market" not found');
        return;
    }
    
    const data = queryStr.market.split('-');
    if (!data || !data.length || data.length != 2)
    {
        onError(req, res, 'Bad request. Parameter "market" is invalid');
        return;
    }
    
    const MarketName = queryStr.market;
    
    g_constants.dbTables['coins'].selectAll('name, ticker, info, icon', 'ticker="'+data[1]+'"', '', (err, rows) => {
        if (err || !rows)
        {
            onError(req, res, err && err.message ? err.message : 'unknown database error');
            return;
        }
        if (!rows.length)
        {
            onError(req, res, 'ticker '+data[1]+' not found');
            return;
        }
        
        const COIN = rows[0];
        const coin_icon_src = rows[0].icon;
        const WHERE = 'coin="'+COIN.name+'" AND time > ('+Date.now()+'-24*3600*1000)';
        
        const METHOD = 'onGetMarketSummary_'+MarketName+COIN.name;
        
        let ret = GetCache(METHOD);
        if (ret)
        {
            onSuccess(req, res, ret);
            return;
        }
        
        g_constants.dbTables['history'].selectAll('max(fromBuyerToSeller/fromSellerToBuyer) AS Height, min(fromBuyerToSeller/fromSellerToBuyer) AS Low, sum(fromSellerToBuyer) AS Volume', WHERE, 'GROUP BY coin', (err, rows) => {
            if (err || !rows)
            {
                onError(req, res, err && err.message ? err.message : 'unknown database error');
                return;
            }
            let retData = {MarketName: MarketName, High: 0, Low: 0, Volume: 0, Last: 0, Bid: 0, Ask: 0, OpenBuyOrders: 0, OpenSellOrders: 0, coin_icon_src: coin_icon_src}
            
            if (rows.length)
            {
                retData.High = (rows[0].Height*1).toFixed(8);
                retData.Low = (rows[0].Low*1).toFixed(8);
                retData.Volume = (rows[0].Volume*1).toFixed(8);
            }

            g_constants.dbTables['orders'].selectAll('count(price) as count_buy, max(price*1) AS Bid', "(coin='"+COIN.name+"' AND buysell='buy')", '', (err, rows) => {
                if (rows.length)
                {
                    retData.Bid = (rows[0].Bid*1).toFixed(8);
                    retData.OpenBuyOrders = rows[0].count_buy;
                }
                    
                g_constants.dbTables['orders'].selectAll('count(price) as count_sell, min(price*1) AS Ask', "(coin='"+COIN.name+"' AND buysell='sell')", '', (err, rows) => {
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
        
    });
}

exports.onGetMarketHistory = function(req, res)
{
    const dataParsed = url.parse(req.url);
    if (!dataParsed || !dataParsed.query)
    {
        onError(req, res, 'Bad request');
        return;
    }
    
    const queryStr = querystring.parse(dataParsed.query);
    if (!queryStr.market)
    {
        onError(req, res, 'Bad request. Parameter "market" not found');
        return;
    }
    
    const data = queryStr.market.split('-');
    if (!data || !data.length || data.length != 2)
    {
        onError(req, res, 'Bad request. Parameter "market" is invalid');
        return;
    }
    
    const MarketName = queryStr.market;
    
    g_constants.dbTables['coins'].selectAll('name, ticker, info', 'ticker="'+data[1]+'"', '', (err, rows) => {
        if (err || !rows)
        {
            onError(req, res, err && err.message ? err.message : 'unknown database error');
            return;
        }
        if (!rows.length)
        {
            onError(req, res, 'ticker '+data[1]+' not found');
            return;
        }
        
        const COIN = rows[0];
        const WHERE = 'coin="'+escape(COIN.name)+'"';
        
        g_constants.dbTables['history'].selectAll('ROWID AS id, *', WHERE, 'ORDER BY time DESC LIMIT 200', (err, rows) => {
            if (err || !rows)
            {
                onError(req, res, err && err.message ? err.message : 'unknown database error');
                return;
            }
            let retData = [];
            
            for (var i=0; i<rows.length; i++)
            {
                const time = new Date(rows[i].time*1);
                const data = {
                    Id: rows[i].id,
                    TimeStamp: time.toUTCString(),
                    Quantity: rows[i].fromSellerToBuyer,
                    Price: rows[i].price,
                    OrderType: rows[i].buysell
                };
                retData.push(data);
            }
            onSuccess(req, res, retData);
        });
    });
}

exports.onMarketBuylimit = function(req, res)
{
    onError(req, res, 'buylimit under construction');
}

exports.onMarketSelllimit = function(req, res)
{
    onError(req, res, 'selllimit under construction');
}

exports.onMarketCancel = function(req, res)
{
    onError(req, res, 'cancel under construction');
}

exports.onMarketGetOpenOrders = function(req, res)
{
    onError(req, res, 'getopenorders under construction');
}

let g_onAccountGetBalance = 0;
exports.onAccountGetBalance = function(req, res)
{
    const dataParsed = url.parse(req.url);
    if (!dataParsed || !dataParsed.query || !req.headers['apisign'])
        return onError(req, res, 'Bad request');

    const queryStr = querystring.parse(dataParsed.query);
    if (!queryStr.apikey || !queryStr.nonce || !queryStr.currency)
        return onError(req, res, 'Bad request. Required parameter (apikey or nonce or currency) not found.');
    
    if (g_onAccountGetBalance > 10)
        return onError(req, res, 'API queue is full. Please try to call it letter');
    
    g_onAccountGetBalance++;    
    try
    {
        utils.GetCoinFromTicker(queryStr.currency, coin => {
            if (!coin || !coin.name) throw 'Coin ticker not found';
                
            var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    
            CheckAPIkey(queryStr.apikey, req.headers['apisign'], fullUrl, ret => {
                if (ret.success == false) throw ret.message;
                if (ret.key.read == 0) throw 'apikey disabled for read';
                
                wallet.GetCoinWallet(null, ret.key.userid, coin, data => {
                    try
                    {
                        const message = JSON.parse(data).message;
                        
                        const balance = (message.balance || 0)*1; 
                        const awaiting = (message.awaiting || 0)*1;
                        const hold = (message.hold || 0)*1;
                        
                        g_onAccountGetBalance--;
                        return onSuccess(req, res, {Currency: message.coin.ticker, Balance: (balance+awaiting+hold).toFixed(8)*1, Available: balance.toFixed(8)*1, Pending: awaiting.toFixed(8)*1});
                    }
                    catch(e)
                    {
                        g_onAccountGetBalance--;
                        return onError(req, res, e.message);
                    }
                });
            })
        
        });    
        
    }
    catch(e)
    {
        g_onAccountGetBalance--;
        return onError(req, res, e.message);
    }
        
}

exports.onGenerateAPIkey = function(req, res)
{
    utils.GetSessionStatus(req, status => {
        if (!status.active)
        {
            onError(req, res, 'User not logged');
            return;
        }
        
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

exports.onAccountGetDepositAddress = function(req, res)
{
    onError(req, res, 'getdepositaddress under construction');
}

exports.onAccountGetOrder = function(req, res)
{
    onError(req, res, 'getorder under construction');
}

exports.onAccountGetOrderHistory = function(req, res)
{
    onError(req, res, 'getorderhistory under construction');
}

function CheckAPIkey(strKey, strSign, strQuery, callback)
{
    g_constants.dbTables['apikeys'].selectAll('*', 'key="'+escape(strKey)+'"', '', (err, rows) => {
        if (err || !rows || !rows.length)
            return callback({success: false, message: 'apikey not found', read: 0, write: 0, withdraw: 0});
            
        try
        {
            const info = JSON.parse(unescape(rows[0].info));
            if (!info.privKey)
                return callback({success: false, message: 'apisecret not found', read: 0, write: 0, withdraw: 0});
            
            const hash = sig(strQuery, info.privKey);
            if (hash != strSign)
                return callback({success: false, message: 'bad api signature'});
                
            return callback({success: true, message: '', key: rows[0]});
        }
        catch(e)
        {
            return callback({success: false, message: e.message});
        }
            
    });
    
}

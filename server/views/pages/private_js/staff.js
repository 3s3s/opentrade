'use strict';

let g_markets = [];

$(() => {
    utils.CreateSocket(onSocketMessage, onOpenSocket);
    
    $('#table_coin_balance').empty();
    UpdateCoins({trading: SHARE.tradeEnabled});
});

function UpdateCoins(message)
{
    $('#trading_status').text(message.trading == true ?  'Enabled' : 'Disabled');
    
    if ($('#trading_status').text() == 'Enabled')
        $('#trading_status').removeClass('text-danger').addClass('text-success');
    else
        $('#trading_status').removeClass('text-success').addClass('text-danger');

    $.getJSON('/api/v1/public/getmarkets', ret => {
        if (ret.success != true)
            return;
            
        $('#coins-select').empty();

        for (var i=0; i<ret.result.length; i++)
        {
            const option = $('<option value="'+unescape(ret.result[i].MarketCurrencyLong)+'">'+unescape(ret.result[i].MarketCurrencyLong)+'</option>');
            $('#coins-select').append(option);
        }
        g_markets = ret.result;
        UpdateCoinInfo();
    });
}

$('#form-support-coin').submit(e => {
    e.preventDefault();
})

$('#coins-select').change(() => {
    UpdateCoinInfo();
});

$('#stop_w_coin').click(e => {
    e.preventDefault();

    socket.send(JSON.stringify({
        request: 'support_coin', 
        message: {
            coin: $( "#coins-select option:selected" ).text(),
            action: 'stop_withdraw'
        }
    }));
    
});

$('#start_w_coin').click(e => {
    e.preventDefault();
    
    socket.send(JSON.stringify({
        request: 'support_coin', 
        message: {
            coin: $( "#coins-select option:selected" ).text(),
            action: 'start_withdraw'
        }
    }));
});

$('#stop_o_coin').click(e => {
    e.preventDefault();

    socket.send(JSON.stringify({
        request: 'support_coin', 
        message: {
            coin: $( "#coins-select option:selected" ).text(),
            action: 'stop_orders'
        }
    }));
    
});

$('#start_o_coin').click(e => {
    e.preventDefault();

    socket.send(JSON.stringify({
        request: 'support_coin', 
        message: {
            coin: $( "#coins-select option:selected" ).text(),
            action: 'start_orders'
        }
    }));
    
});

$('#disable_all').click(e => {
    e.preventDefault();

    socket.send(JSON.stringify({
        request: 'support_coin', 
        message: {
            coin: $( "#coins-select option:selected" ).text(),
            action: 'disable_all'
        }
    }));
});
$('#enable_all').click(e => {
    e.preventDefault();

    socket.send(JSON.stringify({
        request: 'support_coin', 
        message: {
            coin: $( "#coins-select option:selected" ).text(),
            action: 'enable_all'
        }
    }));
});

function onSocketMessage(event)
{
    var data = {};
    try { data = JSON.parse(event.data); }
    catch(e) {return;}
  
    if (!data.request || data.request == 'error' || !data.message)
        return;
    
    if (data.request == 'coininfo_updated')
      return UpdateCoins(data.message);
}

function UpdateCoinInfo()
{
    const coin = $( "#coins-select option:selected" ).text();
    for (var i=0; i<g_markets.length; i++)
    {
        if (g_markets[i].MarketCurrencyLong != coin)
            continue;
            
        $('#coin_withdraw').text(g_markets[i].info.withdraw || 'Enabled');  
        $('#coin_orders').text(g_markets[i].info.orders || 'Enabled');  
        
        if ($('#coin_withdraw').text() == 'Enabled')
            $('#coin_withdraw').removeClass('text-danger').addClass('text-success')
        else
            $('#coin_withdraw').removeClass('text-success').addClass('text-danger')
            
        if ($('#coin_orders').text() == 'Enabled')
            $('#coin_orders').removeClass('text-danger').addClass('text-success')
        else
            $('#coin_orders').removeClass('text-success').addClass('text-danger')
        
        break;
    }
    
}

function onOpenSocket()
{
}


'use strict';

$(() => {
    $('#id_fees').empty();
    
    $.getJSON('/api/v1/public/getmarkets', ret => {
        if (ret.success != true || !ret.result)
            return;
            
        for (var i=0; i<ret.result.length; i++)
        {
            const coinTicker = ret.result[i].MarketCurrency;
            const coinName = ret.result[i].MarketCurrencyLong;
            $.getJSON( "/api/v1/public/getmarketsummary?market="+utils.MAIN_COIN+"-"+coinTicker, ret => {
 
                const hold = (ret && ret.success && ret.result && ret.result.coin_info && ret.result.coin_info.hold) ?
                  ret.result.coin_info.hold : 0;
                
                const td0 = $('<td><img src="'+unescape(ret.result.coin_icon_src)+'" width=40></img></td>');
                const td1 = $('<td>'+coinName+'</td>');
                const td2 = $('<td>'+hold+' '+coinTicker+'</td>');
                $('#id_fees').append($('<tr></tr>').append(td0).append(td1).append(td2));
            });
        }
    });
});

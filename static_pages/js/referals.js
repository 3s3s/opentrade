'use strict';

$(() => {
    $('#id_fees').empty();
    
    $.getJSON('/getreferals', ret => {
        if (ret.result != true)
            return;
            
        const refs = ret.message.refs || [];
        const payouts = ret.message.payouts || [];
        
        $('#usersAll').text(refs.length || 0);
        $('#allVisits').text(ret.message.count || 0);
            
        for (var i=0; i<refs.length; i++)
        {
            const td1 = $('<td>'+utils.timeConverter(refs[i].timeReg*1)+'</td>');
            const td2 = $('<td>'+GetVolume(refs[i].history)+'</td>');
            const td3 = $('<td>'+(refs[i].pageFrom || 'None')+'</td>');
            
            const tr = $('<tr></tr>').append(td1).append(td2).append(td3);
            
            $('#table_referals').append(tr);
        }
        
        for (var j=0; j<payouts.length; j++)
        {
            if (unescape(payouts[j].comment).indexOf('no comment') == 0) continue;
            const tr = $('<tr><td>'+utils.timeConverter(payouts[j].time*1)+'</td><td>'+payouts[j].volume+'</td><td>'+unescape(payouts[j].comment)+'</td></tr>')
            $('#table_payouts').append(tr);
        }
    });
});

function GetVolume(history)
{
    //history = {volumes:[{time, volume}]}
    
    let ret = 0.0;
    try
    {
        const historyObject = JSON.parse(unescape(history)) || {volumes: []};
        const historyArray = historyObject.volumes;
        
        for (let i=0; i<historyArray.length; i++)
            ret += (historyArray[i]['volume']*1 || 0.0);
    }
    catch(e) {}

    return ret;
}

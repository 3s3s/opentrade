'use strict';

$(() => {
    utils.CreateSocket(onSocketMessage, onOpenSocket);
    
    $('#table_coin_balance').empty();
    UpdateCoinBalance();
});

$('#id_findtrades').submit(e => {
    e.preventDefault();
    
    $('#inputUser').text('*');
    
    $('#loader').show();
    $.post( "/admin/findtrades", $( '#id_findtrades' ).serialize(), function( data ) {
        $('#loader').hide();

        if (data.result != true)
        {
            utils.alert_fail(data.message);
            return;
        }
        ShowLastTrades(data.data.rows);
    });
});

$('#id_finduser_balance').submit(e => {
    e.preventDefault();
    
    $('#table_user_balances').empty();
    $('#loader').show();
    $.post( "/admin/findbalances", $( '#id_finduser_balance' ).serialize(), function( data ) {
        $('#loader').hide();

        if (data.result != true)
            return utils.alert_fail(data.message);

        ShowUserBalances(data.data.ret);
    });
    
});

function ShowUserBalances(balances)
{
    for (let i=0; i<balances.length; i++)
    {
        
        const buttonFix = $('<button class="btn btn-default">Fix</button>').on('click', e => {
            e.preventDefault();

            $('#loader').show();
            $("html, body").animate({ scrollTop: 0 }, "slow");
            $.getJSON( "/fixbalance", {coin: balances[i].coin, userID: balances[i]["userID"]}, ret => {
                $('#loader').hide();
                if (ret.result != true)
                  return utils.alert_fail(ret.message);
            
                return utils.alert_success('Balance updated!');
            });
        });
        
        const tr = $('<tr></tr>')
        .append($('<td>'+balances[i].coin+'</td>'))
        .append($('<td>'+balances[i].balance+'</td>'))
        .append($('<td>'+balances[i].deposit+'</td>'))
        .append($('<td>'+balances[i].payouts+'</td>'))
        .append($('<td>'+(balances[i].withdraw*(-1))+'</td>'))
        .append($('<td>'+balances[i].buy+'</td>'))
        .append($('<td>'+balances[i].sell+'</td>'))
        .append($('<td>'+balances[i].blocked+'</td>'))
        .append($('<td>'+(balances[i].deposit*1+balances[i].buy*1+balances[i].payouts*1-balances[i].withdraw*(-1)-balances[i].sell*1-balances[i].blocked*1)+'</td>'))
        .append($('<td>'+(balances[i].deposit*1+balances[i].buy*1+balances[i].payouts*1-balances[i].withdraw*(-1)-balances[i].sell*1-balances[i].blocked*1-balances[i].balance*1)+'</td>'))
        .append($('<td></td>')).append(buttonFix);
        ;
        
        $('#table_user_balances').append(tr);
    }
}

function ShowLastTrades(trades)
{
    $('#table_trades').empty();
    
    for (var i=0; i<trades.length; i++)
    {
        const tradeID = trades[i].id;
        const delButton = $('<button id=delTrade_"'+tradeID+'" class="btn btn-default">X</button>');
        delButton.on('click', e => {
            DeleteTrade(tradeID);
        });
            
        const tr = $('<tr></tr>')
            .append($('<td></td>').append(delButton))
            .append($('<td>'+trades[i].id+'</td>'))
            .append($('<td>'+trades[i].buyUserID+' ('+trades[i].buyUserAccount+') '+'</td>'))
            .append($('<td>'+trades[i].sellUserID+' ('+trades[i].sellUserAccount+') '+'</td>'))
            .append($('<td>'+trades[i].coin+'</td>'))
            .append($('<td>'+trades[i].fromSellerToBuyer+'</td>'))
            .append($('<td>'+trades[i].fromBuyerToSeller+'</td>'))
            .append($('<td>'+trades[i].buyerChange+'</td>'))
            .append($('<td>'+trades[i].comission+'</td>'))
            .append($('<td>'+trades[i].time+'</td>'))
            .append($('<td>'+trades[i].buysell+'</td>'))
            .append($('<td>'+trades[i].price+'</td>'))

        $('#table_trades').append(tr);
    }

    function DeleteTrade(id)
    {
        socket.send(JSON.stringify({
            request: 'delete_trade', 
            message: {
                id: id
            }
        }));
        
    }
}

$('#coin-visible').click(function() {
    var info = {};
    try {info = JSON.parse($('#coin-info').val())}catch(e){}
    if(this.checked)
        info['active'] = true;
    else
        info['active'] = false;
        
    $('#coin-info').val(JSON.stringify(info));
});

$('#coin-daemon-path').change(() => { 
    var info = {};
    try {info = JSON.parse($('#coin-info').val())}catch(e){}
    
    info['daemon'] =$('#coin-daemon-path').val();
 
    $('#coin-info').val(JSON.stringify(info));
});

$('#coin-hold').change(() => { 
    var info = {};
    try {info = JSON.parse($('#coin-info').val())}catch(e){}
    
    info['hold'] = 0.002;
    try {info['hold'] = 1*$('#coin-hold').val();}catch(e){}
    
    $('#coin-info').val(JSON.stringify(info));
});

$('#coin-page').change(e => { 
    var info = {};
    try {info = JSON.parse($('#coin-info').val())}catch(e){}
    
    info['page'] = $('#coin-page').val();
    
    $('#coin-info').val(JSON.stringify(info));
});


$('#coin-minconf').change(e => { 
    if (!isInt($('#coin-minconf').val()))
        return;

    var info = {};
    try {info = JSON.parse($('#coin-info').val())}catch(e){}
    
    info['minconf'] = 1*$('#coin-minconf').val();
    
    $('#coin-info').val(JSON.stringify(info));
});

function isInt(value) {
  return !isNaN(value) && (function(x) { return (x | 0) === x; })(parseFloat(value))
}

$('#coins-select').change(e => { 
    socket.send(JSON.stringify({request: 'admincoins'}));
});

$('#form-rpc_test').submit(e => {
    e.preventDefault();
    
    socket.send(JSON.stringify({
        request: 'rpc_test', 
        message: {
            coin: $( "#coins-select option:selected" ).text(),
            command: $( "#coin-rpc_command" ).val(),
            params: $( "#coin-rpc_params" ).val()
        }
    }));
});

/*$('#start-daemon').click(e => {
    e.preventDefault();
    
    socket.send(JSON.stringify({
        request: 'daemon_start', 
        message: {
            path: $( "#coin-daemon-path" ).val(),
        }
    }));
    
})*/

$('#form-edit-coin').submit(e => {
    e.preventDefault();
    
    socket.send(JSON.stringify({
        request: 'newcoin', 
        message: {
            name: $( "#coins-select option:selected" ).text(),
            ticker: $('#coin-ticker').val(),
            icon: $('#coin-icon').val(),
            address: $('#coin-rpc_address').val(),
            rpc_user: $('#coin-rpc_user').val(),
            rpc_password: $('#coin-rpc_password').val(),
            info: $('#coin-info').val()
        }
    }));
    
});

$('#id_find_chat_user').submit(e => {
    e.preventDefault();

    $('#table_ban_users').empty();
    $('#loader').show();
    $.post( "/admin/findchatban", $( '#id_find_chat_user' ).serialize(), function( data ) {
        $('#loader').hide();

        if (data.result != true)
        {
            utils.alert_fail(data.message);
            return;
        }
        const users = data.data.users;
        
        for (var i=0; i<users.length; i++)
        {
            const userID = users[i].userID;
            const delButton = $('<button id=delBan_"'+userID+'" class="btn btn-default">X</button>');
            delButton.on('click', e => {
                DeleteBan(userID);
            });

            const tr = $('<tr></tr>')
                .append($('<td>'+userID+'</td>'))
                .append($('<td>'+utils.timeConverter(users[i].startBanTime)+'</td>'))
                .append($('<td>'+utils.timeConverter(users[i].endBanTime)+'</td>'))
                .append($('<td>'+users[i].comment+'</td>'))
                .append($('<td></td>').append(delButton))
            $('#table_ban_users').append(tr);
        }
    });
    
    function DeleteBan(userID)
    {
        socket.send(JSON.stringify({
            request: 'deleteBan', 
            message: {userID: userID}
        }));
    }
});

$('#id_finduser').submit(e => {
    e.preventDefault();
    
    $('#table_users').empty();
    $('#loader').show();
    $.post( "/admin/finduser", $( '#id_finduser' ).serialize(), function( data ) {
        $('#loader').hide();

        if (data.result != true)
        {
            utils.alert_fail(data.message);
            return;
        }
        const users = data.data.users;
        
        for (var i=0; i<users.length; i++)
        {
            const tr = $('<tr></tr>')
                .append($('<td >'+users[i].id+'</td>'))
                .append($('<td >'+users[i].account+'</td>'))
                .append($('<td>'+users[i].login+'</td>'))
                .append($('<td>'+users[i].email+'</td>'))
                .append($('<td></td>').append(GetRole(users[i].id, users[i].info)))
                //.append($('<td></td>').text(unescape(users[i].info)))
            $('#table_users').append(tr);
        }
    });

    function GetRole(userID, info)
    {
        let currRole = 'User';    
        try {currRole = JSON.parse(unescape(info)).role;}
        catch(e){}
        
        const roles = {
            admin: $('<option value="Administrator">Administrator</option>'),
            support: $('<option value="Support">Support</option>'),
            chat_admin: $('<option value="Chat-admin">Chat-admin</option>'),
            user: $('<option selected value="User">User</option>')
        };
        
        for (var key in roles)
        {
            if (roles[key].val() != currRole) continue;
            roles['user'].prop('selected', false);
            roles[key].prop('selected', true);
            break;
        }

        return $('<select class="form-control" id="users_role"></select>')
            .append(roles.admin)
            .append(roles.chat_admin)
            .append(roles.support)
            .append(roles.user)
            .change(() => {
                socket.send(JSON.stringify({
                    request: 'change_user_role', 
                    message: {
                        userID: userID,
                        role: $( "#users_role option:selected" ).val()
                    }
                }));
            });
    }
});


$('#del_coin').click(e => {    
    e.preventDefault();

    const body = 
        "<form>" +
            "<div class='form-group'>" +
                "<label class='col-form-label' for='id-delcoin-name'>Coin name</label>" +
                "<input type='text' class='form-control' id='id-delcoin-name' placeholder='Marycoin'>" +
            "</div>" +
        "</form>";
        
    modals.OKCancel('Delete coin', body, ret => {
        if (ret == 'cancel')
            return;
            
        socket.send(JSON.stringify({
            request: 'delcoin', 
            message: {
                name: $('#id-delcoin-name').val(),
            }
        }));
    });

});
//$('#form-add-coin').submit(e => {
//    e.preventDefault();
$('#add_coin').click(e => {    
    e.preventDefault();
    const body = 
        "<form>" +
            "<div class='form-group'>" +
                "<label class='col-form-label' for='id-newcoin-name'>Coin name</label>" +
                "<input type='text' class='form-control' id='id-newcoin-name' placeholder='Marycoin'>" +
            "</div>" +
            "<div class='form-group'>" +
                "<label class='col-form-label' for='id-newcoin-ticker'>Coin ticker</label>" +
                "<input type='text' class='form-control' id='id-newcoin-ticker' placeholder='MC'>" +
            "</div>" +
            "<div class='form-group'>" +
                "<label class='col-form-label' for='id-newcoin-icon'>Icon URL</label>" +
                "<input type='text' class='form-control' id='id-newcoin-icon' placeholder='https://raw.githubusercontent.com/multicoins/marycoin/0.15.0.2hf/src/qt/res/icons/bitcoin.ico'>" +
            "</div>" +
            "<div class='form-group'>" +
                "<label class='col-form-label' for='id-newcoin-rpcaddress'>RPC address</label>" +
                "<input type='text' class='form-control' id='id-newcoin-rpcaddress' placeholder='http://127.0.0.1:33332'>" +
            "</div>" +
            "<div class='form-group'>" +
                "<label class='col-form-label' for='id-newcoin-rpcuser'>RPC user</label>" +
                "<input type='text' class='form-control' id='id-newcoin-rpcuser' placeholder='kzv_rpc'>" +
            "</div>" +
            "<div class='form-group'>" +
                "<label class='col-form-label' for='id-newcoin-rppassword'>RPC password</label>" +
                "<input type='password' class='form-control' id='id-newcoin-rpcpassword' placeholder='kzv_rpc'>" +
            "</div>" +
        "</form>";
    
    modals.OKCancel('Add new coin', body, ret => {
        if (ret == 'cancel')
            return;
            
        StartAddingCoin();
    });
});

function StartAddingCoin()
{
    socket.send(JSON.stringify({
        request: 'newcoin', 
        message: {
            name: $('#id-newcoin-name').val(),
            ticker: $('#id-newcoin-ticker').val(),
            icon: $('#id-newcoin-icon').val(),
            address: $('#id-newcoin-rpcaddress').val(),
            rpc_user: $('#id-newcoin-rpcuser').val(),
            rpc_password: $('#id-newcoin-rpcpassword').val(),
            info: JSON.stringify({})
        }
    }));
}

function ShowSocketMessage(message)
{
    alert(message);
}

function onSocketMessage(event)
{
  var data = {};
  try { data = JSON.parse(event.data); }
  catch(e) {return;}
  
  if (!data.request || data.request == 'error' || !data.message)
    return;
    
  if (data.request == 'coinsadmin')
  {
    UpdateAdminCoins(data.message, data.client_request);
    return;
  }
  if (data.request == 'last_trade')
  {
    UpdateLastTrade(data.message);
    return;
  }
  if (data.request == 'answer')
  {
    ShowSocketMessage(data.message);
    return;
  }
  if (data.request == 'user-role-change')
  {
      data.message == 'success' ? utils.alert_success('User role changed!') : utils.alert_fail(data.message);
      return;
  }
  if (data.request == 'rpc_responce')
  {
      if (data.message.result != "success")
        $('#rpc_responce').text(data.message.data);
      else
        $('#rpc_responce').text(JSON.stringify(data.message.data));
  }
}

function UpdateCoinBalance()
{
    var currentCoin = $( "#coins-select option:selected" ).text();
    $.post( "/admin/getcoinbalance", {coin: currentCoin}, function( data ) {
        if (data.result != true)
          return;
        
        $('#table_coin_balance').empty();
        
        $('#table_coin_balance').append($('<tr></tr>')
            .append($('<td>'+(data.data.balance*1).toFixed(8)+'</td>'))
            .append($('<td>'+(data.data.blocked*1).toFixed(8)+'</td>'))
            .append($('<td>'+(data.data.balance*1+data.data.blocked*1).toFixed(8)+'</td>')));
        
     }, "json" );
}

function UpdateLastTrade(data)
{
    ShowLastTrades(data);
    //setTimeout(() => {modals.OKCancel('Ready!', '<p>Trades updated</p>')}, 1000);
}

function UpdateAdminCoins(data, client_request)
{
    var currentCoin = $( "#coins-select option:selected" ).text();
    
    UpdateCoinBalance();
    
    $('#coins-select').empty();
    
    for (var i=0; i<data.length; i++)
    {
        const option = $('<option value="'+unescape(data[i].name)+'">'+unescape(data[i].name)+'</option>');
        $('#coins-select').append(option);
        
        if (currentCoin && currentCoin != unescape(data[i].name))
            continue;
        
        //currentCoin = data[i].name;
        
        $('#coin-ticker').val(unescape(data[i].ticker));  
        $('#coin-icon').val(unescape(data[i].icon));  
        $('#coin-rpc_address').val(unescape(data[i].address));  
        $('#coin-rpc_user').val(unescape(data[i].rpc_user));  
        $('#coin-rpc_password').val(unescape(data[i].rpc_password));  
        $('#coin-info').val(unescape(data[i].info));  

        var info = {};
        try {info = JSON.parse($('#coin-info').val())}catch(e){}
        
        if (info['active']) $('#coin-visible').prop( "checked", true );
        $('#coin-minconf').val(info['minconf'] || "");
        $('#coin-hold').val(info['hold'] || "");
        $('#coin-page').val(info['page'] || "");
    }

    $("#coins-select option[value='"+currentCoin+"']").prop('selected', true);
    $('#form-edit-coin').show();
    
    if ($('#coins-tab').hasClass('active') && (client_request == 'newcoin' || client_request == 'delcoin'))
        setTimeout(() => {modals.OKCancel('Ready!', '<p>All coins saved</p>')}, 1000);
}

function onOpenSocket()
{
  socket.send(JSON.stringify({request: 'admincoins'}));
}

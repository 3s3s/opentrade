'use strict';

$(() => {
    utils.CreateSocket(onSocketMessage, onOpenSocket);
    
    $('#table_coin_balance').empty();
    UpdateCoinBalance();
});



$('#coin-visible').click(function() {
    var info = {};
    try {info = JSON.parse($('#coin-info').val())}catch(e){}
    if(this.checked)
        info['active'] = true;
    else
        info['active'] = false;
        
    $('#coin-info').val(JSON.stringify(info));
});

$('#coin-hold').change(function(){ 
    var info = {};
    try {info = JSON.parse($('#coin-info').val())}catch(e){}
    
    info['hold'] = 0.002;
    try {info['hold'] = 1*$('#coin-hold').val();}catch(e){}
    
    $('#coin-info').val(JSON.stringify(info));
});

$('#coin-minconf').change(function(){ 
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

$('#coins-select').change(function(){ 
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
                .append($('<td>'+users[i].id+'</td>'))
                .append($('<td>'+users[i].account+'</td>'))
                .append($('<td>'+users[i].login+'</td>'))
                .append($('<td>'+users[i].email+'</td>'))
                .append($('<td></td>').append(GetRole(users[i].info)))
                .append($('<td></td>').text(unescape(users[i].info)))
            $('#table_users').append(tr);
        }
    });

    function GetRole(info)
    {
        return $('<span></span>').text(JSON.stringify({}));
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

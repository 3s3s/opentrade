'use strict';

$(() => {
  utils.CreateSocket(onSocketMessage, onOpenSocket);

  const messageSuccess = $('#id_server_message_success').val()
  const messageFail = $('#id_server_message_fail').val()
  
  if (messageSuccess.length)
    utils.alert_success(unescape(messageSuccess));
  if (messageFail.length)
    utils.alert_fail(unescape(messageFail));
});

function onSocketMessage(event)
{
  var data = {};
  try { data = JSON.parse(event.data); }
  catch(e) {return;}
  
  if (!data.request || data.request == 'error' || !data.message)
    return;
    
  if (data.request == 'wallet')
  {
    UpdateWallet(data.message);
    return;
  }
}

function onOpenSocket()
{
  socket.send(JSON.stringify({request: 'getwallet'}));
}

function UpdateWallet(data)
{
    const id_balance = data.coin.name+"_balance";
    const id_awaiting = data.coin.name+"_awaiting";
    const id_onhold = data.coin.name+"_onhold";
    
    if ($('#'+data.coin.name).length)
    {
      $('#'+id_balance).text(data.balance+" "+data.coin.ticker);
      $('#'+id_awaiting).text(data.awaiting+" "+data.coin.ticker);
      $('#'+id_onhold).text(data.hold+" "+data.coin.ticker);
      return;
    }
    
    const tdCoin = $('<td scope="col" class="align-middle">'+data.coin.name+'</td>');
    const tdBalance = $('<td id="'+id_balance+'" scope="col" class="align-middle">'+data.balance+" "+data.coin.ticker+'</td>');
    const tdAwaiting = $('<td id="'+id_awaiting+'" scope="col" class="align-middle">'+data.awaiting+" "+data.coin.ticker+'</td>');
    const tdHold = $('<td id="'+id_onhold+'" scope="col" class="align-middle">'+data.hold+" "+data.coin.ticker+'</td>');
    
    const tdDeposit = CreateDepositArea(data);//$('<td>'+data.deposit[data.deposit.length-1]+'</td>');
    
    $('#id_wallet_body').append(
      $('<tr id="'+data.coin.name+'"></tr>').append(tdCoin).append(tdBalance).append(tdAwaiting).append(tdHold).append(tdDeposit));
}

function CreateDepositArea(data)
{
  const coin = data.coin.name;
  const coinID = data.coin.id;
  const btnDeposit = $('<button class="btn btn-secondary m-1 align-middle" type="button">Deposit</button>')
    .on('click', e => { ShowDepositAddress(coin) });
  const btnWithdraw = $('<button class="btn btn-secondary m-1 align-middle" type="button">Withdraw</button>')
    .on('click', e => { ShowWithdrawDialog(coin, data.coin.id) });
  const btnHistory = $('<button class="btn btn-secondary m-1 align-middle" type="button">History</button>');

  return $('<td scope="col"></td>').append(btnDeposit).append(btnWithdraw).append(btnHistory);
}

function ShowDepositAddress(coin)
{
  $('#alert-fail').hide();
  $('#alert-success').hide();
  $('#loader').show();
  $.post( "/getdepositaddress", {coin: coin}, data => {
    $('#loader').hide();
    if (!data || !data.result || !data.data || !data.data.length)
      return;
      
    modals.OKCancel(
      'Load your '+coin, 
      '<div><b>To load your account please send the coins to your address :</b><br>'+data.data[data.data.length-1]+'</div>')
  });
}

function ShowWithdrawDialog(coin, coinID)
{
  $('#alert-fail').hide();
  $('#alert-success').hide();
  modals.OKCancel(
      'Withdraw your '+coin, 
      '<div>'+
        '<form id="withdraw-form" class="paper-form" action="/withdraw" method="post">'+
          '<input type="hidden" name="coin", value="'+coinID+'">'+
          '<div class="form-group">'+
            '<label for="id_address" class="control-label  requiredField">Your address<span class="asteriskField">*</span> </label>'+
            '<input class="textinput textInput form-control" id="id_address" maxlength="100" name="address" type="text" required>'+
            '<div class="invalid-feedback">This field is required.</div>'+
          '</div>'+
          '<div class="form-group">'+
            '<label for="id_amount" class="control-label  requiredField">Amount<span class="asteriskField">*</span> </label>'+
            '<input class="textinput textInput form-control" id="id_amount" maxlength="15" name="amount" type="text" required>'+
            '<div class="invalid-feedback">This field is required.</div>'+
          '</div>'+
          '<div class="form-group">'+
            '<label for="id_password" class="control-label  requiredField">Password<span class="asteriskField">*</span> </label>'+
            '<input class="textinput textInput form-control" id="id_password" maxlength="100" name="password" type="password" required>'+
            '<div class="invalid-feedback">This field is required.</div>'+
          '</div>'+
        '</form>'+
      '</div>', 
      result => {
        if (result == 'cancel')
          return;
          
        $('#loader').show();
        
        $.post( "/withdraw", $( '#withdraw-form' ).serialize(), function( data ) {
          $('#loader').hide();
          if (data.result != true)
          {
            //$('#alert-fail').html(data.message);
            //$('#alert-fail').show();
            utils.alert_fail(data.message);
            return;
          }
          //$('#alert-success').html("<b>Withdraw almost done!</b> Check your email for the further instructions.");
          //$('#alert-success').show();
          utils.alert_success("<b>Withdraw almost done!</b> Check your email for the further instructions.");
          //modals.OKCancel('Warning', "<div><h3>Almost done!</h3> Check your email for the further instructions.</div>", () => {$('#loader').hide();});
        }, "json" );
      });
  
}
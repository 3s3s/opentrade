'use strict';

$(() => {
  utils.CreateSocket(onSocketMessage, onOpenSocket);
  
  setInterval(()=>{ socket.send(JSON.stringify({request: 'getwallet'})); }, 120000);

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
    const coin = unescape(data.coin.name).replace('@', '_');
    const id_balance = coin+"_balance";
    const id_awaiting = coin+"_awaiting";
    const id_onhold = coin+"_onhold";
    
    if ($('#'+escape(coin).replace('%', '_')).length)
    {
      $('#'+id_balance).text(data.balance+" "+data.coin.ticker);
      $('#'+id_awaiting).text(data.awaiting+" "+data.coin.ticker);
      $('#'+id_onhold).text(data.hold+" "+data.coin.ticker);
      return;
    }
    
    const icon = '<img src="'+unescape(data.coin.icon)+'" width=40 />';
    const tdCoin = $('<td scope="col" class="align-middle">'+icon+unescape(data.coin.name)+'</td>');
    const tdBalance = $('<td id="'+id_balance+'" scope="col" class="align-middle">'+(data.balance*1).toFixed(8)*1+" "+data.coin.ticker+'</td>');
    const tdAwaiting = $('<td id="'+id_awaiting+'" scope="col" class="align-middle">'+(data.awaiting*1).toFixed(8)*1+" "+data.coin.ticker+'</td>');
    const tdHold = $('<td id="'+id_onhold+'" scope="col" class="align-middle">'+(data.hold*1).toFixed(8)*1+" "+data.coin.ticker+'</td>');
    
    const tdDeposit = CreateDepositArea(data);//$('<td>'+data.deposit[data.deposit.length-1]+'</td>');
    
    $('#id_wallet_body').append(
      $('<tr id="'+escape(coin).replace('%', '_')+'"></tr>').append(tdCoin).append(tdBalance).append(tdAwaiting).append(tdHold).append(tdDeposit));
}

function CreateDepositArea(data)
{
  const coin = unescape(data.coin.name);
  const coinID = data.coin.id;
  const btnDeposit = $('<button class="btn btn-secondary m-1 align-middle" type="button">Deposit</button>')
    .on('click', e => { ShowDepositAddress(coin) });
  const btnWithdraw = $('<button class="btn btn-secondary m-1 align-middle" type="button">Withdraw</button>')
    .on('click', e => { ShowWithdrawDialog(coin, data.coin.id) });
  const btnHistory = $('<button class="btn btn-secondary m-1 align-middle" type="button">History</button>')
    .on('click', e => { ShowHistoryDialog(coin, data.coin.id) });

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
    
    var message = '<div><b>To load your account please send the coins to your address :</b><br>'+data.data[data.data.length-1]+'</div>';
    
    if (coin == '---TTC---')
    {
      message += '<div class="p-3 mb-2 bg-danger text-white">WARNING!!! ---TTC--- IS NOT TittieCoin !!!</div>';
    }
    if (coin == 'Bitcoin Cash')
    {
      message += '<div class="p-3 mb-2 bg-warning text-white"><a href="https://cashaddr.bitcoincash.org/" target="_blank">Convert to Legacy address format</a></div>';
    }
    
    modals.OKCancel1('Load your '+coin, message);
  });
}

function ShowWithdrawDialog(coin, coinID)
{
  $('#alert-fail').hide();
  $('#alert-success').hide();
  
  var message = "";
  if (coin == '---TTC---')
  {
      message = '<div class="p-3 mb-2 bg-danger text-white">WARNING!!! ---TTC--- IS NOT TittieCoin !!!</div>';
  }
  
  modals.OKCancel(
      'Withdraw your '+coin, 
      '<div>'+
        message +
        '<form id="withdraw-form" class="paper-form" action="/withdraw" method="post" >'+
          '<input type="hidden" name="coin", value="'+coin+'">'+
          '<div class="form-group">'+
            '<label for="id_address" class="control-label  requiredField">Your address<span class="asteriskField">*</span> </label>'+
            '<input class="textinput textInput form-control" id="id_address" maxlength="100" name="address" type="text" required>'+
            '<div class="invalid-feedback">This field is required.</div>'+
          '</div>'+
          '<div class="form-group">'+
            '<label for="id_amount" class="control-label  requiredField">Amount<span class="asteriskField">*</span> </label>'+
            '<input class="textinput textInput form-control" id="id_amount" maxlength="15" name="amount" type="number" step="0.0001" min="0.0001" required>'+
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
            utils.alert_fail(data.message);
            return;
          }
          utils.alert_success("<b>Withdraw almost done!</b> Check your email for the further instructions.");
          //modals.OKCancel('Warning', "<div><h3>Almost done!</h3> Check your email for the further instructions.</div>", () => {$('#loader').hide();});
        }, "json" );
      });
}

function ShowHistoryDialog(coin, coinID)
{
  $('#alert-fail').hide();
  $('#alert-success').hide();

  $('#loader').show();
  $.getJSON( "/history", {coinID: coinID}, ret => {
    $('#loader').hide();
    if (ret.result != true)
    {
      utils.alert_fail(ret.message);
      return;
    }
    ShowHistory(coin, ret.data);
  });
  
  function ShowHistory(coin, data)
  {
    data.sort((a,b)=>{return a - b;});
    
    let tbody = $('<tbody></tbody>');
    
    for (var i=0; i<data.length; i++)
    {
      if (data[i].category == 'move')
        continue;
      
      const txTime = utils.timeConverter(data[i].time*1000);
      
      const button = $('<button type="button" class="btn btn-link">'+txTime+'</button>').on('click', e => {
          e.preventDefault();
          modals.OKCancel1('Transaction info', '');
        });

      if (data[i]['txid'] != undefined)
      {
        const rows = $('<tr><td>txid</td><td>'+data[i]['txid']+'</td></tr>');
        
        const txInfo = $('<table class="table table-striped table-bordered"><thead><tr><th></th><th></th></tr></thead></table>')
          .append($('<tbody></tbody>').append(rows));
        
        button.on('click', e => {
          e.preventDefault();
          modals.OKCancel1('Transaction info', txInfo);
        });
        
      }
      
      const amount = (data[i].category == 'receive') ? "+"+data[i].amount : data[i].amount;
      tbody.append($('<tr></tr>')
        .append($('<td>'+amount+'</td>'))
        .append($('<td></td>').append(button))
        )
    }
    
    var table = $('<table class="table table-striped table-bordered"><thead><tr><th>amount</th><th>time</th></tr></thead></table>').append(tbody);
    modals.OKCancel1(
        'Recent transactions '+coin, 
        table,
        function(){},
        true
    );
      
  }
}
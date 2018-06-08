'use strict';

let mapCoinBalance = {};
let coinsCount = 10000;

$(() => {
  utils.CreateSocket(onSocketMessage, onOpenSocket);
  
  setInterval(()=>{ socket.send(JSON.stringify({request: 'getwallet'})); }, 120000);

  const messageSuccess = $('#id_server_message_success').val()
  const messageFail = $('#id_server_message_fail').val()
  
  if (messageSuccess.length)
    utils.alert_success(unescape(messageSuccess));
  if (messageFail.length)
    utils.alert_fail(unescape(messageFail));
    
  $.getJSON('/api/v1/public/getmarkets', ret => {
    if (ret.success != true || !ret.result.length)
      return;
            
    coinsCount = ret.result.length;
  });
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
    
    mapCoinBalance[data.coin.ticker] = data.balance;
    
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
      
    if (Object.keys(mapCoinBalance).length >= coinsCount)
      $('#ballsWaveG').hide();
}

function CreateDepositArea(data)
{
  const coin = unescape(data.coin.name);
  const coinID = data.coin.id;
  const btnDeposit = $('<button class="btn btn-secondary m-1 align-middle" type="button">Deposit</button>')
    .on('click', e => { ShowDepositAddress(coin) });
  const btnWithdraw = $('<button class="btn btn-secondary m-1 align-middle" type="button">Withdraw</button>')
    .on('click', e => { ShowWithdrawDialog(coin, data.coin.id, data.coin.ticker) });
  const btnHistory = $('<button class="btn btn-secondary m-1 align-middle" type="button">History</button>')
    .on('click', e => { ShowHistoryDialog(coin, data.coin.id) });

  return $('<td scope="col"></td>').append(btnDeposit).append(btnWithdraw).append(btnHistory);
}

function ShowDepositAddress(coin)
{
  $('#alert-fail').hide();
  $('#alert-success').hide();
  $('#loader').show();
  $("html, body").animate({ scrollTop: 0 }, "slow");
  $.post( "/getdepositaddress", {coin: coin}, data => {
    $('#loader').hide();
    if (!data || !data.result || !data.data || !data.data.length)
      return utils.alert_fail(data && data.message ? data.message : 'Unknown error/ Please try later');
    
    const coinaddress = data.data[data.data.length-1];
    const button = $('<button "id_button_copy" type="button" class="btn btn-light">&#x1f4cb;</button>').on('click', e => {
      var copyText = document.querySelector("#id_coin_address");
      copyText.select();
      document.execCommand("copy");
      alert("Address was copied to the clipboard");
      //utils.copyTextToClipboard($("#id_coin_address").val(), err => {
      //  if (err)
      //    alert("Address was copied to the clipboard");
      //}); 
    });
    let message = $('<div></div>').append(
      $('<b>To load your account please send the coins to your address :</b><br>')).append( 
      $('<div class="row align-items-center"></div>').append(
        $('<div class="col-md-4"></div>').append(
          $('<canvas id="id_coinQR"></canvas>'))).append(
        $('<div class="input-group col-md-6"></div>').append(
          $('<input id="id_coin_address" type="text" class="form-control" readonly value="'+coinaddress+'">')).append(
          $('<div class="input-group-append"></div>').append(button)))).append(
      $('<script src="/js/qrcode/build/qrcode.min.js"></script>' +
      '<script>QRCode.toCanvas(document.getElementById("id_coinQR"), "'+coin.toLowerCase()+":"+coinaddress+'", error => {});</script>'));
    
    if (coin == 'Bitcoin Cash')
      message.append($('<div class="p-3 mb-2 bg-warning text-white"><a href="https://cashaddr.bitcoincash.org/" target="_blank">Convert to Legacy address format</a></div>'));

    modals.OKCancel1('Load your '+coin, message, true);
  });
}

//$("id_button_copy").on("click", e => {utils.copyTextToClipboard($("#id_coin_address").val()); alert("Ready");})

function ShowWithdrawDialog(coin, coinID, coinTicker)
{
  $('#alert-fail').hide();
  $('#alert-success').hide();
  
  var message = "";
  if (coin == '---TTC---')
      message = '<div class="p-3 mb-2 bg-danger text-white">WARNING!!! ---TTC--- IS NOT TittieCoin !!!</div>';

  $.getJSON( "/api/v1/public/getmarketsummary?market="+utils.MAIN_COIN+"-"+coinTicker, ret => {
    
    const hold = (ret && ret.success && ret.result && ret.result.coin_info && ret.result.coin_info.hold) ?
      ret.result.coin_info.hold : 0;
      
    const available = (mapCoinBalance[coinTicker] || 0)*1 - hold*1;
    const txtColor = available < 0 ? "text-danger" : "text-success";
    
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
              '<input class="textinput textInput form-control" aria-describedby="amountHelp" id="id_amount" maxlength="15" name="amount" type="number" step="0.0001" min="0.0001" required>'+
              '<small id="amountHelp" class="form-text text-muted">Available for withdraw <strong class="'+txtColor+'">'+(available.toFixed(7))*1+'</strong> '+coinTicker+'</small>' +
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
            
          const withdraw = $('#id_amount').val()*1;
          if (available <= 0 || !withdraw || withdraw > available)
            return utils.alert_fail('Insufficient funds');
            
          $('#loader').show();
          $("html, body").animate({ scrollTop: 0 }, "slow");
          
          $.post( "/withdraw", $( '#withdraw-form' ).serialize(), function( data ) {
            $('#loader').hide();
            if (data.result != true)
              return utils.alert_fail(data.message);

            utils.alert_success("<b>Withdraw almost done!</b> Check your email for the further instructions.");
            //modals.OKCancel('Warning', "<div><h3>Almost done!</h3> Check your email for the further instructions.</div>", () => {$('#loader').hide();});
          }, "json" );
        });

  });
  
}

function ShowHistoryDialog(coin, coinID)
{
  $('#alert-fail').hide();
  $('#alert-success').hide();

  $('#loader').show();
  $("html, body").animate({ scrollTop: 0 }, "slow");
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
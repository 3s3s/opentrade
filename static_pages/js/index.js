'use strict';

var g_CurrentPair = utils.DEFAULT_PAIR;

var pairData = {};

$(() => {
  utils.CreateSocket(onSocketMessage, onOpenSocket);

  $('#button_chat').click(event => {
        event.preventDefault();
        SendChatMessage();
  });

  const currentPair = storage.getItem('CurrentPair');
  if (currentPair != null)
    g_CurrentPair = currentPair.value;
    
  $('#header_sell').text('Sell '+g_CurrentPair);
  $('#header_buy').text('Buy '+g_CurrentPair);
    
});

$('#form_buy').submit(e => {
  e.preventDefault();
});

$('#form_sell').submit(e => {
  e.preventDefault();
});

function SendChatMessage()
{
  socket.send(JSON.stringify({request: 'postchat', message: {text: $('#chat_message').val()}}));
  $('#chat_message').val('');
}

function onOpenSocket()
{
  socket.send(JSON.stringify({request: 'getchat'}));
  socket.send(JSON.stringify({request: 'getpair', message: [utils.MAIN_COIN, g_CurrentPair]}));

  setInterval(()=>{socket.send(JSON.stringify({request: 'getpair', message: [utils.MAIN_COIN, g_CurrentPair]}));}, 120000)
}

function onSocketMessage(event)
{
  var data = {};
  try { data = JSON.parse(event.data); }
  catch(e) {return;}
  
  if (!data.request || data.request == 'error' || !data.message)
    return;
    
  if (data.request == 'chat-message')
  {
    AddChatMessage(data.message)
    return;
  }
  if (data.request == 'chat-messages')
  {
    $('#chat-container').empty();
    for (var i=0; i<data.message.length; i++)
      AddChatMessage(data.message[i])
    return;
  }
  if (data.request == 'pairdata')
  {
    UpdatePairData(data.message)
    return;
  }
  if (data.request == 'pairbalance')
  {
    UpdatePairBalance(data.message)
    return;
  }
  if (data.request == 'wallet')
  {
    UpdateBalance(data.message);
    return;
  }
  if (data.request == 'market')
  {
    UpdateMarket(data.message)
    return;
  }
}

function UpdateMarket(message)
{
  if (!message || !message.coins || !message.coins.length)
    return;
  
  $('#table-market').empty();  
  for (var i=0; i<message.coins.length; i++)
  {
    const coinName = message.coins[i].name;
    
    if (coinName == utils.MAIN_COIN)
      continue;
      
    const price = "0.0";
    const vol = "0.0";
    const ch = "0.0";
    const tr = $('<tr></tr>')
      .append($('<td>'+message.coins[i].ticker+'</td>'))
      .append($('<td>'+price+'</td>'))
      .append($('<td>'+vol+'</td>'))
      .append($('<td>'+ch+'</td>'))
      .on('click', e => {
        if (coinName == g_CurrentPair)
          return;
        storage.setItem('CurrentPair', coinName);
        location.reload(); 
      });
      
    $('#table-market').append(tr);
  }
}

function AddChatMessage(message)
{
  const user = $('<a href="#"></a>').text(message.user+":");
  const text = $('<span class="p-2"></span>').text(message.message.text);
  $('#chat-container').append($('<div class="row chat_row"></div>').append($('<div class="col-md-12"></div>').append(user).append(text)));
  
  $('#chat-flex').animate({scrollTop: $('#chat-container').height()}, 0);
}

function UpdatePairData(message)
{
  
}

function UpdatePairBalance(message)
{
  
}

function UpdateBalance(message)
{
  var buyBalance = 0.0;
  var sellBalance = 0.0;
  
  if (message.coin && (message.balance != undefined))
  {
    if (message.coin.name == utils.MAIN_COIN)
    {
      $('#id_buy_balance').empty();
      buyBalance = message.balance;
      $('#id_buy_balance').text(buyBalance);
      $('#id_buy_coin').text(utils.MAIN_COIN);
    }
    if (message.coin.name == g_CurrentPair)
    {
      $('#id_sell_balance').empty();
      sellBalance = message.balance;
      $('#id_sell_balance').text(sellBalance);
      $('#id_sell_coin').text(g_CurrentPair);
    }
  }
}

$('#inputBuyAmount').on('change', e => {
  UpdateBuyComission();
})
$('#inputBuyPrice').on('change', e => {
  UpdateBuyComission();
})
$('#inputSellAmount').on('change', e => {
  UpdateSellComission();
})
$('#inputSellPrice').on('change', e => {
  UpdateSellComission();
})

function UpdateBuyComission()
{
  const amount = $('#inputBuyAmount').val() || 0;
  const price = $('#inputBuyPrice').val() || 0;
  const balance = $('#id_buy_balance').text() || 0;
  try 
  {
    const comission = utils.COMISSION*amount*price;
    const total = amount*price+comission;
    $('#inputBuyComission').val(comission.toFixed(7));
    $('#inputBuyTotal').val(total.toFixed(7));
  }
  catch(e) {}
}
function UpdateSellComission()
{
  const amount = $('#inputSellAmount').val() || 0;
  const price = $('#inputSellPrice').val() || 0;
  const balance = $('#id_sell_balance').text() || 0;
  try 
  {
    const comission = utils.COMISSION*amount*price;
    const total = amount*price+comission;
    $('#inputSellComission').val(comission.toFixed(7));
    $('#inputSellTotal').val(total.toFixed(7));
  }
  catch(e) {}
  
}

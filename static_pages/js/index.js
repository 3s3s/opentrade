'use strict';

var g_CurrentPair = utils.DEFAULT_PAIR;
var g_CurrentLang = 'ru';

var g_bFirstChatFilling = true;
const chat_languages = ['ru', 'en'];

//var pairData = {};

var coinNameToTicker = {};
var coinTickerToName = {};

//var chartData = [];

var g_role = 'User';

function UpdatePageWithRole()
{
  if (!g_role || g_role == 'User')
    return;
  
  if (g_role == 'root')
  {
    $('.del_message_button').show();
    $('.del_order_button').show();
  }
  if (g_role == 'Support')
    $('.staff_area').show();
}

function IsNeadScroll()
{
  if (g_bFirstChatFilling)
    return true;
    
  const container = $('#chat-container_'+g_CurrentLang);
  
  return container[0].clientHeight + container.offset().top - container[0].offsetTop < 500;
};


$(() => {
  if (RedirectToCurrentPair())
      return;
      
  utils.CreateSocket(onSocketMessage, onOpenSocket);
  
  for (var i=0; i<chat_languages.length; i++)
    $('#chat-container_'+chat_languages[i]).hide();

  $('#button_chat').click(event => {
        event.preventDefault();
        SendChatMessage();
  });

  UpdateBuySellText();  

  setInterval(IsNeadScroll, 5000);
  setInterval(UpdateHelpers, 10000);

  $('.staff_area').hide();
  
  //setInterval(UpdateBTCFromLB, 30000);
});

$('#inputBuyTotal').change(e => {
  UpdateBuyComissionFromTotal();
});

$('#inputSellTotal').change(e => {
  UpdateSellComissionFromTotal();
});
function UpdateBuySellText()
{
  if (g_CurrentPair == "ZSmart") {
	  var cccoiname = "ZSX";
  }
  if (g_CurrentPair == "Dogecoin") {
	  var cccoinamez = "DOGE";
  }
  if (utils.MAIN_COIN == "Bitcoin") {
	  var maincoinz = "BTC";
  }
  $('#header_sell').text('Sell '+g_CurrentPair);
  $('#header_buy').text('Buy '+g_CurrentPair);
  
  const token = $('#id_token').val();
  if (!token || !token.length)
  {
    $('#id_balance_spiner1').hide();
    $('#id_balance_spiner2').hide();
    $('#id_sell_balance').text("0");
    $('#id_buy_balance').text("0");
  }
  
  $('#id_buy_coin').text(maincoinz);
  $('#id_sell_coin').text(cccoiname);
  
}

function ShowLanguageChat()
{
  $('#chat-container_loading').hide();
  g_CurrentLang = utils.GetCurrentLang();

  const neadScroll = IsNeadScroll(); //true; //IsNeadScroll();

  for (var i=0; i<chat_languages.length; i++)
  {
    $('#chat-container_'+chat_languages[i]).hide();
  }

  $('#chat-container_'+g_CurrentLang).show();
  UpdatePageWithRole();
  
  if (neadScroll)
    $('#chat-flex').animate({scrollTop: $('#chat-container_'+g_CurrentLang).height()}, 0);
  
}

$('#id_btn_chat_ru').on('click', e => {
  storage.setItem('CurrentLang', 'ru');
  ShowLanguageChat();
});

$('#id_btn_chat_en').on('click', e => {
  storage.setItem('CurrentLang', 'en');
  ShowLanguageChat();
});

$('#form_buy').submit(e => {
  e.preventDefault();
  
  try
  {
    const amount = $('#inputBuyAmount').val()*1;
    const price = $('#inputBuyPrice').val()*1;
    
    const order = {order: 'buy', coin: g_CurrentPair, amount: amount, price: price};
    AddOrder(order);
  }
  catch(e)
  {}
  
});

$('#form_sell').submit(e => {
  e.preventDefault();

  try
  {
    const amount = $('#inputSellAmount').val()*1;
    const price = $('#inputSellPrice').val()*1;
    
    const order = {order: 'sell', coin: g_CurrentPair, amount: amount, price: price};
    AddOrder(order);
  }
  catch(e)
  {}
  
});

function AddOrder(order)
{
  const BTC = coinNameToTicker[utils.MAIN_COIN] ? coinNameToTicker[utils.MAIN_COIN].ticker || 'BTC' : 'BTC'; 
  const bodyModal = 
    '<table class="table">'+
      '<tr>'+
        '<th>Order</th>'+
        '<th>Amount</th>'+
        '<th>Coin</th>'+
        '<th>Price</th>'+
      '</tr>'+
      '<tr>'+
        '<td>'+order.order+'</td>'+
        '<td>'+order.amount.toFixed(8)*1+'</td>'+
        '<td>'+order.coin+'</td>'+
        '<td>'+order.price.toFixed(8)*1+" "+BTC+'</td>'+
      '</tr>'
    '</table>';
  
  modals.OKCancel("Order confirmation", bodyModal, ret => {
    if (ret != 'ok')
      return;
      
    $('#loader').show();
    $("html, body").animate({ scrollTop: 0 }, "slow");
    $.post( "/submitorder", order, function( data ) {
        $('#loader').hide();
        if (data.result != true)
        {
          utils.alert_fail(data.message);
          return;
        }
        utils.alert_success('Your order is submitted!');
        socket.send(JSON.stringify({request: 'getpair', message: [utils.MAIN_COIN, g_CurrentPair]}));
    }, "json" );
  });

}

function SendChatMessage()
{
  socket.send(JSON.stringify({request: 'postchat', message: {text: $('#chat_message').val(), lang: g_CurrentLang}}));
  $('#chat_message').val('');
}

function onOpenSocket()
{
  socket.send(JSON.stringify({request: 'getchat'}));
  //socket.send(JSON.stringify({request: 'getchart', message: [utils.MAIN_COIN, g_CurrentPair, g_currentChartPeriod]}));
  socket.send(JSON.stringify({request: 'getpair', message: [utils.MAIN_COIN, g_CurrentPair]}));
  
  socket.send(JSON.stringify({request: 'getrole'}))

  setInterval(()=>{socket.send(JSON.stringify({request: 'getpair', message: [utils.MAIN_COIN, g_CurrentPair]}));}, 5000)
  //setInterval(() => {  socket.send(JSON.stringify({request: 'getchart', message: [utils.MAIN_COIN, g_CurrentPair, g_currentChartPeriod]}));}, 60000)
}

function onSocketMessage(event)
{
  var data = {};
  try { data = JSON.parse(event.data); }
  catch(e) {return;}
  
  if (!data.request || data.request == 'error' || !data.message)
    return;
    
  if (data.request == 'chat-message')
    return AddChatMessage(data.message)

  if (data.request == 'user-role')
  {
    g_role = data.message;
    return UpdatePageWithRole();
  }
  if (data.request == 'chat-messages')
  {
    //$('#chat-container').empty();
    
    const messagesAll = data.message || [];
    ShowLanguageChat();
    
    return setTimeout(AsyncAddChatMessage, 0, messagesAll, messagesAll.length-1);
  }
  if (data.request == 'pairdata')
    return UpdatePairData(data.message)

  /*if (data.request == 'chartdata')
  {
    if (data.message.data.chart)
    {
      chartData = data.message.data.chart;
      drawChart();
    }
    return;
  }*/
  if (data.request == 'pairbalance')
    return UpdatePairBalance(data.message)

  if (data.request == 'wallet')
    return UpdateBalance(data.message);

  if (data.request == 'market')
    return UpdateMarket(data.message)

  if (data.request == 'exchange-updated')
    return UpdateExchange(data.message);
}

function AsyncAddChatMessage(messages, index)
{
  if (index < 0) 
    return g_bFirstChatFilling = false;

  AddChatMessage(messages[index], true, 'prepend');
  setTimeout(AsyncAddChatMessage, 0, messages, index-1);
}

function UpdateExchange(message)
{
  if (!message || !message.coin || message.coin != g_CurrentPair)
    return;
  
  socket.send(JSON.stringify({request: 'getpair', message: [utils.MAIN_COIN, g_CurrentPair]}));
}

function RedirectToCurrentPair()
{
  const currentPair = storage.getItemS('CurrentPair');
  if (currentPair != null)
    g_CurrentPair = currentPair.value;

  const coinNameToTickerItem = storage.getItem('coinNameToTicker');
  const coinTickerToNameItem = storage.getItem('coinTickerToName');
  
  if (coinNameToTickerItem != null) coinNameToTicker = coinNameToTickerItem.value;
  if (coinTickerToNameItem != null) coinTickerToName = coinTickerToNameItem.value;

  const uri = window.location.href.split("?")[0];
  const posMarket  = uri.indexOf('/market/');
  const pair = (posMarket == -1 && uri.split("-").length == 2) ?
    coinNameToTicker[g_CurrentPair].ticker :
    uri.split("-")[1];
    
  if (coinNameToTicker[g_CurrentPair] && coinTickerToName[pair] && pair != coinNameToTicker[g_CurrentPair].ticker)
  {
    storage.setItemS('CurrentPair', coinTickerToName[pair].name);
    location.reload(); 
    return true;
  }
  return false;
}

function UpdateMarket(message)
{
  if (!message || !message.coins || !message.coins.length)
    return;
  
  $('#table-market').empty();  
  let markets = [];
  for (var i=0; i<message.coins.length; i++)
  {
    const coinName = unescape(message.coins[i].name);
	const coinIcon = '<img style="float:left;" width="16px" src="'+unescape(message.coins[i].icon)+'" />';
    
    coinNameToTicker[coinName] = {ticker: message.coins[i].ticker};
    coinTickerToName[message.coins[i].ticker] = {name: coinName};
    
    if (coinName == utils.MAIN_COIN)
      continue;
    
//    const price = (message.coins[i].price*1).toFixed(8)*1;
    const price = (message.coins[i].fromBuyerToSeller/(message.coins[i].volume == 0 ? 1 : message.coins[i].volume)).toFixed(8)*1;
    const vol = (message.coins[i].volume*1).toFixed(8)*1;
    const ch = message.coins[i].prev_frombuyertoseller ? ((price - message.coins[i].prev_frombuyertoseller*1) / (price != 0 ? price : 1))*100 : 100;
    
    const chColor = ch*1 < 0 ? "text-danger" : "text-success";
    
    if (coinName == 'Bitcoin')
    {
      /*g_BTC_LTC_Price = price;
      setTimeout(UpdateBTCFromLB, 1);*/
      storage.setItem("BTC_LTC_Price", price);
    }

    const BTC = coinNameToTicker[utils.MAIN_COIN] ? coinNameToTicker[utils.MAIN_COIN].ticker || 'BTC' : 'BTC';
    const LTC = coinNameToTicker[coinName].ticker;

    const tr = $('<tr></tr>')
      .append($('<td class="align-middle">'+coinIcon+'</td>'))
      .append($('<td>'+message.coins[i].ticker+'</td>'))
      .append($('<td>'+price+'</td>'))
      .append($('<td>'+vol+'</td>'))
      .append($('<span class="'+chColor+'">'+(ch*1).toFixed(2)+'</span>'))
      .css( 'cursor', 'pointer' )
      .on('click', e => {
        if (coinName == g_CurrentPair)
          return;
          
        utils.ChangeUrl(document.title + "(" + coinName + ' market)', '/market/'+BTC+'-'+LTC);
        storage.setItemS('CurrentPair', coinName);
        location.reload(); 
      });
      
    //$('#table-market').append(tr);
    if (BTC == "USD")
      markets.unshift(tr);
    else
      markets.push(tr);
  }
  
  for (let j=0; j<markets.length; j++)
    $('#table-market').append(markets[j]);
  
  storage.setItem('coinNameToTicker', coinNameToTicker);
  storage.setItem('coinTickerToName', coinTickerToName);
  
  if (RedirectToCurrentPair())
    return;

  if (!$('#id_buy_orders_header_price').length)
  {
    $('#id_buy_orders_header').append($('<th class="text-center" id="id_buy_orders_header_price">Price</th><th class="text-center">'+coinNameToTicker[utils.MAIN_COIN].ticker+'</th><th class="text-center">'+coinNameToTicker[g_CurrentPair].ticker+'</th>'))
    $('#id_sell_orders_header').append($('<th class="text-center">Price</th><th class="text-center">'+coinNameToTicker[utils.MAIN_COIN].ticker+'</th><th class="text-center">'+coinNameToTicker[g_CurrentPair].ticker+'</th>'))
  }
  
  UpdateBuySellTickers();
  
  const BTC = coinNameToTicker[utils.MAIN_COIN] ? coinNameToTicker[utils.MAIN_COIN].ticker || 'BTC' : 'BTC';
  const LTC = coinNameToTicker[g_CurrentPair].ticker;

  utils.ChangeUrl(document.title + "(" + g_CurrentPair+' market)', '/market/'+BTC+'-'+LTC+(window.location.search || ""));
}

function UpdateBuySellTickers()
{
  if (!coinNameToTicker[g_CurrentPair])
    return;
  
  const BTC = coinNameToTicker[utils.MAIN_COIN] ? coinNameToTicker[utils.MAIN_COIN].ticker || 'BTC' : 'BTC';
  const LTC = coinNameToTicker[g_CurrentPair].ticker;
  
  $('#id_amount_buy').text(BTC);
  $('#id_amount_sell').text(BTC);
  
  $('#id_price_buy').text(BTC);
  $('#id_price_sell').text(BTC);
  
  $('#id_comission_buy').text(BTC);
  $('#id_comission_sell').text(BTC);
  
  $('#id_total_buy').text(BTC);
  $('#id_total_sell').text(BTC);

}

function AddChatMessage(message, noscroll, method)
{
  const userName = unescape(message.user);
  const user = $('<a href="#"></a>').text(userName+":");
  const text = $('<span class="p-2"></span>').text(message.message.text);
  
  const privMessage = $('<a href="#" style="text-decoration: none">&#9743;&nbsp</a>')
  const delButton = $('<a href="#" title="Delete message" class="del_message_button" style="text-decoration: none">&#10006;&nbsp</a>').hide();
  const banButton = $('<a href="#" title="Ban user" class="del_message_button" style="text-decoration: none">&#9760;&nbsp</a>').hide();
  
  if (!message.message.lang)
    return;
  
  privMessage.on('click', e => {
    e.preventDefault();
  });
  
  let oldMessage = message;
  delButton.on('click', e => {
    e.preventDefault();
    
    modals.OKCancel("Confirmation", $('<p>'+"Delete message: '"+oldMessage.message.text+"'"+'</p>'), ret => {
      if (ret != 'ok')
        return;
        
      socket.send(JSON.stringify({request: 'del_chat_message', message: oldMessage}));
    });
  });
  banButton.on('click', e => {
    e.preventDefault();
    modals.OKCancel("Confirmation", $('<p>'+"Ban user: '"+oldMessage.message.user+"'"+'</p>'), ret => {
      if (ret != 'ok')
        return;
        
      oldMessage['info'] = {endTime: Date.now()+1000*60*60*24*365, comment: {role: g_role, comment: 'User '+oldMessage.user+' banned on 365 days'}};
      socket.send(JSON.stringify({request: 'ban_chat_user', message: oldMessage}));
    });
  });
  
  user.on('click', e => {
    e.preventDefault();
    const old = $('#chat_message').val();
    $('#chat_message').val(old + userName + ", ");
  });
    
  const append = method || 'append';
  
  const row = $('<div class="row chat_row"></div>').append($('<div class="col-md-12"></div>')
    .append(banButton)
    .append(privMessage)
    .append(user)
    .append(text)
    .append(delButton));

  $('#chat-container_'+message.message.lang)[append](row);
  
  ShowLanguageChat();
}

function UpdatePairData(message)
{
  if (!message || !message.result || !message.data)
    return;
  
  if (message.data.orders)
    UpdateOrders(message.data.orders);
  if (message.data.userOrders)
    UpdateUserOrders(message.data.userOrders);
  if (message.data.history)
    UpdateTradeHistory(message.data.history);
  if (message.data.historyUser)
    UpdateTradeHistoryUser(message.data.historyUser);
    
  let chatHeader = "<span>Chat</span>";
  if (message.data.online != undefined)
    chatHeader = '<span>Online: </span><strong>'+message.data.online+'</strong>';
    //$('#id_chat_header').html('<span>Online: </span><strong>'+message.data.online+'</strong>')
  if (message.data.allusers != undefined && message.data.allusers > 0)
    chatHeader = '<span>Online: </span><strong>'+message.data.online+'</strong>&nbsp&nbsp(Registered: '+ message.data.allusers +')';
    
  $('#id_chat_header').html(chatHeader);
}

function UpdatePairBalance(message)
{
  
}

function UpdateTradeHistory(history)
{
  $('#id_trade_history').empty();
  for (var i=0; i<history.length; i++)
  {
    if (!history[i].time || history[i].volume*1 == 0)
      continue;
      
    history[i].buysell = history[i].buysell == 'sell' ? 'buy' : 'sell';
    
    const typeColor = history[i].buysell == 'sell' ? "text-danger" : "text-success";
    
    const volume = utils.MakePrice(history[i].volume);
    const price = utils.MakePrice(history[i].fromBuyerToSeller/history[i].volume);
    const tr = $('<tr></tr>')
      .append($('<td>'+utils.timeConverter(history[i].time*1)+'</td>'))
      .append($('<td><span class="'+typeColor+'">'+history[i].buysell+'</span></td>'))
      .append($('<td>'+volume+'</td>'))
      .append($('<td>'+price+'</td>'));
//      .append($('<td>'+(history[i].volume*1).toFixed(8)*1+'</td>'))
//      .append($('<td>'+(history[i].fromBuyerToSeller/history[i].volume).toFixed(8)*1+'</td>'));
    
    $('#id_trade_history').append(tr);
  }
}

function UpdateTradeHistoryUser(history)
{
  $('#id_user_orders_history').empty();
  for (var i=0; i<history.length; i++)
  {
    if (!history[i].time || history[i].volume*1 == 0)
      continue;
      
    //history[i].buysell = history[i].buysell == 'sell' ? 'buy' : 'sell';
    
    const typeColor = history[i].buysell == 'sell' ? "text-danger" : "text-success";
    const tr = $('<tr></tr>')
      .append($('<td>'+utils.timeConverter(history[i].time*1)+'</td>'))
      .append($('<td><span class="'+typeColor+'">'+history[i].buysell+'</span></td>'))
      .append($('<td>'+(history[i].volume*1).toFixed(8)*1+'</td>'))
      .append($('<td>'+(history[i].fromBuyerToSeller/history[i].volume).toFixed(8)*1+'</td>'));
    
    $('#id_user_orders_history').append(tr);
  }
}

function UpdateOrders(orders)
{
  if (!orders.buy || !orders.sell)
    return;
    
  $('#id_buy_orders_body').empty();
  $('#id_sell_orders_body').empty();
  
  var volumeBuy = 0.0;
  var volumeBuyPair = 0.0;
  for (var i=0; i<orders.buy.length; i++)
  {
    const price = utils.MakePrice(orders.buy[i].price);//(orders.buy[i].price*1.0).toFixed(8)*1;
    const amountMain = utils.MakePrice(orders.buy[i].price*orders.buy[i].amount); //(orders.buy[i].price*orders.buy[i].amount*1.0).toFixed(8)*1;
    const amountPair = utils.MakePrice(orders.buy[i].amount); //(orders.buy[i].amount*1.0).toFixed(8)*1;

    const delButton = $('<a href="#" title="Delete orders" class="del_order_button" style="text-decoration: none">&#10006;&nbsp</a>').hide();
    delButton.on('click', e => {
      e.preventDefault();
      socket.send(JSON.stringify({request: 'del_orders', message: {coinName: g_CurrentPair, price: price}}));
    });
    
    const tr = $('<tr></tr>')
      .append($('<td>'+price+'</td>'))
      .append($('<td>'+amountMain+'</td>'))
      .append($('<td>'+amountPair+'</td>'))
      .append(delButton);
      
    volumeBuy += amountMain*1;
    volumeBuyPair += amountPair*1;
    
    const curVolumeBuy = (volumeBuy*1.0).toFixed(8)*1;
    const curVolumePair = (volumeBuyPair*1.0).toFixed(8)*1;
    
    tr.on('click', e => {
      $('#inputSellAmount').val(curVolumePair);
      $('#inputSellPrice').val(price);
      UpdateSellComission();
    });
      

    $('#id_buy_orders_body').append(tr);
  }
  
  if (orders.volumes && orders.volumes.length && orders.volumes[0].sum_amount_price)
    volumeBuy = orders.volumes[0].sum_amount_price
  
  $('#id_buy_volume').text(" " + (volumeBuy*1).toFixed(8)*1+" "+coinNameToTicker[utils.MAIN_COIN].ticker);
  
  var volumeSell = 0.0;
  var volumeSellPair = 0.0;
  for (var i=0; i<orders.sell.length; i++)
  {
    const price = utils.MakePrice(orders.sell[i].price); //(orders.sell[i].price*1.0).toFixed(8)*1;
    const amountMain = utils.MakePrice(orders.sell[i].price*orders.sell[i].amount); //(orders.sell[i].price*orders.sell[i].amount*1.0).toFixed(8)*1;
    const amountPair = utils.MakePrice(orders.sell[i].amount); //(orders.sell[i].amount*1.0).toFixed(8)*1;
    
    const delButton = $('<a href="#" title="Delete orders" class="del_order_button" style="text-decoration: none">&#10006;&nbsp</a>').hide();
    delButton.on('click', e => {
      e.preventDefault();
      socket.send(JSON.stringify({request: 'del_orders', message: {coinName: g_CurrentPair, price: price}}));
    });
    
    const tr = $('<tr></tr>')
      .append($('<td>'+price+'</td>'))
      .append($('<td>'+amountMain+'</td>'))
      .append($('<td>'+amountPair+'</td>'))
      .append(delButton);
      
    volumeSell += amountPair*1;
    volumeSellPair += amountMain*1;
    
    const curVolumeSell = (volumeSell*1.0).toFixed(8)*1;
    const curVolumePair = (volumeSellPair*1.0).toFixed(8)*1;
    
    tr.on('click', e => {
      $('#inputBuyAmount').val(curVolumeSell);
      $('#inputBuyPrice').val(price);
      UpdateBuyComission();
    });


    $('#id_sell_orders_body').append(tr);
  }

  if (orders.volumes && orders.volumes.length>1 && orders.volumes[1].sum_amount)
    volumeSell = orders.volumes[1].sum_amount

  $('#id_sell_volume').text(" " + (volumeSell*1).toFixed(8)*1+" "+coinNameToTicker[g_CurrentPair].ticker);
  
  if (!orders.buy.length)
    orders.buy = [{price: 0.0}];
  if (!orders.sell.length)
    orders.sell = [{price: 0.0}];
  
  const txtBuyPrice = utils.MakePrice(orders.buy[0].price);
  const txtSellPrice = utils.MakePrice(orders.sell[0].price);
  
  const askButton = $('<button type="button" class="p-0 btn btn-link"></button>').append(txtBuyPrice).on('click', e => {
        $('#inputBuyPrice').val(txtBuyPrice);
      })
  const bidButton = $('<button type="button" class="p-0 btn btn-link"></button>').append(txtSellPrice).on('click', e => {
        $('#inputSellPrice').val(txtSellPrice);
      })
  
  $('#id_max_bid').empty().append(bidButton); //.text(utils.MakePrice(orders.buy[0].price)); //((orders.buy[0].price*1.0).toFixed(8)*1);
  $('#id_max_ask').empty().append(askButton); //.text(utils.MakePrice(orders.sell[0].price)); //((orders.sell[0].price*1.0).toFixed(8)*1);
  
  if ($('#inputSellPrice').val().length == 0) $('#inputSellPrice').val($('#id_max_bid').text());
  if ($('#inputBuyPrice').val().length == 0) $('#inputBuyPrice').val($('#id_max_ask').text());
  
  $('#id_max_bid_coin').text(utils.MAIN_COIN);
  $('#id_max_ask_coin').text(utils.MAIN_COIN);
  
  UpdatePageWithRole();
  
}

function UpdateUserOrders(userOrders)
{
  $('#id_user_orders').empty();
  
  for (var i=0; i<userOrders.length; i++)
  {
    if (unescape(userOrders[i].coin) != g_CurrentPair)
      continue;
      
    const orderID = userOrders[i].id;
    
    const close = $('<button type="button" class="btn btn-primary btn-sm">Close</button>').on('click', e => {
      $('#loader').show();
      $("html, body").animate({ scrollTop: 0 }, "slow");
      $.post( "/closeorder", {orderID: orderID}, function( data ) {
        $('#loader').hide();
        if (data.result != true)
        {
          utils.alert_fail(data.message);
          return;
        }
        utils.alert_success('Your order is closed!');
        socket.send(JSON.stringify({request: 'getpair', message: [utils.MAIN_COIN, g_CurrentPair]}));
      }, "json" );
    });
    
    const typeColor = userOrders[i].buysell == 'sell' ? "text-danger" : "text-success";
    const tr = $('<tr></tr>')
      .append($('<td>'+utils.timeConverter(userOrders[i].time*1)+'</td>'))
      .append($('<td><span class="'+typeColor+'">'+userOrders[i].buysell+'</span></td>'))
      .append($('<td>'+(userOrders[i].amount*1).toFixed(8)*1+' '+coinNameToTicker[g_CurrentPair].ticker+'</td>'))
      .append($('<td>'+(userOrders[i].price*1).toFixed(8)*1+" "+coinNameToTicker[utils.MAIN_COIN].ticker+'</td>'))
      .append($('<td></td>').append(close));
      
    $('#id_user_orders').append(tr);
  }
}

function UpdateBalance(message)
{
  var buyBalance = 0.0;
  var sellBalance = 0.0;
  
  if (message.coin && (message.balance != undefined))
  {
    if (unescape(message.coin.name) == utils.MAIN_COIN)
    {
      $('#id_balance_spiner1').hide();
      $('#id_buy_balance').empty();
      buyBalance = (message.balance*1.0).toFixed(8)*1;
      if (buyBalance < 0) buyBalance = 0.0;
      
      const txtBalance = buyBalance;
      const balanceButton = $('<button type="button" class="p-0 btn btn-link"></button>').append(txtBalance).on('click', e => {
        $('#inputBuyTotal').val(txtBalance);
        UpdateBuyComissionFromTotal();
      })
      
      $('#id_buy_balance').append(balanceButton); //.text(buyBalance);
      //$('#id_buy_coin').text(utils.MAIN_COIN);
    }
    if (unescape(message.coin.name) == g_CurrentPair)
    {
      $('#id_balance_spiner2').hide();
      $('#id_sell_balance').empty();
      sellBalance = (message.balance*1.0).toFixed(8)*1;
      if (sellBalance < 0) sellBalance = 0.0;

      const txtBalance = sellBalance;
      const balanceButton = $('<button type="button" class="p-0 btn btn-link"></button>').append(txtBalance).on('click', e => {
        $('#inputSellAmount').val(txtBalance);
        UpdateSellComission();
      })

      $('#id_sell_balance').append(balanceButton); //.text(sellBalance);
      //$('#id_sell_coin').text(g_CurrentPair);
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
  try 
  {
    const comission = utils.COMISSION*amount*price;
    const total = amount*price+comission;
    $('#inputBuyComission').val(comission.toFixed(8)*1);
    $('#inputBuyTotal').val(total.toFixed(8)*1);
  }
  catch(e) {}
}

function UpdateBuyComissionFromTotal()
{
  const total = $('#inputBuyTotal').val()*1 || 0.0001;
  const price = $('#inputBuyPrice').val()*1 || 0.0001;
  try 
  {
    const amount = (total / (price + utils.COMISSION*price)).toFixed(8)*1;
    const comission = utils.COMISSION*amount*price;
    $('#inputBuyComission').val(comission.toFixed(8)*1);
    $('#inputBuyAmount').val(amount.toFixed(8)*1);
  }
  catch(e) {}
  
  //UpdateBuyComission();
}
function UpdateSellComissionFromTotal()
{
  const total = $('#inputSellTotal').val()*1 || 0.0001;
  const price = $('#inputSellPrice').val()*1 || 0.0001;
  try 
  {
    const amount = (total / (price + utils.COMISSION*price)).toFixed(8)*1;
    const comission = utils.COMISSION*amount*price;
    $('#inputSellComission').val(comission.toFixed(8)*1);
    $('#inputSellAmount').val(amount.toFixed(8)*1);
  }
  catch(e) {}
  //UpdateSellComission();
}

function UpdateSellComission()
{
  const amount = $('#inputSellAmount').val() || 0;
  const price = $('#inputSellPrice').val() || 0;
  try 
  {
    const comission = utils.COMISSION*amount*price;
    const total = amount*price+comission;
    $('#inputSellComission').val(comission.toFixed(8)*1);
    $('#inputSellTotal').val(total.toFixed(8)*1);
  }
  catch(e) {}
  
}

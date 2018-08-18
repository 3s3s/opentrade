'use strict';

try
{
google.charts.load('current', {packages: ['corechart']});
google.charts.setOnLoadCallback(drawChart);
}
catch(e)
{
  
}

let g_LB_Data = {};
//let g_MC_BTC_Price = 1000000;
let g_CurrentPair = utils.DEFAULT_PAIR;
let g_currentChartPeriod = 24;

$(() => {
    const currentPair = storage.getItemS('CurrentPair');
    if (currentPair != null)
        g_CurrentPair = currentPair.value;

    const ChartPeriod = storage.getItem('ChartPeriod');
    if (ChartPeriod != null)
        g_currentChartPeriod = ChartPeriod.value;

    utils.CreateSocket(onSocketMessage, onOpenSocket);

    UpdateBTCFromLB();
    setInterval(UpdateBTCFromLB, 30000);
});

function UpdateBTCFromLB()
{
  const cntObject = storage.getItem('coinNameToTicker');
  if (cntObject == null || !cntObject.value)
      return;
  const coinNameToTicker = cntObject.value;

  const BTC_price = storage.getItem("BTC_LTC_Price");
  const g_BTC_LTC_Price = (BTC_price == null || !BTC_price.value) ? 1000000 : BTC_price.value;
  
  const BTC = coinNameToTicker[utils.MAIN_COIN] ? coinNameToTicker[utils.MAIN_COIN].ticker || 'BTC' : 'BTC';
  
  fetch('/bitcoinaverage/ticker-all-currencies/')
    .then(response => {
      if (response.status !== 200)
        return;
      return response.json();
    })
    .then( data => {
      g_LB_Data = data;
      UpdateBTCInfo();
    });
    
    function UpdateBTCInfo() {
      if (!g_LB_Data || !g_LB_Data.USD || !g_LB_Data.RUB)
        return;
      
      if (BTC == 'LTC') g_BTC_LTC_Price = 0;
        
      const USD = g_LB_Data.USD.rates.last/(g_BTC_LTC_Price+1);
      const BTC = 1/(g_BTC_LTC_Price+1);
      const EUR = g_LB_Data.EUR.rates.last/(g_BTC_LTC_Price+1);
      const RUB = g_LB_Data.RUB.rates.last/(g_BTC_LTC_Price+1);
      
      $('#id_BTC_info').empty();
      if (BTC != 'LTC')
      {
        $('#id_BTC_info').append($('<li class="breadcrumb-item">1 ' + BTC + ' = '+LTC.toFixed(8)+' BTC</li>'));
        $('#id_BTC_info').append($('<li class="breadcrumb-item">'+USD.toFixed(3)+' USD</li>'));
        $('#id_BTC_info').append($('<li class="breadcrumb-item">'+EUR.toFixed(3)+' EUR</li>'));
      }
      else
      {
        $('#id_BTC_info').append($('<li class="breadcrumb-item">1 ' + BTC + ' = '+USD.toFixed(2)+' USD</li>'));
        $('#id_BTC_info').append($('<li class="breadcrumb-item">'+EUR.toFixed(2)+' EUR</li>'));
      }
      
      $('#id_BTC_info').append($('<li class="breadcrumb-item">'+RUB.toFixed(2)+' RUB</li>'));
    }
}


function onOpenSocket()
{
  socket.send(JSON.stringify({request: 'getchart', message: [utils.MAIN_COIN, g_CurrentPair, g_currentChartPeriod]}));
  setInterval(() => {  socket.send(JSON.stringify({request: 'getchart', message: [utils.MAIN_COIN, g_CurrentPair, g_currentChartPeriod]}));}, 60000)
}

function onSocketMessage(event)
{
  var data = {};
  try { data = JSON.parse(event.data); }
  catch(e) {return;}
  
  if (!data.request || data.request == 'error' || !data.message)
    return;
    
  if (data.request == 'chartdata')
  {
    if (data.message.data.chart)
      drawChart(data.message.data.chart);
    return;
  }
}

let g_TableLengthPrev = 0;
function drawChart(chartData)
{
  try
  {
    if (!chartData.length)
      return;
    if (!google.visualization || !google.visualization['arrayToDataTable'])
      return setTimeout(drawChart, 1000, chartData);
    
    SetChartLegend()
      
    var tmp = [];
    for (var j=chartData.length-1; j>=0; j--)
      tmp.push(chartData[j]);
      
    chartData = tmp;
    
    const group = 
      (g_currentChartPeriod == 24) ? 360000 :
      (g_currentChartPeriod == 250) ? 3600000 :
      (g_currentChartPeriod == 1000) ? 14400000 :
      (g_currentChartPeriod == 6000) ? 86400000 : 360000;

    var table = [];
    for (var i=0; i<chartData.length; i++)  
    {
      const time = utils.timeConverter(chartData[i].t10min*group, true);
      //const time = new Date(chartData[i].t10min*360000);
      const timeStart = chartData[i].t10min;
      
      var min = chartData[i].avg_10min;
      var init = chartData[i].avg_10min;
      var final = chartData[i].avg_10min;
      var max = chartData[i].avg_10min;
      
      for (var j=i+1; j<chartData.length; j++)
      {
        if (chartData[j].t10min*1 > timeStart*1+10)
          break;
        
        if (chartData[j].avg_10min*1 < min)
          min = chartData[j].avg_10min;
        if (chartData[j].avg_10min*1 > max)
          max = chartData[j].avg_10min;
          
        final = chartData[j].avg_10min;
        i++;
      }
      
      table.push([time, min/1000000, init/1000000, final/1000000, max/1000000]);
    }
    
    if (!table.length || table.length < g_TableLengthPrev-2)
      return;
      
    g_TableLengthPrev = table.length;
      
    if (table.length > 24)
      table = table.slice(table.length - 24);
      
    var data = google.visualization.arrayToDataTable(table, true);
    var options = {
        //title: g_CurrentPair,
        /*hAxis: {
          minValue: 0,
          maxValue: 24,
          ticks: [0, 4, 8, 12, 16, 20, 24]
        },*/
        //width: 800,
        legend: 'none',
        explorer: {
                axis: 'horizontal',
                keepInBounds: true,
                maxZoomIn: 4.0
        }
    };
    
    var chart = new google.visualization.CandlestickChart(document.getElementById('chart_div'));
    chart.draw(data, options);
    
  }
  catch(e)
  {
    
  }
}

function SetChartLegend()
{
    const cntObject = storage.getItem('coinNameToTicker');
    if (cntObject == null || !cntObject.value)
        return;
    const coinNameToTicker = cntObject.value;
    
    if (!coinNameToTicker[g_CurrentPair] || !coinNameToTicker[g_CurrentPair].ticker || !coinNameToTicker[utils.MAIN_COIN])
        return setTimeout(SetChartLegend, 1000);

    
  const BTC = coinNameToTicker[utils.MAIN_COIN].ticker; 
  const COIN = coinNameToTicker[g_CurrentPair].ticker
  

  $.getJSON( "/api/v1/public/getmarketsummary?market="+MC+"-"+COIN+"&period="+g_currentChartPeriod, ret => {
    if (!ret || !ret.success || ret.success != true || MC != coinNameToTicker[utils.MAIN_COIN].ticker || COIN != coinNameToTicker[g_CurrentPair].ticker) 
      return;
    
    AddCoinInfo(ret);
    
    const group = 
      (g_currentChartPeriod == 24) ? '24h: ' :
      (g_currentChartPeriod == 250) ? '7d: ' :
      (g_currentChartPeriod == 1000) ? '1M: ':
      (g_currentChartPeriod == 6000) ? '6M: ': '24h: ';

    const legend = $(
      '<ul class="nav" style="line-height: 30px;">'+
        '<li class="nav-item mr-3"><img src="'+unescape(ret.result.coin_icon_src)+'" width=40 /></li>'+
        '<li class="nav-item mr-3"><h4>'+COIN+' / '+MC+'</h4></li>'+
        '<li class="nav-item mr-2 ml-3">'+group+'High: '+(ret.result.High*1).toFixed(4)+'</li>'+
        '<li class="nav-item mr-2 ml-3">Low: '+(ret.result.Low*1).toFixed(4)+'</li>'+
        '<li class="nav-item mr-2 ml-3">Vol: '+(ret.result.Volume*1).toFixed(4)+'</li>'+
      '</ul>'
      )//('<h4>'+COIN+' / '+MC+'</h4>');
    $('#chart_legend').empty();
    $('#chart_legend').append(legend);
    
    const button24 = $('<button type="button" class="btn btn-outline-dark btn-sm"><small>24 Hours</small></button>').on('click', e => {storage.setItem('ChartPeriod', 24); location.reload();});
    const button250 = $('<button type="button" class="btn btn-outline-dark btn-sm"><small>7 Days</small></button>').on('click', e => {storage.setItem('ChartPeriod', 250); location.reload();});
    const button1000 = $('<button type="button" class="btn btn-outline-dark btn-sm"><small>1M</small></button>').on('click', e => {storage.setItem('ChartPeriod', 1000); location.reload();});
    const button6000 = $('<button type="button" class="btn btn-outline-dark btn-sm"><small>6M</small></button>').on('click', e => {storage.setItem('ChartPeriod', 6000); location.reload();});
    
    const buttons = $('<nav class="nav nav-pills"></nav>')
      .append($('<li class="nav-item"></li>').append(button24))
      .append($('<li class="nav-item"></li>').append(button250))
      .append($('<li class="nav-item"></li>').append(button1000))
      .append($('<li class="nav-item"></li>').append(button6000));
      
    $('#chart_legend').append(buttons);
  });
}

function AddCoinInfo(info)
{
  if (!info.result || !info.result.coin_info || !info.result.coin_info.page)
    return;
    
  $('#coin_legend').text(g_CurrentPair);
  
  const p1 = $('<p><strong>Forum</strong> ANN thread <a target="_blank" href="'+(info.result.coin_info.page || "")+'">'+g_CurrentPair+' on Bitcointalk</a></p>');
  $('#coin_info').empty().append(p1);
}

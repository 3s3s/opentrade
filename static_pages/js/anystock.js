'use strict';
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

});
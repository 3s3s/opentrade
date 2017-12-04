'use strict';

exports.object = {
    c : function(strCoin) {
        try {
            return exports.object[strCoin][exports.object.coin];
        }
        catch(e) {
            return strCoin;
        }
    },
    l : function(str) {
        try {
            return this.dict['_words_'][str][this.dict.lang];
        }
        catch(e) {
            return str;
        }
    },
    setLanguage : function(lang) {
        if (lang == 'en')
            this.lang = 0;
        if (lang == 'ru')
            this.lang = 1;
    },
    'lang' : 0,
    '_words_' : {
        'Buy' : ['Buy', 'Купить'],
        'Sell' : ['Sell', 'Продать'],
        'buy' : ['buy', 'купить'],
        'sell' : ['sell', 'продать'],
        'Buying' : ['Buying', 'Покупка'],
        'Selling' : ['Selling', 'Продажа']
    }
};

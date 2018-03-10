'use strict';

$('#id-button-lang-en').on('click', e => {
    utils.setCookie('lang', 'en');
    location.reload(); 
})

$('#id-button-lang-ru').on('click', e => {
    utils.setCookie('lang', 'ru');
    location.reload(); 
})
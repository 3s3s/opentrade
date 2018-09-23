'use strict';

$('#id-button-lang-en').on('click', e => {
    utils.setCookie('lang', 'en');
    location.reload(); 
})

$('#id-button-lang-ru').on('click', e => {
    utils.setCookie('lang', 'ru');
    location.reload(); 
})

function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function eraseCookie(name) {
    utils.setCookie(name, "", -1);
}

$("input#mode").change(function() {
if ($(this).is(':checked')) {
$("body").addClass('dark-mode');
utils.setCookie('mode', 'dark-mode');
} else {
$("body").removeClass('dark-mode');
eraseCookie("mode", "dark-mode");
}
});

if (readCookie("mode")) {
$("body").addClass('dark-mode');
$('input#mode').attr('checked', 'checked');
}

'use strict';

$(() => {
    if (window.location.search.length > 1 && $('#id_token').val().length == 0)
        $('#id_token').val(window.location.search.substr(7));
});

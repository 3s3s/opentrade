'use strict';

$('#pin_check_form').submit(e => {
    e.preventDefault();
    
    let query = window.location.search.substring(1);
    let vars = query.split('&');
    let user = '';
    for (let i = 0; i < vars.length; i++) {
        let pair = vars[i].split('=');
        if (decodeURIComponent(pair[0]) == 'user') {
            user = decodeURIComponent(pair[1]);
            break;
        }
    }
    
    $('#loader').show();
    $("html, body").animate({ scrollTop: 0 }, "slow");
    $.post( "/verifypin?user="+user, $( '#pin_check_form' ).serialize(), data => {
        $('#loader').hide();
        
        if (data.result != true)
            return utils.alert_fail(data.message);

        window.location.href = "https://"+window.location.hostname+($('#id_redirect').val() || "/");
    }, "json" );
})

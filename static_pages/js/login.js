'use strict';

$(() => {
    $('#submit-id-submit').click(event => {
        event.preventDefault();
        if (!validate())
            return;
        onSubmit();
    });
});

function onSubmit()
{
    $('#loader').show();
    $("html, body").animate({ scrollTop: 0 }, "slow");
    $.post( "/login", $( '.login-form' ).serialize(), function( data ) {
        if (grecaptcha) grecaptcha.reset();
        
        $('#loader').hide();
        
        if (data.result != true)
            return utils.alert_fail(data.message);
            
        if (data.redirect)
            return window.location.href = "https://"+window.location.hostname+(data.redirect);

        window.location.href = "https://"+window.location.hostname+($('#id_redirect').val() || "/");
    }, "json" );
    
    
}

function validate()
{
    if ($("#id_username")[0].value == "" || $("#id_password")[0].value.length == 0)
        return false;

    return true;
}

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
        {
            //$('#alert-fail').html(data.message);
            //$('#alert-fail').show();
            utils.alert_fail(data.message);
            return;
        }
        window.location.href = "https://"+window.location.hostname+($('#id_redirect').val() || "/");
        //window.location.pathname = $('#id_redirect').val() || "/";
    }, "json" );
    
    
}

function validate()
{
    if ($("#id_username")[0].value == "" || $("#id_password")[0].value.length == 0)
        return false;

    return true;
}

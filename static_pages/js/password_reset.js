'use strict';

function onload()
{
    $('#button_reset').click(event => {
        event.preventDefault();
        if (!validate())
            return;
        grecaptcha.execute();
    });
}

function validate()
{
    $('#id_email').removeClass("is-invalid");

    if (!utils.ValidateEmail($("#id_email")[0].value))
    {
        $('#id_email').addClass("is-invalid");
        return false;
    }
    return true;
}

function onSubmit(token)
{
    $.post( "/password_reset", $( '#password_reset_form' ).serialize(), function( data ) {
        grecaptcha.reset();
        if (data.result != true)
        {
            return;
        }
        window.location.pathname = data.redirect || '/login';
    }, "json" );
    
    
}

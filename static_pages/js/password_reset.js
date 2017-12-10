'use strict';

function onload()
{
    $('#button_reset').click(event => {
        event.preventDefault();
        if ($('#new_password').length)
        {
            onSubmit();
            return;
        }
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
    $('#first-step').hide();
    $('#loader').show();
    $.post( "/password_reset", $( '#password_reset_form' ).serialize(), function( data ) {
        if (token) 
            grecaptcha.reset();
        $('#loader').hide();
        if (data.result != true)
        {
            $('#second-step-error').show();
            return;
        }
        $('#second-step-success').show();
    }, "json" );
    
    
}

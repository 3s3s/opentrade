'use strict';

function onload()
{
    $('#second-step').hide();
    grecaptcha.reset();
    $('#register-page-confirm-button').click(event => {
        event.preventDefault();
        if (!validate())
            return;
        grecaptcha.execute();
    });
}

function validate()
{
    $('#id_password2').removeClass("is-invalid");
    $('#id_email').removeClass("is-invalid");

    if ($("#id_username")[0].value == "" || $("#id_password1")[0].value.length == 0)
        return false;

    if (!utils.ValidateEmail($("#id_email")[0].value))
    {
        $('#id_email').addClass("is-invalid");
        return false;
    }

    if ($("#id_password1")[0].value != $("#id_password2")[0].value)
    {
        $('#id_password2').addClass("is-invalid");
        return false;
    }
    
    return true;
}

function onSubmit(token)
{
    $('#first-step').hide();
    $('#loader').show();
    $.post( "/signup", $( '#signup-form' ).serialize(), function( data ) {
        grecaptcha.reset();
        $('#loader').hide();
        $('#second-step').show();
        
        $('#fail').hide();
        $('#success').hide();
        if (data.result != true)
        {
            $('#fail').show();
            return;
        }
        $('#success').show();
    }, "json" );
    
    
}

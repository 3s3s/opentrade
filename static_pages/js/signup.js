'use strict';

$(() => {
    $('#second-step').hide();
    $('#register-page-confirm-button').click(event => {
        event.preventDefault();
        if (!validate())
            return;
        onSubmit();
    });
});

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

function onSubmit()
{
    $('#first-step').hide();
    $('#loader').show();
    $.post( "/signup", $( '#signup-form' ).serialize(), function( data ) {
        $('#loader').hide();
        $('#second-step').show();
        
        $('#fail').hide();
        $('#success').hide();
        if (data.result != true)
        {
            $('#alert-fail').text(data.message);
            $('#alert-fail').show();
            $('#fail').show();
            return;
        }
        $('#success').show();
    }, "json" );
}

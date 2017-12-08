'use strict';

function onload()
{
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
    
   /* function GotRequiredField(field)
    {
        $('#signup_'+field).removeClass("has-danger");
        $('#id_'+field).removeClass("is-invalid");
        $('#error_'+field).remove();
        
        if ($("#id_"+field)[0].value != "")
            return true;

        $('#signup_'+field).addClass("has-danger");
        $('#id_'+field).addClass("is-invalid");
        $('<div id="error_'+field+'" class="invalid-feedback">This field is required.</div>').insertAfter('#id_'+field);
        //$('<p id="error_'+field+'" class="form-text text-muted"><strong>This field is required.</strong></p>').insertAfter('#id_'+field)
        return false;
    }*/
}

function onSubmit(token)
{
    $.post( "/signup", $( '#signup-form' ).serialize(), function( data ) {
        grecaptcha.reset();
        if (data.result != true)
        {
            return;
        }
        window.location.pathname = data.redirect || '/login';
    }, "json" );
    
    
}

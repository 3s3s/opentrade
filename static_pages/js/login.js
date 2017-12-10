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
    $.post( "/login", $( '.login-form' ).serialize(), function( data ) {
        grecaptcha.reset();
        if (data.result != true)
        {
            return;
        }
        window.location.pathname = data.redirect || '/';
    }, "json" );
    
    
}

function validate()
{
    if ($("#id_username")[0].value == "" || $("#id_password")[0].value.length == 0)
        return false;

    return true;
}

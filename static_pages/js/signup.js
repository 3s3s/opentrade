'use strict';

$(() => {
    $('#register-page-confirm-button').click(event => {
        event.preventDefault();
        if (!validate())
            return;
        grecaptcha.execute();
    });
});

function validate()
{
    return true;
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

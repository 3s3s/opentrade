'use strict';

$(() => {
    $('#submit-id-submit').click(event => {
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
    $.post( "/login", $( '.login-form' ).serialize(), function( data ) {
        grecaptcha.reset();
        if (data.result != true)
        {
            return;
        }
        window.location.pathname = data.redirect || '/';
    }, "json" );
    
    
}

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
    alert('captcha ready');
    //$('.login-form').submit();

    $.post( "/login", $( '.login-form' ).serialize(), function( data ) {
        grecaptcha.reset();
        /*$("html, body").animate({ scrollTop: 0 }, "slow");
        if (data.status == 'fail' || !data.tx)
        {
            $('#id_error_message').html("ERROR: "+ data.message);
            $('#id_error_message').removeClass('hidden');
            return;
        }
        $('#id_success_message').html("SUCCESS: <a href='http://mc.multicoins.org/transaction/"+data.tx+"'>"+ data.tx+"</a>");
        $('#id_success_message').removeClass('hidden');*/
        
    }, "json" );
    
    
}

'use strict';

$(() => {
    $('#button_reset').click(event => {
        event.preventDefault();
        if ($('#new_password').length)
        {
            onSubmit();
            return;
        }
        if (!validate())
            return;
        onSubmit();
    });
});

function validate()
{
    $('#id_email').removeClass("is-invalid");
    
    $("#id_email").val($("#id_email")[0].value.toLowerCase());
    if (!utils.ValidateEmail($("#id_email")[0].value))
    {
        $('#id_email').addClass("is-invalid");
        return false;
    }
    return true;
}

function onSubmit()
{
    $('#first-step').hide();
    $('#loader').show();
    $.post( "/password_reset", $( '#password_reset_form' ).serialize(), function( data ) {
        $('#loader').hide();
        if (data.result != true)
        {
            $('#second-step-error').show();
            return;
        }
        $('#second-step-success').show();
    }, "json" );
}

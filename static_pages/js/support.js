'use strict';

$(() => {
    $('#submit-button').click(event => {
        event.preventDefault();
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
    $('#loader').show();
    $.post( "/support", $( '#support-form' ).serialize(), function( data ) {
        $('#loader').hide();

        grecaptcha.reset();
        if (data.result != true)
        {
            //$('#alert-fail').text(data.message);
            //$('#alert-fail').show();
            utils.alert_fail(data.message);
            return;
        }
        //$('#alert-success').text('Success! Your message has been sent to support');
        //$('#alert-success').show();
        utils.alert_success('Success! Your message has been sent to support');
        $('id_firststep').hide();
    }, "json" );
}

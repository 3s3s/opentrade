'use strict';

$(() => {
    $('#second-step').hide();
    $('#profile-page-confirm-button').click(event => {
        event.preventDefault();
        if (!validate())
            return;
        onSubmit();
    });
});

function validate()
{
    $('#id_password').removeClass("is-invalid");
    $('#id_password1').removeClass("is-invalid");
    $('#id_password2').removeClass("is-invalid");
    $('#id_email').removeClass("is-invalid");

    if ($("#id_username")[0].value == "" || $("#id_password")[0].value.length == 0)
        return false;

    $("#id_email").val($("#id_email")[0].value.toLowerCase());
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
    $('#loader').show();
    $("html, body").animate({ scrollTop: 0 }, "slow");
    $.post( "/profile", $( '#profile-form' ).serialize(), function( data ) {
        $('#loader').hide();
        if (data.result != true)
        {
            //$('#alert-fail').text(data.message);
            //$('#alert-fail').show();
            utils.alert_fail(data.message);
            return;
        }
        //$('#alert-success').text(data.message);
        //$('#alert-success').show();
        utils.alert_success(data.message);
    }, "json" );
}

$(document).ready(function() {
    var usernameContainer = $('#username').closest('.control-group');
    var passwordContainer = $('#password').closest('.control-group');
    var noAuthRequiredElement = $('.no-auth-required');
    var authRequired = function() {
        if(authServer.indexOf($('#url').val()) > -1) {
            usernameContainer.removeClass('hide');
            passwordContainer.removeClass('hide');
            noAuthRequiredElement.addClass('hide');
        } else {
            usernameContainer.addClass('hide');
            passwordContainer.addClass('hide');
            noAuthRequiredElement.removeClass('hide');
        }
    };
    $('#url').change(authRequired);
    authRequired();
});

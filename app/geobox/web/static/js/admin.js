$(document).ready(function() {
    $('#localnet').click(function() {
        $.postURL($(this).data('toggle_localnet_access_url'));
    });

    $('.remove').click(function() {
       	$.postURL($(this).data('remove-url'));
    });

});
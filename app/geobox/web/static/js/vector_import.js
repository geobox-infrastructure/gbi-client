var c = 0;

$(document).ready(function() {
    $('#file_upload').fileupload({
        add: function( e, data) {
            c = c +1;
            data.submit();
        },
        done: function( e, data ){
            c = c -1
            if( c == 0 ) {
                location.reload();
            }
        }
    });
});

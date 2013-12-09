// #name should be filled with filename (without extension)
// if no layername was typed in and no layer selected
$(document).ready(function() {
    var previousLayername = false;
    $('#file_name').focus(function() {
        previousLayername = toLayername(this.value);
    }).change(function() {
        var currentName = $('#name').val()
        if((!currentName || currentName == previousLayername) && $('#layers')[0].selectedIndex == 0) {
            $('#name').val(toLayername(this.value));
        }
        $(this).blur();
    });

    $('#layers').change(function() {
        if(this.selectedIndex == 0 && $('#file_name')[0].selectedIndex != 0 && !$('#name').val()) {
            $('#name').val(toLayername($('#file_name').val()))
        } else if($('#name').val() == toLayername($('#file_name').val())) {
            $('#name').val('');
        }
    })
});

function toLayername(filename) {
    var regex = /(.*)\.[^.]+$/
    return filename ? regex.exec(filename)[1] : undefined;
}

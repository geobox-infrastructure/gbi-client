$(document).ready(function() {
   $('.remove_layer').click(function() {
     $.postURL($(this).data('layer_remove_url'));
   });
   $('.start_task').click(function() {
     $.postURL($(this).data('start_task_url'));
   });

    $('.remove').click(function() {
       	$.postURL($(this).data('remove-url'));
    });

});

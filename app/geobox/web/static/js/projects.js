$(document).ready(function() {
   $('.remove_layer').click(function() {
     $.postURL($(this).data('layer_remove_url'));
   });
});

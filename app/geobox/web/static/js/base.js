(function($) {
    $.extend({
        postURL: function(url) {
            var form = $("<form>")
                .attr("method", "post")
                .attr("action", url);
            form.appendTo("body");
            form.submit();
        }
    });

    $(".tooltip_element").tooltip({content:"tooltip_content"})

})(jQuery);

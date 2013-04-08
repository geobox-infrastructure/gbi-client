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

    $('.tooltip_element').tooltip({
        delay: { show: 500, hide: 100 },
        placement: 'right'
    });

})(jQuery);

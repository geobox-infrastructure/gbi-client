jQuery.fn.tooltip= function(options) {
    this.each(function(){
        
        var settings = {
            content: "tooltip",
            postion: "absolute",
            width: 200
        };

        if(options) {
            jQuery.extend(settings, options);
        }

        var id = "tooltip_bubble";
        jQuery(this).hover(function() {
            jQuery("body").append(
                "<div id='"+id+"'>"+
                    jQuery(this).children("."+settings.content).text()
                +"</div>");
            var offset = $(this).offset();
            var width = $(this).width() + 10 ;

            jQuery('#'+id).css({
                left: offset.left+width, 
                top: offset.top ,
                position: settings.postion,
                width: settings.width+"px"
            });
            jQuery('#'+id).show();
        },
        function() {
            jQuery("#"+id).remove();
    })

  });
}
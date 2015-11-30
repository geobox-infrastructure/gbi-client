$(document).ready(function() {
   $('#reloadContextDocument').submit(function() {
    	if ($("#server_url").val() && $("#password").val())
    		$("#reloadContextDocumentMsg").show();
    	return true;
    });
});
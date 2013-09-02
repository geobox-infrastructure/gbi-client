$(document).ready(function() {
    $('#loginForm').submit(function() {
    	if ($("#username").val() && $("#password").val())
    	$("#loginLoadingMsg").show();
    	return true;
    });

});
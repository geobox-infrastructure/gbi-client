$(document).ready(function() {
    $('.task_item').each(function(idx, elem) {
        elem = $(elem);
        var isPaused = elem.data('paused');
        var isActive = elem.data('active');
        var isRunning = elem.data('running');
        var status = elem.data('status');

        if (isActive == 'True') {
          if (isRunning == 'True' || (status == 'QUEUED')) {
            elem.find('.remove').attr('disabled', 'disabled');
            elem.find('.start').attr('disabled', 'disabled');
            elem.find('.pause').removeAttr('disabled');
          } else {
            elem.find('.start').removeAttr('disabled');
            elem.find('.remove').removeAttr('disabled');
          }
        } else {
          elem.find('.remove').removeAttr('disabled');
          elem.find('.pause').attr('disabled', 'disabled');
          elem.find('.start').attr('disabled', 'disabled');
        }

        if (isPaused == 'True') {
            elem.find('.pause').attr('disabled', 'disabled');
        }

    });
    $('.pause').click(function() {
        $.postURL($(this).data('task_pause_url'))
    });
    $('.start').click(function() {
        $.postURL($(this).data('task_start_url'))
    });
    $('.remove').click(function() {
        $.postURL($(this).data('task_remove_url'))
    });
});

// setup jQuery
var $ = require('../../components/jquery/dist/jquery');
window.jQuery = $;

// bootstrap dropdown
require('../../components/bootstrap/dist/js/umd/dropdown.js');
// bootstrap tooltip
require('../../components/bootstrap/dist/js/umd/tooltip.js');
// bootstrap modals
require('../../components/bootstrap/dist/js/umd/modal.js');

// 
// ui
////////
module.exports = function(app) {

    // enable tooltips
    $('[data-toggle="tooltip"]').tooltip({
        trigger: 'hover'
    });

    // add a locker
    $('body').on('click', '.js-add-locker', function(e){
        e.preventDefault();

        window.bootbox.prompt({ 
            size: 'small',
            title: 'Add Password Group',
            placeholder: 'Group name',
            callback: function(name){ 
                if (name) {
                    app.addLocker(name);
                    $(window).trigger('app-save');
                }
            }
        });
    });

    // remove locker modal
    $('body').on('click', '.js-remove-locker-confirm', function(e){
        e.preventDefault();

        // no locker
        if(!app.locker.current) {
            window.bootbox.alert({
                message: '<i class="ri-alert-line"></i> Select or create a password group first.',
                size: 'small'
            });
            return false;
        }

        // show confirm
        window.bootbox.confirm({
            title: 'Delete "' + app.locker.current + '"',
            size: 'small',
            message: 'Are you sure you want to delete "' + app.locker.current + '"?<br><br><small>This will delete all of the passwords in this group and cannot be undone!</small>',
            callback: function(confirmed) {
                if (confirmed) {
                    app.locker.remove();
                }
            }
        });
    });

    // save
    $('body').on('click', '.js-save', function(e){
        e.preventDefault();
        // save the current locker

        if(!app.locker.current) {
            window.bootbox.alert({
                message: '<i class="ri-alert-line"></i> Select or create a password group first.',
                size: 'small'
            });
            return false;
        }

        $(window).trigger('app-save');
    });
    
    // add a new empty row
    $('body').on('click', '.js-new-row', function(e){
        e.preventDefault();

        if(!app.locker.current) {
            window.bootbox.alert({
                message: '<i class="ri-alert-line"></i> Select or create a password group first.',
                size: 'small'
            });
            return false;
        }

        // add a row
        app.addRow({}, $('.table .tbody'), false );

        // save
        $(window).trigger('app-save');
    });

    // login
     $('body').on('click', '.js-login', function(e){
        e.preventDefault();

        app.login();
    });

    // logout
     $('body').on('click', '.js-logout', function(e){
        e.preventDefault();

        app.logout();
    });

    // download
    $('body').on('click', '.js-download', function(e){
        e.preventDefault();

        if(!app.locker.current) {
            window.bootbox.alert({
                message: '<i class="ri-alert-line"></i> Select or create a password group first.',
                size: 'small'
            });
            return false;
        }

        app.download();
    });

    // sort
    $('body').on('click', '.js-sort', function(e){
        e.preventDefault();

        $(this).toggleClass('desc');
        var sort = $(this).hasClass('desc') ? 'DESC' : 'ASC';
        app.sort(sort);
    });

    // filter
    $('body').on('input', '.js-filter', function(e){
        e.preventDefault();

        app.filter($(this).val());
    });

    // generate a password
    $('body').on('click', '.js-generate', function(e){
        e.preventDefault();

        var password = app.generatePassword();
        var $input = $('<input type="text" class="form-control" value="'+password+'">');
        $(this).before($input);
        $input.select();
        document.execCommand('copy');

        setTimeout(function(){
            $input.remove();
        }, 1000);
        
    });

    // share group
    $('body').on('click', '.js-share-locker', function(e) {

        if(!app.locker.current) {
            window.bootbox.alert({
                message: '<i class="ri-alert-line"></i> Select or create a password group first.',
                size: 'small'
            });
            return false;
        }

        window.bootbox.prompt({ 
            size: 'small',
            title: 'Share "' + app.locker.current + '"',
            placeholder: 'Enter a User\'s Public ID',
            callback: function(shareKey){
                if (shareKey) {
                    app.shareLocker(shareKey);
                }
            }
        });
    });
};
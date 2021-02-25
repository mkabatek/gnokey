
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
    var dialogOpen = false;

    // enable tooltips
    $('[data-toggle="tooltip"]').tooltip({
        trigger: 'hover'
    });

    // prevent dropdowns from closing
    $('body').on('click', '.dropdown-menu .profile', function(e){
        e.stopPropagation();
    });

    // add a locker
    $('body').on('click', '.js-add-locker', function(e){
        e.preventDefault();
        
        if (dialogOpen) return;
        dialogOpen = true;

        window.bootbox.dialog({ 
            message: '<form class="bootbox-form js-add-locker-form"><input name="name" class="bootbox-input bootbox-input-text form-control" autocomplete="off" type="text" placeholder="Group name"><label style="margin-top: 12px;">Import CSV (optional)</label><input name="import" class="bootbox-input bootbox-input-file form-control" autocomplete="off" type="file" placeholder="Import CSV"></form>',
            size: 'small',
            title: 'Add Password Group',
            onEscape: function () {
                dialogOpen = false;
            },
            callback: function() {
                dialogOpen = false;
            },
            buttons: {
                cancel: {
                    label: 'Cancel',
                    className: 'btn-secondary',
                    callback: function () {
                        dialogOpen = false;
                    }
                },
                success: {
                    label: 'Ok',
                    className: 'btn-primary',
                    callback: function () {
                        dialogOpen = false;
                        var name = $('.js-add-locker-form [name="name"]').val();
                        var files = $('.js-add-locker-form [name="import"]').prop('files');

                        if (name) {
                            // parse file
                            if (files.length) {
                                // TODO warn if FilerReader not available?
                                var fileReader = new window.FileReader();
                                fileReader.onload = function () {
                                    var data = fileReader.result;
                                    try {
                                        $.csv.toObjects(data, function(err, results) {
                                            if (err) {
                                                throw new Error('Unable to parse import: ' + err.message);
                                            }
                                            if (!results.length) {
                                                throw new Error('Unable to parse import: no passwords found!');
                                            }
                                            // TODO use a Worker
                                            // https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
                                            app.addLocker(name, results);
                                            $(window).trigger('app-save');
                                        });
                                    } catch(err) {
                                        window.bootbox.alert({
                                            message: '<i class="ri-alert-line"></i> ' + err.message,
                                            size: 'small'
                                        });
                                        app.loading = false;
                                    }
                                    
                                };
                                app.loading = true;
                                fileReader.readAsText(files[0]);
                            } else {
                                // create locker
                                app.addLocker(name);
                                $(window).trigger('app-save');
                            }
                        }
                        
                    }
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
        e.preventDefault();

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
            className: 'js-public-id-dialog',
            required: true,
            callback: function(shareKey){
                if (shareKey) {
                    app.shareLocker(shareKey).then(function(result) {
                        window.bootbox.alert({
                            message: 'Password group successfully shared with ' + result.user,
                            size: 'small',
                            buttons: {
                                ok: {
                                    label: 'Ok',
                                    className: 'btn-success'
                                }
                            }
                        });
                    }).catch(function() {});
                }
            }
        });
    });

    // parse a public id
    $('body').on('input', '.js-public-id-dialog input', function(e){
       var $input = $(e.target);
       var val = $input.val();

        if (val) {
            try {
                var email = app.parseShareKey(val);
                $input.next('.error,.success').remove();
                $input.after('<span class="success">Share with ' + email + '</span>');
            } catch(e) {
                $input.next('.error,.success').remove();
                $input.after('<span class="error">Invalid Public ID</span>');
            }
        } else {
            $input.next('.error,.success').remove();
        }
    });

    // copy public id
    $('body').on('click', '.js-copy-public-id', function(e) {
        var $txtarea = $('.js-public-id');
        $txtarea.select();
        document.execCommand('copy');
    });

    // handle afterLoad
    $(window).on('app-afterLoad', function(app) {
        var queryParams = decodeURI(window.location.search);

        // handle create new group
        if (~queryParams.indexOf('"action":"create"')) {
            $('.js-add-locker').trigger('click');
        }
    });
};
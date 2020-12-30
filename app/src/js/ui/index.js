
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
    $('[data-toggle="tooltip"]').tooltip();
    
    // add a locker
    $('body').on('click', '.js-add-locker', function(e){
        e.preventDefault();

        if($('.js-locker-name').hasClass('active')) {
            var name = $('.js-locker-name').val();
            var index = app.locker.add(name);
            app.locker.change(index);

            $('.js-locker-name').val('');
            $('.js-locker-name').removeClass('active');
            $('.js-add-locker').removeClass('btn-success').addClass('btn-secondary');

            // save
            if (name) {
                $(window).trigger('app-save');
            }
        } else {
            $('.js-locker-name').addClass('active');
            $('.js-add-locker').removeClass('btn-secondary').addClass('btn-success');
        }

    });

    // remove a locker
    $('body').on('click', '.js-remove-locker', function(e){
        e.preventDefault();

        if(!app.locker.current) {
            alert('choose a locker first');
            return false;
        }
        
        // remove the current locker
        app.locker.remove();
    });

    // save
    $('body').on('click', '.js-save', function(e){
        e.preventDefault();
        // save the current locker

        if(!app.locker.current) {
            alert('choose a locker first');
            return false;
        }

        $(window).trigger('app-save');
    });
    
    // add a new empty row
    $('body').on('click', '.js-new-row', function(e){
        e.preventDefault();

        if(!app.locker.current) {
            alert('choose a locker first');
            return false;
        }

        // add a row
        app.addRow({}, $('.table .tbody'), true );

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
            alert('choose a locker first');
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
};
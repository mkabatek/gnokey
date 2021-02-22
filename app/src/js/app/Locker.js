'use strict';

// setup jQuery
var $ = require('../../components/jquery/dist/jquery');
window.jQuery = window.jQuery || $;

// bootstrap dropdown
require('../../components/bootstrap/dist/js/umd/dropdown.js');

//
// Locker class stores all data and sets
//  up the associated events and data for
//  the "lockers". Lockers are the "groups" 
//  of passwords and its dropdown counterpart.
// 
// @param el the dropdown/element selector
// @param data { 'locker-name' : {file : '', fileId : '', downloadUrl : '', data : [], rows : [] }
//
/////////////////////////////////
var Locker = function(el, data){
    var self = this;

    self.current = '';
    self.data = data || {};
    self.$el = $(el);

    // setup
    $.each(self.data, function(key) {
        self.$el.find('.dropdown-menu').append('<li><a href="#" data-locker="'+key+'"><span>'+key+'</span></a></li>');
    });

    if(!Object.keys(self.data).length) {
        self.$el.find('.dropdown-menu').append('<li> -- no password groups -- </li>');
    }
    
    // init dropdown
    self.$el.find('.dropdown-menu').dropdown();

    // change locker
    self.$el.find('.dropdown-menu').off('click.bs.dropdown');
    self.$el.find('.dropdown-menu').on('click.bs.dropdown', function(e){
        var index = $(e.target).index('[data-locker]');
        self.change(index);
    });
};  

//
// add a new locker
////////////////////
Locker.prototype.add = function(name, data) {
    // dont add empty
    if(!name) {
        return false;
    }

    // prevent duplicates
    var curName = '';
    for(var key in this.data) {
        if(name === key) {
            curName = key;
            return false;
        }
    }

    // clear no lockers text
    if(!Object.keys(this.data).length) {
        this.$el.find('.dropdown-menu').html('');
    }

    // added with data
    this.data[name] = data || {
        file : '',
        rows : []
    };
    this.$el.find('.dropdown-menu').append('<li><a href="#" data-locker="'+name+'">'+name+'</a></li>');
    $(window).trigger('app-locker-add', [name]);

    // return index
    return ($('[data-locker]').length - 1);
};

//
// remove a locker
////////////////////
Locker.prototype.remove = function() {
    var $locker = this.$el.find('[data-locker].active');
    this.$el.find('.dropdown-toggle').text('Select Group');
    $locker.parent('li').remove();
    $(window).trigger('app-locker-remove', [this.data[$locker.data('locker')]]);
    
    delete this.data[$locker.data('locker')];  
    this.current = '';
};

// 
// change locker
/////////////////////////////////
Locker.prototype.change = function(index) {

    // no lockers
    if(!this.$el.find('[data-locker]').length) {
        return false;
    }
    var locker = this.$el.find('[data-locker]').eq(index).data('locker');

    // dont change on current
    if(this.current === locker) {
        return false;
    }

    // update dropdown
    this.$el.find('[data-locker]').removeClass('active');
    this.$el.find('[data-locker]').eq(index).addClass('active');
    this.$el.find('.dropdown-toggle').html('<span>' + locker + '</span>');
    this.current = locker;

    $(window).trigger('app-locker-change', [locker]);
};

//
// destroy this locker
///////////////////////
Locker.prototype.destroy = function() {
    this.$el.find('.dropdown-menu').html('');
    this.$el.find('.dropdown-menu').off('click.bs.dropdown');
    this.$el.find('.dropdown-toggle').text('Select Group');
};

module.exports = Locker;

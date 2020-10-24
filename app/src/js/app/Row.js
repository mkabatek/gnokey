'use strict';

var $ = require('../../components/jquery/dist/jquery');
var Input = require('./Input');

//
// Simple row class
/////////////////////
var Row = function(params) {
    // setup data
    var defaults = {
        'service' : '',
        'email' : '',
        'username' : '',
        'password' : ''
    } || params.defaults;

    var data = $.extend(defaults, params.data || {});

    // instance vars
    this.parent = params.parent || null;
    this.index = params.index || null;
    this.$container = params.container || null;
    this.$el = this.parent ? $('<div class="row child" />') : $('<div class="row" />');
    this.inputs = [];
    this.children = [];

    // ---- setup dom ---- //
    // append row
    this.$container.append(this.$el);

    // add data
    this.build(data);

    // --- listen to events --- //
    // copy to clipboard
    var self = this;
    self.$el.find('.js-copy').click(self.onCopy);

    // open/close menu
    self.$el.find('.js-menu').click(function(e) {
        e.preventDefault();
        $(this).prev('.menu').toggleClass('active');
    });

    // destroy
    self.$el.find('.js-destroy:first').click(function(e) {
        e.preventDefault();
        self.destroy();
    });

    // add child
    self.$el.find('.js-add-child').click(function(e) {
        e.preventDefault();
        self.addChild();
    });

    setTimeout(function(){
        self.$el.addClass('fadein');
    },100);

};

//
// build this row
///////////////////
Row.prototype.build = function(data) {
    var self = this;

    // setup row inputs
    for(var key in data) {
        if (data.hasOwnProperty(key)) {

            // skip children
            if(key === 'children') {
                continue;
            }

            // column
            var type = (key === 'password') ? 'password' : 'text';
            var $td = $('<div class="cell"><input type="'+type+'" name="'+key+'" value="'+data[key]+'" /></div>');

            // copy to clipboard
            if($.inArray(key, ['username','email','password']) !== -1) {
                $td.append('<button class="js-copy btn btn-sm btn-warning"><img src="img/clipboard.png" /></button> ' );
            }

            this.$el.append($td);
            this.inputs.push(new Input($td.find('input').get(0), data[key]));
        }
    }

    // add row menu
    var $menu = $('<div class="cell" />');
    if(this.parent) {
        $menu.append('<button class="js-destroy btn btn-sm btn-danger">x</a>');
    } else {
        $menu.append('<div class="menu" />');
        $menu.find('.menu').append('<button class="js-add-child btn btn-sm btn-success">&dtrif;</a>');
        $menu.find('.menu').append('<button class="js-destroy btn btn-sm btn-danger">x</a>');
        $menu.append('<button class="js-menu btn btn-sm btn-primary" />');
        $menu.find('.js-menu').append('<img src="img/grid.png" />');
    }
    this.$el.append($menu);

    // setup children
    if(typeof(data.children) !== 'undefined') {
        $.each(data.children, function(i, child){
            self.addChild(child);
        });
    }
};

//
// copy data of input to clipboard
//////////////////////////////////
Row.prototype.onCopy = function(e){
    e.preventDefault();

    var $input = $(this).prev('input');
    if($input.attr('type') === 'password') {
        $input.after('<input style="position:absolute;right:0;width:97%;" type="text" value="'+$input.val()+'" />');
        $input.next('input').select();
        document.execCommand('copy');
        setTimeout(function(){
            $input.next('input').remove();
        }, 700);
    } else {
        $input.select();
        document.execCommand('copy');
    }
};

//
// destroy a row
//////////////////
Row.prototype.destroy = function() {
    var self = this;

    // TODO custom dialog
    if(!confirm('Are you sure?')) {
        return;
    }
    
    // remove from data arrays
    var index = self.$el.index();
    if(self.parent) {
        index = self.parent.$el.children('.child').index(self.$el);
        // remove self from parent children array
        self.parent.children.splice(index, 1);
    } else {
        // trigger removed event
        $(window).trigger('app-row-destroy', [index, self]);
    }

    // remove from dom
    self.$el.remove();
};

//
//  add a child row
////////////////////
Row.prototype.addChild = function(data) {
    var d = data || {};

    // TODO custom inputs names?
    this.children.push(new Row({
        data : d,
        container : $(this.$el),
        parent : this
    }));
    
};

//
// Return row data
////////////////////
Row.prototype.getData = function() {
    var data = {};

    // inputs data
    $.each(this.inputs, function() {
        data[this.name] = this.data;
    });

    // include children data
    if(this.children.length) {
        data.children = [];
        $.each(this.children, function(i, child){
            data.children.push(child.getData());
        });
    }

    return data;
};

module.exports = Row;
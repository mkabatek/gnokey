'use strict';

var $ = require('../../components/jquery/dist/jquery');
var Input = require('./Input');

//
// Simple row class
/////////////////////
var Row = function(params, prepend) {
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
    if (prepend) {
        this.$container.prepend(this.$el);
    } else {
        this.$container.append(this.$el);
    }

    // add data
    this.build(data);

    // --- listen to events --- //
    // copy to clipboard
    var self = this;
    self.$el.find('.js-copy').click(self.onCopy);

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
            var $td = $('<div class="cell"><input type="'+type+'" name="'+key+'" value="'+data[key]+'" class="form-control" autocomplete="off" /></div>');

            // copy to clipboard inputs
            if($.inArray(key, ['username','email','password']) !== -1) {
                $td = $('<div class="cell input-group"><input type="'+type+'" name="'+key+'" value="'+data[key]+'" class="form-control" autocomplete="off" /></div>');
                $td.append('<span class="input-group-btn js-copy"><button class="btn btn-sm btn-secondary"><i class="ri-file-copy-line"></i></button></span>' );
            }

            this.$el.append($td);
            this.inputs.push(new Input(key, $td.find('input').get(0), data[key]));
        }
    }

    // add row menu
    var $menu = $('<div class="cell" />');
    if(this.parent) {
        $menu.append('<button class="js-destroy btn btn-secondary"><i class="ri-delete-bin-line"></i></a>');
    } else {
        $menu.append('<div class="menu btn-group" />');
        $menu.find('.menu').append('<button class="js-add-child btn btn-secondary"><i class="ri-arrow-down-s-line"></i></a>');
        $menu.find('.menu').append('<button class="js-destroy btn btn-secondary"><i class="ri-delete-bin-line"></i></a>');
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
        $input.after('<input style="position:absolute;left:6px;width:86%;z-index:2;" class="form-control" type="text" value="'+$input.val()+'" />');
        $input.next('input').select();
        document.execCommand('copy');
        setTimeout(function(){
            $input.next('input').remove();
        }, 1000);
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

    // show confirm
    var subMssg = this.children.length 
        ? '<br><br><small>This will also delete all of this passwords sub-passwords and cannot be undone!</small>' 
        : '<br><br><small>This cannot be undone!</small>';

    bootbox.confirm({
        title: 'Delete Password',
        size: 'small',
        message: 'Are you sure you want to delete this password?' + subMssg,
        callback: function(confirmed) {
            // remove if confirmed
            if (confirmed) {
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
            }
        }
    });
};

//
//  add a child row
////////////////////
Row.prototype.addChild = function(data) {
    var d = data || {};

    this.children.push(new Row({
        data : d,
        index: this.children.length,
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

//
// Get encoded string for CSV output
////////////////////////////////////////
Row.prototype.toCSV = function(parent) {
    var index = parent ? parent + '.' + (this.index + 1) : (this.index + 1);

    var str = index + ","
    str += this.inputs.map(function(i){
        return encodeURIComponent(i.data)
    }).join(",") + encodeURI("\r\n");

    if (this.children) {
        this.children.forEach(function(c) {
            str += c.toCSV(index);
        });
    }

    return str;
}

module.exports = Row;

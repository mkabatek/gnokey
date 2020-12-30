'use strict';

var $ = require('../../components/jquery/dist/jquery');

//
// Simple input class
//////////////////////
var Input = function(key, el, data) {
    this.dirty = false;
    this.el = el;
    this.data = data;
    this.name = this.el.name;
    this.el.placeholder = key;
    if (data) {
        this.el.value = data;
    }
    this.el.addEventListener('input', this, false);
    this.el.addEventListener('blur', this, false);
};

// handle event
Input.prototype.handleEvent = function(event) {
    if(event.type === 'input') {
        this.dirty = true;
        this.update(this.el.value);
    }
    if(event.type === 'blur' && this.dirty) {
        $(window).trigger('app-save');
        this.dirty = false;
    }
};

// update on input
Input.prototype.update = function(value) {
    this.data = value;
    this.el.value = value;
};

// export
module.exports = Input;
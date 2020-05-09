'use strict';

//
// Simple input class
//////////////////////
var Input = function(el, data) {
    this.el = el;
    this.data = data;
    this.name = this.el.name;
    this.el.value = data || '';
    this.el.addEventListener('input', this, false);
};

// handle event
Input.prototype.handleEvent = function(event) {
    if(event.type === 'input') {
        this.update(this.el.value);
    }
};

// update on input
Input.prototype.update = function(value) {
    this.data = value;
    this.el.value = value;
};

// export
module.exports = Input;
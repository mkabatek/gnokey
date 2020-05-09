'use strict';

var expect = require('chai').expect;
var $ = require('../../src/components/jquery/dist/jquery');
var Input = require('../../src/js/app/Input');

describe('Input', function () {
  
  describe('construct()', function(){

    it('should instantiate properly', function () {
    
        // create an input
        var $input = $('<input name="input" />');
        $('body').append($input);

        var input = new Input($input.get(0), 'test');

        // make sure 
        expect(input.name).to.equal('input');
        expect(input.data).to.equal('test');

        // make sure the input is in the dom
        expect(1).to.equal($('input').length);

        // remove input
        $input.remove();
      });  

      it('should listen to input events', function () {
    
        // instantiate a new input
        var $input = $('<input name="input" />');
        $('body').append($input);
        var input = new Input($input.get(0), 'test');

        // update val then trigger
        // an input event
        $input.val('updated');
        var evt = document.createEvent('HTMLEvents');
        evt.initEvent('input', false, true);
        $input.get(0).dispatchEvent(evt);

        expect(input.data).to.equal('updated');

        // remove input
        $input.remove();
      });

  });
  
});
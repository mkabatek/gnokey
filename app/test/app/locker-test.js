'use strict';

describe('Locker', function() {
   
    describe('construct()', function() {

        it('should instantiate properly building the dropdown menu for each locker file');

        it('should bind to the bootstrap dropdown click event: click.bs.dropdown');

    });

    describe('add()', function(){

        it('should properly add the data to the lockers data object and create a new dropdown li');

    });

    describe('change()', function(){

         it('should change the current active locker and trigger the app-locker-change event');

    });

    describe('remove()', function(){

         it('should delete the locker data');

         it('should remove the li from the dropdown');

         it('should trigger the app-locker-remove event');

    });

    describe('destroy()', function(){

        it('should destroy properly by unbinding and clearing the dropdown');

    });

});
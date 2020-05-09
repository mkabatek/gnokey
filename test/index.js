
// plugins
describe('plugins', function(){

    require('./plugins/crypto-test.js');

});

// app
describe('app', function(){
    
    require('./app/index-test.js');
    require('./app/locker-test.js');
    require('./app/input-test.js');
    require('./app/row-test.js');

});
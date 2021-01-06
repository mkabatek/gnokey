'use strict';

// avoid doing anything on older browsers
if(!document.addEventListener) {
    return false;
}

var $ = require('../components/jquery/dist/jquery');

 // load app
var app = require('./app');

// init
$(document).ready(function() {
    
    // load ui
    require('./ui')(app);

    // branding
    console.log('         ,,,,,,,,,,,,,,,,,,,,,          \n' +
                '       .,,,,,,,,,,,,,,,,,,,,,,,,        \n' +
                '      ,,,,,,,,,,,,,,,,,,,,,,,,,,,.      \n' +
                '    ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,     \n' +
                '   .,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,    \n' +
                '  ,,,,,,,,,,,.                          \n' +
                ',,,,,,,,,,,,,.            ,,,,,,,,,,,,, \n' +
                ',,,,,,,,,,,,,.            ,,,,,,,,,,,,, \n' +
                ' ,,,,,,,,,,,,.            ,,,,,,,,,,,,  \n' +
                '   ,,,,,,,,,,,,,,,,.     ,,,,,,,,,,,.   \n' +
                '    ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,     \n' +
                '      ,,,,,,,,,,,,,,,,,,,,,,,,,,,.      \n' +
                '       .,,,,,,,,,,,,,,,,,,,,,,,,.       \n' +
                '         ,,,,,,,,,,,,,,,,,,,,,.          ');

});
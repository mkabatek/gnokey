
/**
 * Simple cookie Helper
 *
 * @author Mike Roth <mike@manyuses.com>
 * @version 0.0.1
 */
var cookie = {

    set : function set(name, value, days) {
        days = days || 1;
        var d = new Date();
        d.setTime(d.getTime() + (days*24*60*60*1000));
        var expires = 'expires='+d.toUTCString();
        document.cookie = name + '=' + value + '; ' + expires;
    },

    get : function(name) {
        var n = name + '=';
        var ca = document.cookie.split(';');
        for(var i=0; i<ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) === ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(n) === 0) {
                return c.substring(n.length,c.length);
            }
        }
        return '';
    },

    delete : function(name) {
        document.cookie = name+'=;Max-Age=-99999999;path=/;"'; 
        //cookie.set(name, '', -1);
    }

};

module.exports = cookie;
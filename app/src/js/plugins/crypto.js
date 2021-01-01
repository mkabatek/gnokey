var CryptoJS = require('../../components/crypto-js');

/**
 * Simple AES Encryption Helper
 *
 * @author Mike Roth <mike@manyuses.com>
 * @version 0.0.1
 */
var crypto = {

    // 
    // CryptoJS AES encryption
    ////////////////////////////
    encrypt : function(data, passphrase, salt, iv) {
        var result = {};

        // define salt if we dont have one
        if(!salt) {
            salt = CryptoJS.lib.WordArray.random(128/8);
            result.salt = salt.toString(CryptoJS.enc.Base64);
        } else {
            result.salt = salt;
        }

        // define iv if we dont have one
        if(!iv) {
            iv = CryptoJS.lib.WordArray.random(128/8);
            result.iv = iv.toString(CryptoJS.enc.Base64);
        } else {
            result.iv = iv;
        }
        
        // do the encryption
        salt = CryptoJS.enc.Base64.parse(result.salt);
        iv = CryptoJS.enc.Base64.parse(result.iv);
        var key = CryptoJS.PBKDF2(passphrase, salt, { keySize: 128/32, iterations: 100 });
        var encrypted = CryptoJS.AES.encrypt(data, key, { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });

        // readable str
        result.encrypted = encrypted.toString();

        return result;
    },

    // 
    // CryptoJS AES decryption
    ////////////////////////////
    decrypt : function(data, passphrase, salt, iv) {
        salt = CryptoJS.enc.Base64.parse(salt);
        iv = CryptoJS.enc.Base64.parse(iv);
        var key = CryptoJS.PBKDF2(passphrase, salt, { keySize: 128/32, iterations: 100 });
        var decrypt = CryptoJS.AES.decrypt(data, key, { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
        
        return decrypt.toString(CryptoJS.enc.Utf8); 
    },

    //
    // Random password generator
    ////////////////////////////
    random : function(len) {
        var length = len || 16;
        var string = 'abcdefghijklmnopqrstuvwxyz'; //to upper 
        var numeric = '0123456789';
        var punctuation = '!@#$%^&*()_+~`|}{[]\:;?><,./-=';
        var password = '';
        var character = '';
        
        while( password.length < length ) {
            var entity1 = Math.ceil(string.length * Math.random()*Math.random());
            var entity2 = Math.ceil(numeric.length * Math.random()*Math.random());
            var entity3 = Math.ceil(punctuation.length * Math.random()*Math.random());
            var hold = string.charAt( entity1 );
            hold = (entity1 % 2 === 0)? hold.toUpperCase() : hold;
            character += hold;
            character += numeric.charAt( entity2 );
            character += punctuation.charAt( entity3 );
            password = character;
        }
        return password;
    },

    //
    // Generate app key
    ///////////////////
    generateKey: function() {
        return {
            key: CryptoJS.lib.WordArray.random(32).toString(),
            salt: CryptoJS.lib.WordArray.random(128/8).toString(CryptoJS.enc.Base64),
            iv: CryptoJS.lib.WordArray.random(128/8).toString(CryptoJS.enc.Base64)
        };
    }
};

module.exports = crypto;
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
        var key = CryptoJS.PBKDF2(passphrase, salt, { keySize: 256/32, iterations: 500 });
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
        var key = CryptoJS.PBKDF2(passphrase, salt, { keySize: 256/32, iterations: 500 });
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
        var punctuation = '!@#$%^&*()_+~`|}{[]\:;?><./-=';
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
    // Generate an aes key and
    // accompanying iv / salt
    //////////////////////////
    generateKey: function() {
        return {
            key: CryptoJS.lib.WordArray.random(64).toString(),
            salt: CryptoJS.lib.WordArray.random(128/8).toString(CryptoJS.enc.Base64),
            iv: CryptoJS.lib.WordArray.random(128/8).toString(CryptoJS.enc.Base64)
        };
    },

    //
    // RSA Encryption
    // for user keys / sharing
    ///////////////////////////
    rsa: {

        // create a new RSA keypair
        // and return in hex format
        createKeys: function(email) {
            var Buffer = window.Buffer.Buffer;
            var RSA = window.RSA;
            var key = new RSA({ b: 512 });
            var publicDer = key.exportKey('pkcs8-public-der');
            var privateDer = key.exportKey('pkcs1-der');
            var pubHex = publicDer.toString('hex');
            var emailHex = Buffer.from(email).toString('hex');

            return {
                public: pubHex,
                private: privateDer.toString('hex'),
                share: emailHex+'.'+pubHex
            };
        },

        // parse a hex keypair and
        // return an RSA object
        parseKeyPair: function(pubKey, privKey) {
            var Buffer = window.Buffer.Buffer;
            var RSA = window.RSA;

            var keyPair = new RSA();
            keyPair.importKey(Buffer.from(pubKey, 'hex'), 'pkcs8-public-der');
            keyPair.importKey(Buffer.from(privKey, 'hex'), 'pkcs1-der');

            return keyPair;
        },

        // parse a users "sharekey"
        // to convert it from base64
        // to RSA pub key and user email
        parseShareKey: function(shareKey) {
            var Buffer = window.Buffer.Buffer;
            var RSA = window.RSA;

            var skparts = shareKey.split('.');
            var email =  Buffer.from(skparts[0], 'hex').toString('utf8');
            var key = skparts[1];
            var pubKey = new RSA();
            pubKey.importKey(Buffer.from(key, 'hex'), 'pkcs8-public-der');

            if (!pubKey.isPublic(true)) {
                console.warn('Attempted to parse a private key from a sharekey!');
                return false;
            }

            return {
                email: email,
                key: pubKey
            };
        },

        // encrypt something using
        // a users public key, we 
        // always convert encrypted data 
        // to hex for transfer/storage
        encryptPublic: function(pubKey, str) {
            if (!pubKey.isPublic(true)) {
                console.warn('Attempted to "encryptPublic" using a private key!');
                return false;
            }

            var enc = pubKey.encrypt(str);
            return enc.toString('hex');
        },

        // encrypt a utf8 string
        // and return it in hex
        encrypt: function(keyPair, str) {
            var enc = keyPair.encrypt(str);
            return enc.toString('hex');
        },

        // decrypt a hex string
        decrypt: function(keyPair, str) {
            var Buffer = window.Buffer.Buffer;
            var enc = Buffer.from(str, 'hex');
            return keyPair.decrypt(enc, 'utf8');
        },

        // TODO move this to a test once we figure
        // out how to import NodeRSA as a module.
        // NOTE: DEV ONLY
        _test: function() {
            // create keys
            var keys = crypto.rsa.createKeys('test@manyuses.com');
            console.log(keys);

            // parse share key
            var shareKey = crypto.rsa.parseShareKey(keys.share);
            console.log(shareKey);

            // encrypt a key with a public key
            var aesKey = crypto.generateKey();
            console.log('aeskey', aesKey);
            var encAes = crypto.rsa.encryptPublic(shareKey.key, aesKey.key);
            console.log('encrypted aeskey (pub)', encAes);

            // decrypt using private key
            var keypair = crypto.rsa.parseKeyPair(keys.public, keys.private);
            var decAes = crypto.rsa.decrypt(keypair, encAes);
            console.log('decrypted aes (priv)', decAes);

            // encrypt using private key
            var encAesPriv = crypto.rsa.encrypt(keypair, aesKey.key);
            console.log('encrypted aeskey (priv)', encAesPriv);

            // decrypt again using private key
            var decAesPriv = crypto.rsa.decrypt(keypair, encAes);
            console.log('decrypted aes (priv #2)', decAesPriv);

            // attempt to decrypt using pub key
            try {
                console.log('decrypt with public?');
                var decPub = crypto.rsa.decrypt(shareKey.key, encAes);
                console.log(decPub);
            } catch(err) {
                console.warn(err.message);
            }
        }
    }
};

module.exports = crypto;
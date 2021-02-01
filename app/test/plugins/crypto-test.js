'use strict';

var expect = require('chai').expect;
var crypto = require('../../src/js/plugins/crypto');

describe('crypto', function () {
  it('should encrypt and decrypt a string', function () {
    
    var passphrase = '012345678901234567890';
    var data = 'some data';

    // encrypt
    var encryption = crypto.encrypt(data, passphrase);
    var salt = encryption.salt;
    var iv = encryption.iv;
    var encrypted = encryption.encrypted;

    // decrypt
    var decrypted = crypto.decrypt(encrypted, passphrase, salt, iv);

    expect(decrypted).to.equal(data);
  });

  it('should handle rsa keypairs', function () {

    // TODO need to load rsa.js via require

    expect(true);
  });
});
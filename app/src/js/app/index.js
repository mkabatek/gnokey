'use strict';

// include jquery
var $ = require('../../components/jquery/dist/jquery');

// require app components (classes)
var Row = require('./Row');
var Locker = require('./Locker');

// require app plugins (objects)
var crypto = require('../plugins/crypto');
var cookie = require('../plugins/cookie');

//
//  Google drive based password manager
//
// @author Mike Roth <mike@manyuses.com>
// @version 0.1.0
//
///////////////////
var app = {

    // instance vars
    loading : true,
    ajaxLoading : false,    
    debug : true,
    gEndpoint : 'https://www.googleapis.com',
    gClientId : '771539139723-rqai5ge4eutm4q04jh8po5do57b676pr.apps.googleusercontent.com',
    gScopes : [
        'https://www.googleapis.com/auth/drive.install',
        'https://www.googleapis.com/auth/drive.appdata',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.email'
    ],

    // user specific
    gAccessToken : null,
    gUser : null,
    gUserEmail: null,
    gAvatar: '',
    keys: {
        public: '',
        private: '',
        share: ''
    },
    keypair: null,

    // objects
    gapi : null, // google drive api client
    gmail : null, // gmail api client
    locker : null, // locker object
    rows : [],

    //
    // App init
    /////////////
    init : function() {

        // init
        $(window).trigger('app-beforeLoad', [app]);

        // gapi drive api callback
        window.gapiCallback = function(data){
            app.gapi = window.gapi;
            app.loading = true;

            // set app gapi object
            window.setTimeout(function() {
                app.gCallback(data);
            },1);
        };

        // simple loader interval
        setInterval(function() {
            if(app.loading || app.ajaxLoading) {
                $('body').addClass('loading');
            } else {
                $('body').removeClass('loading');
            }
            if (app.locker && app.locker.current) {
                $('body').addClass('group-selected');
            } else {
                $('body').removeClass('group-selected');
            }
        }, 100);

        // listen to save event
        $(window).on('app-save', function(e) {
            app.save();
        });

        // on row destroy (Triggered by Row object)
        $(window).on('app-row-destroy', function(e, index, row) {
            app.removeRow(index);
        });

        // on locker change (Triggered by Locker object)
        $(window).on('app-locker-change', function(e, locker) {
            app.rows = [];
            $('.table .tbody').html('');

            $.each(app.locker.data[locker].rows, function(i, row) {
                var r = $.extend(true, {}, row);
                app.addRow(r, $('.table .tbody'));
            });
        });

        // on locker remove (Triggered by Locker object)
        $(window).on('app-locker-remove', function(e, locker) {
            app.deleteDriveFile(locker.file);
        });
    },


    //
    // parse a google callback
    ////////////////////////////
    gCallback : function(data) {
        var gEmail = '';
        
        if(data) {

            if(data.error) {
                if(app.debug) {
                    console.error('gapi:','error', data.error);
                }

                gEmail = cookie.get('gEmail');
                if(data.error === 'immediate_failed' && gEmail) {
                    // auth w/out immediate
                    app.gapi.client.init({
                        'apiKey': app.gClientSecret,
                        'clientId': app.gClientId,
                        'scope': app.gScopes
                    }).then(window.gapiCallback);
                } else {
                    app.loading = false;
                }
            } else {
                // get access_token, user & load Drive API
                if(data.access_token && !app.gAccessToken) {
                    app.gAccessToken = data.access_token;

                    // Get user id
                    $.ajax({
                        dataType: 'json',
                        url: app.gEndpoint+'/oauth2/v3/userinfo?alt=json',
                        headers: { Authorization: 'Bearer '+ app.gAccessToken },
                        success: function(res){
                            // store email in cookie (for account switching)
                            app.gUser = res.sub;
                            app.gUserEmail = res.email;
                            app.gAvatar = res.picture;
                            cookie.set('gEmail', res.email);
                            $('.js-avatar').attr('src', app.gAvatar);
                            $('.js-email').text(app.gUserEmail);
    
                            if(res.email) {
                                // add to sendgrid list
                                $.ajax({
                                    url: 'https://gnokey.com/api/subscribe/gnokey',
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    data: JSON.stringify({
                                        email : res.email,
                                        first_name : res.given_name,
                                        last_name: res.family_name,
                                        gender: res.gender,
                                        google_sub: res.sub
                                    })
                                });
                            }
    
                            // load drive api
                            app.loadClients();
                        }
                    });
                }
                // load api callback
                else {
                    // populate data
                    app.populate();
                }
            }

        } else {

            // we have an authenticated user
            gEmail = cookie.get('gEmail');
            if(gEmail) {
                // auth
                app.gapi.auth.authorize({
                    client_id: app.gClientId,
                    scope: app.gScopes,
                    user_id: gEmail,
                    authuser: -1,
                    immediate : true
                }, window.gapiCallback);
            } else {
                app.loading = false;
            }

        }
    },

    //
    // Load client APIs
    ///////////////////
    loadClients : function() {
        //app.gapi.client.load('gmail', 'v1');
        app.gapi.client.load('drive', 'v2', window.gapiCallback);
    },

    //
    // Populate App data
    //////////////////////
    populate : function() {
        app.loading = true;
        $(window).trigger('app-beforeLoad', [app]);   

        // setup appdata file
        app.setupAppData().then(function(){

            // get all locker files
            app.getLockers().then(function(){

                // done loading
                app.loading = false;
                $('body').addClass('loaded');
                $(window).trigger('app-afterLoad', [app]);   
            });
        });
    },

    //
    // setup appdata 
    ///////////////
    setupAppData : function() {
        return new window.Promise(function(resolve, reject) {
            $(window).trigger('app-before-setupAppData');

            // get appdata file(s)
            var request = app.gapi.client.drive.files.list({
                'q': '\'appdata\' in parents'
            });
            request.execute(function(resp) {
                if (resp.items.length) {
                    // get app data file contents
                    app.getDriveFile(resp.items[0].id).then(function(res){
                        // set app data
                        app.keys = res.keys;
                        app.keypair = crypto.rsa.parseKeyPair(
                            app.keys.public,
                            app.keys.private
                        );
                        $('.js-public-id').val(app.keys.share);
                        $(window).trigger('app-after-setupAppData', [res]);
                        resolve();
                    });
                } else {
                    // create app data
                    app.createAppData().then(function(res){
                        // set app data
                        app.keys = res.keys;
                        app.keypair = crypto.rsa.parseKeyPair(
                            app.keys.public,
                            app.keys.private
                        );
                        $('.js-public-id').val(app.keys.share);
                        $(window).trigger('app-after-setupAppData', [res]);
                        resolve();
                    }, reject);
                }
            });
        });
    },

    //
    // create new appdata
    //
    // TODO ability to re-key/update?
    /////////////////////////////////
    createAppData: function(fileId) {
        return new window.Promise(function(resolve, reject) {

            // set meta data
            var metadata = {
                name: 'gnokey.json',
                parents: [ 'appDataFolder']
            };

            // build app data
            var appdata = {
                // generate keys
                keys: crypto.rsa.createKeys(app.gUserEmail),
                created: new Date()
            };

            // create multipart form data object
            var data = new FormData();
            data.append('metadata', new Blob([ JSON.stringify(metadata) ], { type: 'application/json' }));
            data.append('file', new Blob([ JSON.stringify(appdata) ], { type: 'application/json' }));

            // upload using v3 for appdata storage
            $.ajax(app.gEndpoint+'/upload/drive/v3/files?uploadType=multipart', {
                data: data,
                headers: { Authorization: 'Bearer ' + app.gAccessToken },
                contentType: false,
                processData: false,
                type: 'POST',
                success: function() {
                    resolve(appdata);
                },
                error: reject
            });
        });
    },

    //
    // Get lockers
    // TODO break up this method
    /////////////////////////////
    getLockers: function() {
        return new window.Promise(function(resolve, reject) {
            // setup locker object
            app.locker = new Locker('.js-lockers');

            // get url state
            var appState = '{}';
            var params = (new window.URL(document.location)).searchParams;
            var state = params.get('state');
            if (state) {
                appState = JSON.parse(state);
            }
            
            // get locker files
            var lockers = app.gapi.client.drive.files.list({
                // TODO not deleted?
                'q': 'mimeType = \'application/gnokey\' and trashed = false'
            });
            lockers.execute(function(resp) {
                var total = resp.items.length;

                // no lockers yet
                if(total === 0) {
                    resolve();
                    return;
                }

                // load lockers
                var loaded = 0;
                $.each(resp.items, function(i, item) {

                    // get file contents
                    app.getDriveFile(item.id).then(function(res) {
                        // TODO move grant logic to another method
                        var lockerKey;
                        if (res.grants && res.grants[app.gUserEmail]) {
                            // 1. use private key to decrypt grant
                            lockerKey = crypto.rsa.decrypt(app.keypair, res.grants[app.gUserEmail]);
                                
                            // 2. re-encrypt grant with user key and set to users list
                            var lockerKeyEnc = crypto.rsa.encrypt(app.keypair, lockerKey);
                            res.users[app.gUser] = lockerKeyEnc;

                            // 3. remove grant from locker
                            // TODO delete this on save
                            // delete res.grants[app.gUserEmail];
                        } else {
                            // get decrypted locker key
                            var userKey = res.users[app.gUser];
                            if (userKey) {
                                lockerKey = crypto.rsa.decrypt(app.keypair, userKey);
                            }
                        }

                        // setup locker data
                        // TODO handle no userKey logic (e.g. shared through drive only, prompt for code?)
                        app.locker.add(res.title, {
                            file : item.id,
                            rows : res.rows,
                            salt : res.salt,
                            iv : res.iv,
                            users: res.users,
                            grants: res.grants || {},
                            key: lockerKey
                        });
                        loaded++;

                        // all lockers loaded
                        if(loaded === total) {
                            // determine which locker to display
                            if (appState && appState.action === 'open') {
                                // get index based on fileId
                                var id = (appState.ids && appState.ids.length) ? appState.ids[0] : '';
                                var index = Object.values(app.locker.data).findIndex(function(l) {
                                    return (l.file === id);
                                });
                                app.locker.change(index || 0);
                            } else {
                                app.locker.change(0);
                            }
                            resolve();
                        }
                    });

                });
            });
        });
    },

    //
    // add a locker
    ///////////////
    addLocker: function(name) {
        var keyData = crypto.generateKey();
        var encryptedKey = crypto.rsa.encrypt(app.keypair, keyData.key);
        var data = {
            rows: [],
            key: keyData.key,
            iv: keyData.iv,
            salt: keyData.salt,
            users: {},
            grants: {}
        };
        data.users[app.gUser] = encryptedKey;
        var index = app.locker.add(name, data);
        app.locker.change(index);
    },

    //
    // Get Drive file contents
    //////////////////////////
    getDriveFile : function(fileId) {
        return new window.Promise(function(resolve, reject) {
            // get file metadata
            var request = app.gapi.client.drive.files.get({
                'fileId': fileId
            });
            request.execute(function(resp) {
                 // get file contents
                if (resp.id) {
                    $.ajax(resp.selfLink + '?alt=media', {
                        dataType: 'json',
                        headers: { 
                            Authorization: 'Bearer ' + app.gAccessToken
                        },
                        success: resolve,
                        error: reject
                    });
                }
            });
        });
    },

    //
    // Delete a Drive file
    ///////////////////////
    deleteDriveFile : function(file) {
        app.ajaxLoading = true;

        // delete file
        var request = app.gapi.client.drive.files.delete({
          'fileId': file
        });

        request.execute(function(resp) {
            app.rows = [];
            $('.table .tbody').html('');
            app.ajaxLoading = false;
        });
    },

    //
    // Create/update an application Drive file
    //////////////////////////////////////////
    saveDriveFile: function(fileName, contents, fileId) {
        return new window.Promise(function(resolve, reject) {
            var boundary = '-------314159265358979323846264';
            var delimiter = '\r\n--' + boundary + '\r\n';
            var close_delim = '\r\n--' + boundary + '--';
            var contentType = 'application/gnokey';
            var thumbnail = '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';
            thumbnail = thumbnail.replace(/\+/g, '-').replace(/\//g, '_');
            var metadata = {
                title: fileName,
                mimeType: contentType,
                iconLink: 'http://gnokey.com.s3-website-us-east-1.amazonaws.com/app/img/favicon.ico',
                thumbnail: {
                    image: thumbnail,
                    mimeType: 'image/png'
                },
                contentHints: {
                    indexableText: fileName + ' passwords ' + ' gnokey '
                }
            };
            var base64Data = window.btoa(JSON.stringify(contents));
            var multipartRequestBody =
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                'Content-Type: ' + contentType + '\r\n' +
                'Content-Transfer-Encoding: base64\r\n' +
                '\r\n' +
                base64Data +
                close_delim;

            var request = app.gapi.client.request({
                'path': '/upload/drive/v2/files/' + (fileId || ''),
                'method': fileId ? 'PUT' : 'POST',
                'params': {'uploadType': 'multipart'},
                'headers': {
                    'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'
                },
                'body': multipartRequestBody});

            request.execute(resolve);
        });
    },

    //
    // Save current state (locker)
    //////////////////////////////
    save : function() {
        return new window.Promise(function(resolve, reject) {
            app.loading = true;

            // clear out the rows to be updated
            // with the new data from the UI
            app.locker.data[app.locker.current].rows = [];

            // clear out grant if exists
            if (app.locker.data[app.locker.current].grants[app.gUserEmail]) {
                delete app.locker.data[app.locker.current].grants[app.gUserEmail];
            }

            // encrypt passwords
            $.each(app.rows, function(i, row) {

                // get locker encryption data
                var key = app.locker.data[app.locker.current].key;
                var salt = app.locker.data[app.locker.current].salt;
                var iv = app.locker.data[app.locker.current].iv;

                // get row data
                app.locker.data[app.locker.current].rows[i] = row.getData();

                // encrypt row password
                var encryption = crypto.encrypt(app.locker.data[app.locker.current].rows[i].password, key, salt, iv);
                app.locker.data[app.locker.current].rows[i].password = encryption.encrypted;

                // encrypt child rows
                if(app.locker.data[app.locker.current].rows[i].children) {
                    $.each(app.locker.data[app.locker.current].rows[i].children, function(j, r) {
                        var encryption = crypto.encrypt(r.password, key, salt, iv);
                        app.locker.data[app.locker.current].rows[i].children[j].password = encryption.encrypted;
                    });
                }
            });

            // create/update locker file
            var data = {
                title: app.locker.current,
                rows: app.locker.data[app.locker.current].rows,
                users: app.locker.data[app.locker.current].users,
                grants: app.locker.data[app.locker.current].grants,
                salt: app.locker.data[app.locker.current].salt,
                iv: app.locker.data[app.locker.current].iv
            };
            app.saveDriveFile(
                app.locker.current, 
                data, 
                app.locker.data[app.locker.current].file
            ).then(function(data) {
                app.locker.data[app.locker.current].file = data.id;
                app.loading = false;
                $(window).trigger('app-afterSave', [app]);
                resolve();
            }).catch(reject);
        });

    },

    //
    // Add a new row
    //////////////////
    addRow : function(data, container, prepend) {
        var d = data || {};

        // decrypt password
        var key = app.locker.data[app.locker.current].key;
        var salt = app.locker.data[app.locker.current].salt;
        var iv = app.locker.data[app.locker.current].iv;

        if(typeof(d.password) !== 'undefined' && d.password && key) {
            d.password = crypto.decrypt(d.password, key, salt, iv);
        }

        // decrypt children passwords
        if(typeof(d.children) !== 'undefined') {
            $.each(d.children, function(i, child){
                if(typeof(child.password) !== 'undefined' && child.password && key) {
                    d.children[i].password = crypto.decrypt(child.password, key, salt, iv);
                }
            });
        }

        // add row to array
        app.rows.push(new Row({
            data: d,
            index: app.rows.length,
            container: container
        }, prepend));

        return true;
    },

    //
    // Remove a row
    /////////////////
    removeRow : function(index) {
        app.rows.splice(index, 1);
        $(window).trigger('app-save');
        return true;
    },

    //
    // Login
    //////////
    login : function() {
        if(app.loading || app.ajaxLoading) {
            return false;
        }

        app.loading = true;
        var auth = {
            client_id: app.gClientId,
            scope: app.gScopes,
            authuser: -1
        };

        // logout
        if(cookie.get('gEmail')) {
            return app.logout();
        }

        // init
        app.gapi.auth.authorize(auth, window.gapiCallback);
    },

    //
    // Logout
    ///////////
    logout : function() {
        if(app.loading || app.ajaxLoading) {
            return false;
        }

        cookie.delete('gEmail');
        app.gUser = null;
        app.gAccessToken = null;
        app.rows = [];
        app.locker.destroy();
        app.locker = null;
        $('.table .tbody').html('');

        // de-auth
        app.gapi.auth.signOut();
        $('body').removeClass('loaded group-selected');
        app.loading = false;
        window.location.reload();
        return true;
    },

    //
    // Download an unencrypted backup
    /////////////////////////////////
    download : function() {
        if(!app.locker.current) {
            return false;
        }

        var csvContent = encodeURI('data:text/csv;charset=utf-8,');
        csvContent += 'Row,Service,Email,Username,Password' + encodeURI('\r\n');
        app.rows.forEach(function(row) {
            csvContent += row.toCSV();
        });
        var link = document.createElement('a');
        link.setAttribute('href', csvContent);
        link.setAttribute('download', app.locker.current+'-gnokey.csv');
        document.body.appendChild(link); // Required for FF
        link.click();
        link.remove();
    },

    //
    // Sort
    //////////
    sort : function(direction) {
        var dir = direction || 'ASC';

        // sort data array
        app.rows.sort(function(a, b){
            var av = '';
            var bv = '';
            if(dir === 'ASC') {
                av = a.$el.find('.cell input').eq(0).val();
                bv = b.$el.find('.cell input').eq(0).val();
            } else {
                av = b.$el.find('.cell input').eq(0).val();
                bv = a.$el.find('.cell input').eq(0).val();
            }

            if(av > bv) {
                return 1;
            }
            if(av < bv) {
                return -1;
            }

            return 0;
        });

        // sort dom
        var $tbody = $('.tbody');
        var $rows = $tbody.children('.row');
        $rows.sort(function(a, b){
            var av = '';
            var bv = '';
            if(dir === 'ASC') {
                av = $(a).find('.cell input').eq(0).val();
                bv = $(b).find('.cell input').eq(0).val();
            } else {
                av = $(b).find('.cell input').eq(0).val();
                bv = $(a).find('.cell input').eq(0).val();
            }

            if(av > bv) {
                return 1;
            }
            if(av < bv) {
                return -1;
            }

            return 0;
        });
        $rows.detach().appendTo($tbody);
    },

    //
    // Filter
    ///////////
    filter : function(search) {

        // show all
        if(search === '') {
            $.each(app.rows, function(i, row) {
                row.$el.addClass('fadein');
            });
            return;
        }

        // hide rows not matching
        // the search string
        $.each(app.rows, function(i, row) {
            var val = row.$el.find('.cell input').eq(0).val();
            if(!val.match(new RegExp(search, 'gi'))) {
                row.$el.removeClass('fadein');
            } else {
                row.$el.addClass('fadein');
            }
        });
    },

    //
    // Generate password
    //////////////////////
    generatePassword : function() {
        // TODO password variations?
        return crypto.random();
    },

    //
    // Parse sharekey
    //////////////////
    parseShareKey: function(shareKey) {
        var pubKey = crypto.rsa.parseShareKey(shareKey);
        var user = pubKey.email.toLowerCase();
        return user;
    },

    //
    // Share locker
    ///////////////////////
    shareLocker: function(shareKey) {
        return new window.Promise(function(resolve, reject) {

            // get email
            var pubKey = crypto.rsa.parseShareKey(shareKey);
            var user = pubKey.email.toLowerCase();
            var fileId = app.locker.data[app.locker.current].file;

            if (!user || !fileId) {
                reject();
                return;
            }

            // encrypt locker key using users sharekey
            var grant = crypto.rsa.encryptPublic(pubKey.key, app.locker.data[app.locker.current].key);
            app.locker.data[app.locker.current].grants[user] = grant;

            // save grant
            app.save().then(function(){
                // insert permission
                var fileId = app.locker.data[app.locker.current].file;
                var permission = {
                    'type': 'user',
                    'role': 'writer',
                    'value': user
                };

                var request = app.gapi.client.drive.permissions.insert({
                    resource: permission,
                    fileId: fileId,
                    fields: 'id',
                    emailMessage: app.gUserEmail + ' has shared the password group "'+app.locker.current+'" with you via Gnokey.'
                    // sendNotificationEmails: false
                });
                request.execute(function(resp) {
                    // app.sendMail(
                    //     user,
                    //     'Gnokey - Shared Password Group Invite',
                    //     '<p>Click the following link to accept a shared invite to the password group "' + app.locker.current + '".</p> ' + url
                    // );
                    
                    // resolve
                    resolve({ 
                        fileId: fileId,
                        user: user, 
                        grant: grant 
                    });
                });
            });
        });
    },

    //
    // Send email
    //////////////////////
    // sendMail: function(to, subject, mssg) {
    //     return new window.Promise(function(res, rej){
    //         var message =
    //                 'Content-Type: text/html; charset=UTF-8' +
    //                 'From: no-reply@gnokey.com' + '\r\n' +
    //                 'To: ' + to + '\r\n' +
    //                 'Subject: ' + subject + '\r\n\r\n' +
    //                 mssg;

    //         // base64 encode
    //         var encodedMessage = window.btoa(message);
    //         var reallyEncodedMessage = encodedMessage
    //                                         .replace(/\+/g, '-')
    //                                         .replace(/\//g, '_')
    //                                         .replace(/=+$/, '');
    //         // send
    //         var request = app.gapi.client.gmail.users.messages.send({
    //             userId: 'me',
    //             resource: {
    //                 raw: reallyEncodedMessage,
    //             }
    //         });

    //         request.execute(res, rej);
    //     });
    //}

};

// initialize
app.init();

// export app
module.exports = app;

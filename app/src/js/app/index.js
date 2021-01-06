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
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/gmail.send',
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
                                // TODO add to sendgrid list
                                // $.post('https://sendgrid.com/signup', {
                                //   email : res.email,
                                //   first_name : res.given_name,
                                //   last_name: res.family_name,
                                //   gender: res.gender,
                                //   google_sub: res.sub
                                // });
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
        app.gapi.client.load('gmail', 'v1');
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
                        $('.js-public-key').val(app.keys.share);
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
                        $('.js-public-key').val(app.keys.share);
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
    // Share locker
    ///////////////////////
    shareLocker: function(shareKey) {
        return new window.Promise(function(resolve, reject) {

            // get email
            var pubKey = crypto.rsa.parseShareKey(shareKey);
            var user = pubKey.email.toLowerCase();
            var fileId = app.locker.data[app.locker.current].file;

            if (!user || !fileId) {
                return false;
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
                    // // send email
                    // var state = JSON.stringify({
                    //     ids: [fileId],
                    //     action: 'grant',
                    //     token: token.key
                    // });
                    // var url = window.location.href.replace('#', '').split('?')[0] + '?state=' + encodeURIComponent(state);
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
    sendMail: function(to, subject, mssg) {
        return new window.Promise(function(res, rej){
            var message =
                    'Content-Type: text/html; charset=UTF-8' +
                    'From: no-reply@gnokey.com' + '\r\n' +
                    'To: ' + to + '\r\n' +
                    'Subject: ' + subject + '\r\n\r\n' +
                    mssg;

            // base64 encode
            var encodedMessage = window.btoa(message);
            var reallyEncodedMessage = encodedMessage
                                            .replace(/\+/g, '-')
                                            .replace(/\//g, '_')
                                            .replace(/=+$/, '');
            // send
            var request = app.gapi.client.gmail.users.messages.send({
                userId: 'me',
                resource: {
                    raw: reallyEncodedMessage,
                }
            });

            request.execute(res, rej);
        });
    }

};

// initialize
app.init();

// export app
module.exports = app;

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
// SimplePass
//  - Simple mini google drive based password manager
//
// @author Mike Roth <hi@michaelharrisonroth.com>
// @version 0.0.4
//
///////////////////
var app = {

    // instance vars
    loading : true,
    ajaxLoading : false,
    debug : true,
    gEndpoint : 'https://www.googleapis.com',
    gClientId : '223894830497-alftc6jtum6urrr5i9jfbnsafahsjcts.apps.googleusercontent.com',
    gAccessToken : null,
    gUser : null,
    gScopes : [
        'https://www.googleapis.com/auth/drive.install',
        'https://www.googleapis.com/auth/drive.appdata',
        'https://www.googleapis.com/auth/userinfo.email'
    ],
    rows : [],
    salt : '',
    iv : '',

    // objects
    gapi : null, // google apis
    locker : null, // stores and manages the data

    //
    // App init
    /////////////
    init : function() {

        // init
        $(window).trigger('app-beforeLoad', [app]);

        // google api callback
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
        }, 100);

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
                    console.log('gapi:','error', data.error);
                }

                gEmail = cookie.get('gEmail');
                if(data.error === 'immediate_failed' && gEmail) {
                    // auth w/out immediate
                    app.gapi.auth.authorize({
                        client_id: app.gClientId,
                        scope: app.gScopes,
                        user_id: gEmail,
                        authuser: -1
                    }, window.gapiCallback);
                } else {
                    app.loading = false;
                }
            } else {
                // get access_token, user & load Drive API
                if(data.access_token && !app.gAccessToken) {
                    app.gAccessToken = data.access_token;

                    // Get user id
                    $.getJSON(app.gEndpoint+'/oauth2/v3/userinfo?alt=json&access_token='+app.gAccessToken, function(res){
                        // store email in cookie (for account switching)
                        app.gUser = res.sub;
                        cookie.set('gEmail', res.email);

                        if(res.email) {
                            $.post('https://simplepass.michaelharrisonroth.com:8673/signup', {
                              email : res.email,
                              first_name : res.given_name,
                              last_name: res.family_name,
                              gender: res.gender,
                              google_sub: res.sub
                            });
                        }

                        // load drive api
                        app.loadDriveApi();
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
    // Load API
    /////////////
    loadDriveApi : function() {

        // load the drive api
        app.gapi.client.load('drive', 'v2', window.gapiCallback);
    },


    //
    // Populate App data
    //////////////////////
    populate : function() {

        // setup data
        app.locker = new Locker('.js-lockers');

        // get appdata file
        var request = app.gapi.client.drive.files.list({
          'q': '\'appdata\' in parents'
        });

        request.execute(function(resp) {

            var total = resp.items.length;

            // no files yet
            if(total === 0) {
                // done loading
                app.loading = false;
                $('body').addClass('loaded');
                $(window).trigger('app-afterLoad', [app]);
            }

            // load files
            var loaded = 0;
            $.each(resp.items, function(i, item) {

                // get file data
                app.getDriveFileData(item, function(){
                    loaded++;

                    if(loaded === total) {
                        // open default
                        app.locker.change(0);

                        // done loading
                        app.loading = false;
                        $('body').addClass('loaded');
                        $(window).trigger('app-afterLoad', [app]);
                    }
                });

            });

        });
    },

    //
    // get data from a file
    ////////////////////////
    getDriveFileData : function(item, callback){
        var cb = callback || function(){};

        // get data
        var request = app.gapi.client.drive.files.get({
          'fileId': item.id
        });
        request.execute(function(resp) {
            var res = resp;

            if (res.id) {

                // get file
                $.ajax(res.downloadUrl, {
                  headers: {Authorization: 'Bearer ' + app.gAccessToken},
                  success: function(data, status, request) {
                    // set salt / iv
                    // for encryption
                    if(!app.salt) {
                        app.salt = data.salt;
                    }
                    if(!app.iv) {
                        app.iv = data.iv;
                    }

                    // setup locker data
                    var title = res.title.replace('.json','');
                    app.locker.add(title, {
                        file : res.id,
                        downloadUrl : res.downloadUrl,
                        rows : data.rows,
                        salt : data.salt,
                        iv : data.iv
                    });

                    cb();
                  }
                });

            }
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
    // Save App Data
    //////////////////
    save : function() {
        app.loading = true;

        // clear out the rows to be updated
        // with the new data from the UI
        app.locker.data[app.locker.current].rows = [];

        // set meta data
        var metadata = {
          'name': app.locker.current+'.json',
        };
        if(!app.locker.data[app.locker.current].file) {
            metadata.parents = [ 'appDataFolder'];
        }

        // encrypt passwords
        $.each(app.rows, function(i, row) {

            // get row data
            app.locker.data[app.locker.current].rows[i] = row.getData();

            // encrypt password
            var encryption = crypto.encrypt(app.locker.data[app.locker.current].rows[i].password, app.gUser, app.salt, app.iv);
            app.locker.data[app.locker.current].rows[i].password = encryption.encrypted;

            // set salt / iv
            if(!app.salt) {
                app.salt = encryption.salt;
                app.iv = encryption.iv;
            }

            app.locker.data[app.locker.current].salt = app.salt;
            app.locker.data[app.locker.current].iv = app.iv;

            // encrypt child rows
            if(app.locker.data[app.locker.current].rows[i].children) {
                $.each(app.locker.data[app.locker.current].rows[i].children, function(j, r) {
                    var encryption = crypto.encrypt(r.password, app.gUser, app.salt, app.iv);
                    app.locker.data[app.locker.current].rows[i].children[j].password = encryption.encrypted;
                });
            }
        });

        // create multipart form data object
        var data = new FormData();
        data.append('metadata', new Blob([ JSON.stringify(metadata) ], { type: 'application/json' }));
        data.append('file', new Blob([ JSON.stringify(app.locker.data[app.locker.current]) ], { type: 'application/json' }));

        $.ajax(app.gEndpoint+'/upload/drive/v3/files/' + app.locker.data[app.locker.current].file + '?uploadType=multipart', {
            data: data,
            headers: {Authorization: 'Bearer ' + app.gAccessToken},
            contentType: false,
            processData: false,
            type: app.locker.data[app.locker.current].file ? 'PATCH' : 'POST',
            success: function(data) {
                app.locker.data[app.locker.current].file = data.id;
                app.loading = false;
                $(window).trigger('app-afterSave', [app]);
            },
            error: function(data){
                console.log(data);
            }
        });

    },

    //
    // Add a new row
    //////////////////
    addRow : function(data, container) {
        var d = data || {};

        // decrypt password
        if(typeof(d.password) !== 'undefined') {
            d.password = crypto.decrypt(d.password, app.gUser, app.salt, app.iv);
        }

        // decrypt children passwords
        if(typeof(d.children) !== 'undefined') {
            $.each(d.children, function(i, child){
                if(typeof(child.password) !== 'undefined') {
                    d.children[i].password = crypto.decrypt(child.password, app.gUser, app.salt, app.iv);
                }
            });
        }

        // add row to array
        app.rows.push(new Row({
            data: d,
            index: app.rows.length,
            container: container
        }));

        return true;
    },

    //
    // Remove a row
    /////////////////
    removeRow : function(index) {

        app.rows.splice(index, 1);

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
        $('body').removeClass('loaded');
        app.loading = false;
        return true;
    },

    //
    // Download an encrypted backup
    /////////////////////////////////
    download : function() {
        if(!app.locker.data[app.locker.current].downloadUrl) {
            return false;
        }

        var url = app.locker.data[app.locker.current].downloadUrl+'&access_token='+this.gAccessToken;
        return window.open(url, '_blank');
    },

    //
    // sort
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
    // filter
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
    // generate password
    //////////////////////
    generatePassword : function() {

        // TODO password variations?
        return crypto.random();
    }

};

// initialize
app.init();

// export app
module.exports = app;

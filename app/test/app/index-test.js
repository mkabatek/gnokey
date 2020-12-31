'use strict';

//var expect = require('chai').expect;
//var $ = require('../../src/components/jquery/dist/jquery');
//var App = require('../../src/js/app');

describe('App', function () {

    describe('construct()', function(){

        it('should trigger the app-beforeLoad event on the window');

        it('should setup an interval to check if the app is loading');

        it('should listen to input events and trigger an autosave periodically');

        it('should instantiate properly');

        it('should listen for the google apis callback');

        it('should listen to the app-row-destroy event');

        it('should listen to the app-locker-change event');

        it('should listen to the app-locker-remove event');

    });

    describe('gCallback()', function(){
        
        it('should allow user to select from different accounts on login by storing google account emails in a cookie');

        it('should properly handle error callbacks, specifically the immediate_failed error');

        it('should try to perform google oauth if not authenticated');

        it('should do an ajax request to obtain the users oauth stub id once authenticated then call populate()');

        it('should load the drive API if called after the gAccessToken is already set');

    });

    describe('populate()', function(){

        it('should retrieve appdata from google drive');
        
        it('should call getLockerFileData() for each file');

    });

    describe('getLockerFileData()', function(){

        it('should call addRow() for all data rows');

    });

    describe('deleteDriveFile()', function(){

        it('should delete the current locker file from Drive');

    });

    describe('save()', function(){

        it('should loop through data rows, encrypting passwords');

        it('should upload the updated data to drive');

    });

    describe('addRow()', function(){

        it('should properly decrypt passwords in data rows, including row children');

        it('should instantiate and add a new row to the rows array');

    });

    describe('removeRow()', function(){

        it('should splice a row from the rows array');

    });

    describe('sort()', function(){

        it('should sort all rows in the dom ASC/DESC');

        it('should sort all data rows ASC/DESC');

    });

    describe('filter()', function(){

        it('should hide all rows not matching filter string');

    });

});
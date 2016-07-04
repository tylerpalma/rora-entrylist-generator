var fs = require('fs');
var Spreadsheet = require('google-spreadsheets');
var _ = require('lodash');
var async = require('async');


var opt = {
  masterKey: '1mx7DaT6tvgFN42o5qbaZswVt662ar7v92PM0y8r_0pk',
  liveryKey: '1ESc0WXtqFcVcGiRA0bhlXxm1-mo0HICmn439r16GOvs',
  carModel: 'ks_mazda_mx5_cup',
  region: 'NA',
  defaultSkin: '00_official',
};

async.waterfall([
  function(callback) {
    Spreadsheet({
      key: opt.masterKey,
    }, function(err, spreadsheet) {
      spreadsheet.worksheets[0].cells({
        range: 'R2C1:R100C8'
      }, function(err, driverCells) {
        callback(null, driverCells);
      });
    });
  },
  function(driverCells, callback) {
    Spreadsheet({
      key: opt.liveryKey,
    }, function(err, spreadsheet) {
      spreadsheet.worksheets[0].cells({
        range: 'R3C1:R100C2'
      }, function(err, liveryCells) {
        callback(null, driverCells, liveryCells)
      });
    });
  },
  function(driverCells, liveryCells, callback) {
    var liveries = _.map(liveryCells.cells, function(row) {
      return {
        redditName: _.find(row, { 'col': '1' }).value,
        liveryDirectory: _.find(row, {'col': '2'}).value,
      };
    });

    var data = _.map(driverCells.cells, function(row) {
      var driverSkin = _.find(liveries, { 'redditName': _.find(row, { 'col': '1' }).value });
      //set default skins
      if(driverSkin == undefined) {
        driverSkin = opt.defaultSkin;
      } else {
        driverSkin = driverSkin.liveryDirectory;
      }

      return {
        redditName: _.find(row, { 'col': '1' }).value,
        acName: _.find(row, { 'col': '2' }).value,
        guid: _.find(row, { 'col': '3' }).value,
        division: _.find(row, { 'col': '4' }).value,
        region: _.find(row, { 'col': '5' }).value,
        team: (_.find(row, { 'col': '6' }) ? _.find(row, { 'col': '6' }).value : '') ,
        driverNumber: _.find(row, { 'col': '8' }).value,
        skin: driverSkin,
      };
    });

    callback(null, data);
  }
], function(err, result) {
    var entrylist = '';
    var driverCount = 0;

    _.forEach(result, function(driver) {
      if(driver.region == opt.region) {
        var string = '[CAR_'+ driverCount +']\n';
        string += 'DRIVERNAME=' + driver.acName + '\n';
        string += 'TEAM=\n';
        string += 'MODEL=' + opt.carModel + '\n';
        string += 'SKIN='+ driver.skin +'\n';
        string += 'GUID=' + driver.guid + '\n';
        string += 'SPECTATOR_MODE=0\n';
        string += 'BALLAST=0\n';
        string += ' \n';

        driverCount++;

        entrylist += string;
      }
    });
    fs.writeFile('entry_list.ini', entrylist, function(err) {
      console.log('Entry_list.ini has been generated successfully.');
    });
  }
);
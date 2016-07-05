var fs = require('fs');
var Spreadsheet = require('google-spreadsheets');
var _ = require('lodash');
var async = require('async');
var prompt = require('prompt');

var defaultSkins = [
  { name: '00_official' },
  { name: '01_cup_07' },
  { name: '02_cup_23' },
  { name: '03_cup_24' },
  { name: '04_cup_29' },
  { name: '05_cup_36' },
  { name: '06_cup_55' },
  { name: '07_cup_56' },
  { name: '08_cup_57' },
  { name: '09_cup_58' },
  { name: '10_cup_60' },
  { name: '11_cup_61' },
  { name: '12_cup_62' },
  { name: '13_cup_70' },
  { name: '14_cup_87' }
];

var opt = {
  masterKey: '1mx7DaT6tvgFN42o5qbaZswVt662ar7v92PM0y8r_0pk',
  naKey: '1mog-A9imxVuiwtP70a9oktmW8soNEwlK4l5v626q5u4',
  euKey: '1jqfYmXZmjP7qHEMhuU60DRVMXQ1FRij3x5LqR2zpqHo',
  liveryKey: '1ESc0WXtqFcVcGiRA0bhlXxm1-mo0HICmn439r16GOvs',
  carModel: 'ks_mazda_mx5_cup',
  region: 'NA',
};

prompt.start();

prompt.get([{
    name: 'region',
    description: 'Which region?',
    type: 'string',
    default: 'NA'
  },
  {
    name: 'defaultCar',
    description: 'What is the default car?',
    default: 'ks_mazda_mx5_cup',
  }], function (err, result) {
    opt.region = result.region;
    opt.carModel = result.defaultCar;

    generateList();
});

function generateList() {
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
          callback(null, driverCells, liveryCells);
        });
      });
    },
    function(driverCells, liveryCells, callback) {
      Spreadsheet({
        key: (opt.region == 'NA') ? opt.naKey : opt.euKey,
      }, function(err, spreadsheet) {
        spreadsheet.worksheets[0].cells({
          range: 'R3C1:R100C4'
        }, function(err, checkInCells) {
          callback(null, driverCells, liveryCells, checkInCells);
        });
      });
    },
    function(driverCells, liveryCells, checkInCells, callback) {
      var liveries = _.map(liveryCells.cells, function(row) {
        return {
          redditName: _.find(row, { 'col': '1' }).value,
          liveryDirectory: _.find(row, {'col': '2'}).value,
        };
      });

      var driverCheckIn = _.map(checkInCells.cells, function(row) {
        var isChecked = false;

        if (_.find(row, {'col': '4'}) &&
            _.find(row, {'col': '4'}).value != undefined) {
          isChecked = true;
        }

        return {
          redditName: _.find(row, { 'col': '1' }).value,
          isCheckedIn: isChecked,
        };
      });

      var defaultSkinCount = 0;

      var data = _.map(driverCells.cells, function(row) {
        var redditName = _.find(row, { 'col': '1' }).value;
        var driverSkin = _.find(liveries, { 'redditName': redditName });
        var checkedIn = _.find(driverCheckIn, { 'redditName': redditName });

        //check if driver is checked in
        if (checkedIn != undefined &&
            checkedIn.isCheckedIn != false) {

          //set default skins if custom is not supplied
          if(driverSkin == undefined && defaultSkinCount < (defaultSkins.length - 1)) {
            driverSkin = defaultSkins[defaultSkinCount].name;
            console.log('first if: '+ defaultSkinCount);
            defaultSkinCount++;
          } else if(driverSkin == undefined && defaultSkinCount >= (defaultSkins.length - 1)) {
            defaultSkinCount = 0;
            console.log('second if: '+ defaultSkinCount);
            driverSkin = defaultSkins[defaultSkinCount].name;
            defaultSkinCount++;
          } else {
            console.log('third if: '+ defaultSkinCount);
            driverSkin = driverSkin.liveryDirectory;
          }

          // assemble driver entry and map to var data
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
        } else {
          return;
        }
      });

      callback(null, data);
    }
  ], function(err, result) {
      var entrylist = '';
      var driverCount = 0;

      _.forEach(result, function(driver) {
        if(driver != undefined &&
          driver.region == opt.region) {

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

      if(!entrylist) {
        console.log('No one is checked in for this region!');
      } else {
        fs.writeFile('entry_list.ini', entrylist, function(err) {
          console.log('Entry_list.ini has been generated successfully.');
        });
      }
    }
  );
}

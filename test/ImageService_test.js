'use strict';

var async  = require("async");
var config = require("config").db;
var dbMan  = require('./databaseManager.js');
var mmStorage = require('MediaManagerStorage')(config);
var imageService = require('../lib/plm-image/ImageService')(
  {
    db: {
      host: config.local.host,
      port: config.local.port,
      name: config.database
    }
  },
  {
    checkConfig: false
  }
);
var log4js = require('log4js');
var nano = require('nano');
var util = require('util');
var _ = require('underscore');

var chai = require('chai')
  , expect = chai.expect
  , should = require("should");

log4js.configure('./test/log4js.json');

/**
 * "describe" function is a container for test cases
 * The functions before and after would be called at the beginning and end of executing a describe block,
 * while beforeEach and afterEach are called before and after each test case of a describe block.
 */
describe('ImageService Testing', function () {
	this.timeout(30000); 

  var server = nano('http://' + imageService.config.db.host + ':' + imageService.config.db.port);

  var db_name = config.database;

  var options = {
    host:imageService.config.db.host,
    port:imageService.config.db.port,
    dbName:db_name,
		dbType: config.local.type // couchdb | touchdb
  };

	console.log("options: %j", options);

  var db = null;

  //This will be called before all tests
  before(function (done) {
    dbMan.startDatabase(options, done);
    // done();
  });//end before

  describe('ImageService.save', function () {

    /*
     Test1 Setup:
     - pick an image path from 'test/resources/images'
     - create an image record in couch using ImageService.save(imagePath)
     - perform various 'Assertions' on the Image object returned by
     save(imagePath), comparing the values of the object to a pre-determined set of
     values in the test (size, format, checksum, oid present, etc...)
     */
    var path_to_images = './test/resources/images';

    var theSavedImage = null;

    before(function (done) {

      var saveOptions={retrieveSavedImage:true};

      console.log('Before hook, about to do imageService.save...');

      // simple save
      imageService.save(
        path_to_images + '/clooney.png',
        saveOptions,
        function (err, result) {
          console.log('Before hook, imageService.save callback, err - ' + err);
          if (err) {
            console.log(err);
            done(err);
          }
          theSavedImage = result;
          done();
        }
      );

    });//end before

    //Define the tests

    /**
     * Each "it" function is a test case
     * The done parameter indicates that the test is asynchronous
     */
    it("The saved image should have some properties", function (done) {

      util.inspect(theSavedImage, true, null, true);

      theSavedImage.name.should.equal('clooney.png');
      theSavedImage.class_name.should.equal('plm.Image');
      theSavedImage.filesize.should.equal('486.3K');
      theSavedImage.format.should.equal('PNG');
      theSavedImage.size.width.should.equal(480);
      theSavedImage.size.height.should.equal(599);
      theSavedImage.geometry.should.equal("480x599");
      expect(theSavedImage.oid).to.be.not.empty;

      if (imageService.config.genCheckSums) {
        expect(theSavedImage.checksum).to.equal("7f69b43f4ef1ff0933b93e14f702bdac");
      }

      theSavedImage._attachments["clooney.png"].content_type.should.equal('image/PNG');
      theSavedImage._attachments["clooney.png"].stub.should.equal(true);
      expect(theSavedImage.variants).to.be.instanceof(Array);
      expect(theSavedImage.variants).to.be.empty;
      expect(theSavedImage.batch_id).to.be.empty;
      expect(theSavedImage.type).to.be.empty;
      expect(theSavedImage.tags).to.be.instanceof(Array);
      expect(theSavedImage.tags).to.be.empty;

      var url = util.format("http://%s:%s/%s/%s/clooney.png",
        imageService.config.db.host, imageService.config.db.port, imageService.config.db.name, theSavedImage.oid);
      theSavedImage.url.should.equal(url);

      done();
    });

  });



  /**
   * after would be called at the end of executing a describe block, when all tests finished
   */
  after(function (done) {
    dbMan.destroyDatabase(options, done);
		// done();
  });//end after

});

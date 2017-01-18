'use strict';

var path = require('path');
var _ = require('lodash');
var File = require('vinyl');
var revDel = require('./');
var should = require('should');

var oldManifest = {
	'foo.js': 'foo-abc.js',
	'bar.js': 'bar-abc.js',
	'hello': 'world'
};

var newManifest = {
	'foo.js': 'foo-def.js',
	'bar.js': 'bar-abc.js',
	'hello': 'world2'
};

var manifests = {
	oldManifest: oldManifest,
	newManifest: newManifest,
	delFn: function (files, options, cb) {
		cb(null, files);
	}
};

it('should work out which files to delete', function (cb) {
	revDel(manifests, function (err, files) {
		files.length.should.equal(2);
		files.should.eql(['foo-abc.js', 'world']);

		cb();
	});
});

it('should read from JSON files', function (cb) {
	var manifestsString = _.clone(manifests);
	manifestsString.oldManifest = 'test.json';

	revDel(manifestsString, function (err, files) {
		files.length.should.equal(2);
		files.should.eql(['foo-abc.js', 'world']);

		cb();
	});
});

it('should handle streams', function (cb) {
	var stream = revDel({
		oldManifest: 'test.json',
		delFn: function (files, options, cb) {
			cb(null, files);
		}
	});

	stream.on('data', function (file) {
		file.revDeleted.length.should.equal(2);
		file.revDeleted.should.eql(['foo-abc.js', 'world']);

		cb();
	});

	stream.write(new File({
		contents: new Buffer(JSON.stringify(newManifest))
	}));
	stream.end();
});

it('should get the file path from gulp-rev', function (cb) {
	var stream = revDel({
		delFn: function (files, options, cb) {
			cb(null, files);
		}
	});

	stream.on('data', function (file) {
		file.revDeleted.length.should.equal(2);
		file.revDeleted.should.eql(['foo-abc.js', 'world']);

		cb();
	});

	stream.write(new File({
		path: 'test.json',
		contents: new Buffer(JSON.stringify(newManifest))
	}));
	stream.end();
});

it('should not explode when rev-manifest.json is not found', function (cb) {
	var manifestsString = _.clone(manifests);
	manifestsString.oldManifest = 'doesntexist.json';

	// We're literally just testing that it doesn't throw an error
	revDel(manifestsString, function () {
		cb();
	});
});

it('should explode when suppress is set to false says to', function () {
	var manifestsString = _.clone(manifests);
	manifestsString.oldManifest = 'doesntexist.json';
	manifestsString.suppress = false;

	should.throws(function () {
		revDel(manifestsString, function () {});
	});
});

it('should accept dest', function (cb) {
	var stream = revDel({
		delFn: function (files, options, cb) {
			cb(null, files);
		},
		dest: 'test',
		oldManifest: 'test.json'
	});

	stream.on('data', function (file) {
		file.revDeleted.length.should.equal(2);
		file.revDeleted.should.eql(['test/foo-abc.js', 'test/world']);

		cb();
	});

	stream.write(new File({
		path: 'test.json',
		contents: new Buffer(JSON.stringify(newManifest))
	}));
	stream.end();
});

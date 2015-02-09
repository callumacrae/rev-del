'use strict';

var _ = require('lodash');
var File = require('vinyl');
var revDel = require('./');

require('should');

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
	delFn: function (files, cb) {
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
		delFn: function (files, cb) {
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
		delFn: function (files, cb) {
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

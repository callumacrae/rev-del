'use strict';

const path = require('path');
const _ = require('lodash');
const File = require('vinyl');
const revDel = require('./');
const should = require('should');

const oldManifest = {
	'foo.js': 'foo-abc.js',
	'bar.js': 'bar-abc.js',
	'hello': 'world'
};

const newManifest = {
	'foo.js': 'foo-def.js',
	'bar.js': 'bar-abc.js',
	'hello': 'world2'
};

const manifests = {
	oldManifest: oldManifest,
	newManifest: newManifest,
	delFn: (files, options, cb) => {
		cb(null, files);
	}
};

it('should work out which files to delete', (cb) => {
	revDel(manifests, function (err, files) {
		files.length.should.equal(2);
		files.should.eql(['foo-abc.js', 'world']);

		cb();
	});
});

it('should read from JSON files', (cb) => {
	const manifestsString = _.clone(manifests);
	manifestsString.oldManifest = 'test.json';

	revDel(manifestsString, function (err, files) {
		files.length.should.equal(2);
		files.should.eql(['foo-abc.js', 'world']);

		cb();
	});
});

it('should handle streams', (cb) => {
	const stream = revDel({
		oldManifest: 'test.json',
		delFn: function (files, options, cb) {
			cb(null, files);
		}
	});

	stream.on('data', (file) => {
		file.revDeleted.length.should.equal(2);
		file.revDeleted.should.eql(['foo-abc.js', 'world']);

		cb();
	});

	stream.write(new File({
		contents: new Buffer(JSON.stringify(newManifest))
	}));
	stream.end();
});

it('should get the file path from gulp-rev', (cb) => {
	const stream = revDel({
		delFn: function (files, options, cb) {
			cb(null, files);
		}
	});

	stream.on('data', (file) => {
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

it('should not explode when rev-manifest.json is not found', (cb) => {
	const manifestsString = _.clone(manifests);
	manifestsString.oldManifest = 'doesntexist.json';

	// We're literally just testing that it doesn't throw an error
	revDel(manifestsString, () => {
		cb();
	});
});

it('should explode when suppress is set to false says to', () => {
	const manifestsString = _.clone(manifests);
	manifestsString.oldManifest = 'doesntexist.json';
	manifestsString.suppress = false;

	should.throws(() => {
		revDel(manifestsString, () => {});
	});
});

it('should accept dest', (cb) => {
	const stream = revDel({
		delFn: function (files, options, cb) {
			cb(null, files);
		},
		dest: 'test',
		oldManifest: 'test.json'
	});

	stream.on('data', (file) => {
		file.revDeleted.length.should.equal(2);
		file.revDeleted.should.eql([path.normalize('test/foo-abc.js'), path.normalize('test/world')]);

		cb();
	});

	stream.write(new File({
		path: 'test.json',
		contents: new Buffer(JSON.stringify(newManifest))
	}));
	stream.end();
});

'use strict';

var fs = require('fs');
var _ = require('lodash');
var del = require('del');
var through = require('through2');

function revDel(options, cb) {
	if (!_.isObject(options)) {
		options = { oldManifest: options || 'rev-manifest.json' };
	}

	// Useful when testing
	options.delFn = options.delFn || del;

	if (options.newManifest) {
		var oldManifest = getManifest(options.oldManifest);
		var newManifest = getManifest(options.newManifest);
		var oldFiles = getChanged(oldManifest, newManifest);
		return options.delFn(oldFiles, cb);
	}

	// newManifest isn't specified, return a stream
	return through.obj(function (file, enc, cb) {
		if (options.oldManifest) {
			options.oldManifest = getManifest(options.oldManifest);
		} else {
			options.oldManifest = getManifest(file.path);
		}

		try {
			options.newManifest = JSON.parse(file.contents.toString(enc));
		} catch (e) {
			return cb(e);
		}

		revDel(options, function (err, filesDeleted) {
			if (err) {
				return cb(err);
			}

			file.revDeleted = filesDeleted;
			cb(null, file);
		});
	});
}

function getChanged(oldObject, newObject) {
	return _.reduce(oldObject, function (result, fingerprinted, path) {
		if (newObject[path] !== fingerprinted) {
			result.push(fingerprinted);
		}

		return result;
	}, []);
}

function getManifest(manifest) {
	if (_.isObject(manifest)) {
		return manifest;
	}

	if (_.isString(manifest)) {
		return JSON.parse(fs.readFileSync(manifest));
	}

	throw new TypeError('Manifest file must be an object or a string');
}

module.exports = revDel;

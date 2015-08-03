'use strict';

var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var del = require('del');
var through = require('through2');

function revDel(options, cb) {
	if (!_.isObject(options)) {
		options = { oldManifest: options };
	}

	// Useful when testing
	options.delFn = options.delFn || del;
	options.dest = options.dest || '.';

	options.suppress = (options.suppress !== false);

	if (options.newManifest) {
		options.oldManifest = options.oldManifest || path.join(options.dest, 'rev-manifest.json');

		var oldManifest = getManifest(options.oldManifest, options.suppress);
		var newManifest = getManifest(options.newManifest);
		var oldFiles = getChanged(oldManifest, newManifest);

		if (options.base) {
			oldFiles = _.map(oldFiles, function (file) {
				return path.join(options.dest || options.base, file);
			});
		}

		return options.delFn(oldFiles, { force: options.force }, cb);
	}

	// newManifest isn't specified, return a stream
	return through.obj(function (file, enc, cb) {
		if (!options.base && file.base) {
			options.base = file.base;
		}

		if (options.oldManifest) {
			options.oldManifest = getManifest(options.oldManifest, options.suppress);
		} else {
			options.oldManifest = getManifest(path.join(options.dest, file.path), options.suppress);
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

function getManifest(manifest, suppress) {
	if (_.isObject(manifest)) {
		return manifest;
	}

	if (_.isString(manifest)) {
		try {
			return JSON.parse(fs.readFileSync(manifest));
		} catch (e) {
			if (suppress === true) {
				return {};
			} else {
				throw e;
			}
		}
	}

	throw new TypeError('Manifest file must be an object or a string');
}

module.exports = revDel;

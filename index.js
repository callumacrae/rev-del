const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const del = require('del');
const through = require('through2');

function revDel(options, cb) {
	if (!_.isObject(options)) {
		options = { oldManifest: options };
	}

	// Useful when testing
	const delFn = options.delFn ? (files, deleteOptions) => {
		return new Promise((resolve, reject) => {
			options.delFn(files, deleteOptions, (err, filesDeleted) => {
				if (err) {
					reject(err);
				}

				resolve(filesDeleted);
			});
		});
	} : del;
	options.dest = options.dest || '.';

	options.suppress = (options.suppress !== false);

	if (options.newManifest) {
		options.oldManifest = options.oldManifest || path.join(options.dest, 'rev-manifest.json');

		const oldManifest = getManifest(options.oldManifest, options.suppress);
		const newManifest = getManifest(options.newManifest);
		let oldFiles = getChanged(oldManifest, newManifest);

		if (options.base) {
			oldFiles = _.map(oldFiles, (file) => {
				return path.join(options.dest || options.base, file);
			});
		}

		if (options.deleteMapExtensions) {
			let extCheckPath;

			oldFiles.forEach((oldFile) => {
				extCheckPath = oldFile + '.map';
				try {
					fs.statSync(extCheckPath);
					oldFiles.push(extCheckPath);
				} catch (errA) {
					const oldFileCheck = path.relative(options.dest || options.base, oldFile);
					let foundOrigKey = false;

					for (const manifestKey in oldManifest) {
						if (oldManifest.hasOwnProperty(manifestKey) && oldManifest[manifestKey] === oldFileCheck) {
							foundOrigKey = manifestKey;
							break;
						}
					}

					if (foundOrigKey !== false && Object.keys(newManifest).indexOf(foundOrigKey) === -1) {
						extCheckPath = path.join(options.dest || options.base, foundOrigKey + '.map');
						oldFiles.push(extCheckPath);
					}
				}
			});
		}

		return delFn(oldFiles, { force: options.force })
			.then((filesDeleted) => {
				return cb(null, filesDeleted);
			})
			.catch((err) => {
				return cb(err);
			});
	}

	// newManifest isn't specified, return a stream
	return through.obj((file, enc, cb) => {
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

		revDel(options, (err, filesDeleted) => {
			if (err) {
				return cb(err);
			}

			file.revDeleted = filesDeleted;
			cb(null, file);
		});
	});
}

function getChanged(oldObject, newObject) {
	return _.reduce(oldObject, (result, fingerprinted, path) => {
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

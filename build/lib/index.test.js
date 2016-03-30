'use strict';

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _2 = require('./');

var _3 = _interopRequireDefault(_2);

var _sinon = require('sinon');

var _sinon2 = _interopRequireDefault(_sinon);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _elasticsearch = require('elasticsearch');

var _elasticsearch2 = _interopRequireDefault(_elasticsearch);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('RepoSaver', function suite() {

	beforeEach(function beforeEach() {
		this.sandbox = _sinon2.default.sandbox.create();
	});

	afterEach(function afterEach() {
		this.sandbox.restore();
	});

	var settings = {
		'aws_elasticsearch': {
			'signed': true,
			'host': 'localhost:9200',
			'region': 'us-east-1',
			'access_key': 'xxxx_access',
			'secret_key': 'xxx_secret',
			'index': 'github',
			'type': 'repo'
		}
	};

	it('can be instantitated', function test() {
		(0, _assert2.default)(new _3.default(settings) instanceof _3.default);
	});

	it('will throw an error if not passed aws_elasticsearch config', function test() {
		_assert2.default.throws(function () {
			return new _3.default({});
		});
	});

	// @todo this should be in mixin library
	it('validateRequired will work as expected', function test() {
		_assert2.default.throws(function () {
			var tSettings = {};
			_3.default.prototype._validateRequired(tSettings, 'name', _lodash2.default.isString);
		});

		_assert2.default.throws(function () {
			var tSettings = { name: 1234 };
			_3.default.prototype._validateRequired(tSettings, 'name', _lodash2.default.isString);
		});

		_assert2.default.doesNotThrow(function () {
			var tSettings = { name: 'bob' };
			_3.default.prototype._validateRequired(tSettings, 'name', _lodash2.default.isString);
		});

		_assert2.default.throws(function () {
			var tSettings = {};
			_3.default.prototype._validateRequired(tSettings, 'age', _lodash2.default.isInteger);
		});

		_assert2.default.throws(function () {
			var tSettings = { age: 'asdf' };
			_3.default.prototype._validateRequired(tSettings, 'age', _lodash2.default.isInteger);
		});

		_assert2.default.doesNotThrow(function () {
			var tSettings = { age: 12 };
			_3.default.prototype._validateRequired(tSettings, 'age', _lodash2.default.isInteger);
		});
	});

	it('validateOptional will work as expected', function test() {
		_assert2.default.doesNotThrow(function () {
			var tSettings = {};
			_3.default.prototype._validateOptional(tSettings, 'name', _lodash2.default.isString);
		});

		_assert2.default.doesNotThrow(function () {
			var tSettings = { name: 'bob' };
			_3.default.prototype._validateOptional(tSettings, 'name', _lodash2.default.isString);
		});

		_assert2.default.throws(function () {
			var tSettings = { name: 1234 };
			_3.default.prototype._validateOptional(tSettings, 'name', _lodash2.default.isString);
		});
	});

	it('prune will remove all field that are not specified', function test() {
		var obj = {
			'a': 1,
			'id': 1,
			'b': 2,
			'name': 'test repo',
			'c': 3,
			'description': 'repo description',
			'd': 4,
			'pushed_at': 'iso8601ts',
			'e': 5,
			'git_url': 'github://url',
			'f': 6,
			'stargazers_count': 432,
			'g': 7,
			'forks_count': 4,
			'h': 8,
			'open_issues_count': 32
		};

		var expected = {
			'id': 1,
			'name': 'test repo',
			'description': 'repo description',
			'pushed_at': 'iso8601ts',
			'git_url': 'github://url',
			'stargazers_count': 432,
			'forks_count': 4,
			'open_issues_count': 32
		};

		_assert2.default.deepEqual(_3.default.prototype._prune(obj), expected);
	});

	it('_validate will not throw an error on valid object', function () {
		var repo = {
			'id': 1,
			'name': 'test repo',
			'description': 'repo description',
			'pushed_at': 'iso8601ts',
			'git_url': 'github://url',
			'stargazers_count': 432,
			'forks_count': 4,
			'open_issues_count': 32
		};

		_assert2.default.doesNotThrow(function () {
			_3.default.prototype._validate(repo);
		});
	});

	it('_validate will throw an error on invalid object', function test() {
		var repo = {
			'id': 1,
			'name': 'test repo',
			'description': 123,
			'pushed_at': 'iso8601ts',
			'git_url': 'github://url',
			'stargazers_count': 432,
			'forks_count': 4,
			'open_issues_count': 32
		};

		_assert2.default.throws(function () {
			_3.default.prototype._validate(repo);
		});
	});

	var inputRepos = [{
		'id': 1,
		'name': 'test repo 1',
		'description': 'repo 1 description',
		'pushed_at': 'iso8601ts',
		'git_url': 'github://url',
		'stargazers_count': 432,
		'forks_count': 4,
		'open_issues_count': 32
	}, {
		'id': 2,
		'name': 'test repo 2',
		'description': 'repo 2 description',
		'pushed_at': 'iso8601ts',
		'git_url': 'github://url',
		'stargazers_count': 862,
		'forks_count': 1,
		'open_issues_count': 10
	}, {
		'id': 3,
		'name': 'test repo 3',
		'description': 'repo 3 description',
		'pushed_at': 'iso8601ts',
		'git_url': 'github://url',
		'stargazers_count': 234,
		'forks_count': 3,
		'open_issues_count': 61
	}];

	var expectedActions = [{
		'update': {
			'_id': 1,
			'_type': 'repo',
			'_index': 'github'
		}
	}, {
		'doc': {
			'id': 1,
			'name': 'test repo 1',
			'description': 'repo 1 description',
			'pushed_at': 'iso8601ts',
			'git_url': 'github://url',
			'stargazers_count': 432,
			'forks_count': 4,
			'open_issues_count': 32
		},
		'doc_as_upsert': true
	}, {
		'update': {
			'_id': 2,
			'_type': 'repo',
			'_index': 'github'
		}
	}, {
		'doc': {
			'id': 2,
			'name': 'test repo 2',
			'description': 'repo 2 description',
			'pushed_at': 'iso8601ts',
			'git_url': 'github://url',
			'stargazers_count': 862,
			'forks_count': 1,
			'open_issues_count': 10
		},
		'doc_as_upsert': true
	}, {
		'update': {
			'_id': 3,
			'_type': 'repo',
			'_index': 'github'
		}
	}, {
		'doc': {
			'id': 3,
			'name': 'test repo 3',
			'description': 'repo 3 description',
			'pushed_at': 'iso8601ts',
			'git_url': 'github://url',
			'stargazers_count': 234,
			'forks_count': 3,
			'open_issues_count': 61
		},
		'doc_as_upsert': true
	}];

	it('_generateBulkArray will generate bulk payload for es', function test() {
		var repoSaver = new _3.default(settings);
		var bulkPayload = repoSaver._generateBulkArray(inputRepos);
		_assert2.default.deepEqual(bulkPayload, expectedActions);
	});

	it('saveRep will call client.bulk with correct payload', function test() {
		var store = [];
		var creds = void 0;
		this.sandbox.stub(_elasticsearch2.default, 'Client', function stub(config) {
			creds = config.amazonES;
			return {
				bulk: function bulk(payload) {
					store.push(payload.body);
					return _bluebird2.default.resolve();
				}
			};
		});

		var repoSaver = new _3.default(settings);
		return repoSaver.run(inputRepos).then(function () {
			// console.log('store', JSON.stringify(store, null, 4));
			_assert2.default.deepEqual(creds, {
				'region': 'us-east-1',
				'accessKey': 'xxxx_access',
				'secretKey': 'xxx_secret'
			});
			_assert2.default.deepEqual(store[0], expectedActions);
		});
	});

	it('will pass in correct config when signed is false', function test() {
		var _settings = _lodash2.default.clone(settings);
		_settings.aws_elasticsearch.signed = false;
		var store = [];
		var config = void 0;
		this.sandbox.stub(_elasticsearch2.default, 'Client', function stub(_config) {
			config = _config;
			return {
				bulk: function bulk(payload) {
					store.push(payload.body);
					return _bluebird2.default.resolve();
				}
			};
		});

		var repoSaver = new _3.default(_settings);
		return repoSaver.run(inputRepos).then(function () {
			_assert2.default.deepEqual(config, {
				'hosts': 'localhost:9200'
			});
			_assert2.default.deepEqual(store[0], expectedActions);
		});
	});
});
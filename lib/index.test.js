import assert from 'assert';
import RepoSaver from './';
import sinon from 'sinon';
import _ from 'lodash';
import elasticsearch from 'elasticsearch';
import Bluebird from 'bluebird';

describe('RepoSaver', function suite() {

	beforeEach(function beforeEach() {
		this.sandbox = sinon.sandbox.create();
	});

	afterEach(function afterEach() {
		this.sandbox.restore();
	});

	const settings = {
		'aws_elasticsearch' : {
			'signed' : true,
			'host' : 'localhost:9200',
			'region' : 'us-east-1',
			'access_key' : 'xxxx_access',
			'secret_key' : 'xxx_secret',
			'index' : 'github',
			'type' : 'repo'
		}
	};

	it('can be instantitated', function test() {
		assert(new RepoSaver(settings) instanceof RepoSaver);
	});

	it('will throw an error if not passed aws_elasticsearch config', function test() {
		assert.throws(() => {
			return new RepoSaver({});
		});
	});

	// @todo this should be in mixin library
	it('validateRequired will work as expected', function test() {
		assert.throws(() => {
			const tSettings = {};
			RepoSaver.prototype._validateRequired(tSettings, 'name', _.isString);
		});

		assert.throws(() => {
			const tSettings = {name : 1234};
			RepoSaver.prototype._validateRequired(tSettings, 'name', _.isString);
		});

		assert.doesNotThrow(() => {
			const tSettings = {name : 'bob'};
			RepoSaver.prototype._validateRequired(tSettings, 'name', _.isString);
		});

		assert.throws(() => {
			const tSettings = {};
			RepoSaver.prototype._validateRequired(tSettings, 'age', _.isInteger);
		});

		assert.throws(() => {
			const tSettings = {age : 'asdf'};
			RepoSaver.prototype._validateRequired(tSettings, 'age', _.isInteger);
		});

		assert.doesNotThrow(() => {
			const tSettings = {age : 12};
			RepoSaver.prototype._validateRequired(tSettings, 'age', _.isInteger);
		});


	});

	it('validateOptional will work as expected', function test() {
		assert.doesNotThrow(() => {
			const tSettings = {};
			RepoSaver.prototype._validateOptional(tSettings, 'name', _.isString);
		});

		assert.doesNotThrow(() => {
			const tSettings = {name : 'bob'};
			RepoSaver.prototype._validateOptional(tSettings, 'name', _.isString);
		});

		assert.throws(() => {
			const tSettings = {name : 1234};
			RepoSaver.prototype._validateOptional(tSettings, 'name', _.isString);
		});

	});

	it('prune will remove all field that are not specified', function test() {
		const obj = {
			'a': 1,
			'id' : 1,
			'b': 2,
			'name' : 'test repo',
			'c': 3,
			'description' : 'repo description',
			'd': 4,
			'pushed_at' : 'iso8601ts',
			'e': 5,
			'git_url' : 'github://url',
			'f': 6,
			'stargazers_count' : 432,
			'g': 7,
			'forks_count' : 4,
			'h': 8,
			'open_issues_count' : 32
		};

		const expected = {
			'id': 1,
			'name': 'test repo',
			'description': 'repo description',
			'pushed_at': 'iso8601ts',
			'git_url': 'github://url',
			'stargazers_count': 432,
			'forks_count': 4,
			'open_issues_count': 32
		};

		assert.deepEqual(RepoSaver.prototype._prune(obj), expected);
	});

	it('_validate will not throw an error on valid object', function () {
		const repo = {
			'id': 1,
			'name': 'test repo',
			'description': 'repo description',
			'pushed_at': 'iso8601ts',
			'git_url': 'github://url',
			'stargazers_count': 432,
			'forks_count': 4,
			'open_issues_count': 32
		};

		assert.doesNotThrow(() => {
			RepoSaver.prototype._validate(repo);
		});
	});

	it('_validate will throw an error on invalid object', function test() {
		const repo = {
			'id': 1,
			'name': 'test repo',
			'description': 123,
			'pushed_at': 'iso8601ts',
			'git_url': 'github://url',
			'stargazers_count': 432,
			'forks_count': 4,
			'open_issues_count': 32
		};

		assert.throws(() => {
			RepoSaver.prototype._validate(repo);
		});
	});

	const inputRepos = [
		{
			'id': 1,
			'name': 'test repo 1',
			'description': 'repo 1 description',
			'pushed_at': 'iso8601ts',
			'git_url': 'github://url',
			'stargazers_count': 432,
			'forks_count': 4,
			'open_issues_count': 32
		},
		{
			'id': 2,
			'name': 'test repo 2',
			'description': 'repo 2 description',
			'pushed_at': 'iso8601ts',
			'git_url': 'github://url',
			'stargazers_count': 862,
			'forks_count': 1,
			'open_issues_count': 10
		},
		{
			'id': 3,
			'name': 'test repo 3',
			'description': 'repo 3 description',
			'pushed_at': 'iso8601ts',
			'git_url': 'github://url',
			'stargazers_count': 234,
			'forks_count': 3,
			'open_issues_count': 61
		}
	];

	const expectedActions = [
		{
			'update': {
				'_id': 1,
				'_type': 'repo',
				'_index': 'github'
			}
		},
		{
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
		},
		{
			'update': {
				'_id': 2,
				'_type': 'repo',
				'_index': 'github'
			}
		},
		{
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
		},
		{
			'update': {
				'_id': 3,
				'_type': 'repo',
				'_index': 'github'
			}
		},
		{
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
		}
	];

	it('_generateBulkArray will generate bulk payload for es', function test() {
		const repoSaver = new RepoSaver(settings);
		const bulkPayload = repoSaver._generateBulkArray(inputRepos);
		assert.deepEqual(bulkPayload, expectedActions);
	});

	it('saveRep will call client.bulk with correct payload', function test() {
		const store = [];
		let creds;
		this.sandbox.stub(elasticsearch, 'Client', function stub(config) {
			creds = config.amazonES;
			return {
				bulk : (payload) => {
					store.push(payload.body);
					return Bluebird.resolve();
				}
			};
		});

		const repoSaver = new RepoSaver(settings);
		return repoSaver.run(inputRepos)
			.then(() => {
				// console.log('store', JSON.stringify(store, null, 4));
				assert.deepEqual(creds, {
					'region': 'us-east-1',
					'accessKey': 'xxxx_access',
					'secretKey': 'xxx_secret'
				});
				assert.deepEqual(store[0], expectedActions);
			});
	});

	it('will pass in correct config when signed is false', function test() {
		const _settings = _.clone(settings);
		_settings.aws_elasticsearch.signed = false;
		const store = [];
		let config;
		this.sandbox.stub(elasticsearch, 'Client', function stub(_config) {
			config = _config;
			return {
				bulk : (payload) => {
					store.push(payload.body);
					return Bluebird.resolve();
				}
			};
		});

		const repoSaver = new RepoSaver(_settings);
		return repoSaver.run(inputRepos)
			.then(() => {
				assert.deepEqual(config, {
					'hosts': 'localhost:9200'
				});
				assert.deepEqual(store[0], expectedActions);
			});
	});


});

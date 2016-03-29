'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _elasticsearch = require('elasticsearch');

var _elasticsearch2 = _interopRequireDefault(_elasticsearch);

var _httpAwsEs = require('http-aws-es');

var _httpAwsEs2 = _interopRequireDefault(_httpAwsEs);

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

var _awsSdk = require('aws-sdk');

var _awsSdk2 = _interopRequireDefault(_awsSdk);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var logger = (0, _logger2.default)('lambda-fn-save-repos');

var RepoSaver = function () {
	function RepoSaver() {
		var settings = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

		_classCallCheck(this, RepoSaver);

		if (!_lodash2.default.isObject(settings.aws_elasticsearch)) {
			throw new Error('must provide aws_elasticsearch configuration');
		}

		this.esHost = settings.aws_elasticsearch.host;
		this.awsRegion = settings.aws_elasticsearch.region;
		this.accessKey = settings.aws_elasticsearch.access_key;
		this.secretKey = settings.aws_elasticsearch.secret_key;
		this.esIndex = settings.aws_elasticsearch.index;
		this.esType = settings.aws_elasticsearch.type;
		this.signRequest = !!settings.aws_elasticsearch.signed;
		this.useEnvCreds = !!settings.aws_elasticsearch.use_env_creds;

		this._validateRequired(this, 'esHost', _lodash2.default.isString);
		if (this.signRequest) {
			this._validateRequired(this, 'awsRegion', _lodash2.default.isString);
			if (this.useEnvCreds) {
				this.myCredentials = new _awsSdk2.default.EnvironmentCredentials('AWS');
			} else {
				this._validateRequired(this, 'accessKey', _lodash2.default.isString);
				this._validateRequired(this, 'secretKey', _lodash2.default.isString);
			}
		}
		this._validateRequired(this, 'esIndex', _lodash2.default.isString);
		this._validateRequired(this, 'esType', _lodash2.default.isString);
	}

	_createClass(RepoSaver, [{
		key: '_generateBulkArray',
		value: function _generateBulkArray(repos) {
			var _this = this;

			return _lodash2.default.flatten(repos.map(function (r) {
				return _this._generateDocumentAction(r);
			}));
		}
	}, {
		key: '_generateDocumentAction',
		value: function _generateDocumentAction(repo) {
			return [{
				'update': {
					'_id': repo.id,
					'_type': this.esType,
					'_index': this.esIndex
				}
			}, {
				'doc': {
					'id': repo.id,
					'name': repo.name,
					'description': repo.description,
					'pushed_at': repo.pushed_at,
					'git_url': repo.git_url,
					'stargazers_count': repo.stargazers_count,
					'forks_count': repo.forks_count,
					'open_issues_count': repo.open_issues_count
				},
				'doc_as_upsert': true
			}];
		}
	}, {
		key: '_prune',
		value: function _prune(repo) {
			return _lodash2.default.pick(repo, ['id', 'name', 'description', 'pushed_at', 'git_url', 'stargazers_count', 'forks_count', 'open_issues_count']);
		}
	}, {
		key: '_validate',
		value: function _validate(repo) {
			this._validateOptional(repo, 'id', _lodash2.default.isInteger);
			this._validateRequired(repo, 'name', _lodash2.default.isString);
			this._validateOptional(repo, 'description', _lodash2.default.isString);
			this._validateOptional(repo, 'pushed_at', _lodash2.default.isString);
			this._validateRequired(repo, 'git_url', _lodash2.default.isString);
			this._validateOptional(repo, 'stargazers_count', _lodash2.default.isInteger);
			this._validateOptional(repo, 'forks_count', _lodash2.default.isInteger);
			this._validateOptional(repo, 'open_issues_count', _lodash2.default.isInteger);
		}
	}, {
		key: '_validateOptional',
		value: function _validateOptional(_repo, field, validator) {
			(0, _assert2.default)(!_repo[field] || validator(_repo[field]), 'optional field ' + field + ' must be valid');
		}
	}, {
		key: '_validateRequired',
		value: function _validateRequired(_repo, field, validator) {
			(0, _assert2.default)(validator(_repo[field]), 'required field ' + field + ' must be valid');
		}
	}, {
		key: 'run',
		value: function run(event) {
			var _this2 = this;

			var clientConfig = {
				hosts: this.esHost
			};

			if (this.signRequest) {
				clientConfig.connectionClass = _httpAwsEs2.default;
				clientConfig.amazonES = {
					region: this.awsRegion,
					accessKey: this.accessKey,
					secretKey: this.secretKey
				};
			}

			var client = _elasticsearch2.default.Client(clientConfig); // eslint-disable-line new-cap

			var repos = _lodash2.default.isArray(event.repos) ? event.repos : [event.repos];

			repos.forEach(function (x) {
				return _this2._validate(x);
			});
			logger.info('saving repos');
			return client.bulk(this._generateBulkArray(repos));
		}
	}]);

	return RepoSaver;
}();

exports.default = RepoSaver;
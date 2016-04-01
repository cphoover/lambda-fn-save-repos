'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _simpleValidator = require('simple-validator');

var _simpleValidator2 = _interopRequireDefault(_simpleValidator);

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

var _awsElasticsearchMixin = require('aws-elasticsearch-mixin');

var _awsElasticsearchMixin2 = _interopRequireDefault(_awsElasticsearchMixin);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var logger = (0, _logger2.default)('lambda-fn-save-repos');

var RepoSaver = function () {
	function RepoSaver() {
		var settings = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
		var AWS = arguments[1];

		_classCallCheck(this, RepoSaver);

		(0, _awsElasticsearchMixin2.default)(this, settings.elasticsearch, AWS);
		this.esIndex = settings.elasticsearch.index;
		this.esType = settings.elasticsearch.type;
		_simpleValidator2.default.required(this, 'esIndex', _lodash2.default.isString);
		_simpleValidator2.default.required(this, 'esType', _lodash2.default.isString);
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
			_simpleValidator2.default.required(repo, 'id', _lodash2.default.isInteger);
			_simpleValidator2.default.required(repo, 'name', _lodash2.default.isString);
			_simpleValidator2.default.optional(repo, 'description', _lodash2.default.isString);
			_simpleValidator2.default.optional(repo, 'pushed_at', _lodash2.default.isString);
			_simpleValidator2.default.required(repo, 'git_url', _lodash2.default.isString);
			_simpleValidator2.default.optional(repo, 'stargazers_count', _lodash2.default.isInteger);
			_simpleValidator2.default.optional(repo, 'forks_count', _lodash2.default.isInteger);
			_simpleValidator2.default.optional(repo, 'open_issues_count', _lodash2.default.isInteger);
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
		value: function run(repos) {
			var _this2 = this;

			return this.getESClient().then(function (client) {
				if (!_lodash2.default.isArray(repos)) {
					console.log('throwing new ValidationError');
					throw new _simpleValidator2.default.ValidationError('Endpoint was expecting an array');
				}

				repos.forEach(function (x) {
					return _this2._validate(x);
				});
				logger.info('saving repos');
				return client.bulk({ body: _this2._generateBulkArray(repos) });
			});
		}
	}]);

	return RepoSaver;
}();

exports.default = RepoSaver;
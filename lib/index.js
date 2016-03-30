import _ from 'lodash';
import assert from 'assert';
import es from 'elasticsearch';
import createLogger from './logger';
const logger = createLogger('lambda-fn-save-repos');

const httpAwsEsBuilder = require('http-aws-es-di/connector');

export default class RepoSaver {

	constructor(settings = {}, AWS) {
		this.AWS = AWS;
		if (!_.isObject(settings.aws_elasticsearch)) {
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

		this._validateRequired(this, 'esHost', _.isString);
		if (this.signRequest) {
			this._validateRequired(this, 'awsRegion', _.isString);
			if (this.useEnvCreds) {
				this.myCredentials = new this.AWS.EnvironmentCredentials('AWS');
			} else {
				this._validateRequired(this, 'accessKey', _.isString);
				this._validateRequired(this, 'secretKey', _.isString);
			}
		}
		this._validateRequired(this, 'esIndex', _.isString);
		this._validateRequired(this, 'esType', _.isString);


	}

	_generateBulkArray(repos) {
		return _.flatten(repos.map(r =>this._generateDocumentAction(r)));
	}

	_generateDocumentAction(repo) {
		return [
			{
				'update': {
					'_id': repo.id,
					'_type': this.esType,
					'_index': this.esIndex
				}
			},
			{
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
			}
		];
	}

	_prune(repo) {
		return _.pick(repo, [
			'id',
			'name',
			'description',
			'pushed_at',
			'git_url',
			'stargazers_count',
			'forks_count',
			'open_issues_count'
		]);
	}

	_validate(repo) {
		this._validateOptional(repo, 'id', _.isInteger);
		this._validateRequired(repo, 'name', _.isString);
		this._validateOptional(repo, 'description', _.isString);
		this._validateOptional(repo, 'pushed_at', _.isString);
		this._validateRequired(repo, 'git_url', _.isString);
		this._validateOptional(repo, 'stargazers_count', _.isInteger);
		this._validateOptional(repo, 'forks_count', _.isInteger);
		this._validateOptional(repo, 'open_issues_count', _.isInteger);
	}

	_validateOptional(_repo, field, validator) {
		assert(!_repo[field] || validator(_repo[field]), `optional field ${field} must be valid`);
	}

	_validateRequired(_repo, field, validator) {
		assert(validator(_repo[field]), `required field ${field} must be valid`);
	}

	run(repos) {
		const clientConfig = {
			hosts : this.esHost
		};

		if (this.signRequest) {
			clientConfig.connectionClass = httpAwsEsBuilder(this.AWS);
			clientConfig.amazonES = {
				region : this.awsRegion,
				accessKey : this.accessKey,
				secretKey : this.secretKey
			};
		}

		const client = es.Client(clientConfig); // eslint-disable-line new-cap

		if (!_.isArray(repos)) {
			throw new TypeError('Endpoint was expecting an array');
		}

		repos.forEach(x => this._validate(x));
		logger.info('saving repos');
		return client.bulk(this._generateBulkArray(repos));
	}

}

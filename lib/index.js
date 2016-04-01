
import _ from 'lodash';
import assert from 'assert';
import validate from 'simple-validator';
import createLogger from './logger';
import awsElasticSearchMixin from 'aws-elasticsearch-mixin';
const logger = createLogger('lambda-fn-save-repos');


export default class RepoSaver {

	constructor(settings = {}, AWS) {
		awsElasticSearchMixin(this, settings.elasticsearch, AWS);
		this.esIndex = settings.elasticsearch.index;
		this.esType = settings.elasticsearch.type;
		validate.required(this, 'esIndex', _.isString);
		validate.required(this, 'esType', _.isString);
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
		validate.required(repo, 'id', _.isInteger);
		validate.required(repo, 'name', _.isString);
		validate.optional(repo, 'description', _.isString);
		validate.optional(repo, 'pushed_at', _.isString);
		validate.required(repo, 'git_url', _.isString);
		validate.optional(repo, 'stargazers_count', _.isInteger);
		validate.optional(repo, 'forks_count', _.isInteger);
		validate.optional(repo, 'open_issues_count', _.isInteger);
	}

	_validateOptional(_repo, field, validator) {
		assert(!_repo[field] || validator(_repo[field]), `optional field ${field} must be valid`);
	}

	_validateRequired(_repo, field, validator) {
		assert(validator(_repo[field]), `required field ${field} must be valid`);
	}

	run(repos) {
		return this.getESClient()
			.then(client => {
				if (!_.isArray(repos)) {
					console.log('throwing new ValidationError');
					throw new validate.ValidationError('Endpoint was expecting an array');
				}

				repos.forEach(x => this._validate(x));
				logger.info('saving repos');
				return client.bulk({body : this._generateBulkArray(repos)});
			});
	}

}

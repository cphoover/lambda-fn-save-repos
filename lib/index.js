import RepoSaver from './repo_saver';
import config from '../config';

export default function fn(event) {
	return new RepoSaver(config.get('repo_saver'))
		.run(event);
}

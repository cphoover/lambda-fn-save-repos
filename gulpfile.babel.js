import uglify from 'gulp-uglify';
import rename from 'gulp-rename';
import sourcemaps from 'gulp-sourcemaps';
import runSequence from 'run-sequence';

import clean from 'gulp-clean';
import gulp from 'gulp';
import source from 'vinyl-source-stream';
import gulpif from 'gulp-if';
import babel from 'gulp-babel';
import istanbul from 'gulp-babel-istanbul';
import lintspaces from 'gulp-lintspaces';
import eslint from 'gulp-eslint';
import mocha from 'gulp-mocha';
import _ from 'lodash';
import browserify from 'browserify';
import babelify from 'babelify';
import taskListing from 'gulp-task-listing';

import lintspacesrc from 'linting/lintspaces';
import spacesindentrc from 'linting/spaceindent';
import path from 'path';
const eslintConfigFile = path.join(__dirname, 'node_modules', 'linting', '.eslintrc.json');
const buildDir = path.join(__dirname, 'build');
const topLevelDirs = '{config,lib}'; // these are the dirs that will be scanned

gulp.task('clean', function () {
	return gulp.src(['build'], {
		read: false
	})
		.pipe(clean());
});


function handleError(err, msg) {
	console.error(`Uh Oh Looks like something went wrong:\n ${msg || ''}`);
	throw err;
}

gulp.task('bundle', ['clean'], function bundleVendorRun() {
	const bundler = browserify().transform(babelify.configure({
		presets: ['es2015']
	}));

	bundler.require('./lib');

	return bundler.bundle()
		.on('error', err => handleError('issue while bundling shared libs!!!', err))
		.pipe(source('index.js'))
		.pipe(gulp.dest(buildDir));
});

gulp.task('build', ['test'], function (cb) {
	runSequence('clean', 'minify', cb);
});

gulp.task('minify', ['bundle'], function minifyJavascript() {
	return gulp.src(['./build/**/*.js'])
			.pipe(rename({
				extname: '.min.js'
			}))
			.pipe(sourcemaps.init({
				loadMaps: true
			}))
			.pipe(uglify())
			.pipe(sourcemaps.write('./'))
			.pipe(gulp.dest(path.join(buildDir)));
});


const config = {
	coverage: {
		statements: 80,
		branches: 80,
		functions: 80,
		lines: 80
	},
	paths: {
		eslint: [
			'*.js',
			topLevelDirs + '/**/*.js'
		],
		eslintJSX: [
			'*.jsx',
			topLevelDirs + '/**/*.jsx'
		],
		js: [
			'*.js',
			topLevelDirs + '/**/*.js',
			'!**/*.test.js'
		],
		test: [
			'*.test.js',
			topLevelDirs + '/**/*.test.js'
		],
		whitespace: [
			'*.*',
			topLevelDirs + '/**/*.*',
			'!**/*.yaml'
		],
		packagejson: [
			'package.json'
		]
	}
};

function onError(e) {
	throw e;
}

function CheckCoverage() {
	function checkTypeCoverage(v, k) {
		return config.coverage[k] > v.pct;
	}

	const failedCoverage = _.some(istanbul.summarizeCoverage(),
		checkTypeCoverage);

	if (failedCoverage) {
		this.emit('error',
			new Error('Inadequate test coverage'));
	}
}

gulp.task('lint:whitespace', function lintWhitespace() {
	const notPackages = config.paths.packagejson.map(file => `!${file}`);

	return gulp.src(config.paths.whitespace.concat(notPackages))
		.pipe(lintspaces(lintspacesrc))
		.pipe(lintspaces.reporter())
		.on('error', onError);
});

gulp.task('lint:package', function lintWhitespace() {
	return gulp.src(config.paths.packagejson)
		.pipe(lintspaces(spacesindentrc))
		.pipe(lintspaces.reporter())
		.on('error', onError);
});

gulp.task('lint:js', function lintJS() {
	return gulp.src(config.paths.eslint)
		.pipe(
			gulpif(
				/\.test.js$/,
				eslint({
					envs : ['mocha'],
					configFile: eslintConfigFile
				}),
				eslint(eslintConfigFile)
			)
		)
		.pipe(eslint.format())
		.pipe(eslint.failAfterError())
		.on('error', onError);
});

gulp.task('lint:jsx', function lintJS() {
	return gulp.src(config.paths.eslintJSX)
		.pipe(eslint(eslintConfigFile))
		.pipe(eslint.format())
		.pipe(eslint.failAfterError())
		.on('error', onError);
});

gulp.task('mocha', function mochaRun(cb) {
	gulp.src(config.paths.js)
		.pipe(istanbul())
		.pipe(istanbul.hookRequire())
		.on('finish', function runTests() {
			gulp.src(config.paths.test)
				.pipe(babel())
				.pipe(mocha())
				.pipe(istanbul.writeReports())
				.on('end', CheckCoverage)
				.on('end', cb)
				.on('error', onError);
		});
});


gulp.task('lint', ['lint:whitespace', 'lint:package', 'lint:js', 'lint:jsx']);
gulp.task('test', ['lint', 'mocha']);
gulp.task('default', ['test']);

gulp.task('help', taskListing);

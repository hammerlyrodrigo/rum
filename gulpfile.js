'use strict';

// Load some modules which are installed through NPM.
var gulp = require('gulp');
var del = require('del'); // Deletes files.
var browserSync = require('browser-sync');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var browserify = require('browserify'); // Bundles JS.
var babelify = require('babelify');
var uglify = require('gulp-uglify');
var rename     = require('gulp-rename');

// Define some paths.


// Define configuration values
var cfg = {
    paths: {},
    extensions: [],
    babelify: {},
    browserify: {}
};

cfg.paths = {
    entries: ['./src/rum.js'],
    workers: ['./src/worker/dispatcher.js'],
    js: ['src/**/*.js']
};

cfg.extensions = ['.js'];

cfg.babelify = {
    stage: 0
};

cfg.browserify.main = {
    entries: cfg.paths.entries,
    extensions: cfg.extensions,
    transform: [babelify.configure(cfg.configure), 'workerify'],
    debug: true
};

cfg.browserify.worker = {
    entries: cfg.paths.workers,
    extensions: cfg.extensions,
    transform: [babelify.configure(cfg.configure)],
    debug: true
};

var reload = browserSync.reload;

// watch files for changes and reload
gulp.task('serve', function () {
    browserSync({
        server: {
            baseDir: './'
        }
    });
    gulp.watch(cfg.paths.js, ['build'], reload).on('change', function (
        event) {
        console.log('Event type: ' + event.type); // added, changed, or deleted
        console.log('Event path: ' + event.path); // The path of the modified file
    });
});


// DSpendency task, it will be run before the js tasks.
// Dependency tasks should call the callback to tell the parent task that
// they're done.
gulp.task('clean', function (done) {
    del(['build/run.js', 'build/run.min.js'], done);
});

gulp.task('clean-worker', function (done) {
    del(['build/dispatcher.js'], done);
});

// Our JS task. It will Browserify our code and compile files.
gulp.task('worker', ['clean-worker'], function () {
    // Browserify/bundle the JS.
    browserify(cfg.browserify.worker)
        .on('error', errorHandler)
        .bundle()
        .on('error', errorHandler)
        .pipe(source('../build/dispatcher.js'))
        .pipe(gulp.dest('./src/'));
});

// Our JS task. It will Browserify our code and compile files.
gulp.task('build', ['clean','worker'], function () {
    // Browserify/bundle the JS.
    browserify(cfg.browserify.main)
        .on('error', errorHandler)
        .bundle()
        .on('error', errorHandler)
        .pipe(source('../build/rum.js'))
        .pipe(gulp.dest('./src/'))
        .pipe(buffer())
        .pipe(rename({ extname: '.min.js' }))
        .pipe(uglify())
        .pipe(gulp.dest('./src/'));
});

// Rerun tasks whenever a file changes.
gulp.task('watch', function () {
    gulp.watch(cfg.paths.js, ['build']);
});

// The default task (called when we run `gulp` from cli)
gulp.task('default', ['watch', 'build']);

// Handle the error
function errorHandler(error) {
    console.log(error.toString());
    this.emit('end'); // jshint ignore:line
}

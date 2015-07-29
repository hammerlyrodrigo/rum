'use strict'

// Load some modules which are installed through NPM.
var gulp = require('gulp');
var browserify = require('browserify'); // Bundles JS.
var del = require('del'); // Deletes files.
var babelify = require('babelify');
var source = require('vinyl-source-stream');

// Define some paths.
var paths = {
    app_js: ['./src/rum.js'],
    js: ['src/**/*.js']
};

// An example of a dependency task, it will be run before the js tasks.
// Dependency tasks should call the callback to tell the parent task that
// they're done.
gulp.task('clean', function (done) {
    del(['build'], done);
});


// Our JS task. It will Browserify our code and compile React JSX files.
gulp.task('build', ['clean'], function () {
    // Browserify/bundle the JS.
    browserify({
            entries: paths.app_js,
            extensions: ['.js'],
            debug: true
        })
        .transform(babelify.configure({
            stage: 0
        }))
        .on('error', errorHandler)
        .bundle()
        .on('error', errorHandler)
        .pipe(source('../build/rum.js'))
        .pipe(gulp.dest('./src/'));
});

// Rerun tasks whenever a file changes.
gulp.task('watch', function () {
    gulp.watch(paths.js, ['build']);
});

// The default task (called when we run `gulp` from cli)
gulp.task('default', ['watch', 'build']);

// Handle the error
function errorHandler(error) {
    console.log(error.toString());
    this.emit('end');
}

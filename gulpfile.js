'use strict';
var gulp = require('gulp')
  , del = require('del')
  , jshint = require('gulp-jshint')
  , plumber = require('gulp-plumber')
  , browserify = require('browserify')
  , babelify = require("babelify")
  , source = require('vinyl-source-stream')
  , mocha = require('gulp-mocha')
  , size = require('gulp-size')
  , buffer = require('vinyl-buffer')
  , postcss = require('gulp-postcss')
  , webserver = require('gulp-webserver')
  , sourcemaps = require('gulp-sourcemaps')
  , gutil = require('gulp-util')
  ;

gulp.task('clean', function(cb) {
  del(['dist'], cb);
});

gulp.task('lint', function() {
  return gulp.src(['js/**/*.js', 'tests/**/*.js'])
    .pipe(plumber())
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

gulp.task('css', function () {
  var processors = [
    require('autoprefixer-core')({browsers: ['last 2 version']}),
    require("postcss-import")(),
    require("postcss-nested")()
  ];
  return gulp.src('css/*.css')
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(postcss(processors))
    .on('error', function (error) {
      gutil.log(
        gutil.colors.cyan('PostCSS') + gutil.colors.red(' found unhandled error:\n'),
        error.toString()
      );
      this.emit('end');
    })
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./dist/css'))
    .pipe(buffer())
    .pipe(size({
      showFiles: true
    }))
    .pipe(size({
      showFiles: true,
      gzip: true
    }));
});

gulp.task('browserify', function() {
  return browserify('js/main.js', {
    debug: true
  }).transform(babelify)
    .bundle()
    .on('error', function (error) {
      gutil.log(
        gutil.colors.cyan('Browserify') + gutil.colors.red(' found unhandled error:\n'),
        error.toString()
      );
      this.emit('end');
    })
    .pipe(source('main.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('dist/js'))
    .pipe(size({
      showFiles: true
    }))
    .pipe(size({
      showFiles: true,
      gzip: true
    }));
});

gulp.task('test', function () {
  return gulp.src('tests/**/*.js', {read: false})
    .pipe(mocha({
      reporter: 'dot'
    }));
});

gulp.task('static', function () {
  gulp.src('static/*')
    .pipe(gulp.dest('dist'))
    .pipe(buffer())
    .pipe(size({
      showFiles: true
    }))
    ;
});

gulp.task('serve', ['build'], function() {
  gulp.src('dist')
    .pipe(webserver({
      port: 4000
    }));
});

gulp.task('build', ['css', 'browserify', 'static']);

gulp.task('watch', function() {
  gulp.watch('static/*', ['static']);
  gulp.watch('css/**/*.css', ['css']);
  gulp.watch(['js/**/*.js'], ['lint', 'browserify']);
});

gulp.task('default', ['lint', 'build', 'test', 'watch', 'serve']);

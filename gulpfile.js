'use strict';
var _ = require('lodash')
  , gulp = require('gulp')
  , del = require('del')
  , eslint = require('gulp-eslint')
  , plumber = require('gulp-plumber')
  , browserify = require('browserify')
  , babelify = require('babelify')
  , source = require('vinyl-source-stream')
  , mocha = require('gulp-mocha')
  , size = require('gulp-size')
  , buffer = require('vinyl-buffer')
  , postcss = require('gulp-postcss')
  , webserver = require('gulp-webserver')
  , sourcemaps = require('gulp-sourcemaps')
  , gutil = require('gulp-util')
  , fontello = require('gulp-fontello')
  , cached = require('gulp-cached')
  , watchify = require('watchify')
  ;

var customOpts = {
  entries: ['js/main.js'],
  debug: true
};
var opts = _.assign({}, watchify.args, customOpts);
var b = watchify(browserify(opts))
  .transform(babelify.configure({
    // Make sure to change in test_compiler.js too
    optional: ['es7.classProperties']
  }))
  .on('update', bundle)
  .on('log', gutil.log)
  ;

function bundle() {
  return b.bundle()
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
}

gulp.task('clean', function(cb) {
  del(['dist'], cb);
});

gulp.task('lint', function() {
  return gulp.src(['js/**/*.js', 'tests/**/*.js'])
    .pipe(plumber())
    .pipe(cached('linting'))
    .pipe(eslint())
    .pipe(eslint.format());
});

gulp.task('font', function () {
  return gulp.src('fontello.json')
    .pipe(plumber())
    .pipe(fontello())
    .pipe(gulp.dest('./dist/font'));
});

gulp.task('css', ['font'], function () {
  var processors = [
    require('autoprefixer-core')({browsers: ['last 2 version']}),
    require('postcss-import')(),
    require('postcss-nested')(),
    require('postcss-color-function')()
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

gulp.task('browserify', ['lint'], bundle);

gulp.task('test', function () {
  return gulp.src('tests/**/*.js', {read: false})
    .pipe(mocha({
      reporter: 'dot',
      compilers: {
        js: require('./test_compiler')
      }
    }));
});

gulp.task('static', function () {
  gulp.src('static/**/*')
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
      host: '0.0.0.0',
      port: 4000
    }));
});

gulp.task('build', ['css', 'browserify', 'static']);

gulp.task('watch', function() {
  gulp.watch('static/*', ['static']);
  gulp.watch('css/**/*.css', ['css']);
  gulp.watch(['js/**/*.js'], ['lint']);

  process.stdin.setEncoding('utf8');
  process.stdin.on('readable', function() {
    var chunk = process.stdin.read();
    switch (chunk) {
      case null:
        gutil.log('This build system supports stdin commands');
        break;
      case 'test\n':
        gulp.tasks.test.fn();
        break;
      default:
        gutil.log('Unknown command');
    }
  });
});

gulp.task('default', ['lint', 'build', 'watch', 'serve']);

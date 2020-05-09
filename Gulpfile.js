// Gulp Dependencies
var gulp = require('gulp');
var rename = require('gulp-rename');

// Build Dependencies
var browserify = require('browserify');
var uglify = require('gulp-uglify');

// Style Dependencies
var sass = require('gulp-sass');
var prefix = require('gulp-autoprefixer');
var minifyCSS = require('gulp-minify-css');

// Development Dependencies
var util = require('gulp-util');
var jshint = require('gulp-jshint');
var sourcemaps = require('gulp-sourcemaps');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');

// Test Dependencies
var mochaPhantomjs = require('gulp-mocha-phantomjs');

//
// linting
//////////////
gulp.task('lint-src', function() {
  return gulp.src('./src/**/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

gulp.task('lint-test', function() {
  return gulp.src('./test/**/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

//
// browserify
//////////////
gulp.task('browserify-src', ['lint-src'], function() {
    var bundler = browserify({
        entries: './src/js/index.js', 
        debug: true
    });

  return bundler.bundle()
    .on('error', util.log.bind(util, 'Browserify Error'))
    .pipe(source('index.js'))
    // Optional, remove if you don't want sourcemaps
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(sourcemaps.write('./'))

    // move to build
    .pipe(gulp.dest('./build'))
});

gulp.task('browserify-test', ['lint-test'], function() {
  var bundler = browserify({
        entries: './test/index.js', 
        debug: true
    });

  return bundler.bundle()
    .on('error', util.log.bind(util, 'Browserify Error'))
    .pipe(source('index-test.js'))

    // Optional, remove if you don't want sourcemaps
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(sourcemaps.write('./'))

    // move to build
    .pipe(gulp.dest('./build'))
});

//
// test
/////////
gulp.task('test', ['browserify-src', 'browserify-test'], function() {
  return gulp.src('./test/index.html')
    .pipe(mochaPhantomjs());
});

//
// uglify js w/sourcemaps
//////////////////////////
gulp.task('uglify', ['browserify-src'], function() {
  return gulp.src('build/index.js')
    .pipe(uglify())

    // source maps
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(rename('index.min.js'))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('public/app/js'));
});

//
// Compile sass (minify w/sourcemaps)
//////////////////////////////////////
gulp.task('sass', function(){
    return gulp.src('./src/sass/main.scss')
      .pipe(sourcemaps.init())
      .pipe(sass().on('error', sass.logError))
      .pipe(prefix({
        browsers: ['> 3%'],
        cascade: false
      }))
      .pipe(minifyCSS())
      .pipe(rename('main.min.css'))
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest('./build'))
      .pipe(gulp.dest('./public/app/css'))
});

//
// watch
//////////
gulp.task('watch', function() {
  gulp.watch('src/js/**/*.js', ['uglify']);
  gulp.watch('test/**/*.js', ['test']);
  gulp.watch('src/sass/**/*.scss', ['sass']);
});

// ----------------------------------------- //

// build
gulp.task('build', ['test','uglify','sass']);

// default
gulp.task('default', ['build','watch']);

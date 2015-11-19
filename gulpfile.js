'use strict';

var gulp       = require('gulp');
var babelify   = require('babelify');
var browserify = require('browserify');
var fs         = require('fs');
var nodemon = require('gulp-nodemon');
//var server = require('./server.js');
//var express = require('express');
var server = require('./server').server;
var port = 8080;

//server.use(express.static('public'));


gulp.task('watch', function(){
  console.log('starting watch');
	gulp.watch("./app/components/*.js",['build']);
});

gulp.task('build', function() {
	console.log('running build task');
  // From Babel's example setup.
  // See https://babeljs.io/docs/setup/#browserify
  browserify({ debug: true })
    .transform(babelify)
    .require("./app/client.js", { entry: true })
    .bundle()
    .on("error", function (err) { console.log("Error: " + err.message); })
    .pipe(fs.createWriteStream("./public/bundle.js"));
});

gulp.task('runServer', function(){
  console.log('runServer');
	server.start(function (err) {
    if (err) {
          throw err;
      }
    console.log('Server running');
  });
});


gulp.task('default', ['build', 'watch', 'runServer']);

/*gulp.task('changedFile', function(){
	console.log('file is changed');
})*/

// gulp.watch('components/**/*.js', ['changedFile']);

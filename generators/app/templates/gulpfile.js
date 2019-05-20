var gulp = require('gulp')
var fs = require('fs')
var path = require('path')
var config = require('rc')('wap', {
  projectName: process
    .cwd()
    .split(path.sep)
    .pop()
})

fs.readdirSync(path.join(__dirname, 'tasks'))
  .filter(function(file) {
    return file.indexOf('.') !== -1
  })
  .forEach(function(file) {
    var registerTask = require(path.join(__dirname, 'tasks', file))
    registerTask(gulp, config)
  })

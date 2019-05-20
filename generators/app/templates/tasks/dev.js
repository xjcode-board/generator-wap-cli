var fs = require('fs')
var path = require('path')
var del = require('del')
var ejs = require('gulp-ejs')
var less = require('gulp-less')
var util = require('./lib/util')
var gulpif = require('gulp-if')
var ejshelper = require('tmt-ejs-helper')
var bs = require('browser-sync').create() // 自动刷新浏览器
var webpack = require('webpack-stream')
var babel = require('gulp-babel')
var fontSpider = require('gulp-font-spider')
var proxyMiddleware = require('http-proxy-middleware')
var preprocess = require('gulp-preprocess')

var webpackConfigPath = path.join(process.cwd(), 'webpack.config.js')
var webpackConfig // webpack 配置
var jsPath = path.join(process.cwd(), 'src', 'js')

if (util.dirExist(jsPath) && util.fileExist(webpackConfigPath)) {
  webpackConfig = require(webpackConfigPath)
  webpackConfig.output.publicPath = path.join('..', 'js/')
}

var paths = {
  src: {
    dir: './src',
    img: './src/img/**/*.{JPG,jpg,png,gif,svg}',
    js: './src/js/**/*.js',
    fonts: './src/fonts/*.{otf,ttf,OTF,TTF}',
    less: './src/css/*.less',
    html: './src/pages/*.html'
  },
  dev: {
    dir: './dev',
    css: './dev/css',
    fonts: './dev/fonts',
    html: './dev/pages',
    js: './dev/js'
  }
}

module.exports = function(gulp, config) {

  // 复制操作
  var copyHandler = function(type, file) {
    file = file || paths['src'][type]

    return gulp
      .src(file, { base: paths.src.dir })
      .pipe(gulp.dest(paths.dev.dir))
      .on('end', reloadHandler)
  }

  // 自动刷新
  var reloadHandler = function() {
    config.livereload && bs.reload()
  }

  //清除目标目录
  function delDev() {
    return del([paths.dev.dir])
  }

  //复制操作 start
  function copyImg() {
    return copyHandler('img')
  }

  function copyFonts() {
    return copyHandler('fonts')
  }

  //编译 less
  function compileLess() {
    return gulp
      .src(paths.src.less)
      .pipe(less({ relativeUrls: true }))
      .on('error', function(error) {
        console.log(error.message)
      })
      .pipe(gulp.dest(paths.dev.css))
      .on('data', function() {})
      .on('end', reloadHandler)
  }

  //编译 html
  function compileHtml() {
    return gulp
      .src(paths.src.html)
      .pipe(
        ejs(ejshelper()).on('error', function(error) {
          console.log(error.message)
        })
      )
      .pipe(gulpif(config.supportSpider, fontSpider()))
      .pipe(gulp.dest(paths.dev.html))
      .on('data', function() {})
      .on('end', reloadHandler)
  }

  //编译 JS
  function compileJs() {
    var condition = webpackConfig ? true : false

    return gulp
      .src(paths.src.js)
      .pipe(
        preprocess({
          context: {
            NODE_ENV: process.env.NODE_ENV || 'development'
          }
        })
      )
      .pipe(
        gulpif(
          condition,
          webpack(webpackConfig),
          babel({
            presets: ['es2015', 'stage-2']
          })
        )
      )
      .pipe(gulp.dest(paths.dev.js))
      .on('end', reloadHandler)
  }

  //启动 livereload
  function startServer() {
    var middleware = proxyMiddleware('/api', {
      target: config.proxy,
      changeOrigin: true,
      pathRewrite: {
        '^/api': ''
      },
      logLevel: 'debug'
    })
    bs.init({
      server: {
        baseDir: paths.dev.dir,
        middleware: middleware
      },
      port: config['livereload']['port'] || 8080,
      startPath: config['livereload']['startPath'] || '/html',
      reloadDelay: 0,
      notify: {
        //自定制livereload 提醒条
        styles: [
          'margin: 0',
          'padding: 5px',
          'position: fixed',
          'font-size: 10px',
          'z-index: 9999',
          'bottom: 0px',
          'right: 0px',
          'border-radius: 0',
          'border-top-left-radius: 5px',
          'background-color: rgba(60,197,31,0.5)',
          'color: white',
          'text-align: center'
        ]
      }
    })
  }

  var watchHandler = function(type, file) {
    var target = file.match(/^src[\/|\\](.*?)[\/|\\]/)[1]

    switch (target) {
      case 'img':
        if (type === 'removed') {
          var tmp = file.replace(/src/, 'dev')
          del([tmp])
        } else {
          copyHandler('img', file)
        }
        break

      case 'js':
        if (type === 'removed') {
          var tmp = file.replace('src', 'dev')
          del([tmp])
        } else {
          compileJs()
        }
        break

      case 'css':
        var ext = path.extname(file)

        if (type === 'removed') {
          var tmp = file.replace('src', 'dev').replace(ext, '.css')
          del([tmp])
        } else {
          if (ext === '.less') {
            compileLess()
          }
        }

        break

      case 'fonts':
        if (type === 'removed') {
          var tmp = file.replace(/src/, 'dev')
          del([tmp])
        } else {
          copyHandler('fonts', file)
        }

        break

      case 'pages':
        if (type === 'removed') {
          var tmp = file.replace('src', 'dev')
          del([tmp]).then(function() {
            util.loadPlugin('dev')
          })
        } else {
          compileHtml()
        }

        if (type === 'add') {
          setTimeout(function() {
            util.loadPlugin('dev')
          }, 500)
        }
        break
    }
  }

  //监听文件
  function watch(cb) {
    var watcher = gulp.watch(
      [
        paths.src.img,
        paths.src.fonts,
        paths.src.js,
        paths.src.less,
        paths.src.html
      ], { ignored: /[\/\\]\./ }
    )

    watcher
      .on('change', function(file) {
        util.log(file + ' has been changed')
        watchHandler('changed', file)
      })
      .on('add', function(file) {
        util.log(file + ' has been added')
        watchHandler('add', file)
      })
      .on('unlink', function(file) {
        util.log(file + ' is deleted')
        watchHandler('removed', file)
      })
    cb()
  }

  //加载插件
  function loadPlugin(cb) {
    util.loadPlugin('dev')
    cb()
  }

  //注册 dev 任务
  gulp.task(
    'dev',
    gulp.series(
      delDev,
      gulp.parallel(copyImg, copyFonts, compileJs, compileLess),
      compileHtml,
      gulp.parallel(watch, loadPlugin),
      startServer
    )
  )
}

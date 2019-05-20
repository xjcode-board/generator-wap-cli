var _ = require('lodash')
var fs = require('fs')
var del = require('del')
var path = require('path')
var ejs = require('gulp-ejs')
var gulpif = require('gulp-if')
var less = require('gulp-less')
var util = require('./lib/util')
var uglify = require('gulp-uglify')
var usemin = require('gulp-usemin')
var minifyCSS = require('gulp-cssnano')
var imagemin = require('gulp-imagemin')
var pngquant = require('imagemin-pngquant')
var ejshelper = require('tmt-ejs-helper')
var postcss = require('gulp-postcss') // CSS 预处理
var postcssPxtorem = require('postcss-pxtorem') // 转换 px 为 rem
var postcssAutoprefixer = require('autoprefixer')
var posthtml = require('gulp-posthtml')
var posthtmlPx2rem = require('posthtml-px2rem')
var revall = require('gulp-rev-all') // reversion
var revDel = require('gulp-rev-delete-original')
var changed = require('./common/changed')()
var webpack = require('webpack-stream')
var babel = require('gulp-babel')
var htmlmin = require('gulp-htmlmin')
var fontSpider = require('gulp-font-spider')
var preprocess = require('gulp-preprocess')

var webpackConfigPath = path.join(process.cwd(), 'webpack.config.js')
var webpackConfig // webpack 配置
var jsPath = path.join(process.cwd(), 'src', 'js')

if (util.dirExist(jsPath) && util.fileExist(webpackConfigPath)) {
  webpackConfig = require(webpackConfigPath)
}

var paths = {
  src: {
    dir: './src',
    img: './src/img/**/*.{JPG,jpg,png,gif,svg}',
    fonts: './src/fonts/*.{otf,ttf,OTF,TTF}',
    js: './src/js/**/*.js',
    less: './src/css/*.less',
    html: './src/pages/**/*.html'
  },
  dev: {
    fonts: './dev/fonts/*.{otf,ttf,OTF,TTF}',
  },
  tmp: {
    dir: './tmp',
    css: './tmp/css',
    img: './tmp/img',
    fonts: './tmp/fonts',
    html: './tmp/pages',
    js: './tmp/js'
  },
  dist: {
    dir: './dist',
    css: './dist/css',
    img: './dist/img',
    fonts: './dist/fonts',
    html: './dist/pages'
  }
}

module.exports = function(gulp, config) {

  var postcssOption = []

  if (config.supportREM) {
    postcssOption = [
      postcssAutoprefixer({ browsers: ['last 5 versions'] }),
      postcssPxtorem({
        root_value: '75', // 基准值 html{ font-zise: 75px; }
        prop_white_list: [], // 对所有 px 值生效
        minPixelValue: 2 // 忽略 1px 值
      })
    ]
  } else {
    postcssOption = [postcssAutoprefixer({ browsers: ['last 5 versions'] })]
  }

  function copyFonts() {
    return gulp
      .src(paths.dev.fonts)
      .pipe(gulp.dest(paths.tmp.fonts))
  }

  // 清除 dist 目录
  function delDist() {
    return del([paths.dist.dir])
  }

  // 清除 tmp 目录
  function delTmp() {
    return del([paths.tmp.dir])
  }

  //编译 less
  function compileLess() {
    return gulp
      .src(paths.src.less)
      .pipe(less({ relativeUrls: true }))
      .pipe(gulp.dest(paths.tmp.css))
  }

  //自动补全
  function compileAutoprefixer() {
    return gulp
      .src('./tmp/css/*.css')
      .pipe(postcss(postcssOption))
      .pipe(gulp.dest('./tmp/css/'))
  }

  //CSS 压缩
  function miniCSS() {
    return gulp
      .src('./tmp/css/*.css')
      .pipe(
        minifyCSS({
          safe: true,
          reduceTransforms: false,
          advanced: false,
          compatibility: 'ie7',
          keepSpecialComments: 0
        })
      )
      .pipe(gulp.dest('./tmp/css/'))
  }

  //图片压缩
  function imageminImg() {
    return gulp
      .src(paths.src.img)
      .pipe(
        imagemin({
          use: [pngquant()]
        })
      )
      .pipe(gulp.dest(paths.tmp.img))
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
      .pipe(uglify())
      .pipe(gulp.dest(paths.tmp.js))
  }

  //html 编译
  function compileHtml() {
    var options = {
      collapseWhitespace: true,
      collapseBooleanAttributes: true,
      removeComments: true,
      removeEmptyAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      minifyJS: true,
      minifyCSS: true
    }
    return gulp
      .src(paths.src.html)
      .pipe(ejs(ejshelper()))
      .pipe(
        gulpif(
          config.supportREM,
          posthtml(
            posthtmlPx2rem({
              rootValue: 75,
              minPixelValue: 2
            })
          )
        )
      )
      .pipe(htmlmin(options))
      .pipe(gulp.dest(paths.tmp.html))
      .pipe(usemin())
      .pipe(gulp.dest(paths.tmp.html))
  }


  //新文件名(md5)
  function reversion(cb) {
    if (config['reversion']) {
      return gulp
        .src(['./tmp/**/*'])
        .pipe(
          revall.revision({
            fileNameManifest: 'manifest.json',
            dontRenameFile: ['.html'],
            dontUpdateReference: ['.html'],
            transformFilename: function(file, hash) {
              var filename = path.basename(file.path)
              var ext = path.extname(file.path)

              if (/^\d+\..*\.js$/.test(filename)) {
                return filename
              } else {
                return (
                  path.basename(file.path, ext) + '.' + hash.substr(0, 8) + ext
                )
              }
            }
          })
        )
        .pipe(gulp.dest(paths.tmp.dir))
        .pipe(
          revDel({
            exclude: /(.html|.htm)$/
          })
        )
        .pipe(revall.manifestFile())
        .pipe(gulp.dest(paths.tmp.dir))
    } else {
      cb()
    }
  }

  function findChanged(cb) {
    if (!config['supportChanged']) {
      return gulp
        .src(['./tmp/**/*', '!./tmp/**/*manifest.json'], { base: paths.tmp.dir })
        .pipe(gulp.dest(paths.dist.dir))
        .on('end', function() {
          delTmp()
        })
    } else {
      var diff = changed('./tmp')
      var tmpSrc = []
      console.log(diff)
      if (!_.isEmpty(diff)) {
        //如果有reversion
        if (config['reversion'] && config['reversion']['available']) {
          var keys = _.keys(diff)

          //先取得 reversion 生成的manifest.json
          var reversionManifest = require(path.resolve('./tmp/manifest.json'))

          if (reversionManifest) {
            reversionManifest = _.invert(reversionManifest)

            reversionManifest = _.pick(reversionManifest, keys)

            reversionManifest = _.invert(reversionManifest)

            _.forEach(reversionManifest, function(item, index) {
              tmpSrc.push('./tmp/' + item)
              console.log('[changed:] ' + util.colors.blue(index))
            })

            //将新的 manifest.json 保存
            fs.writeFileSync(
              './tmp/manifest.json',
              JSON.stringify(reversionManifest)
            )

            tmpSrc.push('./tmp/manifest.json')
          }
        } else {
          _.forEach(diff, function(item, index) {
            tmpSrc.push('./tmp/' + index)
            console.log('[changed:] ' + util.colors.blue(index))
          })
        }

        return gulp
          .src(tmpSrc, { base: paths.tmp.dir })
          .pipe(gulp.dest(paths.dist.dir))
          .on('end', function() {
            delTmp()
          })
      } else {
        console.log('Nothing changed!')
        delTmp()
        cb()
      }
    }
  }

  //注册 build 任务
  gulp.task(
    'build',
    gulp.series(
      delDist,
      gulp.parallel(compileLess, imageminImg, compileJs),
      compileAutoprefixer,
      copyFonts,
      miniCSS,
      compileHtml,
      reversion,
      findChanged
    )
  )
}

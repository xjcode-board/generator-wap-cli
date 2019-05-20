> 前端工作流脚手架 wap-cli

## 功能特性

- 自动化流程
  - [Less -> CSS](鉴于sass环境不方便移植，第一版本暂不支持sass)
  - [CSS Autoprefixer 前缀自动补全]
  - [CSS 压缩 cssnano]
  - [fontSpider 字蛛 font-spider]
  - [imagemin 图片压缩]
  - [JS 合并压缩]
- 调试 & 部署
  - [监听文件变动，自动刷新浏览器 (LiveReload)
- 解决方案集成
  - [px -> rem 兼容适配方案]
  - [去缓存文件 Reversion (MD5) 解决方案]
  - [定义环境变量 preprocess 灵活切换环境]
  - [开发环境 api 接口环境代理]

## 目录结构

#### 工作流目录结构

```bash

project/
├── _tasks                  // Gulp 任务目录
│   ├── dev.js              // gulp dev
│   ├── build.js            // gulp build
│   │
│   ├── common
│   │   └── changed.js
│   │
│   ├── index.js
│   │
│   ├── lib
│   │   └── util.js
│   │
│   └── plugins             // 插件目录
│       ├── dev.js
│
├── package.json
│
├── src
├── dev
├── dist
└── gulpfile.js            // 项目目录，详见下述项目结构 ↓↓↓
```

#### 项目目录结构

```bash
project/                          // 项目目录
├── gulpfile.js                   // Gulp 工作流配置文件
│
├── src                           // 源文件目录，`gulp dev`阶段会监听此目录下的文件变动
│   ├── css                       // 存放 Less 文件的目录，
│   │   └── lib/
│   │   │   ├── lib-reset.less
│   │   │   ├── lib-mixins.less
│   │   │   └── lib-rem.less
│   │   └── index.less            // CSS 编译出口文件
│   │
│   ├── js
│   │   └── lib/
│   │        ├── utils.js        // 工具函数
│   ├── pages
│   ├── img                       // 存放背景图等无需合并雪碧图处理的图片
│   ├── fonts                     //字体文件  
│
├── dev                           // 开发目录，由 `gulp dev` 任务生成
│   ├── css
│   ├── pages
│   ├── img
│   ├── fonts
│   ├── js
│
└── dist                          // 生产目录，由 `gulp build` 任务生成
    ├── css
│   ├── pages
│   ├── img
│   ├── fonts
│   ├── js
```

## 配置文件 `.waprc`

`.waprc` 配置文件为**隐藏文件**，位于工作流根目录，可存放配置信息或开启相关功能，
_如：开启 字蛛 功能，开启 REM 支持等。_

## 任务说明

> 注 1：**`./src`** 为源文件(开发目录)，`/dev` 和 `/dist` 目录为流程**自动**生成的**临时目录**。  
> 注 2：打包环境代码命令 ，具体环境可根据实际情况来定义，测试环境`npm run test` 预发布环境`npm run pre` 正式环境`npm run prd`

"use strict";
const Generator = require("yeoman-generator");
const path = require("path");
const chalk = require("chalk");
const yosay = require("yosay");
const mkdirp = require("mkdirp");
module.exports = class extends Generator {
  prompting() {
    // Have Yeoman greet the user.
    this.log(
      yosay(
        `Welcome to the beautiful ${chalk.red("generator-wap-cli")} generator!`
      )
    );
    this.log(chalk.magenta("▬▬▬▬开始配置工作流▬▬▬▬"));

    const prompts = [
      {
        type: "input",
        name: "projectName",
        message: "项目名",
        default: this.appname
      },
      {
        type: "input",
        name: "version",
        message: "版本号",
        default: "0.0.1"
      },
      {
        type: "input",
        name: "description",
        message: "描述",
        default: ""
      },
      {
        type: "input",
        name: "author",
        message: "作者",
        default: this.user.git.name()
      },
      {
        type: "input",
        name: "email",
        message: "邮箱",
        default: this.user.git.email()
      },
      {
        type: "list",
        name: "projectLicense",
        message: "Please choose license:",
        choices: ["MIT", "ISC", "Apache-2.0", "AGPL-3.0"]
      },
      {
        type: "checkbox",
        name: "features",
        message: "▬▬▬▬ 选择更多功能 <空格键> ▬▬▬▬",
        choices: [
          {
            name: "开启：LiveReload",
            value: "includeLivereload",
            checked: true
          },
          {
            name: "开启：REM支持",
            value: "includeRem",
            checked: true
          },
          {
            name: "开启：字蛛",
            value: "includeSpider",
            checked: false
          },
          {
            name: "开启：文件变动支持",
            value: "includeChanged",
            checked: true
          },
          {
            name: "开启：文件版本号",
            value: "includeReversion",
            checked: false
          }
        ]
      },
      {
        type: "confirm",
        name: "needNpmInstall",
        message:
          chalk.green("配置完成，项目创建成功！") +
          "\n  是否自动执行 " +
          chalk.yellow("`npm install`") +
          "?"
      }
    ];

    return this.prompt(prompts).then(props => {
      this.props = props;
      var features = props.features;
      function hasFeature(feat) {
        return features.indexOf(feat) !== -1;
      }
      this.includeLivereload = hasFeature("includeLivereload");
      this.includeRem = hasFeature("includeRem");
      this.includeSpider = hasFeature("includeSpider");
      this.includeChanged = hasFeature("includeChanged");
      this.includeReversion = hasFeature("includeReversion");
    });
  }

  default() {
    if (path.basename(this.destinationPath()) !== this.props.projectName) {
      this.log(`\nYour generator must be inside a folder named
        ${this.props.projectName}\n
        I will automatically create this folder.\n`);

      mkdirp(this.props.projectName);
      this.destinationRoot(this.destinationPath(this.props.projectName));
    }
  }

  writing() {
    this.log("\nWriting...\n");
    this.fs.copy(this.templatePath("src"), this.destinationPath("src"));
    this.fs.copy(this.templatePath("tasks"), this.destinationPath("tasks"));
    this._writingPackageJSON();
    this._writingWaprc();
    this.fs.copy(
      this.templatePath("README.md"),
      this.destinationPath("README.md")
    );

    this.fs.copy(
      this.templatePath("_eslintrc.yaml"),
      this.destinationPath(".eslintrc.yaml")
    );

    this.fs.copy(
      this.templatePath("_eslintignore"),
      this.destinationPath(".eslintignore")
    );

    this.fs.copy(
      this.templatePath("gulpfile.js"),
      this.destinationPath("gulpfile.js")
    );

    this.fs.copy(
      this.templatePath("_gitignore"),
      this.destinationPath(".gitignore")
    );
  }

  _writingPackageJSON() {
    this.fs.copyTpl(
      this.templatePath("_package.json"),
      this.destinationPath("package.json"),
      {
        projectName: this.props.projectName,
        version: this.props.version,
        author: this.props.author,
        email: this.props.email,
        repository: this.props.repository,
        license: this.props.license
      }
    );
  }

  _writingWaprc() {
    this.fs.copyTpl(
      this.templatePath("_.waprc"),
      this.destinationPath(".waprc"),
      {
        includeLivereload: this.includeLivereload,
        includeRem: this.includeRem,
        includeSpider: this.includeSpider,
        includeChanged: this.includeChanged,
        includeReversion: this.includeReversion
      }
    );
  }

  end() {
    this.installDependencies({
      bower: false,
      skipInstall: !this.needNpmInstall
    });
  }

  install() {
    this.log("\nInstall deps...\n");
    this.installDependencies();
  }
};

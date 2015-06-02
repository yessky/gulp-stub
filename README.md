# gulp-mobile-stub

移动端前端项目脚手架

使用了gulp/sass, 在使用之前确保gulp,sass等已经安装

### 工具安装

1. 安装nodejs

2. 安装ruby

3. 安装sass(gem install sass)

4. 安装gulp(npm install gulp -g)

5. 安装依赖(npm install)

6. 编辑器配置见Editor.config

### 目录结构

	- src 开发环境下的资源文件夹

		-	js

			- lib 项目依赖的js库

			- core 核心模块

			- plugin 实现的公用组件

			- app 项目相关模块

		- sass

			_reset.scss reset默认样式

			_animation.scss 常用的css3动画样式

		- icons icons切片

		index.html 应用入口页面

	- dev	构建好的资源(用于开发阶段的测试服务器，未压缩优化)

	- release 构建好的线上版本(经过压缩优化，可直接复制该目录部署到服务器上)


### 如何工作:

	1. 执行 npm install 安装构建工具所依赖的模块

	2. 执行 gulp 构建本地测试版本并启动静态服务器

	3. 执行 gulp alpha 构建测试环境版本

	3. 执行 gulp release 构建线上正式环境版本

### 如何实现一个页面

下面以实现登录(Login.js)页面为例

1. 在src/js/app目录下新建文件Login.js

2. 用一个立即执行的函数来限制作用域，页面实现的具体代码放入该函数体类

```javascript
;!function(kjs) {
	// 获取基类
	var Page = kjs.getClass("ui.Page");

	var LoginPage = kjs.declare("ui.Login", [Page], {
		title: "Login",
		templateString: "...."
		// others
	});

}(this.kjs);
```

3. kjs.declare声明一个类，接受三个参数(类名，[依赖的基类]，类的原型)

4. kjs.getDeclare("ui.Page")接受一个参数(类名), 用来获取使用kjs.declare声明的类

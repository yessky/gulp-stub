var gulp = require("gulp")
	, gutil = require("gulp-util")

	, clean = require("gulp-clean")
	, concat = require("gulp-concat")
	, sass = require("gulp-sass")
	, inject = require("gulp-inject")
	, rename = require("gulp-rename")
	, uglify = require("gulp-uglify")

	, browserSync = require("browser-sync").create()
	, reload = browserSync.reload

	, sequence = require("gulp-sequence")
	, svgsprite = require("gulp-svgsprite")
	, svgmin = require("gulp-svgmin")

	, through2 = require("through2");

// # app configs
var src = "src/"
	, dev = "dev/"
	, dist = "dist/";

var config = {
	modulus: 'modulus'
	, local: {
		server: 'http://localhost:3000/'
		, appid: 'wx616917744e1c23d9'
		, authurl: 'http://localhost:3000/wechat'
	}
};

// # clean
gulp.task("clean:dev", function () {
	return gulp.src(dev).pipe(clean());
});

gulp.task("clean:dist", function () {
	return gulp.src(dist).pipe(clean());
});


// # sass
gulp.task("sass",function() {
	return gulp.src(src + "sass/*.scss")
		.pipe(sass())
		.pipe(gulp.dest(dev + "assets/css/"));
});


// # concat and copy js libraries
gulp.task("concat:lib", function() {
	return gulp.src([
			src + "js/lib/underscore.js"
			, src + "js/lib/zepto.js"
			, src + "js/lib/backbone.js"
			, src + "js/lib/iscroll-probe.js"
			, src + "js/core/engine.js"
			, src + "js/core/declare.js"
			, src + "js/core/State.js"
			, src + "js/core/Deferred.js"
			, src + "js/core/aspect.js"
			, src + "js/core/Widget.js"
			, src + "js/core/Template.js"
			, src + "js/common/*.js"
		])
		.pipe(concat("lib.js"))
		.pipe(gulp.dest(dev + "./assets/js/"));
});


// # concat and copy app js
gulp.task("concat:app", function() {
	return gulp.src(src + "js/app/**/*.js")
		.pipe(concat("app.js"))
		.pipe(gulp.dest(dev + "assets/js/"));
});


// # svg sprites
gulp.task("svgsprite", function() {
	var spritecss = through2.obj(function(file, encoding, cb) {
	  var data = file.metadata;
	  var result = "";
	  var isMeasurable = {width: 1, height: 1};
	  // cheerio will convert rgb/a color to hex color
	  for (var name in data) {
	  	var icon = data[name];
	  	if (result) {
	  		result += "\n";
	  	}
	  	result += "." + name.replace(/\./g, "-") + " { ";
	  	for (var p in icon) {
	  		var val = icon[p];
	  		result += p + ": " + (isMeasurable[p] ? "pxToRem(" + val + "px)" : val) + "; ";
	  	}
	  	result += "}";
	  }
	  var meta = new gutil.File({
		  path: '_icons.scss',
		  contents: new Buffer(result)
	  });
	  this.push(meta);
	  this.push(file);
	  cb();
  });
	return gulp.src(src + "icons/*.svg")
		.pipe(rename({prefix: 'icon-'}))
		.pipe(svgmin())
		.pipe(svgsprite({
			inlineSvg: true
			, metaAttrs: ["width", "height", "fill"]
			, cleanAttrs: ["fill", "style"]
		}))
		.pipe(spritecss)
		.pipe(gulp.dest(src + "sass/"));
});


// # inject configs and sprites
gulp.task("inject:sprite", function() {
	var stream = gulp.src(src + "sass/icons.svg");
	var transform = function(filePath, file) {
		return file.contents.toString();
	};
	return gulp.src(dev + "index.html")
		.pipe(inject(stream, {
			starttag: "<!-- @@SPRITE"
			, endtag: "@@ -->"
			, transform: transform
			, removeTags: true
		}))
		.pipe(gulp.dest(dev));
});


// # inject configs
var injectOption = function(opt, env, wrap) {
	return {
		starttag: "<!-- @@" + opt.toUpperCase()
		, endtag: "@@ -->"
		, transform: function() {
			var name = opt.toLowerCase();
			var content = name === "modulus" ?
				config[name] || config[env][name] : config[env][name];
			if (name === "maintain") {
				content = Date.now().toString(32);
			}
			return wrap(name, content);
		}
		, removeTags: true
	}
};
var injectConfig = function(env) {
	return function() {
		var stream = gulp.src("./package.json", {read: false});
		var metaFunc = function(name, content) {
			return "<meta name=\"" + name +"\" content=\"" + content + "\">";
		};
		var jsFunc = function(name, content) {
			return content;
		};
		var maintain = injectOption("maintain", env, metaFunc);
		var modulus = injectOption("modulus", env, metaFunc);
		var appserver = injectOption("server", env, jsFunc);
		var appid = injectOption("appid", env, jsFunc);
		var appAuthurl = injectOption("authurl", env, jsFunc);
		return gulp.src([
				dev + "index.html"
				, dev + "assets/js/app.js"
			], {base: dev})
			.pipe(inject(stream, maintain))
			.pipe(inject(stream, modulus))
			.pipe(inject(stream, appserver))
			.pipe(inject(stream, appid))
			.pipe(inject(stream, appAuthurl))
			.pipe(gulp.dest(dev));
	};
};

gulp.task("inject:config@local", injectConfig("local"));

gulp.task("inject:config@alpha", injectConfig("alpha"));

gulp.task("inject:config@release", injectConfig("release"));

// # start web server
gulp.task("server", function() {
	browserSync.init({
		server: {
			baseDir: dev
		}
	});

	gulp.watch(src + "js/{lib,core,plugin}/*.js", ["concat:lib"]);
	gulp.watch(src + "js/app/*.js", ["concat:app"]);
	gulp.watch([
		src + "*.html"
		, src + "images/*.{png,jpg,jpeg,gif}"
	], ["copy:dev"]);
	gulp.watch(src + "icons/**/*.svg", ["svgsprite"]);
	gulp.watch(src + "sass/*.scss", ["sass"]);
	gulp.watch(src + "sass/icons.svg", ["inject:sprite"]);

	// reload if neccessary
	gulp.watch(dev + "**/*").on("change", reload);
});


// # copy static resources to dev folder
gulp.task("copy:dev", function() {
	return gulp.src([
			src + "*.html"
			, src + "images/**/*.{jpg,jpeg,png,gif}"
		], {base: src})
		.pipe(rename(function(path) {
			if (path.dirname === "images") {
				path.dirname = "assets/images";
			}
		}))
		.pipe(gulp.dest(dev));
});

// # copy static resources to release folder
gulp.task("copy:dist", function() {
	return gulp.src(dev + "**/*", {base: dev})
		.pipe(gulp.dest(dist));
});


// # uglify js
gulp.task("uglify", function() {
	return gulp.src(dist + "assets/js/*.js", {base: dist})
		.pipe(uglify())
		.pipe(gulp.dest(dist));
});


// # basic build process depends on nothing
gulp.task("build", sequence(["copy:dev", "svgsprite", "concat:lib", "concat:app"], ["sass", "inject:sprite"]));

// #############################################
// # public task
// # don't call above defined tasks directly

gulp.task("default", sequence("clean:dev", "build", "inject:config@local", "server"));
gulp.task("alpha", sequence("clean:dev", "build", "inject:config@alpha", "copy:dist", "uglify"));
gulp.task("release", sequence("clean:dev", "build", "inject:config@release", "copy:dist", "uglify"));
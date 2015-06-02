;!function(kjs) {
	//	 summary:
	//		base Class for creating page

	var declare = kjs.declare;
	var Widget = kjs.getDeclare("ui.Widget");
	var Template = kjs.getDeclare("ui.Template");

	var templateString = "<div class=\"<%=baseClass%>\" id=\"<%=id%>\">\n	<header class=\"page-header\" data-kjs-node=\"pageHead\">\n		<div class=\"left\">\n			<span class=\"btn-back\" data-kjs-event=\"tap: onBack\">\n				<svg class=\"icon icon-arrow icon-back\"><use xlink:href=\"#icon-arrow\"></use></svg>\n				<span>返回</span>\n			</span>\n		</div>\n		<div class=\"center\">\n			<span class=\"title\" data-kjs-node=\"pageTitle\"><%-title%></span>\n		</div>\n	</header>\n	<div class=\"page-body<%if(scrollable){%> ui-scrollview<%}%>\" data-kjs-node=\"pageBody\">\n		<div class=\"page-content<%if(scrollable){%> ui-scrollview-inner<%}%>\" data-kjs-node=\"pageContent\">${content}</div>\n	</div>\n</div>";

	var Page = declare("ui.Page", [Widget, Template], {
		// page title
		title: "",

		_setTitleAttr: function(title) {
			document.title = title;
			if (this.pageTitle) {
	      this.pageTitle.innerHTML = title;
	    }
		},

		baseClass: "kjs-page",

		// scrollView settings
		scrollable: 1,

		scrollPullUp: 0,

		scrollPullDown: 0,

		scrollLoadable: function() {
			return false;
		},

		onPullDown: function() {
			var def = new kjs.Deferred();
	    def.resolve();
	    return def.promise;
		},

		onPullUp: function() {
			return this.onPullDown();
		},

		// request queue
		ajaxQueue: function() {},

		onBack: function() {
			kjs.history.back();
		},

		postMixInProperties: function() {
			this.templateString = Page.templateString.replace("${content}", this.templateString);
			this.inherited(arguments);
		},

		buildRendering: function() {
			this.inherited(arguments);
			if (this.scrollable) {
	      this.scrollView = new kjs.ScrollView({
	        domNode: this.pageBody,
	        pullDown: this.scrollPullDown,
	        pullUp: this.scrollPullUp,
	        onPullDown: kjs.hitch(this, this.onPullDown),
	        onPullUp: kjs.hitch(this, this.onPullUp),
	        isLoadable: kjs.hitch(this, this.scrollLoadable)
	      });
	    }
		},

		postCreate: function() {
			this.inherited(arguments);
			var inClass = "slide in";
			if (kjs.history.isBack) {
	      inClass += ' reverse';
	    }
	    kjs.addClass(this.domNode, inClass);
	    if (this.scrollable) {
	    	this.scrollView.refresh();
	    }
		},

		bind: function() {
			var x = this.inherited(arguments);
			x.name = arguments[1];
			return x;
		},

		destroy: function() {
			if (this.scrollView) {
				this.scrollView.destroy();
				delete this.scrollView;
			}
			if (!kjs.hasClass(this.domNode, "slide")) {
				this.inherited(arguments);
			} else {
				var args = arguments;
				var outClass = "out" + (kjs.history.isBack ? " reverse" : "");
				this.bind(this.domNode, kjs.fx.animationEnd, function() {
					if (kjs.hasClass(this.domNode, "out")) {
            this.inherited(args);
          }
				});
	      kjs.removeClass(this.domNode, "in reverse");
	      kjs.addClass(this.domNode, outClass);
			}
		}
	});

	Page.templateString = templateString;
	kjs.Page = Page;

}(this.kjs);
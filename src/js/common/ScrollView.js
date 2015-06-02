;!function(kjs) {
	var cssDuration = kjs.fx.cssPrefix.replace(/-/g, '') + 'TransitionDuration';

	function ScrollView(param) {
    var icons, scrollerParam, wrapper;
    kjs.mixin(this, param);
    if (!this.domNode) {
      return;
    }
    scrollerParam = {
      scrollbars: true,
      interactiveScrollbars: true,
      shrinkScrollbars: 'scale',
      fadeScrollbars: true,
      preventDefault: false
    };
    if (this.probeType) {
      scrollerParam.probeType = this.probeType;
    } else if (this.pullDown || this.pullUp) {
      scrollerParam.probeType = 2;
    }
    this.scroller = new IScroll(this.domNode, scrollerParam);
    wrapper = $(this.domNode).children('.ui-scrollview-inner');
    icons = '<span class="pull-icon"><svg class="icon icon-loading"><use xlink:href="#icon-loading"></use></svg><svg class="icon icon-dir"><use xlink:href="#icon-dir"></use></svg></span>';
    if (this.pullDown) {
      this.pullDownNode = $('<div class="ui-pulldown inactive">' + icons + '<span class="text">' + this.pullDownText + '</span></div>')[0];
      wrapper.prepend(this.pullDownNode);
      this.pullDownTextNode = $(this.pullDownNode).find('.text')[0];
      this.pullOffset = this.pullDownNode.offsetHeight;
    }
    if (this.pullUp) {
      this.pullUpNode = $('<div class="ui-pullup">' + icons + '<span class="text">' + this.pullUpText + '</span></div>')[0];
      this._updateUpPuller();
      wrapper.append(this.pullUpNode);
      this.pullUpTextNode = $(this.pullUpNode).find('.text')[0];
    }
    if (this.pullUp || this.pullDown) {
      this.scroller.on('refresh', this._hitch(this._onRefresh));
      this.scroller.on('scrollStart', this._hitch(this._onScrollStart));
      this.scroller.on('scroll', this._hitch(this._onScroll));
      this.scroller.on('scrollEnd', this._hitch(this._onScrollEnd));
      this.refresh();
    }
  }

  kjs.mixin(ScrollView.prototype, {
  	pullUp: true,
  	pullDown: true,
  	pullDownText: '下拉刷新',
  	pullDownFlipText: '松手后刷新',
  	pullDownLoadingText: '正在刷新...',
  	pullUpText: '上拉加载',
  	pullUpFlipText: '松手后加载更多',
  	pullUpLoadingText: '正在加载...',
  	pullOffset: 0,
  	startY: 0,

  	onPullDown: function() {
	    var def = new kjs.Deferred();
	    def.resolve();
	    return def.promise;
	  },

	  onPullDown: function() {
	    return this.onPullDown();
	  },

	  isLoadable: function() {
	    return true;
	  },

	  refresh: function() {
	    return this.scroller.refresh();
	  },

	  destroy: function() {
	  	if (this._destroyed) {
	    	return;
	  	}
	    this.scroller.disable();
	    this.scroller.destroy();
	    if (this.pullUp) {
	    	kjs.removeNode(this.pullUpNode);
	    }
	    if (this.pullDown) {
	    	kjs.removeNode(this.pullDownNode);
	    }
	    this.scroller = this.pullDownTextNode = this.pullUpNode = null;
	    this.pullUpTextNode = this.pullUpNode = null;
	    this._destroyed = 1;
	  },

	  _onScrollStart: function() {
	    this.startY = this.scroller.y;
	    this.loadable = this.isLoadable();
	    return this._updateUpPuller();
	  },

	  _onScroll: function() {
	    if (this.startY === 0 && this.scroller.y === 0) {
	      this.scroller.hasVerticalScroll = true;
	      this.startY = -1000;
	    }
	    if (this.pullDown) {
	      if (this.scroller.y > this.pullOffset && !this.pullDownNode.className.match('flip')) {
	        this._showDownPuller('flip');
	        this.scroller.scrollBy(0, -this.pullOffset, 0);
	        this.pullDownTextNode.innerHTML = this.pullDownFlipText;
	      } else if (this.scroller.y < 0 && this.pullDownNode.className.match('flip')) {
	        this._hideDownPuller(0, false);
	        this.scroller.scrollBy(0, this.pullOffset, 0);
	        this.pullDownTextNode.innerHTML = this.pullDownText;
	      }
	    }
	    if (this.pullUp && this.loadable) {
	      if (this.scroller.y < (this.scroller.maxScrollY - 5) && !this.pullUpNode.className.match('flip')) {
	        this.pullUpNode.className = 'ui-pullup flip';
	        return this.pullUpTextNode.innerHTML = this.pullUpFlipText;
	      } else if (this.scroller.y > (this.scroller.maxScrollY + 5) && this.pullUpNode.className.match('flip')) {
	        this.pullUpNode.className = 'ui-pullup';
	        return this.pullUpTextNode.innerHTML = this.pullUpText;
	      }
	    }
	  },

	  _onScrollEnd: function() {
	    var callback;
	    callback = this._hitch(this.refresh);
	    if (this.pullDown && this.pullDownNode.className.match('flip')) {
	      this._showDownPuller('loading');
	      this.pullDownTextNode.innerHTML = this.pullDownLoadingText;
	      if (this.onPullDown) {
	        this.onPullDown().then(callback, callback);
	      }
	    }
	    if (this.pullUp && this.pullUpNode.className.match('flip')) {
	      this.pullUpNode.className = 'ui-pullup loading';
	      this.pullUpTextNode.innerHTML = this.pullUpLoadingText;
	      if (this.onPullUp) {
	        this.onPullUp().then(callback, callback);
	      }
	    }
	    if (this.startY === -1000) {
	      return this.scroller.hasVerticalScroll = this.scroller.options.scrollY && this.scroller.maxScrollY < 0;
	    }
	  },

	  _onRefresh: function() {
	    var time;
	    if (this.pullDown && this.pullDownNode.className.match('loading')) {
	      this.pullDownTextNode.innerHTML = this.pullDownText;
	      if (this.scroller.y >= 0) {
	        this._hideDownPuller(250, true);
	      } else if (this.scroller.y > -this.pullOffset) {
	        this.pullDownNode.style.marginTop = this.scroller.y + 'px';
	        time = 250 * (this.pullOffset + this.scroller.y) / this.pullOffset;
	        this.scroller.scrollTo(0, 0, 0);
	        setTimeout((function(_this) {
	          return function() {
	            return _this._hideDownPuller(time, true);
	          };
	        })(this), 0);
	      } else {
	        this._hideDownPuller(0, true);
	        this.scroller.scrollBy(0, this.pullOffset, 0);
	      }
	    }
	    if (this.pullUp && this.pullUpNode.className.match('loading')) {
	      this.pullUpNode.className = 'ui-pullup';
	      this.pullUpTextNode.innerHTML = this.pullUpText;
	    }
	    if (this.pullUp) {
	      return this._updateUpPuller();
	    }
	  },

	  _showDownPuller: function(cls) {
	    var node;
	    node = this.pullDownNode;
	    node.style[this.cssDuration] = '';
	    node.style.marginTop = '';
	    return node.className = 'ui-pulldown ' + cls;
	  },

	  _hideDownPuller: function(time, doRefresh) {
	    var node;
	    node = this.pullDownNode;
	    node.style[this.cssDuration] = time > 0 ? time + 'ms' : '';
	    node.style.marginTop = '';
	    node.className = 'ui-pulldown inactive';
	    if (doRefresh) {
	      return setTimeout((function(_this) {
	        return function() {
	          return _this.scroller.refresh();
	        };
	      })(this), time + 10);
	    }
	  },

	  _updateUpPuller: function() {
	    return this.pullUpNode.style.visibility = this.isLoadable() ? 'visible' : 'hidden';
	  },

	  _hitch: function(fn) {
	    return kjs.hitch(this, fn);
	  }
  });

	kjs.ScrollView = ScrollView;

}(this.kjs);
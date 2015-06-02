;!function(global) {
	// module:
	//		engine
	// summary:
	//		implement core apis.

	var global = this;
	var kjs = global.kjs = {};
	var doc = document;

	// ========================================
	// # a simple has.js api
	var element = doc.createElement('DiV');
	var cache = {};

	var has = function( name ) {
		return typeof cache[name] === 'function' ?
			(cache[name] = cache[name]( global, doc, element )) :
			cache[name];
	};

	has.add = function( name, test, now, force ) {
		(cache[name] === undefined || force) && (cache[name] = test);
		return now && has( name );
	};

	kjs.has = has;

	has.add('bug-for-in-skips-shadowed', function() {
		for ( var i in {toString: 1} ) {
			return 0;
		}
		return 1;
	});

	// ========================================
	// # type and mixin functions
	var toString = {}.toString;
	var shadowNames =
			has('bug-for-in-skips-shadowed') ?
				'hasOwnProperty.valueOf.isPrototypeOf.propertyIsEnumerable.toLocaleString.toString.constructor'.split('.') : [];
	var shadowLen = shadowNames.length;

	kjs.type = function( o ) {
		if ( o == null ) {
			return String( o );
		}
		var d = toString.call( o );
		return ( d.match( /\[\w+\s*(\w+)\]/ )[1] || 'object' ).toLowerCase();
	}

	kjs.mixin = function( dest, source, mixFunc ) {
		var name, s, i, empty = {};

		for ( name in source ) {
			s = source[ name ];
			if ( !(name in dest) || (dest[name] !== s &&
				(!(name in empty) || empty[name] !== s)) ) {
				dest[ name ] = mixFunc ? mixFunc( name, s ) : s;
			}
		}

		if ( has('bug-for-in-skips-shadowed') ) {
			for ( i = 0; i < shadowLen; i++ ) {
				name = shadowNames[i];
				s = source[ name ];
				if ( !(name in dest) || (dest[name] !== s &&
					(!(name in empty) || empty[name] !== s)) ) {
					dest[ name ] = mixFunc ? mixFunc( name, s ) : s;
				}
			}
		}

		return dest;
	};

	kjs.mixin._shadowNames = shadowNames;

	// ========================================
	// # browser sniff
	var userAgent = navigator.userAgent;
	has.add( "wechat-browser", /MicroMessenger/i.test(userAgent) );
	has.add( "android", /android/i.test(userAgent) );
	has.add( "ios", /ipad|iphone/i.test(userAgent) );

	// ========================================
 	// # mount underscore/zepto/Backbone utils
 	$.each(["each", "trim", "isArray", "isFunction", "isEmptyObject", "isPlainObject", "fx"], function(i, attr) {
 		kjs[attr] = $[attr];
 	});

 	// ========================================
 	// # mount dom operations
 	var proxyNode = $("<b></b>");
 	var proxyCall = function(node) {
 		return (proxyNode[0] = node, proxyNode);
 	};
 	kjs.addClass = function(node, className) {
 		return proxyCall(node).addClass(className);
 	};
 	kjs.removeClass = function(node, className) {
 		return proxyCall(node).removeClass(className);
 	};
 	kjs.hasClass = function(node, className) {
 		return proxyCall(node).hasClass(className);
 	};
 	kjs.addStyle = function(node, name, value) {
 		var zepto = proxyCall(node);
 		return kjs.isPlainObject(name) ?
 			zepto.css(name) : zepto.css(name, value);
 	};
 	kjs.removeNode = function(node) {
 		return proxyCall(node).remove();
 	};
 	kjs.parseHTML = function parseHTML(shtml) {
 		var div, frag, nodes;
	  div = parseHTML._parser;
	  if (!div) {
	    div = parseHTML._parser = $('<div></div>');
	  }
	  nodes = div.html(shtml).children();
	  frag = document.createDocumentFragment();
	  nodes.each(function(i, node) {
	    return frag.appendChild(node);
	  });
	  div.html('');
	  if (frag.childNodes.length === 1) {
	    return frag.childNodes[0];
	  }
	  return frag;
 	};
 	kjs.template = function(templateString) {
 		return _.template(templateString);
 	};

	// ========================================
	// # env sniff
	var uidCache = {};
  kjs.uid = function( scope ) {
    scope = scope.replace( /\.|-/g, '_' );
    var id = uidCache[ scope ];
    if ( !id ) {
      uidCache[ scope ] = id = 0;
    }
    uidCache[ scope ] = ++id;
    return scope + '_' + id;
  };

  // ========================================
 	// # cookie
 	kjs.mixin(kjs.cookie = {}, {
 		set: function(name, value, option) {
		  var cookie, expires;
		  cookie = name + '=' + encodeURIComponent(value);
		  option = option || {};
		  if (option.expires) {
		    expires = new Date((new Date()).getTime() + option.expires * 60000 * 60 * 24);
		    cookie += ';expires=' + expires.toGMTString();
		  }
		  if (option.path) {
		    cookie += ';path=' + option.path;
		  }
		  if (option.domain) {
		    cookie += ';domain=' + option.domain;
		  }
		  if (option.secure) {
		    cookie += ';secure';
		  }
		  return document.cookie = cookie;
		},
		get: function(name) {
		  var escapedName, cookie, matches;
		  cookie = document.cookie;
		  escapedName = name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, function(ch) {
		    return "\\" + ch;
		  });
		  matches = cookie.match(new RegExp("(?:^|; )" + escapedName + "=([^;]*)"));
		  if (matches) {
		    return decodeURIComponent(matches[1]);
		  } else {
		    return void 0;
		  }
		},
		remove: function(name, path, domain) {
		  var cookie;
		  if (kjs.cookie.get(name)) {
		    cookie = name + '=;expires=Fri, 02-Jan-1970 00:00:00 GMT';
		    if (path) {
		      cookie += ';path=' + path;
		    }
		    if (domain) {
		      cookie += ';domain' + domain;
		    }
		    return document.cookie = cookie;
		  }
		}
 	});

	// ========================================
 	// # url and query and form
 	kjs.mixin(kjs, {
		url: function(url) {
		  var dm, hs, qu;
		  url = url || location.href;
		  dm = url.match(/^[^?#]+/i)[0];
		  url = url.slice(dm.length);
		  if (url.match(/^\?[^#]+/i)) {
		    qu = url.match(/^\?[^#]+/i)[0];
		    url = url.slice(qu.length);
		    if (url.match(/^#[^?]+/i)) {
		      hs = url.match(/^#[^?]+/i)[0];
		    }
		  } else if (url.match(/^#[^?]+/i)) {
		    hs = url.match(/^#[^?]+/i)[0];
		    url = url.slice(hs.length);
		    if (url.match(/^\?[^#]+/i)) {
		      qu = url.match(/^\?[^#]+/i)[0];
		    }
		  }
		  url = {
		    domain: dm,
		    query: (qu || '').slice(1),
		    hash: (hs || '').slice(1),
		    param: {},
		    toString: function() {
		      var key, ref, val;
		      qu = '';
		      ref = this.param;
		      for (key in ref) {
		        val = ref[key];
		        qu += key;
		        if (val !== void 0 && val !== null) {
		          qu += '=' + val;
		        }
		      }
		      if (qu) {
		        qu = '?' + qu;
		      }
		      hs = this.hash ? '#' + this.hash : '';
		      return this.domain + qu + hs;
		    }
		  };
		  if (url.query) {
		    url.query.replace(/(?:^|&)([^=&]+)(?:=([^&]*))?/gi, function(a, b, d) {
		      return url.param[b] = d;
		    });
		  }
		  return url;
		},
		queryToObject: function(query) {
		  var ret;
		  query = query || location.search.slice(1);
		  ret = {};
		  if (query.length === 0) {
		    return ret;
		  }
		  query.replace(/(?:^|&)([^=&]+)(?:=([^&]*))?/gi, function(a, k, v) {
		    return ret[k] = v;
		  });
		  return ret;
		},
		formToObject: function(form, trim) {
		  var data;
		  if (!form.serializeArray) {
		    form = $(form);
		  }
		  data = {};
		  if (trim === void 0) {
		    trim = 1;
		  }
		  $.each(form.serializeArray(), function(i, field) {
		    return data[field.name] = trim ? $.trim(field.value) : field.value;
		  });
		  return data;
		},
		formToQuery: function(form) {
		  var data, trim;
		  if (!form.serializeArray) {
		    form = $(form);
		  }
		  data = [];
		  if (trim === void 0) {
		    trim = 1;
		  }
		  $.each(form.serializeArray(), function(i, field) {
		    var val;
		    val = trim ? $.trim(field.value) : field.value;
		    return data.push(field.name + '=' + val);
		  });
		  return data.join('&');
		},
		getForm: function(elem) {
		  var nodeName;
		  if (elem.form) {
		    return elem.form;
		  }
		  while (elem) {
		    nodeName = elem.nodeName.toLowerCase();
		    if (nodeName === 'body') {
		      return null;
		    }
		    if (nodeName === 'form') {
		      return elem;
		    }
		    elem = elem.parentNode;
		  }
		}
 	});

	// ========================================
	// # core event system
	kjs.Events = {
		signal: function(type, args) {
			var queue = this.__events__ && this.__events__[type];
			each(queue && queue.slice(0), function(listener) {
				listener.apply(null, isArray(args) ? args : [args]);
			});
		},
		on: function(type, listener) {
			var events = this.__events__ || (this.__events__ = {});
			var queue = events[type] || (events[type] = []);
			queue.push(listener);
			return {
				remove:function() {
					for (var i = 0; i < queue.length; i++) {
						if (queue[i] === listener) {
							return queue.splice(i, 1);
						}
					}
				}
			};
		}
	};

	kjs.mixin(kjs, kjs.Events);

	// ========================================
 	// # hitch
 	kjs.hitch = function(context, fn) {
 		var args = [].slice.call(arguments, 2);
 		return function() {
 			fn.apply(context || this, [].slice.call(arguments).concat(args));
 		};
 	};

	// ========================================
 	// # core ajax
 	kjs.load = function(param) {
	  var def, xhr, xhrDone, xhrParam;
	  def = new kjs.Deferred(function() {
	  	kjs.signal('load.abort', xhr);
	    return xhr && xhr.abort();
	  });
	  if (!param.quiet && !kjs.load.flight) {
	    kjs.signal('load.flight', xhr);
	  }
	  xhrDone = function() {
	    kjs.load.flight -= 1;
	    kjs.signal('load.complete', xhr);
	    if (kjs.load.flight === 0) {
	      kjs.signal('load.idle');
	    }
	  };
	  kjs.load.flight += 1;
	  xhrParam = {
	    url: param.url,
	    dataType: 'JSON',
	    contentType: 'application/json;charset=UTF-8',
	    type: param.type || 'POST',
	    data: param.data && JSON.stringify(param.data),
	    headers: param.headers || {},
	    timeout: kjs.load.timeout,
	    error: function(xhr, type, error) {
	    	if (type === 'timeout') {
	    		kjs.signal('load.timeout', xhr);
	    	}
	      xhrDone();
	      return def.reject({
	        type: type,
	        error: error,
	        xhr: xhr
	      });
	    },
	    success: function(response, status, xhr) {
	      xhrDone();
	      var data = JSON.parse(response);
	      if (data.errorCode === void 0 || data.errorCode === '0000') {
	        kjs.signal('load.success', xhr, data.data);
	        return def.resolve(data.data);
	      } else {
	      	kjs.signal('load.error', xhr, data);
	        return def.reject(data);
	      }
	    }
	  };
	  xhr = $.ajax(xhrParam);
	  return def.promise;
	};

	kjs.mixin(kjs.load, {
		timeout: 20000,
		flight: 0,
		onError: function() {
			if (!e) {
		    return;
		  }
		  if (e.type === 'timeout') {
		    return kjs.alert('网络不给力！');
		  } else if (e.xhr && (e.xhr.status < 200 || e.xhr.status > 304) && e.type !== 'abort') {
		    return kjs.alert('系统错误');
		  } else if (e.errorMsg) {
		    return kjs.alert(e.errorMsg);
		  } else {
		    return kjs.alert('未知错误');
		  }
		}
	});

}(this);

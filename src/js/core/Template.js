;!function(kjs) {
	//	summary:
	// a base Class for implementing ui Widget

	var declare = kjs.declare;
	var isArray = kjs.isArray;
	var trim = kjs.trim;

	var kjsNodeAttr = "data-kjs-node";
	var kjsEventAttr = "data-kjs-event";
	var kjsTypeAttr = "data-kjs-type";
	var kjsMixinAttr = "data-kjs-mixin";

	var getter = function( n, p ) {
		return n.getAttribute( p );
	};
	var parseMixin = function(dataStr, scope) {
		var data, matched, rscopeMixin, scopeMixin;
	  if (!dataStr) {
	    return {};
	  }
	  scopeMixin = [];
	  rscopeMixin = /(?:^|,)\s*([$_a-zA-Z]\w*):\s*([$_a-zA-Z]\w*)/g;
	  while (matched = rscopeMixin.exec(dataStr)) {
	    scopeMixin.push({
	      attrName: matched[1],
	      attrValue: matched[2]
	    });
	    dataStr.replace(matched[0], matched[0].replace(/./g, ' '));
	  }
	  data = (new Function('return {' + dataStr + '}'))();
	  kjs.each(scopeMixin, function(i, mixin) {
	    return data[mixin.attrName] = scope[mixin.attrValue];
	  });
	  return data;
	};

	var Template = declare('ui.Template', null, {
		// is there sub widget in the template ?
		widgetsInTemplate: 0,

		templateString: "<div></div>",

		constructor: function( params, srcNodeRef ) {
			this.__points__ = [];
			this.__events__ = [];
			this.__widgets__ = [];
		},

		buildRendering: function() {
			// rendering
			if ( !this._rendered ) {
				var render = Template.getCachedTemplate(this.templateString);
				var node = kjs.parseHTML( render(this) );
				if ( node.nodeType !== 1 ) {
					throw new Error( 'Invalid template: ' + this.templateString );
				}
				this.domNode = node;
			}
			this.inherited(arguments);
			// attach directives
			this.__attachBinding(this.domNode);
   	 	this.__attachWidget(this.domNode);

   	 	if ( !this._rendered ) {
				this.__fillContent( this.srcNodeRef );
			}
			this._rendered = true;
		},

		bind: function( node, type, selector, fn ) {
			if (!fn) {
				fn = selector;
				selector = null;
			}
			var handle = this.__listen( node, type, selector, kjs.hitch(this, fn) );
			this.__events__.push(handle);
			return handle;
		},

		__fillContent: function( source ) {
			var dest = this.containerNode;
			if ( source && dest ) {
				while( source.hasChildNodes() ) {
					dest.appendChild( source.firstChild );
				}
			}
		},

		__attachBinding: function(node) {
			var getter, rootNode;
	    rootNode = node;
	    getter = function(n, p) {
	      return n.getAttribute(p);
	    };
	    while (true) {
	      if (node.nodeType === 1 && this.__attach(node, getter, this.__listen) && node.firstChild) {
	        node = node.firstChild;
	      } else {
	        if (node === rootNode) {
	          return;
	        }
	        while (!node.nextSibling) {
	          node = node.parentNode;
	          if (node === rootNode) {
	            return;
	          }
	        }
	        node = node.nextSibling;
	      }
	    }
		},

		__attachWidget: function(rootNode) {
	    var next, node, parent, results;
	    if (!this.widgetsInTemplate) {
	      return;
	    }
	    parent = rootNode;
	    node = rootNode.firstChild;
	    results = [];
	    while (true) {
	      if (!node) {
	        if (parent === rootNode) {
	          break;
	        }
	        node = parent.nextSibling;
	        parent = parent.parentNode;
	        continue;
	      }
	      if (node.nodeType !== 1) {
	        node = node.nextSibling;
	        continue;
	      }
	      next = node.nextSibling;
	      if (this.__instantiateWidget(node)) {
	        results.push(node = next);
	      } else {
	        parent = node;
	        results.push(node = parent.firstChild);
	      }
	    }
	    return results;
	  },

	  __instantiateWidget: function(node) {
	    var widgetGetter, widgetMixin, sevent, spoint, subWidget, type;
	    type = node.getAttribute(kjsTypeAttr);
	    if (!type) {
	      return;
	    }
	    spoint = getter(node, kjsNodeAttr);
	    sevent = getter(node, kjsEventAttr);
	    widgetMixin = getter(node, kjsMixinAttr);
	    widgetMixin = parseMixin(widgetMixin, this);
	    widgetMixin.callerWidget = this;
	    widgetGetter = function(n, p) {
	      if (p === kjsNodeAttr) {
	        return spoint;
	      }
	      if (p === kjsEventAttr) {
	        return sevent;
	      }
	    };
	    subWidget = kjs.getInstanceOf(type, widgetMixin, node);
	    this.__widgets__.push(subWidget);
	    this.__attach(subWidget, widgetGetter, 0);
	    return true;
	  },

		// Conspicuous internal protected method
		__attach: function( node, getter, bind ) {
			var fn, handle, isNode, m, points, reventPair, scope, sevent, spoint, type, uniq;
	    isNode = node.nodeType === 1 && !node.postscript;
	    if (isNode && node.getAttribute(kjsTypeAttr)) {
	      return true;
	    }
	    scope = this;
	    reventPair = /(?:|\s*,)\s*(\w+)\s*:\s*(\w+)\s*/g;
	    spoint = getter(node, kjsNodeAttr);
	    sevent = getter(node, kjsEventAttr);
	    uniq = {};
	    if (spoint) {
	      points = trim(spoint).split(/\s*,\s*/);
	      while ((spoint = points.shift())) {
	        if (isArray(scope[spoint])) {
	          scope[spoint].push(node);
	        } else {
	          scope[spoint] = node;
	        }
	        this.__points__.push(spoint);
	      }
	    }
	    if (sevent) {
	      reventPair.lastIndex = 0;
	      while ((m = reventPair.exec(sevent))) {
	        type = m[1];
	        if (!uniq[type]) {
	          uniq[type] = 1;
	          if (fn = scope[m[2]]) {
	            if (isNode) {
	              handle = bind(node, type, kjs.hitch(this, fn));
	              this.__events__.push(handle);
	            } else {
	              node.on(type, kjs.hitch(this, fn));
	            }
	          }
	        }
	      }
	    }
	    return true;
		},

		// bind events
		__listen: function( node, type, selector, fn ) {
			var handle;
	    if (arguments.length === 3) {
	      fn = selector;
	      selector = null;
	    }
	    type = type.replace(/^on/, '');
	    node = $(node);
	    if (selector) {
	      node.on(type, selector, fn);
	    } else {
	      node.on(type, fn);
	    }
	    handle = {
	      remove: function() {
	        if (selector) {
	          return node.off(type, selector, fn);
	        } else {
	          return node.off(type, fn);
	        }
	      }
	    };
	    return handle;
		},

		// remove points and events
		__detach: function( node, type, fn ) {
			var context = this;

			kjs.each(this.__points__, function( i, point ) {
				delete context[ point ];
			});
			this.__points__ = [];

			kjs.each(this.__events__, function( i, handle ) {
				handle.remove();
			});
			this.__events__ = [];

			kjs.each(this.__widgets__, function( i, widget ) {
				if (!widget.__destroyed) {
	        return widget.destroy();
	      }
			});
			this.__widgets__ = [];
		},

		destoryRendering: function() {
			this.__detach();
			this.inherited( arguments );
		}
	});

	Template.cache = {};
	Template.getCachedTemplate = function(templateString) {
	  var cached, key, tmplts;
	  tmplts = Template.cache;
	  key = templateString;
	  cached = tmplts[key];
	  if (cached) {
	    return cached;
	  }
	  templateString = trim(templateString);
	  return tmplts[key] = kjs.template(templateString);
	};

}(this.kjs);
;!function(kjs) {
	//	 summary:
	//		base Class for implementing Widget

	var aspect = kjs.aspect;
	var declare = kjs.declare;
	var State = kjs.getDeclare("State");

	var isEqual = function( a, b ) {
		return a === b || a !== a && b !== b;
	};
	var kjsAttrName = 'data-kjs-id';

	var Widget = declare('ui.Widget', [State], {
		id: '',

		_setIdAttr: function( value ) {
			this.domNode.id = value;
		},

		style: '',

		_setStyleAttr: function( value ) {
			var node = this.domNode;

			if ( kjs.type(value) === 'object' ) {
				kjs.addStyle( node, value );
			} else {
				if ( node.style.cssText ) {
					node.style.cssText += '; ' + value;
				} else {
					node.style.cssText = value;
				}
			}
		},

		domNode: null,

		baseClass: '',

		postscript: function( params, srcNodeRef ) {
			this.create( params, srcNodeRef );
		},

		create: function( params, srcNodeRef ) {
			// First time widget is instantiated, scan prototype to figure out info about custom setters.
			this._introspect();
			this.srcNodeRef = srcNodeRef;

			// mix in params specified
			if ( params ) {
				this.params = params;
				kjs.mixin( this, params );
			}
			this.postMixInProperties();

			// Generate an id for the widget if one wasn't specified or it is falsy.
			if ( !this.id ) {
				this.id = kjs.uid( this.declaredClass.replace(/\./g, '_') );
				if ( this.params ) {
					// should we delete this.params after postCreate ?
					delete this.params.id;
				}
			}

			// The document and <body> node this widget is associated with
			this.ownerDocument = this.ownerDocument || (this.srcNodeRef ? this.srcNodeRef.ownerDocument : document);
			this.ownerDocumentBody = this.ownerDocument.body;

			Widget.add(this);

			this.buildRendering();

			var deleteSrcNodeRef;

			if ( this.domNode ) {
				// calls custom setter.
				this._applySetters();

				var source = this.srcNodeRef;
				if ( source && source.parentNode && this.domNode !== source ) {
					source.parentNode.replaceChild( this.domNode, source );
					deleteSrcNodeRef = true;
				}

				this.domNode.setAttribute( kjsAttrName, this.id );
			}

			this.postCreate();

			if ( deleteSrcNodeRef ) {
				delete this.srcNodeRef;
			}

			this._created = true;
		},

		// register setters
		_introspect: function() {
			var ctor = this.constructor;
			if ( !ctor.__setters__ ) {
				var setters = ctor.__setters__ = [],
					proto = ctor.prototype, name;

				for ( name in proto ) {
					if ( /^_set[A-Z](.*)Attr$/.test(name) ) {
						name = name.charAt(4).toLowerCase() + name.substr( 5, name.length - 9 );
						setters.push( name );
					}
				}
			}
		},

		// apply setters from params
		_applySetters: function() {
			var params = {};
			for ( var key in (this.params || {}) ) {
				if ( !/^_set[A-Z](.*)Attr$/.test(key) ) {
					params[key] = this[ key ];
				}
			}

			// call set() for each prototype property
			kjs.each(this.constructor.__setters__, function( i, key ) {
				if ( !(key in params) ) {
					var v = this[ key ];
					if ( v ) { this.set( key, v ); }
				}
			}, this);

			// call set() for each own property
			for ( key in params ) {
				this.set( key, params[key] );
			}
		},

		postMixInProperties: function() {
			//		used set properties that are referenced in the widget template.
			//		by default, I make it support "baseClass" inheritance.
			var klass = [];
			var superclass = this.constructor.superclass;
			if (this.constructor.prototype.hasOwnProperty("baseClass")) {
				klass.push(this.constructor.prototype.baseClass);
			}
			while (superclass && superclass.declaredClass) {
				if (superclass.baseClass) {
					klass.unshift(superclass.baseClass);
				}
				superclass = superclass.constructor.superclass;
			}
			this.baseClass = klass.join(" ");
		},

		buildRendering: function() {
			if ( !this.domNode ) {
				// Create root node if it wasn't created by _Template
				this.domNode = this.srcNodeRef || this.ownerDocument.createElement('div');
			}

			if ( this.baseClass ) {
				kjs.addClass( this.domNode, this.baseClass );
			}
		},

		postCreate: function() {
			//		Processing after the DOM fragment is created
		},

		startup: function() {
			if ( this._started ) {
				return;
			}
			this._started = true;
			kjs.each(this.getChildren(), function( i, widget ) {
				if ( !widget._started && !widget._destroyed && kjs.isFunction(widget.startup) ) {
					widget.startup();
					widget._started = true;
				}
			});
		},

		// destroy functions
		destroyRecursive: function( preserveDom ) {
			this._beingDestroyed = true;
			this.destroyDescendants( preserveDom );
			this.destroy( preserveDom );
		},

		destroy: function( preserveDom ) {
			this._beingDestroyed = true;

			function destroy( w ) {
				if ( w.destroyRecursive ) {
					w.destroyRecursive( preserveDom );
				} else if ( w.destroy ) {
					w.destroy( preserveDom );
				}
			}

			if ( this.domNode ) {
				kjs.each( Widget.findWidgets(this.domNode, this.containerNode), destroy );
			}

			this.destroyRendering( preserveDom );
			Widget.remove( this.id );
			this._destroyed = true;
		},

		destroyRendering: function( preserveDom ) {
			if ( this.domNode ) {
				if ( preserveDom ) {
					this.domNode.removeAttribute( kjsAttrName );
				} else {
					$( this.domNode ).remove();
				}
				delete this.domNode;
			}

			if ( this.srcNodeRef ) {
				if ( !preserveDom ) {
					$( this.srcNodeRef ).remove();
				}
				delete this.srcNodeRef;
			}
		},

		destroyDescendants: function( preserveDom ) {
			// get all direct descendants and destroy them recursively
			kjs.each( this.getChildren(), function( i, widget ) {
				if ( widget.destroyRecursive ) {
					widget.destroyRecursive( preserveDom );
				}
			});
		},

		// decrease the depth in the prototype chain, so we can access it faster
		__accessors__: {},

		_set: function( name, value ) {
			var prev = this[ name ];
			this[ name ] = value;
			if ( this._created && !isEqual(prev, value) ) {
				if ( this.__notify__ ) {
					this.__notify__( name, prev, value );
				}
				this.signal(name + ':change', {
					detail: { name: name, previous: prev, value: value }
				});
			}
		},

		own: function() {
			kjs.each(arguments, function( handle ) {
				var methodName = 'destroy' in handle ? 'destroy' : 'remove';

				var odh = aspect.before(this, 'destroy', function( preserveDom ) {
					handle[methodName]( preserveDom );
				});

				var hdh = aspect.after(handle, methodName, function() {
					odh.remove();
					hdh.remove();
				}, true);
			}, this);

			return arguments;
		},

		// Customize widget's event APIs
		on: function( type, listener ) {
			return this.own( aspect.after( this, type, listener, true ) )[0];
		},

		signal: function( type, evt ) {
			if ( this[type] ) {
				evt = evt || {};
				if (evt.bubbles === undefined ) {
					evt.bubbles = true;
				}
				if (evt.cancelable === undefined ) {
					evt.cancelable = true;
				}
				if ( !evt.detail ) {
					evt.detail = {};
				}
				evt.detail.widget = this;
				this[type]( evt );
			}
		},

		getParent: function() {
			return kjs.getEnclosingWidget( this.domNode.parentNode );
		},

		getChildren: function( index ) {
			if ( this.containerNode ) {
				var widgets = kjs.findWidgets( this.containerNode );
				if ( typeof index === 'number' ) {
					index = index < 0 ? widgets.length + index : index;
					return widgets[ index ];
				}
				return widgets;
			}
			return [];
		},

		toString: function() {
			return '[Widget ' + this.declaredClass + ', ' + (this.id || 'NO ID') + ']';
		}
	});

	var widgetCache = {};
	var widgetCount = 0;

	kjs.mixin(Widget, {
		add: function(widget) {
			if ( widgetCache[widget.id] ) {
				throw new Error( 'Widget with id "' + widget.id + '" is already registered' );
			}
			widgetCache[widget.id] = widget;
			widgetCount++;
		},
		remove: function(id) {
			if ( widgetCache[id] ) {
				delete widgetCache[id];
				widgetCount--;
			}
		},
		byId: function(id) {
			return widgetCache[id];
		},
		byNode: function(node) {
			return widgetCache[ node.getAttribute(kjsAttrName) ];
		},
		findWidgets: function( root, skipNode ) {
			var out = [];

			function getChildren( root ) {
				for ( var node = root.firstChild; node; node = node.nextSibling ) {
					if ( node.nodeType === 1 ) {
						var widgetId = node.getAttribute( kjsAttrName );
						if ( widgetId ) {
							var widget = widgetCache[ widgetId ];
							if ( widget ) {
								out.push( widget );
							}
						} else if ( node !== skipNode ) {
							getChildren( node );
						}
					}
				}
			}

			getChildren( root );
			return out;
		},
		getEnclosingWidget: function( node ) {
			while ( node ) {
				var id = node.nodeType === 1 && node.getAttribute(kjsAttrName);
				if ( id ) {
					return widgetCache[id];
				}
				node = node.parentNode;
			}
			return null;
		}
	});

	kjs.mixin(kjs, {
		Widget: Widget,
		byId: Widget.byId,
		byNode: Widget.byNode,
		getEnclosingWidget: Widget.getEnclosingWidget
	});

}(this.kjs);
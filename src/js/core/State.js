;!function(kjs) {
	'use strict';
	// module:
	//		State
	// summary:
	//		Base class for objects that provide named properties with optional getter/setter
	//		control and the ability to watch for property changes

	var declare = kjs.declare;

	var slice = [].slice,
		exec = '__notify__',
		prop = '__accessors__',
		gsname = '__getAccessor__',
		rsetter = /^_set[A-Z](.*)Attr$/,
		camelCase = function( str ) {
			return str.replace(/^[a-z]|-[a-zA-Z]|_[a-zA-Z]/g, function( c ) {
				return c.charAt(c.length - 1).toUpperCase();
			});
		},
		isEqual = function( a, b ) {
			return a === b || a !== a && b !== b;
		};

	declare('State', null, {
		__accessors__: {},

		__getAccessor__: function( name ) {
			var names = this[prop];
			if ( names[name] ) {
				return names[name];
			}
			var upper = camelCase( name );
			return (names[name] = {
				s: '_set' + upper + 'Attr',
				g: '_get' + upper + 'Attr'
			});
		},

		postscript: function( props ) {
			if ( props ) {
				var setters = {};
				for ( var x in props ) {
					if ( props.hasOwnProperty(x) ) {
						this[ x ] = props[ x ];
						if ( rsetter.test(x) ) {
							setters[ x.charAt(4).toLowerCase() + x.substr( 5, x.length - 9 ) ] = 1;
						}
					}
				}
				// some properties are computed by one or multiple other properties.
				// so call 'set' to make Setter/Getter works at first time.
				for ( var x in setters ) {
					if ( setters.hasOwnProperty(x) && props.hasOwnProperty(x) ) {
						this.set( x, props[x] );
					}
				}
			}
		},

		get: function( name ) {
			var gs = this[gsname]( name );
			return typeof this[ gs.g ] === 'function' ? this[ gs.g ]() : this._get( name );
		},

		_get: function( name ) {
			return this[ name ];
		},

		set: function( name, value ) {
			if ( typeof name === 'object' ) {
				for ( var x in name ) {
					if ( name.hasOwnProperty(x) && x !== exec ) {
						this.set( x, name[x] );
					}
				}
				return this;
			}

			var setter = this[ this[gsname](name).s ];

			// apply custom setter
			if ( typeof setter === 'function' ) {
				setter.apply( this, slice.call(arguments, 1) );
			}

			this._set( name, value );

			return this;
		},

		_set: function( name, value ) {
			// for emit logical change event, we need property's primitive value
			// not computed value by _get()
			var prev = this[ name ];
			this[ name ] = value;
			if ( !isEqual(prev, value) && this[exec] ) {
				this[exec]( name, prev, value );
			}
		},

		watch: function( name, callback ) {
			var notifiers = this[exec], self, propCallbacks, handle;

			if ( !notifiers ) {
				self = this;
				notifiers = this[exec] = function( name, oldValue, value, ignoreCatchall ) {
					var notify = function( propCallbacks ) {
						if ( propCallbacks ) {
							propCallbacks = propCallbacks.slice();
							for ( var i = 0, l = propCallbacks.length; i < l; i++ ) {
								propCallbacks[i].call( self, name, oldValue, value );
							}
						}
					};
					notify( notifiers['_$' + name] );
					if ( !ignoreCatchall ) {
						notify( notifiers['*'] );
					}
				};
			}

			if( !callback && typeof name === 'function' ) {
				callback = name;
				name = '*';
			} else {
				// prepend with dash to prevent name conflicts
				name = '_$' + name;
			}

			propCallbacks = notifiers[name];
			if ( typeof propCallbacks !== 'object' ) {
				propCallbacks = notifiers[name] = [];
			}
			propCallbacks.push( callback );

			handle = {
				remove: function() {
					var index = -1;
					for ( var i = 0, l = propCallbacks.length; i < l; i++ ) {
						if ( propCallbacks[i] === callback ) {
							index = i;
							break;
						}
					}
					if ( index > -1 ) {
						propCallbacks.splice( index, 1 );
					}
				}
			};
			return handle;
		}
	});

}(this.kjs);

/*global document, window */
/*jslint sloppy: true, white:true, maxerr: 50, indent: 4, plusplus: true*/
MobileFrontend = (function() {
	var utilities;

	function message( name ) {
		return mwMobileFrontendConfig.messages[name] || '';
	}

	function init() {
		var languageSelection, contentEl = document.getElementById( 'content' );
		utilities( document.body ).addClass( 'jsEnabled' );

		if( contentEl.childNodes.length === 0 ) {
			contentEl.innerHTML = message( 'empty-homepage' );
		}

		languageSelection = document.getElementById( 'languageselection' );

		function navigateToLanguageSelection() {
			var url;
			if ( languageSelection ) {
				url = languageSelection.options[languageSelection.selectedIndex].value;
				if ( url ) {
					location.href = url;
				}
			}
		}
		utilities( languageSelection ).bind( 'change', navigateToLanguageSelection );

		function logoClick() {
			var n = document.getElementById( 'nav' ).style;
			n.display = n.display === 'block' ? 'none' : 'block';
		}
		utilities( document.getElementById( 'logo' ) ).bind( 'click', logoClick );

		function desktopViewClick() {
			var cookieName = MobileFrontend.setting( 'useFormatCookieName' );
			var cookieDuration = MobileFrontend.setting( 'useFormatCookieDuration' );
			var cookiePath = MobileFrontend.setting( 'useFormatCookiePath' );
			var cookieDomain = MobileFrontend.setting( 'useFormatCookieDomain' );
			
			// convert from seconds to days
			cookieDuration = cookieDuration / ( 24 * 60 * 60 );

			// get the top part of the domain to make the cookie work across subdomains
			MobileFrontend.banner.writeCookie( cookieName, 'desktop', cookieDuration, cookiePath, cookieDomain );
		}
		utilities( document.getElementById( 'mf-display-toggle' ) ).bind( 'click', desktopViewClick );

		// Try to scroll and hide URL bar
		window.scrollTo( 0, 1 );
	}

	utilities = typeof jQuery  !== 'undefined' ? jQuery : function( el ) {
		if( typeof(el) === 'string' ) {
			if( document.querySelectorAll ) {
				return [].slice.call( document.querySelectorAll( el ) );
			}
		} else if( !el ) {
			el = document.createElement( 'div' );
		}

		function inArray( array, str ) {
			if( array.indexOf ) {
				return array.indexOf( str ) > -1;
			} else {
				for( var i = 0; i < array.length; i++ ) {
					if( str === array[i] ) {
						return true;
					}
				}
				return false;
			}
		}

		function hasClass( name ) {
			var classNames = el.className.split( ' ' );
			return inArray( classNames, name );
		}

		function addClass( name ) {
			var className = el.className,
				classNames = className.split( ' ' );
			classNames.push(name); // TODO: only push if unique
			el.className = classNames.join( ' ' );
		}

		function removeClass( name ) {
			var className = el.className,
				classNames = className.split( ' ' ),
				newClasses = [], i;
			for( i = 0; i < classNames.length; i++ ) {
				if( classNames[i] !== name ) {
					newClasses.push( classNames[i] );
				}
			}
			el.className = newClasses.join( ' ' );
		}

		function bind( type, handler ) {
			el.addEventListener( type, handler, false );
		}

		function remove() {
			el.parentNode.removeChild(el);
		}

		return {
			addClass: addClass,
			bind: bind,
			hasClass: hasClass,
			remove: remove,
			removeClass: removeClass
		};
	}
	utilities.ajax = utilities.ajax || function( options ) {
		var xmlHttp, url;
		if ( window.XMLHttpRequest ) {
			xmlHttp = new XMLHttpRequest();
		} else {
			xmlHttp = new ActiveXObject( 'Microsoft.XMLHTTP' );
		}
		if( xmlHttp.overrideMimeType ) { // non standard
			xmlHttp.overrideMimeType( 'text/xml' );
		}
		xmlHttp.onreadystatechange = function() {
			if ( xmlHttp.readyState === 4 && xmlHttp.status === 200 ) {
				options.success( xmlHttp.responseXML );
			}
		};
		xmlHttp.open( 'GET', options.url, true );
		xmlHttp.send();
	};

	init();
	return {
		init: init,
		message: message,
		setting: function( name ) {
			return mwMobileFrontendConfig.settings[name] || '';
		},
		utils: utilities
	};

}());

( function ( M ) {

	var View = M.require( 'View' ),
		Icon;

	/**
	 * A {@link View} that pops up from the bottom of the screen.
	 * @class Drawer
	 * @extends Panel
	 */
	Icon = View.extend( {
		defaults: {
			hasText: false,
			tagName: 'div',
			base: 'icon',
			name: '',
			modifier: '',
			title: ''
		},
		/**
		 * Return the full class name that is required for the icon to render
		 * @method
		 * @return {string}
		 */
		getClassName: function () {
			return this.$el.children( 0 ).attr( 'class' );
		},
		/**
		 * Return the class that relates to the icon glyph
		 * @method
		 * @return {string}
		 */
		getGlyphClassName: function () {
			return this.options.base + '-' + this.options.name;
		},
		initialize: function ( options ) {
			if ( options.hasText ) {
				options.modifier = 'icon-text';
			}
			View.prototype.initialize.call( this, options );
		},
		toHtmlString: function () {
			return this.$el.html();
		},
		template: M.template.get( 'icon.hogan' )
	} );

	M.define( 'Icon', Icon );

}( mw.mobileFrontend ) );

/* global $ */
var Overlay = require( '../mobile.startup/Overlay' ),
	util = require( '../mobile.startup/util' ),
	PageGateway = require( '../mobile.startup/PageGateway' ),
	Icon = require( '../mobile.startup/Icon' ),
	Button = require( '../mobile.startup/Button' ),
	toast = require( '../mobile.startup/toast' ),
	saveFailureMessage = require( './saveFailureMessage' ),
	mfExtend = require( '../mobile.startup/mfExtend' ),
	MessageBox = require( '../mobile.startup/MessageBox' ),
	mwUser = mw.user;

/**
 * 'Edit' button
 * @param {OO.ui.ToolGroup} toolGroup
 * @param {Object} config
 */
function EditVeTool( toolGroup, config ) {
	config = config || {};
	config.classes = [ 'visual-editor' ];
	EditVeTool.super.call( this, toolGroup, config );
}
OO.inheritClass( EditVeTool, OO.ui.Tool );

EditVeTool.static.name = 'editVe';
EditVeTool.static.icon = 'edit';
EditVeTool.static.group = 'editorSwitcher';
EditVeTool.static.title = mw.msg( 'mobile-frontend-editor-switch-visual-editor' );
/**
 * click handler
 * @memberof EditVeTool
 * @instance
 */
EditVeTool.prototype.onSelect = function () {
	// will be overridden later
};
/**
 * Toolbar update state handler.
 * @memberof EditVeTool
 * @instance
 */
EditVeTool.prototype.onUpdateState = function () {
	// do nothing
};

/**
 * Base class for SourceEditorOverlay and VisualEditorOverlay
 * @class EditorOverlayBase
 * @extends Overlay
 * @uses Icon
 * @uses user
 * @param {Object} params Configuration options
 * @param {number|null} params.editCount of user
 */
function EditorOverlayBase( params ) {
	var self = this,
		options = util.extend(
			true,
			{
				onBeforeExit: this.onBeforeExit.bind( this ),
				className: 'overlay editor-overlay',
				isBorderBox: false
			},
			params,
			{
				events: util.extend(
					{
						'click .back': 'onClickBack',
						'click .continue': 'onClickContinue',
						'click .submit': 'onClickSubmit',
						'click .anonymous': 'onClickAnonymous'
					},
					params.events
				)
			}
		);

	if ( options.isNewPage ) {
		options.placeholder = mw.msg( 'mobile-frontend-editor-placeholder-new-page', mwUser );
	}
	// change the message to request a summary when not in article namespace
	if ( mw.config.get( 'wgNamespaceNumber' ) !== 0 ) {
		options.summaryRequestMsg = mw.msg( 'mobile-frontend-editor-summary' );
	}
	this.pageGateway = new PageGateway( options.api );
	this.editCount = options.editCount;
	this.isNewPage = options.isNewPage;
	this.isNewEditor = options.editCount === 0;
	this.sectionId = options.sectionId;
	// FIXME: Pass this in via options rather than accessing mw.config
	this.config = mw.config.get( 'wgMFEditorOptions' );
	this.sessionId = options.sessionId;
	this.overlayManager = options.overlayManager;
	this.allowCloseWindow = mw.confirmCloseWindow( {
		// Returns true if content has changed
		test: function () {
			// Check if content has changed
			return self.hasChanged();
		},

		// Message to show the user, if content has changed
		message: mw.msg( 'mobile-frontend-editor-cancel-confirm' ),
		// Event namespace
		namespace: 'editwarning'
	} );

	Overlay.call( this, options );
}

mfExtend( EditorOverlayBase, Overlay, {
	/**
	 * @memberof EditorOverlayBase
	 * @instance
	 * @mixes Overlay#defaults
	 * @property {Object} defaults Default options hash.
	 * @property {OverlayManager} defaults.overlayManager instance
	 * @property {mw.Api} defaults.api to interact with
	 * @property {boolean} defaults.hasToolbar Whether the editor has a toolbar or not. When
	 *  disabled a header will be show instead.
	 * @property {string} defaults.continueMsg Caption for the next button on edit form
	 * which takes you to the screen that shows a preview and license information.
	 * @property {string} defaults.cancelMsg Caption for cancel button on edit form.
	 * @property {string} defaults.closeMsg Caption for a button that takes you back to editing
	 * from edit preview screen.
	 * @property {string} defaults.summaryRequestMsg Header above edit summary input field
	 * asking the user to summarize the changes they made to the page.
	 * @property {string} defaults.summaryMsg A placeholder with examples for the summary input
	 * field asking user what they changed.
	 * @property {string} defaults.placeholder Placeholder text for empty sections.
	 * @property {string} defaults.waitMsg Text that displays while a page edit is being saved.
	 * @property {string} defaults.waitIcon HTML of the icon that displays while a page edit
	 * is being saved.
	 * @property {string} defaults.captchaMsg Placeholder for captcha input field.
	 * @property {string} defaults.captchaTryAgainMsg A message shown when user enters
	 * wrong CAPTCHA and a new one is displayed.
	 * @property {string} defaults.switchMsg Label for button that allows the user
	 * to switch between two different editing interfaces.
	 * @property {string} defaults.licenseMsg Text and link of the license,
	 * under which this contribution will be released to inform the user.
	 */
	defaults: util.extend( {}, Overlay.prototype.defaults, {
		hasToolbar: false,
		continueMsg: mw.msg( 'mobile-frontend-editor-continue' ),
		cancelMsg: mw.msg( 'mobile-frontend-editor-cancel' ),
		closeMsg: mw.msg( 'mobile-frontend-editor-keep-editing' ),
		summaryRequestMsg: mw.msg( 'mobile-frontend-editor-summary-request' ),
		summaryMsg: mw.msg( 'mobile-frontend-editor-summary-placeholder' ),
		placeholder: mw.msg( 'mobile-frontend-editor-placeholder' ),
		waitMsg: mw.msg( 'mobile-frontend-editor-wait' ),
		// icons.spinner can't be used,
		// the spinner class changes to display:none in onStageChanges
		waitIcon: new Icon( {
			name: 'spinner',
			additionalClassNames: 'savespinner loading'
		} ).toHtmlString(),
		captchaMsg: mw.msg( 'mobile-frontend-account-create-captcha-placeholder' ),
		captchaTryAgainMsg: mw.msg( 'mobile-frontend-editor-captcha-try-again' ),
		switchMsg: mw.msg( 'mobile-frontend-editor-switch-editor' ),
		confirmMsg: mw.msg( 'mobile-frontend-editor-cancel-confirm' ),
		licenseMsg: undefined
	} ),
	/**
	 * @inheritdoc
	 * @memberof EditorOverlayBase
	 * @instance
	 */
	templatePartials: util.extend( {}, Overlay.prototype.templatePartials, {
		editHeader: util.template( `
<div class="overlay-header header initial-header hideable hidden">
	<ul>
		<li>{{{cancelButton}}}</li>
	</ul>
	{{^hasToolbar}}
	<div class="overlay-title">
		<h2>{{{editingMsg}}}</h2>
	</div>
	{{/hasToolbar}}
	{{#hasToolbar}}<div class="toolbar"></div>{{/hasToolbar}}
	{{#editSwitcher}}
		<div class="switcher-container">
		</div>
	{{/editSwitcher}}
	{{^readOnly}}
	<div class="header-action"><button class="continue" disabled>{{continueMsg}}</button></div>
	{{/readOnly}}
</div>
		` ),
		previewHeader: util.template( `
<div class="overlay-header save-header hideable hidden">
	<ul>
		<li>{{{backButton}}}</li>
	</ul>
	<div class="overlay-title">
		<h2>{{{previewingMsg}}}</h2>
	</div>
	<div class="header-action"><button class="submit">{{saveMsg}}</button></div>
</div>
		` ),
		saveHeader: util.template( `
<div class="overlay-header header saving-header hideable hidden">
	<ul>
		<li>{{{cancelButton}}}</li>
	</ul>
	<div class="overlay-title">
		<h2>{{{waitMsg}}}</h2>
	</div>
	<ul>
		<li>{{{waitIcon}}}</li>
	</ul>
</div>
		` )
	} ),
	/**
	 * @inheritdoc
	 * @memberof EditorOverlayBase
	 * @instance
	 */
	template: util.template( `
<div class="overlay-header-container header-container position-fixed">
	{{>editHeader}}
	{{>previewHeader}}
	{{>saveHeader}}
</div>

<div class="overlay-content">
	<div class="panels">
		<div class="save-panel panel hideable hidden">
			<div id="error-notice-container"></div>
			<p class="summary-request">{{{summaryRequestMsg}}}</p>
			<textarea rows="2" class="mw-ui-input summary" placeholder="{{summaryMsg}}"></textarea>
			{{#licenseMsg}}<p class="license">{{{licenseMsg}}}</p>{{/licenseMsg}}
		</div>
		<div class="captcha-panel panel hideable hidden">
			<div class="captcha-box">
				<img id="image" src="">
				<div id="question"></div>
				<input class="captcha-word mw-ui-input" placeholder="{{captchaMsg}}" />
			</div>
		</div>
	</div>
	{{{spinner}}}
	{{>content}}
</div>
<div class="overlay-footer-container position-fixed">
	{{>footer}}
</div>
	` ),
	/**
	 * @memberof EditorOverlayBase
	 * @instance
	 */
	sectionId: '',
	/**
	 * Logs an event to http://meta.wikimedia.org/wiki/Schema:EditAttemptStep
	 * @memberof EditorOverlayBase
	 * @instance
	 * @param {Object} data
	 */
	log: function ( data ) {
		mw.track( 'mf.schemaEditAttemptStep', util.extend( data, {
			// eslint-disable-next-line camelcase
			editor_interface: this.editor,
			// eslint-disable-next-line camelcase
			editing_session_id: this.sessionId
		} ) );
	},

	/**
	 * If this is a new article, require confirmation before saving.
	 * @memberof EditorOverlayBase
	 * @instance
	 * @return {boolean} The user confirmed saving
	 */
	confirmSave: function () {
		if ( this.isNewPage &&
			// TODO: Replace with an OOUI dialog
			!window.confirm( mw.msg( 'mobile-frontend-editor-new-page-confirm', mwUser ) )
		) {
			return false;
		} else {
			return true;
		}
	},
	/**
	 * Executed when page save is complete. Handles reloading the page, showing toast
	 * messages.
	 * @memberof EditorOverlayBase
	 * @instance
	 */
	onSaveComplete: function () {
		var msg,
			$window = util.getWindow(),
			title = this.options.title,
			self = this;

		this.saved = true;

		// FIXME: use generic method for following 3 lines
		this.pageGateway.invalidatePage( title );

		if ( this.isNewPage ) {
			msg = mw.msg( 'mobile-frontend-editor-success-new-page' );
		} else if ( this.isNewEditor ) {
			msg = mw.msg( 'mobile-frontend-editor-success-landmark-1' );
		} else {
			msg = mw.msg( 'mobile-frontend-editor-success' );
		}
		toast.showOnPageReload( msg, { type: 'success' } );

		// Ensure we don't lose this event when logging
		this.log( {
			action: 'saveSuccess'
		} );
		if ( self.sectionId ) {
			// Ideally we'd want to do this via replaceState (see T189173)
			// eslint-disable-next-line no-restricted-properties
			window.location.hash = '#' + self.sectionId;
		} else {
			// Cancel the hash fragment
			// otherwise clicking back after a save will take you back to the editor.
			// We avoid calling the hide method of the overlay here as this can be asynchronous
			// and may conflict with the window.reload call below.
			// eslint-disable-next-line no-restricted-properties
			window.location.hash = '#';
		}

		$window.off( 'beforeunload.mfeditorwarning' );

		// Note the "#" may be in the URL.
		// If so, using window.location alone will not reload the page
		// we need to forcefully refresh
		// eslint-disable-next-line no-restricted-properties
		window.location.reload();
	},
	/**
	 * Executed when page save fails. Handles logging the error. Subclasses
	 * should display error messages as appropriate.
	 * @memberof EditorOverlayBase
	 * @instance
	 * @param {Object} data Details about the failure, from EditorGateway.parseSaveError
	 */
	onSaveFailure: function ( data ) {
		var key = data && data.details && data.details.code,
			typeMap = {
				editconflict: 'editConflict',
				wasdeleted: 'editPageDeleted',
				'abusefilter-disallowed': 'extensionAbuseFilter',
				captcha: 'extensionCaptcha',
				spamprotectiontext: 'extensionSpamBlacklist',
				'titleblacklist-forbidden-edit': 'extensionTitleBlacklist'
			};

		if ( data.type === 'captcha' ) {
			key = 'captcha';
		}

		this.log( {
			action: 'saveFailure',
			message: saveFailureMessage( data ),
			type: typeMap[key] || 'responseUnknown'
		} );
	},
	/**
	 * Report load errors back to the user. Silently record the error using EventLogging.
	 * @memberof EditorOverlayBase
	 * @instance
	 * @param {string} text Text of message to display to user
	 * @param {string} heading heading text to display to user
	 */
	reportError: function ( text, heading ) {
		var errorNotice = new MessageBox( {
			className: 'errorbox',
			msg: text,
			heading: heading
		} );
		this.$errorNoticeContainer.html( errorNotice.$el );
	},
	hideErrorNotice: function () {
		this.$errorNoticeContainer.empty();
	},
	/**
	 * Prepares the penultimate screen before saving.
	 * Expects to be overridden by child class.
	 * @memberof EditorOverlayBase
	 * @instance
	 */
	onStageChanges: function () {
		this.showHidden( '.save-header, .save-panel' );
		this.log( {
			action: 'saveIntent'
		} );
		// Scroll to the top of the page, so that the summary input is visible
		// (even if overlay was scrolled down when editing) and weird iOS header
		// problems are avoided (header position not updating to the top of the
		// screen, instead staying lower until a subsequent scroll event).
		window.scrollTo( 0, 1 );
	},
	/**
	 * Executed when the editor clicks the save button. Expects to be overridden by child
	 * class. Checks if the save needs to be confirmed.
	 * @memberof EditorOverlayBase
	 * @instance
	 */
	onSaveBegin: function () {
		this.confirmAborted = false;
		this.hideErrorNotice();
		// Ask for confirmation in some cases
		if ( !this.confirmSave() ) {
			this.confirmAborted = true;
			return;
		}
		this.log( {
			action: 'saveAttempt'
		} );
	},
	/**
	 * @inheritdoc
	 * @memberof EditorOverlayBase
	 * @instance
	 */
	postRender: function () {
		// decide what happens, when the user clicks the continue button
		if ( this.config.skipPreview ) {
			// skip the preview and save the changes
			this.nextStep = 'onSaveBegin';
			this.$el.find( '.continue' ).text( this.defaults.saveMsg );
		} else {
			// default: show the preview step
			this.nextStep = 'onStageChanges';
		}
		this.$errorNoticeContainer = this.$el.find( '#error-notice-container' );

		Overlay.prototype.postRender.apply( this );

		this.showHidden( '.initial-header' );
	},
	show: function () {
		this.saved = false;
		Overlay.prototype.show.call( this );

		// Inform other interested code that the editor has loaded
		mw.hook( 'mobileFrontend.editorOpened' ).fire( this.editor );
	},
	/**
	 * Back button click handler
	 * @memberof EditorOverlayBase
	 * @instance
	 */
	onClickBack: function () {},
	/**
	 * Submit button click handler
	 * @memberof EditorOverlayBase
	 * @instance
	 */
	onClickSubmit: function () {
		this.onSaveBegin();
	},
	/**
	 * Continue button click handler
	 * @memberof EditorOverlayBase
	 * @instance
	 */
	onClickContinue: function () {
		this[this.nextStep]();
	},
	/**
	 * "Edit without logging in" button click handler
	 * @memberof EditorOverlayBase
	 * @instance
	 */
	onClickAnonymous: function () {},
	/**
	 * @memberof EditorOverlayBase
	 * @instance
	 * @param {Function} exit Callback to exit the overlay
	 */
	onBeforeExit: function ( exit ) {
		var windowManager,
			self = this;
		if ( this.hasChanged() && !this.switching ) {
			windowManager = OO.ui.getWindowManager();
			windowManager.addWindows( [ new mw.widgets.AbandonEditDialog() ] );
			windowManager.openWindow( 'abandonedit' )
				.closed.then( function ( data ) {
					if ( data && data.action === 'discard' ) {
						// log abandonment
						self.log( {
							action: 'abort',
							mechanism: 'cancel',
							type: 'abandon'
						} );
						self.allowCloseWindow.release();
						mw.hook( 'mobileFrontend.editorClosed' ).fire();
						exit();
					}
				} );
			return;
		}
		if ( !this.switching && !this.saved ) {
			// log leaving without changes
			this.log( {
				action: 'abort',
				mechanism: 'cancel',
				// if this is VE, hasChanged will be false because the Surface has
				// already been destroyed (which is good because it stops us
				// double-showing the abandon changes dialog above)... but we can
				// test whether there *were* changes for logging purposes by
				// examining the target:
				type: ( this.target && this.target.edited ) ? 'abandon' : 'nochange'
			} );
		}
		this.allowCloseWindow.release();
		mw.hook( 'mobileFrontend.editorClosed' ).fire();
		exit();
	},
	/**
	 * Sets additional values used for anonymous editing warning.
	 * @memberof EditorOverlayBase
	 * @instance
	 * @param {Object} options
	 * @return {jQuery.Element}
	 */
	createAnonWarning: function ( options ) {
		var $actions = $( '<div>' ).addClass( 'actions' ),
			$anonWarning = $( '<div>' ).addClass( 'anonwarning content' ).append(
				new MessageBox( {
					className: 'warningbox anon-msg',
					msg: mw.msg( 'mobile-frontend-editor-anonwarning' )
				} ).$el,
				$actions
			),
			params = util.extend( {
			// use wgPageName as this includes the namespace if outside Main
				returnto: options.returnTo || mw.config.get( 'wgPageName' ),
				returntoquery: 'action=edit&section=' + options.sectionId,
				warning: 'mobile-frontend-edit-login-action'
			}, options.queryParams ),
			signupParams = util.extend( {
				type: 'signup',
				warning: 'mobile-frontend-edit-signup-action'
			}, options.signupQueryParams ),
			anonymousEditorActions = [
				new Button( {
					label: mw.msg( 'mobile-frontend-editor-anon' ),
					block: true,
					additionalClassNames: 'anonymous progressive',
					progressive: true
				} ),
				new Button( {
					block: true,
					href: mw.util.getUrl( 'Special:UserLogin', params ),
					label: mw.msg( 'mobile-frontend-watchlist-cta-button-login' )
				} ),
				new Button( {
					block: true,
					href: mw.util.getUrl( 'Special:UserLogin', util.extend( params, signupParams ) ),
					label: mw.msg( 'mobile-frontend-watchlist-cta-button-signup' )
				} )
			];

		$actions.append(
			anonymousEditorActions.map( function ( action ) {
				return action.$el;
			} )
		);

		return $anonWarning;
	},

	/**
	 * @memberof EditorOverlayBase
	 * @instance
	 * @param {string} blockinfo
	 * @return {Object}
	 */
	parseBlockInfo: function ( blockinfo ) {
		var blockInfo, expiry, reason,
			moment = window.moment;

		// Workaround to parse a message parameter for mw.message, see T96885
		function jqueryMsgParse( wikitext ) {
			var parser, ast;
			// eslint-disable-next-line new-cap
			parser = new mw.jqueryMsg.parser();
			try {
				ast = parser.wikiTextToAst( wikitext );
				return parser.emitter.emit( ast ).html();
			} catch ( e ) {
				// Ignore error as it's probably the parser error. Usually this is because we
				// can't parse templates.
				return false;
			}
		}

		blockInfo = {
			partial: blockinfo.blockpartial || false,
			creator: {
				name: blockinfo.blockedby,
				url: mw.Title.makeTitle(
					mw.config.get( 'wgNamespaceIds' ).user,
					blockinfo.blockedby
				).getUrl()
			},
			expiry: null,
			duration: null,
			reason: '',
			blockId: blockinfo.blockid
		};

		expiry = blockinfo.blockexpiry;
		if ( [ 'infinite', 'indefinite', 'infinity', 'never' ].indexOf( expiry ) === -1 ) {
			blockInfo.expiry = moment( expiry ).format( 'LLL' );
			blockInfo.duration = moment().to( expiry, true );
		}

		reason = blockinfo.blockreason;
		if ( reason ) {
			blockInfo.reason = jqueryMsgParse( reason ) || mw.html.escape( reason );
		} else {
			blockInfo.reason = mw.message( 'mobile-frontend-editor-generic-block-reason' ).escaped();
		}

		return blockInfo;
	},

	/**
	 * Checks whether the state of the thing being edited as changed. Expects to be
	 * implemented by child class.
	 * @memberof EditorOverlayBase
	 * @instance
	 */
	hasChanged: function () {},
	/**
	 * Handles a failed save due to a CAPTCHA provided by ConfirmEdit extension.
	 * @memberof EditorOverlayBase
	 * @instance
	 * @param {Object} details Details returned from the api.
	 */
	handleCaptcha: function ( details ) {
		var self = this,
			$input = this.$el.find( '.captcha-word' );

		if ( this.captchaShown ) {
			$input.val( '' );
			$input.attr( 'placeholder', this.options.captchaTryAgainMsg );
			setTimeout( function () {
				$input.attr( 'placeholder', self.options.captchaMsg );
			}, 2000 );
		}

		// handle different mime types different
		if ( details.mime.indexOf( 'image/' ) === 0 ) {
			// image based CAPTCHA's like provided by FancyCaptcha, ReCaptcha or similar
			this.$el.find( '.captcha-panel#question' ).detach();
			this.$el.find( '.captcha-panel img' ).attr( 'src', details.url );
		} else {
			// not image based CAPTCHA.
			this.$el.find( '.captcha-panel #image' ).detach();
			if ( details.mime.indexOf( 'text/html' ) === 0 ) {
				// handle mime type of HTML as HTML content (display as-is).
				// QuestyCaptcha now have default MIME type "text/html": see T147606
				this.$el.find( '.captcha-panel #question' ).html( details.question );
			} else {
				// handle mime types
				// (other than image based ones and HTML based ones)
				// as plain text by default.
				// e.g. MathCaptcha (solve a math formula) or
				// SimpleCaptcha (simple math formula)
				this.$el.find( '.captcha-panel #question' ).text( details.question );
			}
		}

		this.showHidden( '.save-header, .captcha-panel' );
		this.captchaShown = true;
	}
} );

module.exports = EditorOverlayBase;

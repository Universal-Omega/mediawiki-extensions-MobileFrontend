<?php

/**
 * @group MobileFrontend
 */
class MobileContextTest extends MediaWikiTestCase {
	/**
	 * PHP 5.3.2 introduces the ReflectionMethod::setAccessible() method to allow the invocation of
	 * protected and private methods directly through the Reflection API
	 *
	 * @param $name string
	 * @return ReflectionMethod
	 */
	protected static function getMethod( $name ) {
		$class = new ReflectionClass( 'MobileContext' );
		$method = $class->getMethod( $name );
		$method->setAccessible( true );

		return $method;
	}

	protected function tearDown() {
		parent::tearDown();

		MobileContext::resetInstanceForTesting();
	}

	/**
	 * @param string $url
	 * @param array $cookies
	 * @return MobileContext
	 */
	private function makeContext( $url = '/', $cookies = [] ) {
		$query = [];
		if ( $url ) {
			$params = wfParseUrl( wfExpandUrl( $url ) );
			if ( isset( $params['query'] ) ) {
				$query = wfCgiToArray( $params['query'] );
			}
		}

		$request = new FauxRequest( $query );
		$request->setRequestURL( $url );
		$request->setCookies( $cookies, '' );

		$context = new DerivativeContext( RequestContext::getMain() );
		$context->setRequest( $request );
		$context->setOutput( new OutputPage( $context ) );
		$instance = unserialize( 'O:13:"MobileContext":0:{}' );
		$instance->setContext( $context );
		return $instance;
	}

	/**
	 * @dataProvider getBaseDomainProvider
	 * @covers MobileContext::getBaseDomain
	 */
	public function testGetBaseDomain( $server, $baseDomain ) {
		$this->setMwGlobals( 'wgServer', $server );
		$this->assertEquals( $baseDomain, $this->makeContext()->getBaseDomain() );
	}

	public function getBaseDomainProvider() {
		return [
			[ 'https://en.wikipedia.org', '.wikipedia.org' ],
			[ 'http://en.m.wikipedia.org', '.wikipedia.org' ],
			[ '//en.m.wikipedia.org', '.wikipedia.org' ],
			[ 'http://127.0.0.1', '127.0.0.1' ],
			[ 'http://127.0.0.1:8080', '127.0.0.1' ],
			[ 'http://localhost', 'localhost' ],
		];
	}

	/**
	 * @covers MobileContext::getMobileUrl
	 */
	public function testGetMobileUrl() {
		$this->setMwGlobals( [
			'wgMFMobileHeader' => 'X-Subdomain',
			'wgMobileUrlTemplate' => '%h0.m.%h1.%h2',
			'wgServer' => '//en.wikipedia.org',
		] );
		$invokes = 0;
		$context = $this->makeContext();
		$asserter = $this;
		$this->setMwGlobals( 'wgHooks',
			[ 'GetMobileUrl' => [ function ( &$string, $hookCtx ) use (
					$asserter,
					&$invokes,
					$context
				) {
					$asserter->assertEquals( $context, $hookCtx );
					$invokes++;
			} ]
		] );
		$context->getRequest()->setHeader( 'X-Subdomain', 'M' );
		$this->assertEquals(
			'http://en.m.wikipedia.org/wiki/Article',
			$context->getMobileUrl( 'http://en.wikipedia.org/wiki/Article' )
		);
		$this->assertEquals(
			'//en.m.wikipedia.org/wiki/Article',
			$context->getMobileUrl( '//en.wikipedia.org/wiki/Article' )
		);
		// test local Urls - task T107505
		$this->assertEquals(
			'http://en.m.wikipedia.org/wiki/Article',
			$context->getMobileUrl( '/wiki/Article' )
		);
		$this->assertEquals( 3, $invokes, 'Ensure that hook got the right context' );
	}

	/**
	 * @covers MobileContext::parseMobileUrlTemplate
	 */
	public function testParseMobileUrlTemplate() {
		$this->setMwGlobals( 'wgMobileUrlTemplate', '%h0.m.%h1.%h2/path/morepath' );
		$context = $this->makeContext();
		$this->assertEquals(
			'%h0.m.%h1.%h2',
			$context->parseMobileUrlTemplate( 'host' )
		);
		$this->assertEquals(
			'/path/morepath',
			$context->parseMobileUrlTemplate( 'path' )
		);
		$this->assertEquals(
			[ 'host' => '%h0.m.%h1.%h2', 'path' => '/path/morepath' ],
			$context->parseMobileUrlTemplate()
		);
	}

	/**
	 * @dataProvider updateMobileUrlHostProvider
	 * @covers MobileContext::updateMobileUrlHost
	 */
	public function testUpdateMobileUrlHost( $url, $expected, $urlTemplate ) {
		$updateMobileUrlHost = self::getMethod( "updateMobileUrlHost" );
		$this->setMwGlobals( 'wgMobileUrlTemplate', $urlTemplate );
		$parsedUrl = wfParseUrl( $url );
		$updateMobileUrlHost->invokeArgs( $this->makeContext(), [ &$parsedUrl ] );
		$this->assertEquals( $expected, wfAssembleUrl( $parsedUrl ) );
	}

	public function updateMobileUrlHostProvider() {
		return [
			[
				'http://en.wikipedia.org/wiki/Gustavus_Airport',
				'http://en.m.wikipedia.org/wiki/Gustavus_Airport',
				'%h0.m.%h1.%h2',
			],
			[
				'https://wikimediafoundation.org/wiki/FAQ',
				'https://m.wikimediafoundation.org/wiki/FAQ',
				'm.%h0.%h1',
			],
			[
				'https://127.0.0.1/wiki/Test',
				'https://127.0.0.1/wiki/Test',
				'%h0.m.%h1.%h2',
			],
		];
	}

	/**
	 * @covers MobileContext::usingMobileDomain
	 */
	public function testUsingMobileDomain() {
		$this->setMwGlobals( [
			'wgMFMobileHeader' => 'X-Subdomain',
			'wgMobileUrlTemplate' => '%h0.m.%h1.%h2',
		] );
		$context = $this->makeContext();
		$this->assertFalse( $context->usingMobileDomain() );
		$context->getRequest()->setHeader( 'X-Subdomain', 'M' );
		$this->assertTrue( $context->usingMobileDomain() );
	}

	/**
	 * @dataProvider updateDesktopUrlQueryProvider
	 * @covers MobileContext::updateDesktopUrlQuery
	 */
	public function testUpdateDesktopUrlQuery( $mobile, $desktop ) {
		$updateDesktopUrlQuery = self::getMethod( "updateDesktopUrlQuery" );
		$parsedUrl = wfParseUrl( $mobile );
		$updateDesktopUrlQuery->invokeArgs( $this->makeContext(), [ &$parsedUrl ] );
		$url = wfAssembleUrl( $parsedUrl );
		$this->assertEquals( $desktop, $url );
	}

	public function updateDesktopUrlQueryProvider() {
		$baseUrl = 'http://en.m.wikipedia.org/wiki/Gustavus_Airport';

		return [
			[
				$baseUrl . '?useformat=mobile&mobileaction=toggle_desktop_view',
				$baseUrl . '?mobileaction=toggle_desktop_view'
			],
		];
	}

	/**
	 * @dataProvider updateDesktopUrlHostProvider
	 * @covers MobileContext::updateDesktopUrlHost
	 */
	public function testUpdateDesktopUrlHost( $mobile, $desktop, $server ) {
		$updateMobileUrlHost = self::getMethod( "updateDesktopUrlHost" );
		$this->setMwGlobals( [
			'wgServer' => $server,
			'wgMobileUrlTemplate' => '%h0.m.%h1.%h2',
		] );
		$parsedUrl = wfParseUrl( $mobile );
		$updateMobileUrlHost->invokeArgs(
			$this->makeContext(),
			[ &$parsedUrl ] );
		$this->assertEquals( $desktop, wfAssembleUrl( $parsedUrl ) );
	}

	public function updateDesktopUrlHostProvider() {
		return [
			[
				'http://bm.m.wikipedia.org/wiki/' . urlencode( 'Nyɛ_fɔlɔ' ),
				'http://bm.wikipedia.org/wiki/' . urlencode( 'Nyɛ_fɔlɔ' ),
				'//bm.wikipedia.org',
			],
			[
				'http://en.m.wikipedia.org/wiki/Gustavus_Airport',
				'http://en.wikipedia.org/wiki/Gustavus_Airport',
				'//en.wikipedia.org',
			],
			[
				'https://m.wikimediafoundation.org/wiki/FAQ',
				'https://wikimediafoundation.org/wiki/FAQ',
				'//wikimediafoundation.org',
			],
		];
	}

	/**
	 * @covers MobileContext::updateMobileUrlPath
	 */
	public function testUpdateMobileUrlPath() {
		$this->setMwGlobals( [
			'wgScriptPath' => '/wiki',
			'wgMobileUrlTemplate' => "/mobile/%p",
		] );
		$updateMobileUrlHost = self::getMethod( "updateMobileUrlPath" );

		// check for constructing a templated URL
		$parsedUrl = wfParseUrl( "http://en.wikipedia.org/wiki/Gustavus_Airport" );
		$updateMobileUrlHost->invokeArgs( $this->makeContext(), [ &$parsedUrl ] );
		$this->assertEquals(
			"http://en.wikipedia.org/wiki/mobile/Gustavus_Airport",
			wfAssembleUrl( $parsedUrl )
		);

		// check for maintaining an already templated URL
		$parsedUrl = wfParseUrl( "http://en.wikipedia.org/wiki/mobile/Gustavus_Airport" );
		$updateMobileUrlHost->invokeArgs( $this->makeContext(), [ &$parsedUrl ] );
		$this->assertEquals(
			"http://en.wikipedia.org/wiki/mobile/Gustavus_Airport",
			wfAssembleUrl( $parsedUrl )
		);
	}

	/**
	 * A null title shouldn't result in a fatal exception - bug T142914
	 */
	public function testRedirectMobileEnabledPages() {
		$this->setMwGlobals( [
			'wgTitle' => null,
		] );
		$mobileContext = $this->makeContext();
		$mobileContext->getRequest()->setVal( 'action', 'history' );
		$mobileContext->setUseFormat( 'mobile' );

		$this->assertTrue( $mobileContext->shouldDisplayMobileView() );
	}

	/**
	 * @dataProvider getMobileActionProvider
	 * @covers MobileContext::getMobileAction
	 */
	public function testGetMobileAction( $mobileaction = null ) {
		$context = $this->makeContext();
		if ( is_null( $mobileaction ) ) {
			$assert = '';
		} else {
			$context->getRequest()->setVal( 'mobileaction', $mobileaction );
			$assert = $mobileaction;
		}

		$this->assertEquals( $assert, $context->getMobileAction() );
	}

	public function getMobileActionProvider() {
		return [
			[ null ],
			[ 'view_normal_site' ],
		];
	}

	/**
	 * @dataProvider getUseFormatProvider
	 * @covers MobileContext::getUseFormat
	 */
	public function testGetUseFormat( $explicit, $requestParam, $expected ) {
		$context = $this->makeContext();
		$context->getRequest()->setVal( 'useformat', $requestParam );
		$context->setUseFormat( $explicit );
		$this->assertEquals( $expected, $context->getUseFormat() );
	}

	public function getUseFormatProvider() {
		return [
			[ 'mobile', null, 'mobile' ],
			[ null, 'mobile', 'mobile' ],
			[ null, null, '' ],
			[ 'desktop', 'mobile', 'desktop' ],
		];
	}

	/**
	 * @covers MobileContext::getUseFormatCookieExpiry
	 */
	public function testGetUseFormatCookieExpiry() {
		global $wgCookieExpiration;
		$getUseFormatCookieExpiry = self::getMethod( 'getUseFormatCookieExpiry' );

		$context = $this->makeContext();
		$startTime = time();
		$this->setMwGlobals( 'wgMobileFrontendFormatCookieExpiry', 60 );
		$mfCookieExpected = $startTime + 60;
		$this->assertTrue(
			$mfCookieExpected == $getUseFormatCookieExpiry->invokeArgs(
				$context,
				[ $startTime ]
			),
			'Using MobileFrontend expiry.'
		);

		$this->setMwGlobals( 'wgMobileFrontendFormatCookieExpiry', null );
		$defaultMWCookieExpected = $startTime + $wgCookieExpiration;
		$this->assertTrue(
			$defaultMWCookieExpected == $getUseFormatCookieExpiry->invokeArgs(
				$context,
				[ $startTime ]
			),
			'Using default MediaWiki cookie expiry.'
		);
	}

	/**
	 * @covers MobileContext::getStopMobileRedirectCookieDomain
	 */
	public function testGetStopMobileRedirectCookieDomain() {
		$context = $this->makeContext();
		$this->setMwGlobals( [
			'wgMFStopRedirectCookieHost' => null,
			'wgServer' => 'http://en.wikipedia.org',
		] );
		$this->assertEquals( $context->getStopMobileRedirectCookieDomain(), '.wikipedia.org' );
		$this->setMwGlobals( 'wgMFStopRedirectCookieHost', 'foo.bar.baz' );
		$this->assertEquals( $context->getStopMobileRedirectCookieDomain(), 'foo.bar.baz' );
	}

	/**
	 * @covers MobileContext::isLocalUrl
	 */
	public function testIsLocalUrl() {
		global $wgServer;
		$context = $this->makeContext();
		$this->assertTrue( $context->isLocalUrl( $wgServer ) );
		$this->assertFalse( $context->isLocalUrl( 'http://www.google.com' ) );
	}

	/**
	 * @dataProvider addAnalyticsLogItemProvider
	 * @covers MobileContext::getAnalyticsLogItems
	 */
	public function testAddAnalyticsLogItem( $key, $val ) {
		$context = $this->makeContext();
		$context->addAnalyticsLogItem( $key, $val );
		$logItems = $context->getAnalyticsLogItems();
		$trimmedKey = trim( $key );
		$trimmedVal = trim( $val );
		$this->assertTrue( isset( $logItems[$trimmedKey] ) );
		$this->assertEquals( $logItems[$trimmedKey], $trimmedVal );
	}

	public function addAnalyticsLogItemProvider() {
		return [
			[ 'mf-m', 'a' ],
			[ ' mf-m', 'b ' ],
		];
	}

	/**
	 * @dataProvider getXAnalyticsHeaderProvider
	 * @covers MobileContext::getXAnalyticsHeader
	 */
	public function testGetXAnalyticsHeader( $existingHeader, $logItems, $expectedHeader ) {
		$context = $this->makeContext();
		foreach ( $logItems as $key => $val ) {
			$context->addAnalyticsLogItem( $key, $val );
		}
		if ( $existingHeader ) {
			$context->getRequest()->response()->header( 'X-Analytics: ' . $existingHeader, true );
		}
		$this->assertEquals( $context->getXAnalyticsHeader(), $expectedHeader );
	}

	public function getXAnalyticsHeaderProvider() {
		return [
			[
				null,
				[ 'mf-m' => 'a', 'zero' => '502-13' ],
				'X-Analytics: mf-m=a;zero=502-13',
			],
			// check key/val trimming
			[
				null,
				[ '  foo' => '  bar  ', 'baz' => ' blat ' ],
				'X-Analytics: foo=bar;baz=blat'
			],
			// check urlencoding key/val pairs
			[
				null,
				[ 'foo' => 'bar baz', 'blat' => '$blammo' ],
				'X-Analytics: foo=bar+baz;blat=%24blammo'
			],
			// check handling of existing header value
			[
				'existing=value; another=item',
				[ 'mf-m' => 'a', 'zero' => '502-13' ],
				'X-Analytics: existing=value;another=item;mf-m=a;zero=502-13',
			],
		];
	}

	/**
	 * @dataProvider addAnalyticsLogItemFromXAnalyticsProvider
	 * @covers MobileContext::addAnalyticsLogItemFromXanalytics
	 */
	public function testAddAnalyticsLogItemFromXAnalytics( $analyticsItem, $key, $val ) {
		$context = $this->makeContext();
		$context->addAnalyticsLogItemFromXanalytics( $analyticsItem );
		$logItems = $context->getAnalyticsLogItems();
		$this->assertTrue( isset( $logItems[$key] ) );
		$this->assertEquals( $logItems[$key], $val );
	}

	public function addAnalyticsLogItemFromXAnalyticsProvider() {
		return [
			[ 'mf-m=a', 'mf-m', 'a' ],
			// check key/val trimming
			[ ' mf-m=a ', 'mf-m', 'a' ],
			// check urldecode
			[ 'foo=bar+%24blat', 'foo', 'bar $blat' ],
		];
	}

	/**
	 * @dataProvider getMobileHostTokenProvider
	 * @covers MobileContext::getMobileHostToken
	 */
	public function testGetMobileHostToken( $domainTemplate, $result ) {
		$context = $this->makeContext();
		$this->assertEquals( $context->getMobileHostToken( $domainTemplate ), $result );
	}

	public function getMobileHostTokenProvider() {
		return [
			[ '%h1.m.%h2.%h3', 'm.' ],
			[ '', '' ],
			[ 'bananas.%h2.%h3', 'bananas.' ],
		];
	}

	/**
	 * @dataProvider optInProvider
	 * @covers MobileContext::isBetaGroupMember
	 */
	public function testOptIn( array $cookies, $isBeta, $enabledInSettings ) {
		$this->setMwGlobals( 'wgMFEnableBeta', $enabledInSettings );
		$mobileContext = $this->makeContext( '/', $cookies );
		$this->assertEquals( $isBeta, $mobileContext->isBetaGroupMember() );
	}

	public function optInProvider() {
		return [
			[ [], false, true ],
			[ [ 'optin' => 'beta' ], true, true ],
			[ [ 'optin' => 'foobar' ], false, true ],
			[ [], false, false ],
			[ [ 'optin' => 'beta' ], false, false ],
			[ [ 'optin' => 'foobar' ], false, false ],
		];
	}

	/**
	 * @dataProvider provideToggleView
	 * @covers MobileContext::checkToggleView
	 * @covers MobileContext::doToggling
	 * @param $page
	 * @param $url
	 * @param $urlTemplate
	 * @param $expectedLocation
	 */
	public function testToggleView( $page, $url, $urlTemplate, $expectedLocation ) {
		$this->setMwGlobals( [
			'wgMobileUrlTemplate' => $urlTemplate,
			'wgServer' => '//en.wikipedia.org',
			// 'wgArticlePath' => '/wiki/$1',
			'wgScriptPath' => '/wiki',
		] );
		$context = $this->makeContext( $url );
		$context->getContext()->setTitle( Title::newFromText( $page ) );
		$context->checkToggleView();
		$context->doToggling();
		$location = $context->getOutput()->getRedirect();
		$this->assertEquals( $expectedLocation, $location );
	}

	public function provideToggleView() {
		$token = '%h0.m.%h1.%h2';
		return [
			[ 'Foo', '/', '', '' ],
			[ 'Foo', '/', $token, '' ],
			[ 'Main Page', '/wiki/Main_Page', '', '' ],
			[ 'Main Page', '/wiki/Main_Page', $token, '' ],
			[ 'Main Page', '/wiki/Main_Page?useformat=mobile', '', '' ],
			[ 'Main Page', '/wiki/Main_Page?useformat=mobile', $token, '' ],
			[ 'Main Page', '/wiki/Main_Page?useformat=desktop', '', '' ],
			[ 'Main Page', '/wiki/Main_Page?useformat=desktop', $token, '' ],
			[ 'Foo', '/?mobileaction=toggle_view_desktop', '', '' ],
			[ 'Foo', '/?mobileaction=toggle_view_mobile', '', '' ],
			[ 'Page', '/wiki/Page?mobileaction=toggle_view_desktop',
				'', ''
			],
			/*
		    FIXME: works locally but fails in Jerkins
			array( 'Main Page', '/?mobileaction=toggle_view_desktop',
				$token, 'http://en.wikipedia.org/wiki/Main_Page'
			),
			array( 'Main Page', '/?mobileaction=toggle_view_mobile',
				$token, 'http://en.m.wikipedia.org/wiki/Main_Page'
			),
			array( 'Page', '/wiki/Page?mobileaction=toggle_view_mobile',
				$token, 'http://en.m.wikipedia.org/wiki/Page'
			),
			array( 'Page', '/wiki/Page?mobileaction=toggle_view_desktop',
				$token, 'http://en.wikipedia.org/wiki/Page'
			),
			array( 'Special:Foo',
				'/wiki/index.php?title=Special:Foo&bar=baz&mobileaction=toggle_view_desktop',
				$token, 'http://en.wikipedia.org/w/index.php?title=Special:Foo&bar=baz'
			),
			array( 'Special:Foo',
				'/wiki/index.php?title=Special%3AFoo&bar=baz&mobileaction=toggle_view_mobile',
				$token, 'http://en.m.wikipedia.org/w/index.php?title=Special:Foo&bar=baz'
			),
			array( 'Page', '/wiki/index.php?title=Page&mobileaction=toggle_view_desktop',
				$token, 'http://en.wikipedia.org/wiki/Page',
			),
			array( 'Page', '/wiki/index.php?title=Page&mobileaction=toggle_view_mobile',
				$token, 'http://en.m.wikipedia.org/wiki/Page',
			),
		    */
		];
	}

	public function testBug71329() {
		SpecialPageFactory::resetList();
		RequestContext::resetMain();
		$req = new FauxRequest(
			[ 'title' => 'Special:Search', 'mobileaction' => 'toggle_view_mobile' ]
		);
		$req->setRequestURL( '/w/index.php?title=Special:Search&mobileaction=toggle_view_mobile' );
		RequestContext::getMain()->setRequest( $req );
		MobileContext::resetInstanceForTesting();
		$this->setMwGlobals( 'wgTitle', null );
		SpecialPage::getTitleFor( 'Search' );
		$this->assertTrue( true, 'In case of failure this test just crashes' );
	}

	/**
	 * @dataProvider provideGetConfigVariable
	 * @covers MobileContext::getConfigVariable
	 */
	public function testGetConfigVariable(
		$expected,
		$wgMinervaUseFooterV2,
		$mobileMode = 'stable'
	) {
		$this->setMwGlobals( [
			'wgMFEnableBeta' => true,
			'wgMinervaUseFooterV2' => $wgMinervaUseFooterV2
		] );

		$context = MobileContext::singleton();
		$context->setMobileMode( $mobileMode );

		$this->assertEquals(
			$expected,
			$context->getConfigVariable( 'MinervaUseFooterV2' )
		);
	}

	public static function provideGetConfigVariable() {
		$wgMinervaUseFooterV2 = [
			'beta' => 'bar',
			'base' => 'foo',
		];

		return [
			[ 'foo', $wgMinervaUseFooterV2, 'stable' ],
			[ 'bar', $wgMinervaUseFooterV2, 'beta' ],

			[ null, [ 'alpha' => 'baz' ] ],

			// When the config variable isn't an array, then its value is returned
			// regardless of whether the user is a member of the beta group.
			[ true, true ],
		];
	}
}

<?php

class SkinMobileAlpha extends SkinMobileBeta {
	public $template = 'MobileTemplateAlpha';
	protected $mode = 'alpha';

	public function outputPage( OutputPage $out = null ) {
		wfProfileIn( __METHOD__ );
		if ( !$out ) {
			$out = $this->getOutput();
		}
		# Replace page content before DOMParse to make sure images are scrubbed and Zero transformations are applied
		$this->handleNewPages( $out );
		parent::outputPage( $out );
	}

	protected function getSearchPlaceHolderText() {
		return wfMessage( 'mobile-frontend-placeholder-alpha' )->text();
	}

	public function getDefaultModules() {
		$modules = parent::getDefaultModules();
		$modules['alpha'] = array( 'mobile.alpha' );
		return $modules;
	}

	protected function handleNewPages( OutputPage $out ) {
		# Show error message
		# @todo: What if user can't create new pages here?
		$title = $this->getTitle();
		if ( !$title->exists() && !$title->isSpecialPage() ) {
			$out->clearHTML();
			$out->addHTML(
				Html::openElement( 'div', array( 'id' => 'mw-mf-newpage' ) )
					. wfMessage( 'mobile-frontend-editor-newpage-prompt' )->parse()
					. Html::closeElement( 'div' )
			);
		}
	}

	public function prepareData( BaseTemplate $tpl ) {
		parent::prepareData( $tpl );
		$this->prepareTalkLabel( $tpl );
	}

	protected function prepareTalkLabel( BaseTemplate $tpl ) {
		$title = $this->getTitle();
		$isSpecialPage = $title->isSpecialPage();

		// talk page link for logged in alpha users
		if ( !$isSpecialPage && !$title->isTalkPage() ) {
			$talkTitle = $title->getTalkPage();
			if ( $talkTitle->getArticleID() ) {
				$dbr = wfGetDB( DB_SLAVE );
				$numTopics = $dbr->selectField( 'page_props', 'pp_value',
					array( 'pp_page' => $talkTitle->getArticleID(), 'pp_propname' => 'page_top_level_section_count' ),
					__METHOD__
				);
			} else {
				$numTopics = 0;
			}
			if ( $numTopics ) {
				$talkLabel = $this->getLanguage()->formatNum( $numTopics );
				$class = 'count';
			} else {
				$talkLabel = wfMessage( 'mobile-frontend-talk-overlay-header' );
				$class = '';
			}
			$menu = $tpl->data['page_actions'];
			if ( isset( $menu['talk'] ) ) {
				$menu['talk']['text'] = $talkLabel;
				$menu['talk']['class'] = $class;
			}
			$tpl->set( 'page_actions', $menu );
		}
	}
}

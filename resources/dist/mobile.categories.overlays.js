this.mfModules=this.mfModules||{},this.mfModules["mobile.categories.overlays"]=(window.webpackJsonp=window.webpackJsonp||[]).push([[2],{"./src/mobile.categories.overlays/CategoryAddOverlay.js":function(e,t,i){var s=i("./src/mobile.startup/Overlay.js"),n=i("./src/mobile.startup/mfExtend.js"),a=i("./src/mobile.startup/headers.js"),o=i("./src/mobile.startup/util.js"),r=i("./src/mobile.categories.overlays/CategoryGateway.js"),l=i("./src/mobile.categories.overlays/CategoryLookupInputWidget.js"),c=mw.loader.require("mediawiki.router");function d(e){s.call(this,o.extend(!0,{headers:[a.saveHeader(mw.msg("mobile-frontend-categories-add-heading",e.title),"initial-header"),a.savingHeader(mw.msg("mobile-frontend-categories-add-wait"))],className:"category-overlay overlay",events:{"click .save":"onSaveClick","click .suggestion":"onCategoryClick"}},e))}n(d,s,{template:o.template('\n<div class="overlay-header-container header-container position-fixed"></div>\n<div class="overlay-content">\n\t\x3c!-- Should be broken out into separate component --\x3e\n\t<div class="category-editor">\n\t\t<div class="content-header panel add-panel">\n\t\t\t<div class="category-add-input"></div>\n\t\t</div>\n\t\t<p class="overlay-content category-suggestions panel"></p>\n\t</div>\n</div>\n\t'),postRender:function(){var e;s.prototype.postRender.apply(this),this.$suggestions=this.$el.find(".category-suggestions"),this.$saveButton=this.$el.find(".save"),this.wgCategories=this.options.categories,this.title=this.options.title,this.gateway=new r(this.options.api),e=new l({gateway:this.gateway,suggestions:this.$suggestions,categories:this.wgCategories,saveButton:this.$saveButton}),this.$el.find(".category-add-input").append(e.$element)},onCategoryClick:function(e){this.$el.find(e.target).closest(".suggestion").detach(),this.$el.find(".suggestion").length>0?this.$saveButton.prop("disabled",!1):this.$saveButton.prop("disabled",!0)},onSaveClick:function(){var e="",t=this;this.showHidden(".saving-header"),this.$el.find(".suggestion").each((function(){var i=t.$el.find(this).data("title");i&&(e+="\n[["+i+"]] ")})),0===e.length?mw.notify(mw.msg("mobile-frontend-categories-nodata"),{type:"error"}):this.gateway.save(this.title,e).then((function(){c.navigate("#"),mw.notify(mw.msg("mobile-frontend-categories-notification"))}),(function(){t.showHidden(".initial-header"),t.$safeButton.prop("disabled",!1),mw.notify(mw.msg("mobile-frontend-categories-nodata"),{type:"error"})}))}}),e.exports=d},"./src/mobile.categories.overlays/CategoryGateway.js":function(e,t,i){var s,n=i("./src/mobile.startup/actionParams.js"),a=i("./src/mobile.startup/util.js"),o=i("./src/mobile.startup/search/SearchGateway.js");function r(){r.parent.apply(this,arguments)}s={continueParams:{},canContinue:!0,searchNamespace:14,save:function(e,t){return this.api.postWithToken("csrf",{action:"edit",title:e,appendtext:t,summary:mw.msg("mobile-frontend-categories-summary")})},getCategories:function(e){var t,i=this;return!1!==this.canContinue&&(t=a.extend({},{prop:"categories",titles:e,clprop:"hidden",cllimit:50},this.continueParams),this.api.get(n(t)).then((function(e){return void 0!==e.continue?i.continueParams=e.continue:i.canContinue=!1,e})))}},OO.inheritClass(r,o),a.extend(r.prototype,s),e.exports=r},"./src/mobile.categories.overlays/CategoryLookupInputWidget.js":function(e,t){function i(e){this.gateway=e.gateway,this.$suggestions=e.suggestions,this.categories=e.categories||[],this.$saveButton=e.saveButton,e.placeholder=mw.msg("mobile-frontend-categories-search"),OO.ui.TextInputWidget.call(this,e),OO.ui.mixin.LookupElement.call(this,e)}OO.inheritClass(i,OO.ui.TextInputWidget),OO.mixinClass(i,OO.ui.mixin.LookupElement),i.prototype.onLookupMenuChoose=function(e){var t=new OO.ui.ButtonWidget({icon:"check",label:e.label,classes:["suggestion","suggested"],flags:["progressive","primary"]});t.$element.attr("data-title",e.data),this.$suggestions.append(t.$element),this.$saveButton.prop("disabled",!1)},i.prototype.getLookupRequest=function(){return this.gateway.search(this.value)},i.prototype.getLookupCacheDataFromResponse=function(e){var t=new mw.Title(this.value,14);return e.results.unshift({title:t.toString(),displayTitle:t.getMainText()}),e},i.prototype.getLookupMenuOptionsFromData=function(e){var t=[],i=this.$element,s=this;return e.results.forEach((function(e){i.find('div[data-title="'+e.title+'"]').length||-1!==s.categories.indexOf(e.displayTitle)||t.push(new OO.ui.MenuOptionWidget({data:e.title,label:e.displayTitle}))})),t},e.exports=i},"./src/mobile.categories.overlays/CategoryTabs.js":function(e,t,i){var s=i("./src/mobile.startup/mfExtend.js"),n=i("./src/mobile.startup/util.js"),a=i("./src/mobile.startup/View.js"),o=i("./src/mobile.startup/icons.js").spinner().$el,r=i("./src/mobile.startup/ScrollEndEventEmitter.js"),l=i("./src/mobile.categories.overlays/CategoryGateway.js");function c(e){this.scrollEndEventEmitter=new r(e.eventBus),this.scrollEndEventEmitter.on(r.EVENT_SCROLL_END,this._loadCategories.bind(this)),this.gateway=new l(e.api),a.call(this,n.extend(!0,{events:{"click .catlink":"onCatlinkClick"},normalcatlink:mw.msg("mobile-frontend-categories-normal"),hiddencatlink:mw.msg("mobile-frontend-categories-hidden"),subheading:mw.msg("mobile-frontend-categories-subheading")},e))}s(c,a,{isTemplateMode:!0,template:n.template('\n<div class="category-list">\n\t<p class="content-header">\n\t\t{{subheading}}\n\t</p>\n\t<ul class="category-header">\n\t\t<li class="selected">\n\t\t\t<a href="#" class="catlink">{{normalcatlink}}</a>\n\t\t</li><li>\n\t\t\t<a href="#" class="catlink">{{hiddencatlink}}</a>\n\t\t</li>\n\t</ul>\n\t<ul class="topic-title-list normal-catlist"></ul>\n\t<ul class="topic-title-list hidden hidden-catlist"></ul>\n</div>\n\t'),templatePartials:{item:n.template('\n<li title="{{title}}">\n    <a href="{{url}}">{{title}}</a>\n</li>\n\t\t')},postRender:function(){a.prototype.postRender.apply(this),this.$el.append(o),this._loadCategories()},hideSpinner:function(){this.$el.find(".spinner").hide()},showSpinner:function(){this.$el.find(".spinner").show()},_loadCategories:function(){var e,t=this,i=this.$el.find(".normal-catlist"),s=this.$el.find(".hidden-catlist");this.scrollEndEventEmitter.setElement(this.$el),this.scrollEndEventEmitter.disable(),!1!==(e=this.gateway.getCategories(this.options.title))?e.then((function(e){e.query&&e.query.pages?(e.query.pages.forEach((function(e){e.categories&&e.categories.forEach((function(e){var n=mw.Title.newFromText(e.title,e.ns);e.hidden?s.append(t.templatePartials.item.render({url:n.getUrl(),title:n.getMainText()})):i.append(t.templatePartials.item.render({url:n.getUrl(),title:n.getMainText()}))}))})),0===i.length&&0===i.length?t.$el.find(".content-header").text(mw.msg("mobile-frontend-categories-nocat")):0===i.length&&i.length>0&&this._changeView()):t.$el.find(".content-header").text(mw.msg("mobile-frontend-categories-nocat")),t.hideSpinner(),t.scrollEndEventEmitter.enable()})):t.hideSpinner()},onCatlinkClick:function(e){e.preventDefault(),this.$el.find(e.target).parent().hasClass("selected")||this._changeView()},_changeView:function(){this.$el.find(".category-header li").toggleClass("selected"),this.$el.find(".topic-title-list").toggleClass("hidden")}}),e.exports=c},"./src/mobile.categories.overlays/mobile.categories.overlays.js":function(e,t,i){var s=i("./src/mobile.startup/moduleLoaderSingleton.js"),n=i("./src/mobile.categories.overlays/CategoryAddOverlay.js"),a=i("./src/mobile.categories.overlays/CategoryTabs.js");s.define("mobile.categories.overlays",{CategoryTabs:a,CategoryAddOverlay:n})}},[["./src/mobile.categories.overlays/mobile.categories.overlays.js",0,1]]]);
//# sourceMappingURL=mobile.categories.overlays.js.map.json
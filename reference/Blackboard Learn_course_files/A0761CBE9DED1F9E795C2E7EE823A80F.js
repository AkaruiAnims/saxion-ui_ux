if ( !window.VideoIntegration )
{
  var VideoIntegration =
  {};

  VideoIntegration.TRUSTY_IFRAME_SOURCE_URL_ORIGIN = "";
  VideoIntegration.shouldSyncAltToTitle = true;

  VideoIntegration.onReceivingMessageHandler = function( event )
  {
    var messageType = event.data.messageType;
    var eventOrigin = event.origin;
    var eventSource = event.source;
    if ( messageType )
    {
      if ( VideoIntegration.TRUSTY_IFRAME_SOURCE_URL_ORIGIN &&
           eventOrigin === VideoIntegration.TRUSTY_IFRAME_SOURCE_URL_ORIGIN )
      {
        /*
         * For now we merely ack, which is expected by the Collab capture app, for most of the messages. In the future,
         * we may actually want to do more with the messages.
         */
        switch ( messageType )
        {
          case 'capture_loaded':
            eventSource.postMessage(
            {
              messageType : 'capture_loaded_ack'
            }, eventOrigin );
            break;
          case 'capture_maximize':
            eventSource.postMessage(
            {
              messageType : 'capture_maximize_ack'
            }, eventOrigin );
            break;
          case 'capture_complete':
            // save video uuid
            $('videoJSONId').value = event.data.uid;
            // display recording, title, alternative text
            $('videoInfoId').show();
            // update duration
            VideoIntegration.updateDuration( event.data.durationSeconds );
            // set focus on title
            $('videoTitleId').focus();
            // hide collab capture iframe
            $('collabCaptureId').hide();
            // add event listeners
            Event.observe('insertLinkId', 'click', VideoIntegration.onInsertLinkHandler);
            Event.observe('videoTitleId', 'input', VideoIntegration.onTitleChangeHandler);
            $j( "#altTextId" ).keydown(function() {
              if ( VideoIntegration.shouldSyncAltToTitle )
              {
                VideoIntegration.shouldSyncAltToTitle = false;
              }
            });
            break;
          case 'capture_close':
            eventSource.postMessage(
            {
              messageType : 'capture_close_ack'
            }, eventOrigin );
            break;
          default:
        }
      }
      else if ( eventOrigin === window.location.origin )
      {
        if ( messageType === 'iframe_origin' )
        {
          var iFrameURLOrigin = event.data.iFrameURLOrigin;
          if ( iFrameURLOrigin )
          {
            VideoIntegration.TRUSTY_IFRAME_SOURCE_URL_ORIGIN = iFrameURLOrigin;
          }
        }
      }
    }
  };
  
  VideoIntegration.updateDuration = function( durationSeconds )
  {
    var date = new Date( null );
    date.setSeconds( durationSeconds );
    var dateStr = date.toISOString();
    // the date format is 'hh:mm:ss'
    
    // hours are not supported for now
    var hourStr = dateStr.substr(11, 2);
    var hours = parseInt( hourStr, 10 );
    
    // minutes
    var minuteStr = dateStr.substr(14, 2);
    var minutes = parseInt( minuteStr, 10 );
    $('minuteId').update( minuteStr );
    if ( minutes > 1 )
    {
      $('minuteUnit').remove();
    }
    else
    {
      $('minutesUnit').remove();
    }
    
    // seconds
    var secondStr = dateStr.substr(17, 2);
    var seconds = parseInt( secondStr, 10 );
    $('secondId').update( secondStr );
    if ( seconds > 1 )
    {
      $('secondUnit').remove();
    }
    else
    {
      $('secondsUnit').remove();
    }
  };
  
  VideoIntegration.validateRecordingNameAndAltText = function()
  {
    var receipt = $('receipt_id');
    if ( receipt )
    {
      //Remove any existing inline receipt (if any).
      receipt.remove();
    }
    var videoTitle = $('videoTitleId').value.strip();
    var altText = $('altTextId').value.strip();
    if ( !videoTitle )
    {
      new page.InlineConfirmation( "error", page.bundle.getString( 'video-integration.empty.name.error' ), false );
      return false;
    }
    else if ( !altText )
    {
      new page.InlineConfirmation( "error", page.bundle.getString( 'video-integration.empty.altText.error' ), false );
      return false;
    }
    else
    {
      return true;
    }
  };
  
  VideoIntegration.onInsertLinkHandler = function()
  {
    if ( !VideoIntegration.validateRecordingNameAndAltText() )
    {
      return;
    }
    // Make REST API call to LEARN to save video integration.
    var videoJSON = JSON.stringify( { "videoUuid" : $('videoJSONId').value, 
      "videoTitle" : $('videoTitleId').value, "videoAltText": $('altTextId').value } );
    $j.ajax({
      type: "POST",
      url: "/learn/api/v1/video-integration",
      headers: { 'X-Blackboard-XSRF': $( 'ajaxNonceId' ).value },
      contentType: "application/json",
      data: videoJSON,
      success: function (data, status, jqXHR) 
      {
        // All the messages are dispatched only after all pending executions within the context of this function have finished.
        // So although the first message closes this dialog first, the message to insertHtmlAndCloseAddContentDialog
        // will also be dispatched before this window will be closed.

        var htmlToInsert = data.videoEmbeddedLink + '"' + $('videoTitleId').value.strip().escapeHTML() + '"';
        // Close this dialog. Needs to be closed using an async message so that the message to insert html can also be
        // dispatched before the dialog closes.
        parent.postMessage( {
          mceAction: 'closeContentSelectorDialog'
        }, origin );
        // Insert Html to the editor while showing a blocking animation on the Add Content Dialog, then close the dialog.
        parent.postMessage( {
          mceAction: 'insertHtmlAndCloseAddContentDialog',
          data: htmlToInsert
        }, origin );
      },
      error: function (jqXHR, status) 
      {
        new page.InlineConfirmation( "error", page.bundle.getString( 'video-integration.save.recording.failure.receipt' ) , false );
      },
      dataType: 'json'
    });
  };	
  
  VideoIntegration.onTitleChangeHandler = function()
  {
    $('videoNameId').update( $('videoTitleId').value.strip().escapeHTML() );
    if ( VideoIntegration.shouldSyncAltToTitle )
    {
      $('altTextId').value = $('videoTitleId').value;
    }
  };
  
  /**
   * Shows an inline receipt informing the user to not navigate away during the recording process.
   */
  VideoIntegration.showDoNotCloseRecordingWindowMsg = function()
  {
    new page.InlineConfirmation( "success", page.bundle.getString( 'video-integration.do-not-navigate-during-recording' ) , false );
  };
  
  /**
   * Setup communication between the window popup and collab capture.
   */
  VideoIntegration.initCollabCaptureCommunication = function( targetUrl )
  {
    window.addEventListener( "message", VideoIntegration.onReceivingMessageHandler, true );
    var iFrame = $("collabVideoIFrameId");
    iFrame.src = targetUrl;
    var iFrameURL = new URL( iFrame.src );
    window.postMessage(
    {
      messageType : 'iframe_origin',
      iFrameURLOrigin : iFrameURL.origin
    }, window.location.origin );
  };
  
  /**
   * Opens a popup window containing an iFrame displaying the specified video.
   */
  VideoIntegration.viewInPopup = function( courseId, videoUuid )
  {
	var queryParams = { course_id: courseId, videoUuid: videoUuid };
	var viewViewUrl = '/webapps/videointegration/view/play?' + jQuery.param( queryParams );
    var viewWindow = window.open( viewViewUrl, 'VideoIntegrationVideoView', 'height=715,width=1200,status=1,scrollbars=1,resizable=1' );
    if ( viewWindow )
    {
      viewWindow.focus();
    }
    return false;
  };
}
if ( !window.AllyIntegration )
{
  var AllyIntegration =
  {};

  AllyIntegration.initJWT = function( jwt )
  {
    window.ALLY_TOKEN = jwt;
  };

  AllyIntegration.initAllyJSConfigs = function( baseUrl, clientId )
  {
    window.ALLY_CFG =
    {
        'baseUrl' : baseUrl,
        'clientId' : clientId
    };
  };
}
if(!window.lightbox)
{
/**
 * lightbox.js - a flexible lightbox widget.
 * @author jriecken
 **/
var lightbox = {
  Lightbox: Class.create({
   /**
    * Creates a new lightbox.  If no "openLink" property exists in the config passed in,
    * the lb can be programmatically opened by calling open() on it.
    * @param cfg configuration for the lb.
    *  - lightboxId - The optional id to be set to the lightbox wrapping div. The default is no id attribute set on the lightbox wrapper element.
    *  - openLink - If passed will wire lb opening to this link, and set the focus back on it on close
    *  - focusOnClose - element that will receive the focus on close. If specified, it supercedes openLink element.
    *  - ajax - Whether to asyncronously load the lb content. This can be a simple boolean (the url will be taken from openLink's href) or a {url: 'url', params: 'params', loadExternalScripts: 'true'} object.
    *  --    if ajax{...loadExternalScripts :true} is defined then all all of the referenced script source files will be loaded before executing the scripts in the loaded page.
    *  - dimensions - A {w: xxx, h: xxx} object defining the dimensions of the lb.  If not passed, the lb will size to fit the content.
    *  - contents - Contents of the lb (not needed if async) - either a string, a function that returns a string, or an object with add'l config (see _updateLightboxContent).
    *  - title - Title for the lb.  If not passed and openLink is provided and has a title attribute, that attribute will be used.
    *  - defaultDimensions - Default dimensions for ajax loading phase of a lb that doesn't specify a dimensions config param.
    *  - fixedDimensions - Allows you to fix a certain dimension, while allowing the other dimension to autosize.
    *  - useDefaultDimensionsAsMinimumSize - if useDefaultDimensionsAsMinimumSize set then increase size to be the minimum if the auto-size results in a small size
    *  - horizontalBorder - specifies the minimum dimension for the width around the lightbox, default is set to 50
    *  - verticalBorder - specifies the minimum dimension for the height around the lightbox, default is set to 50
    *  - constrainToWindow - Whether to ensure that the lb will fit inside the window.
    *  - closeOnBodyClick - Whether to close the lb when the user clicks outside of the lb.
    *  - processingTemplate - HTML template for the content shown while an async load is in progress.
    *  - lbTemplate - HTML template for the lb. If user-supplied lbTemplate & title parameters are passed to the lightbox, the lbTemplate must contain any required  headings for the title.
    *  - lbContentClass - div class that contains the lb content, useful with client-supplied lbTemplate.
    *  - troubleElems - Elements that should be hidden while the lb is open.
    *  - msgs - I18N messages used by the lb.
    *  - onClose - call back function that if passed is called when the light box is closed
    *  - left - optional left position for lb. Default position is centered
    *  - top - optional top position for lb. Default position is centered
    *  - setPositionAbsolute - sets the position to absolute (instead of fixed) by applying the appropriate css class (useful for small device widths)
    **/
   initialize: function( cfg )
   {
     //Default values for configuration parameters.
     this.cfg = Object.extend({
        lightboxId: "",
        openLink: null,
        ajax: null,
        dimensions: null,
        contents: "",
        title: "",
        focusOnClose: "",
        defaultDimensions: { w: 320, h: 240 },
        fixedDimensions: null,
        useDefaultDimensionsAsMinimumSize : false,
        horizontalBorder : 50,
        verticalBorder : 50,
        constrainToWindow: true,
        closeOnBodyClick: true,
        showCloseLink: true,
        processingTemplate: '<div class="lb-loading" style="width: #{width}px; height: #{height}px;"><span class="hideoff">#{loadingText}</span></div>',
        lbTemplate: '<div class="lb-header" tabindex="-1">#{title}</div><div class="lb-content" aria-live="off"></div><a class="lbAction u_floatThis-right" href="\\#close" title=\'#{closeText}\' role="button"><img src="' + getCdnURL( "/images/ci/mybb/x_btn.png" ) + '" alt="#{closeText}"></a>',
        lbContentClass: 'lb-content',
        troubleElems: [ 'select', 'object', 'embed', 'applet' ],
        msgs: { 'close' : page.bundle.getString('inlineconfirmation.close'), 'loading' : page.bundle.getString('lightbox.loading') }
     }, cfg);
     if ( !this.cfg.showCloseLink && !cfg.lbTemplate )
     {
       this.cfg.lbTemplate = '<div class="lb-header" tabindex="-1">#{title}</div><div class="lb-content" aria-live="off"></div><span tabindex="0" class="lb-focustrap"> </span>';
     }
     this.cfg.title = this.cfg.title || ( this.cfg.openLink && this.cfg.openLink.title ? this.cfg.openLink.title : "" );
     var lbWrapper =  new Element( 'div' ).addClassName( 'lb-wrapper' );
     lbWrapper.setAttribute( "role", "dialog" );
     var wrapperArgs = {
       title: this.cfg.title,
       closeText: this.cfg.msgs.close,
       lbContentClass: this.cfg.lbContentClass
     };
     if ( wrapperArgs.title )
     {
       if ( !cfg.lbTemplate )
       {
         wrapperArgs.title = '<h2 id="dialogheading">' + wrapperArgs.title + '</h2>';
         lbWrapper.setAttribute( "aria-labelledby", "dialogheading" );
       }
     }
     else
     {
       wrapperArgs.title = '&nbsp;';
     }

     if ( this.cfg.openLink )
     {
       this.cfg.openLink = $( this.cfg.openLink );
       this.cfg.openLink.observe( 'click', this._onOpen.bindAsEventListener( this ) );
       if ( !this.cfg.focusOnClose )
       {
         this.cfg.focusOnClose = this.cfg.openLink;
       }
     }
     this.overlay = new Element('div').addClassName('lb-overlay').setStyle( { opacity: 0 } );
     this.lightboxWrapper = lbWrapper.update( this.cfg.lbTemplate.interpolate( wrapperArgs ) );
     if( this.cfg.setPositionAbsolute )
     {
       this.lightboxWrapper.addClassName('lb-wrapper-absolute');
     }
     if ( this.cfg.lightboxId )
     {
       this.lightboxWrapper.setAttribute( 'id', this.cfg.lightboxId );
     }

     var header = this.lightboxWrapper.down('.lb-header');
     if ( header )
     {
       this.lightboxTitle = header.down('h2');
     }

     this.lightboxContent = this.lightboxWrapper.down('div.' + this.cfg.lbContentClass);
     this.firstLink = this.lightboxWrapper.down('.lb-header');
     if ( this.cfg.showCloseLink )
     {
       this.closeLink = this.lastLink = this.lightboxWrapper.down('.lbAction');
       this.closeLink.observe( 'click', this._onClose.bindAsEventListener( this ) );
     }
     else
     {
       this.lastLink = this.lightboxWrapper.down('.lb-focustrap');
       if ( !this.lastLink )
       {
         this.lastLink = this.firstLink;
       }
     }
     //Wire up events
     this.lightboxWrapper.observe( 'keydown', this._onKeyPress.bindAsEventListener( this ) );
     if ( this.cfg.closeOnBodyClick )
     {
       this.overlay.observe( 'click', this._onOverlayClick.bindAsEventListener( this ) );
     }
     this.boundResizeListener = this._onWindowResize.bindAsEventListener( this );
   },
   /**
    * Opens the lightbox.
    * @param afterOpen a callback function to call after the lb has finished loading.
    */
   open: function( afterOpen )
   {
     lightbox.closeCurrentLightbox();
     lightbox._currentLightbox = this;
     this._fixIE( true );
     this._toggleTroubleElements( true );

     document.body.appendChild( this.overlay );
     new Effect.Opacity( this.overlay, {
       from: 0.0, to: 0.5, duration: 0,  // duration must be 0 to avoid focus problem with IE & screen reader
       afterFinish: function()
       {
         document.body.appendChild( this.lightboxWrapper );
         this._updateLightboxContent( afterOpen );
         //Calling the youtube API Method when the light box is loaded
         var lbc1 = this.lightboxContent;
         var frameIds = lbc1.getElementsByClassName("ytIframeClass");
         if ( frameIds.length > 0 ) {
           var frameIdss = [];
           frameIdss.push( frameIds[0] );
           
         }
         Event.observe( window, 'resize', this.boundResizeListener );
       }.bind( this ) });
   },
   /**
    * Shows the existing the lightbox. The content will not be updated, it is up to the caller to update the content
    *
    * @param afterOpen a callback function to call after the lb has finished loading.
    */
   show: function( afterOpen )
   {
     //If the lightboxWrapper is null, open the light box.
     if ( !this.lightboxWrapper )
     {
       open( afterOpen );
       return;
     }

     lightbox._currentLightbox = this;
     document.body.appendChild( this.overlay );
     new Effect.Opacity( this.overlay, {
       from: 0.0, to: 0.5, duration: 0,  // duration must be 0 to avoid focus problem with IE & screen reader
       afterFinish: function()
       {
         this.lightboxWrapper.removeClassName("hideme");
         Event.observe( window, 'resize', this.boundResizeListener );
         window.dispatchEvent(new Event('resize'));
       }.bind( this ) });
   },

   /**
    * Closes the lightbox.
    */
   close: function(hide)
   {
      if ( /MSIE (\d+\.\d+);/.test( navigator.userAgent ) && this._ytPlayers )
      {
        // This gives the list of all the ytplayers in the page.. need to find the correct one.
        for ( var i = this._ytPlayers.length - 1; i >= 0; i-- )
        {
          var currentPlayer = this._ytPlayers[ i ];
          var lightboxDiv = page.util.upToClass( currentPlayer.getIframe(), "lb-content" );
          if ( lightboxDiv )
          {
            if ( currentPlayer.stopVideo )
            {
              currentPlayer.stopVideo();
            }
            
            var iframe = currentPlayer.getIframe();
            iframe.style.display = 'none';
            iframe.src = "";

            if ( currentPlayer.clearVideo )
            {
              currentPlayer.clearVideo();
            }
            
            break;
          }
        }
      }

     this._hideLightBox = hide;
     if (this.cfg.onClose) {
       if ( Object.isFunction( this.cfg.onClose ) )
       {
         this.cfg.onClose();
       }
       else
       {
         var closeFunc = new Function(this.cfg.onClose);
         closeFunc();
       }
    }
     Event.stopObserving( window, 'resize', this.boundResizeListener );
     if ( this.movedElement && this.originalParent )
     {
       this.movedElement.parentNode.removeChild( this.movedElement );
       this.originalParent.appendChild( this.movedElement );
       this.movedElement.style.display = this.movedElement.originalDisplay;
     }

     if ( !this._hideLightBox )
     {
       this._clearLightboxContent();
       this.lightboxWrapper.remove();
     }
     else
     {
       this.lightboxWrapper.addClassName("hideme");
     }

     new Effect.Opacity( this.overlay, {
      from: 0.3, to: 0.0, duration: 0, // duration must be 0 to avoid focus problem with IE & screen reader
      afterFinish: function()
      {
         this.overlay.remove();
         this._toggleTroubleElements( false );
         this._fixIE( false );
         if ( !this._hideLightBox )
         {
          lightbox._currentLightbox = null;
         }
         if ( this.cfg.focusOnClose ) { $(this.cfg.focusOnClose).focus(); }
      }.bind( this ) });
   },
   /**
    * Hide the lightbox.
    */
   hide: function()
   {
     this.close(true);
   },
   resize: function( newDimensions )
   {
     this.cfg.dimensions = newDimensions; // might be null, in which case it is auto-resize
     this._resizeAndCenterLightbox( );
   },


   /** Event listener for opening lb. */
   _onOpen: function( event ) { this.open(); event.stop(); },
   /** Event listener for closing lb. */
   _onClose: function( event ) { this.close(); event.stop(); },
   /** Event listener wired when closeOnBodyClick is true. */
   _onOverlayClick: function( event ) { if ( event.element() == this.overlay ) { this.close(); } event.stop(); },
   /** Event listener for keyboard presses in the LB. */
   _onKeyPress: function( event )
   {
     var key = event.keyCode || event.which;
     var elem = event.element();
     // Close on ESC type
     if ( key == Event.KEY_ESC )
     {
       this.close();
       event.stop();
     }
     // Set up the tab loop (don't tab/shift-tab out of the lb)
     else if ( key == Event.KEY_TAB && !event.shiftKey && elem == this.lastLink )
     {
       this.firstLink.focus();
       event.stop();
     }
     else if ( key == Event.KEY_TAB && event.shiftKey && elem == this.firstLink )
     {
       this.lastLink.focus();
       event.stop();
     }

     /**
      * Re-assign firstLink to first focusable element after a tab keypress for focustrap to work
      * since .lb-header won't receive focus on keyboard navigation
      */
     if ( key === Event.KEY_TAB && this.firstLink === this.lightboxWrapper.down('.lb-header') )
     {
       this.firstLink = this.lightboxContent.down('a');
     }
   },
   /** Event listener for window resize. */
   _onWindowResize: function( event )
   {
     this._resizeAndCenterLightbox( false );
   },
   /**
    * Clears the lightbox.
    */
   _clearLightboxContent: function()
   {
     this.lightboxContent.update( '' );
   },
   /**
    * Updates the lightbox content based on the configuration.
    * @param afterFinish a callback to call after the content has finished updating.
    */
   _updateLightboxContent: function( afterFinish )
   {
     if ( this.cfg.ajax ) //Async
     {
       this._resizeAndCenterLightbox( true );
       var lbc = this.lightboxContent;
       var lbcDim = lbc.getDimensions();
       lbc.update(
         this.cfg.processingTemplate.interpolate(
         {
           loadingText: this.cfg.msgs.loading,
           width: (lbcDim.width - this._extraWidth( lbc, false ) ),
           height: (lbcDim.height - this._extraHeight( lbc, false, true ) )
         } )
       ).setStyle({
           overflow: 'hidden'
       }).focus();

       var url = this.cfg.ajax.url || this.cfg.openLink.href;
       var params = this.cfg.ajax.params || {};
       var requestMethod = this.cfg.ajax.method || 'get';
       var requestHeaders = this.cfg.ajax.requestHeaders || {};
       var asynFlag = this.cfg.ajax.asyn == null || this.cfg.ajax.asyn
       var cb = function( response )
       {
         lbc.setStyle({ overflow: 'auto' });
         this._updateLightboxContentHelper( response.responseText, afterFinish );
       }.bind( this );
       new Ajax.Request( url, {
        method: requestMethod ,
        asynchronous : asynFlag,
        parameters: params,
        requestHeaders: requestHeaders,
        onSuccess: cb,
        onFailure: cb
       });
     }
     else //Static
     {
       var c = this.cfg.contents; //Normal string contents
       if ( Object.isFunction( c ) ) //Function to get contents
       {
         c = c( this );
       }
       else if ( !Object.isString( c ) && !(Object.isArray( c ) ) ) //Config object
       {
         if ( c.id ) //Load contents from an element on the page already
         {
           var elem = $( c.id );

           //Lightbox can contain the elements that are considered to be 'trouble elements'.
           //Loop through to make sure that they are visible in the lightbox.
           this._toggleTroubleElementsHelper( elem, false );

           if ( c.move )
           {
             c = elem;
           }
           else
           {
             if( c.stripComments !== undefined && c.stripComments )
             {
               c = elem.innerHTML.replace('<!--','').replace('-->','');
               c = this._recreateMashupsHtml( c  );
             }
             else
             {
               c = elem.innerHTML;
             }
           }
         }
         else if ( c.auto && this.cfg.openLink ) // Attempt to auto load the content from the link href based on the file extension
         {
           var h = this.cfg.openLink.href;
           if ( lightbox._imageTypeRE.test( h ) )
           {
             c = '<img src="' + h + '" style="vertical-align:top;display:block;" alt="'+ this.cfg.title+'">';
           }
           else
           {
             c = "";
           }
         }
       }
       this._updateLightboxContentHelper( c, afterFinish );
     }
   },
   /**
    * Helper that actually updates the contents of the lb.
    * @param content the HTML content for the lb.
    * @param afterFinish a callback that will be called when the update is done.
    */
   _updateLightboxContentHelper: function( content, afterFinish )
   {
     var lbc = this.lightboxContent;
     var element;

     if ( Object.isElement( content ) )
     {
       element = content;
       content = "<div id='lb-container' class='lb-container'></div>";
     }

     this.evaluatingScripts = false;
     if (this.cfg.ajax && this.cfg.ajax.loadExternalScripts )
     {
       // Make sure all global scripts are evaluated in the lightbox content:
       content = Object.toHTML(content);
       lbc.innerHTML = content.stripScripts();
       this.evaluatingScripts = true;
       page.globalEvalScripts( content, true, this);

       //  This is related to the dynamic loading of page contents and the need to re-evaluate the page after the DOM is updated.
       if ( typeof com !== 'undefined' ) {
         com.wiris.js.JsPluginViewer.parseDocument( true );
       }
     }
     else
     {
       lbc.update(content);
     }
    
     if ( element )
     {
       this.originalParent = element.parentNode;
       this.movedElement = element;
       $( 'lb-container').appendChild( element );
       this.movedElement.originalDisplay = this.movedElement.style.display;
       element.show();
     }
     this._resizeWhenImagesReady( afterFinish );

     /**
      * If lb-header is present, it should get focus whenever lightbox opens,
      * else fallback to first content element.
      */
     var lbh = this.lightboxWrapper.down('.lb-header');
     if ( lbh )
     {
       this.firstLink = lbh;
     }
     else
     {
       this.firstLink = lbc.down('a');
     }

     if ( this.firstLink )
     {
       (function() { this.firstLink.focus(); }.bind(this).defer( 1 ));
     }
   },

   /**
    * Since images don't load immediately, we need to wait until they've
    * loaded before resizing
    */
   _resizeWhenImagesReady: function( afterFinish )
   {
     var lbw = this.lightboxWrapper, lbc = this.lightboxContent;
     var imgs = lbc.getElementsByTagName( 'img' );
     var iterations = 0;
     if (( !this.cfg.dimensions && imgs.length > 0 ) || (this.evaluatingScripts))
     {
       new PeriodicalExecuter( function( pe )
       {
         iterations++;
         var allDone = page.util.allImagesLoaded( imgs );
         if (this.evaluatingScripts)
         {
           allDone = false;
         }
         // Done, or waited more than 5 seconds
         if ( allDone || iterations > 50 )
         {
           //Show the lightbox
           lbw.show();
           lbc.focus();
           this._resizeAndCenterLightbox( false );
           if ( afterFinish ) { afterFinish(); }
           this._initializeBottomSubmitStep( lbc );
           pe.stop();
         }
       }.bind(this),0.1);
     }
     else
     {
       this._resizeAndCenterLightbox( false );
       if ( afterFinish ) { afterFinish(); }
       this._initializeBottomSubmitStep( lbc );
     }
   },

   /**
    * Invoke page.util.pinBottomSubmitStep if bottom submit button is found.
    * This method is called with the light box content has been fully loaded.
    */
   _initializeBottomSubmitStep: function( lbc )
   {
	 var bottomSubmitToBePinned = page.util.getBottomSubmitStep();
     if ( bottomSubmitToBePinned ){
         page.util.pinBottomSubmitStep( bottomSubmitToBePinned, lbc );
       }
   },

   /**
    * Size the lightbox and make sure that it is centered in the viewport.
    * @param isLoading whether we're in the async loading phase.
    */
   _resizeAndCenterLightbox: function( isLoading )
   {
     var lbw = this.lightboxWrapper,
         lbc = this.lightboxContent,
         lbt = this.lightboxTitle, title, lbDim;

     var viewDim = document.viewport.getDimensions();

     var maxWidth = viewDim.width - this.cfg.horizontalBorder,
         maxHeight = viewDim.height - this.cfg.verticalBorder;

     if ( lbt ) //Ensure a long title doesn't cause the lightbox to get very wide.
     {
       title = lbt.innerHTML;
       lbt.update( '' );
     }

     if ( this.cfg.dimensions ) // explicitly defined size
     {
       lbw.setStyle( { width: this.cfg.dimensions.w + 'px',  height: this.cfg.dimensions.h + 'px' } );
     }
     else if (isLoading) // temporary loading size
     {
       lbw.setStyle({ width: this.cfg.defaultDimensions.w + 'px', height: this.cfg.defaultDimensions.h + 'px'});
     }
     else // auto-size
     {
      var fixedWidth = '', fixedHeight = '';

      if (this.cfg.fixedDimensions && this.cfg.fixedDimensions.w) {
        fixedWidth = (this.cfg.constrainToWindow ? Math.min(this.cfg.fixedDimensions.w, maxWidth) : this.cfg.fixedDimensions.w) + 'px';
      }

      if (this.cfg.fixedDimensions && this.cfg.fixedDimensions.h) {
        fixedHeight = (this.cfg.constrainToWindow ? Math.min(this.cfg.fixedDimensions.h, maxHeight) : this.cfg.fixedDimensions.h) + 'px';
      }

      lbw.setStyle( { width: fixedWidth,  height: fixedHeight } );
      lbc.setStyle( { height: '' } );
      lbDim = lbw.getDimensions();
      lbDim.width = lbDim.width - this._extraWidth( lbw, false);
      lbDim.height = lbDim.height - this._extraHeight( lbw, false, true);
      if ( this.cfg.useDefaultDimensionsAsMinimumSize )
      {
        // resize width and height to the minimum set
        if ( lbDim.width < this.cfg.defaultDimensions.w )
        {
          lbDim.width = this.cfg.defaultDimensions.w;
        }
        if( lbDim.height <  this.cfg.defaultDimensions.h )
        {
           lbDim.height =  this.cfg.defaultDimensions.h;
        }
      }
       lbw.setStyle( { width: ( lbDim.width ) + 'px',  height: ( lbDim.height ) + 'px' } );
     }
     lbDim = lbw.getDimensions();
     if ( this.cfg.constrainToWindow )
     {
       if ( lbDim.width > ( maxWidth ) )
       {
         lbw.setStyle( { width: ( maxWidth ) + 'px' } );
       }
       if ( lbDim.height > ( maxHeight ) )
       {
         lbw.setStyle( { height: ( maxHeight ) + 'px' } );
       }
       lbDim = lbw.getDimensions();
     }
     var l = parseInt( ( viewDim.width / 2.0 ) - (lbDim.width / 2.0 ) , 10 );
     var t = parseInt( ( viewDim.height / 2.0 ) - (lbDim.height / 2.0 ) , 10 );
     if (this.cfg.top){
       t = this.cfg.top;
     }
     if (this.cfg.left){
       l = this.cfg.left;
     }
     lbw.setStyle({ left: l + "px", top: t + "px" });
     var h = ( lbDim.height - this._extraHeight( lbw, false, false ) - this._extraHeight( lbc, true, true ) - lbc.positionedOffset().top );
     if (h >= 0)
     {
       lbc.setStyle({ height: h + "px"});
     }

     if ( lbt )
     {
       lbt.update( title );
     }
   },
   /**
    * Calculate the extra height added by padding and border.
    * @param element DOM elem to calculate the extra height for.
    * @param mBot whether to include the bottom margin
    * @param pTop whether to include the top padding.
    */
   _extraHeight: function( element, mBot, pTop )
   {
     var r = 0, dims = ['paddingBottom','borderTopWidth','borderBottomWidth'].concat(
       mBot ? ['marginBottom'] : [] ).concat(
       pTop ? ['paddingTop'] : [] );
     dims.each( function( d ) { r += parseFloat( element.getStyle( d ) ) || 0; });
     return r;
   },
   /**
    * Calculate the extra width added by padding, border, (optionally margin)
    * @param element DOM elem to calculate the extra width for.
    * @param m whether to include margins
    */
   _extraWidth: function( element, m )
   {
     var r = 0, dims = ['paddingLeft','paddingRight','borderLeftWidth','borderRightWidth'].concat(
       m ? ['marginLeft','marginRight'] : [] );
     dims.each( function( d ) { r += parseFloat( element.getStyle( d ) ) || 0; });
     return r;
   },
   /**
    * Regrettably, some JavaScript hacks are necessary for IE 6
    * @param on whether to turn the hacks on or off
    */
   _fixIE: function( on )
   {
     if ( /MSIE 6/i.test(navigator.userAgent) )
     {
       var body = document.getElementsByTagName('body')[0];
       var html = document.getElementsByTagName('html')[0];
       if ( on )
       {
         this.currentScroll = document.viewport.getScrollOffsets();
         window.scrollTo( 0, 0 );
       }
       Element.setStyle( body, ( on ? { height: '100%', overflow: 'hidden' } : { height: '', overflow: '' } ) );
       Element.setStyle( html, ( on ? { height: '100%', overflow: 'hidden' } : { height: '', overflow: '' } ) );
       this.overlay.setStyle( ( on ? { width: "120%", height: "100%"} : { width: "", height: ""} ));
       if ( !on )
       {
         window.scrollTo( this.currentScroll.left, this.currentScroll.top );
       }
     }
   },

   _toggleTroubleElementsHelper : function( contentElem, turnOff )
   {
     this.cfg.troubleElems.each( function(elemType) {

       var elems;
       if ( contentElem === null )
       {
         elems = document.getElementsByTagName( elemType );
       }
       else
       {
         elems = contentElem.getElementsByTagName( elemType );
       }

       var numElems = elems.length;
       for ( var i = 0; i < numElems; i++ )
       {
         try
         {
           elems[i].style.visibility = (turnOff ? 'hidden' : '');
         }
         catch ( e )
         {
           // Setting visibility blows up on Linux Chrome; just ignore this error, as the only
           // real consequence will be some potential UI artifacts
         }
       }
     }.bind( this ) );
   },

   /**
    * Toggle elements that may bleed through the lightbox overlay.
    * @param turnOff whether to turn off the elements.
    */
   _toggleTroubleElements: function( turnOff )
   {
     this._toggleTroubleElementsHelper( document, turnOff );
   },
   
   /**
    * Mashups could contain malicious data entered by users. 
    * So extract the required information and recreate mashup HTML to display in lightbox.
    * @param oldContent current HTML data for mashup.
    */
   _recreateMashupsHtml: function( oldContent )
   {
     var mashupType = this._checkMashupType( oldContent );
     var isLegacy = this._checkMashupIslegacy( oldContent, mashupType );
     var returnStr = '<div style=\"margin: 10px;\">' + page.bundle.getString( 'mashups.content.data.msg' ) + '</div>';
     
     if( mashupType === "youtube" )
     {
       return this._recreateYoutubeHtml( oldContent, isLegacy );
     }
     else if( mashupType === "slideshare" )
     {
       return this._recreateSlideshareHtml( oldContent, isLegacy );
     }
     else if( mashupType === "flickr" )
     {
       return this._recreateFlickrHtml( oldContent );
     }
     else
     {
       MashupDWRFacade.filterMashupData( oldContent, {
         async : false,
         callback : function( filteredData )
           {
             returnStr =  filteredData;
           }
         } );
     }
     
     return returnStr ;
   },
   
   _checkMashupType: function( oldContent )
   {
     var mashupType = "";
     if( ( oldContent.indexOf("openYtControls") !== -1 ) || ( oldContent.indexOf("//www.youtube.com/") !== -1 ) )
     {
       mashupType = "youtube";
     }
     else if( (oldContent.indexOf("slidesharecdn") !== -1) || (oldContent.indexOf("www.slideshare.net/slideshow") !== -1) )
     {
       mashupType = "slideshare";
     }
     else if( oldContent.indexOf("flickr") !== -1 )
     {
       mashupType = "flickr";
     }
     return mashupType;
   },
   
   _checkMashupIslegacy: function( oldContent, mashupType )
   {
     var isLegacy = false;
     if( (mashupType === "youtube" || mashupType === "slideshare" ) && oldContent.indexOf("<object") != -1 )
     {
       isLegacy = true;
     }
     else if(  (mashupType === "flickr" ) && oldContent.indexOf("<img") != -1 )
     {
       isLegacy = true;
     }
     return isLegacy;
   },

   _recreateYoutubeHtml: function( oldContent, isLegacy )
   {
     var title = "";
     var videoId = "";
     var strYtUrl = "";
     var newHTML = "";
     var uniqueId = "";
      
     //valid youtube video id could contain a-z, A-Z, 0-9, "_" and "-" only.
     oldContent = oldContent.replace(/&#45;/g,'-');
     oldContent = oldContent.replace(/&#95;/g,'_');
     
     if( isLegacy )
     {
       videoId = oldContent.match("//www.youtube.com/v/([\\d\\w-_]+)")[1];
     }
     else
     {
       videoId = oldContent.match("//www.youtube.com/embed/([\\d\\w-_]+)")[1];
     }
     
     if( oldContent.indexOf("openYtControls") !== -1 )
     {
       uniqueId = oldContent.match("openYtControls([\\d\\w]+)")[1];
     }
     //to make sure video plays in popup preview
     strYtUrl = "https://www.youtube.com/embed/" + videoId + "?modestbranding=1&fs=1&rel=0&menu=disable&enablejsapi=1&playerapiid=ytEmbed" + uniqueId + "&wmode=transparent";

     title = $ESAPI.encoder().canonicalize( title );
     title = $ESAPI.encoder().encodeForHTMLAttribute( title );
     //regenerate HTML to display in lightbox.
     //yt video with player controls.
     if( uniqueId !== "" && strYtUrl !== "" )
     {
   
       
       newHTML = '<div style=\"margin: 10px;\"><div class=\"u_controlsWrapper\"></div>' +
       '<h2 class=\"hideoff\">' + page.bundle.getString( 'display.embeddedVideoPlayer' ) +': ' + title + '</h2>' +
       '<div style=\"word-wrap: break-word;\">';
      
       //create iframe tag
       newHTML += '<div class=\"previewDiv ytIframeClass\" style=\"height:344px;width:425px\"' + 
       ' id=\"ytEmbed' + uniqueId + '\">' + 
       '<iframe id=\"ytObject' + uniqueId + '\"' + ' width=\"425\" height=\"344\" src=\"' + strYtUrl + '\"' + 
       ' title=\"' + title + '\"' +  ' allowfullscreen></iframe>';

       newHTML += '<a href=\"#close\" onclick=\"lightbox.closeCurrentLightbox(); return false;\" class=\"hideoff\">' +
       page.bundle.getString( 'inlineconfirmation.close' ) + '</a></div>' + 
       '<div id=\"strip' +  uniqueId + '\" class=\"liveArea-slim playerControls\" style=\"display:none\">' +
       '<h2 class=\"hideoff\">' + page.bundle.getString( 'display.videoStatus' ) +': ' + title + '</h2>' +
       '<span aria-live=\"off\" id=\"currentStatus' +  uniqueId + '\"></span>' +
       '</div></div></div>';
     }
     //yt video without player controls.
     if( uniqueId === "" && strYtUrl !== "" )
     {
       newHTML = '<div class=\"previewDiv\" style=\"height:344px;width:425px\"' + 
       ' id=\"ytEmbed' + '\">' + 
       '<iframe id=\"ytObject' + '\"' + ' width=\"425\" height=\"344\" src=\"' + strYtUrl + '\"' + 
       ' title=\"' + title + '\"' +  '></iframe></div>';  
     }

     return newHTML;
   },
   convertTime : function (duration) {
	   var total = 0;
	   var hours = duration.match(/(\d+)H/);
	   var minutes = duration.match(/(\d+)M/);
	   var seconds = duration.match(/(\d+)S/);
	   if (hours) total += parseInt(hours[1]) * 3600;
	   if (minutes) total += parseInt(minutes[1]) * 60;
	   if (seconds) total += parseInt(seconds[1]);
	   return total;
	 },
   formatTime : function ( sec )
   {
     var duration = parseInt( sec, 10 );
     var totalMinutes = Math.floor( duration / 60 );
     var hours = Math.floor( totalMinutes / 60 );
     var seconds = duration % 60;
     var minutes = totalMinutes % 60;
     if ( hours > 0 )
     {
       return hours + ':' + this.padZero( minutes ) + ':' + this.padZero( seconds );
     }
     else
     {
       return this.padZero( minutes ) + ':' + this.padZero( seconds );
     }
   },
   padZero : function ( number )
   {
     if (number < 10)
     {
       return "0" + number;
     }
     else
     {
       return number;
     }
   },
   
   _recreateSlideshareHtml: function( oldContent, isLegacy )
   {
     var title = "";
     var slideShowId = "";
     var ssSearchKey = "";
     var authorName = "";
     var newHTML = "";
     if( isLegacy ) 
     {
       oldContent = oldContent.replace(/&#45;/g,'-');
       ssSearchKey = oldContent.match("id=[\"]__sse(\\d+)")[1];
     }
     else
     {
       // New Slideshare oEmbed documentation at http://www.slideshare.net/developers/oembed; oEmbed specs at http://www.oembed.com
       ssSearchKey = oldContent.match("<a[^>]*>((?:.|\r?\n)*?)<\/a>")[0];
       ssSearchKey = ssSearchKey.replace(/&#45;/g,'-');
       ssSearchKey = ssSearchKey.match( "href=\"(http|https):\/\/www.slideshare.net\/([A-Za-z0-9]|[-_~.*!()/&#;#%'?=@+$,])*\"" )[0];
       ssSearchKey = ssSearchKey.substring( 6, ssSearchKey.length - 1 );
     }
     
     //make a call to slide share server and get real data.
     var url =  "https://www.slideshare.net/api/oembed/2?url=https://www.slideshare.net/" + ssSearchKey + "&format=json";
     
     MashupDWRFacade.verifyMashupData( url, {
       async : false,
       callback : function( returnString )
         {
           if( returnString === "" )
           {
             newHTML = '<div style=\"margin: 10px;\">' + page.bundle.getString( 'mashups.content.data.msg' ) + '</div>' ;
           }
           else
           {
             var videoJSON = returnString.evalJSON( true );
             title = videoJSON.title;
             slideShowId = videoJSON.slideshow_id;
             authorName = videoJSON.author_name;
           }
         }
       } );
     title = $ESAPI.encoder().canonicalize( title );
     title = $ESAPI.encoder().encodeForHTMLAttribute( title );
     slideShowId = $ESAPI.encoder().canonicalize( slideShowId + "" );
     slideShowId = $ESAPI.encoder().encodeForHTMLAttribute( slideShowId + "" );
     authorName = $ESAPI.encoder().canonicalize( authorName );
     authorName = $ESAPI.encoder().encodeForHTMLAttribute( authorName );
     if( slideShowId !== '' )
     {
       //create iframe tag
       return '<iframe src=\"https://www.slideshare.net/slideshow/embed_code/' + slideShowId + '\" ' +
       ' width=\"427\" height=\"356\" frameborder=\"0\" marginwidth=\"0\" marginheight=\"0\"  scrolling=\"no\" ' +
       ' style=\"border:1px solid #CCC;border-width:1px 1px 0;margin-bottom:5px\"  allowfullscreen></iframe>' +
       '<div style="margin-bottom:5px"><strong><a href=\"#\" title=\"' +
       title + '\">' + title + '</a></strong> <strong><a href=\"#\">' +
       authorName + '</a></strong>.</div>';
     }
     
     return newHTML ;
   },
   
   _recreateFlickrHtml: function( oldContent )
   {
     var flickrImgSrcUrl = "";
     var title = "";
     var flickrKey = "";
     var newHTML = "";

     flickrKey = oldContent.match("//www.flickr.com/photos/([\\d\\w@/]+)")[1];
     var flickrUrl = "https://www.flickr.com/services/oembed?url=http://flickr.com/photos/" + flickrKey + 
                     "&format=json&maxheight=640&maxwidth=640";
     
     MashupDWRFacade.verifyMashupData( flickrUrl, {
       async : false,
       callback : function( returnString )
         {
           if( returnString === "" )
           {
             newHTML = '<div style=\"margin: 10px;\">' + page.bundle.getString( 'mashups.content.data.msg' ) + '</div>' ;
           }
           else
           {
             var videoJSON = returnString.evalJSON( true );
             title = videoJSON.title;
             //sometimes http://flickr.com/services/oembed doesn't return url
             if ( videoJSON.url === null )
             {
               flickrImgSrcUrl = videoJSON.thumbnail_url;
             }
             else
             {
               flickrImgSrcUrl = videoJSON.url;
             }
           }
         }
       } );

     title = $ESAPI.encoder().canonicalize( title );
     title = $ESAPI.encoder().encodeForHTMLAttribute( title );
     if( flickrImgSrcUrl !== '' )
     {
       return '<div style=\"margin: 10px;\"><a href=\"http://flickr.com/photos/' + flickrKey + '\"' +
       '  target=\"_blank\" title=\"' + page.bundle.getString( 'display.view.on.flickr' ) + '\" />' +
       '<img src="' + flickrImgSrcUrl + '\"  alt=\"' + title + '\"></a></div>';
     }
     return newHTML ;
   }
  }),

  /* Static properties/methods */
  _imageTypeRE: /(\.bmp|\.gif|\.jpeg|\.jpg|\.png|\.tiff)$/i, /** Regex for sniffing image files */
  _currentLightbox: null, /** Currently open lightbox */
  /** Returns the currently open lightbox (null if no lightbox is open) */
  getCurrentLightbox: function()
  {
    return lightbox._currentLightbox;
  },
  // This is currently only called from page.js when the vtbe is toggled.  It is used
  // to reload the page and respect the new vtbe settings.
  // NOTE that there is a limitation of not allowing VTBEs both in-page and in-lightbox. If
  // we ever run into a situation where we have a vtbe on-page and then open a lightbox with
  // a VTBE in the lightbox then we'll have to enhance the vtbe infrastructure to deal with this properly.
  deferUpdateLightboxContent: function ( )
  {
    if (lightbox._currentLightbox && window.vtbeInLightbox)
    {
      vtbe_map = {}; // Turf all vtbe's
      (function() {
        lightbox._currentLightbox._updateLightboxContent();
      }).bind(this).delay(0.1);
      return true;
    }
    return false;
  },
  /**
   * Close the currently open lightbox (if any)
   */
  closeCurrentLightbox: function()
  {
    var lb = lightbox._currentLightbox;
    if ( lb )
    {
      lb.close();
    }
  },
  /**
   * Hide the currently open lightbox (if any)
   */
  hideCurrentLightbox: function()
  {
    var lb = lightbox._currentLightbox;
    if ( lb )
    {
      lb.hide();
    }
  },
  /**
   * Update the current lightbox content.
   * @param type either "ajax" or "static"
   * @param value
   *   if type is ajax, the same format as the lb ajax config parameter.
   *   if type is static, the same format as the lb contents config parameter.
   */
  updateCurrentLightboxContent: function( type, value )
  {
    var lb = lightbox._currentLightbox;
    if ( lb )
    {
      var oldAjax = lb.cfg.ajax, oldContents = lb.cfg.contents;
      lb.cfg.ajax = ( type == 'ajax' ) ? value : false;
      lb.cfg.contents = ( type == 'ajax' ) ? null : value;
      lb._updateLightboxContent( function() {
        lb.cfg.ajax = oldAjax;
        lb.cfg.contents = oldContents;
      });
    }
  },
  /**
   * Parse a JSON representation of the config into an object suitable for
   * passing to the lb constructor.
   * @param serializedConfig JSON config string.
   */
  parseConfig: function( serializedConfig ) //Safely parses a JSON representation of the config
  {
    return serializedConfig ? serializedConfig.replace(/'/g, '"').evalJSON( true ) : {};
  },
  /**
   * Autowire all links.with the given class on the page to open in lb.  Call this after the page has loaded.
   * The "lb:options" attribute can be added to the link to specify a JSON-formatted config string
   * that will be parsed and passed to the lb constructor.
   * @param className class of link that will be autowired.
   */
  autowireLightboxes: function( className, parentEl )
  {
    if (!parentEl)
    {
      parentEl = document;
    }
    var links = parentEl.getElementsByTagName('a');
    for ( var i = 0, len = links.length; i < len; i++ )
    {
      var a = links[i];
      if ( page.util.hasClassName( a, className ) )
      {
        a = $(a);
        var defOptions = ( lightbox._imageTypeRE.test( a.href ) ? "{'contents':{'auto':true}}" : "{'ajax':true}" );
        new lightbox.Lightbox( Object.extend( { openLink: a }, lightbox.parseConfig( a.getAttribute('lb:options') || defOptions ) ) );
      }
    }
  }
};
}
/** The collection of classes and methods that comprise the QuickLinks core implementation. */
var quickLinks =
{
    constants :
    {
        /** Constant identifier for identifying frame communications specific to this function */
        APP_CONTEXT : 'QuickLinks',

        /** Hotkey for the Quick Links UI */
        APP_HOTKEY :
        {
            accesskey : 'l',
            modifiers :
            {
                shift : true,
                alt : true
            }
        },

        // Constants for various window actions
        SET : 'set',
        ADD : 'add',
        REMOVE : 'remove',
        SHOW : 'show',
        ACTIVATE : 'activate',
        REMOVE_ALL : 'removeAll',
        DEFINE_KEY : 'defineKey',

        /** The order in which we process windows */
        WINDOW_ORDER_FOR_HEADERS :
        {
            mybbCanvas : 1,
            WFS_Files : 2,
            content : 3,
            WFS_Navigation : 4,
            nav : 5,
            'default' : 100
        },

        /** ARIA roles that we consider 'landmarks' */
        ARIA_LANDMARK_ROLES :
        {
            application : true,
            banner : true,
            complementary : true,
            contentinfo : true,
            form : true,
            main : true,
            navigation : true,
            search : true
        }
    },

    vars :
    {
        /** reference to lightbox object */
        lightbox : null,

        /** cached quick link data */
        data : $H(),

        /** Messages must originate from one of these sources */
        trustedProviders : $H(),

        // Cached references to HTML elements
        lightboxLandmarkList : null,
        lightboxLandmarkSection : null,
        lightboxHeaderList : null,
        lightboxHeaderSection : null,
        lightboxHotkeyList : null,
        lightboxHotkeySection : null,

        /** The instance of helper for the window containing this script */
        helper : null
    },

    /** Initialization of the UI/core implementation */
    initialize : function( trustedProviders )
    {
      if ( !this.util.isCoursePage() && ( page.util.parentWindowIsUltraApp() || page.util.insideUltra() ) )
      {
        var quickLinksWrap = $( 'quick_links_wrap' );
        quickLinksWrap.hide();
      }

      // Initialize a lightbox to show collected links
      quickLinks.vars.lightbox = new lightbox.Lightbox(
      {
          title : page.bundle.getString( 'quick_links.lightbox_title' ),
          contents :
          {
            id : 'quickLinksLightboxDiv'
          },
          'dimensions' :
          {
              w : 800,
              h : 600
          }
      } );

      // Add trusted content providers from whom we accept messages
      if ( trustedProviders )
      {
        trustedProviders.each( function( tp )
        {
          if ( tp )
          {
            quickLinks.vars.trustedProviders.set( tp, true );
          }
        } );
      }
      quickLinks.vars.trustedProviders.set( quickLinks.util.getCurrentOrigin(), true );

      // Add listener for frame communications
      Event.observe( window.top, 'message', quickLinks.messageHelper.onMessageReceived );

      // When link is active, modify the wrapping div
      var wrapperDiv = $( 'quick_links_wrap' );
      Event.observe( $( 'quick_links_lightbox_link' ), 'focus', function( event )
      {
        this.addClassName( 'quick_link_wrap_focus' );
      }.bind( wrapperDiv ) );
      Event.observe( $( 'quick_links_lightbox_link' ), 'blur', function( event )
      {
        this.removeClassName( 'quick_link_wrap_focus' );
      }.bind( wrapperDiv ) );

      // Cache references to some elements
      quickLinks.vars.lightboxLandmarkList = $( 'quick_links_landmark_list' );
      quickLinks.vars.lightboxHeaderList = $( 'quick_links_heading_list' );
      quickLinks.vars.lightboxHotkeyList = $( 'quick_links_hotkey_list' );
      quickLinks.vars.lightboxLandmarkSection = $( 'quick_links_landmarks_section' );
      quickLinks.vars.lightboxHeaderSection = $( 'quick_links_headings_section' );
      quickLinks.vars.lightboxHotkeySection = $( 'quick_links_hotkeys_section' );

      // This code listens for Alt + Shift + L and calls mainToggleLightbox if conditions are met.
      // It forces certain keyboard shortcuts to work in different browsers
      document.addEventListener( "keydown", ( event ) =>
      {
        if ( event.altKey && event.shiftKey && event.keyCode === 76 )
        {
          if ( page.util.parentWindowIsUltraApp() || page.util.insideUltra() )
          {
            this.lightboxHelper.toggleLightbox();
          }
          else
          {
            quickLinks.lightbox?.toggleLightbox();
          }
          event.preventDefault();
        }
      } );

      const quickLinksAnchor = document.getElementById( 'quick_links_lightbox_link' );
      quickLinksAnchor.addEventListener( 'keydown', function ( event )
      {
        if ( event.key === 'Enter' || event.key === ' ' )
        {
          quickLinks.lightbox?.toggleLightbox();
          event.preventDefault();
        }
      } );
    },

    /** Factory method that creates a Helper for frames that require it */
    createHelper : function()
    {
      // If this is not a popup and this is not a top-level window without the quick links UI link
      // (for instance if someone opened one of the frames in a separate tab)
      if ( !window.opener && ( quickLinks.util.loadedInIframe() || $( 'quick_links_lightbox_link' ) ) )
      {
        if ( !quickLinks.vars.helper )
        {
          quickLinks.vars.helper = new quickLinks.Helper();
        }
      }
    },

    /**
     * Add a hot key definition. Not attached if in iframe.
     * 
     * @param hotkey is an object with keys label, accesskey, and modifiers. modifiers is an object with one or more of
     *          the keys -- control, shift, and alt -- set to a value expression that evaluates to true.
     * @param sourceId may be null and will default to the string used for all other quicklinks from the current window.
     */
    addHotKey : function( sourceId, hotkey )
    {
      if ( hotkey && !quickLinks.util.loadedInIframe() )
      {
        quickLinks.messageHelper.postMessage( window.top,
        {
            sourceId : sourceId || quickLinks.util.getCurrentWindowId(),
            context : quickLinks.constants.APP_CONTEXT,
            action : quickLinks.constants.ADD,
            hotkeys : [ hotkey ]
        }, quickLinks.util.getCurrentOrigin() );
      }
    },

    /**
     * Add hot key definition. See #addHotKey.
     * 
     * @param hotkeys hotkeys is an array of hotkey definitions as described in #addHotKey.
     */
    addHotKeys : function( sourceId, hotkeys )
    {
      if ( hotkeys && !quickLinks.util.loadedInIframe() )
      {
        quickLinks.messageHelper.postMessage( window.top,
        {
            sourceId : sourceId || quickLinks.util.getCurrentWindowId(),
            context : quickLinks.constants.APP_CONTEXT,
            action : quickLinks.constants.ADD,
            hotkeys : hotkeys
        }, quickLinks.util.getCurrentOrigin() );
      }
    },

    /**
     * Removes all content for the specified source. If sourceId evaluates to false, all content for the window that
     * calls this method will be removed.
     */
    removeAll : function( sourceId )
    {
      quickLinks.messageHelper.postMessage( window.top,
      {
          sourceId : sourceId,
          context : quickLinks.constants.APP_CONTEXT,
          action : quickLinks.constants.REMOVE_ALL
      }, quickLinks.util.getCurrentOrigin() );
    },

    /** A set of functions that deal with inter-window communication */
    messageHelper :
    {
        /** The handler for messages sent to window.top from other windows (or self) */
        onMessageReceived : function( event )
        {
          var data = quickLinks.messageHelper.translateData( event.data );
          if ( data && data.context === quickLinks.constants.APP_CONTEXT &&
               quickLinks.vars.trustedProviders.get( event.origin ) )
          {
            if ( data.action === quickLinks.constants.SET )
            {
              quickLinks.dataHelper.setQuickLinks( event.source, event.origin, data );
              quickLinks.messageHelper.postHotkey( event.source );
            }
            else if ( data.action === quickLinks.constants.SHOW )
            {
              quickLinks.lightboxHelper.toggleLightbox( data.sourceId, data.activeElementId, event.origin );
            }
            else if ( data.action === quickLinks.constants.REMOVE_ALL )
            {
              if ( data.sourceId )
              {
                quickLinks.vars.data.unset( data.sourceId );
              }
              else
              {
                // Remove all content from calling window
                quickLinks.vars.data.values().each( function( value )
                {
                  if ( value.window === event.source )
                  {
                    quickLinks.vars.data.unset( value.sourceId );
                  }
                } );
              }
            }
            else if ( data.action === quickLinks.constants.ADD )
            {
              quickLinks.dataHelper.addQuickLinks( event.source, event.origin, data );
            }
            else if ( data.action === quickLinks.constants.REMOVE )
            {
              quickLinks.dataHelper.removeQuickLinks( data );
            }
          }
        },

        /** Posts the supplied message to the target window */
        postMessage : function( w, data, target )
        {
          if ( w.postMessage )
          {
            if ( Prototype.Browser.IE && data && typeof ( data ) !== 'string' )
            {
              data = Object.toJSON( data );
            }
            w.postMessage( data, target );
          }
        },

        /** Handle IE's behavior of passing objects as strings */
        translateData : function( data )
        {
          if ( Prototype.Browser.IE && typeof ( data ) === 'string' && data.isJSON() )
          {
            data = data.evalJSON();
          }
          return data;
        },

        /** Sends a message the supplied window instance about the hot-key defined for the QuickLinks UI */
        postHotkey : function( w )
        {
          quickLinks.messageHelper.postMessage( w,
          {
              sourceId : quickLinks.util.getCurrentWindowId(),
              context : quickLinks.constants.APP_CONTEXT,
              action : quickLinks.constants.DEFINE_KEY,
              key : quickLinks.constants.APP_HOTKEY
          }, '*' );
        },

        /** Posts a message requesting the activation of the specified element */
        activateElement : function( sourceId, targetElementId, origin, isQuickLink )
        {
          // Reset focus
          quickLinks.vars.lightbox.cfg.onClose = null;
          quickLinks.vars.lightbox.cfg.focusOnClose = null;

          // Close lightbox
          quickLinks.lightboxHelper.closeLightbox();

          var windowEntry = quickLinks.vars.data.get( sourceId );

          // Focus on the target window
          windowEntry.window.focus();

          // Send a message to that window
          if ( windowEntry )
          {
            quickLinks.messageHelper.postMessage( windowEntry.window,
            {
                sourceId : quickLinks.util.getCurrentWindowId(),
                context : quickLinks.constants.APP_CONTEXT,
                action : quickLinks.constants.ACTIVATE,
                id : targetElementId,
                isQuickLink : isQuickLink
            }, origin );
          }
        }
    },

    /** A set of functions that deal with the management of the quick links data */
    dataHelper :
    {
        /** Create a hash for the hotkey definition */
        getHotKeyHash : function( key )
        {
          var result = key.accesskey;
          if ( key.modifiers )
          {
            result += key.modifiers.alt ? '-A' : '';
            result += key.modifiers.control ? '-C' : '';
            result += key.modifiers.shift ? '-S' : '';
          }
          return result;
        },

        /** Remove supplied quick links */
        removeQuickLinks : function( data )
        {
          var value = quickLinks.vars.data.get( data.sourceId );
          if ( value )
          {
            quickLinks.dataHelper.removeSelectionsById( value.headers, data.headers );
            quickLinks.dataHelper.removeSelectionsById( value.landmarks, data.landmarks );

            var selection =
            {};
            if ( data.hotkeys && value.hotkeys )
            {
              data.hotkeys.each( function( hotkey )
              {
                selection[ hotkey.id || quickLinks.dataHelper.getHotKeyHash( hotkey ) ] = true;
              } );
            }
            quickLinks.dataHelper.removeSelectionsById( value.hotkeys, selection );
          }
        },

        /** Remove those values from 'master' whose 'id' values exist in the 'selections' object */
        removeSelectionsById : function( master, selections )
        {
          if ( master && selections )
          {
            master = master.filter( function( i )
            {
              return i.id && !selections[ i.id ];
            } );
          }
          return master;
        },

        /** Overwrite any existing quick links */
        setQuickLinks : function( sourceWindow, origin, data )
        {
          quickLinks.vars.data.set( data.sourceId,
          {
              'window' : sourceWindow,
              sourceId : data.sourceId,
              origin : origin,
              headers : data.headers && [].concat(data.headers) || [],
              landmarks : data.landmarks && [].concat(data.landmarks) || [],
              hotkeys : quickLinks.dataHelper.normalizeHotKeys( data.hotkeys && [].concat(data.hotkeys) || [] )
          } );
        },

        /** Normalize the hotkey definition by adding the hash as an id if an id was not provided */
        normalizeHotKeys : function( hotkeys )
        {
          if ( hotkeys )
          {
            hotkeys.each( function( hotkey )
            {
              if ( !hotkey.id )
              {
                hotkey.id = quickLinks.dataHelper.getHotKeyHash( hotkey.key );
              }
            } );
          }
          return hotkeys;
        },

        /** Add quick links */
        addQuickLinks : function( sourceWindow, sourceOrigin, data )
        {
          var value = quickLinks.vars.data.get( data.sourceId );
          if ( !value )
          {
            value =
            {
                'window' : sourceWindow,
                sourceId : data.sourceId,
                origin : sourceOrigin,
                headers : [],
                landmarks : [],
                hotkeys : []
            };
            quickLinks.vars.data.set( data.sourceId, value );
          }
          if ( data.headers )
          {
            value.headers = value.headers.concat( data.headers );
          }
          if ( data.landmarks )
          {
            value.landmarks = value.landmarks.concat( data.landmarks );
          }
          if ( data.hotkeys )
          {
            value.hotkeys = value.hotkeys.concat( quickLinks.dataHelper.normalizeHotKeys( data.hotkeys ) );
          }
        }
    },

    /** A set of functions that deal with the management of the lightbox UI */
    'lightboxHelper' :
    {
        /** Toggles the QuickLinks lightbox state */
        toggleLightbox : function( targetWindowId, activeElementId, origin )
        {
          if ( lightbox.getCurrentLightbox() === quickLinks.vars.lightbox )
          {
            quickLinks.lightboxHelper.closeLightbox();
          }
          else
          {
            quickLinks.lightboxHelper.openLightbox( targetWindowId, activeElementId, origin );
          }
        },

        /** Opens the QuickLinks lightbox */
        openLightbox : function( targetWindowId, activeElementId, origin )
        {
          quickLinks.lightboxHelper.closeAllLightboxes();

          if ( targetWindowId && activeElementId && origin )
          {
            quickLinks.vars.lightbox.cfg.focusOnClose = null;
            quickLinks.vars.lightbox.cfg.onClose = function()
            {
              quickLinks.messageHelper.activateElement( targetWindowId, activeElementId, origin, false );
            }.bind( window.top );
          }
          else
          {
            quickLinks.vars.lightbox.cfg.onClose = null;
            quickLinks.vars.lightbox.cfg.focusOnClose = document.activeElement;
          }

          quickLinks.lightboxHelper.populateLightbox();
          quickLinks.vars.lightbox.open();
        },

        /** Closes the QuickLinks lightbox */
        closeLightbox : function()
        {
          quickLinks.lightboxHelper.clearLightboxContents();
          quickLinks.vars.lightbox.close();
        },

        /**
         * Close all open lightboxes. This will work only for lightboxes created using the core lightbox.js library and
         * opened from a frame that shares the same origin as window.top
         */
        closeAllLightboxes : function( w )
        {
          if ( !w )
          {
            w = window.top;
          }
          try
          {
            // Security errors appear in console even if we catch all exceptions, so try to avoid them
            if ( ( quickLinks.util.getCurrentOrigin() === quickLinks.util.getWindowOrigin( w ) ) && w.lightbox &&
                 w.lightbox.closeCurrentLightbox )
            {
              w.lightbox.closeCurrentLightbox();
            }
          }
          catch ( e )
          {
            // Ignore all exceptions -- probably caused by window of different origin
          }
          for ( var i = 0, iMax = w.frames.length; i < iMax; ++i )
          {
            quickLinks.lightboxHelper.closeAllLightboxes( w.frames[ i ] );
          }
        },

        /** Empties all content from the QuickLinks lightbox */
        clearLightboxContents : function()
        {
          quickLinks.vars.lightboxHeaderList.innerHTML = '';
          quickLinks.vars.lightboxLandmarkList.innerHTML = '';
          quickLinks.vars.lightboxHotkeyList.innerHTML = '';
        },

        /** Add known Quick Links to the lightbox UI after checking that they are still available on the page */
        populateLightbox : function()
        {
          if ( quickLinks.vars.data )
          {
            // Clear existing content
            quickLinks.lightboxHelper.clearLightboxContents();

            var keys = quickLinks.vars.data.keys();
            keys.sort( function( a, b )
            {
              var aWeight = quickLinks.constants.WINDOW_ORDER_FOR_HEADERS[ a ] ||
                            quickLinks.constants.WINDOW_ORDER_FOR_HEADERS[ 'default' ];
              var bWeight = quickLinks.constants.WINDOW_ORDER_FOR_HEADERS[ b ] ||
                            quickLinks.constants.WINDOW_ORDER_FOR_HEADERS[ 'default' ];
              return aWeight - bWeight;
            } );

            keys.each( function( key )
            {
              var value = quickLinks.vars.data.get( key );
              if ( value.window.closed )
              {
                delete quickLinks.vars.data[ key ];
                return;
              }

              if ( value.landmarks )
              {
                value.landmarks.each( quickLinks.lightboxHelper.populateLandmark.bind( value ) );
              }
              if ( value.headers )
              {
                value.headers.each( quickLinks.lightboxHelper.populateHeader.bind( value ) );
              }
              if ( value.hotkeys )
              {
                value.hotkeys.each( quickLinks.lightboxHelper.populateHotkey.bind( value ) );
              }
            } );

            // Display only sections that have content
            quickLinks.lightboxHelper.checkSection( quickLinks.vars.lightboxHeaderList,
                                                    quickLinks.vars.lightboxHeaderSection );
            quickLinks.lightboxHelper.checkSection( quickLinks.vars.lightboxLandmarkList,
                                                    quickLinks.vars.lightboxLandmarkSection );
            quickLinks.lightboxHelper.checkSection( quickLinks.vars.lightboxHotkeyList,
                                                    quickLinks.vars.lightboxHotkeySection );
          }
        },

        /** Figure out if the element has content and display the corresponding section */
        checkSection : function( el, section )
        {
          if ( el.empty() )
          {
            section.hide();
          }
          else
          {
            section.show();
          }
        },

        /** Adds a single landmark to the lightbox UI */
        populateLandmark : function( landmark )
        {
          var li = document.createElement( 'li' );
          quickLinks.vars.lightboxLandmarkList.appendChild( li );

          var a = $( document.createElement( 'a' ) );
          li.appendChild( a );
          a.innerHTML = landmark.label;
          a.setAttribute( 'href', '#' );
          a.setAttribute( 'onclick', 'quickLinks.messageHelper.activateElement("' + this.sourceId + '", "' +
                                     landmark.id + '", "' + this.origin + '", true)' );
          var title = page.bundle.getString( 'quick_links.link.title', this.sourceId, landmark.label, landmark.type );
          a.setAttribute( 'title', title );
        },

        /** Adds a single header to the lightbox UI */
        populateHeader : function( heading )
        {
          var li = document.createElement( 'li' );
          quickLinks.vars.lightboxHeaderList.appendChild( li );
          li.setAttribute( 'class', 'quick_links_header_' + heading.type.toLowerCase() );

          var a = $( document.createElement( 'a' ) );
          li.appendChild( a );
          a.innerHTML = heading.label;
          a.setAttribute( 'href', '#' );
          a.setAttribute( 'onclick', 'quickLinks.messageHelper.activateElement("' + this.sourceId + '", "' +
                                     heading.id + '", "' + this.origin + '", true)' );
          var title = page.bundle.getString( 'quick_links.link.title', this.sourceId, heading.label, heading.type );
          a.setAttribute( 'title', title );
        },

        /** Adds a single hot-key definitions to the lightbox UI */
        populateHotkey : function( hotkey )
        {
          var span;
          var plus = ' ' + page.bundle.getString( 'quick_links.hotkey.combination_divider' ) + ' ';

          var li = document.createElement( 'li' );
          quickLinks.vars.lightboxHotkeyList.appendChild( li );

          var div = $( document.createElement( 'div' ) );
          li.appendChild( div );
          div.setAttribute( 'class', 'keycombo' );

          if ( hotkey.key.modifiers )
          {
            if ( hotkey.key.modifiers.shift )
            {
              span = $( document.createElement( 'span' ) );
              div.appendChild( span );
              span.setAttribute( 'class', 'presskey' );
              span.innerHTML = page.bundle.getString( 'quick_links.hotkey.shift' );

              div.appendChild( document.createTextNode( plus ) );
            }

            if ( hotkey.key.modifiers.control )
            {
              span = $( document.createElement( 'span' ) );
              div.appendChild( span );
              span.setAttribute( 'class', 'presskey' );
              span.innerHTML = page.bundle.getString( 'quick_links.hotkey.control' );

              div.appendChild( document.createTextNode( plus ) );
            }

            if ( hotkey.key.modifiers.alt )
            {
              span = $( document.createElement( 'span' ) );
              div.appendChild( span );
              span.setAttribute( 'class', 'presskey' );
              span.innerHTML = page.bundle.getString( 'quick_links.hotkey.alt' );

              div.appendChild( document.createTextNode( plus ) );
            }
          }

          span = $( document.createElement( 'span' ) );
          div.appendChild( span );
          span.setAttribute( 'class', 'presskey alpha' );
          span.innerHTML = hotkey.key.accesskey;

          div.appendChild( document.createElement( 'br' ) );
          div.appendChild( document.createTextNode( hotkey.label ) );
        }
    },

    /** General helper functions that don't belong elsewhere */
    'util' :
    {
        /** Whether the current frame/page has a Course menu */
        isCoursePage : function()
        {
          return $( 'courseMenuPalette_paletteTitleHeading' ) ? true : false;
        },

        /** Whether the current frame/page is on the Content Collection tab */
        isContentSystemPage : function()
        {
          return quickLinks.util.getCurrentWindowId() === 'WFS_Files';
        },

        /** Returns the origin string for the current window as understood by the window.postMessage API */
        getCurrentOrigin : function()
        {
          return quickLinks.util.getWindowOrigin( window );
        },

        /** Returns the origin string for the supplied window as understood by the window.postMessage API */
        getWindowOrigin : function( w )
        {
          var url = w.location.href;
          return url.substring( 0, url.substring( 8 ).indexOf( '/' ) + 8 );
        },

        /** A name identifying the current window. Not guaranteed to be unique. */
        getCurrentWindowId : function()
        {
          if ( !window.name )
          {
            window.name = Math.floor( ( Math.random() * 10e6 ) + 1 );
          }
          return window.name;
        },

        /** @return "mac" if the client is running on a Mac and "win" otherwise */
        isMacClient : function()
        {
          return navigator.platform.toLowerCase().startsWith( "mac" );
        },

        /** The modifiers for access keys for the current platform/browser */
        getDefaultModifiers : function()
        {
          return ( quickLinks.util.isMacClient() ) ?
          {
              control : true,
              alt : true
          } :
          {
              shift : true,
              alt : true
          };
        },

        /** Whether this aria role is a 'landmark' */
        isAriaLandmark : function( el )
        {
          var role = el.getAttribute( 'role' );
          return role && quickLinks.constants.ARIA_LANDMARK_ROLES[ role.toLowerCase() ];
        },

        /** True if quick links is loaded in an iframe */
        loadedInIframe: function()
        {
          return window.self !== window.top;
        }
    },

    /**
     * Class used by all internally-sourced windows (anything that has a page tag that inherits from BasePageTag) to
     * communicate with quickLinks core
     */
    Helper : Class.create(
    {
        /** Constructor */
        initialize : function( config )
        {
          // Default values for configuration parameters.
          this.config = Object.extend(
          {
            trustedServer : quickLinks.util.getCurrentOrigin()
          }, config );

          Event.observe( window, 'message', this.onMessageReceived.bindAsEventListener( this ) );
          Event.observe( window, 'beforeunload', this.removeQuickLinks.bindAsEventListener( this ) );
          Event.observe( window, 'unload', this.stopParentObserving.bindAsEventListener( this ) );

          // Allow some time for other initialization to occur
          setTimeout( this.sendQuickLinks.bind( this ), 500 );
        },

        /** When window is unloaded */
        removeQuickLinks : function( event )
        {
          quickLinks.removeAll();
        },

        /**
        * Remove event listener on parent window. Used for when quick links is
        * in an iframe so the parent window won't be observing after iframe is
        * closed
        */
        stopParentObserving: function()
        {
          Event.stopObserving( window.top, 'message', quickLinks.messageHelper.onMessageReceived );
        },

        /** The handler for messages received from other window instances */
        onMessageReceived : function( event )
        {
          var data = quickLinks.messageHelper.translateData( event.data );
          if ( data && data.context === quickLinks.constants.APP_CONTEXT && event.origin === this.config.trustedServer )
          {
            if ( data.action === quickLinks.constants.ACTIVATE && data.id )
            {
              this.activateElement( $( data.id ), data.isQuickLink );
            }
            else if ( data.action === quickLinks.constants.DEFINE_KEY && data.key )
            {
              this.defineQuickLinksHotKey( event, data );
            }
          }
        },

        /** Defines the hotkey for the QuickLink UI */
        defineQuickLinksHotKey : function( event, data )
        {
          if ( this.keyDownHandler )
          {
            Event.stopObserving( document, 'keydown', this.keyDownHandler );
            this.keyDownHandler = null;
          }

          var source = event.source;
          var origin = event.origin;
          var key = data.key;

          this.keyDownHandler = function( ev )
          {
            var keyCode = ev.keyCode || ev.which;
            if ( ( String.fromCharCode( keyCode ).toLowerCase() === key.accesskey ) &&
                 ( !key.modifiers.shift || ev.shiftKey ) && ( !key.modifiers.alt || ev.altKey ) &&
                 ( !key.modifiers.control || ev.ctrlKey ) )
            {
              quickLinks.messageHelper.postMessage( source,
              {
                  sourceId : quickLinks.util.getCurrentWindowId(),
                  context : quickLinks.constants.APP_CONTEXT,
                  action : quickLinks.constants.SHOW,
                  activeElementId : document.activeElement ? $( document.activeElement ).identify() : null
              }, origin );
              ev.stop();
              return false;
            }
          }.bindAsEventListener( this );
          Event.observe( document, 'keydown', this.keyDownHandler );
        },

        /** Activates the specified element (focus or click as applicable) */
        activateElement : function( el, isQuickLink )
        {
          if ( el )
          {
            // Allow the element to accept focus temporarily
            var tabidx = el.getAttribute( 'tabindex' );
            if ( isQuickLink && !tabidx && tabidx !== 0 )
            {
              el.setAttribute( 'tabIndex', 0 );
            }

            // Focus on the element
            el.focus();

            // Remove the tabindex so that we don't stop at this element later
            if ( isQuickLink && !tabidx && ( tabidx !== 0 ) )
            {
              el.setAttribute( 'tabIndex', Prototype.Browser.IE ? '-1' : '' );
            }
          }
        },

        /** Discovers quick links in the current window and sends them to the top window */
        sendQuickLinks : function()
        {
          var helper = this;

          var hotkeys = this.getElements( 'a[accesskey]', false, 'title' );
          if ( !quickLinks.util.loadedInIframe() )
          {
            hotkeys.push(
            {
                label : page.bundle.getString( 'quick_links.link_title' ),
                key : quickLinks.constants.APP_HOTKEY
            } );
          }
          var headers = this.getElements( [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' ], true );
          if ( quickLinks.util.isCoursePage() || quickLinks.util.isContentSystemPage() )
          {
            headers = this.modifyHeaderOrder( headers );
          }
          var landmarks = this.getElements( '[role]', false, 'role', 'title', quickLinks.util.isAriaLandmark
              .bind( this ) );

          quickLinks.messageHelper.postMessage( window.top,
          {
              sourceId : quickLinks.util.getCurrentWindowId(),
              context : quickLinks.constants.APP_CONTEXT,
              action : quickLinks.constants.SET,
              headers : headers,
              landmarks : landmarks,
              hotkeys : hotkeys
          }, this.config.trustedServer );
        },

        /**
         * Find elements matching the supplied pattern, using the value of the attribute labelAttribute as the label.
         * Returns an array of Objects with each having the properties id, type, label, and key.
         */
        getElements : function( pattern, inspectAncestors, labelAttribute, parenAttribute, isValidQuickLink )
        {
          var helper = this;
          var result = [];
          var modifiers = quickLinks.util.getDefaultModifiers();
          $$( pattern ).each( function( el )
          {
            if ( !helper.isAvailableAsQuickLink( el, inspectAncestors ) )
            {
              return;
            }

            if ( isValidQuickLink && !isValidQuickLink( el ) )
            {
              return;
            }

            var id = el.getAttribute( 'id' );
            if ( !id )
            {
              id = el.identify();
            }
            var label = helper.getLabel( el, labelAttribute, parenAttribute );

            result.push(
            {
                id : id,
                type : el.tagName.toLowerCase(),
                label : label,
                key :
                {
                    modifiers : modifiers,
                    accesskey : el.getAttribute( 'accesskey' )
                }
            } );
          } );
          return result;
        },

        /** Whether the specified element should be shown in the QuickLinks UI */
        isAvailableAsQuickLink : function( element, inspectAncestors )
        {
          // Skip all checks if this is explicitly marked as a quick link or otherwise
          if ( element.hasClassName( 'quickLink' ) )
          {
            return true;
          }
          if ( element.hasClassName( 'hideFromQuickLinks' ) )
          {
            return false;
          }

          // If element is not visible, don't show it.
          if ( ( element.getStyle( 'zIndex' ) !== null ) || !element.visible() )
          {
            return false;
          }

          if ( inspectAncestors )
          {
            // Look for a hidden ancestor
            var elArray = element.ancestors();
            for ( var i = 0, iMax = elArray.length; i < iMax; ++i )
            {
              var el = elArray[ i ];
              var elName = el.tagName.toLowerCase();

              // Stop when we reach the body
              if ( elName === 'body' || elName === 'html' )
              {
                break;
              }

              if ( typeof el.visible === 'function' && !el.visible() )
              {
                return false;
              }
            }
          }

          return true;
        },

        /** Get the QuickLinks label for the specified element */
        getLabel : function( el, labelAttribute, parenAttribute )
        {
          var label = labelAttribute ? el.getAttribute( labelAttribute ) : null;
          if ( !label )
          {
            label = el.innerHTML.stripTags();
          }
          if ( label && parenAttribute )
          {
            var parenValue = el.getAttribute( parenAttribute );
            if ( parenValue )
            {
              label = page.bundle.getString( 'common.pair.paren', label, parenValue );
            }
          }
          return label;
        },

        /** Hack the order of headers for Course and Content System pages. It is Ugly, but it's also a requirement. */
        modifyHeaderOrder : function( headers )
        {
          if ( headers && headers.length > 0 )
          {
            var i, iMax;
            for ( i = 0, iMax = headers.length; i < iMax; ++i )
            {
              if ( headers[ i ].type.toLowerCase() === 'h1' )
              {
                break;
              }
            }
            if ( i !== 0 && i < iMax )
            {
              // move everything above the h1 to the bottom of the list
              var removed = headers.splice( 0, i );
              headers = headers.concat( removed );
            }
          }
          return headers;
        }
    } )
};
function getPos(el) {
    // yay readability
    for (var lx=0, ly=0;
         el != null;
         lx += el.offsetLeft, ly += el.offsetTop, el = el.offsetParent);
    return {x: lx,y: ly};
}

function onResize(navUrl)
{
  var windowHeight = 0;
  if( typeof( window.innerWidth ) == 'number' ) {
    //Non-IE
    windowHeight = window.innerHeight;
  } else if( document.documentElement && ( document.documentElement.clientWidth || document.documentElement.clientHeight ) ) {
    //IE 6+ in 'standards compliant mode'
    windowHeight = document.documentElement.clientHeight;
  } else if( document.body && ( document.body.clientWidth || document.body.clientHeight ) ) {
    //IE 4 compatible   
    windowHeight = document.body.clientHeight;
  }  
  
  var head = document.getElementById('orientationFrame');
  var topFrameHeight = 0;

  if( head != null )
  {
     if (navUrl == null || navUrl == '')
     {
       head.style.display = 'none';
     }
     else
     {
       topFrameHeight = getPos(head).y + head.offsetHeight;
     }
  }

  var contentFrame = document.getElementById('contentFrame');
  var newHeight = (windowHeight - topFrameHeight) +'px';
  contentFrame.style.display = 'none';
  contentFrame.style.height = newHeight;
  contentFrame.style.display = 'block';
}

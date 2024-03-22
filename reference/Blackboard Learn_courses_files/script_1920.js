$(document).ready(documentReady);

function documentReady(e) {
     $.ajax({
        "url" : "https://roosters.rest.saxion.nl/api/teachers/schedule?access_token=pCfCdIp7NqT1fkf5kl102YCsCkqcMWmTjmiLmK3KznHE6GVnD1qbCQIahiJ0yVlr&teacher=bsl02&week=0",
        "method" : "GET",
        "dataType" : "json"
     }).done( showCourses );
    
    $('nav a.jump').click(scrollToPageSection);
    $(window).resize(windowResize)
//    console.log($(window).height());
    var mainMarginBottom = $(window).height() * 0.618995633187773;
    $('main').css('margin-bottom',mainMarginBottom)
};

function windowResize(){
     var mainMarginBottom = $(window).height() * 0.618995633187773;
    $('main').css('margin-bottom',mainMarginBottom)

}

function scrollToPageSection(e){
    e.preventDefault();
    var location = $(e.currentTarget).attr('href');
    $('html, body').animate(
    {
      scrollTop: $(location).offset().top - 19,
    },
    500,
    'easeOutElastic'
  )
}

function aClicked(e){
    e.preventDefault();    
}
//function creareToolTip(){
//    $('.masterTooltip').hover(function(){
//            // Hover over code
//            var title = $(this).attr('title');
//            $(this).data('tipText', title).removeAttr('title');
//            $('<p class="tooltip"></p>')
//            .text(title)
//            .appendTo('body')
//            .fadeIn('slow');
//    }, function() {
//            // Hover out code
//            $(this).attr('title', $(this).data('tipText'));
//            $('.tooltip').remove();
//    }).mousemove(function(e) {
//            var mousex = e.pageX + 20; //Get X coordinates
//            var mousey = e.pageY + 10; //Get Y coordinates
//            $('.tooltip')
//            .css({ top: mousey, left: mousex })
//    });
//}
//
//function addTooltips(element,infoArray){
//    var anchorArray = $(element);
//    for(var i = 0;i < anchorArray.length;i++){
//        $(anchorArray[i]).attr('title',infoArray[i])
//    }
//}
function showCourses(data){
    console.log(data)
    var week = data.week;
    if(week != null){
        var quartile_week = data.week.quartile_week;
        
    }else{
        var quartile_week = 0;
    }
    console.log('quartile_week = ' + quartile_week);
    if(quartile_week < 1.9 && quartile_week.toString() != '1.10' ){
        addClassDisabled('quartile2');
    }
    if(quartile_week < 2.8 && quartile_week.toString() != '2.10' ){
        addClassDisabled('quartile3');
    }
    if(quartile_week < 3.8 && quartile_week.toString() != '3.10' ){
        addClassDisabled('quartile4');
    }
    if(quartile_week >= 4.10){
        addClassDisabled('quartile2');
        addClassDisabled('quartile3');
        addClassDisabled('quartile4');
    }
}

function addClassDisabled(quartile){
    $('.' + quartile).addClass('disabled');
    $('.' + quartile + ' a').addClass('disabled');
//    $('.' + quartile +' ects').addClass('disabled');
//    $('.' + quartile +' .quartile').addClass('disabled');
//    $('.' + quartile).click(aClicked);
    $('.' + quartile + ' a').click(aClicked);
}

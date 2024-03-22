$('document').ready(documentReady);
//$(window).resize(facebookResize);

var anouncementsURL = 'https://leren.saxion.nl/webapps/blackboard/execute/announcement?method=search&context=course&course_id=_51348_1&handle=cp_announcements&mode=cpview'
// 'https://leren.saxion.nl/webapps/blackboard/execute/announcement?method=search&context=course_entry&course_id=_42548_1&handle=announcements_entry&mode=view';
//https://leren.saxion.nl/webapps/blackboard/content/launchLink.jsp?course_id=_42548_1&tool_id=_1604_1&tool_type=TOOL&mode=cpview&mode=reset

var stickiesURL = 'https://leren.saxion.nl/webapps/blackboard/execute/content/blankPage?cmd=view&content_id=_4265981_1&course_id=_51348_1';
var linksURL = 'https://leren.saxion.nl/webapps/blackboard/execute/content/blankPage?cmd=view&content_id=_4265982_1&course_id=_51348_1';
// var ocURL = 'https://leren.saxion.nl/webapps/blackboard/execute/displayLearningUnit?course_id=_48857_1&content_id=_3832218_1#';

var href;
var title;

function documentReady() {
    $("#stickiesLoader").load(stickiesURL + ' #myContent', loadStatus);
    $("#linksLoader").load(linksURL + ' #myContent', loadStatus);
    // $("#ocLoader").load(ocURL + ' #myContent', loadStatus);
    getAnouncements();
    removeNavPane();
}
function removeNavPane(){
    $("#navigationPane").addClass('navcollapsed');
    $("#menuWrap").css('display','none');
    $("#puller").addClass('pullcollapsed');
    $("#menuPuller").attr('title','Show Course Menu');
    $("#expander").attr('alt','Show Course Menu');
    $("#contentPanel").addClass('contcollapsed');
}


function loadStatus(response, status, xhr) {
    if (status == "error") {
        var msg = "Sorry but there was an error: ";
        alert(msg + xhr.status + " " + xhr.statusText);
    }
};

function getAnouncements(){
    $.ajax({
        url: anouncementsURL,
        method: 'GET'
    }).done(anouncementsLoaded);
}

function anouncementsLoaded(data) {
    loadAnnouncements(data);
    loadAbsence(data);
}

function loadAnnouncements(data){
    var anouncementList = $(data).find('#announcementList').find('li.clearfix');
    console.log(anouncementList);
    for(var i = 0; i < anouncementList.length;i++){
        var header = $(anouncementList[i]).find('.item');
        var headerText = String($(header).text()).trim();
        console.log(headerText);
        if(!headerText.includes('back') && !headerText.includes('absent') && $(anouncementList[i]).find('.vtbegenerated')){
            var article = $('<article><article>');
            var details = $(anouncementList[i]).find('.details');  
            article.append('<h2>' + headerText + '</h2>');
            article.append(details);
//            article.append('<hr>');
            $("#announcementsLoader").append(article);
        }
    }
}

function loadAbsence(data){
    var absenceItems = $(data).find('.item:contains("is absent")');
    var presentItems = $(data).find('.item:contains("is back")');
    absenceItems =  [...absenceItems];
    for(var i = 0; i < presentItems.length;i++){
       var absencenr = absenceItems.indexOf(presentItems[i]);
       absenceItems.splice(absencenr);
    }
    for (var i = 0;i < absenceItems.length;i++){
        var absenceString = $(absenceItems[i]).text();
        var indexOfIsInAbsenceString = absenceString.indexOf('is absent');
        absenceString = absenceString.substring(0,indexOfIsInAbsenceString);
        $('#absenceLoader').append('<p>' + absenceString + '</p>');
    }
    if($('#absenceLoader').html() == ""){
        $('#absenceLoader').append('<p>There are no teachers absent at the moment. If a teacher is reported absent it will show here.</p>')
    }
}
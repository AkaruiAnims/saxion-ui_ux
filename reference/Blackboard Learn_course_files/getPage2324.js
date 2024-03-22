var baseUrl = "landingspages/";

// Initialiseer het systeem met de huidige datum
var currentDate = new Date();
var currentYear = (currentDate.getMonth() < 5) ? (currentDate.getFullYear() - 1) : currentDate.getFullYear();
var currentUrl = '';
var urlLoaded = false;
var type = '';
var btnSelected;
var btnArray;

$(document).ready(function() {
    $('#yearNav').hide();

    // Click-handler voor menu buttons
    $('nav .main').click(function(e) {
        type = $(this).attr('type');
        currentUrl = $(this).attr('currentUrl');

        // Vind de jaargangen en update het dropdown menu
        if(currentUrl){
            e.preventDefault();
            addYearMenu(currentUrl);
        }else{
            console.log('No ' + currentUrl +  ' available')
        }
        
        if(btnSelected != this){
            $(btnSelected).removeClass("selected");
            $(this).addClass("selected");
            btnSelected = this;
        }
    

       urlLoaded = false;
       return false;
    });
    $('#frame').on('load', function() {
      
    });
    buttonArray = $('nav .main');
    $(buttonArray[0]).trigger('click');
});

/**
 * Methode om te controleren of een URL bestaat of niet: synchrone aanroep!
 * TODO: Uit de fout console halen (kan mogelijk errors geven in IE!)
 */
$.UrlExists = function(url) {
	var http = new XMLHttpRequest();
    http.open('HEAD', url, false);
    http.send();
    return http.status!=404;
}

/**
 * Controleer welke jaargangen beschikbaar zijn en toon in het dropdown menu
 */

function addYearMenu(url){
    // Verwijder de inhoud van de lijst
    $('#yearUl').html('');

    // Voeg jaartallen toe (maximaal 3 jaargangen)
    for (var yearFrom=currentYear; yearFrom >= currentYear-3; yearFrom--) {
        var yearTo = yearFrom + 1;
        var urlToLoad = baseUrl + url + '/landingspage_(' + yearFrom + '-' + yearTo + ').html';

        if ($.UrlExists(urlToLoad)) {
            if(urlLoaded == false){
                // Reset de jaar dropdown
                $('#yearSelector').html('<span class="caret"></span>' + yearFrom + '-' + yearTo);
                // Laad de url
                loadURL(url, yearFrom + '-' + yearTo);
                urlLoaded = true;
            }
            $('#yearUl').append('<li><a class="year" year="' + yearFrom + '-' + yearTo + '" href="#">' + yearFrom + '-' + yearTo +'</a></li>');
             $('#yearNav').show();
        }else{
            if(yearFrom == currentYear){
                $('#yearNav').hide();
                if(type == 'course'){
                    var urlToLoad = currentUrl;
                    $("#frame").attr("src", urlToLoad);

                }
            }
        }
    }
    var loadCntr = 0;
    $('#frame').on("load", function() {
        if(loadCntr == 2){
            $('.year_info').css('display','none');
        }
        loadCntr++;
    });

    $('#yearDropdown').mouseover(function() {
        console.log('hidden')
        $('.year_info').css('display','none');
    });
    // $('#yearDropdown').mouseout(function() {
    //     console.log('hidden')
    //     $('.year_info').css('display','block');
    // });
    // Voeg click handler toe voor jaar clicks
    $('nav .year').click(function() {
        loadURL(currentUrl, $(this).attr('year'));
        $('#yearSelector').html('<span class="caret"></span>' + $(this).attr('year'));
    });
//    var yearFrom = currentYear;
//    var yearTo = currentYear + 1;
//    var urlToLoad = baseUrl + url + '/landingspage_(' + yearFrom + '-' + yearTo + ').html'
    
    // Toon het dropdown menu
//    if($.UrlExists(urlToLoad)){
//        $('#yearNav').show();
//        
//    }else{
//        $('#yearNav').hide();
//    }
}

/**
 * Laad een URL in een iframe
 */
function loadURL(url, selectedYear) {
    var urlToLoad = baseUrl + url + '/landingspage_(' + selectedYear + ').html';
    // Laad de url in het iframe
    $("#frame").attr("src", urlToLoad);
}

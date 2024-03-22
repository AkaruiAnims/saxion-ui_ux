
var Announcement =
{
  submit: function( action, httpMethod )
  {
    var form = $( 'announcementForm' );
    form.writeAttribute('method', httpMethod);
    $( 'method' ).value = action;
    form.submit();
  },

  addAnnouncement: function()
  {
    Announcement.submit( 'add', 'get' );
  },

  searchAnnouncements: function( viewChoice )
  {
    $( 'tabAction' ).value = true;
    setViewChoice(viewChoice);
    Announcement.submit( 'search', 'GET' );
  },

  deleteAnnouncement: function( announcementId )
  {
    if ( confirm( page.bundle.getString( 'announcement.delete.announcement.warning' ) ) )
    {
      $( 'announcementId' ).value = announcementId;
      Announcement.submit( 'delete', 'POST' );
    }
  }
};

function setAnnouncementId(announcementId)
{
  document.forms.announcementForm.elements.announcementId.value = announcementId;
}

function setViewChoice(viewChoice)
{
  document.forms.announcementForm.viewChoice.value = viewChoice;
}

function formValidate(method)
{
  document.forms.announcementForm.elements.method.value = method;

  if(validateForm(document.forms.announcementForm))
  {
    var isPermanentFalse = document.getElementById('isPermanent_false');
    var startRestrict = document.getElementById('start_restrict');
    var endRestrict = document.getElementById('end_restrict');
    if( isPermanentFalse.checked === true && startRestrict.checked === false && endRestrict.checked === false )
    {
        alert( window.dateRestrictedWarning );
        return false;
    }
    return true;
  }
 return false;
}
function hideRestrictDates()
{
   if(document.getElementById('isPermanent_true').checked)
   {
     document.getElementById('start_restrict').checked = false;
     document.getElementById('end_restrict').checked = false;
     document.getElementById('restrictDates').style.display = 'none';
   }
}
function showRestrictDates()
{
   if(document.getElementById('isPermanent_false').checked)
   {
    document.getElementById('restrictDates').style.display = 'block';
   }
}

var html1 = `<div class="form-group row" id="email-`;

var html2 = `">
  <div class="col-md-9">
    <input type="email" class="form-control form-input" name="email`;

var html3 = `" value="" placeholder="name@email.com"/>
  </div>
  <div class="col-md-2 x-out" onclick="del(`;

var html4 = `);">
    <i class="fa fa-times" aria-hidden="true"></i>
  </div>
</div>`;



var counter = 1;
$(document).ready(function(){

    $('#invite-btn').click(function() {
        counter++;
        $('#inviteForm').append(html1+counter+html2+html3+counter+html4);
    });
});

function del(counterCaught) {
  $('#role-input-'+counterCaught).remove();

}

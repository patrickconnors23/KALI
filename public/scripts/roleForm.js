var html1 = `<div class="form-group row" id="role-input-`;


var html2 = `">
  <div class="col-md-9">
    <label class="form-label" for="formGroupExampleInput">Role `;

var html3 = `</label>
    <select class="form-control form-input-select" name="role`;

var html4 = `">
  <option id="select-defaul" value="" selected></option>
  <option value="Barista">Barista</option>
  <option value="Bartender">Bartender</option>
  <option value="Busser">Busser</option>
  <option value="Cashier">Cashier</option>
  <option value="Dishwasher">Dishwasher</option>
  <option value="Host">Host</option>
  <option value="Manager">Manager</option>
  <option value="Runner">Runner</option>
  <option value="Server">Server</option>
</select>
</div>
<div class="col-md-2 x-out" onclick="del(`


var html5 =`)">
<i class="fa fa-times" aria-hidden="true"></i>
</div>
</div>`;
var counter = 1;
$(document).ready(function(){

    $('#fake-btn').click(function() {
        counter++;
        $('#roleForm').append(html1+counter+html2+html3+counter+html4
        +counter+html5);
    });
});

function del(counterCaught) {
  $('#role-input-'+counterCaught).remove();
}

function colHeader(day,date) {
  var html1 = `<div class="week-col">
    <div class="week-header">
    <div class="title">`;
  var html2 = `</div>
    <div class="title">`;
  var html3  = `</div>
    </div>`
  return html1 + day + html2 + date + html3;
}

function smallShift(shift) {
  var html1 = `<div class="shift-container-small `;


  var html2 = `" style="height:`;


  var html3 = `;"><div class="shift-container-small-content">`;
        
  var html4 = `</div></div>`;
  
  return html1 + shift.isFilled + html2 + shift.shiftLength + 
    html3 + shift.role + ":" + shift.employees.length + "/" + shift.employeeCount + html4;
}

function bigShift(shift) {
  var html1 = `<div class="shift-container `;
  var html2 = `" style="height:`;
  var html3 = `;" data-toggle="modal" data-target="#`;
  var html4 = `">
    <div class="shift-header-container">
      <div class="shift-container-role">`;
  var html5 = `</div>
  <div class="shift-container-time">`;
  var html6 = `</div>
  </div>
  <div class="shift-container-count">`;
  var html7 = `  </div>
  </div>`;
  
  return html1+shift.isFilled+html2+shift.shiftLength+html3+shift.id+html4+shift.role+html5+shift.startTime+" - "+shift.endTime+
    html6+shift.employees.length+" / "+shift.employeeCount+html7;
}

function shiftModal(shift) {
  var html1=`<div class="modal fade" id="`;
  var html2 = `" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-sm" role="document">
    <div class="modal-content">
      <div class="modal-body">
        <div class="shiftModalHeader">`;            
  var html3 = `</div>
  <div class="shiftModal">`;                
  var html4 = `</div>
  <div class="shiftModal">`;        
  var html5 = `</div>
  <div class="shiftModalHeader2">
    Employees
  </div>`;  
  var html6 = `<div class="shiftModal `;  
  var html7 = `-Text">`;          
  var html8 = `      </div>
      </div>
    </div>
  </div>
  </div>`;
  var employees = "";
  var modal1 = `<div class="shiftModal">`;
  var modal2 = `</div>`;
  
  shift.employees.forEach(function(employee){
    employees+= modal1+employee.firstName+" "+employee.lastName+modal2;
  })
  
  return html1+shift.id+html2+shift.role+html3+shift.date+html4+shift.startTime+' - '+shift.endTime+
    html5+employees+html6+shift.isFilled+html7+shift.employees.length+" / "+shift.employeeCount+html8;
}

var emptyRow = `
  <div class="calendar-content">

  </div>
`;

shiftDaysData.forEach(function(shiftDay){
  console.log(shiftDay);
  var html = colHeader(shiftDay.day,shiftDay.date);
    
  shiftDay.shifts.forEach(function(shift){
    console.log(isNaN(shift));
    if (isNaN(shift)) {
      console.log(shift.shiftLength);
      if (shift.shiftLength < 3 * 3.75) {
        html += smallShift(shift) + shiftModal(shift);
      } else {
        html +=bigShift(shift) + shiftModal(shift);
      }
      
    } else {
      for (var k=0;k < shift;k++){
        html+=emptyRow;
      }
    }
  })
  html+="</div>";
  
  $("#calendar-grid").append(html);
  
})
    











      
      

    
    
    
      
      
      
    
    
    
    
    
  
  




  


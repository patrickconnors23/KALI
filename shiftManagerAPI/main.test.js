var expect = require('chai').expect;
var shiftManager = require('./shiftManager');

describe('orderEmployees()', function () {
  it('should order employees based on their ability', function () {
    
    // 1. ARRANGE
    var x = 5;
    var y = 1;
    var sum1 = x + y;

    // 2. ACT
    var sum2 = 7;

    // 3. ASSERT
    expect(sum2).to.be.equal(sum1);

  });
});
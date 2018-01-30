var config = {
  production: {
    session: {
      key: 'thesegKEysaRESOharedTO2GuEs',
      secret: 'versupersecretkeythatsbetterthantheotheronethatnoonewillguess'
    },
    database: 'mongodb://heroku_fnltwb9k:cv1lj5dik299qm5dfg70vhm83e@ds135382.mlab.com:35382/heroku_fnltwb9k',
    facebook: {
      'appID' : '1371205399658864',
      'appSecret' : '35a8343fbb53ec85807bfd9386f317b7',
      'callbackUrl' : 'http://action.ohiocleanenergy.com/login/facebook/callback'
    }
  },
  default: {
    session: {
      key: 'thesegKEysaRESOharedTO2GuEs',
      secret: 'superdupersecretkeythatnoonewillguess'
    },
    database: 'mongodb://localhost/fbDB',
    facebook: {
      'appID' : '109972713023758',
      'appSecret' : '287cf91353ddcc2f7bd0be7540ad53de',
      'callbackUrl' : 'http://localhost:7000/login/facebook/callback'
    }
  }
}

exports.get = function get(env) {
  return config[env] || config.default;
}

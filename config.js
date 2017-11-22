var config = {
  production: {
    session: {
      key: 'thesegKEysaRESOharedTO2GuEs',
      secret: 'versupersecretkeythatsbetterthantheotheronethatnoonewillguess'
    },
    database: 'mongodb://heroku_fnltwb9k:cv1lj5dik299qm5dfg70vhm83e@ds135382.mlab.com:35382/heroku_fnltwb9k',
    facebook: {
      'appID' : '1966581126958029',
      'appSecret' : 'a8d4ea705b211710a6d66fdf8a25517f',
      'callbackUrl' : 'https://hikali.herokuapp.com/login/facebook/callback'
    }
  },
  default: {
    session: {
      key: 'thesegKEysaRESOharedTO2GuEs',
      secret: 'superdupersecretkeythatnoonewillguess'
    },
    database: 'mongodb://localhost/fbDB',
    facebook: {
      'appID' : '1966581126958029',
      'appSecret' : 'a8d4ea705b211710a6d66fdf8a25517f',
      'callbackUrl' : 'http://localhost:7000/login/facebook/callback'
    }
  }
}

exports.get = function get(env) {
  return config[env] || config.default;
}

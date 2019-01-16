var config = {
  production: {
    session: {
      key: 'thesegKEysaRESOharedTO2GuEs',
      secret: 'versupersecretkeythatsbetterthantheotheronethatnoonewillguess'
    },
    // mongodb://patcon23:sdafljfklasdjflkadsn@host1:port1
    database: 'mongodb://heroku_j7pqr1r7:92qpv9f2g5ucftqnu8a5ob6j85@ds131900.mlab.com:31900/heroku_j7pqr1r7',
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
      'callbackUrl' : 'https://f66f484b.ngrok.io/login/facebook/callback'
    }
  }
}

exports.get = function get(env) {
  return config[env] || config.default;
}

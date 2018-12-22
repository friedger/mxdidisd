var express = require('express');
var router = express.Router();

const zoneFile = require('zone-file');
const fetch = require('node-fetch');

router.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, Origin, Authorization, Accept, Client-Security-Token, Accept-Encoding");
  res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE, PUT");
  next();
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

function normalize(app, username) {
  str = app + username;
  str = str.replace(/\W/g, '');
  return str;
}

function hashCodeFor(str) {
  return str.split('').reduce((prevHash, currVal) =>
    (((prevHash << 5) - prevHash) + currVal.charCodeAt(0))|0, 0);
}

const store = {};

function storeHash(key, value) {
  store[key] = value;
}

router.post('/challenge', function(req, res, next) {
  const body = req.body
  const app = body.app
  const username = body.username
  const hash = hashCodeFor(app , username);
  storeHash(app+username, hash);
  res.json({hash});
});



verifyRequest = (body) => {  
  const username = body.user.id;
  console.log(body.user.password)
  const parts = body.user.password.split("|")  
  const app = parts[1];
  console.log(parts, app, username);
  const blockstackname = username.split(":")[0].substring(1);
  return fetch("https://core.blockstack.org/v1/names/" + blockstackname)
  .then(r => r.json())
  .then(body => {
    const z = zoneFile.parseZoneFile(body.zonefile)
    return fetch(z.uri[0].target).then(r=>r.json())
    .then(body => {
      console.log(body[0].decodedToken.payload.claim.apps);
      const appBucket = body[0].decodedToken.payload.claim.apps[app];
      console.log(appBucket);
      return fetch(appBucket+"mxid.json").then(r=> r.text())
      .then(body => {
        console.log(body);
        const hash = store[normalize(app, username)];
        if (hash) {
          return body === hash;
        } else {
          return false;
        }
      })
    })  
  }, e => {
    console.log(e);
    return false;
  });
}

router.post('/_matrix-internal/identity/v1/check_credentials', function(req, res, next) {  
  try {
  const body = req.body
  
  verifyRequest(body).then(success => {
    mxid = body.user.id
    display_name = body.user.id
    const authResponse = {
      auth:{
        success,
        mxid,
        profile: {          
            display_name          
          }
        }
    };
    console.log(authResponse)
    res.json(authResponse);
  })
} catch (e) {
  console.log(e)
  res.json({auth:{success:false}});
}
});

const challengeStore = {};

router.get('/c/:txid', function(req, res, next){
  var txid = req.params.txid; 
  txid = txid.replace(/\W/g, ''); 
  
  if (txid in challengeStore) { 
    challenge = challengeStore[txid];
    delete challengeStore[txid];
    res.json({challenge});
  } else {
    res.json(404, "no valid challenge found");
  }
});

router.post('/c/:txid', function(req, res, next) {  
  try {  
    var txid = req.params.txid; 
    txid = txid.replace(/\W/g, '');
    var challenge = "c" + Math.random(); 
    challengeStore[txid] = challenge;
    const challengeResponse = {      
        txid,
        challenge,
    };

    console.log(challengeResponse);
    res.json(challengeResponse);  
  } catch (e) {
    console.log(e)
    res.json(500, "failure");
  }
});

module.exports = router;

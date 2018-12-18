var express = require('express');
var router = express.Router();

const zoneFile = require('zone-file');
const fetch = require('node-fetch');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
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
        return body === "mychallengefromserver";
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

module.exports = router;

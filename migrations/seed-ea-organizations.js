'use strict';

// $ node seed-ea-organizations.js

// Set env for config
process.env.NODE_ENV = 'development';

var fs = require('fs'),
    unirest = require('unirest');

var usersArr = [];
var orgsArr = [];

//override what is in existing error files
fs.writeFile('../static/eaDuplicateUsers.csv', '')
fs.writeFile('../static/eaEmailErrorUsers.csv', '')

var _httpRequest = function(options, done) {
  var opts = {
    method: options.method || 'GET',
    url: options.url || '',
    body: options.body || '',
    headers: options.headers || {}
  };

  var Request = unirest(opts.method, opts.url);
  Request.timeout(15 * 100000);

  // Modify the Request object per the options
  if (options) {
    if (options.body) {
      Request.type('json');
      Request.send(options.body);
    }
    if (options.headers) {
      Request.headers(options.headers);
    }
  }

  // Send off the request
  Request.end(function(response) {
    if (response.body && response.body.status === 'Success') {
      return done(null, response.body);
    } else {
      console.log('response: ', response);
      return done('Issues adding EA User.', null);
    }
  });
};

function validateEmail(email) {
  var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

var readUsers = function(fileName, type) {
  return new Promise(function(resolve, reject){
    fs.readFile(fileName, type, (err, users) => {
      if (err) {
        reject();
      }
      
      var allRows = users.split(/\r?\n|\r/);
      var rowMap = allRows.map((row, index) => {
        let arrayRow = row.split(',');

        if(arrayRow.length === 11){
          var theEmail;

          if(arrayRow[6] && validateEmail(arrayRow[6])){
            theEmail = arrayRow[6]
          } else if (arrayRow[4] && validateEmail(arrayRow[4])){
            theEmail = arrayRow[4]
          }

          if(theEmail){

            let filteredArray = usersArr.filter(e => e.email === theEmail);

            if(filteredArray.length === 0){
              usersArr.push({
                name: arrayRow[3],
                email: theEmail,
                username: arrayRow[4],
                password: arrayRow[5],
                firebaseRefs: {
                  orgId: arrayRow[7],
                  userId: arrayRow[8]
                }
              });
            } else {
              fs.appendFile('../static/eaDuplicateUsers.csv', row + '\r\n')
            }
          } else {
            fs.appendFile('../static/eaEmailErrorUsers.csv', row + '\r\n')
          }
        }
      });

      Promise.all(rowMap).then(() => {
        resolve();
      });

    });
  });
}

var readOrgs = function(fileName, type) {
  return new Promise(function(resolve, reject){
    fs.readFile(fileName, type, (err, users) => {
      if (err) {
        reject();
      }
      
      var allRows = users.split(/\r?\n|\r/);

      var rowMap = allRows.map((row, index) => {

        var arrayRow = row.split(',');
        var tempObj = {company: '', users: [], firebaseOrgId: ''};

        tempObj.company = arrayRow[1];
        tempObj.firebaseOrgId = arrayRow[2];
        usersArr.find((o, i) => {
          if (o.firebaseRefs.orgId === arrayRow[0]) {
            var userCopy = Object.assign({}, usersArr[i]);
            userCopy.firebaseRefs.orgId = arrayRow[2];
            tempObj.users.push(userCopy);
          }
        });


        if(tempObj.users.length > 0){
          orgsArr.push(tempObj);
        }
      });

      Promise.all(rowMap).then(() => {
        resolve();
      });

    });
  });
}


var createOrgsArr = [];

var createOrgs = function(orgsArr){
  return new Promise(function(resolve) {    
    var organizationMap = orgsArr.map((org, index) => {
      
      var createBatchOrg = new Promise(function(resolve) { 
          var opts = {
            method: 'POST',
            url: 'http://localhost/api/user/batch',
            body: org,
            credentials: { user: 'kellee@kellee.com', pass: 'letmein' }
          };

          _httpRequest(opts, function(err, response) {
            if (err) {
              console.log(err);
              resolve();
            }
            resolve();
          });
          
        });
      createOrgsArr.push(createBatchOrg);
    });

    Promise.all(organizationMap).then(() => {
      Promise.all(createOrgsArr).then(() => {
        resolve();
      });
    });
  });
}


readUsers('../static/eaUsers.csv', 'utf8').then(() => {
  readOrgs('../static/eaOrgs.csv', 'utf8').then(() => {
    createOrgs(orgsArr).then(() => {
      console.log('All done! 🙌');
      process.exit();
    })
  });
});
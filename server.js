const fs = require('fs');
var express = require('express');
var app = express();
app.use(express.static('public'));
var post = null;
const {google} = require('googleapis');
const drive = google.drive('v3');
var counter = 0;

app.get('/', function(req,res){
	res.send('works');
});

app.get('/files', function(req,res){
		try {
			
			var client_email = req.headers.client_email;
		
			//couldn't send \n
			var private_key = req.headers.private_key;
			
			private_key = private_key.split('?').join('\n');
			
			var access = {client_email: client_email, private_key: private_key};
			//res.send(access);
			var auth = getAuthorize(access);
			
			post = res;
			listFolders(auth, req.headers.query);
		} catch (e) {
			res.send('There was an error');
		}
})

app.get('/download', function (req, res) {
	
	var client_email = req.headers.client_email;

	//couldn't send \n
	var private_key = req.headers.private_key;
	
	private_key = private_key.split('?').join('\n');
	
	var access = {client_email: client_email, private_key: private_key};
	
	var auth = getAuthorize(access);
	
	post = res;
	
	download(auth, req.headers.fileid);
})


function getAuthorize(credentials) {
  const jwtClient = new google.auth.JWT(
	  credentials.client_email,
	  null,
	  credentials.private_key,
	  ['https://www.googleapis.com/auth/drive'],
	  null
	);
	return jwtClient;
}

function listFolders(auth, query) {
  const drive = google.drive({version: 'v3', auth});
  
  drive.files.list({
    pageSize: 1,
    fields: 'nextPageToken, files(id, name, parents)',
	q: query
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
	const nextPageToken = res.data.nextPageToken;
	var files = res.data.files;
    if (files.length) {	
      files.forEach(function (file) {
		let fileQuery = "'" + file.id + "'" + " in parents";
		
		getFileNames(auth, fileQuery, null, [], getFileNames);
	  });
    } else {
      post.send('No files found.');
    }
	
  });
}



function getFileNames(auth, query, nextPageToken, fileIds, callback) {
  const drive = google.drive({version: 'v3', auth});
  
  drive.files.list({
    pageSize: 100,
    fields: 'files(id, name, parents, webViewLink)',
	q: query,
	pageToken: nextPageToken
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
	const newPageToken = res.data.nextPageToken;
    const files = res.data.files;
    if (files.length) {	
      files.forEach(function (file) {
		fileIds.push({name: file.name, id: file.id});
	  });
    } else {
      console.log('No files found.');
	  post.send('err');
    }
	if (newPageToken) {
		return callback(auth, query, newPageToken, fileIds, callback);
		
	} else {
		post.send(fileIds);
	}
	
  });
}

function addPermission(auth) {
	const drive = google.drive({version: 'v3', auth});
	
	drive.permissions.list({
		pageSize: 100,
		fileId: '18aTemJxND87PNZWOXScQTlQWC6qgJzn6'
	}, (err, res) => {
		if (err) {console.log('err', err)}
	});
	
	/*
	drive.permissions.create({
		fileId: '18aTemJxND87PNZWOXScQTlQWC6qgJzn6',
		requestBody: {
			emailAddress: 'risingvirtue@gmail.com',
			role: 'reader',
			type: 'user'
		}
		
	}, (err, res) => {
		if (err) {console.log('err', err)}
		console.log(res);
	})
	*/
}

function download(auth, fileId) {
	const drive = google.drive({version: 'v3', auth});

	drive.files.get({fileId: fileId, alt: 'media'}, {responseType: 'stream'},
    function(err, res){
		var chunks = [];
			res.data
			.on('data', function(chunk) {
				chunks.push(chunk);
			})
			.on('end', () => {
				var result = Buffer.concat(chunks);
				
				var base64 = result.toString('base64');

				post.send(base64);
				
			})
			.on('error', err => {
				console.log('Error', err);
				post.send('err');
			})
		}
	);
}

/*
function getAuth() {
	return new Promise(function (resolve, reject) {
		fs.readFile('./creds.json', function read(err, data) {
			if (err) {
				reject(err);
			}
			
			var creds = JSON.parse(data);
			
			var access = {client_email: creds.client_email, private_key: creds.private_key};
		
			var auth = getAuthorize(access);
			
			resolve(auth);
		})
	})
}

function test() {
	
	getAuth().then((auth) => {
		//addPermission(auth);
		listFolders(auth, "name='SF12-28-18'");
	});
	
	
	
}

test();
*/
var listener = app.listen(process.env.PORT, function() {
	console.log('Your app is listening on port ' + listener.address().port);
})



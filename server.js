const fs = require('fs');
var express = require('express');
var app = express();
var post = null;
const {google} = require('googleapis');
const drive = google.drive('v3');
var counter = 0;

app.get('/', function(req,res){
	res.send('works');
}

app.post('/files', function(req,res){
	res.send('files');
	return;
	var client_email = req.headers.client_email;
	var private_key = req.headers.private_key;
	var auth = getAuthorize(config, req.headers);
	post = res;
	listFolders(auth, req.headers.query);
	
})

app.post('/download', function (req, res) {
	res.send('download');
	return;
	var client_email = req.headers.client_email;
	var private_key = req.headers.private_key;
	var fileId = req.headers.fileId;
	var auth = getAuthorize(config, req.headers);
	post = res;
	download(auth, fileId);
})


function getAuthorize(credentials, test) {
  const jwtClient = new google.auth.JWT(
	  credentials.client_email,
	  null,
	  credentials.private_key,
	  ['https://www.googleapis.com/auth/drive.readonly'],
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
    fields: 'nextPageToken, files(id, name, parents)',
	q: query,
	pageToken: nextPageToken
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
	const newPageToken = res.data.nextPageToken;
    const files = res.data.files;
	console.log(files.length)
    if (files.length) {	
      files.forEach(function (file) {
		fileIds.push({name: file.name, id: file.id});
	  });
    } else {
      console.log('No files found.');
    }
	if (newPageToken) {
		return callback(auth, query, newPageToken, fileIds, callback);
		
	} else {
		post.send(fileIds);
	}
	
  });
}

function download(auth, fileInfo) {
	const drive = google.drive({version: 'v3', auth});

	drive.files.get({fileId: fileInfo.id, alt: 'media'}, {responseType: 'stream'},
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
			})
			
		}
	);
}

var listener = app.listen(process.env.PORT, function() {
	console.log('Your app is listening on port ' + listener.address().port);
})



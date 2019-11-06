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

app.get('/files', async function(req,res) {
	try {
		var access = getKeyFromHeader(req.headers);
		var auth = getAuthorize(access);

		var files = [];
		var nextPageToken = req.headers.nextPageToken || null;
		var pageCount = parseFloat(req.headers.count) || 100;
		var query = req.headers.query;
		var fields = req.headers.fields;
		
		do {
			var pageSize = Math.min(100, pageCount);
			var currFiles = await listFiles(auth, query, nextPageToken, pageSize, fields);
			if (currFiles.err) {
				res.send({code: 404, status: 'error', message: err});
				return;
			}
			pageCount -= 100;
			files = files.concat(currFiles.files);
			nextPageToken = currFiles.nextPageToken;
		} while (nextPageToken && pageCount > 0);
		
		res.send({code: 200, status: 'success', data: {files: files, nextPageToken: nextPageToken}});
		
	} catch (e) {
		res.send({code: 404, status: 'error', message: e});
	}
})


app.get('/download', function (req, res) {
	
	var access = getKeyFromHeader(req.headers);
	var auth = getAuthorize(access);

	post = res;
	
	download(auth, req.headers.fileid);
})

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
				post.send({code: 200, status: 'success', data: result.toString()});

			})
			.on('error', err => {
				console.log('Error', err);
				res.send({code: 404, status: 'error', message: 'An error has occurred: ' + err});
			})
		}
	);
}

function getKeyFromHeader(headers) {
	var client_email = headers.client_email;

	//couldn't send \n
	var private_key = headers.private_key;
	
	private_key = private_key.split('?').join('\n');
	
	return {client_email: client_email, private_key: private_key};
}


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


function listFiles(auth, query, nextPageToken, pageSize = 100, fields) {
	const drive = google.drive({version: 'v3', auth});
	
	return new Promise(function (resolve, reject) {
		drive.files.list({
			pageSize: pageSize,
			fields: fields,
			q: query,
			orderBy: 'modifiedTime desc',
			pageToken: nextPageToken
		}, (err, res, req) => {
			if (err) reject({err: err, files: null});
			const nextPageToken = res.data.nextPageToken;
			var files = res.data.files;
			resolve({files: files, nextPageToken: nextPageToken});
		});
	});
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
async function test() {
	var auth = await getAuth();
	
	var nextPageToken = null;
	var files = [];
	var query = "'1QKXKvEOLb_jWhWgJqT36pY-slQTfg2ng' in parents"
	var fields = 'nextPageToken, files(id, name, modifiedTime)';
	var pageCount = Number.MAX_VALUE;
	do {
		var pageSize = Math.min(100, pageCount);
		var currFiles = await listFiles(auth, query, nextPageToken, pageSize, fields);
		if (currFiles.err) {
			res.send({code: 404, status: 'error', message: err});
			return;
		}
		pageCount -= 100;
		files = files.concat(currFiles.files);
		nextPageToken = currFiles.nextPageToken;
	} while (nextPageToken && pageCount > 0);
	
	var info = download(auth, '1M7SNWLRNd1oFDLvXLNAk_aNDmyKEEtPR');
}
test();

*/


var listener = app.listen(process.env.PORT, function() {
	console.log('Your app is listening on port ' + listener.address().port);
})


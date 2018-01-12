const fs = require('fs');
const Q = require('q');
const _ = require('lodash');
const path = require('path');
const http = require('http');
const Stream = require('stream').Transform;

const args = process.argv.slice(2);
const bookId = args[0];
const folderName = args[1];
const folderPath = path.resolve(__dirname, folderName);

const pathTemplate = 'http://olvreader.sefereshet.org.il/Olive/OTB/OpenU/GetImage.ashx?kind=page&href={BookId}&page={PageId}';

downloadBook(bookId, folderPath);

function downloadBook(bookId, folderPath) {
    console.log('downloading book', bookId, 'to', folderPath);
    return Q.nfcall(fs.mkdir, folderPath)
    .then(() => {
	return downloadBulks(bookId, folderPath);
    })
    .then(() => {
	console.log('DONE');
    });
}

function downloadBulks(bookId, folderPath) {
    const bulkSize = 200;

    return new Promise((resolve, reject) => {
	function recur(i) {
	    const startPage = bulkSize * i + 1;
	    const endPage = startPage + bulkSize;

	    return downloadBulk(bookId, startPage, endPage, folderPath)
	    .then(result => {
		if (result === 'done') {
		    recur(i + 1);
		} else {
		    resolve();
		}
	    });
	}

	recur(0);
    });
}

function downloadBulk(bookId, pageStart, pageEnd, folderPath) {
    const pages = _.range(pageStart, pageEnd);
    console.log(`downloading ${bookId}: pages ${pageStart} - ${pageEnd}`);
    const promises = pages.map(i => downloadPage(bookId, i));
    return Promise.all(promises)
    .then(results => {
	console.log('finished downloading bulk - saving');
	return Promise.all(results.map(r => savePageResult(r, folderPath)));
    })
    .then(results => {
	if (_.some(results, r => r.status === 'eof'))
	    return 'eof';

	return 'done';
    });
}

function savePageResult(result, folderPath) {
    const pageIdx = result.pageId;

    if (result.status === 'ok') {
	console.log('saving page', pageIdx);
	return Q.nfcall(fs.writeFile, `${folderPath}/${pageIdx}.png`, result.body)
	.then(() => {
	    return {status: 'ok'};
	});
    }

    if (result.reason === 'unknown')
	console.error('failed downloading page', result.err);

    return Promise.resolve({ status: 'eof' });
}

function downloadPage(bookId, pageId) {
    const url = getPageUrl(bookId, pageId);

    return new Promise((resolve, reject) => {
	http.request(url, function(response) {                                        
	    var data = new Stream();                                                    

	    if (response.statusCode === 404) {
		return resolve({ pageId, status: 'error', reason: 'notFound' })
	    } else if (response.statusCode !== 200)
		return resolve({ pageId, status: 'error', reason: 'unknown', err });
	    else {
		response.on('data', function(chunk) {                                       
		    data.push(chunk);                                                         
		});                                                                         

		response.on('end', function() {                                             
		    resolve({ pageId, status: 'ok', body: data.read() });
		});                                                                         
	    }
	}).end();
    });
}

function getPageUrl(bookId, pageId) {
    const url = pathTemplate
	.replace('{BookId}', bookId)
    	.replace('{PageId}', pageId);
    return url;
}

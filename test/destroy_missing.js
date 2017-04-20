var fs = require ('fs');
var net = require('net');
var join = require('path').join;
var file = join(__dirname, 'fixtures','all_npm.json');
var JSONStream = require('../');


var server = net.createServer(function(connection) {
    var parser = JSONStream.parse([]);
    parser.on('end', function() {
        console.log('close')
        console.error('PASSED');
        server.close();
    });
    connection.pipe(parser);
    var n = 4
    connection.on('data', function () {
      if(--n) return
      connection.end();
    })
});
server.listen(9999);


var client = net.connect({ port : 9999 }, function() {
    fs.createReadStream(file).pipe(client).on('data', console.log) //.resume();
});

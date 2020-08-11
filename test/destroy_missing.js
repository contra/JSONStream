var fs = require("fs");
var net = require("net");
var join = require("path").join;
var file = join(__dirname, "fixtures", "all_npm.json");
var JSONStream = require("../");

var server = net.createServer(function (connection) {
  var parser = JSONStream.parse([]);
  parser.on("finish", function () {
    console.log("finish");
    console.error("PASSED");
    server.close();
  });
  parser.on("error", function (err) {
    console.log("Parser error as expected: " + err.message);
  });
  connection.pipe(parser);
  connection.on("data", function () {
    connection.end();
  });
});

server.listen(() => {
  var port = server.address().port;

  console.log("Listening on port " + port);
  var client = net.connect({ port: port }, function () {
    fs.createReadStream(file).pipe(client).on("data", console.log); //.resume();
  });
});

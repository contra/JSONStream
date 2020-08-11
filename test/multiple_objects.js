var fs = require("fs");
var net = require("net");
var join = require("path").join;
var file = join(__dirname, "fixtures", "all_npm.json");
var it = require("it-is");
var JSONStream = require("../");

var str = fs.readFileSync(file);

var datas = {};

var server = net.createServer(function (client) {
  var data_calls = 0;
  var parser = JSONStream.parse(["rows", true, "key"]);
  parser.on("data", function (data) {
    ++data_calls;
    datas[data] = (datas[data] || 0) + 1;
    it(data).typeof("string");
  });

  parser.on("finish", function () {
    console.log("END");
    var min = Infinity;
    for (var d in datas) min = min > datas[d] ? datas[d] : min;
    it(min).equal(3);
    server.close();
  });
  client.pipe(parser);
});

server.listen(() => {
  var port = server.address().port;

  console.log("Listening on port " + port);
  var client = net.connect({ port: port }, function () {
    var msgs = str + " " + str + "\n\n" + str;
    client.end(msgs);
  });
});

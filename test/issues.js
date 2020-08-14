var JSONStream = require("../");
var test = require("tape");

test("#66", function (t) {
  var error = 0;
  var stream = JSONStream.parse()
    .on("error", function (err) {
      t.ok(err, "error emitted: " + err.message + "\n" + err.stack);
      error++;
    })
    .on("finish", function () {
      t.ok(
        error === 1,
        "expect error to be called twice ('Invalid JSON'): " +
          error
      );
      t.end();
    });
  stream.write('["foo":bar[');
  stream.end();
});

test("#112 should allow aborting after first error", function (t) {
  var error = 0;
  var stream = JSONStream.parse()
    .on("error", function (err) {
      t.ok(err, "error emitted: " + err.message + "\n" + err.stack);
      error++;
      stream.destroy();
    })
    .on("finish", function () {
      t.ok(error === 1, "expect error to be called once: " + error);
      t.end();
    });
  stream.write('["foo":bar[');
  stream.end();
});

test('#112 "Incomplete JSON" error is emitted', function (t) {
  var stream = JSONStream.parse().on("error", function (err) {
    t.ok("error emitted: " + err.message);
    t.end();
  });

  stream.write('{"rows":[{"id":"id-1","name":"Name A"},{"id":"id-2","name":"');
  stream.end();
});

test('#112 "Incomplete JSON" error is emitted with different JSON', function (t) {
  var stream = JSONStream.parse().on("error", function (err) {
    t.ok("error emitted: " + err.message);
    t.end();
  });

  stream.write('{"rows":[{"id":"id-1","name":"Name A"}'); // I changed the incomplete JSON
  stream.end();
});

test("#81 - failure to parse nested objects", function (t) {
  var stream = JSONStream.parse(".bar.foo")
    .on("error", function (err) {
      t.error(err);
    })
    .on("finish", function () {
      t.end();
    });

  stream.write('{"bar":{"foo":"baz"}}');
  stream.end();
});

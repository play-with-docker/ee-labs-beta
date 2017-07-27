var http = require('http'),
    connect = require('connect'),
    harmon = require('harmon'),
    fs = require('fs'),
    through = require('through'),
    httpProxy = require('http-proxy');


var style = fs.readFileSync('styles.html')

var selects = [];

var body = {};
body.query = 'body';
body.func = function (node) {
  var node = node.createStream();
  node.pipe(through(null, function(){this.queue('<script>var tld = window.location.host.split(".").slice(-2).join("."); document.domain=tld</script>'); this.queue(null)})).pipe(node);
}

var head = {};
head.query = 'head';
head.func = function (node) {
  var node = node.createStream();
  node.pipe(through(null, function(){this.queue(style); this.queue(null)})).pipe(node);
}

selects.push(body, head);

//
// Basic Connect App
//
var app = connect();

var proxy = httpProxy.createProxyServer({});

app.use(harmon([], selects));

app.use(function (req, res) {
   proxy.web(req, res, {target: 'https://localhost:443', secure: false});
});

var server = http.createServer(app);

server.on('upgrade', function (req, socket, head) {
  proxy.ws(req, socket,head, {target: 'wss://localhost:443', secure: false});
});
server.listen(8443);

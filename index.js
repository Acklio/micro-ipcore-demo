const express = require("express");
const app = express();
app.use(express.json());
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
let request = require("request");
const io = new Server(server);
app.use(express.static("public"));

// use for UDP
const dgram = require("dgram");
const socket = dgram.createSocket("udp4");

socket.on("listening", () => {
	let addr = socket.address();
	console.log(`Listening for UDP packets at ${addr.address}:${addr.port}`);
});

socket.on("error", (err) => {
	console.error(`UDP error: ${err.stack}`);
});

function parseSyslogMessage(msg, token) {
	firstIndex = msg.indexOf(token + "=");
	if (firstIndex > 0) {
		if (msg.charAt(firstIndex + token.length + 1) == '"') {
			firstIndex += token.length + 2;
			lastIndex = msg.indexOf('"', firstIndex);
		} else {
			firstIndex += token.length + 1;
			lastIndex = msg.indexOf(" ", firstIndex);
			if (lastIndex < 0) lastIndex = msg.length - 1;
		}
		return msg.substring(firstIndex, lastIndex);
	} else {
		return "";
	}
}

function parseUDPMessage(msg) {
	var checkedMsg = parseSyslogMessage(msg, "msg");
	if (checkedMsg === "rule values") {
		return {
			msg: parseSyslogMessage(msg, "msg"),
			classifier_value: parseSyslogMessage(msg, "classifier_value"),
			field: parseSyslogMessage(msg, "field"),
			mo_value: parseSyslogMessage(msg, "mo_name"),
			target_value: parseSyslogMessage(msg, "target_value"),
		};
	} else {
		return {
			msg: parseSyslogMessage(msg, "msg"),
			data: parseSyslogMessage(msg, "data"),
			device: parseSyslogMessage(msg, "device"),
			organization: parseSyslogMessage(msg, "organization"),
			remote: parseSyslogMessage(msg, "remote"),
		};
	}
}
// micro-ipcore send log to this port
// in this demo, both micro-ipcore (device and server) send log to this port
socket.on("message", (msg, info) => {
	// console.log(parseUDPMessage(msg.toString()));
	io.emit("micro-ipcore-log", parseUDPMessage(msg.toString()));
});

app.get("/", (req, res) => {
	res.sendFile(__dirname + "/index.html");
});

app.post("/webhook_server", (req, res) => {
	console.log("receive a message from server", req.body);
	io.emit("server_packet", req.body);
	res.send("OK");
});

app.post("/webhook_device", (req, res) => {
	console.log("receive a message from device", req.body);
	io.emit("device_packet", req.body);
	res.send("OK");
});

io.on("connection", (socket) => {
	console.log("a user connected");
	socket.on("disconnect", () => {
		console.log("user disconnected");
	});

	socket.on("device", (msg) => {
		console.log("Server send a message to a device: " + msg);
		// To avoid CORS problem, we send POST request from NodeJs
		request.post(
			{
				url: process.env.MICRO_IPCORE_CLOUD + "/webhook/ip-packet",
				json: msg,
			},
			function (error, response, body) {
				// console.log(error);
				// console.log(response);
				// console.log(body);
			}
		);
	});
	socket.on("server", (msg) => {
		console.log("Device send a message to the server: " + msg);
		// To avoid CORS problem, we send POST request from NodeJs
		request.post(
			{
				url: process.env.MICRO_IPCORE_DEVICE + "/webhook/ip-packet",
				json: msg,
			},
			function (error, response, body) {
				// console.log(error);
				// console.log(response);
				// console.log(body);
			}
		);
	});
});

server.listen(3000, () => {
	console.log("listening on *:3000");
});

socket.bind(3001);

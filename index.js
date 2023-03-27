const express = require("express");
const app = express();
app.use(express.json());
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
let request = require("request");
const io = new Server(server);
app.use(express.static("public"));

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
				url: "http://localhost:5684/webhook/ip-packet",
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
				url: "http://localhost:5683/webhook/ip-packet",
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

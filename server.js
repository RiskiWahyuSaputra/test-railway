const http = require("http");

const server = http.createServer((req, res) => {
  res.end("Railway berhasil jalan 🚀");
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log("Server jalan di port " + PORT);
});

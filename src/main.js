require("dotenv").config();
const express = require("express");
const path = require("path");
const connectDB = require("./db/db");
const tweetRouter = require("./routers/router");
const cors = require("cors");
const app = express();

app.use(
  cors({
    origin: "https://www.sparklens.xyz",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.use("/downloads", express.static("src/downloads"));

connectDB();

app.use("/api/tweets", tweetRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server http://localhost:${PORT} da ishlamoqda`);
});

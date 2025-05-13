const express = require("express");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));

app.post("/export", async (req, res) => {
  try {
    const { base64Image, width, height, duration, filename } = req.body;

    if (!base64Image || !width || !height || !duration) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const imagePath = path.join(__dirname, "input.png");
    const outputPath = path.join(__dirname, filename || "output.mp4");

    // Decode base64 image to file
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    fs.writeFileSync(imagePath, Buffer.from(base64Data, "base64"));

    // Create ffmpeg command to tile and scroll the image
    const loopWidth = width * 2;
    const cmd = `ffmpeg -loop 1 -i input.png -filter_complex "[0:v]tile=2x1,scale=${loopWidth}:${height},scroll=horizontal:dx=1:dy=0:wrap=1:duration=${duration}[v]" -map "[v]" -t ${duration} -pix_fmt yuv420p -y ${outputPath}`;

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error("FFmpeg error:", error);
        return res.status(500).send("Error generating video");
      }

      const fileStream = fs.createReadStream(outputPath);
      res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
      res.setHeader("Content-Type", "video/mp4");
      fileStream.pipe(res);
    });
  } catch (err) {
    console.error("Export error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/", (req, res) => {
  res.send("Ribbon Export API is running");
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

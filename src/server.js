import bodyParser from "body-parser";
import cors from "cors";
import morgan from "morgan";
import express from "express";
import helmet from "helmet";
import { google } from "googleapis";
import fs from "fs";
import { configDotenv } from "dotenv";
import multer from "multer";

const app = express();
const env = configDotenv();
const port = env.parsed.PORT;

app.use(express.json());
app.use(bodyParser.json());
app.use(cors({ origin: "http://localhost:5173" }));
app.use(helmet());
app.use(morgan("dev"));

const upload = multer({ dest: "uploads/" });

// const drive = google.drive("v3");
// Endpoint pro nahrávání souboru
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const key = JSON.parse(env.parsed.GOOGLE_SERVICE_ACCOUNT_KEY);
    const folderID = env.parsed.FILE_ID;

    const filePath = req.file.path;

    // Metadata pro soubor
    const fileMetadata = {
      name: req.file.originalname,
      parents: [folderID], // Zde vložte ID vaší složky "models"
    };

    // Ověření autentizace
    const auth = new google.auth.GoogleAuth({
      credentials: key,
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });

    const driveService = google.drive({ version: "v3", auth });

    // Média souboru
    const media = {
      mimeType: req.file.mimetype,
      body: fs.createReadStream(filePath),
    };

    // Nahrání souboru na Google Drive
    const response = await driveService.files.create({
      resource: fileMetadata,
      media: media,
      fields: "id, webViewLink",
    });

    // Odstranění dočasného souboru
    fs.unlinkSync(filePath);

    // Odeslat odpověď s ID souboru a odkazem
    res.send({ fileId: response.data.id, link: response.data.webViewLink });
  } catch (error) {
    console.error("Chyba při nahrávání na Google Drive:", error);
    res.status(500).send("Nahrání selhalo");
  }
});

app.listen(port, () => {
  console.log("App is live on port " + port);
});

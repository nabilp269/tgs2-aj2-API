import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import fetch from 'node-fetch';
import { GoogleGenAI } from '@google/genai';

const app = express();
const upload = multer({ dest: 'uploads/' });
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const GEMINI_MODEL = "gemini-2.5-flash";

app.use(express.json());

async function imageToGenerativePart(imagePath) {
  const imageBuffer = await fs.readFile(imagePath);
  return {
    inlineData: {
      data: imageBuffer.toString("base64"),
      mimeType: "image/jpeg"
    }
  };
}

async function imageUrlToGenerativePart(imageUrl) {
  const response = await fetch(imageUrl);
  const imageBuffer = await response.buffer();
  return {
    inlineData: {
      data: imageBuffer.toString("base64"),
      mimeType: "image/jpeg"
    }
  };
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server ready on http://localhost:${PORT}`));

// Prompt teks saja
app.post('/generate-text', async (req, res) => {
  try {
    const { prompt } = req.body;
    const resp = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt
    });
    res.json({ result: resp.text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Prompt gambar (upload file)
app.post('/generate-image-text', upload.single('image'), async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }
    const imagePart = await imageToGenerativePart(req.file.path);
    const contents = [
      {
        role: "user",
        parts: [imagePart]
      }
    ];
    // Jika ada prompt teks, tambahkan ke parts
    if (prompt) {
      contents[0].parts.push({ text: prompt });
    }
    const resp = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents
    });
    res.json({ result: resp.text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Prompt gambar (dari URL)
app.post('/generate-image-from-url', async (req, res) => {
  try {
    const { imageUrl, prompt } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: "No imageUrl provided" });
    }
    const imagePart = await imageUrlToGenerativePart(imageUrl);
    const contents = [
      {
        role: "user",
        parts: [imagePart]
      }
    ];
    // Jika ada prompt teks, tambahkan ke parts
    if (prompt) {
      contents[0].parts.push({ text: prompt });
    }
    const resp = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents
    });
    res.json({ result: resp.text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
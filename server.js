import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'dist')));

// API routes
app.get('/api/gemini-token', (req, res) => {
  const token = process.env.GEMINI_API_KEY;
  if (!token) return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });
  res.json({ token });
});

app.get('/api/cloudinary-params', (req, res) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) {
    return res.status(500).json({ error: 'Missing Cloudinary config' });
  }
  res.json({ cloudName, uploadPreset });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(3001, () => console.log('Backend running at http://localhost:3001'));

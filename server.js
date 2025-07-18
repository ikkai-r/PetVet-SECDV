import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(cors()); // So frontend can call this

app.get('/api/gemini-token', (req, res) => {
  const token = process.env.GEMINI_API_KEY;
  if (!token) return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });
  res.json({ token });
});

app.listen(3001, () => console.log('Backend running at http://localhost:3001'));

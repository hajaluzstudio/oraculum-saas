import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

/**
 * POST /api/tts - Proxy para síntese de voz da ElevenLabs (solução para CORS e 405 Method Not Allowed)
 */
app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const { text, voiceId, apiKey } = req.body;
    const key = apiKey || process.env.ELEVENLABS_API_KEY;
    const vId = voiceId || 'pNInz6obpgDQGcFmaJgB';

    if (!key) {
      return res.status(400).json({ error: 'Chave da ElevenLabs não informada.' });
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vId}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': key
      },
      body: JSON.stringify({
        text: text || "Conexão com ElevenLabs validada com sucesso.",
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.8 }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).send(err);
    }

    const buffer = await response.arrayBuffer();
    res.set('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(buffer));
  } catch (error: any) {
    console.error('Erro proxy ElevenLabs:', error);
    res.status(500).json({ error: error.message || 'Erro no Proxy ElevenLabs' });
  }
});

export default app;

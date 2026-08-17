import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

/**
 * POST /api/elevenlabs-tts - Endpoint oficial para síntese de voz ElevenLabs (Proxy Server-to-Server)
 */
app.post('/api/elevenlabs-tts', async (req: Request, res: Response) => {
  try {
    const { text, voiceId, apiKey } = req.body;
    
    // Usa a chave passada pelo painel ou a variável de ambiente
    const key = (apiKey && apiKey.trim()) || process.env.ELEVENLABS_API_KEY;
    const vId = (voiceId && voiceId.trim()) || process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB';

    if (!key) {
      return res.status(400).json({ error: 'API Key da ElevenLabs não configurada.' });
    }

    // Chamada segura Servidor -> Servidor (sem bloqueio de CORS)
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': key
      },
      body: JSON.stringify({
        text: text || "Teste de conexão com a ElevenLabs realizado com sucesso.",
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.85
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).send(errText);
    }

    const audioArrayBuffer = await response.arrayBuffer();
    
    // Devolve o áudio diretamente como MP3 para o navegador tocar
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': String(audioArrayBuffer.byteLength)
    });
    return res.send(Buffer.from(audioArrayBuffer));

  } catch (error: any) {
    console.error('Erro no servidor ElevenLabs:', error);
    return res.status(500).json({ error: error.message || 'Erro no servidor ElevenLabs' });
  }
});

export default app;

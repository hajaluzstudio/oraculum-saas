import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

import clientsRouter from './clients';
import onboardingRouter from './onboarding';
import chatRouter from './chat';
import workflowRouter from './workflow';
import biRouter from './bi';
import creativesRouter from './creatives';
import scriptsRouter from './scripts';
import landingPagesRouter from './landing-pages';
import notificationsRouter from './notifications';
import spyRouter from './spy';
import portalRouter from './portal';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(express.static(path.join(process.cwd(), 'public')));

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    system: 'Plataforma SaaS de Marketing Híbrido ROI-First (Vercel Serverless)',
    geminiSdkConfigured: !!process.env.GEMINI_API_KEY,
    supabaseConfigured: !!process.env.SUPABASE_URL,
    timestamp: new Date().toISOString(),
  });
});

app.use(clientsRouter);
app.use(onboardingRouter);
app.use(chatRouter);
app.use(workflowRouter);
app.use(biRouter);
app.use(creativesRouter);
app.use(scriptsRouter);
app.use(landingPagesRouter);
app.use(notificationsRouter);
app.use(spyRouter);
app.use(portalRouter);

export default app;

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from '../src/services/supabaseClient';
import { loadClientsFromDisk, saveClientsToDisk } from '../src/services/diskStorage';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const DEFAULT_TENANT_ID = 'e4b8a1c9-7d3f-42e1-95a8-2083bf2f9104';

const tenantAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const tenantHeader = req.headers['x-organization-id'] as string;
  (req as any).organizationId = tenantHeader || DEFAULT_TENANT_ID;
  next();
};

app.use(tenantAuthMiddleware);

// GET /api/clients - Lista todos os clientes cadastrados da organização
app.get('/api/clients', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    let dbClients: any[] = [];
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (!error && data) dbClients = data;
    } catch (e) {
      console.warn('[Vercel API] Supabase fallback para lista de clientes.');
    }

    const localClients = loadClientsFromDisk();
    const tenantLocalClients = localClients.filter(c => c.organization_id === organizationId || !c.organization_id);
    const combined = [...dbClients];
    
    tenantLocalClients.forEach(lc => {
      if (!combined.some(c => c.id === lc.id)) {
        combined.unshift(lc);
      }
    });

    const finalClients = combined.length > 0 ? combined : localClients;

    return res.json({ success: true, data: finalClients });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao listar clientes.' });
  }
});

// POST /api/clients - Cadastra um novo cliente
app.post('/api/clients', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { name, niche, sanitized_history, website, previous_agency_notes } = req.body;

    if (!name || !niche) {
      return res.status(400).json({ error: 'Nome e Nicho do cliente são obrigatórios.' });
    }

    let clientRecord: any = null;
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([
          {
            organization_id: organizationId,
            name,
            niche,
            status: 'active',
            website: website || null,
            previous_agency_notes: sanitized_history || previous_agency_notes || null,
          }
        ])
        .select()
        .single();

      if (!error && data) clientRecord = data;
    } catch (e) {
      console.warn('[Vercel API] Supabase fallback na gravação de cliente.');
    }

    if (!clientRecord) {
      clientRecord = {
        id: 'client_' + Date.now(),
        organization_id: organizationId,
        name,
        niche,
        status: 'active',
        website: website || null,
        previous_agency_notes: sanitized_history || previous_agency_notes || null,
        created_at: new Date().toISOString(),
      };
    }

    const localClients = loadClientsFromDisk();
    if (!localClients.some(c => c.id === clientRecord.id)) {
      localClients.unshift(clientRecord);
      saveClientsToDisk(localClients);
    }

    return res.status(201).json({ success: true, message: 'Cliente salvo com sucesso!', client: clientRecord });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao salvar cliente.' });
  }
});

// DELETE /api/clients/:id - Remove cliente
app.delete('/api/clients/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { id } = req.params;

    try {
      await supabase
        .from('clients')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);
    } catch (e) {}

    let localClients = loadClientsFromDisk();
    localClients = localClients.filter(c => c.id !== id);
    saveClientsToDisk(localClients);

    return res.json({ success: true, message: 'Cliente removido com sucesso!' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao excluir cliente.' });
  }
});

export default app;

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

// Helper function to pack extra fields into the notes string
const packExtraFields = (notes: string, extraFields: any) => {
  return JSON.stringify({
    actual_notes: notes || '',
    ...extraFields
  });
};

// Helper function to unpack extra fields from the notes string
const unpackExtraFields = (clientRecord: any) => {
  if (clientRecord.previous_agency_notes && clientRecord.previous_agency_notes.startsWith('{')) {
    try {
      const parsed = JSON.parse(clientRecord.previous_agency_notes);
      const { actual_notes, ...extras } = parsed;
      clientRecord.previous_agency_notes = actual_notes;
      Object.assign(clientRecord, extras);
    } catch (e) {}
  }
  return clientRecord;
};

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

      if (!error && data) {
        dbClients = data.map(unpackExtraFields);
      }
    } catch (e) {
      console.warn('[Vercel API] Supabase fallback para lista de clientes.');
    }

    const localClients = loadClientsFromDisk();
    const tenantLocalClients = localClients.filter(c => c.organization_id === organizationId || !c.organization_id);
    const combined = [...dbClients];
    
    // Mescla dados extras que só existem no disco
    combined.forEach((dbClient, idx) => {
      const localMatch = tenantLocalClients.find(lc => lc.id === dbClient.id);
      if (localMatch) {
        combined[idx] = { ...localMatch, ...dbClient };
      }
    });

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
    const { name, niche, sanitized_history, website, previous_agency_notes, ...extraFields } = req.body;

    if (!name || !niche) {
      return res.status(400).json({ error: 'Nome e Nicho do cliente são obrigatórios.' });
    }

    const packedNotes = packExtraFields(sanitized_history || previous_agency_notes, extraFields);

    // Payload alinhado com o schema real do Supabase
    const insertPayload = {
      organization_id: organizationId,
      name,
      niche,
      status: 'active',
      website: website || null,
      previous_agency_notes: packedNotes,
    };

    console.log('[api/clients] Inserindo cliente:', JSON.stringify(insertPayload));

    let clientRecord: any = null;
    let insertError: any = null;
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([insertPayload])
        .select()
        .single();

      if (!error && data) {
        clientRecord = unpackExtraFields(data);
      } else {
        insertError = error;
        console.error('[api/clients] Supabase erro:', error?.message, error?.details);
      }
    } catch (e: any) {
      insertError = e;
      console.warn('[api/clients] Exceção Supabase:', e.message);
    }

    if (clientRecord) {
      clientRecord = { ...clientRecord, ...extraFields };
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
        ...extraFields
      };
      return res.status(500).json({
        error: insertError?.message || 'Erro desconhecido ao salvar no Supabase.',
        details: insertError?.details || null
      });
    }

    const localClients = loadClientsFromDisk();
    if (!localClients.some((c: any) => c.id === clientRecord.id)) {
      localClients.unshift(clientRecord);
      saveClientsToDisk(localClients);
    }

    return res.status(201).json({ success: true, message: 'Cliente salvo com sucesso!', client: clientRecord });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao salvar cliente.' });
  }
});

// PUT /api/clients/:id - Atualiza um cliente existente
app.put('/api/clients/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { id } = req.params;
    
    // Extrai os campos que vão para o Supabase
    const { name, niche, sanitized_history, website, previous_agency_notes, ...extraFields } = req.body;

    const packedNotes = packExtraFields(sanitized_history || previous_agency_notes, extraFields);

    const updatePayload = {
      name,
      niche,
      website: website || null,
      previous_agency_notes: packedNotes,
    };

    let clientRecord: any = null;
    let updateError: any = null;

    try {
      const { data, error } = await supabase
        .from('clients')
        .update(updatePayload)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (!error && data) {
        clientRecord = unpackExtraFields(data);
      } else {
        updateError = error;
      }
    } catch (e: any) {
      updateError = e;
    }

    if (!clientRecord) {
      return res.status(500).json({ error: updateError?.message || 'Erro desconhecido ao atualizar no Supabase.' });
    }

    // Atualiza disco local COM OS CAMPOS EXTRAS QUE NÃO EXISTEM NO SUPABASE
    const localClients = loadClientsFromDisk();
    const index = localClients.findIndex((c: any) => c.id === id);
    if (index >= 0) {
      localClients[index] = { ...localClients[index], ...updatePayload, ...extraFields };
      saveClientsToDisk(localClients);
    }

    return res.status(200).json({ success: true, message: 'Cliente atualizado com sucesso!', client: clientRecord });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao atualizar cliente.' });
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

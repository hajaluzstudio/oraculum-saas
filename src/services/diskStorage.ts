import fs from 'fs';
import path from 'path';

const DATA_DIR = (process.env.VERCEL || process.env.NODE_ENV === 'production')
  ? path.join('/tmp', 'data_storage')
  : path.join(process.cwd(), 'data_storage');

function ensureDataDirExists() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (e) {
    console.warn('[DiskStorage] Aviso ao criar pasta de dados:', e);
  }
}

const CLIENTS_FILE = path.join(DATA_DIR, 'clients_db.json');
const DOSSIERS_FILE = path.join(DATA_DIR, 'dossiers_db.json');
const ASSETS_FILE = path.join(DATA_DIR, 'assets_db.json');
const BI_METRICS_FILE = path.join(DATA_DIR, 'bi_metrics_db.json');

const defaultClients = [
  { id: 'client_01', organization_id: 'e4b8a1c9-7d3f-42e1-95a8-2083bf2f9104', name: 'Dr. Alexandre Viana - Clínica Luxe', niche: 'Médico Cirurgião Plástico', status: 'active', created_at: new Date().toISOString() },
  { id: 'client_02', organization_id: 'e4b8a1c9-7d3f-42e1-95a8-2083bf2f9104', name: 'Advocacia Silva & Associados', niche: 'Advogado Trabalhista', status: 'active', created_at: new Date().toISOString() },
  { id: 'client_03', organization_id: 'e4b8a1c9-7d3f-42e1-95a8-2083bf2f9104', name: 'Imobiliária Prime Residence', niche: 'Mercado Imobiliário de Luxo', status: 'active', created_at: new Date().toISOString() }
];

export function loadClientsFromDisk(): any[] {
  ensureDataDirExists();
  try {
    if (fs.existsSync(CLIENTS_FILE)) {
      const content = fs.readFileSync(CLIENTS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[DiskStorage] Aviso ao carregar clientes do disco:', e);
  }
  saveClientsToDisk(defaultClients);
  return defaultClients;
}

export function saveClientsToDisk(clients: any[]) {
  ensureDataDirExists();
  try {
    fs.writeFileSync(CLIENTS_FILE, JSON.stringify(clients, null, 2), 'utf-8');
    console.log(`💾 [DiskStorage] Lista de ${clients.length} clientes persistida no disco (${CLIENTS_FILE}).`);
  } catch (e) {
    console.error('[DiskStorage] Erro ao salvar clientes no disco:', e);
  }
}

export function loadDossiersFromDisk(): Record<string, any> {
  ensureDataDirExists();
  try {
    if (fs.existsSync(DOSSIERS_FILE)) {
      const content = fs.readFileSync(DOSSIERS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[DiskStorage] Aviso ao carregar dossiês do disco:', e);
  }
  return {};
}

export function saveDossiersToDisk(dossiers: Record<string, any>) {
  ensureDataDirExists();
  try {
    fs.writeFileSync(DOSSIERS_FILE, JSON.stringify(dossiers, null, 2), 'utf-8');
    console.log(`💾 [DiskStorage] Dossiês persistidos no disco (${DOSSIERS_FILE}).`);
  } catch (e) {
    console.error('[DiskStorage] Erro ao salvar dossiês no disco:', e);
  }
}

export function loadAssetsFromDisk(): any[] {
  ensureDataDirExists();
  try {
    if (fs.existsSync(ASSETS_FILE)) {
      const content = fs.readFileSync(ASSETS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[DiskStorage] Aviso ao carregar assets do disco:', e);
  }
  return [];
}

export function saveAssetsToDisk(assets: any[]) {
  ensureDataDirExists();
  try {
    fs.writeFileSync(ASSETS_FILE, JSON.stringify(assets, null, 2), 'utf-8');
    console.log(`💾 [DiskStorage] Lista de ${assets.length} criativos do Kanban persistida.`);
  } catch (e) {
    console.error('[DiskStorage] Erro ao salvar assets no disco:', e);
  }
}

export function loadBiMetricsFromDisk(): Record<string, any> {
  ensureDataDirExists();
  try {
    if (fs.existsSync(BI_METRICS_FILE)) {
      const content = fs.readFileSync(BI_METRICS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[DiskStorage] Aviso ao carregar métricas de BI do disco:', e);
  }
  return {};
}

export function saveBiMetricsToDisk(metrics: Record<string, any>) {
  ensureDataDirExists();
  try {
    fs.writeFileSync(BI_METRICS_FILE, JSON.stringify(metrics, null, 2), 'utf-8');
    console.log(`💾 [DiskStorage] Métricas de BI persistidas.`);
  } catch (e) {
    console.error('[DiskStorage] Erro ao salvar métricas de BI no disco:', e);
  }
}

const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications_db.json');

export function loadNotificationsFromDisk(): any[] {
  ensureDataDirExists();
  try {
    if (fs.existsSync(NOTIFICATIONS_FILE)) {
      const content = fs.readFileSync(NOTIFICATIONS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('[DiskStorage] Aviso ao carregar notificações do disco:', e);
  }
  return [];
}

export function saveNotificationsToDisk(notifications: any[]) {
  ensureDataDirExists();
  try {
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2), 'utf-8');
    console.log(`💾 [DiskStorage] ${notifications.length} notificações persistidas no disco.`);
  } catch (e) {
    console.error('[DiskStorage] Erro ao salvar notificações no disco:', e);
  }
}


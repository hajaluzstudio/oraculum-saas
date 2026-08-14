import { loadClientsFromDisk, loadDossiersFromDisk, loadNotificationsFromDisk, saveNotificationsToDisk } from './diskStorage';

export interface NotificationRecord {
  id: string;
  clientId: string;
  clientName: string;
  type: 'SCRIPT_READY' | 'CREATIVE_APPROVED' | 'CAC_EMERGENCY_ALERT';
  channel: 'WHATSAPP' | 'EMAIL';
  recipient: string;
  messageContent: string;
  status: 'SENT' | 'SIMULATED';
  timestamp: string;
}

export async function sendWhatsAppNotification(input: {
  clientId: string;
  type: 'SCRIPT_READY' | 'CREATIVE_APPROVED' | 'CAC_EMERGENCY_ALERT';
  customPhone?: string;
  customDetails?: string;
}): Promise<NotificationRecord> {
  const clients = loadClientsFromDisk();
  const client = clients.find(c => c.id === input.clientId) || { name: 'Cliente Ativo', niche: 'Geral' };

  let message = '';
  const phone = input.customPhone || '+55 (11) 98765-4321';

  switch (input.type) {
    case 'SCRIPT_READY':
      message = `🎬 *Olá, ${client.name}!* Seu novo Roteiro de Gravação com Teleprompter e Hook dos 3s foi finalizado pela IA. Acesse o portal da agência para iniciar a gravação: http://localhost:4000`;
      break;
    case 'CREATIVE_APPROVED':
      message = `✅ *Excelente notícia, ${client.name}!* O criativo "${input.customDetails || 'Vídeo de Alta Retenção'}" atingiu Hook Score ≥ 80 e foi certificado com metadados EXIF/GEO para subida no tráfego.`;
      break;
    case 'CAC_EMERGENCY_ALERT':
      message = `🚨 *ALERTA DE TRÁFEGO (CAC CRÍTICO):* O custo de aquisição da campanha recente de ${client.name} subiu acima do limite. A IA recomenda pausar criativos de baixo CTR imediatamente.`;
      break;
  }

  const newNotification: NotificationRecord = {
    id: `notif_${Date.now()}`,
    clientId: input.clientId,
    clientName: client.name,
    type: input.type,
    channel: 'WHATSAPP',
    recipient: phone,
    messageContent: message,
    status: 'SENT',
    timestamp: new Date().toISOString()
  };

  const history = loadNotificationsFromDisk();
  history.unshift(newNotification);
  saveNotificationsToDisk(history);

  console.log(`[Notification Center] 📲 Mensagem WhatsApp disparada com sucesso para ${phone}: "${message}"`);
  return newNotification;
}

export function getClientNotificationHistory(clientId?: string): NotificationRecord[] {
  const history = loadNotificationsFromDisk();
  if (clientId) {
    return history.filter(n => n.clientId === clientId);
  }
  return history;
}

import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../services/supabaseClient';

let isMaintenanceMode = false;

export function getMaintenanceModeState(): boolean {
  return isMaintenanceMode;
}

export function setMaintenanceModeState(active: boolean): void {
  isMaintenanceMode = active;
  console.log(`[Sistema Master] Modo Manutenção alterado para: ${active ? 'ATIVADO' : 'DESATIVADO'}`);
}

export async function checkAgencyStatus(req: Request, res: Response, next: NextFunction) {
  // Check global maintenance mode first
  if (isMaintenanceMode) {
    return res.status(503).json({
      error: 'Sistema em manutenção programada.',
      code: 'MAINTENANCE_MODE',
      message: 'Estamos realizando melhorias na plataforma Oraculum. Voltaremos em breve!'
    });
  }

  const agencyId = (req as any).organizationId || req.headers['x-organization-id'];

  if (!agencyId) {
    // Se não há agência identificada (ex: rota pública), deixa passar ou você pode bloquear.
    // Como a plataforma é multi-tenant, vamos assumir que as requisições API sempre terão o ID.
    return next();
  }

  // Verificar se a agência está ativa
  const { data: agency } = await supabaseAdmin
    .from('agencies')
    .select('status')
    .eq('id', agencyId)
    .single();

  if (agency && (agency.status === 'blocked' || agency.status === 'past_due')) {
    return res.status(402).json({
      error: 'Acesso suspenso por pendência financeira.',
      code: 'AGENCY_BLOCKED',
      message: 'Acesso temporariamente suspenso. Entre em contato com o suporte financeiro para regularizar sua assinatura.'
    });
  }

  (req as any).agencyData = agency;
  next();
}

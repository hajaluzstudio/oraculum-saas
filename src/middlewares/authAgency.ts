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
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (profile?.role === 'super_admin') {
          return next(); // Super Admin bypasses maintenance mode
        }
      }
    }
    return res.status(503).json({
      error: 'Sistema em manutenção programada.',
      code: 'MAINTENANCE_MODE',
      message: 'Estamos realizando melhorias na plataforma Oraculum. Voltaremos em breve!'
    });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Não autorizado.' });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) return res.status(401).json({ error: 'Sessão inválida.' });

  // Buscar perfil e agência do usuário
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*, agencies(*)')
    .eq('id', user.id)
    .single();

  if (!profile) return res.status(403).json({ error: 'Perfil não encontrado.' });

  // Se for o dono do sistema (Super Admin), tem passe livre
  if (profile.role === 'super_admin') {
    (req as any).user = profile;
    return next();
  }

  // Verificar se a agência está ativa
  const agency = (profile as any).agencies;
  if (!agency || agency.status === 'blocked' || agency.status === 'past_due') {
    return res.status(402).json({
      error: 'Acesso suspenso por pendência financeira.',
      code: 'AGENCY_BLOCKED',
      message: 'Acesso temporariamente suspenso. Entre em contato com o suporte financeiro para regularizar sua assinatura.'
    });
  }

  (req as any).user = profile;
  (req as any).agencyId = profile.agency_id;
  next();
}

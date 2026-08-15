import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../services/supabaseClient';

export async function checkAgencyStatus(req: Request, res: Response, next: NextFunction) {
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
      message: 'Entre em contato com o suporte/financeiro para reativar seu acesso.'
    });
  }

  (req as any).user = profile;
  (req as any).agencyId = profile.agency_id;
  next();
}

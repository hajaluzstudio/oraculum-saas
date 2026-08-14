export type UserRole = 'ADMIN_AGENCIA' | 'GESTOR_TRAFEGO' | 'VIDEOMAKER_DESIGNER' | 'CLIENTE_FINAL';

export interface RolePermissions {
  canEditDossier: boolean;
  canViewBiFinance: boolean;
  canGenerateScripts: boolean;
  canApproveKanbanCards: boolean;
  canManageApiKeys: boolean;
  canDeleteClients: boolean;
  isWhiteLabelPortal: boolean;
}

export interface WhiteLabelAgencyConfig {
  agencyName: string;
  agencyLogoUrl: string;
  primaryColor: string;
  customDomain: string;
  supportEmail: string;
}

export const defaultWhiteLabelConfig: WhiteLabelAgencyConfig = {
  agencyName: 'Haja Luz Growth Studio',
  agencyLogoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&q=80',
  primaryColor: '#00F2FE',
  customDomain: 'app.hajaluzagency.com',
  supportEmail: 'contato@hajaluzagency.com'
};

export function getRolePermissions(role: UserRole): RolePermissions {
  switch (role) {
    case 'ADMIN_AGENCIA':
      return {
        canEditDossier: true,
        canViewBiFinance: true,
        canGenerateScripts: true,
        canApproveKanbanCards: true,
        canManageApiKeys: true,
        canDeleteClients: true,
        isWhiteLabelPortal: false,
      };
    case 'GESTOR_TRAFEGO':
      return {
        canEditDossier: true,
        canViewBiFinance: true,
        canGenerateScripts: true,
        canApproveKanbanCards: true,
        canManageApiKeys: true,
        canDeleteClients: false,
        isWhiteLabelPortal: false,
      };
    case 'VIDEOMAKER_DESIGNER':
      return {
        canEditDossier: false,
        canViewBiFinance: false,
        canGenerateScripts: true,
        canApproveKanbanCards: true,
        canManageApiKeys: false,
        canDeleteClients: false,
        isWhiteLabelPortal: false,
      };
    case 'CLIENTE_FINAL':
      return {
        canEditDossier: false,
        canViewBiFinance: true, // Vê apenas o seu ROI e conversões
        canGenerateScripts: false,
        canApproveKanbanCards: true, // Aprova peças finais
        canManageApiKeys: false,
        canDeleteClients: false,
        isWhiteLabelPortal: true,
      };
    default:
      return getRolePermissions('ADMIN_AGENCIA');
  }
}

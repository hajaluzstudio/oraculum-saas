/**
 * RADAR PREDITIVO DE RISCO (Módulo 100% Isolado e Aditivo)
 * Analisa métricas periodicamente e aciona alertas preditivos.
 * Pode injetar ações corretivas diretamente no Kanban via Supabase.
 */

window.addEventListener('DOMContentLoaded', () => {
  const btnRunScan = document.getElementById('btn-run-predictive-scan');
  if (btnRunScan) {
    btnRunScan.addEventListener('click', runPredictiveScanner);
  }

  // Se a aba for ativada, carregamos os alertas
  // Observação: precisaremos escutar um evento ou verificar quando a aba muda se quisermos 
  // carregar sem recarregar a pág, mas o clique no menu tab-predictive já serve.
  document.addEventListener('click', (e) => {
    const itemMenu = e.target.closest('.nav-menu .nav-item, [data-section], [data-tab]');
    if (itemMenu && itemMenu.getAttribute('data-tab') === 'tab-predictive') {
      loadPredictiveAlerts();
    }
  });
});

// 1. O MOTOR DE VARREDURA PREDITIVA (Simulação de Análise BI)
async function runPredictiveScanner() {
  const clientId = window.activeClient?.id || localStorage.getItem('oraculum_active_client_id');
  if (!clientId) {
    alert("Selecione um cliente ativo antes de rodar o scanner preditivo.");
    return;
  }

  const btn = document.getElementById('btn-run-predictive-scan');
  if (btn) {
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Escaneando Vias...';
    btn.disabled = true;
  }

  try {
    if (!window.supabaseClient) throw new Error("Supabase Client não encontrado.");
    
    // Vamos gerar 1 alerta crítico simulado se ainda não houver um ativo.
    const { data: existing } = await window.supabaseClient.from('predictive_alerts')
      .select('*')
      .eq('client_id', clientId)
      .eq('status', 'active');
      
    if (!existing || existing.length === 0) {
      // Regra Mockada 1: Fadiga Criativa (Frequência alta, CTR baixo)
      const mockAlert1 = {
        client_id: clientId,
        alert_type: 'creative_fatigue',
        severity: 'alta',
        title: '⚠️ Fadiga Criativa Detectada',
        description: 'A frequência dos criativos campeões (Top 3) ultrapassou 3.5 nos últimos 7 dias. O CTR médio despencou 24%. Risco iminente de explosão de CPA.',
        metric_snapshot: { frequencia: 3.8, ctr_queda: "24%", cpa_tendencia: "alta" },
        status: 'active'
      };

      // Regra Mockada 2: ROAS caindo
      const mockAlert2 = {
        client_id: clientId,
        alert_type: 'roas_drop',
        severity: 'media',
        title: '📉 Alerta de Queda de ROAS',
        description: 'O ROAS caiu abaixo do breakeven esperado (1.5x) por 3 dias consecutivos. O Custo por Clique (CPC) sofreu um aumento não justificado pela concorrência no leilão.',
        metric_snapshot: { roas_atual: 1.2, roas_meta: 1.5, cpc_aumento: "18%" },
        status: 'active'
      };

      const { data: insertedAlerts, error: insertError } = await window.supabaseClient.from('predictive_alerts').insert([mockAlert1, mockAlert2]).select();
      if (insertError) throw insertError;
      
      if (typeof window.showToast === 'function') window.showToast("Anomalias detectadas pelo Scanner!", "error");

      // ---------------------------------------------------------
      // INTEGRAÇÃO WHATSAPP / WEBHOOK (Disparo Automático de Alta Severidade)
      // ---------------------------------------------------------
      if (insertedAlerts && insertedAlerts.length > 0) {
        for (const alert of insertedAlerts) {
          if (alert.severity === 'alta') {
            const zapMsg = `🚨 *ALERTA PREDITIVO DE ALTO RISCO* 🚨\n\n*Ameaça:* ${alert.title}\n*Detalhes:* ${alert.description}\n\n_Vá ao painel Oraculum imediatamente para despachar a correção para a equipe._`;
            
            try {
              // Buscar membros da agência (Líderes, Gestores de Tráfego, etc)
              const { data: membros } = await window.supabaseClient.from('team_members').select('*');
              let disparou = false;

              if (membros && membros.length > 0) {
                // Notifica gestores ou líderes
                const membrosAlvo = membros.filter(m => m.role === 'Líder / Admin' || m.role.toLowerCase().includes('tráfego') || m.role.toLowerCase().includes('gestor'));
                
                for (const m of (membrosAlvo.length > 0 ? membrosAlvo : membros)) {
                  await fetch('/api/notifications/send-whatsapp', {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ message: zapMsg, type: 'CRITICAL_ALERT', customPhone: m.whatsapp_number })
                  });
                  disparou = true;
                }
              }

              // Fallback se não encontrou time
              if (!disparou) {
                 await fetch('/api/notifications/send-whatsapp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: zapMsg, type: 'CRITICAL_ALERT' })
                 });
              }
              console.log(`WhatsApp disparado para alerta de alta severidade: ${alert.title}`);
            } catch (zapErr) {
              console.error("Erro ao disparar WhatsApp de risco:", zapErr);
            }
          }
        }
      }
      // ---------------------------------------------------------

    } else {
      if (typeof window.showToast === 'function') window.showToast("Escaneamento concluído. Nenhuma anomalia nova encontrada.", "success");
    }
    
    // Recarrega a tela
    await loadPredictiveAlerts();

  } catch (error) {
    console.error("Erro no Scanner Preditivo:", error);
    alert("Falha ao rodar scanner: " + error.message);
  } finally {
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-bolt"></i> Rodar Scanner Preditivo';
      btn.disabled = false;
    }
  }
}

// 2. CARREGAR E RENDERIZAR ALERTAS
async function loadPredictiveAlerts() {
  const container = document.getElementById('predictive-alerts-container');
  if (!container || !window.supabaseClient) return;

  const clientId = window.activeClient?.id || localStorage.getItem('oraculum_active_client_id');
  if (!clientId) {
    container.innerHTML = `<div style="text-align: center; grid-column: 1 / -1; padding: 40px; color: #94A3B8;">Selecione um cliente no topo primeiro.</div>`;
    return;
  }

  container.innerHTML = `<div style="text-align: center; grid-column: 1 / -1; padding: 40px; color: #94A3B8;"><i class="fa-solid fa-spinner fa-spin"></i> Carregando alertas do Radar...</div>`;

  try {
    const { data, error } = await window.supabaseClient.from('predictive_alerts')
      .select('*')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error && error.code !== '42P01') throw error;

    if (!data || data.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; grid-column: 1 / -1; padding: 40px; background: rgba(16, 185, 129, 0.05); border: 1px dashed rgba(16, 185, 129, 0.2); border-radius: 10px; color: #34D399;">
          <i class="fa-solid fa-check-circle" style="font-size: 32px; margin-bottom: 10px;"></i>
          <p>Tudo limpo! Nenhuma anomalia nas campanhas no momento.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    data.forEach(alert => {
      const isHighSeverity = alert.severity === 'alta';
      const colorHex = isHighSeverity ? '#EF4444' : '#F59E0B'; // Vermelho ou Amarelo
      const bgHex = isHighSeverity ? 'rgba(239, 68, 68, 0.05)' : 'rgba(245, 158, 11, 0.05)';
      
      let metricsHtml = '';
      if (alert.metric_snapshot) {
        metricsHtml = `<div style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 6px; font-family: monospace; font-size: 11px; margin: 10px 0; color: #94A3B8;">`;
        for (const [key, val] of Object.entries(alert.metric_snapshot)) {
          metricsHtml += `<div><strong style="color: #CBD5E1;">${key}:</strong> ${val}</div>`;
        }
        metricsHtml += `</div>`;
      }

      const card = document.createElement('div');
      card.style.cssText = `
        background: ${bgHex};
        border: 1px solid rgba(${isHighSeverity ? '239,68,68' : '245,158,11'}, 0.2);
        border-radius: 10px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      `;

      card.innerHTML = `
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <h4 style="color: ${colorHex}; margin: 0; font-size: 14px; font-weight: 700;">${alert.title}</h4>
            <span style="background: ${colorHex}; color: #fff; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; text-transform: uppercase;">
              ${alert.severity}
            </span>
          </div>
          <p style="color: #CBD5E1; font-size: 12px; margin: 0; line-height: 1.4;">${alert.description}</p>
          ${metricsHtml}
          <div style="font-size: 10px; color: #64748B; margin-top: 6px;"><i class="fa-regular fa-clock"></i> Detectado: ${new Date(alert.created_at).toLocaleString()}</div>
        </div>
        <div style="margin-top: 14px; display: flex; gap: 8px;">
          <button onclick="window.dispatchPredictiveToKanban('${alert.id}')" style="flex: 1; background: ${colorHex}; color: white; border: none; border-radius: 6px; padding: 8px; font-size: 12px; font-weight: 600; cursor: pointer;">
            <i class="fa-solid fa-paper-plane"></i> Despachar p/ Kanban
          </button>
          <button onclick="window.ignorePredictiveAlert('${alert.id}')" style="background: transparent; color: #94A3B8; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 8px; font-size: 12px; cursor: pointer;">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      `;
      container.appendChild(card);
    });

  } catch (error) {
    if (error.code === '42P01') {
      container.innerHTML = `<div style="text-align: center; grid-column: 1 / -1; padding: 40px; color: #EF4444;">Tabela 'predictive_alerts' não existe. Por favor, rode o script SQL gerado.</div>`;
    } else {
      container.innerHTML = `<div style="text-align: center; grid-column: 1 / -1; padding: 40px; color: #EF4444;">Erro ao carregar alertas: ${error.message}</div>`;
    }
  }
}

// 3. A PONTE COM O KANBAN (Despacho Seguro Aditivo)
window.dispatchPredictiveToKanban = async function(alertId) {
  if (!window.supabaseClient) return;
  const clientId = window.activeClient?.id || localStorage.getItem('oraculum_active_client_id');

  try {
    const { data: alertData, error: fetchErr } = await window.supabaseClient.from('predictive_alerts').select('*').eq('id', alertId).single();
    if (fetchErr) throw fetchErr;

    const taskTitle = `[Risco Preditivo] ${alertData.title}`;
    const taskDesc = `${alertData.description}\n\n**Métricas de Risco:**\n${JSON.stringify(alertData.metric_snapshot, null, 2)}\n\n_Demanda injetada automaticamente pelo Radar Preditivo._`;
    
    const newTask = {
      client_id: clientId,
      tenant_id: window.activeTenantId || 'admin',
      title: taskTitle,
      description: taskDesc,
      status: 'backlog',
      tags: ['Urgente']
    };

    const { error: insertErr } = await window.supabaseClient.from('kanban_tasks').insert([newTask]);
    if (insertErr) throw insertErr;

    const { error: updateErr } = await window.supabaseClient.from('predictive_alerts').update({ status: 'dispatched' }).eq('id', alertId);
    if (updateErr) throw updateErr;

    if (typeof window.showToast === 'function') window.showToast("Tarefa enviada com sucesso para o Kanban!", "success");
    
    // Atualiza a tela local do Radar
    await loadPredictiveAlerts();

  } catch (error) {
    alert("Erro ao despachar tarefa: " + error.message);
  }
};

window.ignorePredictiveAlert = async function(alertId) {
  if (!confirm("Tem certeza que deseja ignorar este alerta sem resolver?")) return;
  if (!window.supabaseClient) return;

  try {
    const { error } = await window.supabaseClient.from('predictive_alerts').update({ status: 'ignored' }).eq('id', alertId);
    if (error) throw error;
    await loadPredictiveAlerts();
  } catch (err) {
    alert("Erro ao ignorar alerta: " + err.message);
  }
};

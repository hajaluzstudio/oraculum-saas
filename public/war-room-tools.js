document.addEventListener('DOMContentLoaded', () => {
  console.log('[WarRoomTools] Inicializando ferramentas extras da Sala de Operação...');

  // ==========================================
  // 1. DESIGN: Mockup & Safe Zone
  // ==========================================
  const mockupFormat = document.getElementById('mockup-format');
  const mockupFile = document.getElementById('mockup-file');
  const mockupImage = document.getElementById('mockup-image');
  const btnToggleSafezone = document.getElementById('btn-toggle-safezone');
  const safezoneOverlay = document.getElementById('mockup-safezone-overlay');
  const previewContainer = document.getElementById('mockup-preview-container');

  if (mockupFormat && previewContainer) {
    mockupFormat.addEventListener('change', (e) => {
      const format = e.target.value;
      if (format === '9_16') {
        previewContainer.style.aspectRatio = '9/16';
        previewContainer.style.maxWidth = '250px';
      } else if (format === '4_5') {
        previewContainer.style.aspectRatio = '4/5';
        previewContainer.style.maxWidth = '300px';
      } else if (format === '1_1') {
        previewContainer.style.aspectRatio = '1/1';
        previewContainer.style.maxWidth = '350px';
      }
    });
  }

  if (mockupFile && mockupImage) {
    mockupFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          mockupImage.src = e.target.result;
          mockupImage.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (btnToggleSafezone && safezoneOverlay) {
    btnToggleSafezone.addEventListener('click', () => {
      if (safezoneOverlay.style.display === 'none') {
        safezoneOverlay.style.display = 'block';
      } else {
        safezoneOverlay.style.display = 'none';
      }
    });
  }

  // ==========================================
  // 2. DESIGN: Contrast Checker (WCAG)
  // ==========================================
  const colorBg = document.getElementById('color-bg');
  const colorBgHex = document.getElementById('color-bg-hex');
  const colorText = document.getElementById('color-text');
  const colorTextHex = document.getElementById('color-text-hex');
  const contrastPreviewBox = document.getElementById('contrast-preview-box');
  const contrastRatio = document.getElementById('contrast-ratio');
  const contrastStatus = document.getElementById('contrast-status');

  function getLuminance(hex) {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;

    r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function checkContrast() {
    if (!colorBg || !colorText) return;
    const bg = colorBg.value;
    const text = colorText.value;

    colorBgHex.value = bg.toUpperCase();
    colorTextHex.value = text.toUpperCase();
    contrastPreviewBox.style.backgroundColor = bg;
    contrastPreviewBox.style.color = text;
    contrastPreviewBox.style.borderColor = text;

    const lum1 = getLuminance(bg);
    const lum2 = getLuminance(text);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    const ratio = (brightest + 0.05) / (darkest + 0.05);

    contrastRatio.textContent = ratio.toFixed(2) + ' : 1';
    
    if (ratio >= 4.5) {
      contrastStatus.innerHTML = '<i class="fa-solid fa-circle-check"></i> Aprovado (AA)';
      contrastStatus.style.color = '#10B981';
    } else if (ratio >= 3.0) {
      contrastStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Regular (Texto Grande)';
      contrastStatus.style.color = '#F59E0B';
    } else {
      contrastStatus.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Reprovado';
      contrastStatus.style.color = '#EF4444';
    }
  }

  if (colorBg && colorText) {
    colorBg.addEventListener('input', checkContrast);
    colorText.addEventListener('input', checkContrast);
    colorBgHex.addEventListener('input', (e) => {
      if(/^#[0-9A-F]{6}$/i.test(e.target.value)){ colorBg.value = e.target.value; checkContrast(); }
    });
    colorTextHex.addEventListener('input', (e) => {
      if(/^#[0-9A-F]{6}$/i.test(e.target.value)){ colorText.value = e.target.value; checkContrast(); }
    });
    checkContrast();
  }

  // ==========================================
  // 3. TRAFFIC: Simulador CPA/ROAS
  // ==========================================
  const simBudget = document.getElementById('sim-budget');
  const simTicket = document.getElementById('sim-ticket');
  const simConv = document.getElementById('sim-conversion');
  const simRoas = document.getElementById('sim-roas-target');
  
  function calculateTraffic() {
    if(!simBudget) return;
    const budget = parseFloat(simBudget.value) || 0;
    const ticket = parseFloat(simTicket.value) || 0;
    const conv = parseFloat(simConv.value) || 0;
    const roasTarget = parseFloat(simRoas.value) || 0;

    // Breakeven CPA = Ticket
    const cpaBreak = ticket;
    
    // CPL Máximo
    // ROAS = Receita / Custo -> Custo CPA Alvo = Ticket / ROAS
    const cpaTarget = roasTarget > 0 ? (ticket / roasTarget) : 0;
    const cplMax = cpaTarget * (conv / 100);

    // Vendas diárias
    const clicks = cplMax > 0 ? (budget / cplMax) : 0; // Aproximação CPL == CPC se lead = clique direto pra LP (simplificado para e-com/direto)
    // Se for captação, leads gerados:
    const leads = cplMax > 0 ? (budget / cplMax) : 0;
    const sales = leads * (conv / 100);
    const rev = sales * ticket;

    document.getElementById('res-cpl-max').textContent = 'R$ ' + cplMax.toFixed(2).replace('.',',');
    document.getElementById('res-cpa-break').textContent = 'R$ ' + cpaBreak.toFixed(2).replace('.',',');
    document.getElementById('res-revenue').textContent = 'R$ ' + rev.toFixed(2).replace('.',',');
  }

  [simBudget, simTicket, simConv, simRoas].forEach(el => {
    if(el) el.addEventListener('input', calculateTraffic);
  });
  calculateTraffic();

  // ==========================================
  // 4. TRAFFIC: Gerador UTM
  // ==========================================
  const utmUrl = document.getElementById('utm-url');
  const utmSource = document.getElementById('utm-source');
  const utmMedium = document.getElementById('utm-medium');
  const utmCamp = document.getElementById('utm-campaign');
  const utmCont = document.getElementById('utm-content');
  const utmResult = document.getElementById('utm-result');
  const btnCopyUtm = document.getElementById('btn-copy-utm');

  function generateUtm() {
    if(!utmUrl) return;
    let base = utmUrl.value.trim();
    if(!base) { utmResult.textContent = "O link gerado aparecerá aqui..."; return; }
    
    try {
      const url = new URL(base.startsWith('http') ? base : 'https://' + base);
      if(utmSource.value) url.searchParams.set('utm_source', utmSource.value);
      if(utmMedium.value) url.searchParams.set('utm_medium', utmMedium.value);
      if(utmCamp.value) url.searchParams.set('utm_campaign', utmCamp.value);
      if(utmCont.value) url.searchParams.set('utm_content', utmCont.value);
      
      utmResult.textContent = url.toString();
    } catch(e) {
      utmResult.textContent = "URL Inválida";
    }
  }

  [utmUrl, utmSource, utmMedium, utmCamp, utmCont].forEach(el => {
    if(el) el.addEventListener('input', generateUtm);
  });

  if (btnCopyUtm) {
    btnCopyUtm.addEventListener('click', () => {
      const txt = utmResult.textContent;
      if (txt && txt !== "URL Inválida" && txt !== "O link gerado aparecerá aqui...") {
        navigator.clipboard.writeText(txt).then(() => {
          btnCopyUtm.innerHTML = '<i class="fa-solid fa-check"></i> Copiado';
          setTimeout(() => { btnCopyUtm.innerHTML = '<i class="fa-regular fa-copy"></i> Copiar'; }, 2000);
        });
      }
    });
  }

  // ==========================================
  // 5. COPY: Auditor Anti-Ban
  // ==========================================
  const copyText = document.getElementById('copy-audit-text');
  const copyChars = document.getElementById('copy-chars');
  const copyWords = document.getElementById('copy-words');
  const btnAuditCopy = document.getElementById('btn-audit-copy');
  const copyAuditResults = document.getElementById('copy-audit-results');
  const copyFlags = document.getElementById('copy-flags');
  const fleschText = document.getElementById('flesch-text');
  const fleschNum = document.getElementById('flesch-number');

  const BAN_WORDS = ['garantido', 'dinheiro fácil', 'cura', 'fórmula mágica', 'renda extra', 'milagre', 'aposta', 'emagreça rápido', 'sem esforço', 'infalível'];

  if (copyText) {
    copyText.addEventListener('input', () => {
      const text = copyText.value;
      copyChars.textContent = text.length;
      copyWords.textContent = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    });

    if (btnAuditCopy) {
      btnAuditCopy.addEventListener('click', () => {
        const text = copyText.value.toLowerCase();
        if(!text.trim()) return;

        copyAuditResults.style.display = 'block';
        copyFlags.innerHTML = '';
        
        let foundAny = false;
        BAN_WORDS.forEach(word => {
          if (text.includes(word.toLowerCase())) {
            foundAny = true;
            const span = document.createElement('span');
            span.style.cssText = "background: rgba(239, 68, 68, 0.2); color: #F87171; padding: 2px 8px; border-radius: 4px; font-size: 11px;";
            span.textContent = word;
            copyFlags.appendChild(span);
          }
        });
        if (!foundAny) {
          copyFlags.innerHTML = '<span style="color: #34D399; font-size: 11px;">Nenhuma palavra de alto risco encontrada.</span>';
        }

        // Flesch Simplificado PT-BR (estimativa baseada em tamanho de frase e palavra)
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length || 1;
        const words = text.trim().split(/\s+/).filter(w => w.length > 0).length || 1;
        const syllables = words * 2; // estimativa grosseira
        const score = 248.835 - (1.015 * (words/sentences)) - (84.6 * (syllables/words));
        
        let finalScore = Math.min(100, Math.max(0, score));
        fleschNum.textContent = finalScore.toFixed(0);
        
        if (finalScore >= 75) {
          fleschText.textContent = "Fácil (Ensino Fundamental)";
        } else if (finalScore >= 50) {
          fleschText.textContent = "Médio (Ensino Médio)";
        } else {
          fleschText.textContent = "Difícil (Acadêmico)";
        }
      });
    }
  }

  // ==========================================
  // 6. COPY: Matriz de Ângulos
  // ==========================================
  const angleTabs = document.querySelectorAll('.angle-tab-btn');
  const angleContents = document.querySelectorAll('.angle-content');

  angleTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      angleTabs.forEach(t => {
        t.classList.remove('active');
        t.style.background = 'transparent';
        t.style.color = '#94A3B8';
        t.style.border = 'none';
      });
      tab.classList.add('active');
      tab.style.background = '#0F172A';
      tab.style.color = '#fff';
      tab.style.border = '1px solid rgba(255,255,255,0.1)';

      const target = tab.getAttribute('data-target');
      angleContents.forEach(c => {
        if(c.id === target) c.style.display = 'block';
        else c.style.display = 'none';
      });
    });
  });

  // ==========================================
  // 7. SALES: Battlecards de Objeções
  // ==========================================
  const objBtns = document.querySelectorAll('.objection-btn');
  objBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const body = btn.nextElementSibling;
      const icon = btn.querySelector('i');
      if (body.style.display === 'none') {
        body.style.display = 'block';
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
      } else {
        body.style.display = 'none';
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
      }
    });
  });

  window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => {
      alert('Script copiado para o WhatsApp!');
    });
  }

  // ==========================================
  // 8. SALES: Calculadora BANT
  // ==========================================
  const bantChecks = document.querySelectorAll('.bant-check');
  const bantProgress = document.getElementById('bant-progress');
  const bantStatus = document.getElementById('bant-status');

  function updateBant() {
    if(!bantProgress) return;
    let score = 0;
    bantChecks.forEach(c => {
      if (c.checked) score += parseInt(c.value);
    });

    bantProgress.style.width = score + '%';
    
    if (score === 0) {
      bantStatus.textContent = 'Frio (0%)';
      bantStatus.style.color = '#64748B';
      bantProgress.style.background = '#64748B';
    } else if (score === 25) {
      bantStatus.textContent = 'Frio (25%) - Desqualificado';
      bantStatus.style.color = '#F87171';
      bantProgress.style.background = '#EF4444';
    } else if (score === 50) {
      bantStatus.textContent = 'Morno (50%) - Nutrição';
      bantStatus.style.color = '#F59E0B';
      bantProgress.style.background = '#F59E0B';
    } else if (score === 75) {
      bantStatus.textContent = 'Quente (75%) - Oportunidade';
      bantStatus.style.color = '#34D399';
      bantProgress.style.background = '#10B981';
    } else {
      bantStatus.textContent = 'Muito Quente (100%) - Fechamento';
      bantStatus.style.color = '#00F5A0';
      bantProgress.style.background = '#00F5A0';
    }
  }

  bantChecks.forEach(c => c.addEventListener('change', updateBant));

});

// =======================================================
// RENDER WAR ROOM FROM JSON (INJEÇÃO NAS 5 EQUIPES)
// =======================================================
function renderWarRoomFromJSON(plan) {
  if (!plan) return;

  // 1. EQUIPE DE TRÁFEGO
  if (plan.trafego) {
    const wrTrafficContent = document.getElementById('wr-traffic-content');
    if (wrTrafficContent) {
      const canais = Array.isArray(plan.trafego.canais) ? plan.trafego.canais.join(', ') : (plan.trafego.canais || '-');
      const publicos = Array.isArray(plan.trafego.publicos_alvo) ? plan.trafego.publicos_alvo.join(', ') : (plan.trafego.publicos_alvo || '-');

      const html = `
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); padding: 16px; border-radius: 12px;">
            <h4 style="color: #34D399; font-weight: 700; font-size: 14px; margin: 0 0 8px;"><i class="fa-solid fa-bullseye"></i> Estratégia de Mídia & Distribuição</h4>
            <p style="color: #E2E8F0; font-size: 13px; margin: 0; line-height: 1.5;">${plan.diagnostico_estrategico || ''}</p>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 12px; border-radius: 10px;">
              <span style="font-size: 11px; color: #94A3B8;">Canais Recomendados:</span>
              <p style="color: #FFF; font-weight: 700; margin: 4px 0 0; font-size: 13px;">${canais}</p>
            </div>
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 12px; border-radius: 10px;">
              <span style="font-size: 11px; color: #94A3B8;">Divisão da Verba:</span>
              <p style="color: #06B6D4; font-weight: 700; margin: 4px 0 0; font-size: 13px;">${plan.trafego.distribuicao_verba || '-'}</p>
            </div>
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 12px; border-radius: 10px;">
              <span style="font-size: 11px; color: #94A3B8;">Metas de KPI (CPL / CPA):</span>
              <p style="color: #10B981; font-weight: 700; margin: 4px 0 0; font-size: 13px;">${plan.trafego.kpis_alvo || '-'}</p>
            </div>
          </div>
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 12px; border-radius: 10px;">
            <span style="font-size: 11px; color: #94A3B8;">Segmentação & Públicos-Alvo:</span>
            <p style="color: #CBD5E1; font-size: 12px; margin: 4px 0 0; line-height: 1.4;">${publicos}</p>
          </div>
        </div>
      `;
      wrTrafficContent.innerHTML = html;
    }
  }

  // 2. EQUIPE DE VÍDEO
  if (plan.video) {
    const wrVideoContent = document.getElementById('wr-video-content');
    if (wrVideoContent) {
      const html = `
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); padding: 12px; border-radius: 10px;">
            <span style="font-size: 11px; color: #F87171; font-weight: 700;">🔥 Gancho de Retenção (Primeiros 3s):</span>
            <p style="color: #FFF; font-size: 14px; font-weight: 700; margin: 4px 0 0;">"${plan.video.gancho_3s || '-'}"</p>
          </div>
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 12px; border-radius: 10px;">
            <span style="font-size: 11px; color: #34D399; font-weight: 700;">📜 Roteiro Teleprompter:</span>
            <p style="color: #E2E8F0; font-size: 13px; margin: 6px 0 0; line-height: 1.6; white-space: pre-line;">${plan.video.roteiro_teleprompter || '-'}</p>
          </div>
          <div style="background: rgba(6, 182, 212, 0.1); border: 1px solid rgba(6, 182, 212, 0.3); padding: 12px; border-radius: 10px;">
            <span style="font-size: 11px; color: #22D3EE; font-weight: 700;">🎬 Direção Cênica & Edição:</span>
            <p style="color: #CBD5E1; font-size: 12px; margin: 4px 0 0; line-height: 1.4;">${plan.video.direcao_cenica || '-'}</p>
          </div>
        </div>
      `;
      wrVideoContent.innerHTML = html;
    }
  }

  // 3. EQUIPE DE DESIGN
  if (plan.design) {
    const wrDesignContent = document.getElementById('wr-design-content');
    if (wrDesignContent) {
      const html = `
        <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px;">
          <div style="background: rgba(6, 182, 212, 0.1); border: 1px solid rgba(6, 182, 212, 0.3); padding: 14px; border-radius: 10px;">
            <span style="font-size: 11px; color: #22D3EE; font-weight: 700;">🎨 Conceito Visual / Direção de Arte:</span>
            <p style="color: #FFF; font-size: 13px; margin: 4px 0 0; line-height: 1.5;">${plan.design.conceito_visual || '-'}</p>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 12px; border-radius: 10px;">
              <span style="font-size: 11px; color: #94A3B8;">Elementos Obrigatórios:</span>
              <p style="color: #E2E8F0; font-size: 12px; margin: 4px 0 0;">${plan.design.elementos_obrigatorios || '-'}</p>
            </div>
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 12px; border-radius: 10px;">
              <span style="font-size: 11px; color: #94A3B8;">Formatos Orientados:</span>
              <p style="color: #34D399; font-weight: 700; font-size: 12px; margin: 4px 0 0;">${plan.design.formato || '-'}</p>
            </div>
          </div>
        </div>
      `;
      // Insere o briefing de design no topo do container de design
      const containerExisting = wrDesignContent.querySelector('.grid-2col');
      if (containerExisting) {
        const div = document.createElement('div');
        div.innerHTML = html;
        wrDesignContent.insertBefore(div, containerExisting);
      } else {
        wrDesignContent.innerHTML = html + wrDesignContent.innerHTML;
      }
    }
  }

  // 4. EQUIPE DE COPY
  if (plan.copy) {
    const wrCopyContent = document.getElementById('wr-copy-content');
    if (wrCopyContent) {
      const html = `
        <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px;">
          <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 14px; border-radius: 10px;">
            <span style="font-size: 11px; color: #34D399; font-weight: 700;">✍️ Headline Principal:</span>
            <p style="color: #FFF; font-size: 15px; font-weight: 700; margin: 4px 0 0;">"${plan.copy.headline || '-'}"</p>
          </div>
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 14px; border-radius: 10px;">
            <span style="font-size: 11px; color: #94A3B8; font-weight: 700;">📄 Corpo da Copy:</span>
            <p style="color: #E2E8F0; font-size: 13px; margin: 6px 0 0; line-height: 1.6; white-space: pre-line;">${plan.copy.corpo_texto || '-'}</p>
          </div>
          <div style="background: rgba(253, 224, 71, 0.1); border: 1px solid rgba(253, 224, 71, 0.3); padding: 12px; border-radius: 10px;">
            <span style="font-size: 11px; color: #FDE047; font-weight: 700;">🚀 Chamada para Ação (CTA):</span>
            <p style="color: #FFF; font-weight: 700; font-size: 13px; margin: 4px 0 0;">${plan.copy.cta || '-'}</p>
          </div>
        </div>
      `;
      const containerExisting = wrCopyContent.querySelector('.grid-2col');
      if (containerExisting) {
        const div = document.createElement('div');
        div.innerHTML = html;
        wrCopyContent.insertBefore(div, containerExisting);
      } else {
        wrCopyContent.innerHTML = html + wrCopyContent.innerHTML;
      }
    }
  }

  // 5. EQUIPE COMERCIAL / VENDAS
  if (plan.vendas) {
    const wrSalesContent = document.getElementById('wr-sales-content');
    if (wrSalesContent) {
      const html = `
        <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px;">
          <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 14px; border-radius: 10px;">
            <span style="font-size: 11px; color: #34D399; font-weight: 700;">💬 Script de Abordagem WhatsApp:</span>
            <p style="color: #E2E8F0; font-size: 13px; margin: 6px 0 0; line-height: 1.6; white-space: pre-line;">${plan.vendas.script_whatsapp || '-'}</p>
          </div>
          <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); padding: 14px; border-radius: 10px;">
            <span style="font-size: 11px; color: #F87171; font-weight: 700;">🛡️ Reversão de Objeções (Preço/Tempo):</span>
            <p style="color: #FFF; font-size: 13px; margin: 6px 0 0; line-height: 1.5;">${plan.vendas.quebra_objecoes || '-'}</p>
          </div>
        </div>
      `;
      const containerExisting = wrSalesContent.querySelector('.grid-2col');
      if (containerExisting) {
        const div = document.createElement('div');
        div.innerHTML = html;
        wrSalesContent.insertBefore(div, containerExisting);
      } else {
        wrSalesContent.innerHTML = html + wrSalesContent.innerHTML;
      }
    }
  }
}

window.renderWarRoomFromJSON = renderWarRoomFromJSON;

// ==========================================
// TELEPROMPTER LOGIC
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const teleprompterModal = document.getElementById('teleprompter-modal');
  const teleprompterTextBody = document.getElementById('prompter-text-body');
  const btnOpenTeleprompter = document.getElementById('btn-open-teleprompter');
  const btnCloseTeleprompter = document.getElementById('prompter-close-btn');
  const btnPlayPause = document.getElementById('prompter-play-pause-btn');
  const btnFontInc = document.getElementById('prompter-font-inc');
  const btnFontDec = document.getElementById('prompter-font-dec');
  const speedSlider = document.getElementById('prompter-speed-slider');
  const speedDisplay = document.getElementById('prompter-speed-display');
  const mirrorToggle = document.getElementById('prompter-mirror-toggle');
  const focusToggle = document.getElementById('prompter-focus-toggle');
  const scrollContainer = document.getElementById('prompter-scroll-container');

  let teleprompterInterval = null;
  let isPlaying = false;
  let currentSpeed = 3;
  let currentFontSize = 38;
  let isMirrored = false;
  let isFocusMode = false;

  function parseTeleprompterScript(text) {
    const lines = text.split('\n').filter(l => l.trim() !== '');
    let html = '';
    
    lines.forEach(line => {
      let raw = line.trim();
      // Headers (## Gancho 1, ### Copy, etc)
      if (/^(#+ |Gancho|Copy Principal|Chamada|CTA|Headline)/i.test(raw) && raw.length < 50) {
        html += `<div class="tp-section-header"><span class="badge">📌 ${raw.replace(/^#+\s*/, '')}</span></div>`;
      } 
      // Action / Direction
      else if (/^(\[.*?\]|\(.*?\)|ação|cênica|visual|direção):?/i.test(raw) || (raw.startsWith('[') && raw.endsWith(']'))) {
        html += `<div class="tp-action-box"><i class="fa-solid fa-clapperboard"></i> Ação: ${raw.replace(/^(\[.*?\]|\(.*?\)|ação|cênica|visual|direção):?\s*/i, '')}</div>`;
      }
      // Text Overlay
      else if (/^(texto na tela|text overlay|lettering|legenda):?/i.test(raw)) {
        html += `<div class="tp-overlay-box"><i class="fa-solid fa-font"></i> Em Tela: ${raw.replace(/^(texto na tela|text overlay|lettering|legenda):?\s*/i, '')}</div>`;
      }
      // Speech (Fala)
      else {
        raw = raw.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html += `<div class="tp-speech-text">${raw}</div>`;
      }
    });
    
    return html;
  }

  if (btnOpenTeleprompter && teleprompterModal) {
    btnOpenTeleprompter.addEventListener('click', () => {
      teleprompterModal.style.display = 'flex';
      let scriptText = "Nenhum roteiro encontrado. Despache um briefing primeiro.";
      
      const targetClientId = localStorage.getItem('oraculum_active_client_id') || 'cliente_ativo';
      const saved = localStorage.getItem(`oraculum_briefing_${targetClientId}`);
      if (saved) {
        try {
          const bd = JSON.parse(saved);
          if (bd.video && bd.video.roteiro_teleprompter) {
            scriptText = bd.video.roteiro_teleprompter;
          }
        } catch(e){}
      }
      
      if (teleprompterTextBody) {
        teleprompterTextBody.innerHTML = parseTeleprompterScript(scriptText);
        teleprompterTextBody.style.fontSize = currentFontSize + 'px';
      }
    });
  }

  if (btnCloseTeleprompter) {
    btnCloseTeleprompter.addEventListener('click', () => {
      if (teleprompterModal) teleprompterModal.style.display = 'none';
      stopTeleprompter();
    });
  }

  function stopTeleprompter() {
    isPlaying = false;
    clearInterval(teleprompterInterval);
    if(btnPlayPause) btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i> Iniciar Rolagem';
  }

  function startTeleprompter() {
    isPlaying = true;
    if(btnPlayPause) btnPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i> Pausar';
    teleprompterInterval = setInterval(() => {
      if (scrollContainer) {
        scrollContainer.scrollTop += (currentSpeed / 2);
      }
    }, 50);
  }

  if (btnPlayPause) {
    btnPlayPause.addEventListener('click', () => {
      if (isPlaying) stopTeleprompter();
      else startTeleprompter();
    });
  }

  if (speedSlider) {
    speedSlider.addEventListener('input', (e) => {
      currentSpeed = parseInt(e.target.value);
      if (speedDisplay) speedDisplay.innerText = currentSpeed + 'x';
    });
  }

  if (btnFontInc) {
    btnFontInc.addEventListener('click', () => {
      currentFontSize += 4;
      if (teleprompterTextBody) teleprompterTextBody.style.fontSize = currentFontSize + 'px';
    });
  }

  if (btnFontDec) {
    btnFontDec.addEventListener('click', () => {
      currentFontSize = Math.max(16, currentFontSize - 4);
      if (teleprompterTextBody) teleprompterTextBody.style.fontSize = currentFontSize + 'px';
    });
  }

  if (mirrorToggle) {
    mirrorToggle.addEventListener('click', () => {
      isMirrored = !isMirrored;
      if (teleprompterTextBody) {
        teleprompterTextBody.style.transform = isMirrored ? 'scaleX(-1)' : 'scaleX(1)';
      }
      if (isMirrored) {
        mirrorToggle.style.background = 'rgba(6, 182, 212, 0.3)';
        mirrorToggle.style.borderColor = '#06B6D4';
      } else {
        mirrorToggle.style.background = 'rgba(255,255,255,0.08)';
        mirrorToggle.style.borderColor = 'rgba(255,255,255,0.15)';
      }
    });
  }

  if (focusToggle) {
    focusToggle.addEventListener('click', () => {
      isFocusMode = !isFocusMode;
      if (isFocusMode) {
        document.body.classList.add('speech-only-mode');
        focusToggle.style.background = 'rgba(16, 185, 129, 0.3)';
        focusToggle.style.borderColor = '#10B981';
        focusToggle.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Modo Completo';
      } else {
        document.body.classList.remove('speech-only-mode');
        focusToggle.style.background = 'rgba(255,255,255,0.08)';
        focusToggle.style.borderColor = 'rgba(255,255,255,0.15)';
        focusToggle.innerHTML = '<i class="fa-solid fa-eye"></i> Apenas Falas';
      }
    });
  }
});

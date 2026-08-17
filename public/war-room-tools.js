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

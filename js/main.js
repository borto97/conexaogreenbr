// ================== CONFIG ==================
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbznBiO_6Iq8agDHXTHe56XsyCWOhJtQksU0yLdLQeTe1c5P2Cz0zYarOIvIG917lixyCw/exec';
const WHATSAPP_NUMERO = '5551995884139';
const TAXA = 0.10;
const MESES = 24;

// ================== UTILS ==================
function formatBRL(v){ return (v || 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' }); }

function parseMoedaBR(str=''){
  str = String(str)
    .replace(/[^\d,.-]/g,'')
    .replace(/\.(?=\d{3}(?:\D|$))/g,'');
  str = str.replace(',', '.');
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

function getVal(id){ return (document.getElementById(id)?.value || '').trim(); }

function getUTM(name){
  const p = new URLSearchParams(location.search);
  return p.get(name) || '';
}

function withTimeout(promise, ms=1200){
  return Promise.race([promise.catch(()=>{}), new Promise(r=>setTimeout(r, ms))]);
}

function getContaLeadNumber(){
  const el = document.getElementById('contaLead');
  const raw = (el?.value || '').trim();
  let n = parseMoedaBR(raw);
  if (!isFinite(n) || n < 0) n = 0;
  const minAttr = parseFloat(el?.getAttribute('min') || '0');
  if (isFinite(minAttr) && n < minAttr) n = minAttr;
  return n;
}

// ================== CÁLCULO ==================
function calcularEconomia(conta){
  const economia = conta * TAXA;
  const economiaAnual = economia * 12;
  return { economia, economiaAnual };
}

// ================== SIMULADOR ==================
function getContaNumber(){
  const el = document.getElementById('conta');
  if(!el) return 0;
  const raw = (el.value || '').trim();
  let n = parseMoedaBR(raw);
  const minAttr = parseFloat(el.getAttribute('min') || '0');
  if (!isFinite(n) || n < 0) n = 0;
  if (isFinite(minAttr) && n < minAttr) n = minAttr;
  return n;
}

function drawChartEconomia(ecoMensal){
  const svg = document.getElementById('chartEconomia');
  if(!svg) return;

  const w=600, h=180, pad=28, meses=MESES;
  const pts = Array.from({length: meses+1}, (_,m)=>({ m, y: ecoMensal*m }));
  const yMax = Math.max(1, pts[meses].y);
  const sx = m => pad + (m/meses)*(w-2*pad);
  const sy = y => h - pad - (y/yMax)*(h-2*pad);

  const xTicks=[0,6,12,18,24];
  const yTicks=[0,yMax*0.5,yMax];

  let dLine='', dArea=`M ${sx(0)} ${sy(0)}`;
  for(let i=0;i<pts.length;i++){
    const {m,y}=pts[i], x=sx(m), yy=sy(y);
    dLine += (i?` L ${x} ${yy}`:`M ${x} ${yy}`);
    dArea += ` L ${x} ${yy}`;
  }
  dArea += ` L ${sx(meses)} ${h-pad} L ${sx(0)} ${h-pad} Z`;

  const gridH = yTicks.map(v=>`<line x1="${pad}" y1="${sy(v)}" x2="${w-pad}" y2="${sy(v)}" stroke="rgba(255,255,255,.12)"/>`).join('');

  const dots = xTicks.map(m=>{
    const x=sx(m), y=sy(ecoMensal*m);
    const valor = formatBRL(ecoMensal*m);
    return `
      <circle cx="${x}" cy="${y}" r="3.5" fill="#10b981"></circle>
      <rect x="${x-40}" y="${y-24}" rx="4" ry="4" width="80" height="16" fill="rgba(0,0,0,.45)"></rect>
      <text x="${x}" y="${y-12}" text-anchor="middle" font-size="10" fill="#e5e7eb">${valor}</text>
    `;
  }).join('');

  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.innerHTML = `
    <rect x="0" y="0" width="${w}" height="${h}" fill="transparent"/>
    ${gridH}
    <path d="${dArea}" fill="rgba(16,185,129,.18)"></path>
    <path d="${dLine}" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round"></path>
    ${dots}
    <line x1="${pad}" y1="${h-pad}" x2="${w-pad}" y2="${h-pad}" stroke="rgba(255,255,255,.18)"/>
    <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${h-pad}" stroke="rgba(255,255,255,.18)"/>
    <g font-size="10" fill="#cbd5e1">
      ${xTicks.map(m=>`<text x="${sx(m)}" y="${h-pad+14}" text-anchor="middle">${m}m</text>`).join('')}
      ${yTicks.map(v=>`<text x="${pad-6}" y="${sy(v)+4}" text-anchor="end">${formatBRL(v)}</text>`).join('')}
    </g>
  `;
}

function atualizarSimulador(){
  const conta = getContaNumber();
  const { economia, economiaAnual } = calcularEconomia(conta);
  const set = (id, val)=>{ const el=document.getElementById(id); if(el) el.textContent=val; };

  set('economia',      `${formatBRL(economia)}/mês`);
  set('economiaAnual', `${formatBRL(economiaAnual)}/ano`);

  set('atualMensal',  formatBRL(conta));
  set('atualAnual',   formatBRL(conta*12));
  set('igreenMensal', formatBRL(conta - economia));
  set('igreenAnual',  formatBRL((conta - economia)*12));
  set('ecoMensal',    formatBRL(economia));
  set('ecoAnual',     formatBRL(economiaAnual));

  drawChartEconomia(economia);
}

// Bindings simulador
document.getElementById('btn-simular')?.addEventListener('click', atualizarSimulador);
document.getElementById('conta')?.addEventListener('input', atualizarSimulador);
document.getElementById('conta')?.addEventListener('keyup', e=>{ if(e.key==='Enter') atualizarSimulador(); });
document.getElementById('conta')?.addEventListener('blur', e=>{
  const n = getContaNumber();
  e.target.value = Math.round(n).toString();
});

// Primeira renderização
atualizarSimulador();

// ================== SALVAR LEAD ==================
function salvarLeadNoSheets(){
  const nome=getVal('nome');
  const fone=getVal('fone');
  const email=getVal('email');
  const cidade=getVal('cidade');
  const conta=getContaLeadNumber();
  const { economia }=calcularEconomia(conta);

  const body=new URLSearchParams({
    nome, fone, email, cidade,
    conta:String(conta),
    economiaMes:economia.toFixed(2),
    economiaAno:(economia*12).toFixed(2),
    origem:'LP Conexão Green - Fale Conosco',
    userAgent:navigator.userAgent,
    utm_source:getUTM('utm_source'),
    utm_medium:getUTM('utm_medium'),
    utm_campaign:getUTM('utm_campaign'),
    utm_term:getUTM('utm_term'),
    utm_content:getUTM('utm_content')
  });

  return fetch(WEB_APP_URL,{
    method:'POST',
    mode:'no-cors',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body
  });
}

// ================== GA4 + CONVERSÃO WHATSAPP ==================
function gtagSendEvent(url, valueNum){
  const callback = function(){ window.open(url, '_blank'); };
  if (typeof gtag === 'function'){
    gtag('event','conversion_event_contact',{
      event_callback: callback,
      event_timeout: 2000,
      event_category: 'lead',
      event_label: 'whatsapp_cta',
      value: valueNum || 0
    });
  } else {
    callback();
  }
  return false;
}

document.getElementById('ctaWhatsapp')?.addEventListener('click', async (e)=>{
  e.preventDefault();

  const nome=getVal('nome');
  const conta=getContaLeadNumber();
  const cidade=getVal('cidade');

  if(!nome || !conta){
    alert('Preencha pelo menos NOME e a CONTA de luz média.');
    return;
  }

  await withTimeout(salvarLeadNoSheets(), 1200);

  const msg=`Olá, me chamo ${nome}! Minha conta de luz média é R$ ${conta.toFixed(2).replace('.',',')}${cidade?` em ${cidade}`:''}. Quero saber mais sobre a economia com o Conexão Green.`;
  const url=`https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(msg)}`;

  gtagSendEvent(url, conta);
});

// ================== FUNIL DE EVENTOS (GA4) + LOG OPCIONAL ==================
function logEvento(nomeEvento, extra = {}) {
  try {
    const contaNum = extra.valor ? Number(extra.valor) : 0;
    const economiaMes = contaNum * (typeof TAXA === 'number' ? TAXA : 0);

    const body = new URLSearchParams({
      nome: `[Evento] ${nomeEvento}`,
      fone: '',
      email: '',
      cidade: '',
      conta: String(contaNum || ''),
      economiaMes: isFinite(economiaMes) ? economiaMes.toFixed(2) : '',
      economiaAno: isFinite(economiaMes) ? (economiaMes*12).toFixed(2) : '',
      origem: 'LP Conexão Green - Evento',
      userAgent: navigator.userAgent,
      utm_source: getUTM('utm_source'),
      utm_medium: getUTM('utm_medium'),
      utm_campaign: getUTM('utm_campaign'),
      utm_term: getUTM('utm_term'),
      utm_content: getUTM('utm_content')
    });

    fetch(WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {'Content-Type':'application/x-www-form-urlencoded'},
      body
    });
  } catch(_) {}
}

// 1) form_view (50% visível)
(function trackFormView(){
  const alvo = document.querySelector('#fale-conosco') || document.querySelector('form');
  if (!alvo) return;
  let visto = false;
  const io = new IntersectionObserver((ents)=>{
    ents.forEach(en=>{
      if (!visto && en.isIntersecting && en.intersectionRatio >= 0.5){
        visto = true;
        if (typeof gtag==='function') gtag('event','form_view',{section:'fale_conosco'});
        logEvento('form_view');
        io.disconnect();
      }
    });
  },{threshold:[0.5]});
  io.observe(alvo);
})();

// 2) form_start (primeira digitação)
(function trackFormStart(){
  const primeiroCampo = document.querySelector('#nome, input[name="nome"], #fone, input[name="fone"], #email, input[name="email"]');
  if (!primeiroCampo) return;
  let iniciou = false;
  const handler = ()=>{
    if (iniciou) return;
    iniciou = true;
    if (typeof gtag==='function') gtag('event','form_start',{section:'fale_conosco'});
    logEvento('form_start');
  };
  primeiroCampo.addEventListener('input', handler, { once:true });
})();

// 3) form_submit (mousedown no CTA)
(function hookFormSubmitCTA(){
  const btn = document.getElementById('ctaWhatsapp');
  if (!btn) return;
  btn.addEventListener('mousedown', ()=>{
    const conta = (typeof getContaLeadNumber==='function') ? getContaLeadNumber() : 0;
    if (typeof gtag==='function') gtag('event','form_submit',{method:'whatsapp', value: conta || 0});
    logEvento('form_submit', { valor: String(conta || 0) });
  });
})();

// 4) clique extra no WhatsApp (além do conversion_event_contact)
(function hookWhatsClickExtra(){
  const btn = document.getElementById('ctaWhatsapp');
  if (!btn) return;
  btn.addEventListener('click', ()=>{
    const conta = (typeof getContaLeadNumber==='function') ? getContaLeadNumber() : 0;
    if (typeof gtag==='function') gtag('event','whatsapp_cta_click',{ value: conta || 0 });
    logEvento('whatsapp_cta_click', { valor: String(conta || 0) });
  });
})();

function bindFilePreview(idInput, idWrap) {
  const input = document.getElementById(idInput);
  const wrap  = document.getElementById(idWrap);

  if (!input || !wrap) return;

  input.addEventListener("change", () => {
    if (input.files.length > 0) {
      wrap.classList.add("has-file");
      wrap.dataset.fileName = input.files[0].name;
    } else {
      wrap.classList.remove("has-file");
      wrap.dataset.fileName = "";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {

  // DRAG & DROP + STATUS
  function bindFileBox(idInput, idWrap) {
    const input = document.getElementById(idInput);
    const wrap  = document.getElementById(idWrap);
    const label = wrap?.querySelector(".file-label");

    if (!input || !wrap) return;

    input.addEventListener("change", () => {
      if (input.files.length > 0) {
        wrap.classList.add("has-file");
        if (label) label.textContent = "📎 " + input.files[0].name;
      } else {
        wrap.classList.remove("has-file");
        if (label) label.textContent = "📄 Selecionar arquivo";
      }
    });

    wrap.addEventListener("dragover", (e) => {
      e.preventDefault();
      wrap.classList.add("dragover");
    });

    wrap.addEventListener("dragleave", () => {
      wrap.classList.remove("dragover");
    });

    wrap.addEventListener("drop", (e) => {
      e.preventDefault();
      wrap.classList.remove("dragover");

      const file = e.dataTransfer.files[0];
      if (file) {
        input.files = e.dataTransfer.files;
        wrap.classList.add("has-file");
        if (label) label.textContent = "📎 " + file.name;
      }
    });
  }

  bindFileBox("doc_frente", "wrap_doc_frente");
  bindFileBox("doc_verso", "wrap_doc_verso");
  bindFileBox("conta_luz", "wrap_conta_luz");
  bindFileBox("contrato_social", "wrap_contrato");

  // Campos opcionais
  const toggle = document.querySelector(".opt-toggle");
  const fields = document.getElementById("opc_fields");

  if (toggle && fields) {
    toggle.addEventListener("click", () => {
      fields.classList.toggle("open");
    });
  }

  // ===== PJ -> exibir/obrigar Contrato Social =====
  const pjSel = document.getElementById("is_pj");
  const pjExtra = document.getElementById("pj_extra");
  const contrato = document.getElementById("contrato_social");

  function syncPJ() {
    const isPJ = pjSel && pjSel.value === "sim";
    if (pjExtra) pjExtra.style.display = isPJ ? "block" : "none";
    if (contrato) contrato.required = !!isPJ;
  }
  if (pjSel) {
    pjSel.addEventListener("change", syncPJ);
    syncPJ();
  }

  // ===== UTM/ref + UA + consent timestamp =====
  const p = new URLSearchParams(location.search);
  const utm = (p.get("utm_source") || p.get("utm") || p.get("ref") || "").trim();

  const refInput = document.getElementById("ref");
  const utmRef = document.getElementById("utm_ref");
  const ua = document.getElementById("ua");
  const chk = document.getElementById("aceiteLGPD");
  const ts = document.getElementById("consent_ts");

  if (refInput) refInput.value = utm;
  if (utmRef) utmRef.value = utm;
  if (ua) ua.value = navigator.userAgent;

  if (chk && ts) {
    chk.addEventListener("change", () => {
      ts.value = chk.checked ? new Date().toISOString() : "";
    });
  }

  // ===== (RECOMENDADO) Fallback base64: preenche hidden b64_* antes de enviar =====
  // Isso garante que, mesmo se multipart falhar, teu Apps Script salva pelo fallback.
  const form = document.getElementById("cadastroDocs");
  if (form) {
    form.addEventListener("submit", async (ev) => {
      // evita loop
      if (form.dataset.sending === "1") return;
      form.dataset.sending = "1";
      ev.preventDefault();

      async function toDataURL(file) {
        return new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result || ""));
          r.onerror = reject;
          r.readAsDataURL(file);
        });
      }

      async function fillHidden(inputId, hiddenName) {
        const input = document.getElementById(inputId);
        const hidden = form.querySelector(`input[name="${hiddenName}"]`);
        if (!input || !hidden) return;

        const f = input.files && input.files[0];
        if (!f) { hidden.value = ""; return; }

        // Limite prudente (DataURL pode ficar gigante). Ajusta se quiser.
        const MAX_MB = 6;
        if (f.size > MAX_MB * 1024 * 1024) {
          // se for grande, deixa vazio e confia no multipart
          hidden.value = "";
          return;
        }

        hidden.value = await toDataURL(f);
      }

      try {
        await fillHidden("doc_frente", "b64_doc_frente");
        await fillHidden("doc_verso", "b64_doc_verso");
        await fillHidden("conta_luz", "b64_conta_luz");

        // contrato social só se PJ
        if (pjSel && pjSel.value === "sim") {
          await fillHidden("contrato_social", "b64_contrato_social");
        } else {
          const h = form.querySelector(`input[name="b64_contrato_social"]`);
          if (h) h.value = "";
        }
      } catch (e2) {
        // se falhar, segue com multipart mesmo assim
      }

      // agora envia de verdade
      form.submit();
      // libera depois de um tempinho (evita travar submit futuro)
      setTimeout(() => { form.dataset.sending = "0"; }, 1500);
    });
  }

  // ===== feedback do iframe via postMessage =====
  window.addEventListener("message", (ev2) => {
    const data = ev2 && ev2.data;
    if (!data || typeof data !== "object") return;

    if (data.ok) {
      alert(`✅ Documentos enviados!\nArquivos salvos: ${data.saved_count}\nPasta: ${data.folder?.name || ""}`);
    } else if (data.error) {
      alert(`❌ Erro ao enviar documentos:\n${data.error}`);
    }
  });

  
});

/**
 * BURGUER ON ARTESANAL - PAINEL DA COZINHA & BALCÃO (KDS ADMIN)
 * Sincronização em Tempo Real, Alarme Sonoro Contínuo e Impressão Térmica GoldenSky 80mm
 */

import {
  subscribeToOrders,
  updateOrderStatus,
  markOrderAsPrinted,
  createOrder,
  getLocalOrders,
  getAdminSession,
  signInAdmin,
  signOutAdmin
} from "./firebase-config.js?v=20261102b";

// ==========================================================================
// ESTADO DO PAINEL
// ==========================================================================
let allOrders = [];
let currentFilter = "todos"; // "todos", "pendente", "preparo", "entrega", "finalizado"
let soundEnabled = true;
let autoPrintEnabled = true;
let isAlertRinging = false;
let audioContext = null;
let soundIntervalId = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ==========================================================================
// MOTOR DE ÁUDIO WEB AUDIO API (ALERTA SONORO CONTÍNUO DE COZINHA)
// ==========================================================================
function getAudioContext() {
  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      audioContext = new AudioCtx();
    }
  }
  if (audioContext && audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

/**
 * Toca um bip duplo característico de comanda de restaurante
 */
function playRestaurantChime() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    
    // Primeiro tom (880Hz - A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Segundo tom mais alto (1174.66Hz - D6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(1175, now + 0.15);
    gain2.gain.setValueAtTime(0.3, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.55);
  } catch (e) {
    console.warn("Aviso ao reproduzir áudio Web Audio API:", e);
  }
}

/**
 * Inicia ou interrompe o alarme sonoro contínuo com base nos pedidos pendentes
 */
function checkPendingAlarm() {
  const pendingCount = allOrders.filter(o => o.status === "pendente").length;
  const alertBar = document.getElementById("kds-alert-bar");
  const alertCountEl = document.getElementById("alert-pending-count");
  const soundBtn = document.getElementById("btn-toggle-sound");

  if (pendingCount > 0) {
    if (alertBar) alertBar.classList.remove("hidden");
    if (alertCountEl) alertCountEl.textContent = pendingCount;
    if (soundBtn) soundBtn.classList.add("alarm-pulsing");

    // Se o som estiver habilitado e ainda não estiver rodando o loop, inicia o loop a cada 4s
    if (soundEnabled && !soundIntervalId) {
      playRestaurantChime();
      soundIntervalId = setInterval(() => {
        if (soundEnabled && allOrders.some(o => o.status === "pendente")) {
          playRestaurantChime();
        } else {
          stopPendingAlarm();
        }
      }, 4000);
    }
  } else {
    stopPendingAlarm();
  }
}

function stopPendingAlarm() {
  if (soundIntervalId) {
    clearInterval(soundIntervalId);
    soundIntervalId = null;
  }
  const alertBar = document.getElementById("kds-alert-bar");
  const soundBtn = document.getElementById("btn-toggle-sound");
  if (alertBar) alertBar.classList.add("hidden");
  if (soundBtn) soundBtn.classList.remove("alarm-pulsing");
}

// ==========================================================================
// MÓDULO DE IMPRESSÃO TÉRMICA (GOLDENSKY 80MM / 72MM)
// ==========================================================================

/**
 * Gera o documento HTML calibrado para impressora térmica 80mm
 */
function buildThermalReceiptHTML(order) {
  const itensHtml = (order.itens || []).map(item => {
    const adicionaisTxt = (item.adicionais || [])
      .map(ad => `<div class="rcpt-item-detail">+ ${escapeHtml(ad.nome)} (R$ ${Number(ad.preco || 0).toFixed(2).replace(".", ",")})</div>`)
      .join("");

    const obsTxt = item.observacao ? `<div class="rcpt-item-obs">OBS: ${escapeHtml(item.observacao)}</div>` : "";

    const valorUnit = Number(item.precoTotal || item.preco || 0).toFixed(2).replace(".", ",");

    return `
      <div class="rcpt-item-row">
        <div class="rcpt-row">
          <span class="rcpt-item-name">[${item.quantidade}x] ${escapeHtml(item.nome)}</span>
          <span>R$ ${valorUnit}</span>
        </div>
        ${adicionaisTxt}
        ${obsTxt}
      </div>
    `;
  }).join("");

  const cli = order.cliente || {};
  const isDelivery = (order.tipo || "delivery") === "delivery";

  let enderecoHtml = "";
  if (isDelivery) {
    enderecoHtml = `
      <div class="rcpt-section-title">ENDEREÇO DE ENTREGA:</div>
      <div>${escapeHtml(cli.rua)}, Nº ${escapeHtml(cli.numero || "S/N")}</div>
      <div>Bairro: ${escapeHtml(cli.bairro)} - ${escapeHtml(cli.cidade || "Cotia - SP")}</div>
      ${order.distanciaKm ? `<div>Distância da Loja: ~${Number(order.distanciaKm).toFixed(1).replace(".", ",")} km</div>` : ""}
      ${cli.cep ? `<div>CEP: ${escapeHtml(cli.cep)}</div>` : ""}
      ${cli.complemento ? `<div>Compl/Ref: ${escapeHtml(cli.complemento)}</div>` : ""}
      <div class="rcpt-divider"></div>
    `;
  } else {
    enderecoHtml = `
      <div class="rcpt-section-title">MODALIDADE:</div>
      <div style="font-weight:900;">RETIRADA NO BALCÃO</div>
      <div class="rcpt-divider"></div>
    `;
  }

  const pag = order.pagamento || {};
  let pagDetalhes = `FORMA: ${(pag.metodo || "pix").toUpperCase()}`;
  if (pag.metodo === "dinheiro") {
    if (pag.precisaTroco || pag.trocoPara) {
      const trocoNum = parseFloat(pag.trocoPara);
      if (!isNaN(trocoNum) && trocoNum > 0) {
        const totalNum = Number(order.total || 0);
        const trocoLevar = (trocoNum - totalNum).toFixed(2).replace(".", ",");
        pagDetalhes += `<br>Troco para: R$ ${trocoNum.toFixed(2).replace(".", ",")} (Levar: R$ ${trocoLevar})`;
      } else {
        pagDetalhes += `<br><strong>⚠️ LEVAR TROCO (Cliente precisa de troco)</strong>`;
      }
    } else {
      pagDetalhes += `<br>Não precisa de troco`;
    }
  }

  const dataHora = order.dataHoraFormatada || new Date().toLocaleString("pt-BR");

  return `
    <div class="rcpt-header">
      <div class="rcpt-title">BURGUER ON ARTESANAL</div>
      <div class="rcpt-sub">Hambúrgueres Artesanais na Chapa</div>
      <div class="rcpt-sub">Rua Topázio, 44 - Moinho Velho - Cotia/SP</div>
      <div class="rcpt-sub">WhatsApp: (11) 97732-2633</div>
    </div>

    <div class="rcpt-divider"></div>

    <div class="rcpt-order-highlight">
      PEDIDO #${order.numero || "0000"}
    </div>

    <div class="rcpt-type">
      ${isDelivery ? ">> ENTREGA (DELIVERY) <<" : ">> RETIRADA NO BALCÃO <<"}
    </div>
    <div style="text-align:center; font-size:11px; margin-top:2px;">
      Data/Hora: ${dataHora}
    </div>

    <div class="rcpt-divider"></div>

    <div class="rcpt-section-title">CLIENTE:</div>
    <div style="font-size:13px; font-weight:900;">${escapeHtml(cli.nome || "Não informado")}</div>
    <div>Telefone: ${escapeHtml(cli.telefone || "Não informado")}</div>

    <div class="rcpt-divider"></div>

    ${enderecoHtml}

    <div class="rcpt-section-title">ITENS DO PEDIDO:</div>
    ${itensHtml}

    <div class="rcpt-divider"></div>

    <div class="rcpt-row">
      <span>Subtotal:</span>
      <span>R$ ${Number(order.subtotal || 0).toFixed(2).replace(".", ",")}</span>
    </div>
    <div class="rcpt-row">
      <span>Taxa de Entrega:</span>
      <span>${isDelivery ? "R$ " + Number(order.frete || 0).toFixed(2).replace(".", ",") : "GRÁTIS (R$ 0,00)"}</span>
    </div>

    <div class="rcpt-total-highlight rcpt-row">
      <span>TOTAL A PAGAR:</span>
      <span>R$ ${Number(order.total || 0).toFixed(2).replace(".", ",")}</span>
    </div>

    <div class="rcpt-section-title">PAGAMENTO:</div>
    <div style="font-size:11px;">${pagDetalhes}</div>

    <div class="rcpt-divider"></div>

    <div class="rcpt-footer">
      <div>Agradecemos pela preferência!</div>
      <div>Siga no Instagram: @burguer.on</div>
      <div style="margin-top:4px;">================================</div>
    </div>
  `;
}

/**
 * Dispara a impressão física térmica da comanda
 * @param {Object} order 
 * @param {boolean} isAuto 
 */
export async function printOrderReceipt(order, isAuto = false) {
  if (!order) return;

  const printArea = document.getElementById("receipt-print-area");
  if (!printArea) return;

  printArea.innerHTML = buildThermalReceiptHTML(order);

  // Aguarda microtask para renderização e dispara print
  setTimeout(() => {
    window.print();
    markOrderAsPrinted(order.id);
  }, 100);
}

// ==========================================================================
// RENDERIZAÇÃO DOS CARDS NO QUADRO KDS
// ==========================================================================

function formatMinutesAgo(timestampMs) {
  if (!timestampMs) return "agora";
  const diffSec = Math.floor((Date.now() - timestampMs) / 1000);
  if (diffSec < 60) return "agora mesmo";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min atrás`;
  const diffHours = Math.floor(diffMin / 60);
  return `${diffHours}h atrás`;
}

function renderOrderCard(order) {
  const cli = order.cliente || {};
  const isDelivery = (order.tipo || "delivery") === "delivery";
  const items = order.itens || [];

  const itemsHtml = items.map(item => {
    const additionsHtml = (item.adicionais || []).map(ad => `
      <span>+ ${escapeHtml(ad.nome)} (R$ ${Number(ad.preco || 0).toFixed(2).replace(".", ",")})</span>
    `).join("");

    return `
      <div class="card-item">
        <div class="item-main-row">
          <div class="item-qty-name">
            <span class="item-qty">${item.quantidade}x</span>
            <span>${escapeHtml(item.nome)}</span>
          </div>
          <span>R$ ${Number(item.precoTotal || item.preco || 0).toFixed(2).replace(".", ",")}</span>
        </div>
        ${additionsHtml ? `<div class="item-additions">${additionsHtml}</div>` : ""}
        ${item.observacao ? `<div class="item-notes">OBS: ${escapeHtml(item.observacao)}</div>` : ""}
      </div>
    `;
  }).join("");

  const pag = order.pagamento || {};
  let pagInfo = `Pagamento: <strong>${(pag.metodo || "pix").toUpperCase()}</strong>`;
  if (pag.metodo === "dinheiro") {
    if (pag.precisaTroco || pag.trocoPara) {
      const trocoNum = parseFloat(pag.trocoPara);
      if (!isNaN(trocoNum) && trocoNum > 0) {
        pagInfo += ` (Troco p/ R$ ${trocoNum.toFixed(2).replace(".", ",")})`;
      } else {
        pagInfo += ` <strong>(Precisa de troco)</strong>`;
      }
    } else {
      pagInfo += ` (Sem troco)`;
    }
  }

  // Ações baseadas no status
  let actionButtonsHtml = "";
  if (order.status === "pendente") {
    actionButtonsHtml = `
      <button class="btn-card-action btn-action-preparo" data-action="status" data-id="${order.id}" data-next="preparo">
        👨‍🍳 Avançar: iniciar preparo
      </button>
    `;
  } else if (order.status === "preparo") {
    const nextLabel = isDelivery ? "🛵 Despachar Entrega" : "🥡 Pronto p/ Retirada";
    actionButtonsHtml = `
      <button class="btn-card-action btn-action-delivery" data-action="status" data-id="${order.id}" data-next="entrega">
        ${nextLabel}
      </button>
    `;
  } else if (order.status === "entrega") {
    actionButtonsHtml = `
      <button class="btn-card-action btn-action-finish" data-action="status" data-id="${order.id}" data-next="finalizado">
        ✅ Concluir pedido
      </button>
    `;
  } else {
    actionButtonsHtml = `
      <span style="font-size:0.75rem; color:#10b981; font-weight:700;">✅ Pedido Concluído</span>
    `;
  }

  const cleanPhone = (cli.telefone || "").replace(/\D/g, "");
  let whatsMsg = "";
  if (order.status === "pendente" || order.status === "preparo") {
    whatsMsg = `Olá, ${cli.nome || "Cliente"}! Tudo bem? 😊\n\nRecebemos o seu pedido *#${order.numero}* aqui na *Burguer On Artesanal*!\nJá estamos preparando seu pedido com todo capricho na chapa. 🔥🍔\n\nQualquer dúvida, estamos à disposição por aqui!`;
  } else if (order.status === "entrega") {
    if (isDelivery) {
      whatsMsg = `Olá, ${cli.nome || "Cliente"}! 🛵\n\nSeu pedido *#${order.numero}* da *Burguer On Artesanal* acabou de sair para entrega!\nEm breve o nosso motoboy chegará ao seu endereço. Bom apetite! 🍔😋`;
    } else {
      whatsMsg = `Olá, ${cli.nome || "Cliente"}! 🥡\n\nSeu pedido *#${order.numero}* da *Burguer On Artesanal* já está pronto e embalado aguardando sua retirada no balcão!\nPode vir retirar quando quiser.`;
    }
  } else {
    whatsMsg = `Olá, ${cli.nome || "Cliente"}! Seu pedido *#${order.numero}* foi concluído com sucesso. Agradecemos pela preferência na *Burguer On Artesanal*! Volte sempre! 🍔❤️`;
  }
  const zapLink = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(whatsMsg)}` : "#";

  return `
    <div class="kds-order-card status-${escapeHtml(order.status)}" id="card-${escapeHtml(order.id)}">
      <div class="card-top">
        <span class="order-num-tag">#${order.numero || "0000"}</span>
        <span class="order-type-badge ${isDelivery ? 'badge-delivery' : 'badge-retirada'}">
          ${isDelivery ? '🛵 Entrega' : '🥡 Balcão'}
        </span>
      </div>

      <div class="card-time-row">
        <span>${escapeHtml(order.dataHoraFormatada || "")}</span>
        <span class="time-elapsed">${formatMinutesAgo(order.criadoEmMs)}</span>
      </div>

      <div class="card-customer-info">
        <div class="customer-name">
          <span>👤 ${escapeHtml(cli.nome || "Cliente")}</span>
          ${cleanPhone ? `
            <a href="${zapLink}" target="_blank" rel="noopener" class="customer-phone-link" title="Abrir WhatsApp do cliente">
              📱 ${escapeHtml(cli.telefone)}
            </a>
          ` : ""}
        </div>

        ${isDelivery ? `
          <div class="customer-address">
            📍 <strong>${escapeHtml(cli.rua || "")}, Nº ${escapeHtml(cli.numero || "S/N")}</strong><br>
            Bairro: ${escapeHtml(cli.bairro || "")} - ${escapeHtml(cli.cidade || "Cotia/SP")} ${order.distanciaKm ? `<span style="color:#f59e0b; font-weight:700;">(~${Number(order.distanciaKm).toFixed(1).replace(".", ",")} km)</span>` : ""}<br>
            ${cli.complemento ? `Ref: <em>${escapeHtml(cli.complemento)}</em>` : ""}
          </div>
        ` : `
          <div class="customer-address" style="border-left-color: #818cf8;">
            🥡 <strong>Cliente vai retirar no balcão da hamburgueria</strong>
          </div>
        `}
      </div>

      <div class="card-items-list">
        ${itemsHtml}
      </div>

      <div class="card-footer-info">
        <div class="totals-row">
          <span>Subtotal:</span>
          <span>R$ ${Number(order.subtotal || 0).toFixed(2).replace(".", ",")}</span>
        </div>
        <div class="totals-row">
          <span>Taxa Entrega:</span>
          <span>${isDelivery ? "R$ " + Number(order.frete || 0).toFixed(2).replace(".", ",") : "Grátis"}</span>
        </div>
        <div class="totals-total">
          <span>TOTAL:</span>
          <span>R$ ${Number(order.total || 0).toFixed(2).replace(".", ",")}</span>
        </div>
        <div class="payment-tag">
          💳 ${pagInfo}
        </div>
      </div>

      <div class="card-actions">
        ${actionButtonsHtml}
        ${cleanPhone ? `
          <a href="${zapLink}" target="_blank" rel="noopener" class="btn-card-action btn-action-whatsapp" title="Enviar mensagem no WhatsApp do cliente">
            💬 Enviar no Whats
          </a>
        ` : ""}
        <button class="btn-card-action btn-action-print ${order.impresso ? 'printed' : ''}" data-action="print" data-id="${order.id}">
          🖨️ ${order.impresso ? "Reimprimir" : "Imprimir (80mm)"}
        </button>
      </div>
    </div>
  `;
}

function updateKdsDisplay() {
  const pendingListEl = document.getElementById("list-pending");
  const prepListEl = document.getElementById("list-preparo");
  const deliveryListEl = document.getElementById("list-entrega");
  const completedListEl = document.getElementById("list-finalizado");

  const countPendingEl = document.getElementById("count-pending");
  const countPrepEl = document.getElementById("count-preparo");
  const countDeliveryEl = document.getElementById("count-entrega");
  const countCompletedEl = document.getElementById("count-finalizado");
  const countTotalEl = document.getElementById("count-todos");

  // Filtra por status
  const pendingOrders = allOrders.filter(o => o.status === "pendente");
  const prepOrders = allOrders.filter(o => o.status === "preparo");
  const deliveryOrders = allOrders.filter(o => o.status === "entrega");
  const completedOrders = allOrders.filter(o => o.status === "finalizado");

  // Atualiza contadores
  if (countPendingEl) countPendingEl.textContent = pendingOrders.length;
  if (countPrepEl) countPrepEl.textContent = prepOrders.length;
  if (countDeliveryEl) countDeliveryEl.textContent = deliveryOrders.length;
  if (countCompletedEl) countCompletedEl.textContent = completedOrders.length;
  if (countTotalEl) countTotalEl.textContent = allOrders.length;

  const emptyHtml = (msg) => `<div class="kds-empty-state">${msg}</div>`;

  if (pendingListEl) {
    pendingListEl.innerHTML = pendingOrders.length ? pendingOrders.map(renderOrderCard).join("") : emptyHtml("Nenhum pedido pendente.");
  }
  if (prepListEl) {
    prepListEl.innerHTML = prepOrders.length ? prepOrders.map(renderOrderCard).join("") : emptyHtml("Nenhum pedido no fogo.");
  }
  if (deliveryListEl) {
    deliveryListEl.innerHTML = deliveryOrders.length ? deliveryOrders.map(renderOrderCard).join("") : emptyHtml("Nenhum pedido aguardando despacho.");
  }
  if (completedListEl) {
    completedListEl.innerHTML = completedOrders.length ? completedOrders.slice(0, 20).map(renderOrderCard).join("") : emptyHtml("Nenhum pedido finalizado ainda.");
  }

  // Verifica alarme sonoro
  checkPendingAlarm();
}

// ==========================================================================
// TRATAMENTO DE EVENTOS DA TELA
// ==========================================================================

function setupEventListeners() {
  // Ações nos botões dos cards (delegated event)
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    const orderId = btn.dataset.id;
    const order = allOrders.find(o => o.id === orderId);

    if (action === "status" && order) {
      const nextStatus = btn.dataset.next;
      const previousStatus = order.status;
      btn.disabled = true;

      // 1. Atualização Otimista Imediata na tela (0ms de espera, sem precisar de recarregar a página)
      order.status = nextStatus;
      updateKdsDisplay();

      // 2. Persistência assíncrona local, no canal entre abas e no Firestore
      try {
        await updateOrderStatus(orderId, nextStatus);
        const statusLabels = {
          preparo: "Pedido avançado para preparo.",
          entrega: order.tipo === "delivery" ? "Pedido despachado para entrega." : "Pedido pronto para retirada.",
          finalizado: "Pedido concluído com sucesso."
        };
        showAdminNotice(statusLabels[nextStatus] || "Etapa atualizada.");
      } catch (err) {
        console.error("Erro ao persistir status do pedido:", err);
        order.status = previousStatus;
        updateKdsDisplay();
        showAdminNotice("Não foi possível salvar a etapa. Tente novamente.", true);
      }
    } else if (action === "print" && order) {
      order.impresso = true;
      updateKdsDisplay();
      printOrderReceipt(order, false);
      markOrderAsPrinted(order.id).catch(() => {});
    }

    function showAdminNotice(message, isError = false) {
      const notice = document.createElement("div");
      notice.className = `kds-action-notice ${isError ? "error" : ""}`;
      notice.textContent = message;
      document.body.appendChild(notice);
      setTimeout(() => notice.remove(), 2800);
    }
  });

  // Toggle Som
  const soundBtn = document.getElementById("btn-toggle-sound");
  if (soundBtn) {
    soundBtn.addEventListener("click", () => {
      soundEnabled = !soundEnabled;
      soundBtn.classList.toggle("active-sound", soundEnabled);
      soundBtn.innerHTML = soundEnabled ? "🔊 Som Ativado" : "🔇 Som Mudo";
      if (soundEnabled) {
        getAudioContext();
        playRestaurantChime();
        checkPendingAlarm();
      } else {
        stopPendingAlarm();
      }
    });
  }

  // Silenciar Alarme da barra
  const silenceBtn = document.getElementById("btn-silence-alert");
  if (silenceBtn) {
    silenceBtn.addEventListener("click", () => {
      stopPendingAlarm();
    });
  }

  // Toggle Auto-Print
  const autoPrintBtn = document.getElementById("btn-toggle-autoprint");
  if (autoPrintBtn) {
    autoPrintBtn.addEventListener("click", () => {
      autoPrintEnabled = !autoPrintEnabled;
      autoPrintBtn.classList.toggle("active-print", autoPrintEnabled);
      autoPrintBtn.innerHTML = autoPrintEnabled ? "🖨️ Auto-Print 80mm ON" : "🖨️ Auto-Print OFF";
    });
  }

  // Botão de Teste de Som
  const testSoundBtn = document.getElementById("btn-test-sound");
  if (testSoundBtn) {
    testSoundBtn.addEventListener("click", () => {
      getAudioContext();
      playRestaurantChime();
    });
  }

  // Botão Criar Pedido de Demonstração
  const demoOrderBtn = document.getElementById("btn-demo-order");
  if (demoOrderBtn) {
    demoOrderBtn.addEventListener("click", async () => {
      demoOrderBtn.disabled = true;
      demoOrderBtn.textContent = "Gerando teste...";
      await createDemoOrder();
      demoOrderBtn.disabled = false;
      demoOrderBtn.textContent = "⚡ Pedido Teste";
    });
  }

  // Filtros por Aba (Mobile / Monitor)
  const tabButtons = document.querySelectorAll(".kds-tab-btn");
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      tabButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const targetCol = btn.dataset.col;
      filterColumns(targetCol);
    });
  });

  // Atualização periódica do tempo decorrido e relógio
  setInterval(updateClock, 1000);
}

function updateClock() {
  const clockEl = document.getElementById("kds-clock");
  if (clockEl) {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
}

function filterColumns(colTarget) {
  const columns = document.querySelectorAll(".kds-column");
  if (colTarget === "todos") {
    columns.forEach(c => c.style.display = "");
  } else {
    columns.forEach(c => {
      if (c.id === `column-${colTarget}`) {
        c.style.display = "";
      } else {
        c.style.display = "none";
      }
    });
  }
}

/**
 * Cria um pedido fictício com endereço em Cotia para teste imediato da cozinha
 */
async function createDemoOrder() {
  const bairrosCotia = ["Moinho Velho", "Jardim Rosemary", "Granja Viana", "Centro de Cotia"];
  const bSorteado = bairrosCotia[Math.floor(Math.random() * bairrosCotia.length)];
  
  await createOrder({
    tipo: "delivery",
    cliente: {
      nome: "Cliente Teste Cotia",
      telefone: "(11) 98765-4321",
      cep: "06716-040",
      rua: "Rua das Amendoeiras",
      numero: "120",
      bairro: bSorteado,
      cidade: "Cotia - SP",
      complemento: "Casa 2 - Chamar no portão preto"
    },
    itens: [
      {
        id: "burguer_on_especial",
        nome: "Burguer On Especial",
        quantidade: 1,
        preco: 36.90,
        precoTotal: 40.90,
        adicionais: [{ nome: "Bacon Artesanal Extra", preco: 4.00 }],
        observacao: "Ponto da carne ao ponto para bem passado, sem cebola."
      },
      {
        id: "coca_lata",
        nome: "Coca-Cola 350ml (Lata)",
        quantidade: 1,
        preco: 6.00,
        precoTotal: 6.00,
        adicionais: [],
        observacao: "Bem gelada por favor!"
      }
    ],
    subtotal: 46.90,
    frete: 5.00,
    total: 51.90,
    pagamento: {
      metodo: "dinheiro",
      trocoPara: 100.00
    }
  });
}

// ==========================================================================
// INICIALIZAÇÃO DO PAINEL DA COZINHA
// ==========================================================================
let previousOrdersCount = 0;

document.addEventListener("DOMContentLoaded", async () => {
  const login = document.getElementById("admin-login");
  const loginForm = document.getElementById("admin-login-form");
  const loginError = document.getElementById("admin-login-error");

  const startPanel = () => {
    if (login) login.classList.add("hidden");
    setupEventListeners();
    updateClock();

    subscribeToOrders((orders) => {
      const isFirstLoad = allOrders.length === 0;
      if (!isFirstLoad && orders.length > previousOrdersCount) {
        const newestOrder = orders[0];
        if (newestOrder && newestOrder.status === "pendente") {
          playRestaurantChime();
          if (autoPrintEnabled && !newestOrder.impresso) {
            printOrderReceipt(newestOrder, true);
          }
        }
      }

      allOrders = orders;
      previousOrdersCount = orders.length;
      updateKdsDisplay();
    });
  };

  try {
    const session = await getAdminSession();
    if (session) {
      startPanel();
    } else if (login) {
      login.classList.remove("hidden");
    }
  } catch (error) {
    if (loginError) loginError.textContent = "Configure o Supabase antes de acessar o painel.";
    if (login) login.classList.remove("hidden");
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      loginError.textContent = "";
      try {
        await signInAdmin(
          document.getElementById("admin-email").value.trim(),
          document.getElementById("admin-password").value
        );
        startPanel();
      } catch (error) {
        loginError.textContent = "E-mail ou senha inválidos.";
        console.error("Falha no login do painel:", error);
      }
    });
  }
});

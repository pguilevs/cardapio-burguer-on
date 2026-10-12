/**
 * Cardápio Digital Interativo - Burguer On Artesanal
 * Módulo de Validação de Checkout e Integração com WhatsApp
 */

import { STORE_CONFIG, formatBRL } from "./products.js";
import { getCartState, clearCart } from "./cart.js";

/**
 * Valida os dados do formulário de checkout
 */
export function validateCheckoutForm(formData) {
  const errors = {};

  if (!formData.customerName || formData.customerName.trim().length < 2) {
    errors.customerName = "Por favor, informe seu nome completo.";
  }

  const cleanPhone = (formData.customerPhone || "").replace(/\D/g, "");
  if (cleanPhone.length < 10) {
    errors.customerPhone = "Informe um número de WhatsApp válido com DDD (ex: 11 99999-9999).";
  }

  if (formData.deliveryType === "delivery") {
    if (!formData.street || formData.street.trim().length < 2) {
      errors.street = "Informe o nome da rua ou avenida.";
    }
    if (!formData.number || formData.number.trim().length < 1) {
      errors.number = "Informe o número.";
    }
    if (!formData.neighborhood || formData.neighborhood.trim().length < 2) {
      errors.neighborhood = "Informe o bairro.";
    }
  }

  if (formData.paymentMethod === "dinheiro" && formData.needChange === "sim") {
    const changeVal = parseFloat((formData.changeFor || "").replace(/\./g, "").replace(",", "."));
    const { subtotal } = getCartState();
    if (isNaN(changeVal) || changeVal <= subtotal) {
      errors.changeFor = `O valor para troco deve ser maior que o total do pedido (${formatBRL(subtotal)}).`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Formata a mensagem completa do pedido para envio via WhatsApp
 */
export function buildWhatsAppMessage(orderData) {
  const { items, subtotal } = getCartState();
  const dateStr = new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const lines = [];

  lines.push("🍔 *NOVO PEDIDO - BURGUER ON*");
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push(`*Cliente:* ${orderData.customerName.trim()}`);
  lines.push(`*Telefone:* ${orderData.customerPhone.trim()}`);
  lines.push(
    `*Tipo:* ${orderData.deliveryType === "delivery" ? "🛵 Entrega (Delivery)" : "🏬 Retirada no Local"}`
  );

  if (orderData.deliveryType === "delivery") {
    lines.push(
      `*Endereço:* ${orderData.street.trim()}, Nº ${orderData.number.trim()} - ${orderData.neighborhood.trim()}`
    );
    if (orderData.complement && orderData.complement.trim()) {
      lines.push(`*Complemento/Ref:* ${orderData.complement.trim()}`);
    }
  } else {
    lines.push(`*Local de Retirada:* ${STORE_CONFIG.address}`);
  }

  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push("*Itens:*");

  items.forEach((item) => {
    lines.push(`- ${item.quantity}x ${item.name} (${formatBRL(item.totalPrice)})`);

    if (item.extras && item.extras.length > 0) {
      item.extras.forEach((extra) => {
        lines.push(`  + Adicional: ${extra.name} (+${formatBRL(extra.price)})`);
      });
    }

    if (item.observations && item.observations.trim()) {
      lines.push(`  Obs: ${item.observations.trim()}`);
    }
  });

  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━");

  // Forma de Pagamento
  let paymentText = "";
  if (orderData.paymentMethod === "pix") {
    paymentText = "Pix (enviarei o comprovante a seguir)";
  } else if (orderData.paymentMethod === "cartao") {
    paymentText = "Cartão (Débito/Crédito na maquininha)";
  } else if (orderData.paymentMethod === "dinheiro") {
    if (orderData.needChange === "sim" && orderData.changeFor) {
      paymentText = `Dinheiro (Troco para R$ ${orderData.changeFor.trim()})`;
    } else {
      paymentText = "Dinheiro (Não precisa de troco)";
    }
  }
  lines.push(`*Forma de Pagamento:* ${paymentText}`);

  lines.push(`*Subtotal:* ${formatBRL(subtotal)}`);
  if (orderData.deliveryType === "delivery") {
    lines.push(`*Taxa de Entrega:* A confirmar`);
  }
  lines.push(`*Total:* ${formatBRL(subtotal)}`);
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push(`🕒 *Pedido realizado em:* ${dateStr}`);
  lines.push("\n_Olá! Acabei de montar meu pedido pelo cardápio digital e gostaria de confirmar._ 😊");

  return lines.join("\n");
}

/**
 * Envia o pedido pelo WhatsApp abrindo a URL oficial
 */
export function sendOrderToWhatsApp(orderData) {
  const message = buildWhatsAppMessage(orderData);
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${STORE_CONFIG.whatsappNumber}&text=${encodedMessage}`;

  // Abre em nova aba / aplicativo oficial
  window.open(whatsappUrl, "_blank");

  // Opcional: Limpar o carrinho após envio bem-sucedido
  clearCart();

  return true;
}

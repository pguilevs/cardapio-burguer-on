/**
 * Cardápio Digital Interativo - Burguer On Artesanal
 * Módulo de Validação de Checkout, Frete e Gravação no Firestore
 */

import { STORE_CONFIG, formatBRL } from "./products.js";
import { getCartState, clearCart } from "./cart.js";
import { calculateDeliveryFee } from "./shipping.js";
import { createOrder, generateNextOrderNumber } from "./firebase-config.js";

/**
 * Valida os dados do formulário de checkout
 */
export function validateCheckoutForm(formData, customFreight = null) {
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
      errors.number = "Informe o número da residência.";
    }
    if (!formData.neighborhood || formData.neighborhood.trim().length < 2) {
      errors.neighborhood = "Informe o bairro para cálculo de entrega.";
    } else {
      const deliveryInfo = calculateDeliveryFee(formData.neighborhood, formData.city || "Cotia", "delivery", formData.cep);
      if (!deliveryInfo.isDeliverable) {
        errors.delivery = deliveryInfo.message || "A entrega está indisponível para distâncias acima de 15 km da loja. Por favor, selecione 'Retirada no Local'.";
      }
    }
  }

  const { subtotal } = getCartState();
  let freight = 0;
  if (formData.deliveryType === "delivery") {
    if (customFreight !== null && typeof customFreight === "number") {
      freight = customFreight;
    } else if (formData.neighborhood) {
      const feeRes = calculateDeliveryFee(formData.neighborhood, formData.city || "Cotia", "delivery", formData.cep);
      freight = feeRes.isDeliverable ? feeRes.fee : 0;
    }
  }
  const total = subtotal + freight;

  if (formData.paymentMethod === "dinheiro" && formData.needChange === "sim") {
    const rawChange = (formData.changeFor || "").toString().replace(/\./g, "").replace(",", ".");
    const changeVal = parseFloat(rawChange);
    if (isNaN(changeVal) || changeVal <= total) {
      errors.changeFor = `O valor para troco deve ser maior que o total do pedido (${formatBRL(total)}).`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    freight,
    total
  };
}

/**
 * Formata o objeto de pedido para gravação no Firestore
 */
export function formatOrderPayload(formData, cartState, explicitFreight = null, forcedOrderNumber = null) {
  const { items, subtotal } = cartState || getCartState();
  let freight = 0;
  let distanceKm = 0;

  if (formData.deliveryType === "delivery") {
    const feeRes = calculateDeliveryFee(formData.neighborhood, formData.city || "Cotia", "delivery", formData.cep);
    distanceKm = feeRes.distanceKm || 0;
    if (explicitFreight !== null && typeof explicitFreight === "number") {
      freight = explicitFreight;
    } else {
      freight = feeRes.isDeliverable ? feeRes.fee : 0;
    }
  }

  const total = Number(((subtotal || 0) + freight).toFixed(2));
  const orderNumber = forcedOrderNumber || generateNextOrderNumber();

  let trocoPara = null;
  if (formData.paymentMethod === "dinheiro" && formData.needChange === "sim" && formData.changeFor) {
    const rawChange = formData.changeFor.toString().replace(/\./g, "").replace(",", ".");
    const parsed = parseFloat(rawChange);
    if (!isNaN(parsed)) trocoPara = parsed;
  }

  return {
    numero: orderNumber,
    tipo: formData.deliveryType || "delivery",
    status: "pendente",
    impresso: false,
    distanciaKm: Number(distanceKm.toFixed(1)),
    cliente: {
      nome: (formData.customerName || "").trim(),
      telefone: (formData.customerPhone || "").trim(),
      cep: formData.cep ? formData.cep.trim() : "",
      rua: formData.street ? formData.street.trim() : "",
      numero: formData.number ? formData.number.trim() : "",
      bairro: formData.neighborhood ? formData.neighborhood.trim() : "",
      cidade: formData.city ? formData.city.trim() : "Cotia",
      complemento: formData.complement ? formData.complement.trim() : ""
    },
    itens: (items || []).map(item => ({
      cartItemId: item.cartItemId,
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: Number((item.unitPrice || 0).toFixed(2)),
      totalPrice: Number((item.totalPrice || 0).toFixed(2)),
      extras: (item.extras || []).map(e => ({ name: e.name, price: Number(e.price) })),
      observations: item.observations ? item.observations.trim() : ""
    })),
    subtotal: Number((subtotal || 0).toFixed(2)),
    frete: Number(freight.toFixed(2)),
    total,
    pagamento: {
      metodo: formData.paymentMethod || "pix",
      trocoPara
    }
  };
}

export async function processAndSaveOrder(formData, explicitFreight = null) {
  const validation = validateCheckoutForm(formData, explicitFreight);
  if (!validation.isValid) {
    return {
      success: false,
      errors: validation.errors
    };
  }

  // Verificação de segurança: bloqueia entrega se for > 15 km
  if (formData.deliveryType === "delivery") {
    const deliveryInfo = calculateDeliveryFee(formData.neighborhood, formData.city || "Cotia", "delivery", formData.cep);
    if (!deliveryInfo.isDeliverable) {
      return {
        success: false,
        errors: {
          delivery: deliveryInfo.message || "A entrega está indisponível para distâncias acima de 15 km. Por favor, selecione 'Retirada no Local'."
        }
      };
    }
  }

  const { items, subtotal } = getCartState();
  if (!items || items.length === 0) {
    return {
      success: false,
      errors: { general: "Sua sacola está vazia." }
    };
  }

  const orderPayload = formatOrderPayload(formData, { items, subtotal }, explicitFreight);

  try {
    const result = await createOrder(orderPayload);
    // Limpa a sacola após gravação com sucesso
    clearCart();

    return {
      success: true,
      order: {
        ...orderPayload,
        id: result.id
      }
    };
  } catch (err) {
    console.error("Erro ao salvar pedido:", err);
    return {
      success: false,
      errors: { general: "Ocorreu um erro ao processar seu pedido. Tente novamente." }
    };
  }
}

/**
 * Formata a mensagem completa do pedido para envio opcional via WhatsApp
 */
export function buildWhatsAppMessage(orderData, explicitFreight = null, forcedOrderNumber = null) {
  const dateStr = new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const lines = [];

  const orderNum = orderData.numero || forcedOrderNumber;
  const numStr = orderNum ? ` #${orderNum}` : "";
  lines.push(`🍔 *PEDIDO${numStr} - BURGUER ON*`);
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push(`*Cliente:* ${(orderData.cliente?.nome || orderData.customerName || "").trim()}`);
  lines.push(`*Telefone:* ${(orderData.cliente?.telefone || orderData.customerPhone || "").trim()}`);
  
  const isDelivery = (orderData.tipo || orderData.deliveryType) === "delivery";
  lines.push(`*Tipo:* ${isDelivery ? "🛵 Entrega (Delivery)" : "🏬 Retirada no Local"}`);

  if (isDelivery) {
    const c = orderData.cliente || orderData;
    const rua = c.rua || c.street || "";
    const numero = c.numero || c.number || "";
    const bairro = c.bairro || c.neighborhood || "";
    const compl = c.complemento || c.complement || "";
    const cep = c.cep ? ` (${c.cep})` : "";
    
    lines.push(`*Endereço:* ${rua}, Nº ${numero} - ${bairro}${cep}`);
    if (compl) {
      lines.push(`*Complemento/Ref:* ${compl}`);
    }
  } else {
    lines.push(`*Local de Retirada:* ${STORE_CONFIG.address}`);
  }

  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push("*Itens:*");

  const items = orderData.itens || getCartState().items;
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
  const payMethod = orderData.pagamento?.metodo || orderData.paymentMethod;
  const troco = orderData.pagamento?.trocoPara || orderData.changeFor;

  if (payMethod === "pix") {
    paymentText = "Pix (enviarei o comprovante a seguir)";
  } else if (payMethod === "cartao") {
    paymentText = "Cartão (Débito/Crédito na maquininha)";
  } else if (payMethod === "dinheiro") {
    if (troco) {
      paymentText = `Dinheiro (Troco para R$ ${troco})`;
    } else {
      paymentText = "Dinheiro (Não precisa de troco)";
    }
  }
  lines.push(`*Forma de Pagamento:* ${paymentText}`);

  const subtotal = orderData.subtotal ?? getCartState().subtotal;
  let frete = 0;
  if (isDelivery) {
    if (orderData.frete !== undefined) {
      frete = Number(orderData.frete);
    } else if (explicitFreight !== null) {
      frete = Number(explicitFreight);
    }
  }
  const total = orderData.total ?? (subtotal + frete);

  lines.push(`*Subtotal:* ${formatBRL(subtotal)}`);
  if (isDelivery) {
    lines.push(`*Taxa de Entrega:* ${frete > 0 ? formatBRL(frete) : "Grátis"}`);
  }
  lines.push(`*Total:* ${formatBRL(total)}`);
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push(`🕒 *Realizado em:* ${dateStr}`);
  lines.push("\n_Olá! Meu pedido já foi registrado no sistema e gostaria de acompanhar o preparo._ 😊");

  return lines.join("\n");
}

/**
 * Envia o pedido pelo WhatsApp abrindo a URL oficial
 */
export function sendOrderToWhatsApp(orderData) {
  const message = buildWhatsAppMessage(orderData);
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${STORE_CONFIG.whatsappNumber}&text=${encodedMessage}`;

  window.open(whatsappUrl, "_blank");
  return true;
}

/**
 * Testes Automatizados de Unidade e Integração do Cardápio
 * Executa via Node.js
 */

import { STORE_CONFIG, CATEGORIES, PRODUCTS, EXTRA_ITEMS, formatBRL } from "../assets/js/products.js";
import {
  initCart,
  addToCart,
  getCartState,
  incrementCartItem,
  decrementCartItem,
  removeItemFromCart,
  clearCart
} from "../assets/js/cart.js";
import { validateCheckoutForm, buildWhatsAppMessage, formatOrderPayload } from "../assets/js/checkout.js";
import { calculateDeliveryFee, formatCEPMask, SHIPPING_RATES } from "../assets/js/shipping.js";
import { createOrder, updateOrderStatus, subscribeToOrders } from "../assets/js/firebase-config.js";

// Mock localStorage para Node.js
global.localStorage = {
  _data: {},
  getItem(key) { return this._data[key] || null; },
  setItem(key, val) { this._data[key] = String(val); },
  removeItem(key) { delete this._data[key]; },
  clear() { this._data = {}; }
};

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
    failed++;
  }
}

console.log("=== INICIANDO TESTES DO CARDÁPIO BURGUER ON ===\n");

// 1. Teste de Dados do Cardápio
assert(STORE_CONFIG.whatsappNumber === "5511913219550", "Número do WhatsApp configurado corretamente");
assert(STORE_CONFIG.address.includes("Rua Luiz Correia, 44"), "Endereço da loja confere (nº 44)");
assert(STORE_CONFIG.openingHoursDisplay.includes("11:00 às 14:00"), "Horário de almoço configurado");
assert(CATEGORIES.length === 6, "Total de 6 categorias cadastradas");
assert(EXTRA_ITEMS.length === 6, "Total de 6 adicionais cadastrados");

const lanches = PRODUCTS.filter(p => p.categoryId === "lanches");
assert(lanches.length === 8, "Exatamente 8 lanches artesanais cadastrados");

const combosEsp = PRODUCTS.filter(p => p.categoryId === "combos-especiais");
assert(combosEsp.length === 4, "Exatamente 4 combos especiais cadastrados");

const combosInd = PRODUCTS.filter(p => p.categoryId === "combos-individuais");
assert(combosInd.length === 5, "Exatamente 5 combos individuais cadastrados");

const porcoes = PRODUCTS.filter(p => p.categoryId === "porcoes");
assert(porcoes.length === 3, "Exatamente 3 porções cadastradas");

const bebidas = PRODUCTS.filter(p => p.categoryId === "bebidas");
assert(bebidas.length === 11, "Exatamente 11 bebidas cadastradas");

const sobremesas = PRODUCTS.filter(p => p.categoryId === "sobremesas");
assert(sobremesas.length === 7, "Exatamente 7 sobremesas Lele Bolos no Pote cadastradas");

// 2. Testes do Carrinho
initCart();
clearCart();

const xTudo = PRODUCTS.find(p => p.id === "x-tudo");
const baconExtra = EXTRA_ITEMS.find(e => e.id === "extra-bacon");

addToCart({
  product: xTudo,
  extras: [baconExtra],
  observations: "Sem tomate",
  quantity: 1
});

let state = getCartState();
assert(state.items.length === 1, "Item adicionado ao carrinho");
// X-Tudo 44.99 + Bacon 2.99 = 47.98
assert(Math.abs(state.subtotal - 47.98) < 0.01, `Cálculo com adicional correto: R$ ${state.subtotal.toFixed(2)} (esperado 47.98)`);

// Incrementa
incrementCartItem(state.items[0].cartItemId);
state = getCartState();
assert(state.items[0].quantity === 2, "Quantidade incrementada para 2");
assert(Math.abs(state.subtotal - 95.96) < 0.01, "Subtotal duplicado corretamente");

// 3. Testes do Módulo de CEP e Frete Regional de Cotia (Raio Máximo: 20 km)
assert(formatCEPMask("06716040") === "06716-040", "Máscara de CEP com 8 dígitos formatada corretamente");
assert(formatCEPMask("06716") === "06716", "Máscara de CEP incompleta tratada");

// Entregas autorizadas (distância <= 20 km)
const moinho = calculateDeliveryFee("Moinho Velho", "Cotia", "delivery");
assert(moinho.fee === 5.00 && moinho.isDeliverable === true, "Frete Moinho Velho R$ 5,00 (dentro do limite)");
assert(!moinho.label.includes("km"), "Label de frete NÃO contém informação de km");

const rosemary = calculateDeliveryFee("Jardim Rosemary", "Cotia", "delivery");
assert(rosemary.fee === 6.00 && rosemary.isDeliverable === true, "Frete Jardim Rosemary R$ 6,00 (dentro do limite)");

const pqAlexandre = calculateDeliveryFee("Parque Alexandre", "Cotia", "delivery");
assert(pqAlexandre.fee === 7.00 && pqAlexandre.isDeliverable === true, "Frete Parque Alexandre R$ 7,00 (dentro do limite)");

const nomura = calculateDeliveryFee("Jardim Nomura", "Cotia", "delivery");
assert(nomura.fee === 7.00 && nomura.isDeliverable === true, "Frete Jardim Nomura R$ 7,00 (dentro do limite)");

const centro = calculateDeliveryFee("Centro", "Cotia", "delivery");
assert(centro.fee === 8.00 && centro.isDeliverable === true, "Frete Centro de Cotia R$ 8,00 (dentro do limite)");

const granja = calculateDeliveryFee("Granja Viana", "Cotia", "delivery");
assert(granja.fee === 14.00 && granja.isDeliverable === true, "Frete Granja Viana R$ 14,00 (dentro do limite)");

const padraoCotia = calculateDeliveryFee("Bairro Não Mapeado", "Cotia", "delivery");
assert(padraoCotia.fee === 8.50 && padraoCotia.isDeliverable === true, "Frete Padrão Cotia R$ 8,50 (dentro do limite)");

const itapevi = calculateDeliveryFee("Centro", "Itapevi", "delivery");
assert(itapevi.fee === 15.00 && itapevi.isDeliverable === true, "Frete Itapevi R$ 15,00 (dentro do limite de 20 km)");

const vargemGrande = calculateDeliveryFee("Centro", "Vargem Grande Paulista", "delivery");
assert(vargemGrande.fee === 15.00 && vargemGrande.isDeliverable === true, "Frete Vargem Grande Paulista R$ 15,00 (dentro do limite de 20 km)");

const jandira = calculateDeliveryFee("Centro", "Jandira", "delivery");
assert(jandira.fee === 15.00 && jandira.isDeliverable === true, "Frete Jandira R$ 15,00 (dentro do limite de 20 km)");

// Novas regiões autorizadas com o limite aumentado para 20 km
const caucaia = calculateDeliveryFee("Caucaia do Alto", "Cotia", "delivery");
assert(caucaia.fee === 16.00 && caucaia.isDeliverable === true, "Caucaia do Alto (~19.5 km <= 20 km) agora é ENTREGÁVEL");

const carapicuiba = calculateDeliveryFee("Centro", "Carapicuíba", "delivery");
assert(carapicuiba.fee === 15.00 && carapicuiba.isDeliverable === true, "Carapicuíba (~16.5 km <= 20 km) agora é ENTREGÁVEL");

const barueri = calculateDeliveryFee("Alphaville", "Barueri", "delivery");
assert(barueri.fee === 15.00 && barueri.isDeliverable === true, "Barueri / Alphaville (~17.5 km <= 20 km) agora é ENTREGÁVEL");

const retirada = calculateDeliveryFee("Moinho Velho", "Cotia", "retirada");
assert(retirada.fee === 0.00 && retirada.isDeliverable === true, "Frete Retirada no Local R$ 0,00 (sempre permitido)");

// BLOQUEIO OBRIGATÓRIO: Distâncias superiores a 20 km NÃO podem realizar entrega
const osasco = calculateDeliveryFee("Centro", "Osasco", "delivery");
assert(osasco.isDeliverable === false, "Osasco (~21 km > 20 km) bloqueado para entrega");
assert(osasco.message.includes("20 km"), "Mensagem de Osasco menciona limite de 20 km");

const saoPaulo = calculateDeliveryFee("Pinheiros", "São Paulo", "delivery");
assert(saoPaulo.isDeliverable === false, "São Paulo Capital (~25 km > 20 km) bloqueado para entrega");

// 4. Testes de Validação do Checkout
const formInvalido = {
  customerName: "",
  customerPhone: "123",
  deliveryType: "delivery",
  street: "",
  number: "",
  neighborhood: "",
  paymentMethod: "pix"
};
const valInvalida = validateCheckoutForm(formInvalido);
assert(!valInvalida.isValid, "Formulário incompleto rejeitado com sucesso");
assert(valInvalida.errors.customerName !== undefined, "Erro no nome detectado");
assert(valInvalida.errors.customerPhone !== undefined, "Erro no telefone detectado");
assert(valInvalida.errors.street !== undefined, "Erro na rua detectado");

// Formulário com endereço além de 20 km DEVE ser rejeitado para entrega
const formDistanteBloqueado = {
  customerName: "Mariana de Osasco",
  customerPhone: "(11) 98888-7777",
  deliveryType: "delivery",
  street: "Avenida dos Autonomistas",
  number: "1000",
  neighborhood: "Centro",
  city: "Osasco",
  paymentMethod: "pix"
};
const valDistante = validateCheckoutForm(formDistanteBloqueado);
assert(!valDistante.isValid, "Formulário com distância > 20 km rejeitado para delivery");
assert(valDistante.errors.delivery !== undefined, "Erro explícito de limite de entrega gerado");

// Morador de Osasco (> 20 km) escolhendo Retirada no Local DEVE ser aceito
const formOsascoRetirada = {
  customerName: "Mariana de Osasco",
  customerPhone: "(11) 98888-7777",
  deliveryType: "retirada",
  paymentMethod: "pix"
};
const valOsascoRetirada = validateCheckoutForm(formOsascoRetirada);
assert(valOsascoRetirada.isValid, "Morador de Osasco aceito para Retirada no Local");

const formValidoDelivery = {
  customerName: "Carlos Silva",
  customerPhone: "(11) 98765-4321",
  deliveryType: "delivery",
  cep: "06716-040",
  street: "Rua das Amendoeiras",
  number: "100",
  neighborhood: "Moinho Velho",
  city: "Cotia",
  complement: "Apto 42",
  paymentMethod: "pix"
};
const valValidaDelivery = validateCheckoutForm(formValidoDelivery);
assert(valValidaDelivery.isValid, "Formulário de delivery válido aceito com sucesso");

// 5. Testes de Troco em Dinheiro: SEM limites, sem erros bloqueantes
const formTrocoSemValor = {
  customerName: "João Pedro",
  customerPhone: "(11) 91234-5678",
  deliveryType: "retirada",
  paymentMethod: "dinheiro",
  needChange: "sim",
  changeFor: "" // Sem valor digitado
};
const valTrocoSemValor = validateCheckoutForm(formTrocoSemValor);
assert(valTrocoSemValor.isValid, "Cliente marcando que precisa de troco SEM valor é aceito sem erro");

const formTrocoValorQualquer = {
  customerName: "João Pedro",
  customerPhone: "(11) 91234-5678",
  deliveryType: "retirada",
  paymentMethod: "dinheiro",
  needChange: "sim",
  changeFor: "5,00" // Mesmo menor que o lanche, não deve haver bloqueio
};
const valTrocoValorQualquer = validateCheckoutForm(formTrocoValorQualquer);
assert(valTrocoValorQualquer.isValid, "Cliente com troco não é bloqueado por limite de valor");

// 6. Teste da Estrutura do Pedido para Firestore
const payload = formatOrderPayload(formValidoDelivery, state, 5.00, "1005");
assert(payload.numero === "1005", "Número do pedido sequencial presente no payload");
assert(payload.status === "pendente", "Status inicial é pendente");
assert(payload.impresso === false, "Flag impresso é false inicialmente");
assert(payload.tipo === "delivery", "Tipo é delivery");
assert(payload.frete === 5.00, "Taxa de entrega computada corretamente no payload");
assert(payload.cliente.nome === "Carlos Silva", "Nome do cliente preservado");
assert(payload.cliente.bairro === "Moinho Velho", "Bairro do cliente preservado");
assert(payload.itens.length === 1, "Itens do carrinho presentes no payload");
assert(Math.abs(payload.total - (state.subtotal + 5.00)) < 0.01, "Total do pedido é subtotal + frete");

// Teste de payload com troco sem valor especificado
const payloadTrocoSemValor = formatOrderPayload(formTrocoSemValor, state, 0, "1006");
assert(payloadTrocoSemValor.pagamento.precisaTroco === true, "Payload registra precisaTroco = true");
assert(payloadTrocoSemValor.pagamento.trocoPara === "Sim (levar troco)", "Payload define trocoPara padrão legível");

// 7. Teste da Mensagem Opcional de WhatsApp
const msg = buildWhatsAppMessage(formValidoDelivery, 5.00, "1005");
assert(msg.includes("🍔 *PEDIDO #1005 - BURGUER ON*"), "Título do pedido com número presente na mensagem");
assert(msg.includes("*Cliente:* Carlos Silva"), "Nome do cliente formatado corretamente");
assert(msg.includes("X-Tudo"), "Nome do lanche presente");
assert(msg.includes("+ Adicional: Bacon"), "Adicional presente");
assert(msg.includes("Obs: Sem tomate"), "Observação presente");
assert(msg.includes("*Forma de Pagamento:* Pix"), "Forma de pagamento presente");
assert(msg.includes("*Taxa de Entrega:*") && msg.includes("5,00"), "Taxa de entrega presente no WhatsApp");

// Teste do WhatsApp com troco
const msgTroco = buildWhatsAppMessage(payloadTrocoSemValor, 0, "1006");
// 8. Teste de Transição de Status em Tempo Real sem Reload
let receivedUpdateCount = 0;
let lastReceivedOrders = [];
const unsubscribe = subscribeToOrders((orders) => {
  receivedUpdateCount++;
  lastReceivedOrders = orders;
});

const createdOrder = await createOrder({
  cliente: { nome: "Teste Transição", telefone: "11999999999" },
  itens: [],
  subtotal: 30,
  frete: 5,
  total: 35,
  pagamento: { metodo: "pix" }
});

assert(lastReceivedOrders.some(o => o.id === createdOrder.id && o.status === "pendente"), "Novo pedido registrado como pendente recebido pelo subscriber");

// Avança para preparo
await updateOrderStatus(createdOrder.id, "preparo");
assert(lastReceivedOrders.some(o => o.id === createdOrder.id && o.status === "preparo"), "Status 'preparo' refletido no subscriber imediatamente sem reload");

// Avança para entrega
await updateOrderStatus(createdOrder.id, "entrega");
assert(lastReceivedOrders.some(o => o.id === createdOrder.id && o.status === "entrega"), "Status 'entrega' refletido no subscriber imediatamente sem reload");

// Avança para finalizado
await updateOrderStatus(createdOrder.id, "finalizado");
assert(lastReceivedOrders.some(o => o.id === createdOrder.id && o.status === "finalizado"), "Status 'finalizado' refletido no subscriber imediatamente sem reload");

unsubscribe();

console.log("\n================================================");
console.log(`TOTAL: ${passed} passaram, ${failed} falharam.`);
console.log("================================================\n");

if (failed > 0) process.exit(1);
process.exit(0);

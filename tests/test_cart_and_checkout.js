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

// 3. Testes do Módulo de CEP e Frete Regional de Cotia
assert(formatCEPMask("06716040") === "06716-040", "Máscara de CEP com 8 dígitos formatada corretamente");
assert(formatCEPMask("06716") === "06716", "Máscara de CEP incompleta tratada");

// Frete por bairro de Cotia
assert(calculateDeliveryFee("Moinho Velho", "Cotia", "delivery").fee === 5.00, "Frete Moinho Velho R$ 5,00");
assert(calculateDeliveryFee("Jardim Rosemary", "Cotia", "delivery").fee === 6.00, "Frete Jardim Rosemary R$ 6,00");
assert(calculateDeliveryFee("Parque Alexandre", "Cotia", "delivery").fee === 7.00, "Frete Parque Alexandre R$ 7,00");
assert(calculateDeliveryFee("Jardim Nomura", "Cotia", "delivery").fee === 7.00, "Frete Jardim Nomura R$ 7,00");
assert(calculateDeliveryFee("Centro", "Cotia", "delivery").fee === 8.00, "Frete Centro de Cotia R$ 8,00");
assert(calculateDeliveryFee("Granja Viana", "Cotia", "delivery").fee === 14.00, "Frete Granja Viana R$ 14,00");
assert(calculateDeliveryFee("Caucaia do Alto", "Cotia", "delivery").fee === 16.00, "Frete Caucaia do Alto R$ 16,00");
assert(calculateDeliveryFee("Bairro Não Mapeado", "Cotia", "delivery").fee === 8.50, "Frete Padrão Cotia R$ 8,50");
assert(calculateDeliveryFee("Centro", "Itapevi", "delivery").fee === 15.00, "Frete Cidades Vizinhas R$ 15,00");
assert(calculateDeliveryFee("Moinho Velho", "Cotia", "retirada").fee === 0.00, "Frete Retirada no Local R$ 0,00");

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

// 5. Teste de Retirada no Local
const formValidoRetirada = {
  customerName: "Mariana Souza",
  customerPhone: "(11) 91234-5678",
  deliveryType: "retirada",
  paymentMethod: "dinheiro",
  needChange: "sim",
  changeFor: "120,00"
};
const valValidaRetirada = validateCheckoutForm(formValidoRetirada);
assert(valValidaRetirada.isValid, "Formulário de retirada aceito sem exigir endereço residencial");

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

// 7. Teste da Mensagem Opcional de WhatsApp
const msg = buildWhatsAppMessage(formValidoDelivery, 5.00, "1005");
assert(msg.includes("🍔 *PEDIDO #1005 - BURGUER ON*"), "Título do pedido com número presente na mensagem");
assert(msg.includes("*Cliente:* Carlos Silva"), "Nome do cliente formatado corretamente");
assert(msg.includes("X-Tudo"), "Nome do lanche presente");
assert(msg.includes("+ Adicional: Bacon"), "Adicional presente");
assert(msg.includes("Obs: Sem tomate"), "Observação presente");
assert(msg.includes("*Forma de Pagamento:* Pix"), "Forma de pagamento presente");
assert(msg.includes("*Taxa de Entrega:*") && msg.includes("5,00"), "Taxa de entrega presente no WhatsApp");

console.log("\n================================================");
console.log(`TOTAL: ${passed} passaram, ${failed} falharam.`);
console.log("================================================\n");

if (failed > 0) process.exit(1);

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
import { validateCheckoutForm, buildWhatsAppMessage } from "../assets/js/checkout.js";

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

// 3. Testes de Validação do Checkout
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
  street: "Av. Brasil",
  number: "100",
  neighborhood: "Jardim das Flores",
  complement: "Apto 42",
  paymentMethod: "pix"
};
const valValidaDelivery = validateCheckoutForm(formValidoDelivery);
assert(valValidaDelivery.isValid, "Formulário de delivery válido aceito com sucesso");

// 4. Teste de Retirada no Local
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

// 5. Teste da Mensagem Formatada para WhatsApp
const msg = buildWhatsAppMessage(formValidoDelivery);
assert(msg.includes("🍔 *NOVO PEDIDO - BURGUER ON*"), "Título do pedido presente na mensagem");
assert(msg.includes("*Cliente:* Carlos Silva"), "Nome do cliente formatado corretamente");
assert(msg.includes("X-Tudo"), "Nome do lanche presente");
assert(msg.includes("+ Adicional: Bacon"), "Adicional presente");
assert(msg.includes("Obs: Sem tomate"), "Observação presente");
assert(msg.includes("*Forma de Pagamento:* Pix"), "Forma de pagamento presente");

console.log("\n================================================");
console.log(`TOTAL: ${passed} passaram, ${failed} falharam.`);
console.log("================================================\n");

if (failed > 0) process.exit(1);

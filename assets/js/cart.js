/**
 * Cardápio Digital Interativo - Burguer On Artesanal
 * Módulo de Gerenciamento do Carrinho de Compras
 */

const STORAGE_KEY = "burguer_on_cart_v1";

let cartItems = [];
const listeners = [];

/**
 * Carrega itens do localStorage
 */
export function initCart() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      cartItems = JSON.parse(saved);
      // Validar estrutura
      if (!Array.isArray(cartItems)) cartItems = [];
    }
  } catch (e) {
    console.error("Erro ao carregar carrinho:", e);
    cartItems = [];
  }
  notifyListeners();
}

/**
 * Salva carrinho no localStorage
 */
function persistCart() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
  } catch (e) {
    console.error("Erro ao salvar carrinho:", e);
  }
  notifyListeners();
}

/**
 * Inscreve uma função para ser executada quando o carrinho mudar
 */
export function subscribeToCart(callback) {
  if (typeof callback === "function") {
    listeners.push(callback);
    // Dispara estado inicial
    callback(getCartState());
  }
}

function notifyListeners() {
  const state = getCartState();
  listeners.forEach((fn) => {
    try {
      fn(state);
    } catch (err) {
      console.error("Erro no ouvinte do carrinho:", err);
    }
  });
}

/**
 * Retorna o estado consolidado do carrinho
 */
export function getCartState() {
  const totalItemsCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cartItems.reduce((acc, item) => acc + item.totalPrice, 0);

  return {
    items: [...cartItems],
    totalItemsCount,
    subtotal
  };
}

/**
 * Gera um ID único para o item no carrinho baseado no produto, adicionais e observações
 */
function generateCartItemId(productId, extras = [], observations = "") {
  const extrasKey = extras
    .map((e) => e.id)
    .sort()
    .join("-");
  const obsKey = (observations || "").trim().toLowerCase();
  return `${productId}__${extrasKey}__${obsKey}`;
}

/**
 * Adiciona um produto ao carrinho
 */
export function addToCart({ product, extras = [], observations = "", quantity = 1 }) {
  const extrasPrice = extras.reduce((sum, item) => sum + item.price, 0);
  const unitPrice = product.price + extrasPrice;
  const qty = Math.max(1, parseInt(quantity, 10) || 1);
  const cartItemId = generateCartItemId(product.id, extras, observations);

  const existingIndex = cartItems.findIndex((item) => item.cartItemId === cartItemId);

  if (existingIndex > -1) {
    // Atualiza quantidade do item existente se tiver exatamente os mesmos adicionais e obs
    cartItems[existingIndex].quantity += qty;
    cartItems[existingIndex].totalPrice = cartItems[existingIndex].quantity * cartItems[existingIndex].unitPrice;
  } else {
    // Cria novo item no carrinho
    cartItems.push({
      cartItemId,
      productId: product.id,
      name: product.name,
      image: product.image,
      basePrice: product.price,
      extras: [...extras],
      observations: (observations || "").trim(),
      quantity: qty,
      unitPrice,
      totalPrice: unitPrice * qty
    });
  }

  persistCart();
  return true;
}

/**
 * Atualiza quantidade de um item
 */
export function updateCartItemQuantity(cartItemId, newQuantity) {
  const index = cartItems.findIndex((item) => item.cartItemId === cartItemId);
  if (index === -1) return;

  const qty = parseInt(newQuantity, 10);
  if (qty <= 0) {
    removeItemFromCart(cartItemId);
    return;
  }

  cartItems[index].quantity = qty;
  cartItems[index].totalPrice = cartItems[index].unitPrice * qty;
  persistCart();
}

/**
 * Incrementa em 1 a quantidade
 */
export function incrementCartItem(cartItemId) {
  const item = cartItems.find((i) => i.cartItemId === cartItemId);
  if (item) {
    updateCartItemQuantity(cartItemId, item.quantity + 1);
  }
}

/**
 * Decrementa em 1 a quantidade
 */
export function decrementCartItem(cartItemId) {
  const item = cartItems.find((i) => i.cartItemId === cartItemId);
  if (item) {
    updateCartItemQuantity(cartItemId, item.quantity - 1);
  }
}

/**
 * Remove um item do carrinho
 */
export function removeItemFromCart(cartItemId) {
  cartItems = cartItems.filter((item) => item.cartItemId !== cartItemId);
  persistCart();
}

/**
 * Limpa todo o carrinho
 */
export function clearCart() {
  cartItems = [];
  persistCart();
}

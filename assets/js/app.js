/**
 * Cardápio Digital Interativo - Burguer On Artesanal
 * Controlador Principal da Aplicação SPA
 */

import { STORE_CONFIG, CATEGORIES, PRODUCTS, EXTRA_ITEMS, formatBRL } from "./products.js?v=20261012i";
import {
  initCart,
  subscribeToCart,
  getCartState,
  addToCart,
  incrementCartItem,
  decrementCartItem,
  removeItemFromCart
} from "./cart.js";
import { validateCheckoutForm, sendOrderToWhatsApp } from "./checkout.js";

// Estado interno da UI
let currentModalProduct = null;
let currentModalSelectedExtras = [];
let currentModalQuantity = 1;
let activeCategoryFilter = "all";
let searchTerm = "";

// Elementos principais do DOM
const dom = {
  storeStatusDot: document.getElementById("store-status-dot"),
  storeStatusText: document.getElementById("store-status-text"),
  categoriesNav: document.getElementById("categories-nav"),
  productsContainer: document.getElementById("products-container"),
  searchInput: document.getElementById("search-input"),
  clearSearchBtn: document.getElementById("clear-search-btn"),

  // Modal Detalhes do Produto
  productModal: document.getElementById("product-modal"),
  productModalBackdrop: document.getElementById("product-modal-backdrop"),
  productModalContent: document.getElementById("product-modal-content"),
  modalCloseBtn: document.getElementById("modal-close-btn"),
  modalProductImg: document.getElementById("modal-product-img"),
  modalProductName: document.getElementById("modal-product-name"),
  modalProductBadge: document.getElementById("modal-product-badge"),
  modalProductDesc: document.getElementById("modal-product-desc"),
  modalProductPrice: document.getElementById("modal-product-price"),
  modalExtrasSection: document.getElementById("modal-extras-section"),
  modalExtrasList: document.getElementById("modal-extras-list"),
  modalObsInput: document.getElementById("modal-obs-input"),
  modalQtyMinus: document.getElementById("modal-qty-minus"),
  modalQtyPlus: document.getElementById("modal-qty-plus"),
  modalQtyValue: document.getElementById("modal-qty-value"),
  modalAddBtn: document.getElementById("modal-add-btn"),
  modalAddPrice: document.getElementById("modal-add-price"),

  // Carrinho e Checkout Drawer
  cartDrawer: document.getElementById("cart-drawer"),
  cartBackdrop: document.getElementById("cart-backdrop"),
  cartDrawerContent: document.getElementById("cart-drawer-content"),
  openCartBtn: document.getElementById("open-cart-btn"),
  closeCartBtn: document.getElementById("close-cart-btn"),
  headerCartCount: document.getElementById("header-cart-count"),
  headerCartBadge: document.getElementById("header-cart-badge"),
  cartItemsList: document.getElementById("cart-items-list"),
  cartEmptyState: document.getElementById("cart-empty-state"),
  cartSubtotalText: document.getElementById("cart-subtotal-text"),
  cartTotalText: document.getElementById("cart-total-text"),

  // Barra Flutuante Mobile
  floatingCartBar: document.getElementById("floating-cart-bar"),
  floatingCartQty: document.getElementById("floating-cart-qty"),
  floatingCartTotal: document.getElementById("floating-cart-total"),

  // Formulário de Checkout
  deliveryTypeDelivery: document.getElementById("type-delivery"),
  deliveryTypePickup: document.getElementById("type-pickup"),
  deliveryAddressFields: document.getElementById("delivery-address-fields"),
  pickupInfoCard: document.getElementById("pickup-info-card"),
  inputCustomerName: document.getElementById("input-customer-name"),
  inputCustomerPhone: document.getElementById("input-customer-phone"),
  inputStreet: document.getElementById("input-street"),
  inputNumber: document.getElementById("input-number"),
  inputNeighborhood: document.getElementById("input-neighborhood"),
  inputComplement: document.getElementById("input-complement"),
  paymentPix: document.getElementById("payment-pix"),
  paymentCartao: document.getElementById("payment-cartao"),
  paymentDinheiro: document.getElementById("payment-dinheiro"),
  cashChangeSection: document.getElementById("cash-change-section"),
  toggleNeedChange: document.getElementById("toggle-need-change"),
  inputChangeFor: document.getElementById("input-change-for"),
  pixInfoCard: document.getElementById("pix-info-card"),
  submitOrderBtn: document.getElementById("submit-order-btn"),

  // Toasts
  toastContainer: document.getElementById("toast-container")
};

/**
 * Inicialização do App
 */
document.addEventListener("DOMContentLoaded", () => {
  initStoreStatus();
  renderCategories();
  renderProducts();
  setupEventListeners();
  initCart();
  subscribeToCart(handleCartUpdate);
});

/**
 * Verifica e exibe o status de funcionamento da loja
 */
function initStoreStatus() {
  let isOpen = true;

  if (STORE_CONFIG.manualStatus !== null) {
    isOpen = Boolean(STORE_CONFIG.manualStatus);
  } else {
    // Horários de Funcionamento:
    // 1. Almoço: Segunda a Sábado das 11:00 às 14:00 (dias 1 a 6)
    // 2. Jantar/Noite: Quarta a Domingo das 18:00 às 23:30 (dias 0, 3, 4, 5, 6)
    const now = new Date();
    const day = now.getDay(); // 0 = Dom, 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex, 6 = Sáb
    const hour = now.getHours();
    const minute = now.getMinutes();
    const totalMinutes = hour * 60 + minute;

    // Almoço: Segunda a Sábado das 11h às 14h
    const isLunchDay = day >= 1 && day <= 6;
    const isLunchHour = totalMinutes >= 11 * 60 && totalMinutes <= 14 * 60;
    const isLunchOpen = isLunchDay && isLunchHour;

    // Jantar/Noite: Quarta a Domingo das 18h às 23h30
    const isDinnerDay = day === 0 || (day >= 3 && day <= 6);
    const isDinnerHour = totalMinutes >= 18 * 60 && totalMinutes <= 23 * 60 + 30;
    const isDinnerOpen = isDinnerDay && isDinnerHour;

    isOpen = isLunchOpen || isDinnerOpen;
  }

  if (isOpen) {
    dom.storeStatusDot.className = "w-2.5 h-2.5 rounded-full status-dot-open";
    dom.storeStatusText.textContent = "Aberto Agora";
    dom.storeStatusText.className = "text-xs font-semibold text-emerald-400";
  } else {
    dom.storeStatusDot.className = "w-2.5 h-2.5 rounded-full status-dot-closed";
    dom.storeStatusText.textContent = "Fechado (Aceitando pedidos agendados)";
    dom.storeStatusText.className = "text-xs font-semibold text-rose-400";
  }
}

/**
 * Renderiza os chips de categorias na navegação horizontal
 */
function renderCategories() {
  dom.categoriesNav.innerHTML = "";

  // Botão "Todos"
  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = `category-chip flex-shrink-0 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
    activeCategoryFilter === "all"
      ? "bg-amber-500 text-zinc-950 shadow-md font-bold"
      : "bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/50"
  }`;
  allBtn.innerHTML = `<span>✨</span><span>Todos</span>`;
  allBtn.addEventListener("click", () => filterByCategory("all"));
  dom.categoriesNav.appendChild(allBtn);

  CATEGORIES.forEach((cat) => {
    const btn = document.createElement("button");
    btn.type = "button";
    const isLele = cat.id === "sobremesas";

    let btnClasses = "category-chip flex-shrink-0 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ";
    if (activeCategoryFilter === cat.id) {
      if (isLele) {
        btnClasses += "lele-badge text-white font-bold ring-2 ring-rose-400/50";
      } else {
        btnClasses += "bg-amber-500 text-zinc-950 shadow-md font-bold";
      }
    } else {
      if (isLele) {
        btnClasses += "bg-zinc-800/80 text-rose-300 hover:bg-rose-950/40 border border-rose-500/30";
      } else {
        btnClasses += "bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/50";
      }
    }

    btn.className = btnClasses;
    btn.innerHTML = `<span>${cat.icon}</span><span>${cat.name}</span>`;
    btn.addEventListener("click", () => {
      filterByCategory(cat.id);
      // Rola até a categoria suavemente se estiver exibindo todos
      const section = document.getElementById(`category-section-${cat.id}`);
      if (section) {
        const yOffset = -130;
        const y = section.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    });
    dom.categoriesNav.appendChild(btn);
  });
}

function filterByCategory(categoryId) {
  activeCategoryFilter = categoryId;
  renderCategories();
  renderProducts();
}

/**
 * Renderiza o catálogo de produtos agrupado por seções
 */
function renderProducts() {
  dom.productsContainer.innerHTML = "";

  const term = searchTerm.trim().toLowerCase();

  const filteredCategories = CATEGORIES.filter((cat) => {
    if (activeCategoryFilter !== "all" && activeCategoryFilter !== cat.id) {
      return false;
    }
    return true;
  });

  let totalMatches = 0;

  filteredCategories.forEach((cat) => {
    const categoryProducts = PRODUCTS.filter((p) => {
      if (p.categoryId !== cat.id) return false;
      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        (p.badge && p.badge.toLowerCase().includes(term))
      );
    });

    if (categoryProducts.length === 0) return;
    totalMatches += categoryProducts.length;

    const isLele = cat.id === "sobremesas";

    // Seção da Categoria
    const section = document.createElement("section");
    section.id = `category-section-${cat.id}`;
    section.className = "mb-10 scroll-mt-36";

    // Cabeçalho da Seção
    const headerWrapper = document.createElement("div");
    if (isLele) {
      headerWrapper.className = "lele-category-header p-4 sm:p-5 rounded-2xl mb-5";
      headerWrapper.innerHTML = `
        <div class="flex items-center gap-3 mb-1.5">
          <span class="text-2xl sm:text-3xl">🍰</span>
          <div>
            <h2 class="text-lg sm:text-xl font-extrabold lele-text-gradient tracking-tight">${cat.name}</h2>
            <span class="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
              Confeitaria Artesanal Afetiva
            </span>
          </div>
        </div>
        <p class="text-xs sm:text-sm text-zinc-300 max-w-2xl">${cat.description}</p>
      `;
    } else {
      headerWrapper.className = "mb-4 border-b border-zinc-800 pb-3";
      headerWrapper.innerHTML = `
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xl sm:text-2xl">${cat.icon}</span>
          <h2 class="text-lg sm:text-xl font-bold text-zinc-100 tracking-tight">${cat.name}</h2>
        </div>
        <p class="text-xs sm:text-sm text-zinc-400">${cat.description}</p>
      `;
    }

    section.appendChild(headerWrapper);

    // Grid de Cards de Produtos
    const grid = document.createElement("div");
    grid.className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4";

    categoryProducts.forEach((product) => {
      const card = createProductCard(product, isLele);
      grid.appendChild(card);
    });

    section.appendChild(grid);
    dom.productsContainer.appendChild(section);
  });

  if (totalMatches === 0) {
    dom.productsContainer.innerHTML = `
      <div class="text-center py-16 px-4 bg-zinc-900/40 rounded-2xl border border-zinc-800/80 my-8">
        <div class="text-4xl mb-3">🔍</div>
        <h3 class="text-lg font-bold text-zinc-200 mb-1">Nenhum item encontrado</h3>
        <p class="text-sm text-zinc-400 max-w-md mx-auto">
          Não encontramos resultados para "${escapeHTML(term)}". Tente buscar por outro termo ou limpe o filtro.
        </p>
        <button id="reset-search-btn" class="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold text-xs rounded-full transition-all">
          Ver cardápio completo
        </button>
      </div>
    `;
    const resetBtn = document.getElementById("reset-search-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        searchTerm = "";
        dom.searchInput.value = "";
        dom.clearSearchBtn.classList.add("hidden");
        filterByCategory("all");
      });
    }
  }
}

/**
 * Cria o elemento de card do produto com design estilo iFood
 */
function createProductCard(product, isLele = false) {
  const card = document.createElement("article");
  card.className = `product-card rounded-2xl p-3 sm:p-4 bg-zinc-900/90 flex flex-col justify-between cursor-pointer group ${
    isLele ? "lele-card" : ""
  }`;

  const badgeHtml = product.badge
    ? `<span class="inline-block self-start text-[10px] font-bold px-2 py-0.5 rounded-md mb-2 ${
        isLele ? "lele-badge" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
      }">${product.badge}</span>`
    : "";

  card.innerHTML = `
    <div class="flex gap-3 sm:gap-4 items-start">
      <div class="flex-1 min-w-0">
        ${badgeHtml}
        <h3 class="text-sm sm:text-base font-bold text-zinc-100 group-hover:text-amber-400 transition-colors line-clamp-1">
          ${product.name}
        </h3>
        <p class="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
          ${product.description}
        </p>
      </div>

      <div class="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden relative bg-zinc-800 border border-zinc-700/50 shadow-inner">
        <img
          src="${product.image}"
          alt="${product.name}"
          loading="lazy"
          class="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
          onerror="this.onerror=null; this.src='./assets/images/x-tudo.webp';"
        />
      </div>
    </div>

    <div class="flex items-center justify-between pt-3 mt-3 border-t border-zinc-800/80">
      <div>
        <span class="text-xs text-zinc-400 block -mb-0.5">A partir de</span>
        <span class="text-base sm:text-lg font-extrabold text-amber-400 tracking-tight">
          ${formatBRL(product.price)}
        </span>
      </div>
      <button
        type="button"
        class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
          isLele
            ? "bg-rose-500 hover:bg-rose-600 text-white shadow-sm"
            : "bg-amber-500 hover:bg-amber-600 text-zinc-950 shadow-sm"
        }"
        aria-label="Adicionar ${product.name} ao pedido"
      >
        <span>+</span>
        <span class="hidden xs:inline">Adicionar</span>
      </button>
    </div>
  `;

  card.addEventListener("click", () => {
    openProductModal(product);
  });

  return card;
}

/**
 * Abre o modal detalhado do produto com adicionais, quantidade e observações
 */
function openProductModal(product) {
  currentModalProduct = product;
  currentModalSelectedExtras = [];
  currentModalQuantity = 1;

  dom.modalProductName.textContent = product.name;
  dom.modalProductDesc.textContent = product.description;
  dom.modalProductPrice.textContent = formatBRL(product.price);
  dom.modalProductImg.src = product.image;
  dom.modalProductImg.alt = product.name;
  dom.modalProductImg.onerror = function() {
    this.onerror = null;
    this.src = './assets/images/x-tudo.webp';
  };
  dom.modalObsInput.value = "";
  dom.modalQtyValue.textContent = "1";

  if (product.badge) {
    dom.modalProductBadge.textContent = product.badge;
    dom.modalProductBadge.classList.remove("hidden");
    if (product.categoryId === "sobremesas") {
      dom.modalProductBadge.className = "text-[11px] font-bold px-2.5 py-0.5 rounded-full lele-badge";
    } else {
      dom.modalProductBadge.className =
        "text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30";
    }
  } else {
    dom.modalProductBadge.classList.add("hidden");
  }

  // Renderizar seção de Adicionais
  if (product.allowExtras) {
    dom.modalExtrasSection.classList.remove("hidden");
    dom.modalExtrasList.innerHTML = "";

    EXTRA_ITEMS.forEach((extra) => {
      const label = document.createElement("label");
      label.className =
        "flex items-center justify-between p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 cursor-pointer transition-all";

      label.innerHTML = `
        <div class="flex items-center gap-2.5">
          <input
            type="checkbox"
            value="${extra.id}"
            class="extra-checkbox w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-zinc-700 border-zinc-600"
          />
          <span class="text-sm font-medium text-zinc-200">${extra.icon} ${extra.name}</span>
        </div>
        <span class="text-xs font-bold text-amber-400">+ ${formatBRL(extra.price)}</span>
      `;

      const checkbox = label.querySelector(".extra-checkbox");
      checkbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          currentModalSelectedExtras.push(extra);
        } else {
          currentModalSelectedExtras = currentModalSelectedExtras.filter((ex) => ex.id !== extra.id);
        }
        updateModalAddPrice();
      });

      dom.modalExtrasList.appendChild(label);
    });
  } else {
    dom.modalExtrasSection.classList.add("hidden");
    dom.modalExtrasList.innerHTML = "";
  }

  updateModalAddPrice();

  // Abrir Modal
  dom.productModal.classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
}

function updateModalAddPrice() {
  if (!currentModalProduct) return;
  const extrasTotal = currentModalSelectedExtras.reduce((sum, item) => sum + item.price, 0);
  const unitTotal = currentModalProduct.price + extrasTotal;
  const grandTotal = unitTotal * currentModalQuantity;
  dom.modalAddPrice.textContent = formatBRL(grandTotal);
}

function closeProductModal() {
  dom.productModal.classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
  currentModalProduct = null;
  currentModalSelectedExtras = [];
  currentModalQuantity = 1;
}

/**
 * Gerenciamento do Drawer do Carrinho
 */
function openCartDrawer() {
  dom.cartDrawer.classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
}

function closeCartDrawer() {
  dom.cartDrawer.classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
}

/**
 * Atualização da UI ao alterar o Carrinho
 */
function handleCartUpdate({ items, totalItemsCount, subtotal }) {
  // Atualiza badge no cabeçalho
  dom.headerCartCount.textContent = totalItemsCount;
  if (totalItemsCount > 0) {
    dom.headerCartBadge.classList.remove("hidden");
    dom.headerCartBadge.classList.add("animate-badge-pop");
    setTimeout(() => dom.headerCartBadge.classList.remove("animate-badge-pop"), 400);

    // Barra Flutuante Mobile
    dom.floatingCartBar.classList.remove("hidden");
    dom.floatingCartQty.textContent = `${totalItemsCount} ${totalItemsCount === 1 ? "item" : "itens"}`;
    dom.floatingCartTotal.textContent = formatBRL(subtotal);
  } else {
    dom.headerCartBadge.classList.add("hidden");
    dom.floatingCartBar.classList.add("hidden");
  }

  // Atualiza lista interna do carrinho
  if (items.length === 0) {
    dom.cartItemsList.classList.add("hidden");
    dom.cartEmptyState.classList.remove("hidden");
    dom.submitOrderBtn.disabled = true;
    dom.submitOrderBtn.classList.add("opacity-50", "cursor-not-allowed");
  } else {
    dom.cartItemsList.classList.remove("hidden");
    dom.cartEmptyState.classList.add("hidden");
    dom.submitOrderBtn.disabled = false;
    dom.submitOrderBtn.classList.remove("opacity-50", "cursor-not-allowed");

    dom.cartItemsList.innerHTML = "";
    items.forEach((item) => {
      const el = document.createElement("div");
      el.className = "p-3 sm:p-4 rounded-xl bg-zinc-800/60 border border-zinc-700/50 flex flex-col gap-2.5";

      let extrasHtml = "";
      if (item.extras && item.extras.length > 0) {
        extrasHtml = `
          <div class="text-[11px] text-amber-400/90 pl-2 border-l-2 border-amber-500/40">
            ${item.extras.map((ex) => `+ ${ex.name} (${formatBRL(ex.price)})`).join("<br>")}
          </div>
        `;
      }

      let obsHtml = "";
      if (item.observations) {
        obsHtml = `
          <div class="text-[11px] text-zinc-400 italic bg-zinc-900/40 p-1.5 rounded border border-zinc-800">
            Obs: "${escapeHTML(item.observations)}"
          </div>
        `;
      }

      el.innerHTML = `
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1">
            <h4 class="text-sm font-bold text-zinc-100">${item.name}</h4>
            <div class="text-xs text-amber-400 font-semibold">${formatBRL(item.unitPrice)} un.</div>
          </div>
          <button
            type="button"
            class="btn-remove-item text-zinc-500 hover:text-rose-400 transition-colors p-1"
            title="Remover item"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>

        ${extrasHtml}
        ${obsHtml}

        <div class="flex items-center justify-between pt-2 border-t border-zinc-700/40 mt-1">
          <div class="flex items-center gap-2 bg-zinc-900/80 rounded-lg p-1 border border-zinc-700/60">
            <button type="button" class="btn-qty-minus w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-white rounded hover:bg-zinc-800 text-xs font-bold">-</button>
            <span class="text-xs font-bold text-zinc-200 px-1 min-w-[18px] text-center">${item.quantity}</span>
            <button type="button" class="btn-qty-plus w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-white rounded hover:bg-zinc-800 text-xs font-bold">+</button>
          </div>
          <span class="text-sm font-extrabold text-zinc-100">${formatBRL(item.totalPrice)}</span>
        </div>
      `;

      el.querySelector(".btn-remove-item").addEventListener("click", () => {
        removeItemFromCart(item.cartItemId);
        showToast("Item removido da sacola.");
      });

      el.querySelector(".btn-qty-minus").addEventListener("click", () => {
        decrementCartItem(item.cartItemId);
      });

      el.querySelector(".btn-qty-plus").addEventListener("click", () => {
        incrementCartItem(item.cartItemId);
      });

      dom.cartItemsList.appendChild(el);
    });
  }

  dom.cartSubtotalText.textContent = formatBRL(subtotal);
  dom.cartTotalText.textContent = formatBRL(subtotal);
}

/**
 * Configuração dos Event Listeners do Aplicativo
 */
function setupEventListeners() {
  // Busca
  dom.searchInput.addEventListener("input", (e) => {
    searchTerm = e.target.value;
    if (searchTerm.trim()) {
      dom.clearSearchBtn.classList.remove("hidden");
    } else {
      dom.clearSearchBtn.classList.add("hidden");
    }
    renderProducts();
  });

  dom.clearSearchBtn.addEventListener("click", () => {
    searchTerm = "";
    dom.searchInput.value = "";
    dom.clearSearchBtn.classList.add("hidden");
    renderProducts();
  });

  // Modal Detalhes: Quantidade
  dom.modalQtyMinus.addEventListener("click", () => {
    if (currentModalQuantity > 1) {
      currentModalQuantity--;
      dom.modalQtyValue.textContent = currentModalQuantity;
      updateModalAddPrice();
    }
  });

  dom.modalQtyPlus.addEventListener("click", () => {
    currentModalQuantity++;
    dom.modalQtyValue.textContent = currentModalQuantity;
    updateModalAddPrice();
  });

  // Modal Detalhes: Fechar
  dom.modalCloseBtn.addEventListener("click", closeProductModal);
  dom.productModalBackdrop.addEventListener("click", closeProductModal);

  // Modal Detalhes: Botão Adicionar ao Pedido
  dom.modalAddBtn.addEventListener("click", () => {
    if (!currentModalProduct) return;

    addToCart({
      product: currentModalProduct,
      extras: currentModalSelectedExtras,
      observations: dom.modalObsInput.value,
      quantity: currentModalQuantity
    });

    showToast(`"${currentModalProduct.name}" adicionado à sacola! ✨`);
    closeProductModal();
  });

  // Carrinho Drawer: Abrir/Fechar
  dom.openCartBtn.addEventListener("click", openCartDrawer);
  dom.closeCartBtn.addEventListener("click", closeCartDrawer);
  dom.cartBackdrop.addEventListener("click", closeCartDrawer);
  dom.floatingCartBar.addEventListener("click", openCartDrawer);

  // Tabs de Entrega / Retirada
  dom.deliveryTypeDelivery.addEventListener("click", () => {
    dom.deliveryTypeDelivery.classList.add("bg-amber-500", "text-zinc-950", "font-bold");
    dom.deliveryTypeDelivery.classList.remove("bg-zinc-800", "text-zinc-300");

    dom.deliveryTypePickup.classList.remove("bg-amber-500", "text-zinc-950", "font-bold");
    dom.deliveryTypePickup.classList.add("bg-zinc-800", "text-zinc-300");

    dom.deliveryAddressFields.classList.remove("hidden");
    dom.pickupInfoCard.classList.add("hidden");
  });

  dom.deliveryTypePickup.addEventListener("click", () => {
    dom.deliveryTypePickup.classList.add("bg-amber-500", "text-zinc-950", "font-bold");
    dom.deliveryTypePickup.classList.remove("bg-zinc-800", "text-zinc-300");

    dom.deliveryTypeDelivery.classList.remove("bg-amber-500", "text-zinc-950", "font-bold");
    dom.deliveryTypeDelivery.classList.add("bg-zinc-800", "text-zinc-300");

    dom.deliveryAddressFields.classList.add("hidden");
    dom.pickupInfoCard.classList.remove("hidden");
  });

  // Formas de Pagamento
  const paymentInputs = [dom.paymentPix, dom.paymentCartao, dom.paymentDinheiro];
  paymentInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (dom.paymentDinheiro.checked) {
        dom.cashChangeSection.classList.remove("hidden");
      } else {
        dom.cashChangeSection.classList.add("hidden");
      }

      if (dom.paymentPix.checked) {
        dom.pixInfoCard.classList.remove("hidden");
      } else {
        dom.pixInfoCard.classList.add("hidden");
      }
    });
  });

  dom.toggleNeedChange.addEventListener("change", (e) => {
    if (e.target.checked) {
      dom.inputChangeFor.parentElement.classList.remove("hidden");
    } else {
      dom.inputChangeFor.parentElement.classList.add("hidden");
      dom.inputChangeFor.value = "";
    }
  });

  // Máscara para WhatsApp
  dom.inputCustomerPhone.addEventListener("input", (e) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 6) {
      e.target.value = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
    } else if (v.length > 2) {
      e.target.value = `(${v.slice(0, 2)}) ${v.slice(2)}`;
    } else if (v.length > 0) {
      e.target.value = `(${v}`;
    }
  });

  // Finalizar Pedido via WhatsApp
  dom.submitOrderBtn.addEventListener("click", handleCheckoutSubmit);

  // Fechar modais ao teclar ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!dom.productModal.classList.contains("hidden")) {
        closeProductModal();
      } else if (!dom.cartDrawer.classList.contains("hidden")) {
        closeCartDrawer();
      }
    }
  });
}

/**
 * Valida dados e submete pedido para o WhatsApp
 */
function handleCheckoutSubmit() {
  const { items } = getCartState();
  if (items.length === 0) {
    showToast("Adicione ao menos um item à sacola para pedir.", "error");
    return;
  }

  const isDelivery = dom.deliveryTypeDelivery.classList.contains("bg-amber-500");

  let paymentMethod = "pix";
  if (dom.paymentCartao.checked) paymentMethod = "cartao";
  if (dom.paymentDinheiro.checked) paymentMethod = "dinheiro";

  const formData = {
    customerName: dom.inputCustomerName.value,
    customerPhone: dom.inputCustomerPhone.value,
    deliveryType: isDelivery ? "delivery" : "retirada",
    street: dom.inputStreet.value,
    number: dom.inputNumber.value,
    neighborhood: dom.inputNeighborhood.value,
    complement: dom.inputComplement.value,
    paymentMethod,
    needChange: dom.toggleNeedChange.checked ? "sim" : "nao",
    changeFor: dom.inputChangeFor.value
  };

  const validation = validateCheckoutForm(formData);

  if (!validation.isValid) {
    const firstErrorMessage = Object.values(validation.errors)[0];
    showToast(firstErrorMessage, "error");

    // Destaque visual nos campos com erro
    if (validation.errors.customerName) dom.inputCustomerName.focus();
    else if (validation.errors.customerPhone) dom.inputCustomerPhone.focus();
    else if (validation.errors.street) dom.inputStreet.focus();
    else if (validation.errors.number) dom.inputNumber.focus();
    else if (validation.errors.neighborhood) dom.inputNeighborhood.focus();
    else if (validation.errors.changeFor) dom.inputChangeFor.focus();

    return;
  }

  // Enviar pedido
  sendOrderToWhatsApp(formData);
  showToast("Redirecionando para o WhatsApp... 🚀");
  closeCartDrawer();
}

/**
 * Sistema simples de Notificações Toast
 */
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  const isErr = type === "error";

  toast.className = `p-3.5 rounded-xl shadow-2xl flex items-center gap-3 text-xs sm:text-sm font-semibold animate-slide-up transition-all ${
    isErr
      ? "bg-rose-950/95 border border-rose-500/50 text-rose-100"
      : "bg-zinc-900/95 border border-amber-500/40 text-zinc-100 shadow-amber-500/10"
  }`;

  toast.innerHTML = `
    <span>${isErr ? "⚠️" : "✨"}</span>
    <span class="flex-1">${escapeHTML(message)}</span>
  `;

  dom.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

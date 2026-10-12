/**
 * Cardápio Digital Interativo - Burguer On Artesanal
 * Banco de dados de produtos, categorias e adicionais
 */

export const STORE_CONFIG = {
  name: "Burguer On Artesanal",
  tagline: "Hambúrgueres artesanais feitos na chapa com paixão e sabor incomparável",
  phoneDisplay: "(11) 91321-9550",
  whatsappNumber: "5511913219550",
  address: "Rua Luiz Correia, 44 - Moinho Velho, Cotia - SP",
  openingHoursDisplay: "Seg a Sáb 11:00 às 14:00 | Qua a Dom 18:00 às 23:30",
  estimateDeliveryTime: "35-50 min",
  estimatePickupTime: "20-30 min",
  // Controle de status: 'auto' (baseado em horário) ou boolean fixo (true = aberto, false = fechado)
  manualStatus: null // null para automático, true para sempre aberto, false para sempre fechado
};

// Lista de adicionais disponíveis para lanches e combos
export const EXTRA_ITEMS = [
  { id: "extra-ovo", name: "Ovo", price: 1.99, icon: "🍳" },
  { id: "extra-bacon", name: "Bacon", price: 2.99, icon: "🥓" },
  { id: "extra-queijo-prato", name: "Queijo Prato", price: 2.99, icon: "🧀" },
  { id: "extra-cheddar", name: "Queijo Cheddar", price: 2.99, icon: "🧀" },
  { id: "extra-cebola-caramelizada", name: "Cebola Caramelizada", price: 2.99, icon: "🧅" },
  { id: "extra-cebola-empanada", name: "Cebola Empanada", price: 3.99, icon: "🧅" }
];

// Categorias do Cardápio
export const CATEGORIES = [
  {
    id: "lanches",
    name: "Lanches Artesanais",
    icon: "🍔",
    description: "Burguers artesanais suculentos preparados com carnes selecionadas e maionese da casa"
  },
  {
    id: "combos-especiais",
    name: "Combos Especiais",
    icon: "🔥",
    description: "Combos gigantes para dividir com a família ou a dois com batata cheddar e refrigerante 2L"
  },
  {
    id: "combos-individuais",
    name: "Combos Individuais",
    icon: "👤",
    description: "Combo perfeito para sua fome: lanche artesanal + Batata Frita + Sukita Lata 350ml"
  },
  {
    id: "porcoes",
    name: "Porções",
    icon: "🍟",
    description: "Porções crocantes e bem servidas para acompanhar sua experiência"
  },
  {
    id: "bebidas",
    name: "Bebidas",
    icon: "🥤",
    description: "Refrigerantes em lata, pitulinhas, garrafas 2L e cervejas bem geladas"
  },
  {
    id: "sobremesas",
    name: "Sobremesas (Lele Bolos no Pote)",
    icon: "🍰",
    badge: "Lele Bolos no Pote",
    isSpecial: true,
    description: "Doces artesanais afetivos, mousses com pedaços de fruta natural e bolos de pote irresistíveis"
  }
];

// Itens do Cardápio
export const PRODUCTS = [
  // ================= LANCHES ARTESANAIS =================
  {
    id: "x-tudo",
    categoryId: "lanches",
    name: "X-Tudo",
    price: 44.99,
    description: "1 carne artesanal, 1 hambúrguer empanado, ovo, calabresa, 2 cebolas empanadas, tomate, alface e maionese da casa.",
    badge: "O Mais Pedido ⭐",
    image: "./assets/images/x-tudo.webp",
    allowExtras: true
  },
  {
    id: "x-salada",
    categoryId: "lanches",
    name: "X-Salada",
    price: 19.99,
    description: "1 carne artesanal, queijo prato, tomate, alface fresca e maionese especial da casa.",
    badge: "Clássico",
    image: "./assets/images/x-salada.webp",
    allowExtras: true
  },
  {
    id: "burguer-bacon",
    categoryId: "lanches",
    name: "Burguer Bacon",
    price: 24.99,
    description: "1 carne artesanal, cheddar cremoso, fatias crocantes de bacon e maionese da casa.",
    badge: "Favorito 🔥",
    image: "./assets/images/burguer-bacon.webp",
    allowExtras: true
  },
  {
    id: "duplo-bacon",
    categoryId: "lanches",
    name: "Duplo Bacon",
    price: 29.99,
    description: "2 carnes artesanais suculentas, dobro de cheddar, fatias crocantes de bacon e maionese da casa.",
    badge: "Duplo Sabor",
    image: "./assets/images/duplo-bacon.webp",
    allowExtras: true
  },
  {
    id: "big-especial",
    categoryId: "lanches",
    name: "Big Especial",
    price: 34.99,
    description: "3 carnes artesanais, tomate, alface crocante e muita maionese especial da casa.",
    badge: "Tamanho Família",
    image: "./assets/images/big-especial.webp",
    allowExtras: true
  },
  {
    id: "onion",
    categoryId: "lanches",
    name: "Onion",
    price: 27.99,
    description: "1 carne artesanal, queijo prato derretido, 2 cebolas empanadas crocantes e maionese da casa.",
    badge: "Crocante",
    image: "./assets/images/onion-burguer.webp",
    allowExtras: true
  },
  {
    id: "calabresa",
    categoryId: "lanches",
    name: "Calabresa",
    price: 24.99,
    description: "1 carne artesanal, fatias douradas de calabresa, tomate fresco, alface e maionese da casa.",
    badge: null,
    image: "./assets/images/calabresa.webp",
    allowExtras: true
  },
  {
    id: "melt",
    categoryId: "lanches",
    name: "Melt",
    price: 24.99,
    description: "1 carne artesanal, piscina de cheddar cremoso derretido, cebola caramelizada e maionese da casa.",
    badge: "Cheddar & Cebola",
    image: "./assets/images/melt.webp",
    allowExtras: true
  },

  // ================= COMBOS ESPECIAIS =================
  {
    id: "combo-casal",
    categoryId: "combos-especiais",
    name: "Combo Casal",
    price: 59.99,
    description: "2 X-Salada artesanais + porção de cebola empanada crocante + batata com cheddar e bacon + Refrigerante Dolly 2L bem gelado.",
    badge: "Ideal para Dois 💑",
    image: "./assets/images/combo-especial.webp",
    allowExtras: true
  },
  {
    id: "combo-familia",
    categoryId: "combos-especiais",
    name: "Combo Família",
    price: 99.99,
    description: "4 X-Salada artesanais + porção de cebola empanada crocante + batata com cheddar e bacon + Refrigerante Dolly 2L.",
    badge: "Super Família 👨‍👩‍👧‍👦",
    image: "./assets/images/combo-especial.webp",
    allowExtras: true
  },
  {
    id: "combo-turbo-bacon",
    categoryId: "combos-especiais",
    name: "Combo Turbo Bacon",
    price: 74.99,
    description: "2 Burguer Bacon + batata com cheddar e bacon + porção de cebola empanada + Refrigerante Dolly 2L.",
    badge: "Explosão de Bacon 🥓",
    image: "./assets/images/combo-especial.webp",
    allowExtras: true
  },
  {
    id: "combo-rings-onion",
    categoryId: "combos-especiais",
    name: "Combo Rings Onion",
    price: 74.99,
    description: "2 Burguers Onion + batata com cheddar e bacon + porção de cebola empanada + Refrigerante Dolly 2L.",
    badge: "Mega Onion 🧅",
    image: "./assets/images/combo-especial.webp",
    allowExtras: true
  },

  // ================= COMBOS INDIVIDUAIS =================
  {
    id: "combo-ind-x-salada",
    categoryId: "combos-individuais",
    name: "Combo Individual X-Salada",
    price: 39.99,
    description: "1 X-Salada artesanal + Batata Frita crocante individual + 1 Sukita Lata 350ml gelada.",
    badge: "Individual Completo",
    image: "./assets/images/x-salada.webp",
    allowExtras: true
  },
  {
    id: "combo-ind-bacon",
    categoryId: "combos-individuais",
    name: "Combo Individual Bacon",
    price: 39.99,
    description: "1 Burguer Bacon artesanal + Batata Frita crocante individual + 1 Sukita Lata 350ml gelada.",
    badge: "Bacon Lovers",
    image: "./assets/images/burguer-bacon.webp",
    allowExtras: true
  },
  {
    id: "combo-ind-duplo",
    categoryId: "combos-individuais",
    name: "Combo Individual Duplo",
    price: 44.99,
    description: "1 Duplo Bacon artesanal com 2 carnes + Batata Frita crocante individual + 1 Sukita Lata 350ml gelada.",
    badge: "Carne em Dobro",
    image: "./assets/images/duplo-bacon.webp",
    allowExtras: true
  },
  {
    id: "combo-ind-calabresa",
    categoryId: "combos-individuais",
    name: "Combo Individual Calabresa",
    price: 39.99,
    description: "1 Burguer Calabresa artesanal + Batata Frita crocante individual + 1 Sukita Lata 350ml gelada.",
    badge: null,
    image: "./assets/images/calabresa.webp",
    allowExtras: true
  },
  {
    id: "combo-ind-onion",
    categoryId: "combos-individuais",
    name: "Combo Individual Onion",
    price: 39.99,
    description: "1 Burguer Onion artesanal + Batata Frita crocante individual + 1 Sukita Lata 350ml gelada.",
    badge: null,
    image: "./assets/images/onion-burguer.webp",
    allowExtras: true
  },

  // ================= PORÇÕES =================
  {
    id: "porcao-batata",
    categoryId: "porcoes",
    name: "Batata Frita",
    price: 19.99,
    description: "Porção generosa de batata palito selecionada, frita na hora, bem crocante e sequinha.",
    badge: "Crocante & Sequinha",
    image: "./assets/images/porcoes.webp",
    allowExtras: false
  },
  {
    id: "porcao-batata-cheddar-bacon",
    categoryId: "porcoes",
    name: "Batata com Cheddar e Bacon",
    price: 24.99,
    description: "Batata frita crocante coberta com generosa camada de queijo cheddar cremoso e bacon em cubos crocantes.",
    badge: "Mais Pedida 🍟",
    image: "./assets/images/porcoes.webp",
    allowExtras: false
  },
  {
    id: "porcao-cebola-empanada",
    categoryId: "porcoes",
    name: "Porção de Cebola Empanada",
    price: 24.99,
    description: "Anéis de cebola selecionados, empanados com tempero especial da casa, super crocantes e dourados.",
    badge: "Onion Rings",
    image: "./assets/images/porcoes.webp",
    allowExtras: false
  },

  // ================= BEBIDAS =================
  {
    id: "coca-lata",
    categoryId: "bebidas",
    name: "Coca Cola 350ml Lata",
    price: 6.99,
    description: "Lata 350ml bem gelada.",
    badge: null,
    image: "./assets/images/coca-cola-lata-350ml.webp",
    allowExtras: false
  },
  {
    id: "fanta-uva",
    categoryId: "bebidas",
    name: "Fanta Uva 350ml",
    price: 6.99,
    description: "Lata 350ml bem gelada.",
    badge: null,
    image: "./assets/images/fanta-uva-lata-350ml.webp",
    allowExtras: false
  },
  {
    id: "fanta-laranja",
    categoryId: "bebidas",
    name: "Fanta Laranja 350ml",
    price: 6.99,
    description: "Lata 350ml bem gelada.",
    badge: null,
    image: "./assets/images/fanta-laranja-lata-350ml.webp",
    allowExtras: false
  },
  {
    id: "guarana-lata",
    categoryId: "bebidas",
    name: "Guaraná 350ml",
    price: 6.99,
    description: "Lata 350ml bem gelada.",
    badge: null,
    image: "./assets/images/guarana-lata-350ml.webp",
    allowExtras: false
  },
  {
    id: "coca-pitulinha",
    categoryId: "bebidas",
    name: "Coca Cola Pitulinha 200ml",
    price: 3.99,
    description: "Garrafinha pet 200ml geladinha.",
    badge: null,
    image: "./assets/images/coca-cola-200ml.webp",
    allowExtras: false
  },
  {
    id: "dolly-pitulinha",
    categoryId: "bebidas",
    name: "Dolly Pitulinha 350ml",
    price: 3.99,
    description: "Garrafinha pet 350ml gelada.",
    badge: null,
    image: "./assets/images/dolly-350ml.webp",
    allowExtras: false
  },
  {
    id: "heineken",
    categoryId: "bebidas",
    name: "Heineken 269ml",
    price: 5.99,
    description: "Cerveja puro malte em lata 269ml trincando de gelada.",
    badge: "Alcoólica 🍺",
    image: "./assets/images/heineken.webp",
    allowExtras: false
  },
  {
    id: "amstel",
    categoryId: "bebidas",
    name: "Amstel 269ml",
    price: 4.99,
    description: "Cerveja puro malte lager 269ml gelada.",
    badge: "Alcoólica 🍺",
    image: "./assets/images/amstel.webp",
    allowExtras: false
  },
  {
    id: "skol",
    categoryId: "bebidas",
    name: "Skol 350ml",
    price: 4.99,
    description: "Cerveja pilsen lata 350ml gelada.",
    badge: "Alcoólica 🍺",
    image: "./assets/images/skol.webp",
    allowExtras: false
  },
  {
    id: "coca-2l",
    categoryId: "bebidas",
    name: "Coca Cola 2L",
    price: 16.00,
    description: "Garrafa família 2 Litros bem gelada.",
    badge: "Tamanho Família",
    image: "./assets/images/coca-cola-2l.webp",
    allowExtras: false
  },
  {
    id: "dolly-2l",
    categoryId: "bebidas",
    name: "Dolly 2L",
    price: 8.00,
    description: "Garrafa 2 Litros gelada (Guaraná).",
    badge: "Econômico",
    image: "./assets/images/dolly-2l.webp",
    allowExtras: false
  },

  // ================= SOBREMESAS (LELE BOLOS NO POTE) =================
  {
    id: "torta-limao",
    categoryId: "sobremesas",
    name: "Tortinha de Limão",
    price: 7.99,
    description: "Creme aveludado de limão taiti, base de biscoito amanteigado crocante e raspas naturais de limão.",
    badge: "Lele Bolos no Pote 🍋",
    image: "./assets/images/torta-limao.webp",
    allowExtras: false
  },
  {
    id: "mousse-maracuja",
    categoryId: "sobremesas",
    name: "Mousse de Maracujá com pedacinho da fruta",
    price: 7.99,
    description: "Mousse aerado preparado com fruta natural, finalizado com calda brilhante e sementinhas de maracujá.",
    badge: "Fruta Natural 💛",
    image: "./assets/images/mousse-maracuja.webp",
    allowExtras: false
  },
  {
    id: "mousse-morango",
    categoryId: "sobremesas",
    name: "Mousse de Morango com pedaço da fruta",
    price: 7.99,
    description: "Textura cremosa e delicada, com calda artesanal e pedaços de morango fresco selecionado.",
    badge: "Fruta Natural 🍓",
    image: "./assets/images/mousse-morango.webp",
    allowExtras: false
  },
  {
    id: "mousse-abacaxi",
    categoryId: "sobremesas",
    name: "Mousse de Abacaxi com pedacinhos da fruta",
    price: 7.99,
    description: "Equilíbrio perfeito de doçura e acidez refrescante, com pedacinhos de abacaxi cozidos em calda caseira.",
    badge: "Fruta Natural 🍍",
    image: "./assets/images/mousse-abacaxi.webp",
    allowExtras: false
  },
  {
    id: "bolo-pote-beijinho",
    categoryId: "sobremesas",
    name: "Bolo de Pote Beijinho com passa branca",
    price: 14.99,
    description: "Massa branca fofinha e molhada, recheio farto de beijinho de coco com uvas passas brancas especiais.",
    badge: "Artesanal Especial 🥥",
    image: "./assets/images/bolo-pote-beijinho.webp",
    allowExtras: false
  },
  {
    id: "bolo-pote-brigadeiro",
    categoryId: "sobremesas",
    name: "Bolo de Pote Brigadeiro Cremoso",
    price: 14.99,
    description: "Massa de chocolate 50% cacau super molhadinha, intercalada com brigadeiro gourmet cremoso e granulados nobres.",
    badge: "O Queridinho 🍫",
    image: "./assets/images/bolo-pote-brigadeiro.webp",
    allowExtras: false
  },
  {
    id: "bolo-pote-prestigio",
    categoryId: "sobremesas",
    name: "Bolo de Pote Prestígio",
    price: 14.99,
    description: "A clássica e amada combinação do bolo de chocolate artesanal úmido com recheio cremoso de coco fresco.",
    badge: "Chocolate & Coco 🥥",
    image: "./assets/images/bolo-pote-prestigio.webp",
    allowExtras: false
  }
];

// Helper para formatar moeda brasileira (BRL)
export function formatBRL(value) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

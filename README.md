# 🍔 Burguer On Artesanal - Cardápio Digital Interativo & Pedidos WhatsApp

Aplicação web completa (Single Page Application - SPA) de Cardápio Digital Interativo desenvolvida para a hamburgueria artesanal **Burguer On Artesanal**, pronta para publicação gratuita no **GitHub Pages** (sem necessidade de backend, banco de dados ou servidor).

---

## ✨ Recursos & Funcionalidades

- **📱 Design Mobile-First (Estilo iFood / Rappi):** Interface moderna, fluida e ultra-responsiva focada na experiência do usuário em smartphones e tablets.
- **🌙 Identidade Visual Dark Mode Premium:** Tons escuros de carvão (`#121212`), realces em âmbar/laranja artesanal (`#f97316`) e dourado (`#f59e0b`).
- **🍰 Seção Especial "Lele Bolos no Pote":** Identidade visual exclusiva com toques acolhedores em rosé e confeitaria afetiva.
- **🏷️ Categorias com Navegação Fluida:** Chips horizontais com rolagem suave (Lanches, Combos Especiais, Combos Individuais, Porções, Bebidas e Sobremesas).
- **🔍 Busca em Tempo Real:** Pesquisa rápida por nome, ingrediente ou categoria com botão de limpeza rápida.
- **📋 Modal Detalhado de Produtos:**
  - Imagem ampliada em alta resolução.
  - Ingredientes e descrição completa.
  - Seleção de Adicionais com cálculo automático (Ovo, Bacon, Queijos, Cebolas).
  - Campo de observações especiais (ex: "Sem maionese", ponto da carne).
  - Seletor de quantidade e cálculo instantâneo.
- **🛍️ Sacola de Compras & Checkout Integrado:**
  - Drawer deslizante no mobile e desktop.
  - Controle de quantidades e remoção de itens.
  - **Modalidade de Entrega:**
    - 🛵 **Delivery:** Coleta de nome, telefone com máscara e endereço completo.
    - 🏬 **Retirada no Local:** Informa o endereço fixo da loja (*Rua Luiz Correia, 44 - Moinho Velho, Cotia*) dispensando endereço do cliente.
  - **Formas de Pagamento:** Pix (com aviso de comprovante), Cartão (maquininha na entrega/retirada) e Dinheiro (com campo opcional de troco).
- **🚀 Integração Direta com WhatsApp:**
  - Formatação impecável da mensagem com emojis, lista de itens, adicionais, observações e totais.
  - Envio direto para o número oficial: **`5511913219550`**.
- **📲 Suporte a PWA (Web App):** Arquivo `manifest.json` incluído para instalação como aplicativo na tela inicial do celular.

---

## 📂 Estrutura de Arquivos

```
Cardapio Hamburguer ON/
├── index.html                  # Interface completa da SPA e modais
├── manifest.json               # Configuração PWA (Adicionar à tela de início)
├── assets/
│   ├── css/
│   │   └── styles.css          # Estilos customizados, tema escuro e animações
│   ├── js/
│   │   ├── products.js         # Banco de dados de produtos, categorias e adicionais
│   │   ├── cart.js             # Gerenciamento de estado e persistência da sacola
│   │   ├── checkout.js         # Validações, entrega/retirada e formatação WhatsApp
│   │   └── app.js              # Controlador principal da interface e eventos
│   └── images/
│       └── README.md           # Guia de fotos personalizadas
└── tests/
    └── test_cart_and_checkout.js # Testes automatizados com Node.js
```

---

## 🚀 Como Publicar no GitHub Pages (Passo a Passo)

1. Crie um repositório no GitHub (exemplo: `cardapio-burguer-on`).
2. Faça o upload de todos os arquivos desta pasta para o repositório.
3. No GitHub, acesse a aba **Settings** do repositório.
4. No menu lateral esquerdo, clique em **Pages**.
5. Em **Build and deployment > Branch**, selecione a branch `main` (ou `master`) e a pasta `/ (root)`.
6. Clique em **Save**.
7. Em poucos segundos seu cardápio estará no ar em:  
   `https://seu-usuario.github.io/cardapio-burguer-on/`

---

## 💻 Como Rodar e Testar Localmente

Basta abrir o arquivo `index.html` em qualquer navegador web ou rodar um servidor HTTP local:

```bash
# Usando Python:
python -m http.server 3000

# Ou usando Node / npx:
npx serve .
```

Acesse no navegador: `http://localhost:3000`

---

## 🧪 Como Rodar os Testes Automatizados

Para validar toda a lógica de negócio, catálogo de produtos, cálculos e integração:

```bash
node tests/test_cart_and_checkout.js
```

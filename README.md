# 🍔 Burguer On Artesanal - Cardápio Digital Interativo & Pedidos WhatsApp

Aplicação web completa (Single Page Application - SPA) de Cardápio Digital Interativo desenvolvida para a hamburgueria artesanal **Burguer On Artesanal**, pronta para publicação gratuita como site estático (sem necessidade de backend, banco de dados ou servidor próprio).

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

## 🚀 Como Publicar no Render (Passo a Passo)

O arquivo [`render.yaml`](./render.yaml) já configura este projeto como **Static Site**. No Render:

1. Acesse [dashboard.render.com](https://dashboard.render.com/) e clique em **New > Blueprint**.
2. Conecte o repositório `pguilevs/cardapio-burguer-on`.
3. Selecione a branch `main` e confirme o serviço `burguer-on`.
4. Clique em **Apply**. Não é necessário informar comando de build: o Render publica a raiz do repositório.
5. Teste a URL `https://burguer-on.onrender.com`.

### Domínio personalizado `burgeron.live`

Depois que o serviço estiver criado:

1. No Render, abra o serviço, acesse **Settings > Custom Domains** e adicione `burgeron.live` e `www.burgeron.live`.
2. No painel do seu provedor de domínio, remova registros antigos que apontem para o GitHub Pages.
3. Crie os registros DNS mostrados pelo Render. Normalmente:
   - `@` (ou `burgeron.live`) aponta para o destino indicado pelo Render;
   - `www` recebe um `CNAME` para o hostname indicado pelo Render.
4. Aguarde a propagação e confirme no Render que o certificado HTTPS foi emitido.

Os valores de DNS podem variar por conta e provedor; use os valores exibidos pelo Render, não um IP fixo encontrado em outro tutorial. O arquivo [`CNAME`](./CNAME) é usado pelo GitHub Pages e não configura o domínio no Render.

## 🚀 Como Publicar no GitHub Pages (Alternativa)

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

## Supabase

O Firebase e o ntfy não são mais usados. A persistência dos pedidos e o Realtime
usam Supabase.

1. Abra o SQL Editor do Supabase e execute [`supabase/schema.sql`](./supabase/schema.sql).
2. Em **Authentication > Users**, crie um usuário para o painel da cozinha.
3. Copie a URL do projeto e a chave pública `anon` em `index.html` e `admin.html`,
   no objeto `window.__SUPABASE_CONFIG__`.
4. Nunca use a chave `service_role` no navegador ou no GitHub Pages.
5. Ative o Realtime para a tabela `pedidos` caso o projeto ainda não o tenha
   habilitado.
6. Ao atualizar o schema, execute o arquivo completo novamente para habilitar o
   status global de pedidos, o histórico e a numeração diária.

No painel administrativo, **Pedidos Abertos/Fechados** controla globalmente se
clientes podem criar pedidos. **Encerrar Dia** exige que todos os pedidos estejam
finalizados, arquiva os pedidos e fecha o recebimento. O botão **Histórico** exibe
os pedidos arquivados.

O painel exige login pelo Supabase Auth. Clientes podem criar pedidos sem login,
mas somente usuários autenticados podem consultar e alterar pedidos.

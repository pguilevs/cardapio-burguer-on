# Imagens do Cardápio - Burguer On Artesanal

Esta pasta armazena as fotos personalizadas dos produtos da hamburgueria e das sobremesas da Lele Bolos no Pote.

## Como substituir pelas fotos oficiais:
1. Adicione as fotos dos seus lanches, porções e bolos nesta pasta (`./assets/images/`).
2. No arquivo `assets/js/products.js`, basta alterar a propriedade `image` do produto correspondente para o caminho local:
   ```javascript
   image: "./assets/images/x-tudo.jpg"
   ```
3. O sistema já possui tratamento automático para nunca exibir imagens quebradas caso algum arquivo esteja faltando.

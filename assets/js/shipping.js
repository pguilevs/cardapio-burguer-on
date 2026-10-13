/**
 * Módulo de Consulta de CEP e Cálculo de Frete Dinâmico
 * Burguer On Artesanal - Cotia / SP
 */

// Tabela de frete por bairro / região
export const SHIPPING_RATES = {
  // Cotia - Bairros Mapeados
  "moinho velho": 5.00,
  "jardim rosemary": 6.00,
  "rosemary": 6.00,
  "parque alexandre": 7.00,
  "jardim nomura": 7.00,
  "nomura": 7.00,
  "centro": 8.00,
  "centro de cotia": 8.00,
  "granja viana": 14.00,
  "caucaia do alto": 16.00,
  
  // Padrão para outros bairros de Cotia
  "padrao_cotia": 8.50,
  
  // Cidades Vizinhas (Itapevi, Vargem Grande Paulista, Carapicuíba, Barueri, Jandira, etc.)
  "outras_cidades": 15.00
};

/**
 * Normaliza strings removendo acentos e convertendo para minúsculas
 */
function normalizeText(text) {
  if (!text) return "";
  return text
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Calcula a taxa de entrega com base no bairro e na cidade
 * @param {string} neighborhood - Bairro informado
 * @param {string} city - Cidade informada (padrão Cotia)
 * @param {string} deliveryType - "delivery" ou "retirada"
 * @returns {{ fee: number, label: string }}
 */
export function calculateDeliveryFee(neighborhood, city = "Cotia", deliveryType = "delivery") {
  if (deliveryType === "retirada") {
    return { fee: 0, label: "Grátis (Retirada no Local)" };
  }

  const normNeighborhood = normalizeText(neighborhood);
  const normCity = normalizeText(city);

  if (!normNeighborhood) {
    return { fee: 0, label: "Informe o CEP ou bairro" };
  }

  // Se for outra cidade vizinha (não Cotia)
  if (normCity && !normCity.includes("cotia")) {
    const fee = SHIPPING_RATES.outras_cidades;
    return {
      fee,
      label: `R$ ${fee.toFixed(2).replace(".", ",")} (${city.trim()})`
    };
  }

  // Verifica se o bairro corresponde a algum valor na tabela de Cotia
  for (const [key, value] of Object.entries(SHIPPING_RATES)) {
    if (key === "padrao_cotia" || key === "outras_cidades") continue;
    const normKey = normalizeText(key);
    if (normNeighborhood.includes(normKey) || normKey.includes(normNeighborhood)) {
      return {
        fee: value,
        label: `R$ ${value.toFixed(2).replace(".", ",")} (${neighborhood.trim()})`
      };
    }
  }

  // Se a cidade for Cotia (ou vazia/assumida Cotia) e o bairro não estiver mapeado
  const fee = SHIPPING_RATES.padrao_cotia;
  return {
    fee,
    label: `R$ ${fee.toFixed(2).replace(".", ",")} (Cotia - Região)`
  };
}

/**
 * Formata um valor de CEP aplicando a máscara 00000-000
 * @param {string} value 
 * @returns {string}
 */
export function formatCEPMask(value) {
  const clean = (value || "").replace(/\D/g, "").slice(0, 8);
  if (clean.length > 5) {
    return `${clean.slice(0, 5)}-${clean.slice(5)}`;
  }
  return clean;
}

/**
 * Consulta o endereço e frete via API pública do ViaCEP
 * @param {string} rawCep - CEP com ou sem pontuação
 * @returns {Promise<{ success: boolean, street?: string, neighborhood?: string, city?: string, uf?: string, fee?: number, feeLabel?: string, error?: string }>}
 */
export async function lookupCEP(rawCep) {
  const cleanCep = (rawCep || "").replace(/\D/g, "");

  if (cleanCep.length !== 8) {
    return {
      success: false,
      error: "O CEP deve conter exatamente 8 dígitos."
    };
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    if (!response.ok) {
      throw new Error(`Erro na consulta ViaCEP: ${response.status}`);
    }

    const data = await response.json();

    if (data.erro) {
      return {
        success: false,
        error: "CEP não encontrado. Verifique os dígitos digitados."
      };
    }

    const street = data.logradouro || "";
    const neighborhood = data.bairro || "";
    const city = data.localidade || "Cotia";
    const uf = data.uf || "SP";

    const { fee, label: feeLabel } = calculateDeliveryFee(neighborhood, city);

    return {
      success: true,
      street,
      neighborhood,
      city,
      uf,
      fee,
      feeLabel
    };
  } catch (err) {
    console.error("Falha ao consultar ViaCEP:", err);
    return {
      success: false,
      error: "Não foi possível consultar o CEP automaticamente. Você pode preencher o endereço manualmente."
    };
  }
}

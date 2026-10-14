/**
 * Módulo de Consulta de CEP, Cálculo de Distância e Frete Dinâmico
 * Burguer On Artesanal - Cotia / SP
 * Regra: Distância máxima de entrega permitida: 20 km
 */

// Limite máximo de distância para entregas (em km)
export const MAX_DELIVERY_DISTANCE_KM = 20;

// Localização da loja de referência
export const STORE_ORIGIN = {
  name: "Burguer On Artesanal",
  address: "Rua Luiz Correia, 44 - Moinho Velho, Cotia - SP",
  cep: "06716-040",
  lat: -23.60416,
  lon: -46.91924
};

// Tabela de distâncias estimadas e taxas a partir da loja (Moinho Velho, Cotia - SP)
export const LOCATION_DISTANCES = {
  // Cotia - Bairros Próximos
  "moinho velho": { distanceKm: 1.0, fee: 5.00 },
  "jardim rosemary": { distanceKm: 2.5, fee: 6.00 },
  "rosemary": { distanceKm: 2.5, fee: 6.00 },
  "parque alexandre": { distanceKm: 3.5, fee: 7.00 },
  "jardim nomura": { distanceKm: 3.5, fee: 7.00 },
  "nomura": { distanceKm: 3.5, fee: 7.00 },
  "centro": { distanceKm: 4.0, fee: 8.00 },
  "centro de cotia": { distanceKm: 4.0, fee: 8.00 },
  "atalaia": { distanceKm: 4.5, fee: 8.50 },
  "jardim sandra": { distanceKm: 4.0, fee: 8.50 },
  "portao": { distanceKm: 4.5, fee: 8.50 },
  "mirizola": { distanceKm: 5.0, fee: 8.50 },
  "jardim rio das pedras": { distanceKm: 4.5, fee: 8.50 },
  "jardim coimbra": { distanceKm: 5.0, fee: 8.50 },

  // Cotia - Bairros Médios (Granja Viana e adjacências)
  "granja viana": { distanceKm: 11.5, fee: 14.00 },
  "jardim da gloria": { distanceKm: 12.0, fee: 14.00 },
  "fazendinha": { distanceKm: 13.0, fee: 14.00 },

  // Cotia - Distrito de Caucaia do Alto (distância ~19.5 km <= 20 km: ENTREGÁVEL)
  "caucaia do alto": { distanceKm: 19.5, fee: 16.00 },
  "caucaia": { distanceKm: 19.5, fee: 16.00 },

  // Cidades Vizinhas Autorizadas (dentro do limite de 20 km)
  "itapevi": { distanceKm: 8.5, fee: 15.00 },
  "jandira": { distanceKm: 11.0, fee: 15.00 },
  "vargem grande paulista": { distanceKm: 12.5, fee: 15.00 },
  "vargem grande": { distanceKm: 12.5, fee: 15.00 },
  "carapicuiba": { distanceKm: 16.5, fee: 15.00 },
  "barueri": { distanceKm: 17.5, fee: 15.00 },
  "alphaville": { distanceKm: 18.0, fee: 15.00 },
  "embu das artes": { distanceKm: 17.0, fee: 15.00 },
  "taboao da serra": { distanceKm: 19.0, fee: 15.00 },

  // Cidades que Ultrapassam 20 km da loja (BLOQUEADAS)
  "osasco": { distanceKm: 21.0, fee: 0 },
  "sao paulo": { distanceKm: 25.0, fee: 0 },
  "sao roque": { distanceKm: 28.0, fee: 0 },
  "ibiuna": { distanceKm: 35.0, fee: 0 }
};

// Tabela de frete por bairro / região
export const SHIPPING_RATES = {
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
  "caucaia": 16.00,
  "padrao_cotia": 8.50,
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
 * Estima a distância em km a partir de um CEP ou localidade
 * @param {string} neighborhood 
 * @param {string} city 
 * @param {string} rawCep 
 * @returns {number} Distância estimada em km
 */
export function estimateDistanceKm(neighborhood, city = "Cotia", rawCep = "") {
  const normNeighborhood = normalizeText(neighborhood);
  const normCity = normalizeText(city);
  const cleanCep = (rawCep || "").replace(/\D/g, "");

  // 1. Verificação por CEP
  if (cleanCep.length === 8) {
    // Caucaia do Alto (CEPs 06725-xxx a 06729-xxx) - ~19.5 km
    const cepNum = parseInt(cleanCep, 10);
    if (cepNum >= 6725000 && cepNum <= 6729999) {
      return 19.5;
    }

    // Carapicuíba (06300-xxx a 06399-xxx)
    if (cleanCep.startsWith("063")) return 16.5;

    // Barueri / Alphaville (06400-xxx a 06549-xxx)
    if (cleanCep.startsWith("064") || cleanCep.startsWith("065")) return 17.5;

    // Osasco (06000-xxx a 06299-xxx) - > 20 km
    if (cleanCep.startsWith("060") || cleanCep.startsWith("061") || cleanCep.startsWith("062")) return 21.0;

    // São Paulo Capital (01000-xxx a 05999-xxx) - > 20 km
    if (cepNum < 6000000) return 25.0;

    // Outras cidades / estados
    if (cepNum > 7000000) return 35.0;
  }

  // 2. Verificação direta na tabela de localizações conhecidas
  // Prioridade para cidades que não sejam Cotia
  if (normCity && !normCity.includes("cotia")) {
    for (const [key, info] of Object.entries(LOCATION_DISTANCES)) {
      const normKey = normalizeText(key);
      if (normCity.includes(normKey) || normKey.includes(normCity)) {
        return info.distanceKm;
      }
    }
    // Qualquer outra cidade desconhecida muito distante
    return 25.0;
  }

  // Se a cidade for Cotia, busca pelo bairro
  for (const [key, info] of Object.entries(LOCATION_DISTANCES)) {
    const normKey = normalizeText(key);
    if (normNeighborhood.includes(normKey) || normKey.includes(normNeighborhood)) {
      return info.distanceKm;
    }
  }

  // Bairro comum de Cotia não mapeado especificamente (média da região)
  return 5.5;
}

/**
 * Calcula a taxa de entrega e verifica se está dentro do limite de 20 km
 * Retorna apenas o valor e status de entrega, sem poluir com km
 * @param {string} neighborhood - Bairro informado
 * @param {string} city - Cidade informada (padrão Cotia)
 * @param {string} deliveryType - "delivery" ou "retirada"
 * @param {string} rawCep - CEP opcional para precisão
 * @returns {{
 *   fee: number,
 *   distanceKm: number,
 *   isDeliverable: boolean,
 *   maxDistanceKm: number,
 *   label: string,
 *   message: string
 * }}
 */
export function calculateDeliveryFee(neighborhood, city = "Cotia", deliveryType = "delivery", rawCep = "") {
  // Caso de retirada no balcão: sempre permitido e grátis
  if (deliveryType === "retirada") {
    return {
      fee: 0,
      distanceKm: 0,
      isDeliverable: true,
      maxDistanceKm: MAX_DELIVERY_DISTANCE_KM,
      label: "Grátis (Retirada no Local)",
      message: "Retirada no balcão da hamburgueria (Rua Luiz Correia, 44 - Moinho Velho)."
    };
  }

  const normNeighborhood = normalizeText(neighborhood);
  const normCity = normalizeText(city);

  if (!normNeighborhood && !rawCep) {
    return {
      fee: 0,
      distanceKm: 0,
      isDeliverable: false,
      maxDistanceKm: MAX_DELIVERY_DISTANCE_KM,
      label: "Informe o CEP ou bairro",
      message: "Por favor, informe seu CEP ou bairro para verificar a entrega."
    };
  }

  const distanceKm = estimateDistanceKm(neighborhood, city, rawCep);

  // REGRA MÁXIMA: Se a distância for superior a 20 km, NÃO PODE REALIZAR ENTREGA
  if (distanceKm > MAX_DELIVERY_DISTANCE_KM) {
    return {
      fee: 0,
      distanceKm,
      isDeliverable: false,
      maxDistanceKm: MAX_DELIVERY_DISTANCE_KM,
      label: "Entrega Indisponível (Fora da área de atendimento)",
      message: `Desculpe! O endereço informado está fora do nosso raio de entrega (máximo de ${MAX_DELIVERY_DISTANCE_KM} km). Não realizamos entregas para esta localidade. Selecione a opção "Retirada no Local" para retirar seu pedido no balcão.`
    };
  }

  // Se estiver dentro dos 20 km, calcula a taxa correspondente
  let fee = SHIPPING_RATES.padrao_cotia; // R$ 8,50 padrão

  // Verifica se a cidade é vizinha autorizada
  if (normCity && !normCity.includes("cotia")) {
    fee = SHIPPING_RATES.outras_cidades; // R$ 15,00
  } else {
    // Busca na tabela de bairros de Cotia
    for (const [key, value] of Object.entries(SHIPPING_RATES)) {
      if (key === "padrao_cotia" || key === "outras_cidades") continue;
      const normKey = normalizeText(key);
      if (normNeighborhood.includes(normKey) || normKey.includes(normNeighborhood)) {
        fee = value;
        break;
      }
    }
  }

  // Retorna apenas o valor em reais, sem a informação de km
  return {
    fee,
    distanceKm,
    isDeliverable: true,
    maxDistanceKm: MAX_DELIVERY_DISTANCE_KM,
    label: `R$ ${fee.toFixed(2).replace(".", ",")}`,
    message: ""
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
 * Valida se o CEP está dentro do raio máximo de 20 km
 * @param {string} rawCep - CEP com ou sem pontuação
 * @returns {Promise<{
 *   success: boolean,
 *   street?: string,
 *   neighborhood?: string,
 *   city?: string,
 *   uf?: string,
 *   fee?: number,
 *   feeLabel?: string,
 *   distanceKm?: number,
 *   isDeliverable?: boolean,
 *   deliveryMessage?: string,
 *   error?: string
 * }>}
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
        error: "CEP não encontrado. Verifique os dígitos informados."
      };
    }

    const street = data.logradouro || "";
    const neighborhood = data.bairro || "";
    const city = data.localidade || "Cotia";
    const uf = data.uf || "SP";

    // Se o estado não for SP, distância excede muito os 20 km
    if (uf.toUpperCase() !== "SP") {
      return {
        success: true,
        street,
        neighborhood,
        city,
        uf,
        fee: 0,
        feeLabel: "Indisponível (Fora da área de entrega)",
        distanceKm: 50.0,
        isDeliverable: false,
        deliveryMessage: `Entrega indisponível para o estado ${uf}. A hamburgueria realiza entregas somente em Cotia e região (até ${MAX_DELIVERY_DISTANCE_KM} km).`
      };
    }

    const deliveryInfo = calculateDeliveryFee(neighborhood, city, "delivery", cleanCep);

    return {
      success: true,
      street,
      neighborhood,
      city,
      uf,
      fee: deliveryInfo.fee,
      feeLabel: deliveryInfo.label,
      distanceKm: deliveryInfo.distanceKm,
      isDeliverable: deliveryInfo.isDeliverable,
      deliveryMessage: deliveryInfo.message
    };
  } catch (err) {
    console.error("Falha ao consultar ViaCEP:", err);
    return {
      success: false,
      error: "Não foi possível consultar o CEP automaticamente. Você pode preencher o endereço manualmente."
    };
  }
}

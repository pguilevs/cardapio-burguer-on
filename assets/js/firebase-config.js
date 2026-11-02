/**
 * Persistência e sincronização de pedidos via Supabase.
 *
 * A configuração deve ser injetada no deploy:
 * window.__SUPABASE_CONFIG__ = { url: "...", anonKey: "..." };
 * Nunca coloque a service_role key no frontend.
 */

const LOCAL_STORAGE_KEY = "burguer_on_orders_db";
const ORDER_COUNTER_KEY = "burguer_on_order_counter";
const LOCAL_CHANNEL_NAME = "burguer_on_orders_channel";

let supabase = null;
let supabaseReady = false;
let supabaseInitPromise = null;
const activeOrderSubscribers = new Set();
let localBroadcastChannel = null;

try {
  if (typeof BroadcastChannel !== "undefined") {
    localBroadcastChannel = new BroadcastChannel(LOCAL_CHANNEL_NAME);
  }
} catch (error) {
  console.warn("BroadcastChannel indisponível:", error);
}

function getSupabaseConfig() {
  if (typeof window === "undefined") return null;
  const config = window.__SUPABASE_CONFIG__;
  if (!config || !config.url || !config.anonKey) return null;
  return config;
}

export function getActiveFirebaseConfig() {
  const config = getSupabaseConfig();
  return config ? { url: config.url, anonKey: config.anonKey } : {};
}

export function saveCustomFirebaseConfig() {
  throw new Error("A configuração do Supabase deve ser fornecida pelo ambiente de deploy.");
}

export async function initFirebaseFirestore() {
  if (supabaseReady) return supabase;
  if (supabaseInitPromise) return supabaseInitPromise;

  supabaseInitPromise = (async () => {
    const config = getSupabaseConfig();
    if (!config) return null;

    try {
      const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
      supabase = createClient(config.url, config.anonKey);
      supabaseReady = true;
      return supabase;
    } catch (error) {
      console.error("Não foi possível carregar o cliente Supabase:", error);
      return null;
    }
  })();

  return supabaseInitPromise;
}

if (typeof window !== "undefined") initFirebaseFirestore();

export async function signInAdmin(email, password) {
  const client = await initFirebaseFirestore();
  if (!client) throw new Error("Supabase não configurado neste deploy.");
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOutAdmin() {
  const client = await initFirebaseFirestore();
  if (client) {
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }
}

export async function getAdminSession() {
  const client = await initFirebaseFirestore();
  if (!client) return null;
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function generateNextOrderNumber() {
  try {
    const current = parseInt(localStorage.getItem(ORDER_COUNTER_KEY) || "1000", 10);
    const next = current + 1;
    localStorage.setItem(ORDER_COUNTER_KEY, String(next));
    return String(next);
  } catch (error) {
    return String(Math.floor(1000 + Math.random() * 9000));
  }
}

export function getLocalOrders() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Erro ao ler pedidos locais:", error);
    return [];
  }
}

function setLocalOrders(orders) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(orders));
}

function notifyLocalSubscribers() {
  const orders = getLocalOrders();
  activeOrderSubscribers.forEach((callback) => callback(orders));
}

function generateOrderId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `local_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
}

function normalizeOrder(row) {
  return {
    ...row,
    id: row.id,
    numero: String(row.numero),
    criadoEmMs: row.criado_em_ms || row.criadoEmMs || Date.now(),
    dataHoraFormatada: row.data_hora_formatada || row.dataHoraFormatada || new Date(row.criado_em_ms || Date.now()).toLocaleString("pt-BR"),
    impresso: Boolean(row.impresso),
    distanciaKm: row.distancia_km || row.distanciaKm || 0,
    itens: (row.itens || []).map((item) => ({
      ...item,
      nome: item.nome || item.name,
      quantidade: item.quantidade || item.quantity,
      preco: item.preco || item.unitPrice,
      precoTotal: item.precoTotal || item.totalPrice,
      adicionais: item.adicionais || item.extras || [],
      observacao: item.observacao || item.observations || ""
    }))
  };
}

export async function createOrder(orderData) {
  const client = await initFirebaseFirestore();
  const timestampMs = Date.now();
  const orderId = generateOrderId();
  const newOrder = {
    ...orderData,
    id: orderId,
    numero: orderData.numero || generateNextOrderNumber(),
    criado_em_ms: timestampMs,
    data_hora_formatada: new Date(timestampMs).toLocaleString("pt-BR"),
    status: orderData.status || "pendente",
    impresso: Boolean(orderData.impresso)
  };

  if (client) {
    const databaseOrder = {
      id: orderId,
      numero: newOrder.numero,
      tipo: newOrder.tipo,
      status: newOrder.status,
      impresso: newOrder.impresso,
      distancia_km: newOrder.distanciaKm || 0,
      cliente: newOrder.cliente,
      itens: newOrder.itens,
      subtotal: newOrder.subtotal,
      frete: newOrder.frete,
      total: newOrder.total,
      pagamento: newOrder.pagamento,
      criado_em_ms: newOrder.criado_em_ms,
      data_hora_formatada: newOrder.data_hora_formatada
    };
    // Não usamos .select() aqui: clientes anônimos podem inserir, mas não podem ler pedidos.
    const { error } = await client.from("pedidos").insert(databaseOrder);
    if (error) throw error;
    return { success: true, id: orderId, orderNumber: newOrder.numero };
  }

  const localOrder = normalizeOrder(newOrder);
  const orders = [localOrder, ...getLocalOrders()].slice(0, 100);
  setLocalOrders(orders);
  if (localBroadcastChannel) localBroadcastChannel.postMessage({ type: "ORDERS_CHANGED" });
  notifyLocalSubscribers();
  return { success: true, id: localOrder.id, orderNumber: localOrder.numero };
}

async function updateOrder(orderId, values) {
  const client = await initFirebaseFirestore();
  if (client && !String(orderId).startsWith("local_")) {
    const { error } = await client.from("pedidos").update(values).eq("id", orderId);
    if (error) throw error;
  }

  const orders = getLocalOrders();
  const target = orders.find((order) => order.id === orderId);
  if (target) {
    Object.assign(target, values);
    setLocalOrders(orders);
    notifyLocalSubscribers();
  }
  if (localBroadcastChannel) localBroadcastChannel.postMessage({ type: "ORDERS_CHANGED" });
}

export async function updateOrderStatus(orderId, newStatus) {
  await updateOrder(orderId, { status: newStatus });
  return true;
}

export async function markOrderAsPrinted(orderId) {
  await updateOrder(orderId, { impresso: true });
  return true;
}

export function subscribeToOrders(onOrdersUpdate) {
  activeOrderSubscribers.add(onOrdersUpdate);
  onOrdersUpdate(getLocalOrders());
  let channel = null;
  let cancelled = false;

  (async () => {
    const client = await initFirebaseFirestore();
    if (!client || cancelled) return;
    const { data, error } = await client.from("pedidos").select("*").order("criado_em_ms", { ascending: false }).limit(100);
    if (!error && data) {
      const orders = data.map(normalizeOrder);
      setLocalOrders(orders);
      onOrdersUpdate(orders);
    }
    channel = client.channel("pedidos-kds")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, async () => {
        const result = await client.from("pedidos").select("*").order("criado_em_ms", { ascending: false }).limit(100);
        if (!result.error && result.data) {
          const orders = result.data.map(normalizeOrder);
          setLocalOrders(orders);
          onOrdersUpdate(orders);
        }
      })
      .subscribe();
  })();

  const handleLocalMessage = () => onOrdersUpdate(getLocalOrders());
  if (localBroadcastChannel) localBroadcastChannel.addEventListener("message", handleLocalMessage);

  return () => {
    cancelled = true;
    activeOrderSubscribers.delete(onOrdersUpdate);
    if (channel) channel.unsubscribe();
    if (localBroadcastChannel) localBroadcastChannel.removeEventListener("message", handleLocalMessage);
  };
}

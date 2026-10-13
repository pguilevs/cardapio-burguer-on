/**
 * Módulo de Integração com Firebase Firestore (via CDN)
 * Burguer On Artesanal - Sincronização em Tempo Real de Pedidos
 */

// Referências das funções do SDK do Firebase
let initializeApp = null;
let getFirestore = null;
let collection = null;
let addDoc = null;
let doc = null;
let updateDoc = null;
let onSnapshot = null;
let query = null;
let orderBy = null;
let serverTimestamp = null;
let getDocs = null;

// Configuração padrão do Firebase para a aplicação Burguer On
// O usuário também pode configurar suas credenciais salvas no localStorage
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDummyKeyBurguerOn_FirestoreRealtime",
  authDomain: "burguer-on-artesanal.firebaseapp.com",
  projectId: "burguer-on-artesanal",
  storageBucket: "burguer-on-artesanal.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};

// Canal local de alta velocidade entre abas (BroadcastChannel)
const LOCAL_CHANNEL_NAME = "burguer_on_orders_channel";
const LOCAL_STORAGE_KEY = "burguer_on_orders_db";
const ORDER_COUNTER_KEY = "burguer_on_order_counter";

let localBroadcastChannel = null;
try {
  if (typeof BroadcastChannel !== "undefined") {
    localBroadcastChannel = new BroadcastChannel(LOCAL_CHANNEL_NAME);
  }
} catch (e) {
  console.warn("BroadcastChannel indisponível:", e);
}

// Recupera a configuração ativa
export function getActiveFirebaseConfig() {
  try {
    if (typeof localStorage !== "undefined") {
      const custom = localStorage.getItem("BURGUER_ON_FIREBASE_CONFIG");
      if (custom) {
        const parsed = JSON.parse(custom);
        if (parsed && parsed.projectId) return parsed;
      }
    }
  } catch (err) {
    console.warn("Erro ao ler config do Firebase do localStorage:", err);
  }
  return DEFAULT_FIREBASE_CONFIG;
}

// Salva nova configuração do Firebase personalizada
export function saveCustomFirebaseConfig(config) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("BURGUER_ON_FIREBASE_CONFIG", JSON.stringify(config));
      return true;
    }
  } catch (e) {
    return false;
  }
  return false;
}

// Instâncias ativas do Firebase
let app = null;
let db = null;
let firestoreInitialized = false;

/**
 * Inicializa os módulos CDN do Firebase quando em ambiente de navegador
 */
export async function initFirebaseFirestore() {
  if (typeof window === "undefined") return null;
  if (firestoreInitialized) return db;

  try {
    const appModule = await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js");
    const fsModule = await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js");

    initializeApp = appModule.initializeApp;
    getFirestore = fsModule.getFirestore;
    collection = fsModule.collection;
    addDoc = fsModule.addDoc;
    doc = fsModule.doc;
    updateDoc = fsModule.updateDoc;
    onSnapshot = fsModule.onSnapshot;
    query = fsModule.query;
    orderBy = fsModule.orderBy;
    serverTimestamp = fsModule.serverTimestamp;
    getDocs = fsModule.getDocs;

    const config = getActiveFirebaseConfig();
    app = initializeApp(config, "burguerOnApp_" + Date.now());
    db = getFirestore(app);
    firestoreInitialized = true;
    console.log("Firebase Firestore inicializado com sucesso via CDN.");
    return db;
  } catch (err) {
    console.warn("Aviso ao carregar Firebase Firestore CDN (modo local/sincronizado ativo):", err.message);
    return null;
  }
}

// Inicializa automaticamente no browser
if (typeof window !== "undefined") {
  initFirebaseFirestore();
}

/**
 * Gera um número sequencial de pedido (ex: 1001, 1002, 1003...)
 */
export function generateNextOrderNumber() {
  try {
    let current = parseInt(localStorage.getItem(ORDER_COUNTER_KEY) || "1000", 10);
    current += 1;
    localStorage.setItem(ORDER_COUNTER_KEY, current.toString());
    return current.toString();
  } catch (e) {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }
}

/**
 * Lê os pedidos salvos localmente
 */
export function getLocalOrders() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Salva a lista de pedidos localmente
 */
function setLocalOrders(orders) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(orders));
  } catch (e) {
    console.error("Erro ao salvar pedido no localStorage:", e);
  }
}

/**
 * Salva um novo pedido no Firestore e na redundância local
 * @param {Object} orderData 
 * @returns {Promise<{ success: boolean, id: string, orderNumber: string }>}
 */
export async function createOrder(orderData) {
  const orderNumber = orderData.numero || generateNextOrderNumber();
  const timestampMs = Date.now();
  
  const newOrder = {
    ...orderData,
    numero: orderNumber,
    criadoEmMs: timestampMs,
    dataHoraFormatada: new Date(timestampMs).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }),
    status: orderData.status || "pendente",
    impresso: Boolean(orderData.impresso)
  };

  let firestoreDocId = null;

  // 1. Tentar gravar no Firebase Firestore
  if (db && firestoreInitialized) {
    try {
      const docRef = await addDoc(collection(db, "pedidos"), {
        ...newOrder,
        criadoEm: serverTimestamp()
      });
      firestoreDocId = docRef.id;
      console.log("Pedido gravado no Firestore com ID:", firestoreDocId);
    } catch (fsError) {
      console.warn("Aviso: Falha ao enviar para Firestore (usando fallback sincronizado):", fsError.message);
    }
  }

  // 2. Gravar no armazenamento local sincronizado
  const localId = firestoreDocId || `local_${timestampMs}_${Math.floor(Math.random() * 1000)}`;
  newOrder.id = localId;

  const currentLocal = getLocalOrders();
  // Insere no início
  currentLocal.unshift(newOrder);
  // Mantém os últimos 100 pedidos
  if (currentLocal.length > 100) currentLocal.length = 100;
  setLocalOrders(currentLocal);

  // 3. Notificar abas abertas (admin/kds) instantaneamente
  if (localBroadcastChannel) {
    localBroadcastChannel.postMessage({
      type: "NEW_ORDER",
      order: newOrder
    });
  }

  return {
    success: true,
    id: localId,
    orderNumber
  };
}

/**
 * Atualiza o status de um pedido (pendente -> preparo -> entrega -> finalizado)
 */
export async function updateOrderStatus(orderId, newStatus) {
  // Atualiza local
  const orders = getLocalOrders();
  const target = orders.find(o => o.id === orderId);
  if (target) {
    target.status = newStatus;
    setLocalOrders(orders);
  }

  if (localBroadcastChannel) {
    localBroadcastChannel.postMessage({
      type: "STATUS_UPDATE",
      orderId,
      status: newStatus
    });
  }

  // Tenta atualizar Firestore se disponível e não for apenas ID local
  if (db && firestoreInitialized && !orderId.startsWith("local_")) {
    try {
      const docRef = doc(db, "pedidos", orderId);
      await updateDoc(docRef, { status: newStatus });
    } catch (err) {
      console.warn("Falha ao atualizar status no Firestore:", err.message);
    }
  }

  return true;
}

/**
 * Marca um pedido como impresso
 */
export async function markOrderAsPrinted(orderId) {
  const orders = getLocalOrders();
  const target = orders.find(o => o.id === orderId);
  if (target) {
    target.impresso = true;
    setLocalOrders(orders);
  }

  if (localBroadcastChannel) {
    localBroadcastChannel.postMessage({
      type: "PRINT_UPDATE",
      orderId,
      impresso: true
    });
  }

  if (db && firestoreInitialized && !orderId.startsWith("local_")) {
    try {
      const docRef = doc(db, "pedidos", orderId);
      await updateDoc(docRef, { impresso: true });
    } catch (err) {
      console.warn("Falha ao atualizar impressão no Firestore:", err.message);
    }
  }

  return true;
}

/**
 * Escuta pedidos em tempo real no Firestore e via BroadcastChannel
 * @param {Function} onOrdersUpdate - Callback chamado com a lista completa de pedidos
 */
export function subscribeToOrders(onOrdersUpdate) {
  let unsubscribeFirestore = null;

  // Emite o estado inicial local
  onOrdersUpdate(getLocalOrders());

  // 1. Escuta canal local entre abas
  const handleLocalMessage = (event) => {
    if (event.data && (event.data.type === "NEW_ORDER" || event.data.type === "STATUS_UPDATE" || event.data.type === "PRINT_UPDATE")) {
      onOrdersUpdate(getLocalOrders());
    }
  };

  if (localBroadcastChannel) {
    localBroadcastChannel.addEventListener("message", handleLocalMessage);
  }

  // 2. Escuta Firestore em tempo real
  if (db && firestoreInitialized) {
    try {
      const q = query(collection(db, "pedidos"), orderBy("criadoEmMs", "desc"));
      unsubscribeFirestore = onSnapshot(q, (snapshot) => {
        const fsOrders = [];
        snapshot.forEach((docSnap) => {
          fsOrders.push({
            id: docSnap.id,
            ...docSnap.data()
          });
        });

        if (fsOrders.length > 0) {
          // Mescla com locais para não perder nenhum
          const local = getLocalOrders();
          const mergedMap = new Map();
          
          fsOrders.forEach(o => mergedMap.set(o.id, o));
          local.forEach(o => {
            if (!mergedMap.has(o.id)) {
              mergedMap.set(o.id, o);
            }
          });

          const merged = Array.from(mergedMap.values());
          merged.sort((a, b) => (b.criadoEmMs || 0) - (a.criadoEmMs || 0));
          setLocalOrders(merged);
          onOrdersUpdate(merged);
        }
      }, (error) => {
        console.warn("Aviso listener Firestore (usando canal local):", error.message);
      });
    } catch (err) {
      console.warn("Erro ao configurar snapshot Firestore:", err);
    }
  }

  // Retorna função de desinscrição
  return () => {
    if (unsubscribeFirestore) unsubscribeFirestore();
    if (localBroadcastChannel) {
      localBroadcastChannel.removeEventListener("message", handleLocalMessage);
    }
  };
}

<script setup lang="ts">
// Importar tipos desde el módulo compartido
import type {
  Chat,
  Message,
  ChatWithMessages,
} from "../../../shared/types/types";

// Logger que solo muestra mensajes en desarrollo
const logger = {
  error: (message: string, error: any, context: Record<string, any> = {}) => {
    if (process.dev) {
      console.error(`[CHAT] ${message}`, { error, ...context });
    }
  },
  warn: (message: string, context: Record<string, any> = {}) => {
    if (process.dev) {
      console.warn(`[CHAT] ${message}`, context);
    }
  },
  info: (message: string, context: Record<string, any> = {}) => {
    if (process.dev) {
      console.log(`[CHAT] ${message}`, context);
    }
  }
};

definePageMeta({
  middleware: "auth",
});

const route = useRoute();
const chatId = route.params.id as string;
const isNewChat = chatId === "new";
const agentId = route.query.agentId as string;
const isStreaming = ref(false)
const streamingMessageId = ref<string | null>(null)

// Usar cookies para rastrear el agente seleccionado
const selectedAgentCookie = useCookie('x-agent-id', {
  default: () => null,
  maxAge: 60 * 60 * 24 * 7 // 7 días
});

// Computed para verificar si hay un agente válido seleccionado
const hasValidAgent = computed(() => {
  // Debe haber agentId en la URL y debe coincidir con la cookie (si existe)
  if (!agentId) return false;
  
  // Si no hay cookie, establecerla con el agentId de la URL
  if (!selectedAgentCookie.value) {
    selectedAgentCookie.value = agentId;
    return true;
  }
  
  // Verificar que coincidan para seguridad
  return selectedAgentCookie.value === agentId;
});


// Inicializar el estado del chat
const {
  isLoading: isChatLoading,
  error: chatError,
  prefetchChatMessages,
  fetchChats,
  chats,
} = useChats();

// Usar el composable de API
const { fetch: apiFetch } = useApi();

// Estado local
const chat = ref<ChatWithMessages | null>(null);
const messages = ref<Message[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const typing = ref(false);

// Función para crear un nuevo chat
async function createNewChat(): Promise<ChatWithMessages | null> {
  try {
    if (!agentId) {
      throw new Error("Se requiere un agentId para crear un nuevo chat");
    }

    const response = await apiFetch<{ data: Chat }>("/api/chats", {
      method: "POST",
      body: { agentId: agentId },
    });

    if (!response.data) return null;

    return {
      ...response.data,
      messages: []
    } as ChatWithMessages;
  } catch (err) {
    logger.error("Error al crear el chat", err, {
      chatId: 'new',
      isNewChat: true,
      agentId: agentId
    });
    error.value = "No se pudo crear un nuevo chat. Por favor, inténtalo de nuevo.";
    return null;
  }
}

// Función para enviar un mensaje
async function sendMessage(
    content: string,
    chatId: string
): Promise<Message | null> {
  try {
    isStreaming.value = true

    // Crear mensaje temporal del AI que se irá actualizando
    const tempAiMessageId = `ai-temp-${Date.now()}`
    const aiMessage: Message = {
      id: tempAiMessageId,
      chatId: chatId,
      content: '', // Empezará vacío y se irá llenando
      role: "assistant",
      userId: chat.value?.userId || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { streaming: true },
    }

    // Agregar mensaje temporal del AI
    messages.value = [...messages.value, aiMessage]
    streamingMessageId.value = tempAiMessageId

    // Hacer llamada de streaming
    const response = await fetch(`/api/chats/${chatId}/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': chat.value?.userId || '',
        'x-agent-id': agentId || ''
      },
      body: JSON.stringify({ content })
    })

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`)
    }

    if (!response.body) {
      throw new Error('No se recibió stream del servidor')
    }

    // Procesar el stream
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let fullContent = ''

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        // Decodificar chunk
        const chunk = decoder.decode(value, { stream: true })
        fullContent += chunk

        // Actualizar mensaje en tiempo real
        const messageIndex = messages.value.findIndex(m => m.id === tempAiMessageId)
        if (messageIndex !== -1) {
          messages.value[messageIndex] = {
            ...messages.value[messageIndex],
            content: fullContent,
            updatedAt: new Date()
          }
        }
      }
    } finally {
      reader.releaseLock()
      isStreaming.value = false
      streamingMessageId.value = null

      // Marcar mensaje como completado
      const messageIndex = messages.value.findIndex(m => m.id === tempAiMessageId)
      if (messageIndex !== -1) {
        messages.value[messageIndex] = {
          ...messages.value[messageIndex],
          metadata: { streaming: false, completed: true }
        }
      }
    }

    // Retornar el mensaje del usuario (para compatibilidad)
    return {
      id: `user-${Date.now()}`,
      chatId: chatId,
      content: content,
      role: "user",
      userId: chat.value?.userId || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    }

  } catch (err) {
    console.error("Error en streaming:", err)
    isStreaming.value = false
    streamingMessageId.value = null

    // Remover mensaje temporal en caso de error
    messages.value = messages.value.filter(m => m.id !== `ai-temp-${Date.now()}`)
    throw err
  }
}

// Cargar el chat o crear uno nuevo
async function loadChat() {
  if (isNewChat) {
    // Para un nuevo chat, creamos uno nuevo
    try {
      isLoading.value = true;
      error.value = null;

      // Crear un nuevo chat
      const newChat = await createNewChat();
      if (newChat) {
        chat.value = newChat;
        messages.value = newChat.messages || [];
      } else {
        throw new Error("No se pudo crear un nuevo chat");
      }
    } catch (err) {
    logger.error("Error al cargar el chat", err, {
      chatId: chatId,
      isNewChat: isNewChat
    });
    error.value = "No se pudo cargar el chat. Por favor, inténtalo de nuevo más tarde.";
    } finally {
      isLoading.value = false;
    }
  } else {
    // Para un chat existente, usamos prefetchChatMessages
    try {
      isLoading.value = true;

      // Primero intentamos cargar desde los chats ya cargados
      const existingChat = chats.value.find((c) => c.id === chatId);

      if (existingChat) {
        // Si encontramos el chat en la lista, usamos esos datos
        chat.value = { ...existingChat, messages: existingChat.messages || [] };
        messages.value = existingChat.messages || [];

        // Luego intentamos cargar los mensajes más recientes
        await prefetchChatMessages();

        // Actualizamos con los datos más recientes si están disponibles
        const updatedChat = chats.value.find((c) => c.id === chatId);
        if (updatedChat) {
          chat.value = { ...updatedChat, messages: updatedChat.messages || [] };
          messages.value = updatedChat.messages || [];
        }
      } else {
        // Si no encontramos el chat, intentamos cargarlo directamente
        const response = await apiFetch<{ data: ChatWithMessages }>(
          `/api/chats/${chatId}`
        );

        if (response?.data) {
          chat.value = response.data;
          messages.value = response.data.messages || [];
        }
      }
    } catch (err) {
      logger.error("Error al cargar el chat", err, {
        chatId: chatId,
        isNewChat: isNewChat
      });
      error.value = "No se pudo cargar el chat. Por favor, inténtalo de nuevo.";
    } finally {
      isLoading.value = false;
    }
  }
}

// Manejar el envío de mensajes
const handleSendMessage = async (content: string) => {
  if (!content.trim()) return;

  try {
    typing.value = true;
    error.value = null;

    // Si no hay chat pero tenemos un chatId válido, crear el chat primero
    if (!chat.value && chatId && chatId !== 'new' && agentId) {
      logger.info("Creando chat automáticamente", { chatId, agentId });

      // Crear el chat con el chatId como ID
      const response = await apiFetch<{ success: boolean; data?: Chat; message?: string; error?: string }>("/api/chats", {
        method: "POST",
        body: { 
          agentId: agentId,
          chatId: chatId // Usar el chatId de la URL como ID del chat
        },
      });

      logger.info("Respuesta de creación de chat", { response });

      if (response.success && response.data) {
        chat.value = {
          ...response.data,
          messages: []
        } as ChatWithMessages;
        messages.value = [];

        // Refrescar el historial de chats después de crear uno nuevo
        try {
          await fetchChats();
          logger.info("Historial de chats actualizado después de crear nuevo chat");
        } catch (refreshError) {
          logger.warn("No se pudo actualizar el historial de chats", { error: refreshError });
        }
      } else {
        const errorMsg = response.error || response.message || "No se pudo crear el chat";
        logger.error("Error en respuesta de creación de chat", { response });
        throw new Error(errorMsg);
      }
    }

    if (!chat.value) {
      throw new Error("No hay chat disponible para enviar el mensaje");
    }

    // Crear un mensaje local inmediatamente para mejor UX
    const tempId = `temp-${Date.now()}`;
    const userMessage: Message = {
      id: tempId,
      chatId: chat.value.id,
      content,
      role: "user",
      userId: chat.value.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };

    // Agregar el mensaje localmente
    messages.value = [...messages.value, userMessage];

    // Enviar el mensaje al servidor
    await sendMessage(content, chat.value.id);

    // Si es el primer mensaje del chat y no tiene título, generar uno con IA
    if (chat.value && (!chat.value.title || chat.value.title === 'Nuevo chat') && messages.value.length === 1) {
      // La llamada se hace en segundo plano para no bloquear la UI
      apiFetch<{ success: boolean, data?: { title: string } }>(`/api/chats/${chat.value.id}/generate-title`, {
        method: 'POST'
      }).then(response => {
        if (response.success && response.data?.title && chat.value) {
          // Actualizar el título localmente en el chat actual
          chat.value.title = response.data.title;
          // Refrescar la lista de chats para que se muestre el nuevo título
          fetchChats();
        }
      }).catch(err => {
        logger.warn('La generación de título con IA falló, se usará un título por defecto.', { error: err });
      });
    }
  } catch (err) {
    logger.error("Error al enviar el mensaje", err, {
      chatId: chatId,
      messageLength: content.length,
      agentId: agentId
    });
    error.value = "No se pudo enviar el mensaje. Por favor, inténtalo de nuevo.";
  } finally {
    typing.value = false;
  }
};

// Reintentar la carga del chat
async function handleRetry() {
  error.value = null;
  await loadChat();
}

// Cargar el chat cuando se monta el componente
onMounted(() => {
  loadChat();
});

// Configuración de la página
const appConfig = useAppConfig();
const title = computed(() => {
  if (isNewChat) return `Nuevo chat - ${appConfig.title}`;
  return chat.value?.title
    ? `${chat.value.title} - ${appConfig.title}`
    : appConfig.title;
});

// Cargar el chat cuando se monta el componente
onMounted(() => {
  loadChat();
});

// Manejar errores de navegación
async function handleError() {
  await navigateTo("/", { replace: true });
}

useHead({
  title,
});
</script>

<template>
  <div class="h-full flex flex-col">
    <NuxtErrorBoundary>
      <ChatWindow
        v-if="chat"
        :typing="typing"
        :chat="chat"
        :is-streaming="isStreaming"
        :messages="messages"
        :is-loading="isLoading || isChatLoading"
        :error="error || chatError"
        @send-message="handleSendMessage"
        @retry="handleRetry"
      />
      <div
        v-else-if="isLoading || isChatLoading"
        class="flex items-center justify-center h-full"
      >
        <div class="text-center p-8">
          <UIcon
            name="i-heroicons-arrow-path"
            class="w-12 h-12 text-gray-400 animate-spin mx-auto mb-4"
          />
          <p class="text-gray-500">Cargando chat...</p>
        </div>
      </div>
      <div v-else class="flex items-center justify-center h-full">
        <!-- Si hay un agente válido y chatId válido (UUID), mostrar input de chat -->
        <div v-if="hasValidAgent && chatId && chatId !== 'new' && chatId.length > 10" class="w-full max-w-2xl p-8">
          <div class="text-center mb-8">
            <UIcon
              name="i-heroicons-chat-bubble-left-right"
              class="w-16 h-16 text-gray-300 mx-auto mb-4"
            />
            <h2 class="text-xl font-semibold text-gray-700 mb-2">Nuevo Chat</h2>
            <p class="text-gray-500">
              Escribe tu primer mensaje para comenzar la conversación.
            </p>
          </div>
          <div class="w-full">
            <ChatInput :disabled="isLoading" @send-message="handleSendMessage" />
          </div>
        </div>
        <!-- Mensaje cuando no hay agente seleccionado -->
        <div v-else-if="!hasValidAgent" class="text-center p-8">
          <UIcon
            name="i-heroicons-user-circle"
            class="w-16 h-16 text-gray-300 mx-auto mb-4"
          />
          <h2 class="text-xl font-semibold text-gray-700">Selecciona un Agente</h2>
          <p class="text-gray-500 mt-2">
            Haz clic en un agente de la sección "Mis Agentes" para comenzar a chatear.
          </p>
        </div>
        <!-- Mensaje por defecto cuando no hay chatId válido -->
        <div v-else class="text-center p-8">
          <UIcon
            name="i-heroicons-chat-bubble-left-right"
            class="w-16 h-16 text-gray-300 mx-auto mb-4"
          />
          <h2 class="text-xl font-semibold text-gray-700">Bienvenido</h2>
          <p class="text-gray-500 mt-2">
            Selecciona un chat para comenzar a conversar.
          </p>
        </div>
      </div>

      <template #error="{ error: boundaryError }">
        <UContainer class="flex justify-center items-center h-full p-4">
          <UCard variant="soft" class="min-w-md">
            <template #header>
              <h1 class="text-lg font-bold">
                Error - {{ (boundaryError as any)?.statusCode || "Error" }}
              </h1>
            </template>

            <p class="mb-4">
              {{ boundaryError.message || "Ocurrió un error inesperado" }}
            </p>

            <div class="space-x-2">
              <UButton
                color="primary"
                variant="soft"
                icon="i-heroicons-arrow-path"
                :loading="isLoading"
                @click="handleRetry"
              >
                Reintentar
              </UButton>

              <UButton
                color="neutral"
                variant="ghost"
                icon="i-heroicons-arrow-left"
                @click="handleError"
              >
                Volver al inicio
              </UButton>
            </div>
          </UCard>
        </UContainer>
      </template>
    </NuxtErrorBoundary>
  </div>
</template>

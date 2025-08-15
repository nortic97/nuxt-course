<script setup lang="ts">
// Importar tipos desde el módulo compartido
import type {
  Chat,
  Message,
  ChatWithMessages,
} from "../../../shared/types/types";

definePageMeta({
  middleware: "auth",
});

const route = useRoute();
const chatId = route.params.id as string;
const isNewChat = chatId === "new";

// Inicializar el estado del chat
const {
  isLoading: isChatLoading,
  error: chatError,
  prefetchChatMessages,
  chats,
} = useChats();

// Estado local
const chat = ref<ChatWithMessages | null>(null);
const messages = ref<Message[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const typing = ref(false);

// Función para crear un nuevo chat
async function createNewChat(): Promise<ChatWithMessages | null> {
  try {
    // Usamos un agente por defecto o permitimos que el backend lo asigne
    const response = await $fetch<{ data: Chat }>("/api/chats", {
      method: "POST",
      headers: useRequestHeaders(["cookie"]),
      body: { agentId: "default" }, // Usamos un agente por defecto
    });

    if (!response.data) return null;
  } catch (err) {
    console.error("Error al crear el chat:", err);
    error.value =
      "No se pudo crear un nuevo chat. Por favor, inténtalo de nuevo.";
    return null;
  }
}

// Función para enviar un mensaje
async function sendMessage(
  content: string,
  chatId: string
): Promise<Message | null> {
  try {
    const response = await $fetch<{ data: Message }>(
      `/api/chats/${chatId}/messages`,
      {
        method: "POST",
        headers: useRequestHeaders(["cookie"]),
        body: { content },
      }
    );
    return response.data || null;
  } catch (err) {
    console.error("Error al enviar el mensaje:", err);
    throw err;
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
      console.error("Error creating chat:", err);
      error.value =
        "No se pudo crear un nuevo chat. Por favor, inténtalo de nuevo.";
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
        chat.value = { ...existingChat, messages: messages.value };

        // Luego intentamos cargar los mensajes más recientes
        await prefetchChatMessages();

        // Actualizamos con los datos más recientes si están disponibles
        const updatedChat = chats.value.find((c) => c.id === chatId);
        if (updatedChat) {
          chat.value = { ...updatedChat, messages: messages.value };
        }
      } else {
        // Si no encontramos el chat, intentamos cargarlo directamente
        const response = await $fetch<{ data: ChatWithMessages }>(
          `/api/chats/${chatId}`,
          {
            headers: useRequestHeaders(["cookie"]),
          }
        );

        if (response?.data) {
          chat.value = response.data;
          messages.value = response.data.messages || [];
        }
      }
    } catch (err) {
      console.error("Error loading chat:", err);
      error.value = "No se pudo cargar el chat. Por favor, inténtalo de nuevo.";
    } finally {
      isLoading.value = false;
    }
  }
}

// Manejar el envío de mensajes
const handleSendMessage = async (content: string) => {
  if (!content.trim() || !chat.value) return;

  try {
    typing.value = true;

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
    const serverMessage = await sendMessage(content, chat.value.id);

    if (serverMessage) {
      // Reemplazar el mensaje temporal con la respuesta del servidor
      const messageIndex = messages.value.findIndex(
        (m: Message) => m.id === tempId
      );
      if (messageIndex !== -1) {
        messages.value[messageIndex] = serverMessage;
      } else {
        messages.value.push(serverMessage);
      }
    }

    error.value = null;
  } catch (err) {
    console.error("Error sending message:", err);
    error.value =
      "No se pudo enviar el mensaje. Por favor, inténtalo de nuevo.";
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
        <div class="text-center p-8">
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

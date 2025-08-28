<script setup lang="ts">
// Import types from the shared module
import type {
  Chat,
  Message,
  ChatWithMessages,
} from "../../../shared/types/types";

// Logger that only shows messages in development
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

// Use cookies to track the selected agent
const selectedAgentCookie = useCookie('x-agent-id', {
  default: () => null,
  maxAge: 60 * 60 * 24 * 7 // 7 days
});

// Computed to check if a valid agent is selected
const hasValidAgent = computed(() => {
  // There must be an agentId in the URL and it must match the cookie (if it exists)
  if (!agentId) return false;
  
  // If there is no cookie, set it with the agentId from the URL
  if (!selectedAgentCookie.value) {
    selectedAgentCookie.value = agentId;
    return true;
  }
  
  // Verify they match for security
  return selectedAgentCookie.value === agentId;
});


// Initialize chat state
const {
  isLoading: isChatLoading,
  error: chatError,
  prefetchChatMessages,
  fetchChats,
  chats,
} = useChats();

// Use the API composable
const { fetch: apiFetch } = useApi();

// Local state
const chat = ref<ChatWithMessages | null>(null);
const messages = ref<Message[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const typing = ref(false);

// Function to create a new chat
async function createNewChat(): Promise<ChatWithMessages | null> {
  try {
    if (!agentId) {
      throw new Error("agentId is required to create a new chat");
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
    logger.error("Error creating chat", err, {
      chatId: 'new',
      isNewChat: true,
      agentId: agentId
    });
    error.value = "Could not create a new chat. Please try again.";
    return null;
  }
}

// Function to send a message
async function sendMessage(
    content: string,
    chatId: string
): Promise<Message | null> {
  try {
    isStreaming.value = true

    // Create a temporary AI message that will be updated
    const tempAiMessageId = `ai-temp-${Date.now()}`
    const aiMessage: Message = {
      id: tempAiMessageId,
      chatId: chatId,
      content: '', // Will start empty and be filled
      role: "assistant",
      userId: chat.value?.userId || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { streaming: true },
    }

    // Add temporary AI message
    messages.value = [...messages.value, aiMessage]
    streamingMessageId.value = tempAiMessageId

    // Make streaming call
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
      throw new Error('No stream received from server')
    }

    // Process the stream
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let fullContent = ''

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        // Decode chunk
        const chunk = decoder.decode(value, { stream: true })
        fullContent += chunk

        // Update message in real-time
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

      // Mark message as completed
      const messageIndex = messages.value.findIndex(m => m.id === tempAiMessageId)
      if (messageIndex !== -1) {
        messages.value[messageIndex] = {
          ...messages.value[messageIndex],
          metadata: { streaming: false, completed: true }
        }
      }
    }

    // Return the user message (for compatibility)
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
    console.error("Streaming error:", err)
    isStreaming.value = false
    streamingMessageId.value = null

    // Remove temporary message in case of error
    messages.value = messages.value.filter(m => m.id !== `ai-temp-${Date.now()}`)
    throw err
  }
}

// Load the chat or create a new one
async function loadChat() {
  isLoading.value = true;
  error.value = null;

  try {
    if (isNewChat) {
      // For a new chat, we create a new one
      const newChat = await createNewChat();
      if (newChat) {
        chat.value = newChat;
        messages.value = newChat.messages || [];
      } else {
        throw new Error("Could not create a new chat");
      }
    } else {
      // For an existing chat, we load it
      // First, try to find it in the already loaded chats list
      let loadedChat = chats.value.find((c) => c.id === chatId) as ChatWithMessages | undefined;

      // If it's not there or has no messages, fetch it from the API
      if (!loadedChat || !loadedChat.messages || loadedChat.messages.length === 0) {
        const response = await apiFetch<{ data: ChatWithMessages }>(
          `/api/chats/${chatId}`
        );
        if (response?.data) {
          loadedChat = response.data;
          // Update the global chats list for consistency
          const index = chats.value.findIndex(c => c.id === chatId);
          if (index !== -1) {
            chats.value[index] = { ...chats.value[index], ...loadedChat };
          } else {
            chats.value.unshift(loadedChat);
          }
        }
      }

      if (loadedChat) {
        chat.value = loadedChat;
        messages.value = loadedChat.messages || [];
      } else {
        throw new Error(`Could not find chat with ID: ${chatId}`);
      }
    }
  } catch (err) {
    logger.error("Error loading chat", err, {
      chatId: chatId,
      isNewChat: isNewChat
    });
    error.value = "Could not load chat. Please try again.";
  } finally {
    isLoading.value = false;
  }
}

// Handle message sending
const handleSendMessage = async (content: string) => {
  if (!content.trim()) return;

  try {
    typing.value = true;
    error.value = null;

    // If there is no chat but we have a valid chatId, create the chat first
    if (!chat.value && chatId && chatId !== 'new' && agentId) {
      logger.info("Creating chat automatically", { chatId, agentId });

      // Create the chat with the chatId as ID
      const response = await apiFetch<{ success: boolean; data?: Chat; message?: string; error?: string }>("/api/chats", {
        method: "POST",
        body: { 
          agentId: agentId,
          chatId: chatId // Use the chatId from the URL as the chat ID
        },
      });

      logger.info("Chat creation response", { response });

      if (response.success && response.data) {
        chat.value = {
          ...response.data,
          messages: []
        } as ChatWithMessages;
        messages.value = [];

        // Refresh the chat history after creating a new one
        try {
          await fetchChats();
          logger.info("Chat history updated after creating new chat");
        } catch (refreshError) {
          logger.warn("Could not update chat history", { error: refreshError });
        }
      } else {
        const errorMsg = response.error || response.message || "Could not create chat";
        logger.error("Error in chat creation response", { response });
        throw new Error(errorMsg);
      }
    }

    if (!chat.value) {
      throw new Error("No chat available to send the message");
    }

    // Create a local message immediately for better UX
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

    // Add the local message
    messages.value = [...messages.value, userMessage];

    // Send the message to the server
    await sendMessage(content, chat.value.id);

    // If it's the first message of the chat and it has no title, generate one with AI
    if (chat.value && (!chat.value.title || chat.value.title === 'New Chat') && messages.value.length === 1) {
      // The call is made in the background to not block the UI
      apiFetch<{ success: boolean, data?: { title: string } }>(`/api/chats/${chat.value.id}/generate-title`, {
        method: 'POST'
      }).then(response => {
        if (response.success && response.data?.title && chat.value) {
          // Update the title locally in the current chat
          chat.value.title = response.data.title;
          // Refresh the chat list to show the new title
          fetchChats();
        }
      }).catch(err => {
        logger.warn('AI title generation failed, a default title will be used.', { error: err });
      });
    }
  } catch (err) {
    logger.error("Error sending message", err, {
      chatId: chatId,
      messageLength: content.length,
      agentId: agentId
    });
    error.value = "Could not send message. Please try again.";
  } finally {
    typing.value = false;
  }
};

// Retry loading the chat
async function handleRetry() {
  error.value = null;
  await loadChat();
}

// Load the chat when the component is mounted
onMounted(() => {
  loadChat();
});

// Page configuration
const appConfig = useAppConfig();
const title = computed(() => {
  if (isNewChat) return `New Chat - ${appConfig.title}`;
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
          <p class="text-gray-500">Loading chat...</p>
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
            <h2 class="text-xl font-semibold text-gray-700 mb-2">New Chat</h2>
            <p class="text-gray-500">
              Type your first message to start the conversation.
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
          <h2 class="text-xl font-semibold text-gray-700">Select an Agent</h2>
          <p class="text-gray-500 mt-2">
            Click on an agent in the "My Agents" section to start chatting.
          </p>
        </div>
        <!-- Mensaje por defecto cuando no hay chatId válido -->
        <div v-else class="text-center p-8">
          <UIcon
            name="i-heroicons-chat-bubble-left-right"
            class="w-16 h-16 text-gray-300 mx-auto mb-4"
          />
          <h2 class="text-xl font-semibold text-gray-700">Welcome</h2>
          <p class="text-gray-500 mt-2">
            Select a chat to start conversing.
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
              {{ boundaryError.message || "An unexpected error occurred" }}
            </p>

            <div class="space-x-2">
              <UButton
                color="primary"
                variant="soft"
                icon="i-heroicons-arrow-path"
                :loading="isLoading"
                @click="handleRetry"
              >
                Retry
              </UButton>

              <UButton
                color="neutral"
                variant="ghost"
                icon="i-heroicons-arrow-left"
                @click="handleError"
              >
                Back to Home
              </UButton>
            </div>
          </UCard>
        </UContainer>
      </template>
    </NuxtErrorBoundary>
  </div>
</template>

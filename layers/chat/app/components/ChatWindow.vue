<script setup lang="ts">
import type { Message, Chat } from "../../shared/types/types";
import MarkdownRenderer from './MarkdownRenderer.vue';

const props = defineProps<{
  messages: Message[];
  chat: Chat;
  typing: boolean;
  isLoading?: boolean;
  error?: string | null;
  isStreaming?: boolean;
}>();

const emit = defineEmits(["send-message", "retry"]);

const { showScrollButton, scrollToBottom, pinToBottom } = useChatScroll();
const route = useRoute();

// Estado local para el mensaje de error
const localError = ref<string | null>(null);

// Actualizar el error local cuando cambie el prop
watch(
  () => props.error,
  (newError) => {
    localError.value = newError || null;
  }
);

// Manejar el envío de mensajes
function handleSendMessage(message: string) {
  if (message.trim()) {
    localError.value = null;
    emit("send-message", message);
  }
}

// Reintentar la carga si hay un error
function handleRetry() {
  localError.value = null;
  emit("retry");
}

// Configurar el observador de mensajes
watch(() => props.messages, pinToBottom, { deep: true });
</script>

<template>
  <div ref="scrollContainer" class="scroll-container">
    <UContainer class="chat-container">
      <div
        v-if="isLoading"
        class="flex flex-col items-center justify-center h-full p-6"
      >
        <div class="flex flex-col items-center justify-center space-y-4">
          <UIcon
            name="i-heroicons-arrow-path"
            class="w-12 h-12 text-primary-500 animate-spin"
          />
          <p class="text-gray-500 dark:text-gray-400">Cargando chat...</p>
        </div>
      </div>

      <div
        v-else-if="localError"
        class="flex flex-col items-center justify-center h-full p-6 text-center"
      >
        <div class="p-4 max-w-md w-full">
          <div class="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <UIcon
                  name="i-heroicons-exclamation-circle"
                  class="h-5 w-5 text-red-400"
                />
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-red-800 dark:text-red-200">
                  Error al cargar el chat
                </h3>
                <div class="mt-2 text-sm text-red-700 dark:text-red-300">
                  <p>{{ localError }}</p>
                </div>
                <div class="mt-4">
                  <UButton
                    color="error"
                    variant="ghost"
                    size="sm"
                    :loading="isLoading"
                    @click="handleRetry"
                  >
                    <UIcon name="i-heroicons-arrow-path" class="h-4 w-4" />
                    <span>Reintentar</span>
                  </UButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-else-if="!messages?.length"
        class="flex flex-col items-center justify-center h-full p-6 text-center"
      >
        <div class="w-24 h-24 mb-6 text-gray-300 dark:text-gray-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            class="w-full h-full"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <h3 class="mb-2 text-xl font-medium text-gray-900 dark:text-white">
          ¡Bienvenido al chat!
        </h3>
        <p class="max-w-md mb-6 text-gray-500 dark:text-gray-400">
          Escribe un mensaje para comenzar a chatear con el asistente.
        </p>
        <div class="w-full max-w-md">
          <ChatInput :disabled="isLoading" @send-message="handleSendMessage" />
        </div>
      </div>

      <template v-else>
        <div class="chat-header">
          <h1 class="title">
            <TypewriterText :text="chat.title || 'Untitled Chat'" />
          </h1>
        </div>
        <div class="messages-container">
          <div
            v-for="message in messages"
            :key="message.id"
            class="message"
            :class="{
              'message-user': message.role === 'user',
              'message-ai': message.role === 'assistant',
            }"
          >
            <div class="message-content">
              <MarkdownRenderer v-if="message.role === 'assistant'" :content="message.content" />
              <p v-else>{{ message.content }}</p>
            </div>
          </div>

          <span v-if="typing" class="typing-indicator"> &#9611; </span>
        </div>

        <div class="message-form-container">
          <div class="scroll-to-bottom-button-container">
            <UButton
              v-if="showScrollButton"
              color="neutral"
              variant="outline"
              icon="i-heroicons-arrow-down"
              class="rounded-full shadow-sm"
              @click="() => scrollToBottom()"
            />
          </div>
          <ChatInput @send-message="handleSendMessage" />
        </div>
      </template>
    </UContainer>
  </div>

  <!-- Agregar después del componente de mensajes -->
  <div v-if="isStreaming" class="flex items-center space-x-2 px-4 py-2 text-gray-500">
    <div class="animate-pulse flex space-x-1">
      <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
      <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
      <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
    </div>
    <span class="text-sm">IA escribiendo...</span>
  </div>
</template>

<style scoped>
/* ===== Layout & Container Styles ===== */
.scroll-container {
  overflow-y: auto;
  width: 100%;
  box-sizing: border-box;
  flex: 1 1 auto;
  min-height: 0;
}

.chat-container {
  max-width: 800px;
  height: calc(100% - 4rem);
}

/* ===== Header Styles ===== */
.chat-header {
  margin-bottom: 1.5rem;
  padding: 1rem 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--ui-text);
}

/* ===== Messages Container ===== */
.messages-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
  overflow-y: auto;
  padding-bottom: 8rem;
}

/* ===== Message Styles ===== */
.message {
  padding: 1rem;
  border-radius: var(--ui-radius);
  transition: all 0.2s;
}

.message-user {
  background-color: var(--ui-bg-muted);
  border: 1px solid var(--ui-border);
  width: 70%;
  align-self: flex-end;
}

.message-ai {
  width: 100%;
  padding: 1rem 0;
  border: none;
  background: none;
}

.message-content {
  color: var(--ui-text);
  word-wrap: break-word;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}

/* ===== Input Form Styles ===== */
.message-form-container {
  position: fixed;
  bottom: 1.5rem;
  max-width: 800px;
  width: calc(100% - 3rem); /* Account for container padding */
  z-index: 10;
}

.scroll-to-bottom-button-container {
  position: absolute;
  bottom: calc(100% + 1rem);
  left: 0;
  width: 100%;
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.scroll-to-bottom-button-container :deep(button) {
  pointer-events: auto;
}

/* ===== Empty State Styles ===== */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 100%;
}

.empty-state-card {
  background-color: var(--ui-bg-elevated);
  padding: 2rem;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.empty-state-title {
  font-size: 1.25rem;
  font-weight: 500;
  color: var(--ui-text-muted);
  text-align: center;
}

.empty-state-message {
  font-size: 1rem;
  color: var(--ui-text-muted);
}

/* ===== Utility Styles ===== */
/* Hide scrollbar across browsers */
.message-input {
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}

.message-input::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

.typing-indicator {
  display: inline-block;
  animation: pulse 1s infinite;
  margin-left: 0.25rem;
}
</style>

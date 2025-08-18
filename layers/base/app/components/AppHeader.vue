<script setup lang="ts">
// Import necessary composables
import { onMounted, ref } from "vue";
import { useAppConfig } from "#imports";

interface AgentWithCategory {
  id: string;
  name: string;
  // Add other agent properties as needed
}

interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
  message: string;
}

interface PaginatedResponse<T> {
  data: T[];
  page: number;
  total: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

type AgentResponse =
  | PaginatedResponse<AgentWithCategory>
  | ApiResponse<AgentWithCategory[]>;

// Initialize state
const isLoading = ref(false);
const error = ref<string | null>(null);
const agents = ref<AgentWithCategory[]>([]);

// Functions that will be implemented by the chat layer
const fetchAgents = async () => {
  try {
    const response = await $fetch<AgentResponse>("/api/agents");

    // Handle both paginated and non-paginated responses
    if (Array.isArray((response as ApiResponse<AgentWithCategory[]>).data)) {
      // Non-paginated response
      agents.value = (response as ApiResponse<AgentWithCategory[]>).data || [];
    } else if ((response as PaginatedResponse<AgentWithCategory>).data) {
      // Paginated response
      agents.value =
        (response as PaginatedResponse<AgentWithCategory>).data || [];
    } else {
      agents.value = [];
    }
  } catch (err) {
    console.error("Failed to fetch agents:", err);
    error.value = "Failed to load chat agents. Please refresh the page.";
    throw err;
  }
};

const createChatAndNavigate = async (options: {
  agentId: string;
}) => {
  if (!options.agentId) {
    error.value = "No agent selected. Please try again.";
    return;
  }

  try {
    const response = await $fetch<
      ApiResponse<{ id: string }>
    >("/api/chats", {
      method: "POST",
      body: { agentId: options.agentId },
    });

    if (!response.success) {
      throw new Error(response.error || "Failed to create chat");
    }

    const chat = response.data;

    if (chat?.id) {
      await navigateTo(`/chats/${chat.id}`);
    } else {
      throw new Error("Invalid chat response from server");
    }
  } catch (err) {
    console.error("Error creating chat:", err);
    error.value =
      err instanceof Error
        ? err.message
        : "Failed to create chat. Please try again.";
    throw err;
  }
};

// App config and emits
const appConfig = useAppConfig();
const emit = defineEmits(["toggle-sidebar"]);

// Fetch agents when component is mounted
onMounted(async () => {
  try {
    await fetchAgents();
  } catch (err) {
    console.error("Failed to fetch agents:", err);
    error.value = "Failed to load chat agents. Please refresh the page.";
  }
});

async function handleCreateChat() {
  if (isLoading.value) return;

  try {
    isLoading.value = true;
    error.value = null;

    if (!agents.value || agents.value.length === 0) {
      await fetchAgents();
    }

    if (!agents.value || agents.value.length === 0) {
      error.value = "No chat agents available. Please contact support.";
      return;
    }

    // Use the first available agent as default
    await createChatAndNavigate({
      agentId: agents.value[0]?.id || "",
    });
  } catch (err) {
    console.error("Error creating chat:", err);
    error.value = err instanceof Error ? err.message : "Failed to create chat";
  } finally {
    isLoading.value = false;
  }
}

function handleToggleSidebar() {
  emit("toggle-sidebar");
}
</script>

<template>
  <header class="app-header">
    <div class="header-left">
      <UButton
        icon="i-lucide-menu"
        color="primary"
        variant="soft"
        @click="handleToggleSidebar"
      />
      <div class="relative">
<!--        <UButton-->
<!--          icon="i-lucide-plus"-->
<!--          :loading="isLoading"-->
<!--          :disabled="isLoading"-->
<!--          @click="handleCreateChat"-->
<!--        >-->
<!--          New Chat-->
<!--        </UButton>-->

        <Transition
          enter-active-class="transition-opacity duration-200"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
          leave-active-class="transition-opacity duration-200"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div
            v-if="error"
            class="absolute left-0 right-0 mt-2 p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-md border border-red-200 dark:border-red-800"
          >
            {{ error }}
          </div>
        </Transition>
      </div>
    </div>
    <div class="header-title">
      {{ appConfig.title }}
    </div>
    <div class="header-right">
      <ProfileMenu />
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 4rem; /* 16 * 0.25 = 4rem */
  background-color: var(--ui-bg-muted);
  border-bottom: 1px solid var(--ui-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 1rem;
  padding-right: 1rem;
  z-index: 50;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-title {
  font-size: 1.125rem;
  font-weight: 600;
}
</style>

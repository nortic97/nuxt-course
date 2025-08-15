<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";
import type { Chat } from "~~/layers/middleware/server/types/types";
import type {
  CategoryWithUserAgents,
  UserAgentData,
} from "~~/layers/chat/app/composables/useAgentCategories";

const _props = defineProps<{
  isOpen: boolean;
}>();

const route = useRoute();
const { chats, createChat, fetchChats, isLoading: _chatsLoading } = useChats();
const {
  categoriesWithAgents,
  isLoading,
  error,
  totalAgents,
  freeAgents,
  premiumAgents,
  refreshData,
} = useAgentCategories();

// Función para formatear un chat como ítem de navegación
function formatChatItem(chat: Chat): NavigationMenuItem {
  return {
    label: chat.title || "Chat sin título",
    to: `/chats/${chat.id}`,
    active: route.params.id === chat.id,
    icon: "i-heroicons-chat-bubble-left-ellipsis",
  };
}

// Función para formatear un agente como ítem de navegación con sus chats
function formatAgentItem(
  agent: UserAgentData,
  agentChats: Chat[]
): NavigationMenuItem {
  const hasChats = agentChats.length > 0;

  return {
    label: agent.name,
    icon: agent.isFree ? "i-heroicons-star" : "i-heroicons-sparkles",
    badge: hasChats ? agentChats.length.toString() : undefined,
    children: hasChats
      ? [
          ...agentChats.map(formatChatItem),
          {
            label: "Nuevo chat",
            icon: "i-heroicons-plus-circle",
            click: () => handleCreateChat(agent.id),
          },
        ]
      : [
          {
            label: "Iniciar conversación",
            icon: "i-heroicons-plus-circle",
            click: () => handleCreateChat(agent.id),
          },
        ],
  };
}

// Filtrar y agrupar chats por agente
const chatsByAgent = computed(() => {
  const result: Record<string, Chat[]> = {};

  chats.value.forEach((chat) => {
    const agentId = chat.agentId || "general";
    if (!result[agentId]) {
      result[agentId] = [];
    }
    result[agentId].push(chat);
  });

  return result;
});

// Crear ítems de navegación por categorías con agentes y sus chats
const categoryItems = computed<NavigationMenuItem[]>(() => {
  if (!categoriesWithAgents.value.length) return [];

  // Las categorías ya vienen ordenadas desde la API por category.order
  return categoriesWithAgents.value.map(
    (categoryData: CategoryWithUserAgents) => {
      const categoryAgents = categoryData.agents
        .sort((a, b) => a.name.localeCompare(b.name)) // Ordenar agentes alfabéticamente
        .map((agent: UserAgentData) => {
          const agentChats = chatsByAgent.value[agent.id] || [];
          return formatAgentItem(agent, agentChats);
        });

      return {
        label: categoryData.category.name,
        icon: categoryData.category.icon || "i-heroicons-folder",
        badge: categoryData.agents.length.toString(),
        defaultOpen: false,
        children: categoryAgents,
      };
    }
  );
});

// Chats sin agente asignado (para compatibilidad)
const generalChats = computed(() => {
  return (chatsByAgent.value.general || []).map(formatChatItem);
});

// Función para crear un nuevo chat
async function handleCreateChat(agentId?: string) {
  try {
    const chat = await createChat(agentId || "");
    if (chat?.id) {
      await navigateTo(`/chats/${chat.id}`);
    }
  } catch (error) {
    console.error("Error creating chat:", error);
  }
}

// Función para crear chat rápido (sin agente específico)
async function handleQuickChat() {
  try {
    // Usar el primer agente gratuito disponible como fallback
    const freeAgent = freeAgents.value[0];

    if (!freeAgent) {
      // Si no hay agentes gratuitos, usar cualquier agente disponible
      const anyAgent = categoriesWithAgents.value.flatMap(
        (cat) => cat.agents
      )[0];

      await handleCreateChat(anyAgent?.id);
    } else {
      await handleCreateChat(freeAgent.id);
    }
  } catch (error) {
    console.error("Error creating quick chat:", error);
  }
}

// Cargar chats cuando se cargen las categorías
watch(
  categoriesWithAgents,
  () => {
    if (categoriesWithAgents.value.length > 0) {
      fetchChats();
    }
  },
  { immediate: true }
);
</script>

<template>
  <aside
    class="fixed top-16 left-0 bottom-0 w-64 transition-transform duration-300 z-40 bg-(--ui-bg-muted) border-r-(--ui-border) border-r flex flex-col"
    :class="{ '-translate-x-full': !isOpen }"
  >
    <!-- Sección de Categorías y Agentes -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <!-- Estado de carga -->
      <div v-if="isLoading" class="flex justify-center py-8">
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-6 h-6 text-gray-400 animate-spin"
        />
      </div>

      <!-- Error -->
      <div v-else-if="error" class="text-center py-4">
        <UIcon
          name="i-heroicons-exclamation-triangle"
          class="w-8 h-8 text-red-400 mx-auto mb-2"
        />
        <p class="text-sm text-red-500 mb-3">{{ error }}</p>
        <UButton
          size="sm"
          variant="outline"
          color="primary"
          icon="i-heroicons-arrow-path"
          @click="refreshData"
        >
          Reintentar
        </UButton>
      </div>

      <!-- Lista de Categorías con Agentes -->
      <div v-else-if="categoryItems.length > 0" class="space-y-3">
        <div class="flex justify-between items-center">
          <h2
            class="font-semibold text-sm uppercase tracking-wider text-gray-600"
          >
            Mis Agentes
          </h2>
          <div class="flex gap-1">
            <UBadge size="xs" color="primary" v-if="freeAgents.length > 0">
              {{ freeAgents.length }} gratis
            </UBadge>
            <UBadge size="xs" color="primary" v-if="premiumAgents.length > 0">
              {{ premiumAgents.length }} premium
            </UBadge>
          </div>
        </div>

        <UNavigationMenu
          orientation="vertical"
          :items="categoryItems"
          class="w-full"
        />
      </div>

      <!-- Chats generales (fallback para chats sin agente) -->
      <div v-if="generalChats.length > 0" class="space-y-2 mt-6">
        <div class="flex justify-between items-center">
          <h2
            class="font-semibold text-sm uppercase tracking-wider text-gray-600"
          >
            Chats Generales
          </h2>
          <UBadge size="xs" color="primary">{{ generalChats.length }}</UBadge>
        </div>
        <UNavigationMenu
          orientation="vertical"
          :items="generalChats"
          class="w-full"
        />
      </div>

      <!-- Botón para nuevo chat rápido -->
      <div class="pt-4 border-t border-(--ui-border) space-y-2">
        <UButton block icon="i-heroicons-plus" @click="handleQuickChat">
          Chat Rápido
        </UButton>

        <p class="text-xs text-gray-500 text-center">
          {{
            freeAgents.length > 0
              ? `Con ${freeAgents[0]?.name || "agente gratuito"}`
              : "Inicia una conversación rápida"
          }}
        </p>
      </div>

      <!-- Estado vacío -->
      <div
        v-if="!isLoading && !error && categoryItems.length === 0"
        class="text-center py-8"
      >
        <UIcon
          name="i-heroicons-chat-bubble-left-right"
          class="w-12 h-12 text-gray-300 mx-auto mb-4"
        />
        <p class="text-sm text-gray-500 mb-4">No tienes agentes asignados</p>
        <p class="text-xs text-gray-400">
          Contacta al administrador para obtener acceso a agentes
        </p>
      </div>
    </div>

    <!-- Footer del sidebar -->
    <div class="p-4 border-t border-(--ui-border) bg-(--ui-bg-elevated)">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-sparkles" class="w-4 h-4 text-primary-500" />
          <ClientOnly>
            <span class="text-xs font-medium text-gray-600">
              {{ totalAgents }} agentes • {{ chats.length }} chats
            </span>
            <template #fallback>
              <span class="text-xs font-medium text-gray-600">
                {{ totalAgents }} agentes • 0 chats
              </span>
            </template>
          </ClientOnly>
        </div>
        <UButton
          size="xs"
          variant="ghost"
          color="primary"
          icon="i-heroicons-arrow-path"
          :loading="isLoading"
          @click="refreshData"
        />
      </div>
    </div>
  </aside>
</template>

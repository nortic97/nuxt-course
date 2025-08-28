<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";
import type { Chat } from "~~/layers/middleware/server/types/types";
import ChatList from './ChatList.vue';
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

// Estados para controlar la carga
const isDataReady = ref(false);
const isDatesProcessed = ref(false);

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

// Importar el composable de utilidades de fecha
const { 
  getChatDate,
  isToday,
  isYesterday 
} = useDateUtils();

// Computed properties para los grupos de chats
const getTodaysChats = computed(() => {
  if (!isDataReady.value) return [];
  return chats.value.filter(chat => {
    const date = getChatDate(chat);
    return date ? isToday(date) : false;
  });
});

const getYesterdaysChats = computed(() => {
  if (!isDataReady.value) return [];
  return chats.value.filter(chat => {
    const date = getChatDate(chat);
    return date ? isYesterday(date) : false;
  });
});

const getOlderChats = computed(() => {
  if (!isDataReady.value) return [];
  return chats.value.filter(chat => {
    const date = getChatDate(chat);
    return date ? !isToday(date) && !isYesterday(date) : false;
  });
});

// Verificar si ya se procesaron las fechas
const hasProcessedDates = computed(() => {
  return isDataReady.value && chats.value.every(chat => {
    const date = getChatDate(chat);
    return date !== null;
  });
});

// Obtener todos los chats ordenados por fecha (más recientes primero)
const sortedChats = computed(() => {
  return [...chats.value].sort((a, b) => {
    const dateA = getChatDate(a)?.getTime() || 0;
    const dateB = getChatDate(b)?.getTime() || 0;
    return dateB - dateA; // Orden descendente (más recientes primero)
  });
});

// Cookie para rastrear el agente seleccionado
const selectedAgentCookie = useCookie('x-agent-id', {
  default: () => null,
  maxAge: 60 * 60 * 24 * 7 // 7 días
});

// Función para crear un nuevo chat
async function handleCreateChat(agentId?: string) {
  try {
    if (!agentId) return;
    
    // Establecer la cookie del agente seleccionado
    selectedAgentCookie.value = agentId;
    
    // Generar un UUID para el nuevo chat
    const chatId = crypto.randomUUID();
    
    // Navegar a la página del chat con el UUID generado y agentId
    await navigateTo(`/chats/${chatId}?agentId=${agentId}`);
  } catch (error) {
    console.error("Error creating chat:", error);
  }
}

// Función para manejar click en chat del historial
function handleChatClick(chat: any) {
  try {
    // Establecer la cookie del agente seleccionado usando el agentId del chat
    selectedAgentCookie.value = chat.agentId;
    
    // Navegar al chat
    navigateTo(`/chats/${chat.id}?agentId=${chat.agentId}`);
  } catch (error) {
    console.error("Error navigating to chat:", error);
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

// Cargar chats cuando se carguen las categorías
watch(
  categoriesWithAgents,
  async () => {
    if (categoriesWithAgents.value.length > 0) {
      await fetchChats();
      // Pequeño retraso para asegurar que las fechas se procesen
      await new Promise(resolve => setTimeout(resolve, 100));
      isDataReady.value = true;
    }
  },
  { immediate: true }
);
</script>

<template>
  <aside
    class="fixed top-16 left-0 bottom-0 w-64 transition-transform duration-300 z-40 bg-(--ui-bg-muted) border-r-(--ui-border) border-r flex flex-col overflow-hidden"
    :class="{ '-translate-x-full': !isOpen }"
  >
    <!-- Sección de Categorías y Agentes -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4 w-full max-w-full overflow-x-hidden">
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

      <!-- Lista de Agentes -->
      <template v-else-if="!isDataReady">
        <div class="flex justify-center py-8">
          <UIcon
            name="i-heroicons-arrow-path"
            class="w-6 h-6 text-gray-400 animate-spin"
          />
        </div>
      </template>
      <div v-else-if="categoriesWithAgents.length > 0" class="space-y-2">
        <div class="flex justify-between items-center">
          <h2 class="font-semibold text-sm uppercase tracking-wider text-gray-600">
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

        <div class="space-y-1">
          <div 
            v-for="agent in categoriesWithAgents.flatMap(c => c.agents)" 
            :key="agent.id"
            class="p-2 rounded cursor-pointer flex items-center space-x-2 transition-colors"
            :class="{
              'bg-blue-100 dark:bg-blue-900 border border-blue-200 dark:border-blue-700': selectedAgentCookie === agent.id,
              'hover:bg-gray-100 dark:hover:bg-gray-800': selectedAgentCookie !== agent.id
            }"
            @click="handleCreateChat(agent.id)"
          >
            <UIcon 
              :name="agent.isFree ? 'i-heroicons-star' : 'i-heroicons-sparkles'"
              class="w-4 h-4"
              :class="agent.isFree ? 'text-yellow-500' : 'text-purple-500'"
            />
            <span class="text-sm">
              {{ agent.name || 'Agente' }}
            </span>
          </div>
        </div>

        <!-- Historial de Chats -->
        <div class="pt-4 mt-4 border-t border-gray-200 dark:border-gray-800 w-full">
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Historial de Chats
          </h3>
          <div v-if="isDataReady" class="space-y-4">
            <!-- Mostrar carga mientras se procesan las fechas -->
            <div v-if="!hasProcessedDates" class="flex justify-center py-4">
              <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 text-gray-400 animate-spin" />
            </div>
            
            <template v-else>
              <!-- Grupo de chats de hoy -->
              <ChatList
                v-if="getTodaysChats.length > 0"
                :chats="getTodaysChats"
                group-title="Hoy"
                :group-date="getTodaysChats[0]?.createdAt ? new Date(getTodaysChats[0].createdAt) : null"
                :limit="5"
                show-more-text="Ver más chats de hoy"
                @chat-click="handleChatClick"
              />

              <!-- Grupo de chats de ayer -->
              <ChatList
                v-if="getYesterdaysChats.length > 0"
                :chats="getYesterdaysChats"
                group-title="Ayer"
                :group-date="getYesterdaysChats[0]?.createdAt ? new Date(getYesterdaysChats[0].createdAt) : null"
                :limit="5"
                show-more-text="Ver más chats de ayer"
                @chat-click="handleChatClick"
              />

              <!-- Grupo de chats anteriores -->
              <ChatList
                v-if="getOlderChats.length > 0"
                :chats="getOlderChats"
                group-title="Anteriores"
                :group-date="getOlderChats[0]?.createdAt ? new Date(getOlderChats[0].createdAt) : null"
                :limit="5"
                show-more-text="Ver más chats antiguos"
                @chat-click="handleChatClick"
              />

              <!-- Mensaje cuando no hay chats -->
              <div v-if="chats.length === 0" class="px-2 py-4 text-center">
                <p class="text-sm text-gray-500">No hay chats recientes</p>
              </div>
            </template>
          </div>
        </div>
      </div>

<!--   aca el histoiral de chat   -->

      <!-- Botón para nuevo chat rápido -->
<!--      <div class="pt-4 border-t border-(&#45;&#45;ui-border) space-y-2">-->
<!--        <UButton block icon="i-heroicons-plus" @click="handleQuickChat">-->
<!--          Chat Rápido-->
<!--        </UButton>-->

<!--        <p class="text-xs text-gray-500 text-center">-->
<!--          {{-->
<!--            freeAgents.length > 0-->
<!--              ? `Con ${freeAgents[0]?.name || "agente gratuito"}`-->
<!--              : "Inicia una conversación rápida"-->
<!--          }}-->
<!--        </p>-->
<!--      </div>-->

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
<!--        <UButton-->
<!--          size="xs"-->
<!--          variant="ghost"-->
<!--          color="primary"-->
<!--          icon="i-heroicons-arrow-path"-->
<!--          :loading="isLoading"-->
<!--          @click="refreshData"-->
<!--        />-->
      </div>
    </div>
  </aside>
</template>

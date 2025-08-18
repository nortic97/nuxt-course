<script setup lang="ts">
import type { Chat } from '~~/layers/middleware/server/types/types';

const props = defineProps<{
  chats: Chat[]
  groupTitle: string
  groupDate: Date | null
  limit?: number
  showMoreText?: string
}>();

const emit = defineEmits<{
  'chat-click': [chat: Chat]
}>();

const showAll = ref(false);
const displayChats = computed(() => {
  return props.limit && !showAll.value 
    ? props.chats.slice(0, props.limit) 
    : props.chats;
});

const hasMore = computed(() => props.limit && props.chats.length > props.limit && !showAll.value);

const formatDate = (date: Date | null): string => {
  if (!date) return '';
  return date.toLocaleDateString('es-ES', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};
</script>

<template>
  <div v-if="chats.length > 0" class="space-y-1">
    <p 
      class="text-xs text-gray-500 font-medium px-2 text-left w-full group relative"
      :title="formatDate(groupDate)"
      aria-label="{{ groupTitle }} - {{ formatDate(groupDate) }}"
    >
      {{ groupTitle }}
      <span 
        v-if="groupDate"
        class="opacity-0 group-hover:opacity-100 transition-opacity absolute left-full ml-2 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded whitespace-nowrap"
      >
        {{ formatDate(groupDate) }}
      </span>
    </p>
    
    <div class="space-y-1">
      <div 
        v-for="chat in displayChats" 
        :key="chat.id"
        class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer flex items-center space-x-2 w-full overflow-hidden"
        @click="emit('chat-click', chat)"
        :aria-label="`Ir al chat: ${chat.title || 'Nuevo chat'}`"
      >
        <UIcon name="i-heroicons-chat-bubble-left" class="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span class="text-sm truncate w-full">{{ chat.title || 'Nuevo chat' }}</span>
      </div>
    </div>

    <UButton
      v-if="hasMore"
      variant="ghost"
      size="xs"
      color="gray"
      class="w-full text-xs justify-center"
      @click="showAll = true"
      :aria-label="`Mostrar ${chats.length - (limit || 0)} chats más`"
    >
      {{ showMoreText || `Mostrar ${chats.length - (limit || 0)} más` }}
    </UButton>
  </div>
  
  <div v-else class="px-2 py-1 w-full">
    <p class="text-xs text-gray-400 text-center w-full">No hay chats en esta categoría</p>
  </div>
</template>

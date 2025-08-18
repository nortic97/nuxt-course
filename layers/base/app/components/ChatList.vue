<script setup lang="ts">
import type { Chat } from '~~/layers/middleware/server/types/types';

const { deleteChat, updateChat } = useChats()

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

const editingChatId = ref<string | null>(null);
const newTitle = ref('');

const handleEdit = (chat: Chat) => {
  editingChatId.value = chat.id;
  newTitle.value = chat.title || '';
};

const cancelEdit = () => {
  editingChatId.value = null;
  newTitle.value = '';
};

const saveTitle = async (chatId: string) => {
  if (newTitle.value.trim()) {
    await updateChat(chatId, { title: newTitle.value });
    cancelEdit();
  }
};

const handleDelete = async (chatId: string) => {
  if (confirm('¿Estás seguro de que quieres eliminar este chat? Esta acción no se puede deshacer.')) {
    await deleteChat(chatId);
  }
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
        class="group p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer flex items-center justify-between space-x-2 w-full overflow-hidden"
      >
        <div class="flex items-center space-x-2 truncate w-full" @click="!editingChatId && emit('chat-click', chat)">
          <UIcon name="i-heroicons-chat-bubble-left" class="w-4 h-4 text-gray-400 flex-shrink-0" />
          <template v-if="editingChatId === chat.id">
            <UInput 
              v-model="newTitle" 
              autofocus 
              size="2xs" 
              class="flex-grow" 
              @keydown.enter="saveTitle(chat.id)" 
              @keydown.esc="cancelEdit"
            />
          </template>
          <template v-else>
            <span class="text-sm truncate w-full">{{ chat.title || 'Nuevo chat' }}</span>
          </template>
        </div>
        <div class="flex items-center">
          <template v-if="editingChatId === chat.id">
            <UButton icon="i-heroicons-check" size="2xs" variant="ghost" @click="saveTitle(chat.id)" />
            <UButton icon="i-heroicons-x-mark" size="2xs" variant="ghost" @click="cancelEdit" />
          </template>
          <template v-else>
            <UButton
              icon="i-heroicons-pencil-square"
              size="2xs"
              variant="ghost"
              class="opacity-0 group-hover:opacity-100 transition-opacity"
              @click.stop="handleEdit(chat)"
              aria-label="Editar título"
            />
            <UButton
              icon="i-heroicons-trash"
              size="2xs"
              color="red"
              variant="ghost"
              class="opacity-0 group-hover:opacity-100 transition-opacity"
              @click.stop="handleDelete(chat.id)"
              aria-label="Eliminar chat"
            />
          </template>
        </div>
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

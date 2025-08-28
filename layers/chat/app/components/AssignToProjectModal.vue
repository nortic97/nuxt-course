<script setup lang="ts">
const props = defineProps<{
  chatId: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { agents } = useAgents();
const { updateChat } = useChats();

async function handleAssignToAgent(agentId: string) {
  try {
    await updateChat(props.chatId, { agentId });
    await navigateTo(`/chats/${props.chatId}`);
    emit('close');
  } catch (error) {
    console.error("Failed to assign chat to agent:", error);
  }
}
</script>

<template>
  <UModal
    open
    title="Asignar a un Agente"
    description="Selecciona un agente para asignar este chat."
    @update:open="emit('close')"
  >
    <template #body>
      <div class="space-y-2">
        <!-- Agent list -->
        <div
          v-for="agent in agents"
          :key="agent.id"
          class="flex items-center space-x-3 p-3 border border-[var(--ui-border)] rounded-lg hover:bg-[var(--ui-bg-elevated)] cursor-pointer"
          @click="handleAssignToAgent(agent.id)"
        >
          <UIcon
            name="i-heroicons-user-circle"
            class="text-[var(--ui-text-dimmed)]"
          />
          <div class="flex-1">
            <div class="font-medium text-[var(--ui-text)]">
              {{ agent.name }}
            </div>
            <div class="text-xs text-[var(--ui-text-muted)]">
              {{ agent.description || 'Sin descripción' }}
            </div>
          </div>
        </div>

        <div v-if="!agents?.length" class="text-center py-8">
          <UIcon
            name="i-heroicons-user-plus"
            class="mx-auto h-12 w-12 text-[var(--ui-text-dimmed)]"
          />
          <h3 class="mt-2 text-sm font-medium text-[var(--ui-text)]">
            No hay agentes disponibles
          </h3>
          <p class="mt-1 text-sm text-[var(--ui-text-muted)]">
            Necesitas tener al menos un agente para asignar chats.
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end space-x-2">
        <UButton 
          color="neutral" 
          variant="soft" 
          @click="emit('close')"
        >
          Cancelar
        </UButton>
        <UButton 
          v-if="agents?.length"
          color="primary" 
          variant="solid"
          @click="handleAssignToAgent('')"
        >
          Quitar asignación
        </UButton>
      </div>
    </template>
  </UModal>
</template>

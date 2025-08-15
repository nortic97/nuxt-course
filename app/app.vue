<script setup lang="ts">
const { fetchChats, prefetchChatMessages } = useChats();
const { fetchAgents } = useAgents();
const { fetchUserAgentCategories } = useAgentCategories();
await Promise.all([fetchChats(), fetchAgents(), fetchUserAgentCategories()]);
await callOnce(prefetchChatMessages);
</script>

<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
import { v4 as uuidv4 } from "uuid";
definePageMeta({
  layout: false,
});

const appConfig = useAppConfig();
useHead({
  title: `Login - ${appConfig.title}`,
});

const { isAuthenticated } = useAuth();
if (isAuthenticated.value) {
  await navigateTo(`/chats/${uuidv4()}`, { replace: true });
}

const isLoading = ref({
  github: false,
  google: false,
});

async function handleGitHubLogin() {
  isLoading.value.github = true;
  await navigateTo("/auth/github", { external: true });
}

async function handleGoogleLogin() {
  isLoading.value.google = true;
  await navigateTo("/auth/google", { external: true });
}
</script>

<template>
  <div class="login-container">
    <UCard class="login-card">
      <template #header>
        <div class="text-center">
          <h1 class="text-2xl font-bold">Welcome to {{ appConfig.title }}</h1>
          <p class="text-gray-500 mt-2">Sign in to continue to your chats</p>
        </div>
      </template>

      <div class="login-content space-y-3">
        <UButton
          color="neutral"
          variant="outline"
          size="lg"
          :icon="
            isLoading.github
              ? 'i-heroicons-arrow-path'
              : 'i-simple-icons-github'
          "
          block
          :loading="isLoading.github"
          :disabled="isLoading.github || isLoading.google"
          @click="handleGitHubLogin"
        >
          {{ isLoading.github ? "Signing you in..." : "Continue with GitHub" }}
        </UButton>

        <UButton
          color="neutral"
          variant="outline"
          size="lg"
          :icon="
            isLoading.google
              ? 'i-heroicons-arrow-path'
              : 'i-simple-icons-google'
          "
          block
          :loading="isLoading.google"
          :disabled="isLoading.google || isLoading.github"
          @click="handleGoogleLogin"
        >
          {{ isLoading.google ? "Signing you in..." : "Continue with Google" }}
        </UButton>
      </div>
    </UCard>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 1rem;
  background: var(--ui-bg-base);
}

.login-card {
  width: 100%;
  max-width: 400px;
}

.login-content {
  padding: 1rem 0;
}
</style>

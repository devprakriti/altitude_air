<script setup lang="ts">
import { VueQueryDevtools } from "@tanstack/vue-query-devtools";

const authStore = useAuthStore();
const isInitializing = ref(true);
const hasError = ref(false);

// Watch for auth initialization to complete
watchEffect(() => {
  if (!authStore.isLoading) {
    // Small delay to prevent flash
    setTimeout(() => {
      isInitializing.value = false;
    }, 100);
  }
});

// Watch for auth errors
watchEffect(() => {
  if (authStore.error) {
    hasError.value = true;
    isInitializing.value = false;
  }
});

const handleError = (error: any) => {
  console.error("App initialization error:", error);
  hasError.value = true;
  isInitializing.value = false;
};

const clearError = () => {
  hasError.value = false;
  authStore.setError(null);
  // Retry auth initialization
  isInitializing.value = true;
  authStore.initializeAuth();
};

const reloadPage = () => {
  if (process.client) {
    window.location.reload();
  }
};
</script>

<template>
  <NuxtLoadingIndicator />
  <UApp>
    <NuxtErrorBoundary @error="handleError">
      <!-- Show loader during initial auth check -->
      <div
        v-if="isInitializing"
        class="fixed inset-0 z-50 flex items-center justify-center bg-background"
      >
        <div class="flex flex-col items-center space-y-4">
          <UIcon
            name="i-lucide-loader-2"
            class="animate-spin text-4xl text-primary"
          />
          <p class="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>

      <!-- Show error state if auth initialization fails -->
      <div
        v-else-if="hasError"
        class="fixed inset-0 z-50 flex items-center justify-center bg-background"
      >
        <div class="flex flex-col items-center space-y-4 max-w-md text-center">
          <UIcon
            name="i-lucide-alert-circle"
            class="text-4xl text-destructive"
          />
          <h2 class="text-lg font-semibold">Failed to Load</h2>
          <p class="text-sm text-muted-foreground">
            {{
              authStore.error ||
              "An error occurred while initializing the application."
            }}
          </p>
          <UButton @click="clearError" variant="outline">
            <UIcon name="i-lucide-refresh-cw" class="mr-2" />
            Try Again
          </UButton>
        </div>
      </div>

      <!-- Main app content -->
      <NuxtLayout v-else>
        <NuxtPage />
      </NuxtLayout>

      <template #error="{ error, clearError: clearBoundaryError }">
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-background"
        >
          <div
            class="flex flex-col items-center space-y-4 max-w-md text-center"
          >
            <UIcon
              name="i-lucide-alert-triangle"
              class="text-4xl text-destructive"
            />
            <h2 class="text-lg font-semibold">Something went wrong</h2>
            <p class="text-sm text-muted-foreground">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <div class="flex gap-2">
              <UButton @click="clearBoundaryError" variant="outline">
                <UIcon name="i-lucide-refresh-cw" class="mr-2" />
                Retry
              </UButton>
              <UButton @click="reloadPage" variant="solid">
                <UIcon name="i-lucide-rotate-cw" class="mr-2" />
                Reload Page
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </NuxtErrorBoundary>
  </UApp>
  <VueQueryDevtools />
</template>

<script setup lang="ts">
import SignInForm from "~/components/SignInForm.vue";

definePageMeta({
  layout: "auth",
});

const authStore = useAuthStore();

watchEffect(() => {
  if (!authStore.isLoading && authStore.isAuthenticated) {
    navigateTo("/", { replace: true });
  }
});
</script>

<template>
  <Loader v-if="authStore.isLoading" />
  <div v-else-if="!authStore.isAuthenticated">
    <SignInForm />
  </div>
</template>

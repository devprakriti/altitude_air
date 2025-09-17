<script setup lang="ts">
const { $authClient } = useNuxtApp();

definePageMeta({
  middleware: ["auth"],
});

const session = $authClient.useSession();
</script>

<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">Dashboard</h1>
    <div v-if="session?.data?.user">
      <p class="mb-2">Welcome {{ session.data.user.name }}</p>
    </div>
  </div>
</template>

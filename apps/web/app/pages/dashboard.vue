<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

const { user, isAuthenticated } = useAuth();
</script>

<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">Dashboard</h1>
    <div v-if="user?.email">
      <p class="mb-2">Welcome {{ user.name }}</p>
    </div>
  </div>
</template>

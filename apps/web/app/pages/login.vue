<script setup lang="ts">
import SignInForm from "~/components/SignInForm.vue";
import SignUpForm from "~/components/SignUpForm.vue";

definePageMeta({
  layout: "auth",
});

const { isAuthenticated, isLoading } = useAuth();
const showSignIn = ref(true);

watchEffect(() => {
  if (!isLoading.value && isAuthenticated.value) {
    navigateTo("/dashboard", { replace: true });
  }
});
</script>

<template>
  <Loader v-if="isLoading" />
  <div v-else-if="!isAuthenticated">
    <SignInForm v-if="showSignIn" @switch-to-sign-up="showSignIn = false" />
    <SignUpForm v-else @switch-to-sign-in="showSignIn = true" />
  </div>
</template>

<script setup lang="ts">
import z from "zod";
import type { FormSubmitEvent } from "#ui/types";

const emit = defineEmits(["switchToSignIn"]);
const { signUp } = useAuth();

const toast = useToast();
const loading = ref(false);

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type Schema = z.output<typeof schema>;

const state = reactive({
  name: "",
  email: "",
  password: "",
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true;
  try {
    const result = await signUp(
      event.data.name,
      event.data.email,
      event.data.password
    );

    if (result.error) {
      toast.add({ title: "Sign up failed", description: result.error.message });
    } else {
      toast.add({ title: "Sign up successful" });
      await navigateTo("/dashboard", { replace: true });
    }
  } catch (error: any) {
    toast.add({
      title: "An unexpected error occurred",
      description: error.message || "Please try again.",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="mx-auto w-full mt-10 max-w-md p-6">
    <h1 class="mb-6 text-center text-3xl font-bold">Create Account</h1>

    <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField label="Name" name="name">
        <UInput v-model="state.name" class="w-full" />
      </UFormField>

      <UFormField label="Email" name="email">
        <UInput v-model="state.email" type="email" class="w-full" />
      </UFormField>

      <UFormField label="Password" name="password">
        <UInput v-model="state.password" type="password" class="w-full" />
      </UFormField>

      <UButton type="submit" block :loading="loading"> Sign Up </UButton>
    </UForm>

    <div class="mt-4 text-center">
      <UButton
        variant="link"
        @click="$emit('switchToSignIn')"
        class="text-primary hover:text-primary-dark"
      >
        Already have an account? Sign In
      </UButton>
    </div>
  </div>
</template>

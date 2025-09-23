<script setup lang="ts">
import z from "zod";
import type { FormSubmitEvent } from "#ui/types";

const emit = defineEmits<{
  close: [success: boolean];
}>();

const usersStore = useUsersStore();
const toast = useToast();
const loading = computed(() => usersStore.isLoading);

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["user", "admin"]),
});

type Schema = z.output<typeof schema>;

const state = reactive({
  name: "",
  email: "",
  password: "",
  role: "user" as "user" | "admin",
});

const roleOptions = [
  { label: "User", value: "user" },
  { label: "Admin", value: "admin" },
];

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const result = await usersStore.createUser(event.data);

  if (!result.success && result.error) {
    toast.add({
      title: "Failed to create user",
      description: result.error.message,
    });
    emit("close", false);
  } else {
    toast.add({ title: "User created successfully" });
    emit("close", true);
  }
}

function closeModal() {
  emit("close", false);
}
</script>

<template>
  <UModal title="Create New User">
    <template #body>
      <UForm
        id="create-user-form"
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Name" name="name">
          <UInput v-model="state.name" placeholder="Enter full name" />
        </UFormField>

        <UFormField label="Email" name="email">
          <UInput
            v-model="state.email"
            type="email"
            placeholder="Enter email address"
          />
        </UFormField>

        <UFormField label="Password" name="password">
          <UInput
            v-model="state.password"
            type="password"
            placeholder="Enter password"
          />
        </UFormField>

        <UFormField label="Role" name="role">
          <USelect
            v-model="state.role"
            :options="roleOptions"
            placeholder="Select role"
          />
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton color="neutral" variant="ghost" @click="closeModal">
          Cancel
        </UButton>
        <UButton type="submit" :loading="loading" form="create-user-form">
          Create User
        </UButton>
      </div>
    </template>
  </UModal>
</template>

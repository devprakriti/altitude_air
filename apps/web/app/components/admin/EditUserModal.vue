<script setup lang="ts">
import z from "zod";
import type { FormSubmitEvent } from "#ui/types";
import type { User } from "~/stores/auth";

const props = defineProps<{
  user: User;
}>();

const emit = defineEmits<{
  close: [success: boolean];
}>();

const usersStore = useUsersStore();
const toast = useToast();
const loading = computed(() => usersStore.isLoading);

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["user", "admin"]),
});

type Schema = z.output<typeof schema>;

const state = reactive({
  name: props.user?.name || "",
  email: props.user?.email || "",
  role: props.user?.role || "user",
});

const roleOptions = [
  { label: "User", value: "user" },
  { label: "Admin", value: "admin" },
];

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.user?.id) return;

  const result = await usersStore.updateUserData(props.user.id, event.data);

  if (!result.success && result.error) {
    toast.add({
      title: "Failed to update user",
      description: result.error.message,
    });
    emit("close", false);
  } else {
    toast.add({ title: "User updated successfully" });
    emit("close", true);
  }
}

function closeModal() {
  emit("close", false);
}
</script>

<template>
  <UModal title="Edit User">
    <template #body>
      <UForm
        id="edit-user-form"
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
        <UButton type="submit" :loading="loading" form="edit-user-form">
          Update User
        </UButton>
      </div>
    </template>
  </UModal>
</template>

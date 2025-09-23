<script setup lang="ts">
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

async function handleDelete() {
  if (!props.user?.id) return;

  const result = await usersStore.deleteUser(props.user.id);

  if (!result.success && result.error) {
    toast.add({
      title: "Failed to delete user",
      description: result.error.message,
    });
    emit("close", false);
  } else {
    toast.add({ title: "User deleted successfully" });
    emit("close", true);
  }
}

function closeModal() {
  emit("close", false);
}
</script>

<template>
  <UModal title="Delete User">
    <template #body>
      <div class="space-y-4">
        <div class="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
          <UIcon name="i-lucide-alert-triangle" class="text-red-600" />
          <div>
            <p class="font-medium text-red-800">
              Are you sure you want to delete this user?
            </p>
            <p class="text-sm text-red-600">This action cannot be undone.</p>
          </div>
        </div>

        <div class="p-4 bg-gray-50 rounded-lg">
          <h4 class="font-medium text-gray-900">
            {{ props.user?.name || "Unknown User" }}
          </h4>
          <p class="text-sm text-gray-600">
            {{ props.user?.email || "No email" }}
          </p>
          <p class="text-sm text-gray-500 capitalize">
            {{ props.user?.role || "user" }}
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton color="neutral" variant="ghost" @click="closeModal">
          Cancel
        </UButton>
        <UButton color="error" :loading="loading" @click="handleDelete">
          Delete User
        </UButton>
      </div>
    </template>
  </UModal>
</template>

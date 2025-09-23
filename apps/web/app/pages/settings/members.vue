<script setup lang="ts">
import CreateUserModal from "~/components/admin/CreateUserModal.vue";
import EditUserModal from "~/components/admin/EditUserModal.vue";
import DeleteUserModal from "~/components/admin/DeleteUserModal.vue";
import type { User } from "~/stores/auth";

definePageMeta({
  middleware: ["auth"],
});

const { user: currentUser, isAdmin } = useAuth();
const usersStore = useUsersStore();
const toast = useToast();
const overlay = useOverlay();

// Use store state
const users = computed(() => usersStore.users);
const loading = computed(() => usersStore.isLoading);
const searchQuery = computed({
  get: () => usersStore.searchQuery,
  set: (value: string) => usersStore.setSearchQuery(value),
});
const filteredUsers = computed(() => usersStore.filteredUsers);

// Create modal instances
const createModal = overlay.create(CreateUserModal);
const editModal = overlay.create(EditUserModal);
const deleteModal = overlay.create(DeleteUserModal);

async function fetchUsers() {
  const result = await usersStore.fetchUsers();

  if (!result.success && result.error) {
    toast.add({
      title: "Failed to fetch users",
      description: result.error.message,
    });
  }
}

async function openCreateModal() {
  const instance = createModal.open();
  const result = await instance.result;

  if (result) {
    // User was created successfully, no need to refetch as store is updated
  }
}

async function openEditModal(user: User) {
  const instance = editModal.open({ user });
  const result = await instance.result;

  if (result) {
    // User was updated successfully, no need to refetch as store is updated
  }
}

async function openDeleteModal(user: User) {
  const instance = deleteModal.open({ user });
  const result = await instance.result;

  if (result) {
    // User was deleted successfully, no need to refetch as store is updated
  }
}

onMounted(() => {
  fetchUsers();
});
</script>

<template>
  <div>
    <UPageCard
      title="Members"
      description="Manage users and their roles in the system."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        v-if="isAdmin"
        label="Create User"
        icon="i-lucide-plus"
        color="primary"
        class="w-fit lg:ms-auto"
        @click="openCreateModal"
      />
    </UPageCard>

    <UPageCard
      variant="subtle"
      :ui="{
        container: 'p-0 sm:p-0 gap-y-0',
        wrapper: 'items-stretch',
        header: 'p-4 mb-0 border-b border-default',
      }"
    >
      <template #header>
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          placeholder="Search users..."
          autofocus
          class="w-full"
        />
      </template>

      <div v-if="loading" class="flex justify-center py-8">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-2xl" />
      </div>

      <div v-else-if="filteredUsers.length === 0" class="text-center py-8">
        <UIcon
          name="i-lucide-users"
          class="text-4xl text-gray-400 mx-auto mb-4"
        />
        <p class="text-gray-600">No users found</p>
      </div>

      <div v-else class="divide-y divide-default">
        <div
          v-for="user in filteredUsers"
          :key="user.id"
          class="flex items-center justify-between gap-3 py-3 px-4 sm:px-6"
        >
          <div class="flex items-center gap-3 min-w-0">
            <UAvatar
              :src="
                user.image ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`
              "
              :alt="user.name"
              size="md"
            />

            <div class="text-sm min-w-0">
              <p class="text-highlighted font-medium truncate">
                {{ user.name }}
                <span
                  v-if="user.id === currentUser?.id"
                  class="text-xs text-blue-600"
                  >(You)</span
                >
              </p>
              <p class="text-muted truncate">
                {{ user.email }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <UBadge
              :color="user.role === 'admin' ? 'error' : 'primary'"
              variant="soft"
            >
              {{ user.role }}
            </UBadge>

            <div v-if="isAdmin" class="flex items-center gap-2">
              <UButton
                size="sm"
                variant="ghost"
                icon="i-lucide-edit"
                @click="openEditModal(user)"
                :disabled="user.id === currentUser?.id"
              />
              <UButton
                size="sm"
                variant="ghost"
                color="error"
                icon="i-lucide-trash-2"
                @click="openDeleteModal(user)"
                :disabled="user.id === currentUser?.id"
              />
            </div>
          </div>
        </div>
      </div>
    </UPageCard>
  </div>
</template>

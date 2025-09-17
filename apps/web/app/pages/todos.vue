<script setup lang="ts">
import { ref } from "vue";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

const { $eden } = useNuxtApp();
const newTodoText = ref("");
const queryClient = useQueryClient();

const todos = useQuery({
  queryKey: ["todos"],
  queryFn: async () => {
    const { data, error } = await $eden.todos.get();
    if (error) throw error;
    return data;
  },
});

const createMutation = useMutation({
  mutationFn: async (todoData: { text: string }) => {
    const { data, error } = await $eden.todos.post(todoData);
    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["todos"] });
    newTodoText.value = "";
  },
});

const toggleMutation = useMutation({
  mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
    const { data, error } = await $eden.todos({ id }).toggle.put({ completed });
    if (error) throw error;
    return data;
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["todos"] }),
});

const deleteMutation = useMutation({
  mutationFn: async (id: number) => {
    const { data, error } = await $eden.todos({ id }).delete();
    if (error) throw error;
    return data;
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["todos"] }),
});

function handleAddTodo() {
  if (newTodoText.value.trim()) {
    createMutation.mutate({ text: newTodoText.value });
  }
}

function handleToggleTodo(id: number, completed: boolean) {
  toggleMutation.mutate({ id, completed: !completed });
}

function handleDeleteTodo(id: number) {
  deleteMutation.mutate(id);
}
</script>

<template>
  <div class="mx-auto w-full max-w-md py-10">
    <UCard>
      <template #header>
        <div>
          <div class="text-xl font-bold">Todo List</div>
          <div class="text-muted text-sm">Manage your tasks efficiently</div>
        </div>
      </template>
      <form
        @submit.prevent="handleAddTodo"
        class="mb-6 flex items-center gap-2"
      >
        <UInput
          v-model="newTodoText"
          placeholder="Add a new task..."
          autocomplete="off"
          class="w-full"
        />
        <UButton type="submit"> Add </UButton>
      </form>

      <div
        v-if="todos.status.value === 'pending'"
        class="flex justify-center py-4"
      >
        <UIcon name="i-lucide-loader-2" class="animate-spin w-6 h-6" />
      </div>
      <p
        v-else-if="todos.status.value === 'error'"
        class="py-4 text-center text-red-500"
      >
        Error: {{ todos.error.value?.message || "Failed to load todos" }}
      </p>
      <p v-else-if="todos.data.value?.length === 0" class="py-4 text-center">
        No todos yet. Add one above!
      </p>
      <ul v-else class="space-y-2">
        <li
          v-for="todo in todos.data.value"
          :key="todo.id"
          class="flex items-center justify-between rounded-md border p-2"
        >
          <div class="flex items-center gap-2">
            <UCheckbox
              :model-value="todo.completed"
              @update:model-value="
                () => handleToggleTodo(todo.id, todo.completed)
              "
              :id="`todo-${todo.id}`"
            />
            <label
              :for="`todo-${todo.id}`"
              :class="{ 'line-through text-muted': todo.completed }"
              class="cursor-pointer"
            >
              {{ todo.text }}
            </label>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            square
            @click="handleDeleteTodo(todo.id)"
            aria-label="Delete todo"
            icon="i-lucide-trash-2"
          />
        </li>
      </ul>
    </UCard>
  </div>
</template>

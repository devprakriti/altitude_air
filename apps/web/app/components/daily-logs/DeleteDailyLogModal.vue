<script setup lang="ts">
import type { DailyLog } from "~/composables/useDailyLogs";

const emit = defineEmits<{
  close: [success: boolean];
}>();

const { deleteLog } = useDailyLogs();
const toast = useToast();
const isLoading = ref(false);

const props = defineProps<{
  log: DailyLog;
}>();

async function handleDelete() {
  isLoading.value = true;

  try {
    const success = await deleteLog(props.log.id);
    if (success) {
      emit("close", true);
    } else {
      emit("close", false);
    }
  } catch (error) {
    emit("close", false);
  } finally {
    isLoading.value = false;
  }
}

function closeModal() {
  emit("close", false);
}
</script>

<template>
  <UModal title="Delete Daily Log">
    <template #body>
      <div class="space-y-4">
        <p class="text-gray-600">
          Are you sure you want to delete this daily log entry? This action
          cannot be undone.
        </p>

        <div class="bg-gray-50 p-4 rounded-lg">
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="font-medium">Date:</span>
              {{ new Date(log.recordDate).toLocaleDateString() }}
            </div>
            <div>
              <span class="font-medium">TLP No:</span>
              {{ log.tlpNo }}
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton @click="closeModal" variant="outline" :disabled="isLoading">
          Cancel
        </UButton>
        <UButton @click="handleDelete" color="red" :loading="isLoading">
          Delete
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { TechnicalLibraryFile } from "~/composables/useTechnicalLibrary";

const emit = defineEmits<{
  close: [success: boolean];
}>();

const { deleteFile } = useTechnicalLibrary();
const isLoading = ref(false);

const props = defineProps<{
  file: TechnicalLibraryFile;
}>();

async function handleDelete() {
  isLoading.value = true;

  try {
    const success = await deleteFile(props.file.id);
    if (success) {
      emit("close", true);
    } else {
      emit("close", false);
    }
  } catch (_error) {
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
  <UModal title="Delete Document">
    <template #body>
      <div class="space-y-4">
        <p class="text-gray-600">
          Are you sure you want to delete this document? This action cannot be
          undone.
        </p>

        <div class="bg-gray-50 p-4 rounded-lg">
          <div class="space-y-2 text-sm">
            <div>
              <span class="font-medium">Filename:</span>
              {{ file.originalFilename }}
            </div>
            <div>
              <span class="font-medium">Category:</span>
              {{
                file.category
                  .replace("-", " ")
                  .replace(/\b\w/g, (l: string) => l.toUpperCase())
              }}
            </div>
            <div>
              <span class="font-medium">Size:</span>
              {{
                file.fileSize < 1024 * 1024
                  ? `${(file.fileSize / 1024).toFixed(1)} KB`
                  : `${(file.fileSize / (1024 * 1024)).toFixed(1)} MB`
              }}
            </div>
            <div v-if="file.remarks">
              <span class="font-medium">Remarks:</span>
              {{ file.remarks }}
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
        <UButton
          @click="handleDelete"
          color="error"
          variant="solid"
          :loading="isLoading"
        >
          Delete Document
        </UButton>
      </div>
    </template>
  </UModal>
</template>

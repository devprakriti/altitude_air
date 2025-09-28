<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import { z } from "zod";

type Props = {
  category: string;
};

type Emits = (e: "close", success: boolean) => void;

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { uploadFile } = useTechnicalLibrary();
const toast = useToast();

// Reactive state
const isLoading = ref(false);
const uploadProgress = ref(0);
const isDragging = ref(false);

// File validation constants
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/csv",
];

// File validation constants (for backwards compatibility)
const ALLOWED_TYPES = ACCEPTED_FILE_TYPES;

// Zod schema for validation
const schema = z.object({
  file: z
    .instanceof(File, {
      message: "Please select a file.",
    })
    .refine((file) => file.size <= MAX_FILE_SIZE, {
      message: `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
    })
    .refine((file) => ACCEPTED_FILE_TYPES.includes(file.type), {
      message:
        "File type not supported. Please upload PDF, DOC, DOCX, TXT, XLS, XLSX, PPT, PPTX, images, or CSV files.",
    }),
  filename: z.string().min(1, "Filename is required."),
  category: z.string().min(1, "Category is required."),
  remarks: z
    .string()
    .max(500, "Remarks must be less than 500 characters")
    .optional(),
});

const filePreview = ref<string | null>(null);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  file: undefined,
  filename: "",
  category: props.category,
  remarks: "",
});

// Computed properties
const selectedFile = computed(() => state.file);

const fileSizeFormatted = computed(() => {
  if (!selectedFile.value) return "";
  const size = selectedFile.value.size;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
});

const fileTypeIcon = computed(() => {
  if (!selectedFile.value) return "i-lucide-file-text";

  const type = selectedFile.value.type;
  if (type.startsWith("image/")) return "i-lucide-image";
  if (type === "application/pdf") return "i-lucide-file-text";
  if (type.includes("word")) return "i-lucide-file-text";
  if (type.includes("excel") || type.includes("spreadsheet"))
    return "i-lucide-file-spreadsheet";
  if (type.includes("presentation")) return "i-lucide-presentation";
  return "i-lucide-file-text";
});

// Watch for file changes to generate preview and set filename
watch(selectedFile, (file) => {
  // Update filename
  state.filename = file?.name || "";

  // Generate preview for images
  if (file && file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = (e) => {
      filePreview.value = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  } else {
    filePreview.value = null;
  }
});

const resetForm = () => {
  Object.assign(state, {
    file: undefined,
    filename: "",
    category: props.category,
    remarks: "",
  });
  filePreview.value = null;
  uploadProgress.value = 0;
};

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
  isLoading.value = true;
  uploadProgress.value = 0;

  try {
    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      if (uploadProgress.value < 90) {
        uploadProgress.value += Math.random() * 10;
      }
    }, 200);

    const result = await uploadFile({
      file: event.data.file,
      filename: event.data.file.name,
      category: props.category,
      remarks: event.data.remarks?.trim() || undefined,
    });

    clearInterval(progressInterval);
    uploadProgress.value = 100;

    if (result) {
      toast.add({
        title: "Success",
        description: "Document uploaded successfully",
        color: "success",
      });
      emit("close", true);
    } else {
      throw new Error("Upload failed");
    }
  } catch (error: any) {
    const errorMessage = error?.message || "Failed to upload document";
    toast.add({
      title: "Upload Failed",
      description: errorMessage,
      color: "error",
    });
  } finally {
    isLoading.value = false;
    uploadProgress.value = 0;
  }
};

const handleClose = () => {
  if (isLoading.value) {
    // Don't close while uploading
    return;
  }
  emit("close", false);
};

const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  isDragging.value = true;
};

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault();
  isDragging.value = false;
};

const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  isDragging.value = false;

  const droppedFiles = event.dataTransfer?.files;
  if (droppedFiles && droppedFiles.length > 0) {
    const file = droppedFiles[0] as File;
    state.file = file;
    state.filename = file.name;
  }
};

// Reset form when component is mounted
onMounted(() => {
  resetForm();
});
</script>

<template>
  <UModal
    title="Upload Document"
    :ui="{ width: 'w-full max-w-2xl' }"
    @close="handleClose"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-6"
        @submit="onSubmit"
      >
        <!-- File Upload Section -->
        <UFormField label="Document File" name="file">
          <UFileUpload
            v-model="state.file"
            label="Drop your document here or click to browse"
            description="PDF, DOC, DOCX, TXT, XLS, XLSX, PPT, PPTX, JPG, PNG, GIF, WEBP, CSV (Max: 50MB)"
            accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.csv"
            :max-size="MAX_FILE_SIZE"
            :icon="fileTypeIcon"
            class="w-full"
            @dragover="handleDragOver"
            @dragleave="handleDragLeave"
            @drop="handleDrop"
            :class="{ 'ring-2 ring-blue-500 ring-opacity-50': isDragging }"
          />

          <!-- File Preview Section -->
          <div
            v-if="selectedFile"
            class="mt-4 p-4 bg-gray-50 rounded-lg border"
          >
            <div class="flex items-start gap-3">
              <!-- File Icon -->
              <div class="flex-shrink-0">
                <UIcon :name="fileTypeIcon" class="w-8 h-8 text-gray-600" />
              </div>

              <!-- File Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <p class="text-sm font-medium text-gray-900 truncate">
                    {{ selectedFile.name }}
                  </p>
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {{ fileSizeFormatted }}
                  </span>
                </div>

                <!-- Image Preview -->
                <div v-if="filePreview" class="mt-2">
                  <img
                    :src="filePreview"
                    alt="File preview"
                    class="max-w-32 max-h-20 object-cover rounded border"
                  />
                </div>

                <!-- File Type Info -->
                <p class="text-xs text-gray-500 mt-1">
                  Type: {{ selectedFile.type || "Unknown" }}
                </p>
              </div>
            </div>
          </div>
        </UFormField>

        <!-- Remarks Section -->
        <UFormField label="Remarks" name="remarks">
          <UTextarea
            v-model="state.remarks"
            placeholder="Add any remarks or notes about this document (optional)"
            rows="3"
            class="w-full"
            :maxlength="500"
          />
          <template #hint>
            <span class="text-xs text-gray-500">
              {{ state.remarks?.length || 0 }}/500 characters
            </span>
          </template>
        </UFormField>

        <!-- Upload Progress -->
        <div v-if="isLoading" class="space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-600">Uploading document...</span>
            <span class="text-gray-600">{{ Math.round(uploadProgress) }}%</span>
          </div>
          <UProgress :value="uploadProgress" class="w-full" />
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <UButton
            variant="outline"
            @click="handleClose"
            :disabled="isLoading"
            size="lg"
          >
            <UIcon name="i-lucide-x" class="w-4 h-4 mr-2" />
            Cancel
          </UButton>
          <UButton
            type="submit"
            :loading="isLoading"
            :disabled="!selectedFile"
            size="lg"
            class="min-w-32"
          >
            <UIcon name="i-lucide-upload" class="w-4 h-4 mr-2" />
            <span v-if="isLoading">Uploading...</span>
            <span v-else>Upload Document</span>
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>

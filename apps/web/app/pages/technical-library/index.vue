<script setup lang="ts">
import TechnicalLibraryDeleteModal from "~/components/technical-library/TechnicalLibraryDeleteModal.vue";
import TechnicalLibraryUploadModal from "~/components/technical-library/TechnicalLibraryUploadModal.vue";
import type { TechnicalLibraryFile } from "~/composables/useTechnicalLibrary";

definePageMeta({
  middleware: ["auth"],
});

const { isAdmin } = useAuth();

const {
  files,
  isLoading,
  error,
  fetchFiles,
  uploadFile,
  downloadFile,
  printFile,
  deleteFile,
} = useTechnicalLibrary();

const overlay = useOverlay();
const toast = useToast();

// Filter states
const searchQuery = ref("");
const selectedCategory = ref<string>("all");

// Category options
const categories = [
  { label: "All Categories", value: "all" },
  { label: "CAAN Document", value: "caan-document" },
  { label: "Company Document", value: "company-document" },
  {
    label: "Distribution Control Manuals",
    value: "distribution-control-manuals",
  },
  { label: "Maintenance Data Record", value: "maintenance-data-record" },
  { label: "Manufacturer's Document", value: "manufacturers-document" },
  { label: "Training Conducted", value: "training-conducted" },
  { label: "Training Overview", value: "training-overview" },
];

// Filtered files
const filteredFiles = computed(() => {
  let filtered = [...files.value];

  // Filter by category (skip filtering if "all" is selected)
  if (selectedCategory.value && selectedCategory.value !== "all") {
    filtered = filtered.filter(
      (file) => file.category === selectedCategory.value
    );
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (file) =>
        file.originalFilename.toLowerCase().includes(query) ||
        (file.remarks && file.remarks.toLowerCase().includes(query))
    );
  }

  return filtered;
});

// Category display name
const getCategoryDisplayName = (category: string) => {
  const categoryMap: Record<string, string> = {
    "caan-document": "CAAN Document",
    "company-document": "Company Document",
    "distribution-control-manuals": "Distribution Control Manuals",
    "maintenance-data-record": "Maintenance Data Record",
    "manufacturers-document": "Manufacturer's Document",
    "training-conducted": "Training Conducted",
    "training-overview": "Training Overview",
  };
  return categoryMap[category] || category;
};

// File size formatter
const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

// File type icon
const getFileTypeIcon = (mimeType: string) => {
  if (mimeType.startsWith("image/")) return "i-lucide-image";
  if (mimeType === "application/pdf") return "i-lucide-file-text";
  if (mimeType.includes("word")) return "i-lucide-file-text";
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet"))
    return "i-lucide-file-spreadsheet";
  if (mimeType.includes("presentation")) return "i-lucide-presentation";
  return "i-lucide-file-text";
};

// Create modal instances
const uploadModal = overlay.create(TechnicalLibraryUploadModal);
const deleteModal = overlay.create(TechnicalLibraryDeleteModal);

// Modal handlers
const openUploadModal = async () => {
  const instance = uploadModal.open({
    category: selectedCategory.value || "caan-document", // Default to first category
  });
  const result = await instance.result;

  if (result) {
    await fetchFiles();
  }
};

const openDeleteModal = async (file: TechnicalLibraryFile) => {
  const instance = deleteModal.open({ file });
  const result = await instance.result;

  if (result) {
    await fetchFiles();
  }
};

// Download file
const handleDownload = async (file: TechnicalLibraryFile) => {
  await downloadFile(file.id);
};

// Print file
const handlePrint = async (file: TechnicalLibraryFile) => {
  await printFile(file.id);
};

// Load files on mount
onMounted(() => {
  fetchFiles();
});
</script>

<template>
  <UDashboardPanel id="technical-library">
    <template #header>
      <UDashboardNavbar :ui="{ right: 'gap-3' }">
        <template #leading>
          <div class="flex items-center gap-3">
            <UDashboardSidebarCollapse />
            <UBreadcrumb
              :items="[
                {
                  label: 'Technical Library',
                },
              ]"
              class="text-sm"
            />
          </div>
        </template>

        <template #right>
          <UButton
            v-if="isAdmin"
            icon="i-lucide-plus"
            size="md"
            class="rounded-full"
            @click="openUploadModal"
          >
            Upload Document
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <!-- Error State -->
        <UAlert
          v-if="error"
          color="error"
          variant="soft"
          :title="error"
          :close-button="{
            icon: 'i-lucide-x',
            color: 'error',
            variant: 'link',
            padded: false,
          }"
        />

        <!-- Filters -->
        <div class="flex flex-col sm:flex-row gap-4">
          <div class="flex-1">
            <UInput
              v-model="searchQuery"
              icon="i-lucide-search"
              placeholder="Search documents..."
              class="w-full"
            />
          </div>
          <div class="sm:w-64">
            <USelect
              v-model="selectedCategory"
              :items="categories"
              placeholder="Filter by category"
              class="w-full"
            />
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="flex justify-center py-12">
          <UIcon
            name="i-lucide-loader-2"
            class="w-8 h-8 animate-spin text-gray-400"
          />
        </div>

        <!-- Grid Layout -->
        <div
          v-else-if="filteredFiles.length > 0"
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-6"
        >
          <UCard
            v-for="file in filteredFiles"
            :key="file.id"
            class="group hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-200 hover:-translate-y-1 cursor-pointer border-0 ring-1 ring-gray-200 hover:ring-gray-300"
            @click="handleDownload(file)"
          >
            <!-- Header with Badge and Actions -->
            <div class="flex items-start justify-between mb-4">
              <UBadge
                :label="getCategoryDisplayName(file.category)"
                variant="subtle"
                size="sm"
              />
              <UDropdownMenu
                :items="[
                  [
                    {
                      label: 'Download',
                      icon: 'i-lucide-download',
                      onSelect: () => handleDownload(file),
                    },
                    {
                      label: 'Print',
                      icon: 'i-lucide-printer',
                      onSelect: () => handlePrint(file),
                    },
                  ],
                  ...(isAdmin
                    ? [
                        [
                          {
                            label: 'Delete',
                            icon: 'i-lucide-trash-2',
                            onSelect: () => openDeleteModal(file),
                          },
                        ],
                      ]
                    : []),
                ]"
              >
                <UButton
                  variant="ghost"
                  size="sm"
                  icon="i-lucide-more-vertical"
                  class="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
                  @click.stop
                />
              </UDropdownMenu>
            </div>

            <!-- File Icon and Name -->
            <div class="flex items-center gap-4 mb-4">
              <div class="flex-shrink-0">
                <div
                  class="w-12 h-12 bg-gradient-to-br from-primary-300 to-primary-500 rounded-xl flex items-center justify-center shadow-lg"
                >
                  <UIcon
                    :name="getFileTypeIcon(file.mimeType)"
                    class="w-6 h-6 text-white"
                  />
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <h3
                  class="font-semibold text-gray-900 text-base leading-tight mb-1 line-clamp-2"
                  :title="file.originalFilename"
                >
                  {{ file.originalFilename }}
                </h3>
              </div>
            </div>

            <!-- File Details -->
            <div
              class="flex items-center justify-between text-sm text-gray-500 mb-3"
            >
              <div class="flex items-center gap-1">
                <UIcon name="i-lucide-hard-drive" class="w-4 h-4" />
                <span class="font-medium">{{
                  formatFileSize(file.fileSize)
                }}</span>
              </div>
              <div class="flex items-center gap-1">
                <UIcon name="i-lucide-calendar-days" class="w-4 h-4" />
                <span>{{ new Date(file.createdAt).toLocaleDateString() }}</span>
              </div>
            </div>

            <!-- Remarks -->
            <div
              v-if="file.remarks"
              class="mt-auto pt-3 border-t border-gray-100"
            >
              <p
                class="text-sm text-gray-600 line-clamp-2 leading-relaxed"
                :title="file.remarks"
              >
                {{ file.remarks }}
              </p>
            </div>
          </UCard>
        </div>

        <!-- Results Info -->
        <div
          v-if="!isLoading && files.length > 0"
          class="flex justify-between items-center text-sm text-gray-600"
        >
          <div>
            Showing {{ filteredFiles.length }} of {{ files.length }} documents
            <span v-if="searchQuery || selectedCategory">(filtered)</span>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="!isLoading && files.length === 0" class="text-center py-16">
          <div
            class="bg-gradient-to-br from-primary-400 to-primary-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <UIcon name="i-lucide-folder-open" class="w-12 h-12 text-white" />
          </div>
          <h3 class="text-2xl font-semibold text-gray-900 mb-3">
            No documents found
          </h3>
          <p class="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
            Get started by uploading your first technical document to build your
            library.
          </p>
          <UButton
            v-if="isAdmin"
            @click="openUploadModal"
            icon="i-lucide-plus"
            size="lg"
            class="bg-gradient-to-r from-primary-400 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Upload Document
          </UButton>
        </div>

        <!-- No search results -->
        <div
          v-if="!isLoading && files.length > 0 && filteredFiles.length === 0"
          class="text-center py-16"
        >
          <div
            class="bg-gradient-to-br from-amber-50 to-orange-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <UIcon name="i-lucide-search-x" class="w-12 h-12 text-amber-500" />
          </div>
          <h3 class="text-2xl font-semibold text-gray-900 mb-3">
            No matching documents found
          </h3>
          <p class="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
            Try adjusting your search terms or category filter to find what
            you're looking for.
          </p>
          <div class="flex gap-3 justify-center">
            <UButton @click="searchQuery = ''" variant="outline" size="lg">
              Clear Search
            </UButton>
            <UButton @click="selectedCategory = ''" variant="outline" size="lg">
              Clear Filter
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

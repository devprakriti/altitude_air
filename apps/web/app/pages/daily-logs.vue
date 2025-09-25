<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";
import DailyLogForm from "~/components/daily-logs/DailyLogForm.vue";
import DeleteDailyLogModal from "~/components/daily-logs/DeleteDailyLogModal.vue";
import type { DailyLog } from "~/composables/useDailyLogs";
import {
  CalendarDate,
  DateFormatter,
  getLocalTimeZone,
} from "@internationalized/date";
import { h } from "vue";

definePageMeta({
  middleware: ["auth"],
});

const {
  logs,
  isLoading,
  error,
  paginationInfo,
  fetchLogs,
  setFilters,
  setPage,
  setPageSize,
  clearFilters,
} = useDailyLogs();

const overlay = useOverlay();

const searchQuery = ref("");
const df = new DateFormatter("en-US", {
  dateStyle: "medium",
});

const dateRange = ref<any>({});

// Column visibility state - start with essential columns visible
const visibleColumns = ref([
  "recordDate",
  "tlpNo",
  "hoursFlownAirframe",
  "hoursFlownEngine",
  "landings",
  "tc",
  "noOfStarts",
  "usage",
  "status",
  "actions",
]);

// Create modal instances
const createModal = overlay.create(DailyLogForm);
const editModal = overlay.create(DailyLogForm);
const deleteModal = overlay.create(DeleteDailyLogModal);
const viewModal = overlay.create(DailyLogForm);

// All available fields from daily log data
const allAvailableFields = [
  { key: "recordDate", label: "Date" },
  { key: "tlpNo", label: "TLP No" },
  { key: "hoursFlownAirframe", label: "Airframe Time" },
  { key: "hoursFlownEngine", label: "Engine Time" },
  { key: "landings", label: "Landings" },
  { key: "tc", label: "TC" },
  { key: "noOfStarts", label: "Starts" },
  { key: "ggCycle", label: "GG Cycle" },
  { key: "ftCycle", label: "FT Cycle" },
  { key: "usage", label: "Usage" },
  { key: "totalAirframeHr", label: "Total Airframe Hr" },
  { key: "totalEngineHrTsn", label: "Total Engine Hr TSN" },
  { key: "totalLandings", label: "Total Landings" },
  { key: "totalTc", label: "Total TC" },
  { key: "totalNoOfStarts", label: "Total Starts" },
  { key: "totalGgCycleTsn", label: "Total GG Cycle TSN" },
  { key: "totalFtCycleTsn", label: "Total FT Cycle TSN" },
  { key: "remarks", label: "Remarks" },
  { key: "createdAt", label: "Created At" },
  { key: "updatedAt", label: "Updated At" },
  { key: "actions", label: "Actions" },
];

const items = [
  [
    {
      label: "New Daily Log",
      icon: "i-lucide-plus",
      click: openCreateModal,
    },
  ],
] satisfies DropdownMenuItem[][];

// Generate columns dynamically from all available fields
const columns = allAvailableFields.map((field) => {
  const baseColumn = {
    accessorKey: field.key,
    header: field.label,
    enableSorting: true,
  };

  // Add specific cell renderers for different field types
  switch (field.key) {
    case "recordDate":
      return {
        ...baseColumn,
        cell: ({ row }: any) => {
          const date = new Date(row.original.recordDate);
          return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
        },
      };

    case "tlpNo":
      return {
        ...baseColumn,
        cell: ({ row }: any) => {
          return h("span", { class: "font-mono text-sm" }, row.original.tlpNo);
        },
      };

    case "hoursFlownAirframe":
    case "hoursFlownEngine":
      return {
        ...baseColumn,
        cell: ({ row }: any) => {
          const value = row.original[field.key];
          return value
            ? h("span", { class: "text-sm font-mono" }, value)
            : h("span", { class: "text-gray-400 text-sm" }, "-");
        },
      };

    case "totalAirframeHr":
    case "totalEngineHrTsn":
      return {
        ...baseColumn,
        cell: ({ row }: any) => {
          const value = row.original[field.key];
          return value
            ? h("span", { class: "text-sm" }, `${value}h`)
            : h("span", { class: "text-gray-400 text-sm" }, "-");
        },
      };

    case "landings":
    case "tc":
    case "noOfStarts":
    case "ggCycle":
    case "ftCycle":
    case "totalLandings":
    case "totalTc":
    case "totalNoOfStarts":
    case "totalGgCycleTsn":
    case "totalFtCycleTsn":
      return {
        ...baseColumn,
        cell: ({ row }: any) => {
          const value = row.original[field.key];
          return value
            ? h("span", { class: "text-sm" }, value)
            : h("span", { class: "text-gray-400 text-sm" }, "-");
        },
      };

    case "usage":
    case "remarks":
      return {
        ...baseColumn,
        cell: ({ row }: any) => {
          const value = row.original[field.key];
          return value
            ? h("span", { class: "text-sm" }, value)
            : h("span", { class: "text-gray-400 text-sm" }, "-");
        },
      };

    case "status":
      return {
        ...baseColumn,
        cell: ({ row }: any) => {
          const status = row.original.status;
          return h(
            "span",
            {
              class: `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                status
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`,
            },
            status ? "Active" : "Inactive"
          );
        },
      };

    case "createdAt":
    case "updatedAt":
      return {
        ...baseColumn,
        cell: ({ row }: any) => {
          const date = new Date(row.original[field.key]);
          return h(
            "span",
            { class: "text-sm text-gray-600" },
            date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          );
        },
      };

    case "actions":
      return {
        ...baseColumn,
        enableSorting: false,
        cell: ({ row }: any) => {
          return h("div", { class: "flex items-center gap-1" }, [
            h(
              "button",
              {
                class:
                  "p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded",
                onClick: () => openViewModal(row.original),
              },
              [
                h(
                  "svg",
                  {
                    class: "w-4 h-4",
                    fill: "none",
                    stroke: "currentColor",
                    viewBox: "0 0 24 24",
                  },
                  [
                    h("path", {
                      "stroke-linecap": "round",
                      "stroke-linejoin": "round",
                      "stroke-width": "2",
                      d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
                    }),
                    h("path", {
                      "stroke-linecap": "round",
                      "stroke-linejoin": "round",
                      "stroke-width": "2",
                      d: "M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
                    }),
                  ]
                ),
              ]
            ),
            h(
              "button",
              {
                class:
                  "p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded",
                onClick: () => openEditModal(row.original),
              },
              [
                h(
                  "svg",
                  {
                    class: "w-4 h-4",
                    fill: "none",
                    stroke: "currentColor",
                    viewBox: "0 0 24 24",
                  },
                  [
                    h("path", {
                      "stroke-linecap": "round",
                      "stroke-linejoin": "round",
                      "stroke-width": "2",
                      d: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
                    }),
                  ]
                ),
              ]
            ),
            h(
              "button",
              {
                class:
                  "p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded",
                onClick: () => openDeleteModal(row.original),
              },
              [
                h(
                  "svg",
                  {
                    class: "w-4 h-4",
                    fill: "none",
                    stroke: "currentColor",
                    viewBox: "0 0 24 24",
                  },
                  [
                    h("path", {
                      "stroke-linecap": "round",
                      "stroke-linejoin": "round",
                      "stroke-width": "2",
                      d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
                    }),
                  ]
                ),
              ]
            ),
          ]);
        },
      };

    default:
      return {
        ...baseColumn,
        cell: ({ row }: any) => {
          const value = row.original[field.key];
          return value
            ? h("span", { class: "text-sm" }, value)
            : h("span", { class: "text-gray-400 text-sm" }, "-");
        },
      };
  }
});

// Computed property for filtered columns
const filteredColumns = computed(() => {
  return columns.filter((column) =>
    visibleColumns.value.includes(column.accessorKey)
  );
});

// Clear date range
const clearDateRange = () => {
  dateRange.value = {};
  handleSearch();
};

// Column visibility items for dropdown
const columnVisibilityItems = computed(() => {
  return [
    allAvailableFields
      .filter((field) => field.key !== "actions")
      .map((field) => ({
        label: field.label,
        type: "checkbox" as const,
        checked: visibleColumns.value.includes(field.key),
        onUpdateChecked: (checked: boolean) => {
          if (checked) {
            if (!visibleColumns.value.includes(field.key)) {
              visibleColumns.value.push(field.key);
            }
          } else {
            const index = visibleColumns.value.indexOf(field.key);
            if (index > -1) {
              visibleColumns.value.splice(index, 1);
            }
          }
        },
      })),
  ];
});

const handleSearch = () => {
  setFilters({
    tlpNo: searchQuery.value || undefined,
    dateFrom: dateRange.value.start
      ? `${dateRange.value.start.year}-${String(dateRange.value.start.month).padStart(2, "0")}-${String(dateRange.value.start.day).padStart(2, "0")}`
      : undefined,
    dateTo: dateRange.value.end
      ? `${dateRange.value.end.year}-${String(dateRange.value.end.month).padStart(2, "0")}-${String(dateRange.value.end.day).padStart(2, "0")}`
      : undefined,
  });
};

async function openCreateModal() {
  const instance = createModal.open();
  const result = await instance.result;

  if (result) {
    // Daily log was created successfully, refetch data
    await fetchLogs();
  }
}

async function openEditModal(log: DailyLog) {
  const instance = editModal.open({ log });
  const result = await instance.result;

  if (result) {
    // Daily log was updated successfully, refetch data
    await fetchLogs();
  }
}

async function openDeleteModal(log: DailyLog) {
  const instance = deleteModal.open({ log });
  const result = await instance.result;

  if (result) {
    // Daily log was deleted successfully, refetch data
    await fetchLogs();
  }
}

async function openViewModal(log: DailyLog) {
  const instance = viewModal.open({ log });
  // No need to refetch data for view-only modal
}

const handlePageChange = (page: number) => {
  setPage(page);
};

const handlePageSizeChange = (size: number) => {
  setPageSize(size);
};

onMounted(() => {
  fetchLogs();
});
</script>

<template>
  <UDashboardPanel id="daily-logs">
    <template #header>
      <UDashboardNavbar title="Daily Logs" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            icon="i-lucide-plus"
            size="md"
            class="rounded-full"
            @click="openCreateModal"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
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

        <!-- Loading State -->
        <div v-if="isLoading" class="flex justify-center py-8">
          <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin" />
        </div>

        <!-- Table Controls -->
        <div v-else-if="logs.length > 0" class="space-y-4">
          <!-- Enhanced Header with Search, Filters, and Column Controls -->
          <div class="bg-white border border-gray-200 rounded-lg p-4">
            <div
              class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
            >
              <!-- Left side: Search and Date Filter -->
              <div class="flex flex-col sm:flex-row gap-3 flex-1">
                <!-- Search Bar -->
                <div class="flex-1 min-w-0">
                  <UInput
                    v-model="searchQuery"
                    icon="i-lucide-search"
                    placeholder="Search by TLP number..."
                    class="w-full"
                    @keyup.enter="handleSearch"
                  />
                </div>

                <!-- Date Range Filter -->
                <div class="flex gap-2">
                  <UPopover :popper="{ placement: 'bottom-start' }">
                    <UButton
                      variant="outline"
                      icon="i-lucide-calendar"
                      class="justify-start w-full sm:w-64"
                    >
                      <template v-if="dateRange.start">
                        <template v-if="dateRange.end">
                          {{
                            df.format(
                              dateRange.start.toDate(getLocalTimeZone())
                            )
                          }}
                          -
                          {{
                            df.format(dateRange.end.toDate(getLocalTimeZone()))
                          }}
                        </template>
                        <template v-else>
                          {{
                            df.format(
                              dateRange.start.toDate(getLocalTimeZone())
                            )
                          }}
                        </template>
                      </template>
                      <template v-else> Pick a date range </template>
                    </UButton>
                    <template #content>
                      <UCalendar
                        v-model="dateRange"
                        class="p-2"
                        :number-of-months="2"
                        range
                      />
                    </template>
                  </UPopover>

                  <UButton
                    v-if="dateRange.start || dateRange.end"
                    variant="outline"
                    icon="i-lucide-x"
                    @click="clearDateRange"
                  />
                  <!-- Column Visibility Dropdown -->
                  <UDropdownMenu :items="columnVisibilityItems">
                    <UButton
                      variant="outline"
                      size="sm"
                      trailing-icon="i-lucide-chevron-down"
                      icon="i-lucide-columns"
                    >
                      Columns
                    </UButton>
                  </UDropdownMenu>
                </div>
              </div>
            </div>
          </div>

          <!-- Table -->
          <div class="border border-gray-200 rounded-lg overflow-hidden">
            <UTable
              :data="logs as any"
              :columns="filteredColumns"
              :sticky="true"
              class="w-full"
              :ui="{
                base: 'min-w-full divide-y divide-gray-200',
                thead: 'bg-gray-50',
                tbody: 'bg-white divide-y divide-gray-200',
                tr: 'hover:bg-gray-50',
                th: 'px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                td: 'px-3 py-2 whitespace-nowrap text-sm text-gray-900',
              }"
            />
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-12">
          <UIcon
            name="i-lucide-clipboard-list"
            class="w-12 h-12 mx-auto text-gray-400 mb-4"
          />
          <h3 class="text-lg font-medium text-gray-900 mb-2">
            No daily logs found
          </h3>
          <p class="text-gray-500 mb-4">
            Get started by creating your first daily log entry.
          </p>
          <UButton
            @click="openCreateModal"
            icon="i-lucide-plus"
            color="primary"
          >
            Add Daily Log
          </UButton>
        </div>

        <!-- Pagination -->
        <div
          v-if="!isLoading && logs.length > 0"
          class="flex justify-between items-center"
        >
          <div class="text-sm text-gray-500">
            Showing
            {{ (paginationInfo.currentPage - 1) * paginationInfo.pageSize + 1 }}
            to
            {{
              Math.min(
                paginationInfo.currentPage * paginationInfo.pageSize,
                paginationInfo.totalCount
              )
            }}
            of {{ paginationInfo.totalCount }} entries
          </div>

          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-500">Rows per page:</span>
              <USelect
                :model-value="paginationInfo.pageSize"
                :options="[5, 10, 25, 50]"
                @change="
                  (event) =>
                    handlePageSizeChange(
                      Number((event.target as HTMLSelectElement)?.value)
                    )
                "
                class="w-20"
              />
            </div>

            <UPagination
              :model-value="paginationInfo.currentPage"
              :total="paginationInfo.totalPages"
              @update:model-value="handlePageChange"
            />
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="!isLoading && logs.length === 0" class="text-center py-12">
          <UIcon
            name="i-lucide-clipboard-list"
            class="w-12 h-12 mx-auto text-gray-400 mb-4"
          />
          <h3 class="text-lg font-medium text-gray-900 mb-2">
            No daily logs found
          </h3>
          <p class="text-gray-500 mb-4">
            Get started by creating your first daily log entry.
          </p>
          <UButton @click="openCreateModal" icon="i-lucide-plus">
            Create Daily Log
          </UButton>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from "@nuxt/ui";
import DailyLogForm from "~/components/daily-logs/DailyLogForm.vue";
import DeleteDailyLogModal from "~/components/daily-logs/DeleteDailyLogModal.vue";
import type { DailyLog } from "~/composables/useDailyLogs";
import {
  CalendarDate,
  DateFormatter,
  getLocalTimeZone,
} from "@internationalized/date";
import { h, resolveComponent } from "vue";
import { watchDebounced } from "@vueuse/core";

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
  exportToCSV: exportFromComposable,
} = useDailyLogs();

const overlay = useOverlay();
const toast = useToast();

// Search and filter state
const searchQuery = ref("");
const allLogs = ref<DailyLog[]>([]);
const df = new DateFormatter("en-US", {
  dateStyle: "medium",
});

const dateRange = ref<any>({});
const statusFilter = ref<string | null>(null);
const sortField = ref<string>("recordDate");
const sortDirection = ref<"asc" | "desc">("desc");

// Local search implementation
const debouncedSearch = ref("");
const { $eden } = useNuxtApp();

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

// Export state
const isExporting = ref(false);

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

// Resolve components for table
const UButton = resolveComponent("UButton");
const UBadge = resolveComponent("UBadge");
const UDropdownMenu = resolveComponent("UDropdownMenu");

// Generate columns dynamically from all available fields with proper sorting
const columns: TableColumn<DailyLog>[] = allAvailableFields.map((field) => {
  const baseColumn: TableColumn<DailyLog> = {
    accessorKey: field.key,
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: field.label,
        icon: isSorted
          ? isSorted === "asc"
            ? "i-lucide-arrow-up-narrow-wide"
            : "i-lucide-arrow-down-wide-narrow"
          : "i-lucide-arrow-up-down",
        class: "-mx-2.5",
        onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
      });
    },
    enableSorting: field.key !== "actions",
  };

  // Add specific cell renderers for different field types
  switch (field.key) {
    case "recordDate":
      return {
        ...baseColumn,
        cell: ({ row }) => {
          const date = new Date(row.original.recordDate);
          return h(
            "span",
            {},
            date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          );
        },
      };

    case "tlpNo":
      return {
        ...baseColumn,
        cell: ({ row }) => {
          return h("span", { class: "font-mono text-sm" }, row.original.tlpNo);
        },
      };

    case "hoursFlownAirframe":
    case "hoursFlownEngine":
      return {
        ...baseColumn,
        cell: ({ row }) => {
          const value = row.original[field.key as keyof DailyLog];
          return value
            ? h("span", { class: "text-sm font-mono" }, String(value))
            : h("span", { class: "text-gray-400 text-sm" }, "-");
        },
      };

    case "totalAirframeHr":
    case "totalEngineHrTsn":
      return {
        ...baseColumn,
        cell: ({ row }) => {
          const value = row.original[field.key as keyof DailyLog];
          return value
            ? h("span", { class: "text-sm" }, `${String(value)}h`)
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
        cell: ({ row }) => {
          const value = row.original[field.key as keyof DailyLog];
          return value
            ? h("span", { class: "text-sm" }, String(value))
            : h("span", { class: "text-gray-400 text-sm" }, "-");
        },
      };

    case "usage":
    case "remarks":
      return {
        ...baseColumn,
        cell: ({ row }) => {
          const value = row.original[field.key as keyof DailyLog];
          return value
            ? h("span", { class: "text-sm" }, String(value))
            : h("span", { class: "text-gray-400 text-sm" }, "-");
        },
      };

    case "status":
      return {
        ...baseColumn,
        cell: ({ row }) => {
          const status = row.original.status;
          return h(
            UBadge,
            {
              class: "capitalize",
              variant: "subtle",
              color: status ? "success" : "error",
            },
            () => (status ? "Active" : "Inactive")
          );
        },
      };

    case "createdAt":
    case "updatedAt":
      return {
        ...baseColumn,
        cell: ({ row }) => {
          const date = new Date(
            row.original[field.key as keyof DailyLog] as string
          );
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
        accessorKey: "actions",
        header: () => null, // No header for actions column
        enableSorting: false,
        cell: ({ row }) => {
          const items = [
            {
              label: "View",
              icon: "i-lucide-eye",
              onSelect: () => openViewModal(row.original),
            },
            {
              label: "Edit",
              icon: "i-lucide-edit",
              onSelect: () => openEditModal(row.original),
            },
            {
              type: "separator" as const,
            },
            {
              label: "Delete",
              icon: "i-lucide-trash",
              color: "error" as const,
              onSelect: () => openDeleteModal(row.original),
            },
          ];

          return h(
            "div",
            { class: "text-right" },
            h(
              UDropdownMenu,
              {
                content: { align: "end" },
                items: items,
                "aria-label": "Actions dropdown",
              },
              () =>
                h(UButton, {
                  icon: "i-lucide-ellipsis-vertical",
                  color: "neutral",
                  variant: "ghost",
                  class: "ml-auto",
                  "aria-label": "Actions dropdown",
                })
            )
          );
        },
      };

    default:
      return {
        ...baseColumn,
        cell: ({ row }) => {
          const value = row.original[field.key as keyof DailyLog];
          return value
            ? h("span", { class: "text-sm" }, String(value))
            : h("span", { class: "text-gray-400 text-sm" }, "-");
        },
      };
  }
});

// Computed property for filtered columns
const filteredColumns = computed(() => {
  return columns.filter((column) =>
    visibleColumns.value.includes((column as any).accessorKey)
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

// Load all logs initially for local search
const localIsLoading = ref(false);
const loadAllLogs = async () => {
  localIsLoading.value = true;
  try {
    const response = await $eden["daily-logs"].get({
      page: 1,
      pageSize: 1000, // Load all logs for local search
      dateFrom: dateRange.value.start
        ? `${dateRange.value.start.year}-${String(dateRange.value.start.month).padStart(2, "0")}-${String(dateRange.value.start.day).padStart(2, "0")}`
        : undefined,
      dateTo: dateRange.value.end
        ? `${dateRange.value.end.year}-${String(dateRange.value.end.month).padStart(2, "0")}-${String(dateRange.value.end.day).padStart(2, "0")}`
        : undefined,
    });

    if (response.data?.success) {
      allLogs.value = response.data.list;
    }
  } catch (err) {
    console.error("Failed to load logs:", err);
  } finally {
    localIsLoading.value = false;
  }
};

// Local search filtering
const filteredLogs = computed(() => {
  let filtered = [...allLogs.value];

  // Apply search filter
  if (debouncedSearch.value) {
    const query = debouncedSearch.value.toLowerCase();
    filtered = filtered.filter(
      (log) =>
        log.tlpNo.toLowerCase().includes(query) ||
        (log.remarks && log.remarks.toLowerCase().includes(query)) ||
        (log.usage && log.usage.toLowerCase().includes(query))
    );
  }

  // Apply status filter if needed
  if (statusFilter.value !== null) {
    const isActive = statusFilter.value === "true";
    filtered = filtered.filter((log) => log.status === isActive);
  }

  return filtered;
});

// Debounce search to avoid too many computations
watchDebounced(
  searchQuery,
  (newVal) => {
    debouncedSearch.value = newVal;
  },
  { debounce: 150 }
);

// Enhanced search and filter handling
const handleSearch = () => {
  // For date range changes, reload all logs
  loadAllLogs();
};

// Export functionality
const exportToCSV = async () => {
  isExporting.value = true;

  try {
    // Build query parameters
    const queryParams = new URLSearchParams();

    // Add current filters to export
    if (debouncedSearch.value) {
      queryParams.append("search", debouncedSearch.value);
    }
    if (dateRange.value.start) {
      const dateFrom = `${dateRange.value.start.year}-${String(dateRange.value.start.month).padStart(2, "0")}-${String(dateRange.value.start.day).padStart(2, "0")}`;
      queryParams.append("dateFrom", dateFrom);
    }
    if (dateRange.value.end) {
      const dateTo = `${dateRange.value.end.year}-${String(dateRange.value.end.month).padStart(2, "0")}-${String(dateRange.value.end.day).padStart(2, "0")}`;
      queryParams.append("dateTo", dateTo);
    }

    // Direct fetch approach - use the same server URL as Eden client
    const config = useRuntimeConfig();
    const serverUrl = config.public.serverURL;
    const exportUrl = `${serverUrl}/daily-logs/export?${queryParams.toString()}`;

    const response = await fetch(exportUrl, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "text/csv",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const csvData = await response.text();

    if (csvData && csvData.trim() !== "") {
      // Create blob and download
      const blob = new Blob([csvData], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `daily-logs-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.add({
        title: "Export successful",
        description: "Daily logs exported to CSV",
        color: "success",
      });
    } else {
      throw new Error("No CSV data received or empty response");
    }
  } catch (error) {
    toast.add({
      title: "Export failed",
      description:
        error instanceof Error ? error.message : "Failed to export daily logs",
      color: "error",
    });
  } finally {
    isExporting.value = false;
  }
};

const exportToPDF = async () => {
  isExporting.value = true;

  try {
    // Get CSV data first
    const queryParams = new URLSearchParams();

    if (debouncedSearch.value) {
      queryParams.append("search", debouncedSearch.value);
    }
    if (dateRange.value.start) {
      const dateFrom = `${dateRange.value.start.year}-${String(dateRange.value.start.month).padStart(2, "0")}-${String(dateRange.value.start.day).padStart(2, "0")}`;
      queryParams.append("dateFrom", dateFrom);
    }
    if (dateRange.value.end) {
      const dateTo = `${dateRange.value.end.year}-${String(dateRange.value.end.month).padStart(2, "0")}-${String(dateRange.value.end.day).padStart(2, "0")}`;
      queryParams.append("dateTo", dateTo);
    }

    const config = useRuntimeConfig();
    const serverUrl = config.public.serverURL;
    const exportUrl = `${serverUrl}/daily-logs/export?${queryParams.toString()}`;

    const response = await fetch(exportUrl, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "text/csv",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const csvData = await response.text();

    // Import jsPDF dynamically
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    // Parse CSV data
    const lines = csvData.split("\n").filter((line) => line.trim());
    const headers = lines[0]?.split(",").map((h) => h.replace(/"/g, "")) || [];
    const rows = lines
      .slice(1)
      .map((line) => line.split(",").map((cell) => cell.replace(/"/g, "")));

    // Create PDF
    const doc = new jsPDF("l", "mm", "a4"); // landscape orientation for better table fit

    // Add title
    doc.setFontSize(16);
    doc.text("Daily Logs Export", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

    // Add table using autoTable with better formatting
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 35,
      styles: {
        fontSize: 6,
        cellPadding: 1,
        overflow: "linebreak",
        halign: "center",
      },
      headStyles: {
        fillColor: [66, 66, 66],
        textColor: 255,
        fontSize: 7,
        fontStyle: "bold",
        halign: "center",
      },
      columnStyles: {
        0: { cellWidth: 8 }, // ID
        1: { cellWidth: 18 }, // Record Date
        2: { cellWidth: 12 }, // TLP No
        3: { cellWidth: 12 }, // Hours Flown (Airframe)
        4: { cellWidth: 12 }, // Hours Flown (Engine)
        5: { cellWidth: 10 }, // Landings
        6: { cellWidth: 8 }, // TC
        7: { cellWidth: 10 }, // No of Starts
        8: { cellWidth: 10 }, // GG Cycle
        9: { cellWidth: 10 }, // FT Cycle
        10: { cellWidth: 12 }, // Usage
        11: { cellWidth: 15 }, // Total Airframe Hr
        12: { cellWidth: 15 }, // Total Engine Hr TSN
        13: { cellWidth: 12 }, // Total Landings
        14: { cellWidth: 10 }, // Total TC
        15: { cellWidth: 12 }, // Total No of Starts
        16: { cellWidth: 15 }, // Total GG Cycle TSN
        17: { cellWidth: 15 }, // Total FT Cycle TSN
        18: { cellWidth: 20 }, // Remarks
        19: { cellWidth: 10 }, // Status
        20: { cellWidth: 18 }, // Created At
        21: { cellWidth: 18 }, // Updated At
      },
      margin: { top: 35, left: 5, right: 5 },
      tableWidth: "auto",
      theme: "grid",
    });

    // Download PDF
    doc.save(`daily-logs-${new Date().toISOString().split("T")[0]}.pdf`);

    toast.add({
      title: "Export successful",
      description: "Daily logs exported to PDF",
      color: "success",
    });
  } catch (error) {
    console.error("PDF export error:", error);
    toast.add({
      title: "Export failed",
      description: "Failed to export daily logs to PDF",
      color: "error",
    });
  } finally {
    isExporting.value = false;
  }
};

// Clear all filters
const clearAllFilters = () => {
  searchQuery.value = "";
  statusFilter.value = null;
  dateRange.value = {};
  sortField.value = "recordDate";
  sortDirection.value = "desc";
  clearFilters();
};

// Check if there are active filters
const hasActiveFilters = computed(() => {
  return (
    searchQuery.value ||
    (statusFilter.value !== null && statusFilter.value !== "") ||
    dateRange.value.start ||
    dateRange.value.end
  );
});

// Export dropdown items
const exportItems = [
  [
    {
      label: "Export as CSV",
      icon: "i-lucide-file-text",
      onSelect: exportToCSV,
    },
    {
      label: "Export as PDF",
      icon: "i-lucide-file",
      onSelect: exportToPDF,
    },
  ],
];

async function openCreateModal() {
  const instance = createModal.open();
  const result = await instance.result;

  if (result) {
    // Daily log was created successfully, refetch data
    await loadAllLogs();
  }
}

async function openEditModal(log: DailyLog) {
  const instance = editModal.open({ log });
  const result = await instance.result;

  if (result) {
    // Daily log was updated successfully, refetch data
    await loadAllLogs();
  }
}

async function openDeleteModal(log: DailyLog) {
  const instance = deleteModal.open({ log });
  const result = await instance.result;

  if (result) {
    // Daily log was deleted successfully, refetch data
    await loadAllLogs();
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
  loadAllLogs();
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
          >
            New Daily Log
          </UButton>
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
        <div v-if="localIsLoading" class="flex justify-center py-8">
          <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin" />
        </div>

        <!-- Table Controls -->
        <div v-else-if="allLogs.length > 0" class="space-y-4">
          <!-- Enhanced Header with Search, Filters, and Column Controls -->
          <div class="bg-white border border-gray-200 rounded-lg p-4">
            <div
              class="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              <!-- Left side: Search and Date Filter -->
              <div class="flex flex-col sm:flex-row gap-3 flex-1">
                <!-- Search Bar -->
                <UInput
                  v-model="searchQuery"
                  icon="i-lucide-search"
                  placeholder="Search"
                />

                <UPopover :popper="{ placement: 'bottom-start' }">
                  <UButton variant="outline" icon="i-lucide-calendar">
                    <template v-if="dateRange.start">
                      <template v-if="dateRange.end">
                        {{
                          df.format(dateRange.start.toDate(getLocalTimeZone()))
                        }}
                        -
                        {{
                          df.format(dateRange.end.toDate(getLocalTimeZone()))
                        }}
                      </template>
                      <template v-else>
                        {{
                          df.format(dateRange.start.toDate(getLocalTimeZone()))
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
                      @update:model-value="handleSearch"
                    />
                  </template>
                </UPopover>

                <UButton
                  v-if="dateRange.start || dateRange.end"
                  variant="outline"
                  icon="i-lucide-x"
                  @click="clearDateRange"
                />
              </div>

              <!-- Right side: Action buttons -->
              <div class="flex gap-2">
                <UButton
                  v-if="hasActiveFilters"
                  variant="outline"
                  icon="i-lucide-x"
                  @click="clearAllFilters"
                >
                  Clear
                </UButton>
                <UDropdownMenu :items="exportItems">
                  <UButton
                    variant="outline"
                    icon="i-lucide-download"
                    :loading="isExporting"
                  >
                    Export
                  </UButton>
                </UDropdownMenu>
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

          <!-- Table -->
          <div class="border border-gray-200 rounded-lg overflow-hidden">
            <UTable
              :data="filteredLogs as any"
              :columns="filteredColumns"
              :sticky="true"
              class="w-full"
              :ui="{
                base: 'min-w-full divide-y divide-gray-200',
                thead: 'bg-gray-50',
                tbody: 'bg-white divide-y divide-gray-200',
                tr: 'hover:bg-gray-50',
                th: 'px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                td: 'px-2 py-1 whitespace-nowrap text-sm text-gray-900',
              }"
            />
          </div>
        </div>

        <!-- Results Info -->
        <div
          v-if="!localIsLoading && allLogs.length > 0"
          class="flex justify-between items-center"
        >
          <div class="text-sm text-gray-500">
            Showing {{ filteredLogs.length }} of {{ allLogs.length }} entries
            <span v-if="debouncedSearch || statusFilter">(filtered)</span>
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-if="!localIsLoading && allLogs.length === 0"
          class="text-center py-12"
        >
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

        <!-- No search results -->
        <div
          v-if="
            !localIsLoading && allLogs.length > 0 && filteredLogs.length === 0
          "
          class="text-center py-12"
        >
          <UIcon
            name="i-lucide-search-x"
            class="w-12 h-12 mx-auto text-gray-400 mb-4"
          />
          <h3 class="text-lg font-medium text-gray-900 mb-2">
            No matching logs found
          </h3>
          <p class="text-gray-500 mb-4">
            Try adjusting your search terms or filters.
          </p>
          <UButton
            @click="
              searchQuery = '';
              statusFilter = null;
            "
            variant="outline"
          >
            Clear Search
          </UButton>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

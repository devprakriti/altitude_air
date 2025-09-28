<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const route = useRoute();
const toast = useToast();
const authStore = useAuthStore();

const open = ref(false);

const dashboardLinks = {
  label: "Dashboard",
  icon: "i-lucide-layout-dashboard",
  type: "trigger" as const,
  defaultOpen: true,
  children: [
    {
      label: "Overview",
      to: "/",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Alerts and Notifications",
      to: "/inbox",
      badge: "4",
      onSelect: () => {
        open.value = false;
      },
    },
  ],
};

const maintenancePlanningLinks = {
  label: "Maintenance Planning",
  icon: "i-lucide-wrench",
  type: "trigger" as const,
  defaultOpen: true,
  children: [
    {
      label: "Daily Log",
      to: "/daily-logs",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "TLP Scan",
      to: "/tlp-scan",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Monitoring Chart",
      to: "/monitoring-chart",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Component Status",
      to: "/component-status",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Out of Phase Inspection",
      to: "/out-of-phase-inspection",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "NRC",
      to: "/nrc",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "AWC",
      to: "/awc",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Component Changes",
      to: "/component-changes",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Maintenance Work Order Tracking",
      to: "/maintenance-work-order-tracking",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Engine Health Check",
      to: "/engine-health-check",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Concession",
      to: "/concession",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "ADD Tracking",
      to: "/add-tracking",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Airframe Logbook",
      to: "/airframe-logbook",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Engine Logbook",
      to: "/engine-logbook",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Maintenance Occurrence Report",
      to: "/maintenance-occurrence-report",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Work Pack Scan",
      to: "/work-pack-scan",
      onSelect: () => {
        open.value = false;
      },
    },
  ],
};

const technicalServicesLinks = {
  label: "Technical Services",
  icon: "i-lucide-cog",
  type: "trigger" as const,
  defaultOpen: false,
  children: [
    {
      label: "Website Visit Log",
      to: "/website-visit-log",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "AD/SB Compliance Summary",
      to: "/ad-sb-compliance-summary",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Individual Inspection Log Book",
      to: "/individual-inspection-log-book",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "AD/SB Tracking System",
      to: "/ad-sb-tracking-system",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "ETO",
      to: "/eto",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "TDR",
      to: "/tdr",
      onSelect: () => {
        open.value = false;
      },
    },
  ],
};

const technicalLibraryLinks = {
  label: "Technical Library",
  icon: "i-lucide-library",
  type: "trigger" as const,
  defaultOpen: true,
  children: [
    {
      label: "Company Document",
      to: "/technical-library/company-document",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "CAAN Document",
      to: "/technical-library/caan-document",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Manufacturers Document",
      to: "/technical-library/manufacturers-document",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Distribution and Control of Company Manuals",
      to: "/technical-library/distribution-control-manuals",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Maintenance Data Record",
      to: "/technical-library/maintenance-data-record",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Technical Training Record",
      type: "trigger" as const,
      children: [
        {
          label: "Training Conducted",
          to: "/technical-library/training-conducted",
          onSelect: () => {
            open.value = false;
          },
        },
        {
          label: "Training Overview",
          to: "/technical-library/training-overview",
          onSelect: () => {
            open.value = false;
          },
        },
      ],
    },
  ],
};

const fleetManagementLinks = {
  label: "Fleet Management",
  icon: "i-lucide-plane",
  type: "trigger" as const,
  defaultOpen: false,
  children: [
    {
      label: "Helicopter Overview",
      to: "/helicopter-overview",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Flight Hours Tracker",
      to: "/flight-hours-tracker",
      onSelect: () => {
        open.value = false;
      },
    },
  ],
};

// Admin functionality is now integrated into settings/members

const settingsSupportLinks = {
  label: "Settings / Support",
  icon: "i-lucide-settings",
  type: "trigger" as const,
  defaultOpen: false,
  children: [
    {
      label: "System Configuration",
      to: "/system-configuration",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Fleet Configuration",
      to: "/fleet-configuration",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Compliance Settings",
      to: "/compliance-settings",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "User Manual",
      to: "/user-manual",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Knowledge Base",
      to: "/knowledge-base",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "General Settings",
      to: "/settings",
      exact: true,
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Members",
      to: "/settings/members",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Notifications",
      to: "/settings/notifications",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Security",
      to: "/settings/security",
      onSelect: () => {
        open.value = false;
      },
    },
  ],
};

const links = computed(() => {
  return [
    [dashboardLinks],
    [maintenancePlanningLinks],
    [technicalServicesLinks],
    [technicalLibraryLinks],
    [fleetManagementLinks],
    [settingsSupportLinks],
  ];
}) satisfies ComputedRef<NavigationMenuItem[][]>;

const groups = computed(() => [
  {
    id: "links",
    label: "Go to",
    items: links.value.flat(),
  },
]);

// onMounted(async () => {
//   const cookie = useCookie("cookie-consent");
//   if (cookie.value === "accepted") {
//     return;
//   }

// toast.add({
//   title:
//     "We use first-party cookies to enhance your experience on our website.",
//   duration: 0,
//   close: false,
//   actions: [
//     {
//       label: "Accept",
//       color: "neutral",
//       variant: "outline",
//       onClick: () => {
//         cookie.value = "accepted";
//       },
//     },
//     {
//       label: "Opt out",
//       color: "neutral",
//       variant: "ghost",
//     },
//   ],
// });
// });
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <TeamsMenu :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton
          :collapsed="collapsed"
          class="bg-transparent ring-default"
        />

        <UNavigationMenu
          v-for="(section, index) in links"
          :key="index"
          :collapsed="collapsed"
          :items="section"
          orientation="vertical"
          tooltip
          popover
          :class="index === links.length - 1 ? 'mt-auto' : ''"
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />

    <slot />

    <NotificationsSlideover />
  </UDashboardGroup>
</template>

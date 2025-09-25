<script setup lang="ts">
import type { DailyLog, CreateDailyLogData } from "~/composables/useDailyLogs";
import type { FormSubmitEvent } from "@nuxt/ui";
import { z } from "zod";
import { vMaska } from "maska/vue";
import {
  CalendarDate,
  DateFormatter,
  getLocalTimeZone,
  today,
} from "@internationalized/date";

interface Props {
  log?: DailyLog | null;
}

interface Emits {
  (e: "close", success: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { createLog, updateLog, logs, fetchLogs } = useDailyLogs();
const toast = useToast();

// Zod schema for validation
const schema = z.object({
  recordDate: z.string().min(1, "Record date is required"),
  tlpNo: z.string().min(1, "TLP No is required"),
  hoursFlownAirframe: z
    .string()
    .regex(
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      "Must be in HH:MM format (e.g., 03:15)"
    )
    .optional()
    .or(z.literal("")),
  hoursFlownEngine: z
    .string()
    .regex(
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      "Must be in HH:MM format (e.g., 03:15)"
    )
    .optional()
    .or(z.literal("")),
  landings: z.number().optional(),
  tc: z.number().optional(),
  noOfStarts: z.number().optional(),
  ggCycle: z.number().optional(),
  ftCycle: z.number().optional(),
  usage: z.string().optional(),
  remarks: z.string().optional(),
});

type Schema = z.output<typeof schema>;

// Date formatter for display
const df = new DateFormatter("en-US", {
  dateStyle: "medium",
});

// Initialize with today's date
const todayDate = today(getLocalTimeZone());
const todayString = `${todayDate.year}-${String(todayDate.month).padStart(2, "0")}-${String(todayDate.day).padStart(2, "0")}`;

// Create max date (today) for calendar
const maxDate = todayDate;

const state = reactive<Partial<Schema>>({
  recordDate: todayString,
  tlpNo: "",
  hoursFlownAirframe: undefined,
  hoursFlownEngine: undefined,
  landings: undefined,
  tc: undefined,
  noOfStarts: undefined,
  ggCycle: undefined,
  ftCycle: undefined,
  usage: undefined,
  remarks: undefined,
});

// Calendar date for the UCalendar component
const calendarDate = computed({
  get: () => {
    if (!state.recordDate)
      return new CalendarDate(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        new Date().getDate()
      );
    const date = new Date(state.recordDate);
    return new CalendarDate(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate()
    );
  },
  set: (value: CalendarDate) => {
    state.recordDate = `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;
  },
});

const isEditMode = computed(() => !!props.log);

// Create a map of existing logs by date for quick lookup
const existingLogsByDate = computed(() => {
  const logMap = new Map<string, DailyLog>();
  logs.value.forEach((log) => {
    try {
      // recordDate is always a string in the DailyLog interface
      const dateString = log.recordDate;
      logMap.set(dateString, log);
    } catch (error) {
      console.warn("Invalid recordDate format:", log.recordDate, error);
    }
  });
  return logMap;
});

// Function to get log for a specific date
const getLogForDate = (date: CalendarDate) => {
  const dateString = `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
  return existingLogsByDate.value.get(dateString);
};

const resetForm = () => {
  const today = todayDate;
  const todayString = `${today.year}-${String(today.month).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`;

  Object.assign(state, {
    recordDate: todayString,
    tlpNo: "",
    hoursFlownAirframe: undefined,
    hoursFlownEngine: undefined,
    landings: undefined,
    tc: undefined,
    noOfStarts: undefined,
    ggCycle: undefined,
    ftCycle: undefined,
    usage: undefined,
    remarks: undefined,
  });
};

const populateForm = () => {
  if (props.log) {
    Object.assign(state, {
      recordDate: props.log.recordDate,
      tlpNo: props.log.tlpNo,
      hoursFlownAirframe: props.log.hoursFlownAirframe || undefined,
      hoursFlownEngine: props.log.hoursFlownEngine || undefined,
      landings: props.log.landings || undefined,
      tc: props.log.tc || undefined,
      noOfStarts: props.log.noOfStarts || undefined,
      ggCycle: props.log.ggCycle || undefined,
      ftCycle: props.log.ftCycle || undefined,
      usage: props.log.usage || undefined,
      remarks: props.log.remarks || undefined,
    });
  } else {
    resetForm();
  }
};

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
  try {
    const data = {
      ...event.data,
      hoursFlownAirframe:
        event.data.hoursFlownAirframe &&
        event.data.hoursFlownAirframe.trim() !== ""
          ? event.data.hoursFlownAirframe
          : undefined,
      hoursFlownEngine:
        event.data.hoursFlownEngine && event.data.hoursFlownEngine.trim() !== ""
          ? event.data.hoursFlownEngine
          : undefined,
      usage: event.data.usage || undefined,
      remarks: event.data.remarks || undefined,
    };

    let success = false;
    if (isEditMode.value && props.log) {
      const result = await updateLog(props.log.id, data);
      success = !!result;
    } else {
      const result = await createLog(data);
      success = !!result;
    }

    if (success) {
      toast.add({
        title: "Success",
        description: `Daily log ${isEditMode.value ? "updated" : "created"} successfully.`,
        color: "success",
      });
    }

    emit("close", success);
  } catch (error) {
    toast.add({
      title: "Error",
      description: "Failed to save daily log. Please try again.",
      color: "error",
    });
  }
};

const handleClose = () => {
  emit("close", false);
};

onMounted(() => {
  populateForm();
  // Fetch existing logs to show chips on calendar
  fetchLogs();
});
</script>

<template>
  <UModal :title="isEditMode ? 'Edit Daily Log' : 'Create Daily Log'">
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-6"
        @submit="onSubmit"
      >
        <!-- Basic Information -->
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField label="Record Date" name="recordDate" required>
              <UPopover>
                <UButton
                  color="neutral"
                  variant="subtle"
                  icon="i-lucide-calendar"
                  class="justify-start w-full"
                >
                  {{
                    calendarDate
                      ? df.format(calendarDate.toDate(getLocalTimeZone()))
                      : "Select a date"
                  }}
                </UButton>
                <template #content>
                  <UCalendar
                    v-model="calendarDate"
                    :max-value="maxDate"
                    class="p-2"
                  >
                    <template #day="{ day }">
                      <UChip
                        :show="!!getLogForDate(day as CalendarDate)"
                        color="primary"
                        size="2xs"
                      >
                        {{ day.day }}
                      </UChip>
                    </template>
                  </UCalendar>
                </template>
              </UPopover>
            </UFormField>

            <UFormField label="TLP No" name="tlpNo" required>
              <UInput
                v-model="state.tlpNo"
                placeholder="Enter TLP number"
                required
                class="w-full"
              />
            </UFormField>
          </div>
        </div>

        <!-- Flight Hours -->
        <div class="space-y-4">
          <h4 class="text-md font-medium text-gray-900">Flight Hours</h4>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField
              label="Hours Flown (Airframe)"
              name="hoursFlownAirframe"
            >
              <UInput
                v-model="state.hoursFlownAirframe"
                v-maska="'##:##'"
                placeholder="HH:MM"
                type="text"
                class="w-full font-mono"
              />
            </UFormField>

            <UFormField label="Hours Flown (Engine)" name="hoursFlownEngine">
              <UInput
                v-model="state.hoursFlownEngine"
                v-maska="'##:##'"
                placeholder="HH:MM"
                type="text"
                class="w-full font-mono"
              />
            </UFormField>
          </div>
        </div>

        <!-- Cycles and Landings -->
        <div class="space-y-4">
          <h4 class="text-md font-medium text-gray-900">Cycles and Landings</h4>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <UFormField label="Landings" name="landings">
              <UInput
                v-model="state.landings"
                placeholder="0"
                type="number"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Total Cycles (TC)" name="tc">
              <UInput
                v-model="state.tc"
                placeholder="0"
                type="number"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Number of Starts" name="noOfStarts">
              <UInput
                v-model="state.noOfStarts"
                placeholder="0"
                type="number"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Gas Generator Cycles" name="ggCycle">
              <UInput
                v-model="state.ggCycle"
                placeholder="0"
                type="number"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Free Turbine Cycles" name="ftCycle">
              <UInput
                v-model="state.ftCycle"
                placeholder="0"
                type="number"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Usage" name="usage">
              <UInput
                v-model="state.usage"
                placeholder="0.0"
                type="text"
                class="w-full"
              />
            </UFormField>
          </div>
        </div>

        <!-- Additional Information -->
        <div class="space-y-4">
          <UFormField label="Remarks" name="remarks">
            <UTextarea
              v-model="state.remarks"
              placeholder="Any additional remarks or notes"
              :rows="3"
              class="w-full"
            />
          </UFormField>
        </div>

        <!-- Form Actions -->
        <div class="flex justify-end gap-3 pt-6">
          <UButton @click="handleClose" variant="outline"> Cancel </UButton>
          <UButton type="submit">
            {{ isEditMode ? "Update" : "Create" }} Daily Log
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>

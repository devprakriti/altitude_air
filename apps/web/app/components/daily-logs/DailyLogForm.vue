<script setup lang="ts">
import type { DailyLog, CreateDailyLogData } from "~/composables/useDailyLogs";
import type { FormSubmitEvent } from "@nuxt/ui";
import { z } from "zod";
import {
  CalendarDate,
  DateFormatter,
  getLocalTimeZone,
} from "@internationalized/date";

interface Props {
  log?: DailyLog | null;
}

interface Emits {
  (e: "close", success: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { createLog, updateLog } = useDailyLogs();
const toast = useToast();

// Zod schema for validation
const schema = z.object({
  recordDate: z.string().min(1, "Record date is required"),
  tlpNo: z.string().min(1, "TLP No is required"),
  hoursFlownAirframe: z.string().optional(),
  hoursFlownEngine: z.string().optional(),
  landings: z.number().optional(),
  tc: z.number().optional(),
  noOfStarts: z.number().optional(),
  ggCycle: z.number().optional(),
  ftCycle: z.number().optional(),
  usage: z.string().optional(),
  totalAirframeHr: z.string().optional(),
  totalEngineHrTsn: z.string().optional(),
  totalLandings: z.number().optional(),
  totalTc: z.number().optional(),
  totalNoOfStarts: z.number().optional(),
  totalGgCycleTsn: z.number().optional(),
  totalFtCycleTsn: z.number().optional(),
  remarks: z.string().optional(),
});

type Schema = z.output<typeof schema>;

// Date formatter for display
const df = new DateFormatter("en-US", {
  dateStyle: "medium",
});

// Initialize with today's date
const today = new Date();
const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

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
  totalAirframeHr: undefined,
  totalEngineHrTsn: undefined,
  totalLandings: undefined,
  totalTc: undefined,
  totalNoOfStarts: undefined,
  totalGgCycleTsn: undefined,
  totalFtCycleTsn: undefined,
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

const resetForm = () => {
  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

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
    totalAirframeHr: undefined,
    totalEngineHrTsn: undefined,
    totalLandings: undefined,
    totalTc: undefined,
    totalNoOfStarts: undefined,
    totalGgCycleTsn: undefined,
    totalFtCycleTsn: undefined,
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
      totalAirframeHr: props.log.totalAirframeHr || undefined,
      totalEngineHrTsn: props.log.totalEngineHrTsn || undefined,
      totalLandings: props.log.totalLandings || undefined,
      totalTc: props.log.totalTc || undefined,
      totalNoOfStarts: props.log.totalNoOfStarts || undefined,
      totalGgCycleTsn: props.log.totalGgCycleTsn || undefined,
      totalFtCycleTsn: props.log.totalFtCycleTsn || undefined,
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
      hoursFlownAirframe: event.data.hoursFlownAirframe || undefined,
      hoursFlownEngine: event.data.hoursFlownEngine || undefined,
      usage: event.data.usage || undefined,
      totalAirframeHr: event.data.totalAirframeHr || undefined,
      totalEngineHrTsn: event.data.totalEngineHrTsn || undefined,
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
          <h4 class="text-md font-medium text-gray-900">Basic Information</h4>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField
              label="Record Date"
              name="recordDate"
              required
              class="flex flex-col"
            >
              <UPopover>
                <UButton
                  color="neutral"
                  variant="subtle"
                  icon="i-lucide-calendar"
                  class="justify-start"
                >
                  {{
                    calendarDate
                      ? df.format(calendarDate.toDate(getLocalTimeZone()))
                      : "Select a date"
                  }}
                </UButton>
                <template #content>
                  <UCalendar v-model="calendarDate" class="p-2" />
                </template>
              </UPopover>
            </UFormField>

            <UFormField
              label="TLP No"
              name="tlpNo"
              required
              class="flex flex-col"
            >
              <UInput
                v-model="state.tlpNo"
                placeholder="Enter TLP number"
                required
              />
            </UFormField>
          </div>
        </div>

        <!-- Flight Hours -->
        <div class="space-y-4">
          <h4 class="text-md font-medium text-gray-900">Flight Hours</h4>

          <div
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start"
          >
            <div class="flex flex-col h-full">
              <UFormField
                label="Hours Flown (Airframe)"
                name="hoursFlownAirframe"
              >
                <UInput
                  v-model="state.hoursFlownAirframe"
                  placeholder="0.0"
                  type="number"
                  step="0.1"
                />
              </UFormField>
            </div>

            <div class="flex flex-col h-full">
              <UFormField label="Hours Flown (Engine)" name="hoursFlownEngine">
                <UInput
                  v-model="state.hoursFlownEngine"
                  placeholder="0.0"
                  type="number"
                  step="0.1"
                />
              </UFormField>
            </div>

            <div class="flex flex-col h-full">
              <UFormField label="Total Airframe Hours" name="totalAirframeHr">
                <UInput
                  v-model="state.totalAirframeHr"
                  placeholder="0.0"
                  type="number"
                  step="0.1"
                />
              </UFormField>
            </div>

            <div class="flex flex-col h-full">
              <UFormField
                label="Total Engine Hours (TSN)"
                name="totalEngineHrTsn"
                class="flex-1"
              >
                <UInput
                  v-model="state.totalEngineHrTsn"
                  placeholder="0.0"
                  type="number"
                  step="0.1"
                />
              </UFormField>
            </div>
          </div>
        </div>

        <!-- Cycles and Landings -->
        <div class="space-y-4">
          <h4 class="text-md font-medium text-gray-900">Cycles and Landings</h4>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <UFormField label="Landings" name="landings" class="flex flex-col">
              <UInput v-model="state.landings" placeholder="0" type="number" />
            </UFormField>

            <UFormField
              label="Total Cycles (TC)"
              name="tc"
              class="flex flex-col"
            >
              <UInput v-model="state.tc" placeholder="0" type="number" />
            </UFormField>

            <UFormField
              label="Number of Starts"
              name="noOfStarts"
              class="flex flex-col"
            >
              <UInput
                v-model="state.noOfStarts"
                placeholder="0"
                type="number"
              />
            </UFormField>

            <UFormField
              label="Gas Generator Cycles"
              name="ggCycle"
              class="flex flex-col"
            >
              <UInput v-model="state.ggCycle" placeholder="0" type="number" />
            </UFormField>

            <UFormField
              label="Free Turbine Cycles"
              name="ftCycle"
              class="flex flex-col"
            >
              <UInput v-model="state.ftCycle" placeholder="0" type="number" />
            </UFormField>

            <UFormField
              label="Total Landings"
              name="totalLandings"
              class="flex flex-col"
            >
              <UInput
                v-model="state.totalLandings"
                placeholder="0"
                type="number"
              />
            </UFormField>

            <UFormField label="Total TC" name="totalTc" class="flex flex-col">
              <UInput v-model="state.totalTc" placeholder="0" type="number" />
            </UFormField>

            <UFormField
              label="Total Number of Starts"
              name="totalNoOfStarts"
              class="flex flex-col"
            >
              <UInput
                v-model="state.totalNoOfStarts"
                placeholder="0"
                type="number"
              />
            </UFormField>

            <UFormField
              label="Total GG Cycle (TSN)"
              name="totalGgCycleTsn"
              class="flex flex-col"
            >
              <UInput
                v-model="state.totalGgCycleTsn"
                placeholder="0"
                type="number"
              />
            </UFormField>

            <UFormField
              label="Total FT Cycle (TSN)"
              name="totalFtCycleTsn"
              class="flex flex-col"
            >
              <UInput
                v-model="state.totalFtCycleTsn"
                placeholder="0"
                type="number"
              />
            </UFormField>
          </div>
        </div>

        <!-- Additional Information -->
        <div class="space-y-4">
          <h4 class="text-md font-medium text-gray-900">
            Additional Information
          </h4>

          <UFormField label="Usage" name="usage" class="flex flex-col">
            <UTextarea
              v-model="state.usage"
              placeholder="Describe the flight purpose or usage"
              :rows="3"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Remarks" name="remarks" class="flex flex-col">
            <UTextarea
              v-model="state.remarks"
              placeholder="Any additional remarks or notes"
              :rows="3"
              class="w-full"
            />
          </UFormField>
        </div>
      </UForm>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton @click="handleClose" variant="outline"> Cancel </UButton>
        <UButton type="submit">
          {{ isEditMode ? "Update" : "Create" }} Daily Log
        </UButton>
      </div>
    </template>
  </UModal>
</template>

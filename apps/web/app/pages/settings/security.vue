<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

const { $authClient } = useNuxtApp();
const toast = useToast();
const loading = ref(false);

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type PasswordSchema = z.output<typeof passwordSchema>;

const passwordForm = reactive<Partial<PasswordSchema>>({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});

async function onSubmit(event: FormSubmitEvent<PasswordSchema>) {
  loading.value = true;
  try {
    // Note: better-auth doesn't have a direct changePassword method in the client
    // You would typically implement this on the server side
    const result = await $authClient.changePassword({
      currentPassword: event.data.currentPassword,
      newPassword: event.data.newPassword,
    });

    if (result.error) {
      toast.add({
        title: "Error",
        description: result.error.message,
        icon: "i-lucide-x",
        color: "error",
      });
    } else {
      toast.add({
        title: "Success",
        description: "Password updated successfully.",
        icon: "i-lucide-check",
        color: "success",
      });

      // Reset form
      passwordForm.currentPassword = "";
      passwordForm.newPassword = "";
      passwordForm.confirmPassword = "";
    }
  } catch (error: any) {
    toast.add({
      title: "Error",
      description: error.message || "Failed to update password.",
      icon: "i-lucide-x",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UForm
    id="security"
    :schema="passwordSchema"
    :state="passwordForm"
    @submit="onSubmit"
  >
    <UPageCard
      title="Security"
      description="Manage your password and security settings."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        form="security"
        label="Update password"
        color="neutral"
        type="submit"
        :loading="loading"
        class="w-fit lg:ms-auto"
      />
    </UPageCard>

    <UPageCard variant="subtle">
      <UFormField
        name="currentPassword"
        label="Current Password"
        description="Enter your current password to confirm changes."
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="passwordForm.currentPassword"
          type="password"
          autocomplete="current-password"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="newPassword"
        label="New Password"
        description="Choose a strong password with at least 8 characters."
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="passwordForm.newPassword"
          type="password"
          autocomplete="new-password"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="confirmPassword"
        label="Confirm New Password"
        description="Re-enter your new password to confirm."
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="passwordForm.confirmPassword"
          type="password"
          autocomplete="new-password"
        />
      </UFormField>
    </UPageCard>

    <!-- <UPageCard variant="subtle" class="mt-6">
      <div class="flex items-start gap-3">
        <UIcon name="i-lucide-shield-alert" class="text-orange-500 mt-0.5" />
        <div>
          <h3 class="font-semibold text-gray-900 dark:text-white">
            Two-Factor Authentication
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Add an extra layer of security to your account by enabling
            two-factor authentication.
          </p>
          <UButton
            label="Enable 2FA"
            color="warning"
            variant="outline"
            size="sm"
            class="mt-3"
            disabled
          />
        </div>
      </div>
    </UPageCard> -->

    <!-- <UPageCard variant="subtle" class="mt-6">
      <div class="flex items-start gap-3">
        <UIcon name="i-lucide-monitor" class="text-blue-500 mt-0.5" />
        <div>
          <h3 class="font-semibold text-gray-900 dark:text-white">
            Active Sessions
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your active sessions across different devices.
          </p>
          <UButton
            label="View Sessions"
            color="primary"
            variant="outline"
            size="sm"
            class="mt-3"
            disabled
          />
        </div>
      </div>
    </UPageCard> -->
  </UForm>
</template>

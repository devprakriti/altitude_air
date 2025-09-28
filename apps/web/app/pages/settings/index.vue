<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

const { user, updateProfile } = useAuth();
const fileRef = ref<HTMLInputElement>();

const profileSchema = z.object({
  name: z.string().min(2, "Too short"),
  email: z.string().email("Invalid email"),
  bio: z.string().optional(),
});

type ProfileSchema = z.output<typeof profileSchema>;

const profile = reactive<Partial<ProfileSchema>>({
  name: user.value?.name || "",
  email: user.value?.email || "",
  bio: "",
});

// Update profile when user changes
watch(
  user,
  (newUser) => {
    if (newUser) {
      profile.name = newUser.name || "";
      profile.email = newUser.email || "";
    }
  },
  { immediate: true }
);

const toast = useToast();
const loading = ref(false);

async function onSubmit(event: FormSubmitEvent<ProfileSchema>) {
  loading.value = true;
  try {
    const result = await updateProfile({
      name: event.data.name,
    });

    if (result.success) {
      toast.add({
        title: "Success",
        description: "Your profile has been updated.",
        icon: "i-lucide-check",
        color: "success",
      });
    } else {
      toast.add({
        title: "Error",
        description: result.error?.message || "Failed to update profile.",
        icon: "i-lucide-x",
        color: "error",
      });
    }
  } catch (error: any) {
    toast.add({
      title: "Error",
      description: error.message || "Failed to update profile.",
      icon: "i-lucide-x",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;

  if (!input.files?.length) {
    return;
  }

  // In a real app, you'd upload this to a file storage service
  const file = input.files[0]!;
  const reader = new FileReader();

  reader.onload = async (e) => {
    const result = e.target?.result as string;
    try {
      const updateResult = await updateProfile({ image: result });
      if (updateResult.success) {
        toast.add({
          title: "Success",
          description: "Avatar updated successfully.",
          icon: "i-lucide-check",
          color: "success",
        });
      } else {
        toast.add({
          title: "Error",
          description:
            updateResult.error?.message || "Failed to update avatar.",
          icon: "i-lucide-x",
          color: "error",
        });
      }
    } catch (error: any) {
      toast.add({
        title: "Error",
        description: "Failed to update avatar.",
        icon: "i-lucide-x",
        color: "error",
      });
    }
  };

  reader.readAsDataURL(file);
}

function onFileClick() {
  fileRef.value?.click();
}
</script>

<template>
  <UForm
    id="settings"
    :schema="profileSchema"
    :state="profile"
    @submit="onSubmit"
  >
    <UPageCard
      title="Profile"
      description="These informations will be displayed publicly."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        form="settings"
        label="Save changes"
        color="neutral"
        type="submit"
        :loading="loading"
        class="w-fit lg:ms-auto"
      />
    </UPageCard>

    <UPageCard variant="subtle">
      <UFormField
        name="name"
        label="Name"
        description="Will appear on receipts, invoices, and other communication."
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput v-model="profile.name" autocomplete="off" />
      </UFormField>
      <USeparator />
      <UFormField
        name="email"
        label="Email"
        description="Used to sign in, for email receipts and product updates."
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="profile.email"
          type="email"
          autocomplete="off"
          disabled
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="avatar"
        label="Avatar"
        description="JPG, GIF or PNG. 1MB Max."
        class="flex max-sm:flex-col justify-between sm:items-center gap-4"
      >
        <div class="flex flex-wrap items-center gap-3">
          <UAvatar :src="user?.image" :alt="profile.name" size="lg" />
          <UButton label="Choose" color="neutral" @click="onFileClick" />
          <input
            ref="fileRef"
            type="file"
            class="hidden"
            accept=".jpg, .jpeg, .png, .gif"
            @change="onFileChange"
          />
        </div>
      </UFormField>
      <USeparator />
      <UFormField
        name="bio"
        label="Bio"
        description="Brief description for your profile. URLs are hyperlinked."
        class="flex max-sm:flex-col justify-between items-start gap-4"
        :ui="{ container: 'w-full' }"
      >
        <UTextarea v-model="profile.bio" :rows="5" autoresize class="w-full" />
      </UFormField>
    </UPageCard>
  </UForm>
</template>

import { createSharedComposable } from '@vueuse/core'

const _useDashboard = () => {
  const route = useRoute()
  const isNotificationsSlideoverOpen = ref(false)

  defineShortcuts({
    'g-h': () => navigateTo('/'),
    'g-t': () => navigateTo('/todos'),
    'g-d': () => navigateTo('/daily-logs'),
    'g-i': () => navigateTo('/inbox'),
    'g-c': () => navigateTo('/customers'),
    'g-s': () => navigateTo('/settings'),
    'n': () => isNotificationsSlideoverOpen.value = !isNotificationsSlideoverOpen.value
  })

  watch(() => route.fullPath, () => {
    isNotificationsSlideoverOpen.value = false
  })

  return {
    isNotificationsSlideoverOpen
  }
}

export const useDashboard = createSharedComposable(_useDashboard)

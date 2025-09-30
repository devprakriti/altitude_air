export default defineNuxtPlugin(async () => {
  const authStore = useAuthStore()
  
  // Initialize auth state on app start
  await authStore.initializeAuth()
})

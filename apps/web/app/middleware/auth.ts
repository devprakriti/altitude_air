export default defineNuxtRouteMiddleware(async (to, from) => {
	const authStore = useAuthStore();

	// Protected routes that require authentication
	const protectedRoutes = ['/', '/todos', '/customers', '/inbox', '/settings'];
	const isProtectedRoute = protectedRoutes.some(route => to.path.startsWith(route));

	// Admin-only routes
	const adminRoutes = ['/settings/members'];
	const isAdminRoute = adminRoutes.some(route => to.path.startsWith(route));

	// If auth is still loading, wait for it to complete
	if (authStore.isLoading) {
		// Wait for auth initialization to complete
		await new Promise((resolve) => {
			const unwatch = watch(() => authStore.isLoading, (isLoading) => {
				if (!isLoading) {
					unwatch()
					resolve(true)
				}
			}, { immediate: true })
		})
	}

	// If user is not authenticated and trying to access protected route
	if (!authStore.isAuthenticated && isProtectedRoute) {
		return navigateTo('/login');
	}

	// If user is authenticated and trying to access login page, redirect to homepage
	if (authStore.isAuthenticated && to.path === '/login') {
		return navigateTo('/');
	}

	// If user is authenticated but not admin and trying to access admin routes
	if (authStore.isAuthenticated && isAdminRoute && !authStore.isAdmin) {
		throw createError({
			statusCode: 403,
			statusMessage: 'Access denied. Admin privileges required.'
		});
	}
});

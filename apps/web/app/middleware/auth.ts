export default defineNuxtRouteMiddleware(async (to, from) => {
	const authStore = useAuthStore();

	// Protected routes that require authentication
	const protectedRoutes = ['/', '/todos', '/customers', '/inbox', '/settings'];
	const isProtectedRoute = protectedRoutes.some(route => to.path.startsWith(route));

	// Admin-only routes
	const adminRoutes = ['/settings/members'];
	const isAdminRoute = adminRoutes.some(route => to.path.startsWith(route));

	// If trying to access protected route and session is still loading, redirect to login
	if (isProtectedRoute && authStore.isLoading) {
		return navigateTo('/login');
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

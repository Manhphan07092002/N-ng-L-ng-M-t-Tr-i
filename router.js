/**
 * @file router.js
 * @description Handles client-side routing for the single-page application.
 * Fetches and displays page content dynamically without full page reloads.
 */

// Function to navigate to a new URL and trigger the router
const navigateTo = url => {
    history.pushState(null, null, url);
    router();
};

// The main router function
const router = async () => {
    const routes = [
        { path: "/", view: 'pages/home.html' },
        { path: "/about", view: 'pages/about.html' },
        { path: "/services", view: 'pages/services.html' },
        { path: "/projects", view: 'pages/projects.html' },
        { path: "/phan_tich", view: 'pages/phan_tich.html' },
        { path: "/lich_su", view: 'pages/lich_su.html' }
    ];

    // Find the current route that matches the URL path
    const potentialMatches = routes.map(route => {
        return {
            route: route,
            isMatch: location.pathname === route.path
        };
    });

    let match = potentialMatches.find(potentialMatch => potentialMatch.isMatch);

    // If no match is found, redirect to the homepage (404 handling)
    if (!match) {
        match = { route: routes[0], isMatch: true };
        history.pushState(null, null, "/");
    }

    const appContent = document.getElementById("app-content");
    if (appContent) {
        try {
            // Fetch the HTML content for the matched route
            const response = await fetch(match.route.view);
            if (!response.ok) throw new Error('Page not found');
            
            // Inject the HTML into the main content area
            appContent.innerHTML = await response.text();
            
            // After loading content, call the initializer function from app.js
            // This will run page-specific JavaScript
            if (typeof initializePageContent === 'function') {
                initializePageContent(location.pathname);
            }
        } catch (error) {
            console.error("Failed to fetch page: ", error);
            appContent.innerHTML = "<h1>404 - Not Found</h1><p>Could not load the page.</p>";
        }
    }
};

// Listen for browser back/forward button clicks
window.addEventListener("popstate", router);

// Main event listener for DOM content loaded
document.addEventListener("DOMContentLoaded", () => {
    // Intercept clicks on navigation links
    document.body.addEventListener("click", e => {
        // Find the closest ancestor `<a>` tag with data-link attribute
        const link = e.target.closest('a[data-link]');
        if (link) {
            e.preventDefault();
            navigateTo(link.href);
        }
    });

    // Initial route handling on page load
    router();
});

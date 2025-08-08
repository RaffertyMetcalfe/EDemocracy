document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Define DOM elements ---
    const welcomeMessageElement = document.getElementById('welcome-message');
    const profileDataElement = document.getElementById('profile-data');
    const logoutButton = document.getElementById('logout-button');
    const errorContainer = document.getElementById('error-container');

    // --- 2. Route Guard ---
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // --- 3. Fetch Protected Data from the Server ---
    const fetchProfileData = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                const user = data.user;
                welcomeMessageElement.textContent = `Welcome, ${user.Username}!`;
                
                profileDataElement.textContent = JSON.stringify(user, null, 2);

            } else {
                errorContainer.textContent = `Error: ${data.error || 'Could not fetch profile.'}`;
                errorContainer.style.display = 'block';

                // TODO: Log the user out if their token becomes invalid.I
            }

        } catch (error) {
            console.error('Network or fetch error:', error);
            errorContainer.textContent = 'Could not connect to the server. Please try again later.';
            errorContainer.style.display = 'block';
        }
    };
    
    // --- 4. Logout Functionality ---
    const handleLogout = () => {
        localStorage.removeItem('authToken');
        window.location.href = 'login.html';
    };

    // --- 5. Attach Event Listeners and Execute ---
    logoutButton.addEventListener('click', handleLogout);
    fetchProfileData();

});
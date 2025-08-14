document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Define DOM elements ---
    const feedContainer = document.getElementById('feed-container');
    const logoutButton = document.getElementById('logout-button');
    const errorContainer = document.getElementById('error-container');

    // --- 2. Route Guard ---
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    function createPollCard(poll) {
        const card = document.createElement('div');
        card.className = 'poll-card'; // Might add CSS for this class later

        const title = document.createElement('h3');
        title.className = 'poll-title';
        title.textContent = poll.Title;

        const meta = document.createElement('p');
        meta.className = 'poll-meta';
        // Use toLocaleString for a nicer date format
        const date = new Date(poll.CreationTimestamp).toLocaleString();
        meta.textContent = `Posted by ${poll.AuthorUsername} on ${date}`;

        const optionsList = document.createElement('ul');
        optionsList.className = 'poll-options';

        poll.Options.forEach(option => {
            const optionItem = document.createElement('li');
            optionItem.textContent = `${option.OptionText} (${option.VoteCount} votes)`;
            optionsList.appendChild(optionItem);
        });

        card.appendChild(title);
        card.appendChild(meta);
        card.appendChild(optionsList);

        return card;
}

const fetchFeed = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/feed', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const polls = await response.json();

            if (response.ok) {
                // Clear any previous content
                feedContainer.innerHTML = ''; 

                if (polls.length === 0) {
                    feedContainer.textContent = 'No polls have been created yet.';
                } else {
                    // For each poll object, create a card and append it to the container
                    polls.forEach(poll => {
                        const pollCard = createPollCard(poll);
                        feedContainer.appendChild(pollCard);
                    });
                }
            } else {
                // If token is invalid or another server error occurs
                handleLogout(); // An invalid token means we should log out
            }

        } catch (error) {
            console.error('Network or fetch error:', error);
            errorContainer.textContent = 'Could not connect to the server. Please try again later.';
            errorContainer.style.display = 'block';
        }
    };
    
    // --- 5. Logout Functionality ---
    const handleLogout = () => {
        localStorage.removeItem('authToken');
        window.location.href = 'login.html';
    };

    // --- 6. Attach Event Listeners and Execute ---
    logoutButton.addEventListener('click', handleLogout);
    fetchFeed(); // Initial call to load the feed

});
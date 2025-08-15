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
        card.className = 'poll-card';
        card.dataset.postId = poll.PostId;

        const title = document.createElement('h3');
        title.className = 'poll-title';
        title.textContent = poll.Title;

        const meta = document.createElement('p');
        meta.className = 'poll-meta';
        // Use toLocaleString for a nicer date format
        const date = new Date(poll.CreationTimestamp).toLocaleString();
        meta.textContent = `Posted by ${poll.AuthorUsername} on ${date}`;

        const form = document.createElement('form');
        form.className = 'poll-options';

        poll.Options.forEach(option => {
            // Create a container for each option line
            const optionContainer = document.createElement('div');
            optionContainer.className = 'option-container';

            // Create the radio button input
            const radioInput = document.createElement('input');
            radioInput.type = 'radio';
            radioInput.name = `poll-${poll.PostID}`; // Groups radio buttons for one poll
            radioInput.value = option.OptionID;      // The value to be sent to the server
            radioInput.id = `option-${option.OptionID}`; // Unique ID for the label to point to

            // Create the label for the radio button
            const label = document.createElement('label');
            label.htmlFor = `option-${option.OptionID}`;
            label.textContent = option.OptionText;

            // Create a span to show the vote count
            const voteCount = document.createElement('span');
            voteCount.className = 'vote-count';
            voteCount.textContent = `(${option.VoteCount} votes)`;

            // Append the input, label, and vote count to their container
            optionContainer.appendChild(radioInput);
            optionContainer.appendChild(label);
            optionContainer.appendChild(voteCount);
            
            // Add the whole option line to the form
            form.appendChild(optionContainer);
        });
        const submitButton = document.createElement('button');
        submitButton.type = 'submit';
        submitButton.textContent = 'Submit Vote';
        submitButton.className = 'vote-button';

        const voteMessage = document.createElement('div');
        voteMessage.className = 'vote-message';

        form.appendChild(submitButton);
        form.appendChild(voteMessage);

        if (poll.userHasVoted) {
        form.querySelectorAll('input[type="radio"]').forEach(input => {
            input.disabled = true;
        });
        submitButton.disabled = true;
        submitButton.textContent = 'Voted!';
    }

        card.appendChild(title);
        card.appendChild(meta);
        card.appendChild(form);

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
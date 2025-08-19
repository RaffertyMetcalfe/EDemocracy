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

    function createPostCard(post) {
        const card = document.createElement('div');
        card.className = 'post-card'; 
        card.dataset.postId = post.PostID;

        const title = document.createElement('h3');
        title.className = 'post-title'; 
        title.textContent = post.Title;

        const meta = document.createElement('p');
        meta.className = 'post-meta'; 
        const date = new Date(post.CreationTimestamp).toLocaleString();
        meta.textContent = `Posted by ${post.AuthorUsername} on ${date}`;

        const content = document.createElement('div');
        content.className = 'post-content';

        // Inject type-specific content
        if (post.PostType === "Poll") {
            content.appendChild(createPollContent(post));
        } else if (post.PostType === "Announcement") {
            content.appendChild(createAnnouncementContent(post));
        } else if (post.PostType === "ForumTopic") {
            content.appendChild(createTopicContent(post));
        }

        card.appendChild(title);
        card.appendChild(meta);
        card.appendChild(content);

        return card;
    }

    function createPollContent(poll) {
        const form = document.createElement('form');
        form.className = 'poll-options';

        poll.Options.forEach(option => {
            const optionContainer = document.createElement('div');
            optionContainer.className = 'option-container';

            const radioInput = document.createElement('input');
            radioInput.type = 'radio';
            radioInput.name = `poll-${poll.PostID}`;
            radioInput.value = option.OptionID;
            radioInput.id = `option-${option.OptionID}`;

            const label = document.createElement('label');
            label.htmlFor = radioInput.id;
            label.textContent = option.OptionText;

            const voteCount = document.createElement('span');
            voteCount.className = 'vote-count';
            voteCount.textContent = `(${option.VoteCount} votes)`;

            optionContainer.appendChild(radioInput);
            optionContainer.appendChild(label);
            optionContainer.appendChild(voteCount);
            form.appendChild(optionContainer);
        });

        const submitButton = document.createElement('button');
        submitButton.type = 'submit';
        submitButton.textContent = poll.userHasVoted ? 'Voted!' : 'Submit Vote';
        submitButton.className = 'vote-button';
        if (poll.userHasVoted) submitButton.disabled = true;

        const voteMessage = document.createElement('div');
        voteMessage.className = 'vote-message';

        form.appendChild(submitButton);
        form.appendChild(voteMessage);

        if (poll.userHasVoted) {
            form.querySelectorAll('input[type="radio"]').forEach(input => input.disabled = true);
        }

        return form;
    }

    function createAnnouncementContent(post) {
        const content = document.createElement('p');
        content.className = 'announcement-content';
        content.textContent = post.Content;
        return content;
    }

    function createTopicContent(post) {
        const content = document.createElement('p');
        content.className = 'forum-topic-content';
        content.textContent = post.Content || 'No content provided for this topic.';
        // Forum will be implemented later
        return content;
    }
    const fetchFeed = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/feed', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const posts = await response.json();
            if (response.ok) {
                // Clear any previous content
                feedContainer.innerHTML = ''; 
                if (posts.length === 0) {
                    feedContainer.textContent = 'No polls have been created yet.';
                } else {
                    // For each post object, handle based on its type
                    posts.forEach(post => {
                        const postCard = createPostCard(post);
                        feedContainer.appendChild(postCard);
                    });
                }
            } else {
                // If token is invalid or another server error occurs
                handleLogout();
            }

        } catch (error) {
            console.error('Network or fetch error:', error);
            errorContainer.textContent = 'Could not connect to the server. Please try again later.';
            errorContainer.style.display = 'block';
        }
    };

    feedContainer.addEventListener("submit", async e => {
        if(e.target && e.target.classList.contains("poll-options")){
            e.preventDefault();

            const form = e.target;
            const selectedOption = form.querySelector("input[type='radio']:checked");
            const postId = form.closest(".post-card").dataset.postId;
            const voteMessage = form.querySelector(".vote-message");

            if(!selectedOption){
                voteMessage.textContent = "Please select an option before voting.";
                return;
            }

            try {
                const response = await fetch("http://localhost:5000/api/vote", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        PostId: postId,
                        OptionId: selectedOption.value
                    })
                });

                if(response.ok){
                    voteMessage.textContent = "Vote submitted successfully!";
                    // Disable further voting on this poll
                    form.querySelectorAll("input[type='radio']").forEach(input => input.disabled = true);
                    form.querySelector(".vote-button").disabled = true;
                    form.querySelector(".vote-button").textContent = "Voted!";
                } else {
                    const err = await response.json();
                    voteMessage.textContent = err.message || "Failed to submit vote.";
                }
            } catch(err){
                console.error("Vote error:", err);
                voteMessage.textContent = "Could not submit vote. Try again later.";
            }
        }
    });
        
    // --- 5. Logout Functionality ---
    const handleLogout = () => {
        localStorage.removeItem('authToken');
        window.location.href = 'login.html';
    };

    // --- 6. Attach Event Listeners and Execute ---
    logoutButton.addEventListener('click', handleLogout);
    fetchFeed(); // Initial call to load the feed
});
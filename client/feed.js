document.addEventListener("DOMContentLoaded", () => {
    // --- 1. Define DOM elements ---
    const feedContainer = document.getElementById("feed-container");
    const logoutButton = document.getElementById("logout-button");
    const errorContainer = document.getElementById("error-container");

    // --- 2. Route Guard ---
    const token = localStorage.getItem("authToken");
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    function createPostCard(post) {
        const card = document.createElement("div");
        card.className = "post-card";
        card.dataset.postId = post.PostID;

        const title = document.createElement("h3");
        title.className = "post-title";
        title.textContent = post.Title;

        const meta = document.createElement("p");
        meta.className = "post-meta";
        const date = new Date(post.CreationTimestamp).toLocaleString();
        meta.textContent = `Posted by ${post.AuthorUsername} on ${date}`;

        const content = document.createElement("div");
        content.className = "post-content";

        // Inject type-specific content
        if (post.PostType === "Poll") {
            content.appendChild(createPollContent(post));
        } else if (post.PostType === "Announcement") {
            content.appendChild(createAnnouncementContent(post));
        } else if (post.PostType === "ForumTopic") {
            content.appendChild(createTopicContent(post));
        } else if (post.PostType === "VoteItem") {
            content.appendChild(createItemVoteContent(post));
        }

        card.appendChild(title);
        card.appendChild(meta);
        card.appendChild(content);
        card.appendChild(createCommentSection(post));

        return card;
    }

    function createPollContent(post) {
        const form = document.createElement("form");
        form.className = "poll-options";

        post.Options.forEach((option) => {
            const optionContainer = document.createElement("div");
            optionContainer.className = "option-container";

            const radioInput = document.createElement("input");
            radioInput.type = "radio";
            radioInput.name = `poll-${post.PostID}`;
            radioInput.value = option.OptionID;
            radioInput.id = `option-${option.OptionID}`;

            const label = document.createElement("label");
            label.htmlFor = radioInput.id;
            label.textContent = option.OptionText;

            const voteCount = document.createElement("span");
            voteCount.className = "vote-count";
            voteCount.textContent = `(${option.VoteCount} votes)`;

            optionContainer.appendChild(radioInput);
            optionContainer.appendChild(label);
            optionContainer.appendChild(voteCount);
            form.appendChild(optionContainer);
        });

        const submitButton = document.createElement("button");
        submitButton.type = "submit";
        submitButton.textContent = post.userHasVoted ? "Voted!" : "Submit Vote";
        submitButton.className = "vote-button";
        if (post.userHasVoted) submitButton.disabled = true;

        const voteMessage = document.createElement("div");
        voteMessage.className = "vote-message";

        form.appendChild(submitButton);
        form.appendChild(voteMessage);

        if (post.userHasVoted) {
            form.querySelectorAll('input[type="radio"]').forEach(
                (input) => (input.disabled = true),
            );
        }

        return form;
    }

    function createAnnouncementContent(post) {
        const content = document.createElement("p");
        content.className = "announcement-content";
        content.textContent = post.Content;
        return content;
    }

    function createTopicContent(post) {
        const content = document.createElement("p");
        content.className = "forum-topic-content";
        content.textContent =
            post.Content || "No content provided for this topic.";
        // Forum will be implemented later
        return content;
    }

    function createItemVoteContent(post) {
        const form = document.createElement("form");
        form.className = "item-vote-options";

        if (post.voteAuthToken) {
            form.dataset.voteAuthToken = post.voteAuthToken;
        }

        const contentText = document.createElement("p");
        contentText.textContent = post.Content;
        form.appendChild(contentText);

        const voteTypes = ["For", "Against", "Abstain"];
        voteTypes.forEach((voteType) => {
            const optionContainer = document.createElement("div");
            optionContainer.className = "option-container";

            const radioInput = document.createElement("input");
            radioInput.type = "radio";
            radioInput.name = `item-vote-${post.PostID}`;
            radioInput.value = voteType;
            radioInput.id = `item-vote-${post.PostID}-${voteType}`;

            const label = document.createElement("label");
            label.htmlFor = radioInput.id;

            const voteCount = post.VoteCounts
                ? post.VoteCounts[voteType] || 0
                : 0;
            label.textContent = `${voteType} (${voteCount} votes)`;

            optionContainer.appendChild(radioInput);
            optionContainer.appendChild(label);
            form.appendChild(optionContainer);
        });

        const submitButton = document.createElement("button");
        submitButton.type = "submit";
        submitButton.textContent = "Submit Final Vote";
        submitButton.className = "vote-button";

        const voteMessage = document.createElement("div");
        voteMessage.className = "vote-message";

        form.appendChild(submitButton);
        form.appendChild(voteMessage);

        if (post.userHasVoted) {
            form.querySelectorAll('input[type="radio"]').forEach((input) => {
                input.disabled = true;
                if (input.value === post.userVoteType) {
                    input.checked = true;
                }
            });
            submitButton.disabled = true;
            submitButton.textContent = "Voted!";
        }
        return form;
    }

    function createCommentSection(post) {
        const section = document.createElement("div");
        section.className = "comments-section";

        const toggleBtn = document.createElement("button");
        toggleBtn.className = "toggle-comments-btn";
        toggleBtn.textContent =
            post.CommentCount > 0
                ? `View Comments (${post.CommentCount})`
                : "Add a Comment";

        const commentsContainer = document.createElement("div");
        commentsContainer.className = "comments-container";
        commentsContainer.style.display = "none"; // Hidden by default
        commentsContainer.dataset.loadedPages = 0;
        commentsContainer.dataset.postId = post.PostID;

        const list = document.createElement("div");
        list.className = "comments-list";
        commentsContainer.appendChild(list);

        const loadMoreBtn = document.createElement("button");
        loadMoreBtn.className = "load-more-comments-btn";
        loadMoreBtn.textContent = "Load More";
        loadMoreBtn.style.display = "none";

        const form = document.createElement("form");
        form.className = "comment-form";
        form.dataset.postId = post.PostID;
        form.innerHTML = `
            <textarea name="comment" placeholder="Write your comment..." rows="1" required></textarea>
            <button type="submit">Submit Comment</button>
        `;

        commentsContainer.appendChild(loadMoreBtn);
        commentsContainer.appendChild(form);

        toggleBtn.addEventListener("click", () => {
            if (commentsContainer.style.display === "none") {
                commentsContainer.style.display = "block";
                toggleBtn.textContent = "Hide Comments";

                if (
                    post.CommentCount > 0 &&
                    commentsContainer.dataset.loadedPages === "0"
                ) {
                    fetchComments(post.PostID, 1, list, loadMoreBtn);
                }
            } else {
                commentsContainer.style.display = "none";
                toggleBtn.textContent =
                    post.CommentCount > 0
                        ? `View Comments (${post.CommentCount})`
                        : "Add a Comment";
            }
        });

        loadMoreBtn.addEventListener("click", () => {
            const nextPage =
                parseInt(commentsContainer.dataset.loadedPages) + 1;
            fetchComments(post.PostID, nextPage, list, loadMoreBtn);
        });

        section.appendChild(toggleBtn);
        section.appendChild(commentsContainer);
        return section;
    }

    async function fetchComments(postId, page, listElement, loadMoreBtn) {
        try {
            loadMoreBtn.textContent = "Loading...";
            const response = await fetch(
                `http://localhost:5000/api/posts/${postId}/comments?page=${page}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );
            const data = await response.json();

            if (response.ok) {
                data.comments.forEach((comment) => {
                    const el = document.createElement("div");
                    el.className = "comment-item";
                    el.innerHTML = `
                        <strong>${comment.Username}</strong>:
                        <span>${comment.Content}</span>
                        <div class="comment-date">${new Date(comment.Timestamp).toLocaleString()}</div>
                    `;
                    listElement.appendChild(el);
                });

                if (data.nextPage) {
                    loadMoreBtn.style.display = "block";
                    loadMoreBtn.textContent = "Load More";
                } else {
                    loadMoreBtn.style.display = "none";
                }
            }
        } catch (error) {
            console.error("Error fetching comments:", error);
            loadMoreBtn.textContent = "Error loading";
        }
    }

    const fetchFeed = async () => {
        try {
            const response = await fetch("http://localhost:5000/api/feed", {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` },
            });

            const posts = await response.json();
            if (response.ok) {
                // Clear any previous content
                feedContainer.innerHTML = "";
                if (posts.length === 0) {
                    feedContainer.textContent = "Nothing here at the moment...";
                } else {
                    // For each post object, handle based on its type
                    posts.forEach((post) => {
                        const postCard = createPostCard(post);
                        feedContainer.appendChild(postCard);
                    });
                }
            } else {
                // If token is invalid or another server error occurs
                handleLogout();
            }
        } catch (error) {
            console.error("Network or fetch error:", error);
            errorContainer.textContent =
                "Could not connect to the server. Please try again later.";
            errorContainer.style.display = "block";
        }
    };

    feedContainer.addEventListener("submit", async (e) => {
        e.preventDefault();

        const form = e.target;

        if (form.classList.contains("comment-form")) {
            const postId = form.dataset.postId;
            const textarea = form.querySelector("textarea");
            const btn = form.querySelector("button");

            if (!textarea.value.trim()) return;

            btn.disabled = true;

            try {
                const response = await fetch(
                    "http://localhost:5000/api/comments",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            postId: postId,
                            content: textarea.value,
                        }),
                    },
                );

                if (response.ok) {
                    const list =
                        form.parentElement.querySelector(".comments-list");

                    const el = document.createElement("div");
                    el.className = "comment-item highlight-new";
                    el.innerHTML = `
                        <strong>You</strong>: 
                        <span>${textarea.value}</span>
                        <div class="comment-date">Just now</div>
                    `;
                    list.appendChild(el);

                    textarea.value = "";
                }
            } catch (err) {
                console.error(err);
                alert("Error posting comment");
            } finally {
                btn.disabled = false;
            }
            return;
        }

        const card = form.closest(".post-card");
        const selectedOption = form.querySelector(
            "input[type='radio']:checked",
        );
        const postId = card.dataset.postId;
        const voteMessage = form.querySelector(".vote-message");

        if (!selectedOption) {
            voteMessage.textContent = "Please select an option before voting.";
            return;
        }
        if (form.classList.contains("poll-options")) {
            try {
                const response = await fetch("http://localhost:5000/api/vote", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        PostId: postId,
                        OptionId: selectedOption.value,
                    }),
                });

                if (response.ok) {
                    voteMessage.textContent = "Vote submitted successfully!";
                    // Disable further voting on this poll
                    form.querySelectorAll("input[type='radio']").forEach(
                        (input) => (input.disabled = true),
                    );
                    form.querySelector(".vote-button").disabled = true;
                    form.querySelector(".vote-button").textContent = "Voted!";
                } else {
                    const err = await response.json();
                    voteMessage.textContent =
                        err.message || "Failed to submit vote.";
                }
            } catch (err) {
                console.error("Vote error:", err);
                voteMessage.textContent =
                    "Could not submit vote. Try again later.";
            }
        } else if (form.classList.contains("item-vote-options")) {
            const voteAuthToken = form.dataset.voteAuthToken;
            if (!voteAuthToken) {
                voteMessage.textContent =
                    "Cannot vote: missing authorization token.";
                return;
            }
            try {
                const response = await fetch(
                    "http://localhost:5000/api/item-votes",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            PostId: postId,
                            Choice: selectedOption.value,
                            AuthToken: voteAuthToken,
                        }),
                    },
                );
                if (response.ok) {
                    voteMessage.textContent = "Final vote recorded!";
                    form.querySelectorAll("input, button").forEach(
                        (el) => (el.disabled = true),
                    );
                    form.querySelector(".vote-button").textContent = "Voted!";
                } else {
                    const err = await response.json();
                    voteMessage.textContent =
                        err.error || "Failed to record vote.";
                }
            } catch (err) {
                console.error("Item vote error:", err);
                voteMessage.textContent = "Could not record vote.";
            }
        }
    });

    // --- 5. Logout Functionality ---
    const handleLogout = () => {
        localStorage.removeItem("authToken");
        window.location.href = "login.html";
    };

    // --- 6. Attach Event Listeners and Execute ---
    logoutButton.addEventListener("click", handleLogout);
    fetchFeed(); // Initial call to load the feed
});

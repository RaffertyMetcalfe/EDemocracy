document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("create-post-form");
    const postTypeSelect = document.getElementById("post-type-select");
    const titleInput = document.getElementById("post-title");

    const contentSection = document.getElementById("content-section");
    const contentTextarea = document.getElementById("post-content");

    const pollSection = document.getElementById("poll-options-section");
    const pollOptionsContainer = document.getElementById(
        "poll-options-container",
    );
    const addOptionBtn = document.getElementById("add-option-btn");

    const messageContainer = document.getElementById("message-container");

    // Load user role and disable restricted options for Citizens
    async function loadUserRole() {
        const token = localStorage.getItem("authToken");
        if (!token) {
            return;
        }

        try {
            const response = await fetch("http://localhost:5000/api/profile", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                const userRole = data.user.Role;

                // Disable Announcement and VoteItem for Citizens
                if (userRole === "Citizen") {
                    const announcementOption = postTypeSelect.querySelector(
                        'option[value="Announcement"]',
                    );
                    const voteItemOption = postTypeSelect.querySelector(
                        'option[value="VoteItem"]',
                    );
                    if (announcementOption) announcementOption.disabled = true;
                    if (voteItemOption) voteItemOption.disabled = true;
                }
            }
        } catch (error) {
            console.error("Error loading user role:", error);
        }
    }

    loadUserRole();

    postTypeSelect.addEventListener("change", () => {
        const selectedType = postTypeSelect.value;

        contentSection.style.display = "none";
        pollSection.style.display = "none";

        if (selectedType === "Announcement" || selectedType === "ForumTopic") {
            contentSection.style.display = "block";
        } else if (selectedType === "Poll") {
            pollSection.style.display = "block";
            if (pollOptionsContainer.children.length === 0) {
                addPollOptionInput();
                addPollOptionInput();
            }
        }
    });

    function addPollOptionInput() {
        const input = document.createElement("input");
        input.type = "text";
        input.className = "poll-option-input";
        input.placeholder = "Enter option text";
        input.size = "40";
        pollOptionsContainer.appendChild(input);
        pollOptionsContainer.appendChild(document.createElement("br"));
    }

    addOptionBtn.addEventListener("click", addPollOptionInput);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const token = localStorage.getItem("authToken");
        if (!token) {
            messageContainer.textContent =
                "ERROR: You are not logged in. Please log in to create a post.";
            messageContainer.style.color = "red";
            return;
        }

        const postType = postTypeSelect.value;
        const title = titleInput.value;

        if (!postType || !title) {
            messageContainer.textContent =
                "Please select a post type and enter a title.";
            messageContainer.style.color = "red";
            return;
        }

        const payload = {
            postType: postType,
            title: title,
            allowComments: !document.getElementById("disable-comments").checked,
        };

        if (postType === "Poll") {
            const options = Array.from(
                document.getElementsByClassName("poll-option-input"),
            )
                .map((input) => input.value)
                .filter((value) => value.trim() !== "");
            if (options.length < 2) {
                messageContainer.textContent =
                    "Polls must have at least two non-empty options.";
                messageContainer.style.color = "red";
                return;
            }
            payload.options = options;
        } else if (postType === "Announcement" || postType === "ForumTopic") {
            payload.content = contentTextarea.value;
        }

        try {
            const response = await fetch("http://localhost:5000/api/posts", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (response.ok) {
                messageContainer.textContent =
                    "Post created successfully! Redirecting to feed...";
                messageContainer.style.color = "green";
                setTimeout(() => {
                    window.location.href = "feed.html";
                }, 1500);
            } else {
                messageContainer.textContent = `Error: ${result.error || "Failed to create post."}`;
                messageContainer.style.color = "red";
            }
        } catch (error) {
            console.error("Create post error:", error);
            messageContainer.textContent =
                "A network error occurred. Could not connect to the server.";
            messageContainer.style.color = "red";
        }
    });
});

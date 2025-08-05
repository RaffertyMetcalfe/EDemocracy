document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('login-form');
    const messageContainer = document.getElementById('message-container');

    form.addEventListener('submit', async (event) => {
        
        // Prevent the default browser action of refreshing the page on form submission
        event.preventDefault();

        // Get the values from the input fields
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Send the data to the backend API
        try {
            const response = await fetch('http://localhost:5000/api/users/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            console.log('Server response:', data);

            if (response.ok && data.token) {
                localStorage.setItem('authToken', data.token);
                console.log('Login successful!');
                messageContainer.textContent = data.message || 'Login successful!';
                messageContainer.classList.add('success');
                window.location.href = 'feed.html';
            } else {
                const errorMsg = data.error || data.message || 'Login failed. Please try again.';
                console.error('Login failed:', data.error);
                messageContainer.textContent = errorMsg;
                messageContainer.classList.add('error');
                form.reset();
            }

        } catch (error) {
            messageContainer.textContent = 'Could not connect to the server. Please try again later.';
            messageContainer.classList.add('error-message');
            console.error('An error occurred:', error);
        }
    });
});
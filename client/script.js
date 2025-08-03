document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('register-form');
    const messageContainer = document.getElementById('message-container');

    form.addEventListener('submit', async (event) => {
        
        // Prevent the default browser action of refreshing the page on form submission
        event.preventDefault();

        // Get the values from the input fields
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Send the data to the backend API
        try {
            const response = await fetch('http://localhost:5000/api/users/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    email: email,
                    password: password
                })
            });

            const result = await response.json();

            console.log('Server response:', result);
            
            if (response.ok) {
                console.log('Registration successful!');
                messageContainer.textContent = result.message || 'Registration successful!';
                messageContainer.classList.add('success');
            } else {
                console.error('Registration failed:', result.error);
                messageContainer.textContent = result.message || 'Registration failed. Please try again.';
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
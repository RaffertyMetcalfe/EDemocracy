const token = localStorage.getItem('authToken');
fetch('/api/profile', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
});
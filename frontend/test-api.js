// Test API connection
import api from '../src/common/utils/axiosetup';

console.log('API Base URL:', api.defaults.baseURL);
console.log('Environment VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);

// Test the connection
api.get('/authentication/test/')
  .then(response => console.log('✅ API Connected:', response.status))
  .catch(error => console.log('❌ API Error:', error.message));
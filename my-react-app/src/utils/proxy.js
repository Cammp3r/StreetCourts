class AuthProxy {
  constructor() {
    this.authMethod = null; 
    this.credential = null; 
  }

  setStrategy(method, credential) {
    this.authMethod = method;
    this.credential = credential;
  }

  async request(url, options = {}) {
    const headers = { ...options.headers };

    if (this.credential) {
      switch (this.authMethod) {
        case 'JWT':
        case 'OAuth':
          headers['Authorization'] = `Bearer ${this.credential}`;
          break;
        case 'API_KEY':
          headers['x-api-key'] = this.credential;
          break;
        default:
          console.warn(`Невідомий метод авторизації: ${this.authMethod}`);
      }
    }

    const modifiedOptions = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, modifiedOptions);
      
      if (response.status === 401) {
        console.error('Помилка 401: Доступ заборонено (можливо, токен прострочений)');
      }

      return response;
    } catch (error) {
      console.error('Мережева помилка в AuthProxy:', error);
      throw error;
    }
  }

  async get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  async post(url, body, options = {}) {
    return this.request(url, { 
      ...options, 
      method: 'POST', 
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', ...options.headers }
    });
  }
}
const API_BASE_URL = 'http://localhost:57812/api';

export const api = {
  // ========== АВТОРИЗАЦИЯ ==========
  
  // Регистрация нового пользователя
  register: (data) => {
    return fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json());
  },

  // Вход в систему
  login: (data) => {
    return fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json());
  },

  // Обновление access токена
  refreshToken: (refreshToken) => {
    return fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    }).then(res => res.json());
  },

  // ========== ПОЛЬЗОВАТЕЛИ ==========
  
  // Получить текущего пользователя (требуется авторизация)
  getCurrentUser: (token) => {
    return fetch(`${API_BASE_URL}/users/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());
  },

  // Обновить профиль пользователя
  updateCurrentUser: (token, data) => {
    return fetch(`${API_BASE_URL}/users/me`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }).then(res => res.json());
  },

  // Получить профиль соискателя
  getApplicantProfile: (token) => {
    return fetch(`${API_BASE_URL}/users/me/applicant-profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());
  },

  // Обновить профиль соискателя
  updateApplicantProfile: (token, data) => {
    return fetch(`${API_BASE_URL}/users/me/applicant-profile`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }).then(res => res.json());
  },

  // Получить публичный профиль пользователя
  getUserProfile: (userId, token = null) => {
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    return fetch(`${API_BASE_URL}/users/${userId}`, { headers }).then(res => res.json());
  },

  // ========== КОМПАНИИ ==========
  
  // Список компаний с фильтрацией
  getCompanies: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${API_BASE_URL}/companies?${query}`).then(res => res.json());
  },

  // Получить компанию текущего работодателя
  getMyCompany: (token) => {
    return fetch(`${API_BASE_URL}/companies/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());
  },

  // Обновить компанию
  updateMyCompany: (token, data) => {
    return fetch(`${API_BASE_URL}/companies/me`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }).then(res => res.json());
  },

  // Запрос на верификацию компании
  requestVerification: (token, data) => {
    return fetch(`${API_BASE_URL}/companies/me/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }).then(res => res.json());
  },

  // Получить профиль компании по ID
  getCompany: (companyId) => {
    return fetch(`${API_BASE_URL}/companies/${companyId}`).then(res => res.json());
  },

  // Получить статистику компании
  getCompanyStats: (companyId) => {
    return fetch(`${API_BASE_URL}/companies/${companyId}/stats`).then(res => res.json());
  },

  // ========== ВОЗМОЖНОСТИ ==========
  
  // Список возможностей с фильтрацией и пагинацией
  getOpportunities: (params = {}, token = null) => {
    const query = new URLSearchParams(params).toString();
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    return fetch(`${API_BASE_URL}/opportunities?${query}`, { headers }).then(res => res.json());
  },

  // Создать возможность (только для верифицированных работодателей)
  createOpportunity: (token, data) => {
    return fetch(`${API_BASE_URL}/opportunities`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }).then(res => res.json());
  },

  // Получить маркеры для карты
  getMapPoints: (params = {}, token = null) => {
    const query = new URLSearchParams(params).toString();
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    return fetch(`${API_BASE_URL}/opportunities/map?${query}`, { headers }).then(res => res.json());
  },

  // Мои возможности
  getMyOpportunities: (token, status = null) => {
    const query = status ? `?status=${status}` : '';
    return fetch(`${API_BASE_URL}/opportunities/my${query}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());
  },

  // Получить детальную карточку возможности
  getOpportunity: (opportunityId, token = null) => {
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    return fetch(`${API_BASE_URL}/opportunities/${opportunityId}`, { headers }).then(res => res.json());
  },

  // Редактировать возможность
  updateOpportunity: (token, opportunityId, data) => {
    return fetch(`${API_BASE_URL}/opportunities/${opportunityId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }).then(res => res.json());
  },

  // Удалить возможность
  deleteOpportunity: (token, opportunityId) => {
    return fetch(`${API_BASE_URL}/opportunities/${opportunityId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());
  },

  // Сменить статус возможности
  changeOpportunityStatus: (token, opportunityId, status) => {
    return fetch(`${API_BASE_URL}/opportunities/${opportunityId}/status`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    }).then(res => res.json());
  },

  // ========== ОТКЛИКИ ==========
  
  // Откликнуться на возможность
  createApplication: (token, data) => {
    return fetch(`${API_BASE_URL}/applications`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }).then(res => res.json());
  },

  // Мои отклики
  getMyApplications: (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${API_BASE_URL}/applications/my?${query}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());
  },

  // Отозвать отклик
  withdrawApplication: (token, applicationId) => {
    return fetch(`${API_BASE_URL}/applications/${applicationId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());
  },

  // Отклики на мою возможность (для работодателя)
  getOpportunityApplications: (token, opportunityId, status = null) => {
    const query = status ? `?status=${status}` : '';
    return fetch(`${API_BASE_URL}/applications/opportunity/${opportunityId}${query}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());
  },

  // Изменить статус отклика (для работодателя)
  updateApplicationStatus: (token, applicationId, status) => {
    return fetch(`${API_BASE_URL}/applications/${applicationId}/status`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    }).then(res => res.json());
  },

  // ========== ТЕГИ ==========
  
  // Список тегов
  getTags: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${API_BASE_URL}/tags?${query}`).then(res => res.json());
  },

  // Предложить новый тег
  proposeTag: (token, data) => {
    return fetch(`${API_BASE_URL}/tags`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }).then(res => res.json());
  },

  // Популярные теги
  getPopularTags: (limit = 20) => {
    return fetch(`${API_BASE_URL}/tags/popular?limit=${limit}`).then(res => res.json());
  },

  // Автоподсказка тегов
  suggestTags: (q, limit = 10) => {
    return fetch(`${API_BASE_URL}/tags/suggest?q=${encodeURIComponent(q)}&limit=${limit}`).then(res => res.json());
  },

  // ========== ИЗБРАННОЕ ==========
  
  // Мои избранные возможности
  getFavoriteOpportunities: (token) => {
    return fetch(`${API_BASE_URL}/favorites`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());
  },

  // Добавить возможность в избранное
  addFavoriteOpportunity: (token, opportunityId) => {
    return fetch(`${API_BASE_URL}/favorites/opportunity/${opportunityId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());
  },

  // Убрать возможность из избранного
  removeFavoriteOpportunity: (token, opportunityId) => {
    return fetch(`${API_BASE_URL}/favorites/opportunity/${opportunityId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());
  },

  // Мои избранные компании
  getFavoriteCompanies: (token) => {
    return fetch(`${API_BASE_URL}/favorites/companies`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());
  },

  // Добавить компанию в избранное
  addFavoriteCompany: (token, companyId) => {
    return fetch(`${API_BASE_URL}/favorites/company/${companyId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());
  },

  // Убрать компанию из избранного
  removeFavoriteCompany: (token, companyId) => {
    return fetch(`${API_BASE_URL}/favorites/company/${companyId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());
  },

  // ID избранных компаний (для подсветки маркеров)
  getFavoriteCompanyIds: (token) => {
    return fetch(`${API_BASE_URL}/favorites/companies/ids`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());
  },

  // ========== УВЕДОМЛЕНИЯ ==========
  
  // Мои уведомления
  getNotifications: (token) => {
    return fetch(`${API_BASE_URL}/notifications`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());
  },

  // Прочитать уведомление
  markNotificationAsRead: (token, notificationId) => {
    return fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());
  },

  // Прочитать все уведомления
  markAllNotificationsAsRead: (token) => {
    return fetch(`${API_BASE_URL}/notifications/read-all`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());
  },

  // Количество непрочитанных уведомлений
  getUnreadNotificationsCount: (token) => {
    return fetch(`${API_BASE_URL}/notifications/unread-count`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());
  },

  // ========== КОНТАКТЫ ==========
  
  // Мои контакты
  getContacts: (token) => {
    return fetch(`${API_BASE_URL}/contacts`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());
  },

  // Входящие запросы
  getIncomingRequests: (token) => {
    return fetch(`${API_BASE_URL}/contacts/requests`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());
  },

  // Исходящие запросы
  getOutgoingRequests: (token) => {
    return fetch(`${API_BASE_URL}/contacts/outgoing`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());
  },

  // Отправить запрос в контакты
  sendContactRequest: (token, targetUserId) => {
    return fetch(`${API_BASE_URL}/contacts/${targetUserId}/request`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());
  },

  // Принять запрос
  acceptContactRequest: (token, contactId) => {
    return fetch(`${API_BASE_URL}/contacts/${contactId}/accept`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());
  },

  // Отклонить запрос
  rejectContactRequest: (token, contactId) => {
    return fetch(`${API_BASE_URL}/contacts/${contactId}/reject`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());
  },

  // Удалить из контактов
  removeContact: (token, contactId) => {
    return fetch(`${API_BASE_URL}/contacts/${contactId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());
  },

  // Рекомендовать друга на вакансию
  recommendContact: (token, data) => {
    return fetch(`${API_BASE_URL}/contacts/recommend`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }).then(res => res.json());
  },

  // Рекомендации мне
  getRecommendations: (token) => {
    return fetch(`${API_BASE_URL}/contacts/recommendations`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());
  },

  // ========== ЧАТ ==========
  
  // Список диалогов
  getConversations: (token) => {
    return fetch(`${API_BASE_URL}/chat/conversations`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());
  },

  // История сообщений с пользователем
  getMessages: (token, otherUserId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${API_BASE_URL}/chat/with/${otherUserId}?${query}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());
  },

  // Отправить сообщение
  sendMessage: (token, data) => {
    return fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }).then(res => res.json());
  },

  // Непрочитанные сообщения
  getUnreadMessagesCount: (token) => {
    return fetch(`${API_BASE_URL}/chat/unread`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());
  },

  // ========== ЗАГРУЗКА ФАЙЛОВ ==========
  
  // Загрузить изображение
  uploadImage: (token, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${API_BASE_URL}/uploads/image`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    }).then(res => res.json());
  },

  // Загрузить документ (резюме PDF)
  uploadDocument: (token, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${API_BASE_URL}/uploads/document`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    }).then(res => res.json());
  },

  // ========== ТЕХПОДДЕРЖКА ==========
  
  // Создать обращение
  createTicket: (token, data) => {
    return fetch(`${API_BASE_URL}/support`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }).then(res => res.json());
  },

  // Мои обращения
  getMyTickets: (token) => {
    return fetch(`${API_BASE_URL}/support/my`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());
  },

  // ========== СИСТЕМА ==========
  
  // Проверка здоровья сервиса
  health: () => {
    return fetch('http://localhost:8000/health').then(res => res.json());
  },

  // Корневой эндпоинт
  root: () => {
    return fetch('http://localhost:8000/').then(res => res.json());
  }
};

// Вспомогательная функция для обработки ошибок
export const handleApiError = (error) => {
  if (error.response) {
    // Сервер вернул ошибку
    return {
      success: false,
      status: error.response.status,
      data: error.response.data
    };
  } else if (error.request) {
    // Запрос был отправлен, но ответ не получен
    return {
      success: false,
      error: 'Network error',
      message: 'Не удалось соединиться с сервером'
    };
  } else {
    // Ошибка при настройке запроса
    return {
      success: false,
      error: error.message,
      message: 'Ошибка при выполнении запроса'
    };
  }
};
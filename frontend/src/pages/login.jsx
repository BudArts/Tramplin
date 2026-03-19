import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function login() {
  const [role, setRole] = useState('candidate'); // По умолчанию соискатель
  const navigate = useNavigate(); // Инструмент для перемещения по страницам

  const handleLogin = (e) => {
    e.preventDefault();
    console.log("Вход как:", role);
    
    // Перенаправляем на страницу в зависимости от роли
    // Например, если выбрал 'candidate', уйдем на /candidate
    navigate('/' + role); 
  };
  
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Вход в систему</h1>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', width: '300px', gap: '10px' }}>
        <input type="email" placeholder="Email" />
        <input type="password" placeholder="Пароль" />
        <select>
          <option value="candidate">Соискатель</option>
          <option value="employer">Работодатель</option>
          <option value="curator">Куратор</option>
        </select>
        <button type="submit">Войти</button>
      </form>
    </div>
  );
}
import React from 'react';
import { Card } from 'antd';

// Полностью английские буквы: TaskCard
function TaskCard() {
  return (
    <div className="p-4 flex justify-center">
      <Card 
        title="Карточка проекта It Planet" 
        extra={<a href="#" className="text-blue-500">Подробнее</a>} 
        style={{ width: 300 }}
      >
        <p>Описание задачи из бэкенда</p>
        <p>Статус: Активно</p>
      </Card>
    </div>
  );
}

export default TaskCard;
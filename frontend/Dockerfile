FROM node:22-alpine AS builder

WORKDIR /app

# Копируем package.json
COPY package*.json ./

# Настройка npm для стабильной работы
RUN npm config set fetch-retries 10 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retry-factor 2 && \
    npm config set maxsockets 10 && \
    npm config set registry https://registry.npmjs.org/

# Очистка кэша
RUN npm cache clean --force

# Установка зависимостей
RUN npm install --no-audit --no-fund --legacy-peer-deps \
    --timeout=600000 --network-timeout=600000

# Копируем весь код
COPY . .

# Создаем .env.production
RUN echo "VITE_API_URL=" > .env.production

# Собираем приложение
RUN npm run build

# Второй этап: сервер для статики
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
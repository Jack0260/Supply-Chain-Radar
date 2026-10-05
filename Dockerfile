FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS preview
WORKDIR /app
RUN npm install -g vite
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
EXPOSE 4173
CMD ["vite", "preview", "--host", "0.0.0.0", "--port", "4173"]

# Paso 1: Definir la imagen base. Usamos Node 20 (LTS) en su versión Alpine por ser ultra ligera y reducir la superficie de ataque (Seguridad)
FROM node:20-alpine

# Paso 2: Definir el directorio de trabajo predeterminado dentro del contenedor
WORKDIR /app

# Paso 3: Instalar pnpm globalmente, asegurando compatibilidad con la versión 8 usada en nuestro entorno CI (GitHub Actions)
RUN npm install -g pnpm@8

# Paso 4: Copiar primero los manifiestos de dependencias. Esto es una buena práctica de Docker para aprovechar la caché de capas y hacer los builds más rápidos
COPY package.json pnpm-lock.yaml* ./

# Paso 5: Instalar únicamente las dependencias necesarias para ejecución en producción (ignorando herramientas como Jest o ESLint)
RUN pnpm install --prod

# Paso 6: Copiar el resto del código fuente (como nuestro server.js y la carpeta public) al contenedor
COPY . .

# Paso 7: Exponer el puerto 3000, que es donde la aplicación Node.js está configurada para escuchar peticiones
EXPOSE 3000

# Paso 8: Definir el comando por defecto que arrancará el servidor web cuando el contenedor se inicie
CMD ["pnpm", "start"]

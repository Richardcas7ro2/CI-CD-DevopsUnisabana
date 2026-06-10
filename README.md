# DevOps CI/CD Lab: System Status Web App

Este repositorio contiene el código fuente y las configuraciones de automatización correspondientes al **Laboratorio Técnico (Actividad 3)** del curso de DevOps. 

El proyecto consiste en una aplicación Node.js/Express muy ligera, con una interfaz gráfica moderna (basada en *Glassmorphism*), diseñada para exponer información clave del entorno de ejecución (Hostname, IP, Sistema Operativo). Esta estructura resulta ideal para futuros despliegues en orquestadores de contenedores como Kubernetes.

---

## 🚀 Tecnologías Principales

- **Backend:** Node.js, Express
- **Gestor de paquetes:** pnpm
- **Frontend:** HTML, CSS Nativo (Glassmorphism), fuentes personalizadas (Clash Display, Cabinet Grotesk).
- **Pruebas Automatizadas:** Jest, Supertest
- **Seguridad y Linting:** ESLint, Trivy
- **Contenedores:** Docker
- **CI / CD:** GitHub Actions, Jenkins

---

## ⚙️ Flujo de Integración Continua (CI) - GitHub Actions

El pipeline de CI está configurado en `.github/workflows/ci.yml` y se dispara de forma automática con cada `push` o `pull_request` a la rama principal (`master` / `main`). 

**Pasos automatizados:**
1. **Checkout:** Se descarga el código fuente actualizado.
2. **Setup Node & pnpm:** Se configura el entorno de ejecución con la versión 20 de Node.js y se habilitan las cachés para hacer el build mucho más rápido.
3. **Instalación de dependencias:** Ejecución de `pnpm install` para preparar el entorno.
4. **Análisis Estático (Linting):** Ejecución de `ESLint` para garantizar que el código JavaScript cumpla con las reglas y estándares de *Clean Code*.
5. **Pruebas Automatizadas:** Ejecución del framework de pruebas unitarias y de integración (`Jest` + `Supertest`) para verificar el correcto funcionamiento del API.
6. **Escaneo de Seguridad (DevSecOps):** Ejecución de `Trivy` para escanear tanto el código fuente como las librerías en busca de vulnerabilidades críticas o altas. 

*Si alguna de estas etapas falla, el flujo se detiene y la rama no puede fusionarse, garantizando la estabilidad de producción.*

---

## 🚢 Flujo de Entrega Continua (CD) - Jenkins

La definición de los pasos necesarios para empaquetar y entregar la aplicación a un entorno agnóstico (contenedorización) está estructurada en el archivo `Jenkinsfile`. 

**Stages del Pipeline:**
1. **Clone Repository:** Extrae el código fuente validado del repositorio Git.
2. **Build Docker Image:** Lee el `Dockerfile` del proyecto e instala únicamente las dependencias de producción (`pnpm install --prod`), construyendo una imagen ligera basada en `node:20-alpine`.
3. **Push to Registry:** Sube la imagen empaquetada a DockerHub (o cualquier registro compatible) asignándole etiquetas (`v<BUILD_ID>` y `latest`).
4. **Limpieza (Post-action):** Elimina las imágenes generadas localmente para mantener la salud del agente de Jenkins.

---

## 🛠️ Ejecución Local

Si deseas probar la aplicación localmente en tu máquina:

### Opción 1: Usando Node.js y pnpm
1. Clona el repositorio: `git clone <tu-repositorio>`
2. Ingresa a la carpeta: `cd webapp`
3. Instala las dependencias: `pnpm install`
4. Ejecuta las pruebas: `pnpm test`
5. Levanta la aplicación: `pnpm start`
6. Abre tu navegador en: [http://localhost:3000](http://localhost:3000)

### Opción 2: Usando Docker
1. Construye la imagen: `docker build -t devops-webapp .`
2. Ejecuta el contenedor: `docker run -p 3000:3000 devops-webapp`

---

## 📸 Evidencias de Ejecución (Capturas de Pantalla)

*(Nota: Sustituir los enlaces de abajo con las imágenes reales cuando los pipelines se ejecuten en la nube o servidor).*

**1. Ejecución exitosa de GitHub Actions (CI)**
> ![CI GitHub Actions](assets/github_actions_success.png)

**2. Definición / Ejecución del Pipeline en Jenkins (CD)**
> ![CD Jenkins](assets/jenkins_pipeline.png)

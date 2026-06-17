# DevOps CI/CD Lab: System Status Web App

Este repositorio contiene el código fuente, pipelines de automatización, manifiestos de orquestación y stack de monitoreo correspondientes al **Laboratorio Técnico (Actividad 3)** del curso de DevOps — Universidad de La Sabana.

El proyecto implementa un sistema **end-to-end de Integración y Despliegue Continuo (CI/CD)** sobre una aplicación Node.js/Express ligera con interfaz gráfica moderna (*Glassmorphism*). La aplicación expone información del entorno de ejecución (hostname, IP, sistema operativo) y métricas de observabilidad, sirviendo como prueba de concepto para demostrar cómo automatizar todo el ciclo de vida del software: desde que un desarrollador sube código, hasta que la aplicación se despliega automáticamente en un cluster de Kubernetes con análisis de seguridad y monitoreo en tiempo real.

---

## 👥 Integrantes del Equipo

Abdul Mauricio Reyes Parra

Jorge Rolando Maradey Duran

Jorge Esteban Triviño Correa

Wilmer Ricardo Castro Delgadillo

---

## 📐 Arquitectura General

El siguiente diagrama muestra el flujo completo que se ejecuta automáticamente cuando un desarrollador hace `git push`:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GITHUB ACTIONS (CI — Nube)                       │
│                                                                     │
│  Checkout → Node.js 20 → pnpm 8 → Cache → Install → Lint → Test    │
│      → Trivy → Snyk → SonarCloud → Trigger Jenkins (via Smee.io)   │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ POST via smee.io (solo si CI = ✅)
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    JENKINS (CD — Local)                              │
│                                                                     │
│  Clone → Docker Build → Docker Push (DockerHub) → kubectl apply     │
│                                    → kubectl rollout restart        │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    KUBERNETES / KIND (Local)                         │
│                                                                     │
│  Namespace: devops-webapp                                           │
│  ├── Pod 1: devops-webapp (réplica 1)  ──┐                          │
│  ├── Pod 2: devops-webapp (réplica 2)  ──┤→ Service: NodePort       │
│  └── Service: webapp-service (30080)   ──┘   :30080                 │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ /metrics cada 5s
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    MONITOREO (Docker Compose)                       │
│                                                                     │
│  Prometheus (:9090) ←── scrape ──→ App (:30080/metrics)             │
│       ↓                                                             │
│  Grafana (:3001)  → Dashboard: HTTP Requests + Heap Memory          │
│       ↓                                                             │
│  Alertas: InstanciaCaida · UsoAltoDeMemoria · AltaCargaCPU          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Tecnologías Principales

| Categoría | Tecnología | Versión | Propósito |
|---|---|---|---|
| **Runtime** | Node.js | 20 LTS | Entorno de ejecución del lado del servidor |
| **Framework** | Express.js | 4.18 | Framework web minimalista para la API REST |
| **Gestor de paquetes** | pnpm | 8 | Gestor rápido con caché global eficiente en disco |
| **Frontend** | HTML + CSS Nativo | — | Interfaz con diseño Glassmorphism y fuentes Clash Display / Cabinet Grotesk |
| **Pruebas** | Jest + Supertest | 29 / 6 | Framework de pruebas unitarias y de integración HTTP |
| **Análisis Estático** | ESLint | 8 | Linting para reglas de Clean Code en JavaScript |
| **Seguridad (DevSecOps)** | Trivy, Snyk, SonarCloud | — | Escaneo de vulnerabilidades, SCA y SAST |
| **Contenedores** | Docker | — | Empaquetado de la aplicación en imagen `node:20-alpine` |
| **Orquestación** | Kubernetes (Kind) | — | Despliegue declarativo con réplicas, probes y auto-healing |
| **Métricas** | prom-client | 15 | Librería oficial de Prometheus para instrumentar Node.js |
| **Monitoreo** | Prometheus + Grafana | — | Recolección de métricas, dashboards y reglas de alerta |
| **CI** | GitHub Actions | — | Pipeline de Integración Continua en la nube |
| **CD** | Jenkins | — | Pipeline de Entrega Continua local |
| **Proxy Webhooks** | Smee.io | — | Túnel para conectar GitHub Actions (nube) con Jenkins (localhost) |

---

## 🏗️ Descripción de la Aplicación

La aplicación es un servidor web construido con **Node.js** y **Express.js** que cumple tres funciones principales:

### Endpoints de la API

| Endpoint | Método | Descripción |
|---|---|---|
| `/` | GET | Sirve el frontend HTML estático (Glassmorphism) desde la carpeta `public/` |
| `/api/info` | GET | Retorna un JSON con información del sistema: `hostname`, `platform`, `architecture`, `nodeVersion` y `uptime` |
| `/metrics` | GET | Expone métricas en formato Prometheus para scraping automático (CPU, memoria heap, event loop, requests HTTP) |

### Instrumentación de Métricas

El servidor integra `prom-client` para exponer dos tipos de métricas:

- **Métricas por defecto de Node.js:** uso de memoria heap (`nodejs_heap_space_size_used_bytes`), handles activos (`nodejs_active_handles_total`), CPU consumida (`process_cpu_seconds_total`) y latencia del event loop (`nodejs_eventloop_lag_seconds`).
- **Métrica personalizada — `http_requests_total`:** un contador que registra cada petición HTTP con tres dimensiones (labels): `method`, `route` y `status_code`, lo que permite construir consultas granulares en Grafana.

### Pruebas Automatizadas

Las pruebas se ubican en `tests/app.test.js` y utilizan **Jest** como framework de testing y **Supertest** para realizar peticiones HTTP al servidor sin necesidad de levantarlo en un puerto real:

| Test | Verifica |
|---|---|
| **API Info** | Que `GET /api/info` responde con HTTP 200 y el cuerpo JSON contiene las propiedades `hostname` y `platform` |
| **Frontend** | Que `GET /` responde con HTTP 200 y el contenido incluye `<!DOCTYPE html>`, confirmando que se sirve correctamente la página |

---

## 🐳 Contenedorización con Docker

La aplicación se empaqueta en un contenedor Docker para garantizar portabilidad y consistencia entre entornos. El `Dockerfile` utiliza un enfoque optimizado:

```dockerfile
FROM node:20-alpine          # Imagen base ultra-ligera (~130 MB vs ~1 GB de la imagen completa)
WORKDIR /app
RUN npm install -g pnpm@8    # Mismo gestor de paquetes que en CI
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod      # Solo dependencias de producción (express, prom-client)
COPY . .
EXPOSE 3000
CMD ["pnpm", "start"]
```

| Decisión de diseño | Justificación |
|---|---|
| `node:20-alpine` como imagen base | Reduce el tamaño de la imagen y minimiza la superficie de ataque al incluir menos paquetes del sistema operativo |
| Copiar `package.json` antes del código | Aprovecha la **caché de capas de Docker**: si las dependencias no cambian, Docker reutiliza la capa instalada y el build es mucho más rápido |
| `pnpm install --prod` | Excluye herramientas de desarrollo (Jest, ESLint), reduciendo aún más el tamaño final de la imagen |
| Puerto 3000 | Coincide con la configuración del servidor Express (`process.env.PORT || 3000`) |

---

## ⚙️ Flujo de Integración Continua (CI) — GitHub Actions

El pipeline de CI está configurado en `.github/workflows/ci.yml` y se dispara automáticamente con cada `push` o `pull_request` a las ramas `master` / `main`. Corre sobre `ubuntu-latest` en un solo job llamado `build-and-test`.

### Los 12 pasos del pipeline

| # | Paso | Herramienta | Descripción |
|---|---|---|---|
| 1 | **Checkout Code** | `actions/checkout@v4` | Clona el repositorio con `fetch-depth: 0` (historial completo, requerido por SonarCloud) |
| 2 | **Setup Node.js** | `actions/setup-node@v4` | Instala Node.js 20 LTS, la misma versión que en Docker y desarrollo local |
| 3 | **Install pnpm** | `pnpm/action-setup@v3` | Instala pnpm versión 8 sin ejecutar instalación automática (`run_install: false`) |
| 4 | **Get pnpm store** | Shell script | Obtiene la ruta del store de caché global de pnpm y la guarda como variable de entorno |
| 5 | **Setup pnpm cache** | `actions/cache@v4` | Configura caché persistente con clave basada en el hash de `pnpm-lock.yaml` — reduce el tiempo de instalación de ~45s a ~10s |
| 6 | **Install Dependencies** | `pnpm install` | Instala todas las dependencias (producción + desarrollo, ya que se necesitan Jest y ESLint) |
| 7 | **Lint Code** | `pnpm run lint` (ESLint) | Analiza el código buscando errores de sintaxis, variables no utilizadas y malas prácticas según las reglas de `.eslintrc.json` |
| 8 | **Run Tests** | `pnpm test` (Jest) | Ejecuta la suite de pruebas unitarias y de integración. Si falla, el pipeline se detiene inmediatamente |
| 9 | **Trivy Scanner** | `aquasecurity/trivy-action` | Escaneo de vulnerabilidades del sistema de archivos (ver sección DevSecOps) |
| 10 | **Snyk Check** | `snyk/actions/node` | Análisis de composición de software (ver sección DevSecOps) |
| 11 | **SonarCloud Scan** | `SonarSource/sonarcloud-github-action` | Análisis estático de calidad y seguridad del código (ver sección DevSecOps) |
| 12 | **Trigger Jenkins** | `curl` vía Smee.io | Solo si todos los pasos anteriores pasaron (`if: success()`), envía un POST a Smee.io para disparar el pipeline de CD en Jenkins local |

> **Si alguno de los pasos 1–8 falla, el flujo se detiene y la rama no puede fusionarse, garantizando la estabilidad de producción.**

---

## 🚢 Flujo de Entrega Continua (CD) — Jenkins

Jenkins corre localmente y se encarga de empaquetar, publicar y desplegar la aplicación. El pipeline declarativo está definido en el `Jenkinsfile` con 3 stages:

### Stage 1 — Clone Repository
```groovy
checkout scm
```
Clona el repositorio desde GitHub usando la configuración SCM del Job de Jenkins.

### Stage 2 — Build & Push Docker Image
```groovy
withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', ...)]) {
    sh "docker build -t ${DOCKER_USERNAME}/${IMAGE_NAME}:${IMAGE_TAG} ."
    sh "echo $DOCKER_PASSWORD | docker login -u $DOCKER_USERNAME --password-stdin"
    sh "docker push ${DOCKER_USERNAME}/${IMAGE_NAME}:${IMAGE_TAG}"
    sh "docker tag ... ${DOCKER_USERNAME}/${IMAGE_NAME}:latest"
    sh "docker push ${DOCKER_USERNAME}/${IMAGE_NAME}:latest"
}
```

| Paso | Detalle |
|---|---|
| Inyección de credenciales | `withCredentials` extrae las credenciales de DockerHub de la bóveda de Jenkins y las inyecta como variables de entorno temporales, sin exponerlas en los logs |
| Build de la imagen | Construye la imagen usando el Dockerfile del repo. La etiqueta incluye el número de build de Jenkins (`v${BUILD_ID}`) para trazabilidad |
| Autenticación | Inicia sesión en DockerHub pasando la contraseña por stdin (`--password-stdin`), la forma más segura que evita exposición en historial de comandos |
| Push versionado | Sube la imagen con la etiqueta específica del build (ej: `v15`) |
| Push latest | Re-etiqueta como `latest` para que Kubernetes siempre descargue la última versión |

### Stage 3 — Deploy to Kubernetes
```groovy
sh "kubectl apply -f k8s/"
sh "kubectl rollout restart deployment webapp-deployment -n devops-webapp || true"
```

- `kubectl apply -f k8s/` aplica de forma declarativa los 3 manifiestos YAML (namespace, deployment, service). Si ya existen, los actualiza; si no, los crea.
- `kubectl rollout restart` fuerza a Kubernetes a recrear los pods para que descarguen la nueva imagen `latest`. El `|| true` evita que el pipeline falle si el deployment aún no existe.

### Variables de entorno del pipeline

| Variable | Valor | Propósito |
|---|---|---|
| `IMAGE_NAME` | `devops-webapp` | Nombre fijo de la imagen en DockerHub |
| `IMAGE_TAG` | `v${BUILD_ID}` | Tag dinámico para trazabilidad completa de cada build |
| `PATH` | `/usr/local/bin:/opt/homebrew/bin:${PATH}` | Extiende el PATH para que Jenkins encuentre Docker y kubectl en macOS (Intel y Apple Silicon) |

---

## 🔗 Orquestación Automática CI → CD con Smee.io

Uno de los retos principales fue **conectar GitHub Actions (nube) con Jenkins (localhost)**. GitHub no puede enviar webhooks a una máquina local que no tiene IP pública.

### Solución: Smee.io como proxy de webhooks

```
GitHub Actions ──POST──> smee.io/devops-unisabana-cd ──reenvío──> localhost:8080/job/.../build
```

| Componente | Ubicación | Función |
|---|---|---|
| **Paso 12 del CI** | GitHub Actions (nube) | Envía un `curl POST` autenticado a la URL de Smee (solo si el CI pasó completamente) |
| **Smee Client** | Máquina local (terminal) | Escucha en el canal de Smee y reenvía las peticiones a Jenkins en `localhost:8080` |
| **Jenkins Build Trigger** | Jenkins (configuración del Job) | Acepta triggers remotos autenticados con el token `devops-token` |

De esta forma, el flujo CI → CD está **100% automatizado** sin necesidad de exponer Jenkins a internet.

---

## 🛡️ Seguridad Continua (DevSecOps)

Se implementó una estrategia **Shift-Left Security** integrando tres herramientas complementarias directamente en el pipeline de CI. Cada una cubre un ámbito distinto de análisis:

### Herramientas integradas

| Herramienta | Tipo de análisis | Alcance | Base de datos | Si falla... |
|---|---|---|---|---|
| **Trivy** | Vulnerabilidades (CVE) | Sistema de archivos + dependencias | Open-source (NVD, GitHub Advisory) | ❌ **Rompe el pipeline** (exit-code: 1) |
| **Snyk** | Composición de Software (SCA) | Dependencias directas y transitivas | Propietaria + curada por expertos | ⚠️ Reporta sin romper (continue-on-error) |
| **SonarCloud** | Análisis Estático (SAST) | Código fuente de la aplicación | Reglas propias de SonarSource | 📊 Reporta Quality Gate |

### Trivy — Escaneo del sistema de archivos
Escanea todo el proyecto buscando **vulnerabilidades conocidas (CVEs)** en librerías y archivos de configuración. Configurado para solo reportar severidades `CRITICAL` y `HIGH`, e ignorar vulnerabilidades sin parche disponible (`ignore-unfixed: true`) para no bloquear el pipeline por factores fuera del control del equipo.

### Snyk — Análisis de composición de software (SCA)
Analiza el árbol completo de dependencias (directas y transitivas) cruzándolo con su base de datos propietaria de vulnerabilidades actualizada en tiempo real. Se autentica mediante un token personal almacenado como secret de GitHub (`SNYK_TOKEN`).

> **¿Por qué Trivy y Snyk?** Son complementarios: Trivy tiene una base de datos open-source amplia pero genérica; Snyk tiene una base curada por investigadores de seguridad con información más detallada sobre remediación. Usar ambos maximiza la cobertura.

### SonarCloud — Análisis estático (SAST)
Realiza análisis estático del código fuente sin ejecutarlo, buscando bugs potenciales, vulnerabilidades de seguridad, code smells y duplicación de código. Configurado en `sonar-project.properties`:
- Excluye `node_modules/`, `tests/`, `coverage/`, `k8s/`, `monitoring/` para centrarse en código propio.
- Identifica la carpeta `tests/` para calcular cobertura y no contar tests como código de producción.

---

## ☸️ Despliegue en Kubernetes con Kind

Se utiliza **Kind (Kubernetes in Docker)** para crear un cluster de Kubernetes completamente funcional dentro de contenedores Docker. Los manifiestos son 100% compatibles con cualquier cluster real (GKE, EKS, AKS).

### Configuración del cluster (`kind-config.yaml`)

```yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  extraPortMappings:
  - containerPort: 30080
    hostPort: 30080
    protocol: TCP
```

El `extraPortMappings` mapea el puerto 30080 del nodo de Kubernetes al host, permitiendo acceder a la aplicación en `http://localhost:30080`.

### Manifiestos de Kubernetes (`k8s/`)

| Manifiesto | Recurso | Descripción |
|---|---|---|
| `namespace.yaml` | **Namespace** `devops-webapp` | Aísla todos los recursos de la aplicación, permitiendo aplicar políticas de red, cuotas de recursos y RBAC a nivel de namespace |
| `deployment.yaml` | **Deployment** `webapp-deployment` | Define 2 réplicas del pod para alta disponibilidad, con `imagePullPolicy: Always` para siempre descargar la última imagen |
| `service.yaml` | **Service** `webapp-service` (NodePort) | Actúa como balanceador de carga interno: recibe tráfico en el puerto 80, lo redirige al 3000 de los contenedores, y lo expone externamente en el puerto 30080 |

### Configuración avanzada del Deployment

| Característica | Configuración | Propósito |
|---|---|---|
| **Réplicas** | `replicas: 2` | Alta disponibilidad. Si un pod falla, el otro sigue sirviendo tráfico |
| **Recursos (requests)** | CPU: `100m`, Memoria: `64Mi` | Garantía mínima de recursos para cada pod |
| **Recursos (limits)** | CPU: `250m`, Memoria: `128Mi` | Tope máximo para evitar que un pod consuma recursos excesivos |
| **LivenessProbe** | `GET /api/info:3000` cada 10s (delay inicial: 5s) | Si el endpoint deja de responder, Kubernetes reinicia el pod automáticamente (auto-healing) |
| **ReadinessProbe** | `GET /:3000` cada 5s (delay inicial: 2s) | Kubernetes solo envía tráfico al pod cuando el frontend responde correctamente |

---

## 📊 Monitoreo y Observabilidad

El estado de la aplicación se supervisa mediante un stack completo de observabilidad desplegado con Docker Compose en `monitoring/`.

### Stack de monitoreo (`monitoring/docker-compose.yml`)

| Servicio | Imagen | Puerto | Función |
|---|---|---|---|
| **Prometheus** | `prom/prometheus:latest` | `:9090` | Recolecta métricas de la aplicación cada 5 segundos mediante scraping del endpoint `/metrics` |
| **Grafana** | `grafana/grafana:latest` | `:3001` | Visualiza las métricas en dashboards interactivos con auto-refresh cada 5 segundos |

### Configuración de Prometheus (`prometheus.yml`)

```yaml
global:
  scrape_interval: 5s

rule_files:
  - "/etc/prometheus/prometheus_rules.yml"

scrape_configs:
  - job_name: 'devops-webapp'
    static_configs:
      - targets: ['host.docker.internal:30080']
```

- `host.docker.internal` permite que Prometheus (dentro de Docker) alcance la aplicación que corre en el cluster Kind (accesible vía `localhost:30080` del host).
- `rule_files` carga las reglas de alerta definidas en `prometheus_rules.yml`.

### Reglas de alerta (`prometheus_rules.yml`)

Se configuraron **3 alertas** automáticas para detectar problemas de forma proactiva:

| Alerta | Expresión PromQL | Condición | Severidad |
|---|---|---|---|
| **InstanciaCaida** | `up == 0` | Prometheus no puede conectarse a la app por más de 30 segundos | 🔴 Critical |
| **UsoAltoDeMemoria** | `nodejs_heap_space_size_used_bytes > 50000000` | El Heap de Node.js supera 50 MB por más de 1 minuto | 🟡 Warning |
| **AltaCargaCPU** | `rate(process_cpu_seconds_total[1m]) > 0.8` | La CPU supera el 80% de consumo por más de 1 minuto | 🟡 Warning |

### Dashboard de Grafana (auto-provisionado)

Grafana arranca con un datasource (Prometheus) y un dashboard pre-configurados automáticamente mediante provisioning (`grafana/provisioning/`). El dashboard incluye dos paneles:

| Panel | Consulta PromQL | Utilidad |
|---|---|---|
| **Tasa de Peticiones HTTP** | `rate(http_requests_total[1m])` | Gráfico de líneas desglosado por ruta y código de estado — detecta picos de tráfico y errores |
| **Uso de Memoria (Heap)** | `nodejs_heap_space_size_used_bytes` | Gráfico de líneas del consumo de heap — detecta memory leaks |

---

## 🛠️ Ejecución Local Completa

### Prerrequisitos

| Herramienta | Instalación (macOS) |
|---|---|
| **Node.js 20** | `brew install node@20` |
| **pnpm 8** | `npm install -g pnpm@8` |
| **Docker Desktop** | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) |
| **Kind** | `brew install kind` |
| **kubectl** | `brew install kubectl` |
| **Jenkins** | `brew install jenkins-lts` |

### 1. Clonar el repositorio

```bash
git clone https://github.com/Richardcas7ro2/CI-CD-DevopsUnisabana.git
cd CI-CD-DevopsUnisabana
```

### 2. Ejecutar la aplicación en desarrollo local

```bash
pnpm install
pnpm start        # Servidor en http://localhost:3000
```

### 3. Ejecutar pruebas y linting

```bash
pnpm test          # Pruebas unitarias con Jest
pnpm run lint      # Análisis estático con ESLint
```

### 4. Crear el cluster de Kubernetes con Kind

```bash
kind create cluster --name devops-cluster --config kind-config.yaml
```

### 5. Desplegar la aplicación en Kubernetes

```bash
kubectl apply -f k8s/
kubectl get pods,svc -n devops-webapp   # Verificar que los 2 pods estén en Running
```

### 6. Levantar Prometheus y Grafana

```bash
cd monitoring
docker compose up -d
```

### 7. Configurar el túnel de webhooks (para CD automático)

Para que GitHub Actions pueda disparar tu Jenkins local automáticamente:

```bash
npx smee-client \
  --url https://smee.io/devops-unisabana-cd \
  --target "http://localhost:8080/job/devops-webapp-cd/build?token=devops-token"
```

### 8. Accesos locales

| Servicio | URL | Credenciales |
|---|---|---|
| **Aplicación web (Kubernetes)** | [http://localhost:30080](http://localhost:30080) | — |
| **API info** | [http://localhost:30080/api/info](http://localhost:30080/api/info) | — |
| **Métricas Prometheus (app)** | [http://localhost:30080/metrics](http://localhost:30080/metrics) | — |
| **Prometheus UI** | [http://localhost:9090](http://localhost:9090) | — |
| **Dashboard Grafana** | [http://localhost:3001](http://localhost:3001) | admin / admin |
| **Jenkins** | [http://localhost:8080](http://localhost:8080) | Configurado localmente |

---

## 📁 Estructura del Repositorio

```
CI-CD-DevopsUnisabana/
├── .github/
│   └── workflows/
│       └── ci.yml                    # Pipeline CI: Lint + Test + Trivy + Snyk + SonarCloud + Trigger Jenkins
├── k8s/
│   ├── namespace.yaml                # Namespace: devops-webapp
│   ├── deployment.yaml               # Deployment: 2 réplicas + probes + resource limits
│   └── service.yaml                  # Service: NodePort 30080
├── monitoring/
│   ├── docker-compose.yml            # Stack: Prometheus + Grafana
│   ├── prometheus.yml                # Scrape config: 5s interval + rule_files
│   ├── prometheus_rules.yml          # Reglas de alerta: InstanciaCaida, MemoriaAlta, CPUAlta
│   └── grafana/
│       └── provisioning/
│           ├── datasources/
│           │   └── prometheus.yml    # Datasource: Prometheus auto-configurado
│           └── dashboards/
│               ├── dashboard.yml     # Dashboard provider
│               └── webapp-dashboard.json  # Dashboard: HTTP Requests + Heap Memory
├── public/
│   └── index.html                    # Frontend HTML con diseño Glassmorphism
├── tests/
│   └── app.test.js                   # Tests unitarios con Jest + Supertest
├── .eslintrc.json                    # Reglas de linting (eslint:recommended + Node.js + Jest)
├── Dockerfile                        # Imagen: node:20-alpine con pnpm
├── Jenkinsfile                       # Pipeline CD: Build Docker + Push DockerHub + Deploy K8s
├── kind-config.yaml                  # Cluster Kind: control-plane + port mapping 30080
├── package.json                      # Dependencias: express, prom-client, jest, eslint, supertest
├── pnpm-lock.yaml                    # Lockfile de dependencias (versiones exactas)
├── server.js                         # Servidor Express + métricas Prometheus + API info
└── sonar-project.properties          # Configuración SonarCloud
```








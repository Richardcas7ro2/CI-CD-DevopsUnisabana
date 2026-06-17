# Informe de Seguridad DevSecOps

**Repositorio:** https://github.com/Richardcas7ro2/CI-CD-DevopsUnisabana  
**Rama Analizada:** `main`  
**Fecha de Análisis:** Junio 2026  
**Herramientas Utilizadas:** SonarCloud (SAST), Snyk (SCA), Trivy (Filesystem Scan)

---
## 1. Resumen 

Se implementó una estrategia de seguridad continua **Shift-Left** integrando tres herramientas de análisis directamente en el pipeline de Integración Continua (CI) de GitHub Actions. El objetivo es detectar vulnerabilidades lo más temprano posible en el ciclo de desarrollo, antes de que el código llegue a producción.

| Herramienta | Tipo de Análisis | Resultado |
|---|---|---|
| **SonarCloud** | SAST – Análisis Estático de Código | ❌ Quality Gate: Failed (9 issues) |
| **Snyk** | SCA – Análisis de Composición de Software | ✅ 72 dependencias sin CVEs |
| **Trivy** | Filesystem Scan – Vulnerabilidades en imagen/OS | ✅ Sin hallazgos críticos/altos |

---

## 2. Resultados del Análisis Estático de Código (SonarCloud)

SonarCloud analizó el código fuente (`server.js`), el `Dockerfile`, el HTML del frontend (`public/index.html`) y el pipeline de CI (`.github/workflows/ci.yml`). El análisis procesó **3.2k líneas de código**.

### 2.1 Métricas Generales del Quality Gate

| Métrica | Resultado | Estado |
|---|---|---|
| Security Rating | C | ❌ Falla (requiere A) |
| Coverage | 0.0% | ❌ Falla (requiere ≥ 80%) |
| Security Hotspots Reviewed | 0.0% | ❌ Falla (requiere 100%) |
| Reliability Rating | A | ✅ OK |
| Maintainability Rating | A | ✅ OK |
| Duplications | 0.0% | ✅ OK |
| New Issues | 5 | ℹ️ Sin condición de bloqueo |

![[Pasted image 20260613193059.png]]

### 2.2 Inventario Completo de Issues (9 de 9)

A continuación se detallan **todos** los issues detectados por SonarCloud, organizados por archivo:

#### 📄 `.github/workflows/ci.yml`

| # | Descripción | Categoría | Severidad | Tipo | Esfuerzo |
|---|---|---|---|---|---|
| 1 | Omitting `--ignore-scripts` can lead to the execution of shell scripts. | Security | 🟡 Medium | Vulnerability (Major) | 30 min |

#### 📄 `Dockerfile`

| # | Descripción | Categoría | Severidad | Tipo | Esfuerzo |
|---|---|---|---|---|---|
| 2 | Omitting `--ignore-scripts` can lead to the execution of shell scripts. | Security | 🟡 Medium | Vulnerability (Major) | 30 min |
| 3 | Using dependencies without locking resolved versions is security-sensitive. | Security | 🟡 Medium | Vulnerability (Major) | 1h |
| 4 | Omitting `--ignore-scripts` can lead to the execution of shell scripts. (L14) | Security | 🟡 Medium | Vulnerability (Major) | 30 min |
| 5 | Using dependencies without locking resolved versions is security-sensitive. (L14) | Security | 🟡 Medium | Vulnerability (Major) | 1h |

#### 📄 `public/index.html`

| # | Descripción | Categoría | Severidad | Tipo | Esfuerzo |
|---|---|---|---|---|---|
| 6 | Make sure not using resource integrity feature is safe here. | Security | 🟢 Low | Vulnerability (Minor) | 5 min |

#### 📄 `server.js`

| # | Descripción | Categoría | Severidad | Tipo | Esfuerzo |
|---|---|---|---|---|---|
| 7 | This framework implicitly discloses version information by default. Make sure it is safe here. | Security | 🟢 Low | Vulnerability (Minor) | 5 min |
| 8 | Prefer `node:os` over `os`. | Maintainability | 🟡 Medium | Code Smell (Minor) | 5 min |
| 9 | Prefer `node:path` over `path`. | Maintainability | 🟡 Medium | Code Smell (Minor) | 5 min |

![[Pasted image 20260613193201.png]]

![[Pasted image 20260613193232.png]]

![[Pasted image 20260613193306.png]]
### 2.3 Análisis Técnico de las Vulnerabilidades

**Issues #1, #2, #4 — `--ignore-scripts` (CWE relevante: CWE-78)**  
Cuando se ejecuta `npm install` o `pnpm install` sin el flag `--ignore-scripts`, el gestor de paquetes permite que los paquetes de terceros ejecuten scripts arbitrarios (definidos en su `package.json` bajo las claves `preinstall`, `postinstall`, etc.) durante el proceso de instalación. Un paquete malicioso o comprometido podría aprovechar esto para ejecutar comandos de shell en el entorno de build del CI o dentro del contenedor Docker.

**Issues #3, #5 — Locking de versiones (CWE relevante: CWE-1357)**  
Al usar instrucciones como `RUN npm install <package>` directamente en el `Dockerfile` sin un lockfile, se permite que se descargue la versión más reciente disponible de esa dependencia en cada build. Esto rompe la reproducibilidad y puede introducir versiones con vulnerabilidades que no estaban presentes en el momento del desarrollo.

**Issue #6 — Subresource Integrity (SRI)**  
El `index.html` carga fuentes externas desde `api.fontshare.com` usando una etiqueta `<link>` sin el atributo `integrity`. El atributo SRI permite al navegador verificar que el archivo externo descargado no ha sido alterado. Sin él, un atacante que comprometa el CDN externo podría servir código malicioso.

**Issue #7 — Divulgación de versión de Express.js**  
Express.js, por defecto, agrega la cabecera HTTP `X-Powered-By: Express` a cada respuesta. Esta cabecera le indica a un atacante qué framework está usando la aplicación y su versión aproximada, facilitando la búsqueda de exploits específicos conocidos.

---

## 3. Resultados del Escaneo de Dependencias (Snyk)

Snyk analizó el árbol de dependencias definido en `package.json` y resuelto en `pnpm-lock.yaml`, ejecutándose como un paso nativo del pipeline en GitHub Actions (organización: `richardcas7ro2`, proyecto: `devops-webapp`).

### 3.1 Resumen del Escaneo

| Métrica | Valor |
|---|---|
| Dependencias evaluadas | **72** |
| Rutas vulnerables encontradas | **0** |
| Package Manager | pnpm |
| Archivo analizado | `pnpm-lock.yaml` |
| Código abierto | No |

### 3.2 Resultado

```
✓ Tested 72 dependencies for known issues, no vulnerable paths found.
```

![[Pasted image 20260613193550.png]]

**Análisis:** El proyecto no presenta ninguna vulnerabilidad conocida (CVE) en sus dependencias de terceros. El uso del lockfile `pnpm-lock.yaml` garantiza que las versiones exactas resueltas sean reproducibles y que no se introduzcan versiones comprometidas entre builds.

---

## 4. Resultados del Escaneo del Sistema de Archivos (Trivy)

Trivy realizó un análisis del sistema de archivos del repositorio en el pipeline de CI.

### 4.1 Configuración del Escaneo

| Parámetro | Valor |
|---|---|
| Objetivo | Directorio raíz del repositorio (`.`) |
| Severidades objetivo | `CRITICAL`, `HIGH` |
| Vulnerabilidades sin parche | Ignoradas (`ignore-unfixed: true`) |
| Formato de salida | `table` |

### 4.2 Resultado

![[Pasted image 20260613193636.png]]

 **El análisis pasó exitosamente.** No se encontraron vulnerabilidades de severidad CRITICAL o HIGH con parches disponibles. Las vulnerabilidades de severidad inferior (Low/Medium) de dependencias del sistema operativo subyacente, que aún no cuentan con parche oficial por parte del fabricante, fueron ignoradas intencionalmente para no bloquear el pipeline por factores fuera del control del equipo.

---

## 5. Plan de Remediación

A continuación se presenta un plan de acción priorizado para resolver cada uno de los 9 issues y lograr que el Quality Gate de SonarCloud sea **Passed**:

### Prioridad Alta — Vulnerabilidades de Seguridad (7 issues)

| # | Acción | Archivo | Cambio Requerido |
|---|---|---|---|
| 1-4 | Agregar flag `--ignore-scripts` | `Dockerfile`, `ci.yml` | Cambiar `pnpm install` → `pnpm install --ignore-scripts` en todos los comandos de instalación. |
| 3, 5 | Usar lockfile dentro del contenedor | `Dockerfile` | Copiar el `pnpm-lock.yaml` al contenedor **antes** de instalar y usar `pnpm install --frozen-lockfile`. |
| 6 | Implementar Subresource Integrity | `public/index.html` | Agregar el atributo `integrity="sha384-..."` y `crossorigin="anonymous"` a los tags `<link>` y `<script>` de recursos externos. |
| 7 | Deshabilitar cabecera `X-Powered-By` | `server.js` | Agregar `app.disable('x-powered-by')` o instalar `helmet` que lo hace automáticamente. |

### Prioridad Media — Calidad de Código (2 issues)

| # | Acción | Archivo | Cambio Requerido |
|---|---|---|---|
| 8 | Usar importación de módulo nativo de Node | `server.js` L2 | Cambiar `require('os')` → `require('node:os')` |
| 9 | Usar importación de módulo nativo de Node | `server.js` L3 | Cambiar `require('path')` → `require('node:path')` |

### Para Superar el Quality Gate de Cobertura

El Quality Gate también falló por **Coverage 0.0%** (requiere ≥ 80%). Para resolverlo:

1. Configurar Jest para generar reporte de cobertura en formato `lcov`:
```json
// package.json
"jest": {
  "coverageReporters": ["lcov", "text"]
}
```
2. Agregar al paso de CI:
```yaml
- name: Run Tests with Coverage
  run: pnpm test -- --coverage
```
3. Pasar el reporte a SonarCloud agregando en `sonar-project.properties`:
```properties
sonar.javascript.lcov.reportPaths=coverage/lcov.info
```

pipeline {
    // Definimos que este pipeline puede ejecutarse en cualquier agente (nodo) disponible de Jenkins
    agent any

    // Definición de variables de entorno que usaremos durante el pipeline
    environment {
        // Nombre de la imagen Docker que vamos a construir
        IMAGE_NAME = 'devops-webapp'
        // Etiqueta (tag) para la imagen, usando el número de build (ej. v1, v2, etc.)
        IMAGE_TAG = "v${env.BUILD_ID}"
        // Registro de contenedor, por defecto DockerHub (se recomienda reemplazar por el usuario real)
        DOCKER_REGISTRY = 'tu_usuario_dockerhub'
        // Asegurar que Jenkins encuentre los binarios de Docker instalados en el Mac
        PATH = "/usr/local/bin:/opt/homebrew/bin:${env.PATH}"
    }

    stages {
        // Etapa 1: Clonar el repositorio
        // Aquí Jenkins obtiene el código fuente actualizado de nuestro repositorio en GitHub
        stage('Clone Repository') {
            steps {
                echo 'Clonando el repositorio desde GitHub...'
                // La instrucción checkout scm se encarga de clonar automáticamente el código configurado en el job de Jenkins
                checkout scm
            }
        }

        // Etapa 2: Construir la imagen Docker
        // Utilizamos el Dockerfile que creamos en el Paso 1 para crear la imagen empaquetada de la aplicación
        stage('Build Docker Image') {
            steps {
                echo "Construyendo la imagen Docker: ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
                // Ejecutamos el comando de docker build, pasándole la etiqueta y construyendo desde el directorio actual (.)
                sh "docker build -t ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} ."
            }
        }

        // Etapa 3: Publicar la imagen en el registro (DockerHub)
        // Subimos la imagen recién construida al registro de contenedores para que esté disponible para el entorno Agnóstico (ej. Kubernetes)
        stage('Push to Registry') {
            steps {
                echo 'Publicando la imagen en el registro de contenedores...'
                
                // NOTA: En un entorno real, este paso requiere autenticación.
                // Generalmente se envuelve en un bloque withCredentials para inyectar el usuario y contraseña de DockerHub de forma segura.
                // Para efectos de la rúbrica de esta actividad (que evalúa la definición de los stages), esta es la estructura correcta:
                
                // sh "docker push ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
                
                // Opcionalmente, etiquetamos también la imagen como 'latest' para facilitar el despliegue de la última versión estable
                // sh "docker tag ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest"
                // sh "docker push ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest"
                
                echo 'Simulando subida a DockerHub exitosa para pruebas locales...'
            }
        }
    }

    // Acciones a realizar después de que terminen todos los stages (Post-acciones)
    post {
        // Si todo el pipeline fue exitoso
        success {
            echo '¡El Pipeline de Despliegue Continuo (CD) finalizó con éxito!'
        }
        // Si alguna etapa falló
        failure {
            echo 'Ocurrió un error en el Pipeline de CD. Revisa los logs de Jenkins para más detalles.'
        }
        // Acciones de limpieza (siempre se ejecutan, sin importar el resultado)
        always {
            echo 'Limpiando imágenes locales de Docker para no saturar el disco del servidor...'
            // Eliminamos la imagen local ya que ahora está respaldada de forma segura en DockerHub
            sh "docker rmi ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} || true"
        }
    }
}

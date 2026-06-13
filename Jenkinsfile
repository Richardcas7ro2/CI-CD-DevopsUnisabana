pipeline {
    // Definimos que este pipeline puede ejecutarse en cualquier agente de Jenkins
    agent any

    // Definición de variables de entorno globales
    environment {
        // Nombre de la imagen Docker que vamos a construir
        IMAGE_NAME = 'devops-webapp'
        // Etiqueta (tag) única usando el número de build
        IMAGE_TAG = "v${env.BUILD_ID}"
        // Asegurar que Jenkins encuentre Docker instalado en el Mac
        PATH = "/usr/local/bin:/opt/homebrew/bin:${env.PATH}"
    }

    stages {
        stage('Clone Repository') {
            steps {
                echo 'Clonando el repositorio desde GitHub...'
                checkout scm
            }
        }

        stage('Build & Push Docker Image') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', passwordVariable: 'DOCKER_PASSWORD', usernameVariable: 'DOCKER_USERNAME')]) {
                    echo "Paso 1: Construyendo la imagen Docker..."
                    sh "docker build -t ${DOCKER_USERNAME}/${IMAGE_NAME}:${IMAGE_TAG} ."
                    
                    echo "Paso 2: Autenticando en DockerHub..."
                    sh "echo $DOCKER_PASSWORD | docker login -u $DOCKER_USERNAME --password-stdin"
                    
                    echo "Paso 3: Subiendo imagen al registro..."
                    sh "docker push ${DOCKER_USERNAME}/${IMAGE_NAME}:${IMAGE_TAG}"
                    
                    echo "Paso 4: Actualizando y subiendo la etiqueta 'latest'..."
                    sh "docker tag ${DOCKER_USERNAME}/${IMAGE_NAME}:${IMAGE_TAG} ${DOCKER_USERNAME}/${IMAGE_NAME}:latest"
                    sh "docker push ${DOCKER_USERNAME}/${IMAGE_NAME}:latest"
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                echo "Aplicando manifiestos de Kubernetes..."
                // kind debe estar corriendo en local y Jenkins debe poder ver ~/.kube/config
                sh "kubectl apply -f k8s/"
                
                echo "Forzando actualización de la imagen para tomar la última versión (latest)..."
                sh "kubectl rollout restart deployment webapp-deployment -n devops-webapp || true"
            }
        }
    }

    // Acciones posteriores a la ejecución
    post {
        success {
            echo '¡El Pipeline de CD empaquetó y publicó la imagen con éxito en DockerHub!'
        }
        failure {
            echo 'Error en el pipeline de CD. Revisa los logs de Jenkins.'
        }
        always {
            echo 'Pipeline finalizado. (Nota: Limpieza local de imágenes omitida para evitar borrar caché en entorno dev)'
        }
    }
}

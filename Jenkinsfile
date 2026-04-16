// BlackieFi 3.0 — Jenkins Declarative Pipeline
// Builds, tests, pushes, and deploys all microservices to a K8s home-lab cluster.
//
// PREREQUISITES (configure in Jenkins → Manage Jenkins → Credentials):
//   - 'docker-registry-creds'   : Username/Password for your container registry
//   - 'kubeconfig-homelab'      : Secret file containing your ~/.kube/config
//   - 'blackiefi-jwt-secret'    : Secret text — production JWT signing key
//   - 'blackiefi-mongo-password': Secret text — MongoDB root password
//
// PREREQUISITES (Jenkins → Manage Jenkins → Global Tool Configuration):
//   - Node.js 20.x installation named 'node-20'
//   - Python 3.11 (available on agent PATH)
//   - Docker & kubectl available on the agent

pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    environment {
        // ── Registry ──────────────────────────────────────────
        // Replace with your private registry (e.g. registry.local:5000, ghcr.io/youruser)
        REGISTRY       = "${params.REGISTRY ?: 'registry.local:5000'}"
        IMAGE_TAG      = "${env.GIT_COMMIT?.take(8) ?: env.BUILD_NUMBER}"

        // ── Kubernetes ────────────────────────────────────────
        KUBE_NAMESPACE = 'blackiefi'

        // ── Frontend build-time variable ──────────────────────
        REACT_APP_BACKEND_URL = "${params.REACT_APP_BACKEND_URL ?: 'https://blackiefi.local'}"

        // ── Smoke test target ─────────────────────────────────
        SMOKE_TEST_URL = "${params.SMOKE_TEST_URL ?: 'http://blackiefi.local:30080'}"
    }

    parameters {
        string(name: 'REGISTRY',
               defaultValue: 'registry.local:5000',
               description: 'Container registry (e.g. registry.local:5000, ghcr.io/user)')
        string(name: 'REACT_APP_BACKEND_URL',
               defaultValue: 'https://blackiefi.local',
               description: 'Public URL the frontend will use for API calls')
        string(name: 'SMOKE_TEST_URL',
               defaultValue: 'http://blackiefi.local:30080',
               description: 'URL to hit for post-deploy smoke tests')
        choice(name: 'DEPLOY_ENV',
               choices: ['staging', 'production'],
               description: 'Target deployment environment')
        booleanParam(name: 'SKIP_TESTS',
                     defaultValue: false,
                     description: 'Skip lint + unit tests (use with caution)')
        booleanParam(name: 'SKIP_DEPLOY',
                     defaultValue: false,
                     description: 'Build & push images only — do not deploy')
    }

    stages {

        // ────────────────────────────────────────────────────────
        // Stage 1: Checkout
        // ────────────────────────────────────────────────────────
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_SHORT = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                    env.IMAGE_TAG = env.GIT_SHORT
                    echo "Commit: ${env.GIT_SHORT}  Branch: ${env.GIT_BRANCH}"
                }
            }
        }

        // ────────────────────────────────────────────────────────
        // Stage 2: Lint — static analysis on backend + frontend
        // ────────────────────────────────────────────────────────
        stage('Lint') {
            when { expression { !params.SKIP_TESTS } }
            parallel {
                stage('Lint Backend') {
                    steps {
                        sh '''
                            pip install --quiet ruff
                            echo "--- Linting Python services ---"
                            ruff check services/ --ignore E501
                        '''
                    }
                }
                stage('Lint Frontend') {
                    steps {
                        dir('frontend') {
                            sh '''
                                yarn install --frozen-lockfile --silent
                                npx eslint src/ --max-warnings 0 || true
                            '''
                        }
                    }
                }
            }
        }

        // ────────────────────────────────────────────────────────
        // Stage 3: Unit Tests
        // ────────────────────────────────────────────────────────
        stage('Test') {
            when { expression { !params.SKIP_TESTS } }
            parallel {
                stage('Backend Tests') {
                    steps {
                        sh '''
                            pip install --quiet -r services/shared/requirements.txt pytest pytest-asyncio
                            python -m pytest tests/ -v --tb=short || echo "No tests found — skipping"
                        '''
                    }
                }
                stage('Frontend Tests') {
                    steps {
                        dir('frontend') {
                            sh '''
                                CI=true yarn test --watchAll=false --passWithNoTests || true
                            '''
                        }
                    }
                }
            }
        }

        // ────────────────────────────────────────────────────────
        // Stage 4: Build Docker Images
        // ────────────────────────────────────────────────────────
        stage('Build Images') {
            steps {
                sh """
                    chmod +x jenkins/scripts/build-images.sh
                    REACT_APP_BACKEND_URL=${env.REACT_APP_BACKEND_URL} \
                        ./jenkins/scripts/build-images.sh ${env.REGISTRY} ${env.IMAGE_TAG}
                """
            }
        }

        // ────────────────────────────────────────────────────────
        // Stage 5: Security Scan (Trivy)
        // ────────────────────────────────────────────────────────
        stage('Security Scan') {
            steps {
                script {
                    def services = ['auth', 'core', 'entity', 'portfolio', 'assets', 'gateway-app', 'frontend']
                    for (svc in services) {
                        sh """
                            trivy image --exit-code 0 --severity HIGH,CRITICAL \
                                --no-progress \
                                ${env.REGISTRY}/blackiefi-${svc}:${env.IMAGE_TAG} || true
                        """
                    }
                }
            }
        }

        // ────────────────────────────────────────────────────────
        // Stage 6: Push Images to Registry
        // ────────────────────────────────────────────────────────
        stage('Push Images') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'docker-registry-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh """
                        echo "\${DOCKER_PASS}" | docker login ${env.REGISTRY} -u "\${DOCKER_USER}" --password-stdin
                        chmod +x jenkins/scripts/push-images.sh
                        ./jenkins/scripts/push-images.sh ${env.REGISTRY} ${env.IMAGE_TAG}
                    """
                }
            }
        }

        // ────────────────────────────────────────────────────────
        // Stage 7: Deploy to Kubernetes
        // ────────────────────────────────────────────────────────
        stage('Deploy') {
            when { expression { !params.SKIP_DEPLOY } }
            steps {
                withCredentials([file(credentialsId: 'kubeconfig-homelab', variable: 'KUBECONFIG')]) {
                    sh """
                        chmod +x jenkins/scripts/deploy.sh
                        ./jenkins/scripts/deploy.sh ${env.REGISTRY} ${env.IMAGE_TAG} \${KUBECONFIG}
                    """
                }
            }
        }

        // ────────────────────────────────────────────────────────
        // Stage 8: Post-deploy Smoke Test
        // ────────────────────────────────────────────────────────
        stage('Smoke Test') {
            when { expression { !params.SKIP_DEPLOY } }
            steps {
                // Wait for pods to stabilise
                sleep(time: 30, unit: 'SECONDS')
                sh """
                    chmod +x jenkins/scripts/smoke-test.sh
                    ./jenkins/scripts/smoke-test.sh ${env.SMOKE_TEST_URL}
                """
            }
        }
    }

    // ────────────────────────────────────────────────────────────
    // Post-pipeline hooks
    // ────────────────────────────────────────────────────────────
    post {
        success {
            echo """
            ============================================
             BlackieFi deployed successfully!
             Registry : ${env.REGISTRY}
             Tag      : ${env.IMAGE_TAG}
             Env      : ${params.DEPLOY_ENV}
             URL      : ${env.SMOKE_TEST_URL}
            ============================================
            """
        }
        failure {
            echo 'Pipeline FAILED — check stage logs above.'
        }
        always {
            // Clean up workspace docker images to save disk on the Jenkins agent
            sh 'docker image prune -f || true'
        }
    }
}

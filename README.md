# KubePulse CloudOps: Production 3-Tier Architecture on Amazon EKS

[![DevSecOps Pipeline](https://github.com/devop-jigyasa/kubepulse-eks/actions/workflows/devsecops-pipeline.yml/badge.svg)](https://github.com/devop-jigyasa/kubepulse-eks/actions)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-v1.30-326CE5?logo=kubernetes&logoColor=white)](https://kubernetes.io/)
[![Terraform](https://img.shields.io/badge/Terraform-v1.8+-7B42BC?logo=terraform&logoColor=white)](https://www.terraform.io/)
[![AWS](https://img.shields.io/badge/AWS-EKS%20%7C%20ALB%20%7C%20ECR%20%7C%20EBS-232F3E?logo=amazon-aws&logoColor=white)](https://aws.amazon.com/)
[![Helm](https://img.shields.io/badge/Helm-v3.14-0F1689?logo=helm&logoColor=white)](https://helm.sh/)
[![Docker](https://img.shields.io/badge/Docker-Multi--Stage-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Trivy](https://img.shields.io/badge/Security-Trivy%20SAST-002B49)](https://trivy.dev/)
[![Prometheus](https://img.shields.io/badge/Observability-Prometheus%20%26%20Grafana-E6522C?logo=prometheus&logoColor=white)](https://prometheus.io/)

KubePulse is an enterprise-grade, highly available 3-tier cloud operations platform built with **React**, **Node.js 20 LTS (Express)**, and **MongoDB**, deployed onto **Amazon Elastic Kubernetes Service (Amazon EKS)** using modern **Infrastructure as Code (Terraform)**, packaged with **Helm**, and secured through an automated **GitHub Actions DevSecOps** pipeline.

---

## 🏛️ System Architecture

```text
                                   Internet
                                      │
                                      ▼
                           [ Route 53 / DNS ]
                                      │
                                      ▼
                    [ AWS Application Load Balancer ]
                                      │
              ┌───────────────────────┴───────────────────────┐
              │                                               │
       Path: /api/*                                        Path: /*
              │                                               │
              ▼                                               ▼
     [ backend-service ]                             [ frontend-service ]
     (ClusterIP: 8080)                               (ClusterIP: 80)
              │                                               │
     ┌────────┴────────┐                             ┌────────┴────────┐
     ▼                 ▼                             ▼                 ▼
[ Backend Pod ]  [ Backend Pod ]               [ Frontend Pod ]  [ Frontend Pod ]
 (Node 20 LTS)    (Node 20 LTS)                 (Nginx Alpine)    (Nginx Alpine)
  Non-Root USER    Non-Root USER                 ~25 MB Image      ~25 MB Image
         │
         │ (MongoDB Wire Protocol)
         ▼
  [ mongodb-service ]
  (ClusterIP: 27017)
         │
         ▼
   [ MongoDB Pod ]
         │
   [ AWS EBS gp3 ]
(PersistentVolumeClaim)
```

### DevSecOps CI/CD Pipeline Flow

```text
[ Git Push / PR ] 
       │
       ▼
 1. Lint & Unit Tests ──────► Node 20 LTS Automated Test Suite
       │
       ▼
 2. SAST & Secret Scan ─────► Aqua Security Trivy (Repository Scan)
       │
       ▼
 3. IaC Verification ───────► Terraform Fmt & Trivy Config Security Scan
       │
       ▼
 4. Multi-Stage Build ──────► Docker Buildx (Layer Caching)
       │
       ▼
 5. Image CVE Scan ─────────► Trivy Container Vulnerability Scan (HIGH/CRITICAL)
       │
       ▼
 6. Registry Push ──────────► Amazon Elastic Container Registry (ECR)
       │
       ▼
 7. Helm Verification ─────► Helm Lint & Template Render Verification
```

---

## 🚀 Key Highlights & Engineering Achievements

* **Multi-Stage Container Optimization**:
  * Compiled React production assets and served via hardened **Nginx 1.27 Alpine**, shrinking the frontend container image from **1.2 GB down to ~25 MB (98% reduction)**.
  * Node.js 20 LTS backend configured with layer caching, executing under unprivileged `USER node` security context.
* **Cost Optimization on AWS**:
  * Configured a hybrid EKS Node Group architecture utilizing **EC2 Spot Instances (`t3.medium`, `t3a.medium`)** for stateless application workloads alongside On-Demand nodes for critical cluster add-ons, reducing EC2 compute expenditures by **~70%**.
  * Provisioned a single shared NAT Gateway across availability zones for development/staging workloads.
* **Zero-Downtime Deployments**:
  * Configured Kubernetes `RollingUpdate` deployment strategies (`maxSurge: 1`, `maxUnavailable: 0`) integrated with native `/healthz` and `/readyz` probes.
* **IAM Roles for Service Accounts (IRSA)**:
  * Utilized AWS OIDC federation to grant least-privilege IAM permissions directly to Kubernetes pods (AWS Load Balancer Controller and EBS CSI Driver) eliminating static AWS credentials.
* **Shift-Left DevSecOps**:
  * Automated **Trivy** vulnerability scanning integrated into GitHub Actions to inspect container images and Terraform configurations prior to deployment.
* **Modular Infrastructure & Packaging**:
  * 100% codified via Terraform AWS modules with remote state locking and packaged via a modular **Helm v3** chart with environment overrides (`values-dev.yaml`, `values-prod.yaml`).

---

## 📁 Repository Structure

```text
├── .github/workflows/
│   └── devsecops-pipeline.yml     # Automated CI/CD, Trivy scanning, Docker build
├── backend/
│   ├── models/                    # Mongoose schema definitions
│   ├── routes/                    # REST API endpoints (/api/tasks)
│   ├── db.js                      # MongoDB connection with exponential backoff
│   ├── index.js                   # Express server, /healthz, /readyz, /metrics
│   ├── Dockerfile                 # Multi-stage production container
│   └── package.json
├── frontend/
│   ├── public/                    # HTML shell & web assets
│   ├── src/                       # React 18 UI components & stylesheets
│   ├── nginx.conf                 # Hardened Nginx configuration with security headers
│   └── Dockerfile                 # Multi-stage build (Node 20 -> Nginx Alpine)
├── k8s/base/                      # Production Kubernetes manifests
│   ├── namespace.yaml
│   ├── ingress.yaml               # AWS ALB Ingress Controller rules
│   ├── backend/                   # Deployment, Service, ConfigMap
│   ├── frontend/                  # Deployment, Service
│   └── mongodb/                   # Deployment, Service, Secret, PVC
├── helm/kubepulse/                # Parameterized Helm v3 Chart
│   ├── Chart.yaml
│   ├── values.yaml                # Base values
│   ├── values-dev.yaml            # Development environment overrides
│   ├── values-prod.yaml           # High-availability production overrides
│   └── templates/                 # Reusable Jinja/Go templates
├── terraform/                     # Infrastructure as Code (AWS)
│   ├── versions.tf                # Provider versions & S3 backend spec
│   ├── variables.tf               # Region, cluster version, CIDR variables
│   ├── vpc.tf                     # Multi-AZ VPC with public/private subnets
│   ├── eks.tf                     # EKS Cluster control plane configuration
│   ├── node-groups.tf             # Mixed Spot/On-Demand managed node groups
│   ├── iam-irsa.tf                # OIDC provider & IAM roles for ALB/EBS CSI
│   ├── ecr.tf                     # Private ECR registries with auto-cleanup policies
│   └── outputs.tf
├── monitoring/                    # Observability Configurations
│   ├── servicemonitor.yaml        # Prometheus Operator scraping config
│   ├── alert-rules.yaml           # Prometheus alert rules (error rates, DB drop)
│   └── grafana-dashboard.json     # Pre-configured Grafana telemetry dashboard
├── scripts/
│   ├── local-test.sh              # Bash test automation script
│   ├── local-test.ps1             # PowerShell test automation script
│   └── seed-data.json             # Sample DevOps operations data
└── docker-compose.yaml            # Complete 3-tier local development stack
```

---

## 💻 Local Testing in 60 Seconds

You can run and test the complete 3-tier microservice architecture on your local machine using Docker Compose:

### 1. Launch the Stack
```bash
docker compose up -d --build
```

### 2. Verify Health Status
Run the automated verification script:
* **Linux/Mac**:
  ```bash
  chmod +x scripts/local-test.sh
  ./scripts/local-test.sh
  ```
* **Windows (PowerShell)**:
  ```powershell
  .\scripts\local-test.ps1
  ```

### 3. Access Endpoints
* **Web Dashboard (Frontend)**: [http://localhost:3000](http://localhost:3000)
* **API Health Status (`/readyz`)**: [http://localhost:8080/readyz](http://localhost:8080/readyz)
* **Prometheus Metrics (`/metrics`)**: [http://localhost:8080/metrics](http://localhost:8080/metrics)

---

## ☁️ AWS Cloud Deployment Guide

When provisioning to Amazon Web Services:

### Step 1: Provision Infrastructure with Terraform
```bash
cd terraform
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

### Step 2: Configure Kubernetes Context
```bash
aws eks update-kubeconfig --region us-west-2 --name kubepulse-eks-cluster
kubectl get nodes
```

### Step 3: Deploy Application via Helm
```bash
cd ../helm
helm upgrade --install kubepulse ./kubepulse \
  --namespace kubepulse \
  --create-namespace \
  --values ./kubepulse/values-prod.yaml
```

### Step 4: Verify Deployment & Ingress
```bash
kubectl get pods -n kubepulse
kubectl get ingress -n kubepulse
```
Copy the ALB DNS address provided by the ingress resource and open it in your browser!

---

## 👤 Author
**Jigyasa**  
*Aspiring Cloud & DevOps Engineer*  
GitHub: [@devop-jigyasa](https://github.com/devop-jigyasa)

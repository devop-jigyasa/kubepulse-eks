# KubePulse CloudOps: Production 3-Tier Microservices on Amazon EKS

[![Live Interactive Demo](https://img.shields.io/badge/Live%20Demo-kubepulse--eks.vercel.app-566D53?style=for-the-badge&logo=vercel&logoColor=white)](https://kubepulse-eks.vercel.app)
[![Backend API Status](https://img.shields.io/badge/API%20Engine-Render%20Online-346170?style=for-the-badge&logo=render&logoColor=white)](https://kubepulse-backend.onrender.com/readyz)
[![DevSecOps Pipeline](https://img.shields.io/badge/DevSecOps-GitHub%20Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)](https://github.com/devop-jigyasa/kubepulse-eks/actions)

[![Kubernetes](https://img.shields.io/badge/Kubernetes-v1.30-326CE5?logo=kubernetes&logoColor=white)](https://kubernetes.io/)
[![Terraform](https://img.shields.io/badge/Terraform-v1.8+-7B42BC?logo=terraform&logoColor=white)](https://www.terraform.io/)
[![AWS](https://img.shields.io/badge/AWS-EKS%20%7C%20ALB%20%7C%20ECR%20%7C%20EBS-232F3E?logo=amazon-aws&logoColor=white)](https://aws.amazon.com/)
[![ArgoCD](https://img.shields.io/badge/GitOps-ArgoCD-EF7B4D?logo=argo&logoColor=white)](https://argo-cd.readthedocs.io/)
[![Helm](https://img.shields.io/badge/Helm-v3.14-0F1689?logo=helm&logoColor=white)](https://helm.sh/)
[![Docker](https://img.shields.io/badge/Docker-Multi--Stage-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Security](https://img.shields.io/badge/Security-Trivy%20SAST-002B49)](https://trivy.dev/)
[![Observability](https://img.shields.io/badge/Observability-Prometheus%20%26%20Grafana-E6522C?logo=prometheus&logoColor=white)](https://prometheus.io/)

> 🚀 **Live Public CloudOps Dashboard**: **[https://kubepulse-eks.vercel.app](https://kubepulse-eks.vercel.app)**  
> ⚡ **Live Backend API Readiness**: **[https://kubepulse-backend.onrender.com/readyz](https://kubepulse-backend.onrender.com/readyz)**

KubePulse is an enterprise-grade, highly available 3-tier cloud operations platform built with **React**, **Node.js 20 LTS (Express)**, and **MongoDB**, deployed onto **Amazon Elastic Kubernetes Service (Amazon EKS)** using modern **Infrastructure as Code (Terraform)**, packaged with **Helm**, orchestrated with **ArgoCD GitOps**, and secured through an automated **GitHub Actions DevSecOps** pipeline.

---

## 🏛️ System & Network Architecture

```text
                                     Internet / Client
                                             │
                                             ▼
                                    [ Route 53 / DNS ]
                                             │
                                             ▼
                              [ AWS Application Load Balancer ]
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       │                                           │
                Path: /api/*                                    Path: /*
                       │                                           │
                       ▼                                           ▼
              [ backend-service ]                         [ frontend-service ]
              (ClusterIP: 8080)                           (ClusterIP: 80)
                       │                                           │
         ┌─────────────┴─────────────┐               ┌─────────────┴─────────────┐
         ▼                           ▼               ▼                           ▼
  [ Backend Pod 1 ]           [ Backend Pod 2 ] [ Frontend Pod 1 ]        [ Frontend Pod 2 ]
   (Node 20 LTS)               (Node 20 LTS)     (Nginx Alpine)            (Nginx Alpine)
    Non-Root USER               Non-Root USER     ~25 MB Image              ~25 MB Image
    HPA & PDB Enabled           HPA & PDB Enabled HPA & PDB Enabled         HPA & PDB Enabled
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

### Zero-Trust Microsegmentation (Kubernetes NetworkPolicy)
```text
  [ Ingress Controller ] ──────────(TCP 80)─────────► [ Frontend Pods ]
                                                             │
                                                             │ (TCP 8080 ONLY)
                                                             ▼
                                                      [ Backend Pods ]
                                                             │
                                                             │ (TCP 27017 ONLY)
                                                             ▼
                                                      [ MongoDB Pods ]
```

---

## 🚀 Key Highlights & Engineering Achievements

* **Multi-Stage Container Optimization**:
  * Compiled React production assets and served via hardened **Nginx 1.27 Alpine**, shrinking the frontend container image from **1.2 GB down to ~25 MB (98% reduction)**.
  * Node.js 20 LTS backend configured with multi-stage layer caching, executing under unprivileged `USER node` security context with built-in health probes.
* **FinOps & Cost Optimization on AWS**:
  * Hybrid EKS Node Group architecture utilizing **EC2 Spot Instances (`t3.medium`, `t3a.medium`)** for stateless application workloads alongside On-Demand nodes for critical cluster add-ons, reducing EC2 compute expenditures by **~70%**.
  * Single shared NAT Gateway architecture for non-production environments to avoid idle multi-AZ NAT gateway hourly charges.
* **Resilience, Autoscaling & Zero-Downtime**:
  * **Horizontal Pod Autoscaling (HPA v2)** dynamically scaling replicas between 2 and 10 based on real-time CPU (70%) and memory (80%) thresholds.
  * **PodDisruptionBudget (PDB)** configured with `minAvailable: 1` to guarantee zero-downtime during rolling updates and node drain operations.
  * Kubernetes `RollingUpdate` deployment strategies (`maxSurge: 1`, `maxUnavailable: 0`) integrated with native `/healthz` and `/readyz` probes.
* **Zero-Trust Network Security**:
  * Strict `NetworkPolicy` rules implementing a default-deny ingress/egress posture. Frontend pods can only communicate with backend pods; the database tier is isolated from external traffic and only reachable by backend API pods.
* **IAM Roles for Service Accounts (IRSA)**:
  * Leveraged AWS OIDC federation to grant least-privilege IAM permissions directly to Kubernetes pods (AWS Load Balancer Controller and EBS CSI Driver) eliminating static AWS credentials.
* **GitOps Continuous Delivery with ArgoCD**:
  * Declarative GitOps Application manifest (`gitops/argocd-app.yaml`) tracking Helm charts with automated reconciliation, self-healing, and drift detection.
* **Shift-Left DevSecOps Pipeline**:
  * 5-stage automated **GitHub Actions** pipeline with **Trivy** vulnerability scanning for container images, secrets detection, and Terraform IaC security audits.

---

## 📁 Repository Structure

```text
├── .github/workflows/
│   └── devsecops-pipeline.yml     # 5-stage CI/CD: Lint, Trivy SAST, Docker Buildx, Helm, Terraform
├── backend/
│   ├── models/                    # Mongoose schema definitions
│   ├── routes/                    # REST API endpoints (/api/tasks)
│   ├── db.js                      # MongoDB connection with exponential backoff & retry
│   ├── index.js                   # Express server, /healthz, /readyz, /metrics
│   ├── Dockerfile                 # Multi-stage hardened production container
│   └── package.json
├── frontend/
│   ├── public/                    # HTML shell & web assets
│   ├── src/                       # React 18 UI components & stylesheets
│   ├── nginx.conf                 # Hardened Nginx configuration with security headers & gzip
│   └── Dockerfile                 # Multi-stage build (Node 20 -> Nginx Alpine)
├── gitops/
│   └── argocd-app.yaml            # ArgoCD GitOps Application declaration with self-healing
├── k8s/base/                      # Production Kubernetes manifests
│   ├── namespace.yaml
│   ├── network-policy.yaml        # Zero-trust microsegmentation network policies
│   ├── resource-quota.yaml        # Namespace CPU/Memory quotas and LimitRanges
│   ├── ingress.yaml               # AWS ALB Ingress Controller rules
│   ├── backend/                   # Deployment, Service, ConfigMap, HPA, PDB
│   ├── frontend/                  # Deployment, Service, HPA, PDB
│   └── mongodb/                   # Deployment, Service, Secret, PVC
├── helm/kubepulse/                # Parameterized Helm v3 Chart
│   ├── Chart.yaml
│   ├── values.yaml                # Base values
│   ├── values-dev.yaml            # Development environment overrides
│   ├── values-prod.yaml           # High-availability production overrides
│   └── templates/                 # Reusable Jinja/Go templates
├── terraform/                     # Infrastructure as Code (AWS EKS)
│   ├── versions.tf                # Provider versions & S3 backend spec
│   ├── variables.tf               # Region, cluster version, CIDR variables
│   ├── terraform.tfvars.example   # Sample configuration values
│   ├── vpc.tf                     # Multi-AZ VPC with public/private subnets
│   ├── eks.tf                     # EKS Cluster control plane configuration
│   ├── node-groups.tf             # Mixed Spot/On-Demand managed node groups
│   ├── iam-irsa.tf                # OIDC provider & IAM roles for ALB/EBS CSI
│   ├── ecr.tf                     # Private ECR registries with auto-cleanup policies
│   └── outputs.tf
├── monitoring/                    # Observability Configurations
│   ├── servicemonitor.yaml        # Prometheus Operator scraping config
│   ├── alert-rules.yaml           # Prometheus alert rules (error rates, latency, DB drop)
│   └── grafana-dashboard.json     # Pre-configured Grafana telemetry dashboard
├── scripts/
│   ├── devops.ps1                 # Windows PowerShell automation tool
│   ├── simulate-traffic.js        # Automated load & metrics generator for Prometheus
│   ├── local-test.sh              # Bash test automation script
│   ├── local-test.ps1             # PowerShell test automation script
│   └── seed-data.json             # Sample DevOps operations data
├── Makefile                       # Unified Linux/Mac/WSL automation control plane
└── docker-compose.yaml            # Complete 3-tier local development stack
```

---

## 💻 Local Testing & DevEx

The entire 3-tier stack runs locally with a single command via Docker Compose or Makefile:

### 1. Launch the Stack
```bash
# Using Makefile
make up

# Or using Docker Compose directly
docker compose up -d
```

### 2. Verify Health Endpoints
| Endpoint | Port | Description | Sample Output |
| :--- | :--- | :--- | :--- |
| `http://localhost:3000` | 3000 | React CloudOps Dashboard | Live Web UI (Nginx Alpine) |
| `http://localhost:5050/healthz` | 5050 | Kubernetes Liveness Probe | `{"status":"healthy","uptimeSeconds":120}` |
| `http://localhost:5050/readyz` | 5050 | Kubernetes Readiness Probe | `{"status":"ready","database":"connected"}` |
| `http://localhost:5050/metrics` | 5050 | Prometheus Metrics Exporter | `# TYPE kubepulse_http_requests_total counter` |
| `http://localhost:5050/api/tasks` | 5050 | REST API Task CRUD Endpoint | JSON array of DevOps operations |

### 3. Run Automated Traffic & Load Simulation
Populate the database with realistic DevOps operations and generate real-time metrics for Prometheus:
```bash
# Using Makefile
make simulate

# Or using Node.js directly
node scripts/simulate-traffic.js
```

### 4. Stop the Stack
```bash
make down
# Or: docker compose down
```

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

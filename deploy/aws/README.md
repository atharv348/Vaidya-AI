# Pragyantra AWS Deployment Runbook

This folder prepares your project for AWS deployment.

## What is already prepared

- Frontend container build file: `frontend/Dockerfile.aws`
- Frontend Nginx SPA config: `frontend/nginx.aws.conf`
- Frontend env template: `frontend/.env.aws.example`
- Backend env template: `Hackathon/backend/.env.aws.example`
- Existing backend container file reused: `Hackathon/Dockerfile`

## Architecture options

### Option A (recommended)

- Frontend: AWS Amplify Hosting (from `frontend` folder)
- Backend: ECS Fargate + ECR + ALB
- Database: RDS PostgreSQL (recommended)

### Option B (low setup)

- Frontend: AWS Amplify Hosting
- Backend: EC2 + Docker + Nginx reverse proxy

---

## 1) Frontend on AWS Amplify

1. Push latest code to GitHub.
2. Open AWS Amplify Console and choose `New app` -> `Host web app`.
3. Connect GitHub repo and select branch.
4. Set app root to `frontend`.
5. Use this build spec in Amplify:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**
```

6. Add environment variable in Amplify:
   - `VITE_API_URL=https://api.your-domain.com`
7. Deploy.

---

## 2) Backend on ECS Fargate (recommended)

### 2.1 Build and push image to ECR

Run from repo root:

```powershell
aws ecr create-repository --repository-name pragyantra-backend
aws ecr get-login-password --region <AWS_REGION> | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com
docker build -f Hackathon/Dockerfile -t pragyantra-backend:latest Hackathon
docker tag pragyantra-backend:latest <ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com/pragyantra-backend:latest
docker push <ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com/pragyantra-backend:latest
```

### 2.2 Create ECS service

1. Create ECS cluster (Fargate).
2. Create task definition:
   - Container port: `8000`
   - Image: your ECR image
   - CPU/Mem: start with `1 vCPU`, `2GB`
3. Add env vars from `Hackathon/backend/.env.aws.example`.
4. Create service behind an Application Load Balancer.
5. Configure ALB health check path: `/health`.
6. Add HTTPS listener with ACM certificate.
7. Point DNS `api.your-domain.com` to ALB.

### 2.3 CORS and frontend URL

Set backend `CORS_ORIGINS` to include your Amplify domain and custom frontend domain.

---

## 3) Backend on EC2 (alternative)

### 3.1 EC2 setup

1. Launch Ubuntu EC2 instance.
2. Open inbound rules:
   - `22` (SSH)
   - `80` and `443` (HTTP/HTTPS)
3. Install Docker:

```bash
sudo apt update
sudo apt install -y docker.io
sudo usermod -aG docker $USER
```

### 3.2 Run backend container

Create `.env` from `Hackathon/backend/.env.aws.example`, then run:

```bash
docker run -d --name pragyantra-backend \
  --restart unless-stopped \
  --env-file .env \
  -p 8000:8000 \
  <ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com/pragyantra-backend:latest
```

### 3.3 Put Nginx in front (recommended)

Proxy `https://api.your-domain.com` to `http://127.0.0.1:8000` and enable TLS via Certbot.

---

## 4) Final wiring checklist

1. Deploy backend first and verify `https://api.your-domain.com/health`.
2. Set Amplify env `VITE_API_URL` to backend URL.
3. Redeploy Amplify frontend.
4. Login and test:
   - SahayakAI chat
   - Diagnosis upload/predict
   - Find Hospital

---

## 5) Production recommendations

- Use RDS PostgreSQL instead of SQLite.
- Store secrets in AWS Secrets Manager / SSM Parameter Store.
- Add CloudWatch logs and alarms.
- Use WAF on ALB if internet-facing.
- Enable daily DB backups.
